export type MediabunnyEntry = {
  name: string
  group: 'Sources and input' | 'Tracks and packets' | 'Optional decoded samples'
  purpose: string
  boundary: string
  lifecycle: string
}

export const mediabunnyEntries: MediabunnyEntry[] = [
  { name: 'Input', group: 'Sources and input', purpose: 'Owns a container-reading session, format detection, and track access.', boundary: 'new Input({ formats: ALL_FORMATS, source }); await getPrimaryVideoTrack() / getPrimaryAudioTrack(). Tracks may be absent (null).', lifecycle: 'Call input.dispose() to cancel reads/sink work and release connected library resources. Application-owned decoders and output handles still need separate cleanup.' },
  { name: 'BlobSource', group: 'Sources and input', purpose: 'Reads a local Blob or File through random-access byte reads.', boundary: 'new BlobSource(fileOrBlob). A file-picker File is a Blob; no preliminary full-file arrayBuffer() is required.', lifecycle: 'Keep the input alive while inspecting tracks or using sinks. Dispose it when done; the source does not make a decoded-frame queue.' },
  { name: 'BufferSource', group: 'Sources and input', purpose: 'Adapts container bytes already held in memory.', boundary: 'new BufferSource(arrayBufferOrView). Accepts ArrayBuffer, SharedArrayBuffer, or an ArrayBufferView; it does not demux by itself.', lifecycle: 'Budget the application’s resident compressed bytes and keep storage valid while reading. This is not an append API or a codec chunk constructor.' },
  { name: 'UrlSource', group: 'Sources and input', purpose: 'Lets Mediabunny manage network reads and prefetch from a URL.', boundary: 'new UrlSource(urlOrRequest). HTTP range support enables efficient random access; origin/CORS policy still applies.', lifecycle: 'Use Input.dispose() for cancellation. A supplied Request’s signal is overridden. Choose CustomSource when your application must control cache lookup and missing-range retrieval.' },
  { name: 'CustomSource', group: 'Sources and input', purpose: 'Adapts application-defined random-access reads to an input.', boundary: 'new CustomSource({ getSize, read, dispose }). getSize returns the known file size; read(start, end) resolves requested bytes or a byte stream. End is exclusive.', lifecycle: 'The application owns cache contents, miss handling, and cancellation in dispose. The source may cache reads internally; it is neither the application’s segment cache nor an appendable buffer.' },
  { name: 'InputVideoTrack', group: 'Tracks and packets', purpose: 'Exposes video-track metadata and access to its codec configuration.', boundary: 'await input.getPrimaryVideoTrack(); await track.getDecoderConfig() returns VideoDecoderConfig or null. Metadata methods such as getDisplayWidth() are asynchronous.', lifecycle: 'Handle missing tracks and unknown codecs. Check VideoDecoder.isConfigSupported(config) before configuring a browser decoder; metadata alone does not establish support.' },
  { name: 'InputAudioTrack', group: 'Tracks and packets', purpose: 'Exposes audio-track metadata and codec configuration.', boundary: 'await input.getPrimaryAudioTrack(); await track.getDecoderConfig(); await track.getSampleRate(); await track.getNumberOfChannels().', lifecycle: 'Handle null tracks/configurations and check the actual AudioDecoder configuration if decoding manually. Track access does not produce PCM or audible output.' },
  { name: 'EncodedPacket', group: 'Tracks and packets', purpose: 'Holds compressed payload, key/delta type, and media timing.', boundary: 'timestamp and duration use seconds. toEncodedVideoChunk() / toEncodedAudioChunk() produce WebCodecs chunks, converting timing to microseconds.', lifecycle: 'Budget retained packets separately from downloaded bytes and decoded media. Do not multiply converted timestamps again; this object is compressed data, not a VideoFrame or PCM sample.' },
  { name: 'EncodedPacketSink', group: 'Tracks and packets', purpose: 'Extracts a selected track’s compressed packets without decoding them.', boundary: 'new EncodedPacketSink(track); await getKeyPacket(timeSeconds); packets(startPacket?, endPacket?) yields in decode order, including start and excluding end.', lifecycle: 'A key lookup can return null. Start/restart decoding with suitable dependencies and configuration. Iteration bounds are packet objects, not seconds; use separate application packet queues and budgets.' },
  { name: 'VideoSampleSink', group: 'Optional decoded samples', purpose: 'Optionally lets Mediabunny manage video decoding at a higher level.', boundary: 'new VideoSampleSink(videoTrack); await getSample(timeSeconds) returns VideoSample or null; samples(startSeconds?, endSeconds?) iterates decoded samples.', lifecycle: 'Check track.canDecode() for this library-managed path. Close each returned sample after use. The application still chooses composition timing, presentation policy, and budgets.' },
  { name: 'AudioSampleSink', group: 'Optional decoded samples', purpose: 'Optionally lets Mediabunny decode audio into raw sample objects.', boundary: 'new AudioSampleSink(audioTrack); samples(startSeconds?, endSeconds?) yields AudioSample objects in presentation order; end time is exclusive.', lifecycle: 'Close samples after copying/consuming them, and dispose the input when finished. A decoded sample is not device output; PCM feeding, scheduling, and synchronization still need an output strategy.' },
]

