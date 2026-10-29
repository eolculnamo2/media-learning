export type ApiCategory = { id: string; title: string; description: string }

export type ApiEntry = {
  id: string
  category: ApiCategory['id']
  name: string
  purpose: string
  inputs: string
  outputs: string
  members: string[]
  lifecycle: string
  pitfalls: string
  docs: { label: string; url: string }[]
  example?: { context: string; code: string }
}

const mdn = (path: string) => `https://developer.mozilla.org/en-US/docs/${path}`
const api = (path: string) => mdn(`Web/API/${path}`)

export const apiCategories: ApiCategory[] = [
  { id: 'network', title: 'Network & bytes', description: 'Acquire container bytes and manage their storage. A demuxer must extract codec packets before decoding.' },
  { id: 'video-decoding', title: 'Video decoding', description: 'Configure a codec and submit packets in decode order. Frames arrive asynchronously, with presentation timestamps.' },
  { id: 'audio-decoding', title: 'Audio decoding', description: 'Turn demuxed codec packets into PCM sample frames. Decoding does not play audio or schedule it on a device.' },
  { id: 'video-presentation', title: 'Video presentation', description: 'Draw selected frames. The application chooses presentation deadlines, a playback clock, and when to drop late frames.' },
  { id: 'audio-presentation', title: 'Audio presentation', description: 'Schedule PCM on the Web Audio timeline or process a continuous stream in an audio worklet. Context time uses seconds.' },
  { id: 'concurrency', title: 'Concurrency & memory', description: 'Move work off the UI thread, pass ownership through messages, or coordinate explicitly over shared storage.' },
  { id: 'encoding', title: 'Encoding', description: 'Compress raw frames and PCM into codec chunks. A separate muxer packages chunks and metadata into a playable export container.' },
]

