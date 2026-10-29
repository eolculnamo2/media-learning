/** Pure teaching model. Seconds, bytes, and frame IDs are distinct units.
 * Fixed 100 ms ticks; no wall clock, browser resources, random data, or I/O.
 * Synthetic 20 s / 10 fps stream: 2 s segments, closed GOP every 4 s,
 * one packet → one frame, decode order = presentation order (no B frames).
 */
export const bufferSpec = {
  tickSeconds: 0.1, durationSeconds: 20, fps: 10, segmentSeconds: 2,
  framesPerSegment: 20, gopFrames: 40, initBytes: 16000,
  frameBytes: 1280 * 720 * 4, // illustrative RGBA estimate, not VideoFrame allocationSize
  cacheBudgetBytes: 1600000, encodedBudgetPackets: 80,
  decodedBudgetFrames: 30, pendingBudget: 8, outputDelaySeconds: 0.3,
  demuxPacketsPerTick: 5,
} as const

export interface BufferSettings {
  throughputBytesPerSecond: number
  latencySeconds: number
  prefetchSeconds: number
  encodedSeconds: number
  decodedSeconds: number
  decoderFps: number
  playbackRate: number
}
export const defaultBufferSettings: BufferSettings = {
  throughputBytesPerSecond: 400000, latencySeconds: 0.3, prefetchSeconds: 8,
  encodedSeconds: 3, decodedSeconds: 1, decoderFps: 20, playbackRate: 1,
}
export const bufferSettingLimits: Record<keyof BufferSettings, readonly [number, number]> = {
  throughputBytesPerSecond: [0, 2000000], latencySeconds: [0, 3],
  prefetchSeconds: [2, 12], encodedSeconds: [0.1, 8], decodedSeconds: [0.1, 3],
  decoderFps: [1, 60], playbackRate: [0.25, 2],
}
export interface CachedSegment { id: number; lastUsedTick: number }
export interface Download { id: number; bytes: number; latencyLeft: number } // -1 = initialization
export interface DecodeJob { frame: number; generation: number; readyAt: number }
export interface BufferState {
  settings: BufferSettings
  tick: number
  positionSeconds: number
  playbackPaused: boolean
  networkStalled: boolean
  initialized: boolean
  cache: CachedSegment[]
  download: Download | null
  packets: number[]
  pending: DecodeJob[]
  frames: number[]
  extractCursor: number
  decodeCursor: number
  serviceAvailableAt: number
  generation: number
  downloadedBytes: number
  cacheHits: number
  presentedFrames: number
  releasedFrames: number
  discardedJobs: number
  lastSeekReusedSegments: number
}
export type BufferAction =
  | { type: 'advance'; ticks?: number }
  | { type: 'setting'; key: keyof BufferSettings; value: number }
  | { type: 'pause' }
  | { type: 'stall' }
  | { type: 'seek'; seconds: number }
  | { type: 'reset' }

export function segmentBytes(id: number): number {
  return id === -1 ? bufferSpec.initBytes : 160000 + id % 3 * 20000
}
const totalFrames = bufferSpec.durationSeconds * bufferSpec.fps
const segmentOf = (frame: number) => Math.floor(frame / bufferSpec.framesPerSegment)
const keyframeOf = (frame: number) => Math.floor(frame / bufferSpec.gopFrames) * bufferSpec.gopFrames
const now = (s: BufferState) => s.tick * bufferSpec.tickSeconds
const completeBytes = (s: BufferState) => (s.initialized ? bufferSpec.initBytes : 0) + s.cache.reduce((n, item) => n + segmentBytes(item.id), 0)

export function createBufferState(): BufferState {
  return {
    settings: { ...defaultBufferSettings }, tick: 0, positionSeconds: 0,
    playbackPaused: false, networkStalled: false, initialized: false,
    cache: [], download: null, packets: [], pending: [], frames: [],
    extractCursor: 0, decodeCursor: 0, serviceAvailableAt: 0, generation: 0,
    downloadedBytes: 0, cacheHits: 0, presentedFrames: 0, releasedFrames: 0,
    discardedJobs: 0, lastSeekReusedSegments: 0,
  }
}

