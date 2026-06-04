import { useState } from 'react'
import * as d3 from 'd3'
import { CodecButton, CodecSvg, VizNote } from './CodecViz'

export function MotionPredictionDemo() {
  const [motion, setMotion] = useState(34)
  const [noise, setNoise] = useState(12)
  const [sceneCut, setSceneCut] = useState(false)
  const [inter, setInter] = useState(true)
  const residual = sceneCut || !inter ? 85 + noise * 0.4 : Math.min(100, Math.abs(motion - 34) * 0.8 + noise * 1.15)
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    const panelW = (width - 72) / 3
    const panels = [{ x: 20, title: 'Frame 1' }, { x: 38 + panelW, title: 'Frame 2' }, { x: 56 + panelW * 2, title: 'Residual' }]
    panels.forEach((p) => { svg.append('rect').attr('x', p.x).attr('y', 36).attr('width', panelW).attr('height', height - 70).attr('rx', 16).attr('class', 'codec-frame-panel'); svg.append('text').attr('x', p.x + 14).attr('y', 24).attr('class', 'codec-svg-label').text(p.title) })
    const size = 54
    const y1 = 106
    const x1 = panels[0].x + 45
    const x2 = panels[1].x + 45 + motion
    const y2 = y1 + motion * 0.35
    svg.append('rect').attr('x', x1).attr('y', y1).attr('width', size).attr('height', size).attr('rx', 10).attr('fill', '#38bdf8')
    svg.append('rect').attr('x', sceneCut ? panels[1].x + panelW - 100 : x2).attr('y', sceneCut ? 170 : y2).attr('width', sceneCut ? 70 : size).attr('height', sceneCut ? 34 : size).attr('rx', 10).attr('fill', sceneCut ? '#f97316' : '#38bdf8')
    if (inter && !sceneCut) {
      svg.append('defs').append('marker').attr('id', 'motion-arrow').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto').append('path').attr('d', 'M0,0L10,5L0,10Z').attr('fill', '#facc15')
      svg.append('line').attr('x1', x1 + size).attr('y1', y1 + size / 2).attr('x2', x2).attr('y2', y2 + size / 2).attr('stroke', '#facc15').attr('stroke-width', 3).attr('marker-end', 'url(#motion-arrow)')
      svg.append('text').attr('x', (x1 + x2 + size) / 2).attr('y', y1 - 14).attr('class', 'codec-small-label').text('motion vector')
    }
    d3.range(Math.round(noise / 4)).forEach((i) => { svg.append('circle').attr('cx', panels[1].x + 30 + (i * 37) % (panelW - 55)).attr('cy', 62 + (i * 53) % (height - 112)).attr('r', 2 + (i % 3)).attr('fill', '#facc15').attr('opacity', 0.7) })
    svg.append('rect').attr('x', panels[2].x + 34).attr('y', height - 66 - residual * 1.65).attr('width', panelW - 68).attr('height', residual * 1.65).attr('rx', 12).attr('fill', residual > 70 ? '#ef4444' : residual > 35 ? '#f97316' : '#22c55e').attr('opacity', 0.82)
    svg.append('text').attr('x', panels[2].x + panelW / 2).attr('y', height - 82 - residual * 1.65).attr('text-anchor', 'middle').attr('class', 'codec-svg-label').text(`${Math.round(residual)}% residual`)
  }
  const msg = sceneCut ? 'Prediction fails because the new picture is unrelated to the reference. A keyframe or intra refresh is usually needed.' : !inter ? 'Intra mode predicts within the current frame only, so it spends bits on the whole block rather than motion from a reference.' : residual < 35 ? 'Simple motion predicts well: the encoder stores a vector plus a small residual.' : 'Noise, texture, or mismatched motion leaves more residual to encode.'
  return <div><div className="codec-controls"><label>object motion {motion}<input type="range" min="0" max="80" value={motion} onChange={(e) => { setMotion(Number(e.target.value)); setSceneCut(false) }} /></label><label>noise {noise}<input type="range" min="0" max="70" value={noise} onChange={(e) => setNoise(Number(e.target.value))} /></label><CodecButton active={sceneCut} onClick={() => setSceneCut(!sceneCut)}>scene cut</CodecButton><CodecButton active={inter} onClick={() => setInter(!inter)}>{inter ? 'inter frame' : 'intra frame'}</CodecButton></div><CodecSvg height={280} label="Conceptual motion compensation demo" draw={draw} /><VizNote>{msg}</VizNote></div>
}
