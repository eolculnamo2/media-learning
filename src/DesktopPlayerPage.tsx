import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import * as d3 from 'd3'

type ComponentNode = {
  id: string
  label: string
  x: number
  y: number
  kind: 'io' | 'metadata' | 'encoded' | 'decoded' | 'clock' | 'output'
  note: string
}

type PlayerSection = {
  id: string
  title: string
  invariant?: string
  body: ReactNode[]
  terms?: { term: string; text: string }[]
  bullets?: string[]
  visual: ReactNode
}

const palette = {
  io: '#38bdf8',
  metadata: '#a78bfa',
  encoded: '#f59e0b',
  decoded: '#22c55e',
  clock: '#f43f5e',
  output: '#60a5fa',
}

const boxConceptByLabel: Record<string, string> = {
  ftyp: 'ftyp',
  moov: 'moov',
  mvhd: 'moov',
  trak: 'trak',
  tkhd: 'trak',
  mdia: 'mdia',
  mdhd: 'mdia',
  hdlr: 'mdia',
  minf: 'minf',
  stbl: 'stbl',
  stsd: 'stsd',
  stts: 'stts',
  ctts: 'stts',
  stsc: 'stbl',
  stsz: 'stsz',
  stz2: 'stsz',
  'stsz/stz2': 'stsz',
  stco: 'stco-co64',
  co64: 'stco-co64',
  'stco/co64': 'stco-co64',
  stss: 'stss',
  mdat: 'mdat',
  moof: 'moof',
  traf: 'traf',
  tfhd: 'tfhd',
  tfdt: 'tfdt',
  trun: 'trun',
}

function BoxLink({ children, box }: { children?: ReactNode; box: string }) {
  const concept = boxConceptByLabel[box] ?? box
  return <Link className="desktop-box-link" to={`/concept/${concept}`}>{children ?? box}</Link>
}

function CodeBoxLink({ box, children }: { box: string; children?: ReactNode }) {
  return <BoxLink box={box}><code>{children ?? box}</code></BoxLink>
}

function useSvgDraw(draw: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => void, deps: unknown[] = []) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const width = element.clientWidth || 960
    const height = Number(element.dataset.height ?? 360)
    const svg = d3.select(element)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)
    draw(svg, width, height)
  }, deps)

  return ref
}

function SvgFrame({ children, height = 360, label }: { children: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => void; height?: number; label: string }) {
  const ref = useSvgDraw(children, [children])
  return <svg ref={ref} data-height={height} className="desktop-svg" role="img" aria-label={label} />
}

function ControlButton({ active, children, onClick }: { active?: boolean; children: string; onClick: () => void }) {
  return <button className={active ? 'is-active' : ''} type="button" onClick={onClick}>{children}</button>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <span className="desktop-metric"><strong>{value}</strong>{label}</span>
}

function KeyInvariant({ children }: { children: string }) {
  return <aside className="desktop-invariant"><span>Key invariant</span>{children}</aside>
}

function Glossary({ terms }: { terms: { term: string; text: string }[] }) {
  return <div className="desktop-glossary">{terms.map((item) => <p key={item.term}><strong>{item.term}</strong>{item.text}</p>)}</div>
}

