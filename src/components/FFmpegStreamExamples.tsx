import { useState } from 'react'
import { scaleLinear } from 'd3'
import { doxygen, formatSeconds, readStreamTime } from '../data/ffmpeg-internals/model'
import { displayMatrix, inspectStreams, rescaleTimestamp } from '../data/ffmpeg-internals/examples'

const cToken = /(\/\*[\s\S]*?\*\/|"[^"\n]*"|\b(?:const|unsigned|enum|struct|union|int|void|double|for|if|while|return|char|uint8_t|int32_t|int64_t|uint64_t|size_t)\b|\bAV[A-Z_][A-Za-z_0-9]*\b)/g

export function CCode({ code }: { code: string }) {
  return <pre className="ffx-code"><code>{code.split(cToken).map((token, index) =>
    index % 2 ? <span key={index} className={token.startsWith('/*') ? 'ffx-comment'
      : token.startsWith('"') ? 'ffx-string' : token.startsWith('AV') ? 'ffx-symbol' : 'ffx-keyword'}>{token}</span>
      : token,
  )}</code></pre>
}

export function StreamRelationships({ choose }: { choose: (path: string) => void }) {
  return <div className="ffx-relationships">
    <div className="ffx-owner"><code>AVFormatContext</code><span>Example input file</span></div>
    <div className="ffx-tracks">
      {['Video · H.264', 'Audio · AAC'].map((label, index) => <div className="ffx-track" key={label}>
        <strong>{label}</strong><code>streams[{index}] → AVStream</code>
        <div>{['codecpar', 'time_base', 'metadata'].map(name =>
          <button key={name} type="button" onClick={() => choose(`AVStream/${name}`)}>{name}</button>,
        )}</div>
      </div>)}
    </div>
  </div>
}

function Example({ title, code }: { title: string; code: string }) {
  return <details className="ffx-example"><summary>{title}</summary><CCode code={code} /></details>
}

export function StreamOverview({ choose }: { choose: (path: string) => void }) {
  return <>
    <h4>Two streams, one format context</h4>
    <StreamRelationships choose={choose} />
    <p>Each track has its own codec properties, timestamp units, and optional metadata. Use <code>AVPacket.stream_index</code> to match a packet to its stream.</p>
    <Example title="C example · Inspect streams and metadata" code={inspectStreams} />
    <a href={`${doxygen}structAVFormatContext.html`}>AVFormatContext API ↗</a>
  </>
}

type TimeInput = [string, string, string]
const timeLabels = ['Timestamp', 'Numerator', 'Denominator']

function TimeRow({ label, value, setValue }: { label: string; value: TimeInput; setValue: (value: TimeInput) => void }) {
  const time = readStreamTime(...value)
  return <fieldset className="ffx-time-row">
    <legend>{label}</legend>
    {timeLabels.map((name, index) => <label key={name}>{name}
      <input value={value[index]} aria-label={`${label} ${name.toLowerCase()}`}
        inputMode={index ? 'numeric' : 'text'} maxLength={24} onChange={event => {
          const next: TimeInput = [...value]
          next[index] = event.target.value
          setValue(next)
        }} />
    </label>)}
    <output aria-live="polite">{time.error ?? `${formatSeconds(time.num, time.den)} s`}</output>
  </fieldset>
}

export function TimeBaseExplorer() {
  const [a, setA] = useState<TimeInput>(['180000', '1', '90000'])
  const [b, setB] = useState<TimeInput>(['96000', '1', '48000'])
  const first = readStreamTime(...a)
  const second = readStreamTime(...b)
  const valid = first.error === undefined && second.error === undefined
  const delta = valid ? first.num * second.den - second.num * first.den : 0n

  return <>
    <h4>Compare timestamps</h4>
    <p><code>seconds = timestamp × num / den</code></p>
    <TimeRow label="Clock A" value={a} setValue={setA} />
    <TimeRow label="Clock B" value={b} setValue={setB} />
    {valid && <p aria-live="polite"><strong>{delta === 0n ? 'Same instant' :
      `A − B ≈ ${formatSeconds(delta, first.den * second.den)} s`}</strong></p>}
    <p>Use <code>AV_NOPTS_VALUE</code> for an unknown timestamp. The calculator keeps arithmetic exact until it rounds the display to 12 decimal places.</p>
    <p>Use <code>av_rescale_q</code> when converting between integer clocks. It avoids a naive overflowing intermediate multiplication and rounds to the nearest tick. Check the sentinel first and handle an unrepresentable result. Use <code>av_packet_rescale_ts</code> for packet PTS, DTS, and duration together.</p>
    <Example title="C example · Rescale one timestamp" code={rescaleTimestamp} />
    <a href={`${doxygen}group__lavu__math.html`}>Rational rescaling API ↗</a>
  </>
}

