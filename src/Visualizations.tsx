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

type Variant = {
  label: string
  bitrateMbps: number
  shortLabel: string
}

const abrVariants: Variant[] = [
  { label: '360p', bitrateMbps: 0.8, shortLabel: '800 kbps' },
  { label: '480p', bitrateMbps: 1.5, shortLabel: '1.5 Mbps' },
  { label: '720p', bitrateMbps: 3, shortLabel: '3 Mbps' },
  { label: '1080p', bitrateMbps: 6, shortLabel: '6 Mbps' },
]

const reservoirVariantOptions = [0.8, 1.5, 3, 6]

function variantForBuffer(bufferSeconds: number) {
  if (bufferSeconds < 5) return abrVariants[0]
  if (bufferSeconds < 12) return abrVariants[1]
  if (bufferSeconds < 20) return abrVariants[2]
  return abrVariants[3]
}

function VbrVarianceViz() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [mode, setMode] = useState<'cbr' | 'vbr'>('vbr')
  const [spikeSeverity, setSpikeSeverity] = useState(7)
  const nominalBitrate = 3

  const data = useMemo(() => d3.range(1, 33).map((index) => {
    const motionPulse = [8, 17, 18, 27].includes(index) ? spikeSeverity * (index === 18 ? 1.25 : 1) : 0
    const gentleVariation = mode === 'cbr' ? 0 : Math.sin(index * 1.6) * 0.32 + ((index * 13) % 5) * 0.08
    return {
      index,
      bitrate: mode === 'cbr' ? nominalBitrate : Math.max(1.6, nominalBitrate + gentleVariation + motionPulse),
      isSpike: motionPulse > 0,
    }
  }), [mode, spikeSeverity])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const width = svgElement.clientWidth || 920
    const height = 380
    const margin = { top: 34, right: 36, bottom: 54, left: 62 }
    const x = d3.scaleBand<number>().domain(data.map((sample) => sample.index)).range([margin.left, width - margin.right]).padding(0.2)
    const y = d3.scaleLinear().domain([0, Math.max(10.5, d3.max(data, (sample) => sample.bitrate) ?? 10)]).nice().range([height - margin.bottom, margin.top])
    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).attr('class', 'buffer-axis').call(d3.axisBottom(x).tickValues(data.filter((sample) => sample.index % 4 === 0).map((sample) => sample.index)).tickFormat((value) => `seg ${value}`))
    svg.append('g').attr('transform', `translate(${margin.left},0)`).attr('class', 'buffer-axis').call(d3.axisLeft(y).ticks(5).tickFormat((value) => `${value} Mbps`))

    svg.append('line').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', y(nominalBitrate)).attr('y2', y(nominalBitrate)).attr('class', 'vbr-nominal-line')
    svg.append('text').attr('x', width - margin.right - 6).attr('y', y(nominalBitrate) - 8).attr('text-anchor', 'end').attr('class', 'vbr-annotation').text('nominal bitrate: 3 Mbps average representation')

    svg.selectAll('.vbr-bar').data(data).join('rect').attr('class', (sample) => `vbr-bar${sample.isSpike ? ' is-spike' : ''}`).attr('x', (sample) => x(sample.index) ?? 0).attr('y', height - margin.bottom).attr('width', x.bandwidth()).attr('height', 0).attr('rx', 5).transition().duration(480).attr('y', (sample) => y(sample.bitrate)).attr('height', (sample) => height - margin.bottom - y(sample.bitrate))

    const biggestSpike = data.reduce((largest, sample) => sample.bitrate > largest.bitrate ? sample : largest, data[0])
    const spikeX = (x(biggestSpike.index) ?? 0) + x.bandwidth() / 2
    svg.append('path').attr('class', 'vbr-callout-line').attr('d', `M${spikeX},${y(biggestSpike.bitrate) - 8} C${spikeX + 38},${y(biggestSpike.bitrate) - 70} ${spikeX + 118},${y(biggestSpike.bitrate) - 58} ${spikeX + 150},${y(biggestSpike.bitrate) - 30}`)
    svg.append('text').attr('x', Math.min(width - 300, spikeX + 156)).attr('y', y(biggestSpike.bitrate) - 38).attr('class', 'vbr-spike-label').text('temporary VBR spike')
    svg.append('text').attr('x', Math.min(width - 300, spikeX + 156)).attr('y', y(biggestSpike.bitrate) - 17).attr('class', 'vbr-annotation').text('large scene complexity increase')
  }, [data])

  return (
    <section className="buffer-visual-card" aria-labelledby="vbr-variance-title">
      <div className="buffer-card-copy">
        <p className="eyebrow">VBR reality check</p>
        <h2 id="vbr-variance-title">Average bitrate hides variance</h2>
        <p>A 3 Mbps representation is not a promise that every segment costs 3 Mbps. Calm scenes may be cheap; action scenes may briefly need 8-10 Mbps worth of bits.</p>
      </div>
      <div className="buffer-control-grid compact">
        <label>Encoding mode <strong>{mode.toUpperCase()}</strong><select value={mode} onChange={(event) => setMode(event.target.value as 'cbr' | 'vbr')}><option value="cbr">CBR: steady chunks</option><option value="vbr">VBR: bursty chunks</option></select></label>
        <label>Spike severity <strong>{spikeSeverity.toFixed(1)} Mbps</strong><input type="range" min="2" max="7" step="0.5" value={spikeSeverity} onChange={(event) => setSpikeSeverity(Number(event.target.value))} /></label>
      </div>
      <svg ref={svgRef} className="vbr-variance-svg" role="img" aria-label="VBR segment size variability chart" />
      <p className="buffer-lesson-line">If network throughput merely equals the average bitrate, a temporary large chunk can still arrive too slowly and drain playback buffer.</p>
    </section>
  )
}

type ReservoirTankState = {
  time: number
  bufferSeconds: number
  chunkProgressSeconds: number
  currentChunkBitrate: number
  downloadingSpike: boolean
}

