import { useEffect, useRef, useState } from 'react'
import { ClipTimeline } from './ClipTimeline'
import { clipSnapshot, initialClipSettings, nextClipPackets, sourceToComposition, clips } from './clipModel'
import { goToSection } from './sectionNavigation'

export function ClipTransitionDemo() {
  const [position, setPosition] = useState(2)
  const [settings, setSettings] = useState(initialClipSettings)
  const [running, setRunning] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const root = useRef<HTMLDivElement>(null)
  const state = clipSnapshot(position, settings)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReducedMotion(query.matches); if (query.matches) setRunning(false) }
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (!running || reducedMotion || state.ended) return
    const timer = window.setInterval(() => setPosition(p => Math.min(8, Math.round((p + 0.05) * 100) / 100)), 100)
    const hide = () => { if (document.hidden) setRunning(false) }
    document.addEventListener('visibilitychange', hide)
    const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) setRunning(false) })
    if (root.current) observer.observe(root.current)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', hide); observer.disconnect() }
  }, [running, reducedMotion, state.ended])
  const scrub = (p: number) => { setRunning(false); setPosition(p) }
  return <div ref={root} className="webcodecs-sync-demo webcodecs-clip-demo" aria-labelledby="clip-transition-heading">
    <h3 id="clip-transition-heading" tabIndex={-1}>Demo 5 — Seamless clip transitions</h3>
    <p>Conceptual simulation: two trimmed sources, one continuous composition at 1×. Prepare B’s video and audio independently while A plays.
      No media is decoded or played. Scrubbing recomputes a hypothetical preparation history.</p>
    <div className="webcodecs-pipeline-controls" role="group" aria-label="Clip transition transport">
      <button type="button" disabled={reducedMotion || state.ended} aria-pressed={running && !state.ended} onClick={() => setRunning(r => !r)}>{running && !state.ended ? 'Pause clips' : 'Play clips'}</button>
      <button type="button" disabled={state.ended} onClick={() => scrub(Math.min(8, Math.round((position + 0.05) * 100) / 100))}>Step 50 ms</button>
      <button type="button" onClick={() => scrub(3.95)}>Before cut</button>
      <button type="button" onClick={() => scrub(4)}>At cut</button>
      <button type="button" onClick={() => scrub(4.05)}>After cut</button>
      <button type="button" onClick={() => { scrub(2); setSettings(initialClipSettings) }}>Reset clips</button>
    </div>
    <p className="codec-viz-note">{reducedMotion ? 'Reduced motion: use manual steps and scrubbing.' : 'Slow clock: 100 ms advances 50 simulated ms. Pause freezes preparation and presentation.'}</p>
    <div className="webcodecs-buffer-settings">
      <label>Composition position: <output htmlFor="clip-position">{position.toFixed(2)} s</output>
        <input id="clip-position" type="range" min={0} max={8} step={0.05} value={position} onChange={e => scrub(Number(e.target.value))} /></label>
      {([
        ['lead', 'Preparation lead', 0.25, 2], ['videoDelay', 'B video preparation cost', 0.2, 2], ['audioDelay', 'B audio preparation cost', 0.1, 2],
      ] as const).map(([key, label, min, max]) => <label key={key}>{label}: <output htmlFor={`clip-${key}`}>{settings[key].toFixed(2)} s</output>
        <input id={`clip-${key}`} type="range" min={min} max={max} step={0.05} value={settings[key]} onChange={e => { setRunning(false); setSettings(s => ({ ...s, [key]: Number(e.target.value) })) }} /></label>)}
    </div>
    <ClipTimeline position={position} settings={settings} />
    <div className="webcodecs-pipeline-event" role="status" aria-live={running ? 'off' : 'polite'}>
      <strong>Composition {position.toFixed(2)} s → {state.ended ? 'end of composition' : `Clip ${state.clip.id} · source ${state.source.toFixed(2)} s`}</strong>
      <p>{state.ended ? 'End boundary: B source 34.00 s is exclusive; no new sample is presented.' : `Video ${state.videoAvailable ? 'available' : 'not ready: hold previous image'}; audio ${state.audioAvailable ? 'available' : 'not ready: silence in this illustration'}.`}</p>
      <p>B preparation starts at {state.start.toFixed(2)} s: video {state.videoPhase} (ready {state.videoReady.toFixed(2)} s), audio {state.audioPhase} (ready {state.audioReady.toFixed(2)} s).</p>
      <p>{state.seamless ? 'Both streams meet the 4.00 s cut under these assumptions.' : 'Cut misses readiness: independent preparation alone cannot guarantee seamless output.'}</p>
    </div>
    <p className="webcodecs-buffer-insight">Try a 0.25 s lead and a 2 s video cost, then inspect the cut: audio and video can miss independently.
      Raising the lead to 2 s prepares both by the boundary. A real engine may stall both streams and re-anchor its clock;
      this inspection model keeps the composition clock moving to expose missing output.</p>
    <h4>Source time → composition time → presentation</h4>
    <p><code>composition = clipStart + (sourcePTS − sourceIn)</code> at 1×.
      B source 30.25 s maps to 4 + (30.25 − 30) = <strong>4.25 s</strong>.
      Source 30 s becomes composition 4 s, or 4,000,000 µs if retimestamping WebCodecs chunks/frames.
      Mediabunny packet timestamps use seconds. Keep a stable mapping for each clip’s audio and video.</p>
    <p>Presentation is due when the audio-derived output clock reaches the mapped composition PTS.
      Preparation and decode submission happen earlier on an execution clock. A packet’s DTS describes source decode order;
      it is neither its presentation deadline nor the wall-clock instant at which the app calls decode.</p>
    <div className="webcodecs-table-scroll" tabIndex={0} role="region" aria-label="B packet decode order and presentation mapping">
      <table className="webcodecs-clip-table"><caption>Illustrative B dependency group · submit in row order</caption>
        <thead><tr><th>Packet / order</th><th>Source DTS (s)</th><th>Source PTS (s)</th><th>Mapped PTS (s)</th><th>Output policy</th></tr></thead>
        <tbody>{nextClipPackets.map(packet => <tr key={packet.order}><td>{packet.label} / {packet.order}</td><td>{packet.dts.toFixed(2)}</td><td>{packet.pts.toFixed(2)}</td><td>{sourceToComposition(clips[1], packet.pts).toFixed(2)}</td><td>{packet.pts < 30 ? 'Preroll: release' : 'Queue by PTS'}</td></tr>)}</tbody>
      </table>
    </div>
    <details className="webcodecs-pipeline-inspector"><summary>Conditions for a seamless cut &amp; transition cleanup</summary>
      <p><strong>Decoder preparation.</strong> A is {clips[0].config}; B is {clips[1].config}. Compare each track’s actual codec string, description bytes and dimensions;
        the same codec family can still require a different configuration. Check support. This example assumes separate prepared decoder instances;
        reusing one requires a safe drain/reconfiguration boundary and enough time. A reset discards queued work and requires configuration again.</p>
      <p><strong>Dependencies.</strong> Locate a suitable random-access point at or before B’s source in-point (29.50 s here).
        Submit its dependency path in decode order, including packets whose PTS lies beyond the first desired B-frame.
        Drop preroll output before source 30 s, and reorder eligible output by mapped PTS. Submission does not mean output is ready.</p>
      <p><strong>Audio sample boundaries.</strong> With zero-origin 48 kHz PCM in both clips, A’s source sample frames [576000, 768000) and B’s [1440000, 1632000)
        map to adjacent composition ranges [0, 192000) and [192000, 384000). Trim decoded blocks crossing in/out points by sample frame, not whole encoded packet.
        Real sample rates, timestamp origins, codec delay/padding, resampling and channel layout need explicit handling.
        Adjacent samples avoid a scheduling gap; a waveform discontinuity may still click, so an editor may add a short crossfade.</p>
      <p><strong>Ownership.</strong> Keep A’s outstanding audio/device work alive until consumed; switching the visual cursor does not cancel scheduled audio.
        After the last use, close owned VideoFrames/AudioData, release PCM, stop/disconnect obsolete audio sources, cancel old reads and reject stale generation callbacks.
        Close obsolete decoders and dispose inputs only when no remaining clip uses them. Preserve reusable cached bytes within the app’s budget.</p>
      <p><strong>Simulation scope.</strong> A is already primed; B’s entire four-second range becomes available after each configurable preparation cost.
        The table is one synthetic dependency group, not the cost model or a real encoded stream. Network, decoder capacity, audio priming and output-clock stability are assumed.
        Costs are illustrative, scrubbing is inspection rather than a real seek, and all ranges are half-open.</p>
    </details>
    <div className="webcodecs-pipeline-controls"><button type="button" onClick={() => goToSection('av-sync')}>Review output clocks</button><button type="button" onClick={() => goToSection('mediabunny-guide')}>Review packets &amp; sources</button></div>
    <p className="codec-viz-note">Documentation: <a href="https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/configure">decoder configuration</a>,
      {' '}<a href="https://mediabunny.dev/guide/packets-and-samples">Mediabunny packets and dependencies</a>,
      {' '}<a href="https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start">audio scheduling and offsets</a>.</p>
  </div>
}