export const mediabunnyExamples = [
  {
    id: 'sources', title: 'Choose an input source',
    context: 'Independent alternatives. The caller supplies a File, existing complete-file bytes, or an accessible URL; this helper creates only the selected input. The caller must dispose the returned Input.',
    code: `import { Input, ALL_FORMATS, BlobSource, BufferSource, UrlSource } from 'mediabunny';

type Location =
  | { kind: 'file'; file: File }
  | { kind: 'memory'; bytes: ArrayBuffer }
  | { kind: 'url'; url: string };

function openMedia(location: Location): Input {
  const source = location.kind === 'file' ? new BlobSource(location.file)
    : location.kind === 'memory' ? new BufferSource(location.bytes)
    : new UrlSource(location.url);
  return new Input({ formats: ALL_FORMATS, source });
}
// const input = openMedia({ kind: 'file', file });
// try { /* inspect tracks / use sinks */ } finally { input.dispose(); }`,
  },
  {
    id: 'packets', title: 'Inspect tracks, configuration, and encoded packets',
    context: 'Takes a caller-owned Input. Returns at most one video chunk and audio metadata; it does not configure a decoder or transfer input ownership. A real player retains decode dependencies and handles codec errors.',
    code: `import { Input, EncodedPacketSink } from 'mediabunny';

async function inspectTracks(input: Input, timeSeconds: number) {
  const video = await input.getPrimaryVideoTrack();
  const audio = await input.getPrimaryAudioTrack();
  const audioInfo = audio ? {
    config: await audio.getDecoderConfig(),
    sampleRate: await audio.getSampleRate(),
    channels: await audio.getNumberOfChannels(),
  } : null;
  if (!video) return { audioInfo, chunk: null };
  const config = await video.getDecoderConfig();
  if (!config || typeof VideoDecoder === 'undefined') {
    return { audioInfo, chunk: null };
  }
  const support = await VideoDecoder.isConfigSupported(config);
  if (!support.supported || !support.config) throw new Error('Unsupported video');
  const sink = new EncodedPacketSink(video);
  const key = await sink.getKeyPacket(timeSeconds);
  if (!key) return { audioInfo, chunk: null };
  // packets(key) starts at key, in decode order; its bounds are packets.
  for await (const packet of sink.packets(key)) {
    return { audioInfo, config: support.config,
      chunk: packet.toEncodedVideoChunk() }; // Already microseconds.
  }
  return { audioInfo, chunk: null };
}`,
  },
  {
    id: 'samples', title: 'Optionally let sample sinks manage decoding',
    context: 'Takes a caller-owned Input and Canvas. Inspects one video sample and a one-second audio interval; it does not play audio. Returned samples are closed, while the caller disposes Input and handles errors/cancellation.',
    code: `import { Input, VideoSampleSink, AudioSampleSink } from 'mediabunny';

async function inspectSamples(input: Input, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D Canvas unavailable');
  const video = await input.getPrimaryVideoTrack();
  if (video && await video.canDecode()) {
    const sample = await new VideoSampleSink(video).getSample(1); // seconds
    if (sample) {
      try {
        canvas.width = sample.displayWidth;
        canvas.height = sample.displayHeight;
        sample.draw(ctx, 0, 0);
      } finally { sample.close(); }
    }
  }
  const audio = await input.getPrimaryAudioTrack();
  let sampleFrames = 0;
  if (audio && await audio.canDecode()) {
    for await (const sample of new AudioSampleSink(audio).samples(0, 1)) {
      try { sampleFrames += sample.numberOfFrames; }
      finally { sample.close(); }
    }
  }
  return sampleFrames; // Sum of decoded sample frames, not audible duration.
}`,
  },
  {
    id: 'cache', title: 'Adapt an application-owned byte cache with CustomSource',
    context: 'A small-file adapter using eight-byte blocks to match the walkthrough. The caller provides a known size, a cache scoped to one immutable file, and a loadRange function that fetches/validates [start, end) and honors AbortSignal. This is a source adapter, not an HTTP client. Production code needs larger blocks, budgets/eviction, request deduplication, and asset-version validation.',
    code: `import { Input, ALL_FORMATS, CustomSource } from 'mediabunny';

type LoadRange = (start: number, end: number, signal: AbortSignal)
  => Promise<Uint8Array>;

function cachedInput(
  size: number, cache: Map<number, Uint8Array>, loadRange: LoadRange,
): Input {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Known size required');
  const controller = new AbortController();
  const signal = controller.signal;
  const blockSize = 8;
  const source = new CustomSource({
    getSize: () => size,
    prefetchProfile: 'none',
    async read(start, end) {
      signal.throwIfAborted();
      const result = new Uint8Array(end - start);
      for (let offset = start; offset < end;) {
        const blockStart = Math.floor(offset / blockSize) * blockSize;
        const blockEnd = Math.min(blockStart + blockSize, size);
        let block = cache.get(blockStart);
        if (!block) {
          block = await loadRange(blockStart, blockEnd, signal);
          signal.throwIfAborted(); // Do not commit canceled results.
          if (block.length !== blockEnd - blockStart) throw new Error('Short read');
          cache.set(blockStart, block);
        }
        const stop = Math.min(end, blockEnd);
        result.set(block.subarray(offset - blockStart, stop - blockStart), offset - start);
        offset = stop;
      }
      signal.throwIfAborted();
      return result; // Requested bytes only, in order; end is exclusive.
    },
    dispose() { controller.abort(); }, // Reject outstanding loader work.
  });
  return new Input({ formats: ALL_FORMATS, source });
}
// input.dispose() triggers the adapter's dispose; the caller's cache survives.
// loadRange must reject network/status/range failures; do not wait indefinitely.
// An HTTP Range request uses inclusive end - 1, unlike this adapter's end.`,
  },
]
