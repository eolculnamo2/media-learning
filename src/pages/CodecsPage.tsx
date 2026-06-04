import { codecs } from '../data/codecs'
import { BitrateLadderComparison } from '../components/codecs/BitrateLadderComparison'
import { CodecCard } from '../components/codecs/CodecCard'
import { CodecComparisonTable } from '../components/codecs/CodecComparisonTable'
import { CodecDecisionGuide } from '../components/codecs/CodecDecisionGuide'
import { CodecPipelineDiagram } from '../components/codecs/CodecPipelineDiagram'
import { CodecStringExplorer } from '../components/codecs/CodecStringExplorer'
import { CodecTradeoffRadar } from '../components/codecs/CodecTradeoffRadar'
import { GopTimeline } from '../components/codecs/GopTimeline'
import { MotionPredictionDemo } from '../components/codecs/MotionPredictionDemo'

const compressionIdeas = [
  ['Spatial compression', 'Within one frame, codecs split pictures into blocks, macroblocks, or coding tree units. They predict pixels from neighboring pixels, transform the residual into frequency-like coefficients, quantize those coefficients, then entropy-code the symbols. Flat areas are cheap; detailed texture is expensive.'],
  ['Temporal compression', 'Across frames, I-frames stand alone, P-frames predict from past references, and B-frames can predict from past and future references. Motion estimation searches for similar blocks, stores motion vectors, and encodes only what prediction missed. GOP structure controls the spacing of access points.'],
  ['Perceptual compression', 'The eye is usually more sensitive to luma detail than chroma detail, which is why 4:2:0 is common for delivery while 4:2:2 and 4:4:4 matter in production. Quantization trades precision for fewer bits. Grain, noise, smoke, water, leaves, confetti, flashing lights, and dark footage can defeat prediction.'],
  ['Entropy coding', 'After prediction and transform steps, codecs still need compact symbol coding. CABAC, CAVLC, arithmetic coding, and related tools matter because residual data, flags, and motion syntax still contain statistical structure.']
]

const glossary = [
  ['Codec', 'Specification/algorithm for compressing and decompressing media.'], ['Encoder', 'Software or hardware that turns raw frames into a compressed bitstream.'], ['Decoder', 'Software or hardware that reconstructs frames from a compressed bitstream.'], ['Bitstream', 'Encoded codec syntax, separate from the container that stores it.'], ['Container', 'File/segment format such as MP4, WebM, MOV, TS, or MKV that packages streams and timing.'], ['GOP', 'Group of pictures, usually from one keyframe to the next.'], ['I-frame', 'Intra-coded frame that can be decoded without other pictures.'], ['P-frame', 'Predicted frame that references earlier frames.'], ['B-frame', 'Bi-predicted frame that may reference past and future frames.'], ['Keyframe', 'Random-access frame, usually an I-frame in delivery contexts.'], ['Motion vector', 'Direction and distance from a reference block to the predicted block.'], ['Residual', 'Difference left after prediction.'], ['Transform', 'Converts residual samples into coefficients that are easier to quantize and code.'], ['Quantization', 'Reduces precision to save bits.'], ['Entropy coding', 'Statistical coding of syntax and residual symbols.'], ['Chroma subsampling', 'Lower chroma resolution such as 4:2:0 to exploit human vision.'], ['Bit depth', 'Number of bits per component, such as 8-bit or 10-bit.'], ['Profile', 'Subset of codec tools/features.'], ['Level', 'Constraint set for resolution, bitrate, frame rate, and decoder resources.'], ['Tier', 'Additional level class used by codecs such as HEVC/AV1.'], ['Hardware decode', 'Dedicated silicon decode path, usually better for battery and thermals.'], ['Software decode', 'CPU/GPU general-purpose decode path.'], ['Mezzanine', 'High-quality intermediate/master used before delivery encodes.'], ['Delivery encode', 'Final distribution encode optimized for playback and bandwidth.'], ['Transcode', 'Decode and re-encode into another codec/settings.'], ['ABR ladder', 'Set of renditions at different resolutions/bitrates for adaptive streaming.'], ['Per-title encoding', 'Content-aware ladder generation per asset.'], ['CBR', 'Constant bitrate rate control.'], ['VBR', 'Variable bitrate rate control.'], ['CRF', 'Quality-targeted rate control used by encoders such as x264/x265.'], ['HDR', 'High dynamic range video.'], ['SDR', 'Standard dynamic range video.'], ['Alpha channel', 'Transparency channel, common in some production codecs.']
]

const mseSupportSnippet = `const candidates = [
  'video/mp4; codecs="avc1.640028"',
  'video/mp4; codecs="hvc1.1.6.L93.B0"',
  'video/webm; codecs="vp09.00.10.08"',
  'video/mp4; codecs="av01.0.05M.08"',
];

for (const type of candidates) {
  console.log(type, MediaSource.isTypeSupported(type));
}`

