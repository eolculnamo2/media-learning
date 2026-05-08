import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import * as d3 from 'd3'

type VizShellProps = {
  eyebrow: string
  title: string
  intro: string
  children: ReactNode
  cardClassName?: string
  pageClassName?: string
}

function VizShell({ eyebrow, title, intro, children, cardClassName, pageClassName }: VizShellProps) {
  return (
    <section className={`viz-page${pageClassName ? ` ${pageClassName}` : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="viz-intro">{intro}</p>
      <div className={`viz-card${cardClassName ? ` ${cardClassName}` : ''}`}>{children}</div>
    </section>
  )
}

type TreeNode = { name: string; note: string; children?: TreeNode[] }

const boxTree: TreeNode = {
  name: 'MP4',
  note: '',
  children: [
    { name: 'ftyp', note: 'Brands and compatibility' },
    {
      name: 'moov',
      note: 'Global movie metadata',
      children: [
        {
          name: 'trak',
          note: 'One media track',
          children: [
            {
              name: 'mdia',
              note: 'Media metadata',
              children: [
                {
                  name: 'minf',
                  note: 'Media information',
                  children: [
                    {
                      name: 'stbl',
                      note: 'Sample index tables',
                      children: [
                        { name: 'stsd', note: 'Codec/sample descriptions' },
                        { name: 'stts', note: 'Decode durations' },
                        { name: 'stss', note: 'Keyframes' },
                        { name: 'stsz', note: 'Sample sizes' },
                        { name: 'stco/co64', note: 'Chunk offsets' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    { name: 'mdat', note: 'Encoded media payload' },
  ],
}

export function BoxTreePage() {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svgElement = ref.current
    if (!svgElement) return

    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()

    const width = svgElement.clientWidth || 1000
    const height = 620
    const root = d3.hierarchy(boxTree)
    const tree = d3.tree<TreeNode>().size([height - 80, width - 240])
    tree(root)

    const g = svg.append('g').attr('transform', 'translate(110,40)')

    g.selectAll('path')
      .data(root.links())
      .join('path')
      .attr('class', 'tree-link')
      .attr('d', (d) => {
        const sourceX = d.source.y ?? 0
        const sourceY = d.source.x ?? 0
        const targetX = d.target.y ?? 0
        const targetY = d.target.x ?? 0
        const midX = (sourceX + targetX) / 2
        return `M${sourceX},${sourceY}C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`
      })

    const node = g
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('class', 'tree-node')
      .attr('transform', (d) => `translate(${d.y},${d.x})`)

    node.append('circle').attr('r', 8)
    node.append('text').attr('x', 14).attr('dy', '-0.15em').text((d) => d.data.name)
    node
      .filter((d) => d.data.note.length > 0)
      .append('text')
      .attr('class', 'tree-note')
      .attr('x', 14)
      .attr('dy', '1.2em')
      .text((d) => d.data.note)
  }, [])

  return (
    <VizShell eyebrow="Visualization 1" title="Box tree explorer" intro="A D3 tree that mirrors the hierarchy MP4Box.js gives you after parsing an MP4 file.">
      <svg ref={ref} className="viz-svg" role="img" aria-label="MP4 box hierarchy tree" />
    </VizShell>
  )
}

const segments = [
  { id: 'seg 1', start: 0, duration: 2, tfdt: 0, keyframes: [0], samples: [0.5, 0.5, 0.5, 0.5] },
  { id: 'seg 2', start: 2, duration: 2, tfdt: 180000, keyframes: [2], samples: [0.5, 0.5, 0.5, 0.5] },
  { id: 'seg 3', start: 4, duration: 2, tfdt: 360000, keyframes: [4], samples: [0.5, 0.5, 0.5, 0.5] },
]

export function TimelinePage() {
  return (
    <VizShell eyebrow="Visualization 2" title="Timeline view" intro="Segments line up on media time. Each segment carries moof metadata, mdat bytes, tfdt start time, trun samples, and keyframes.">
      <div className="beginner-note">
        <strong>How to read this:</strong> each card is one <Link to="/concept/media-segment">media segment</Link>. The
        <Link to="/concept/moof"> moof</Link> box describes the samples, the <Link to="/concept/mdat">mdat</Link> box
        carries bytes, <Link to="/concept/tfdt">tfdt</Link> places the segment on the timeline, and
        <Link to="/concept/trun"> trun</Link> lists per-sample durations/sizes.
      </div>
      <div className="timeline-legend" aria-label="Timeline legend">
        <span><b className="legend-moof" /> metadata box</span>
        <span><b className="legend-mdat" /> payload box</span>
        <span>◆ random-access keyframe</span>
        <span>green ticks = samples from trun</span>
      </div>
      <div className="timeline">
        {segments.map((segment) => (
          <div key={segment.id} className="segment-block" title={`${segment.id}: starts at ${segment.start}s, lasts ${segment.duration}s`}>
            <div className="segment-title">{segment.id}: {segment.start}s–{segment.start + segment.duration}s</div>
            <div className="segment-boxes">
              <Link className="moof-box" to="/concept/moof" title="moof: metadata for this fragment">moof</Link>
              <Link className="mdat-box" to="/concept/mdat" title="mdat: encoded media bytes">mdat</Link>
            </div>
            <div className="segment-meta"><Link to="/concept/tfdt">tfdt</Link>: {segment.tfdt} ticks ({segment.start}s)</div>
            <div className="sample-row" aria-label="trun sample durations">
              {segment.samples.map((duration, index) => <span key={index} title={`trun sample ${index + 1}: ${duration}s duration`} style={{ flexGrow: duration * 2 }} />)}
            </div>
            <div className="keyframe-row">◆ keyframe at {segment.keyframes.join('s, ')}s — safe place to start decoding</div>
          </div>
        ))}
      </div>
    </VizShell>
  )
}

const samples = Array.from({ length: 28 }, (_, index) => ({
  index: index + 1,
  duration: index % 7 === 0 ? 1.2 : 0.8,
  size: 450 + ((index * 137) % 900),
  keyframe: index % 7 === 0,
}))

export function SampleTablePage() {
  return (
    <VizShell eyebrow="Visualization 3" title="Sample table visualizer" intro="Each sample becomes a bar: width is decode duration, height is byte size, and diamonds mark sync samples from stss.">
      <div className="beginner-note">
        <strong>How to read this:</strong> MP4 does not store “frame 12 is at pixel X.” It stores tables. <Link to="/concept/stts">stts</Link>
        says how long each sample lasts, <Link to="/concept/stsz">stsz</Link> says how many bytes to read, and
        <Link to="/concept/stss"> stss</Link> marks keyframes for seeking.
      </div>
      <div className="sample-legend" aria-label="Sample visualizer legend">
        <span>bar width = decode duration</span>
        <span>bar height = byte size</span>
        <span>◆ = keyframe / sync sample</span>
      </div>
      <div className="sample-bars">
        {samples.map((sample) => (
          <div key={sample.index} className="sample-item" title={`sample ${sample.index}: duration ${sample.duration}s, size ${sample.size} bytes${sample.keyframe ? ', keyframe' : ''}`}>
            {sample.keyframe ? <Link to="/concept/stss" className="sample-key" title="stss marks this as a sync sample">◆</Link> : null}
            <Link className="sample-bar" to="/concept/stbl" style={{ height: `${36 + sample.size / 18}px`, width: `${26 * sample.duration}px` }} aria-label={`sample ${sample.index}`} />
            <small>{sample.index}</small>
          </div>
        ))}
      </div>
      <p className="viz-caption"><Link to="/concept/stts">stts</Link> gives duration, <Link to="/concept/stsz">stsz</Link> gives byte size, <Link to="/concept/stss">stss</Link> identifies the keyframes.</p>
    </VizShell>
  )
}

export function ComparisonPage() {
  return (
    <VizShell eyebrow="Visualization 4" title="Progressive vs fragmented" intro="The same media can be arranged as one indexed file or as an init segment plus repeated fragments.">
      <div className="comparison-grid">
        <div>
          <h2><Link to="/concept/progressive-mp4">Progressive</Link></h2>
          <div className="byte-strip">
            <Link className="tiny" to="/concept/ftyp">ftyp</Link>
            <Link className="wide" to="/concept/moov">moov / <br />stbl index</Link>
            <Link className="huge" to="/concept/mdat">mdat payload</Link>
          </div>
        </div>
        <div>
          <h2><Link to="/concept/fragmented-mp4">Fragmented</Link></h2>
          <div className="byte-strip fragmented">
            <Link className="tiny" to="/concept/ftyp">ftyp</Link>
            <Link className="tiny" to="/concept/moov">moov</Link>
            <Link to="/concept/moof">moof</Link>
            <Link to="/concept/mdat">mdat</Link>
            <Link to="/concept/moof">moof</Link>
            <Link to="/concept/mdat">mdat</Link>
            <Link to="/concept/moof">moof</Link>
            <Link to="/concept/mdat">mdat</Link>
          </div>
        </div>
      </div>
    </VizShell>
  )
}

const readSteps = [
  {
    title: 'Need frame 120',
    body: 'The player starts with a user request: “show me the media around this time/frame.” It does not know the byte offset yet.',
  },
  {
    title: 'stts: map time',
    conceptId: 'stts',
    body: 'The decoding-time table converts sample counts and durations into media time, answering “which sample is near this timestamp?”',
  },
  {
    title: 'stss: nearest keyframe',
    conceptId: 'stss',
    body: 'Video decoding usually must begin at a sync sample/keyframe, so seeking backs up to the closest safe random-access point.',
  },
  {
    title: 'stco/co64 + stsz: byte range',
    conceptId: 'stco-co64',
    body: 'Offset and size tables tell the demuxer where the needed encoded bytes live and how many bytes to read.',
  },
  {
    title: 'mdat: read payload',
    conceptId: 'mdat',
    body: 'The player finally reads encoded audio/video bytes from mdat. Metadata pointed here; the decoder consumes this payload.',
  },
  {
    title: 'decode',
    body: 'The codec turns compressed samples into frames/audio. Container work is mostly done; codec work begins.',
  },
]

export function ReadPathPage() {
  return (
    <VizShell eyebrow="Visualization 5" title="Player read-path" intro="A seek is a chain of table lookups ending in bytes from mdat.">
      <div className="beginner-note">
        <strong>How to read this:</strong> MP4 metadata is like a set of indexes. When a player seeks, it uses sample tables to translate
        “time/frame I want” into “byte range I should fetch,” then reads bytes from <Link to="/concept/mdat">mdat</Link> and decodes them.
      </div>
      <ol className="read-path">
        {readSteps.map((step, index) => (
          <li key={step.title} style={{ animationDelay: `${index * 180}ms` }}>
            <strong>{step.conceptId ? <Link to={`/concept/${step.conceptId}`}>{step.title}</Link> : step.title}</strong>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </VizShell>
  )
}

const ladder = [
  {
    name: '360p',
    segments: [
      { n: 1, start: 0, end: 2, tfdt: 0, keyframe: 0 },
      { n: 2, start: 2, end: 4, tfdt: 180000, keyframe: 2 },
      { n: 3, start: 4, end: 6, tfdt: 360000, keyframe: 4 },
      { n: 4, start: 6, end: 8, tfdt: 540000, keyframe: 6 },
    ],
  },
  {
    name: '720p',
    segments: [
      { n: 1, start: 0, end: 2, tfdt: 0, keyframe: 0 },
      { n: 2, start: 2, end: 4, tfdt: 180000, keyframe: 2 },
      { n: 3, start: 4, end: 6, tfdt: 360000, keyframe: 4 },
      { n: 4, start: 6, end: 8, tfdt: 540000, keyframe: 6 },
    ],
  },
  {
    name: '1080p',
    segments: [
      { n: 1, start: 0, end: 2, tfdt: 0, keyframe: 0 },
      { n: 2, start: 2, end: 4, tfdt: 180000, keyframe: 2 },
      { n: 3, start: 4.25, end: 6.25, tfdt: 382500, keyframe: 4.25, expectedTfdt: 360000, expectedKeyframe: 4 },
      { n: 4, start: 6.25, end: 8.25, tfdt: 562500, keyframe: 6.25 },
    ],
  },
]

export function AbrLadderPage() {
  return (
    <VizShell eyebrow="Visualization 6" title="ABR ladder alignment" intro="Representations must share segment boundaries and keyframes. A mismatched tfdt breaks seamless switching.">
      <div className="beginner-note">
        <strong>How to read this:</strong> each row is a <Link to="/concept/representation">representation</Link>. For safe ABR,
        segment 3 should start at 4.00s, have <Link to="/concept/tfdt">tfdt</Link> 360000 at a 90kHz timescale,
        and begin on a keyframe. The red segment shows actual values that drift later.
      </div>
      <div className="abr-ladder">
        {ladder.map((row) => (
          <div key={row.name} className="abr-row">
            <strong>{row.name}</strong>
            {row.segments.map((segment) => {
              const isBad = segment.expectedTfdt !== undefined
              return (
                <span
                  key={segment.n}
                  className={isBad ? 'bad-segment' : ''}
                  title={`seg${segment.n}: ${segment.start}s-${segment.end}s, tfdt ${segment.tfdt}, keyframe ${segment.keyframe}s`}
                >
                  <b>seg{segment.n}</b>
                  <small>{segment.start.toFixed(2)}–{segment.end.toFixed(2)}s</small>
                  <small>tfdt {segment.tfdt}</small>
                  <i>◆ {segment.keyframe.toFixed(2)}s</i>
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <div className="abr-error-card">
        <strong>Mismatch in 1080p segment 3</strong>
        <p>Expected tfdt <code>360000</code> and keyframe <code>4.00s</code>; actual tfdt is <code>382500</code> and keyframe is <code>4.25s</code>. A player switching from 720p segment 2 into this 1080p segment would land 250ms late.</p>
      </div>
    </VizShell>
  )
}

type BoxColumn = 'mpd' | 'init' | 'fragment' | 'output'
type BoxKind = 'manifest' | 'box' | 'field' | 'concept'
type DashFilter = 'metadata' | 'timing' | 'payload' | 'seeking'
type EdgeMode = 'copied' | 'rewritten' | 'derived' | 'optional'

type BoxNode = {
  id: string
  label: string
  column: BoxColumn
  kind: BoxKind
  description: string
  details?: string[]
  level?: number
  optional?: boolean
  filters: DashFilter[]
}

type DashEdge = {
  id: string
  from: string
  to: string
  label: string
  description: string
  mode: EdgeMode
  filters: DashFilter[]
}

type ActivePanel =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | null

const dashColumnLabels: Record<BoxColumn, string> = {
  mpd: '1. DASH manifest / MPD',
  init: '2. Init segment metadata',
  fragment: '3. Media fragments',
  output: '4. Final single fMP4 file',
}

const dashFilterLabels: Record<DashFilter, string> = {
  metadata: 'Show metadata',
  timing: 'Show timing',
  payload: 'Show payload bytes',
  seeking: 'Show seeking/random access',
}

const dashNodes: BoxNode[] = [
  {
    id: 'mpd',
    label: 'MPD',
    column: 'mpd',
    kind: 'manifest',
    level: 0,
    filters: ['metadata'],
    description: 'The DASH manifest describes presentations, representations, segment URL patterns, codecs, timing, and bandwidth. It usually does not contain the encoded media bytes.',
    details: [
      'Resolves BaseURL plus SegmentTemplate or SegmentList into fetchable URLs.',
      'Builds a media timeline from SegmentTimeline, duration, timescale, startNumber, and Period timing.',
      'Selects compatible Representation entries by mimeType, codecs, resolution, bandwidth, language, and role.',
    ],
  },
  {
    id: 'period',
    label: 'Period',
    column: 'mpd',
    kind: 'manifest',
    level: 1,
    filters: ['metadata', 'timing'],
    description: 'A Period is a time span in the DASH presentation. Each Period contains one or more AdaptationSets.',
    details: ['Period timing helps place Representation segments on the overall presentation timeline.'],
  },
  {
    id: 'adaptation-set',
    label: 'AdaptationSet',
    column: 'mpd',
    kind: 'manifest',
    level: 2,
    filters: ['metadata'],
    description: 'An AdaptationSet groups alternatives for one media role, such as video, audio, subtitles, or alternate languages.',
    details: ['A remuxer commonly chooses one video Representation and one audio Representation from their AdaptationSets.'],
  },
  {
    id: 'representation',
    label: 'Representation',
    column: 'mpd',
    kind: 'manifest',
    level: 3,
    filters: ['metadata'],
    description: 'A Representation is one encoded version of an AdaptationSet, with its own codec string, bitrate, and segment addresses.',
    details: ['The chosen Representation determines which init segment and media segments are downloaded.'],
  },
  {
    id: 'base-url',
    label: 'BaseURL',
    column: 'mpd',
    kind: 'field',
    level: 4,
    filters: ['metadata'],
    description: 'BaseURL provides the base path used to resolve relative initialization and media segment URLs.',
    details: ['Multiple BaseURL levels can combine: MPD → Period → AdaptationSet → Representation.'],
  },
  {
    id: 'segment-template',
    label: 'SegmentTemplate',
    column: 'mpd',
    kind: 'field',
    level: 4,
    filters: ['metadata', 'timing'],
    description: 'SegmentTemplate names the initialization URL and media URL pattern, often using $Number$, $Time$, or $RepresentationID$ placeholders.',
    details: ['It can provide timescale, duration, startNumber, initialization, and media attributes.'],
  },
  {
    id: 'segment-timeline',
    label: 'SegmentTimeline',
    column: 'mpd',
    kind: 'field',
    level: 5,
    filters: ['timing'],
    description: 'SegmentTimeline explicitly lists segment durations and optional start times in MPD timescale units.',
    details: ['It turns template placeholders into an ordered media timeline and fetch list.'],
  },
  {
    id: 'mpd-codecs',
    label: 'codecs / mimeType / bandwidth / timescale',
    column: 'mpd',
    kind: 'field',
    level: 4,
    filters: ['metadata', 'timing'],
    description: 'Representation fields advertise container type, codec family, bitrate, and timing scale before any bytes are fetched.',
    details: ['These values help select compatible tracks, but decoder configuration still comes from the init segment sample description boxes.'],
  },
  {
    id: 'segment-urls',
    label: 'ordered init + media segment URLs',
    column: 'mpd',
    kind: 'concept',
    level: 0,
    filters: ['metadata', 'timing'],
    description: 'The resolved manifest becomes an ordered work list: download init segment first, then media fragments in presentation order.',
    details: ['The MPD describes where bytes live; the byte-bearing boxes are fetched from segment URLs.'],
  },
  {
    id: 'init-ftyp',
    label: 'ftyp',
    column: 'init',
    kind: 'box',
    level: 0,
    filters: ['metadata'],
    description: 'The File Type box identifies the major brand and compatible brands for the init segment.',
    details: ['For fMP4/DASH you may see brands such as isom, iso6, mp41, dash, cmfc, or avc1.'],
  },
  {
    id: 'init-moov',
    label: 'moov',
    column: 'init',
    kind: 'box',
    level: 0,
    filters: ['metadata', 'timing'],
    description: 'The Movie box contains global movie metadata and track descriptions needed before parsing fragments.',
    details: ['In fragmented MP4, moov is mostly initialization metadata; per-sample timing and sizes arrive later in moof/trun.'],
  },
  {
    id: 'init-mvhd',
    label: 'mvhd',
    column: 'init',
    kind: 'box',
    level: 1,
    filters: ['metadata', 'timing'],
    description: 'Movie header: overall timescale, duration, and movie-level properties.',
    details: ['Duration may be zero, unknown, or updated depending on packaging workflow.'],
  },
  {
    id: 'init-trak',
    label: 'trak',
    column: 'init',
    kind: 'box',
    level: 1,
    filters: ['metadata'],
    description: 'A track box describes one media track, such as video or audio.',
    details: ['A final file can contain separate video and audio trak boxes.'],
  },
  {
    id: 'init-tkhd',
    label: 'tkhd',
    column: 'init',
    kind: 'box',
    level: 2,
    filters: ['metadata'],
    description: 'Track header: track id, dimensions for video, layer, volume, and flags.',
    details: ['Track ids may be preserved or normalized when combining multiple inputs.'],
  },
  {
    id: 'init-mdia',
    label: 'mdia',
    column: 'init',
    kind: 'box',
    level: 2,
    filters: ['metadata', 'timing'],
    description: 'Media box: groups media header, handler, and media information for a track.',
    details: ['This is where track timescale and handler type live.'],
  },
  {
    id: 'init-mdhd',
    label: 'mdhd',
    column: 'init',
    kind: 'box',
    level: 3,
    filters: ['metadata', 'timing'],
    description: 'Media header: track timescale, duration, and language.',
    details: ['Fragment timing values are interpreted using this track timescale.'],
  },
  {
    id: 'init-hdlr',
    label: 'hdlr',
    column: 'init',
    kind: 'box',
    level: 3,
    filters: ['metadata'],
    description: 'Handler box: declares whether the track is video, audio, subtitles, metadata, and so on.',
    details: ['Common handler types include vide and soun.'],
  },
  {
    id: 'init-minf',
    label: 'minf',
    column: 'init',
    kind: 'box',
    level: 3,
    filters: ['metadata'],
    description: 'Media information box: contains media-type-specific header boxes and the sample table.',
    details: ['Video uses vmhd; audio uses smhd. Both lead into stbl.'],
  },
  {
    id: 'init-stbl',
    label: 'stbl',
    column: 'init',
    kind: 'box',
    level: 4,
    filters: ['metadata', 'timing'],
    description: 'Sample table box. In fragmented MP4, many traditional sample tables can be empty or skeletal because fragments carry the sample runs.',
    details: ['Progressive MP4 would need complete centralized tables; this fMP4 output keeps repeated moof/mdat fragments instead.'],
  },
  {
    id: 'init-stsd',
    label: 'stsd',
    column: 'init',
    kind: 'box',
    level: 5,
    filters: ['metadata'],
    description: 'Sample description box: lists sample entries such as avc1, hvc1, av01, or mp4a and their codec-specific children.',
    details: ['This is essential initialization metadata for decoders.'],
  },
  {
    id: 'init-codec-entry',
    label: 'avc1 / hvc1 / av01 / mp4a',
    column: 'init',
    kind: 'box',
    level: 6,
    filters: ['metadata'],
    description: 'Codec sample entries describe coded video or audio format details such as dimensions, channel count, and sample rate.',
    details: ['The entry type must match the codec string and codec configuration box.'],
  },
  {
    id: 'init-codec-config',
    label: 'avcC / hvcC / av1C / esds',
    column: 'init',
    kind: 'box',
    level: 6,
    filters: ['metadata'],
    description: 'Codec configuration boxes carry decoder setup data such as SPS/PPS/VPS, AV1 sequence header info, or MPEG-4 AudioSpecificConfig.',
    details: ['These bytes are copied as metadata; encoded frames are not decoded to discover them.'],
  },
  {
    id: 'init-stts',
    label: 'stts',
    column: 'init',
    kind: 'box',
    level: 5,
    filters: ['timing'],
    description: 'Decode-time-to-sample table. In an fMP4 init segment it is often empty or skeletal.',
    details: ['Fragment sample durations usually come from trun and tfhd defaults.'],
  },
  {
    id: 'init-stsc',
    label: 'stsc',
    column: 'init',
    kind: 'box',
    level: 5,
    filters: ['metadata'],
    description: 'Sample-to-chunk table. In fragmented MP4 this is commonly empty because fragment runs describe their own layout.',
    details: ['A progressive MP4 conversion would need to build this table.'],
  },
  {
    id: 'init-stsz',
    label: 'stsz',
    column: 'init',
    kind: 'box',
    level: 5,
    filters: ['payload'],
    description: 'Sample size table. In fMP4 the real per-sample sizes usually appear in trun entries inside fragments.',
    details: ['A progressive MP4 conversion would need centralized sample sizes here.'],
  },
  {
    id: 'init-stco',
    label: 'stco / co64',
    column: 'init',
    kind: 'box',
    level: 5,
    filters: ['payload'],
    description: 'Chunk offset tables. In fMP4 init segments these are typically empty because moof/trun data offsets place each fragment payload.',
    details: ['A progressive MP4 conversion would need complete stco/co64 offsets.'],
  },
  {
    id: 'frag-styp',
    label: 'styp',
    column: 'fragment',
    kind: 'box',
    level: 0,
    filters: ['metadata'],
    description: 'Segment Type box: identifies segment brands and compatibility. It may be kept, dropped, or normalized depending on the final file style.',
    details: ['styp is segment-level identity, not encoded media.'],
  },
  {
    id: 'frag-sidx',
    label: 'sidx (optional)',
    column: 'fragment',
    kind: 'box',
    level: 0,
    optional: true,
    filters: ['metadata', 'seeking'],
    description: 'Segment Index box: optional indexing metadata that can point to subsegments and durations.',
    details: ['Not every DASH fMP4 segment has sidx, and a final remuxed file does not require it for basic playback.'],
  },
  {
    id: 'frag-moof',
    label: 'moof',
    column: 'fragment',
    kind: 'box',
    level: 0,
    filters: ['metadata', 'timing'],
    description: 'Movie Fragment box: contains metadata for one fragment of encoded samples.',
    details: ['The output remains fragmented, so these fragment metadata structures are preserved or rewritten into output moof boxes.'],
  },
  {
    id: 'frag-mfhd',
    label: 'mfhd',
    column: 'fragment',
    kind: 'box',
    level: 1,
    filters: ['metadata'],
    description: 'Movie Fragment Header: identifies the fragment sequence number.',
    details: ['Sequence numbers are often rewritten so the final file has a clean monotonically increasing sequence.'],
  },
  {
    id: 'frag-traf',
    label: 'traf',
    column: 'fragment',
    kind: 'box',
    level: 1,
    filters: ['metadata', 'timing'],
    description: 'Track Fragment box: track-specific fragment metadata.',
    details: ['A moof can contain one traf per track included in the fragment.'],
  },
  {
    id: 'frag-tfhd',
    label: 'tfhd',
    column: 'fragment',
    kind: 'box',
    level: 2,
    filters: ['metadata', 'timing'],
    description: 'Track Fragment Header: gives track id and default sample properties for this track fragment.',
    details: ['Track ids and default flags/durations/sizes may be preserved or rewritten.'],
  },
  {
    id: 'frag-tfdt',
    label: 'tfdt',
    column: 'fragment',
    kind: 'box',
    level: 2,
    filters: ['timing'],
    description: 'Track Fragment Decode Time: gives the base decode time for the first sample in the fragment.',
    details: ['If the remuxer normalizes the timeline, it may rewrite baseMediaDecodeTime values.'],
  },
  {
    id: 'frag-trun',
    label: 'trun',
    column: 'fragment',
    kind: 'box',
    level: 2,
    filters: ['timing', 'payload', 'seeking'],
    description: 'Track Run box: lists samples in this fragment and can carry durations, sizes, flags, composition offsets, and data offset.',
    details: ['DTS comes from tfdt plus cumulative durations. PTS comes from DTS plus composition time offsets.'],
  },
  {
    id: 'frag-sample-duration',
    label: 'sample duration',
    column: 'fragment',
    kind: 'field',
    level: 3,
    filters: ['timing'],
    description: 'Per-sample decode durations in trun, or defaults inherited from tfhd/trex.',
    details: ['Cumulative sample durations reconstruct decode timestamps.'],
  },
  {
    id: 'frag-sample-size',
    label: 'sample size',
    column: 'fragment',
    kind: 'field',
    level: 3,
    filters: ['payload'],
    description: 'Per-sample byte sizes in trun, or defaults inherited from tfhd/trex.',
    details: ['Sizes define how to split mdat payload bytes back into encoded samples.'],
  },
  {
    id: 'frag-sample-flags',
    label: 'sample flags',
    column: 'fragment',
    kind: 'field',
    level: 3,
    filters: ['seeking'],
    description: 'Sample flags identify sync/keyframe samples and dependency information.',
    details: ['These flags are a common source for random-access detection and tfra entries.'],
  },
  {
    id: 'frag-composition-offset',
    label: 'composition time offset',
    column: 'fragment',
    kind: 'field',
    level: 3,
    filters: ['timing'],
    description: 'Composition offsets convert decode time to presentation time for codecs with frame reordering.',
    details: ['PTS = DTS + composition time offset.'],
  },
  {
    id: 'frag-mdat',
    label: 'mdat',
    column: 'fragment',
    kind: 'box',
    level: 0,
    filters: ['payload'],
    description: 'Media Data box: contains the actual encoded media bytes, such as H.264/H.265/AV1 samples or AAC frames.',
    details: ['In normal remuxing these bytes are copied; the remuxer does not decode and re-encode frames.'],
  },
  {
    id: 'random-access-detection',
    label: 'random access detection',
    column: 'fragment',
    kind: 'concept',
    level: 0,
    filters: ['seeking'],
    description: 'A remuxer can inspect sample flags and fragment timing to find keyframes or random-access points.',
    details: ['Those points can later be summarized in optional mfra/tfra metadata.'],
  },
  {
    id: 'out-ftyp',
    label: 'ftyp',
    column: 'output',
    kind: 'box',
    level: 0,
    filters: ['metadata'],
    description: 'The output file starts with compatible file brands, usually derived from the init segment and output packaging choices.',
    details: ['This top-level box identifies the result as an MP4/fMP4-compatible file.'],
  },
  {
    id: 'out-moov',
    label: 'moov',
    column: 'output',
    kind: 'box',
    level: 0,
    filters: ['metadata', 'timing'],
    description: 'The output moov contains initialization metadata for all included tracks plus fragmented-movie defaults.',
    details: ['Because the output remains fragmented, the moov contains mvex/trex and does not need complete progressive sample tables.'],
  },
  {
    id: 'out-mvhd',
    label: 'mvhd',
    column: 'output',
    kind: 'box',
    level: 1,
    filters: ['metadata', 'timing'],
    description: 'Output movie header, possibly with normalized duration or timescale metadata.',
    details: ['Movie duration metadata may be updated to match selected fragments.'],
  },
  {
    id: 'out-trak-video',
    label: 'trak video',
    column: 'output',
    kind: 'box',
    level: 1,
    filters: ['metadata'],
    description: 'The video track metadata copied or adapted from the selected video init segment.',
    details: ['Contains mdia/minf/stbl/stsd and codec config for the video track.'],
  },
  {
    id: 'out-trak-audio',
    label: 'trak audio',
    column: 'output',
    kind: 'box',
    level: 1,
    filters: ['metadata'],
    description: 'The audio track metadata copied or adapted from the selected audio init segment.',
    details: ['Contains mdia/minf/stbl/stsd and codec config for the audio track.'],
  },
  {
    id: 'out-stsd',
    label: 'stsd codec metadata',
    column: 'output',
    kind: 'box',
    level: 2,
    filters: ['metadata'],
    description: 'Output sample descriptions retain the decoder initialization data needed to interpret encoded samples.',
    details: ['Includes avc1/hvc1/av01/mp4a entries plus avcC/hvcC/av1C/esds as appropriate.'],
  },
  {
    id: 'out-mvex',
    label: 'mvex',
    column: 'output',
    kind: 'box',
    level: 1,
    filters: ['metadata'],
    description: 'Movie Extends box: signals that the file is fragmented and defines defaults used by movie fragments.',
    details: ['A fragmented output should include mvex in moov.'],
  },
  {
    id: 'out-trex',
    label: 'trex',
    column: 'output',
    kind: 'box',
    level: 2,
    filters: ['metadata', 'timing'],
    description: 'Track Extends box: default sample description, duration, size, and flags for fragments of a track.',
    details: ['tfhd/trun values can override these defaults per fragment.'],
  },
  {
    id: 'out-fragment-order',
    label: 'output fragment order',
    column: 'output',
    kind: 'concept',
    level: 0,
    filters: ['metadata', 'timing'],
    description: 'The final fMP4 writes fragments in the selected timeline order, commonly interleaving or appending moof/mdat pairs.',
    details: ['The ordered DASH URL list determines which fragments appear and in what order.'],
  },
  {
    id: 'out-moof',
    label: 'moof × N',
    column: 'output',
    kind: 'box',
    level: 0,
    filters: ['metadata', 'timing'],
    description: 'Repeated movie fragment boxes in the final file. They contain the metadata for each output fragment.',
    details: ['These are copied structurally from media segments but often rewritten for final offsets, sequence numbers, and timelines.'],
  },
  {
    id: 'out-mfhd',
    label: 'mfhd',
    column: 'output',
    kind: 'box',
    level: 1,
    filters: ['metadata'],
    description: 'Output fragment header with sequence numbers adjusted for the final file.',
    details: ['Sequence numbers may be rewritten to be contiguous after filtering or concatenating.'],
  },
  {
    id: 'out-traf',
    label: 'traf',
    column: 'output',
    kind: 'box',
    level: 1,
    filters: ['metadata', 'timing'],
    description: 'Output track fragment metadata for one track inside a moof.',
    details: ['Track ids/defaults may be rewritten when merging separate audio/video sources.'],
  },
  {
    id: 'out-tfhd',
    label: 'tfhd',
    column: 'output',
    kind: 'box',
    level: 2,
    filters: ['metadata', 'timing'],
    description: 'Output track fragment header, possibly with rewritten track id, flags, or sample defaults.',
    details: ['Still describes encoded samples; it does not decode them.'],
  },
  {
    id: 'out-tfdt',
    label: 'tfdt',
    column: 'output',
    kind: 'box',
    level: 2,
    filters: ['timing'],
    description: 'Output base decode time, preserved or normalized to a new timeline origin.',
    details: ['DTS reconstruction starts from this value plus trun durations.'],
  },
  {
    id: 'out-trun',
    label: 'trun',
    column: 'output',
    kind: 'box',
    level: 2,
    filters: ['timing', 'payload', 'seeking'],
    description: 'Output sample run. It may need rewritten data offsets because mdat byte positions changed in the final file.',
    details: ['Sample durations, sizes, flags, and composition offsets describe copied encoded samples.'],
  },
  {
    id: 'out-mdat',
    label: 'mdat × N',
    column: 'output',
    kind: 'box',
    level: 0,
    filters: ['payload'],
    description: 'Output media data boxes containing the copied encoded sample bytes.',
    details: ['This is the payload: usually copied byte-for-byte aside from possible box size/layout changes around it.'],
  },
  {
    id: 'final-offsets',
    label: 'final fragment byte offsets',
    column: 'output',
    kind: 'concept',
    level: 0,
    filters: ['payload', 'seeking'],
    description: 'Once fragments are written, the remuxer knows the final byte offset of each moof/mdat pair.',
    details: ['Those offsets can be used to fill trun data_offset and optional tfra random-access entries.'],
  },
  {
    id: 'out-mfra',
    label: 'mfra (optional)',
    column: 'output',
    kind: 'box',
    level: 0,
    optional: true,
    filters: ['seeking'],
    description: 'Movie Fragment Random Access box. It usually appears near the end of a fragmented MP4 and helps readers find random-access points.',
    details: ['mfra is useful for seeking/indexing but is not mandatory for basic playback.'],
  },
  {
    id: 'out-tfra',
    label: 'tfra',
    column: 'output',
    kind: 'box',
    level: 1,
    optional: true,
    filters: ['seeking'],
    description: 'Track Fragment Random Access box: lists random-access times and moof byte offsets for a track.',
    details: ['tfra entries are derived from keyframe/sample flags, track timing, and final fragment positions.'],
  },
  {
    id: 'out-mfro',
    label: 'mfro',
    column: 'output',
    kind: 'box',
    level: 1,
    optional: true,
    filters: ['seeking'],
    description: 'Movie Fragment Random Access Offset box. It records the size of the mfra box so readers can locate it from the end of the file.',
    details: ['mfro is part of the optional mfra structure.'],
  },
]

const dashEdges: DashEdge[] = [
  {
    id: 'template-to-urls',
    from: 'segment-template',
    to: 'segment-urls',
    label: 'resolve URLs',
    mode: 'derived',
    filters: ['metadata', 'timing'],
    description: 'SegmentTemplate, SegmentTimeline, BaseURL, and Representation attributes are evaluated to create an ordered list of init and media segment URLs.',
  },
  {
    id: 'timeline-to-urls',
    from: 'segment-timeline',
    to: 'segment-urls',
    label: 'timeline order',
    mode: 'derived',
    filters: ['timing'],
    description: 'SegmentTimeline durations and repetitions decide segment order and media time ranges.',
  },
  {
    id: 'baseurl-to-urls',
    from: 'base-url',
    to: 'segment-urls',
    label: 'base path',
    mode: 'derived',
    filters: ['metadata'],
    description: 'BaseURL contributes the path used to fetch initialization and media segment bytes.',
  },
  {
    id: 'urls-to-order',
    from: 'segment-urls',
    to: 'out-fragment-order',
    label: 'write order',
    mode: 'derived',
    filters: ['metadata', 'timing'],
    description: 'The resolved media URL list becomes the order in which output fragments are appended to the fMP4.',
  },
  {
    id: 'codecs-to-stsd',
    from: 'mpd-codecs',
    to: 'out-stsd',
    label: 'select metadata',
    mode: 'derived',
    filters: ['metadata'],
    description: 'MPD codecs and mimeType identify which codec metadata should appear in output stsd, but exact decoder config is copied from the init segment.',
  },
  {
    id: 'ftyp-copy',
    from: 'init-ftyp',
    to: 'out-ftyp',
    label: 'brands',
    mode: 'copied',
    filters: ['metadata'],
    description: 'The init ftyp brands are copied or lightly adjusted to identify the final fragmented MP4 file.',
  },
  {
    id: 'moov-copy',
    from: 'init-moov',
    to: 'out-moov',
    label: 'movie init',
    mode: 'rewritten',
    filters: ['metadata', 'timing'],
    description: 'The init moov supplies movie and track metadata; the output may rewrite durations, ids, or mvex/trex defaults.',
  },
  {
    id: 'mvhd-copy',
    from: 'init-mvhd',
    to: 'out-mvhd',
    label: 'duration/timescale',
    mode: 'rewritten',
    filters: ['metadata', 'timing'],
    description: 'Movie header values are copied or adjusted to match selected tracks and total fragment duration.',
  },
  {
    id: 'trak-copy',
    from: 'init-trak',
    to: 'out-trak-video',
    label: 'track metadata',
    mode: 'copied',
    filters: ['metadata'],
    description: 'Track metadata such as tkhd/mdia/minf/stbl is copied into the output video track, with ids or durations possibly adjusted.',
  },
  {
    id: 'audio-trak-copy',
    from: 'init-trak',
    to: 'out-trak-audio',
    label: 'track metadata',
    mode: 'copied',
    filters: ['metadata'],
    description: 'A selected audio init segment contributes a parallel audio trak in the final file.',
  },
  {
    id: 'stsd-copy',
    from: 'init-stsd',
    to: 'out-stsd',
    label: 'sample entries',
    mode: 'copied',
    filters: ['metadata'],
    description: 'The stsd sample entries are copied into the output track codec metadata.',
  },
  {
    id: 'codec-config-copy',
    from: 'init-codec-config',
    to: 'out-stsd',
    label: 'decoder config',
    mode: 'copied',
    filters: ['metadata'],
    description: 'Codec config boxes such as avcC/hvcC/av1C/esds are essential decoder setup metadata and are copied into the output stsd.',
  },
  {
    id: 'init-to-mvex',
    from: 'init-moov',
    to: 'out-mvex',
    label: 'fragmented movie',
    mode: 'derived',
    filters: ['metadata'],
    description: 'A fragmented output requires moov/mvex/trex defaults so later moof boxes can reference track defaults.',
  },
  {
    id: 'mfhd-rewrite',
    from: 'frag-mfhd',
    to: 'out-mfhd',
    label: 'sequence #',
    mode: 'rewritten',
    filters: ['metadata'],
    description: 'mfhd sequence numbers can be rewritten to form a clean contiguous sequence in the single output file.',
  },
  {
    id: 'moof-to-moof',
    from: 'frag-moof',
    to: 'out-moof',
    label: 'fragment metadata',
    mode: 'rewritten',
    filters: ['metadata', 'timing'],
    description: 'moof structures are carried into the output, with child fields updated for final track ids, timing, and byte offsets as needed.',
  },
  {
    id: 'tfhd-rewrite',
    from: 'frag-tfhd',
    to: 'out-tfhd',
    label: 'track defaults',
    mode: 'rewritten',
    filters: ['metadata', 'timing'],
    description: 'tfhd may be rewritten for output track ids, flags, base-data-offset behavior, or sample defaults.',
  },
  {
    id: 'traf-rewrite',
    from: 'frag-traf',
    to: 'out-traf',
    label: 'track fragment',
    mode: 'rewritten',
    filters: ['metadata', 'timing'],
    description: 'traf boxes remain track-specific fragment metadata, possibly with adjusted track ids/defaults.',
  },
  {
    id: 'tfdt-normalize',
    from: 'frag-tfdt',
    to: 'out-tfdt',
    label: 'base decode time',
    mode: 'rewritten',
    filters: ['timing'],
    description: 'tfdt base decode times may be preserved or normalized so the final file timeline starts at a desired origin.',
  },
  {
    id: 'trun-rewrite',
    from: 'frag-trun',
    to: 'out-trun',
    label: 'sample run',
    mode: 'rewritten',
    filters: ['timing', 'payload', 'seeking'],
    description: 'trun sample entries are preserved, but data_offset is commonly rewritten because mdat bytes move to new positions.',
  },
  {
    id: 'mdat-copy',
    from: 'frag-mdat',
    to: 'out-mdat',
    label: 'encoded bytes',
    mode: 'copied',
    filters: ['payload'],
    description: 'mdat contains encoded samples. Remuxing usually copies these bytes instead of decoding and re-encoding frames.',
  },
  {
    id: 'duration-to-trun',
    from: 'frag-sample-duration',
    to: 'out-trun',
    label: 'DTS pieces',
    mode: 'copied',
    filters: ['timing'],
    description: 'Sample durations from trun/defaults remain in output trun and reconstruct DTS with tfdt.',
  },
  {
    id: 'size-to-trun',
    from: 'frag-sample-size',
    to: 'out-trun',
    label: 'sample sizes',
    mode: 'copied',
    filters: ['payload'],
    description: 'Sample sizes keep the copied mdat payload split into the correct encoded samples.',
  },
  {
    id: 'offset-to-pts',
    from: 'frag-composition-offset',
    to: 'out-trun',
    label: 'PTS offsets',
    mode: 'copied',
    filters: ['timing'],
    description: 'Composition offsets are retained so PTS can be reconstructed as DTS plus offset.',
  },
  {
    id: 'tfdt-trun-dts',
    from: 'frag-tfdt',
    to: 'out-trun',
    label: 'DTS = tfdt + durations',
    mode: 'derived',
    filters: ['timing'],
    description: 'DTS is reconstructed from the fragment base decode time plus cumulative trun sample durations.',
  },
  {
    id: 'flags-to-ra',
    from: 'frag-sample-flags',
    to: 'random-access-detection',
    label: 'keyframes',
    mode: 'derived',
    filters: ['seeking'],
    description: 'Sample flags identify sync samples and dependency information used to find random-access points.',
  },
  {
    id: 'ra-to-tfra',
    from: 'random-access-detection',
    to: 'out-tfra',
    label: 'tfra entries',
    mode: 'optional',
    filters: ['seeking'],
    description: 'If the output includes mfra, random-access samples can become tfra entries for each track.',
  },
  {
    id: 'offsets-to-mfra',
    from: 'final-offsets',
    to: 'out-mfra',
    label: 'near file end',
    mode: 'optional',
    filters: ['seeking', 'payload'],
    description: 'After writing final fragments, the remuxer can record fragment byte offsets in optional mfra/tfra metadata near the end of the file.',
  },
  {
    id: 'offsets-to-tfra',
    from: 'final-offsets',
    to: 'out-tfra',
    label: 'moof offsets',
    mode: 'optional',
    filters: ['seeking', 'payload'],
    description: 'tfra entries need final moof byte offsets, so they are derived after output layout is known.',
  },
  {
    id: 'mfra-to-mfro',
    from: 'out-mfra',
    to: 'out-mfro',
    label: 'box size',
    mode: 'optional',
    filters: ['seeking'],
    description: 'mfro indicates the size of the mfra box so a reader can locate mfra from the end of the file.',
  },
  {
    id: 'trun-to-offsets',
    from: 'out-trun',
    to: 'final-offsets',
    label: 'data offsets',
    mode: 'derived',
    filters: ['payload', 'seeking'],
    description: 'Final layout determines trun data offsets and the byte offsets used by random-access indexes.',
  },
  {
    id: 'sidx-optional',
    from: 'frag-sidx',
    to: 'out-fragment-order',
    label: 'optional index',
    mode: 'optional',
    filters: ['metadata', 'seeking'],
    description: 'sidx may help understand segment ranges, but it is optional and not required in every DASH input or final fMP4.',
  },
]

const edgeModeLabels: Record<EdgeMode, string> = {
  copied: 'copied directly',
  rewritten: 'rewritten',
  derived: 'derived',
  optional: 'optional',
}

const boxConceptIds: Record<string, string> = {
  ftyp: 'ftyp',
  moov: 'moov',
  mvex: 'mvex',
  trex: 'trex',
  trak: 'trak',
  stsd: 'stsd',
  stts: 'stts',
  ctts: 'ctts',
  stsz: 'stsz',
  stsc: 'stsc',
  stss: 'stss',
  avcC: 'avcc',
  hvcC: 'hvcc',
  av1C: 'av1c',
  esds: 'esds',
  styp: 'styp',
  sidx: 'sidx',
  moof: 'moof',
  traf: 'traf',
  tfhd: 'tfhd',
  tfdt: 'tfdt',
  trun: 'trun',
  mdat: 'mdat',
  mfra: 'mfra',
  tfra: 'tfra',
  mfro: 'mfro',
  'stco/co64': 'stco-co64',
}

const boxRefPattern = new RegExp(
  Object.keys(boxConceptIds)
    .sort((a, b) => b.length - a.length)
    .map((boxName) => boxName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g',
)

function renderBoxRefs(text: string) {
  const parts: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(boxRefPattern)) {
    const boxName = match[0]
    const index = match.index ?? 0
    if (index > lastIndex) parts.push(text.slice(lastIndex, index))
    parts.push(
      <Link key={`${boxName}-${index}`} className="dash-box-ref" to={`/concept/${boxConceptIds[boxName]}`}>
        {boxName}
      </Link>,
    )
    lastIndex = index + boxName.length
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

const remuxSteps = [
  {
    title: 'Parse the MPD',
    body: 'Read Period, AdaptationSet, Representation, BaseURL, SegmentTemplate, SegmentTimeline, codecs, mimeType, bandwidth, and timescale fields.',
    outputs: ['selected audio/video representations', 'presentation timeline', 'URL template inputs'],
  },
  {
    title: 'Resolve the segment fetch list',
    body: 'Combine BaseURL with initialization and media templates, expand $Number$/$Time$ placeholders, and order fragments by the DASH timeline.',
    outputs: ['init segment URLs', 'ordered media segment URLs', 'expected decode-time ranges'],
  },
  {
    title: 'Download and parse init segments',
    body: 'Fetch each selected init segment and parse ftyp + moov. Extract track ids, timescales, handler types, mvex/trex defaults, and stsd codec configuration.',
    outputs: ['output ftyp brands', 'video/audio trak metadata', 'codec config boxes such as avcC/hvcC/av1C/esds'],
  },
  {
    title: 'Create the output initialization area',
    body: 'Write output ftyp and moov. Keep the file fragmented by including moov/mvex/trex rather than building a progressive MP4 sample-table index.',
    outputs: ['ftyp', 'moov with trak video/audio', 'mvex/trex defaults'],
  },
  {
    title: 'Read each media fragment',
    body: 'For every selected segment, parse optional styp/sidx, then moof/traf/tfhd/tfdt/trun and the following mdat payload bytes.',
    outputs: ['fragment metadata', 'encoded sample byte ranges', 'sample durations/sizes/flags/composition offsets'],
  },
  {
    title: 'Normalize metadata as needed',
    body: 'Adjust fragment sequence numbers, track ids, tfhd defaults, tfdt base decode times, durations, and trun flags according to the output timeline and chosen tracks.',
    outputs: ['contiguous mfhd sequence numbers', 'consistent track ids', 'normalized decode timeline'],
  },
  {
    title: 'Copy payload bytes into output mdat boxes',
    body: 'Append encoded samples without decoding/re-encoding them. Preserve sample boundaries using trun sample sizes and defaults.',
    outputs: ['copied encoded video/audio samples', 'new final mdat byte positions'],
  },
  {
    title: 'Rewrite offsets after layout is known',
    body: 'Once each output moof/mdat position is known, update trun data_offset or base-data-offset-related fields so metadata points at the copied bytes.',
    outputs: ['correct trun data offsets', 'final moof/mdat byte offsets'],
  },
  {
    title: 'Optionally build random-access metadata',
    body: 'Use sample flags, tfdt/trun timing, and final moof offsets to derive mfra/tfra entries. Finish mfra with mfro so readers can locate it from the end of the file.',
    outputs: ['optional mfra', 'optional tfra per track', 'optional mfro size footer'],
  },
  {
    title: 'Finalize the downloadable file',
    body: 'Emit the final structure: ftyp + moov/mvex + repeated moof/mdat pairs + optional mfra. Validate box sizes, durations, offsets, and track references.',
    outputs: ['single fragmented MP4 file', 'seekable/indexable when optional metadata is present'],
  },
]

function edgePath(source: DOMRect, target: DOMRect, stage: DOMRect) {
  const sourceX = source.right - stage.left
  const sourceY = source.top - stage.top + source.height / 2
  const targetX = target.left - stage.left
  const targetY = target.top - stage.top + target.height / 2
  const midX = sourceX + Math.max(48, (targetX - sourceX) / 2)

  return `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`
}

function edgeIsVisible(edge: DashEdge, activeFilters: Set<DashFilter>) {
  return edge.filters.some((filter) => activeFilters.has(filter))
}

export function DashFragmentsPage() {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [enabledFilters, setEnabledFilters] = useState<DashFilter[]>(['metadata', 'timing', 'payload', 'seeking'])
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>({ type: 'node', id: 'mpd' })

  const activeFilters = useMemo(() => new Set(enabledFilters), [enabledFilters])
  const visibleEdges = useMemo(
    () => dashEdges.filter((edge) => edgeIsVisible(edge, activeFilters)),
    [activeFilters],
  )
  const nodesById = useMemo(() => new Map(dashNodes.map((node) => [node.id, node])), [])
  const edgesById = useMemo(() => new Map(dashEdges.map((edge) => [edge.id, edge])), [])
  const highlightedEdge = hoveredEdgeId ? edgesById.get(hoveredEdgeId) : activePanel?.type === 'edge' ? edgesById.get(activePanel.id) : undefined
  const highlightedNodeId = hoveredNodeId ?? (activePanel?.type === 'node' ? activePanel.id : null)

  useEffect(() => {
    const stageElement = stageRef.current
    const svgElement = svgRef.current
    if (!stageElement || !svgElement) return

    const draw = () => {
      const stageRect = stageElement.getBoundingClientRect()
      const width = Math.max(stageElement.scrollWidth, stageElement.clientWidth)
      const height = Math.max(stageElement.scrollHeight, stageElement.clientHeight)
      const svg = d3.select(svgElement)
      svg.selectAll('*').remove()
      svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height)

      const defs = svg.append('defs')
      ;(['copied', 'rewritten', 'derived', 'optional'] as EdgeMode[]).forEach((mode) => {
        defs
          .append('marker')
          .attr('id', `dash-arrow-${mode}`)
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 9)
          .attr('refY', 0)
          .attr('markerWidth', 7)
          .attr('markerHeight', 7)
          .attr('orient', 'auto')
          .append('path')
          .attr('class', `dash-arrowhead dash-arrowhead-${mode}`)
          .attr('d', 'M0,-5L10,0L0,5')
      })

      const edgeGroups = svg
        .append('g')
        .attr('class', 'dash-edge-layer')
        .selectAll('g')
        .data(visibleEdges)
        .join('g')
        .attr('class', 'dash-edge-group')
        .on('mouseenter', (_event, edge) => {
          setHoveredEdgeId(edge.id)
          setActivePanel({ type: 'edge', id: edge.id })
        })
        .on('mouseleave', () => setHoveredEdgeId(null))
        .on('click', (_event, edge) => setActivePanel({ type: 'edge', id: edge.id }))

      edgeGroups.each(function appendEdge(edge) {
        const sourceElement = stageElement.querySelector<HTMLElement>(`[data-node-id="${edge.from}"]`)
        const targetElement = stageElement.querySelector<HTMLElement>(`[data-node-id="${edge.to}"]`)
        if (!sourceElement || !targetElement) return

        const pathData = edgePath(sourceElement.getBoundingClientRect(), targetElement.getBoundingClientRect(), stageRect)
        const group = d3.select(this)
        group
          .append('path')
          .attr('class', `dash-map-edge dash-map-edge-${edge.mode}`)
          .attr('d', pathData)
          .attr('marker-end', `url(#dash-arrow-${edge.mode})`)
        group.append('path').attr('class', 'dash-map-edge-hit').attr('d', pathData)

        const sourceRect = sourceElement.getBoundingClientRect()
        const targetRect = targetElement.getBoundingClientRect()
        const labelX = (sourceRect.right + targetRect.left) / 2 - stageRect.left
        const labelY = (sourceRect.top + sourceRect.height / 2 + targetRect.top + targetRect.height / 2) / 2 - stageRect.top - 8
        group
          .append('text')
          .attr('class', 'dash-map-edge-label')
          .attr('x', labelX)
          .attr('y', labelY)
          .text(edge.label)
      })
    }

    draw()
    const observer = new ResizeObserver(draw)
    const scrollElement = stageElement.parentElement
    observer.observe(stageElement)
    window.addEventListener('resize', draw)
    scrollElement?.addEventListener('scroll', draw, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', draw)
      scrollElement?.removeEventListener('scroll', draw)
    }
  }, [visibleEdges])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    d3.select(svgElement)
      .selectAll<SVGGElement, DashEdge>('.dash-edge-group')
      .attr('class', (edge) => {
        const isActiveEdge = highlightedEdge?.id === edge.id
        const isConnectedToNode = highlightedNodeId === edge.from || highlightedNodeId === edge.to
        const isDimmed = (highlightedEdge || highlightedNodeId) && !isActiveEdge && !isConnectedToNode
        return `dash-edge-group ${isActiveEdge || isConnectedToNode ? 'is-highlighted' : ''} ${isDimmed ? 'is-dimmed' : ''}`
      })
  }, [highlightedEdge, highlightedNodeId, visibleEdges])

  const activeNode = activePanel?.type === 'node' ? nodesById.get(activePanel.id) : undefined
  const activeEdge = activePanel?.type === 'edge' ? edgesById.get(activePanel.id) : undefined
  const connectedNodeIds = new Set(highlightedEdge ? [highlightedEdge.from, highlightedEdge.to] : [])
  const connectedEdgeNodeIds = new Set(
    highlightedNodeId
      ? visibleEdges.flatMap((edge) => (edge.from === highlightedNodeId || edge.to === highlightedNodeId ? [edge.from, edge.to] : []))
      : [],
  )

  return (
    <VizShell
      eyebrow="Study guide"
      title="DASH fragments → single fMP4"
      intro="A left-to-right map of how a DASH MPD, init segment metadata, and media fragments become one downloadable fragmented MP4 file."
      cardClassName="dash-viz-card"
      pageClassName="dash-viz-page"
    >
      <div className="dash-callout">
        <strong>Remuxing does not usually decode frames.</strong>
        <span> It copies encoded samples and rewrites container metadata so the same media bytes live in a new file structure.</span>
      </div>

      <div className="dash-controls" aria-label="Diagram filters and legend">
        <div className="dash-filter-chips" aria-label="Filter chips">
          {(Object.keys(dashFilterLabels) as DashFilter[]).map((filter) => {
            const isEnabled = activeFilters.has(filter)
            return (
              <button
                key={filter}
                type="button"
                className={isEnabled ? 'is-active' : ''}
                onClick={() => {
                  setEnabledFilters((current) =>
                    current.includes(filter) ? current.filter((candidate) => candidate !== filter) : [...current, filter],
                  )
                }}
              >
                {dashFilterLabels[filter]}
              </button>
            )
          })}
        </div>
        <div className="dash-edge-legend" aria-label="Line style legend">
          {(Object.keys(edgeModeLabels) as EdgeMode[]).map((mode) => (
            <span key={mode}><b className={`dash-legend-line dash-legend-${mode}`} />{edgeModeLabels[mode]}</span>
          ))}
        </div>
      </div>

      <div className="dash-study-layout">
        <div className="dash-map-scroll" aria-label="DASH to fMP4 mapping diagram">
          <div ref={stageRef} className="dash-map-stage">
            <svg ref={svgRef} className="dash-map-svg" aria-hidden="true" />
            <div className="dash-columns">
              {(Object.keys(dashColumnLabels) as BoxColumn[]).map((column) => (
                <section key={column} className={`dash-column dash-column-${column}`}>
                  <h2>{dashColumnLabels[column]}</h2>
                  <div className="dash-node-stack">
                    {dashNodes.filter((node) => node.column === column).map((node) => {
                      const isConnected = connectedNodeIds.has(node.id) || connectedEdgeNodeIds.has(node.id)
                      const isActive = highlightedNodeId === node.id || isConnected
                      const shouldDim = Boolean((highlightedEdge || highlightedNodeId) && !isActive)
                      const hasVisibleFilter = node.filters.some((filter) => activeFilters.has(filter))
                      return (
                        <button
                          key={node.id}
                          type="button"
                          data-node-id={node.id}
                          className={`dash-node-card dash-node-${node.kind} ${node.optional ? 'is-optional' : ''} ${isActive ? 'is-highlighted' : ''} ${shouldDim || !hasVisibleFilter ? 'is-dimmed' : ''}`}
                          style={{ marginLeft: `${(node.level ?? 0) * 18}px` }}
                          onMouseEnter={() => {
                            setHoveredNodeId(node.id)
                            setActivePanel({ type: 'node', id: node.id })
                          }}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          onFocus={() => setActivePanel({ type: 'node', id: node.id })}
                          onClick={() => setActivePanel({ type: 'node', id: node.id })}
                        >
                          <span>{node.label}</span>
                          <small>{node.kind}{node.optional ? ' · optional' : ''}</small>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <aside className="dash-info-panel" aria-live="polite">
          {activeEdge ? (
            <>
              <p className="eyebrow">Mapping arrow · {edgeModeLabels[activeEdge.mode]}</p>
              <h2>{renderBoxRefs(nodesById.get(activeEdge.from)?.label ?? activeEdge.from)} → {renderBoxRefs(nodesById.get(activeEdge.to)?.label ?? activeEdge.to)}</h2>
              <p>{renderBoxRefs(activeEdge.description)}</p>
              <ul>
                <li><strong>From:</strong> {renderBoxRefs(nodesById.get(activeEdge.from)?.label ?? activeEdge.from)} <span>({nodesById.get(activeEdge.from)?.column})</span></li>
                <li><strong>To:</strong> {renderBoxRefs(nodesById.get(activeEdge.to)?.label ?? activeEdge.to)} <span>({nodesById.get(activeEdge.to)?.column})</span></li>
                <li><strong>Filters:</strong> {activeEdge.filters.join(', ')}</li>
              </ul>
            </>
          ) : activeNode ? (
            <>
              <p className="eyebrow">{activeNode.column} · {activeNode.kind}</p>
              <h2>{activeNode.label}</h2>
              <p>{renderBoxRefs(activeNode.description)}</p>
              {activeNode.details ? (
                <ul>
                  {activeNode.details.map((detail) => <li key={detail}>{renderBoxRefs(detail)}</li>)}
                </ul>
              ) : null}
            </>
          ) : (
            <>
              <p className="eyebrow">How to use this</p>
              <h2>Hover a box or arrow</h2>
              <p>Boxes explain MPD fields and MP4 atoms. Arrows explain whether data is copied, rewritten, derived, or optional.</p>
            </>
          )}
        </aside>
      </div>

      <div className="dash-accuracy-note">
        <strong>Accuracy note:</strong> {renderBoxRefs('this page maps DASH fMP4 fragments into a single fragmented MP4: ftyp + moov/mvex + repeated moof/mdat + optional mfra. A conversion to progressive MP4 would instead build centralized sample tables such as stts, ctts, stsz, stsc, stco/co64, and stss.')}
      </div>

      <div className="dash-explainer-grid">
        <article>
          <h2>What gets copied?</h2>
          <ul>
            <li>{renderBoxRefs('encoded samples in mdat')}</li>
            <li>{renderBoxRefs('codec config from stsd/avcC/hvcC/av1C/esds')}</li>
            <li>much of the track metadata</li>
          </ul>
        </article>
        <article>
          <h2>What gets rewritten?</h2>
          <ul>
            <li>fragment sequence numbers</li>
            <li>track ids sometimes</li>
            <li>{renderBoxRefs('trun data offsets')}</li>
            <li>{renderBoxRefs('tfdt base decode times if timeline is normalized')}</li>
            <li>movie/fragment duration metadata</li>
          </ul>
        </article>
        <article>
          <h2>What gets derived?</h2>
          <ul>
            <li>{renderBoxRefs('sample DTS from tfdt + trun durations')}</li>
            <li>PTS from DTS + composition offsets</li>
            <li>keyframe/random access points from sample flags</li>
            <li>{renderBoxRefs('mfra/tfra entries from fragment offsets and random-access samples')}</li>
          </ul>
        </article>
      </div>

      <section className="dash-steps-section" aria-labelledby="dash-remux-steps">
        <p className="eyebrow">Implementation checklist</p>
        <h2 id="dash-remux-steps">Software steps to produce the single fMP4</h2>
        <p className="dash-steps-intro">
          A real remuxer is mostly a parser, planner, byte copier, and metadata rewriter. It normally does not send compressed samples through a video or audio decoder.
        </p>
        <ol className="dash-remux-steps">
          {remuxSteps.map((step, index) => (
            <li key={step.title}>
              <div className="dash-step-number">{String(index + 1).padStart(2, '0')}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{renderBoxRefs(step.body)}</p>
                <div className="dash-step-output">
                  <strong>Produces:</strong>
                  {step.outputs.map((output) => <code key={output}>{renderBoxRefs(output)}</code>)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </VizShell>
  )
}

type Responsibility = {
  job: string
  concepts: Array<{ id: string; label: string }>
}

const responsibilities: Responsibility[] = [
  {
    job: 'Identity / compatibility',
    concepts: [
      { id: 'ftyp', label: 'ftyp' },
      { id: 'styp', label: 'styp' },
    ],
  },
  {
    job: 'Global metadata',
    concepts: [
      { id: 'moov', label: 'moov' },
      { id: 'mvhd', label: 'mvhd' },
      { id: 'trak', label: 'trak' },
      { id: 'tkhd', label: 'tkhd' },
    ],
  },
  {
    job: 'Sample indexing',
    concepts: [
      { id: 'stbl', label: 'stbl' },
      { id: 'stts', label: 'stts' },
      { id: 'stss', label: 'stss' },
      { id: 'stsz', label: 'stsz' },
      { id: 'stco-co64', label: 'stco/co64' },
    ],
  },
  {
    job: 'Fragment metadata',
    concepts: [
      { id: 'moof', label: 'moof' },
      { id: 'traf', label: 'traf' },
      { id: 'tfhd', label: 'tfhd' },
      { id: 'tfdt', label: 'tfdt' },
      { id: 'trun', label: 'trun' },
    ],
  },
  {
    job: 'Payload',
    concepts: [{ id: 'mdat', label: 'mdat' }],
  },
  {
    job: 'Codec config',
    concepts: [
      { id: 'av1c', label: 'av1C' },
      { id: 'avcc', label: 'avcC' },
      { id: 'hvcc', label: 'hvcC' },
      { id: 'esds', label: 'esds' },
    ],
  },
]

export function ResponsibilityPage() {
  return (
    <VizShell eyebrow="Visualization 7" title="Box responsibility map" intro="Group boxes by job instead of by tree position. This is often the fastest way to learn what each box is for.">
      <div className="responsibility-grid">
        {responsibilities.map(({ job, concepts }) => (
          <div key={job} className="responsibility-card">
            <h2>{job}</h2>
            <p>
              {concepts.map((concept, index) => (
                <span key={concept.id}>
                  {index > 0 ? ', ' : ''}
                  <Link to={`/concept/${concept.id}`}>{concept.label}</Link>
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </VizShell>
  )
}