export function FrameRateComparison() {
  const [variable, setVariable] = useState(true)
  const ends = variable ? [0, 20, 60, 80, 120] : [0, 20, 40, 60, 80, 100, 120]
  const x = scaleLinear().domain([0, 120]).range([22, 490])
  return <>
    <h4>Average rate and base cadence</h4>
    <div className="ff-pillrow" aria-label="Example cadence">
      <button type="button" aria-pressed={variable} className={variable ? 'active' : ''} onClick={() => setVariable(true)}>Variable cadence</button>
      <button type="button" aria-pressed={!variable} className={!variable ? 'active' : ''} onClick={() => setVariable(false)}>Constant cadence</button>
    </div>
    <svg className="ffx-cadence" viewBox="0 0 520 106" role="img" aria-label={variable ?
      'Four frames of 20, 40, 20, and 40 milliseconds on a 20 millisecond grid' :
      'Six frames of 20 milliseconds on a 20 millisecond grid'}>
      {[0, 20, 40, 60, 80, 100, 120].map(ms => <g key={ms}>
        <line x1={x(ms)} x2={x(ms)} y1="10" y2="78" stroke="var(--border)" strokeDasharray="3 3" />
        <text x={x(ms)} y="98" textAnchor="middle">{ms}</text>
      </g>)}
      {ends.slice(0, -1).map((start, index) => {
        const end = ends[index + 1]
        return <g key={start}>
          <rect x={x(start) + 2} y="25" width={x(end) - x(start) - 4} height="40" rx="5" />
          <text x={(x(start) + x(end)) / 2} y="50" textAnchor="middle">{end - start} ms</text>
        </g>
      })}
    </svg>
    <p><strong>Average · {variable ? '4 / 0.12 ≈ 33.33' : '6 / 0.12 = 50'} fps.</strong> Count frames over the illustrated presentation interval.</p>
    <p><strong>Base grid · 50 Hz.</strong> The 20 ms grid fits every boundary in either example. This illustrates what <code>r_frame_rate</code> estimates. FFmpeg may guess a different grid for real media.</p>
  </>
}

export function RotationExample() {
  const [rotated, setRotated] = useState(true)
  return <>
    <h4>Rotation and the display matrix</h4>
    <p>Orientation can be stored as a presentation transform that leaves the decoded raster dimensions unchanged. In 9.0.2, look in <code>codecpar-&gt;coded_side_data</code> for <code>AV_PKT_DATA_DISPLAYMATRIX</code>. Presence and representation depend on the source and demuxer.</p>
    <div className="ffx-rotation">
      {['Decoded pixels', 'Presentation'].map((label, index) => <figure key={label}>
        <div className="ffx-orientation-stage">
          <div className={`ffx-frame${index && rotated ? ' rotated' : ''}`} aria-label={index && rotated ? 'Frame turned 90 degrees counterclockwise' : 'Frame upright'}>
            <span>↑</span><span>TOP</span>
          </div>
        </div>
        <figcaption>{label}</figcaption>
      </figure>)}
    </div>
    <button className="ffx-control" type="button" aria-pressed={rotated} onClick={() => setRotated(!rotated)}>Apply 90° display rotation</button>
    <p>The nine signed fixed-point coefficients can encode rotation, reflection, scale, and translation. <code>av_display_rotation_get</code> reports the counterclockwise angle in degrees and can return NaN. Preserve the full matrix when the other components matter.</p>
    <Example title="C example · Read stream orientation" code={displayMatrix} />
    <a href={`${doxygen}group__lavu__video__display.html`}>Display transformation API ↗</a>
  </>
}
