# WebCodecs page acceptance review

Reviewed **2026-10-29**, step 13 of [STEPS.md](../STEPS.md), against all of
[PLAN.md](../PLAN.md). The page is complete at `/#/webcodecs`, reachable from
the primary navigation. [webcodecs-reference.md](webcodecs-reference.md)
contains the implementation history and detailed source research.

## Deliverable and objective coverage

| PLAN requirement | Implementation and evidence |
| --- | --- |
| Existing application integration | `src/App.tsx` route/navigation and `src/pages/WebCodecsPage.tsx`; existing React, strict TypeScript, D3 and theme/layout conventions. Direct loading and navigation away/back checked in Chrome. |
| A: capabilities and exclusions; objective 1 | `Capabilities.tsx`: nine illustrated capabilities, including seeking, composition and eventual encoding/export; six explicit WebCodecs exclusions. |
| B: navigable technical reference; objective 2 | `ApiIndex.tsx`, `src/data/webcodecs.ts`: 34 entries across seven responsibilities, with inputs, outputs, members, lifecycle, pitfalls, examples and official links. Keyboard filtering, search, recovery and disclosures verified. |
| Mediabunny integration | `MediabunnyGuide.tsx`, `src/data/mediabunny.ts`: all 11 required APIs, four contextual modules and `ByteCacheWalkthrough.tsx`. Complete MP4 versus initialized fragmented MP4/CMAF, cancellation/cache reuse and four buffer/source layers are explicit. |
| C1: network → video; objectives 3, 4, 6 | `VideoPipelineDemo.tsx`, `src/data/videoPipeline.ts`: eight D3 stages, eleven reversible events, packet motion, boundary inspector, I/P/B decode/presentation ordering, delayed output and frame ownership. Three panels compose one inspection function. |
| C2: network → audio; objectives 3, 4, 6 | `AudioPipelineDemo.tsx`, audio data files: nine D3 stages, both scheduled sources and worklet queue, rate/channel/block controls, sample-frame consumption, underrun/recovery, PCM accounting and four separate modules. |
| C3: buffering; objective 5 | `ThreeBufferModelDemo.tsx`, `BufferVisualization.tsx`, `bufferModel.ts`, `bufferScenarios.ts`: substantial D3 occupancy/data flow, all seven settings, pause/seek/stall/reset and deterministic scenarios. Separate bytes, packets, pending output, frames, durations and memory estimates. |
| C4: synchronization; objective 5 | `AvSyncDemo.tsx`, `SyncTimeline.tsx`, `syncModel.ts`, clock snippet: shared timeline, processing versus output head, latency/delay/position controls, deadlines, lateness/drop policy, timestamp-pair mapping with explicit anchors and units. |
| C5: clip transitions; objective 7 | `ClipTransitionDemo.tsx`, `ClipTimeline.tsx`, `clipModel.ts`: A source [12,16) → [0,4), B [30,34) → [4,8), scrubbing around the cut, independent video/audio preparation, DTS/PTS table, sample boundaries and cleanup guidance. |
| D: ownership and editing preview; objectives 6, 7 | `PreviewArchitecture.tsx`, `ArchitectureDiagram.tsx`, architecture data: 14 nodes, 17 data/control paths, all 24 responsibilities, three ownership toggles and complete checklist. Node inspectors and ordinary buttons provide alternatives to SVG tooltips/clicks. |
| Practical TypeScript and official references | All 44 example modules/batches strictly type-checked; every API and guide entry links official documentation. Contextual prerequisites are beside the snippets; no example is automatically executed by the page. |
| Deterministic interactions/accessibility/lifecycle | Pure simulation models; native buttons, selects, ranges, disclosures and focusable scrolling regions; explicit heading focus and sticky-nav clearance; reduced motion disables autoplay; observers, listeners, timers and D3 transitions have effect cleanup. Browser checks cover repeated runs, resets, offscreen stopping and route remounts. |
| Responsive presentation | All references/examples expanded at 1440, 390 and 320px; page element bounds and document width checked. Selected screenshots visually inspected across capabilities, reference, pipelines, buffers, sync, clips and architecture. |
| Dependencies/architecture | No new runtime or test dependencies. Mediabunny remains an external example dependency; no production playback engine or separate website was introduced. |

