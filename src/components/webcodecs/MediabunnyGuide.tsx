import { mediabunnyEntries, mediabunnyExamples } from '../../data/mediabunny'
import { ByteCacheWalkthrough } from './ByteCacheWalkthrough'

const groups = ['Sources and input', 'Tracks and packets', 'Optional decoded samples'] as const
const layers = [
  { title: 'Downloaded segment / byte cache', owner: 'Application', data: 'Compressed container bytes, keyed by asset/version and segment or file range.', lifecycle: 'Retain reusable downloads across a seek. Define byte-offset mapping and memory/eviction policy.' },
  { title: 'Source abstraction', owner: 'Mediabunny + adapter callbacks', data: 'A read interface over bytes; CustomSource asks for known-file byte ranges. Sources may have their own internal read cache.', lifecycle: 'Serve hits, retrieve misses, reject failures, and cancel pending work on disposal. This is not your segment store.' },
  { title: 'Encoded packet buffer', owner: 'Application, after packet extraction', data: 'Compressed track payloads, key/dependency metadata, and timestamps.', lifecycle: 'Budget and submit in decode order. Downloaded bytes need parsing before they become packets.' },
  { title: 'Decoded frame / PCM buffer', owner: 'Application, after decoding', data: 'Raw pictures or audio sample frames; separate memory costs and timing.', lifecycle: 'Schedule presentation; close consumed or invalidated handles. Seeking can invalidate decoded output while retaining downloads.' },
]

export function MediabunnyGuide() {
  return <section className="webcodecs-mediabunny-guide" aria-labelledby="mediabunny-guide-heading" id="mediabunny-guide">
    <h3 id="mediabunny-guide-heading" tabIndex={-1}>Mediabunny — sources, demuxing, and byte caches</h3>
    <p>Mediabunny connects container bytes to track metadata and compressed packets.
      You can use packet sinks with your own WebCodecs decoders, or choose sample sinks
      that manage decoding. Your application chooses the cache, queue, composition, and output policies.</p>
    <p className="codec-viz-note">Reference examples only; Mediabunny is not installed or executed by this page.
      Library packet/sample timestamps use seconds. WebCodecs chunks use microseconds;
      Mediabunny’s chunk helpers perform that conversion.</p>
    {groups.map(group => <div key={group} className="webcodecs-mediabunny-group">
      <h4>{group}</h4>
      {mediabunnyEntries.filter(entry => entry.group === group).map(entry => <details key={entry.name}
        className="webcodecs-api-card webcodecs-mediabunny-card" id={`mediabunny-${entry.name}`}>
        <summary><span className="webcodecs-api-name">{entry.name}</span>
          <span className="webcodecs-api-purpose">{entry.purpose}</span></summary>
        <div className="webcodecs-api-detail">
          <dl className="webcodecs-api-facts">
            <div><dt>Boundary &amp; methods</dt><dd>{entry.boundary}</dd></div>
            <div><dt>Lifecycle &amp; pitfalls</dt><dd>{entry.lifecycle}</dd></div>
          </dl>
          <p className="webcodecs-sources"><a href={`https://mediabunny.dev/api/${entry.name}`}>{entry.name} official reference</a></p>
        </div>
      </details>)}
    </div>)}
    <h4>Four layers with independent lifetimes</h4>
    <p>Downloading is not demuxing; demuxing is not decoding. A source reads bytes,
      a packet sink extracts compressed media, and a decoder produces raw media.</p>
    <ol className="webcodecs-cache-layers">
      {layers.map(layer => <li key={layer.title}>
        <h5>{layer.title}</h5><p><strong>{layer.owner}</strong> · {layer.data}</p><p>{layer.lifecycle}</p>
      </li>)}
    </ol>
    <ByteCacheWalkthrough />
    <aside className="webcodecs-mp4-boundary" aria-labelledby="mp4-input-heading">
      <h4 id="mp4-input-heading">Complete MP4 versus fragmented MP4 / CMAF</h4>
      <p>A complete MP4 contains the track/sample metadata and payload; finding its <code>moov</code> metadata
        can require a read near the end of the file. BufferSource can expose the complete download,
        while BlobSource, UrlSource, or CustomSource can satisfy random-access reads.</p>
      <p>Fragmented MP4 separates initialization metadata (<code>ftyp</code>/<code>moov</code>, including track IDs
        and codec configuration) from media fragments (<code>moof</code>/<code>mdat</code>, including timing
        and payload). A CMAF media fragment by itself may lack that initialization or prior reference pictures.
        Start from suitable random access points and include dependency preroll when needed.</p>
      <p>A segment cache is commonly keyed by URLs or segment IDs. To expose it through CustomSource,
        define a valid initialized file layout, its size, and how each requested byte offset maps to cached
        data. Arbitrary segment concatenation is not a general solution, and CustomSource supplies no
        MSE-style append protocol or DASH manifest/segment scheduling.</p>
      <p className="webcodecs-sources"><a href="https://mediabunny.dev/guide/input-formats">Mediabunny input formats</a> · {' '}
        <a href="https://www.w3.org/TR/mse-byte-stream-format-isobmff/">W3C initialization/media segment definitions</a>
        {' '}(MSE terminology, not a Mediabunny API).</p>
    </aside>
    <div className="webcodecs-api-example">
      <h4>Illustrative TypeScript boundaries</h4>
      <p>Each panel is an independent module for a consuming project with Mediabunny installed.
        These snippets are not a complete preview engine. Feature/configuration checks and error handling
        remain necessary; sample sinks may use library-supported decoders in addition to browser codecs.</p>
      {mediabunnyExamples.map(example => <details key={example.id} className="webcodecs-api-card webcodecs-mediabunny-example">
        <summary>{example.title}</summary>
        <div className="webcodecs-api-detail"><p>{example.context}</p>
          <pre tabIndex={0} aria-label={`${example.title} TypeScript`}><code>{example.code}</code></pre>
        </div>
      </details>)}
    </div>
    <p className="webcodecs-sources">Guides: {' '}
      <a href="https://mediabunny.dev/guide/reading-media-files">Reading files and sources</a> · {' '}
      <a href="https://mediabunny.dev/guide/media-sinks">Packet and sample sinks</a> · {' '}
      <a href="https://mediabunny.dev/guide/packets-and-samples">Packets, samples, and timing</a> · {' '}
      <a href="https://mediabunny.dev/api/CustomSourceOptions">CustomSource callback contract</a>
    </p>
  </section>
}