export function CodecsPage() {
  return <article className="codecs-page"><header className="codecs-hero"><p className="eyebrow">Media engineering reference</p><h1>Video Codecs: A Practical Guide for Media Engineers</h1><p>A codec choice is a delivery strategy choice. It changes compatibility, bitrate ladders, encode cost, decode cost, latency, licensing, HDR support, battery life, and failure modes.</p></header>

    <section className="codec-section codec-two-col"><div><h2>Overview: where codecs fit</h2><p>A video codec is an algorithm/specification for compressing and decompressing video. Encoding turns raw frames into a compressed bitstream. Decoding turns the bitstream back into frames.</p><p>A container such as MP4, WebM, MOV, TS, or MKV packages encoded video, audio, subtitles, metadata, timing, and indexes. Streaming protocols like HLS and DASH deliver segments/manifests; they are not codecs. MSE receives container segments and feeds them to browser demuxers and decoders.</p><div className="codec-callout">Raw video is huge. Codecs reduce size by exploiting spatial, temporal, perceptual, and statistical redundancy. In production, the best codec is usually the one that fits target devices, quality goals, latency requirements, encoding budget, and distribution constraints.</div></div><CodecPipelineDiagram /></section>

    <section className="codec-section"><h2>Core compression ideas</h2><div className="idea-grid">{compressionIdeas.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="codec-section"><h2>D3 interactive: frame type timeline</h2><GopTimeline /></section>
    <section className="codec-section"><h2>D3 interactive: compression tradeoff radar</h2><p className="codec-fineprint">These scores are conceptual. They define an educational model for comparing tradeoffs, not formal benchmark results.</p><CodecTradeoffRadar /></section>

    <section className="codec-section"><h2>Codec reference cards</h2><div className="codec-card-list">{codecs.map((codec) => <CodecCard key={codec.id} codec={codec} />)}</div></section>

    <section className="codec-section"><h2>Codec comparison table</h2><CodecComparisonTable /></section>
    <section className="codec-section"><h2>D3 interactive: bitrate ladder impact</h2><p>Approximate ladders below are illustrative, not production recommendations.</p><BitrateLadderComparison /></section>
    <section className="codec-section"><h2>D3 interactive: block prediction demo</h2><MotionPredictionDemo /></section>

    <section className="codec-section codec-two-col"><div><h2>Browser/MSE practicality</h2><p>For browser-based media engineering, check <code>MediaSource.isTypeSupported()</code>, but remember that container support and codec support are separate. The same codec may work in one container and fail in another.</p><p>Hardware decode support affects battery, dropped frames, thermals, startup, and reliability. Safari/iOS compatibility often changes practical decisions. H.264 in MP4 is still the safest fallback. HEVC is important for Apple/HDR workflows. VP9 and AV1 are important for bandwidth-efficient delivery, but device coverage must be measured. Large platforms commonly ship multi-codec ladders.</p><div className="codec-warning">MediaSource.isTypeSupported() is necessary but not always sufficient. Real playback can still fail due to profile, level, DRM, hardware support, malformed segments, missing initialization data, or platform-specific bugs.</div></div><pre>{mseSupportSnippet}</pre></section>

    <section className="codec-section codec-two-col"><div><h2>Codec strings deep dive</h2><p>Codec strings are used in manifests, source buffers, MIME types, and capability checks. They communicate codec family plus details such as profile, level, tier, bit depth, chroma format, and constraints.</p><p>They are easy to get wrong. A browser may reject a SourceBuffer if the MIME type or codec string is wrong. DASH/HLS packaging must align with the actual encoded bitstream.</p></div><CodecStringExplorer /></section>

    <section className="codec-section"><h2>Which codec should I use?</h2><CodecDecisionGuide /></section>

    <section className="codec-section"><h2>Common misconceptions</h2><div className="misconception-grid">{[['MP4 is a codec.', 'No. MP4 is a container.'], ['HLS means H.264.', 'No. HLS can carry multiple codecs depending on platform support.'], ['AV1 is always better.', 'Not always. Encoding cost, playback support, battery, and workflow constraints matter.'], ['Higher bitrate always means better quality.', 'Not across codecs or content. Codec, encoder, settings, source quality, and complexity matter.'], ['Hardware support means every stream works.', 'No. Profile, level, bit depth, HDR metadata, container, DRM, and platform bugs still matter.'], ['Editing codecs and streaming codecs solve the same problem.', 'No. Editing codecs prioritize quality and timeline performance; streaming codecs prioritize delivery efficiency.']].map(([bad, fix]) => <article key={bad}><h3>“{bad}”</h3><p>{fix}</p></article>)}</div></section>

    <section className="codec-section"><h2>Glossary</h2><dl className="glossary-grid">{glossary.map(([term, def]) => <div key={term}><dt>{term}</dt><dd>{def}</dd></div>)}</dl></section>

    <section className="codec-section"><h2>About these comparisons</h2><p>Codec performance depends heavily on encoder implementation, preset/speed setting, rate control mode, source quality, resolution, frame rate, grain/noise, motion, HDR/SDR, bit depth, chroma format, decode hardware, and player/platform support. Therefore, this page’s charts are educational approximations, not formal benchmark claims. For production, measure on your actual target devices.</p></section>
  </article>
}