## Complete reference inventory

| Group | APIs present |
| --- | --- |
| Network/bytes (6) | `fetch`, `Response.arrayBuffer()`, `ReadableStream`, `AbortController`, `ArrayBuffer`, `Uint8Array` |
| Video decoding (5) | `VideoDecoder`, `VideoDecoderConfig`, `EncodedVideoChunk`, `VideoFrame`, `VideoDecoder.isConfigSupported()` |
| Audio decoding (5) | `AudioDecoder`, `AudioDecoderConfig`, `EncodedAudioChunk`, `AudioData`, `AudioDecoder.isConfigSupported()` |
| Video presentation (4) | `HTMLCanvasElement`, `CanvasRenderingContext2D`, `OffscreenCanvas`, `requestAnimationFrame` |
| Audio presentation (7) | `AudioContext`, `AudioBuffer`, `AudioBufferSourceNode`, `AudioWorklet`, `AudioWorkletNode`, `AudioWorkletProcessor`, `AudioContext.getOutputTimestamp()` |
| Concurrency/memory (5) | `Worker`, `MessageChannel`, `MessagePort`, `SharedArrayBuffer`, `Atomics` |
| Encoding (2) | `VideoEncoder`, `AudioEncoder` |
| Mediabunny (11) | `Input`, `BlobSource`, `BufferSource`, `UrlSource`, `CustomSource`, `InputVideoTrack`, `InputAudioTrack`, `EncodedPacket`, `EncodedPacketSink`, `VideoSampleSink`, `AudioSampleSink` |

Section D's complete ownership checklist covers Browser (WebCodecs decoding,
audio rendering, Canvas rendering, timing primitives, worker execution),
Mediabunny (parsing, demuxing, track metadata, packet extraction, configuration
helpers, optional sample decoding), and Application (fetch scheduling,
DASH/segments, caching, encoded buffering, decoder orchestration, frame
buffering, PCM queues, composition evaluation, playback coordination,
seeking/cancellation, budgets, synchronization, transitions).

## Technical edge-case audit

| Concern | Reviewed outcome |
| --- | --- |
| Units | WebCodecs PTS/duration in µs, Mediabunny in seconds, Web Audio scheduling/context in seconds, performance/rAF in ms; helpers convert once. PCM sample frames, channel scalar samples and float32 bytes remain distinct. |
| Submission/order/queues | Containers require demuxing; chunks submit in decode order and video outputs in presentation order. Submission returns before output. Queue sizes count pending requests, not completed media; flush drains rather than serving as a playback clock. Post-flush key requirements and reset/reconfiguration are documented. |
| Ownership | Output frames/AudioData and clones need release after final use, drop or cancellation. Borrowed versus consumed handles are labeled. Canvas drawing does not transfer ownership. Input, decoders, context, one-shot sources, ports and workers have separate lifetimes. |
| Seek/dependencies | Seek retains complete reusable cached bytes, invalidates decoded/pending generations, cancels partial downloads and restarts through a keyframe dependency path. Preroll output must be discarded; arbitrary CMAF fragments need initialization and dependencies. |
| Capability/configuration | Feature checks and exact support checks precede illustrative codec use; metadata, a codec name or a supported config do not guarantee every stream or resource allocation. Muxing/finalization is separate from encoding. |
| Audio clocks/latency | Output pairs describe one sample in context seconds and performance ms. Extrapolate only while running from a usable recent pair; map through composition anchors. Do not subtract latency again. The 250 ms freshness/60 ms drop thresholds are example application policy. |
| Audio rendering | Scheduled sources start once and require future scheduling. Worklet process is synchronous, bounded and allocation-free; actual array length determines block size. FIFO underrun, overflow, alignment, resampling and producer backpressure are explicitly application concerns. |
| Memory | Compressed cache, extracted packets and decoded storage are separate. RGBA estimates are illustrative rather than actual VideoFrame allocations. Pending output reserves capacity; copied packets may duplicate cached payload bytes. |
| Architecture | Browser fetch transport differs from app request policy. UrlSource/library-managed decoding can shift responsibilities; sample sinks are alternatives to manually orchestrated decoders, not a mandatory second decode pass. |

