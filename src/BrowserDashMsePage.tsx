import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

type Section = { id: string; title: string; invariant?: string; body: ReactNode[]; bullets?: string[]; visual: ReactNode }
type StageZone = 'player' | 'mse' | 'browser'
type Stage = { id: string; label: string; zone: StageZone; note: string }

const zoneColor: Record<StageZone, string> = { player: '#38bdf8', mse: '#f59e0b', browser: '#22c55e' }
const reps = [{ id: '240p', bitrate: 450, w: 426, h: 240 }, { id: '480p', bitrate: 1100, w: 854, h: 480 }, { id: '720p', bitrate: 2600, w: 1280, h: 720 }, { id: '1080p', bitrate: 5200, w: 1920, h: 1080 }]

function useSvg(draw: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => void, deps: unknown[] = []) {
  const ref = useRef<SVGSVGElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const width = el.clientWidth || 960
    const height = Number(el.dataset.height ?? 360)
    const svg = d3.select(el)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)
    draw(svg, width, height)
  }, deps)
  return ref
}

function SvgViz({ draw, height = 360, label }: { draw: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => void; height?: number; label: string }) {
  const ref = useSvg(draw, [draw])
  return <svg ref={ref} data-height={height} className="mse-svg" role="img" aria-label={label} />
}

function Button({ active, children, onClick }: { active?: boolean; children: string; onClick: () => void }) {
  return <button className={active ? 'is-active' : ''} type="button" onClick={onClick}>{children}</button>
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mse-viz-note">{children}</p>
}

function ArchitectureViz() {
  const [selected, setSelected] = useState('scheduler')
  const stages: Stage[] = [
    { id: 'mpd', label: 'MPD', zone: 'player', note: 'Text metadata describing periods, tracks, representations, timing, and segment URLs.' },
    { id: 'parser', label: 'Manifest Parser', zone: 'player', note: 'Normalizes DASH XML into playable periods, adaptation sets, representations, and segment references.' },
    { id: 'selection', label: 'Track Selection', zone: 'player', note: 'Chooses video/audio adaptation sets, language, codecs, and starting representation.' },
    { id: 'abr', label: 'ABR Manager', zone: 'player', note: 'Turns bandwidth, buffer health, and policy into future representation choices.' },
    { id: 'scheduler', label: 'Segment Scheduler', zone: 'player', note: 'Decides which audio/video segment should be requested next and when to stop.' },
    { id: 'fetch', label: 'Network Fetching', zone: 'player', note: 'Owns HTTP request lifecycle, retries, cancellation, timing, and throughput measurement.' },
    { id: 'buffer', label: 'Buffer Manager', zone: 'player', note: 'Reasons over TimeRanges, target buffer, pruning, starvation, and discontinuities.' },
    { id: 'sb', label: 'SourceBuffer', zone: 'mse', note: 'The append/remove insertion point. It queues bytes into browser media processing; it is not a decoder.' },
    { id: 'mse', label: 'MSE', zone: 'mse', note: 'MediaSource lifecycle, readyState, source buffers, duration, and endOfStream boundary.' },
    { id: 'demux', label: 'Browser Demux', zone: 'browser', note: 'Browser parses MP4 boxes, extracts encoded samples, and builds internal track buffers.' },
    { id: 'decode', label: 'Browser Decoder', zone: 'browser', note: 'Configures hardware/software decoders and converts samples into frames or PCM.' },
    { id: 'render', label: 'Browser Renderer', zone: 'browser', note: 'Schedules decoded output against the media clock and display/audio device.' },
    { id: 'media', label: 'Media Element', zone: 'browser', note: 'Exposes playback controls, currentTime, buffered, seeking, stalled, ended, and errors.' },
  ]
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    const x = width / 2
    const step = (height - 54) / (stages.length - 1)
    svg.append('defs').append('marker').attr('id', 'mse-arrow').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto').append('path').attr('d', 'M0,0L10,5L0,10Z').attr('fill', '#94a3b8')
    ;(['player', 'mse', 'browser'] as StageZone[]).forEach((zone) => {
      const ys = stages.map((s, i) => s.zone === zone ? 28 + i * step : null).filter((v): v is number => v !== null)
      svg.append('rect').attr('x', 30).attr('y', Math.min(...ys) - 22).attr('width', width - 60).attr('height', Math.max(...ys) - Math.min(...ys) + 44).attr('rx', 18).attr('fill', zoneColor[zone]).attr('opacity', 0.08).attr('stroke', zoneColor[zone]).attr('stroke-dasharray', '5 5')
      svg.append('text').attr('x', 46).attr('y', Math.min(...ys) - 6).attr('class', 'mse-small-label').text(zone === 'player' ? 'Player-owned' : zone === 'mse' ? 'MSE boundary' : 'Browser-owned')
    })
    stages.forEach((stage, i) => {
      const y = 28 + i * step
      if (i > 0) svg.append('line').attr('x1', x).attr('y1', y - step + 24).attr('x2', x).attr('y2', y - 25).attr('class', 'mse-flow-line').attr('marker-end', 'url(#mse-arrow)')
      const g = svg.append('g').attr('transform', `translate(${x},${y})`).style('cursor', 'pointer').on('mouseenter click', () => setSelected(stage.id))
      g.append('rect').attr('x', -105).attr('y', -18).attr('width', 210).attr('height', 36).attr('rx', 12).attr('fill', zoneColor[stage.zone]).attr('opacity', selected === stage.id ? 0.3 : 0.14).attr('stroke', selected === stage.id ? '#facc15' : zoneColor[stage.zone]).attr('stroke-width', selected === stage.id ? 2.5 : 1.5)
      g.append('text').attr('text-anchor', 'middle').attr('dy', 5).attr('class', 'mse-svg-label').text(stage.label)
    })
  }
  const active = stages.find((s) => s.id === selected)!
  return <div><SvgViz height={650} label="End to end DASH MSE playback architecture" draw={draw} /><Note><strong>{active.label}:</strong> {active.note}</Note></div>
}

