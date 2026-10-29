# WebCodecs & Browser Media APIs — Implementation Steps

This file breaks [PLAN.md](PLAN.md) into tasks intended for separate sessions with fresh context. `PLAN.md` remains the complete specification. This checklist plans the implementation; creating it does not mark any implementation work complete.

## How to use this file

Start a session with: **“Implement step N from STEPS.md. Read PLAN.md, the handoff notes, and the relevant existing code first. Complete and validate that step, then update STEPS.md.”**

Work in order unless a step's dependencies explicitly allow otherwise. Complete only the requested step. Each step should leave the application buildable and its new content reachable. Later steps add to the page rather than replacing earlier work.

At the end of each session:

- Mark the step complete only when its acceptance criteria pass.
- Add a short dated handoff under that step: files changed, decisions, commands/results, documentation verified, and any remaining limitations.
- Record enough information that the next session does not depend on conversation history. Do not claim checks or visual reviews that were not performed.
- Run `npm run build` (includes TypeScript checking) and `npm run lint` for implementation changes. Record pre-existing failures separately. Run relevant tests if available; the current `package.json` has no test script.

## Rules shared by every implementation step

- Follow the existing React, strict TypeScript, D3, routing, and styling conventions. Avoid unrelated refactoring and unnecessary dependencies.
- Treat this as an educational page with conceptual simulations, not a requirement to build a production playback engine. Clearly distinguish simulations, illustrative snippets, and executable examples.
- Verify technical claims and examples against current official browser documentation and <https://mediabunny.dev>. Record source URLs and the verification date in a durable reference document created in step 1; recheck relevant signatures when implementing snippets.
- Use meaningful D3 interactions, deterministic simulation state, accessible controls, responsive diagrams, and reduced-motion behavior. Clean up timers, animation frames, D3 transitions, listeners, and owned media resources.
- Keep React components focused. Extract shared visualization primitives only when there is a demonstrated benefit.
- Preserve the four major sections: A — Capabilities; B — API Index; C — How the APIs Work Together; D — Architectural Boundaries.

## Step 1 — Explore the app and record the technical foundation

- [x] Complete

**Depends on:** Nothing.

**Work:**

- Inspect routing/navigation in `src/App.tsx` and `src/main.tsx`; styles in `src/App.css` and `src/index.css`; and representative pages in `src/pages/CodecsPage.tsx`, `src/BrowserDashMsePage.tsx`, and `src/DesktopPlayerPage.tsx`.
- Study D3 integration and reusable UI in `src/components/codecs/`, especially `CodecViz.tsx`. Review the deployed app linked in `PLAN.md` if browser access is available.
- Establish baseline build/lint results and available test/browser tooling.
- Create `docs/webcodecs-reference.md` with repository conventions, proposed component/data layout, documentation links, verification dates, and important API findings. Favor `src/pages/`, `src/components/webcodecs/`, and `src/data/` unless exploration suggests a better existing convention.
- Record verified rules for timestamp units, decode/presentation order, asynchronous decoder output, queue semantics, ownership/cleanup, codec support, audio clocks, and AudioWorklet constraints.
- Verify Mediabunny's source, track, packet, sink, and configuration APIs. Record how complete MP4 input differs from fragmented MP4/CMAF input requiring initialization metadata.

**Acceptance:** The next session can identify the correct integration points and source references without repeating broad exploration. Baseline checks and unresolved technical questions are recorded. No application implementation is required in this step.

**Handoff — 2026-10-29:** Created [docs/webcodecs-reference.md](docs/webcodecs-reference.md) after reading `PLAN.md`, routing, global styles, all three representative pages, codec visualization primitives, and representative codec components/data. Recorded route/navigation integration points, theme/layout conventions, D3 lifecycle/accessibility gaps, and proposed `src/pages/`, `src/components/webcodecs/`, and `src/data/` organization. Verified official W3C/MDN and Mediabunny documentation for timing, ordering, asynchronous output, queues, ownership, support checks, audio clocks/worklets, sources/tracks/packets/sinks/configuration, cache boundaries, and MP4 initialization. Each source group has a verification date and URLs in the reference. Baseline `npm run build` passed (existing >500 kB chunk warning); `npm run lint` failed with 5 pre-existing errors and 6 warnings, enumerated in the reference. No test script/runner exists. Chrome/Firefox binaries exist, but no interactive browser tool or installed automation dependency was found; the deployed URL was inaccessible via the web tool, and no visual review is claimed. No application code or dependencies changed. Remaining fixture/runtime/type checks are listed for later steps; proceed with step 2 only when requested.