function ReservoirDangerTankViz() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [throughputMbps, setThroughputMbps] = useState(3)
  const [selectedBitrate, setSelectedBitrate] = useState(3)
  const [reservoirSeconds, setReservoirSeconds] = useState(10)
  const [spikesEnabled, setSpikesEnabled] = useState(true)
  const [isRunning, setIsRunning] = useState(true)
  const maxBufferSeconds = 32
  const criticalDangerZoneSeconds = 4
  const segmentDurationSeconds = 2
  const [state, setState] = useState<ReservoirTankState>({ time: 0, bufferSeconds: 16, chunkProgressSeconds: 0, currentChunkBitrate: selectedBitrate, downloadingSpike: false })

  useEffect(() => {
    setState((current) => ({ ...current, currentChunkBitrate: selectedBitrate, downloadingSpike: false, chunkProgressSeconds: 0 }))
  }, [selectedBitrate])

  useEffect(() => {
    if (!isRunning) return

    const interval = window.setInterval(() => {
      setState((current) => {
        const dt = 0.25
        const nextTime = current.time + dt
        const downloadMediaSeconds = (throughputMbps / current.currentChunkBitrate) * dt
        const nextProgress = current.chunkProgressSeconds + downloadMediaSeconds
        const completedSegments = Math.floor(nextProgress / segmentDurationSeconds)
        const nextChunkIndex = Math.floor(nextTime / 5)
        const nextChunkIsSpike = spikesEnabled && nextChunkIndex % 4 === 2
        const nextChunkBitrate = nextChunkIsSpike ? selectedBitrate * 2.8 : selectedBitrate
        return {
          time: nextTime,
          bufferSeconds: Math.max(0, Math.min(maxBufferSeconds, current.bufferSeconds - dt + completedSegments * segmentDurationSeconds)),
          chunkProgressSeconds: nextProgress % segmentDurationSeconds,
          currentChunkBitrate: completedSegments > 0 ? nextChunkBitrate : current.currentChunkBitrate,
          downloadingSpike: completedSegments > 0 ? nextChunkIsSpike : current.downloadingSpike,
        }
      })
    }, 250)

    return () => window.clearInterval(interval)
  }, [isRunning, selectedBitrate, spikesEnabled, throughputMbps])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const width = svgElement.clientWidth || 920
    const height = 560
    const tankX = 76
    const tankY = 42
    const tankWidth = Math.min(280, width * 0.34)
    const tankHeight = 430
    const y = d3.scaleLinear().domain([0, maxBufferSeconds]).range([tankY + tankHeight, tankY]).clamp(true)
    const fillHeight = tankY + tankHeight - y(state.bufferSeconds)
    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const defs = svg.append('defs')
    const regionGradient = defs.append('linearGradient').attr('id', 'reservoir-region-gradient').attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1')
    regionGradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(34,197,94,0.22)')
    regionGradient.append('stop').attr('offset', '54%').attr('stop-color', 'rgba(59,130,246,0.18)')
    regionGradient.append('stop').attr('offset', '82%').attr('stop-color', 'rgba(245,158,11,0.22)')
    regionGradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(239,68,68,0.32)')
    const fillGradient = defs.append('linearGradient').attr('id', 'reservoir-fill-gradient').attr('x1', '0').attr('x2', '0').attr('y1', '1').attr('y2', '0')
    fillGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444')
    fillGradient.append('stop').attr('offset', '38%').attr('stop-color', '#f59e0b')
    fillGradient.append('stop').attr('offset', '68%').attr('stop-color', '#38bdf8')
    fillGradient.append('stop').attr('offset', '100%').attr('stop-color', '#22c55e')

    svg.append('rect').attr('x', tankX).attr('y', tankY).attr('width', tankWidth).attr('height', tankHeight).attr('rx', 26).attr('fill', 'url(#reservoir-region-gradient)').attr('stroke', 'rgba(255,255,255,0.3)').attr('stroke-width', 2)
    svg.append('rect').attr('x', tankX + 18).attr('y', tankY + tankHeight - fillHeight).attr('width', tankWidth - 36).attr('height', fillHeight).attr('rx', 17).attr('fill', 'url(#reservoir-fill-gradient)').attr('class', state.bufferSeconds < criticalDangerZoneSeconds ? 'danger-pulse' : '')
    svg.append('rect').attr('x', tankX + 18).attr('y', tankY + 14).attr('width', tankWidth - 36).attr('height', tankHeight - 28).attr('rx', 17).attr('class', 'buffer-tank-glass')

    const boundaries = [
      { value: maxBufferSeconds, label: 'Comfortable operating region', cls: 'safe' },
      { value: reservoirSeconds, label: 'Reservoir / protected safety margin', cls: 'reservoir' },
      { value: criticalDangerZoneSeconds, label: 'Critical danger zone', cls: 'danger' },
      { value: 0, label: 'Rebuffer / playback stall', cls: 'stall' },
    ]

    boundaries.slice(1).forEach((boundary) => {
      svg.append('line').attr('x1', tankX - 10).attr('x2', tankX + tankWidth + 10).attr('y1', y(boundary.value)).attr('y2', y(boundary.value)).attr('class', `reservoir-boundary ${boundary.cls}`)
    })
    boundaries.forEach((boundary, index) => {
      const labelY = index === 0 ? tankY + 28 : y(boundary.value) - 10
      svg.append('text').attr('x', tankX + tankWidth + 28).attr('y', labelY).attr('class', `reservoir-region-label ${boundary.cls}`).text(boundary.label)
    })

    svg.append('text').attr('x', tankX + tankWidth / 2).attr('y', tankY + tankHeight / 2 - 8).attr('class', 'buffer-tank-number').text(`${state.bufferSeconds.toFixed(1)}s`)
    svg.append('text').attr('x', tankX + tankWidth / 2).attr('y', tankY + tankHeight / 2 + 24).attr('class', 'buffer-tank-caption').text('buffer ahead')

    const rightX = tankX + tankWidth + 300
    const drain = state.downloadingSpike ? 'large VBR chunk: buffer draining faster' : throughputMbps >= selectedBitrate ? 'download replenishing buffer' : 'playback consuming buffer'
    svg.append('text').attr('x', rightX).attr('y', tankY + 64).attr('class', state.downloadingSpike ? 'reservoir-event-label danger' : 'reservoir-event-label').text(drain)
    svg.append('text').attr('x', rightX).attr('y', tankY + 104).attr('class', 'reservoir-callout-text').text('temporary disturbance absorbed here')
    svg.append('text').attr('x', rightX).attr('y', y(criticalDangerZoneSeconds) + 18).attr('class', 'reservoir-callout-text danger').text('panic downgrade region')
    svg.append('text').attr('x', rightX).attr('y', y(reservoirSeconds) - 24).attr('class', 'reservoir-callout-text safe').text('safe adaptation region')
    svg.append('path').attr('class', 'reservoir-arrow').attr('d', `M${rightX - 18},${tankY + 100} C${rightX - 96},${tankY + 120} ${tankX + tankWidth + 20},${y(reservoirSeconds) + 36} ${tankX + tankWidth - 12},${y(reservoirSeconds) + 26}`)
    svg.append('text').attr('x', tankX).attr('y', height - 28).attr('class', 'buffer-time-label').text(`network ${throughputMbps.toFixed(1)} Mbps, selected ${selectedBitrate.toFixed(1)} Mbps, chunk cost ${state.currentChunkBitrate.toFixed(1)} Mbps-equivalent`)
  }, [criticalDangerZoneSeconds, maxBufferSeconds, reservoirSeconds, selectedBitrate, state, throughputMbps])

  return (
    <section className="buffer-visual-card" aria-labelledby="danger-tank-title">
      <div className="buffer-card-copy">
        <p className="eyebrow">Protected safety space</p>
        <h2 id="danger-tank-title">Reservoir + danger zone</h2>
        <p>The reservoir buys reaction time. A temporary oversized chunk can spend safety margin before playback is truly endangered, so the player does not panic-switch on every bump.</p>
      </div>
      <div className="buffer-control-grid compact">
        <label>Network throughput <strong>{throughputMbps.toFixed(1)} Mbps</strong><input type="range" min="0.8" max="8" step="0.1" value={throughputMbps} onChange={(event) => setThroughputMbps(Number(event.target.value))} /></label>
        <label>Reservoir size <strong>{reservoirSeconds.toFixed(0)}s</strong><input type="range" min="4" max="18" step="1" value={reservoirSeconds} onChange={(event) => setReservoirSeconds(Number(event.target.value))} /></label>
        <label>Representation <strong>{selectedBitrate.toFixed(1)} Mbps</strong><select value={selectedBitrate} onChange={(event) => setSelectedBitrate(Number(event.target.value))}>{reservoirVariantOptions.map((bitrate) => <option key={bitrate} value={bitrate}>{bitrate} Mbps</option>)}</select></label>
        <label>Segment spikes <strong>{spikesEnabled ? 'enabled' : 'off'}</strong><input type="checkbox" checked={spikesEnabled} onChange={(event) => setSpikesEnabled(event.target.checked)} /></label>
      </div>
      <div className="buffer-actions">
        <button type="button" onClick={() => setIsRunning((current) => !current)}>{isRunning ? 'Pause' : 'Resume'}</button>
        <button type="button" onClick={() => setState({ time: 0, bufferSeconds: 16, chunkProgressSeconds: 0, currentChunkBitrate: selectedBitrate, downloadingSpike: false })}>Restart</button>
      </div>
      <svg ref={svgRef} className="reservoir-danger-svg" role="img" aria-label="Reservoir and danger zone buffer tank" />
    </section>
  )
}

