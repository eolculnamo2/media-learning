import test from 'node:test'
import assert from 'node:assert/strict'
import { bufferMetrics, bufferReducer as reduce, bufferSpec as spec, createBufferState, segmentBytes } from '../src/components/webcodecs/bufferModel.ts'

const advance = (state, ticks = 1) => reduce(state, { type: 'advance', ticks })
const setting = (state, key, value) => reduce(state, { type: 'setting', key, value })
function invariants(s) {
  const m = bufferMetrics(s)
  assert.ok(s.positionSeconds >= 0 && s.positionSeconds <= spec.durationSeconds)
  assert.ok(m.cachedBytes + m.partialBytes <= spec.cacheBudgetBytes)
  assert.ok(s.packets.length <= spec.encodedBudgetPackets)
  assert.ok(s.pending.length <= spec.pendingBudget)
  assert.ok(s.frames.length + s.pending.length <= spec.decodedBudgetFrames)
  assert.equal(m.decodedBytes, s.frames.length * 1280 * 720 * 4)
  assert.equal(m.reservedDecodedBytes, (s.frames.length + s.pending.length) * spec.frameBytes)
  assert.equal(m.encodedSeconds, s.packets.length / spec.fps)
  assert.equal(m.cachedBytes, s.cache.reduce((n, item) => n + segmentBytes(item.id), s.initialized ? spec.initBytes : 0))
  for (const list of [s.packets, s.frames, s.pending.map(job => job.frame), s.cache.map(item => item.id)]) assert.equal(new Set(list).size, list.length)
  assert.ok(s.pending.every(job => job.generation === s.generation && job.readyAt > m.simulationSeconds - 1e-9))
  for (const value of Object.values(m)) if (typeof value === 'number') assert.ok(Number.isFinite(value) && value >= 0)
}

test('repeatable ticks, pure transitions, full reset, and fractional tick accumulation', () => {
  const initial = createBufferState()
  const copy = structuredClone(initial)
  assert.deepEqual(advance(initial, 100), advance(initial, 100))
  assert.deepEqual(initial, copy)
  let stepped = initial
  for (let i = 0; i < 100; i++) stepped = advance(stepped)
  assert.deepEqual(stepped, advance(initial, 100))
  assert.deepEqual(reduce(setting(stepped, 'decoderFps', 1), { type: 'reset' }), initial)
})

test('completed bytes wait for initialization; submissions precede callback output', () => {
  let s = reduce(createBufferState(), { type: 'pause' })
  s = advance(s, 10)
  assert.ok(s.cache.length > 0 && !s.initialized)
  assert.equal(s.packets.length + s.pending.length + s.frames.length, 0)
  while (!s.pending.length) s = advance(s)
  assert.equal(s.frames.length, 0)
  assert.ok(s.pending.every(job => job.readyAt > bufferMetrics(s).simulationSeconds))
  s = advance(s, 80)
  assert.equal(s.positionSeconds, 0)
  assert.equal(s.frames.length, 10)
  assert.equal(s.packets.length, 30)
  assert.ok(bufferMetrics(s).downloadedAheadSeconds >= 8)
  invariants(s)
})

test('seek retains complete bytes, cancels partial requests and old work, and requires keyframe preroll', () => {
  let s = advance(reduce(createBufferState(), { type: 'pause' }), 80)
  s = setting(s, 'decodedSeconds', 3)
  s = advance(s)
  assert.ok(s.frames.length && s.pending.length)
  const cache = structuredClone(s.cache)
  const generation = s.generation
  const transferred = s.downloadedBytes
  s = reduce(s, { type: 'stall' }) // isolate reuse from new prefetch downloads
  s = reduce(s, { type: 'seek', seconds: 3 })
  assert.deepEqual(s.cache, cache)
  assert.equal(s.generation, generation + 1)
  assert.equal(s.frames.length + s.pending.length + s.packets.length, 0)
  assert.equal(s.download, null)
  assert.equal(s.decodeCursor, 0)
  assert.equal(s.lastSeekReusedSegments, 2)
  s = advance(s)
  assert.equal(s.pending[0].frame, 0)
  assert.equal(s.pending[0].generation, generation + 1)
  assert.equal(s.frames.length, 0)
  s = advance(s, 120)
  assert.ok(s.frames.length && s.frames.every(frame => frame >= 30))
  assert.equal(s.downloadedBytes, transferred)
  assert.ok(s.releasedFrames >= 30)
  invariants(s)
  s = reduce(s, { type: 'seek', seconds: 13.7 })
  assert.equal(s.decodeCursor, 120)
  assert.equal(bufferMetrics(s).dependencyStartSeconds, 12)
})

test('stalls preserve request progress; buffers drain independently and playback recovers', () => {
  let s = advance(createBufferState(), 45)
  assert.ok(s.positionSeconds > 0)
  s = reduce(s, { type: 'stall' })
  const downloaded = s.downloadedBytes
  let sawDrain = false
  for (let i = 0; i < 300; i++) {
    const before = s.positionSeconds
    s = advance(s)
    sawDrain ||= s.positionSeconds > before
    assert.equal(s.downloadedBytes, downloaded)
    invariants(s)
  }
  assert.ok(sawDrain)
  assert.equal(bufferMetrics(s).playbackState, 'starved')
  const stalledAt = s.positionSeconds
  s = advance(reduce(s, { type: 'stall' }), 80)
  assert.ok(s.positionSeconds > stalledAt)
  assert.ok(s.downloadedBytes > downloaded)
})

