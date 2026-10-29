import type { VideoPipelineStage } from './videoPipeline'

export type AudioStrategy = 'scheduled' | 'worklet'
export const audioPipelineStages: VideoPipelineStage[] = [
  { name: 'HTTP Fetch', boundary: 'fetch → Response', inputs: 'Complete MP4 URL and AbortSignal.', outputs: 'Response body containing container bytes.', transformation: 'The application schedules a request and checks response.ok; the browser performs transport.', timing: 'Asynchronous; headers may arrive before the body.', ownership: 'Application owns cancellation and request policy.' },
  { name: 'ArrayBuffer', boundary: 'response.arrayBuffer()', inputs: 'Response body.', outputs: 'Complete container bytes in memory.', transformation: 'Consume the body and wrap it with Mediabunny BufferSource. These bytes are not an audio codec payload.', timing: 'Body read is asynchronous; source construction is synchronous.', ownership: 'Application retains bytes and budgets memory while Input needs them.' },
  { name: 'Mediabunny', boundary: 'Input + InputAudioTrack', inputs: 'BufferSource and container formats.', outputs: 'Primary audio track and AudioDecoderConfig.', transformation: 'Parse the container and inspect getPrimaryAudioTrack() / getDecoderConfig(). Fragmented MP4 needs initialization metadata and a valid source.', timing: 'Track/config inspection is asynchronous and may read lazily.', ownership: 'Mediabunny owns parsing; application calls input.dispose() at teardown.' },
  { name: 'Encoded packets', boundary: 'EncodedPacketSink(track)', inputs: 'Audio track sample metadata.', outputs: 'Compressed EncodedPackets in decode order.', transformation: 'Extract codec payload and timestamps in seconds without decoding PCM.', timing: 'Asynchronous packet iteration.', ownership: 'Application owns packet buffering, budgets, and cancellation.' },
  { name: 'EncodedAudioChunk', boundary: 'packet.toEncodedAudioChunk()', inputs: 'Compressed packet and presentation timestamp.', outputs: 'WebCodecs chunk with timestamp/duration in microseconds.', transformation: 'Convert payload and timing using Mediabunny’s helper. Do not convert seconds a second time.', timing: 'Synchronous conversion; no PCM yet.', ownership: 'Browser owns chunk internals; chunks have no close() method.' },
  { name: 'AudioDecoder', boundary: 'configure → decode → output', inputs: 'Supported config and chunks in decode order.', outputs: 'AudioData arrives through asynchronous output callbacks.', transformation: 'Decompress codec payload. decodeQueueSize counts pending requests, not PCM ready for playback.', timing: 'decode() returns immediately; output is separate and may be delayed.', ownership: 'Application checks support, handles errors/backpressure, and closes the decoder.' },
  { name: 'AudioData / PCM', boundary: 'copyTo(..., f32-planar)', inputs: 'AudioData with sample rate, channels, frame count and µs timestamp.', outputs: 'One Float32Array per channel, one scalar sample per sample frame.', transformation: 'Copy/convert to planar float PCM. Duration = numberOfFrames / sampleRate seconds; channels multiply samples and memory, not duration.', timing: 'Copy is synchronous inside the output callback.', ownership: 'Application closes AudioData after copying, including on cancellation/errors. Copied PCM has its own lifetime.' },
  { name: 'Audio output', boundary: 'Web Audio rendering', inputs: 'Timed AudioBuffers or a PCM queue at the AudioContext sample rate.', outputs: 'Continuously rendered blocks of sample frames.', transformation: 'Scheduled sources use context-time deadlines; a worklet pulls PCM into each output array. Neither strategy is implemented by AudioDecoder.', timing: 'Rendering proceeds independently of decoder callbacks and main-thread animation.', ownership: 'Application owns scheduling/queue policies and teardown; browser renders the graph.' },
  { name: 'Speakers', boundary: 'AudioContext.destination → device', inputs: 'Rendered audio through the output pipeline.', outputs: 'Sound after device/output latency.', transformation: 'Mixing and output transport carry rendered samples to the device. A decoded or processed block is not proof of audible output.', timing: 'Output latency separates processing time from device output time.', ownership: 'Browser/device own output. Application activates context through user interaction and maps clocks when synchronizing.' },
]

export const audioEventStages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8, 7, 8] as const
export const audioLastStep = audioEventStages.length - 1

// Snapshot accounting: one delayed refill after an empty rendering block.
// Quantities are sample frames, never per-channel scalar sample counts.
export function audioSnapshot(step: number, block: number) {
  const queuedBlocks = step < 7 ? 0 : step === 7 ? 3 : step === 8 ? 2 : step === 9 ? 1 : step < 12 ? 0 : step === 12 ? 2 : 1
  const renderedBlocks = step < 8 ? 0 : step <= 10 ? step - 7 : step < 13 ? 3 : 4
  const silenceBlocks = step >= 11 ? 1 : 0
  return {
    queued: queuedBlocks * block,
    decoded: (step < 6 ? 0 : step < 12 ? 3 : 5) * block,
    rendered: renderedBlocks * block,
    silence: silenceBlocks * block,
    processing: step >= 8 && step !== 12,
  }
}

export function audioEventText(step: number, strategy: AudioStrategy, block: number) {
  const events = [
    'Fetch a complete MP4. This simulation makes no network request.',
    'Read container bytes into ArrayBuffer and expose them with BufferSource.',
    'Open Input; inspect the audio track and its decoder configuration.',
    'EncodedPacketSink extracts compressed audio payloads in decode order.',
    'Convert packets to EncodedAudioChunks: seconds become microseconds.',
    'Submit chunks to a supported AudioDecoder. No output has been modeled yet.',
    `A delayed output callback delivers ${3 * block} sample frames. Copy PCM, then close AudioData; no sound has been rendered.`,
    strategy === 'scheduled' ? 'Schedule three contiguous AudioBuffer regions ahead on the AudioContext clock.' : 'Transfer copied PCM into a bounded worklet queue. The processor will pull it at rendering time.',
    `Render ${block} sample frames per channel. Device output follows later; the arrow does not measure device latency.`,
    `Render another ${block} sample frames per channel; the prepared PCM reserve shrinks.`,
    'Render the last prepared block. The reserve is now empty; the audio clock keeps advancing.',
    strategy === 'scheduled' ? 'Miss the next scheduling deadline: no source covers this interval, so the graph renders silence.' : 'The queue underruns: process() still runs and leaves missing samples as silence.',
    strategy === 'scheduled' ? 'Late PCM arrives. Re-anchor two new regions to a future context time; the missed interval cannot be recovered.' : 'Late PCM arrives. Refill two blocks; this FIFO policy resumes next render and shifts media behind the elapsed clock.',
    'Rendering resumes. An underrun remains audible as a gap; a player must choose a recovery and synchronization policy.',
  ]
  return events[step]
}
