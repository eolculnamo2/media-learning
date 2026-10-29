import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { audioEventStages, audioEventText, audioLastStep, audioPipelineStages as stages, audioSnapshot } from '../../data/audioPipeline'
import type { AudioStrategy } from '../../data/audioPipeline'
import { audioPipelineExamples } from '../../data/audioPipelineExamples'

export function AudioPipelineDemo() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [strategy, setStrategy] = useState<AudioStrategy>('scheduled')
  const [rate, setRate] = useState(48000)
  const [channels, setChannels] = useState(2)
  const [block, setBlock] = useState(128)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [width, setWidth] = useState(900)
  const svgRef = useRef<SVGSVGElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  const pcmRef = useRef<SVGSVGElement>(null)
  const currentStage = audioEventStages[step]
  const snapshot = audioSnapshot(step, block)
  const stage = stages[selected]
  const ms = (frames: number) => (frames / rate * 1000).toFixed(2)
  const move = (delta: number) => {
    setPlaying(false)
    const next = Math.max(0, Math.min(audioLastStep, step + delta))
    setStep(next)
    setSelected(audioEventStages[next])
  }
  const reset = () => { setPlaying(false); setStep(0); setSelected(0) }

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => { setReducedMotion(query.matches); if (query.matches) setPlaying(false) }
    query.addEventListener('change', changed)
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    if (svgRef.current) observer.observe(svgRef.current)
    return () => { query.removeEventListener('change', changed); observer.disconnect() }
  }, [])

  useEffect(() => {
    if (!playing || reducedMotion || step >= audioLastStep) return
    const timer = window.setTimeout(() => {
      setStep(step + 1)
      setSelected(audioEventStages[step + 1])
      if (step + 1 === audioLastStep) setPlaying(false)
    }, 1300)
    const hide = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', hide)
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) setPlaying(false)
    })
    if (rootRef.current) observer.observe(rootRef.current)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', hide)
      observer.disconnect()
    }
  }, [playing, reducedMotion, step])

  useEffect(() => {
    const element = svgRef.current
    if (!element) return
    const svg = d3.select(element)
    const focus = element.contains(document.activeElement) ? document.activeElement?.getAttribute('data-stage') : null
    svg.selectAll('*').interrupt().remove()
    const columns = width >= 760 ? 3 : width >= 480 ? 2 : 1
    const w = Math.max(210, width), cell = w / columns
    const point = (index: number) => {
      const row = Math.floor(index / columns)
      return [cell * ((row % 2 ? columns - 1 - index % columns : index % columns) + 0.5), row * 100 + 50]
    }
    svg.attr('viewBox', `0 0 ${w} ${Math.ceil(stages.length / columns) * 100}`)
    const lines = svg.append('g').attr('class', 'webcodecs-pipeline-lines')
    stages.slice(1).forEach((_, index) => {
      const a = point(index), b = point(index + 1)
      lines.append('path').attr('d', `M${a.join(',')}L${b.join(',')}`)
      lines.append('path').attr('class', 'webcodecs-pipeline-arrow')
        .attr('d', d3.symbol(d3.symbolTriangle).size(28)())
        .attr('transform', `translate(${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2}) rotate(${Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + 90})`)
    })
    const nodes = svg.append('g').selectAll('g').data(stages).join('g')
      .attr('transform', (_, index) => `translate(${point(index).join(',')})`)
      .attr('role', 'button').attr('tabindex', 0).attr('data-stage', (_, index) => index)
      .attr('aria-label', item => `Inspect audio stage: ${item.name}`)
      .attr('aria-pressed', (_, index) => String(index === selected))
      .attr('class', (_, index) => `webcodecs-pipeline-node${index === selected ? ' is-selected' : ''}${index === currentStage ? ' is-current' : ''}`)
      .on('click', (_, item) => { setSelected(stages.indexOf(item)); setPlaying(false) })
      .on('keydown', (event: KeyboardEvent, item) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); setSelected(stages.indexOf(item)); setPlaying(false)
        }
      })
    nodes.append('rect').attr('x', -cell / 2 + 9).attr('y', -34).attr('width', cell - 18).attr('height', 68).attr('rx', 12)
    nodes.append('text').attr('class', 'webcodecs-pipeline-number').attr('y', -10)
      .text((_, index) => `${index + 1}${index === currentStage ? ' · current' : ''}`)
    nodes.append('text').attr('y', 13).text((item, index) => index === 7 ? strategy === 'scheduled' ? 'Scheduled sources' : 'Worklet + PCM queue' : item.name)
    const a = point(Math.max(0, currentStage - 1)), b = point(currentStage)
    const token = svg.append('circle').attr('class', 'webcodecs-pipeline-token').attr('r', 6)
      .attr('cx', playing && !reducedMotion ? a[0] : b[0]).attr('cy', (playing && !reducedMotion ? a[1] : b[1]) + 41).attr('aria-hidden', 'true')
    if (playing && !reducedMotion) token.transition().duration(600).attr('cx', b[0]).attr('cy', b[1] + 41)
    if (focus !== null) (nodes.filter((_, index) => String(index) === focus).node() as SVGGElement | null)?.focus({ preventScroll: true })
    return () => { svg.selectAll('*').interrupt().on('click', null).on('keydown', null) }
  }, [width, currentStage, selected, strategy, playing, reducedMotion])

  useEffect(() => {
    const svg = d3.select(pcmRef.current)
    svg.selectAll('*').interrupt().remove()
    const w = Math.max(210, width), lane = (w - 70) * 0.65, cells = 12
    svg.attr('viewBox', `0 0 ${w} ${channels * 48 + 92}`)
    svg.append('text').attr('x', 4).attr('y', 18).text('PCM reserve → last block')
    const queuedCells = snapshot.queued / block * 4
    for (let channel = 0; channel < channels; channel++) {
      const y = channel * 48 + 34
      svg.append('text').attr('x', 4).attr('y', y + 20).text(`Ch ${channel + 1}`)
      svg.append('g').selectAll('rect').data(d3.range(cells)).join('rect')
        .attr('x', i => 64 + i * lane / cells).attr('y', y).attr('width', lane / cells - 3).attr('height', 28).attr('rx', 3)
        .attr('class', i => i < queuedCells ? 'pcm-filled' : 'pcm-empty')
      if (snapshot.processing) {
        const rect = svg.append('rect').attr('class', step === 11 ? 'pcm-silence' : 'pcm-rendered')
          .attr('x', 64).attr('y', y).attr('width', (w - 70) * 0.25).attr('height', 28).attr('rx', 3)
        if (playing && !reducedMotion) rect.transition().duration(850).attr('x', 64 + lane + 10).attr('opacity', 0)
        else rect.attr('x', 64 + lane + 10).attr('opacity', 0.6)
      }
    }
    svg.append('text').attr('x', 4).attr('y', channels * 48 + 58)
      .text(`Cell: ${block / 4} frames/channel`)
    svg.append('text').attr('x', 4).attr('y', channels * 48 + 78)
      .text(`Last block: ${snapshot.processing ? block : 0} frames/channel`)
    return () => { svg.selectAll('*').interrupt() }
  }, [width, channels, block, snapshot.queued, snapshot.processing, step, playing, reducedMotion])

  return <section ref={rootRef} className="webcodecs-audio-demo" aria-labelledby="audio-pipeline-heading">
    <h3 id="audio-pipeline-heading" tabIndex={-1}>Demo 2 — Network bytes to audible audio</h3>
    <p>AudioDecoder produces PCM; your output strategy turns it into a continuous stream.
      Compare scheduling one-shot sources with feeding a worklet queue.</p>
    <p className="codec-viz-note">Silent conceptual simulation: no download, decoding, or real audio.
      Each event is slowed down for inspection. Backward stepping restores snapshots;
      block sizes, output batches, and refill timing are illustrative.</p>
    <fieldset className="webcodecs-audio-settings">
      <legend>Simulated output format</legend>
      <label>Output strategy<select value={strategy} onChange={event => { setStrategy(event.target.value as AudioStrategy); reset() }}>
        <option value="scheduled">AudioBufferSourceNode</option><option value="worklet">AudioWorklet + PCM queue</option>
      </select></label>
      <label>Sample rate<select value={rate} onChange={event => { setRate(Number(event.target.value)); reset() }}>
        <option value={48000}>48000 Hz</option><option value={44100}>44100 Hz</option>
      </select></label>
      <label>Channels<select value={channels} onChange={event => { setChannels(Number(event.target.value)); reset() }}>
        <option value={1}>1 · mono</option><option value={2}>2 · stereo</option>
      </select></label>
      <label>Illustrative block<select value={block} onChange={event => { setBlock(Number(event.target.value)); reset() }}>
        {[64, 128, 256].map(value => <option key={value} value={value}>{value} sample frames</option>)}
      </select></label>
    </fieldset>
    <div className="webcodecs-pipeline-controls" role="group" aria-label="Audio pipeline playback">
      <button type="button" disabled={step === 0} onClick={() => move(-1)}>Previous</button>
      <button type="button" disabled={reducedMotion} onClick={() => {
        if (step === audioLastStep) { setStep(0); setSelected(0) }
        setPlaying(!playing || step === audioLastStep)
      }}>{playing && step < audioLastStep ? 'Pause' : step === audioLastStep ? 'Replay' : 'Play'}</button>
      <button type="button" disabled={step === audioLastStep} onClick={() => move(1)}>Next</button>
      <button type="button" onClick={reset}>Reset</button>
    </div>
    {reducedMotion && <p className="codec-viz-note">Reduced motion: use Previous and Next; automatic playback is disabled.</p>}
    <svg ref={svgRef} className="webcodecs-pipeline-svg" role="group" aria-label="Audio pipeline: nine selectable stages" />
    <div className="webcodecs-pipeline-event" role="status" aria-live="polite" aria-atomic="true">
      <strong>Event {step + 1} / {audioLastStep + 1} · {stages[currentStage].name}</strong>
      <p>{audioEventText(step, strategy, block)}</p>
    </div>
    <div className="webcodecs-pipeline-inspector">
      <label htmlFor="audio-pipeline-stage">Inspect audio stage</label>{' '}
      <select id="audio-pipeline-stage" value={selected} onChange={event => { setSelected(Number(event.target.value)); setPlaying(false) }}>
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
    <div className="webcodecs-pipeline-preview">
      <h4>{strategy === 'scheduled' ? 'PCM in scheduled AudioBuffer regions' : 'PCM waiting in the worklet ring'}</h4>
      <svg ref={pcmRef} className="webcodecs-audio-pcm" role="img" aria-label={`${channels} channels; ${snapshot.queued} sample frames queued per channel; ${snapshot.rendered} media frames rendered; ${snapshot.silence} silence frames rendered`} />
      <p className="codec-viz-note">Green: queued PCM · Blue: most recent rendered media block · Amber: silence on underrun.
        Each row is a channel, aligned at the same sample-frame positions. Capacity: {3 * block} sample frames.</p>
      <dl className="webcodecs-pipeline-metrics">
        <div><dt>Decoded frames / channel</dt><dd>{snapshot.decoded}</dd></div>
        <div><dt>Copied, awaiting scheduling / channel</dt><dd>{step === 6 ? snapshot.decoded : 0}</dd></div>
        <div><dt>PCM reserve / channel</dt><dd>{snapshot.queued}</dd></div>
        <div><dt>Reserve duration</dt><dd>{ms(snapshot.queued)} ms</dd></div>
        <div><dt>Rendered media / channel</dt><dd>{snapshot.rendered}</dd></div>
        <div><dt>Rendered silence / channel</dt><dd>{snapshot.silence}</dd></div>
        <div><dt>Render clock elapsed</dt><dd>{ms(snapshot.rendered + snapshot.silence)} ms</dd></div>
        <div><dt>Queued scalar samples</dt><dd>{snapshot.queued * channels}</dd></div>
        <div><dt>Queued float32 PCM bytes</dt><dd>{snapshot.queued * channels * 4}</dd></div>
      </dl>
      <p>{block} frames ÷ {rate} frames/second = {ms(block)} ms per block.
        Stereo has twice the samples and memory of mono at the same duration.
        The simulation assumes PCM already matches the output sample rate.</p>
      <p>128 frames is a common current rendering quantum, not an unconditional API guarantee.
        A worklet reads the actual output array length on every process() call.
        A decoded AudioData batch need not match a rendering block.</p>
    </div>
    <div className="webcodecs-pipeline-event">
      <h4>{strategy === 'scheduled' ? 'Schedule ahead on the AudioContext clock' : 'Keep the render thread supplied'}</h4>
      {strategy === 'scheduled' ? <p>Copy PCM to AudioBuffers and start a new AudioBufferSourceNode for each region.
        Map media PTS in microseconds to context seconds, anchoring the first PTS to a future start time.
        Adjacent regions must meet at exact sample boundaries; late scheduling leaves a gap.
        Reusing a started source is invalid. Retain live nodes so seek/stop can cancel them.</p>
        : <p>The main thread copies/transfers PCM; process() pulls from a bounded queue on the audio rendering thread.
          Keep process() synchronous and bounded, with no blocking, fetch, or allocations.
          This example emits silence on underrun and rejects excess blocks on overflow.
          A real producer needs bounded messaging/backpressure and resampling when rates differ.</p>}
      <p>A Canvas can keep showing its last picture. Audio must keep feeding new samples as time advances;
        holding one sample does not preserve a sound. Decoder output is neither rendered audio nor audible output.
        The destination/device adds latency after rendering. Recovering from an underrun requires a timeline policy;
        simply resuming a FIFO can put audio behind video.</p>
    </div>
    <div className="webcodecs-api-example">
      <h4>Illustrative TypeScript · separate modules, no code runs here</h4>
      <p>Real audio requires an explicit user action to create/resume AudioContext. Stop scheduling,
        close owned AudioData, dispose inputs/decoders, stop/disconnect sources or the worklet,
        and close a context you own when leaving. These bounded examples omit a full player’s
        seek, resampling, prefetch, timeline, and synchronization logic.</p>
      {audioPipelineExamples.map(example => <details className="webcodecs-api-card" key={example.title}>
        <summary>{example.title}</summary>
        <div className="webcodecs-api-detail"><p>{example.note}</p>
          <pre tabIndex={0} aria-label={example.title}><code>{example.code}</code></pre>
        </div>
      </details>)}
    </div>
    <p className="webcodecs-sources">Verified references: {' '}
      <a href="https://mediabunny.dev/api/InputAudioTrack">Audio track/config</a> · {' '}
      <a href="https://mediabunny.dev/api/EncodedPacket">Packet conversion</a> · {' '}
      <a href="https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder">AudioDecoder</a> · {' '}
      <a href="https://developer.mozilla.org/en-US/docs/Web/API/AudioData/copyTo">PCM copy</a> · {' '}
      <a href="https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start">Source scheduling</a> · {' '}
      <a href="https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process">Worklet rendering</a>
    </p>
  </section>
}