function downloadTick(s: BufferState) {
  if (s.positionSeconds >= bufferSpec.durationSeconds) return
  if (!s.download) {
    // A media segment is intentionally fetched before init to expose readiness.
    const first = segmentOf(s.extractCursor)
    const end = Math.min(10, Math.ceil((s.positionSeconds + s.settings.prefetchSeconds) / bufferSpec.segmentSeconds))
    let id: number | undefined
    if (first < 10 && !s.cache.some(item => item.id === first)) id = first
    else if (!s.initialized) id = -1
    else {
      for (let i = first; i < end; i++) {
        if (!s.cache.some(item => item.id === i)) { id = i; break }
      }
    }
    if (id !== undefined) {
      // Reserve the whole request before starting; evict least recently read bytes.
      // Packets already extracted own independent payloads in this model.
      const needed = segmentBytes(id)
      while (completeBytes(s) + needed > bufferSpec.cacheBudgetBytes) {
        const victim = s.cache.filter(item => item.id !== first)
          .sort((a, b) => a.lastUsedTick - b.lastUsedTick || a.id - b.id)[0]
        if (!victim) return
        s.cache = s.cache.filter(item => item.id !== victim.id)
      }
      s.download = { id, bytes: 0, latencyLeft: s.settings.latencySeconds }
    }
  }
  const request = s.download
  if (!request || s.networkStalled) return // stall freezes both latency and body
  const dt = bufferSpec.tickSeconds
  const transferSeconds = Math.max(0, Math.round((dt - request.latencyLeft) * 1e9) / 1e9)
  request.latencyLeft = Math.max(0, request.latencyLeft - dt)
  const bytes = Math.min(segmentBytes(request.id) - request.bytes, s.settings.throughputBytesPerSecond * transferSeconds)
  request.bytes += bytes
  s.downloadedBytes += bytes
  if (request.bytes >= segmentBytes(request.id) - 1e-6) {
    if (request.id === -1) s.initialized = true
    else s.cache.push({ id: request.id, lastUsedTick: s.tick })
    s.download = null
  }
}

function advanceTick(s: BufferState) {
  s.tick++
  downloadTick(s)
  // Output is a separate event; submitting below can never output in this tick.
  const completed = s.pending.filter(job => job.readyAt <= now(s) + 1e-9)
  s.pending = s.pending.filter(job => job.readyAt > now(s) + 1e-9)
  for (const job of completed) {
    if (job.generation !== s.generation || job.frame < Math.floor(s.positionSeconds * bufferSpec.fps + 1e-7)) s.releasedFrames++
    else s.frames.push(job.frame)
  }
  s.frames.sort((a, b) => a - b)

  if (!s.playbackPaused) {
    const current = Math.floor(s.positionSeconds * bufferSpec.fps + 1e-7)
    let end = current
    while (s.frames.includes(end)) end++
    if (end > current) {
      s.positionSeconds = Math.min(bufferSpec.durationSeconds, end / bufferSpec.fps,
        Math.round((s.positionSeconds + bufferSpec.tickSeconds * s.settings.playbackRate) * 1e9) / 1e9)
      const consumed = s.frames.filter(frame => (frame + 1) / bufferSpec.fps <= s.positionSeconds + 1e-9)
      s.presentedFrames += consumed.length
      s.releasedFrames += consumed.length
      s.frames = s.frames.filter(frame => !consumed.includes(frame))
    }
  }

  const packetTarget = Math.min(bufferSpec.encodedBudgetPackets, Math.ceil(s.settings.encodedSeconds * bufferSpec.fps))
  for (let count = 0; s.initialized && count < bufferSpec.demuxPacketsPerTick && s.packets.length < packetTarget && s.extractCursor < totalFrames; count++) {
    const segment = s.cache.find(item => item.id === segmentOf(s.extractCursor))
    if (!segment) break
    segment.lastUsedTick = s.tick
    s.cacheHits++
    s.packets.push(s.extractCursor++)
  }
  const frameTarget = Math.min(bufferSpec.decodedBudgetFrames, Math.ceil(s.settings.decodedSeconds * bufferSpec.fps))
  while (s.packets.length && s.pending.length < bufferSpec.pendingBudget && s.frames.length + s.pending.length < frameTarget) {
    const frame = s.packets[0]
    if (frame !== s.decodeCursor) break // sequential dependency chain from a keyframe
    s.packets.shift()
    s.serviceAvailableAt = Math.max(now(s), s.serviceAvailableAt) + 1 / s.settings.decoderFps
    s.pending.push({ frame, generation: s.generation, readyAt: s.serviceAvailableAt + bufferSpec.outputDelaySeconds })
    s.decodeCursor++
  }
}