## Step 2 — Add the page, navigation, and capabilities introduction

- [x] Complete

**Depends on:** Step 1.

**Work:**

- Add a page titled “WebCodecs & Browser Media APIs,” a `/webcodecs` route, and a primary navigation link using the existing router.
- Establish the four section anchors and local section navigation. Add later sections incrementally without presenting unfinished demos as complete.
- Build Section A with capability cards and meaningful illustrations or subtle animations for video/audio decoding, Canvas, Web Audio, buffer management, synchronization, seeking, clip composition, and encoding for eventual export.
- Explain that WebCodecs supplies no network engine, MP4 demuxer, DASH parser, built-in player, automatic A/V sync, or editing timeline.
- Reuse existing layouts, typography, colors, and controls; introduce only the page-specific styles needed.

**Acceptance:** The page is reachable through navigation and direct hash-route loading, looks consistent with existing pages, and presents all capabilities and exclusions on desktop and small screens.

## Step 3 — Build the API index and cover network/video APIs

- [x] Complete

**Depends on:** Steps 1–2.

**Work:**

- Implement Section B as a typed, data-driven technical reference with responsibility navigation and expandable cards or detail panels. Add search/filtering if useful for this entry count.
- Give every entry purpose, inputs/outputs, key methods/properties, lifecycle, pitfalls, official documentation links, and valid TypeScript examples where useful.
- Cover network/bytes: `fetch`, `Response.arrayBuffer()`, `ReadableStream`, `AbortController`, `ArrayBuffer`, `Uint8Array`.
- Cover video decoding: `VideoDecoder`, `VideoDecoderConfig`, `EncodedVideoChunk`, `VideoFrame`, `VideoDecoder.isConfigSupported()`.
- Cover video presentation: `HTMLCanvasElement`, `CanvasRenderingContext2D`, `OffscreenCanvas`, `requestAnimationFrame`.
- Address cancellation, byte views versus copies, decoder configuration, microsecond timestamps, decode order, asynchronous output, queue backpressure, and frame cleanup.

**Acceptance:** All listed entries are navigable and usable with a keyboard. Examples match verified signatures, and the index can accept the remaining categories without a redesign.

**Handoff — 2026-10-29:** Added `src/data/webcodecs.ts` (typed categories and 15 complete API entries) and `src/components/webcodecs/ApiIndex.tsx`; integrated Section B in `src/pages/WebCodecsPage.tsx` and added scoped responsive styles in `src/App.css`. Native disclosures, responsibility filters, text search, live counts, and empty-state recovery work by keyboard; future categories append to the data. Each entry includes contextual illustrative TypeScript and official documentation links. Reverified network/bytes, video decoder/configuration/chunk/frame, Canvas/offscreen, and repaint documentation; URLs, decisions, and validation are recorded in `docs/webcodecs-reference.md`. `npm run build` passed with the existing chunk warning; `npm run lint` reports only the baseline 5 errors / 6 warnings; focused lint passed. All 15 displayed snippets passed separate strict TypeScript DOM checks. Headless Chrome checks passed for direct hash-route loading, keyboard category selection and disclosure toggling, combined search/filtering, empty-state reset, and all snippets being reachable. Expanded cards fit 390px and 320px viewports with reduced motion emulated; desktop/mobile screenshots were inspected. No dependencies added. Snippets were not executed against real media, and no cross-browser review is claimed. Steps 4 onward remain unimplemented.

## Step 4 — Complete the audio, concurrency, and encoding API index

- [x] Complete

**Depends on:** Step 3.

**Work:**

