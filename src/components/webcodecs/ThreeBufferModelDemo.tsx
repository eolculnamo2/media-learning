import { useEffect, useReducer, useRef, useState } from 'react'
import { bufferMetrics, bufferSpec, createBufferState } from './bufferModel'
import type { BufferSettings } from './bufferModel'
import { BufferVisualization } from './BufferVisualization'
import { bufferDemoReducer, bufferScenarios } from './bufferScenarios'
import type { BufferScenarioId } from './bufferScenarios'

const controls: { key: keyof BufferSettings; label: string; min: number; max: number; step: number; scale?: number; unit: string }[] = [
  { key: 'throughputBytesPerSecond', label: 'Network throughput', min: 0, max: 2000, step: 50, scale: 1000, unit: 'kB/s' },
  { key: 'latencySeconds', label: 'Request latency', min: 0, max: 3, step: 0.1, unit: 's' },
  { key: 'prefetchSeconds', label: 'Network prefetch target', min: 2, max: 12, step: 1, unit: 's' },
  { key: 'encodedSeconds', label: 'Encoded queue target', min: 0.1, max: 8, step: 0.1, unit: 's' },
  { key: 'decodedSeconds', label: 'Decoded lookahead target', min: 0.1, max: 3, step: 0.1, unit: 's' },
  { key: 'decoderFps', label: 'Decoder throughput', min: 1, max: 60, step: 1, unit: 'frames/s' },
  { key: 'playbackRate', label: 'Playback rate', min: 0.25, max: 2, step: 0.25, unit: '×' },
]
const seconds = (value: number) => `${value.toFixed(2)} s`
const mb = (value: number) => `${(value / 1000000).toFixed(3)} MB`

