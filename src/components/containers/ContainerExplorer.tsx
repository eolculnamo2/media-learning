import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { binaryExamples, boxSize, decodeTimes, matroskaTimeNs, mp4SampleOffset, seekExample } from '../../data/containerExamples'
import { findElement, flatten, formatIds, formats, glossary, specs, type Category, type ElementDef, type FormatId } from '../../data/containers'

const colors: Record<Category, string> = { metadata: '#627de8', track: '#12a999', timing: '#b273dc', index: '#e5a23c', media: '#e76a76' }
const pretty = (n: number) => n.toLocaleString('en-US')
const ancestry = (root: ElementDef, target: string, path: string[] = []): string[] | undefined => {
  const next = [...path, root.id]
  if (root.id === target) return next
  for (const child of root.children ?? []) { const found = ancestry(child, target, next); if (found) return found }
}
const media = (query: string) => query.trim().toLowerCase()

export function HierarchyExplorer({ format, onFormatChange, selected, onSelect }: { format: FormatId; onFormatChange: (f: FormatId) => void; selected: string; onSelect: (id: string) => void }) {
  const root = formats[format].root
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(flatten(root).filter(n => n.children && n.id !== 'root' && n.id !== 'moov' && n.id !== 'Segment' && !(ancestry(root, selected) ?? []).includes(n.id)).map(n => n.id)))
  const [closing, setClosing] = useState<string | null>(null)
  const closeTimer = useRef<number | null>(null)
  const [query, setQuery] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const groupRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [viewport, setViewport] = useState({ width: 800, height: 500 })
  useEffect(() => {
    if (!svgRef.current || !groupRef.current) return
    const svg = d3.select(svgRef.current)
    const group = d3.select(groupRef.current)
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.35, 2.5]).on('zoom', event => group.attr('transform', event.transform.toString()))
    svg.call(zoom)
    zoomRef.current = zoom
    const observer = new ResizeObserver(entries => { if (entries[0]) setViewport({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }) })
    observer.observe(svgRef.current)
    return () => { observer.disconnect(); svg.on('.zoom', null); if (closeTimer.current !== null) window.clearTimeout(closeTimer.current) }
  }, [])
  const tree = useMemo(() => {
    const visible = (node: ElementDef): ElementDef => ({ ...node, children: collapsed.has(node.id) ? undefined : node.children?.map(visible) })
    const hierarchy = d3.hierarchy(visible(root))
    const count = hierarchy.descendants().length
    const layout = d3.tree<ElementDef>().nodeSize([46, 220])(hierarchy)
    const nodes = layout.descendants()
    const minX = d3.min(nodes, n => n.x) ?? 0
    nodes.forEach(n => { n.x -= minX - 44 })
    return { nodes, links: layout.links(), width: (d3.max(nodes, n => n.y) ?? 0) + 245, height: Math.max(150, count * 46 + 90) }
  }, [format, collapsed]) // eslint-disable-line react-hooks/exhaustive-deps
  const path = ancestry(root, selected) ?? []
  const fit = () => {
    if (!svgRef.current || !zoomRef.current) return
    const scale = Math.min(1, (viewport.width - 32) / tree.width, (viewport.height - 30) / tree.height)
    d3.select(svgRef.current).transition().duration(450).call(zoomRef.current.transform, d3.zoomIdentity.translate(16, Math.max(12, (viewport.height - tree.height * scale) / 2)).scale(scale))
  }
  useEffect(() => { const timer = window.setTimeout(fit, 30); return () => window.clearTimeout(timer) }, [format, tree.width, tree.height, viewport.width, viewport.height]) // eslint-disable-line react-hooks/exhaustive-deps
  const matches = flatten(root).filter(n => n.id !== 'root' && media(`${n.id} ${n.code} ${n.name} ${n.purpose}`).includes(media(query))).slice(0, 8)
  const choose = (id: string) => {
    setCollapsed(previous => { const next = new Set(previous); (ancestry(root, id) ?? []).forEach(parent => next.delete(parent)); return next })
    onSelect(id)
  }
  const toggle = (id: string) => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    if (collapsed.has(id)) { setClosing(null); setCollapsed(previous => { const next = new Set(previous); next.delete(id); return next }); return }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setCollapsed(previous => new Set(previous).add(id)); return }
    setClosing(id)
    closeTimer.current = window.setTimeout(() => { setCollapsed(previous => new Set(previous).add(id)); setClosing(null); closeTimer.current = null }, 240)
  }
  return <section className="cx-card cx-explorer" id="hierarchy">
    <div className="cx-heading"><span>02 / STRUCTURE ATLAS</span><h2>Explore the hierarchy</h2><p>Select a structure for parser-level detail. Click its chevron to open or close children; drag to pan and scroll to zoom.</p></div>
    <div className="cx-pills" role="group" aria-label="Container format">{formatIds.map(id => <button key={id} aria-pressed={id === format} onClick={() => { onFormatChange(id); onSelect('root') }}>{formats[id].label}</button>)}</div>
    <div className="cx-toolbar"><label className="cx-search">Search structures<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, FourCC, ID, or purpose" /></label><div className="cx-actions"><button onClick={() => setCollapsed(new Set())}>Expand all</button><button onClick={() => setCollapsed(new Set(flatten(root).filter(n => n.children && n.id !== 'root').map(n => n.id)))}>Collapse all</button><button onClick={fit}>Fit to view</button></div></div>
    {query && <div className="cx-results" role="listbox" aria-label="Search results">{matches.length ? matches.map(n => <button key={n.id} onClick={() => { choose(n.id); setQuery('') }}><strong>{n.id}</strong> · {n.name}</button>) : <span>No matching structures</span>}</div>}
    <div className="cx-explorer-grid"><div className="cx-visual"><svg ref={svgRef} role="img" aria-label={`${formats[format].label} interactive hierarchy`}><g ref={groupRef}>
      {tree.links.map(link => <path key={`${link.source.data.id}-${link.target.data.id}`} className={`cx-tree-link ${path.includes(link.target.data.id) ? 'hot' : ''} ${closing && (ancestry(root, link.target.data.id) ?? []).includes(closing) && link.target.data.id !== closing ? 'closing' : ''}`} d={`M${link.source.y + 140},${link.source.x} C${link.source.y + 180},${link.source.x} ${link.target.y - 35},${link.target.x} ${link.target.y},${link.target.x}`} />)}
      {tree.nodes.map(n => { const active = n.data.id === selected; const parent = path.includes(n.data.id); const hasChildren = Boolean(findElement(format, n.data.id)?.children?.length); return <g key={n.data.id} className={`cx-tree-node ${active ? 'active' : ''} ${parent ? 'ancestor' : ''} ${closing && (ancestry(root, n.data.id) ?? []).includes(closing) && n.data.id !== closing ? 'closing' : ''}`} transform={`translate(${n.y},${n.x})`} tabIndex={0} role="button" aria-label={`${n.data.name}, ${n.data.kind}, ${hasChildren ? collapsed.has(n.data.id) ? 'collapsed' : 'expanded' : 'leaf'}`} onClick={() => choose(n.data.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(n.data.id) } if (e.key === 'ArrowRight' && hasChildren) setCollapsed(prev => { const next = new Set(prev); next.delete(n.data.id); return next }); if (e.key === 'ArrowLeft' && hasChildren) toggle(n.data.id) }}>
        <rect width="174" height="34" y="-17" rx={hasChildren ? 8 : 17} fill={active ? colors[n.data.category] : 'var(--cx-panel)'} stroke={colors[n.data.category]} strokeWidth={active ? 2 : 1.2} />
        <rect width="5" height="24" x="5" y="-12" rx="2" fill={colors[n.data.category]} />
        <text x="17" y="5" fill={active ? '#fff' : 'var(--text-h)'}>{n.data.id === 'root' ? formats[format].label : n.data.name.length > 20 ? `${n.data.name.slice(0, 19)}…` : n.data.name}</text>
        {hasChildren && <g className="cx-chevron" onClick={e => { e.stopPropagation(); toggle(n.data.id) }}><circle cx="161" r="13" fill={active ? '#fff' : 'var(--cx-panel)'} stroke={colors[n.data.category]} /><text x="161" y="5" textAnchor="middle" fill={colors[n.data.category]}>{collapsed.has(n.data.id) ? '+' : '−'}</text></g>}
      </g> })}
    </g></svg><div className="cx-legend">{Object.entries(colors).map(([key, color]) => <span key={key}><i style={{ background: color }} />{key}</span>)}<span>Rounded box = parent · pill = leaf</span></div></div>
    <Inspector format={format} element={findElement(format, selected) ?? root} onSelect={choose} /></div>
  </section>
}