- Cover audio decoding: `AudioDecoder`, `AudioDecoderConfig`, `EncodedAudioChunk`, `AudioData`, `AudioDecoder.isConfigSupported()`.
- Cover audio presentation: `AudioContext`, `AudioBuffer`, `AudioBufferSourceNode`, `AudioWorklet`, `AudioWorkletNode`, `AudioWorkletProcessor`, `AudioContext.getOutputTimestamp()`.
- Cover concurrency/memory: `Worker`, `MessageChannel`, `MessagePort`, `SharedArrayBuffer`, `Atomics`.
- Cover encoding: `VideoEncoder`, `AudioEncoder`, including configuration, input/output, resource ownership, and the separate muxing/export responsibility.
- Explain PCM layout, channels/sample frames, seconds versus microseconds, one-shot source nodes, audio context activation, worklet rendering constraints, transfer versus sharing, and shared-memory isolation requirements where relevant.
- Describe browser capability differences through feature/configuration checks rather than unsupported universal claims.

**Acceptance:** Every browser API named in `PLAN.md` has a complete reference entry. Filtering/navigation continues to work across all categories.

**Handoff — 2026-10-29:** Added 19 complete browser API entries in `src/data/webcodecs.ts`, bringing the reference to all 34 APIs across seven categories. Updated `ApiIndex.tsx` introduction and unit guidance. Covered PCM layout/sample frames, activation and one-shot sources, output timestamp mapping, worklet processing constraints, transfer/sharing/isolation, encoder configuration and ownership, and separate muxing/export. Rechecked official MDN/W3C documentation; source URLs, decisions, and limitations are recorded in `docs/webcodecs-reference.md`. Build passed with the existing chunk warning; full lint retains only baseline 5 errors / 6 warnings; focused lint and all 34 strict TypeScript snippet checks passed. Headless Chrome verified every category count and keyboard filtering/disclosures, combined search, empty-state recovery, and all snippets being reachable. Expanded cards fit 390px and 320px with reduced motion; desktop/mobile screenshots were inspected. No dependencies, runtime media operations, or new CSS added. Snippets are contextual examples; no real audio, worklet/worker module execution, codec/export, or cross-browser review is claimed. Proceed with step 5 when requested.

## Step 5 — Add the Mediabunny and byte-cache reference

- [x] Complete

**Depends on:** Steps 1–4.

**Work:**

- Add a focused Mediabunny guide within the page that later demos can link to.
- Explain `Input`, `BlobSource`, `BufferSource`, `UrlSource`, `CustomSource`, `InputVideoTrack`, `InputAudioTrack`, `EncodedPacket`, `EncodedPacketSink`, `VideoSampleSink`, and `AudioSampleSink`.
- Show verified TypeScript boundaries for opening input, inspecting tracks/configuration, extracting encoded packets, and optionally using higher-level sample decoding.
- Illustrate an application-owned byte cache satisfying `CustomSource` random-access reads. Explain cache misses, cancellation, and the source/cache boundary without describing `CustomSource` as an appendable buffer.
- Distinguish downloaded segment cache, source abstraction, encoded packet buffer, and decoded frame buffer.
- Explain complete MP4 versus initialization metadata plus fragmented MP4/CMAF segments. Avoid implying arbitrary segments can always be decoded independently.
- Keep snippets as documented examples unless an actual dependency/runtime integration is justified; do not add Mediabunny solely to display code.

**Acceptance:** All required Mediabunny APIs are explained with official links. The cache/source distinction and initialization requirements are unambiguous, and snippets use verified signatures.

**Handoff — 2026-10-29 (repair after step 6):** Implemented the previously missing guide in `MediabunnyGuide.tsx`, `ByteCacheWalkthrough.tsx`, and `src/data/mediabunny.ts`, integrated after the Section B API index. Added navigation from the page, API index, and Demo 1 using shared `sectionNavigation.ts`; scoped responsive styles are in `src/App.css`. All 11 required APIs have boundaries, lifecycle guidance, and official links. Added four independent illustrative TypeScript modules and a deterministic cache walkthrough covering partial hits/misses, cancellation via disposal, and retained cache reuse. Distinguished all four cache/source/packet/frame layers and complete versus initialized fragmented MP4/CMAF. Official documentation/signatures reverified; URLs, decisions, and limitations are in `docs/webcodecs-reference.md`. Build and focused lint/strict checks passed; full lint retains baseline 5 errors / 6 warnings. All four examples passed strict tsc against temporary Mediabunny 1.64.0; the displayed cache adapter also passed real-MP4 demux/cache-reuse/abort/short-read checks. Chrome passed all disclosures, navigation/focus, cache scenarios, and narrow/reduced-motion layouts; desktop/mobile screenshots inspected. No project dependency added. Examples do not implement HTTP transport, playback, or production cache budgets. This resolves the missing step-5 guide reported during step 6.

