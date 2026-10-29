# Build an Interactive WebCodecs & Browser Media APIs Learning Page

You are working in an existing React, TypeScript, and D3 educational application focused on video streaming and media technology.

The application contains rich, animated, interactive explanations of technical media concepts.

**Your task is to add a new comprehensive learning page titled "WebCodecs & Browser Media APIs."**

This should be a significant addition to the existing application, not a standalone website.

## 1. First, explore the existing application

Before implementing anything:

- Inspect the project's structure, routing, navigation, dependencies, and existing page components.
- Study several existing interactive learning pages.
- Identify the established visual language, layout patterns, typography, colors, animations, and navigation conventions.
- Look for reusable diagram components, animation utilities, hooks, and shared styles.
- Understand how D3 is currently integrated with React.

Use https://media-learning.pages.dev/#/ as additional visual context if browser access is available.

**The new page should feel like a natural extension of the existing application.**

Do not introduce a separate visual design system, replace existing architecture, or add unnecessary dependencies.

Use React, TypeScript, D3, and the project's existing styling conventions.

## 2. Educational objectives

The page should help an experienced software engineer develop a practical mental model of the APIs used to build custom browser-based media engines.

The reader should understand:

1. What WebCodecs and related browser APIs make possible.
2. What each important API does.
3. How compressed media travels from the network to the screen or speakers.
4. How video and audio decoding differ.
5. How media timing, buffering, and synchronization work.
6. Which responsibilities belong to the browser, Mediabunny, and the application.
7. How these building blocks support future video editing capabilities.

Assume the reader understands software engineering and basic video compression, but is still learning WebCodecs and Web Audio.

Avoid oversimplifying technically important concepts.

## 3. Page structure

Build the page with four major sections:

### Section A — Capabilities

Start with a visually compelling overview explaining what developers can accomplish with these APIs.

Cover:

- Decode compressed video into individual frames.
- Decode compressed audio into PCM samples.
- Render video frames onto Canvas.
- Process and play audio using Web Audio.
- Manage encoded and decoded buffers.
- Synchronize audio and video.
- Seek and control playback independently of HTMLVideoElement.
- Compose multiple clips onto a continuous timeline.
- Encode video and audio for eventual export.

Include an explanation of what WebCodecs does NOT provide:

- No network engine.
- No MP4 demuxer.
- No DASH manifest parser.
- No built-in media player.
- No automatic A/V synchronization.
- No automatic composition or editing timeline.

Use attractive capability cards with meaningful illustrations or subtle animations.

### Section B — API Index

Create a navigable index of important browser APIs.

Organize entries by responsibility.

**Network and byte handling**
- `fetch`
- `Response.arrayBuffer()`
- `ReadableStream`
- `AbortController`
- `ArrayBuffer`
- `Uint8Array`

**Video decoding**
- `VideoDecoder`
- `VideoDecoderConfig`
- `EncodedVideoChunk`
- `VideoFrame`
- `VideoDecoder.isConfigSupported()`

**Audio decoding**
- `AudioDecoder`
- `AudioDecoderConfig`
- `EncodedAudioChunk`
- `AudioData`
- `AudioDecoder.isConfigSupported()`

**Video presentation**
- `HTMLCanvasElement`
- `CanvasRenderingContext2D`
- `OffscreenCanvas`
- `requestAnimationFrame`

**Audio presentation**
- `AudioContext`
- `AudioBuffer`
- `AudioBufferSourceNode`
- `AudioWorklet`
- `AudioWorkletNode`
- `AudioWorkletProcessor`
- `AudioContext.getOutputTimestamp()`

**Concurrency and memory**
- `Worker`
- `MessageChannel`
- `MessagePort`
- `SharedArrayBuffer`
- `Atomics`

**Encoding**
- `VideoEncoder`
- `AudioEncoder`

For each entry provide:

- Purpose.
- Important inputs and outputs.
- Key methods and properties.
- Lifecycle considerations.
- Common pitfalls.
- A small, valid code example where useful.
- Link to MDN or relevant official documentation.

Use expandable cards, detail panels, or a similar interaction appropriate to the existing app.

The API index should feel like an interactive technical reference rather than an enormous static list.

