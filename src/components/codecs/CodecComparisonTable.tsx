import { useMemo, useState } from 'react'
import { codecs, type Codec } from '../../data/codecs'

type Filter = 'all' | 'universal' | 'appleHdr' | 'bandwidth' | 'editing' | 'legacy' | 'emerging'
const filters: Record<Filter, string> = { all: 'All', universal: 'Best for universal web delivery', appleHdr: 'Best for Apple/HDR delivery', bandwidth: 'Best for bandwidth savings', editing: 'Best for editing/mezzanine', legacy: 'Best for legacy/broadcast', emerging: 'Forward-looking/emerging' }

function matches(c: Codec, filter: Filter) {
  if (filter === 'all') return true
  if (filter === 'universal') return c.id === 'h264'
  if (filter === 'appleHdr') return ['hevc', 'h264'].includes(c.id)
  if (filter === 'bandwidth') return ['av1', 'vp9', 'hevc'].includes(c.id)
  if (filter === 'editing') return ['prores', 'dnx', 'jpeg2000'].includes(c.id)
  if (filter === 'legacy') return ['mpeg2', 'h264'].includes(c.id)
  return c.categories.includes('emerging')
}

export function CodecComparisonTable() {
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<keyof Codec>('name')
  const rows = useMemo(() => codecs.filter((c) => matches(c, filter)).sort((a, b) => String(a[sort]).localeCompare(String(b[sort]))), [filter, sort])
  const header = (key: keyof Codec, label: string) => <th><button type="button" onClick={() => setSort(key)}>{label}</button></th>
  return <div><div className="codec-filter-row">{(Object.keys(filters) as Filter[]).map((f) => <button type="button" key={f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>{filters[f]}</button>)}</div><div className="codec-table-wrap"><table className="codec-table"><thead><tr>{header('name', 'Codec')}{header('era', 'Era')}{header('compressionEfficiency', 'Compression')}{header('encodeComplexity', 'Encode')}{header('decodeComplexity', 'Decode')}{header('hardwareDecode', 'HW decode')}{header('webCompatibility', 'Web')}{header('appleEcosystem', 'Apple')}{header('androidEcosystem', 'Android')}{header('smartTvEcosystem', 'Smart TV')}{header('editingFriendliness', 'Editing')}{header('commonContainers', 'Containers')}<th>Use cases</th><th>Notes</th></tr></thead><tbody>{rows.map((c) => <tr key={c.id}><td><strong>{c.name}</strong></td><td>{c.era}</td><td>{c.compressionEfficiency}</td><td>{c.encodeComplexity}</td><td>{c.decodeComplexity}</td><td>{c.hardwareDecode}</td><td>{c.webCompatibility}</td><td>{c.appleEcosystem}</td><td>{c.androidEcosystem}</td><td>{c.smartTvEcosystem}</td><td>{c.editingFriendliness}</td><td>{c.commonContainers.join(', ')}</td><td>{c.useCases.slice(0, 3).join(', ')}</td><td>{c.notes}</td></tr>)}</tbody></table></div><p className="codec-fineprint">Labels are qualitative: Excellent, Good, Mixed, Limited, Legacy, or Emerging. They are not benchmark measurements.</p></div>
}
