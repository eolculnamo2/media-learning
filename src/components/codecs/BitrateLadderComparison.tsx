import { useMemo, useState } from 'react'
import * as d3 from 'd3'
import { ladderBase } from '../../data/codecs'
import { CodecButton, CodecSvg, VizNote } from './CodecViz'

type CodecName = 'H264' | 'HEVC' | 'VP9' | 'AV1'
const colors: Record<CodecName, string> = { H264: '#38bdf8', HEVC: '#22c55e', VP9: '#a78bfa', AV1: '#f97316' }
const labels = ['Low complexity: talking head / slides', 'Medium complexity: typical camera footage', 'High complexity: sports / water / foliage / noise / concert lighting']
const scaleByComplexity = [0.72, 1, 1.55]

export function BitrateLadderComparison() {
  const [enabled, setEnabled] = useState<Record<CodecName, boolean>>({ H264: true, HEVC: true, VP9: true, AV1: true })
  const [complexity, setComplexity] = useState(1)
  const [hover, setHover] = useState<string>('')
  const data = useMemo(() => ladderBase.map((d) => ({ ...d, bitrateKbps: Math.round(d.bitrateKbps * scaleByComplexity[complexity]) })), [complexity])
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    const active = data.filter((d) => enabled[d.codec as CodecName])
    const resolutions = [...new Set(data.map((d) => d.resolution))]
    const x = d3.scalePoint<string>().domain(resolutions).range([62, width - 32]).padding(0.35)
    const y = d3.scaleLinear().domain([0, d3.max(active, (d) => d.bitrateKbps) ?? 22000]).nice().range([height - 48, 24])
    ;[0, 5000, 10000, 15000, 20000, 30000].filter((v) => v <= y.domain()[1]).forEach((v) => { svg.append('line').attr('x1', 54).attr('x2', width - 28).attr('y1', y(v)).attr('y2', y(v)).attr('class', 'codec-grid-line'); svg.append('text').attr('x', 8).attr('y', y(v) + 4).attr('class', 'codec-small-label').text(`${v / 1000}M`) })
    Object.keys(colors).forEach((codec) => {
      if (!enabled[codec as CodecName]) return
      const series = data.filter((d) => d.codec === codec)
      svg.append('path').datum(series).attr('d', d3.line<typeof series[number]>().x((d) => x(d.resolution) ?? 0).y((d) => y(d.bitrateKbps))).attr('fill', 'none').attr('stroke', colors[codec as CodecName]).attr('stroke-width', 3)
      svg.selectAll(`circle.${codec}`).data(series).join('circle').attr('cx', (d) => x(d.resolution) ?? 0).attr('cy', (d) => y(d.bitrateKbps)).attr('r', 6).attr('fill', colors[codec as CodecName]).style('cursor', 'pointer').on('mouseenter click', (_, d) => setHover(`${d.resolution} ${d.codec}: ${d.bitrateKbps.toLocaleString()} kbps`))
    })
    resolutions.forEach((r) => svg.append('text').attr('x', x(r) ?? 0).attr('y', height - 16).attr('text-anchor', 'middle').attr('class', 'codec-small-label').text(r.replace('x', '×')))
  }
  return <div><div className="codec-controls"><label className="wide-control">content complexity: {labels[complexity]}<input type="range" min="0" max="2" step="1" value={complexity} onChange={(e) => setComplexity(Number(e.target.value))} /></label>{(Object.keys(colors) as CodecName[]).map((codec) => <CodecButton key={codec} active={enabled[codec]} onClick={() => setEnabled({ ...enabled, [codec]: !enabled[codec] })}>{codec}</CodecButton>)}</div><CodecSvg height={360} label="Illustrative bitrate ladder comparison" draw={draw} /><VizNote>{hover || 'Hover a point to inspect an illustrative bitrate.'} Codec efficiency does not remove the need for per-title or content-aware encoding. Dark noisy footage, water, confetti, smoke, fast motion, concert lighting, and higher frame rate can require much higher bitrates.</VizNote></div>
}