function PipelineViz() {
  const [selected, setSelected] = useState('sample-table')
  const nodes: ComponentNode[] = [
    { id: 'file', label: 'File / I/O', x: 70, y: 170, kind: 'io', note: 'Range reads over local bytes, with read-ahead and seek support.' },
    { id: 'parser', label: 'MP4 parser', x: 190, y: 170, kind: 'metadata', note: 'Reads boxes, finds moov metadata and mdat payload ranges.' },
    { id: 'tracks', label: 'Track discovery', x: 315, y: 170, kind: 'metadata', note: 'Chooses playable video/audio tracks from handlers and sample entries.' },
    { id: 'sample-table', label: 'Sample tables', x: 455, y: 170, kind: 'metadata', note: 'Builds flat timed sample records: offset, size, DTS, PTS, duration, keyframe.' },
    { id: 'demux', label: 'Demuxer', x: 595, y: 170, kind: 'encoded', note: 'Reads compressed sample bytes and splits them into per-track packet queues.' },
    { id: 'vdec', label: 'Video decoder', x: 750, y: 95, kind: 'decoded', note: 'Turns H.264 samples into YUV/NV12/RGBA frames, possibly reordered.' },
    { id: 'adec', label: 'Audio decoder', x: 750, y: 245, kind: 'decoded', note: 'Turns AAC samples into PCM blocks for the audio device.' },
    { id: 'renderer', label: 'Video renderer', x: 900, y: 95, kind: 'output', note: 'Displays decoded frames at their PTS, drops late frames when needed.' },
    { id: 'audio', label: 'Audio output', x: 900, y: 245, kind: 'output', note: 'Feeds PCM to hardware and exposes the stable playback clock.' },
    { id: 'sync', label: 'A/V sync clock', x: 900, y: 170, kind: 'clock', note: 'Compares video PTS against the audio clock and schedules presentation.' },
  ]
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    const sx = d3.scaleLinear().domain([0, 1000]).range([30, width - 30])
    const sy = d3.scaleLinear().domain([0, 340]).range([20, height - 20])
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const links = [
      ['file', 'parser', 'metadata'], ['parser', 'tracks', 'metadata'], ['tracks', 'sample-table', 'metadata'], ['sample-table', 'demux', 'encoded'],
      ['demux', 'vdec', 'encoded'], ['demux', 'adec', 'encoded'], ['vdec', 'renderer', 'decoded'], ['adec', 'audio', 'decoded'], ['audio', 'sync', 'clock'], ['sync', 'renderer', 'clock'],
    ] as const

    svg.append('defs').append('marker').attr('id', 'desktop-arrow').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse').append('path').attr('d', 'M0,0L10,5L0,10Z').attr('fill', '#94a3b8')
    links.forEach(([a, b, kind], index) => {
      const source = byId.get(a)!
      const target = byId.get(b)!
      const path = svg.append('path').attr('class', `desktop-flow-line ${kind}`).attr('d', `M${sx(source.x)},${sy(source.y)} C${(sx(source.x) + sx(target.x)) / 2},${sy(source.y)} ${(sx(source.x) + sx(target.x)) / 2},${sy(target.y)} ${sx(target.x)},${sy(target.y)}`).attr('marker-end', 'url(#desktop-arrow)')
      const dot = svg.append('circle').attr('r', 4).attr('fill', palette[kind]).attr('opacity', 0.9)
      dot.append('animateMotion').attr('dur', `${2.4 + index * 0.12}s`).attr('repeatCount', 'indefinite').append('mpath').attr('href', `#p${index}`)
      path.attr('id', `p${index}`)
    })
    const node = svg.selectAll('g.desktop-pipe-node').data(nodes).join('g').attr('class', (d) => `desktop-pipe-node ${selected === d.id ? 'is-selected' : ''}`).attr('transform', (d) => `translate(${sx(d.x)},${sy(d.y)})`).style('cursor', 'pointer').on('click', (_, d) => setSelected(d.id))
    node.append('rect').attr('x', -54).attr('y', -24).attr('width', 108).attr('height', 48).attr('rx', 14).attr('fill', (d) => palette[d.kind]).attr('opacity', 0.16).attr('stroke', (d) => palette[d.kind]).attr('stroke-width', 2)
    node.append('text').attr('text-anchor', 'middle').attr('dy', 4).attr('class', 'desktop-svg-label').text((d) => d.label)
  }
  const active = nodes.find((node) => node.id === selected)!
  return <div><SvgFrame height={390} label="Native desktop MP4 player pipeline" children={draw} /><p className="desktop-viz-note"><strong>{active.label}:</strong> {active.note}</p></div>
}

function FileLayoutViz() {
  const [fast, setFast] = useState(true)
  const boxes = fast ? [{ t: 'ftyp', w: 10 }, { t: 'moov', w: 24 }, { t: 'mdat', w: 66 }] : [{ t: 'ftyp', w: 10 }, { t: 'mdat', w: 66 }, { t: 'moov', w: 24 }]
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number) => {
    let x = 36
    const total = width - 72
    boxes.forEach((box) => {
      const w = total * box.w / 100
      svg.append('rect').attr('x', x).attr('y', 95).attr('width', w).attr('height', 76).attr('rx', 14).attr('class', `desktop-file-box ${box.t}`)
      svg.append('text').attr('x', x + w / 2).attr('y', 140).attr('text-anchor', 'middle').attr('class', 'desktop-svg-title').text(box.t)
      x += w + 2
    })
    const reads = fast ? [{ x: 36, w: total * 0.34, label: 'startup metadata read' }] : [{ x: 36, w: total * 0.1, label: 'brand read' }, { x: width - 36 - total * 0.24, w: total * 0.24, label: 'seek to moov at end' }]
    reads.forEach((r, i) => {
      svg.append('rect').attr('x', r.x).attr('y', 190 + i * 32).attr('width', r.w).attr('height', 16).attr('rx', 8).attr('class', 'desktop-read-range')
      svg.append('text').attr('x', r.x).attr('y', 224 + i * 32).attr('class', 'desktop-small-label').text(r.label)
    })
    svg.append('text').attr('x', 36).attr('y', 54).attr('class', 'desktop-svg-title').text(fast ? 'Fast start: metadata available before payload' : 'moov at end: parser must jump before playback can plan samples')
  }
  return <div><div className="desktop-controls"><ControlButton active={fast} onClick={() => setFast(true)}>fast start</ControlButton><ControlButton active={!fast} onClick={() => setFast(false)}>moov at end</ControlButton></div><SvgFrame height={280} label="MP4 byte layout" children={draw} /><p className="desktop-viz-note">Box references: <CodeBoxLink box="ftyp" />, <CodeBoxLink box="moov" />, and <CodeBoxLink box="mdat" />.</p></div>
}