function NativeVsBrowserViz() {
  const [mode, setMode] = useState<'native' | 'browser'>('browser')
  const native = ['File', 'Parser', 'Sample Tables', 'Demuxer', 'Decoder', 'Renderer']
  const browser = ['Manifest', 'Scheduler', 'Buffer Manager', 'MSE', 'Browser Pipeline', 'Renderer']
  const chain = mode === 'native' ? native : browser
  return <div><div className="mse-controls"><Button active={mode === 'native'} onClick={() => setMode('native')}>native player</Button><Button active={mode === 'browser'} onClick={() => setMode('browser')}>browser player</Button></div><div className="currency-grid"><div><strong>Native player</strong>{native.map((x) => <span key={x}>{x}</span>)}</div><div><strong>Browser player</strong>{browser.map((x) => <span key={x}>{x}</span>)}</div></div><div className="segment-conversion">{['Segment', 'Browser', 'Samples', 'Frames'].map((x, i) => <span key={x} style={{ animationDelay: `${i * 180}ms` }}>{x}</span>)}</div><Note>{mode === 'browser' ? 'Segments are the application currency. Samples are the browser currency.' : 'Native players often own sample indexes and sample queues directly.'}</Note><div className="mini-flow">{chain.map((x) => <span key={x}>{x}</span>)}</div></div>
}

function MpdExplorerViz() {
  const [live, setLive] = useState(false)
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    type N = { name: string; note: string; children?: N[] }
    const treeData: N = { name: live ? 'MPD type="dynamic"' : 'MPD type="static"', note: live ? 'availability window + publishTime' : 'fixed VOD duration', children: [{ name: 'Period 0', note: 'timeline scope', children: [{ name: 'Video Adaptation Set', note: 'same content, multiple encodes', children: reps.map((r) => ({ name: r.id, note: `${r.bitrate} kbps · ${r.w}x${r.h}` })) }, { name: 'Audio Adaptation Set', note: 'language/channel alternatives', children: [{ name: 'en stereo', note: 'mp4a.40.2' }, { name: 'es stereo', note: 'mp4a.40.2' }] }, { name: 'SegmentTemplate', note: live ? '$Number$ + SegmentTimeline' : 'init + media URLs' }] }] }
    const root = d3.hierarchy(treeData)
    d3.tree<N>().size([height - 55, width - 230])(root)
    const g = svg.append('g').attr('transform', 'translate(115,28)')
    g.selectAll('path').data(root.links()).join('path').attr('class', 'mse-tree-link').attr('d', (d) => `M${d.source.y},${d.source.x}C${((d.source.y ?? 0) + (d.target.y ?? 0)) / 2},${d.source.x} ${((d.source.y ?? 0) + (d.target.y ?? 0)) / 2},${d.target.x} ${d.target.y},${d.target.x}`)
    const n = g.selectAll('g').data(root.descendants()).join('g').attr('transform', (d) => `translate(${d.y},${d.x})`)
    n.append('circle').attr('r', 8).attr('fill', (d) => d.depth < 2 ? '#38bdf8' : d.data.name.includes('Adaptation') ? '#a78bfa' : '#f59e0b')
    n.append('text').attr('x', 14).attr('dy', -3).attr('class', 'mse-svg-label').text((d) => d.data.name)
    n.append('text').attr('x', 14).attr('dy', 13).attr('class', 'mse-small-label').text((d) => d.data.note)
  }
  return <div><div className="mse-controls"><Button active={!live} onClick={() => setLive(false)}>VOD manifest</Button><Button active={live} onClick={() => setLive(true)}>live manifest</Button></div><SvgViz height={420} label="Interactive DASH MPD explorer" draw={draw} /></div>
}