test('latency, throughput, targets, decoder service, and playback rate affect their own stages', () => {
  assert.equal(advance(setting(createBufferState(), 'throughputBytesPerSecond', 0), 40).downloadedBytes, 0)
  assert.equal(advance(setting(createBufferState(), 'latencySeconds', 3), 20).downloadedBytes, 0)
  const paused = reduce(createBufferState(), { type: 'pause' })
  const small = advance(setting(setting(paused, 'encodedSeconds', 0.5), 'decodedSeconds', 0.3), 150)
  const large = advance(setting(setting(paused, 'encodedSeconds', 6), 'decodedSeconds', 2), 150)
  assert.equal(small.frames.length, 3)
  assert.equal(small.packets.length, 5)
  assert.equal(large.frames.length, 20)
  assert.equal(large.packets.length, 60)
  assert.ok(advance(setting(paused, 'prefetchSeconds', 2), 150).cache.length < advance(setting(paused, 'prefetchSeconds', 12), 150).cache.length)
  assert.ok(advance(setting(paused, 'decoderFps', 1), 30).frames.length < advance(setting(paused, 'decoderFps', 60), 30).frames.length)
  const prepared = advance(paused, 100)
  const slow = advance(reduce(setting(prepared, 'playbackRate', 0.25), { type: 'pause' }), 10)
  const fast = advance(reduce(setting(prepared, 'playbackRate', 2), { type: 'pause' }), 10)
  assert.ok(fast.positionSeconds > slow.positionSeconds)
})

test('budgets, cache eviction/refetch, target reductions, end of stream and malformed numeric actions', () => {
  let s = setting(setting(setting(createBufferState(), 'prefetchSeconds', 12), 'encodedSeconds', 8), 'decodedSeconds', 3)
  s = setting(s, 'playbackRate', 0.25)
  for (let i = 0; i < 1000; i++) {
    if (i % 137 === 0) s = reduce(s, { type: 'seek', seconds: (i * 7 % 200) / 10 })
    if (i % 71 === 0) s = reduce(s, { type: 'stall' })
    if (i % 89 === 0) s = reduce(s, { type: 'pause' })
    if (i % 101 === 0) s = setting(s, 'decodedSeconds', i % 2 ? 0.1 : 3)
    s = advance(s)
    invariants(s)
  }
  const completed = advance(createBufferState(), 600)
  assert.equal(bufferMetrics(completed).playbackState, 'ended')
  assert.equal(completed.presentedFrames, 200)
  assert.equal(completed.frames.length + completed.pending.length + completed.packets.length, 0)
  assert.ok(!completed.cache.some(item => item.id === 0), 'old cache is evicted')
  const transferred = completed.downloadedBytes
  const reopened = advance(reduce(completed, { type: 'seek', seconds: 0 }), 20)
  assert.ok(reopened.downloadedBytes > transferred)
  assert.ok(reopened.positionSeconds > 0)
  for (const action of [{ type: 'seek', seconds: NaN }, { type: 'advance', ticks: Infinity }, { type: 'setting', key: 'decoderFps', value: NaN }]) assert.deepEqual(reduce(s, action), s)
  invariants(reduce(s, { type: 'seek', seconds: -100 }))
  assert.equal(reduce(s, { type: 'seek', seconds: 100 }).positionSeconds, 20)
})

test('seek cancels an incomplete response without committing its bytes to reusable cache', () => {
  let s = createBufferState()
  for (let i = 0; i < 100; i++) {
    s = advance(s)
    if (s.cache.length && s.download && s.download.bytes > 0 && s.download.id >= 0) break
  }
  assert.ok(s.download && s.download.bytes > 0)
  const partialId = s.download.id
  const transferred = s.downloadedBytes
  const complete = structuredClone(s.cache)
  s = reduce(s, { type: 'seek', seconds: 13 })
  assert.equal(s.download, null)
  assert.equal(bufferMetrics(s).partialBytes, 0)
  assert.deepEqual(s.cache, complete)
  assert.ok(!s.cache.some(item => item.id === partialId))
  assert.equal(s.downloadedBytes, transferred)
  invariants(advance(s, 80))
})

test('visualization scenarios expose init gating, delayed output, cached seek and recoverable starvation', async () => {
  const { createBufferScenario } = await import('../src/components/webcodecs/bufferScenarios.ts')
  const bytes = createBufferScenario('initialization')
  assert.ok(bytes.cache.length && !bytes.initialized)
  assert.equal(bytes.packets.length + bytes.pending.length + bytes.frames.length, 0)
  const pending = createBufferScenario('asynchronous')
  assert.ok(pending.initialized && pending.packets.length && pending.pending.length)
  assert.equal(pending.frames.length, 0)
  assert.ok(advance(pending, 10).frames.length > 0)
  const sought = createBufferScenario('seek')
  const before = advance(reduce(createBufferState(), { type: 'pause' }), 100)
  assert.deepEqual(sought.cache, before.cache)
  assert.equal(sought.frames.length + sought.pending.length + sought.packets.length, 0)
  assert.ok(sought.lastSeekReusedSegments > 0 && sought.releasedFrames > 0)
  assert.equal(sought.decodeCursor, 0)
  const recovered = advance(reduce(sought, { type: 'stall' }), 100)
  assert.ok(recovered.frames.length > 0)
  assert.equal(recovered.downloadedBytes, sought.downloadedBytes)
  const stalled = createBufferScenario('stall')
  assert.equal(bufferMetrics(stalled).playbackState, 'starved')
  assert.ok(stalled.networkStalled)
  const restored = advance(reduce(stalled, { type: 'stall' }), 40)
  assert.ok(restored.positionSeconds > stalled.positionSeconds)
  for (const id of ['initialization', 'asynchronous', 'seek', 'stall']) {
    invariants(createBufferScenario(id))
    assert.deepEqual(createBufferScenario(id), createBufferScenario(id))
  }
})