function BoxTreeViz() {
  const [expanded, setExpanded] = useState(true)
  const navigate = useNavigate()
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    type BoxNode = { name: string; children?: BoxNode[] }
    const root = d3.hierarchy<BoxNode>({ name: 'mp4', children: [{ name: 'ftyp' }, { name: 'moov', children: [{ name: 'mvhd' }, { name: 'trak', children: [{ name: 'tkhd' }, { name: 'mdia', children: [{ name: 'mdhd' }, { name: 'hdlr' }, { name: 'minf', children: [{ name: 'stbl', children: expanded ? ['stsd', 'stts', 'ctts', 'stsc', 'stsz/stz2', 'stco/co64', 'stss'].map((name) => ({ name })) : undefined }] }] }] }] }, { name: 'mdat' }] })
    const tree = d3.tree<BoxNode>().size([height - 60, width - 190])
    tree(root)
    const g = svg.append('g').attr('transform', 'translate(88,30)')
    g.selectAll('path').data(root.links()).join('path').attr('class', 'desktop-tree-link').attr('d', (d) => {
      const sourceX = d.source.y ?? 0
      const sourceY = d.source.x ?? 0
      const targetX = d.target.y ?? 0
      const targetY = d.target.x ?? 0
      return `M${sourceX},${sourceY}C${(sourceX + targetX) / 2},${sourceY} ${(sourceX + targetX) / 2},${targetY} ${targetX},${targetY}`
    })
    const n = g.selectAll('g').data(root.descendants()).join('g').attr('transform', (d) => `translate(${d.y},${d.x})`).style('cursor', (d) => boxConceptByLabel[d.data.name] ? 'pointer' : 'default').on('click', (_, d) => {
      const concept = boxConceptByLabel[d.data.name]
      if (concept) navigate(`/concept/${concept}`)
    })
    n.append('circle').attr('r', 8).attr('class', (d) => d.data.name === 'stbl' ? 'desktop-hot-dot' : 'desktop-dot')
    n.append('text').attr('x', 14).attr('dy', 4).attr('class', 'desktop-svg-label').text((d) => d.data.name)
  }
  return <div><div className="desktop-controls"><ControlButton active={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'collapse stbl' : 'expand stbl'}</ControlButton></div><SvgFrame height={430} label="Collapsible MP4 box tree" children={draw} /><p className="desktop-viz-note">The parser needs enough of this hierarchy to locate metadata, codec configuration, timing tables, byte offsets, and payload ranges. Fragmented files add <CodeBoxLink box="moof" />, <CodeBoxLink box="traf" />, <CodeBoxLink box="tfhd" />, <CodeBoxLink box="tfdt" />, and <CodeBoxLink box="trun" /> records per fragment.</p></div>
}

function TrackCardsViz() {
  const [complex, setComplex] = useState(false)
  const tracks = complex ? [
    ['1', 'vide', 'avc1.640028', '90 kHz', 'selected'], ['2', 'soun', 'mp4a.40.2 en', '48 kHz', 'selected'], ['3', 'soun', 'mp4a.40.2 es', '48 kHz', 'alternate'], ['4', 'subt', 'tx3g en', '1 kHz', 'subtitle'], ['5', 'meta', 'timed metadata', '1 kHz', 'ignored'],
  ] : [['1', 'vide', 'avc1.64001f', '90 kHz', 'selected'], ['2', 'soun', 'mp4a.40.2', '48 kHz', 'selected']]
  return <div><div className="desktop-controls"><ControlButton active={!complex} onClick={() => setComplex(false)}>simple file</ControlButton><ControlButton active={complex} onClick={() => setComplex(true)}>complex file</ControlButton></div><div className="track-card-grid">{tracks.map(([id, handler, codec, scale, state]) => <article key={id} className={`track-card ${state === 'selected' ? 'selected' : ''}`}><strong>Track {id}</strong><span>{handler}</span><code>{codec}</code><small>{scale} timescale · {state}</small></article>)}</div><p className="desktop-viz-note">Playable selected tracks feed demuxing; alternate audio, subtitles, timecode, and metadata require policy and UI beyond a minimal player.</p></div>
}

function TimebaseViz() {
  const [b, setB] = useState(true)
  const frames = b ? [{ f: 'I0', d: 0, p: 0 }, { f: 'P3', d: 1, p: 3 }, { f: 'B1', d: 2, p: 1 }, { f: 'B2', d: 3, p: 2 }, { f: 'P6', d: 4, p: 6 }, { f: 'B4', d: 5, p: 4 }, { f: 'B5', d: 6, p: 5 }] : d3.range(7).map((i) => ({ f: i === 0 ? 'I0' : `P${i}`, d: i, p: i }))
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number) => {
    const x = d3.scaleLinear().domain([0, 6]).range([80, width - 70])
    svg.append('text').attr('x', 28).attr('y', 95).attr('class', 'desktop-svg-title').text('decode order / DTS')
    svg.append('text').attr('x', 28).attr('y', 230).attr('class', 'desktop-svg-title').text('presentation order / PTS')
    frames.forEach((fr) => {
      svg.append('line').attr('x1', x(fr.d)).attr('y1', 118).attr('x2', x(fr.p)).attr('y2', 205).attr('class', 'desktop-timestamp-link')
      ;[[fr.d, 118], [fr.p, 205]].forEach(([pos, y]) => {
        svg.append('rect').attr('x', x(pos) - 24).attr('y', y - 22).attr('width', 48).attr('height', 44).attr('rx', 12).attr('class', fr.f.startsWith('B') ? 'desktop-b-frame' : 'desktop-i-frame')
        svg.append('text').attr('x', x(pos)).attr('y', y + 5).attr('text-anchor', 'middle').attr('class', 'desktop-svg-label').text(fr.f)
      })
    })
  }
  return <div><div className="desktop-controls"><ControlButton active={!b} onClick={() => setB(false)}>no B-frames</ControlButton><ControlButton active={b} onClick={() => setB(true)}>B-frames</ControlButton></div><SvgFrame height={300} label="DTS and PTS timeline" children={draw} /><pre>{`struct SampleTime {\n    dts: i64,\n    pts: i64,\n    duration: i64,\n    timescale: u32,\n}`}</pre></div>
}

