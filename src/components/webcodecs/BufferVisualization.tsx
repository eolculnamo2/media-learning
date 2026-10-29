import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { bufferMetrics, bufferSpec, segmentBytes } from './bufferModel'
import type { BufferState } from './bufferModel'

type Layer = 'cache' | 'packets' | 'pending' | 'frames'
interface Token { key: string; layer: Layer; start: number; duration: number; label: string }
const layers: Layer[] = ['cache', 'packets', 'pending', 'frames']
const names = ['1 · Downloaded cache', '2 · Encoded packets', '↳ Pending decode work', '3 · Decoded frames']
const explanations = [
  'Completed container segments survive a seek. Extraction also needs initialization metadata and the dependency path. The outlined response is incomplete and cannot be read yet in this model.',
  'Mediabunny extracts compressed payloads into an application queue. These packets still require decoder service. A filled decoded target stops submissions, allowing encoded packets to accumulate independently.',
  'Submitted work reserves future frame memory. Each job waits for serial decoder service and a separate 300 ms output delay. This teaching queue is not VideoDecoder.decodeQueueSize.',
  'Only contiguous ready frames can advance playback. Presenting or seeking releases frames. The lookahead target counts ready frames plus pending reservations, so ready occupancy may stay below the target.',
]
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(3)} MB`

export function BufferVisualization({ state, reducedMotion }: { state: BufferState; reducedMotion: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const memoryRef = useRef<SVGSVGElement>(null)
  const previous = useRef({ tick: 0, generation: 0 })
  const [width, setWidth] = useState(800)
  const [selected, setSelected] = useState(0)
  const metrics = bufferMetrics(state)

  useEffect(() => {
    if (!svgRef.current) return
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    observer.observe(svgRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || !memoryRef.current) return
    const svg = d3.select(svgRef.current)
    const w = Math.max(210, width), left = 12, right = w - 12
    const x = d3.scaleLinear().domain([0, bufferSpec.durationSeconds]).range([left, right])
    const y = (layer: Layer) => layers.indexOf(layer) * 130 + 60
    const m = bufferMetrics(state)
    const animate = !reducedMotion && state.tick === previous.current.tick + 1 && state.generation === previous.current.generation
    previous.current = { tick: state.tick, generation: state.generation }
    svg.attr('viewBox', `0 0 ${w} 575`)
    const background = svg.selectAll<SVGGElement, number>('g.buffer-background').data([0]).join('g').attr('class', 'buffer-background')
    background.selectAll('*').remove()
    const counts = [
      `${state.cache.length} segments · ${mb(m.cachedBytes)}`,
      `${state.packets.length} packets · ${m.encodedSeconds.toFixed(1)} s total`,
      `${state.pending.length} jobs · output is not ready`,
      `${state.frames.length} frames · ${m.decodedAheadSeconds.toFixed(1)} s ahead`,
    ]
    const fractions = [m.cachedBytes / bufferSpec.cacheBudgetBytes, state.packets.length / bufferSpec.encodedBudgetPackets,
      state.pending.length / bufferSpec.pendingBudget, state.frames.length / bufferSpec.decodedBudgetFrames]
    const capacities = ['1.6 MB cache budget', '80 packet budget', '8 job budget', '30 frame budget']
    layers.forEach((layer, index) => {
      const top = index * 130
      const group = background.append('g').attr('class', `buffer-track buffer-${layer}`)
      group.append('rect').attr('x', 1).attr('y', top + 1).attr('width', w - 2).attr('height', 123).attr('rx', 8)
        .attr('class', index === selected ? 'buffer-track-selected' : 'buffer-track-bg')
      group.append('text').attr('x', left).attr('y', top + 20).attr('class', 'buffer-track-title').text(names[index])
      group.append('text').attr('x', left).attr('y', top + 40).text(counts[index])
      group.append('rect').attr('x', left).attr('y', y(layer)).attr('width', right - left).attr('height', 22).attr('class', 'buffer-rail')
      group.append('rect').attr('x', left).attr('y', top + 94).attr('width', right - left).attr('height', 4).attr('class', 'buffer-rail')
      group.append('rect').attr('x', left).attr('y', top + 94).attr('width', (right - left) * fractions[index]).attr('height', 4).attr('class', 'buffer-fill')
      group.append('text').attr('x', left).attr('y', top + 116).text(`${Math.round(fractions[index] * 100)}% of ${capacities[index]}`)
    })
    // Completed cache segments span 2 s; individual packet/job/frame marks span 0.1 s.
    const tokens: Token[] = state.cache.map(segment => ({ key: `cache-${segment.id}`, layer: 'cache', start: segment.id * 2, duration: 2,
      label: `Cached segment ${segment.id}, ${segment.id * 2}–${segment.id * 2 + 2} s, ${segmentBytes(segment.id)} bytes` }))
    for (const layer of ['packets', 'pending', 'frames'] as const) {
      const ids = layer === 'pending' ? state.pending.map(job => job.frame) : state[layer]
      for (const frame of ids) tokens.push({ key: `${state.generation}-${layer}-${frame}`, layer, start: frame / bufferSpec.fps, duration: 1 / bufferSpec.fps,
        label: `${layer}: frame ${frame} at ${(frame / bufferSpec.fps).toFixed(1)} s${layer === 'pending' ? `, output due in ${Math.max(0, state.pending.find(job => job.frame === frame)!.readyAt - m.simulationSeconds).toFixed(2)} engine seconds` : ''}` })
    }
    const tokenLayer = svg.selectAll<SVGGElement, number>('g.buffer-tokens').data([0]).join('g').attr('class', 'buffer-tokens')
    const marks = tokenLayer.selectAll<SVGRectElement, Token>('rect').data(tokens, token => token.key)
    marks.exit().interrupt().remove()
    const entered = marks.enter().append('rect').attr('rx', 1).attr('x', token => x(token.start))
      .attr('y', token => animate && token.layer !== 'cache' ? y(layers[layers.indexOf(token.layer) - 1]) : y(token.layer))
    entered.append('title')
    const all = entered.merge(marks).attr('class', token => `buffer-token buffer-${token.layer}`)
      .attr('width', token => Math.max(1, x(token.start + token.duration) - x(token.start) - 1)).attr('height', 22)
    all.select('title').text(token => token.label)
    all.interrupt()
    if (animate) all.transition().duration(230).ease(d3.easeCubicOut).attr('x', token => x(token.start)).attr('y', token => y(token.layer))
    else all.attr('x', token => x(token.start)).attr('y', token => y(token.layer))

    const overlay = svg.selectAll<SVGGElement, number>('g.buffer-overlay').data([0]).join('g').attr('class', 'buffer-overlay')
    overlay.selectAll('*').remove()
    if (state.download && state.download.id >= 0) {
      const request = state.download
      overlay.append('rect').attr('x', x(request.id * 2)).attr('y', y('cache')).attr('width', x(2) - x(0) - 1).attr('height', 22).attr('class', 'buffer-request')
      overlay.append('rect').attr('x', x(request.id * 2)).attr('y', y('cache') + 15)
        .attr('width', (x(2) - x(0) - 1) * request.bytes / segmentBytes(request.id)).attr('height', 7).attr('class', 'buffer-partial')
    }
    // Target horizons are guides, not claims that occupied data is contiguous or usable.
    const horizons = [state.settings.prefetchSeconds, state.settings.encodedSeconds, state.settings.decodedSeconds, state.settings.decodedSeconds]
    layers.forEach((layer, index) => {
      const targetX = x(Math.min(20, state.positionSeconds + horizons[index]))
      overlay.append('line').attr('x1', x(state.positionSeconds)).attr('x2', x(state.positionSeconds)).attr('y1', y(layer) - 4).attr('y2', y(layer) + 26).attr('class', 'buffer-playhead')
      overlay.append('line').attr('x1', targetX).attr('x2', targetX).attr('y1', y(layer) - 4).attr('y2', y(layer) + 26).attr('class', 'buffer-target')
    })
    overlay.append('g').attr('transform', 'translate(0,530)').call(d3.axisBottom(x).tickValues(w < 480 ? [0, 5, 10, 15, 20] : d3.range(0, 21, 2)).tickFormat(value => `${value}s`))
    overlay.append('text').attr('x', left).attr('y', 570).text('Source media time · 20 s asset')

    const memory = d3.select(memoryRef.current).attr('viewBox', `0 0 ${w} 195`)
    memory.selectAll('*').remove()
    const memoryScale = d3.scaleLinear().domain([0, bufferSpec.decodedBudgetFrames * bufferSpec.frameBytes]).range([0, right - left])
    const memoryRows = [
      { name: 'Cached container bytes', bytes: m.cachedBytes, className: 'cache' },
      { name: 'Encoded payload copies', bytes: m.encodedBytes, className: 'packets' },
      { name: 'Ready + reserved frames', bytes: m.reservedDecodedBytes, className: 'frames' },
    ]
    memoryRows.forEach((row, index) => {
      const top = index * 60
      memory.append('text').attr('x', left).attr('y', top + 17).text(row.name)
      memory.append('rect').attr('x', left).attr('y', top + 25).attr('width', right - left).attr('height', 10).attr('class', 'buffer-rail')
      memory.append('rect').attr('x', left).attr('y', top + 25).attr('width', memoryScale(row.bytes)).attr('height', 10).attr('class', `buffer-token buffer-${row.className}`)
      memory.append('text').attr('x', left).attr('y', top + 51).text(mb(row.bytes))
    })
    return () => { svg.selectAll('*').interrupt() }
  }, [state, reducedMotion, width, selected])

  return (
    <div className="webcodecs-buffer-visualization">
      <div className="webcodecs-pipeline-controls" role="group" aria-label="Inspect buffer responsibilities">
        {names.map((name, index) => <button key={name} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{name}</button>)}
      </div>
      <p className="webcodecs-buffer-insight">{explanations[selected]}</p>
      <p className="codec-viz-note">Engine {metrics.simulationSeconds.toFixed(2)} s · playback {state.positionSeconds.toFixed(2)} s ({metrics.playbackState}).
        {' '}Init: {state.initialized ? 'ready' : 'missing'} · network {state.networkStalled ? 'stalled' : 'available'}.
        {' '}{state.download ? `Request ${state.download.id === -1 ? 'init' : `segment ${state.download.id}`}: ${state.download.latencyLeft.toFixed(2)} s latency left, ${Math.round(state.download.bytes)} B received.` : 'No request in flight.'}
        {' '}{state.pending.length > 0 ? `Next output in ${Math.max(0, state.pending[0].readyAt - metrics.simulationSeconds).toFixed(2)} engine seconds.` : 'No pending output.'}
      </p>
      <figure>
        <svg ref={svgRef} role="img" aria-label={`Buffer timeline. ${state.cache.length} cached segments, ${state.packets.length} packets, ${state.pending.length} pending jobs, ${state.frames.length} ready frames. Playback at ${state.positionSeconds.toFixed(2)} seconds.`} />
        <figcaption>Each row shares source media time. Solid blocks are resident data; the outlined segment is an incomplete response.
          The solid vertical line is playback; dashed ticks mark playback + target horizons.
          Thin bars show occupancy against hard budgets, not seconds. Init metadata is counted in cache bytes, outside the media timeline.</figcaption>
      </figure>
      <h4>Compressed versus decoded memory</h4>
      <svg ref={memoryRef} role="img" aria-label={`Shared memory scale: cached bytes ${mb(metrics.cachedBytes)}, encoded payload ${mb(metrics.encodedBytes)}, ready and reserved frames ${mb(metrics.reservedDecodedBytes)}.`} />
      <p className="codec-viz-note">All bars share a linear 0–110.592 MB scale. One illustrative 1280 × 720 RGBA frame costs 3.686 MB;
        one two-second compressed segment costs 0.160–0.200 MB. Ready frame memory: {mb(metrics.decodedBytes)};
        pending reservations: {mb(metrics.reservedDecodedBytes - metrics.decodedBytes)}. These estimates exclude decoder/GPU overhead;
        real pixel formats and allocations vary.</p>
    </div>
  )
}
