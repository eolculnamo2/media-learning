# WebCodecs implementation foundation

**Final status — 2026-10-29:** Steps 1–13 are complete. See
[the acceptance review](webcodecs-acceptance.md) for the full PLAN coverage
matrix, final fixes, reproducible checks and remaining limitations. The dated
sections below preserve each implementation session's findings.

Explored and documentation verified: **2026-10-29**. Scope: step 1 of
[STEPS.md](../STEPS.md). [PLAN.md](../PLAN.md) remains the full specification;
this document records integration decisions and research for subsequent steps.
No page, route, runtime media integration, or dependency is added in step 1.

## Repository integration

| Concern | Existing location and next integration point |
| --- | --- |
| Entry/router | `src/main.tsx`: React `StrictMode`, `HashRouter`, then `App`. |
| Navigation/routes | `src/App.tsx`: private `Layout` wraps all routes with `.app-shell` and sticky `.top-nav`; add a `Link` and `/webcodecs` route here in step 2. Direct deployed URL will be `/#/webcodecs`. Unknown routes redirect to `/`. |
| Page composition | `src/pages/CodecsPage.tsx`: named page export, hero, section cards, focused imported demos. Prefer this organization over adding another large root-level page. |
| Reference data | `src/data/codecs.ts`: exported types and static typed data; suitable precedent for the API index. |
| Architecture pages | `src/BrowserDashMsePage.tsx`, `src/DesktopPlayerPage.tsx`: typed section arrays, local contents sidebar, explanatory copy alongside diagrams, controls, notes, glossary, and invariant callouts. |
| Global styles | `src/index.css`: theme tokens and light/dark system preference, system/Inter font stack, 18px/145% base type, border-box, body minimum width 320px. |
| Page/diagram styles | `src/App.css`: all current page styling. Add scoped `.webcodecs-*` rules here initially; no CSS framework or separate design system. |

Read the files above plus `CodecViz.tsx`, `CodecPipelineDiagram.tsx`,
`GopTimeline.tsx`, and `CodecCard.tsx` in `src/components/codecs/`.
No applicable `AGENTS.md` was found in the repository or checked parent locations.

Visual conventions to retain: `--text`, `--text-h`, `--bg`, `--border`,
`--accent`, `--shadow`; blue accent, cyan I/O, purple metadata, amber encoded
data, green decoded data, pink clock paths. Existing pages use constrained
centered articles, large tightly spaced responsive headings, `.eyebrow`, rounded
bordered section panels, subtle mixed-color backgrounds, pill buttons with
`.is-active`, and small explanatory notes. `.codecs-page` is capped at 1180px;
`.codec-section`, `.idea-grid`, `.codec-controls`, and `.codec-viz-note` are useful
styling precedents. Reuse these visual patterns without coupling new content to
codec-specific components unnecessarily.

Existing sidebar pages use bare `href="#section"`. Under `HashRouter` that
replaces the route fragment: do not copy it for the new page. Use route-aware
links (with a location hash and explicit scroll handling) or buttons invoking
`scrollIntoView`; account for the wrapping sticky primary navigation and focus.
Confirm direct route loading and local navigation in step 2.

### D3 and React

`CodecViz.tsx` exports `SvgDraw`, `useCodecSvg`, `CodecSvg`, `CodecButton`, and
`VizNote`. The hook obtains an SVG ref, reads `clientWidth` (fallback 960) and
`data-height`, clears descendants, sets `viewBox`, then calls `draw`. D3 owns SVG
descendants; React owns state, controls, and explanatory text. The pipeline and
GOP demos use D3 scales, paths, markers, and selection callbacks to update React
selection state. `CodecCard` demonstrates typed data rendered as semantic HTML.

Limitations to avoid propagating: the hook has a dynamic dependency array, no
resize subscription, and no transition/timer cleanup. Many SVG interactions
depend on pointer events. The architecture pages duplicate a similar hook.
There is no reduced-motion handling in the inspected styles/components. Some
older diagrams force a 720px width and horizontal scrolling below 820px;
new diagrams should reflow or scale with readable labels. Existing codec layout
also collapses columns at 820px; architecture layouts at 980px.

For new demos, keep deterministic state outside D3, use explicit effect
dependencies, and clean up all owned animation frames, timers, transitions,
observers, and listeners. StrictMode must tolerate setup/cleanup/setup. Use
native controls or keyboard-accessible equivalents for diagram selection,
visible focus, and text alternatives. Reduced motion should preserve manual
stepping and information while disabling automatic movement. Extract a new SVG
primitive only once multiple new diagrams demonstrate a shared need; avoid a
cross-application hook refactor in this work.

### Proposed layout (created incrementally)

| Location | Responsibility |
| --- | --- |
| `src/pages/WebCodecsPage.tsx` | Compose the hero, local navigation, and A—Capabilities, B—API Index, C—How the APIs Work Together, D—Architectural Boundaries. |
| `src/data/webcodecs.ts` | Typed API categories/entries, responsibility metadata, documentation links, illustrative snippet strings. Include purpose, inputs/outputs, methods, lifecycle, pitfalls. |
| `src/components/webcodecs/Capabilities.tsx` | Section A capability cards. |
| `src/components/webcodecs/ApiIndex.tsx` | Section B filtering/navigation and accessible expandable reference entries. |
| `src/components/webcodecs/MediabunnyGuide.tsx` | Source/cache, tracks, configuration, packet and sample boundaries. |
| `src/components/webcodecs/VideoPipelineDemo.tsx`, `AudioPipelineDemo.tsx` | Step-through byte-to-output demonstrations. |
| `src/components/webcodecs/bufferModel.ts` | Pure deterministic model and actions, separate from React/D3, with explicit units and assumptions. |
| `src/components/webcodecs/ThreeBufferDemo.tsx`, `AvSyncDemo.tsx`, `ClipTransitionDemo.tsx` | Buffer, clock, and composition simulations. |
| `src/components/webcodecs/ArchitectureDiagram.tsx` | Browser/library/application responsibility selection and preview-engine paths. |

These names are proposals, not existing exports. Label simulations and
illustrative TypeScript explicitly. Do not install Mediabunny to display code.
Use strict types for new code: the existing compiler has unused-symbol checks,
`verbatimModuleSyntax`, DOM/ES2023 libraries, and project references, but **does
not currently enable `strict`**. Do not describe the baseline as strict or enable
it repository-wide as an unrelated change.

## Verified browser rules

All links in this section were checked on **2026-10-29**. Recheck relevant
signatures when writing displayed or executable examples; a documentation check
does not establish runtime support on every browser.

### Units, ordering, and queues

- WebCodecs chunk/frame/audio timestamps and durations use microseconds.
  Chunk timestamps are presentation timestamps. Convert seconds explicitly
  (`Math.round(seconds * 1_000_000)`) at manual boundaries.
- Supply compressed video in decode order; `VideoDecoder` produces frames in
  presentation order. Configuration and a suitable key chunk are needed when
  starting/restarting decoding. `flush()` drains pending outputs and requires
  a key chunk before further decoding; `reset()` discards work and configuration.
  Neither implements seeking or a presentation clock.
- No codec is universally required; check feature presence and the actual
  `isConfigSupported(config)` result, then handle runtime errors.

Source: [W3C WebCodecs](https://www.w3.org/TR/webcodecs/) (working draft,
sections 3–4, 7–9; not a universal implementation guarantee).

`decode()` submits work and returns without producing a frame synchronously;
outputs arrive through the constructor's `output` callback. A submission is not
a promise of one immediately available frame. `configure`, `decode`, `flush`,
`reset`, and `close` have different lifecycle purposes.
[MDN VideoDecoder](https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder).

