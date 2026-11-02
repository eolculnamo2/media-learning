import test from 'node:test'
import assert from 'node:assert/strict'
import { expandSegmentTimeline, inspectHls, makeFrames, makeRepresentations } from '../src/components/manifests/model.ts'

test('SegmentTimeline repeat counts additional references and resolves Time URLs', () => {
  const refs = expandSegmentTimeline([{ t: 0, d: 2000, r: 2 }, { d: 3000 }], 1000, 'chunk-$Time$.m4s')
  assert.deepEqual(refs.map((ref) => [ref.number, ref.time, ref.seconds, ref.url]), [
    [1, 0, 0, 'chunk-0.m4s'], [2, 2000, 2, 'chunk-2000.m4s'],
    [3, 4000, 4, 'chunk-4000.m4s'], [4, 6000, 6, 'chunk-6000.m4s'],
  ])
})

test('invalid timeline values report errors', () => {
  assert.throws(() => expandSegmentTimeline([{ d: 0 }], 1000, 'x'), /d must be/)
  assert.throws(() => expandSegmentTimeline([{ d: 2000, r: -1 }], 1000, 'x'), /negative repeats/)
  assert.throws(() => expandSegmentTimeline([{ d: 2000 }], 0, 'x'), /timescale/)
})

test('HLS sample media playlist derives segment intervals and rejects incomplete entries', () => {
  const parsed = inspectHls('#EXTM3U\n#EXT-X-TARGETDURATION:3\n#EXTINF:2,\na.ts\n#EXTINF:3,\nb.ts')
  assert.deepEqual(parsed.tracks[0].segments, [{ start: 0, duration: 2, url: 'a.ts' }, { start: 2, duration: 3, url: 'b.ts' }])
  assert.throws(() => inspectHls('#EXTM3U\n#EXTINF:2,'), /needs a segment URI/)
})

test('misalignment moves boundaries and dependent entry needs previous reference', () => {
  const reps = makeRepresentations({ segmentDuration: 2, gopDuration: 1, count: 3, aligned: false, independent: false, closedGop: true })
  assert.notEqual(reps[0].segments[0].start, reps[1].segments[0].start)
  assert.equal(reps[1].segments[0].frames[0].kind, 'P')
  assert.deepEqual(reps[1].segments[0].frames[0].references, ['previous segment'])
})

test('a B picture is presented before its forward reference but decoded after it', () => {
  const frames = makeFrames(0, 2, 1, true, true)
  assert.equal(frames[1].kind, 'B')
  assert.ok(frames[1].pts < frames[3].pts)
  assert.ok(frames[1].dts > frames[3].dts)
  assert.ok(frames[1].references.includes('f3'))
})
