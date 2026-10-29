import { useCallback, useState } from 'react'
import { architectureNodes as nodes, architectureEdges as edges, architectureOwners as owners } from '../../data/previewArchitecture'
import type { ArchitectureOwner } from '../../data/previewArchitecture'
import { ArchitectureDiagram } from './ArchitectureDiagram'
import { goToSection } from './sectionNavigation'

export function PreviewArchitecture() {
  const [owner, setOwner] = useState<ArchitectureOwner | 'all'>('all')
  const [selected, setSelected] = useState('demux')
  const select = useCallback((id: string) => setSelected(id), [])
  const node = nodes.find(item => item.id === selected)!
  const connected = edges.filter(edge => edge.from === selected || edge.to === selected)
  return <div className="webcodecs-architecture">
    <p>A custom video editing preview engine: three collaborating owners. These are recommended boundaries for an app that controls
      its own decoding and playback. Library capabilities are configurable; Mediabunny can also decode samples and provide higher-level sinks.</p>
    <div className="webcodecs-pipeline-controls" role="group" aria-label="Highlight architecture ownership">
      <button type="button" aria-pressed={owner === 'all'} onClick={() => setOwner('all')}>All owners</button>
      {owners.map(item => <button key={item.id} type="button" aria-pressed={owner === item.id} onClick={() => setOwner(current => current === item.id ? 'all' : item.id)}>{item.label}</button>)}
    </div>
    <p className="codec-viz-note">Highlight: {owner === 'all' ? 'all owners' : owners.find(item => item.id === owner)!.label}.
      Highlighting retains all nodes and connections so boundaries remain visible.</p>
    <ArchitectureDiagram owner={owner} selected={selected} onSelect={select} />
    <div className="webcodecs-architecture-owners">
      {owners.map(item => <div key={item.id} className="webcodecs-architecture-owner">
        <h3>{item.label}</h3>
        <div className="webcodecs-pipeline-controls" role="group" aria-label={`Inspect ${item.label} responsibilities`}>
          {nodes.filter(n => n.owner === item.id).map(n => <button key={n.id} type="button" aria-pressed={n.id === selected} aria-controls="preview-node-detail" onClick={() => select(n.id)}>{n.label}</button>)}
        </div>
      </div>)}
    </div>
    <div id="preview-node-detail" className="webcodecs-pipeline-event" role="status" aria-live="polite">
      <h3>{node.label} · {owners.find(item => item.id === node.owner)!.label}</h3>
      <p>{node.detail}</p>
      <p><strong>Responsibilities:</strong> {node.responsibilities.join(' · ')}.</p>
      <ul>{connected.map(edge => <li key={`${edge.from}-${edge.to}`}><strong>{edge.kind === 'data' ? 'Data' : 'Control'}:</strong> {nodes.find(n => n.id === edge.from)!.label} → {nodes.find(n => n.id === edge.to)!.label}: {edge.label}</li>)}</ul>
      <button type="button" className="webcodecs-guide-link" onClick={() => goToSection(node.reference)}>Explore related reference / demo</button>
    </div>
    <details className="webcodecs-pipeline-inspector"><summary>Complete ownership checklist &amp; alternative boundaries</summary>
      {owners.map(item => <div key={item.id}><h4>{item.label}</h4><ul>{nodes.filter(n => n.owner === item.id).map(n => <li key={n.id}><strong>{n.responsibilities.join(' · ')}:</strong> {n.detail}</li>)}</ul></div>)}
      <p>This design chooses app-managed byte caching, packet queues and decoders. Mediabunny UrlSource can own fetching/range requests,
        while VideoSampleSink/AudioSampleSink can replace explicit decoding. A source is still separate from a retained byte cache.
        Optional sink arrows represent an alternative route, not a second decode pass. Higher-level library conveniences can shift orchestration;
        they do not impose the specific composition, budget or clock policy used here.</p>
      <p>The browser executes fetch and manages transport; the app’s network scheduler selects requests, cancellation and caching policy.
        Similarly, Worker execution belongs to the browser while worker placement, messages and transfer ownership belong to the app.
        Seek/transition cleanup spans every queue and outstanding operation, not only the decoder.</p>
    </details>
    <p className="codec-viz-note">Sources: <a href="https://mediabunny.dev/guide/reading-media-files">Mediabunny input and sources</a>,
      {' '}<a href="https://mediabunny.dev/guide/media-sinks">optional decoding sinks</a>,
      {' '}<a href="https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API">WebCodecs</a>,
      {' '}<a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API">Web Audio</a>.</p>
  </div>
}
