import { MediabunnyGuide } from '../components/webcodecs/MediabunnyGuide'
import { goToSection } from '../components/webcodecs/sectionNavigation'
import { Capabilities } from '../components/webcodecs/Capabilities'
import { VideoPipelineDemo } from '../components/webcodecs/VideoPipelineDemo'
import { AudioPipelineDemo } from '../components/webcodecs/AudioPipelineDemo'
import { ThreeBufferModelDemo } from '../components/webcodecs/ThreeBufferModelDemo'
import { AvSyncDemo } from '../components/webcodecs/AvSyncDemo'
import { ClipTransitionDemo } from '../components/webcodecs/ClipTransitionDemo'
import { PreviewArchitecture } from '../components/webcodecs/PreviewArchitecture'
import { ApiIndex } from '../components/webcodecs/ApiIndex'

const sections = [
  { id: 'capabilities', label: 'A — Capabilities' },
  { id: 'api-index', label: 'B — API Index' },
  { id: 'mediabunny-guide', label: 'Mediabunny & byte caches' },
  { id: 'api-pipelines', label: 'C — How the APIs Work Together' },
  { id: 'architecture', label: 'D — Architectural Boundaries' },
] as const

export function WebCodecsPage() {
  return (
    <article className="codecs-page webcodecs-page">
      <header className="codecs-hero">
        <p className="eyebrow">Browser media engineering</p>
        <h1>WebCodecs &amp; Browser Media APIs</h1>
        <p>Build a media engine from frames, samples, and clocks. WebCodecs handles
          encoding and decoding; Canvas, Web Audio, libraries, and your application
          turn those building blocks into a playback or editing experience.</p>
      </header>

      <nav className="webcodecs-section-nav" aria-label="WebCodecs page sections">
        {sections.map(({ id, label }) => (
          <button key={id} type="button" onClick={() => goToSection(id)} aria-controls={id}>
            {label}
          </button>
        ))}
      </nav>

      <section id="capabilities" className="codec-section" aria-labelledby="capabilities-heading">
        <h2 id="capabilities-heading" tabIndex={-1}>A — Capabilities</h2>
        <p>Work directly with media data and choose how it is prepared, presented,
          and combined. The cards below show capabilities of the combined stack;
          scheduling, buffering, and composition are application logic.</p>
        <Capabilities />
      </section>

      <section id="api-index" className="codec-section" aria-labelledby="api-index-heading">
        <h2 id="api-index-heading" tabIndex={-1}>B — API Index</h2>
        <ApiIndex />
        <MediabunnyGuide />
      </section>

      <section id="api-pipelines" className="codec-section" aria-labelledby="api-pipelines-heading">
        <h2 id="api-pipelines-heading" tabIndex={-1}>C — How the APIs Work Together</h2>
        <VideoPipelineDemo />
        <AudioPipelineDemo />
        <ThreeBufferModelDemo />
        <AvSyncDemo />
        <ClipTransitionDemo />
      </section>

      <section id="architecture" className="codec-section" aria-labelledby="architecture-heading">
        <h2 id="architecture-heading" tabIndex={-1}>D — Architectural Boundaries</h2>
        <PreviewArchitecture />
      </section>
    </article>
  )
}