## Step 6 — Implement Demo 1: network bytes to displayed video

- [x] Complete

**Depends on:** Steps 2–5.

**Work:**

- Build a D3 pipeline: HTTP Fetch → ArrayBuffer → Container Demuxer → Encoded Video Packets → EncodedVideoChunk → VideoDecoder → VideoFrame → Canvas.
- Place Mediabunny `Input`, `BufferSource`, and `EncodedPacketSink` at their actual boundaries.
- Add forward/backward stepping, play/pause/reset, packet movement, and stage selection with inputs, outputs, transformation, synchronous/asynchronous behavior, and ownership.
- Include concise verified TypeScript examples covering demuxing, configuration, chunk submission, decoder output, Canvas drawing, and frame cleanup.
- Explicitly distinguish container bytes from codec chunks, submission from output, and decode order from presentation order.

**Acceptance:** A reader can step through the whole path and identify the data type and responsible component at each boundary. Animation stops cleanly on pause/unmount and remains understandable with reduced motion.

**Handoff — 2026-10-29:** Added `VideoPipelineDemo.tsx` and typed `src/data/videoPipeline.ts`; integrated Demo 1 in Section C of `WebCodecsPage.tsx` and added scoped responsive styles in `src/App.css`. D3 renders eight selectable boundaries and moving data; eleven reversible snapshots separate chunk submission, delayed output, frame ownership, and Canvas drawing/cleanup. Added play/pause/replay/reset, keyboard stage inspection, decode/presentation order examples, reduced-motion manual exploration, resize handling, and timer/transition/listener cleanup. Three contextual TypeScript panels form a bounded complete-MP4 inspection example. Rechecked official Mediabunny, MDN, and W3C sources; details and URLs are in `docs/webcodecs-reference.md`. Build passed with the existing bundle warning; full lint retains baseline 5 errors / 6 warnings; focused lint, strict component/data checks, and strict snippet checks against Mediabunny 1.64.0 passed (temporary dependency only). Headless Chrome passed interaction, ownership/delayed-output, pause, reduced-motion, unmount/remount, and 320px/390px layout checks; desktop/mobile screenshots inspected. No real media or cross-browser execution claimed. Existing gap: step 5 is checked complete but its guide/integration/handoff is absent; step 6 explains its required boundaries locally without implementing the broader step-5 scope. **Resolved by the step-5 repair handoff above.**

## Step 7 — Implement Demo 2: network bytes to audible audio

- [x] Complete

**Depends on:** Steps 4–6.

**Work:**

- Build the D3 audio pipeline from Fetch/ArrayBuffer through Mediabunny, encoded packets/chunks, AudioDecoder, AudioData/PCM, audio output, and speakers.
- Provide selectable output strategies: scheduled `AudioBufferSourceNode` playback and an `AudioWorklet` with a PCM queue.
- Animate sample frames consumed in processing blocks; expose sample rate, channel count, queue state, and continuous rendering concepts.
- Explain why displaying a video frame differs from feeding a continuous audio output, including underruns and scheduling.
- Include verified snippets for PCM handling, output scheduling, and worklet boundaries, with ownership/cleanup and real-time constraints. Do not treat a particular processing block size as an unconditional API guarantee.

**Acceptance:** Both strategies are explorable, the PCM visualization has consistent units, and explanations distinguish decoder output from audible device output. Any real audio output, if added, starts only through user interaction.

