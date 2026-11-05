import test from 'node:test'
import assert from 'node:assert/strict'
import { formats, formatIds, flatten, findElement } from '../src/data/containers.ts'
import { binaryExamples, boxSize, decodeTimes, matroskaTimeNs, mp4SampleOffset } from '../src/data/containerExamples.ts'

test('every format has unique, inspectable nodes and valid specification links', () => {
  for (const id of formatIds) {
    const nodes = flatten(formats[id].root)
    assert.ok(nodes.length > 15, `${id} reference is unexpectedly sparse`)
    assert.equal(new Set(nodes.map(node => node.id)).size, nodes.length, `${id} has ambiguous IDs`)
    for (const node of nodes) {
      assert.equal(findElement(id, node.id), node)
      assert.match(node.spec, /^https:\/\//)
      assert.ok(node.purpose && node.layout && node.practical)
    }
  }
  assert.ok(findElement('mp4', 'stts'))
  assert.ok(findElement('fmp4', 'trun'))
  assert.ok(findElement('mkv', 'Cluster'))
  assert.equal(findElement('webm', 'Attachments'), undefined)
})

test('shown binary layouts have exact size headers and well-formed hex', () => {
  for (const example of binaryExamples) {
    for (const field of example.fields) assert.match(field.hex, /^(?:[0-9a-f]{2})(?: [0-9a-f]{2})*$/)
    const bytes = boxSize(example)
    if (example.family === 'iso') {
      const declared = Number.parseInt(example.fields[0].hex.replaceAll(' ', ''), 16)
      assert.equal(declared, bytes, `${example.id} size field`)
      const fourcc = example.fields[1].hex.split(' ').map(byte => String.fromCharCode(Number.parseInt(byte, 16))).join('')
      assert.equal(fourcc, example.id)
    }
  }
  assert.equal(boxSize(binaryExamples.find(example => example.id === 'ebml')), 8)
  assert.equal(boxSize(binaryExamples.find(example => example.id === 'simpleblock')), 9)
})

test('sample decode times, byte offsets, and Matroska relative timestamps', () => {
  assert.deepEqual(decodeTimes([1000, 1000, 1000, 1000]), [0, 1000, 2000, 3000])
  assert.deepEqual(decodeTimes([1000, 1000], 2000), [2000, 3000])
  assert.equal(mp4SampleOffset(1024, [100, 120, 80, 90], 3), 1244)
  assert.equal(mp4SampleOffset(4096 + 128, [100, 120], 2), 4324)
  assert.equal(matroskaTimeNs(2000, 40, 1_000_000), 2_040_000_000)
})