function BufferReservoirViz() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [throughputMbps, setThroughputMbps] = useState(4)
  const [bitrateMbps, setBitrateMbps] = useState(3)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [startingBufferSeconds, setStartingBufferSeconds] = useState(12)
  const [bufferSeconds, setBufferSeconds] = useState(startingBufferSeconds)
  const [simTimeSeconds, setSimTimeSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(true)

  const maxBufferSeconds = 30
  const mediaSecondsDownloadedPerSecond = throughputMbps / bitrateMbps
  const netBufferChange = mediaSecondsDownloadedPerSecond - playbackRate
  const isRebuffering = bufferSeconds <= 0.05 && netBufferChange <= 0

  useEffect(() => {
    if (!isRunning) return

    const interval = window.setInterval(() => {
      setBufferSeconds((currentBuffer) => Math.max(0, Math.min(maxBufferSeconds, currentBuffer + netBufferChange * 0.25)))
      setSimTimeSeconds((currentTime) => currentTime + 0.25)
    }, 250)

    return () => window.clearInterval(interval)
  }, [isRunning, netBufferChange])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const width = svgElement.clientWidth || 680
    const height = 390
    const margin = { top: 28, right: 34, bottom: 44, left: 42 }
    const tankWidth = Math.min(230, width * 0.34)
    const tankHeight = 285
    const tankX = margin.left + 32
    const tankY = margin.top + 24
    const fillScale = d3.scaleLinear().domain([0, maxBufferSeconds]).range([0, tankHeight]).clamp(true)
    const chartX = tankX + tankWidth + 80
    const chartWidth = Math.max(220, width - chartX - margin.right)
    const y = d3.scaleLinear().domain([0, maxBufferSeconds]).range([tankY + tankHeight, tankY]).clamp(true)

    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const defs = svg.append('defs')
    const fillGradient = defs.append('linearGradient').attr('id', 'buffer-tank-fill').attr('x1', '0').attr('x2', '0').attr('y1', '1').attr('y2', '0')
    fillGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444')
    fillGradient.append('stop').attr('offset', '42%').attr('stop-color', '#f59e0b')
    fillGradient.append('stop').attr('offset', '100%').attr('stop-color', '#22c55e')

    svg.append('rect').attr('x', tankX).attr('y', tankY).attr('width', tankWidth).attr('height', tankHeight).attr('rx', 22).attr('class', 'buffer-tank-shell')
    svg.append('rect').attr('x', tankX + 10).attr('y', y(5)).attr('width', tankWidth - 20).attr('height', fillScale(5)).attr('class', 'buffer-danger-band')
    svg.append('rect').attr('x', tankX + 10).attr('y', y(20)).attr('width', tankWidth - 20).attr('height', fillScale(10)).attr('class', 'buffer-safe-band')

    svg.append('text').attr('x', tankX + tankWidth + 14).attr('y', y(5)).attr('class', 'buffer-threshold-label').text('danger < 5s')
    svg.append('text').attr('x', tankX + tankWidth + 14).attr('y', y(20)).attr('class', 'buffer-threshold-label').text('healthy > 20s')

    const fillHeight = fillScale(bufferSeconds)
    svg
      .append('rect')
      .attr('x', tankX + 18)
      .attr('width', tankWidth - 36)
      .attr('rx', 14)
      .attr('fill', 'url(#buffer-tank-fill)')
      .attr('y', tankY + tankHeight)
      .attr('height', 0)
      .transition()
      .duration(210)
      .attr('y', tankY + tankHeight - fillHeight)
      .attr('height', fillHeight)

    svg.append('rect').attr('x', tankX + 18).attr('y', tankY + 12).attr('width', tankWidth - 36).attr('height', tankHeight - 24).attr('rx', 14).attr('class', 'buffer-tank-glass')
    svg.append('text').attr('x', tankX + tankWidth / 2).attr('y', tankY + tankHeight / 2 - 8).attr('class', 'buffer-tank-number').text(`${bufferSeconds.toFixed(1)}s`)
    svg.append('text').attr('x', tankX + tankWidth / 2).attr('y', tankY + tankHeight / 2 + 22).attr('class', 'buffer-tank-caption').text('playable media ahead')

    const statusText = isRebuffering ? 'REBUFFER: playback has caught the buffer' : netBufferChange >= 0 ? 'buffer filling' : 'buffer draining'
    svg.append('text').attr('x', chartX).attr('y', tankY + 14).attr('class', isRebuffering ? 'buffer-status danger' : 'buffer-status').text(statusText)
    svg.append('text').attr('x', chartX).attr('y', tankY + 44).attr('class', 'buffer-formula').text(`net change: ${netBufferChange >= 0 ? '+' : ''}${netBufferChange.toFixed(2)} buffer seconds / second`)
    svg.append('text').attr('x', chartX).attr('y', tankY + 72).attr('class', 'buffer-formula').text(`download adds ${mediaSecondsDownloadedPerSecond.toFixed(2)}s media while playback consumes ${playbackRate.toFixed(2)}s`)

    const axis = d3.axisLeft(y).ticks(5).tickFormat((value) => `${value}s`)
    svg.append('g').attr('transform', `translate(${chartX + chartWidth},0)`).attr('class', 'buffer-axis').call(axis)
    svg.append('line').attr('x1', chartX).attr('x2', chartX + chartWidth).attr('y1', y(bufferSeconds)).attr('y2', y(bufferSeconds)).attr('class', 'buffer-current-line')
    svg.append('circle').attr('cx', chartX + chartWidth * 0.22).attr('cy', y(bufferSeconds)).attr('r', 9).attr('class', isRebuffering ? 'buffer-current-dot danger' : 'buffer-current-dot')
    svg.append('text').attr('x', chartX).attr('y', tankY + tankHeight + 30).attr('class', 'buffer-time-label').text(`simulated time: ${simTimeSeconds.toFixed(1)}s`)
  }, [bufferSeconds, isRebuffering, maxBufferSeconds, mediaSecondsDownloadedPerSecond, netBufferChange, playbackRate, simTimeSeconds])

  return (
    <section className="buffer-visual-card" aria-labelledby="reservoir-title">
      <div className="buffer-card-copy">
        <p className="eyebrow">Interactive model</p>
        <h2 id="reservoir-title">Buffer reservoir</h2>
        <p>The tank is measured in seconds of playable media. If downloads add media faster than playback consumes it, the tank fills. If not, it drains toward a stall.</p>
      </div>
      <div className="buffer-control-grid">
        <label>Network throughput <strong>{throughputMbps.toFixed(1)} Mbps</strong><input type="range" min="0.5" max="10" step="0.1" value={throughputMbps} onChange={(event) => setThroughputMbps(Number(event.target.value))} /></label>
        <label>Selected video bitrate <strong>{bitrateMbps.toFixed(1)} Mbps</strong><input type="range" min="0.5" max="8" step="0.1" value={bitrateMbps} onChange={(event) => setBitrateMbps(Number(event.target.value))} /></label>
        <label>Playback rate <strong>{playbackRate.toFixed(1)}x</strong><input type="range" min="0.5" max="2" step="0.1" value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))} /></label>
        <label>Starting buffer <strong>{startingBufferSeconds.toFixed(0)}s</strong><input type="range" min="0" max="30" step="1" value={startingBufferSeconds} onChange={(event) => { const nextBuffer = Number(event.target.value); setStartingBufferSeconds(nextBuffer); setBufferSeconds(nextBuffer); setSimTimeSeconds(0) }} /></label>
      </div>
      <div className="buffer-actions">
        <button type="button" onClick={() => setIsRunning((current) => !current)}>{isRunning ? 'Pause' : 'Resume'}</button>
        <button type="button" onClick={() => { setBufferSeconds(startingBufferSeconds); setSimTimeSeconds(0) }}>Reset</button>
      </div>
      <svg ref={svgRef} className="buffer-reservoir-svg" role="img" aria-label="Animated buffer reservoir simulation" />
    </section>
  )
}

