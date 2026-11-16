import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { chromaDimensions, clamp, rgbToYCbCr, toneMap, yCbCrToRgb, type Matrix, type Sampling, type ToneStrategy } from './colorModel'

const W = 320, H = 180
function sourceImage(): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const c = canvas.getContext('2d')!
  const sky = c.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#263f72'); sky.addColorStop(.5, '#e6a56d'); sky.addColorStop(1, '#eadbb8')
  c.fillStyle = sky; c.fillRect(0, 0, W, H)
  c.fillStyle = '#f7d49b'; c.beginPath(); c.arc(236, 54, 24, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#354e5c'; c.beginPath(); c.moveTo(0, 135); c.lineTo(82, 64); c.lineTo(170, 150); c.fill()
  c.fillStyle = '#203849'; c.beginPath(); c.moveTo(90, 145); c.lineTo(208, 76); c.lineTo(320, 154); c.fill()
  c.fillStyle = '#117a72'; c.fillRect(0, 139, W, 41)
  c.fillStyle = '#e42c62'; c.fillRect(8, 8, 140, 37)
  c.fillStyle = 'white'; c.font = 'bold 21px sans-serif'; c.fillText('COLOR / UI', 13, 34)
  c.fillStyle = '#00e5ff'; c.fillRect(188, 143, 108, 18)
  c.fillStyle = '#072b36'; c.font = 'bold 12px monospace'; c.fillText('sharp edge', 194, 156)
  return c.getImageData(0, 0, W, H)
}

function imageFor(mode: Sampling | 'original' | 'luma' | 'cb' | 'cr' | 'reconstructed', matrix: Matrix, reconstruction: 'nearest' | 'interpolated', lumaShift = 0, neutral = false) {
  const source = sourceImage()
  const out = new ImageData(W, H)
  if (mode === 'original') return source
  const sampling = mode === '422' || mode === '420' ? mode : '444'
  const [cw, ch] = chromaDimensions(W, H, sampling)
  const yPlane = new Float32Array(W * H), cbPlane = new Float32Array(cw * ch), crPlane = new Float32Array(cw * ch), counts = new Uint8Array(cw * ch)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = i * 4
    const [yy, cb, cr] = rgbToYCbCr([source.data[o] / 255, source.data[o + 1] / 255, source.data[o + 2] / 255], matrix)
    const ci = Math.floor(y / (sampling === '420' ? 2 : 1)) * cw + Math.floor(x / (sampling === '444' ? 1 : 2))
    yPlane[i] = yy; cbPlane[ci] += cb; crPlane[ci] += cr; counts[ci]++
  }
  cbPlane.forEach((_, i) => { cbPlane[i] /= counts[i]; crPlane[i] /= counts[i] })
  const sample = (plane: Float32Array, x: number, y: number) => {
    const px = sampling === '444' ? x : x / 2 - .25
    const py = sampling === '420' ? y / 2 - .25 : y
    const at = (sx: number, sy: number) => plane[Math.round(clamp(sy, 0, ch - 1)) * cw + Math.round(clamp(sx, 0, cw - 1))]
    if (reconstruction === 'nearest' || sampling === '444') return at(Math.round(px), Math.round(py))
    const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0
    return (1 - fy) * ((1 - fx) * at(x0, y0) + fx * at(x0 + 1, y0)) + fy * ((1 - fx) * at(x0, y0 + 1) + fx * at(x0 + 1, y0 + 1))
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = i * 4
    const yy = clamp(yPlane[i] + lumaShift)
    const cb = neutral ? 0 : sample(cbPlane, x, y), cr = neutral ? 0 : sample(crPlane, x, y)
    const value = mode === 'luma' ? yy : mode === 'cb' ? clamp(.5 + cb) : mode === 'cr' ? clamp(.5 + cr) : -1
    const rgb = value >= 0 ? [value, value, value] : yCbCrToRgb([yy, cb, cr], matrix)
    for (let k = 0; k < 3; k++) out.data[o + k] = Math.round(255 * clamp(rgb[k]))
    out.data[o + 3] = 255
  }
  return out
}

