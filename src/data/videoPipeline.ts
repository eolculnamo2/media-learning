export type VideoPipelineStage = {
  name: string
  boundary: string
  inputs: string
  outputs: string
  transformation: string
  timing: string
  ownership: string
}

export const videoPipelineStages: VideoPipelineStage[] = [
  {
    name: 'HTTP Fetch', boundary: 'fetch(url, { signal })',
    inputs: 'A URL for a complete MP4 and an AbortSignal.',
    outputs: 'A Response whose body contains container bytes.',
    transformation: 'The browser performs the HTTP request; the application checks response.ok and chooses when to fetch.',
    timing: 'Asynchronous. Receiving response headers does not mean the body is downloaded.',
    ownership: 'Browser: network implementation. Application: request scheduling, status handling, and AbortController cancellation.',
  },
  {
    name: 'ArrayBuffer', boundary: 'BufferSource(bytes)',
    inputs: 'The Response body.', outputs: 'One ArrayBuffer containing the complete container.',
    transformation: 'response.arrayBuffer() consumes the body. Mediabunny BufferSource exposes those in-memory bytes for random-access reads; it does not demux or decode them.',
    timing: 'Body consumption is asynchronous; constructing BufferSource is synchronous.',
    ownership: 'Application: downloaded bytes and memory budget. Mediabunny: the source adapter. Bytes remain reachable while the input needs them.',
  },
  {
    name: 'Container Demuxer', boundary: 'Input + video track',
    inputs: 'An Input backed by BufferSource and a list of supported container formats.',
    outputs: 'An InputVideoTrack, codec configuration, and access to its encoded packets.',
    transformation: 'Mediabunny parses container metadata and identifies the video track. getDecoderConfig() supplies codec-specific configuration, including description bytes when needed.',
    timing: 'Input construction is synchronous; track/configuration inspection and packet reads are asynchronous. Parsing may be lazy.',
    ownership: 'Mediabunny: container parsing and metadata. Application: Input lifetime; call dispose() when finished.',
  },
  {
    name: 'Encoded Video Packets', boundary: 'EncodedPacketSink(track)',
    inputs: 'The selected video track and its container sample information.',
    outputs: 'EncodedPacket objects with compressed payload, key/delta type, and timestamps in seconds.',
    transformation: 'EncodedPacketSink extracts one track’s packets in decode order. This removes the container boundary; it does not decompress pictures.',
    timing: 'Asynchronous iteration. A later presentation timestamp may precede an earlier one in decode order.',
    ownership: 'Mediabunny: packet extraction. Application: packet queue, dependencies, cancellation, and compressed-data budget.',
  },
  {
    name: 'EncodedVideoChunk', boundary: 'packet.toEncodedVideoChunk()',
    inputs: 'An EncodedPacket containing codec payload and timing.',
    outputs: 'An EncodedVideoChunk with key/delta type and presentation timestamp in microseconds.',
    transformation: 'The Mediabunny helper creates the WebCodecs chunk and converts seconds to microseconds. Do not convert its timestamp a second time or wrap arbitrary MP4 bytes as chunks.',
    timing: 'Synchronous object conversion; no frame is decoded yet.',
    ownership: 'Mediabunny: conversion helper. Browser: chunk object. Application: submission order and queue limits; chunks have no close() method.',
  },
  {
    name: 'VideoDecoder', boundary: 'configure() → decode(chunk)',
    inputs: 'A supported VideoDecoderConfig, followed by chunks in decode order starting with a key chunk.',
    outputs: 'decode() returns undefined; decoded frames arrive later through output(frame).',
    transformation: 'The browser reconstructs pictures using codec configuration and reference dependencies. Submitting a chunk queues work rather than displaying it.',
    timing: 'Submission is synchronous; processing and output are asynchronous. decodeQueueSize counts pending requests, not completed frames.',
    ownership: 'Browser: codec processing. Application: configuration checks, backpressure, errors, and decoder.close() on teardown.',
  },
  {
    name: 'VideoFrame', boundary: 'output(frame)',
    inputs: 'Asynchronous decoder output in presentation order.',
    outputs: 'Raw VideoFrame handles with presentation timestamps in microseconds.',
    transformation: 'The application receives decoded pictures and can queue them for a presentation clock. This simulation releases three frames together to make the order visible; actual callback timing varies.',
    timing: 'Asynchronous callback, separate from submission and from the display’s refresh. flush() drains pending output at the end; it is not a playback clock.',
    ownership: 'Application owns each output frame. Keep queued frames open; close each after drawing, dropping, or invalidating it.',
  },
  {
    name: 'Canvas', boundary: 'ctx.drawImage(frame, …)',
    inputs: 'An open VideoFrame and a CanvasRenderingContext2D.',
    outputs: 'Canvas pixels; the application can then release the frame.',
    transformation: 'drawImage copies the picture into Canvas. The illustrative snippet draws outputs immediately for inspection; a player schedules them against a clock instead.',
    timing: 'drawImage is synchronous from JavaScript; the browser composites pixels later. Drawing is not proof that the display has refreshed.',
    ownership: 'Browser: Canvas drawing and compositing. Application: presentation scheduling and frame.close() in finally; drawing does not transfer the frame.',
  },
]