function BufferLadderViz() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [currentBuffer, setCurrentBuffer] = useState(14)
  const selectedVariant = variantForBuffer(currentBuffer)

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const width = svgElement.clientWidth || 820
    const height = 330
    const margin = { top: 34, right: 30, bottom: 58, left: 76 }
    const x = d3.scaleLinear().domain([0, 30]).range([margin.left, width - margin.right]).clamp(true)
    const y = d3.scaleBand<string>().domain(abrVariants.map((variant) => variant.label)).range([height - margin.bottom, margin.top]).padding(0.24)
    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).attr('class', 'buffer-axis').call(d3.axisBottom(x).ticks(6).tickFormat((value) => `${value}s`))
    svg.append('g').attr('transform', `translate(${margin.left},0)`).attr('class', 'buffer-axis').call(d3.axisLeft(y))

    const thresholds = [5, 12, 20]
    svg.selectAll('.buffer-threshold-line').data(thresholds).join('line').attr('class', 'buffer-threshold-line').attr('x1', (threshold) => x(threshold)).attr('x2', (threshold) => x(threshold)).attr('y1', margin.top - 10).attr('y2', height - margin.bottom + 12)
    svg.selectAll('.buffer-threshold-text').data([{ value: 5, label: 'lower reservoir' }, { value: 20, label: 'upper reservoir' }]).join('text').attr('class', 'buffer-threshold-text').attr('x', (threshold) => x(threshold.value) + 6).attr('y', margin.top - 14).text((threshold) => threshold.label)

    svg.selectAll('.buffer-step-zone').data(abrVariants).join('rect').attr('class', (variant) => `buffer-step-zone ${variant.label === selectedVariant.label ? 'is-selected' : ''}`).attr('x', (_variant, index) => x([0, 5, 12, 20][index])).attr('y', (variant) => y(variant.label) ?? 0).attr('width', (_variant, index) => x([5, 12, 20, 30][index]) - x([0, 5, 12, 20][index])).attr('height', y.bandwidth()).attr('rx', 12)

    svg.selectAll('.buffer-variant-label').data(abrVariants).join('text').attr('class', (variant) => `buffer-variant-label ${variant.label === selectedVariant.label ? 'is-selected' : ''}`).attr('x', width - margin.right - 10).attr('y', (variant) => (y(variant.label) ?? 0) + y.bandwidth() / 2 + 5).text((variant) => `${variant.label} - ${variant.shortLabel}`)

    const marker = svg.append('g').attr('class', 'buffer-marker').attr('transform', `translate(${x(currentBuffer)},0)`).style('cursor', 'grab')
    marker.append('line').attr('y1', margin.top - 18).attr('y2', height - margin.bottom + 20)
    marker.append('circle').attr('cy', margin.top - 18).attr('r', 11)
    marker.append('text').attr('y', height - margin.bottom + 42).text(`${currentBuffer.toFixed(1)}s buffer`)

    const drag = d3.drag<SVGGElement, unknown>().on('drag', (event) => {
      setCurrentBuffer(Number(x.invert(event.x).toFixed(1)))
    })

    marker.call(drag)
  }, [currentBuffer, selectedVariant.label])

  return (
    <section className="buffer-visual-card" aria-labelledby="ladder-title">
      <div className="buffer-card-copy">
        <p className="eyebrow">Drag the marker</p>
        <h2 id="ladder-title">Bitrate ladder controlled by buffer</h2>
        <p>Below the lower reservoir, the player protects playback with the lowest representation. Above the upper reservoir, it can spend buffer on better quality.</p>
      </div>
      <div className="buffer-selected-pill">Selected: <strong>{selectedVariant.label} - {selectedVariant.shortLabel}</strong></div>
      <svg ref={svgRef} className="buffer-ladder-svg" role="img" aria-label="Draggable buffer-based bitrate ladder" />
    </section>
  )
}

