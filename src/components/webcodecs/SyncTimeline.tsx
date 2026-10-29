import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { syncFrames, syncSpec } from './syncModel'
import type { SyncSettings } from './syncModel'

const colors = { decoding: '#a78bfa', queued: '#38bdf8', 'on time': '#22c55e', late: '#f59e0b', dropped: '#f87171' }
export function SyncTimeline({ position, settings, selected, onSelect }: {
  position: number; settings: SyncSettings; selected: number; onSelect: (id: number) => void
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(800)
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    const w = Math.max(210, width)
    const start = Math.max(0, Math.min(syncSpec.duration - 2, position - 0.8))
    const x = d3.scaleLinear().domain([start, start + 2]).range([14, w - 14]).clamp(true)
    svg.attr('viewBox', `0 0 ${w} 460`)
    const rows = ['PCM processing · 48,000 frames/s', 'Audio at device · audible estimate', 'Video output ready · decode complete', 'Video PTS deadlines · 10 fps']
    rows.forEach((label, i) => {
      svg.append('text').attr('x', 14).attr('y', 22 + i * 100).attr('class', 'sync-row-label').text(label)
      svg.append('line').attr('x1', 14).attr('x2', w - 14).attr('y1', 56 + i * 100).attr('y2', 56 + i * 100).attr('class', 'sync-rail')
    })
    // Each mark aggregates 20 ms = 960 sample frames/channel, not a render quantum.
    for (let i = Math.floor(start * 50); i < (start + 2) * 50; i++) {
      const time = i / 50
      for (const [row, head] of [[0, position + settings.latency], [1, position]]) {
        svg.append('rect').attr('x', x(time)).attr('y', 42 + row * 100).attr('height', 28)
          .attr('width', Math.max(1, x(time + 0.02) - x(time) - 1)).attr('class', time <= head ? `sync-pcm sync-pcm-${row}` : 'sync-empty')
      }
    }
    const frames = syncFrames(position, settings).filter(frame => frame.pts >= start && frame.pts <= start + 2)
    for (const frame of frames) {
      const color = colors[frame.status]
      svg.append('line').attr('x1', x(frame.ready)).attr('x2', x(frame.pts)).attr('y1', 256).attr('y2', 356)
        .attr('stroke', color).attr('stroke-opacity', 0.45).attr('stroke-dasharray', frame.ready > frame.pts ? '3 3' : null)
      svg.append('circle').attr('cx', x(frame.ready)).attr('cy', 256).attr('r', frame.id === selected ? 7 : 4).attr('fill', color)
      svg.append('rect').attr('x', x(frame.pts) - 4).attr('y', 344).attr('width', 8).attr('height', 24)
        .attr('fill', color).attr('stroke', frame.id === selected ? 'var(--text-h)' : 'none').attr('stroke-width', 2)
        .append('title').text(`Frame ${frame.id}: ${frame.status}; PTS ${frame.pts.toFixed(2)} s; ready ${frame.ready.toFixed(2)} s`)
      if (frame.status === 'dropped') svg.append('text').attr('x', x(frame.pts)).attr('y', 391).attr('text-anchor', 'middle').text('×')
    }
    const heads = [{ time: position, label: 'Output clock', y: 405, className: 'sync-output' },
      { time: position + settings.latency, label: 'Processing', y: 91, className: 'sync-processing' }]
    for (const head of heads) {
      for (const [top, bottom] of head.y === 91 ? [[32, 76]] : [[132, 180], [232, 280], [332, 379]]) {
        svg.append('line').attr('x1', x(head.time)).attr('x2', x(head.time)).attr('y1', top)
          .attr('y2', bottom).attr('class', head.className)
      }
      svg.append('text').attr('x', x(head.time)).attr('y', head.y).attr('text-anchor', head.time > start + 1.4 ? 'end' : 'start').text(head.label)
    }
    svg.append('g').attr('transform', 'translate(0,425)').call(d3.axisBottom(x).ticks(w < 480 ? 3 : 8).tickFormat(value => `${Number(value).toFixed(1)}s`))
    svg.append('text').attr('x', 14).attr('y', 458).text(w < 480 ? 'Composition seconds · 2 s window' : 'Shared composition seconds · sliding 2 s window')
    return () => { svg.selectAll('*').interrupt() }
  }, [position, settings, width, selected])
  const start = Math.max(0, Math.min(6, position - 0.8))
  const visible = syncFrames(position, settings).filter(f => f.pts >= start && f.pts <= start + 2)
  return <figure className="webcodecs-sync-timeline">
    <svg ref={ref} role="img" aria-label={`Shared composition timeline at ${position.toFixed(2)} seconds; processing is ${Math.round(settings.latency * 1000)} ms ahead of device output. Purple decoding, blue queued, green on time, amber late, red dropped; crosses mark drops.`} />
    <figcaption>PCM marks aggregate 960 sample frames per channel (20 ms), not processing block sizes.
      Lines connect decode completion circles to PTS deadline bars; endpoints outside the window clamp to its edges.
      Purple: decoding; blue: queued; green: on time; amber: late; red ×: dropped. Select a frame below for exact times.</figcaption>
    <div className="webcodecs-pipeline-controls" role="group" aria-label="Inspect video frame timing">
      {visible.map(f => <button key={f.id} type="button" aria-pressed={selected === f.id} onClick={() => onSelect(f.id)}>F{f.id} · {f.status}</button>)}
    </div>
  </figure>
}