**Handoff — 2026-10-29:** Added `AudioPipelineDemo.tsx`, `src/data/audioPipeline.ts`, and `src/data/audioPipelineExamples.ts`; integrated Demo 2 in Section C and scoped its styles in `src/App.css`. Nine selectable D3 boundaries trace bytes through Mediabunny, chunks, delayed AudioData, PCM, rendering, and device output. Both scheduled-source and worklet strategies expose deterministic stepping/play/pause/reset, selectable rate/channels/illustrative block size, per-channel PCM consumption, underrun/refill/recovery, consistent frame/sample/byte/time metrics, and strategy-specific timing/ownership explanations. Four contextual TypeScript modules cover demux/decode, planar PCM scheduling, transfer, and a bounded variable-block-safe worklet ring. Official browser/Mediabunny sources and verification details are recorded in `docs/webcodecs-reference.md`. Build passed with the existing bundle warning; full lint retains baseline 5 errors / 6 warnings; focused lint, strict component/data checks, and all four strict snippet checks passed (temporary Mediabunny 1.64.0). The displayed ring passed isolated ordering/wrap/overflow/underrun/variable-block/stop checks. Chrome passed keyboard/focus, all scenario metrics for both strategies, format changes, playback/reduced-motion/unmount cleanup, and 320px/390px layout checks; desktop/mobile screenshots inspected. No dependencies or real audio added; no cross-browser, codec/device/network execution, production backpressure, or resampling claimed. Existing body scrollbar behavior at exactly 320px remains outside this step. Steps 8 onward remain unimplemented.

## Step 8 — Implement and validate the three-buffer simulation model

- [x] Complete

**Depends on:** Steps 5–7.

**Work:**

- Create a deterministic, isolated TypeScript state model for downloaded compressed bytes/segments, demuxed encoded packets, and decoded video frames.
- Model network latency/throughput, download completion and initialization/dependency readiness, packet extraction, delayed decoder output, playback consumption, backpressure, and resource budgets explicitly enough to teach their differences.
- Support network prefetch target, encoded target, decoded lookahead, decoder throughput, playback rate, pause, seek, reset, and network stall actions.
- Preserve reusable downloaded bytes on seek while invalidating inappropriate decoded output and pending work; require a suitable keyframe/dependency path to resume decoding.
- Keep byte counts, packet/frame counts, buffered media durations, and decoded-memory estimates distinct. Document assumptions and units.
- Connect a minimal usable controls/metrics view to the page so the model can be exercised before the full visualization.
- Use focused automated checks for meaningful model invariants if tooling permits, such as nonnegative occupancy, deterministic reset, seek invalidation, stall recovery, and delayed output handling. Do not add a heavy test stack just for this step.

**Acceptance:** Repeatable scenarios demonstrate independent buffer growth/drain, delayed output, and seek cache reuse. Metrics are internally consistent and explicitly labeled as simulated estimates.

**Handoff — 2026-10-29:** Added pure `src/components/webcodecs/bufferModel.ts` and minimal `ThreeBufferModelDemo.tsx`, integrated under Demo 2 with scoped styles. The reducer exposes fixed ticks, all seven settings, pause, stall, seek, and full reset; it separates latency/body completion, init readiness, packet extraction, serial decoder service, delayed output, preroll, playback, and bounded cache/queue/frame reservations. Seeking cancels partial/pending work and invalidates old output while retaining completed cache bytes and restarting from a suitable keyframe. Metrics keep bytes, packets, frames, summed/contiguous durations, and decimal MB memory estimates distinct. Assumptions, official documentation verification, limits, and model exports for step 9 are in `docs/webcodecs-reference.md`. Added dependency-free `npm run test:buffers` (Node 22.23.1 built-in test runner/TypeScript stripping): seven tests pass, including 1,000 mixed-action invariant ticks, deterministic reset, init gating/delayed output, all settings, seek reuse/preroll/generations, partial cancellation, eviction/refetch, stalls/recovery, and end-of-stream. Build passed with the existing bundle warning; full lint retains baseline 5 errors / 6 warnings; focused lint and strict model/view checks passed. Chrome passed controls/keyboard, scenario metrics, cache-preserving seek while stalled, recovery, reduced-motion stepping, remount reset, and 1440px/390px/320px element-width checks; desktop/mobile screenshots inspected. Node test isolation and local browser checks required sandbox escalation. No real media, timers, dependencies, or cross-browser execution added/claimed. The manual controls/metrics workbench satisfies step 8; the substantial D3 visualization remains step 9. Existing 320px body/scrollbar behavior remains outside scope. Steps 9 onward remain unimplemented.