function DecisionComparisonViz() {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const width = svgElement.clientWidth || 900
    const height = 360
    const panelGap = 44
    const panelWidth = (width - panelGap - 56) / 2
    const margin = { top: 42, right: 20, bottom: 44, left: 46 }
    const samples = d3.range(18).map((index) => ({
      t: index,
      throughput: [2.1, 2.6, 6.8, 3.3, 7.4, 2.8, 2.4, 5.9, 4.8, 8.2, 3.1, 2.7, 6.4, 3.8, 7.1, 2.9, 4.2, 3.4][index],
      buffer: [14, 14.6, 15.2, 14.8, 15.7, 15.1, 14.5, 15.2, 15.8, 16.9, 16.1, 15.4, 16.0, 16.1, 17.0, 16.4, 16.5, 16.2][index],
    }))
    const throughputChoice = samples.map((sample) => ({ ...sample, choice: abrVariants.filter((variant) => variant.bitrateMbps < sample.throughput * 0.82).at(-1)?.bitrateMbps ?? 0.8 }))
    const bufferChoice = samples.map((sample) => ({ ...sample, choice: variantForBuffer(sample.buffer).bitrateMbps }))

    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const drawPanel = (xOffset: number, title: string, mode: 'throughput' | 'buffer') => {
      const x = d3.scaleLinear().domain([0, samples.length - 1]).range([xOffset + margin.left, xOffset + panelWidth - margin.right])
      const y = d3.scaleLinear().domain([0, mode === 'throughput' ? 9 : 24]).range([height - margin.bottom, margin.top])
      const choiceY = d3.scaleLinear().domain([0, 7]).range([height - margin.bottom, margin.top])
      const data = mode === 'throughput' ? throughputChoice : bufferChoice
      const primaryLine = d3.line<(typeof data)[number]>().x((sample) => x(sample.t)).y((sample) => y(mode === 'throughput' ? sample.throughput : sample.buffer)).curve(mode === 'throughput' ? d3.curveLinear : d3.curveMonotoneX)
      const choiceLine = d3.line<(typeof data)[number]>().x((sample) => x(sample.t)).y((sample) => choiceY(sample.choice)).curve(d3.curveStepAfter)

      svg.append('text').attr('x', xOffset + margin.left).attr('y', 22).attr('class', 'buffer-panel-title').text(title)
      svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).attr('class', 'buffer-axis').call(d3.axisBottom(x).ticks(4).tickFormat((value) => `seg ${Number(value) + 1}`))
      svg.append('g').attr('transform', `translate(${xOffset + margin.left},0)`).attr('class', 'buffer-axis').call(d3.axisLeft(y).ticks(5))
      svg.append('path').datum(data).attr('class', mode === 'throughput' ? 'comparison-noisy-line' : 'comparison-buffer-line').attr('d', primaryLine)
      svg.append('path').datum(data).attr('class', 'comparison-choice-line').attr('d', choiceLine)
      svg.selectAll(`.comparison-dot-${mode}`).data(data).join('circle').attr('class', `comparison-dot comparison-dot-${mode}`).attr('cx', (sample) => x(sample.t)).attr('cy', (sample) => y(mode === 'throughput' ? sample.throughput : sample.buffer)).attr('r', 3.8)
      svg.append('text').attr('x', xOffset + panelWidth - margin.right).attr('y', margin.top + 16).attr('class', 'comparison-legend-text').attr('text-anchor', 'end').text(mode === 'throughput' ? 'network samples' : 'buffer seconds')
      svg.append('text').attr('x', xOffset + panelWidth - margin.right).attr('y', margin.top + 38).attr('class', 'comparison-legend-text choice').attr('text-anchor', 'end').text('selected bitrate')
    }

    drawPanel(0, 'Throughput-based: chases noisy estimates', 'throughput')
    drawPanel(panelWidth + panelGap, 'Buffer-based: reacts to playback risk', 'buffer')
  }, [])

  return (
    <section className="buffer-visual-card" aria-labelledby="comparison-title">
      <div className="buffer-card-copy">
        <p className="eyebrow">Decision comparison</p>
        <h2 id="comparison-title">Noisy throughput vs slower buffer state</h2>
        <p>Throughput samples can jump segment by segment. Buffer moves more slowly and is directly tied to the failure mode the player is trying to avoid.</p>
      </div>
      <svg ref={svgRef} className="buffer-comparison-svg" role="img" aria-label="Throughput-based and buffer-based ABR decision comparison" />
    </section>
  )
}