function Inspector({ format, element, onSelect }: { format: FormatId; element: ElementDef; onSelect: (id: string) => void }) {
  const parents = ancestry(formats[format].root, element.id)?.slice(0, -1) ?? []
  return <aside className="cx-inspector" aria-live="polite"><div className="cx-inspector-head"><span style={{ color: colors[element.category] }}>{element.category.toUpperCase()} · {element.kind.toUpperCase()}</span><strong>{element.id === 'root' ? formats[format].label : element.id}</strong><small>{element.code}</small></div><h3>{element.name}</h3><p>{element.purpose}</p><dl className="cx-facts"><div><dt>Presence</dt><dd>{element.presence}{element.id === 'root' ? '' : ' in this representative layout'}</dd></div><div><dt>Parent</dt><dd>{parents.length ? parents.at(-1) : 'File root'}</dd></div><div><dt>Children</dt><dd>{element.children?.length ? element.children.map(child => <button key={child.id} onClick={() => onSelect(child.id)}>{child.id}</button>) : 'None · leaf structure'}</dd></div></dl><h4>Binary shape</h4><code className="cx-code-line">{element.layout}</code>{element.fields.length > 0 && <><h4>Fields to read</h4><div className="cx-fields">{element.fields.map(f => <div key={f.name}><code>{f.name}</code><small>{f.type}</small><p>{f.meaning}</p></div>)}</div></>}{element.id === 'stts' && <SttsMiniTimeline />}<h4>In practice</h4><p>{element.practical}</p>{element.variants && <p className="cx-note">{element.variants}</p>}<a href={element.spec} target="_blank" rel="noreferrer">Open authoritative specification ↗</a></aside>
}