### Section C — How the APIs Work Together

This is the most important section.

Build several interactive D3-driven educational demonstrations.

#### Demo 1: From network bytes to displayed video

Visualize:

HTTP Fetch
→ ArrayBuffer
→ Container Demuxer
→ Encoded Video Packets
→ EncodedVideoChunk
→ VideoDecoder
→ VideoFrame
→ Canvas

Use Mediabunny as the example demuxer.

Show where `Input`, `BufferSource`, and `EncodedPacketSink` fit.

Allow the user to step through the pipeline, with each stage explaining:

- What data it receives.
- What data it produces.
- What transformation occurs.
- Whether that operation is synchronous or asynchronous.
- Who owns the operation.

Animate packets passing through the stages.

Include short TypeScript examples that demonstrate the actual API boundaries.

#### Demo 2: From network bytes to audible audio

Visualize:

HTTP Fetch
→ ArrayBuffer
→ Mediabunny
→ Encoded Audio Packets
→ EncodedAudioChunk
→ AudioDecoder
→ AudioData / PCM
→ Audio Output
→ Speakers

Show two possible audio output strategies:

1. AudioBufferSourceNode.
2. AudioWorklet with a PCM queue.

Explain why audio playback is fundamentally different from presenting a VideoFrame.

Include an animation of PCM sample frames being consumed in audio processing blocks.

Explain sample rates, channels, and continuous audio rendering.

#### Demo 3: The three-buffer model

Build a substantial interactive visualization of:

1. Downloaded media segments / compressed bytes.
2. Demuxed encoded packets.
3. Decoded video frames.

Provide controls for:

- Network throughput.
- Network latency.
- Network prefetch target.
- Encoded buffer target.
- Decoded lookahead target.
- Decoder throughput.
- Playback rate.

Animate the movement of data through the buffers.

Allow users to pause, seek, and simulate a network stall.

Demonstrate that:

- Downloaded media does not necessarily mean decodable media.
- Encoded packets do not necessarily mean decoded frames are ready.
- Decoder output may arrive asynchronously.
- Buffers can fill and drain at different rates.
- Seeking can invalidate decoded frames without requiring downloaded media to be discarded.
- Decoded frames are significantly more memory-intensive than compressed data.

Show meaningful simulated metrics and clearly label them as simulations.

#### Demo 4: A/V synchronization

Build an interactive illustration showing:

- Audio sample playback.
- Video frame presentation.
- A shared composition timeline.
- A playback clock.
- Audio output latency.
- Video frame deadlines.
- Late frames and dropped frames.

Let users adjust simulated audio latency, video decoding delay, and playback position.

Demonstrate why a video renderer commonly follows an audio-derived playback clock.

Distinguish between audio samples being processed and samples actually reaching the output device.

Explain how `AudioContext.getOutputTimestamp()` helps relate audio output time to the browser performance timeline.

#### Demo 5: Seamless clip transitions

Show a timeline containing multiple video clips, each with its own source timestamps.

Illustrate the distinction between:

- Source time.
- Composition time.
- Decode time.
- Presentation time.

Allow the user to move the playback position across clip boundaries.

Animate preparation of the next clip before the current clip finishes.

Demonstrate that video and audio can be prepared independently while still sharing a composition timeline.

Include a simple example of two clips with different source ranges forming a continuous playback sequence.

Explain why decoder preparation, codec changes, keyframe dependencies, and audio sample boundaries matter.

### Section D — Architectural Boundaries

Create an interactive architecture diagram distinguishing three groups:

**Browser responsibilities**
- WebCodecs decoding.
- Audio rendering.
- Canvas rendering.
- Browser timing primitives.
- Worker execution.

**Mediabunny responsibilities**
- Container parsing.
- Demuxing.
- Track metadata.
- Encoded packet extraction.
- Codec configuration helpers.
- Optional higher-level sample decoding.

**Application responsibilities**
- Network fetch scheduling.
- DASH manifest and segment handling, when applicable.
- Segment caching.
- Encoded packet buffering.
- Decoder orchestration.
- Decoded frame buffering.
- PCM queue management.
- Composition timeline evaluation.
- Playback coordination.
- Seeking and cancellation.
- Resource budgets.
- A/V synchronization.
- Clip transitions.

