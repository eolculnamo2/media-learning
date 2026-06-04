import { useState } from 'react'
import { codecStringExplanations } from '../../data/codecs'

export function CodecStringExplorer() {
  const keys = Object.keys(codecStringExplanations)
  const [value, setValue] = useState(keys[0])
  return <div className="codec-string-explorer"><label>Sample codec string<select value={value} onChange={(e) => setValue(e.target.value)}>{keys.map((k) => <option key={k} value={k}>{k}</option>)}</select></label><div><code>{value}</code><p>{codecStringExplanations[value]}</p></div></div>
}