export function ColorImage({ mode, matrix, reconstruction = 'nearest', lumaShift = 0, neutral = false, zoom = false }: { mode: Sampling | 'original' | 'luma' | 'cb' | 'cr' | 'reconstructed'; matrix: Matrix; reconstruction?: 'nearest' | 'interpolated'; lumaShift?: number; neutral?: boolean; zoom?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => { ref.current?.getContext('2d')?.putImageData(imageFor(mode, matrix, reconstruction, lumaShift, neutral), 0, 0) }, [mode, matrix, reconstruction, lumaShift, neutral])
  return <canvas ref={ref} width={W} height={H} className={zoom ? 'cs-image cs-zoom' : 'cs-image'} aria-label={`${mode} representation of locally drawn landscape and colored text`} role="img" />
}

export function GamutDiagram() {
  const x = d3.scaleLinear().domain([0, .8]).range([40, 530]), y = d3.scaleLinear().domain([0, .9]).range([300, 18])
  const gamut = [
    { label: 'BT.709 / sRGB', color: '#e8795b', points: [[.64, .33], [.3, .6], [.15, .06]] },
    { label: 'Display P3', color: '#eab866', points: [[.68, .32], [.265, .69], [.15, .06]] },
    { label: 'BT.2020', color: '#5cc8b2', points: [[.708, .292], [.17, .797], [.131, .046]] },
  ]
  return <svg viewBox="0 0 560 335" className="cs-chart" role="img" aria-label="Approximate CIE 1931 xy chromaticity triangle outlines for BT.709, Display P3, and BT.2020">
    {d3.range(0, .81, .2).map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1="18" y2="300" className="cs-gridline"/><text x={x(t)} y="320" textAnchor="middle">{t.toFixed(1)}</text></g>)}
    {d3.range(0, .91, .2).map(t => <g key={t}><line x1="40" x2="530" y1={y(t)} y2={y(t)} className="cs-gridline"/><text x="30" y={y(t) + 4} textAnchor="end">{t.toFixed(1)}</text></g>)}
    {gamut.map(g => <polygon key={g.label} points={g.points.map(([px, py]) => `${x(px)},${y(py)}`).join(' ')} fill={g.color} fillOpacity=".07" stroke={g.color} strokeWidth="2.5" />)}
    <circle cx={x(.3127)} cy={y(.329)} r="4" fill="var(--text-h)"/><text x={x(.3127) + 8} y={y(.329) - 8}>D65</text><text x="540" y="320">x</text><text x="22" y="20">y</text>
  </svg>
}

export function ToneGraph({ sourcePeak, targetPeak, exposure, rolloff, strategy, scenePeak }: { sourcePeak: number; targetPeak: number; exposure: number; rolloff: number; strategy: ToneStrategy; scenePeak: number }) {
  const x = d3.scaleLinear().domain([0, sourcePeak]).range([52, 560]), y = d3.scaleLinear().domain([0, targetPeak]).range([292, 18])
  const pts = d3.range(0, sourcePeak + 1, sourcePeak / 160).map(n => [x(n), y(toneMap(n, sourcePeak, targetPeak, exposure, rolloff, strategy))] as [number, number])
  const line = d3.line<[number, number]>().x(d => d[0]).y(d => d[1])(pts)
  const marked = Math.min(sourcePeak, scenePeak)
  return <svg viewBox="0 0 600 340" className="cs-chart" role="img" aria-label={`Illustrative ${strategy} mapping curve from ${sourcePeak} nit HDR to ${targetPeak} nit SDR`}>
    {y.ticks(5).map(n => <g key={n}><line x1="52" x2="560" y1={y(n)} y2={y(n)} className="cs-gridline"/><text x="43" y={y(n) + 4} textAnchor="end">{n}</text></g>)}
    {x.ticks(5).map(n => <g key={n}><line x1={x(n)} x2={x(n)} y1="18" y2="292" className="cs-gridline"/><text x={x(n)} y="312" textAnchor="middle">{n}</text></g>)}
    <path d={line ?? ''} fill="none" stroke="#5cc8b2" strokeWidth="3.5"/>
    <line x1={x(marked)} x2={x(marked)} y1="18" y2="292" stroke="#eab866" strokeDasharray="5 5"/>
    <circle cx={x(marked)} cy={y(toneMap(marked, sourcePeak, targetPeak, exposure, rolloff, strategy))} r="5" fill="#eab866"/>
    <text x="300" y="337" textAnchor="middle">Input luminance (nits)</text><text x="55" y="15">SDR output (nits)</text>
  </svg>
}
