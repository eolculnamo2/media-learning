import { goToSection } from './sectionNavigation'
import { useState } from 'react'
import { apiCategories, apiEntries } from '../../data/webcodecs'
import type { ApiEntry } from '../../data/webcodecs'

function ReferenceCard({ entry }: { entry: ApiEntry }) {
  return (
    <details className="webcodecs-api-card" id={`api-${entry.id}`}>
      <summary>
        <span className="webcodecs-api-name">{entry.name}</span>
        <span className="webcodecs-api-purpose">{entry.purpose}</span>
      </summary>
      <div className="webcodecs-api-detail">
        <dl className="webcodecs-api-facts">
          <div><dt>Inputs</dt><dd>{entry.inputs}</dd></div>
          <div><dt>Outputs</dt><dd>{entry.outputs}</dd></div>
          <div><dt>Key methods &amp; properties</dt><dd><ul>{entry.members.map(member => <li key={member}><code>{member}</code></li>)}</ul></dd></div>
          <div><dt>Lifecycle &amp; ownership</dt><dd>{entry.lifecycle}</dd></div>
          <div><dt>Common pitfalls</dt><dd>{entry.pitfalls}</dd></div>
        </dl>
        {entry.example && <div className="webcodecs-api-example">
          <h4>Illustrative TypeScript</h4>
          <p>{entry.example.context}</p>
          <pre tabIndex={0} aria-label={`${entry.name} TypeScript example`}><code>{entry.example.code}</code></pre>
        </div>}
        <p className="webcodecs-sources">Documentation: {entry.docs.map((doc, index) => <span key={doc.url}>
          {index > 0 && ' · '}<a href={doc.url}>{doc.label}</a>
        </span>)}</p>
      </div>
    </details>
  )
}

export function ApiIndex() {
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const matches = apiEntries.filter(entry => {
    const searchable = [entry.name, entry.purpose, entry.inputs, entry.outputs,
      ...entry.members, entry.lifecycle, entry.pitfalls].join(' ').toLowerCase()
    return (category === 'all' || entry.category === category) && searchable.includes(normalizedQuery)
  })

  return (
    <div className="webcodecs-api-index">
      <p>Explore browser media APIs by responsibility, from network bytes to audio output and encoding.
        Open an entry for its data boundary, lifecycle, pitfalls, and example.
        The Mediabunny source and demuxing guide follows below.</p>
      <button type="button" className="webcodecs-guide-link" onClick={() => goToSection('mediabunny-guide')}>Go to Mediabunny &amp; byte caches</button>
      <div className="webcodecs-api-toolbar">
        <label htmlFor="webcodecs-api-search">Search API names and explanations</label>
        <input id="webcodecs-api-search" type="search" value={query}
          placeholder="Try timestamp, cancel, or copy" onChange={event => setQuery(event.target.value)} />
        <div className="webcodecs-api-filters" role="group" aria-label="Filter APIs by responsibility">
          <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All APIs ({apiEntries.length})</button>
          {apiCategories.map(item => <button key={item.id} type="button"
            aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>
            {item.title} ({apiEntries.filter(entry => entry.category === item.id).length})
          </button>)}
        </div>
        <p role="status" aria-live="polite" aria-atomic="true">{matches.length} of {apiEntries.length} APIs shown</p>
      </div>
      <p className="codec-viz-note">Examples are contextual reference snippets, not executed by this page.
        Feature-check browser APIs and codec configurations before use. WebCodecs needs a secure context.
        Times are labeled explicitly: codec timestamps use microseconds, Web Audio scheduling uses seconds, and repaint/performance timestamps use milliseconds.</p>
      {apiCategories.map(item => {
        const entries = matches.filter(entry => entry.category === item.id)
        if (!entries.length) return null
        return <section key={item.id} className="webcodecs-api-category" aria-labelledby={`api-category-${item.id}`}>
          <h3 id={`api-category-${item.id}`}>{item.title}</h3>
          <p>{item.description}</p>
          {entries.map(entry => <ReferenceCard key={entry.id} entry={entry} />)}
        </section>
      })}
      {matches.length === 0 && <div className="webcodecs-api-empty">
        <p>No matching APIs. Try another term or clear the filters.</p>
        <button type="button" onClick={() => { setQuery(''); setCategory('all') }}>Clear search and filters</button>
      </div>}
    </div>
  )
}
