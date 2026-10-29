import { useReducer } from 'react'

const ranges = [[0, 8], [4, 12], [24, 32]] as const
const initialState = {
  range: 1,
  cached: [0],
  phase: 'ready' as 'ready' | 'pending' | 'disposed',
  message: 'One block is cached. Request [4, 12) to see a partial hit and a miss.',
  result: null as string | null,
}
type Action = { type: 'range'; index: number } | { type: 'read' | 'complete' | 'dispose' | 'reopen' | 'reset' }
function reducer(state: typeof initialState, action: Action): typeof initialState {
  const [start, end] = ranges[state.range]
  const needed = Array.from({ length: Math.ceil(end / 8) - Math.floor(start / 8) }, (_, index) => Math.floor(start / 8) + index)
  const missing = needed.filter(block => !state.cached.includes(block))
  const result = Array.from({ length: end - start }, (_, index) => start + index).join(', ')
  switch (action.type) {
    case 'range': return { ...state, range: action.index, result: null, message: 'Range selected. Read it through the source adapter.' }
    case 'read':
      if (state.phase !== 'ready') return state
      return missing.length
        ? { ...state, phase: 'pending', result: null, message: `Cache miss: awaiting ${missing.map(block => `[${block * 8}, ${block * 8 + 8})`).join(', ')}. The source read has not resolved.` }
        : { ...state, result, message: `Cache hit: read resolves with ${end - start} requested bytes, copied from existing blocks. No download.` }
    case 'complete':
      if (state.phase !== 'pending') return state
      return { ...state, phase: 'ready', cached: [...state.cached, ...missing].sort((a, b) => a - b), result,
        message: `Missing blocks downloaded and cached. read(${start}, ${end}) resolves with exactly ${end - start} bytes in order.` }
    case 'dispose': return { ...state, phase: 'disposed', result: null,
      message: state.phase === 'pending'
        ? 'Input disposed: pending loader aborted and read rejected. Completed cached blocks survive; canceled bytes were not added.'
        : 'Input disposed: the source is closed. Application-owned cached bytes survive.' }
    case 'reopen': return { ...state, phase: 'ready', result: null, message: 'New Input and CustomSource use the same immutable file and existing application cache.' }
    case 'reset': return initialState
  }
}

export function ByteCacheWalkthrough() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [start, end] = ranges[state.range]
  return <section className="webcodecs-cache-demo" aria-labelledby="byte-cache-heading">
    <h4 id="byte-cache-heading">Walk through a random-access cache read</h4>
    <p className="codec-viz-note">Deterministic illustration using a synthetic 32-byte file, eight-byte blocks,
      and byte values equal to offsets. No network, media parser, or timers run here.
      A new Input can reuse this cache only for the same unchanged file.</p>
    <div className="webcodecs-cache-blocks" aria-label="Application-owned cache blocks">
      {[0, 1, 2, 3].map(block => {
        const cached = state.cached.includes(block)
        const requested = start < block * 8 + 8 && end > block * 8
        return <div key={block} className={cached ? 'is-cached' : ''}>
          <strong>[{block * 8}, {block * 8 + 8})</strong>
          <span>{cached ? 'Cached' : 'Missing'}{requested ? ' · requested' : ''}</span>
          <small>{cached ? '8 bytes resident' : '0 bytes resident'}</small>
        </div>
      })}
    </div>
    <p><strong>Cache: {state.cached.length * 8} bytes</strong> · Requested range: {end - start} bytes · Source: {state.phase}</p>
    <label htmlFor="byte-cache-range">Requested file offsets (end exclusive)</label>{' '}
    <select id="byte-cache-range" value={state.range} disabled={state.phase !== 'ready'}
      onChange={event => dispatch({ type: 'range', index: Number(event.target.value) })}>
      {ranges.map(([a, b], index) => <option key={a} value={index}>[{a}, {b})</option>)}
    </select>
    <div className="webcodecs-pipeline-controls" role="group" aria-label="Byte cache walkthrough controls">
      <button type="button" disabled={state.phase !== 'ready'} onClick={() => dispatch({ type: 'read' })}>Read range</button>
      <button type="button" disabled={state.phase !== 'pending'} onClick={() => dispatch({ type: 'complete' })}>Complete miss</button>
      <button type="button" disabled={state.phase === 'disposed'} onClick={() => dispatch({ type: 'dispose' })}>Dispose input</button>
      <button type="button" disabled={state.phase !== 'disposed'} onClick={() => dispatch({ type: 'reopen' })}>New input, reuse cache</button>
      <button type="button" onClick={() => dispatch({ type: 'reset' })}>Reset cache example</button>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true">{state.message}</p>
    {state.result !== null && <p className="webcodecs-cache-result">Returned bytes: <code>{state.result}</code></p>}
    <p>A miss is resolved by application retrieval or rejected on failure/cancellation.
      Calling <code>Input.dispose()</code> invokes the source’s disposal callback;
      the adapter must abort its own loaders. There is no <code>CustomSource.append()</code> operation.</p>
  </section>
}
