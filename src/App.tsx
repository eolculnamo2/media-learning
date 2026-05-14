import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router'
import './App.css'
import { ForceGraph } from './ForceGraph'
import { edges, nodes, type Node } from './graphData'
import {
  AbrLadderPage,
  BoxTreePage,
  BufferAbrPage,
  ComparisonPage,
  DashFragmentsPage,
  ReadPathPage,
  ResponsibilityPage,
  SampleTablePage,
  TimelinePage,
} from './Visualizations'

const slugFor = (node: Node) => node.id

const exampleValuesById: Record<string, string[]> = {
  'mp4-file': ['majorBrand: isom', 'tracks: video + audio', 'duration: 120_000 ms'],
  'progressive-mp4': ['layout: ftyp + moov + mdat', 'moov position: before mdat for fast start'],
  'fragmented-mp4': ['layout: init.mp4 + seg-1.m4s + seg-2.m4s', 'brands: iso6, dash'],
  'init-segment': ['contains: ftyp, moov', 'no encoded samples in mdat'],
  'media-segment': ['duration: 2s or 6s', 'contains: moof + mdat'],
  'media-fragment': ['one fragment per segment', 'metadata box: moof', 'payload box: mdat'],
  abr: ['variants: 360p/800kbps, 720p/2500kbps', 'switch reason: buffer < 8s'],
  manifest: ['DASH: manifest.mpd', 'HLS: master.m3u8', 'segmentTemplate: chunk-$Number$.m4s'],
  representation: ['id: video_720p', 'bandwidth: 2_500_000', 'codecs: avc1.64001f'],
  ftyp: ['size: 24', 'type: ftyp', 'major_brand: isom', 'compatible_brands: iso6, mp41'],
  moov: ['contains: mvhd, trak', 'timescale: 1000', 'duration: 120000'],
  trak: ['track_ID: 1', 'handler: vide', 'width: 1920', 'height: 1080'],
  mdia: ['contains: mdhd, hdlr, minf', 'mdhd.timescale: 90000'],
  minf: ['video child: vmhd', 'audio child: smhd', 'contains: stbl'],
  stbl: ['children: stsd, stts, stss, stsz, stco', 'sample_count: 3600'],
  stsd: ['entry_count: 1', 'sample entry: avc1', 'avcC: SPS/PPS decoder config'],
  stts: ['sample_count: 300', 'sample_delta: 3000', 'timescale: 90000'],
  stss: ['sync samples: 1, 31, 61, 91', 'GOP: every 30 frames'],
  stsz: ['sample_size: 0 means per-sample table', 'entry_size: 1482 bytes'],
  'stco-co64': ['stco offset: 123456', 'co64 offset: 5_123_456_789 for large files'],
  mdat: ['payload: encoded H.264 NAL units or AAC frames', 'size: can be many MB'],
  moof: ['contains: mfhd, traf', 'sequence_number: 42'],
  mfra: ['optional top-level box, often near file end', 'contains: tfra, mfro', 'maps fragment time → moof byte offset'],
  traf: ['track_ID: 1 via tfhd', 'contains: tfhd, tfdt, trun'],
  tfhd: ['track_ID: 1', 'default_sample_duration: 3000', 'default_sample_size: 1200'],
  tfdt: ['baseMediaDecodeTime: 270000', 'timescale: 90000', 'starts at: 3s'],
  trun: ['sample_count: 60', 'data_offset: 224', 'sample_flags: keyframe/non-keyframe'],
}

const categoryExample = (node: Node) => [
  `category: ${node.category}`,
  `id: ${node.id}`,
  `label: ${node.label}`,
]

function relationshipSentence(node: Node) {
  const related = edges.filter((edge) => edge.source === node.id || edge.target === node.id)

  if (related.length === 0) return ['This concept is currently standalone in the map.']

  return related
    .slice(0, 4)
    .map((edge) => {
      const other = edge.source === node.id ? edge.target : edge.source
      const direction = edge.source === node.id ? '→' : '←'
      return `${direction} ${other}: ${edge.description}`
    })
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="Primary navigation">
        <Link className="brand-link" to="/">
          MP4 Concept Map
        </Link>
        <div className="nav-links">
          <Link to="/">Graph</Link>
          <Link to="/boxes">Box tree</Link>
          <Link to="/timeline">Timeline</Link>
          <Link to="/samples">Samples</Link>
          <Link to="/comparison">Progressive vs fMP4</Link>
          <Link to="/read-path">Read path</Link>
          <Link to="/abr-ladder">ABR ladder</Link>
          <Link to="/buffer-abr">Buffer ABR</Link>
          <Link to="/responsibilities">Box jobs</Link>
          <Link to="/dash-fragments">DASH → fMP4</Link>
        </div>
      </nav>
      {children}
    </main>
  )
}

function GraphPage() {
  const navigate = useNavigate()

  return <ForceGraph nodes={nodes} edges={edges} onNodeSelect={(node) => navigate(`/concept/${slugFor(node)}`)} />
}

function ConceptPage() {
  const { conceptId } = useParams()
  const node = nodes.find((candidate) => candidate.id === conceptId)

  if (!node) return <Navigate to="/" replace />

  const examples = exampleValuesById[node.id] ?? categoryExample(node)
  const relationships = relationshipSentence(node)

  return (
    <article className="concept-page">
      <p className="eyebrow">Concept detail</p>
      <h1>{node.label}</h1>
      <p className="concept-description">{node.description}</p>

      <section className="concept-card">
        <h2>Why it matters</h2>
        <p>{node.whyItMatters}</p>
      </section>

      <section className="concept-grid">
        <div className="concept-card">
          <h2>Example values</h2>
          <ul className="example-list">
            {examples.map((example) => (
              <li key={example}><code>{example}</code></li>
            ))}
          </ul>
        </div>

        <div className="concept-card">
          <h2>Nearby graph relationships</h2>
          <ul>
            {relationships.map((relationship) => (
              <li key={relationship}>{relationship}</li>
            ))}
          </ul>
        </div>
      </section>

      <Link className="back-link" to="/">← Back to graph</Link>
    </article>
  )
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<GraphPage />} />
        <Route path="/concept/:conceptId" element={<ConceptPage />} />
        <Route path="/boxes" element={<BoxTreePage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/samples" element={<SampleTablePage />} />
        <Route path="/comparison" element={<ComparisonPage />} />
        <Route path="/read-path" element={<ReadPathPage />} />
        <Route path="/abr-ladder" element={<AbrLadderPage />} />
        <Route path="/buffer-abr" element={<BufferAbrPage />} />
        <Route path="/responsibilities" element={<ResponsibilityPage />} />
        <Route path="/dash-fragments" element={<DashFragmentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
