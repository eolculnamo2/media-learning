import type { Codec } from '../../data/codecs'

function List({ title, items }: { title: string; items: string[] }) {
  return <div><h4>{title}</h4><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>
}

export function CodecCard({ codec }: { codec: Codec }) {
  return <article className="codec-card" id={codec.id}><div className="codec-card-head"><div><h3>{codec.name}</h3><p>{codec.fullName}</p></div><span>{codec.introduced}</span></div><div className="codec-tag-row">{codec.commonContainers.map((x) => <code key={x}>{x}</code>)}</div>{codec.commonCodecStrings ? <div className="codec-string-row">{codec.commonCodecStrings.map((x) => <code key={x}>{x}</code>)}</div> : null}<div className="codec-card-grid"><List title="Strengths" items={codec.strengths} /><List title="Weaknesses" items={codec.weaknesses} /><List title="Use cases" items={codec.useCases} /></div><dl className="codec-facts"><div><dt>Support</dt><dd>{codec.supportNotes}</dd></div><div><dt>Licensing</dt><dd>{codec.licensingNotes}</dd></div><div><dt>Workflow</dt><dd>{codec.workflowNotes}</dd></div><div><dt>Complexity</dt><dd>Encode: {codec.encodeComplexity}. Decode: {codec.decodeComplexity}. Compatibility: {codec.compatibility}.</dd></div></dl></article>
}
