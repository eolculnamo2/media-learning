import test from 'node:test'
import assert from 'node:assert/strict'
import { rgbToYCbCr, yCbCrToRgb, chromaDimensions, chromaIndex, frameLayout, frameBytes, limitedY, expandLimitedY, toneMap } from '../src/components/color/colorModel.ts'

test('RGB ↔ Y′CbCr round trips under every matrix', () => {
  for (const matrix of ['bt601', 'bt709', 'bt2020']) for (const rgb of [[0,0,0],[1,1,1],[1,0,0],[0.13,0.7,0.91]]) {
    const decoded = yCbCrToRgb(rgbToYCbCr(rgb, matrix), matrix)
    decoded.forEach((v, i) => assert.ok(Math.abs(v - rgb[i]) < 1e-12))
  }
  assert.ok(Math.abs(rgbToYCbCr([1,0,0], 'bt709')[0] - .2126) < 1e-12)
})
test('4:2:0 shares one chroma sample per 2×2 luma block', () => {
  assert.deepEqual(chromaDimensions(5,3,'420'), [3,2])
  assert.equal(chromaIndex(0,0,5,3,'420'), chromaIndex(1,1,5,3,'420'))
  assert.notEqual(chromaIndex(1,1,5,3,'420'), chromaIndex(2,1,5,3,'420'))
  assert.equal(chromaIndex(1,0,5,3,'422'), chromaIndex(0,0,5,3,'422'))
  assert.notEqual(chromaIndex(0,0,5,3,'422'), chromaIndex(0,1,5,3,'422'))
})
test('plane dimensions and tight frame sizes account for bytes per stored sample', () => {
  assert.deepEqual(frameLayout(4,4,'yuv420p').map(p => [p.width,p.height,p.offset,p.bytes]), [[4,4,0,16],[2,2,16,4],[2,2,20,4]])
  assert.deepEqual(frameLayout(4,4,'nv12').map(p => [p.name,p.bytes]), [['Y',16],['UV interleaved',8]])
  assert.equal(frameBytes(4,4,'p010le'), 48)
  assert.equal(frameBytes(4,4,'yuv420p10le'), 48)
  assert.equal(frameBytes(4,4,'rgb24'), 48)
  assert.equal(frameBytes(5,3,'yuv420p'), 27)
})
test('limited range maps nominal luma black and white', () => {
  assert.ok(Math.abs(limitedY(0) - 16/255) < 1e-12)
  assert.ok(Math.abs(limitedY(1) - 235/255) < 1e-12)
  assert.ok(Math.abs(limitedY(1,10) - 940/1023) < 1e-12)
  for (const v of [0,.2,.5,1]) assert.ok(Math.abs(expandLimitedY(limitedY(v)) - v) < 1e-12)
})
test('educational tone curves are bounded, zero-preserving, and monotonic', () => {
  for (const strategy of ['clip','soft knee','compress']) {
    let last = 0
    for (let v = 0; v <= 4000; v += 10) {
      const mapped = toneMap(v, 1000, 100, 0, .6, strategy)
      assert.ok(Number.isFinite(mapped) && mapped >= last - 1e-10 && mapped <= 100)
      last = mapped
    }
    assert.equal(toneMap(0,1000,100,0,.6,strategy), 0)
  }
})