function RepresentationLadderViz() {
  const [hover, setHover] = useState(reps[2].id)
  const active = reps.find((r) => r.id === hover)!
  return <div><div className="rep-ladder">{reps.map((r) => <button key={r.id} type="button" onMouseEnter={() => setHover(r.id)} onFocus={() => setHover(r.id)} style={{ height: `${42 + r.h / 18}px` }}>{r.id}<small>{r.bitrate} kbps</small></button>)}</div><Note><strong>{active.id}</strong> is {active.w}x{active.h}, approximately {active.bitrate} kbps. Switching works because representations describe the same media timeline with compatible codec/timestamp boundaries.</Note></div>
}

function AbrSimulationViz() {
  const [speed, setSpeed] = useState(3.2)
  const [latency, setLatency] = useState(220)
  const [rate, setRate] = useState(1)
  const [stable, setStable] = useState(true)
  const points = d3.range(24).map((i) => {
    const wave = Math.sin(i / 2) * (stable ? 0.55 : 1.5)
    const throughput = Math.max(0.3, speed + wave - latency / 1200)
    const buffer = Math.max(1, 12 + Math.sin(i / 3) * 5 + speed - rate * 3)
    const safe = stable ? throughput * 0.75 : throughput * 0.98
    const rep = [...reps].reverse().find((r) => r.bitrate / 1000 < safe)?.id ?? '240p'
    return { i, throughput, buffer, rep }
  })
  const current = points.at(-1)!
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    const x = d3.scaleLinear().domain([0, 23]).range([45, width - 28])
    const y = d3.scaleLinear().domain([0, 8]).range([height - 45, 28])
    svg.append('path').datum(points).attr('d', d3.line<typeof current>().x((d) => x(d.i)).y((d) => y(d.throughput))).attr('class', 'mse-throughput-line')
    svg.selectAll('circle').data(points).join('circle').attr('cx', (d) => x(d.i)).attr('cy', (d) => y(d.throughput)).attr('r', 5).attr('fill', (d) => reps.find((r) => r.id === d.rep)?.id === '1080p' ? '#22c55e' : d.rep === '720p' ? '#38bdf8' : d.rep === '480p' ? '#f59e0b' : '#ef4444')
    ;[1, 3, 5, 7].forEach((v) => { svg.append('line').attr('x1', 42).attr('x2', width - 28).attr('y1', y(v)).attr('y2', y(v)).attr('class', 'mse-grid-line'); svg.append('text').attr('x', 8).attr('y', y(v) + 4).attr('class', 'mse-small-label').text(`${v} Mbps`) })
  }
  return <div><div className="slider-grid"><label>network speed {speed.toFixed(1)} Mbps<input type="range" min="0.5" max="7" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></label><label>latency {latency} ms<input type="range" min="20" max="900" step="10" value={latency} onChange={(e) => setLatency(Number(e.target.value))} /></label><label>playback rate {rate.toFixed(1)}x<input type="range" min="0.5" max="1.8" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label></div><div className="mse-controls"><Button active={stable} onClick={() => setStable(true)}>hysteresis</Button><Button active={!stable} onClick={() => setStable(false)}>poor tuning</Button></div><SvgViz height={280} label="Adaptive bitrate decision simulation" draw={draw} /><Note>Selected <strong>{current.rep}</strong>. Buffer is {current.buffer.toFixed(1)}s. EWMA-like smoothing and hysteresis trade fast reaction for fewer oscillations.</Note></div>
}

