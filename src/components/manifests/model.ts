export type FrameKind = 'IDR' | 'I' | 'P' | 'B'
export type EncodedFrame = { id: string; kind: FrameKind; pts: number; dts: number; references: string[] }
export type MediaSegment = { index: number; start: number; duration: number; frames: EncodedFrame[]; independent: boolean }
export type Representation = { id: string; bandwidth: number; height: number; segments: MediaSegment[] }
export type TimelineSettings = { segmentDuration: number; gopDuration: number; count: number; aligned: boolean; independent: boolean; closedGop: boolean }

const round = (n: number) => Math.round(n * 1000) / 1000

export function makeFrames(start: number, duration: number, gopDuration: number, independent: boolean, closedGop: boolean): EncodedFrame[] {
  const frameDuration = 0.25
  const count = Math.max(1, Math.round(duration / frameDuration))
  const gopSize = Math.max(4, Math.round(gopDuration / frameDuration))
  const kinds: FrameKind[] = Array.from({ length: count }, (_, i) => i % gopSize === 0 ? (i === 0 && independent ? 'IDR' : 'I') : i % gopSize % 3 === 0 ? 'P' : 'B')
  if (!independent) kinds[0] = 'P'
  if (closedGop) for (let i = 0; i < count; i++) if (kinds[i] === 'B') {
    const nextAnchor = kinds.findIndex((kind, index) => index > i && kind !== 'B')
    if (nextAnchor < 0 || kinds[nextAnchor] === 'I' || kinds[nextAnchor] === 'IDR') kinds[i] = 'P'
  }
  // Presentation order: I B B P B B P. Decode the future anchor before the B pictures that use it.
  const decodeOrder: number[] = []
  let previous = -1
  for (let i = 0; i < count; i++) if (kinds[i] !== 'B') {
    decodeOrder.push(i)
    for (let j = previous + 1; j < i; j++) if (kinds[j] === 'B') decodeOrder.push(j)
    previous = i
  }
  for (let i = previous + 1; i < count; i++) decodeOrder.push(i)
  const decodeIndex = new Map(decodeOrder.map((value, index) => [value, index]))
  return kinds.map((kind, i) => {
    const previousAnchor = Array.from({ length: i }, (_, j) => i - j - 1).find((j) => kinds[j] !== 'B')
    const nextAnchor = Array.from({ length: count - i - 1 }, (_, j) => i + j + 1).find((j) => kinds[j] !== 'B')
    const references = kind === 'P' ? [previousAnchor === undefined ? 'previous segment' : `f${previousAnchor}`] : kind === 'B' ? [previousAnchor === undefined ? 'previous segment' : `f${previousAnchor}`, nextAnchor === undefined ? 'next segment' : `f${nextAnchor}`] : []
    if (!closedGop && kind === 'B' && nextAnchor !== undefined && kinds[nextAnchor] === 'I') references.push('open GOP: boundary crossing may occur')
    return { id: `f${i}`, kind, pts: round(start + i * frameDuration), dts: round(start + (decodeIndex.get(i) ?? i) * frameDuration), references }
  })
}

export function makeRepresentations(settings: TimelineSettings): Representation[] {
  const ladder = [{ id: '1080p', height: 1080, bandwidth: 5200000 }, { id: '720p', height: 720, bandwidth: 2800000 }, { id: '480p', height: 480, bandwidth: 1200000 }, { id: '360p', height: 360, bandwidth: 650000 }]
  return ladder.slice(0, settings.count).map((item, row) => ({
    ...item,
    segments: Array.from({ length: 8 }, (_, index) => {
      const offset = settings.aligned ? 0 : row * settings.segmentDuration * 0.18
      const start = round(index * settings.segmentDuration + offset)
      return { index: index + 1, start, duration: settings.segmentDuration, independent: settings.independent, frames: makeFrames(start, settings.segmentDuration, settings.gopDuration, settings.independent, settings.closedGop) }
    }),
  }))
}