type OscillationSample = {
  t: number
  throughput: number
  spike: boolean
  bufferSmall: number
  qualitySmall: number
  bufferHealthy: number
  qualityHealthy: number
}

function nextQualityFromBuffer(bufferSeconds: number, reservoirSeconds: number, currentQuality: number) {
  if (bufferSeconds < 4) return 0.8
  if (bufferSeconds < reservoirSeconds) return Math.min(currentQuality, 1.5)
  if (bufferSeconds > reservoirSeconds + 12) return 6
  if (bufferSeconds > reservoirSeconds + 6) return 3
  return 1.5
}

function buildOscillationSamples(): OscillationSample[] {
  const throughput = [4.2, 3.8, 5.6, 2.7, 4.8, 2.5, 6.2, 3.1, 4.4, 2.6, 5.4, 3.0, 6.0, 2.8, 4.7, 3.3, 5.8, 2.9, 4.1, 3.5, 5.5, 2.7, 4.9, 3.2]
  let bufferSmall = 8
  let bufferHealthy = 18
  let qualitySmall = 3
  let qualityHealthy = 3
  return throughput.map((network, t) => {
    const spike = [5, 9, 15, 21].includes(t)
    const chunkMultiplier = spike ? 2.45 : 1
    bufferSmall = Math.max(0, Math.min(28, bufferSmall + network / (qualitySmall * chunkMultiplier) * 2 - 2))
    bufferHealthy = Math.max(0, Math.min(28, bufferHealthy + network / (qualityHealthy * chunkMultiplier) * 2 - 2))
    qualitySmall = nextQualityFromBuffer(bufferSmall, 2, qualitySmall)
    qualityHealthy = nextQualityFromBuffer(bufferHealthy, 10, qualityHealthy)
    return { t, throughput: network, spike, bufferSmall, qualitySmall, bufferHealthy, qualityHealthy }
  })
}