function SttsMiniTimeline() {
  const times = decodeTimes([1000, 1000, 1000, 2000, 2000])
  const x = d3.scaleLinear().domain([0, 6000]).range([22, 320])
  return <div className="cx-mini-timeline"><strong>stts runs → sample DTS</strong><p>(3 samples × 1000 ticks), then (2 × 2000 ticks)</p><svg viewBox="0 0 345 88" role="img" aria-label="Five samples with decode times 0, 1000, 2000, 3000, 5000 ticks"><line x1="22" x2="320" y1="35" y2="35" stroke="var(--border)" strokeWidth="3" />{times.map((time, i) => <g key={i}><circle cx={x(time)} cy="35" r="7" fill={i < 3 ? '#b273dc' : '#627de8'} /><text x={x(time)} y="64" textAnchor="middle" fill="var(--text-h)" fontSize="10">{time}</text></g>)}</svg></div>
}

export function BinaryExplorer() {
  const [id, setId] = useState('ftyp')
  const [selectedField, setSelectedField] = useState(0)
  const example = binaryExamples.find(e => e.id === id) ?? binaryExamples[0]
  const width = 860
  const offsets = example.fields.map((_, i) => example.fields.slice(0, i).reduce((sum, f) => sum + f.hex.trim().split(/\s+/).length, 0))
  const total = boxSize(example)
  const scale = d3.scaleLinear().domain([0, total]).range([24, width - 24])
  const active = example.fields[selectedField] ?? example.fields[0]
  return <section className="cx-card" id="binary"><div className="cx-heading"><span>03 / READING THE BYTES</span><h2>Binary layout lab</h2><p>Choose a structure, then a field. Offsets and widths come from the exact bytes shown below.</p></div><div className="cx-binary-top"><div className="cx-pills">{binaryExamples.map(e => <button key={e.id} aria-pressed={e.id === id} onClick={() => { setId(e.id); setSelectedField(0) }}>{e.id}</button>)}</div><span>{example.family === 'iso' ? 'Big-endian ISO box' : 'EBML VINT element'}</span></div><div className="cx-byte-scroll"><svg viewBox={`0 0 ${width} 135`} role="img" aria-label={`${example.title} byte layout`}>{example.fields.map((f, i) => { const x = scale(offsets[i]); const w = scale(offsets[i] + f.hex.split(' ').length) - x; return <g key={i} tabIndex={0} role="button" aria-label={`${f.label}: ${f.meaning}`} onClick={() => setSelectedField(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedField(i) } }}><rect x={x} y="29" width={w - 2} height="58" rx="5" fill={f.kind === 'header' ? '#627de8' : f.kind === 'payload' ? '#e76a76' : '#12a999'} opacity={selectedField === i ? 1 : .65} stroke={selectedField === i ? '#192b53' : 'none'} strokeWidth="3" /><text x={x + 5} y="51" fill="white" fontSize="12" fontWeight="700">{w > 58 ? f.label : `${f.hex.split(' ').length}B`}</text><text x={x + 5} y="72" fill="white" fontSize="11">{w > 78 ? `${f.hex.split(' ').length} bytes` : ''}</text><text x={x} y="112" fill="var(--text-h)" fontSize="11">{offsets[i]}</text></g> })}<text x="24" y="17" fill="var(--text)" fontSize="12">byte offset →</text><text x={width - 30} y="112" fill="var(--text-h)" fontSize="11">{total}</text></svg></div><div className="cx-byte-detail"><div><small>OFFSET {offsets[selectedField]} · {active.hex.split(' ').length} BYTE{active.hex.split(' ').length === 1 ? '' : 'S'}</small><h3>{active.label}</h3><p>{active.meaning}</p></div><code>{active.hex}</code></div><p className="cx-note">{example.note}</p><div className="cx-binary-notes"><p><strong>ISO box:</strong> 4-byte size + 4-byte FourCC. Size includes the header. Size 1 adds an 8-byte largesize; size 0 extends to end of file where allowed. A FullBox adds 1-byte version and 3-byte flags. Traverse children within the parent box boundary.</p><p><strong>EBML element:</strong> variable-width ID + variable-width size + payload. ID marker bits stay; size marker bits are removed. All-one size value means unknown length only where the schema allows it for a master element. Recurse by element boundary and schema.</p></div></section>
}

