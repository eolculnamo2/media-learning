import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { Edge, Node, NodeCategory } from './graphData'

type GraphProps = {
  nodes: Node[]
  edges: Edge[]
}

type SimNode = Node & d3.SimulationNodeDatum

type SimEdge = Omit<Edge, 'source' | 'target'> & {
  source: SimNode | string
  target: SimNode | string
}

type Tooltip = {
  kind: 'node' | 'edge'
  x: number
  y: number
  title: string
  body: string
  footer?: string
}

const colors: Record<NodeCategory, string> = {
  concept: '#64748b',
  'progressive-mp4': '#16a34a',
  'fragmented-mp4': '#2563eb',
  streaming: '#9333ea',
  box: '#f97316',
  timing: '#dc2626',
  'sample-table': '#0891b2',
}

const categoryLabels: Record<NodeCategory, string> = {
  concept: 'Concept',
  'progressive-mp4': 'Progressive MP4',
  'fragmented-mp4': 'Fragmented MP4',
  streaming: 'Streaming',
  box: 'Box',
  timing: 'Timing',
  'sample-table': 'Sample table',
}

const nodeRadius = (node: Node) => {
  if (node.category === 'concept') return 24
  if (node.category === 'streaming') return 23
  if (node.category === 'fragmented-mp4') return 22
  return 19
}

const edgeKey = (source: string, target: string) => `${source}->${target}`

const endpointId = (endpoint: SimNode | string) =>
  typeof endpoint === 'string' ? endpoint : endpoint.id

const clampTooltip = (event: PointerEvent | MouseEvent) => {
  const width = 320
  const height = 180
  const margin = 16
  const x = Math.min(event.clientX + 18, window.innerWidth - width - margin)
  const y = Math.min(event.clientY + 18, window.innerHeight - height - margin)
  return { x: Math.max(margin, x), y: Math.max(margin, y) }
}