## Step 9 — Implement Demo 3: the interactive three-buffer visualization

- [x] Complete

**Depends on:** Step 8.

**Work:**

- Render the model with substantial D3 buffer occupancy and moving-data visualizations.
- Finish labeled controls for throughput, latency, prefetch target, encoded target, decoded lookahead, decoder throughput, playback rate, pause, seek, and simulated stall.
- Show simulated occupancy, buffered durations, pending decode work, playback/starvation state, and compressed versus decoded memory estimates.
- Add contextual explanations or repeatable presets demonstrating why downloaded bytes may be unusable, encoded packets may still await decoding, and buffers fill/drain independently.
- Demonstrate seek invalidation without discarding cached downloads, and show the relative memory cost of decoded frames.

**Acceptance:** Every required control changes the corresponding modeled behavior visibly. Users can reproduce stalls and recover, seek with cache reuse, and see asynchronous decoder output without confusing the simulation with browser guarantees.

**Handoff — 2026-10-29:** Added `BufferVisualization.tsx` and `bufferScenarios.ts`, extended `ThreeBufferModelDemo.tsx`, scoped styles in `src/App.css`, updated `WebCodecsPage.tsx`, and added a scenario check to `tests/bufferModel.test.mjs`. D3 renders cache segments, encoded packets, pending work, ready frames, moving transfers, partial downloads, playback/target markers, occupancy budgets, and a shared-scale compressed/decoded memory comparison. All existing model controls remain; added run/stop, keyboard row inspection, and deterministic presets for init gating, delayed output, cache-preserving seek/preroll, and recoverable starvation. Step-8 model remains unchanged. Reduced motion disables automatic running/movement; hidden/offscreen views stop the clock, and effects clean up timers/observers/listeners/transitions. Official MDN/Mediabunny sources rechecked; URLs, decisions, and limitations are in `docs/webcodecs-reference.md`. Build/strict checks and focused lint passed; full lint retains baseline 5 errors / 6 warnings. All eight buffer tests passed. Chrome passed routing, all settings by keyboard, snapshots/metrics, presets/recovery, D3 output movement, row selection, transport/reduced-motion/offscreen cleanup, remount reset, and 1440px/390px/320px layout checks; desktop/mobile screenshots inspected. Local browser checks and isolated Node reporting required sandbox escalation. No dependencies or real media added; existing bundle-size warning and 320px body/scrollbar behavior remain. Steps 10 onward remain unimplemented.

## Step 10 — Implement Demo 4: A/V synchronization and output clocks

- [x] Complete

**Depends on:** Steps 7–9.

**Work:**

- Build a shared composition timeline showing audio sample processing, audible output, a playback clock, video presentation deadlines, late frames, and dropped frames.
- Add simulated audio latency, video decoding delay, playback position, and play/pause/reset controls.
- Explain an audio-derived video scheduling clock and distinguish audio being processed from audio reaching the output device.
- Illustrate how `AudioContext.getOutputTimestamp()` maps audio output context time to the performance timeline. Explain units, anchoring to composition time, and latency accounting without double-counting it.
- Include a verified clock-mapping/scheduling snippet and explicitly describe the demo's late/drop policy as an application choice.

**Acceptance:** Changing audio latency and decode delay produces understandable deadline and presentation changes. The visualization and snippet agree on time units and clock relationships.