function SchedulerViz() {
  const [time, setTime] = useState(18)
  const [target, setTarget] = useState(24)
  const segs = d3.range(0, 60, 4).map((s) => ({ s, e: s + 4, state: s + 4 <= time ? 'played' : s < time + 14 ? 'buffered' : s < time + target ? 'requested' : s < time + target + 8 ? 'missing' : 'future' }))
  return <div><div className="slider-grid"><label>currentTime {time}s<input type="range" min="0" max="42" value={time} onChange={(e) => setTime(Number(e.target.value))} /></label><label>target buffer {target}s<input type="range" min="8" max="36" value={target} onChange={(e) => setTarget(Number(e.target.value))} /></label></div><div className="segment-timeline">{segs.map((seg) => <span key={seg.s} className={seg.state}>{seg.s}-{seg.e}</span>)}</div><Note>Scheduler tick: read currentTime and buffered end, subtract pending requests, prefer missing audio/video near the playhead, and avoid overfetching beyond the target.</Note></div>
}

function NetworkViz() {
  const [fail, setFail] = useState(false)
  const reqs = d3.range(5).map((i) => ({ id: i, start: 10 + i * 12, wait: 18 + i * 7, size: 500 + i * 350, fail: fail && i === 2 }))
  return <div><div className="mse-controls"><Button active={!fail} onClick={() => setFail(false)}>healthy</Button><Button active={fail} onClick={() => setFail(true)}>inject failure</Button></div><div className="waterfall">{reqs.map((r) => <div key={r.id}><strong>seg {r.id + 1}</strong><span className={r.fail ? 'fail' : ''} style={{ marginLeft: `${r.start}%`, width: `${Math.min(70, r.wait)}%` }}>{r.fail ? 'timeout → retry' : `${r.size} KB`}</span></div>)}</div><Note>Network timing is the player’s main uncertainty source. Fetch completion updates throughput estimates, but cancellation and retries must not corrupt scheduler state.</Note></div>
}

function TimeRangesViz() {
  const [gap, setGap] = useState(false)
  const [ct, setCt] = useState(8)
  const ranges = gap ? [[0, 10], [20, 50]] : [[0, 50]]
  return <div><div className="mse-controls"><Button active={!gap} onClick={() => setGap(false)}>continuous</Button><Button active={gap} onClick={() => setGap(true)}>gap</Button></div><label className="wide-slider">currentTime {ct}s<input type="range" min="0" max="55" value={ct} onChange={(e) => setCt(Number(e.target.value))} /></label><div className="time-ranges"><i style={{ left: `${ct / 60 * 100}%` }} />{ranges.map(([a, b]) => <span key={a} style={{ left: `${a / 60 * 100}%`, width: `${(b - a) / 60 * 100}%` }}>[{a} - {b}]</span>)}</div><Note>{gap && ct >= 10 && ct < 20 ? 'The playhead is in an unbuffered gap: playback stalls or seek policy must jump.' : 'One continuous range gives simple buffer-ahead math and fewer edge cases.'}</Note></div>
}

function SourceBufferViz() {
  return <div><div className="append-queue">{['seg 41', 'seg 42', 'seg 43', 'updateend', 'remove old'].map((x, i) => <span key={x} style={{ animationDelay: `${i * 160}ms` }}>{x}</span>)}</div><pre>{`await sourceBuffer.appendBuffer(segmentBytes)
// wait for updateend before the next append/remove
sourceBuffer.remove(0, currentTime - bufferBehind)`}</pre><Note>SourceBuffer is a queue into internal browser processing. Append completion means accepted by MSE, not decoded or rendered.</Note></div>
}