function SampleTableBuilderViz() {
  const [hover, setHover] = useState<number | null>(null)
  const records = d3.range(1, 7).map((i) => ({ i, offset: 1024 + i * 1470, size: 900 + i * 173, dts: (i - 1) * 3000, pts: (i - 1) * 3000 + (i % 3 === 0 ? 1500 : 0), sync: i === 1 || i === 5 }))
  const inputs = [{ box: 'stsz', label: 'size' }, { box: 'stts', label: 'DTS/duration' }, { box: 'ctts', label: 'PTS offset' }, { box: 'stsc', label: 'sample→chunk' }, { box: 'stco/co64', label: 'chunk offset' }, { box: 'stss', label: 'keyframes' }]
  return <div className="sample-builder"><div className="sample-inputs">{inputs.map((x) => <span key={x.box} className={hover ? 'lit' : ''}><CodeBoxLink box={x.box} /> {x.label}</span>)}</div><div className="sample-arrows">combine into timed samples</div><table className="sample-record-table"><thead><tr><th>#</th><th>offset</th><th>size</th><th>DTS</th><th>PTS</th><th>sync</th></tr></thead><tbody>{records.map((r) => <tr key={r.i} onMouseEnter={() => setHover(r.i)} onMouseLeave={() => setHover(null)} className={hover === r.i ? 'is-active' : ''}><td>{r.i}</td><td>{r.offset}</td><td>{r.size}</td><td>{r.dts}</td><td>{r.pts}</td><td>{r.sync ? 'yes' : 'no'}</td></tr>)}</tbody></table><pre>{`struct Sample {\n    track_id: u32, offset: u64, size: u32,\n    dts: i64, pts: i64, duration: i64, is_sync: bool,\n}`}</pre></div>
}

function DemuxViz() {
  const samples = ['V 0.00', 'A 0.00', 'A 0.02', 'V 0.04', 'A 0.04', 'A 0.06', 'V 0.08', 'A 0.08']
  return <div><p className="desktop-viz-note"><CodeBoxLink box="mdat" /> payload, interpreted through sample-table offsets.</p><div className="mdat-strip">{samples.map((s, i) => <span key={i} className={s.startsWith('V') ? 'video' : 'audio'}>{s}</span>)}</div><div className="queue-split"><div><strong>video packet queue</strong>{samples.filter((s) => s.startsWith('V')).map((s) => <code key={s}>{s} · DTS/PTS kept</code>)}</div><div><strong>audio packet queue</strong>{samples.filter((s) => s.startsWith('A')).map((s) => <code key={s}>{s} · DTS/PTS kept</code>)}</div></div></div>
}

function CodecConfigViz() {
  return <div className="codec-grid"><article><strong>video</strong><p><CodeBoxLink box="stsd" /> → <code>avc1</code> → <code>avcC</code></p><p>SPS/PPS, profile, level, NAL length size. Some decoder interfaces need length-prefixed NAL units converted to the expected packet format.</p></article><article><strong>audio</strong><p><CodeBoxLink box="stsd" /> → <code>mp4a</code> → <code>esds</code></p><p>AudioSpecificConfig: object type, sample rate, and channels. The decoder cannot interpret AAC frames correctly without it.</p></article><div className="codec-lock">encoded samples wait until decoder initialization succeeds</div></div>
}

function DecoderViz() {
  const [reorder, setReorder] = useState(true)
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number) => {
    const input = ['I', 'P', 'B', 'B', 'P']
    const output = reorder ? ['I', 'B', 'B', 'P', 'P'] : input
    input.forEach((f, i) => { svg.append('rect').attr('x', 44 + i * 58).attr('y', 80).attr('width', 44).attr('height', 40).attr('rx', 10).attr('class', 'desktop-encoded-box'); svg.append('text').attr('x', 66 + i * 58).attr('y', 105).attr('text-anchor', 'middle').attr('class', 'desktop-svg-label').text(f) })
    svg.append('rect').attr('x', width / 2 - 86).attr('y', 150).attr('width', 172).attr('height', 78).attr('rx', 18).attr('class', 'desktop-decoder-box')
    svg.append('text').attr('x', width / 2).attr('y', 194).attr('text-anchor', 'middle').attr('class', 'desktop-svg-title').text('decoder delay + reorder')
    output.forEach((f, i) => { svg.append('rect').attr('x', width - 350 + i * 58).attr('y', 265).attr('width', 44).attr('height', 40).attr('rx', 10).attr('class', 'desktop-decoded-box'); svg.append('text').attr('x', width - 328 + i * 58).attr('y', 290).attr('text-anchor', 'middle').attr('class', 'desktop-svg-label').text(f) })
  }
  return <div><div className="desktop-controls"><ControlButton active={!reorder} onClick={() => setReorder(false)}>straight output</ControlButton><ControlButton active={reorder} onClick={() => setReorder(true)}>reordering enabled</ControlButton></div><SvgFrame height={340} label="Decoder queue and reordering" children={draw} /></div>
}

