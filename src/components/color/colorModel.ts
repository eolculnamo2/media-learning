export type Matrix = 'bt601' | 'bt709' | 'bt2020'
export type Sampling = '444' | '422' | '420'
export type Format = 'rgb24' | 'rgba' | 'yuv444p' | 'yuv422p' | 'yuv420p' | 'nv12' | 'p010le' | 'yuv420p10le'
export type RGB = [number, number, number]
export type YCbCr = [number, number, number]

export const coefficients: Record<Matrix, [number, number]> = {
  bt601: [0.299, 0.114], bt709: [0.2126, 0.0722], bt2020: [0.2627, 0.0593],
}
export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))
// Full-range, normalized, nonlinear R′G′B′. Cb and Cr are signed and centered at zero.
export function rgbToYCbCr([r, g, b]: RGB, matrix: Matrix): YCbCr {
  const [kr, kb] = coefficients[matrix]
  const y = kr * r + (1 - kr - kb) * g + kb * b
  return [y, (b - y) / (2 * (1 - kb)), (r - y) / (2 * (1 - kr))]
}
export function yCbCrToRgb([y, cb, cr]: YCbCr, matrix: Matrix): RGB {
  const [kr, kb] = coefficients[matrix]
  const r = y + 2 * (1 - kr) * cr
  const b = y + 2 * (1 - kb) * cb
  return [r, (y - kr * r - kb * b) / (1 - kr - kb), b]
}
export const limitedY = (full: number, depth = 8) => (16 * 2 ** (depth - 8) + full * 219 * 2 ** (depth - 8)) / (2 ** depth - 1)
export const expandLimitedY = (code: number, depth = 8) => (code * (2 ** depth - 1) / 2 ** (depth - 8) - 16) / 219
export const chromaDimensions = (width: number, height: number, sampling: Sampling): [number, number] =>
  [sampling === '444' ? width : Math.ceil(width / 2), sampling === '420' ? Math.ceil(height / 2) : height]
export function chromaIndex(x: number, y: number, width: number, height: number, sampling: Sampling) {
  const [cw] = chromaDimensions(width, height, sampling)
  return Math.floor(y / (sampling === '420' ? 2 : 1)) * cw + Math.floor(x / (sampling === '444' ? 1 : 2))
}
export type Plane = { name: string; width: number; height: number; bytesPerSample: number; offset: number; bytes: number }
export function frameLayout(width: number, height: number, format: Format): Plane[] {
  const sampling: Sampling = format === 'yuv444p' ? '444' : format === 'yuv422p' ? '422' : '420'
  const [cw, ch] = chromaDimensions(width, height, sampling)
  const two = format === 'p010le' || format === 'yuv420p10le'
  const unit = two ? 2 : 1
  const descriptors: [string, number, number, number][] = format === 'rgb24' || format === 'rgba'
    ? [[format === 'rgba' ? 'RGBA packed' : 'RGB packed', width, height, format === 'rgba' ? 4 : 3]]
    : format === 'nv12' || format === 'p010le'
      ? [['Y', width, height, unit], ['UV interleaved', cw, ch, unit * 2]]
      : [['Y', width, height, unit], ['Cb', cw, ch, unit], ['Cr', cw, ch, unit]]
  let offset = 0
  return descriptors.map(([name, w, h, b]) => {
    const plane = { name, width: w, height: h, bytesPerSample: b, offset, bytes: w * h * b }
    offset += plane.bytes
    return plane
  })
}
export const frameBytes = (width: number, height: number, format: Format) => frameLayout(width, height, format).reduce((sum, plane) => sum + plane.bytes, 0)
export type ToneStrategy = 'clip' | 'soft knee' | 'compress'
// Deliberately educational curves, not implementations of production algorithms.
export function toneMap(inputNits: number, sourcePeak: number, targetPeak: number, exposure: number, rolloff: number, strategy: ToneStrategy) {
  const x = Math.max(0, inputNits * 2 ** exposure)
  if (strategy === 'clip') return Math.min(targetPeak, x)
  if (strategy === 'compress') {
    const k = Math.max(1, sourcePeak / targetPeak) * Math.max(0.2, rolloff)
    return targetPeak * x / (x + targetPeak * k)
  }
  const knee = targetPeak * clamp(1 - rolloff * 0.7, 0.15, 0.9)
  return x <= knee ? x : Math.min(targetPeak, knee + (targetPeak - knee) * (1 - Math.exp(-(x - knee) / Math.max(1, (sourcePeak - knee) * 0.25))))
}