type WalkFamily = 'mp4' | 'fmp4' | 'mkv'
const steps: Record<WalkFamily, { label: string; detail: string; data: string }[]> = {
  mp4: [
    { label: 'Target time', detail: 'Seek to presentation time 2.5 s in a 1000-tick/s video track.', data: 'PTS target = 2500' },
    { label: 'Track', detail: 'hdlr=vide identifies the video track; mdhd says 1000 ticks/s.', data: 'trak → mdia → hdlr, mdhd' },
    { label: 'Timing', detail: 'stts gives four 1000-tick samples with DTS 0, 1000, 2000, 3000. With no ctts here, PTS equals DTS.', data: `DTS = ${decodeTimes(seekExample.mp4.sampleDurations).join(', ')}` },
    { label: 'Sync sample', detail: 'stss lists samples 1 and 3. Sample 3 is the suitable earlier sync sample for target 2500.', data: 'stss = [1, 3] → sample 3' },
    { label: 'Chunk', detail: 'This tiny file has one chunk containing all four samples. stsc maps sample 3 to chunk 1; stco gives byte 1024.', data: 'chunk 1 starts at byte 1024' },
    { label: 'Byte range', detail: 'stsz sizes are 100, 120, 80, 90. Skip the first 220 bytes, then read 80 bytes.', data: `sample 3 = [${mp4SampleOffset(1024, seekExample.mp4.sampleSizes, 3)}, ${mp4SampleOffset(1024, seekExample.mp4.sampleSizes, 3) + 80})` },
    { label: 'Decode', detail: 'Read encoded sample bytes from mdat and send them to the decoder. For B-frames, ctts adds presentation offsets; decoding and display order can differ.', data: 'mdat → decoder → presentation' },
  ],
  fmp4: [
    { label: 'Initialization', detail: 'ftyp + moov identify the track, timescale, sample entry, and trex defaults. MSE requires empty initialization sample tables and mvex.', data: 'ftyp → moov → trak + mvex' },
    { label: 'Fragment', detail: 'moof contains mfhd and a traf for track 1. tfhd identifies the track and its data-base rules.', data: 'moof → traf → tfhd' },
    { label: 'Decode origin', detail: 'tfdt sets the first sample DTS to 2000 ticks in this 1000-tick/s track.', data: 'tfdt = 2000' },
    { label: 'Run entries', detail: 'trun supplies two 1000-tick samples, sized 100 and 120 bytes. Their DTS values are 2000 and 3000.', data: 'trun = [(1000,100), (1000,120)]' },
    { label: 'Byte ranges', detail: 'For this explicit example, tfhd resolves base-data-offset to byte 4096 and trun data_offset is +128. Sample bytes start at 4224 and 4324.', data: '[4224,4324), [4324,4444)' },
    { label: 'Playback', detail: 'Read bytes from mdat, decode in DTS order, then apply any composition offsets to schedule presentation.', data: 'mdat → decoder → PTS' },
  ],
  mkv: [
    { label: 'Target', detail: 'Seek near 2.040 s with TimestampScale 1,000,000 ns per tick.', data: 'target = 2040 ticks' },
    { label: 'Cue', detail: 'A CuePoint points to a suitable Cluster. CueClusterPosition is relative to Segment data start, not file start.', data: 'Segment data 256 + Cue 1024' },
    { label: 'Cluster', detail: 'Locate the Cluster at absolute byte 1280 and read Timestamp=2000 ticks.', data: 'Cluster byte = 1280' },
    { label: 'Block', detail: 'The relevant SimpleBlock carries TrackNumber 1 and signed relative timestamp +40 ticks.', data: 'Track 1 · relative +40' },
    { label: 'Time', detail: 'Add Cluster and Block times: (2000 + 40) × 1,000,000 ns = 2.040 s.', data: `${pretty(matroskaTimeNs(2000, 40, 1000000))} ns` },
    { label: 'Decode', detail: 'Use TrackEntry CodecID/CodecPrivate to initialize the decoder and extract encoded frame bytes. Validate keyframe/reference semantics before random access.', data: 'SimpleBlock → decoder' },
  ],
}
export function FrameWalkthrough() {
  const [family, setFamily] = useState<WalkFamily>('mp4')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => { if (!playing) return; const timer = window.setInterval(() => setStep(previous => { if (previous >= steps[family].length - 1) { setPlaying(false); return previous } return previous + 1 }), 1400); return () => window.clearInterval(timer) }, [playing, family])
  const current = steps[family][step]
  const x = d3.scalePoint().domain(steps[family].map((_, i) => String(i))).range([45, 835])
  return <section className="cx-card" id="walkthrough"><div className="cx-heading"><span>04 / PLAYER READ PATH</span><h2>Find one video frame</h2><p>Follow a fictional file with fully specified times and byte offsets. Every number in the path is computed from the shown metadata.</p></div><div className="cx-pills">{(['mp4', 'fmp4', 'mkv'] as WalkFamily[]).map(id => <button key={id} aria-pressed={family === id} onClick={() => { setFamily(id); setStep(0); setPlaying(false) }}>{id === 'mkv' ? 'Matroska / WebM' : formats[id].label}</button>)}</div><div className="cx-step-controls"><button onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button><button onClick={() => { setPlaying(false); setStep(0) }}>Reset</button><button onClick={() => { setPlaying(false); setStep(Math.max(0, step - 1)) }} disabled={step === 0}>← Previous</button><button onClick={() => { setPlaying(false); setStep(Math.min(steps[family].length - 1, step + 1)) }} disabled={step === steps[family].length - 1}>Next →</button><span>Step {step + 1} / {steps[family].length}</span></div><div className="cx-timeline-scroll"><svg viewBox="0 0 880 110" role="img" aria-label="Step by step sample location path"><line x1="45" x2="835" y1="45" y2="45" stroke="var(--border)" strokeWidth="6" />{steps[family].map((item, i) => <g key={item.label} role="button" tabIndex={0} onClick={() => { setStep(i); setPlaying(false) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStep(i); setPlaying(false) } }}><circle cx={x(String(i))} cy="45" r={i === step ? 16 : 11} fill={i <= step ? '#627de8' : 'var(--cx-panel)'} stroke="#627de8" strokeWidth="2" /><text x={x(String(i))} y="83" textAnchor="middle" fill="var(--text-h)" fontSize="11" fontWeight={i === step ? 800 : 500}>{item.label}</text></g>)}</svg></div><div className="cx-step-detail"><span>{String(step + 1).padStart(2, '0')} / {current.label}</span><h3>{current.data}</h3><p>{current.detail}</p></div></section>
}

