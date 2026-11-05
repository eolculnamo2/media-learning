import { useState } from 'react'
import { BinaryExplorer, ComparisonAndGlossary, FamilyOverview, FrameWalkthrough, HierarchyExplorer, Sources } from '../components/containers/ContainerExplorer'
import { formats, type FormatId } from '../data/containers'
import './ContainersPage.css'

export function ContainersPage() {
  const [format, setFormat] = useState<FormatId>('mp4')
  const [selected, setSelected] = useState('root')
  const navigate = (nextFormat: FormatId, element: string) => { setFormat(nextFormat); setSelected(element) }
  return <article className="cx-page"><header className="cx-hero"><p className="eyebrow">Media engineering reference / container internals</p><h1>Inside the media container</h1><p>Trace the boxes and elements that turn encoded bytes into tracks, timestamps, and playable frames. Explore a structure, inspect its binary layout, then follow a player's read path.</p><div className="cx-hero-tags"><span>5 formats</span><span>2 format families</span><span>Byte-level examples</span></div></header><nav className="cx-local-nav" aria-label="Sections">{[['overview', 'Families'], ['hierarchy', 'Hierarchy'], ['binary', 'Bytes'], ['walkthrough', 'Find a frame'], ['compare', 'Compare'], ['glossary', 'Glossary']].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav><FamilyOverview /><HierarchyExplorer key={format} format={format} onFormatChange={setFormat} selected={selected} onSelect={setSelected} /><p className="cx-between-note">Currently exploring <strong>{formats[format].label}</strong>. The hierarchy is a representative map: exact box/element presence depends on brand, profile, track type, and authoring choices.</p><FragmentVocabulary /><BinaryExplorer /><FrameWalkthrough /><ComparisonAndGlossary onNavigate={navigate} /><Sources /></article>
}

function FragmentVocabulary() {
  const terms = [
    ['Initialization segment', 'For the W3C MSE ISO BMFF byte stream: ftyp followed by moov, with mvex and empty sample tables. This is an API-specific rule, not a generic rule for all MP4 files.'],
    ['MSE media segment', 'Optional styp, exactly one moof, and one or more mdat boxes. Other allowed top-level boxes can appear between segments.'],
    ['Movie fragment', 'The moof box describes track runs; associated mdat bytes carry their encoded samples. tfdt anchors decode time when present or required by the target profile.'],
    ['CMAF fragment', 'An ISO BMFF media segment conforming to CMAF constraints. It belongs to a CMAF track and has a defined decode-time interval.'],
    ['CMAF chunk', 'A consecutive subset of the samples in a CMAF fragment. Only its first chunk is constrained to be an adaptive switching point.'],
    ['CMAF / delivery segment', 'A CMAF segment packages one or more consecutive CMAF fragments from one track. DASH or HLS delivery boundaries are a packaging choice and should not be confused with a moof boundary.'],
  ]
  return <section className="cx-card cx-vocabulary"><div className="cx-heading"><span>PROFILE NOTE / FRAGMENTED MP4</span><h2>Which “segment” do you mean?</h2><p>These terms refer to different levels of the byte stream and delivery model. Profile requirements matter when writing a parser or MSE pipeline.</p></div><div>{terms.map(([title, description]) => <article key={title}><h3>{title}</h3><p>{description}</p></article>)}</div></section>
}
