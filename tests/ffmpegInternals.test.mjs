import assert from 'node:assert/strict'
import test from 'node:test'
import {
  declaration, definitions, flatten, formatSeconds, readStreamTime, release, search, tree,
} from '../src/data/ffmpeg-internals/model.ts'
import { constantNotes, explanations } from '../src/data/ffmpeg-internals/content.ts'

test('public AVStream declarations match the 9.0.2 header in order', () => {
  assert.equal(release, '9.0.2')
  assert.deepEqual(tree('AVStream').children.map(declaration), [
    'const AVClass *av_class;', 'int index;', 'int id;', 'AVCodecParameters *codecpar;',
    'void *priv_data;', 'AVRational time_base;', 'int64_t start_time;', 'int64_t duration;',
    'int64_t nb_frames;', 'int disposition;', 'enum AVDiscard discard;', 'AVRational sample_aspect_ratio;',
    'AVDictionary *metadata;', 'AVRational avg_frame_rate;', 'AVPacket attached_pic;',
    'int event_flags;', 'AVRational r_frame_rate;', 'int pts_wrap_bits;',
  ])
})

test('every field has educational content and every public data target resolves', () => {
  const constants = new Set()
  for (const [name, definition] of Object.entries(definitions)) {
    const root = tree(name)
    assert.deepEqual(root.children.filter(node => node.field).map(node => node.name), Object.keys(explanations[name] ?? {}), name)
    for (const node of root.children) {
      if (node.constant) constants.add(node.name)
      if (!node.field) continue
      assert.ok(node.explanation?.meaning && node.explanation?.use, node.path)
      for (const related of node.explanation.related ?? []) assert.ok(Object.hasOwn(definitions, related), related)
      if (/^(?:const )?(?:(?:struct|enum) )?AV\w+(?: \*+)?$/.test(node.field.cType)) {
        assert.ok(node.type, node.path)
      }
    }
  }
  for (const name of Object.keys(constantNotes)) assert.ok(constants.has(name), name)
})

test('the tree terminates explicitly at opaque types and recursive callbacks', () => {
  const root = tree('AVStream')
  const nodes = flatten(root)
  const paths = new Map(nodes.map(node => [node.path, node]))
  assert.equal(paths.size, nodes.length)
  assert.ok(nodes.length > 1000 && nodes.length < 1500)
  const metadata = paths.get('AVStream/metadata')
  assert.equal(definitions[metadata.type].kind, 'opaque')
  assert.equal(metadata.children.length, 0)
  const callback = paths.get('AVStream/av_class/child_class_iterate')
  assert.equal(callback.cycle, 'AVStream/av_class')
  assert.equal(callback.children.length, 0)
  const map = paths.get('AVStream/codecpar/ch_layout/u/map')
  assert.equal(map.kind, 'array')
  assert.deepEqual(map.children.map(node => node.name), ['id', 'name', 'opaque'])
})

test('concept searches lead to actionable field paths', () => {
  const nodes = flatten(tree('AVStream'))
  assert.equal(search(nodes, 'rotation')[0].path, 'AVStream/codecpar/coded_side_data')
  assert.equal(search(nodes, 'bitrate')[0].path, 'AVStream/codecpar/bit_rate')
  assert.equal(search(nodes, 'AVStream.codecpar.width')[0].path, 'AVStream/codecpar/width')
  assert.deepEqual(search(nodes, 'timestamp').slice(0, 5).map(node => node.name).sort(),
    ['dts', 'duration', 'pts', 'start_time', 'time_base'])
})

test('time-base arithmetic preserves signed 64-bit precision and validates sentinels', () => {
  const { num, den } = readStreamTime('180000', '1', '90000')
  assert.equal(formatSeconds(num, den), '2')
  assert.equal(formatSeconds(-1n, 3n), '−0.333333333333')
  const max = readStreamTime('9223372036854775807', '2147483647', '1')
  assert.equal(max.num, 9223372036854775807n * 2147483647n)
  for (const value of ['AV_NOPTS_VALUE', '-9223372036854775808']) assert.match(readStreamTime(value, '1', '90000').error, /Unknown/)
  assert.match(readStreamTime('1', '1', '0').error, /positive/)
  assert.match(readStreamTime('9223372036854775808', '1', '1').error, /64-bit/)
})
