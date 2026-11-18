import inventory from './inventory.json' with { type: 'json' }
import { constantNotes, explanations, overviews, type Explanation } from './content.ts'

export const release = inventory.version
export const doxygen = 'https://ffmpeg.org/doxygen/9.0/'
const tag = `https://github.com/FFmpeg/FFmpeg/blob/n${release}`

type Constant = { name: string; value: string }
type Field = { name: string; cType: string; line: number; target?: string; declaration?: string }
type Definition = {
  kind: 'struct' | 'union' | 'enum' | 'bitmask' | 'opaque'
  header: string
  line?: number
  fields?: Field[]
  constants?: Constant[]
}

export const definitions: Record<string, Definition> = {
  ...inventory.types as Record<string, Definition>,
  AVDictionary: { kind: 'opaque', header: 'libavutil/dict.h' },
  AVBuffer: { kind: 'opaque', header: 'libavutil/buffer.h' },
}

export type Node = {
  name: string
  path: string
  parentType?: string
  type?: string
  kind: string
  field?: Field
  constant?: Constant
  explanation?: Explanation
  cycle?: string
  children: Node[]
}

export function source(definition: Definition, line = definition.line) {
  return `${tag}/${definition.header}${line ? `#L${line}` : ''}`
}

function declarationType(cType: string) {
  return cType.match(/^(?:const )?(?:(?:enum|struct) )?(AV\w+)(?:\s*\*+)?$/)?.[1]
}

export function tree(type: string): Node {
  const root: Node = { name: type, path: type, type, kind: definitions[type].kind, children: [] }
  populate(root, new Map())
  return root
}

function populate(node: Node, parents: Map<string, string>) {
  const owner = node.type
  if (!owner) return
  const definition = definitions[owner]
  if (parents.has(owner)) {
    node.cycle = parents.get(owner)
    return
  }
  const ancestors = new Map(parents).set(owner, node.path)
  node.children = [
    ...definition.fields?.map((field): Node => {
      const explanation = explanations[owner]?.[field.name]
      const candidate = field.target ?? explanation?.target ?? declarationType(field.cType)
      const type = candidate && Object.hasOwn(definitions, candidate) ? candidate : undefined
      const kind = explanation?.role ?? (field.cType.includes('*') ? 'pointer'
        : field.cType.includes('[') ? 'array' : type ? definitions[type].kind : 'scalar')
      const recursiveSignature = explanation?.role === 'callback'
        ? explanation.related?.find(type => ancestors.has(type)) : undefined
      const child = { name: field.name, path: `${node.path}/${field.name}`, parentType: node.type,
        type, kind, field, explanation, cycle: recursiveSignature && ancestors.get(recursiveSignature), children: [] } satisfies Node
      populate(child, ancestors)
      return child
    }) ?? [],
    ...definition.constants?.map((constant): Node => ({
      name: constant.name, path: `${node.path}/${constant.name}`, kind: 'constant', parentType: node.type,
      constant, children: [],
    })) ?? [],
  ]
}

export function flatten(node: Node): Node[] {
  return [node, ...node.children.flatMap(flatten)]
}

export function qualified(path: string) {
  return path.replaceAll('/', '.')
}

export function description(node: Node) {
  return node.explanation?.meaning ?? (node.constant ? constantNotes[node.name] : node.type ? overviews[node.type] : undefined)
}

export function declaration(node: Node): string {
  if (node.constant) return [node.name, node.constant.value].filter(Boolean).join(' = ')
  if (!node.field) return node.type ?? node.name
  const { cType, name } = node.field
  if (node.field.declaration) return `${node.field.declaration};`
  if (cType === 'union' && node.type) {
    const members = (definitions[node.type].fields ?? []).map(member => `  ${member.cType} ${member.name};`)
    return `union {\n${members.join('\n')}\n} ${name};`
  }
  const [type, brackets] = cType.split('[')
  return `${type}${type.endsWith('*') ? '' : ' '}${name}${brackets ? `[${brackets}` : ''};`
}

const searchTerms: Record<string, string> = {
  'AVStream.start_time': 'timestamp pts presentation time origin',
  'AVPacket.pts': 'timestamp presentation clock',
  'AVPacket.dts': 'timestamp decode clock',
  'AVStream.duration': 'timestamp pts timing',
  'AVStream.time_base': 'timestamp pts dts clock rescale seconds',
  'AVStream.avg_frame_rate': 'fps variable cadence vfr',
  'AVStream.r_frame_rate': 'fps variable cadence vfr',
  'AVCodecParameters.coded_side_data': 'rotation orientation rotate display matrix av_display_rotation_get av_packet_side_data_get',
  'AVCodecParameters.bit_rate': 'bitrate bandwidth kbps',
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[_.\-/]+/g, ' ')
}

export function search(nodes: Node[], query: string) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return nodes.flatMap(node => {
    const key = `${node.parentType}.${node.name}`
    const name = normalize(node.name)
    const path = normalize(node.path)
    const concepts = normalize(searchTerms[key] ?? '')
    const details = normalize([
      node.field?.cType, node.type, node.constant?.value, description(node),
      node.explanation?.use, node.explanation?.example,
    ].join(' '))
    const scores = words.map(word => name === word ? 12 : name.includes(word) ? 7
      : concepts.includes(word) ? 6 : path.includes(word) ? 4 : details.includes(word) ? 1 : 0)
    return scores.every(Boolean) ? [{ node, score: scores.reduce<number>((a, b) => a + b, 0) }] : []
  }).sort((a, b) => b.score - a.score).map(({ node }) => node)
}

export const defaultStructure = 'AVStream'

type StreamTime = { num: bigint; den: bigint; error?: undefined } | { error: string }

export function readStreamTime(timestamp: string, numerator: string, denominator: string): StreamTime {
  if (timestamp.trim().toUpperCase() === 'AV_NOPTS_VALUE') return { error: 'Unknown timestamp (AV_NOPTS_VALUE).' }
  const parts = [timestamp, numerator, denominator].map(value => value.trim())
  if (parts.some(value => !/^[+-]?\d{1,19}$/.test(value))) return { error: 'Enter integers in the C type’s range.' }
  const [ticks, num, den] = parts.map(BigInt)
  const min = -(1n << 63n)
  if (ticks === min) return { error: 'Unknown timestamp (AV_NOPTS_VALUE).' }
  if (ticks < min || ticks > -(min + 1n)) return { error: 'Timestamp must fit in a signed 64-bit integer.' }
  if (num < 1n || den < 1n || num > 2147483647n || den > 2147483647n) {
    return { error: 'A time base needs a positive 32-bit numerator and denominator.' }
  }
  return { num: ticks * num, den }
}

export function formatSeconds(num: bigint, den: bigint) {
  const sign = num < 0n ? '−' : ''
  const absolute = num < 0n ? -num : num
  const scale = 1_000_000_000_000n
  const rounded = (absolute * scale + den / 2n) / den
  const remainder = (rounded % scale).toString().padStart(12, '0').replace(/0+$/, '')
  return `${sign}${rounded / scale}${remainder ? `.${remainder}` : ''}`
}
