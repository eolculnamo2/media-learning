// All model times are seconds except explicitly named performance milliseconds.
export const syncSpec = { duration: 8, fps: 10, lead: 0.15, lateTolerance: 0.06, contextAnchor: 10, performanceAnchorMs: 20000 } as const
export interface SyncSettings { latency: number; decodeDelay: number }
export interface ClockAnchor { contextSeconds: number; compositionSeconds: number; rate: number }
export function compositionAtOutput(contextTime: number, performanceTime: number, nowMs: number, anchor: ClockAnchor) {
  return anchor.compositionSeconds + (contextTime + (nowMs - performanceTime) / 1000 - anchor.contextSeconds) * anchor.rate
}
export function performanceDeadline(pts: number, contextTime: number, performanceTime: number, anchor: ClockAnchor) {
  return performanceTime + (anchor.contextSeconds + (pts - anchor.compositionSeconds) / anchor.rate - contextTime) * 1000
}
export type SyncFrameStatus = 'decoding' | 'queued' | 'on time' | 'late' | 'dropped'
export function syncFrames(position: number, settings: SyncSettings) {
  return Array.from({ length: syncSpec.duration * syncSpec.fps }, (_, id) => {
    const pts = id / syncSpec.fps
    // Prepare 150 ms ahead of the processing head. Extra delay repeats deterministically.
    const submitted = pts - syncSpec.lead - settings.latency
    const ready = submitted + settings.decodeDelay + [0, 0.04, 0.1][id % 3]
    const decision = Math.max(pts, ready)
    const lateness = Math.max(0, ready - pts)
    const outcome = lateness > syncSpec.lateTolerance + 1e-9 ? 'dropped' : lateness > 1e-9 ? 'late' : 'on time'
    const status: SyncFrameStatus = position + 1e-9 < ready ? 'decoding' : position + 1e-9 < pts ? 'queued' : outcome
    return { id, pts, submitted, ready, decision, lateness, outcome, status }
  })
}
