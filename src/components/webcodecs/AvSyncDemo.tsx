import { useEffect, useRef, useState } from 'react'
import { syncExample } from '../../data/syncExample'
import { SyncTimeline } from './SyncTimeline'
import { compositionAtOutput, performanceDeadline, syncFrames, syncSpec } from './syncModel'

export function AvSyncDemo() {
  const [position, setPosition] = useState(2)
  const [settings, setSettings] = useState({ latency: 0.08, decodeDelay: 0.18 })
  const [running, setRunning] = useState(false)
  const [selected, setSelected] = useState(20)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const root = useRef<HTMLDivElement>(null)
  const ended = position >= syncSpec.duration
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReducedMotion(query.matches); if (query.matches) setRunning(false) }
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (!running || reducedMotion || ended) return
    const timer = window.setInterval(() => setPosition(p => Math.min(syncSpec.duration, Math.round((p + 0.02) * 100) / 100)), 60)
    const hide = () => { if (document.hidden) setRunning(false) }
    document.addEventListener('visibilitychange', hide)
    const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) setRunning(false) })
    if (root.current) observer.observe(root.current)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', hide); observer.disconnect() }
  }, [running, reducedMotion, ended])
  const frames = syncFrames(position, settings)
  const frame = frames[selected]
  const nowMs = syncSpec.performanceAnchorMs + position * 1000
  const timestampContext = syncSpec.contextAnchor + position - 0.02
  const timestampPerformance = nowMs - 20
  const anchor = { contextSeconds: syncSpec.contextAnchor, compositionSeconds: 0, rate: 1 }
  const output = compositionAtOutput(timestampContext, timestampPerformance, nowMs, anchor)
  const deadline = performanceDeadline(frame.pts, timestampContext, timestampPerformance, anchor)
  const presented = frames.filter(f => f.status === 'on time' || f.status === 'late')
  const last = presented.at(-1)
  return <div ref={root} className="webcodecs-sync-demo" aria-labelledby="av-sync-heading">
    <h3 id="av-sync-heading" tabIndex={-1}>Demo 4 — A/V synchronization &amp; output clocks</h3>
    <p>Conceptual simulation, with no sound or real decoding. Video follows the audio device’s estimated output position.
      Audio processing runs ahead; using that head directly would present video early by the simulated latency.</p>
    <div className="webcodecs-pipeline-controls" role="group" aria-label="Synchronization transport">
      <button type="button" disabled={reducedMotion || ended} aria-pressed={running && !ended} onClick={() => setRunning(v => !v)}>{running && !ended ? 'Pause sync' : 'Play sync'}</button>
      <button type="button" disabled={ended} onClick={() => { setRunning(false); setPosition(p => Math.min(8, Math.round((p + 0.02) * 100) / 100)) }}>Step 20 ms</button>
      <button type="button" onClick={() => { setRunning(false); setPosition(2); setSettings({ latency: 0.08, decodeDelay: 0.18 }); setSelected(20) }}>Reset sync</button>
    </div>
    <p className="codec-viz-note">{reducedMotion ? 'Reduced motion: use the slider and manual steps; automatic playback is disabled.' : 'Slow clock: 60 ms advances 20 simulated ms. Pause freezes all clocks.'} Seeking or changing settings recomputes the whole hypothetical scenario; counters are not historical telemetry.</p>
    <div className="webcodecs-buffer-settings">
      <label>Simulated audio latency: <output htmlFor="sync-latency">{Math.round(settings.latency * 1000)} ms</output>
        <input id="sync-latency" type="range" min={0} max={400} step={10} value={Math.round(settings.latency * 1000)} onChange={e => { setRunning(false); setSettings(s => ({ ...s, latency: Number(e.target.value) / 1000 })) }} /></label>
      <label>Video decoding delay: <output htmlFor="sync-delay">{Math.round(settings.decodeDelay * 1000)} ms</output>
        <input id="sync-delay" type="range" min={0} max={600} step={10} value={Math.round(settings.decodeDelay * 1000)} onChange={e => { setRunning(false); setSettings(s => ({ ...s, decodeDelay: Number(e.target.value) / 1000 })) }} /></label>
      <label>Playback position: <output htmlFor="sync-position">{position.toFixed(2)} s</output>
        <input id="sync-position" type="range" min={0} max={8} step={0.02} value={position} onChange={e => { setRunning(false); const p = Number(e.target.value); setPosition(p); setSelected(Math.min(79, Math.floor(p * 10))) }} /></label>
    </div>
    <SyncTimeline position={position} settings={settings} selected={selected} onSelect={setSelected} />
    <div className="webcodecs-pipeline-event" role="status" aria-live={running ? 'off' : 'polite'}>
      <strong>Output clock {output.toFixed(2)} s · Processing head {(position + settings.latency).toFixed(2)} s · {ended ? 'ended' : running ? 'playing' : 'paused'}</strong>
      <p>{presented.length} presented ({frames.filter(f => f.status === 'late').length} late); {frames.filter(f => f.status === 'dropped').length} dropped.
        {' '}Canvas holds {last ? `F${last.id} at ${last.pts.toFixed(2)} s` : 'no frame'} until another frame is presented.</p>
      <p>Selected F{frame.id}: PTS {frame.pts.toFixed(2)} s; submitted at {frame.submitted.toFixed(2)} s; ready at {frame.ready.toFixed(2)} s;
        {' '}{frame.status}. Decision at {frame.decision.toFixed(2)} s: {frame.outcome} ({Math.round(frame.lateness * 1000)} ms late).</p>
    </div>
    <p className="webcodecs-buffer-insight">Try decode delay 280 ms with latency 80 ms: some frames arrive late and others drop.
      Raise latency to 240 ms: processing moves farther ahead of audible output, creating more decode slack with this preparation rule.
      The video PTS deadlines stay anchored to the audio output clock.</p>
    <h4>From an output timestamp to composition time</h4>
    <dl className="webcodecs-pipeline-metrics">
      <div><dt>Simulated output timestamp pair</dt><dd>{timestampContext.toFixed(3)} s ↔ {timestampPerformance.toFixed(0)} ms</dd><small>contextTime ↔ performanceTime, sampled 20 ms ago</small></div>
      <div><dt>Extrapolate to performance.now()</dt><dd>{nowMs.toFixed(0)} ms → {(syncSpec.contextAnchor + output).toFixed(3)} s</dd><small>contextTime + (now − performanceTime) / 1000</small></div>
      <div><dt>Composition anchor (rate 1×)</dt><dd>Context 10 s ↔ composition 0 s</dd><small>Output composition = output context − 10 s</small></div>
      <div><dt>Selected video deadline</dt><dd>{deadline.toFixed(0)} ms</dd><small>F{selected} at composition {frame.pts.toFixed(2)} s, on the performance timeline</small></div>
    </dl>
    <p><code>getOutputTimestamp()</code> pairs an audio-context sample position in seconds with its estimated device-output time
      in performance milliseconds. Extrapolate only from fresh, valid timestamps while running, then map that context position
      to the composition. This is an estimate of device output, not a measurement of when sound reaches a listener.</p>
    <p>The demo’s latency is an idealized total processing-to-device gap, not a measured browser property.
      <code> baseLatency</code> and <code>outputLatency</code> describe different parts of the output path.
      A clock derived from device-output timestamps already accounts for that path: subtracting latency again makes video lag.</p>
    <details className="webcodecs-pipeline-inspector">
      <summary>Scheduling policy and simulation assumptions</summary>
      <p>8 s at 10 fps, continuous primed audio at 48 kHz, rate 1×, no drift or underruns.
        Video is submitted 150 ms ahead of the processing head. Delay adds a repeating 0/40/100 ms variation per frame.
        Preparation before composition zero is preroll. Changing latency moves preparation time, not the audio-output anchor.</p>
      <p>The idealized scheduler presents ready frames at their PTS, presents up to 60 ms late, and drops older frames when ready.
        Canvas holds the previous image through a drop. This is an application choice, not WebCodecs behavior.
        Real requestAnimationFrame callbacks and displays add jitter; the snippet keeps only the newest eligible due frame and may drop more.
        A renderer may instead hold, resynchronize, or use another tolerance.</p>
      <p>Real pause/seek/resume/rate changes require audio scheduling changes, new composition anchors, queue invalidation and frame cleanup.
        A suspended context must not keep extrapolating. Missing/stale timestamp support needs an explicit fallback policy;
        the snippet waits rather than inventing a device clock.</p>
    </details>
    <details className="webcodecs-pipeline-code webcodecs-api-example"><summary>Illustrative TypeScript — audio-derived video scheduling</summary>
      <p>The caller owns decoding, bounded sorted queue insertion, audio scheduling and activation, timestamp remapping, and a positive finite rate.
        Call the returned cleanup before replacing the queue or anchor, pausing, or unmounting. This example is displayed, not executed.</p>
      <pre tabIndex={0} aria-label="Audio-derived video scheduling TypeScript"><code>{syncExample}</code></pre>
    </details>
    <p className="codec-viz-note">Verified API boundaries: <a href="https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp" target="_blank" rel="noreferrer">MDN output timestamps</a>,
      {' '}<a href="https://webaudio.github.io/web-audio-api/#dom-audiocontext-getoutputtimestamp" target="_blank" rel="noreferrer">Web Audio specification</a>,
      {' '}<a href="https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency" target="_blank" rel="noreferrer">output latency</a>.
      Mapping to composition and selecting frames are application responsibilities.</p>
  </div>
}
