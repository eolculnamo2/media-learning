const decisions = [
  ['Maximum compatibility', 'Use H.264 + AAC in MP4/HLS/DASH. It remains the safest fallback for browsers, phones, TVs, enterprise machines, and embedded players.'],
  ['Apple-first 4K/HDR', 'Consider HEVC/H.265, especially with hvc1 signaling in MP4/fMP4 HLS. Keep fallback renditions for non-Apple or older devices.'],
  ['Bandwidth savings on modern devices', 'Consider AV1, with H.264 fallback and measured device coverage. The encode cost is part of the business decision.'],
  ['YouTube-style web delivery', 'VP9 and AV1 are both relevant. VP9 can cover older web ecosystems while AV1 improves savings on newer devices.'],
  ['Editing/post-production', 'Use ProRes or DNxHD/DNxHR. Avoid treating H.264 long-GOP delivery files as editing masters when quality and timeline performance matter.'],
  ['Digital cinema', 'JPEG 2000 remains relevant for DCP workflows. It solves a different problem than ABR web delivery.'],
  ['Low-latency live', 'Prefer fast encoders, hardware decode coverage, short GOPs, and minimal frame reordering. Codec choice alone does not solve latency.'],
  ['Archival', 'Do not blindly choose the newest delivery codec. Consider mezzanine quality, future decode support, metadata, storage cost, and re-encode plans.']
]

export function CodecDecisionGuide() {
  return <div className="decision-grid">{decisions.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
}