export function bufferReducer(state: BufferState, action: BufferAction): BufferState {
  if (action.type === 'reset') return createBufferState() // restores settings too
  const s = structuredClone(state)
  switch (action.type) {
    case 'advance': {
      const ticks = action.ticks ?? 1
      if (Number.isFinite(ticks)) for (let i = 0; i < Math.min(600, Math.max(0, Math.floor(ticks))); i++) advanceTick(s)
      break
    }
    case 'setting': {
      if (!Number.isFinite(action.value)) break
      const [min, max] = bufferSettingLimits[action.key]
      s.settings[action.key] = Math.max(min, Math.min(max, action.value))
      break
    }
    case 'pause': s.playbackPaused = !s.playbackPaused; break
    case 'stall': s.networkStalled = !s.networkStalled; break
    case 'seek': {
      if (!Number.isFinite(action.seconds)) break
      const frame = Math.floor(Math.max(0, Math.min(bufferSpec.durationSeconds, action.seconds)) * bufferSpec.fps)
      s.positionSeconds = frame / bufferSpec.fps
      s.generation++
      s.releasedFrames += s.frames.length
      s.discardedJobs += s.pending.length
      s.frames = []; s.pending = []; s.packets = []
      s.download = null // partial response canceled; complete reusable bytes survive
      s.extractCursor = keyframeOf(frame)
      s.decodeCursor = s.extractCursor
      s.serviceAvailableAt = now(s)
      s.lastSeekReusedSegments = s.cache.filter(item => item.id >= segmentOf(s.extractCursor) && item.id <= segmentOf(frame)).length
      break
    }
  }
  return s
}

export function bufferMetrics(s: BufferState) {
  const contiguousDuration = (ids: number[]) => {
    let end = Math.floor(s.positionSeconds * bufferSpec.fps + 1e-7)
    while (ids.includes(end)) end++
    return Math.max(0, Math.round((end / bufferSpec.fps - s.positionSeconds) * 1e9) / 1e9)
  }
  let segmentEnd = Math.floor(s.positionSeconds / bufferSpec.segmentSeconds)
  while (s.cache.some(item => item.id === segmentEnd)) segmentEnd++
  const downloadedAheadSeconds = Math.max(0, Math.round((segmentEnd * bufferSpec.segmentSeconds - s.positionSeconds) * 1e9) / 1e9)
  const decodedAheadSeconds = contiguousDuration(s.frames)
  return {
    simulationSeconds: now(s), cachedBytes: completeBytes(s), partialBytes: s.download?.bytes ?? 0,
    downloadedAheadSeconds, encodedSeconds: s.packets.length / bufferSpec.fps,
    encodedAheadSeconds: contiguousDuration(s.packets), decodedSeconds: s.frames.length / bufferSpec.fps,
    decodedAheadSeconds, encodedBytes: s.packets.reduce((n, frame) => n + segmentBytes(segmentOf(frame)) / bufferSpec.framesPerSegment, 0),
    decodedBytes: s.frames.length * bufferSpec.frameBytes,
    reservedDecodedBytes: (s.frames.length + s.pending.length) * bufferSpec.frameBytes,
    playbackState: s.positionSeconds >= bufferSpec.durationSeconds ? 'ended' : s.playbackPaused ? 'paused' : decodedAheadSeconds > 0 ? 'ready' : 'starved',
    initializationState: s.initialized ? 'ready' : 'missing initialization metadata',
    dependencyStartSeconds: keyframeOf(Math.floor(s.positionSeconds * bufferSpec.fps)) / bufferSpec.fps,
  }
}
