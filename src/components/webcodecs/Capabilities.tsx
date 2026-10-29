type IllustrationKind = 'video' | 'audio' | 'canvas' | 'sound' | 'buffers' | 'sync' | 'seek' | 'clips' | 'encode'

const capabilities: { kind: IllustrationKind; title: string; text: string; boundary: string }[] = [
  { kind: 'video', title: 'Decode video', text: 'Turn compressed video chunks into individual VideoFrames.', boundary: 'WebCodecs · VideoDecoder' },
  { kind: 'audio', title: 'Decode audio', text: 'Turn compressed audio chunks into AudioData containing PCM samples.', boundary: 'WebCodecs · AudioDecoder' },
  { kind: 'canvas', title: 'Draw frames on Canvas', text: 'Draw a VideoFrame with drawImage, then add overlays or other visual layers.', boundary: 'Canvas · application rendering' },
  { kind: 'sound', title: 'Process and play audio', text: 'Feed PCM into a Web Audio graph for processing and audible output.', boundary: 'Web Audio · application audio feed' },
  { kind: 'buffers', title: 'Manage buffers', text: 'Keep downloaded bytes, encoded packets, and decoded media in separate application queues with explicit budgets.', boundary: 'Application · queues and memory' },
  { kind: 'sync', title: 'Synchronize audio and video', text: 'Choose a shared playback clock and schedule video against audio output time.', boundary: 'Application · clocks and deadlines' },
  { kind: 'seek', title: 'Seek and control playback', text: 'Choose positions and playback rate independently of HTMLVideoElement. A seek needs suitable keyframes, dependencies, and queue cleanup.', boundary: 'Application · seek orchestration' },
  { kind: 'clips', title: 'Compose multiple clips', text: 'Map source ranges onto one continuous composition timeline and prepare audio and video across clip boundaries.', boundary: 'Application · timeline evaluation' },
  { kind: 'encode', title: 'Encode for eventual export', text: 'Compress raw frames and audio with VideoEncoder and AudioEncoder. A separate muxer packages their output into a playable file.', boundary: 'WebCodecs + a container muxer' },
]