export const apiEntries: ApiEntry[] = [
  {
    id: 'fetch', category: 'network', name: 'fetch',
    purpose: 'Request a media resource or byte range over HTTP.',
    inputs: 'URL or Request, plus optional RequestInit (headers, signal, credentials).',
    outputs: 'Promise<Response>; the body may still be arriving when it resolves.',
    members: ['fetch(input, init?)', 'Response.ok / status', 'Response.body'],
    lifecycle: 'Own an AbortController for cancellable work; handle both request and body-read failures.',
    pitfalls: 'HTTP error status does not reject fetch: check ok. Cross-origin access needs CORS. Range requests require server support and response validation. Fetch does not demux media.',
    docs: [{ label: 'MDN fetch', url: api('Window/fetch') }],
    example: { context: 'Fetch a complete resource; the caller supplies a URL and cancellation signal. Errors propagate to the caller.', code: `async function download(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.arrayBuffer();
}` },
  },
  {
    id: 'response-array-buffer', category: 'network', name: 'Response.arrayBuffer()',
    purpose: 'Read an entire response body into contiguous byte storage.',
    inputs: 'An unread Response body.', outputs: 'Promise<ArrayBuffer> containing the complete body.',
    members: ['response.arrayBuffer()', 'response.bodyUsed'],
    lifecycle: 'Consumes the body once. Request cancellation can also abort this asynchronous body read.',
    pitfalls: 'Waits for the full download and retains it in memory. A locked or already consumed body cannot be read again. The result is container bytes, not a VideoFrame or codec chunk.',
    docs: [{ label: 'MDN arrayBuffer', url: api('Response/arrayBuffer') }],
    example: { context: 'Use with an unread response whose HTTP status has already been checked.', code: `async function readBody(response: Response): Promise<Uint8Array> {
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer); // view; no second payload copy
}` },
  },
  {
    id: 'readable-stream', category: 'network', name: 'ReadableStream',
    purpose: 'Consume arriving data incrementally rather than waiting for a whole resource.',
    inputs: 'Response.body, a ReadableStream<Uint8Array> or null.',
    outputs: 'Reader results with done and a byte chunk value.',
    members: ['getReader()', 'reader.read()', 'reader.cancel()', 'reader.releaseLock()', 'pipeTo()'],
    lifecycle: 'A reader locks its stream. Cancel unused data and release the lock in finally; abort the fetch to cancel the request.',
    pitfalls: 'Network chunks are arbitrary byte boundaries, not MP4 samples or independently decodable packets. Await downstream work to avoid an unbounded application queue; stream backpressure does not bound every buffer.',
    docs: [{ label: 'MDN ReadableStream', url: api('ReadableStream') }],
    example: { context: 'The consumer accepts arbitrary byte fragments. Rejections propagate; cancellation errors during cleanup are ignored.', code: `async function consumeBody(
  response: Response,
  consume: (bytes: Uint8Array) => Promise<void>,
): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await consume(value);
    }
  } finally {
    try { await reader.cancel(); } catch { /* already errored */ }
    reader.releaseLock();
  }
}` },
  },
  {
    id: 'abort-controller', category: 'network', name: 'AbortController',
    purpose: 'Signal cancellation to fetch and other cooperating operations.',
    inputs: 'A cancellation decision, optionally with a reason.', outputs: 'AbortSignal shared with operations; abort notification.',
    members: ['new AbortController()', 'signal', 'abort(reason?)', 'signal.aborted', 'signal.throwIfAborted()'],
    lifecycle: 'Create a controller per operation or operation group. On seek/unmount, abort obsolete work. An aborted signal cannot be reset.',
    pitfalls: 'Cancellation is cooperative: it does not undo completed work or close decoded frames. Invalidate stale results separately and handle promise rejection.',
    docs: [{ label: 'MDN AbortController', url: api('AbortController') }],
    example: { context: 'Returns a cancel handle and a promise; the caller must await/catch done. Attach cancel to application teardown.', code: `function startRequest(url: string) {
  const controller = new AbortController();
  const done = fetch(url, { signal: controller.signal });
  return { done, cancel: () => controller.abort() };
}` },
  },
  {
    id: 'array-buffer', category: 'network', name: 'ArrayBuffer',
    purpose: 'Hold raw binary storage independently of how bytes are interpreted.',
    inputs: 'A byte length, downloaded data, or copied byte range.', outputs: 'A backing store accessed through typed-array or DataView views.',
    members: ['byteLength', 'slice(begin, end?)', 'new ArrayBuffer(byteLength)'],
    lifecycle: 'Ordinary storage is garbage collected when unreachable. Transferring it to a worker detaches the sender’s buffer.',
    pitfalls: 'slice copies bytes; constructing a view does not. A detached buffer cannot be reused. Compressed byte size says little about decoded frame memory.',
    docs: [{ label: 'MDN ArrayBuffer', url: mdn('Web/JavaScript/Reference/Global_Objects/ArrayBuffer') }],
    example: { context: 'Compare shared views with independent copies.', code: `const storage = new ArrayBuffer(1024);
const view = new Uint8Array(storage, 128, 256);
const copy = storage.slice(128, 384);
view[0] = 7; // changes storage; copy is independent` },
  },
  {
    id: 'uint8-array', category: 'network', name: 'Uint8Array',
    purpose: 'Read and write unsigned bytes in a buffer or packet payload.',
    inputs: 'A buffer with optional byte offset/length, a length, or another array.', outputs: 'An indexed byte view; values range from 0 to 255.',
    members: ['buffer / byteOffset / byteLength', 'subarray()', 'slice()', 'set()'],
    lifecycle: 'Views keep their backing storage reachable. Copy a small retained range when keeping the entire source buffer would waste memory.',
    pitfalls: 'subarray shares bytes; slice copies. Passing view.buffer alone includes bytes outside a subview. Preserve byteOffset and byteLength at binary API boundaries.',
    docs: [{ label: 'MDN Uint8Array', url: mdn('Web/JavaScript/Reference/Global_Objects/Uint8Array') }],
    example: { context: 'A subview and its owned copy have different mutation and retention behavior.', code: `const bytes = new Uint8Array([10, 20, 30, 40]);
const view = bytes.subarray(1, 3);
const owned = view.slice();
view[0] = 99; // bytes[1] is now 99; owned[0] remains 20` },
  },
  {
    id: 'video-decoder', category: 'video-decoding', name: 'VideoDecoder',
    purpose: 'Decode compressed video chunks into raw frames through an output callback.',
    inputs: 'Decoder callbacks, a supported configuration, and EncodedVideoChunks in decode order.',
    outputs: 'Asynchronous VideoFrame callbacks and errors; decode() itself returns void.',
    members: ['configure()', 'decode()', 'decodeQueueSize / dequeue', 'flush()', 'reset()', 'close()', 'state'],
    lifecycle: 'Configure before decode; start with a key chunk. flush drains outputs and requires a new key chunk afterward. reset discards work and configuration; close releases the decoder permanently.',
    pitfalls: 'Bound submission and decoded-frame queues separately. decodeQueueSize counts pending requests, not all in-flight work or ready frames; zero is not output completion. Close every output frame, including dropped/stale frames.',
    docs: [{ label: 'MDN VideoDecoder', url: api('VideoDecoder') }, { label: 'Queue semantics', url: api('VideoDecoder/decodeQueueSize') }],
    example: { context: 'Illustrative finite batch, not a playback scheduler. The caller provides a checked configuration, a small bounded batch beginning with a key chunk, and a synchronous frame consumer. Use a secure context and feature detection.', code: `async function decodeBatch(
  config: VideoDecoderConfig,
  chunks: readonly EncodedVideoChunk[],
  consume: (frame: VideoFrame) => void,
): Promise<void> {
  let failure: DOMException | undefined;
  const decoder = new VideoDecoder({
    output(frame) {
      try { consume(frame); } finally { frame.close(); }
    },
    error(error) { failure = error; },
  });
  try {
    decoder.configure(config);
    for (const chunk of chunks) decoder.decode(chunk);
    await decoder.flush();
    if (failure) throw failure;
  } finally {
    if (decoder.state !== 'closed') decoder.close();
  }
}` },
  },
  {
    id: 'video-decoder-config', category: 'video-decoding', name: 'VideoDecoderConfig',
    purpose: 'Describe the codec bitstream and decoder preferences. This is a configuration dictionary, not a constructor.',
    inputs: 'Track metadata from a demuxer, including a precise codec string and codec-specific initialization when required.',
    outputs: 'A dictionary passed to isConfigSupported and configure.',
    members: ['codec', 'codedWidth / codedHeight', 'description', 'hardwareAcceleration', 'optimizeForLatency'],
    lifecycle: 'Obtain metadata before decoding and reconfigure for relevant stream changes. Check the actual configuration on the target browser.',
    pitfalls: 'MP4 MIME types are not codec strings. description format depends on the codec registration; do not invent or copy unrelated initialization bytes. Hardware acceleration and low-latency options are preferences, not guarantees.',
    docs: [{ label: 'MDN configure / config fields', url: api('VideoDecoder/configure') }],
    example: { context: 'Example VP8 metadata only; the supplied packets must actually contain matching VP8 data. Other codecs may require description from the demuxer.', code: `const config: VideoDecoderConfig = {
  codec: 'vp8',
  codedWidth: 640,
  codedHeight: 360,
  optimizeForLatency: true,
};` },
  },
  {
    id: 'encoded-video-chunk', category: 'video-decoding', name: 'EncodedVideoChunk',
    purpose: 'Wrap an encoded video packet and its timing for decoder submission.',
    inputs: 'Codec payload bytes, key/delta type, presentation timestamp and optional duration in microseconds.',
    outputs: 'An encoded chunk accepted by VideoDecoder.decode().',
    members: ['new EncodedVideoChunk(init)', 'type / timestamp / duration / byteLength', 'copyTo()'],
    lifecycle: 'Normally copies the supplied bytes at construction; no close method. Optional transfer can move ArrayBuffer ownership instead.',
    pitfalls: 'Demux first: arbitrary MP4 bytes are not codec payloads. Submit in decode order even when presentation timestamps are reordered. Mark key only for a genuine key packet.',
    docs: [{ label: 'MDN EncodedVideoChunk constructor', url: api('EncodedVideoChunk/EncodedVideoChunk') }],
    example: { context: 'The demuxer supplies a complete valid packet, genuine key/delta classification, and timing in seconds. This helper performs the unit conversion once.', code: `function makeChunk(
  data: Uint8Array<ArrayBuffer>,
  isKey: boolean,
  presentationSeconds: number,
  durationSeconds: number,
): EncodedVideoChunk {
  return new EncodedVideoChunk({
    type: isKey ? 'key' : 'delta', data,
    timestamp: Math.round(presentationSeconds * 1_000_000),
    duration: Math.round(durationSeconds * 1_000_000),
  });
}` },
  },
  {
    id: 'video-frame', category: 'video-decoding', name: 'VideoFrame',
    purpose: 'Represent a raw video frame backed by browser-managed media resources.',
    inputs: 'Decoder output, an image source, or raw pixel buffers plus layout metadata.',
    outputs: 'An image source for Canvas, or pixels copied into application storage.',
    members: ['timestamp / duration', 'codedWidth / codedHeight', 'displayWidth / displayHeight', 'clone()', 'copyTo()', 'close()'],
    lifecycle: 'Keep a queued frame open until presentation or dropping. Close each owned frame and each clone when finished. Drawing does not transfer ownership.',
    pitfalls: 'Timestamp uses microseconds. Display dimensions can differ from coded storage dimensions. Retaining many frames can exhaust media resources; garbage collection alone is insufficient for prompt release.',
    docs: [{ label: 'MDN VideoFrame', url: api('VideoFrame') }],
    example: { context: 'Takes ownership of a frame and closes it even if drawing fails. Call only when the application has chosen to present this frame.', code: `function present(context: CanvasRenderingContext2D, frame: VideoFrame): void {
  try {
    context.drawImage(frame, 0, 0, context.canvas.width, context.canvas.height);
  } finally {
    frame.close();
  }
}` },
  },
  {
    id: 'video-config-supported', category: 'video-decoding', name: 'VideoDecoder.isConfigSupported()',
    purpose: 'Ask whether this browser supports a specific decoder configuration.',
    inputs: 'A VideoDecoderConfig, not just a codec family name.', outputs: 'Promise<VideoDecoderSupport> with supported and the recognized config.',
    members: ['VideoDecoder.isConfigSupported(config)', 'result.supported', 'result.config'],
    lifecycle: 'Check API presence first, then await support before configuring. Handle rejected checks and subsequent decoder errors.',
    pitfalls: 'No codec is universal. A positive result does not guarantee every packet is valid or resources remain available. Unrecognized dictionary fields may be omitted in the returned configuration.',
    docs: [{ label: 'MDN isConfigSupported', url: api('VideoDecoder/isConfigSupported_static') }],
    example: { context: 'A reusable capability check; callers handle unsupported configurations and rejections. WebCodecs requires a secure context.', code: `async function checkedConfig(config: VideoDecoderConfig): Promise<VideoDecoderConfig> {
  if (typeof VideoDecoder === 'undefined') {
    throw new Error('VideoDecoder unavailable');
  }
  const result = await VideoDecoder.isConfigSupported(config);
  if (!result.supported || !result.config) {
    throw new Error('Unsupported video configuration');
  }
  return result.config;
}` },
  },
  {
    id: 'html-canvas', category: 'video-presentation', name: 'HTMLCanvasElement',
    purpose: 'Provide an on-page bitmap drawing surface for video and overlays.',
    inputs: 'Bitmap dimensions and a requested rendering context.', outputs: 'A rendering context or null; optionally a transferred OffscreenCanvas.',
    members: ['width / height', "getContext('2d')", 'transferControlToOffscreen()', 'toBlob()'],
    lifecycle: 'Size the backing bitmap intentionally. Setting width or height clears the bitmap and resets context state. Transfer control before obtaining a context.',
    pitfalls: 'CSS size and bitmap size differ; account for device pixel ratio where appropriate. Canvas supplies neither playback controls nor A/V synchronization. Provide an accessible description or fallback.',
    docs: [{ label: 'MDN HTMLCanvasElement', url: api('HTMLCanvasElement') }],
    example: { context: 'Creates a detached canvas; the caller inserts it into the document. These are bitmap dimensions.', code: `function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Video preview');
  return canvas;
}` },
  },
  {
    id: 'canvas-2d', category: 'video-presentation', name: 'CanvasRenderingContext2D',
    purpose: 'Draw video frames and compose overlays onto a Canvas bitmap.',
    inputs: 'A CanvasImageSource (including VideoFrame), destination coordinates, and optional source crop.',
    outputs: 'Updated pixels in the associated canvas.',
    members: ['drawImage()', 'clearRect()', 'save() / restore()', 'setTransform()'],
    lifecycle: 'Obtain via canvas.getContext("2d") and handle null. Close owned VideoFrames after drawing, or when dropping them.',
    pitfalls: 'drawImage does not schedule playback or close the frame. A tainted canvas restricts pixel readback/export. Transforms and other drawing state persist until reset or restored.',
    docs: [{ label: 'MDN drawImage', url: api('CanvasRenderingContext2D/drawImage') }],
    example: { context: 'Draw a caller-owned frame without taking ownership; the caller remains responsible for closing it.', code: `function draw(canvas: HTMLCanvasElement, frame: VideoFrame): void {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D context unavailable');
  context.drawImage(frame, 0, 0, canvas.width, canvas.height);
}` },
  },
  {
    id: 'offscreen-canvas', category: 'video-presentation', name: 'OffscreenCanvas',
    purpose: 'Provide a drawing surface decoupled from DOM access, including worker rendering.',
    inputs: 'Bitmap dimensions or control transferred from an HTMLCanvasElement.',
    outputs: 'An offscreen rendering context; rendering to a linked placeholder canvas or an ImageBitmap.',
    members: ['new OffscreenCanvas(width, height)', 'getContext()', 'transferToImageBitmap()', 'convertToBlob()'],
    lifecycle: 'Transfer a canvas in a postMessage transfer list to move ownership. Close ImageBitmaps made for intermediate presentation when no longer needed.',
    pitfalls: 'An offscreen canvas does not create a worker by itself. Feature-check the desired context and worker APIs. Do not obtain an HTML canvas context before transferring control.',
    docs: [{ label: 'MDN OffscreenCanvas', url: api('OffscreenCanvas') }],
    example: { context: 'Main-thread handoff to an existing worker. The worker must handle the message, obtain its context, and own rendering; the caller owns worker termination.', code: `function handOff(canvas: HTMLCanvasElement, worker: Worker): void {
  if (typeof canvas.transferControlToOffscreen !== 'function') {
    throw new Error('Offscreen transfer unavailable');
  }
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({ canvas: offscreen }, [offscreen]);
}` },
  },
  {
    id: 'animation-frame', category: 'video-presentation', name: 'requestAnimationFrame',
    purpose: 'Request a one-shot callback before a future browser repaint.',
    inputs: 'A callback accepting a high-resolution timestamp in milliseconds.',
    outputs: 'A request ID usable with cancelAnimationFrame; not a video playback clock.',
    members: ['requestAnimationFrame(callback)', 'cancelAnimationFrame(id)'],
    lifecycle: 'Request again for continued rendering. Cancel on pause/unmount. Respect reduced motion for conceptual animation; preserve manual controls.',
    pitfalls: 'Refresh rate varies and callbacks commonly pause in hidden tabs. Milliseconds differ from WebCodecs microseconds. Select frames against the application playback clock; do not advance media by a fixed amount per callback.',
    docs: [{ label: 'MDN requestAnimationFrame', url: api('Window/requestAnimationFrame') }],
    example: { context: 'One repaint opportunity; the caller selects an already due frame using its playback clock. Call the returned cancellation function on pause/unmount.', code: `function requestPaint(paintDueFrame: (nowMs: number) => void): () => void {
  const id = requestAnimationFrame(nowMs => paintDueFrame(nowMs));
  return () => cancelAnimationFrame(id);
}` },
  },

  {
    id: 'audio-decoder', category: 'audio-decoding', name: 'AudioDecoder',
    purpose: 'Decode compressed audio packets into asynchronous AudioData callbacks.',
    inputs: 'Callbacks, a supported AudioDecoderConfig, and EncodedAudioChunks in decode order.',
    outputs: 'PCM through output callbacks; decode() returns void, not decoded audio.',
    members: ['configure()', 'decode()', 'decodeQueueSize / dequeue', 'flush()', 'reset()', 'close()', 'state'],
    lifecycle: 'Configure before submitting packets; start with a key chunk, including after flush. reset discards work and configuration. close permanently releases the decoder. Close every owned AudioData.',
    pitfalls: 'decodeQueueSize counts pending decode requests, not ready PCM or all in-flight work. Bound packet submission and PCM queues separately. Decoding neither plays nor synchronizes audio.',
    docs: [{ label: 'MDN AudioDecoder', url: mdn('Web/API/AudioDecoder') }],
    example: { context: 'Finite, small bounded batch with checked track configuration and genuine packet boundaries. consume is synchronous and borrows the data; it must copy or clone to retain it. Feature-check AudioDecoder first.', code: `async function decodeAudioBatch(
  config: AudioDecoderConfig,
  chunks: readonly EncodedAudioChunk[],
  consume: (data: AudioData) => void,
): Promise<void> {
  let failure: DOMException | undefined;
  const decoder = new AudioDecoder({
    output(data) {
      try { consume(data); } finally { data.close(); }
    },
    error(error) { failure = error; },
  });
  try {
    decoder.configure(config);
    for (const chunk of chunks) decoder.decode(chunk);
    await decoder.flush();
    if (failure) throw failure;
  } finally {
    if (decoder.state !== 'closed') decoder.close();
  }
}` },
  },
  {
    id: 'audio-decoder-config', category: 'audio-decoding', name: 'AudioDecoderConfig',
    purpose: 'Describe an audio bitstream using a configuration dictionary, not a constructor.',
    inputs: 'Demuxed codec string, sample rate, channel count, and codec-specific initialization when required.',
    outputs: 'Configuration for AudioDecoder.isConfigSupported() and configure().',
    members: ['codec', 'sampleRate', 'numberOfChannels', 'description'],
    lifecycle: 'Obtain metadata from the actual track and check it before configuring; reconfigure for relevant stream changes.',
    pitfalls: 'Sample rate counts sample frames per second, not channel values. description follows the codec registration, not arbitrary container bytes. Output metadata must still be read from AudioData.',
    docs: [{ label: 'MDN AudioDecoderConfig', url: mdn('Web/API/AudioDecoder/configure') }],
    example: { context: 'Illustrative Opus track metadata; packets must match this configuration. Some codec registrations require description from the demuxer.', code: `const config: AudioDecoderConfig = {
  codec: 'opus',
  sampleRate: 48_000,
  numberOfChannels: 2,
};` },
  },
  {
    id: 'encoded-audio-chunk', category: 'audio-decoding', name: 'EncodedAudioChunk',
    purpose: 'Wrap a demuxed compressed audio packet with codec timing.',
    inputs: 'Codec bytes, genuine key/delta classification, presentation timestamp and optional duration in microseconds.',
    outputs: 'An immutable compressed chunk for AudioDecoder.decode().',
    members: ['new EncodedAudioChunk(init)', 'type / timestamp / duration / byteLength', 'copyTo()'],
    lifecycle: 'Construction normally copies bytes; optional transfer moves backing ArrayBuffer ownership. There is no close method.',
    pitfalls: 'MP4 bytes are not codec packets. Convert seconds to microseconds once. Key means independently decodable according to the codec; do not assume all audio formats or arbitrary fragments qualify.',
    docs: [{ label: 'MDN EncodedAudioChunk', url: mdn('Web/API/EncodedAudioChunk/EncodedAudioChunk') }],
    example: { context: 'Caller supplies a complete codec packet and classification from a demuxer, with timing in seconds.', code: `function audioChunk(
  bytes: Uint8Array<ArrayBuffer>, type: EncodedAudioChunkType,
  seconds: number, durationSeconds: number,
): EncodedAudioChunk {
  return new EncodedAudioChunk({
    type, data: bytes,
    timestamp: Math.round(seconds * 1_000_000),
    duration: Math.round(durationSeconds * 1_000_000),
  });
}` },
  },
  {
    id: 'audio-data', category: 'audio-decoding', name: 'AudioData',
    purpose: 'Own raw PCM samples and metadata produced by decoding or prepared for encoding.',
    inputs: 'Decoder output or PCM storage plus format, sample rate, channels, frame count and timestamp.',
    outputs: 'PCM planes copied into application storage, or input to AudioEncoder.',
    members: ['format', 'sampleRate / numberOfChannels / numberOfFrames', 'timestamp / duration', 'allocationSize()', 'copyTo()', 'clone()', 'close()'],
    lifecycle: 'Close every owned output and clone after use. copyTo copies samples; it does not close the source. Transferring AudioData moves ownership.',
    pitfalls: 'One sample frame contains one value per channel. Planar PCM stores channels in separate planes; interleaved PCM alternates channel values. duration = frames / sampleRate in seconds, while AudioData timestamps/durations use microseconds. Request f32-planar conversion instead of assuming decoder layout.',
    docs: [{ label: 'MDN AudioData', url: mdn('Web/API/AudioData/copyTo') }],
    example: { context: 'Copy caller-owned AudioData into one Float32Array per channel. The caller still closes data. f32-planar conversion is required by WebCodecs.', code: `function copyChannels(data: AudioData): Float32Array<ArrayBuffer>[] {
  return Array.from({ length: data.numberOfChannels }, (_, channel) => {
    const plane = new Float32Array(data.numberOfFrames);
    data.copyTo(plane, { planeIndex: channel, format: 'f32-planar' });
    return plane;
  });
}` },
  },
  {
    id: 'audio-config-supported', category: 'audio-decoding', name: 'AudioDecoder.isConfigSupported()',
    purpose: 'Check whether a particular audio decoder configuration is supported here.',
    inputs: 'An actual AudioDecoderConfig from track metadata.',
    outputs: 'Promise with supported and the recognized configuration.',
    members: ['AudioDecoder.isConfigSupported(config)', 'result.supported / result.config'],
    lifecycle: 'Check API presence in a secure context, await support, and handle rejections before creating/configuring a decoder.',
    pitfalls: 'Browser and codec support vary. Support checks do not validate all packets or guarantee future resource availability. Inspect returned fields when relying on optional configuration.',
    docs: [{ label: 'MDN AudioDecoder.isConfigSupported()', url: mdn('Web/API/AudioDecoder/isConfigSupported_static') }],
    example: { context: 'The caller handles unsupported results and rejected checks; no audio is played.', code: `async function checkedAudioConfig(config: AudioDecoderConfig): Promise<AudioDecoderConfig> {
  if (typeof AudioDecoder === 'undefined') throw new Error('AudioDecoder unavailable');
  const result = await AudioDecoder.isConfigSupported(config);
  if (!result.supported || !result.config) throw new Error('Unsupported audio config');
  return result.config;
}` },
  },
  {
    id: 'audio-context', category: 'audio-presentation', name: 'AudioContext',
    purpose: 'Own a real-time Web Audio graph and its scheduling timeline.',
    inputs: 'Context options and connected audio nodes.',
    outputs: 'Audio rendering to destination; currentTime is context time in seconds.',
    members: ['currentTime / sampleRate / state', 'destination', 'resume()', 'suspend()', 'close()', 'baseLatency / outputLatency', 'audioWorklet'],
    lifecycle: 'Create or resume from user interaction under autoplay policy. Reuse a context where practical, suspend when appropriate, and close the owned context on teardown.',
    pitfalls: 'A context may remain suspended until activation. currentTime describes the rendering timeline, not exactly what is audible now. Sample rate can differ from source PCM; latency hints are preferences.',
    docs: [{ label: 'MDN AudioContext', url: mdn('Web/API/AudioContext') }],
    example: { context: 'Call directly from a user gesture. The caller owns the returned context and must close it; activation errors release the newly created context.', code: `async function activateAudio(): Promise<AudioContext> {
  const context = new AudioContext({ latencyHint: 'interactive' });
  try {
    await context.resume();
    if (context.state !== 'running') throw new Error('Audio not running');
    return context;
  } catch (error) {
    await context.close();
    throw error;
  }
}` },
  },
  {
    id: 'audio-buffer', category: 'audio-presentation', name: 'AudioBuffer',
    purpose: 'Store finite planar floating-point PCM for Web Audio nodes.',
    inputs: 'Channel count, length in sample frames, sample rate, and PCM values.',
    outputs: 'One Float32Array per channel; duration in seconds.',
    members: ['length / duration / sampleRate / numberOfChannels', 'getChannelData()', 'copyToChannel()', 'copyFromChannel()'],
    lifecycle: 'Garbage collected when no longer referenced; reusable across source nodes. There is no close method.',
    pitfalls: 'length is frames per channel, not total channel values or bytes. AudioBuffer is not an encoded ArrayBuffer or WebCodecs AudioData. Avoid mutating buffers while scheduled sources use them.',
    docs: [{ label: 'MDN AudioBuffer', url: mdn('Web/API/AudioBuffer') }],
    example: { context: 'Copy a caller-owned AudioData to an independent AudioBuffer; caller closes data. No playback is started.', code: `function toAudioBuffer(data: AudioData): AudioBuffer {
  const buffer = new AudioBuffer({
    length: data.numberOfFrames,
    numberOfChannels: data.numberOfChannels,
    sampleRate: data.sampleRate,
  });
  for (let channel = 0; channel < data.numberOfChannels; channel++) {
    const plane = new Float32Array(data.numberOfFrames);
    data.copyTo(plane, { planeIndex: channel, format: 'f32-planar' });
    buffer.copyToChannel(plane, channel);
  }
  return buffer;
}` },
  },
  {
    id: 'audio-buffer-source', category: 'audio-presentation', name: 'AudioBufferSourceNode',
    purpose: 'Schedule a finite AudioBuffer on the context timeline.',
    inputs: 'A PCM AudioBuffer and start time in context seconds; optional offset/duration in buffer seconds.',
    outputs: 'An audio graph signal routed through connected nodes.',
    members: ['buffer', 'start(when, offset?, duration?)', 'stop(when?)', 'playbackRate / detune', 'loop', 'ended / disconnect()'],
    lifecycle: 'A source can start only once. Create a new node per playback; reuse the buffer. Track scheduled nodes for stop/disconnect on seek or teardown.',
    pitfalls: 'Timers are not precise audio schedulers. Schedule ahead on currentTime with an application cursor. Gaps, overlaps, rate changes, and late scheduling need explicit policy; one node per arriving chunk is not automatically seamless.',
    docs: [{ label: 'MDN AudioBufferSourceNode', url: mdn('Web/API/AudioBufferSourceNode') }],
    example: { context: 'Caller supplies an activated context, PCM buffer, and a future start time in context seconds. The returned node lets the caller stop obsolete scheduled playback.', code: `function scheduleBuffer(
  context: AudioContext, buffer: AudioBuffer, whenSeconds: number,
): AudioBufferSourceNode {
  const source = new AudioBufferSourceNode(context, { buffer });
  source.connect(context.destination);
  source.onended = () => source.disconnect();
  source.start(whenSeconds);
  return source;
}` },
  },
  {
    id: 'audio-worklet', category: 'audio-presentation', name: 'AudioWorklet',
    purpose: 'Load custom audio-processing code into the audio rendering environment.',
    inputs: 'A module URL loaded through context.audioWorklet.addModule().',
    outputs: 'Registered processor names available to AudioWorkletNode.',
    members: ['context.audioWorklet', 'addModule(moduleURL, options?)'],
    lifecycle: 'Load and await the module before creating a matching node. The worklet belongs to the context; graph nodes and context need teardown.',
    pitfalls: 'Requires a secure context and compatible module loading/CORS. A worklet is neither a DOM environment nor a general-purpose Worker. Fetch, demux, and decode upstream; keep rendering work bounded.',
    docs: [{ label: 'MDN AudioWorklet', url: mdn('Web/API/AudioWorklet') }],
    example: { context: 'Caller owns the context; the same-origin module must register a processor named pcm-player. A PCM queue implementation is a separate responsibility.', code: `async function loadProcessor(context: AudioContext): Promise<void> {
  if (!context.audioWorklet) throw new Error('AudioWorklet unavailable');
  await context.audioWorklet.addModule('/pcm-player.js');
}` },
  },
  {
    id: 'audio-worklet-node', category: 'audio-presentation', name: 'AudioWorkletNode',
    purpose: 'Connect a registered worklet processor to the main-thread audio graph.',
    inputs: 'Context, registered processor name, and node/channel options.',
    outputs: 'Audio graph output plus a MessagePort for processor communication.',
    members: ['new AudioWorkletNode(context, name, options)', 'port', 'parameters', 'processorerror', 'connect() / disconnect()'],
    lifecycle: 'Create after addModule resolves. On teardown, disconnect the node, remove listeners, close its port, and tell a custom source processor to stop if its protocol supports that.',
    pitfalls: 'The processor supplies PCM; sending a message alone does not implement playback. Define bounded queues, underrun behavior and shutdown protocol. Avoid per-sample messages and frequent allocations on the rendering thread.',
    docs: [{ label: 'MDN AudioWorkletNode', url: mdn('Web/API/AudioWorkletNode') }],
    example: { context: 'Requires pcm-player to have been registered in this context. It must produce a stereo output from its own PCM queue. Caller owns disconnect, port cleanup, and context lifetime.', code: `function connectPcmPlayer(context: AudioContext): AudioWorkletNode {
  const node = new AudioWorkletNode(context, 'pcm-player', {
    numberOfInputs: 0, numberOfOutputs: 1,
    outputChannelCount: [2],
  });
  node.connect(context.destination);
  return node;
}` },
  },
  {
    id: 'audio-worklet-processor', category: 'audio-presentation', name: 'AudioWorkletProcessor',
    purpose: 'Render PCM blocks synchronously on the audio rendering thread.',
    inputs: 'process(inputs, outputs, parameters): nested input/output channel Float32Arrays and parameter arrays.',
    outputs: 'Samples written into output arrays; boolean result controls active processing lifetime.',
    members: ['process(inputs, outputs, parameters)', 'port', 'registerProcessor(name, constructor)'],
    lifecycle: 'Subclass in a worklet module and register it. Keep source processors active while producing or awaiting PCM; return false when the processor can finish. Coordinate shutdown with the owning node.',
    pitfalls: 'Never await or block in process; avoid logging, unbounded loops, heavy allocation, and Atomics.wait. Read actual channel array lengths rather than assuming 128 frames. Outputs start as silence; handle missing input and underruns explicitly.',
    docs: [{ label: 'MDN AudioWorkletProcessor', url: mdn('Web/API/AudioWorkletProcessor/process') }],
    example: { context: 'Typed helper called synchronously by a pass-through processor’s process method. This is a rendering-body example, not a complete registered module or PCM queue. It fills existing output storage without allocating sample buffers.', code: `function renderBlock(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
  const input = inputs[0];
  const output = outputs[0];
  if (!output) return true;
  for (let channel = 0; channel < output.length; channel++) {
    const source = input?.[channel];
    const target = output[channel];
    for (let frame = 0; frame < target.length; frame++) {
      target[frame] = source?.[frame] ?? 0;
    }
  }
  return true;
}` },
  },
  {
    id: 'audio-output-timestamp', category: 'audio-presentation', name: 'AudioContext.getOutputTimestamp()',
    purpose: 'Relate device output position to the performance timeline for A/V scheduling.',
    inputs: 'A running AudioContext; optionally a nearby performance.now() reading.',
    outputs: 'AudioTimestamp: contextTime in seconds and performanceTime in milliseconds, describing the same output sample frame.',
    members: ['getOutputTimestamp()', 'AudioTimestamp.contextTime', 'AudioTimestamp.performanceTime'],
    lifecycle: 'Read fresh pairs while running and re-anchor composition mapping after seek/resume/rate changes. Feature-check the method and reject unavailable or initial timing values.',
    pitfalls: 'currentTime is not device output time. Map units explicitly. The pair already estimates device output timing: adding outputLatency again double-counts it. Extrapolation is local and only useful while the context advances.',
    docs: [{ label: 'MDN AudioContext.getOutputTimestamp()', url: mdn('Web/API/AudioContext/getOutputTimestamp') }],
    example: { context: 'Estimate the context position audible at nowMs using a recent timestamp pair on a running context. Map this context position to composition time separately, including playback-rate policy.', code: `function audibleContextSeconds(context: AudioContext, nowMs: number): number | null {
  if (context.state !== 'running' || typeof context.getOutputTimestamp !== 'function') return null;
  const { contextTime, performanceTime } = context.getOutputTimestamp();
  // Reject startup, stale, and future pairs. 250 ms is this example's policy.
  if (contextTime === undefined || performanceTime === undefined ||
      contextTime <= 0 || performanceTime <= 0 ||
      nowMs < performanceTime || nowMs - performanceTime >= 250) return null;
  return contextTime + (nowMs - performanceTime) / 1000;
}` },
  },
  {
    id: 'worker', category: 'concurrency', name: 'Worker',
    purpose: 'Run application JavaScript away from the UI thread.',
    inputs: 'Worker script URL/options and structured-clone messages with optional transfer lists.',
    outputs: 'Messages and errors from an independent execution environment.',
    members: ['new Worker(url, options)', 'postMessage()', 'message / error', 'terminate()'],
    lifecycle: 'The application owns the worker. Send graceful cleanup messages when needed; terminate on teardown. Do not depend on worker cleanup code running after terminate.',
    pitfalls: 'Workers have no DOM. Check required APIs inside the worker, not only on Window. Transfer ArrayBuffer to detach sender ownership; ordinary messaging clones data. Worker scheduling does not guarantee real-time audio deadlines.',
    docs: [{ label: 'MDN Worker', url: mdn('Web/API/Worker') }],
    example: { context: 'The caller supplies a worker module URL that handles the bytes message. This consumes buffer ownership; caller owns listeners and worker termination.', code: `function sendBytes(moduleUrl: URL, bytes: ArrayBuffer): Worker {
  const worker = new Worker(moduleUrl, { type: 'module' });
  worker.postMessage({ bytes }, [bytes]);
  // bytes is now detached in this thread.
  return worker;
}` },
  },
  {
    id: 'message-channel', category: 'concurrency', name: 'MessageChannel',
    purpose: 'Create two connected ports for a dedicated message path.',
    inputs: 'A new channel, optionally transferring an endpoint to a worker or worklet.',
    outputs: 'port1 and port2, linked MessagePort endpoints.',
    members: ['new MessageChannel()', 'port1 / port2'],
    lifecycle: 'Retain the local endpoint and transfer the remote one to its owner; each owner closes its port and removes listeners when finished.',
    pitfalls: 'Channel messages are asynchronous, not shared memory or a timing guarantee. Bound application messages; transferring an endpoint makes it unusable by the sender.',
    docs: [{ label: 'MDN MessageChannel', url: mdn('Web/API/MessageChannel') }],
    example: { context: 'Worker must receive event.ports[0] and attach its own handler. Caller owns the returned port and its eventual close().', code: `function openWorkerChannel(worker: Worker): MessagePort {
  const channel = new MessageChannel();
  worker.postMessage({ type: 'connect' }, [channel.port2]);
  return channel.port1;
}` },
  },
  {
    id: 'message-port', category: 'concurrency', name: 'MessagePort',
    purpose: 'Send structured messages and transferable objects through an endpoint.',
    inputs: 'Message values plus an optional transfer list.',
    outputs: 'message and messageerror events at the connected endpoint.',
    members: ['postMessage(value, transfer?)', 'start()', 'close()', 'message / messageerror'],
    lifecycle: 'onmessage starts delivery implicitly; with addEventListener call start(). Remove listeners and close owned ports on teardown.',
    pitfalls: 'A transfer list moves ownership; include the transferred object in the message graph. SharedArrayBuffer is shared without a transfer list. Define cancellation, queue limits, and message validation in your protocol.',
    docs: [{ label: 'MDN MessagePort', url: mdn('Web/API/MessagePort') }],
    example: { context: 'Caller-owned port. consume should validate the untrusted message shape and avoid retaining unbounded data. Returned cleanup removes this listener and closes this endpoint.', code: `function listen(port: MessagePort, consume: (value: unknown) => void): () => void {
  const handler = (event: MessageEvent<unknown>) => consume(event.data);
  port.addEventListener('message', handler);
  port.start();
  return () => {
    port.removeEventListener('message', handler);
    port.close();
  };
}` },
  },
  {
    id: 'shared-array-buffer', category: 'concurrency', name: 'SharedArrayBuffer',
    purpose: 'Expose the same backing bytes to cooperating execution contexts.',
    inputs: 'Byte length and views shared through postMessage without a transfer list.',
    outputs: 'Shared memory; neither sender nor receiver loses access.',
    members: ['new SharedArrayBuffer(byteLength)', 'byteLength', 'typed-array views', 'crossOriginIsolated'],
    lifecycle: 'Storage remains reachable by all owners until released. Design explicit producer/consumer ownership and synchronization; there is no close or detach handoff.',
    pitfalls: 'Browser sharing needs a secure context and cross-origin isolation. Typically serve COOP: same-origin and COEP: require-corp (or supported credentialless), with compatible embedded resources and permissions policy. Check crossOriginIsolated and API presence. SharedArrayBuffer is not transferable; unsynchronized access causes races.',
    docs: [{ label: 'MDN SharedArrayBuffer', url: mdn('Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer') }],
    example: { context: 'Illustrative isolated-page allocation; worker must implement a matching synchronization protocol before using shared data. This page does not configure isolation headers.', code: `function shareStorage(worker: Worker): Int32Array<SharedArrayBuffer> {
  if (!globalThis.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
    throw new Error('Shared memory unavailable; use transferable buffers');
  }
  const storage = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 16);
  const control = new Int32Array(storage);
  worker.postMessage({ storage }); // no transfer list
  return control;
}` },
  },
  {
    id: 'atomics', category: 'concurrency', name: 'Atomics',
    purpose: 'Coordinate reads and writes to shared integer control state.',
    inputs: 'Supported integer typed-array views over shared memory, indexes and values.',
    outputs: 'Atomic values and synchronization operations for an application protocol.',
    members: ['load() / store()', 'add() / compareExchange()', 'wait() / notify()', 'waitAsync()'],
    lifecycle: 'Agree on indexes, ownership and publication order across contexts. Keep control indexes separate from PCM payload; reuse only after consumer acknowledgement.',
    pitfalls: 'Atomic operations do not create a ring buffer or make an entire multi-step algorithm atomic. Atomics.wait cannot block the browser main thread and must never block audio rendering. Feature-check optional operations such as waitAsync.',
    docs: [{ label: 'MDN Atomics', url: mdn('Web/JavaScript/Reference/Global_Objects/Atomics') }],
    example: { context: 'Single-producer publication after writing a shared payload. control is a shared Int32Array. Consumer uses Atomics.load(control, 0); capacity, wraparound, and acknowledgement belong to the queue protocol.', code: `function publishWritePosition(control: Int32Array<SharedArrayBuffer>, position: number): void {
  Atomics.store(control, 0, position);
  Atomics.notify(control, 0);
}` },
  },
  {
    id: 'video-encoder', category: 'encoding', name: 'VideoEncoder',
    purpose: 'Compress raw video frames into codec packets for later muxing.',
    inputs: 'Supported VideoEncoderConfig and timestamped VideoFrame input.',
    outputs: 'Asynchronous EncodedVideoChunk callbacks plus optional decoder configuration metadata for a muxer.',
    members: ['isConfigSupported(config)', 'configure()', 'encode()', 'encodeQueueSize / dequeue', 'flush()', 'reset() / close()', 'output(chunk, metadata)'],
    lifecycle: 'Check API and exact configuration before configuring. encode retains its own media reference; close caller-owned input after submission. flush drains pending output; reset discards work/configuration; close permanently releases resources.',
    pitfalls: 'Bound both submission and export queues; encodeQueueSize is not export completion. Preserve output timestamps in microseconds and decoderConfig metadata. Encoding does not produce an MP4 file: a separate muxer handles container structure, interleaving, timing, and finalization. Request keyframes as appropriate for random access.',
    docs: [{ label: 'MDN VideoEncoder', url: mdn('Web/API/VideoEncoder') }],
    example: { context: 'One borrowed VideoFrame with matching 640×360 VP8 configuration. Caller closes input even on failure. emit synchronously collects output/metadata for a separate muxer and must not throw; any asynchronous muxer finalization must be awaited separately.', code: `async function encodeVideo(
  input: VideoFrame,
  emit: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => void,
): Promise<void> {
  if (typeof VideoEncoder === 'undefined') throw new Error('VideoEncoder unavailable');
  const config: VideoEncoderConfig = { codec: 'vp8', width: 640, height: 360, bitrate: 1_000_000, framerate: 30 };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) throw new Error('Unsupported encoding configuration');
  let failure: DOMException | undefined;
  const encoder = new VideoEncoder({
    output: emit,
    error(error) { failure = error; },
  });
  try {
    encoder.configure(config);
    encoder.encode(input, { keyFrame: true });
    await encoder.flush();
    if (failure) throw failure;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
}` },
  },
  {
    id: 'audio-encoder', category: 'encoding', name: 'AudioEncoder',
    purpose: 'Compress PCM sample frames into codec packets for later muxing.',
    inputs: 'Supported AudioEncoderConfig and timestamped AudioData input.',
    outputs: 'Asynchronous EncodedAudioChunk callbacks plus optional decoder configuration metadata for a muxer.',
    members: ['isConfigSupported(config)', 'configure()', 'encode()', 'encodeQueueSize / dequeue', 'flush()', 'reset() / close()', 'output(chunk, metadata)'],
    lifecycle: 'Check API and exact configuration before configuring. encode retains its own media reference; close caller-owned input after submission. flush drains pending output; reset discards work/configuration; close permanently releases resources.',
    pitfalls: 'Bound both submission and export queues; encodeQueueSize is not export completion. Preserve output timestamps in microseconds and decoderConfig metadata. Encoding does not produce an MP4 file: a separate muxer handles container structure, interleaving, timing, and finalization. Match input sample rate/channel layout to configuration; encoding alone does not resample, mix, or schedule audio.',
    docs: [{ label: 'MDN AudioEncoder', url: mdn('Web/API/AudioEncoder') }],
    example: { context: 'One borrowed AudioData with matching 48 kHz stereo Opus configuration. Caller closes input even on failure. emit synchronously collects output/metadata for a separate muxer and must not throw; any asynchronous muxer finalization must be awaited separately.', code: `async function encodeAudio(
  input: AudioData,
  emit: (chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) => void,
): Promise<void> {
  if (typeof AudioEncoder === 'undefined') throw new Error('AudioEncoder unavailable');
  const config: AudioEncoderConfig = { codec: 'opus', sampleRate: 48_000, numberOfChannels: 2, bitrate: 128_000 };
  const support = await AudioEncoder.isConfigSupported(config);
  if (!support.supported) throw new Error('Unsupported encoding configuration');
  let failure: DOMException | undefined;
  const encoder = new AudioEncoder({
    output: emit,
    error(error) { failure = error; },
  });
  try {
    encoder.configure(config);
    encoder.encode(input);
    await encoder.flush();
    if (failure) throw failure;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
}` },
  },
]