export function ThreeBufferModelDemo() {
  const [state, dispatch] = useReducer(bufferDemoReducer, undefined, createBufferState)
  const [seek, setSeek] = useState(3)
  const [running, setRunning] = useState(false)
  const [scenario, setScenario] = useState<BufferScenarioId | null>(null)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const rootRef = useRef<HTMLDivElement>(null)
  const metrics = bufferMetrics(state)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReducedMotion(query.matches); if (query.matches) setRunning(false) }
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    if (!running || reducedMotion || metrics.playbackState === 'ended') return
    const timer = window.setInterval(() => dispatch({ type: 'advance' }), 350)
    const hide = () => { if (document.hidden) setRunning(false) }
    document.addEventListener('visibilitychange', hide)
    const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) setRunning(false) })
    if (rootRef.current) observer.observe(rootRef.current)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', hide)
      observer.disconnect()
    }
  }, [running, reducedMotion, metrics.playbackState])
  const request = state.download
  return (
    <div ref={rootRef} className="webcodecs-buffer-model" aria-labelledby="buffer-model-heading">
      <h3 id="buffer-model-heading" tabIndex={-1}>Demo 3 — Three independent buffers</h3>
      <p>Deterministic simulation: advance the engine clock to download, extract, decode, and consume.
        Pausing playback lets preparation continue; stopping the simulation freezes the engine. All occupancy and memory values are simulated estimates;
        no network requests or media decoding run here.</p>
      <div className="webcodecs-pipeline-controls" role="group" aria-label="Repeatable buffer scenarios">
        {bufferScenarios.map(item => <button key={item.id} type="button" aria-pressed={scenario === item.id}
          onClick={() => { setRunning(false); setScenario(item.id); setSeek(3); dispatch({ type: 'scenario', id: item.id }) }}>{item.label}</button>)}
      </div>
      {scenario && <p className="webcodecs-buffer-insight"><strong>Scenario starting point: </strong>{bufferScenarios.find(item => item.id === scenario)?.explanation}</p>}
      <div className="webcodecs-pipeline-controls" role="group" aria-label="Buffer simulation transport">
        <button type="button" disabled={reducedMotion || metrics.playbackState === 'ended'} aria-pressed={running && metrics.playbackState !== 'ended'}
          onClick={() => setRunning(value => !value)}>{running && metrics.playbackState !== 'ended' ? 'Stop simulation' : 'Run simulation'}</button>
        <button type="button" onClick={() => dispatch({ type: 'advance' })}>Advance 0.1 s</button>
        <button type="button" onClick={() => dispatch({ type: 'advance', ticks: 10 })}>Advance 1 s</button>
        <button type="button" aria-pressed={state.playbackPaused} onClick={() => dispatch({ type: 'pause' })}>
          {state.playbackPaused ? 'Resume playback' : 'Pause playback'}
        </button>
        <button type="button" aria-pressed={state.networkStalled} onClick={() => dispatch({ type: 'stall' })}>
          {state.networkStalled ? 'Restore network' : 'Stall network'}
        </button>
        <button type="button" onClick={() => { setRunning(false); setScenario(null); dispatch({ type: 'reset' }); setSeek(3) }}>Reset model</button>
      </div>
      <p className="codec-viz-note">{reducedMotion ? 'Reduced motion: use manual stepping; automatic running and movement are disabled.' : 'Slow demonstration clock: each 350 ms advances 0.1 simulated second. Moving marks illustrate transfers between stages.'}</p>
      <BufferVisualization state={state} reducedMotion={reducedMotion} />
      <div className="webcodecs-buffer-settings">
        {controls.map(control => (
          <label key={control.key}>
            {control.label}: <output htmlFor={`buffer-${control.key}`}>{Number((state.settings[control.key] / (control.scale ?? 1)).toFixed(2))} {control.unit}</output>
            <input id={`buffer-${control.key}`} type="range" min={control.min} max={control.max} step={control.step}
              value={state.settings[control.key] / (control.scale ?? 1)}
              onChange={event => dispatch({ type: 'setting', key: control.key, value: Number(event.target.value) * (control.scale ?? 1) })} />
          </label>
        ))}
        <div className="webcodecs-buffer-seek">
          <label htmlFor="buffer-seek">Seek destination: <output htmlFor="buffer-seek">{seconds(seek)}</output></label>
          <input id="buffer-seek" type="range" min={0} max={20} step={0.1} value={seek} onChange={event => setSeek(Number(event.target.value))} />
          <div className="webcodecs-pipeline-controls"><button type="button" onClick={() => { setRunning(false); dispatch({ type: 'seek', seconds: seek }) }}>Seek to destination</button></div>
        </div>
      </div>
      <div className="webcodecs-pipeline-event" role="status" aria-live={running ? 'off' : 'polite'}>
        <strong>Engine {seconds(metrics.simulationSeconds)} · Playback {seconds(state.positionSeconds)} · {metrics.playbackState}</strong>
        <p>Container: {metrics.initializationState}. Network: {state.networkStalled ? 'stalled' : 'available'}.
          {' '}{request ? `Request ${request.id === -1 ? 'init' : `segment ${request.id}`} — ${request.latencyLeft.toFixed(2)} s latency left, ${Math.round(request.bytes)} bytes received.` : 'No request in flight.'}</p>
        <p>Next extraction: frame {state.extractCursor}; next submission: frame {state.decodeCursor}.
          {' '}Current GOP starts at {seconds(metrics.dependencyStartSeconds)}.
          {' '}Last seek retained {state.lastSeekReusedSegments} cached segment(s) on its dependency path; generation {state.generation}.</p>
      </div>
      <dl className="webcodecs-pipeline-metrics">
        <div><dt>Completed segment cache + init</dt><dd>{mb(metrics.cachedBytes)}</dd><small>{state.cache.length} segments · {seconds(metrics.downloadedAheadSeconds)} contiguous ahead (may lack init)</small></div>
        <div><dt>Demuxed encoded queue</dt><dd>{state.packets.length} packets</dd><small>{seconds(metrics.encodedSeconds)} total · {mb(metrics.encodedBytes)} payload</small></div>
        <div><dt>Decoded output queue</dt><dd>{state.frames.length} frames</dd><small>{seconds(metrics.decodedAheadSeconds)} contiguous ahead · {mb(metrics.decodedBytes)} RGBA estimate</small></div>
        <div><dt>Pending asynchronous output</dt><dd>{state.pending.length} jobs</dd><small>{mb(metrics.reservedDecodedBytes)} reserved including ready frames</small></div>
        <div><dt>Incomplete response bytes</dt><dd>{Math.round(metrics.partialBytes)} B</dd><small>Unavailable for packet extraction in this model</small></div>
        <div><dt>Lifetime transferred bytes</dt><dd>{mb(state.downloadedBytes)}</dd><small>Includes canceled partial requests and refetches</small></div>
        <div><dt>Presented / released frames</dt><dd>{state.presentedFrames} / {state.releasedFrames}</dd><small>Release includes presentation, preroll, and seek cleanup</small></div>
        <div><dt>Seek-canceled decode jobs</dt><dd>{state.discardedJobs}</dd><small>Old-generation output cannot enter the new queue</small></div>
      </dl>
      <details className="webcodecs-pipeline-inspector">
        <summary>Model assumptions, budgets, and repeatable experiments</summary>
        <p>20 seconds at 10 fps; each two-second segment contains 20 packets. A closed GOP begins every four seconds,
          with sequential dependencies and no B frames. A seek snaps down to a frame boundary and decodes from
          the preceding keyframe; preroll output is released. Completed downloads belong to the same immutable asset.</p>
        <p>One serial request pays latency before throughput in bytes/s. The first media segment precedes the
          separate initialization request, so downloaded data initially cannot be demuxed. Partial segments stay
          unavailable; stalls freeze request progress. Prefetch covers a playback-relative horizon, rounded to whole
          segments; the next required extraction segment is always prioritized, including seek preroll.</p>
        <p>Extraction is capped at five packets per 100 ms tick. Each packet produces one frame after serial
          decoder service plus a fixed 300 ms callback delay. This is an illustrative policy, not a browser timing
          or one-packet/one-frame guarantee. Playback freezes on starvation and resumes from the same position.</p>
        <p>Hard budgets: {mb(bufferSpec.cacheBudgetBytes)} cache including init and reserved download;
          {' '}{bufferSpec.encodedBudgetPackets} encoded packets; {bufferSpec.pendingBudget} pending jobs;
          {' '}{bufferSpec.decodedBudgetFrames} ready + reserved frames ({mb(bufferSpec.decodedBudgetFrames * bufferSpec.frameBytes)}).
          Lower targets drain existing occupancy; they do not discard it. Least recently read segments are evicted
          when necessary. Extracted packet payloads are counted separately from cached container bytes.</p>
        <p>Decoded memory assumes 1280 × 720 × 4 bytes per frame. Actual pixel formats, surfaces, decoder internals,
          and GPU memory vary. Encoded durations sum packet durations; contiguous ahead excludes gaps and preroll.
          Pending jobs reserve future frame memory and are not a measurement of VideoDecoder.decodeQueueSize.</p>
        <ol>
          <li>Reset, pause playback, and advance one second: completed media bytes await initialization. Advance again: pending jobs appear before decoded output. Keep advancing: all three buffers fill to different targets.</li>
          <li>After filling while paused, seek to 3 s and advance: cached segments survive, old frames/jobs vanish, and decoding restarts at the 0 s keyframe without downloading those segments again.</li>
          <li>Reset, advance several seconds, stall the network, and keep advancing: queued data drains before playback starves. Restore the network and advance to recover.</li>
        </ol>
        <p>See <a href="https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/decode" target="_blank" rel="noreferrer">queued decoding</a>,
          {' '}<a href="https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/reset" target="_blank" rel="noreferrer">reset semantics</a>, and
          {' '}<a href="https://mediabunny.dev/guide/packets-and-samples" target="_blank" rel="noreferrer">Mediabunny packets versus samples</a>.</p>
      </details>
    </div>
  )
}
