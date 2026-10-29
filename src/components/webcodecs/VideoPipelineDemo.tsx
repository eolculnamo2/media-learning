import { goToSection } from './sectionNavigation'
import { useEffect, useReducer, useRef, useState } from 'react'
import * as d3 from 'd3'
import { videoPipelineEvents as events, videoPipelineExamples, videoPipelineStages as stages } from '../../data/videoPipeline'

const lastStep = events.length - 1
const initialState = { step: 0, selected: 0, playing: false }
type Action = { type: 'step'; delta: number } | { type: 'select'; stage: number } | { type: 'tick' | 'toggle' | 'reset' | 'pause' }
function reducer(state: typeof initialState, action: Action): typeof initialState {
  switch (action.type) {
    case 'reset': return initialState
    case 'pause': return { ...state, playing: false }
    case 'select': return { ...state, selected: action.stage, playing: false }
    case 'toggle': return state.step === lastStep
      ? { ...initialState, playing: true }
      : { ...state, playing: !state.playing }
    case 'step': {
      const step = Math.max(0, Math.min(lastStep, state.step + action.delta))
      return { step, selected: events[step].stage, playing: false }
    }
    case 'tick': {
      const step = Math.min(lastStep, state.step + 1)
      return { step, selected: events[step].stage, playing: step < lastStep }
    }
  }
}

