import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { clips, clipSnapshot } from './clipModel'
import type { ClipSettings } from './clipModel'

export function ClipTimeline({ position, settings }: { position: number; settings: ClipSettings }) {
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
    const w = Math.max(200, width)
    const x = d3.scaleLinear().domain([0, 8]).range([12, w - 12])
    const state = clipSnapshot(position, settings)
    svg.attr('viewBox', `0 0 ${w} 410`)
    const labels = ['Video presentation', 'Audio presentation · 48 kHz', 'B video preparation', 'B audio preparation']
    labels.forEach((label, i) => {
      svg.append('text').attr('x', 12).attr('y', 20 + i * 85).attr('class', 'clip-row-label').text(label)
      svg.append('line').attr('x1', 12).attr('x2', w - 12).attr('y1', 48 + i * 85).attr('y2', 48 + i * 85).attr('class', 'sync-rail')
    })
    for (const row of [0, 1]) {
      for (const clip of clips) {
        svg.append('rect').attr('x', x(clip.start)).attr('y', 31 + row * 85).attr('width', x(clip.end) - x(clip.start) - 2)
          .attr('height', 34).attr('rx', 4).attr('fill', clip.color).attr('fill-opacity', 0.25)
        svg.append('text').attr('x', x(clip.start) + 6).attr('y', 52 + row * 85)
          .text(w < 460 ? `${clip.id} · ${clip.sourceIn}–${clip.sourceOut}s` : `Clip ${clip.id} · source ${clip.sourceIn}–${clip.sourceOut} s`)
      }
    }
    // A late preparation cost leaves missing composition output after the cut.
    for (const [row, ready] of [[0, state.videoReady], [1, state.audioReady]]) {
      if (ready > 4) svg.append('rect').attr('x', x(4)).attr('y', 31 + row * 85)
        .attr('width', x(Math.min(8, ready)) - x(4)).attr('height', 34)
        .attr('fill', '#f59e0b').attr('fill-opacity', 0.55).attr('stroke', '#f59e0b').attr('stroke-dasharray', '3 3')
        .append('title').text(`Missing output from 4 s to ${ready.toFixed(2)} s`)
    }
    for (const [row, ready, progress, phase] of [[2, state.videoReady, state.videoProgress, state.videoPhase], [3, state.audioReady, state.audioProgress, state.audioPhase]] as const) {
      svg.append('rect').attr('x', x(state.start)).attr('y', 31 + row * 85).attr('width', x(ready) - x(state.start)).attr('height', 34)
        .attr('fill', '#a78bfa').attr('fill-opacity', 0.18).attr('stroke', '#a78bfa').attr('stroke-dasharray', '4 3')
      svg.append('rect').attr('x', x(state.start)).attr('y', 31 + row * 85)
        .attr('width', (x(ready) - x(state.start)) * progress).attr('height', 34).attr('fill', '#a78bfa').attr('fill-opacity', 0.65)
      svg.append('circle').attr('cx', x(ready)).attr('cy', 48 + row * 85).attr('r', 5).attr('fill', ready <= 4 ? '#22c55e' : '#f59e0b')
      svg.append('text').attr('x', 12).attr('y', 83 + row * 85).text(`${phase} · ready ${ready.toFixed(2)}s`)
    }
    svg.append('line').attr('x1', x(4)).attr('x2', x(4)).attr('y1', 25).attr('y2', 326).attr('stroke', 'var(--text-h)').attr('stroke-dasharray', '3 4')
    svg.append('line').attr('x1', x(position)).attr('x2', x(position)).attr('y1', 25).attr('y2', 326).attr('stroke', 'var(--accent)').attr('stroke-width', 3)
    svg.append('g').attr('transform', 'translate(0,365)').call(d3.axisBottom(x).ticks(w < 460 ? 4 : 8).tickFormat(t => `${t}s`))
    svg.append('text').attr('x', 12).attr('y', 405).text('Composition seconds · cut at 4 s')
    return () => { svg.selectAll('*').interrupt() }
  }, [width, position, settings])
  return <figure className="webcodecs-sync-timeline webcodecs-clip-timeline">
    <svg ref={ref} role="img" aria-label={`Two source ranges mapped to composition 0–8 seconds. Cursor ${position.toFixed(2)} seconds. B video and audio preparation progress shown separately.`} />
    <figcaption>Blue A: source [12, 16) s → composition [0, 4) s. Purple B: source [30, 34) s → composition [4, 8) s.
      Solid cursor: inspection/playback time. Dashed line: cut. Preparation bars fill before output is presented;
      ready dots are green when on time and amber when late. Amber presentation spans mark missing output. Full preparation status is below.</figcaption>
  </figure>
}