**Handoff — 2026-10-29:** Added `AvSyncDemo.tsx`, D3 `SyncTimeline.tsx`, pure `syncModel.ts`, and `src/data/syncExample.ts`; integrated Demo 4 in Section C and added scoped styles plus `npm run test:sync`. A shared composition timeline shows PCM processing versus estimated audible output, decode completion, video deadlines, late presentation and drops. Latency/delay/position sliders, frame inspection, play/pause/reset and manual steps expose deterministic outcomes; reduced motion, offscreen/hidden stopping and lifecycle cleanup are included. Output timestamp and inverse deadline mapping use explicit seconds/milliseconds and composition anchors without double-counting latency; the 60 ms late/drop policy and primed-audio/preparation assumptions are labeled application choices. Official MDN/Web Audio sources reverified and recorded in `docs/webcodecs-reference.md`. Build, focused lint, strict component/model/data and extracted snippet checks passed; full lint retains baseline 5 errors / 6 warnings. Four sync tests and all eight buffer tests passed, including displayed-snippet drop/draw/resource-cleanup checks with mocked clocks/frames. Chrome passed routing, controls/keyboard, latency/delay/deadline relationships, pause/reset, reduced motion, offscreen/unmount cleanup, narrow layouts and keyboard-scrollable snippets. Desktop/390px/320px screenshots inspected. Local browser checks required sandbox escalation. No dependencies or real audio/decoder/device/display timing or cross-browser execution added/claimed; existing bundle warning and 320px body/scrollbar behavior remain. Steps 11 onward remain unimplemented.

## Step 11 — Implement Demo 5: seamless clip transitions

- [x] Complete

**Depends on:** Steps 6–10.

**Work:**

- Create a D3 multi-clip timeline with at least two different source ranges mapped to a continuous composition.
- Distinguish source time, composition time, decode time/order, and presentation time; include a concrete source-to-composition mapping example.
- Allow scrubbing across boundaries and animate preparation of the next clip before the current clip ends.
- Show independently prepared audio/video sharing a composition timeline.
- Explain codec configuration changes, decoder preparation, keyframe preroll/dependencies, audio sample boundaries, and resource cleanup at transitions.

**Acceptance:** Scrubbing either side of a boundary displays correct source and composition positions. Preparation and presentation are visibly distinct, and the demo explains the conditions needed for a seamless transition.

**Handoff — 2026-10-29:** Added `ClipTransitionDemo.tsx`, D3 `ClipTimeline.tsx`, and pure `clipModel.ts`; integrated Demo 5 in Section C with scoped styles. Two half-open source ranges map continuously across the 4 s cut; scrubbing, boundary jumps, play/pause/reset, manual steps and separate preparation controls expose source/composition positions, independent audio/video readiness and missing-output spans. Concrete timestamp and 48 kHz sample-frame mappings, a synthetic DTS/PTS dependency table, and lifecycle guidance explain configuration, preroll, scheduling and cleanup. Autoplay stops for reduced motion, hidden/offscreen views and unmount; scrubbing recomputes a hypothetical scenario. Added `npm run test:clips` with meaningful model/path checks. Build, strict checks, focused lint and all four new tests passed; existing sync/buffer tests pass. Full lint retains baseline 5 errors / 6 warnings and build retains its chunk warning. Chrome passed cut mapping, all controls/keyboard, independent misses/recovery, cleanup behavior and 1440px/390px/320px layouts; screenshots inspected. Official MDN/Mediabunny sources, assumptions, files and validation are in `docs/webcodecs-reference.md`. No dependencies or real media added; preparation costs and the dependency table are simulations, not codec guarantees. Browser access required sandbox escalation. Existing 320px body/scrollbar behavior remains.

## Step 12 — Implement Section D: ownership and preview-engine architecture

- [x] Complete

**Depends on:** Steps 5–11.

**Work:**

- Add an interactive D3 architecture diagram with selectable/highlightable Browser, Mediabunny, and Application responsibility groups.
- Cover every responsibility listed in Section D of `PLAN.md`, including optional higher-level Mediabunny sample decoding and all application scheduling, caches, queues, decoder orchestration, cancellation, budgets, timeline, synchronization, and transition responsibilities.
- Show a custom video editing preview engine with data/control paths connecting source/cache, demuxing, encoded buffers, decoders, decoded video/PCM queues, composition scheduling, Canvas, and audio output.
- Explain these as recommended architecture boundaries, with configurable library capabilities rather than API-imposed restrictions. Distinguish the browser's fetch implementation from application fetch scheduling.
- Link architecture nodes back to the relevant reference entries and demos where useful.