function subscribeMotion(callback: (event: MediaQueryListEvent) => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

export function VideoPipelineDemo() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const svgRef = useRef<SVGSVGElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(900)
  const { step, selected, playing } = state
  const current = events[step]
  const stage = stages[selected]

  useEffect(() => subscribeMotion(event => {
    setReducedMotion(event.matches)
    if (event.matches) dispatch({ type: 'pause' })
  }), [])

  useEffect(() => {
    const element = svgRef.current
    if (!element) return
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing || reducedMotion) return
    const timer = window.setInterval(() => dispatch({ type: 'tick' }), 1400)
    const hide = () => { if (document.hidden) dispatch({ type: 'pause' }) }
    document.addEventListener('visibilitychange', hide)
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) dispatch({ type: 'pause' })
    })
    if (rootRef.current) observer.observe(rootRef.current)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', hide)
      observer.disconnect()
    }
  }, [playing, reducedMotion])

  useEffect(() => {
    const element = svgRef.current
    if (!element) return
    const svg = d3.select(element)
    const focusedStage = element.contains(document.activeElement)
      ? document.activeElement?.getAttribute('data-stage') : null
    svg.selectAll('*').interrupt().remove()
    const columns = width >= 800 ? 4 : width >= 480 ? 2 : 1
    const diagramWidth = Math.max(220, width)
    const cell = diagramWidth / columns
    const rowHeight = 112
    const rows = Math.ceil(stages.length / columns)
    svg.attr('viewBox', `0 0 ${diagramWidth} ${rows * rowHeight + 24}`)
    const point = (index: number) => {
      const row = Math.floor(index / columns)
      const column = row % 2 === 0 ? index % columns : columns - 1 - index % columns
      return [cell * (column + 0.5), rowHeight * row + 56] as const
    }
    const lines = svg.append('g').attr('class', 'webcodecs-pipeline-lines')
    stages.slice(1).forEach((_, index) => {
      const a = point(index), b = point(index + 1)
      lines.append('path').attr('d', `M${a[0]},${a[1]}L${b[0]},${b[1]}`)
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + 90
      lines.append('path').attr('class', 'webcodecs-pipeline-arrow')
        .attr('d', d3.symbol(d3.symbolTriangle).size(28)())
        .attr('transform', `translate(${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2}) rotate(${angle})`)
    })
    const nodes = svg.append('g').selectAll('g').data(stages).join('g')
      .attr('transform', (_, index) => `translate(${point(index).join(',')})`)
      .attr('role', 'button').attr('tabindex', 0).attr('data-stage', (_, index) => index)
      .attr('aria-label', (item, index) => `Inspect stage ${index + 1}: ${item.name}`)
      .attr('aria-pressed', (_, index) => index === selected ? 'true' : 'false')
      .attr('class', (_, index) => `webcodecs-pipeline-node${index === selected ? ' is-selected' : ''}${index === current.stage ? ' is-current' : ''}`)
      .on('click', (_, item) => dispatch({ type: 'select', stage: stages.indexOf(item) }))
      .on('keydown', (event: KeyboardEvent, item) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          dispatch({ type: 'select', stage: stages.indexOf(item) })
        }
      })
    nodes.append('rect').attr('x', -cell / 2 + 9).attr('y', -36)
      .attr('width', cell - 18).attr('height', 72).attr('rx', 12)
    nodes.append('text').attr('y', -13).attr('class', 'webcodecs-pipeline-number')
      .text((_, index) => `${index + 1}${index === current.stage ? ' · current' : ''}`)
    nodes.append('text').attr('y', 9).text(item => item.name)
    const boundaries = ['Response body', 'BufferSource', 'Input + track', 'EncodedPacketSink',
      'seconds → µs', 'submission ≠ output', 'raw picture handle', 'draw → close']
    nodes.append('text').attr('y', 28).attr('class', 'webcodecs-pipeline-number')
      .text((_, index) => boundaries[index])
    // Motion follows the boundary being explained; repeated submissions stay at the decoder.
    const end = point(current.stage)
    const previousStage = step > 0 ? events[step - 1].stage : current.stage
    const start = point(previousStage)
    const marker = svg.append('circle').attr('class', 'webcodecs-pipeline-token').attr('r', 6)
      .attr('cx', end[0]).attr('cy', end[1] + 43).attr('aria-hidden', 'true')
    if (playing && !reducedMotion) {
      marker.attr('cx', start[0]).attr('cy', start[1] + 43)
        .transition().duration(650).ease(d3.easeCubicInOut)
        .attr('cx', end[0]).attr('cy', end[1] + 43)
    }
    if (focusedStage !== null) {
      svg.select<SVGGElement>(`[data-stage="${focusedStage}"]`).node()?.focus({ preventScroll: true })
    }
    return () => {
      svg.selectAll('*').interrupt().on('click', null).on('keydown', null)
    }
  }, [width, current.stage, selected, step, playing, reducedMotion])

  return (
    <section ref={rootRef} className="webcodecs-video-demo" aria-labelledby="video-pipeline-heading">
      <h3 id="video-pipeline-heading" tabIndex={-1}>Demo 1 — Network bytes to displayed video</h3>
      <p>Follow container bytes into compressed packets, then decoded pictures and Canvas pixels.
        Select any stage to inspect its contract, or step through a three-picture example.</p>
      <button type="button" className="webcodecs-guide-link" onClick={() => goToSection('mediabunny-guide')}>Review Mediabunny sources &amp; byte caches</button>
      <p className="codec-viz-note">Conceptual simulation: no media is downloaded or decoded here.
        Event timing, batch output, and packet movement are illustrative, not browser guarantees.
        Backward stepping replays snapshots; a real decoder cannot undo work.</p>
      <div className="webcodecs-pipeline-controls" role="group" aria-label="Video pipeline playback">
        <button type="button" disabled={step === 0} onClick={() => dispatch({ type: 'step', delta: -1 })}>Previous</button>
        <button type="button" disabled={reducedMotion} onClick={() => dispatch({ type: 'toggle' })}>
          {playing ? 'Pause' : step === lastStep ? 'Replay' : 'Play'}
        </button>
        <button type="button" disabled={step === lastStep} onClick={() => dispatch({ type: 'step', delta: 1 })}>Next</button>
        <button type="button" onClick={() => dispatch({ type: 'reset' })}>Reset</button>
      </div>
      {reducedMotion && <p className="codec-viz-note">Reduced motion is enabled. Use Previous and Next to explore every event without animation.</p>}
      <svg ref={svgRef} className="webcodecs-pipeline-svg" role="group" aria-label="Video pipeline: eight selectable stages" />
      <div className="webcodecs-pipeline-event" role="status" aria-live="polite" aria-atomic="true">
        <strong>Event {step + 1} / {events.length} · {stages[current.stage].name}</strong>
        <p>{current.text}</p>
      </div>
      <dl className="webcodecs-pipeline-metrics">
        <div><dt>Chunks submitted</dt><dd>{current.submitted}</dd></div>
        <div><dt>Frames received</dt><dd>{current.output}</dd></div>
        <div><dt>Frames drawn / closed</dt><dd>{current.drawn} / {current.drawn}</dd></div>
        <div><dt>Open frames owned</dt><dd>{current.output - current.drawn}</dd></div>
      </dl>
      <div className="webcodecs-pipeline-orders">
        <p><strong>Decode order</strong><br />I0 → P80 → B40</p>
        <p><strong>Presentation order</strong><br />I0 → B40 → P80</p>
        <p>Labels contain PTS in milliseconds. I0 is a key picture; B40 depends on I0 and P80.
          WebCodecs timestamps are 0, 40000, 80000 µs in presentation order.</p>
      </div>
      <div className="webcodecs-pipeline-inspector">
        <label htmlFor="video-pipeline-stage">Inspect stage</label>{' '}
        <select id="video-pipeline-stage" value={selected} onChange={event => dispatch({ type: 'select', stage: Number(event.target.value) })}>
          {stages.map((item, index) => <option key={item.name} value={index}>{index + 1}. {item.name}</option>)}
        </select>
        <h4>{stage.name} · <code>{stage.boundary}</code></h4>
        <dl className="webcodecs-api-facts">
          <div><dt>Inputs</dt><dd>{stage.inputs}</dd></div>
          <div><dt>Outputs</dt><dd>{stage.outputs}</dd></div>
          <div><dt>Transformation</dt><dd>{stage.transformation}</dd></div>
          <div><dt>Sync / async</dt><dd>{stage.timing}</dd></div>
          <div><dt>Ownership</dt><dd>{stage.ownership}</dd></div>
        </dl>
      </div>
      <div className="webcodecs-pipeline-preview" aria-label="Simulated Canvas presentation summary">
        <strong>Simulated Canvas summary</strong>
        {current.drawn ? <div className="webcodecs-pipeline-filmstrip">
          {['I0', 'B40', 'P80'].map((label, index) => <div key={label}>
            <svg viewBox="0 0 140 72" aria-hidden="true"><path d="M0 60 L35 18 70 52 100 30 140 60Z" /><circle cx={25 + index * 40} cy="22" r="9" /></svg>
            <span>{label} · closed</span>
          </div>)}
        </div> : <p>No picture drawn yet. Submissions alone do not update Canvas.</p>}
      </div>
      <div className="webcodecs-api-example">
        <h4>Illustrative TypeScript · one bounded inspection function</h4>
        <p>Read these three panels together. Requires Mediabunny in the consuming project, a secure
          context, a same-origin/CORS-enabled complete MP4, a Canvas, and a caller-owned AbortSignal.
          It inspects at most 12 packets and draws output immediately; a player needs bounded queues
          and clock-based presentation. After flush(), further decoding requires a key chunk.</p>
        <p>A standalone CMAF media fragment may lack initialization metadata and reference pictures.
          Provide a valid initialized source; arbitrary segment bytes are not independent codec chunks.</p>
        {videoPipelineExamples.map(example => <details key={example.title} className="webcodecs-api-card">
          <summary>{example.title}</summary>
          <div className="webcodecs-api-detail"><pre tabIndex={0} aria-label={example.title}><code>{example.code}</code></pre></div>
        </details>)}
      </div>
      <p className="webcodecs-sources">Verified references: {' '}
        <a href="https://mediabunny.dev/guide/reading-media-files">Input and byte sources</a> · {' '}
        <a href="https://mediabunny.dev/api/EncodedPacketSink">EncodedPacketSink</a> · {' '}
        <a href="https://mediabunny.dev/api/EncodedPacket">Packet conversion</a> · {' '}
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder">VideoDecoder</a> · {' '}
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage">Canvas drawing</a>
      </p>
    </section>
  )
}