Allow users to toggle or highlight ownership categories.

Show an example architecture for a custom video editing preview engine.

Clearly explain that these are recommended architectural boundaries, not restrictions imposed by the APIs.

## 4. Mediabunny integration

Mediabunny should appear naturally throughout the examples, particularly where container bytes must become encoded video or audio packets.

Explain the key APIs:

- `Input`
- `BlobSource`
- `BufferSource`
- `UrlSource`
- `CustomSource`
- `InputVideoTrack`
- `InputAudioTrack`
- `EncodedPacket`
- `EncodedPacketSink`
- `VideoSampleSink`
- `AudioSampleSink`

Pay special attention to `CustomSource` and how an application-owned byte cache can satisfy Mediabunny's random-access reads.

Explain the difference between:

- A downloaded segment cache.
- A Mediabunny source abstraction.
- An encoded packet buffer.
- A decoded frame buffer.

Do not imply that `CustomSource` is itself an appendable buffer.

Distinguish fetching a complete MP4 from fetching fragmented MP4 / CMAF media segments that may require initialization information.

Refer to https://mediabunny.dev for accurate documentation.

## 5. Interaction and animation requirements

This page should feel alive.

Use D3 meaningfully, especially for:

- Pipeline data flow.
- Packet movement.
- Buffer occupancy.
- Playback timelines.
- Clock synchronization.
- Clip transitions.
- Sample and frame visualization.

Aim for interactive explanatory tools, not decorative animation.

Every interactive demonstration should teach something concrete.

Use play/pause, sliders, step-through controls, tooltips, highlights, and contextual explanations where appropriate.

Animations should be deterministic enough that users can understand cause and effect.

Respect reduced-motion preferences and clean up animation loops when components unmount.

Avoid creating a large monolithic React component.

Extract reusable visualization primitives only when there is a clear benefit.

## 6. Technical accuracy

Use current official documentation to verify the browser APIs and Mediabunny APIs.

Pay particular attention to:

- WebCodecs timestamp units.
- Decode order versus presentation order.
- VideoDecoder's asynchronous output.
- Decoder queue semantics.
- Proper VideoFrame cleanup.
- AudioData ownership.
- AudioWorklet processing constraints.
- Audio output latency.
- Seeking from keyframes.
- Codec configuration.
- Browser capability differences.
- Compressed versus decoded buffer accounting.

Do not imply that WebCodecs can directly decode MP4 container bytes.

Do not imply that submitting a chunk to VideoDecoder immediately produces a frame.

Do not present toy simulated behavior as a guarantee of real browser behavior.

If providing executable code examples, verify they match actual API signatures.

Use TypeScript examples consistent with the application.

## 7. Implementation quality

Follow the repository's existing conventions.

- Integrate into the existing router and navigation.
- Reuse existing layout and styling components.
- Use strict TypeScript.
- Keep visualization state isolated.
- Clean up timers, animation frames, listeners, and other resources.
- Ensure good performance.
- Avoid unrelated refactoring.
- Avoid adding heavy libraries unless justified.
- Support keyboard interaction where feasible.
- Make the page usable on smaller screens.

If the repository already has educational diagram patterns, reuse them.

Do not replace D3 with a separate visualization library.

## 8. Deliverables and acceptance criteria

Produce the complete implementation in the existing application.

The result should include:

- A polished capabilities introduction.
- A useful, navigable API index.
- Five substantial interactive conceptual demonstrations.
- A visual ownership and architecture diagram.
- Practical TypeScript snippets.
- Links to official browser and Mediabunny documentation.
- Integration into existing navigation.

After implementation:

1. Run the project's existing build and type-check commands.
2. Run relevant tests.
3. Fix errors introduced by the changes.
4. Review the page visually if browser tooling is available.
5. Summarize the implementation and any known limitations.

**Success means the reader can follow a video or audio resource all the way from network bytes through demuxing, decoding, buffering, synchronization, and eventual presentation—and understand which API or component is responsible at every step.**

The page should match the quality and interactive nature of the rest of the media learning application.

Do not stop at a plan. Implement the page.