function QueueMetersViz() {
  const [speed, setSpeed] = useState(1)
  const [disk, setDisk] = useState(1.1)
  const vals = [{ l: 'encoded video', v: disk * 55 - speed * 18 }, { l: 'encoded audio', v: disk * 62 - speed * 15 }, { l: 'decoded video', v: 42 - speed * 22 }, { l: 'decoded audio', v: 58 - speed * 20 }]
  return <div><div className="slider-grid"><label>playback speed <input type="range" min="0.5" max="1.8" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></label><label>disk/decode speed <input type="range" min="0.5" max="1.8" step="0.1" value={disk} onChange={(e) => setDisk(Number(e.target.value))} /></label></div><div className="queue-meters">{vals.map((q) => <div key={q.l}><strong>{q.l}</strong><span><i style={{ width: `${Math.max(0, Math.min(100, q.v))}%` }} /></span><small>{q.v <= 5 ? 'stall risk' : q.v > 80 ? 'backpressure' : 'healthy'}</small></div>)}</div></div>
}

function AudioClockViz() {
  const [latency, setLatency] = useState(80)
  return <div><label className="wide-slider">device latency {latency} ms<input type="range" min="20" max="220" value={latency} onChange={(e) => setLatency(Number(e.target.value))} /></label><div className="audio-ring"><span style={{ left: `${Math.min(82, 20 + latency / 4)}%` }}>hardware playhead</span><i /></div><Metric label="estimated heard media time" value={`${(12.84 - latency / 1000).toFixed(3)}s`} /></div>
}

function VideoSchedulerViz() {
  const ticks = d3.range(0, 11)
  const frames = [0, 2.5, 5, 7.5, 10]
  return <div className="scheduler"><div>{ticks.map((t) => <span key={t} className="tick">{t % 2 === 0 ? '|' : '·'}</span>)}</div><div>{frames.map((f, i) => <span key={f} className={i === 2 ? 'late' : i === 3 ? 'drop' : 'ok'}>PTS {f.toFixed(1)}</span>)}</div><p>24 fps content on a 60 Hz display repeats some frames for cadence, presents on the nearest refresh, and drops frames that are too late to preserve sync.</p></div>
}

function SyncViz() {
  const [delay, setDelay] = useState(40)
  const frames = d3.range(8).map((i) => ({ pts: i * 40, late: delay - i * 7 }))
  return <div><label className="wide-slider">decode/CPU delay {delay} ms<input type="range" min="0" max="140" value={delay} onChange={(e) => setDelay(Number(e.target.value))} /></label><div className="sync-frames">{frames.map((f) => <span key={f.pts} className={f.late > 70 ? 'drop' : f.late > 35 ? 'late' : 'ok'}>{f.pts}ms</span>)}</div><p className="desktop-viz-note">At render time: future frame waits, near frame displays, badly late frame drops. The comparison is against the audio hardware clock, not a perfect abstract timeline.</p></div>
}

function SeekViz() {
  const [target, setTarget] = useState(6.2)
  const keys = [0, 3, 6, 9, 12]
  const start = keys.filter((k) => k <= target).at(-1) ?? 0
  return <div><label className="wide-slider">target seek {target.toFixed(1)}s<input type="range" min="0" max="12" step="0.1" value={target} onChange={(e) => setTarget(Number(e.target.value))} /></label><div className="seek-line">{d3.range(13).map((i) => <span key={i} className={keys.includes(i) ? 'key' : i >= start && i < target ? 'discard' : ''}>{keys.includes(i) ? 'K' : 'P'}</span>)}</div><p className="desktop-viz-note">Demux starts at {start.toFixed(1)}s, decoders flush, frames before {target.toFixed(1)}s are preroll/discard for accurate seek.</p></div>
}

function StateMachineViz() {
  const [state, setState] = useState('Idle')
  const events: Record<string, string> = { 'open file': 'ParsingMetadata', ready: 'Ready', play: 'Playing', pause: 'Paused', seek: 'Seeking', stall: 'Buffering', EOF: 'Ending', drained: 'Ended', error: 'Error', close: 'Closed' }
  return <div><div className="state-pills">{['Idle', 'ParsingMetadata', 'Ready', 'Prerolling', 'Playing', 'Paused', 'Seeking', 'Buffering', 'Ending', 'Ended', 'Error', 'Closed'].map((s) => <span key={s} className={state === s ? 'is-active' : ''}>{s}</span>)}</div><div className="desktop-controls">{Object.entries(events).map(([e, s]) => <ControlButton key={e} onClick={() => setState(s)}>{e}</ControlButton>)}</div></div>
}

