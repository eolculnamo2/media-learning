import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import * as d3 from 'd3'

type VizShellProps = {
  eyebrow: string
  title: string
  intro: string
  children: ReactNode
}

function VizShell({ eyebrow, title, intro, children }: VizShellProps) {
  return (
    <section className="viz-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="viz-intro">{intro}</p>
      <div className="viz-card">{children}</div>
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

const responsibilities = [
  ['Identity / compatibility', 'ftyp, styp'],
  ['Global metadata', 'moov, mvhd, trak, tkhd'],
  ['Sample indexing', 'stbl, stts, stss, stsz, stco/co64'],
  ['Fragment metadata', 'moof, traf, tfhd, tfdt, trun'],
  ['Payload', 'mdat'],
  ['Codec config', 'av1C, avcC, hvcC, esds'],
]

export function ResponsibilityPage() {
  return (
    <VizShell eyebrow="Visualization 7" title="Box responsibility map" intro="Group boxes by job instead of by tree position. This is often the fastest way to learn what each box is for.">
      <div className="responsibility-grid">
        {responsibilities.map(([job, boxes]) => (
          <div key={job} className="responsibility-card"><h2>{job}</h2><p>{boxes}</p></div>
        ))}
      </div>
    </VizShell>
  )
}
