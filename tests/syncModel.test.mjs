import test from 'node:test'
import assert from 'node:assert/strict'
import { compositionAtOutput, performanceDeadline, syncFrames } from '../src/components/webcodecs/syncModel.ts'

test('output timestamp mapping handles origins, seconds/ms, rates and deadline inversion', () => {
  const anchor = { contextSeconds: 10, compositionSeconds: 3, rate: 2 }
  assert.ok(Math.abs(compositionAtOutput(11, 20000, 20020, anchor) - 5.04) < 1e-9)
  for (const pts of [0, 2, 5.04, 8]) {
    const deadline = performanceDeadline(pts, 11, 20000, anchor)
    assert.ok(Math.abs(compositionAtOutput(11, 20000, deadline, anchor) - pts) < 1e-9)
  }
})

test('decode delay causes late/drop outcomes; latency moves preparation, not PTS deadlines', () => {
  const normal = syncFrames(8, { latency: 0.08, decodeDelay: 0.18 })
  assert.ok(normal.some(f => f.status === 'on time') && normal.some(f => f.status === 'late'))
  const delayed = syncFrames(8, { latency: 0.08, decodeDelay: 0.28 })
  assert.ok(delayed.some(f => f.status === 'late') && delayed.some(f => f.status === 'dropped'))
  const ahead = syncFrames(8, { latency: 0.24, decodeDelay: 0.28 })
  assert.ok(ahead.every(f => f.status === 'on time'))
  assert.deepEqual(ahead.map(f => f.pts), delayed.map(f => f.pts))
  assert.equal(syncFrames(0, { latency: 0, decodeDelay: 0.6 })[0].status, 'decoding')
  assert.equal(syncFrames(0, { latency: 0.4, decodeDelay: 0 })[1].status, 'queued')
})

test('policy boundaries, repeatable scrubbing, delayed decisions and display holding', () => {
  const settings = { latency: 0, decodeDelay: 0.21 }
  assert.equal(syncFrames(1, settings)[0].status, 'late', 'exact 60 ms accepted')
  assert.equal(syncFrames(1, { ...settings, decodeDelay: 0.211 })[0].status, 'dropped')
  assert.equal(syncFrames(0.04, settings)[0].status, 'decoding')
  assert.equal(syncFrames(0.06, settings)[0].status, 'late')
  const copy = structuredClone(settings)
  for (let step = 0; step <= 400; step++) {
    const frames = syncFrames(step / 50, settings)
    assert.equal(frames.length, 80)
    for (const f of frames) {
      if (['on time', 'late', 'dropped'].includes(f.status)) assert.ok(f.decision <= step / 50 + 1e-9)
      assert.ok(f.ready >= f.submitted && f.decision >= f.pts)
    }
  }
  assert.deepEqual(settings, copy)
  assert.deepEqual(syncFrames(2, settings), syncFrames(2, copy))
})

test('displayed scheduling snippet drops expired frames, draws newest due frame, and cleans owned frames', async () => {
  const ts = await import('typescript')
  const { syncExample } = await import('../src/data/syncExample.ts')
  const js = ts.transpileModule(syncExample, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
  const { startVideoClock } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
  const oldRaf = globalThis.requestAnimationFrame
  const oldCancel = globalThis.cancelAnimationFrame
  let callback, canceled, nextId = 0
  globalThis.requestAnimationFrame = cb => { callback = cb; return ++nextId }
  globalThis.cancelAnimationFrame = id => { canceled = id }
  const frame = timestamp => ({ timestamp, closed: 0, close() { this.closed++ } })
  try {
    const expired = frame(1900000), superseded = frame(1960000), current = frame(1999000), future = frame(2100000)
    const queue = [expired, superseded, current, future]
    const drawn = []
    const audio = { state: 'running', getOutputTimestamp: () => ({ contextTime: 12, performanceTime: performance.now() }) }
    const stop = startVideoClock(audio, { drawImage: f => drawn.push(f) }, { contextSeconds: 10, compositionSeconds: 0, rate: 1 }, queue)
    callback()
    assert.deepEqual(drawn, [current])
    assert.deepEqual([expired.closed, superseded.closed, current.closed, future.closed], [1, 1, 1, 0])
    assert.deepEqual(queue, [future])
    audio.state = 'suspended'
    callback()
    assert.deepEqual(queue, [future])
    stop()
    assert.equal(canceled, nextId)
    assert.equal(future.closed, 1)
    assert.equal(queue.length, 0)
    callback() // even an already queued callback cannot restart after cleanup
    assert.equal(canceled, nextId)
    const unavailable = frame(0)
    audio.state = 'running'
    audio.getOutputTimestamp = () => ({ contextTime: 0, performanceTime: 0 })
    const clean = startVideoClock(audio, { drawImage: () => assert.fail('invalid clock drew a frame') }, { contextSeconds: 10, compositionSeconds: 0, rate: 1 }, [unavailable])
    callback()
    assert.equal(unavailable.closed, 0)
    clean()
    assert.equal(unavailable.closed, 1)
  } finally {
    if (oldRaf === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = oldRaf
    if (oldCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = oldCancel
  }
})
