import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  declaration, defaultStructure, definitions, description, doxygen, flatten, qualified,
  release, search, source, tree, type Node,
} from '../data/ffmpeg-internals/model'
import { CCode, FrameRateComparison, RotationExample, StreamOverview, TimeBaseExplorer } from './FFmpegStreamExamples'
import './FFmpegStructureExplorer.css'

const mainTree = tree(defaultStructure)
const mainNodes = flatten(mainTree)
const featured = ['AVStream', 'AVCodecParameters', 'AVPacket', 'AVRational', 'AVChannelLayout']
const documentationNames: Record<string, string> = {
  'AVChannelLayout.u': 'AVChannelLayout',
  'AVOption.default_val': 'AVOption',
}

function query(path: string) {
  return `?structure=${encodeURIComponent(path)}`
}

function expandState(node: Node, value: boolean, state: Record<string, boolean>) {
  const next = { ...state }
  for (const item of flatten(node)) {
    if (item.children.length) next[item.path] = value
  }
  return next
}

type OutlineProps = {
  node: Node
  active: string
  isOpen: (node: Node) => boolean
  toggle: (node: Node) => void
  choose: (path: string) => void
}

function Outline({ node, active, isOpen, toggle, choose }: OutlineProps) {
  const open = isOpen(node)
  return <li>
    <div className={`ffx-row${active === node.path ? ' active' : ''}`} data-path={node.path}>
      {node.children.length > 0
        ? <button type="button" className="ffx-disclosure" aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${qualified(node.path)}`} onClick={() => toggle(node)}>›</button>
        : <span className="ffx-leaf" aria-hidden="true">{node.cycle ? '↩' : '·'}</span>}
      <button type="button" className="ffx-node" onClick={() => choose(node.path)} aria-current={active === node.path ? 'location' : undefined}>
        <code>{node.name}</code>
        {node.field && <small className={`ffx-${node.kind}`} title={`${node.kind} · ${node.field.cType}`}>
          {node.kind === 'pointer' || node.kind === 'array' && node.field.cType.includes('*') ? '↗ ' : ''}
          {node.field.cType}
        </small>}
      </button>
    </div>
    {open && node.children.length > 0 && <ul>
      {node.children.map(child => <Outline key={child.path} node={child} active={active} isOpen={isOpen} toggle={toggle} choose={choose} />)}
    </ul>}
  </li>
}

function Details({ node, choose }: { node: Node; choose: (path: string) => void }) {
  const owner = node.parentType ?? node.type ?? node.name
  const definition = definitions[owner]
  const target = node.type ? definitions[node.type] : undefined
  const docType = documentationNames[owner] ?? owner
  const structDoc = definitions[docType].kind === 'struct' && !docType.includes('.')
  const text = description(node)
  const shared = node.field && node.type && !node.cycle ? [node.type] : []
  const related = [...new Set([...shared, ...node.explanation?.related ?? [],
    ...(node.type === 'AVDictionary' ? ['AVDictionaryEntry'] : [])])]
  const cycle = node.cycle
  const exampleKey = `${node.parentType}.${node.name}`

  return <article className="ffx-details" id="ffx-details" tabIndex={-1} aria-label="Selected field documentation">
    <nav className="ffx-crumbs" aria-label="Field breadcrumb">
      {node.path.split('/').map((part, index, parts) => <span key={index}>
        {index > 0 && <span aria-hidden="true"> / </span>}
        {index === parts.length - 1 ? <strong>{part}</strong> :
          <Link to={query(parts.slice(0, index + 1).join('/'))} onClick={event => {
            if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
              event.preventDefault()
              choose(parts.slice(0, index + 1).join('/'))
            }
          }}>{part}</Link>}
      </span>)}
    </nav>
    <div className="ffx-detail-title"><h3>{node.name}</h3><span className={`ffx-badge ffx-${node.kind}`}>{node.kind}</span></div>
    <CCode code={declaration(node)} />
    {node.field && <dl className="ffx-identity">
      <dt>Path</dt><dd><code>{qualified(node.path)}</code></dd>
      <dt>Parent</dt><dd><code>{owner}</code></dd>
      <dt>C type</dt><dd><code>{node.field.cType}</code></dd>
    </dl>}
    {text && <p className="ffx-meaning">{text}</p>}
    {node.explanation?.use && <><h4>Working with this field</h4><p>{node.explanation.use}</p></>}
    {node.explanation?.example && <CCode code={node.explanation.example} />}
    {cycle && <p className="ffx-boundary">This reference leads to a type already in the current path. <button type="button" onClick={() => choose(cycle)}>Return to {qualified(cycle)}</button>.</p>}
    {target && node.field && !node.cycle && description({ ...node, explanation: undefined }) &&
      <div className="ffx-boundary"><strong>{node.type}</strong><p>{description({ ...node, explanation: undefined })}</p></div>}
    {node.kind === 'callback' && <p className="ffx-boundary">The field holds executable code. Public data types in its signature are available as related definitions.</p>}
    {node.kind === 'opaque' && !target && <p className="ffx-boundary">Public field-level exploration ends at this pointer.</p>}
    {node.children.length > 0 && (target?.constants || definition.constants) && <p className="ffx-boundary">
      Expand this branch to browse {node.children.length} declared constants and aliases. Constants without an explicit initializer use the next enum value.
    </p>}
    {related.length > 0 && <div className="ff-related" aria-label="Related definitions">
      {related.map(type => <button type="button" key={type} onClick={() => choose(type)}>{type} definition →</button>)}
    </div>}
    <div className="ffx-sources">
      <a href={source(definition, node.field?.line)} target="_blank" rel="noreferrer">Release header ↗</a>
      {structDoc && <a href={`${doxygen}struct${docType}.html`} target="_blank" rel="noreferrer">API documentation ↗</a>}
    </div>
    {node.path === 'AVStream' && <div className="ffx-teaching"><StreamOverview choose={choose} /></div>}
    {exampleKey === 'AVStream.time_base' && <div className="ffx-teaching"><TimeBaseExplorer /></div>}
    {['AVStream.avg_frame_rate', 'AVStream.r_frame_rate'].includes(exampleKey) &&
      <div className="ffx-teaching"><FrameRateComparison /></div>}
    {exampleKey === 'AVCodecParameters.coded_side_data' && <div className="ffx-teaching"><RotationExample /></div>}
    <button className="ffx-control ffx-return" type="button" onClick={() => {
      const navigation = document.getElementById('ffx-navigation')
      navigation?.focus({ preventScroll: true })
      navigation?.scrollIntoView({ block: 'start' })
    }}>Back to structure navigation ↑</button>
  </article>
}

export function FFmpegStructureExplorer({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const first = path.split('/')[0]
  const root = Object.hasOwn(definitions, first) ? first : defaultStructure
  const rootNode = useMemo(() => root === defaultStructure ? mainTree : tree(root), [root])
  const nodes = useMemo(() => root === defaultStructure ? mainNodes : flatten(rootNode), [root, rootNode])
  const active = nodes.find(node => node.path === path) ?? rootNode
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState('')
  const [resultLimit, setResultLimit] = useState(8)
  const outlineRef = useRef<HTMLDivElement>(null)
  const results = useMemo(() => search(root === defaultStructure ? nodes : [...nodes, ...mainNodes], filter), [nodes, root, filter])

  useEffect(() => {
    const container = outlineRef.current
    const current = container?.querySelector('.ffx-row.active')
    if (!container || !current) return
    const bounds = container.getBoundingClientRect()
    const selected = current.getBoundingClientRect()
    if (selected.top < bounds.top || selected.bottom > bounds.bottom) {
      container.scrollTop += selected.top - bounds.top - bounds.height / 3
    }
  }, [active.path])

  function isOpen(node: Node) {
    return open[node.path] ?? (node === rootNode || active.path.startsWith(`${node.path}/`))
  }

  function choose(nextPath: string, revealDetails = true) {
    setOpen(current => {
      const next = { ...current, [nextPath.split('/')[0]]: true }
      const parts = nextPath.split('/')
      for (let index = 1; index < parts.length; index++) next[parts.slice(0, index).join('/')] = true
      return next
    })
    navigate(nextPath)
    if (revealDetails && window.matchMedia('(max-width: 780px)').matches) {
      requestAnimationFrame(() => {
        const detail = document.getElementById('ffx-details')
        detail?.focus({ preventScroll: true })
        detail?.scrollIntoView({ block: 'start' })
      })
    }
  }

  return <section className="ff-section ffx-section" aria-labelledby="ffx-heading">
    <header className="ffx-heading">
      <div>
        <span className="ffx-version">FFmpeg {release} · Public C API</span>
        <h2 id="ffx-heading">Data Structures</h2>
        <p>Follow <code>AVStream</code> from its container into codec parameters, timestamps, metadata, and packet storage.</p>
      </div>
      <label>Browse a type
        <select value={root} onChange={event => choose(event.target.value, false)}>
          {featured.map(type => <option key={type}>{type}</option>)}
          <optgroup label="Related types">
            {Object.keys(definitions).filter(type => !featured.includes(type)).sort().map(type => <option key={type}>{type}</option>)}
          </optgroup>
        </select>
      </label>
    </header>
    <div className="ffx-workspace">
      <aside className="ffx-navigation" id="ffx-navigation" tabIndex={-1} aria-label="Structure navigation">
        <label className="ffx-search">Search fields and concepts
          <input type="search" value={filter} placeholder="timestamp, bitrate, rotation…"
            onChange={event => { setFilter(event.target.value); setResultLimit(8) }}
            onKeyDown={event => { if (event.key === 'Enter' && results[0]) choose(results[0].path) }} />
        </label>
        {filter.trim() && <div className="ffx-results">
          <div role="status">{results.length ? `${results.length} matches` : 'No matching fields or constants'}</div>
          <ul>{results.slice(0, resultLimit).map(result => <li key={result.path}>
            <button type="button" aria-current={active.path === result.path ? 'location' : undefined}
              onClick={() => choose(result.path)} title={qualified(result.path)}>
              <code>{result.name}</code><small>{qualified(result.path)}</small>
            </button>
          </li>)}</ul>
          {results.length > resultLimit && <button className="ffx-control" type="button" onClick={() => setResultLimit(resultLimit + 8)}>Show more matches</button>}
        </div>}
        <div className="ffx-actions">
          <div><strong>Structure tree</strong><small>↗ Pointer or pointed-to array</small></div>
          <div>
            <button className="ffx-control" type="button" onClick={() => setOpen(current => expandState(rootNode, true, current))}>Expand all</button>
            <button className="ffx-control" type="button" onClick={() => setOpen(current => ({ ...expandState(rootNode, false, current), [rootNode.path]: true }))}>Collapse all</button>
          </div>
        </div>
        <div className="ffx-outline" ref={outlineRef}>
          <ul><Outline node={rootNode} active={active.path} isOpen={isOpen}
            toggle={node => setOpen(current => ({ ...current, [node.path]: !isOpen(node) }))} choose={choose} /></ul>
        </div>
        <div className="ffx-subtree">
          {active.children.length > 0 && active !== rootNode && <>
            <button className="ffx-control" type="button" onClick={() => setOpen(current => expandState(active, true, current))}>Expand selected subtree</button>
            <button className="ffx-control" type="button" onClick={() => setOpen(current => expandState(active, false, current))}>Collapse selected subtree</button>
          </>}
        </div>
      </aside>
      <Details node={active} choose={choose} />
    </div>
  </section>
}
