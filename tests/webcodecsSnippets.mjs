// Run: node --experimental-strip-types tests/webcodecsSnippets.mjs [mediabunny-package-directory]
// Mediabunny is optional and remains outside the app's dependencies.
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import ts from 'typescript'
import { apiEntries } from '../src/data/webcodecs.ts'
import { mediabunnyExamples } from '../src/data/mediabunny.ts'
import { videoPipelineExamples } from '../src/data/videoPipeline.ts'
import { audioPipelineExamples } from '../src/data/audioPipelineExamples.ts'
import { syncExample } from '../src/data/syncExample.ts'

const bunnyDirectory = process.argv[2] && path.resolve(process.argv[2])
const directory = await mkdtemp(path.join(tmpdir(), 'webcodecs-snippets-'))
try {
  const examples = apiEntries.map(entry => ({ name: entry.id, code: entry.example.code }))
  examples.push({ name: 'sync-clock', code: syncExample })
  // The three video panels form one function; all other panels are independent modules.
  const libraryExamples = [
    ...mediabunnyExamples.map(e => ({ name: `guide-${e.id}`, code: e.code })),
    { name: 'video-pipeline', code: videoPipelineExamples.map(e => e.code).join('\n') },
    ...audioPipelineExamples.map((e, i) => ({ name: `audio-pipeline-${i}`, code: e.code })),
  ]
  examples.push(...libraryExamples.filter(e => bunnyDirectory || !e.code.includes("from 'mediabunny'")))
  const files = []
  for (const example of examples) {
    const file = path.join(directory, `${example.name}.ts`)
    await writeFile(file, example.code + '\nexport {};\n')
    files.push(file)
  }
  const globals = path.join(directory, 'worklet.d.ts')
  // Minimal documented worklet globals absent from TypeScript's Window DOM library.
  await writeFile(globals, `declare class AudioWorkletProcessor { readonly port: MessagePort; }
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void;
`)
  files.push(globals)
  const program = ts.createProgram(files, {
    strict: true, noEmit: true, target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2023.d.ts', 'lib.esnext.disposable.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    // Mediabunny ships legacy WebCodecs ambient types that overlap TS 6's DOM.
    // Check all example call sites strictly while allowing those .d.ts overlaps.
    skipLibCheck: Boolean(bunnyDirectory),
    ...(bunnyDirectory ? { paths: { mediabunny: [bunnyDirectory] } } : {}),
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length) console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => process.cwd(), getCanonicalFileName: f => f, getNewLine: () => '\n',
  }))
  assert.equal(diagnostics.length, 0, 'displayed examples must type-check')
  console.log(`Type-checked ${examples.length} displayed examples${bunnyDirectory ? ' including Mediabunny' : '; 6 Mediabunny examples skipped (supply its package directory)'}.`)
} finally {
  await rm(directory, { recursive: true, force: true })
}