**Acceptance:** Every responsibility has an identifiable owner and explanation. Category toggles work by keyboard, and the architecture agrees with the preceding pipelines and simulations.

**Handoff — 2026-10-29:** Replaced the Section D placeholder with `PreviewArchitecture.tsx`, D3 `ArchitectureDiagram.tsx`, and typed `src/data/previewArchitecture.ts`. Fourteen selectable nodes and seventeen data/control paths cover all 24 responsibilities in `PLAN.md`; three ownership toggles, keyboard node controls, detailed connection inspection and a complete checklist explain the preview engine. Optional Mediabunny decoding reaches both queues as an alternative route; browser fetch implementation is distinguished from application scheduling, and boundaries are explicitly configurable architecture choices. Added focused navigation links and made existing demo headings focusable. Build, separate strict checking, focused lint, four clip/architecture tests and existing sync/buffer tests passed; full lint retains only baseline 5 errors / 6 warnings. Chrome verified all ownership toggles by keyboard, every node/connection and related-link focus, checklist disclosure, and 1440px/390px/320px layouts; screenshots inspected. Documentation/signatures reverified via official browser/Mediabunny sources; reference notes contain dated URLs and validation. No dependencies or executable media added. Existing bundle warning and 320px body/scrollbar behavior remain; no cross-browser or production-engine execution claimed. Step 13 remains unimplemented.

## Step 13 — Review the complete page and close acceptance gaps

- [x] Complete

**Depends on:** Steps 1–12.

**Work:**

- Audit the implementation against all of `PLAN.md`: four sections, every API, all Mediabunny topics, five substantial demos, TypeScript examples, official links, navigation, and the educational objectives.
- Recheck technical edge cases: units, decode/presentation order, asynchronous output, queue semantics, frame/AudioData ownership, seeking/keyframes, initialization metadata, codec support, audio latency, worklet constraints, and compressed/decoded accounting.
- Review desktop and narrow-screen layouts, keyboard controls/focus, tooltip alternatives, reduced motion, repeated interactions, resets, and navigation away/back. Check for leaking loops/listeners/transitions and unnecessary work when demos are inactive.
- Verify displayed executable examples against real signatures using appropriate type checks or focused checks where practical; identify contextual prerequisites for illustrative snippets.
- Run the existing build/type check and lint, plus relevant tests. Use browser tooling for a visual/interaction review if available and record any unavailable checks.
- Fix issues introduced by this work, update the reference/handoff documentation, and summarize the completed page and known limitations.

**Acceptance:** Every deliverable and acceptance requirement in `PLAN.md` is accounted for. Available checks pass or clearly documented pre-existing/environment limitations remain. The reader can trace both video and audio from network bytes to presentation and explain ownership, timing, buffering, and clip transitions.

**Handoff — 2026-10-29:** Completed the full PLAN audit; [docs/webcodecs-acceptance.md](docs/webcodecs-acceptance.md) maps every deliverable, API, ownership responsibility and educational objective to the implementation and records edge-case findings, official sources, commands and limitations. Fixed offscreen autoplay/observer cleanup in the video/audio pipeline demos, startup/stale/future timestamp handling in the index clock example, and classic-scrollbar horizontal overflow at 320px with page-scoped CSS. Added reusable browser acceptance, strict source-extracted snippet checks, displayed clock/worklet runtime checks and package scripts. Build, focused lint, all 18 model/example tests and all 44 displayed examples (temporary Mediabunny 1.64.0, no project dependency) pass. Full lint retains only baseline 5 errors / 6 warnings; existing bundle warning remains. Chrome verified full-page navigation/focus, filtering/disclosures, both audio strategies, cache cancellation/reuse, architecture nodes/toggles, repeated playback/reset/offscreen/reduced-motion/unmount cleanup and expanded 1440px/390px/320px layouts; selected desktop/narrow screenshots inspected. Existing detailed buffer/sync/clip/architecture browser scenarios were rerun. Official WebCodecs/Web Audio/MDN/Mediabunny documentation rechecked and linked in the acceptance/reference documents. No real media, device/display timing or cross-browser execution claimed. All thirteen steps are complete; the page remains explicitly educational simulations and contextual examples.