function BrowserPipelineViz() {
  const [expanded, setExpanded] = useState('Track Buffers')
  const steps = ['Segment', 'MP4 Parsing', 'Sample Extraction', 'Track Buffers', 'Decoder Queues', 'Decoded Frames', 'Rendering']
  return <div><div className="browser-pipeline">{steps.map((s) => <button key={s} type="button" className={expanded === s ? 'is-active' : ''} onClick={() => setExpanded(s)}>{s}</button>)}</div><Note><strong>{expanded}:</strong> {expanded === 'Segment' ? 'Application-owned bytes stop here.' : expanded === 'Track Buffers' ? 'Browser now owns samples, timestamps, and decode ordering.' : expanded === 'Rendering' ? 'Frames are presented by browser clocks and rendering policy.' : 'Internal browser work after append; not directly controlled by JavaScript.'}</Note></div>
}

function ClockViz() {
  const [paused, setPaused] = useState(false)
  const t = paused ? 12 : 18
  const clocks = [{ l: 'wall clock', v: 86 }, { l: 'media currentTime', v: t * 4 }, { l: 'audio device', v: paused ? 48 : 73 }]
  return (
    <div className="clock-grid">
      {clocks.map((c) => (
        <div key={c.l}>
          <strong>{c.l}</strong>
          <span><i style={{ width: c.v + '%' }} /></span>
        </div>
      ))}
      <div className="mse-controls">
        <Button active={!paused} onClick={() => setPaused(false)}>playing</Button>
        <Button active={paused} onClick={() => setPaused(true)}>paused</Button>
      </div>
      <Note>Wall clock always moves. The media clock advances only while playback is progressing. Seeks invalidate scheduler assumptions tied to old currentTime.</Note>
    </div>
  )
}

function SwitchingViz() {
  const [bad, setBad] = useState(false)
  const seq = ['720p', '720p', '1080p', '1080p', '480p']
  return <div><div className="mse-controls"><Button active={!bad} onClick={() => setBad(false)}>aligned</Button><Button active={bad} onClick={() => setBad(true)}>gap/overlap</Button></div><div className="switch-timeline">{seq.map((r, i) => <span key={`${r}-${i}`} className={bad && i === 2 ? 'bad' : ''}>{r}</span>)}</div><Note>Representation switching affects future segments, not past buffered media. Safe switches need compatible codecs, init data, keyframe/timestamp continuity, and no accidental gap or overlap.</Note></div>
}

function SeekingViz() {
  const [target, setTarget] = useState(120)
  return <div><label className="wide-slider">seek target {target}s<input type="range" min="0" max="180" step="4" value={target} onChange={(e) => setTarget(Number(e.target.value))} /></label><div className="seek-rebuild"><span>old buffer 0-30 abandoned</span><span>flush append queue</span><span>request segment near {target}s</span><span>rebuild A/V buffer</span></div><Note>A seek is a generation change: pending requests, append assumptions, ABR context, and buffer math must be tied to the new target.</Note></div>
}

function LiveViz() {
  const [behind, setBehind] = useState(18)
  return <div><label className="wide-slider">viewer latency {behind}s<input type="range" min="2" max="80" value={behind} onChange={(e) => setBehind(Number(e.target.value))} /></label><div className="live-window"><span className="dvr">DVR window</span><i style={{ right: `${Math.min(92, behind)}%` }} /> <b>LIVE</b></div><Note>Live playback has moving availability. The scheduler must respect the DVR window, avoid unavailable future segments, and decide whether low latency or stability wins.</Note></div>
}

function EosViz() {
  return <div className="eos-drain">{['Network Done', 'Append Done', 'Decode Done', 'Render Done', 'EOS Safe'].map((x, i) => <span key={x} style={{ animationDelay: `${i * 220}ms` }}>{x}</span>)}<Note>Calling endOfStream too early can cut off frames still inside browser processing. Calling it too late can leave the media element waiting forever despite no more segments.</Note></div>
}

function ErrorRecoveryViz() {
  const [err, setErr] = useState('network')
  const map: Record<string, string> = { network: 'Retry with backoff, downgrade ABR, preserve request generation.', append: 'Wait for updateend, inspect SourceBuffer error, prune or fail period.', decode: 'Codec/profile may be unsupported; switch representation only if compatible.', manifest: 'Reject invalid timeline or refresh dynamic MPD before declaring fatal.' }
  return <div><div className="mse-controls">{Object.keys(map).map((e) => <Button key={e} active={err === e} onClick={() => setErr(e)}>{e}</Button>)}</div><p className="fault-card">{map[err]}</p></div>
}

