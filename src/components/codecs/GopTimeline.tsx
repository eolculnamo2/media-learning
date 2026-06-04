import { useMemo, useState } from 'react'
import * as d3 from 'd3'
import { CodecButton, CodecSvg, VizNote } from './CodecViz'

type Frame = { i: number; type: 'I' | 'P' | 'B'; ref?: number; future?: number }

export function GopTimeline() {
  const [gop, setGop] = useState(12)
  const [bCount, setBCount] = useState(2)
  const [lowLatency, setLowLatency] = useState(false)
  const frames = useMemo<Frame[]>(() => {
    const usableB = lowLatency ? 0 : bCount
    const out: Frame[] = [{ i: 0, type: 'I' }]
    let lastRef = 0
    for (let i = 1; i < gop; i++) {
      const nextRef = Math.min(gop, lastRef + usableB + 1)
      if (usableB > 0 && i < nextRef) out.push({ i, type: 'B', ref: lastRef, future: nextRef })
      else { out.push({ i, type: 'P', ref: lastRef }); lastRef = i }
    }
    out.push({ i: gop, type: 'I' })
    return out
  }, [gop, bCount, lowLatency])
  const [hover, setHover] = useState<Frame | null>(null)
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    const x = d3.scalePoint<number>().domain(frames.map((f) => f.i)).range([42, width - 42]).padding(0.5)
    const y = height / 2
    svg.append('defs').append('marker').attr('id', 'gop-arrow').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto').append('path').attr('d', 'M0,0L10,5L0,10Z').attr('fill', '#94a3b8')
    frames.forEach((f) => {
      if (f.type === 'P' && f.ref !== undefined) svg.append('path').attr('d', `M${x(f.ref)},${y - 38} C${x(f.ref)},28 ${x(f.i)},28 ${x(f.i)},${y - 38}`).attr('class', 'codec-dep-line').attr('marker-end', 'url(#gop-arrow)')
      if (f.type === 'B' && f.ref !== undefined && f.future !== undefined) {
        svg.append('path').attr('d', `M${x(f.ref)},${y + 38} C${x(f.ref)},${height - 28} ${x(f.i)},${height - 28} ${x(f.i)},${y + 38}`).attr('class', 'codec-dep-line b').attr('marker-end', 'url(#gop-arrow)')
        svg.append('path').attr('d', `M${x(f.future)},${y + 38} C${x(f.future)},${height - 28} ${x(f.i)},${height - 28} ${x(f.i)},${y + 38}`).attr('class', 'codec-dep-line b').attr('marker-end', 'url(#gop-arrow)')
      }
    })
    frames.forEach((f) => {
      const hot = hover?.i === f.i
      const fill = f.type === 'I' ? '#f97316' : f.type === 'P' ? '#38bdf8' : '#a78bfa'
      const g = svg.append('g').attr('transform', `translate(${x(f.i)},${y})`).style('cursor', 'pointer').on('mouseenter click', () => setHover(f)).on('mouseleave', () => setHover(null))
      g.append('rect').attr('x', -18).attr('y', -24).attr('width', 36).attr('height', 48).attr('rx', 9).attr('fill', fill).attr('opacity', hot ? 0.95 : 0.72).attr('stroke', hot ? '#facc15' : '#0f172a').attr('stroke-width', hot ? 2.5 : 1)
      g.append('text').attr('text-anchor', 'middle').attr('dy', 6).attr('class', 'codec-frame-label').text(f.type)
      g.append('text').attr('text-anchor', 'middle').attr('y', 42).attr('class', 'codec-small-label').text(f.i)
    })
  }
  const current = hover ?? frames[0]
  const explanation = current.type === 'I' ? 'I/keyframes are self-contained access points and are expensive, but they make startup, seeking, recovery, and live boundaries practical.' : current.type === 'P' ? `P-frames predict from a previous I/P reference${current.ref !== undefined ? `, here frame ${current.ref}` : ''}, then store motion and residual.` : `B-frames can reference past and future frames${current.ref !== undefined ? `, here ${current.ref} and ${current.future}` : ''}. This improves compression but can add decode/display reordering delay.`
  return <div><div className="codec-controls"><label>GOP length {gop}<input type="range" min="6" max="24" value={gop} onChange={(e) => setGop(Number(e.target.value))} /></label><label>B-frames per P {lowLatency ? 0 : bCount}<input type="range" min="0" max="4" value={bCount} disabled={lowLatency} onChange={(e) => setBCount(Number(e.target.value))} /></label><CodecButton active={lowLatency} onClick={() => setLowLatency(!lowLatency)}>low-latency mode</CodecButton></div><CodecSvg height={260} label="Interactive GOP frame type timeline" draw={draw} /><VizNote><strong>{current.type}-frame:</strong> {explanation}</VizNote><VizNote>Longer GOPs can improve compression efficiency because keyframes are expensive, but they can hurt seeking, startup, error recovery, and live latency. Low-latency streaming often uses shorter GOPs and fewer or no B-frames.</VizNote></div>
}