`decodeQueueSize` counts pending decode requests, decreasing as requests are
taken for processing. Zero does not establish that decoding/output is complete.
The `dequeue` event signals a decrease; it does not count displayed frames.
Application packet queues, in-flight work, and decoded-frame queues need separate
accounting and limits.
[MDN decodeQueueSize](https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/decodeQueueSize),
[W3C processing algorithms](https://www.w3.org/TR/webcodecs/#videodecoder).

WebCodecs consumes codec chunks; it does not parse MP4 container bytes or supply
a complete media player. Demux first. Encoding likewise needs a separate muxing
step for a playable container/export.
[MDN WebCodecs overview](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API).

### Ownership and memory

Close each owned `VideoFrame` after drawing or dropping it; keep it open while
queued for later presentation. Cloning creates another handle requiring cleanup;
transferring changes ownership. Drawing to Canvas does not transfer ownership.
[MDN VideoFrame](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame).

`AudioData` is decoded PCM with a sample rate, channel count, frame count, and
sample format. A sample frame contains one sample per channel; duration in
seconds is `numberOfFrames / sampleRate`. Planar and interleaved layouts differ;
use `copyTo` with explicit format/plane choices. Close after copying or consuming,
and close discarded data during seek/unmount.
[MDN AudioData](https://developer.mozilla.org/en-US/docs/Web/API/AudioData).

Application design: abort owned fetches, invalidate stale asynchronous results
with a seek generation, close stale output objects, and close owned decoders on
teardown. Preserve reusable downloaded bytes across seeks while discarding
inappropriate decoded/pending work. Keep compressed bytes, packet counts,
decoded frame counts, media seconds, and memory estimates distinct. A simulated
RGBA frame estimate is `width * height * 4` bytes; actual decoded allocation
depends on pixel format, stride, GPU storage, and implementation.

### Audio clocks and rendering

`AudioBufferSourceNode` is one-shot: make a new source per scheduled playback,
although the buffer can be reused. Scheduling uses audio-context seconds.
[MDN AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode).

Reuse an `AudioContext`; distinguish its processing timeline from device output
latency. Close an owned context when finished.
[MDN AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext).
Create/resume audible output in a user gesture and provide explicit controls.
[MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

`getOutputTimestamp()` pairs `contextTime` in seconds with `performanceTime` in
milliseconds for the corresponding device-output position. A local estimate is
`outputContextSeconds = contextTime + (performance.now() - performanceTime) / 1000`.
Application mapping at constant rate is
`compositionSeconds = compositionAnchor + (outputContextSeconds - contextAnchor) * rate`.
Re-anchor on pause/resume/seek/rate changes and use fresh valid timestamps while
running. This mapping is an application scheduling inference; it is not an API
provided composition clock. Do not subtract device latency again from a clock
already derived from device-output timestamps. Display vsync and late/drop
thresholds remain application policies.
[MDN getOutputTimestamp](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp).

`AudioWorklet` executes audio processing away from the main thread, in a secure
context. Load a processor module with `audioWorklet.addModule`, create its
`AudioWorkletNode`, and communicate through its port.
[MDN AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet).

`process(inputs, outputs, parameters)` is synchronous on the audio rendering
thread. Inspect actual channel array lengths each call; do not promise a fixed
128-frame quantum. Application guidance: preallocate queue storage, avoid
blocking, unbounded work, and allocations on this deadline-sensitive path;
perform network/demux/decode outside it. Fill silence on underrun as an explicit
demo policy. Returning a boolean affects processor lifetime; document the chosen
behavior for a PCM source.
[MDN process](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process).

Shared memory is distinct from transfer: `SharedArrayBuffer` shares storage,
is not transferable, and browser use requires a secure, cross-origin-isolated
context. Check `crossOriginIsolated` and synchronize access with `Atomics`; do not
assume hosting supplies the required headers. A conceptual queue does not need
real shared-memory deployment changes.
[MDN SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).

## Verified Mediabunny boundaries

Verified against the live official guide/API on **2026-10-29**, not an installed
package version (Mediabunny is not a dependency). These are signature notes,
not executable application examples.

| API / official source | Verified use |
| --- | --- |
| [Input](https://mediabunny.dev/api/Input) | `new Input({ formats: ALL_FORMATS, source })`; `getPrimaryVideoTrack()` / `getPrimaryAudioTrack()` asynchronously return a track or `null`. `dispose(): void` cancels reads/sink operations and releases connected library resources; separately clean up application-owned decoders/frames. |
| [BlobSource](https://mediabunny.dev/api/BlobSource) | `new BlobSource(blob, options?)`; accepts `File` as a `Blob`. |
| [BufferSource](https://mediabunny.dev/api/BufferSource) | `new BufferSource(buffer)` accepts `ArrayBuffer`, `SharedArrayBuffer`, or a view; complete input bytes held in memory. |
| [UrlSource](https://mediabunny.dev/api/UrlSource) | `new UrlSource(url, options?)`; string, URL, or Request. Library schedules reads/prefetch; range support improves access. A passed Request's signal is overridden: cancel through `Input.dispose()`. |
| [CustomSource](https://mediabunny.dev/api/CustomSource) | Callback-driven byte source; `read(start, end)` serves an end-exclusive byte range. It is not an append API or the application segment cache. |
| [InputVideoTrack](https://mediabunny.dev/api/InputVideoTrack) | `getDecoderConfig(): Promise<VideoDecoderConfig \| null>`; use dimensions/metadata and check support before configuring WebCodecs. |
| [InputAudioTrack](https://mediabunny.dev/api/InputAudioTrack) | `getDecoderConfig(): Promise<AudioDecoderConfig \| null>`; `getNumberOfChannels()` and `getSampleRate()` return promises. Handle unknown codecs and missing tracks. |
| [EncodedPacket](https://mediabunny.dev/api/EncodedPacket) | Encoded payload and timing; `toEncodedVideoChunk()` / `toEncodedAudioChunk()` convert to WebCodecs chunks. |
| [EncodedPacketSink](https://mediabunny.dev/api/EncodedPacketSink) | Construct from a track. `getKeyPacket(timeSeconds)` finds a preceding key packet or null; `getNextPacket(packet)` advances in decode order. `packets(startPacket?, endPacket?, options?)` is an async generator; its bounds are packets, not timestamps. |
| [VideoSampleSink](https://mediabunny.dev/api/VideoSampleSink) | Construct from video track; `getSample(timeSeconds, options?)` returns `Promise<VideoSample \| null>`. This higher-level route manages decoding, rather than just demuxing. |
| [AudioSampleSink](https://mediabunny.dev/api/AudioSampleSink) | Construct from audio track; `samples(startSeconds?, endSeconds?, options?)` yields decoded `AudioSample`s in presentation order. End time is exclusive. |

Mediabunny uses floating-point **seconds** throughout packet/sample timing,
unlike WebCodecs microseconds. Its chunk conversion helpers perform the boundary
conversion; do not multiply a timestamp twice. Returned `VideoSample` and
`AudioSample` objects also require `close()` after use.
[Packets and samples guide](https://mediabunny.dev/guide/packets-and-samples).

For step-through demonstrations, favor explicit packet sinks plus browser
decoders so ownership is visible. Show sample sinks as an optional higher-level
library path; the architectural division is a teaching choice, not a restriction.
[Media sinks guide](https://mediabunny.dev/guide/media-sinks).

### Byte-cache adapter

The documented `CustomSource` options include:

```ts
// Signature excerpt; not a complete cache implementation.
type CacheSourceCallbacks = {
  getSize: () => number | Promise<number>
  read: (start: number, end: number) =>
    | Uint8Array
    | ReadableStream<Uint8Array>
    | Promise<Uint8Array | ReadableStream<Uint8Array>>
  dispose?: () => unknown
}
```

The guide requires a known file size and valid reads within it. Options also
include internal cache size and prefetch policy. Do not confuse the reading guide's
**input sources** with the separate **media sources** guide for output encoding.
[Reading media files, input sources](https://mediabunny.dev/guide/reading-media-files#input-sources).

Recommended application adapter: map requested file offsets to cached byte
ranges, fetch/await missing ranges, and resolve only with the requested bytes
in order. Own request cancellation and pending-read rejection via the adapter's
disposal path. A segment URL/key is not automatically a file byte offset: define
the virtual-file layout and initialization mapping explicitly. Downloaded cache,
library source (which may cache internally), extracted packet queue, and decoded
frame queue have separate lifecycles and budgets. No appendable `CustomSource`
or implicit indefinite waiting protocol should be invented for the snippets.

### Complete MP4 versus fragmented input

A complete MP4 includes track/sample metadata and payload; `moov` may require a
read near the end before sample extraction. Fragmented MP4 separates
initialization (`ftyp`/`moov`, codec/track metadata) from media fragments
(`moof`/`mdat`, fragment timing and payload). A CMAF media fragment alone may lack
the configuration needed to interpret/decode it; initialization and suitable
random access/dependency preroll remain necessary. An arbitrary HTTP segment is
not necessarily independently decodable.
[W3C ISO BMFF byte-stream format](https://www.w3.org/TR/mse-byte-stream-format-isobmff/)
documents the MSE initialization/media distinction; its append algorithms are
not Mediabunny APIs. Mediabunny lists MP4 input support in its
[input formats guide](https://mediabunny.dev/guide/input-formats).

## Baseline validation and remaining questions

Commands run **2026-10-29**, before documentation edits, with Node v22.23.1 and
npm 10.9.8 using existing installed dependencies:

| Command/check | Result |
| --- | --- |
| `npm run build` | Pass (exit 0): `tsc -b && vite build`, 606 modules; JS 590.17 kB / gzip 180.19 kB. Existing warning about chunks over 500 kB. |
| `npm run lint` | Existing failure (exit 1): 5 errors, 6 warnings; details below. |
| Tests | No test script, test files, or configured test runner found. No tests added for documentation-only work. |
| Browser tooling | Chrome and Firefox executables available; no Playwright/Puppeteer dependency or interactive browser tool exposed. No browser was launched or visual/interaction review performed. |
| Deployed app | Attempted `https://media-learning.pages.dev/` via web tool; URL inaccessible. Local source/style review supplied context; do not claim a deployed visual review. |

Pre-existing ESLint findings (left outside step 1 scope):

- `src/Visualizations.tsx:1825`: `react-hooks/set-state-in-effect`.
- `src/Visualizations.tsx:2198`: `react-hooks/use-memo` (non-inline callback).
- `src/Visualizations.tsx:2562`: two unused variables (`_r`, `_c`).
- `src/components/codecs/CodecViz.tsx:6`: `react-refresh/only-export-components`.
- Six `react-hooks/exhaustive-deps` warnings: dynamic dependency list and missing
  `draw` in `BrowserDashMsePage.tsx:23`, `DesktopPlayerPage.tsx:85`, and
  `CodecViz.tsx:17`.

Before executable examples, resolve the following in the step that needs them:

- Recheck signatures against the then-current docs; pin a version only if adding
  a real Mediabunny integration. No packet/sink snippets were compiled or run in
  this step.
- Verify a concrete fragmented/CMAF fixture and supported logical source layout
  before showing init-plus-segments code. Container format support alone does
  not establish an arbitrary concatenation or manifest workflow.
- Check TypeScript DOM availability for audio WebCodecs and worklet globals;
  do not hide missing types behind `any` or claim snippet strings were type-checked.
- Decide simulation constants explicitly (frame sizes/formats, GOP dependencies,
  delayed output, budgets, late/drop policies). Browser timing and resource
  availability must not be inferred from the conceptual model.
- Exercise route-safe section navigation, narrow layouts, keyboard selection,
  reduced motion, and StrictMode teardown once UI exists. Baseline lint fixes,
  global strict-mode enablement, and bundle splitting are separate scope.

## Step 3 — browser API index

Implemented and reverified **2026-10-29**. `src/data/webcodecs.ts` exports typed
category/entry records; `src/components/webcodecs/ApiIndex.tsx` renders them in
Section B. Append categories and entries for step 4 without changing the UI.
Each entry has a stable `api-<id>` DOM ID, purpose, inputs/outputs, members,
lifecycle, pitfalls, documentation, and contextual TypeScript. The index uses
native disclosure elements, responsibility filter buttons with `aria-pressed`,
a labeled search input, live result counts, and an empty-result reset. Search
covers names and explanations and combines with the category filter. Native
controls preserve keyboard support without custom key handlers. No timers,
media resources, or new dependencies are introduced.

### Sources rechecked for this step

All URLs below were opened with the web tool on **2026-10-29**. Examples are
original illustrative snippets; the page does not execute media requests or
codec operations. No Mediabunny snippets were added in this step.

- Network response/status, aborting requests and body reads:
  <https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch>,
  <https://developer.mozilla.org/en-US/docs/Web/API/Response/arrayBuffer>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AbortController>.
- Stream readers/locking/cancellation and incremental byte handling:
  <https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream>.
- Byte storage, view ranges, subarray versus slice copying:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer>,
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array>.
- Decoder callbacks, lifecycle, metadata/configuration and capability checks:
  <https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder>,
  <https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/configure>,
  <https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/isConfigSupported_static>.
- Pending request count versus output completion:
  <https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/decodeQueueSize>.
- Chunk construction, microseconds and optional ownership transfer:
  <https://developer.mozilla.org/en-US/docs/Web/API/EncodedVideoChunk/EncodedVideoChunk>.
- Frame dimensions, timestamps, clone/close ownership:
  <https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame>.
- Decode/presentation ordering, key-chunk requirements after flush, reset semantics:
  <https://www.w3.org/TR/webcodecs/> (26 October 2026 working draft).
- Canvas/context creation, drawing VideoFrames, offscreen ownership, repaint timing:
  <https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement>,
  <https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage>,
  <https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas>,
  <https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame>.

### Validation

- `npm run build`: passed; existing bundle-size warning remains.
- `npm run lint`: same baseline 5 errors / 6 warnings, all in the pre-existing
  files listed above. Focused ESLint on `webcodecs.ts`, `ApiIndex.tsx`, and
  `WebCodecsPage.tsx` passed.
- Extracted all 15 displayed snippet strings into separate temporary modules and
  checked with the installed TypeScript 6 compiler:
  `./node_modules/.bin/tsc --ignoreConfig --noEmit --strict --target es2023 --module esnext --moduleResolution bundler --lib es2023,dom --skipLibCheck /tmp/webcodecs-step3-snippets/*.ts`.
  Passed. The support-check example explicitly guards `result.config`, which
  the installed DOM types mark optional. These are signature/type checks, not
  real-codec execution or network-fixture tests.
- Headless local Chrome via DevTools Protocol: direct `/#/webcodecs` loading
  displayed 15 entries; keyboard Enter selected the decoding filter (5 entries),
  Enter opened and Space closed a disclosure; search matched explanations within
  the selected category; empty-state recovery cleared both filters; all 15
  disclosures exposed their code examples. Open cards caused no page horizontal
  overflow at 390px and 320px with reduced motion emulated.
- Inspected desktop (1440px) and mobile (390px) screenshots of expanded reference
  content. Desktop fact rows use label/content columns; mobile rows stack and
  snippets scroll within their own container. Screenshots and the one-off CDP
  check script live under `/tmp/webcodecs-step3-*`, not as repository artifacts.
- Local server and headless Chrome required sandbox escalation. No automation
  dependency was installed. No cross-browser or real media playback review is
  claimed; the reference has no automatic animation to disable.

## Step 4 — Complete browser API index (2026-10-29)

Added 19 entries to `src/data/webcodecs.ts`: five audio decoding, seven audio
presentation, five concurrency/memory, and two encoding entries. The index now
covers all 34 browser APIs listed in PLAN.md across seven responsibility groups.
`ApiIndex.tsx` introduces the complete browser reference and distinguishes codec
microseconds, audio-context seconds, and performance/repaint milliseconds. The
existing native disclosures, filters, and search need no redesign or CSS changes.
Mediabunny remains step 5; no runtime media integration or dependency was added.

Every new entry includes purpose, inputs/outputs, members, ownership/lifecycle,
pitfalls, official links, and a contextual illustrative TypeScript snippet.
Important boundaries: AudioData PCM conversion requests f32-planar rather than
assuming decoder layout; a sample frame contains one value per channel;
AudioBufferSourceNode starts once; audio context activation needs user interaction;
worklet processing is synchronous and must not block or assume a fixed quantum
size. The processor example is explicitly a rendering helper, not a registered
module or implemented PCM queue. The worklet-loading example documents its
required module/processor without adding an unimplemented runtime file to the app.
Shared memory is shared, not transferred, requires secure cross-origin isolation,
and needs an application synchronization protocol. Encoder examples check exact
configuration, preserve output metadata for a separate muxer, borrow their input,
and release owned encoder resources. They do not create export containers.

### Sources rechecked

Opened with the web tool on **2026-10-29**:

- Audio decoder, configuration, support checks and chunk constructor:
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder/configure>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder/isConfigSupported_static>,
  <https://developer.mozilla.org/en-US/docs/Web/API/EncodedAudioChunk/EncodedAudioChunk>.
- AudioData metadata, ownership and PCM plane conversion:
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioData>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioData/copyTo>.
- Web Audio graph, PCM buffers, one-shot sources, and output timestamp mapping:
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioContext>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp>.
- Worklet module/node boundaries and synchronous processing constraints:
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process>.
- Worker execution, channel endpoints and message delivery:
  <https://developer.mozilla.org/en-US/docs/Web/API/Worker>,
  <https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel>,
  <https://developer.mozilla.org/en-US/docs/Web/API/MessagePort>.
- Shared memory isolation, non-transferability and synchronization:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer>,
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics>.
- Encoding configuration, submission and lifecycle:
  <https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder>,
  <https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder/configure>,
  <https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder/encode>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder/configure>,
  <https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder/encode>.
- Codec ownership, asynchronous callbacks, audio key-chunk/reset/flush semantics,
  format conversion, and capability model:
  <https://www.w3.org/TR/webcodecs/> (26 October 2026 working draft).

### Validation

- `npm run build`: passed; existing >500 kB bundle warning remains.
- `npm run lint`: baseline 5 errors / 6 warnings only, in the same pre-existing
  files documented above. Focused ESLint on `src/data/webcodecs.ts` and
  `src/components/webcodecs/ApiIndex.tsx` passed.
- Extracted all 34 snippet strings into individual temporary modules and ran
  `./node_modules/.bin/tsc --ignoreConfig --noEmit --strict --target es2023 --module esnext --moduleResolution bundler --lib es2023,dom --skipLibCheck /tmp/webcodecs-step4-snippets/*.ts`:
  passed. These verify signatures, not actual codec support or media execution.
- Headless local Chrome via DevTools Protocol: direct route showed 34 entries;
  keyboard Enter selected each of the seven categories (counts 6/5/5/4/7/5/2)
  and all-APIs; Enter opened and Space closed a disclosure in every category.
  Combined category/search, PCM explanation search, empty-state recovery, and
  reachability of all 34 snippet disclosures passed.
- All disclosures expanded at 390px and 320px with reduced motion emulated:
  no page horizontal overflow. Inspected 1440px desktop and 320px mobile
  screenshots of the new PCM reference; desktop fact rows remain in columns,
  and narrow rows stack. Browser script/screenshots are temporary files under
  `/tmp/webcodecs-step4-*`. Local server/Chrome/CDP required sandbox escalation.
- No test runner exists. No cross-browser, actual worker/worklet loading, real
  audio playback, codec processing, or export execution is claimed. The page
  runs none of the illustrative snippets and creates no new timers/resources.

## Step 6 — Network bytes to displayed video (2026-10-29)

Implemented `src/components/webcodecs/VideoPipelineDemo.tsx` with typed stages,
event snapshots, and illustrative snippet panels in `src/data/videoPipeline.ts`.
`WebCodecsPage.tsx` now mounts Demo 1 in Section C; scoped styles are in
`src/App.css`. No runtime media integration or project dependencies were added.

The eight-stage D3 diagram places BufferSource at the in-memory byte adapter,
Input at container/track inspection, and EncodedPacketSink at packet extraction.
Selectable SVG buttons and a native select expose inputs, outputs, transformation,
sync/async behavior, and ownership for every stage. Eleven deterministic events
separate three chunk submissions, a delayed-processing event, frame output, and
Canvas drawing/release. The small I0/P80/B40 example distinguishes decode order
from presentation order, with seconds/milliseconds/microseconds labeled.
The final filmstrip is explicitly a simulated summary, not timed video playback.

Play advances every 1400 ms; D3 moves a marker across boundaries. Timings and
batched output are teaching choices, not measured browser behavior. Pause, manual
steps, selection, reset, reduced-motion changes, and unmount interrupt transitions
and stop owned timers. Hidden-document playback pauses. ResizeObserver reflows
four columns to two or one, and disconnects on cleanup. D3 redraw preserves SVG
keyboard focus. Reduced motion disables automatic playback while preserving all
manual events. Backward stepping restores snapshots rather than pretending to
reverse a real decoder.

### Documentation rechecked

Verified **2026-10-29** against current official documentation:

- https://mediabunny.dev/guide/reading-media-files — Input, complete in-memory
  BufferSource, track access, and disposal.
- https://mediabunny.dev/api/BufferSource — ArrayBuffer constructor boundary.
- https://mediabunny.dev/api/InputVideoTrack — asynchronous nullable
  getDecoderConfig().
- https://mediabunny.dev/api/EncodedPacketSink — getFirstPacket() can return a
  non-key packet or null; the example rejects these, and packets(first) includes
  its starting packet and yields in decode order.
- https://mediabunny.dev/api/EncodedPacket and
  https://mediabunny.dev/guide/packets-and-samples — encoded payload versus raw
  samples, seconds, and toEncodedVideoChunk() conversion.
- https://www.w3.org/TR/webcodecs/ — decode versus presentation order,
  asynchronous output, timestamp units, and resource ownership.
- https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/decode and
  https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/flush — queued
  submission, end-of-input draining, and key-chunk requirements after flush.
- https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
  — VideoFrame drawing boundary; frame cleanup remains application-owned.

The three displayed panels join into one contextual `inspectVideo` function.
It checks HTTP/configuration support, inspects a maximum of 12 packets from a key
start, handles aborts and codec errors, draws callback output immediately, closes
frames in finally, drains at the end, then closes the decoder and disposes Input.
This bounded inspection is intentionally distinct from a clocked, queue-budgeted
player. It assumes valid complete MP4 input; arbitrary CMAF segments may lack
initialization metadata or dependencies. No real-media execution is claimed.

### Validation and existing limitation

- `npm run build`: passed with the existing >500 kB chunk warning.
- `npm run lint`: same pre-existing 5 errors / 6 warnings; focused ESLint for the
  three changed/new TypeScript files passed.
- Separate strict TypeScript checks passed for the new component/data and for
  the combined displayed example against **Mediabunny 1.64.0**, installed only
  under `/tmp/webcodecs-step6-types`. No repository package/lock files changed.
- Headless Chrome DevTools Protocol checks passed: direct hash route, eight
  selectable stages and all five inspector facts, keyboard selection/focus
  preservation, forward/backward/reset snapshots, delayed output and ownership
  counts, final filmstrip, play/pause, interrupted D3 transitions, live reduced
  motion and manual stepping, and unmount/remount behavior. Expanded examples
  fit 390px and 320px viewports; the diagram reflows to one readable column.
- Desktop/mobile screenshots were inspected. Temporary screenshots, browser
  checks, and snippet checks are under `/tmp/webcodecs-step6-*`. Local Vite and
  headless Chrome required sandbox escalation. No cross-browser review claimed.
- Repository inconsistency found before this step: step 5 is checked complete,
  but no MediabunnyGuide component, page integration, or step-5 handoff exists.
  Step 6 explains its needed boundaries locally; it does not implement or assert
  completion of step 5’s broader cache/source guide. Future steps should account
  for this existing gap.

## Step 5 repair — Mediabunny and byte-cache guide (2026-10-29)

Completed the missing step-5 implementation found during step 6. Added
`src/components/webcodecs/MediabunnyGuide.tsx`, `ByteCacheWalkthrough.tsx`, and
`src/data/mediabunny.ts`. The guide follows the browser API index in Section B,
with links from the page navigation, API index, and Demo 1. Extracted the existing
route-preserving focus/scroll helper to `sectionNavigation.ts` so all links use
measured sticky-navigation offsets. Scoped guide/cache styles are in `App.css`.

All eleven specified library APIs have native keyboard-accessible disclosures,
official links, data boundaries, and lifecycle/pitfall guidance. The four examples
are independent contextual modules: source selection; track/configuration/packet
inspection; optional sample decoding; and CustomSource over an application-owned
block cache. Sample.draw receives a Canvas 2D context; returned samples are closed.
The packet path checks actual VideoDecoder configuration support. Audio metadata
inspection does not imply that AudioDecoder supports its configuration.

The cache walkthrough is a deterministic synthetic 32-byte file with eight-byte
blocks and no timers, fetches, or media parsing. It demonstrates a cache hit,
a partial hit awaiting a miss, completed misses, disposal rejecting a pending read,
reuse by a new Input for the same immutable file, and nonsequential offsets.
Cache contents and source lifetime are visibly independent. The adapter snippet
accepts a typed application loader contract: read exact [start,end) ranges, honor
AbortSignal, and reject failures. It copies requested slices in order, validates
miss lengths, and avoids committing canceled results. It preserves completed
cache blocks on disposal. Eight-byte blocks are pedagogical; production budgets,
eviction, request deduplication, HTTP status/Content-Range checks, and asset-version
validation are explicitly caller responsibilities, not implemented transport.

The guide separately explains downloaded byte/segment cache, source abstraction
(including possible library-internal caching), encoded packet buffer, and decoded
frame/PCM buffer. Complete MP4 versus initialized fragmented MP4/CMAF is explicit:
metadata, logical file offset mapping, random access, and reference dependencies
are prerequisites; CustomSource supplies no append protocol or DASH scheduling.

### Official sources reverified 2026-10-29

- https://mediabunny.dev/guide/reading-media-files
- https://mediabunny.dev/api/Input
- https://mediabunny.dev/api/BlobSource
- https://mediabunny.dev/api/BufferSource (also verified in step 6)
- https://mediabunny.dev/api/UrlSource — supplied Request.signal is overridden;
  use Input.dispose() for library-owned requests.
- https://mediabunny.dev/api/CustomSource
- https://mediabunny.dev/api/CustomSourceOptions — known size, range callbacks,
  optional disposal, internal cache and prefetch policy.
- https://mediabunny.dev/api/InputVideoTrack (also verified in step 6)
- https://mediabunny.dev/api/InputAudioTrack
- https://mediabunny.dev/api/EncodedPacket (also verified in step 6)
- https://mediabunny.dev/api/EncodedPacketSink
- https://mediabunny.dev/api/VideoSampleSink
- https://mediabunny.dev/api/AudioSampleSink
- https://mediabunny.dev/api/VideoSample — draw(ctx, ...) and sample ownership.
- https://mediabunny.dev/guide/media-sinks
- https://mediabunny.dev/guide/packets-and-samples (also verified in step 6)
- https://mediabunny.dev/guide/input-formats
- https://www.w3.org/TR/mse-byte-stream-format-isobmff/ — initialization and
  media-fragment structure; MSE terminology does not define Mediabunny APIs.

### Validation

- Build passed with the existing >500 kB chunk warning. Full lint reports the
  same baseline 5 errors / 6 warnings. Focused lint for all WebCodecs components,
  new data, and page passed; new guide/cache/navigation/data passed strict tsc.
- All four extracted illustrative modules passed strict TypeScript checks against
  Mediabunny 1.64.0 in the existing temporary `/tmp/webcodecs-step6-types` install.
  No project dependency or lockfile changes.
- Executed the displayed cache adapter with real Mediabunny in Node using a
  generated one-second 32×32 H.264 MP4 fixture. Track/config/first packet matched
  BufferSource; reopening used existing blocks without further loader calls;
  disposal aborted a pending loader and committed no canceled bytes; a short
  loader response rejected. The fixture was generated with ffmpeg/libopenh264
  after discovering this environment does not have libx264. This tests demuxing
  and adapter behavior, not WebCodecs decoding, network transport, or playback.
- Headless Chrome passed all 11 API disclosures via keyboard, official-link
  coverage, API-index/Demo-1 guide navigation without hash-route corruption,
  focus/visibility below the sticky nav, cache hit/miss/complete/dispose/reopen/
  reuse/nonsequential/reset paths, four accessible code panels, and expanded
  content within viewport width at 390px and 320px with reduced motion. Desktop
  and mobile screenshots inspected. Existing body min-width and the desktop
  scrollbar can still create a small horizontal scrollbar at exactly 320px;
  no new guide elements extend beyond the 320px layout.
- Local Vite/Chrome required sandbox escalation. Temporary scripts, screenshots,
  and fixture live under `/tmp/webcodecs-step5-*`; snippet/runtime artifacts use
  `/tmp/webcodecs-step6-types/guide-*`, `cache-runtime.ts`, and `cache-check.mjs`.
  No cross-browser, real audio, sample decoding, or remote HTTP execution claimed.

The historical missing-guide limitation recorded in the step-6 handoff is now
resolved; steps 7 onward remain outside this repair.

## Step 7 — audio pipeline (2026-10-29)

Implemented `src/components/webcodecs/AudioPipelineDemo.tsx`, deterministic
snapshots/stage contracts in `src/data/audioPipeline.ts`, and four independent
illustrative modules in `src/data/audioPipelineExamples.ts`. Integrated Demo 2
under Demo 1 in Section C; scoped styles are in `src/App.css`. No dependencies
or real media/audio execution were added.

The nine-stage D3 pipeline distinguishes complete container bytes, Mediabunny
track/configuration and encoded packet extraction, chunk conversion, delayed
AudioData output, PCM copies, rendering, and device output. Native controls and
keyboard-selectable SVG nodes expose all five boundary facts. The two output
strategies reset to the same deterministic scenario: delayed decode output,
three prepared blocks, consumption, one silent underrun, a two-block refill,
and resumed rendering. Scheduled sources re-anchor after a missed deadline;
the FIFO resumes with media behind the elapsed render clock. These are explicit
teaching policies, not API guarantees. Steps can be reversed as snapshots.

PCM accounting uses sample frames throughout: per-channel scalar samples = frame
count; total scalar samples = frames × channels; float32 bytes = frames × channels
× 4; duration = frames / sample rate. Copied PCM awaiting scheduling is counted
separately. The simulated clock counts rendered media plus silence, never device
output time. Selectable 44.1/48 kHz, mono/stereo, and 64/128/256 illustrative block
sizes reset the scenario. Actual worklet code reads output array length and uses
a bounded stereo ring. The worklet snippets deliberately require context-rate
PCM, synchronous copies, bounded messages, and an application timeline policy;
they do not implement resampling, acknowledgments, or a full production player.

Reverified these official sources on **2026-10-29**:

- https://mediabunny.dev/guide/reading-media-files
- https://mediabunny.dev/api/InputAudioTrack
- https://mediabunny.dev/api/EncodedPacket
- https://developer.mozilla.org/en-US/docs/Web/API/AudioDecoder
- https://developer.mozilla.org/en-US/docs/Web/API/AudioData/copyTo
- https://developer.mozilla.org/en-US/docs/Web/API/AudioData/close
- https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
- https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start
- https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode
- https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process
- https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume
- https://www.w3.org/TR/webaudio/#AudioWorkletProcessor

Confirmed packet-to-audio-chunk conversion, audio track configuration, planar
float conversion/copying, AudioData.close(), one-shot source scheduling in context
seconds, worklet ports/registration/process signatures, silence-filled outputs,
variable-size-safe processing, and context activation/lifetime. Displayed examples
state separate-module prerequisites and borrowed AudioData ownership. The
bounded demux example closes outputs in finally, drains once, and disposes the
input/decoder on completion or abort. Scheduling and worklet adapters expose
teardown; the caller owns AudioContext closure.

Validation:

- `npm run build` passed; the existing >500 kB bundle warning remains.
- `npm run lint` retains the baseline 5 errors / 6 warnings, with none in new
  code. Focused ESLint and separate `tsc --strict` checks passed.
- All four displayed modules passed strict TypeScript checking using temporary
  Mediabunny 1.64.0 already present under `/tmp/webcodecs-step6-types`. The
  separate worklet module used minimal ambient declarations checked against
  Web Audio's processor/port/registration interfaces; no project dependency added.
- The displayed compiled worklet ring passed isolated Node checks for 64/192/256
  frame output lengths, partial underrun silence, stereo alignment, full ring
  wraparound/order, overflow rejection, >4096-frame message rejection, refill,
  and stop. This uses a mocked processor host, not a browser audio device.
- Headless Chrome passed direct route loading, all nine stage contracts,
  keyboard SVG selection/focus retention and snippet disclosures, both strategies,
  every scenario snapshot's PCM conservation and stereo byte/sample accounting,
  mono 44.1 kHz/256-frame accounting, delayed output, underrun clock advancement,
  refill/recovery, previous/reset, play/pause/replay/end, transition cleanup,
  live reduced-motion changes/manual stepping, and unmount/remount.
- All expanded examples, controls, diagrams and diagram labels fit 390px and
  320px layouts. Desktop and mobile pipeline/PCM screenshots were inspected.
  The pre-existing body min-width/scrollbar interaction at exactly 320px remains;
  no new audio element exceeds the viewport. No cross-browser or real audio,
  codec, device latency, resampling, or network execution is claimed.
- Temporary browser scripts/screenshots and ring checks are under
  `/tmp/webcodecs-step7-*`; snippets are `/tmp/webcodecs-step6-types/audio7-*.ts`.
  Local Vite/Chrome checks required sandbox escalation for loopback access.

Steps 8 onward remain unimplemented. Demo 2 is a teaching simulation independent
of the upcoming three-buffer model and A/V synchronization demos.

## Step 8 — isolated three-buffer simulation (2026-10-29)

Implemented the pure `bufferModel.ts` next to WebCodecs components, plus
`ThreeBufferModelDemo.tsx`, page integration, scoped CSS, and
`tests/bufferModel.test.mjs`. `npm run test:buffers` uses Node's built-in test
runner with TypeScript stripping (validated on Node 22.23.1); no dependency or
lockfile changes. The minimal workbench intentionally uses manual 100 ms / 1 s
advancement, no timers or moving diagram. All controls remain usable under
reduced motion. Step 9 owns the substantial D3 visualization.

### Model contract and assumptions

- `createBufferState()`, `bufferReducer(state, action)`, `bufferMetrics(state)`,
  and exported spec/settings/limits are available for step 9. Transitions clone
  their input; no network, browser media resources, randomness, or wall clock.
  An advance action processes up to 600 fixed 100 ms ticks. Ten individual ticks
  equal one ten-tick action. Reset restores all state and default settings.
- Synthetic immutable 20 s asset, 10 fps, ten 2 s segments; each segment has 20
  packets and 160/180/200 kB of container bytes. Packet payload estimates divide
  those bytes equally (container overhead omitted). Separate initialization is
  16 kB. Keyframes occur every 4 s; sequential closed GOP dependencies have no
  B frames, reordering, configuration changes, or audio. This simplifies the
  fixture, not real codec behavior.
- One request at a time; latency precedes bytes/s transfer. The first media
  segment intentionally precedes init, making downloaded-but-unusable bytes
  observable. Only completed responses enter reusable cache. A stall freezes
  latency/body transfer while cached extraction, decoding, and playback continue.
  Prefetch uses a playback-relative horizon rounded to segments, prioritizing
  the next extraction segment even outside the horizon for dependencies.
- Cache (init + completed segments + whole reserved request) has a 1.6 MB hard
  budget. Least recently read segments are evicted, with deterministic ID ties;
  the next extraction segment is protected. Completed bytes can survive seeks
  but remain subject to ordinary eviction. Extracted payloads are independent
  copies in this model, counted separately from cached container bytes.
- Demuxing requires init plus the complete segment. Extraction is limited to
  five packets per tick and a configurable encoded target, capped at 80 packets.
  The decoded target includes both ready frames and pending output reservations,
  capped at 30 frames, with at most eight pending jobs. Lowering targets drains
  occupancy through future work/playback; it does not evict existing output.
- Decoder jobs run serial service at configured frames/s, then wait an additional
  fixed 300 ms for callback output. Submission cannot produce output in its own
  tick. Each synthetic packet yields one frame; these are teaching choices,
  not API throughput/latency/output-count guarantees. Pending jobs are not a
  claimed measurement of `decodeQueueSize` or decoder internal memory.
- Playback advances at the configured rate only through contiguous ready frames;
  it freezes on starvation. Pause affects presentation, not preparation. Consumed
  frames are released. Seek snaps down to a frame boundary, increments generation,
  clears packets/frames/jobs, cancels incomplete downloads, and restarts extraction
  and submission at the preceding keyframe. Outputs before the sought frame are
  preroll and released; old jobs cannot reenter the current generation. Reset is
  the only action that clears all cached data by policy.
- Metrics distinguish complete cached bytes, partial received bytes, lifetime
  transferred bytes (including canceled/refetched responses), encoded count and
  summed duration, decoded count/duration, contiguous playable lookahead, and
  estimated memory. Frame estimates are 1280 × 720 × 4 = 3,686,400 bytes; 30
  reservations = 110.592 MB. Decimal kB/MB throughout. Actual pixel formats,
  resource surfaces, decoder internals, and GPU memory are outside these estimates.
  Pending reservations are shown separately from real ready-output occupancy.
- Numeric settings are clamped to exported limits; nonfinite actions are ignored.
  Playback/horizon rounding prevents floating-point residues from reporting a
  nonzero playable duration for an empty queue. This was caught by the stall test.

### Documentation reverified 2026-10-29

- https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/decode — queued
  decode submission, configuration, and key-chunk requirements.
- https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/reset — queued
  work is discarded and configuration must be reestablished in a real engine.
- https://mediabunny.dev/guide/packets-and-samples — encoded versus raw data,
  WebCodecs correspondence, seconds versus microseconds, and dependency chains.

No new executable API snippets were introduced. Existing reference guidance on
initialization, seek ownership, and `VideoFrame.close()` still applies. Logical
frame release in this model owns no actual browser frames.

### Validation

- `npm run build`: passed, retaining the existing >500 kB chunk warning.
- `npm run lint`: only the same baseline 5 errors / 6 warnings. Focused ESLint
  for model, view, page, and tests passed. New model/view also passed separate
  strict TypeScript checking (the repository build does not enable strict mode).
- `npm run test:buffers`: all seven Node tests passed: immutable/repeatable
  transitions and reset; init gating/delayed output; seek/cache reuse/generation/
  keyframe preroll; drain/starvation/recovery; all settings affecting stages;
  budgets/eviction/refetch/end-of-stream and invalid actions across 1,000 mixed
  ticks; and incomplete-response cancellation without cache commitment.
  Direct test execution also passed; Node's isolated test subprocess required
  sandbox escalation in this environment.
- Headless Chrome checks passed direct hash-route loading, all eight range
  controls (seven settings + seek), keyboard changes, native assumptions
  disclosure, init gating, pending-versus-ready output, independently filled
  targets while paused, cache-preserving seek with keyframe restart, seek decode
  while stalled, starvation/recovery, reduced-motion manual stepping, and
  navigation/unmount/remount reset.
- All workbench descendants fit 1440px, 390px, and 320px viewports with assumptions
  expanded. Desktop/mobile screenshots inspected. The existing 320px body
  minimum-width/scrollbar interaction remains outside this change. Temporary
  CDP checks/screenshots are `/tmp/webcodecs-step8-browser.mjs` and
  `/tmp/webcodecs-step8-{1440,390,320}.png`. Vite/Chrome/CDP needed sandbox
  escalation for local browser access. No cross-browser, network/codec/media,
  GPU-memory, or real-time performance validation is claimed.

Step 8 is complete. Step 9 should consume this model rather than duplicate its
state, and may extend metrics/presets as needed for its substantial D3 demo.

## Step 9 — interactive three-buffer visualization (2026-10-29)

Completed Demo 3 by extending `ThreeBufferModelDemo.tsx` with
`BufferVisualization.tsx` and `bufferScenarios.ts`; the step-8 model remains the
single simulation authority. Added scoped styles in `src/App.css`, updated the
page's upcoming-demo text, and extended `tests/bufferModel.test.mjs`.

- D3 keyed joins render completed two-second cache segments and individual
  packets, pending jobs, and ready frames against a shared 0–20 s source timeline.
  New packet/job/frame marks move from the preceding row on individual ticks.
  Batch advances and scenario changes snap to their resulting snapshot rather
  than fabricate intermediate events. Pending work is a separate processing row,
  not a fourth media buffer. Incomplete response outlines/progress, playback
  cursors, target horizons, and occupancy/budget gauges use the actual model.
- Native inspection buttons highlight each row and explain its boundary. SVG
  summaries and ordinary metrics expose counts without requiring color or hover;
  native titles add token details. Engine/playback state, init readiness, latency,
  received bytes, and next pending output delay are also shown above the timeline.
- Memory bars share a linear 0–110.592 MB scale. Cached container bytes, independent
  packet payload copies, and ready-plus-reserved RGBA estimates remain separate;
  text splits ready versus pending estimates. The frame-format and GPU/internal
  memory limitations from step 8 still apply.
- All seven settings plus playback pause, seek, stall, reset, and manual ticks
  remain available. New explicit run/stop advances one fixed 100 ms model tick
  every 350 ms for observation; this is not a real-time playback benchmark.
  Playback pause continues preparation. Seeking stops the automatic clock for
  inspection. Running stops on hidden/offscreen views and reduced-motion changes;
  effects clean up intervals, visibility listeners, observers, and D3 transitions.
  Reduced motion uses manual stepping with no animated movement or automatic run.
  Continuous status announcements are suppressed while automatically running.
- Four repeatable scenarios are composed from existing model actions: downloaded
  bytes before init, submitted jobs before output, a 3 s cache-preserving seek
  after preparation, and starvation after a network stall. Each resets state and
  settings; accompanying text explicitly describes its starting point. Seek
  resumes from the 0 s keyframe, releases preroll, and preserves reusable downloads.

### Documentation verified 2026-10-29

Rechecked https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/decode,
https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/reset, and
https://mediabunny.dev/guide/packets-and-samples for queued decoding, reset,
keyframe/dependency requirements, and encoded versus raw boundaries. Also checked
https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame/allocationSize: a
copy-buffer size is format-dependent and is not a general GPU allocation measure.
No new executable browser/Mediabunny snippets or dependencies were added. Fixed
callback delays, one-packet/one-frame behavior, budgets, and transfer animation
remain explicitly illustrative application policies, not browser guarantees.

### Validation

- Build and separate strict TypeScript checks passed; the existing bundle-size
  warning remains. Focused ESLint passed for new/updated components, scenario
  module, page, and tests. Full lint retains baseline 5 errors / 6 warnings only.
- `npm run test:buffers`: all eight tests pass, including the new scenario test
  for deterministic snapshots, init gating, delayed output, cache-preserving seek,
  decoding cached preroll while stalled, starvation, and restored-network recovery.
  Isolated Node reporting required sandbox escalation.
- Headless Chrome/CDP passed direct routing, keyboard changes to every setting,
  manual advancement, native assumptions disclosure, paused independent filling,
  all four presets, D3 token counts/async output/cache preservation, actual moving
  output marks, keyboard row inspection, automatic advance/stop, reduced-motion
  shutdown/manual steps, offscreen shutdown, and navigation/remount reset.
- All demo descendants fit 1440px, 390px, and 320px viewports. Filled-state desktop
  and narrow screenshots were inspected; a selected-row theme fill issue found
  during review was fixed. The existing 320px body/scrollbar behavior remains.
  Browser scripts/screenshots: `/tmp/webcodecs-step9-browser.mjs`,
  `/tmp/webcodecs-step9-final.mjs` (final summary and running-unmount check), and
  `/tmp/webcodecs-step9-{filled-,}{1440,390,320}.png`. Vite/Chrome/CDP required
  sandbox escalation. No cross-browser, real media, or GPU-memory review claimed.

Step 9 is complete. Steps 10 onward remain unimplemented.

## Step 10 — A/V synchronization and output clocks (2026-10-29)

Implemented `AvSyncDemo.tsx`, `SyncTimeline.tsx`, pure `syncModel.ts`, and the
contextual `src/data/syncExample.ts`. Integrated Demo 4 after the three-buffer
model in Section C; added scoped styles and `npm run test:sync`. No dependency
or real audio/decoder execution was added.

The D3 timeline shares composition seconds across processing PCM, estimated
device output, decode completion and video PTS deadlines. Resizing preserves
readable SVG labels; native frame buttons expose exact timestamps and statuses
without requiring SVG pointer interaction. Audio latency, decoding delay and
position sliders recompute a deterministic scenario. Play/pause/reset and 20 ms
steps operate a deliberately slowed clock; reduced motion disables autoplay.
Intervals, resize/intersection observers and media/visibility listeners are
cleaned up. Offscreen/hidden demos stop playback; unmount/remount resets it.

Clock rules and assumptions:

- Context anchor 10 s maps to composition 0 s at rate 1; performance origin for
  that device-output instant is 20,000 ms. A timestamp pair 20 ms old is
  extrapolated using `(nowMs - performanceTime) / 1000`, then mapped through the
  context/composition anchor. The selected frame's inverse mapping gives its
  deadline in performance milliseconds. Tests also cover other rates/origins.
- The latency slider is an idealized total processing-to-device gap; it is not
  `outputLatency`, `baseLatency`, or their inferred difference from currentTime.
  The demo does not subtract latency from an already device-derived clock.
- Continuous primed 48 kHz audio, 8 s / 10 fps video, no drift or underruns.
  PCM marks aggregate 20 ms (960 sample frames/channel); these are not worklet
  render quanta. Preparation starts 150 ms ahead of the processing head, with
  a base decode delay plus repeating 0/40/100 ms variation. Negative preparation
  times represent preroll. More latency creates decode slack under this rule;
  deadlines stay anchored to the same audible composition position.
- Idealized frame decisions occur at max(PTS, ready time). Up to 60 ms late is
  presented; older output is dropped upon readiness. Canvas holds its last image.
  This is application policy. The displayed rAF scheduler can encounter extra
  jitter and discards superseded due frames; it cannot guarantee display timing.
- Scrubbing/settings changes recompute outcomes rather than preserving counters
  as lifetime telemetry. Reset returns the initial illustrative 2 s snapshot.
  Actual seek/pause/resume/rate changes require audio rescheduling, new anchors,
  queue invalidation and frame cleanup, not just a position-variable update.

Official sources reverified **2026-10-29**:

- <https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp>
- <https://webaudio.github.io/web-audio-api/#dom-audiocontext-getoutputtimestamp>
- <https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency>
- <https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency>
- <https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame>

The snippet checks method availability, running state, optional TypeScript
`AudioTimestamp` members, and positive/fresh timestamps before extrapolating.
Its 250 ms freshness cutoff and 60 ms late threshold are illustrative choices.
Caller prerequisites include a positive finite rate, scheduled/primed audio,
composition-mapped frame timestamps, and bounded sorted queue insertion. Cleanup
cancels rAF and closes owned queued frames; presented/dropped/superseded frames
are closed. It waits for a usable timestamp rather than assuming a fallback.
No Mediabunny signatures changed in this step.

Validation:

- `npm run build` passed; existing >500 kB bundle warning remains. Separate
  strict tsc checks for the new component/model/data and extracted snippet
  `/tmp/webcodecs-step10-snippet.ts` passed.
- Focused ESLint passed. Full `npm run lint` retains the baseline 5 errors and
  6 warnings in unrelated existing files.
- `npm run test:sync` passed all four synchronization tests: clock/deadline
  inversion and units, latency/decode effects, deterministic status/policy
  boundaries over 401 positions, and execution of the displayed snippet with
  fake output timestamps/frames/rAF to verify drop/draw/ownership/cleanup and
  suspended/unavailable clocks. All eight existing buffer tests passed.
  Node's isolated reporter prints file-level totals; direct execution with
  `node --experimental-strip-types tests/syncModel.test.mjs` exposes four tests.
- Headless Chrome CDP checks in `/tmp/webcodecs-step10-browser.mjs` passed:
  direct route, three settings, keyboard position/frame inspection, late/drop
  changes and latency slack, deadline anchoring, stepping/reset, pause,
  offscreen stopping, reduced motion, code disclosure, narrow layouts,
  keyboard-scrollable code, and unmount/remount cleanup. Local Vite/Chrome/CDP
  checks required sandbox escalation. Desktop/390px/320px screenshots at
  `/tmp/webcodecs-step10-*.png` were visually inspected. Shortened the narrow
  timeline caption and broke clock lines around row labels after review.
- No real audio devices, codec decoding, physical display timing, drift,
  cross-browser playback, or production fallback implementation was tested.
  The existing 320px body/scrollbar behavior remains outside this scope.

Step 10 is complete. Steps 11 onward remain unimplemented.

## Steps 11–12 — clip transitions and preview architecture (2026-10-29)

Implemented Demo 5 in `ClipTransitionDemo.tsx`, `ClipTimeline.tsx`, and pure
`clipModel.ts`. Section D uses `PreviewArchitecture.tsx`,
`ArchitectureDiagram.tsx`, and typed `src/data/previewArchitecture.ts`.
Integrated both in `WebCodecsPage.tsx`; scoped styles are in `src/App.css`.
Added focusable headings to Demos 1–4 for the existing `goToSection` helper.
No dependency, real media operation, or new displayed API snippet was added.

### Timing and transition decisions

- Rate 1×, two half-open source ranges: A [12,16) s → composition [0,4) s;
  B [30,34) s → [4,8) s. Composition 4 s belongs to B; 8 s is an exclusive
  endpoint with no new presentation. Mapping is `clipStart + sourcePTS - sourceIn`.
  Source 30.25 s → composition 4.25 s. WebCodecs timestamps are microseconds;
  Mediabunny packet times are seconds. A synthetic DTS/PTS table distinguishes
  submission order, mapped presentation order, and execution/preparation time.
- A is primed. B starts preparation at `4 - lead`; video/audio each become fully
  ready at start + their separate cost. The whole B range is assumed available
  after those costs, not modeled per-frame/network throughput. A tiny synthetic
  dependency group begins at keyframe 29.5 s; its preroll output maps before 4 s
  and must be released rather than presented as A. It is not a real bitstream.
- Timeline cursor and progress fills move with fixed 50 ms simulated steps every
  100 ms. Native controls support scrubbing, manual steps, boundary jumps and
  reset. Reduced motion disables autoplay; hidden/offscreen demos stop running.
  Effects clean up timers, listeners, resize/intersection observers and D3 work.
- A late stream shows an amber missing-output span. This inspection model keeps
  composition advancing, holding video or using silence for missing output;
  that behavior exposes failure and is not called seamless playback. A real
  engine can instead stall both streams and re-anchor. Scrubbing/settings changes
  recompute hypothetical history rather than execute a media seek.
- Conditions cover decoder support/configuration/extradata, separate prepared
  instances vs safe reconfiguration, keyframe dependencies and delayed output,
  PCM edge trimming, codec delay/padding, sample rates/layout/resampling, and
  retained resource cleanup/cancellation/generation checks. 48 kHz source sample
  frames map to adjacent composition ranges without claiming click-free sound;
  waveform discontinuities may need a crossfade.

### Ownership decisions

The diagram has 14 nodes, 17 directed data/control paths, and all 24 Section D
responsibilities: Browser (5), Mediabunny (6), Application (13). Typed data drives
both inspection and the complete checklist. Native ownership toggles highlight
without removing nodes; native node buttons provide keyboard equivalents to
SVG clicks. The inspector names inbound/outbound connections and links to a
focusable relevant reference/demo. Responsive SVG layouts use three columns
or one on narrow containers; labels wrap and inspector content is ordinary text.

The design chooses app-owned fetch scheduling/cache/CustomSource adapter,
encoded queues and decoder orchestration. Browser fetch transport remains
separate from application request policy. Mediabunny sample sinks are an
alternative decoding route to both decoded queues, not an extra decode pass.
UrlSource can manage fetching; higher-level library sinks can shift work across
these recommended boundaries. Timelines, budgets, cancellation, synchronization
and transition policies are choices of the illustrated application architecture.

### Official documentation verified 2026-10-29

- https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/configure — codec,
  description/extradata, dimensions and configuration support.
- https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/reset — discards
  queued work/state and configuration; configure again before decoding.
- https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/decode — queued
  submission and key chunk requirements.
- https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame/close and
  https://developer.mozilla.org/en-US/docs/Web/API/AudioData/close — release owned
  raw media resources after their final use.
- https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start —
  context-time scheduling in seconds, buffer offset/duration, one-shot sources.
- https://mediabunny.dev/guide/packets-and-samples — packets vs raw samples,
  ordering/dependencies, timestamp units.
- https://mediabunny.dev/guide/reading-media-files — sources, track metadata,
  configuration and disposal boundaries.
- https://mediabunny.dev/guide/media-sinks — encoded extraction versus optional
  VideoSampleSink/AudioSampleSink decoding, raw samples and release.
- https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API,
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API,
  https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API, and
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API — browser
  primitives versus the app policies connecting them.

### Validation and limits

- `npm run build` passed, including TypeScript; existing >500 kB warning remains.
  Separate strict tsc checks for the new components/model/data passed.
- Full `npm run lint` retains the baseline 5 errors / 6 warnings; focused ESLint
  on all new files, page and tests passed.
- `npm run test:clips`: four tests pass for boundary mapping/round trips,
  independent readiness and recovery, dependency/presentation order and preroll,
  plus architecture data-path reachability to both outputs through either
  explicit decoders or optional sample sinks. Floating-point comparisons use
  tolerances. Existing four sync tests and eight buffer tests also pass.
- Headless Chrome/CDP verified direct routing, all controls, keyboard scrubbing,
  both sides of the cut, independent missing output and preparation recovery,
  reset/step/pause, reduced motion, offscreen stopping and remount reset. Checked
  all three ownership toggles, all 14 node inspectors and related-link focus,
  all 17 SVG connections, sample-boundary/cleanup disclosure and full checklist.
- Expanded new content fits 1440px, 390px and 320px element widths (packet table
  intentionally scrolls inside a focusable region). Desktop/narrow screenshots
  inspected at `/tmp/webcodecs-step11-{clips,architecture}-{1440,390,320}.png`.
  Browser check script: `/tmp/webcodecs-step11-browser.mjs`. Local Vite, Chrome
  and CDP access required sandbox escalation. The pre-existing 320px body/
  scrollbar behavior remains. No cross-browser, physical audio/display,
  codec bitstream, production scheduling or real-media transition test is claimed.

Steps 11 and 12 are complete. Step 13 remains the full-page acceptance audit.

## Step 13 — final acceptance review (2026-10-29)

Audited all of `PLAN.md`; the complete inventory, edge-case decisions,
sources and validation are in [webcodecs-acceptance.md](webcodecs-acceptance.md).
All four sections, 34 browser APIs, 11 Mediabunny APIs, five D3 demos and all
24 ownership responsibilities are present. The page traces both network-to-output
paths and explains timing, buffering, ownership and source/composition transitions.

Fixed offscreen autoplay in `VideoPipelineDemo.tsx` and `AudioPipelineDemo.tsx`
with cleaned-up intersection observers, tightened the index output-clock helper
in `src/data/webcodecs.ts`, and fixed classic-scrollbar overflow at 320px with
a page-scoped minimum-width override in `src/App.css`.

Added dependency-free browser acceptance, source-extracted strict snippet checks,
and displayed clock/worklet runtime checks in `tests/webcodecs.browser.mjs`,
`tests/webcodecsSnippets.mjs` and `tests/webcodecsExamples.test.mjs`; added
`test:webcodecs`, `check:webcodecs-snippets` and `test:webcodecs-browser` scripts.
All 44 snippets pass against TypeScript 6 DOM plus temporary Mediabunny 1.64.0
(library declaration overlap is handled as documented). Eighteen model/example
tests pass; build and focused lint pass. Full lint retains only its baseline
5 errors / 6 warnings; the existing bundle-size warning remains.

Chrome checked direct routing, keyboard categories/search/disclosures and heading
focus; repeated demo step/reset/autoplay/offscreen/reduced-motion/unmount cycles;
single active clocks; cache cancellation/reuse; both audio strategies; all
architecture toggles/nodes/related destinations; and expanded content at
1440/390/320px. Supplementary earlier buffer/sync/clip/architecture scripts were
rerun against the current page (the old sync selector needed scoping after the
clip demo began sharing its CSS class). Selected desktop/narrow screenshots were
visually inspected. Runtime media, physical device/display timing and cross-browser
execution are not claimed. No dependencies added; no known step-13 acceptance
gap remains beyond the documented pre-existing checks and simulation limitations.