export type SegmentReference = { number: number; time: number; duration: number; seconds: number; url: string }
export type TimelineRow = { t?: number; d: number; r?: number }
export function expandSegmentTimeline(rows: TimelineRow[], timescale: number, media: string, startNumber = 1): SegmentReference[] {
  if (!Number.isSafeInteger(timescale) || timescale <= 0) throw new Error('timescale must be a positive integer.')
  if (!Number.isSafeInteger(startNumber) || startNumber < 0) throw new Error('startNumber must be a nonnegative integer.')
  if (!rows.length) throw new Error('Add at least one S element.')
  const references: SegmentReference[] = []
  let cursor = 0
  rows.forEach((row, rowIndex) => {
    if (!Number.isSafeInteger(row.d) || row.d <= 0) throw new Error(`S ${rowIndex + 1}: d must be a positive integer.`)
    if (row.t !== undefined && (!Number.isSafeInteger(row.t) || row.t < 0)) throw new Error(`S ${rowIndex + 1}: t must be a nonnegative integer.`)
    if (row.r !== undefined && (!Number.isSafeInteger(row.r) || row.r < 0 || row.r > 20)) throw new Error(`S ${rowIndex + 1}: this example supports r from 0 to 20; negative repeats need a known boundary.`)
    if (row.t !== undefined) cursor = row.t
    for (let i = 0; i <= (row.r ?? 0); i++) {
      const number = startNumber + references.length
      references.push({ number, time: cursor, duration: row.d, seconds: cursor / timescale, url: media.replaceAll('$Time$', String(cursor)).replaceAll('$Number$', String(number)) })
      cursor += row.d
    }
  })
  return references
}

export type InspectedManifest = { format: 'DASH' | 'HLS'; tracks: { label: string; segments: { start: number; duration: number; url: string }[] }[]; notes: string[] }
export function inspectDash(source: string): InspectedManifest {
  const doc = new DOMParser().parseFromString(source, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('XML is malformed. Check closing tags and attribute quotes.')
  const mpd = doc.documentElement
  if (mpd.localName !== 'MPD') throw new Error('Expected an MPD root element.')
  const reps = [...doc.getElementsByTagName('Representation')]
  if (!reps.length) throw new Error('This sample parser needs at least one Representation.')
  return { format: 'DASH', tracks: reps.map((rep, index) => {
    const template = rep.getElementsByTagName('SegmentTemplate')[0] ?? rep.parentElement?.getElementsByTagName('SegmentTemplate')[0]
    if (!template) throw new Error(`Representation ${index + 1}: this inspector supports SegmentTemplate with SegmentTimeline.`)
    const timeline = template.getElementsByTagName('SegmentTimeline')[0]
    if (!timeline) throw new Error('Add a SegmentTimeline to the SegmentTemplate.')
    const rows = [...timeline.getElementsByTagName('S')].map((s) => ({ t: s.hasAttribute('t') ? Number(s.getAttribute('t')) : undefined, d: Number(s.getAttribute('d')), r: s.hasAttribute('r') ? Number(s.getAttribute('r')) : undefined }))
    const scale = Number(template.getAttribute('timescale') ?? '1')
    const media = template.getAttribute('media') ?? 'segment-$Time$.m4s'
    const refs = expandSegmentTimeline(rows, scale, media, Number(template.getAttribute('startNumber') ?? '1'))
    return { label: rep.getAttribute('id') ?? `Representation ${index + 1}`, segments: refs.map((ref) => ({ start: ref.seconds, duration: ref.duration / scale, url: ref.url })) }
  }), notes: ['Subset: SegmentTemplate + finite SegmentTimeline repeats.', 'MPD metadata does not verify the encoded samples.'] }
}

export function inspectHls(source: string): InspectedManifest {
  const lines = source.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines[0] !== '#EXTM3U') throw new Error('An HLS playlist must begin with #EXTM3U.')
  if (lines.some((line) => line.startsWith('#EXT-X-STREAM-INF'))) throw new Error('This sample inspector accepts media playlists; select a variant URI from a multivariant playlist first.')
  const segments: { start: number; duration: number; url: string }[] = []
  let pending: number | undefined
  let cursor = 0
  for (const line of lines.slice(1)) {
    if (line.startsWith('#EXTINF:')) {
      pending = Number(line.slice(8).split(',')[0])
      if (!Number.isFinite(pending) || pending < 0) throw new Error(`Invalid EXTINF duration: ${line}`)
    } else if (!line.startsWith('#')) {
      if (pending === undefined) throw new Error(`Segment URI ${line} needs a preceding EXTINF.`)
      segments.push({ start: cursor, duration: pending, url: line })
      cursor += pending
      pending = undefined
    }
  }
  if (pending !== undefined) throw new Error('The last EXTINF needs a segment URI.')
  if (!segments.length) throw new Error('No media segments found.')
  return { format: 'HLS', tracks: [{ label: 'Media playlist', segments }], notes: ['Subset: EXTINF durations and segment URIs.', 'Discontinuity timestamps and variant switching require more context.'] }
}
