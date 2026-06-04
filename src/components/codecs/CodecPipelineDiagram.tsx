import { useState } from 'react'
import * as d3 from 'd3'
import { CodecSvg, VizNote } from './CodecViz'

const stages = [
  { id: 'camera', label: 'Camera / Rendered Frames', note: 'The source produces complete pictures. At this point there is no delivery compression advantage yet.' },
  { id: 'raw', label: 'Raw YUV/RGB Frames', note: 'Raw frames are huge. 1080p 8-bit 4:2:0 at 60 fps is already hundreds of MB/s before audio or overhead.' },
  { id: 'encoder', label: 'Encoder', note: 'The encoder implements codec tools: prediction, transforms, quantization, rate control, and entropy coding.' },
  { id: 'bitstream', label: 'Codec Bitstream', note: 'Compressed video syntax such as H.264 NAL units, HEVC samples, VP9 frames, or AV1 OBUs.' },
  { id: 'container', label: 'Container / Segments', note: 'MP4, WebM, MOV, TS, or MKV package encoded streams with timing, indexes, metadata, audio, and subtitles.' },
  { id: 'delivery', label: 'HLS / DASH / File Delivery', note: 'Protocols and manifests deliver segment URLs and adaptation metadata. They are not codecs.' },
  { id: 'demuxer', label: 'Demuxer', note: 'The demuxer reads the container and extracts encoded samples plus timing/configuration metadata.' },
  { id: 'decoder', label: 'Decoder', note: 'The decoder reconstructs frames using codec configuration, references, motion vectors, and residual data.' },
  { id: 'renderer', label: 'Frames to Renderer', note: 'Decoded frames are scheduled to the display. Color conversion, scaling, HDR handling, and sync still matter.' }
]

export function CodecPipelineDiagram() {
  const [active, setActive] = useState(stages[2])
  const draw = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
    const x = width / 2
    const step = (height - 54) / (stages.length - 1)
    svg.append('defs').append('marker').attr('id', 'codec-flow-arrow').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto').append('path').attr('d', 'M0,0L10,5L0,10Z').attr('fill', '#94a3b8')
    stages.forEach((stage, i) => {
      const y = 28 + i * step
      if (i > 0) svg.append('line').attr('x1', x).attr('x2', x).attr('y1', y - step + 24).attr('y2', y - 25).attr('class', 'codec-flow-line').attr('marker-end', 'url(#codec-flow-arrow)')
      const hot = active.id === stage.id
      const g = svg.append('g').attr('transform', `translate(${x},${y})`).style('cursor', 'pointer').on('mouseenter focus click', () => setActive(stage))
      g.append('rect').attr('x', -145).attr('y', -19).attr('width', 290).attr('height', 38).attr('rx', 13).attr('fill', hot ? '#38bdf8' : '#1e293b').attr('opacity', hot ? 0.28 : 0.78).attr('stroke', hot ? '#facc15' : '#475569').attr('stroke-width', hot ? 2.4 : 1.2)
      g.append('text').attr('text-anchor', 'middle').attr('dy', 5).attr('class', 'codec-svg-label').text(stage.label)
    })
  }
  return <div><CodecSvg height={560} label="Codec pipeline from raw frames to renderer" draw={draw} /><VizNote><strong>{active.label}:</strong> {active.note}</VizNote></div>
}
