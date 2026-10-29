export const audioPipelineExamples = [
  {
    title: '1. Container → compressed chunks → borrowed AudioData',
    note: 'Independent bounded inspection module. onData must copy/consume synchronously; it must not retain the borrowed AudioData. Requires Mediabunny, WebCodecs, a secure context, a complete same-origin/CORS-enabled MP4 and caller-owned AbortSignal. It does not play audio.',
    code: `import { Input, BufferSource, ALL_FORMATS, EncodedPacketSink } from 'mediabunny';

export async function inspectAudio(
  url: string, signal: AbortSignal, onData: (data: AudioData) => void,
) {
  if (typeof AudioDecoder === 'undefined') throw new Error('No AudioDecoder');
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const input = new Input({
    formats: ALL_FORMATS, source: new BufferSource(await response.arrayBuffer()),
  });
  let decoder: AudioDecoder | undefined;
  let failure: Error | undefined;
  const cancel = () => {
    if (decoder && decoder.state !== 'closed') decoder.close();
    input.dispose();
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    const track = await input.getPrimaryAudioTrack();
    const config = await track?.getDecoderConfig();
    if (!track || !config) throw new Error('No known audio codec');
    const support = await AudioDecoder.isConfigSupported(config);
    if (!support.supported || !support.config) throw new Error('Unsupported config');
    decoder = new AudioDecoder({
      output(data) {
        try { if (!signal.aborted && !failure) onData(data); }
        catch (error) { failure = error instanceof Error ? error : new Error(String(error)); }
        finally { data.close(); }
      },
      error(error) { failure = error; },
    });
    signal.throwIfAborted();
    decoder.configure(support.config);
    const sink = new EncodedPacketSink(track);
    const first = await sink.getFirstPacket();
    if (!first || first.type !== 'key') throw new Error('Need key start');
    let count = 0;
    for await (const packet of sink.packets(first)) {
      signal.throwIfAborted();
      if (failure) throw failure;
      decoder.decode(packet.toEncodedAudioChunk());
      if (++count === 12) break; // Bounded inspection, not a streaming queue.
    }
    await decoder.flush(); // End-of-input drain, not an audio clock.
    if (failure) throw failure;
  } finally {
    signal.removeEventListener('abort', cancel);
    if (decoder && decoder.state !== 'closed') decoder.close();
    input.dispose();
  }
}`,
  },
  {
    title: '2. Planar PCM → scheduled one-shot sources',
    note: 'Independent main-thread module for contiguous timestamps at playback rate 1. Create/resume a caller-owned AudioContext in a click handler, then choose baseTime in its future and originUs at the first media PTS. enqueue borrows AudioData; its caller closes it. Late PCM throws so the caller can explicitly re-anchor, skip, or stop. Web Audio resamples AudioBuffers to the context rate.',
    code: `export function createScheduler(
  context: AudioContext, originUs: number, baseTime: number,
) {
  const live = new Set<AudioBufferSourceNode>();
  let disposed = false;
  return {
    enqueue(data: AudioData) {
      const when = baseTime + (data.timestamp - originUs) / 1_000_000;
      if (disposed || when <= context.currentTime || live.size >= 32) {
        throw new Error('Stopped, late PCM, or scheduling budget exceeded');
      }
      const buffer = context.createBuffer(
        data.numberOfChannels, data.numberOfFrames, data.sampleRate,
      );
      for (let channel = 0; channel < data.numberOfChannels; channel++) {
        const plane = new Float32Array(data.numberOfFrames);
        data.copyTo(plane, { planeIndex: channel, format: 'f32-planar' });
        buffer.copyToChannel(plane, channel);
      }
      const source = context.createBufferSource(); // Each source starts once.
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => { live.delete(source); source.disconnect(); };
      live.add(source);
      try { source.start(when); }
      catch (error) { live.delete(source); source.disconnect(); throw error; }
    },
    dispose() {
      disposed = true;
      for (const source of live) {
        source.onended = null;
        source.stop();
        source.disconnect();
      }
      live.clear(); // Caller separately closes its AudioContext when finished.
    },
  };
}`,
  },
  {
    title: '3. Main thread → worklet PCM boundary',
    note: 'Independent main-thread module paired with panel 4 compiled as pcm-queue.js. Call after a user gesture resumes the context. Borrowed AudioData must already match context.sampleRate; production code needs resampling and timestamp alignment before this FIFO. Each message is limited to 4096 frames. Transfer detaches only the new copies. Bound producer message rate; this teaching adapter does not implement acknowledgments or production backpressure.',
    code: `export async function createPcmOutput(context: AudioContext) {
  await context.audioWorklet.addModule('/pcm-queue.js');
  const node = new AudioWorkletNode(context, 'pcm-queue', {
    numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
  });
  node.connect(context.destination);
  let disposed = false;
  return {
    enqueue(data: AudioData) {
      if (disposed || data.sampleRate !== context.sampleRate ||
          data.numberOfChannels !== 2 || data.numberOfFrames > 4096) {
        throw new Error('Need bounded stereo PCM at the context sample rate');
      }
      const planes = [0, 1].map(channel => {
        const plane = new Float32Array(data.numberOfFrames);
        data.copyTo(plane, { planeIndex: channel, format: 'f32-planar' });
        return plane;
      });
      node.port.postMessage(planes, planes.map(plane => plane.buffer));
    },
    dispose() {
      disposed = true;
      node.port.postMessage('stop');
      node.disconnect();
      node.port.close(); // Caller owns AudioData and AudioContext cleanup.
    },
  };
}`,
  },
  {
    title: '4. Worklet module · bounded ring, variable processing blocks',
    note: 'Separate TypeScript worklet module; compile to JavaScript and provide AudioWorklet global types in the consuming build. The fixed stereo ring holds 16384 sample frames and rejects whole incoming blocks on overflow. Silence on underrun and FIFO resumption are explicit example policies. Keep rendering synchronous: no fetch, await, locks, logging, or allocation in process(). Message copying also costs rendering-thread time, so keep it bounded.',
    code: `class PcmQueue extends AudioWorkletProcessor {
  private readonly capacity = 16384;
  private readonly pcm = [new Float32Array(16384), new Float32Array(16384)];
  private read = 0;
  private size = 0;
  private stopped = false;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data === 'stop') {
        this.stopped = true;
        this.size = 0;
        this.port.close();
        return;
      }
      const planes = event.data;
      if (this.stopped || !Array.isArray(planes) || planes.length !== 2 ||
          !planes.every(p => p instanceof Float32Array)) return;
      const length = planes[0].length;
      if (length > 4096 || planes[1].length !== length ||
          length > this.capacity - this.size) return; // Overflow: reject.
      for (let c = 0; c < 2; c++) {
        for (let i = 0; i < length; i++) {
          this.pcm[c][(this.read + this.size + i) % this.capacity] = planes[c][i];
        }
      }
      this.size += length;
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const channels = outputs[0];
    if (!channels?.length || this.stopped) return !this.stopped;
    const frames = channels[0].length; // Inspect actual size; never assume 128.
    const available = Math.min(frames, this.size);
    for (let c = 0; c < channels.length; c++) {
      channels[c].fill(0); // Missing frames remain silence.
      if (c >= 2) continue;
      for (let i = 0; i < available; i++) {
        channels[c][i] = this.pcm[c][(this.read + i) % this.capacity];
      }
    }
    this.read = (this.read + available) % this.capacity;
    this.size -= available;
    return true; // Stay alive to accept more PCM after an underrun.
  }
}
registerProcessor('pcm-queue', PcmQueue);`,
  },
]