function StateMachineViz() {
  const [state, setState] = useState('Idle')
  const states = ['Idle', 'Loading Manifest', 'Selecting Tracks', 'Buffering', 'Playing', 'Seeking', 'Stalled', 'Ending', 'Ended', 'Error']
  return <div><div className="state-pills">{states.map((s) => <span key={s} className={state === s ? 'is-active' : ''}>{s}</span>)}</div><div className="mse-controls">{states.map((s) => <Button key={s} active={state === s} onClick={() => setState(s)}>{s}</Button>)}</div><Note>State machines make asynchronous browser events, scheduler ticks, seeks, stalls, errors, and EOS decisions explicit.</Note></div>
}

function InvariantsViz() {
  const items = ['Segments are the player\'s currency.', 'Samples are the browser\'s currency.', 'SourceBuffer is not a decoder.', 'ABR decisions affect future segments, not past ones.', 'Buffer health drives playback stability.', 'Scheduler correctness matters more than scheduler complexity.', 'Continuous buffered ranges are simpler than fragmented ones.', 'EOS requires the entire pipeline to drain.', 'Live playback is fundamentally different from VOD.']
  return <div className="invariant-grid">{items.map((x) => <article key={x}>{x}</article>)}</div>
}

function MinimalPlayerViz() {
  return <div><div className="mini-flow">{['Manifest Parser', 'ABR Manager', 'Segment Scheduler', 'Fetcher', 'Buffer Manager', 'MediaSource Controller', 'Playback State Machine'].map((x) => <span key={x}>{x}</span>)}</div><Note>Start with static VOD, one audio/video pair, fMP4, clear content, conservative ABR, sequential appends, gap-free buffering, and explicit EOS. Add live, trick modes, DRM, captions, multi-period, and aggressive low latency later.</Note></div>
}

