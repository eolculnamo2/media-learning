import test from 'node:test'
import assert from 'node:assert/strict'
import { clips, clipSnapshot, initialClipSettings, sourceToComposition, compositionToSource, nextClipPackets } from '../src/components/webcodecs/clipModel.ts'
import { architectureNodes, architectureEdges } from '../src/data/previewArchitecture.ts'

test('clip boundaries are continuous while source positions differ; endpoint is exclusive', () => {
  assert.equal(clipSnapshot(3.95, initialClipSettings).clip.id, 'A')
  assert.equal(clipSnapshot(3.95, initialClipSettings).source, 15.95)
  assert.equal(clipSnapshot(4, initialClipSettings).clip.id, 'B')
  assert.equal(clipSnapshot(4, initialClipSettings).source, 30)
  assert.ok(Math.abs(clipSnapshot(4.05, initialClipSettings).source - 30.05) < 1e-9)
  assert.equal(clipSnapshot(8, initialClipSettings).ended, true)
  assert.equal(sourceToComposition(clips[0], 16), sourceToComposition(clips[1], 30))
  assert.equal(sourceToComposition(clips[1], 30.25), 4.25)
  for (const clip of clips) for (let i = 0; i <= 80; i++) {
    const p = clip.start + i / 20
    assert.ok(Math.abs(sourceToComposition(clip, compositionToSource(clip, p)) - p) < 1e-9)
  }
})

test('independent readiness, early preparation, exact boundary and recovery are deterministic', () => {
  const initial = structuredClone(initialClipSettings)
  assert.equal(clipSnapshot(2, initial).videoPhase, 'waiting')
  const early = clipSnapshot(3, initial)
  assert.equal(early.clip.id, 'A')
  assert.equal(early.audioPhase, 'ready')
  assert.equal(early.videoPhase, 'preparing')
  assert.equal(clipSnapshot(4, initial).seamless, true)
  const missed = { lead: 0.25, videoDelay: 2, audioDelay: 0.1 }
  assert.equal(clipSnapshot(4, missed).audioAvailable, true)
  assert.equal(clipSnapshot(4, missed).videoAvailable, false)
  assert.equal(clipSnapshot(4, missed).seamless, false)
  assert.equal(clipSnapshot(5.75, missed).videoAvailable, true)
  assert.equal(clipSnapshot(4, { ...missed, lead: 2 }).seamless, true)
  assert.equal(clipSnapshot(4, { lead: 0.25, videoDelay: 0.2, audioDelay: 2 }).audioAvailable, false)
  for (let tick = 0; tick <= 160; tick++) {
    const s = clipSnapshot(tick / 20, initial)
    assert.ok(s.videoProgress >= 0 && s.videoProgress <= 1)
    assert.ok(s.audioProgress >= 0 && s.audioProgress <= 1)
  }
  assert.deepEqual(initial, initialClipSettings)
  assert.deepEqual(clipSnapshot(3, initial), early)
})

test('decode sequence differs from presentation order and preroll maps before clip start', () => {
  assert.ok(nextClipPackets.every((p, i) => !i || p.dts > nextClipPackets[i - 1].dts))
  assert.ok(nextClipPackets[1].pts > nextClipPackets[2].pts)
  assert.equal(sourceToComposition(clips[1], nextClipPackets[0].pts), 3.5)
  const mapped = nextClipPackets.filter(p => p.pts >= 30).map(p => sourceToComposition(clips[1], p.pts)).sort()
  mapped.forEach((p, i) => assert.ok(Math.abs(p - [4, 4.1, 4.2][i]) < 1e-9))
})

test('architecture paths resolve and explicit and optional decoding reach both outputs', () => {
  const ids = new Set(architectureNodes.map(n => n.id))
  for (const e of architectureEdges) assert.ok(ids.has(e.from) && ids.has(e.to))
  function reaches(from, to, seen = new Set()) {
    if (from === to) return true
    if (seen.has(from)) return false
    seen.add(from)
    return architectureEdges.filter(e => e.from === from && e.kind === 'data').some(e => reaches(e.to, to, seen))
  }
  for (const via of ['decode', 'samples']) {
    assert.ok(reaches('cache', via))
    assert.ok(reaches(via, 'canvas'))
    assert.ok(reaches(via, 'audio'))
  }
  assert.equal(architectureNodes.flatMap(n => n.responsibilities).length, 24)
})
