import { useState } from 'react'
import * as d3 from 'd3'
import { codecScores } from '../../data/codecs'
import { CodecSvg, VizNote } from './CodecViz'

const axes = [
  ['compressionEfficiency', 'Compression efficiency'],
  ['encodeComplexity', 'Encode complexity'],
  ['decodeComplexity', 'Decode complexity'],
  ['compatibility', 'Device support'],
  ['professionalEditing', 'Editing fit'],
  ['webStreaming', 'Web streaming fit']
] as const

export function CodecTradeoffRadar() {
  const [selected, setSelected] = useState('h264')
  const active = codecScores.find((c) => c.id === selected) ?? codecScores[0]
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    const cx = width / 2
    const cy = height / 2 + 10
    const r = Math.min(width, height) * 0.34
    const angle = (i: number) => -Math.PI / 2 + i * Math.PI * 2 / axes.length
    ;[2, 4, 6, 8, 10].forEach((v) => {
      const pts = axes.map((_, i) => [cx + Math.cos(angle(i)) * r * v / 10, cy + Math.sin(angle(i)) * r * v / 10])
      svg.append('polygon').attr('points', pts.map((p) => p.join(',')).join(' ')).attr('class', 'codec-radar-grid')
    })
    axes.forEach(([, label], i) => {
      const ax = angle(i)
      svg.append('line').attr('x1', cx).attr('y1', cy).attr('x2', cx + Math.cos(ax) * r).attr('y2', cy + Math.sin(ax) * r).attr('class', 'codec-grid-line')
      svg.append('text').attr('x', cx + Math.cos(ax) * (r + 34)).attr('y', cy + Math.sin(ax) * (r + 24)).attr('text-anchor', Math.cos(ax) > 0.2 ? 'start' : Math.cos(ax) < -0.2 ? 'end' : 'middle').attr('class', 'codec-small-label').text(label)
    })
    const pts = axes.map(([key], i) => [cx + Math.cos(angle(i)) * r * active[key] / 10, cy + Math.sin(angle(i)) * r * active[key] / 10])
    svg.append('polygon').attr('points', pts.map((p) => p.join(',')).join(' ')).attr('fill', '#38bdf8').attr('opacity', 0.25).attr('stroke', '#38bdf8').attr('stroke-width', 2)
    pts.forEach((p, i) => svg.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 5).attr('fill', i < 3 ? '#f97316' : '#22c55e'))
  }
  return <div><div className="codec-pill-row">{codecScores.map((c) => <button type="button" key={c.id} className={selected === c.id ? 'is-active' : ''} onClick={() => setSelected(c.id)}>{c.name}</button>)}</div><CodecSvg height={420} label="Conceptual codec tradeoff radar" draw={draw} /><VizNote><strong>{active.name}</strong>: efficiency {active.compressionEfficiency}/10, encode complexity {active.encodeComplexity}/10, decode complexity {active.decodeComplexity}/10, compatibility {active.compatibility}/10. Scores are conceptual teaching data, not benchmark results.</VizNote></div>
}