const sections: Section[] = [
  { id: 'overview', title: '1. Overview: End-to-End Browser Playback Architecture', invariant: 'The player owns policy and bytes; the browser owns samples, decode, sync, and presentation.', body: ['A DASH/MSE player is not a decoder in JavaScript. It is a control system that converts manifest metadata into a timed stream of segment fetches and append operations.', 'The hard boundary is SourceBuffer. Before that boundary the application reasons about manifests, representations, requests, target buffer, and EOS. After that boundary the browser parses MP4, extracts samples, configures decoders, synchronizes audio/video, and renders.'], visual: <ArchitectureViz /> },
  { id: 'native-vs-browser', title: '2. Browser Player vs Native Player', invariant: 'Segments are the application currency. Samples are the browser currency.', body: ['A native player usually builds sample tables, owns demuxed sample queues, and feeds decoders directly. A browser DASH player owns segment references and byte append order, then lets the browser convert those segments into samples internally.', 'This distinction shapes every design decision: ABR picks future segments, buffering is observed through TimeRanges, append success is not decode success, and playback readiness is not the same as network completion.'], visual: <NativeVsBrowserViz /> },
  { id: 'manifest', title: '3. DASH Manifest Architecture', body: ['The MPD describes periods, adaptation sets, representations, BaseURL, SegmentTemplate, SegmentTimeline, initialization segments, and media segments. VOD manifests are mostly fixed; dynamic manifests move with publish time and availability windows.', 'A good parser normalizes all of this into segment references with media time, URL, duration, representation, and availability. The scheduler should not be interpreting XML on every tick.'], bullets: ['MPD: document-level timing and type', 'Period: timeline region', 'AdaptationSet: audio/video/text alternatives', 'Representation: bitrate/resolution/codec choice', 'SegmentTemplate/Timeline: URL and timing generator'], visual: <MpdExplorerViz /> },
  { id: 'representation', title: '4. Representation Selection', body: ['Representations are alternate encodings of the same content timeline. They vary by bitrate, resolution, codec, frame rate, scan type, HDR metadata, and sometimes codec profile.', 'Switching is possible only when the browser can maintain decode continuity. Segment boundaries, initialization data, keyframes, timestamps, and codec compatibility determine whether the switch is clean.'], visual: <RepresentationLadderViz /> },
  { id: 'abr', title: '5. Adaptive Bitrate Streaming', invariant: 'ABR is a prediction about future segment downloads under uncertainty.', body: ['Bandwidth-based ABR estimates throughput using request size and download time. EWMA short and long windows let the player react while avoiding panic from one noisy request.', 'Buffer-based ABR treats buffer health as the truth: a reservoir protects against stalls, a healthy zone allows upgrades, and a danger zone forces conservative choices. Hybrid ABR combines both because bandwidth estimates can lie and buffer-only logic can be slow.'], bullets: ['Hysteresis prevents representation ping-pong', 'Safety margins absorb TCP, CDN, and radio variance', 'Latency matters because startup delay and request round trips consume buffer', 'Poor tuning can oscillate even when average bandwidth is sufficient'], visual: <AbrSimulationViz /> },
  { id: 'scheduler', title: '6. Segment Scheduler', invariant: 'Scheduler correctness matters more than scheduler complexity.', body: ['The scheduler answers one recurring question: what segment should be fetched next? It uses currentTime, buffered ranges, target buffer, pending requests, already fetched data, representation decisions, and audio/video coordination.', 'A scheduler tick should be deterministic. It should fill nearest missing media first, avoid duplicate requests, maintain enough buffer ahead, prune policy separately, and stop requesting once the stream is complete.'], bullets: ['Maintain target buffer without overfetching', 'Prioritize missing segments near the playhead', 'Coordinate audio and video so one track does not starve', 'Track pending requests and append queues as first-class state'], visual: <SchedulerViz /> },
  { id: 'network', title: '7. Network Layer', body: ['Segment requests are the fundamental source of uncertainty. The fetcher owns request start, headers, response arrival, timeout, abort, retry policy, byte count, and throughput samples.', 'Cancellation is correctness-sensitive. A response from an old seek generation or old representation choice must not append into the new timeline by accident.'], visual: <NetworkViz /> },
  { id: 'buffer', title: '8. Buffer Management', invariant: 'The browser exposes TimeRanges; the player turns them into policy.', body: ['The media element exposes buffered ranges, not decoded-frame queues. The player computes buffer ahead, buffer behind, target buffer, starvation risk, pruning ranges, and discontinuity handling from those TimeRanges.', 'One continuous range is much easier than fragmented ranges. Seeks, representation changes, period boundaries, timestamp gaps, and append failures can produce gaps that turn simple buffer math into edge-case policy.'], visual: <TimeRangesViz /> },
  { id: 'sourcebuffer', title: '9. SourceBuffer', invariant: 'SourceBuffer is not a decoder.', body: ['SourceBuffer is the application insertion point into MSE. JavaScript appends initialization and media segments, waits for updating/updateend, and can remove old buffered ranges.', 'The SourceBuffer accepts bytes into browser media processing. It does not promise that samples are decoded, frames are ready, or rendering can start immediately.'], visual: <SourceBufferViz /> },
  { id: 'after-append', title: '10. What Happens After Append?', invariant: 'After append, the application no longer directly controls media samples.', body: ['The browser parses MP4 boxes, extracts samples, organizes track buffers, feeds decoder queues, outputs decoded frames or PCM, and schedules rendering. This is where the currency changes from segments to samples.', 'Append order, timestamps, and codec metadata are still critical because they constrain what the browser can do internally. But the samples themselves are no longer JavaScript objects.'], visual: <BrowserPipelineViz /> },
  { id: 'decode', title: '11. Browser Decode Pipeline', body: ['Demuxing separates encoded samples. Decoder configuration uses init segment metadata such as avcC, hvcC, or esds. Actual decode may happen in hardware, software, or a process boundary.', 'Append completion does not mean playback readiness because demux, decoder setup, decode delay, frame reordering, and render scheduling can all still be pending.'], visual: <BrowserPipelineViz /> },
  { id: 'clocks', title: '12. Playback Clocks', body: ['Playback involves wall clock, media clock, currentTime, audio hardware time, and render refresh timing. They are related but not identical.', 'Pauses stop media progression while wall time continues. Seeks reset assumptions. PlaybackRate changes consumption speed and therefore buffer depletion rate.'], visual: <ClockViz /> },
  { id: 'switching', title: '13. Representation Switching', body: ['Changing quality is a future-segment decision. Already buffered segments usually remain at their original representation unless explicitly removed and replaced.', 'Common failures include visual artifacts, missing init segments, codec incompatibility, timestamp gaps, overlap, non-keyframe switches, or period discontinuities.'], visual: <SwitchingViz /> },
  { id: 'seeking', title: '14. Seeking', body: ['Browser seeking changes currentTime, fires seeking/seeking-related events, and forces the scheduler to abandon old assumptions. Pending requests may be canceled, append queues flushed, and new segment priorities computed.', 'A robust player treats seek as a generation change so old network responses or updateend callbacks cannot mutate new playback state incorrectly.'], visual: <SeekingViz /> },
  { id: 'live', title: '15. Live Streaming', invariant: 'Live playback is fundamentally different from VOD.', body: ['Dynamic manifests describe a moving world. Segments become available over time, expire from the DVR window, and may require manifest refresh to discover.', 'The player must choose a live latency target, handle drift behind live edge, avoid unavailable future segments, and recover when the user falls outside the availability window.'], visual: <LiveViz /> },
  { id: 'eos', title: '16. End of Stream', invariant: 'EOS is safe only after the pipeline can drain without needing more segments.', body: ['EOS is harder than checking that the last segment was fetched. The last segment must be appended, browser demux/decode/render work may still be pending, and duration/buffered-end alignment must be sane.', 'Calling EOS too early risks truncation. Calling it too late can leave the element in a waiting state after all useful media has arrived. Real players gate EOS on segment completion, append completion, no pending requests, stream duration, and buffered end tolerance.'], visual: <EosViz /> },
  { id: 'errors', title: '17. Error Recovery', body: ['Failures happen at different layers: network, manifest, append, decode, and media element. Recovery depends on which invariant failed.', 'Retrying a corrupt append is not the same as retrying a timed-out request. Fatal codec errors should not be hidden as stalls. Manifest timeline errors should fail early because bad timing poisons scheduling.'], visual: <ErrorRecoveryViz /> },
  { id: 'state', title: '18. Player State Machine', body: ['A browser player needs explicit state: Idle, Loading Manifest, Selecting Tracks, Buffering, Playing, Seeking, Stalled, Ending, Ended, and Error.', 'The state machine coordinates asynchronous browser events, network completion, append updateend, seek commands, buffer starvation, and EOS. Without it, callback ordering becomes accidental architecture.'], visual: <StateMachineViz /> },
  { id: 'invariants', title: '19. Core Invariants', body: ['These are the durable rules that keep the architecture understandable as features grow. They matter more than any one ABR formula or queue implementation.'], visual: <InvariantsViz /> },
  { id: 'minimal-player', title: '20. Building a Minimal DASH Player', body: ['A realistic v1 should have a manifest parser, ABR manager, segment scheduler, fetcher, buffer manager, MediaSource controller, and playback state machine. Keep the first feature set intentionally narrow.', 'Support static VOD, one audio/video pair, fragmented MP4, clear streams, conservative buffer targets, simple representation switching, seeking, and careful EOS. Live, DRM, captions, multi-period, low latency, trick play, and advanced recovery can wait until the core invariants are proven.'], visual: <MinimalPlayerViz /> },
]

