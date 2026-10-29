import { bufferReducer, createBufferState } from './bufferModel.ts'
import type { BufferAction, BufferState } from './bufferModel.ts'

export const bufferScenarios = [
  { id: 'initialization', label: 'Bytes await init', explanation: 'A complete segment is cached, but initialization metadata is still missing. Advance 0.1 s twice to see submissions; ready frames arrive later.' },
  { id: 'asynchronous', label: 'Packets await output', explanation: 'Initialization is ready and packets have been submitted, but no frame is ready yet. Step 0.1 s to observe asynchronous output. Playback is paused so preparation can fill independently.' },
  { id: 'seek', label: 'Seek with cached bytes', explanation: 'Prepared at 0 s, then sought to 3 s. Cached downloads remain while packets, frames, and old jobs are invalidated. Advance to decode from the 0 s keyframe and release preroll. Playback is paused for inspection.' },
  { id: 'stall', label: 'Starve on a network stall', explanation: 'The network stalled after five engine seconds; existing buffers then drained. Restore the network and advance or run the simulation to recover.' },
] as const
export type BufferScenarioId = typeof bufferScenarios[number]['id']

export function createBufferScenario(id: BufferScenarioId): BufferState {
  let s = createBufferState()
  const act = (action: BufferAction) => { s = bufferReducer(s, action) }
  if (id !== 'stall') act({ type: 'pause' })
  switch (id) {
    case 'initialization': act({ type: 'advance', ticks: 10 }); break
    case 'asynchronous': act({ type: 'advance', ticks: 12 }); break
    case 'seek':
      act({ type: 'advance', ticks: 100 })
      act({ type: 'seek', seconds: 3 })
      break
    case 'stall':
      act({ type: 'advance', ticks: 50 })
      act({ type: 'stall' })
      act({ type: 'advance', ticks: 180 })
      break
  }
  return s
}

export function bufferDemoReducer(state: BufferState, action: BufferAction | { type: 'scenario'; id: BufferScenarioId }) {
  return action.type === 'scenario' ? createBufferScenario(action.id) : bufferReducer(state, action)
}