function OscillationSimulationViz() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [isRunning, setIsRunning] = useState(true)
  const [frame, setFrame] = useState(8)
  const samples = useMemo(buildOscillationSamples, [])

  useEffect(() => {
    if (!isRunning) return
    const interval = window.setInterval(() => setFrame((current) => current >= samples.length ? 8 : current + 1), 520)
    return () => window.clearInterval(interval)
  }, [isRunning, samples.length])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const visible = samples.slice(0, frame)
    const width = svgElement.clientWidth || 1060
    const height = 430
    const gap = 44
    const panelWidth = (width - gap - 54) / 2
    const margin = { top: 50, right: 28, bottom: 50, left: 50 }
    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const drawPanel = (xOffset: number, title: string, kind: 'small' | 'healthy') => {
      const x = d3.scaleLinear().domain([0, samples.length - 1]).range([xOffset + margin.left, xOffset + panelWidth - margin.right])
      const yBuffer = d3.scaleLinear().domain([0, 28]).range([height - margin.bottom, margin.top])
      const yQuality = d3.scaleLinear().domain([0, 6.5]).range([height - margin.bottom, margin.top])
      const bufferKey = kind === 'small' ? 'bufferSmall' : 'bufferHealthy'
      const qualityKey = kind === 'small' ? 'qualitySmall' : 'qualityHealthy'
      const bufferLine = d3.line<OscillationSample>().x((sample) => x(sample.t)).y((sample) => yBuffer(sample[bufferKey])).curve(d3.curveMonotoneX)
      const qualityLine = d3.line<OscillationSample>().x((sample) => x(sample.t)).y((sample) => yQuality(sample[qualityKey])).curve(d3.curveStepAfter)

      svg.append('text').attr('x', xOffset + margin.left).attr('y', 26).attr('class', 'buffer-panel-title').text(title)
      svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).attr('class', 'buffer-axis').call(d3.axisBottom(x).ticks(5).tickFormat((value) => `seg ${Number(value) + 1}`))
      svg.append('g').attr('transform', `translate(${xOffset + margin.left},0)`).attr('class', 'buffer-axis').call(d3.axisLeft(yBuffer).ticks(4).tickFormat((value) => `${value}s`))
      svg.append('rect').attr('x', xOffset + margin.left).attr('y', yBuffer(4)).attr('width', panelWidth - margin.left - margin.right).attr('height', height - margin.bottom - yBuffer(4)).attr('class', 'oscillation-danger-zone')
      visible.filter((sample) => sample.spike).forEach((sample) => {
        svg.append('rect').attr('x', x(sample.t) - 6).attr('y', margin.top).attr('width', 12).attr('height', height - margin.top - margin.bottom).attr('class', 'oscillation-spike-band')
      })
      svg.append('path').datum(visible).attr('class', 'oscillation-buffer-line').attr('d', bufferLine)
      svg.append('path').datum(visible).attr('class', kind === 'small' ? 'oscillation-quality-line harsh' : 'oscillation-quality-line').attr('d', qualityLine)
      svg.append('text').attr('x', xOffset + panelWidth - margin.right).attr('y', margin.top + 16).attr('text-anchor', 'end').attr('class', 'comparison-legend-text').text('buffer occupancy')
      svg.append('text').attr('x', xOffset + panelWidth - margin.right).attr('y', margin.top + 38).attr('text-anchor', 'end').attr('class', 'comparison-legend-text choice').text('selected representation')

      const annotation = kind === 'small' ? 'temporary spike triggered downgrade' : 'reservoir absorbed disturbance'
      const annotated = visible.find((sample) => sample.spike && sample.t > 4) ?? visible.at(-1)
      if (annotated) {
        svg.append('text').attr('x', x(annotated.t)).attr('y', yBuffer(annotated[bufferKey]) - 18).attr('class', kind === 'small' ? 'oscillation-note danger' : 'oscillation-note safe').text(annotation)
      }
    }

    drawPanel(0, 'Small/no reservoir: twitchy controller', 'small')
    drawPanel(panelWidth + gap, 'Healthy reservoir: damped controller', 'healthy')
  }, [frame, samples])

  return (
    <section className="buffer-visual-card" aria-labelledby="oscillation-title">
      <div className="buffer-card-copy">
        <p className="eyebrow">Oscillation prevention</p>
        <h2 id="oscillation-title">Same disturbances, different stability</h2>
        <p>Without protected margin, every spike looks like an emergency. With a reservoir, transient trouble is absorbed before the controller starts thrashing between qualities.</p>
      </div>
      <div className="buffer-actions">
        <button type="button" onClick={() => setIsRunning((current) => !current)}>{isRunning ? 'Pause' : 'Resume'}</button>
        <button type="button" onClick={() => { setFrame(8); setIsRunning(true) }}>Restart</button>
      </div>
      <svg ref={svgRef} className="oscillation-svg" role="img" aria-label="Oscillation comparison with and without reservoir" />
    </section>
  )
}

function ShiftedRateMapViz() {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const width = svgElement.clientWidth || 900
    const height = 360
    const margin = { top: 34, right: 36, bottom: 54, left: 62 }
    const x = d3.scaleLinear().domain([0, 30]).range([margin.left, width - margin.right])
    const y = d3.scaleLinear().domain([0, 6.5]).range([height - margin.bottom, margin.top])
    const data = d3.range(0, 31).map((buffer) => ({
      buffer,
      noReservoir: buffer < 5 ? 0.8 : buffer < 12 ? 1.5 : buffer < 20 ? 3 : 6,
      withReservoir: buffer < 10 ? 0.8 : buffer < 16 ? 1.5 : buffer < 24 ? 3 : 6,
    }))
    const lineNoReservoir = d3.line<(typeof data)[number]>().x((sample) => x(sample.buffer)).y((sample) => y(sample.noReservoir)).curve(d3.curveStepAfter)
    const lineWithReservoir = d3.line<(typeof data)[number]>().x((sample) => x(sample.buffer)).y((sample) => y(sample.withReservoir)).curve(d3.curveStepAfter)
    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    svg.append('rect').attr('x', x(0)).attr('y', margin.top).attr('width', x(10) - x(0)).attr('height', height - margin.top - margin.bottom).attr('class', 'rate-map-reservoir-band')
    svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).attr('class', 'buffer-axis').call(d3.axisBottom(x).ticks(6).tickFormat((value) => `${value}s`))
    svg.append('g').attr('transform', `translate(${margin.left},0)`).attr('class', 'buffer-axis').call(d3.axisLeft(y).tickValues([0.8, 1.5, 3, 6]).tickFormat((value) => `${value} Mbps`))
    svg.append('path').datum(data).attr('class', 'rate-map-line no-reservoir').attr('d', lineNoReservoir)
    svg.append('path').datum(data).attr('class', 'rate-map-line with-reservoir').attr('d', lineWithReservoir)
    svg.append('text').attr('x', x(5)).attr('y', margin.top + 24).attr('text-anchor', 'middle').attr('class', 'rate-map-band-label').text('protected playback insurance')
    svg.append('text').attr('x', x(21)).attr('y', y(6) - 12).attr('class', 'rate-map-label no-reservoir').text('A: no reservoir')
    svg.append('text').attr('x', x(24)).attr('y', y(3) + 26).attr('class', 'rate-map-label with-reservoir').text('B: with reservoir, curve shifted right')
    svg.append('text').attr('x', margin.left).attr('y', height - 14).attr('class', 'buffer-time-label').text('The first portion of buffer is intentionally excluded from aggressive adaptation decisions.')
  }, [])

  return (
    <section className="buffer-visual-card" aria-labelledby="shifted-rate-map-title">
      <div className="buffer-card-copy">
        <p className="eyebrow">Netflix phrase decoded</p>
        <h2 id="shifted-rate-map-title">Shift the rate map to the right</h2>
        <p>The reservoir does not make the player more conservative everywhere. It moves the aggressive part of the buffer-to-bitrate curve away from zero so early buffer seconds are kept as stall insurance.</p>
      </div>
      <svg ref={svgRef} className="rate-map-svg" role="img" aria-label="Rate map shifted right by reservoir" />
      <p className="buffer-lesson-line"><strong>The reservoir acts as protected playback insurance.</strong></p>
    </section>
  )
}