function Illustration({ kind }: { kind: IllustrationKind }) {
  // Static schematics, not live decoding or simulations. Adjacent text supplies the description.
  const samples = [12, 26, 19, 34, 24, 15, 30, 20]
  return (
    <svg className={`webcodecs-illustration webcodecs-illustration-${kind}`} viewBox="0 0 280 90" aria-hidden="true">
      {(kind === 'video' || kind === 'audio' || kind === 'encode') && <>
        <rect x="14" y="23" width="62" height="40" rx="7" className={kind === 'encode' ? 'wc-raw' : 'wc-encoded'} />
        <text x="45" y="48">{kind === 'encode' ? 'raw' : 'chunks'}</text>
        <path d="M88 43 H130 m-8 -6 8 6 -8 6" />
        {kind === 'audio' ? samples.map((h, i) => <rect key={i} x={148 + i * 14} y={43 - h / 2} width="7" height={h} rx="2" className="wc-raw" />) :
          [0, 1, 2].map(i => <rect key={i} x={146 + i * 39} y={23 + i * 3} width="32" height="40" rx="5" className={kind === 'encode' ? 'wc-encoded' : 'wc-raw'} />)}
        <text x="199" y="83">{kind === 'audio' ? 'PCM samples' : kind === 'encode' ? 'encoded chunks' : 'video frames'}</text>
      </>}
      {kind === 'canvas' && <>
        <rect x="48" y="10" width="184" height="68" rx="8" className="wc-raw" />
        <path d="M60 65 L106 27 140 57 168 36 219 65 Z" />
        <rect x="155" y="18" width="65" height="16" rx="4" className="wc-clock" />
        <text x="187" y="30">overlay</text>
      </>}
      {kind === 'sound' && <>
        <text x="35" y="48">PCM</text><path d="M58 43 H90 m-8 -6 8 6 -8 6 M174 43 H208 m-8 -6 8 6 -8 6" />
        <rect x="98" y="20" width="70" height="46" rx="8" className="wc-raw" /><text x="133" y="48">process</text>
        <path d="M216 35 H227 L242 23 V63 L227 51 H216 Z M250 30 Q269 43 250 56" />
      </>}
      {kind === 'buffers' && [
        { label: 'bytes', count: 5, tone: 'wc-encoded' },
        { label: 'packets', count: 3, tone: 'wc-encoded' },
        { label: 'frames', count: 2, tone: 'wc-raw' },
      ].map(({ label, count, tone }, row) => <g key={label}>
        <text x="36" y={22 + row * 27}>{label}</text>
        <rect x="78" y={8 + row * 27} width="182" height="20" rx="5" />
        {Array.from({ length: count }, (_, i) => <rect key={i} x={83 + i * 29} y={12 + row * 27} width="24" height="12" rx="2" className={tone} />)}
      </g>)}
      {(kind === 'sync' || kind === 'seek' || kind === 'clips') && <>
        <path d="M18 70 H264" />
        {kind === 'sync' ? <>
          <text x="30" y="24">audio</text><text x="30" y="51">video</text>
          <path d="M64 20 H260" />
          {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={68 + i * 32} y="36" width="24" height="18" rx="3" className="wc-raw" />)}
          <path d="M146 10 V76" className="wc-clock" />
          <text x="146" y="88">shared clock</text>
        </> : kind === 'seek' ? <>
          {[0, 1, 2, 3, 4, 5, 6].map(i => <rect key={i} x={22 + i * 34} y="23" width="27" height="27" rx="4" className={i % 3 === 0 ? 'wc-encoded' : 'wc-raw'} />)}
          <path d="M139 63 H229 m-8 -6 8 6 -8 6 M229 14 V54" className="wc-clock" />
          <text x="140" y="87">keyframe → target</text>
        </> : <>
          <rect x="22" y="23" width="117" height="32" rx="5" className="wc-raw" /><text x="80" y="44">clip A</text>
          <rect x="141" y="23" width="117" height="32" rx="5" className="wc-encoded" /><text x="200" y="44">clip B</text>
          <path d="M140 12 V75" className="wc-clock" /><text x="140" y="88">composition time →</text>
        </>}
      </>}
    </svg>
  )
}

const exclusions = [
  ['No network engine', 'Use fetch or another source; your application or library schedules reads.'],
  ['No MP4 demuxer', 'A container library such as Mediabunny extracts codec chunks and metadata.'],
  ['No DASH manifest parser', 'Manifest interpretation and segment selection need a separate layer.'],
  ['No built-in media player', 'Build controls, playback state, and output scheduling around the codecs.'],
  ['No automatic A/V synchronization', 'Your application relates audio and video to a playback clock.'],
  ['No editing timeline', 'Your application maps clips and source ranges into a composition.'],
]

export function Capabilities() {
  return (
    <>
      <p className="codec-viz-note">Conceptual illustrations, not executable media demos.
        Feature presence and codec configuration support must be checked on the target browser.</p>
      <div className="webcodecs-capabilities">
        {capabilities.map(({ kind, title, text, boundary }) => (
          <article className="webcodecs-capability" key={kind}>
            <Illustration kind={kind} />
            <h3>{title}</h3>
            <p>{text}</p>
            <small>{boundary}</small>
          </article>
        ))}
      </div>
      <aside className="webcodecs-exclusions" aria-labelledby="webcodecs-exclusions-heading">
        <h3 id="webcodecs-exclusions-heading">What WebCodecs does not provide</h3>
        <p>WebCodecs is the codec layer. These surrounding responsibilities still need implementation:</p>
        <dl>{exclusions.map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl>
      </aside>
      <p className="codec-viz-note webcodecs-sources">Read more: {' '}
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API">MDN WebCodecs</a>, {' '}
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage">Canvas drawImage</a>, {' '}
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API">Web Audio</a>.
      </p>
    </>
  )
}