function DrainViz() {
  return <div className="drain-grid">{['demux EOF', 'decoder drain', 'decoded queues empty', 'audio buffer played', 'final frame held', 'Ended'].map((x, i) => <span key={x} style={{ animationDelay: `${i * 180}ms` }}>{x}</span>)}</div>
}

function ErrorViz() {
  const [err, setErr] = useState('unsupported codec')
  const map: Record<string, string> = { 'unsupported codec': 'Track discovery / decoder init · fatal for that track', 'missing moov': 'container parser · fatal open error', 'corrupt sample': 'demux or decode · often recoverable by skipping', 'audio device failure': 'audio output · usually fatal to playback', 'renderer failure': 'video renderer · fatal for video presentation' }
  return <div><div className="desktop-controls">{Object.keys(map).map((e) => <ControlButton key={e} active={err === e} onClick={() => setErr(e)}>{e}</ControlButton>)}</div><p className="fault-card">{map[err]}</p></div>
}

function ThreadViz() {
  const lanes = ['UI/control', 'I/O + demux', 'audio decode', 'video decode', 'audio device', 'render']
  return <div className="swimlanes">{lanes.map((l, i) => <div key={l}><strong>{l}</strong><span>{i === 0 ? 'seek command → generation 42' : i < 4 ? 'flush barrier + bounded queue' : 'drops stale generation frames'}</span></div>)}</div>
}

function MiniFlowViz({ items }: { items: string[] }) {
  return <div className="mini-flow">{items.map((item) => <span key={item}>{item}</span>)}</div>
}

