import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export type SvgDraw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => void

export function useCodecSvg(draw: SvgDraw, deps: unknown[] = []) {
  const ref = useRef<SVGSVGElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const width = el.clientWidth || 960
    const height = Number(el.dataset.height ?? 360)
    const svg = d3.select(el)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)
    draw(svg, width, height)
  }, deps)
  return ref
}

export function CodecSvg({ draw, height = 360, label }: { draw: SvgDraw; height?: number; label: string }) {
  const ref = useCodecSvg(draw, [draw])
  return <svg ref={ref} data-height={height} className="codec-svg" role="img" aria-label={label} />
}

export function CodecButton({ active, children, onClick }: { active?: boolean; children: string; onClick: () => void }) {
  return <button className={active ? 'is-active' : ''} type="button" onClick={onClick}>{children}</button>
}

export function VizNote({ children }: { children: React.ReactNode }) {
  return <p className="codec-viz-note">{children}</p>
}