Sources rechecked on **2026-10-29**:

- [WebCodecs specification](https://www.w3.org/TR/webcodecs/): decode queue semantics, presentation order, asynchronous processing, key requirements, configuration and resource lifetimes.
- [MDN output timestamps](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp) and [Web Audio output timestamp algorithm](https://webaudio.github.io/web-audio-api/#dom-audiocontext-getoutputtimestamp): clock origins/units and output estimation.
- [MDN worklet process](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process): variable-size-safe render code and processing lifetime.
- [Mediabunny reading](https://mediabunny.dev/guide/reading-media-files), [media sinks](https://mediabunny.dev/guide/media-sinks), [packets/samples](https://mediabunny.dev/guide/packets-and-samples): source signatures/disposal, track/configuration access, decode-order extraction, seconds and sample cleanup.

The earlier dated browser API source groups in `webcodecs-reference.md` remain
the detailed per-API bibliography. All current snippets were extracted directly
from source, rather than type-checking stale copies from earlier sessions.

## Review fixes

- Video/audio pipeline autoplay now pauses when its demo leaves the viewport,
  matching the other three demos. Intersection observers disconnect on pause
  and unmount. Repeated runs create exactly one simulation timer.
- The API index output-clock helper rejects zero/startup, future and stale
  timestamp pairs, consistent with the larger synchronization example.
- A scoped `body:has(.webcodecs-page)` minimum-width override prevents horizontal
  overflow when a classic scrollbar reduces a nominal 320px viewport to 305px.
  Other routes retain their existing minimum width.
- Added reusable acceptance commands and tests so the review can be repeated.

## Validation and reproduction

- `npm run build`: passed (includes TypeScript). Existing >500 kB bundle warning remains.
- `npm run lint`: the baseline **5 errors / 6 warnings** remain in
  `Visualizations.tsx`, `components/codecs/CodecViz.tsx`, `BrowserDashMsePage.tsx`
  and `DesktopPlayerPage.tsx`. Focused ESLint on all WebCodecs components/data,
  the page and tests passed. No new lint errors.
- `npm run test:webcodecs`: all four files passed (18 test cases: eight buffer,
  four sync, four clip/architecture, two displayed-example runtime tests).
- `npm run check:webcodecs-snippets`: checks 38 examples without Mediabunny;
  explicitly reports six skipped library examples. To check all 44, supply an
  installed Mediabunny package directory:
  `npm run check:webcodecs-snippets -- /path/to/node_modules/mediabunny`.
  Review used the existing temporary Mediabunny **1.64.0** installation at
  `/tmp/webcodecs-step6-types/node_modules/mediabunny`. Its legacy ambient
  WebCodecs declarations overlap TypeScript 6 DOM, so library declaration checks
  are skipped in this mode; example call sites remain strict and use real
  library signatures. Worklet globals have a minimal documented test declaration.
- `APP_URL=http://127.0.0.1:5179 CDP_URL=http://127.0.0.1:9230 npm run test:webcodecs-browser`:
  passed against local Vite and headless Chrome. Start those separately (Chrome
  needs `--headless --remote-debugging-port=9230` and a disposable user-data-dir).
  The script checks navigation/focus, category counts/search/disclosure,
  every demo's step/reset/repeated autoplay/offscreen/reduced-motion/unmount
  behavior, single active clocks, expanded-content widths and uncaught exceptions.
  It writes screenshots to `/tmp/webcodecs-review-*.png`; these are local review
  artifacts, not repository assets. Local server/browser connections required
  sandbox escalation.

## Known limits

This is an educational page of silent conceptual simulations and contextual
examples. It does not download/play/export media or provide a complete preview
engine. Clock freshness, dropping, queue sizes, preparation costs, network
behavior and memory estimates are explicit teaching choices. Browser review
covers Chrome; physical audio/display timing, real codec transitions, resampling,
production streaming/backpressure and cross-browser execution remain untested.
Type-checking alone does not establish end-to-end media execution. The old
full-project lint failures and bundle-size warning remain outside step 13.