const comparisonRows: { label: string; values: Record<FormatId, string> }[] = [
  { label: 'Family / header', values: { mp4: 'ISO BMFF · size + FourCC', fmp4: 'ISO BMFF · size + FourCC', mov: 'QuickTime atoms · size + type', mkv: 'EBML · ID VINT + size VINT', webm: 'EBML · restricted Matroska' } },
  { label: 'Track metadata', values: { mp4: 'moov/trak/stsd', fmp4: 'init moov/trak/stsd', mov: 'moov/trak/sample descriptions', mkv: 'Tracks/TrackEntry', webm: 'Tracks/TrackEntry' } },
  { label: 'Metadata organization', values: { mp4: 'Nested moov and optional meta/udta', fmp4: 'Initialization moov + optional timed events', mov: 'Nested atoms; QuickTime-specific user data and metadata', mkv: 'Info, Tracks, optional Tags/Chapters/Attachments', webm: 'Matroska subset; check element support table' } },
  { label: 'Timing / index', values: { mp4: 'stts + ctts; stsc/stsz/stco/stss', fmp4: 'tfdt + trun; optional sidx/tfra', mov: 'sample tables + edit lists', mkv: 'Cluster + Block times; optional Cues', webm: 'Cluster + Block times; optional Cues' } },
  { label: 'Seeking', values: { mp4: 'Sync sample plus tables to chunk byte offset', fmp4: 'Fragment metadata; optional sidx/tfra index', mov: 'Sample tables and sync sample atom', mkv: 'Cues point into Clusters; scan Blocks', webm: 'Cues when present; scan Clusters and Blocks' } },
  { label: 'Encoded bytes', values: { mp4: 'mdat samples', fmp4: 'mdat after moof', mov: 'mdat samples', mkv: 'Cluster Blocks', webm: 'Cluster Blocks' } },
  { label: 'Fragmentation / streaming', values: { mp4: 'Progressive download; fast-start layout', fmp4: 'DASH/HLS/CMAF segments and chunks', mov: 'File and editing workflows; variants exist', mkv: 'Cluster-based streaming; profile/player-dependent', webm: 'WebM segments for MSE when supported' } },
  { label: 'Codec compatibility', values: { mp4: 'Brands and sample entries constrain codecs', fmp4: 'Brands, profiles, and init sample entry constrain codecs', mov: 'QuickTime sample descriptions vary', mkv: 'Broad Matroska CodecID registry', webm: 'WebM guidelines name VP8/VP9 + Vorbis/Opus; check codec-specific carriage specs' } },
  { label: 'Browser playback', values: { mp4: 'Check MIME, codec/profile, and device', fmp4: 'MSE brand, codec, and segment rules apply', mov: 'Extension alone says little about support', mkv: 'API/platform support varies; do not infer from codec alone', webm: 'Check MIME, codec/profile, and MSE byte-stream support' } },
]
const analogies = [
  ['Track declaration', 'trak / stsd', 'TrackEntry', 'Both identify a stream and codec setup; nesting and numbering differ.'],
  ['Encoded storage', 'mdat', 'Cluster / Block', 'Conceptual only: mdat is a byte payload; Cluster also carries per-block timing.'],
  ['Seek index', 'stss + sample tables', 'Cues + keyframe flags', 'Conceptual only: granularity and random-access semantics differ.'],
  ['Per-sample timing', 'stts + ctts or tfdt + trun', 'Cluster Timestamp + Block offset', 'DTS/PTS signaling differs, especially with reordered frames.'],
] as const
const analogyIds = [['trak', 'TrackEntry'], ['mdat', 'Cluster'], ['stss', 'Cues'], ['stts', 'Timestamp']] as const
export function ComparisonAndGlossary({ onNavigate }: { onNavigate: (format: FormatId, element: string) => void }) {
  const [left, setLeft] = useState<FormatId>('mp4')
  const [right, setRight] = useState<FormatId>('mkv')
  const [analogy, setAnalogy] = useState(0)
  const [termQuery, setTermQuery] = useState('')
  const isoElement = findElement('mp4', analogyIds[analogy][0])
  const ebmlElement = findElement('mkv', analogyIds[analogy][1])
  return <><section className="cx-card" id="compare"><div className="cx-heading"><span>05 / SIDE BY SIDE</span><h2>Compare the formats</h2><p>These are container properties. Playback still depends on codec, profile, API, browser, and device.</p></div><div className="cx-compare-select"><label>First format<select value={left} onChange={e => setLeft(e.target.value as FormatId)}>{formatIds.map(id => <option key={id} value={id}>{formats[id].label}</option>)}</select></label><label>Second format<select value={right} onChange={e => setRight(e.target.value as FormatId)}>{formatIds.map(id => <option key={id} value={id}>{formats[id].label}</option>)}</select></label></div><div className="cx-table-scroll"><table><thead><tr><th>Question</th><th>{formats[left].label}</th><th>{formats[right].label}</th></tr></thead><tbody>{comparisonRows.map(row => <tr key={row.label}><th>{row.label}</th><td>{row.values[left]}</td><td>{row.values[right]}</td></tr>)}</tbody></table></div><h3>Analogous structures · conceptual comparisons</h3><div className="cx-analogy-grid">{analogies.map(([label, isoName, ebmlName, note], i) => <button className="cx-analogy" aria-pressed={analogy === i} key={label} onClick={() => setAnalogy(i)}><strong>{label}</strong><span className="cx-analogy-pair"><code>{isoName}</code><span>↔</span><code>{ebmlName}</code></span><span>{note}</span></button>)}</div><div className="cx-analogy-detail"><div><small>ISO BMFF · {isoElement?.code}</small><h4>{isoElement?.name}</h4><p>{isoElement?.purpose}</p><button onClick={() => { onNavigate('mp4', analogyIds[analogy][0]); document.getElementById('hierarchy')?.scrollIntoView({ behavior: 'smooth' }) }}>Inspect in MP4 ↗</button></div><div><small>Matroska · {ebmlElement?.code}</small><h4>{ebmlElement?.name}</h4><p>{ebmlElement?.purpose}</p><button onClick={() => { onNavigate('mkv', analogyIds[analogy][1]); document.getElementById('hierarchy')?.scrollIntoView({ behavior: 'smooth' }) }}>Inspect in MKV ↗</button></div></div></section><section className="cx-card" id="glossary"><div className="cx-heading"><span>06 / QUICK REFERENCE</span><h2>Glossary</h2><p>Open a linked structure in the hierarchy for its fields and specification.</p></div><label className="cx-search">Filter terms<input value={termQuery} onChange={e => setTermQuery(e.target.value)} placeholder="Try timestamp, cue, or sample" /></label><div className="cx-glossary">{glossary.filter(entry => media(`${entry.term} ${entry.definition}`).includes(media(termQuery))).map(entry => <button key={entry.term} onClick={() => { onNavigate(entry.format, entry.element); document.getElementById('hierarchy')?.scrollIntoView({ behavior: 'smooth' }) }}><strong>{entry.term} ↗</strong><span>{entry.definition}</span></button>)}</div></section></>
}

