import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { apiEntries } from '../src/data/webcodecs.ts'
import { audioPipelineExamples } from '../src/data/audioPipelineExamples.ts'

async function loadExample(code) {
  const js = ts.transpileModule(code, { compilerOptions: {
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext,
  } }).outputText
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
}

test('index output-clock example rejects unavailable, suspended, startup, future and stale clocks', async () => {
  const code = apiEntries.find(e => e.id === 'audio-output-timestamp').example.code
  const { audibleContextSeconds } = await loadExample(code + '\nexport { audibleContextSeconds };')
  const context = { state: 'running', getOutputTimestamp: () => ({ contextTime: 12, performanceTime: 1000 }) }
  assert.equal(audibleContextSeconds(context, 1020), 12.02)
  assert.equal(audibleContextSeconds(context, 999), null)
  assert.equal(audibleContextSeconds(context, 1250), null)
  context.state = 'suspended'
  assert.equal(audibleContextSeconds(context, 1020), null)
  context.state = 'running'
  for (const pair of [{}, { contextTime: 0, performanceTime: 1000 }, { contextTime: 12, performanceTime: 0 }]) {
    context.getOutputTimestamp = () => pair
    assert.equal(audibleContextSeconds(context, 1020), null)
  }
  assert.equal(audibleContextSeconds({ state: 'running' }, 1020), null)
})

test('displayed worklet preserves stereo order across wrap, rejects overflow, fills underruns and stops', async () => {
  const originalProcessor = globalThis.AudioWorkletProcessor
  const originalRegister = globalThis.registerProcessor
  let Queue
  globalThis.AudioWorkletProcessor = class { port = { onmessage: null, close() {} } }
  globalThis.registerProcessor = (_name, constructor) => { Queue = constructor }
  try {
    await loadExample(audioPipelineExamples[3].code)
    const queue = new Queue()
    const supply = (length, start = 1) => queue.port.onmessage({ data: [
      Float32Array.from({ length }, (_, i) => start + i),
      Float32Array.from({ length }, (_, i) => -start - i),
    ] })
    const render = length => {
      const output = [new Float32Array(length), new Float32Array(length)]
      return { output, alive: queue.process([], [output]) }
    }
    supply(150)
    let result = render(64)
    assert.deepEqual([...result.output[0]], Array.from({ length: 64 }, (_, i) => i + 1))
    assert.deepEqual([...result.output[1]], Array.from({ length: 64 }, (_, i) => -i - 1))
    result = render(192)
    assert.deepEqual([...result.output[0].slice(0, 86)], Array.from({ length: 86 }, (_, i) => 65 + i))
    assert.ok(result.output.every(channel => channel.slice(86).every(value => value === 0)))
    assert.ok(result.alive)
    for (let i = 0; i < 4; i++) supply(4096, i * 4096 + 1)
    supply(1, 99999) // Reject a whole block when full.
    const samples = []
    for (let i = 0; i < 64; i++) samples.push(...render(256).output[0])
    assert.deepEqual(samples, Array.from({ length: 16384 }, (_, i) => i + 1))
    supply(4097) // Reject oversized messages.
    assert.ok(render(64).output.every(channel => channel.every(value => value === 0)))
    supply(10, 5)
    assert.deepEqual([...render(64).output[0].slice(0, 10)], Array.from({ length: 10 }, (_, i) => i + 5))
    queue.port.onmessage({ data: 'stop' })
    assert.equal(render(64).alive, false)
  } finally {
    if (originalProcessor === undefined) delete globalThis.AudioWorkletProcessor
    else globalThis.AudioWorkletProcessor = originalProcessor
    if (originalRegister === undefined) delete globalThis.registerProcessor
    else globalThis.registerProcessor = originalRegister
  }
})