export function BrowserDashMsePage() {
  return <article className="mse-page"><header className="mse-hero"><p className="eyebrow">Browser media architecture</p><h1>Browser Video Playback Architecture: Building a DASH Player with Media Source Extensions</h1><p>A deep engineering reference for how a browser streaming player coordinates DASH, ABR, MSE, buffering, scheduling, playback clocks, and end-of-stream without treating the browser as a black box.</p><div className="desktop-hero-flow"><span>MPD</span><span>segments</span><span>scheduler</span><span>SourceBuffer</span><span>browser samples</span><span>decode</span><span>render</span></div></header><div className="desktop-layout"><aside className="desktop-toc" aria-label="Page contents">{sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title.replace(/^\d+\.\s*/, '')}</a>)}</aside><div className="desktop-section-stack">{sections.map((section) => <section key={section.id} id={section.id} className="desktop-section-card mse-section-card"><div className="desktop-section-copy"><h2>{section.title}</h2>{section.body.map((p, index) => <p key={index}>{p}</p>)}{section.invariant ? <aside className="desktop-invariant"><span>Core invariant</span>{section.invariant}</aside> : null}{section.bullets ? <ul>{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul> : null}</div><div className="desktop-section-visual">{section.visual}</div></section>)}</div></div></article>
}