export const videoPipelineEvents = [
  { stage: 0, text: 'Request a complete MP4. Response headers arrive; its body is still a stream.', submitted: 0, output: 0, drawn: 0 },
  { stage: 1, text: 'Consume the body into ArrayBuffer. These are container bytes, not codec chunks.', submitted: 0, output: 0, drawn: 0 },
  { stage: 2, text: 'Wrap bytes in BufferSource, open Input, inspect the video track and decoder configuration.', submitted: 0, output: 0, drawn: 0 },
  { stage: 3, text: 'EncodedPacketSink extracts a three-picture example in decode order: I0 → P80 → B40.', submitted: 0, output: 0, drawn: 0 },
  { stage: 4, text: 'Convert packet payloads to EncodedVideoChunks. PTS seconds 0, 0.08, 0.04 become 0, 80000, 40000 µs.', submitted: 0, output: 0, drawn: 0 },
  { stage: 5, text: 'Configure a supported decoder, then submit key chunk I0. Submission returns; no output is modeled yet.', submitted: 1, output: 0, drawn: 0 },
  { stage: 5, text: 'Submit P80 before B40: the future reference picture is needed to reconstruct B40.', submitted: 2, output: 0, drawn: 0 },
  { stage: 5, text: 'Submit B40. Three submissions still do not imply three available frames.', submitted: 3, output: 0, drawn: 0 },
  { stage: 5, text: 'Wait for asynchronous processing and drain at end of input. Even decodeQueueSize = 0 would not prove output is complete.', submitted: 3, output: 0, drawn: 0 },
  { stage: 6, text: 'The modeled output batch arrives in presentation order: I0 → B40 → P80. The application now owns three open VideoFrames.', submitted: 3, output: 3, drawn: 0 },
  { stage: 7, text: 'Draw I0 → B40 → P80 and close each frame. All three are shown together here as a summary, not as timed playback.', submitted: 3, output: 3, drawn: 3 },
] as const

// Joined in order, these panels form one contextual example module.
export const videoPipelineExamples = [
  {
    title: '1. Fetch container bytes and inspect the video track',
    code: `import { Input, BufferSource, ALL_FORMATS, EncodedPacketSink } from 'mediabunny';

async function inspectVideo(
  url: string, canvas: HTMLCanvasElement, signal: AbortSignal,
) {
  if (typeof VideoDecoder === 'undefined') throw new Error('WebCodecs unavailable');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D Canvas unavailable');
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const bytes = await response.arrayBuffer();
  const input = new Input({
    formats: ALL_FORMATS, source: new BufferSource(bytes),
  });
  let decoder: VideoDecoder | undefined;
  let failure: DOMException | undefined;
  const cancel = () => {
    if (decoder && decoder.state !== 'closed') decoder.close();
    input.dispose();
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('No video track');
    const config = await track.getDecoderConfig();
    if (!config) throw new Error('Unknown video codec');
    const support = await VideoDecoder.isConfigSupported(config);
    if (!support.supported || !support.config) throw new Error('Unsupported config');`,
  },
  {
    title: '2. Receive decoded output, draw, and release the frame',
    code: `    // Immediate inspection only: no real-time presentation clock.
    decoder = new VideoDecoder({
      output(frame) {
        try {
          if (!signal.aborted) {
            canvas.width = frame.displayWidth;
            canvas.height = frame.displayHeight;
            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
          }
        } finally {
          frame.close(); // Also release dropped/canceled output.
        }
      },
      error(error) { failure = error; },
    });
    signal.throwIfAborted();
    decoder.configure(support.config);`,
  },
  {
    title: '3. Extract packets, submit chunks, drain, and clean up',
    code: `    const sink = new EncodedPacketSink(track);
    // Small bounded inspection example: start with a key packet.
    const first = await sink.getFirstPacket();
    if (!first || first.type !== 'key') throw new Error('Need a key start');
    let submitted = 0;
    for await (const packet of sink.packets(first)) {
      signal.throwIfAborted();
      if (failure) throw failure;
      // Payload + PTS conversion, not MP4 bytes; iteration is decode order.
      decoder.decode(packet.toEncodedVideoChunk());
      if (++submitted === 12) break;
    }
    await decoder.flush(); // End-of-example drain, not per-packet playback.
    if (failure) throw failure;
  } finally {
    signal.removeEventListener('abort', cancel);
    if (decoder && decoder.state !== 'closed') decoder.close();
    input.dispose();
  }
}`,
  },
]
