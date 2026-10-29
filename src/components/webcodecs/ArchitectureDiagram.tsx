import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { architectureNodes as nodes, architectureEdges as edges, architectureOwners as owners } from '../../data/previewArchitecture'
import type { ArchitectureOwner } from '../../data/previewArchitecture'

export function ArchitectureDiagram({ owner, selected, onSelect }: {
  owner: ArchitectureOwner | 'all'; selected: string; onSelect: (id: string) => void
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
    const w = Math.max(200, width), columns = w < 560 ? 1 : 3
    const gap = columns === 1 ? 50 : 70
    const boxWidth = (w - 24 - (columns - 1) * gap) / columns
    const rowHeight = columns === 1 ? 95 : 130
    const locations = new Map(nodes.map((node, i) => [node.id, { x: 12 + (i % columns) * (boxWidth + gap), y: 20 + Math.floor(i / columns) * rowHeight }]))
    svg.attr('viewBox', `0 0 ${w} ${Math.ceil(nodes.length / columns) * rowHeight}`)
    const defs = svg.append('defs')
    for (const kind of ['data', 'control']) defs.append('marker').attr('id', `preview-arrow-${kind}`).attr('viewBox', '0 0 10 10')
      .attr('refX', 9).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', kind === 'data' ? 'var(--text)' : 'var(--accent)')
    edges.forEach((edge, i) => {
      const from = locations.get(edge.from)!, to = locations.get(edge.to)!
      const connected = edge.from === selected || edge.to === selected
      // Route around cards; connection labels are exposed in the adjacent inspector.
      const side = w - 3 - (i % 3) * 2
      const adjacent = from.y === to.y && to.x > from.x && to.x - from.x < boxWidth + gap + 1
      const path = adjacent
        ? `M${from.x + boxWidth},${from.y + 34} H${to.x}`
        : `M${from.x + boxWidth / 2},${from.y + 68} V${from.y + 78 + i % 3 * 3} H${side} V${to.y - 6} H${to.x + boxWidth / 2} V${to.y}`
      svg.append('path').attr('d', path).attr('fill', 'none').attr('stroke', edge.kind === 'data' ? 'var(--text)' : 'var(--accent)')
        .attr('stroke-width', connected ? 2.5 : 1).attr('opacity', connected ? 1 : 0.12)
        .attr('stroke-dasharray', edge.kind === 'control' ? '5 4' : null).attr('marker-end', `url(#preview-arrow-${edge.kind})`)
        .append('title').text(`${edge.kind}: ${edge.label}`)
    })
    nodes.forEach(node => {
      const point = locations.get(node.id)!
      const group = svg.append('g').attr('transform', `translate(${point.x},${point.y})`)
        .attr('opacity', owner === 'all' || node.owner === owner ? 1 : 0.3).attr('class', 'preview-node')
        .on('click', () => onSelect(node.id))
      const color = owners.find(item => item.id === node.owner)!.color
      group.append('rect').attr('width', boxWidth).attr('height', 68).attr('rx', 7).attr('fill', 'var(--bg)')
        .attr('stroke', node.id === selected ? 'var(--text-h)' : color).attr('stroke-width', node.id === selected ? 3 : 1.5)
      group.append('rect').attr('width', 5).attr('height', 54).attr('y', 7).attr('fill', color)
      // Labels wrap at word boundaries, including narrow three-column layouts.
      const words = node.label.split(' '), lines: string[] = ['']
      const maxChars = Math.max(12, Math.floor((boxWidth - 24) / 7))
      words.forEach(word => { if ((lines.at(-1)!.length + word.length + 1) > maxChars) lines.push(word); else lines[lines.length - 1] += `${lines.at(-1) ? ' ' : ''}${word}` })
      lines.forEach((line, i) => group.append('text').attr('x', 12).attr('y', 20 + i * 15).attr('class', 'preview-node-label').text(line))
      group.append('text').attr('x', 12).attr('y', 57).attr('fill', color).text(owners.find(item => item.id === node.owner)!.label)
      group.append('title').text(`${node.label} · ${node.owner}. ${node.responsibilities.join('; ')}`)
    })
    return () => { svg.selectAll('*').on('click', null).interrupt() }
  }, [width, owner, selected, onSelect])
  return <figure className="webcodecs-architecture-figure"><svg ref={ref} role="img" aria-label="Preview engine data and control paths. Browser, Mediabunny and application nodes; choose a node with the buttons below for its responsibilities and connections." />
    <figcaption>Solid arrows: data. Dashed arrows: control/timing. Selecting a node emphasizes its connections;
      the inspector lists their labels and direction. Use the equivalent buttons below to explore with a keyboard.</figcaption></figure>
}