export function BufferAbrPage() {
  return (
    <VizShell
      eyebrow="Study guide"
      title="Using the Buffer to Avoid Rebuffers"
      intro="A practical React + D3 guide to the Netflix paper's core idea: adaptive bitrate logic can directly observe and control playback buffer instead of leaning primarily on guessed network capacity."
      cardClassName="buffer-study-card"
      pageClassName="buffer-study-page"
    >
      <div className="buffer-hero-grid">
        <section>
          <h2>The ABR problem</h2>
          <p>A streaming player chooses video quality one segment at a time. Higher quality improves visual experience, but it costs more bits and takes longer to download.</p>
          <p>If the player chooses too high, a segment may not arrive before playback reaches the end of buffered media. The result is rebuffering, which is usually worse for QoE than briefly lowering quality.</p>
        </section>
        <section>
          <h2>Traditional throughput-based ABR</h2>
          <div className="buffer-flow">measure recent segment speed <span>→</span> estimate network capacity <span>→</span> choose highest safe bitrate</div>
          <ul>
            <li>Network estimates can be stale by the next segment.</li>
            <li>Mobile and Wi-Fi networks fluctuate quickly.</li>
            <li>TCP behavior is bursty, especially over short requests.</li>
            <li>Short segment downloads may not reveal true capacity.</li>
            <li>Throughput spikes can trigger overconfident upgrades.</li>
          </ul>
        </section>
      </div>

      <div className="buffer-paper-callout">
        <strong>"This paper argues that we should do away with estimating network capacity, and instead directly observe and control the playback buffer."</strong>
        <p>The player does not actually care whether its bandwidth estimate is perfect. It cares whether playback will stall. The buffer is the most direct signal of playback safety.</p>
      </div>

      <section className="buffer-explainer-section">
        <h2>Buffer-based ABR</h2>
        <div className="buffer-flow">observe buffer occupancy <span>→</span> map buffer level to bitrate <span>→</span> keep away from empty <span>→</span> spend buffer only when healthy</div>
        <p>Buffer occupancy is measured in seconds of playable media. Low buffer means danger. High buffer means safety. Unlike a future bandwidth estimate, buffer is an observable state variable the player can directly control through its quality choices.</p>
      </section>

      <section className="buffer-explainer-section reservoir-study-intro" aria-labelledby="reservoir-study-title">
        <p className="eyebrow">New section</p>
        <h2 id="reservoir-study-title">Reservoirs, Safety Margins, and Oscillation Prevention</h2>
        <p>Netflix introduces the reservoir because encoded video and networks are both lumpy. A VBR representation can average 3 Mbps while individual action-scene chunks behave like 8-10 Mbps chunks. If the player reacts to each lump as a new long-term truth, quality starts bouncing.</p>
        <p>The reservoir is the protected part of the buffer that absorbs temporary disturbances before playback is endangered. It makes ABR behavior feel less like a nervous reflex and more like a stable system with safety margin.</p>
      </section>

      <VbrVarianceViz />

      <ReservoirDangerTankViz />

      <OscillationSimulationViz />

      <ShiftedRateMapViz />

      <section className="buffer-explainer-grid">
        <article>
          <h2>Systems view</h2>
          <p>A player is a feedback control system: it observes what happened, chooses the next variant, then observes the new buffer state. Throughput measurements are noisy, Wi-Fi and mobile links fluctuate, and VBR chunks add their own burstiness.</p>
          <p>If the controller reacts violently to every measurement, it oscillates. The reservoir adds damping and inertia. Buffer level changes more slowly than raw throughput estimates, so it is a better signal for deciding when playback is actually unsafe.</p>
          <p>Think of car suspension: it absorbs bumps instead of steering violently every time a tire hits rough pavement.</p>
        </article>
        <article>
          <h2>Why oscillation drops</h2>
          <p>Temporary large chunks spend reservoir first. The player can wait to see whether the problem persists before downgrading, and it avoids immediate upgrades until the buffer has rebuilt enough protected margin.</p>
          <p>That delay is intentional. It prevents a short disturbance from becoming a visible quality downgrade, then upgrade, then downgrade again.</p>
        </article>
      </section>

      <BufferReservoirViz />
      <BufferLadderViz />
      <DecisionComparisonViz />

      <section className="buffer-explainer-grid">
        <article>
          <h2>Reservoir thresholds</h2>
          <p>The lower reservoir is the buffer level below which the player strongly prefers low quality. The upper reservoir is the point above which it can use higher quality. Between them, quality increases gradually.</p>
          <p>The buffer is like a fuel tank. You do not drive aggressively when the tank is nearly empty.</p>
        </article>
        <article>
          <h2>Implementation-oriented pseudo-code</h2>
          <pre><code>{`type BufferRegions = {
  criticalDangerZoneSeconds: number
  reservoirSeconds: number
}

function chooseVariant(input) {
  if (input.bufferAhead < criticalDangerZone) {
    return emergencyLowestVariant()
  }

  if (input.bufferAhead < reservoirSeconds) {
    return conservativeVariant()
  }

  return adaptiveBufferMapping(input)
}`}</code></pre>
          <p>Modern players often combine buffer occupancy, throughput estimation, hysteresis, switch cooldowns, device constraints, and dropped frame monitoring.</p>
        </article>
      </section>

      <section className="buffer-study-questions">
        <h2>Study questions</h2>
        <ul>
          <li>Why might bandwidth estimation be unreliable?</li>
          <li>Why does buffer occupancy represent playback safety?</li>
          <li>Why is rebuffering usually worse than reduced quality?</li>
          <li>What could go wrong if a player upgrades quality too quickly?</li>
          <li>How would live streaming change the buffer-based strategy?</li>
        </ul>
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