export function ForceGraph({ nodes, edges }: GraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeKey, setHoveredEdgeKey] = useState<string | null>(null)

  const connected = useMemo(() => {
    const byNode = new Map<string, Set<string>>()
    const edgeKeys = new Map<string, Set<string>>()

    nodes.forEach((node) => {
      byNode.set(node.id, new Set([node.id]))
      edgeKeys.set(node.id, new Set())
    })

    edges.forEach((edge) => {
      byNode.get(edge.source)?.add(edge.target)
      byNode.get(edge.target)?.add(edge.source)
      edgeKeys.get(edge.source)?.add(edgeKey(edge.source, edge.target))
      edgeKeys.get(edge.target)?.add(edgeKey(edge.source, edge.target))
    })

    return { byNode, edgeKeys }
  }, [edges, nodes])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()

    const { width, height } = svgElement.getBoundingClientRect()
    const safeWidth = width || 1100
    const safeHeight = height || 720

    const simNodes: SimNode[] = nodes.map((node) => ({ ...node }))
    const simEdges: SimEdge[] = edges.map((edge) => ({ ...edge }))

    const defs = svg.append('defs')
    defs
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 21)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'rgba(148, 163, 184, 0.72)')

    const viewport = svg.append('g').attr('class', 'graph-viewport')

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 2.8])
      .on('zoom', (event) => {
        viewport.attr('transform', event.transform.toString())
      })

    svg.call(zoom)

    const link = viewport
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, SimEdge>('line')
      .data(simEdges)
      .join('line')
      .attr('class', 'link')
      .attr('marker-end', 'url(#arrow)')
      .on('pointerenter', (event, edge) => {
        const source = endpointId(edge.source)
        const target = endpointId(edge.target)
        const pos = clampTooltip(event)
        setHoveredEdgeKey(edgeKey(source, target))
        setTooltip({
          kind: 'edge',
          x: pos.x,
          y: pos.y,
          title: `${source} ${edge.label} ${target}`,
          body: edge.description,
        })
      })
      .on('pointermove', (event) => {
        const pos = clampTooltip(event)
        setTooltip((current) => (current ? { ...current, x: pos.x, y: pos.y } : current))
      })
      .on('pointerleave', () => {
        setHoveredEdgeKey(null)
        setTooltip(null)
      })

    const linkLabel = viewport
      .append('g')
      .attr('class', 'link-labels')
      .selectAll<SVGTextElement, SimEdge>('text')
      .data(simEdges.filter((edge) => ['contains', 'uses', 'has'].includes(edge.label)))
      .join('text')
      .attr('class', 'link-label')
      .text((edge) => edge.label)

    let simulation!: d3.Simulation<SimNode, undefined>

    const node = viewport
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('class', 'node')
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, dragged) => {
            if (!event.active) simulation.alphaTarget(0.25).restart()
            dragged.fx = dragged.x
            dragged.fy = dragged.y
          })
          .on('drag', (event, dragged) => {
            dragged.fx = event.x
            dragged.fy = event.y
          })
          .on('end', (event, dragged) => {
            if (!event.active) simulation.alphaTarget(0)
            dragged.fx = null
            dragged.fy = null
          }),
      )
      .on('pointerenter', (event, graphNode) => {
        const pos = clampTooltip(event)
        setHoveredNodeId(graphNode.id)
        setTooltip({
          kind: 'node',
          x: pos.x,
          y: pos.y,
          title: graphNode.label,
          body: graphNode.description,
          footer: graphNode.whyItMatters,
        })
      })
      .on('pointermove', (event) => {
        const pos = clampTooltip(event)
        setTooltip((current) => (current ? { ...current, x: pos.x, y: pos.y } : current))
      })
      .on('pointerleave', () => {
        setHoveredNodeId(null)
        setTooltip(null)
      })

    node
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', (graphNode) => colors[graphNode.category])

    node
      .append('text')
      .attr('class', 'node-label')
      .attr('dy', (graphNode) => nodeRadius(graphNode) + 15)
      .text((graphNode) => graphNode.label)

    simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimEdge>(simEdges)
          .id((graphNode) => graphNode.id)
          .distance((edge) => {
            const source = endpointId(edge.source)
            const target = endpointId(edge.target)
            if ([source, target].includes('stbl')) return 105
            if ([source, target].includes('abr')) return 150
            return 118
          })
          .strength(0.62),
      )
      .force('charge', d3.forceManyBody().strength(-620))
      .force('center', d3.forceCenter(safeWidth / 2, safeHeight / 2))
      .force('collision', d3.forceCollide<SimNode>().radius((graphNode) => nodeRadius(graphNode) + 34))
      .force('x', d3.forceX<SimNode>(safeWidth / 2).strength(0.04))
      .force('y', d3.forceY<SimNode>(safeHeight / 2).strength(0.06))
      .on('tick', () => {
        link
          .attr('x1', (edge) => (edge.source as SimNode).x ?? 0)
          .attr('y1', (edge) => (edge.source as SimNode).y ?? 0)
          .attr('x2', (edge) => (edge.target as SimNode).x ?? 0)
          .attr('y2', (edge) => (edge.target as SimNode).y ?? 0)

        linkLabel
          .attr('x', (edge) => (((edge.source as SimNode).x ?? 0) + ((edge.target as SimNode).x ?? 0)) / 2)
          .attr('y', (edge) => (((edge.source as SimNode).y ?? 0) + ((edge.target as SimNode).y ?? 0)) / 2)

        node.attr('transform', (graphNode) => `translate(${graphNode.x ?? 0},${graphNode.y ?? 0})`)
      })

    return () => {
      simulation.stop()
    }
  }, [edges, nodes])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const svg = d3.select(svgElement)
    const activeNodeIds = hoveredNodeId ? connected.byNode.get(hoveredNodeId) : null
    const activeEdgeKeys = hoveredNodeId ? connected.edgeKeys.get(hoveredNodeId) : null

    svg
      .selectAll<SVGGElement, SimNode>('.node')
      .classed('is-dimmed', (node) => Boolean(activeNodeIds && !activeNodeIds.has(node.id)))
      .classed('is-highlighted', (node) => Boolean(activeNodeIds?.has(node.id)))

    svg
      .selectAll<SVGLineElement, SimEdge>('.link')
      .classed('is-dimmed', (edge) => {
        const key = edgeKey(endpointId(edge.source), endpointId(edge.target))
        return Boolean(activeEdgeKeys && !activeEdgeKeys.has(key))
      })
      .classed('is-highlighted', (edge) => {
        const key = edgeKey(endpointId(edge.source), endpointId(edge.target))
        return Boolean(activeEdgeKeys?.has(key) || hoveredEdgeKey === key)
      })
  }, [connected, hoveredEdgeKey, hoveredNodeId])

  return (
    <section className="graph-shell" aria-label="MP4Box.js and ISOBMFF concept graph">
      <header className="graph-header">
        <div>
          <p className="eyebrow">Interactive D3 learning map</p>
          <h1>MP4Box.js / ISOBMFF Concepts</h1>
          <p className="graph-intro">
            Drag nodes, zoom or pan the canvas, and hover nodes or relationships to learn how MP4 boxes,
            fragments, and adaptive streaming concepts fit together.
          </p>
        </div>
      </header>

      <div className="legend" aria-label="Graph category legend">
        {(Object.keys(colors) as NodeCategory[]).map((category) => (
          <span key={category} className="legend-item">
            <span className="legend-swatch" style={{ background: colors[category] }} />
            {categoryLabels[category]}
          </span>
        ))}
      </div>

      <div className="graph-stage">
        <svg ref={svgRef} className="graph-svg" role="img" aria-label="Force-directed graph of MP4 concepts" />
        {tooltip ? (
          <div className={`tooltip tooltip-${tooltip.kind}`} style={{ left: tooltip.x, top: tooltip.y }}>
            <strong>{tooltip.title}</strong>
            <p>{tooltip.body}</p>
            {tooltip.footer ? (
              <p className="tooltip-why"><span>Why it matters:</span> {tooltip.footer}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