export function FamilyOverview() {
  const [family, setFamily] = useState<'iso' | 'ebml'>('iso')
  const rows = family === 'iso' ? [
    ['4 bytes', 'size · includes header'], ['4 bytes', 'FourCC · box type'], ['nested', 'moov → trak → mdia → stbl'], ['payload', 'mdat holds encoded samples'],
  ] : [
    ['VINT', 'element ID · marker retained'], ['VINT', 'data size · marker removed'], ['nested', 'Segment → Tracks / Cluster'], ['payload', 'Blocks hold encoded frames'],
  ]
  const y = d3.scaleBand().domain(rows.map((_, i) => String(i))).range([20, 260]).padding(.13)
  return <section className="cx-card" id="overview"><div className="cx-heading"><span>01 / TWO FAMILY TREES</span><h2>Same job, different grammar</h2><p>A container wraps encoded streams with track descriptions, timing, and seek information. A codec defines the encoded samples themselves; an extension is just a filename hint.</p></div><div className="cx-overview-grid"><div><div className="cx-pills"><button aria-pressed={family === 'iso'} onClick={() => setFamily('iso')}>ISO BMFF / QuickTime</button><button aria-pressed={family === 'ebml'} onClick={() => setFamily('ebml')}>EBML / Matroska</button></div><svg viewBox="0 0 640 280" role="img" aria-label={`${family} hierarchy and header diagram`}>{rows.map(([tag, label], i) => <g key={tag + i}><rect x={30 + i * 25} y={y(String(i))} width={570 - i * 50} height={y.bandwidth()} rx="9" fill={i === 3 ? '#e76a76' : i === 2 ? '#12a999' : '#627de8'} opacity={.9} /><text x={48 + i * 25} y={(y(String(i)) ?? 0) + y.bandwidth() / 2 + 5} fill="white" fontSize="15" fontWeight="700">{tag}</text><text x={205} y={(y(String(i)) ?? 0) + y.bandwidth() / 2 + 5} fill="white" fontSize="14">{label}</text></g>)}</svg></div><div className="cx-overview-copy"><h3>{family === 'iso' ? 'Boxes have fixed-width basic headers' : 'Elements use variable-width headers'}</h3><p>{family === 'iso' ? 'MP4 descended from QuickTime. A box tells you its total byte length and FourCC; parent boxes nest other boxes. Track sample tables point into mdat. MOV shares many atoms but has historical and metadata conventions of its own.' : 'Matroska is an EBML document. Each element has an ID and data size encoded as VINTs. A Segment contains Tracks, Clusters, and optional Cues. WebM uses this architecture with a restricted element and codec set.'}</p><ul><li><strong>Metadata:</strong> movie/track boxes or Info/TrackEntry elements.</li><li><strong>Timing:</strong> sample tables and fragment runs, or Cluster plus relative Block time.</li><li><strong>Seeking:</strong> MP4 indexes and sync samples, or Matroska Cues and Blocks.</li></ul></div></div></section>
}

export function Sources() { return <footer className="cx-sources"><h2>Specification trail</h2><p>Representative structures illustrate common layouts. Presence, ordering, and allowed codecs depend on brand, profile, and delivery API.</p><div>{Object.entries(specs).map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer">{name.toUpperCase()} ↗</a>)}</div></footer> }
