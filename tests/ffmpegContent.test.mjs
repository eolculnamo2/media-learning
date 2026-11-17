import test from 'node:test'
import assert from 'node:assert/strict'
import { annotateCommand, illustrativeSeekPoint, options, recipes, scenarios, stages, tokenize } from '../src/data/ffmpeg.ts'

test('scenarios preserve packet/frame boundaries and bypass rules', () => {
  const ids = new Set(Object.keys(stages))
  for (const scenario of scenarios) {
    for (const path of [scenario.video, scenario.audio].filter(Boolean)) {
      assert.ok(path.every(id => ids.has(id)))
      assert.equal(path[0], 'input')
      assert.equal(path.at(-1), 'output')
      if (path.includes('filter')) assert.ok(path.indexOf('decode') < path.indexOf('filter') && path.indexOf('filter') < path.indexOf('encode'))
    }
  }
  const copy = scenarios.find(s => s.id === 'copy')
  assert.ok(!copy.video.includes('decode') && !copy.video.includes('encode'))
  const mixed = scenarios.find(s => s.id === 'mixed')
  assert.ok(mixed.video.includes('decode') && !mixed.audio.includes('decode'))
})

test('reference and recipes have unique keys and valid related options', () => {
  assert.ok(options.length >= 40 && recipes.length >= 25)
  assert.equal(new Set(options.map(o => o.key)).size, options.length)
  assert.equal(new Set(recipes.map(r => r.id)).size, recipes.length)
  const keys = new Set(options.map(o => o.key))
  for (const r of recipes) {
    assert.match(r.command, /^ff(mpeg|probe) /)
    assert.ok(r.process && r.caveat)
    for (const key of r.related) assert.ok(keys.has(key), `${r.id}: missing ${key}`)
  }
})

test('command tokenizer keeps quoted filtergraphs and paths intact', () => {
  assert.deepEqual(tokenize('ffmpeg -i input.mp4 -filter_complex "[0:v][1:v]overlay=20:20[v]" output.mp4'), ['ffmpeg','-i','input.mp4','-filter_complex','"[0:v][1:v]overlay=20:20[v]"','output.mp4'])
})

test('command annotations respect seek placement and audio copy bypass', () => {
  const inputSeek = annotateCommand('ffmpeg -ss 00:01:30 -i input.mp4 -c:v libx264 -c:a copy output.mp4')
  assert.equal(inputSeek.find(x => x.key === '-ss').scope, 'input option, before -i')
  assert.equal(inputSeek.find(x => x.text === '-c:a copy').stage, 'packet')
  assert.equal(inputSeek.find(x => x.text === '-c:v libx264').stage, 'encode')
  const outputSeek = annotateCommand('ffmpeg -i input.mp4 -ss 00:01:30 output.mp4')
  assert.equal(outputSeek.find(x => x.key === '-ss').scope, 'output option, after -i')
  const secondInput = annotateCommand('ffmpeg -i first.mp4 -ss 10 -i second.mp4 output.mp4')
  assert.equal(secondInput.find(x => x.key === '-ss').scope, 'input option, before -i')
})

test('seek lab locates illustrative prior access point', () => {
  assert.equal(illustrativeSeekPoint(6.4, 4), 4)
  assert.equal(illustrativeSeekPoint(8, 4), 8)
  assert.equal(illustrativeSeekPoint(0.2, 4), 0)
})