const sections: PlayerSection[] = [
  { id: 'overview', title: '1. Opening Overview: How the Major Components Fit Together', invariant: 'MP4 is a container; H.264/AAC/etc. are codecs.', body: ['A desktop MP4 player is a pipeline that transforms container bytes into timed decoded audio samples and video frames, then schedules those outputs against a playback clock.', 'The container tells the player where samples are, how large they are, and when they should decode and play. The codec turns compressed samples into raw frames or PCM. The player owns parsing, queueing, decoding, rendering, clocks, synchronization, seeking, resource limits, and error boundaries.', 'The real currency is the timed sample: compressed media plus timing metadata, eventually becoming a decoded frame or audio block with a presentation timestamp.'], terms: [{ term: 'Container', text: 'Structure and metadata around media bytes.' }, { term: 'Codec', text: 'Compression format and decoder rules.' }], visual: <PipelineViz /> },
  { id: 'io', title: '2. File I/O and Byte Access', body: ['Local playback starts with byte ranges, not complete-file loading. The player usually performs seek/read operations over a file descriptor, lazily reads samples as demuxing advances, and optionally uses memory mapping or a read-ahead cache.', <>Metadata location affects startup. Fast-start files place <CodeBoxLink box="moov" /> before <CodeBoxLink box="mdat" /> so the player can build indexes immediately. Files with <CodeBoxLink box="moov" /> after <CodeBoxLink box="mdat" /> require a jump to the end before playback planning can begin. Random access is also what makes seeking practical.</>], bullets: ['Sequential reads for discovery', 'Range reads for mdat samples', 'File offsets from sample tables', 'Bounded read-ahead rather than loading huge media'], visual: <FileLayoutViz /> },
  { id: 'parser', title: '3. MP4 Container Parser', body: ['MP4 is based on ISO BMFF boxes, also called atoms. A box has a size, a four-character type, and a payload. Some boxes contain child boxes.', <>A first player does not need every box in the specification. It needs enough structure to find <CodeBoxLink box="ftyp" />, <CodeBoxLink box="moov" />, <CodeBoxLink box="mvhd" />, <CodeBoxLink box="trak" />, <CodeBoxLink box="tkhd" />, <CodeBoxLink box="mdia" />, <CodeBoxLink box="mdhd" />, <CodeBoxLink box="hdlr" />, <CodeBoxLink box="minf" />, <CodeBoxLink box="stbl" />, <CodeBoxLink box="stsd" />, <CodeBoxLink box="stts" />, <CodeBoxLink box="ctts" />, <CodeBoxLink box="stsc" />, <CodeBoxLink box="stsz" /> or <CodeBoxLink box="stz2" />, <CodeBoxLink box="stco" /> or <CodeBoxLink box="co64" />, <CodeBoxLink box="stss" />, and <CodeBoxLink box="mdat" />. Fragmented MP4 later adds <CodeBoxLink box="moof" />, <CodeBoxLink box="traf" />, <CodeBoxLink box="tfhd" />, <CodeBoxLink box="tfdt" />, <CodeBoxLink box="trun" />, and <CodeBoxLink box="mdat" /> per fragment.</>], visual: <BoxTreeViz /> },
  { id: 'tracks', title: '4. Track Discovery', body: ['An MP4 can contain video, audio, subtitle, timecode, and metadata tracks. The player identifies playable tracks from handler type, track ID, language, duration, timescale, and codec sample entry.', 'A sane basic player selects one video and one audio track. Advanced players add alternate audio, language selection, subtitles, attachments, and policy for unsupported tracks.'], visual: <TrackCardsViz /> },
  { id: 'timebases', title: '5. Timebases and Timestamps', invariant: 'DTS is for decode order; PTS is for presentation order.', body: ['MP4 stores timing in integer units using timescales. Movie time and each track can use different timescales, so scheduling requires converting timestamps to seconds or a common clock domain.', <><CodeBoxLink box="stts" /> gives decoding durations and the DTS progression. <CodeBoxLink box="ctts" /> gives composition offsets used to derive PTS from DTS. With B-frames, decode order and presentation order diverge, because a future reference frame may need to be decoded before an earlier presented B-frame.</>, 'Audio is commonly used as the master clock because the audio device consumes samples at a stable hardware rate.'], visual: <TimebaseViz /> },
  { id: 'sample-table', title: '6. Sample Table Construction', invariant: 'The sample table is the bridge between metadata and bytes.', body: ['The player converts MP4 sample table boxes into a flat list of sample records. This is the foundation for demuxing, seeking, buffering, and decoding.', <><CodeBoxLink box="stsz" /> gives sample sizes. <CodeBoxLink box="stts" /> gives durations and DTS progression. <CodeBoxLink box="ctts" /> gives PTS offsets. <CodeBoxLink box="stsc" /> maps samples to chunks. <CodeBoxLink box="stco/co64" /> gives chunk byte offsets. <CodeBoxLink box="stss" /> marks sync samples. The result tells the player exactly what byte range to read and what timing metadata to attach.</>], visual: <SampleTableBuilderViz /> },
  { id: 'demux', title: '7. Demuxer', invariant: 'Demuxing separates tracks; decoding decompresses samples.', body: [<>Demuxing separates interleaved container media into per-track encoded streams. MP4 <CodeBoxLink box="mdat" /> often interleaves audio and video by chunk to improve read locality.</>, 'The demuxer reads sample bytes using the sample table, preserves DTS/PTS/duration/keyframe metadata, and pushes encoded packets into bounded track queues. It does not decode. Backpressure prevents the demuxer from reading too far ahead, and EOF is signaled explicitly.'], visual: <DemuxViz /> },
  { id: 'codec-config', title: '8. Codec Configuration', body: ['The container carries codec-specific initialization data. Decoders need it before compressed samples are meaningful.', <>For H.264/AVC in MP4, configuration is usually in <code>avcC</code> under <CodeBoxLink box="stsd" /> and includes SPS/PPS, profile, level, and NAL length size. H.264 samples in MP4 are commonly length-prefixed rather than Annex B start-code delimited, so an adapter may be needed depending on the native decoder interface.</>, 'For AAC, esds and AudioSpecificConfig describe object type, sample rate, and channel layout. Decoder output then becomes concrete pixel formats such as YUV420P, NV12, RGBA, or PCM audio formats such as planar or interleaved samples.'], visual: <CodecConfigViz /> },
  { id: 'decode', title: '9. Decode Pipeline', body: ['Decoders transform compressed packets into raw media. Video decode outputs frames, often YUV or NV12. Audio decode outputs PCM blocks.', 'Decoding can be asynchronous. Video decoders may need several packets before output, reorder frames internally, and require flushing during seek or end-of-stream. Hardware decode improves throughput but adds device constraints and format negotiation. Corrupt samples should be isolated so one bad packet does not poison player state.'], visual: <DecoderViz /> },
  { id: 'queues', title: '10. Decoded Queues and Buffering', invariant: 'Queues are architectural boundaries, not incidental implementation details.', body: ['Players buffer encoded packets for decoders and decoded frames or PCM for renderers/devices. Too little buffer causes stalls; too much decoded buffer wastes memory, especially for video frames.', 'Bounded queues, high/low watermarks, preroll, starvation detection, and backpressure keep the pipeline stable. Audio often uses a ring buffer because the device needs a steady PCM supply.'], visual: <QueueMetersViz /> },
  { id: 'audio', title: '11. Audio Output and the Audio Clock', invariant: 'Audio is commonly the master clock.', body: ['The audio device consumes PCM at a fixed sample rate. The player writes decoded PCM into a device buffer or callback path and estimates what media timestamp is currently being heard.', 'That estimate must account for queued audio and device latency. Video is then scheduled against this clock. Drift and underrun are treated as playback-quality problems, not cosmetic UI issues.'], visual: <AudioClockViz /> },
  { id: 'video', title: '12. Video Renderer', body: ['The renderer displays decoded frames at their PTS. It is not the decoder; it consumes frames that already exist.', 'The renderer handles frame queues, refresh cadence, VSync, late-frame drops, repeated frames, resize, aspect ratio, letterboxing or pillarboxing, and color conversion from YUV to RGB. HDR and color management are advanced extensions because they require correct metadata and display behavior.'], visual: <VideoSchedulerViz /> },
  { id: 'sync', title: '13. A/V Synchronization', body: ['Audio and video are decoded independently but presented together. A common design uses the audio clock as master and makes video follow.', 'At each render opportunity, compare the next video frame PTS with the current audio clock. If the frame is in the future, wait. If it is close enough, display. If it is far behind, drop. Perfect equality is unrealistic; sync uses tolerances and must absorb jitter, drift, pause/resume, and rate changes.'], visual: <SyncViz /> },
  { id: 'seeking', title: '14. Seeking', invariant: 'Seeking usually starts at a keyframe before the requested time.', body: ['Compressed video usually cannot start decoding from an arbitrary frame. A seek begins with a requested presentation time, then finds a nearby previous sync sample.', 'The player flushes demux queues, decoder state, and decoded queues; seeks file reads to the keyframe; decodes forward; discards preroll frames before the target for accurate seek; and realigns audio and video. Fast seek may simply land on the keyframe. B-frames make this more careful because decode and presentation order differ.'], visual: <SeekViz /> },
  { id: 'state', title: '15. Playback State Machine', body: ['A player needs explicit states: Idle, Opening, ParsingMetadata, Ready, Prerolling, Playing, Paused, Seeking, Buffering or Stalled, Ending, Ended, Error, and Closed.', 'State transitions coordinate I/O, demux, decoding, audio output, rendering, and commands. Without a state machine, pause, seek, EOF, close, and error handling become race-condition soup.'], visual: <StateMachineViz /> },
  { id: 'eos', title: '16. End-of-Stream and Flushing', invariant: 'EOF is not playback-ended until the whole pipeline drains.', body: ['End-of-file at the demuxer is not the same as playback ended. Encoded samples may still be queued, decoders may hold delayed frames, decoded queues may still contain media, and the audio device may still have PCM to play.', 'Playback is truly ended only when there are no more encoded samples, decoders are drained, decoded queues are empty, the audio device played remaining samples, and the final video frame has been presented or intentionally held.'], visual: <DrainViz /> },
  { id: 'errors', title: '17. Error Handling and Recovery', body: ['Real media can be malformed, unsupported, truncated, corrupt, or simply unusual. Robust players distinguish fatal from recoverable failures.', <>Missing <CodeBoxLink box="moov" />, invalid sample tables, unsupported codecs, decoder init failure, audio device failure, and renderer failure are often fatal. A corrupt sample may be recoverable if state invariants remain valid and the decoder can continue. Validation and clear unsupported-feature errors matter as much as happy-path playback.</>], visual: <ErrorViz /> },
  { id: 'threading', title: '18. Threading and Concurrency Model', body: ['Desktop players often split responsibilities across a UI/control thread, I/O/demux thread, audio decode thread, video decode thread, audio device callback thread, and render thread.', 'Queues are producer/consumer boundaries. Commands such as seek, pause, and close need cancellation, flush barriers, and generation IDs so stale decoded frames from before a seek cannot appear after it. Shared state must be explicit and thread-safe.'], visual: <ThreadViz /> },
  { id: 'v1', title: '19. Minimal v1 Player Scope', body: ['A sane first desktop player is intentionally narrow: local progressive MP4 only, H.264 plus AAC only, one video track, one audio track, software decode through a library, keyframe seeking only, basic audio-clock synchronization, and a basic video renderer.', 'That scope avoids subtitles, streaming, DRM, fragmented MP4, advanced color/HDR, multiple track selection, and adaptive behavior. It is still a complete player architecture, but small enough that sample tables, clocks, queues, seek flushing, and sync can be made correct.'], visual: <MiniFlowViz items={['local MP4', 'H.264 + AAC', 'one A/V pair', 'software decode', 'audio clock', 'keyframe seek']} /> },
  { id: 'advanced', title: '20. Advanced Extensions', body: ['Once the core pipeline is correct, extensions become incremental rather than architectural surprises: fragmented MP4, multiple audio tracks, subtitles, hardware decode, HDR/color management, gapless playback, playback speed changes, audio resampling, network streaming, adaptive bitrate, playlists, diagnostics, and metrics.', 'The important discipline is to preserve the central object model: bytes become boxes, boxes produce tracks and sample tables, sample tables produce timed encoded samples, decoders produce decoded frames, and clocks schedule presentation.'], visual: <MiniFlowViz items={['fMP4', 'subtitles', 'hardware decode', 'HDR', 'resampling', 'streaming', 'ABR', 'metrics']} /> },
]

export function DesktopPlayerPage() {
  return <article className="desktop-player-page"><header className="desktop-hero"><p className="eyebrow">Native media architecture</p><h1>Major Components of a Desktop MP4 Player</h1><p>A systems-oriented reference for how an MP4 file becomes synchronized audio and video playback in a native desktop player.</p><div className="desktop-hero-flow"><span>bytes</span><span>boxes</span><span>tracks</span><span>sample tables</span><span>encoded samples</span><span>decoded frames</span><span>scheduled presentation</span></div></header><div className="desktop-layout"><aside className="desktop-toc" aria-label="Page contents">{sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title.replace(/^\d+\.\s*/, '')}</a>)}</aside><div className="desktop-section-stack">{sections.map((section) => <section key={section.id} id={section.id} className="desktop-section-card"><div className="desktop-section-copy"><h2>{section.title}</h2>{section.body.map((p, index) => <p key={index}>{p}</p>)}{section.invariant ? <KeyInvariant>{section.invariant}</KeyInvariant> : null}{section.terms ? <Glossary terms={section.terms} /> : null}{section.bullets ? <ul>{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul> : null}</div><div className="desktop-section-visual">{section.visual}</div></section>)}</div></div></article>
}
