export const clips = [
  { id: 'A', sourceIn: 12, sourceOut: 16, start: 0, end: 4, color: '#38bdf8', config: 'AVC · 1280 × 720' },
  { id: 'B', sourceIn: 30, sourceOut: 34, start: 4, end: 8, color: '#a78bfa', config: 'AVC · 1920 × 1080' },
] as const
export type Clip = typeof clips[number]
export type ClipSettings = { lead: number; videoDelay: number; audioDelay: number }
export const initialClipSettings: ClipSettings = { lead: 1.5, videoDelay: 0.9, audioDelay: 0.35 }
export const sourceToComposition = (clip: Clip, source: number) => clip.start + source - clip.sourceIn
export const compositionToSource = (clip: Clip, position: number) => clip.sourceIn + position - clip.start

// A tiny illustrative dependency group, not a real bitstream or throughput model.
export const nextClipPackets = [
  { label: 'I', pts: 29.5, dts: 29.3, order: 0 },
  { label: 'P', pts: 30.2, dts: 29.4, order: 1 },
  { label: 'B₀', pts: 30, dts: 29.5, order: 2 },
  { label: 'B₁', pts: 30.1, dts: 29.6, order: 3 },
] as const

export function clipSnapshot(position: number, settings: ClipSettings) {
  const p = Number.isFinite(position) ? Math.min(8, Math.max(0, position)) : 0
  const clip = clips[p < 4 ? 0 : 1]
  const start = 4 - settings.lead
  const videoReady = start + settings.videoDelay
  const audioReady = start + settings.audioDelay
  const phase = (ready: number) => p < start ? 'waiting' : p < ready ? 'preparing' : 'ready'
  return {
    position: p, clip, source: compositionToSource(clip, p), start, videoReady, audioReady,
    videoPhase: phase(videoReady), audioPhase: phase(audioReady),
    videoProgress: Math.min(1, Math.max(0, (p - start) / settings.videoDelay)),
    audioProgress: Math.min(1, Math.max(0, (p - start) / settings.audioDelay)),
    seamless: Math.max(videoReady, audioReady) <= 4 + 1e-9,
    videoAvailable: p < 4 || p >= videoReady,
    audioAvailable: p < 4 || p >= audioReady,
    ended: p === 8,
  }
}
