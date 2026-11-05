export type FormatId = 'mp4' | 'fmp4' | 'mov' | 'mkv' | 'webm'
export type Category = 'metadata' | 'track' | 'timing' | 'index' | 'media'
export type Presence = 'required' | 'optional' | 'conditional'
export type Family = 'iso' | 'ebml'

export interface Field { name: string; type: string; meaning: string }
export interface ElementDef {
  id: string
  name: string
  code: string
  category: Category
  kind: 'container' | 'leaf'
  presence: Presence
  purpose: string
  layout: string
  fields: Field[]
  practical: string
  variants?: string
  spec: string
  children?: ElementDef[]
}
export interface FormatDef { id: FormatId; label: string; family: Family; subtitle: string; root: ElementDef }

export const specs = {
  iso: 'https://www.iso.org/obp/ui?_escaped_fragment_=iso%3Astd%3Aiso-iec%3A14496%3A-12%3Aed-8%3Av1%3Aen',
  cmaf: 'https://www.iso.org/standard/85623.html',
  apple: 'https://developer.apple.com/documentation/quicktime-file-format/atoms',
  matroska: 'https://www.rfc-editor.org/rfc/rfc9559.html',
  ebml: 'https://www.rfc-editor.org/rfc/rfc8794.html',
  webm: 'https://www.webmproject.org/docs/container/',
  mse: 'https://www.w3.org/TR/mse-byte-stream-format-isobmff/',
} as const

type Options = Partial<Pick<ElementDef, 'fields' | 'practical' | 'variants' | 'spec' | 'layout'>>
const field = (name: string, type: string, meaning: string): Field => ({ name, type, meaning })
const iso = (id: string, name: string, category: Category, purpose: string, presence: Presence = 'optional', children?: ElementDef[], options: Options = {}): ElementDef => ({
  id, name, code: id, category, kind: children ? 'container' : 'leaf', presence, purpose,
  layout: options.layout ?? (children ? 'size:u32 + type:FourCC + nested boxes' : 'size:u32 + type:FourCC + box-specific payload'),
  fields: options.fields ?? [], practical: options.practical ?? `Inspect ${id} when validating ${purpose.toLowerCase()}`,
  spec: options.spec ?? specs.iso, children, variants: options.variants,
})
const ebml = (id: string, code: string, name: string, category: Category, purpose: string, presence: Presence = 'optional', children?: ElementDef[], options: Options = {}): ElementDef => ({
  id, code, name, category, kind: children ? 'container' : 'leaf', presence, purpose,
  layout: options.layout ?? (children ? 'Element ID VINT + size VINT + child elements' : 'Element ID VINT + size VINT + typed payload'),
  fields: options.fields ?? [], practical: options.practical ?? `Inspect ${name} when validating ${purpose.toLowerCase()}`,
  spec: options.spec ?? specs.matroska, children, variants: options.variants,
})

const sampleTable = () => iso('stbl', 'Sample table', 'index', 'Maps sample numbers to timing, chunks, byte ranges, and decoder descriptions.', 'required', [
  iso('stsd', 'Sample description', 'track', 'Selects the sample entry and decoder configuration.', 'required', undefined, { fields: [field('entry_count', 'u32', 'Number of sample descriptions'), field('sample entries', 'boxes', 'Codec-specific configuration such as avc1/avcC')] }),
  iso('stts', 'Decoding time to sample', 'timing', 'Run-length table mapping samples to decode times.', 'required', undefined, { layout: 'FullBox + entry_count:u32 + {sample_count:u32, sample_delta:u32}[]', fields: [field('sample_count', 'u32', 'Number of consecutive samples in a run'), field('sample_delta', 'u32', 'Decode duration per sample, in mdhd timescale ticks')], practical: 'For entries (3, 1000), (2, 2000), decode times are 0, 1000, 2000, 3000, 5000 ticks. Sum prior deltas; sample numbers are 1-based.' }),
  iso('ctts', 'Composition time to sample', 'timing', 'Adds per-sample composition offsets to decode timestamps.', 'conditional', undefined, { fields: [field('sample_offset', 'u32 in v0; i32 in v1', 'PTS = DTS + offset; version 1 permits negative offsets')], practical: 'Inspect when B-frame decode order differs from display order.' }),
  iso('stsc', 'Sample to chunk', 'index', 'Run table giving samples per chunk and sample description index.', 'required', undefined, { fields: [field('first_chunk', 'u32', 'First 1-based chunk for this run'), field('samples_per_chunk', 'u32', 'Samples in each chunk of the run'), field('sample_description_index', 'u32', '1-based entry in stsd')] }),
  iso('stsz', 'Sample size', 'index', 'Stores one constant sample size or a size per sample.', 'conditional', undefined, { layout: 'FullBox + sample_size:u32 + sample_count:u32 + entry_size:u32[] if sample_size=0', fields: [field('sample_size', 'u32', 'Nonzero means every sample has this size'), field('entry_size', 'u32[]', 'One size per sample if sample_size is zero')], variants: 'Use stsz or compact stz2, according to the file.' }),
  iso('stz2', 'Compact sample size', 'index', 'Packs sample sizes into 4, 8, or 16 bits.', 'conditional', undefined, { fields: [field('field_size', 'u8', '4, 8, or 16 bits per size')] }),
  iso('stco', 'Chunk offset', 'index', 'Stores absolute file offsets to chunk starts as 32-bit values.', 'conditional', undefined, { fields: [field('chunk_offset', 'u32[]', 'Absolute byte offsets from start of file')], variants: 'Use stco or co64; offsets point into media data, not to the mdat header.' }),
  iso('co64', '64-bit chunk offset', 'index', 'Stores absolute file offsets to chunk starts as 64-bit values.', 'conditional', undefined, { fields: [field('chunk_offset', 'u64[]', 'Absolute byte offsets from start of file')] }),
  iso('stss', 'Sync sample', 'index', 'Lists 1-based sync sample numbers; absent means all samples are sync samples.', 'optional', undefined, { fields: [field('sample_number', 'u32[]', '1-based sample numbers')], practical: 'Seek to a suitable earlier sync sample, then decode forward. A sync sample signal does not describe every codec-specific random-access nuance.' }),
  iso('sdtp', 'Sample dependency', 'index', 'Describes per-sample dependency properties.', 'optional'),
])
const track = () => iso('trak', 'Track', 'track', 'Groups one video, audio, text, or other track.', 'required', [
  iso('tkhd', 'Track header', 'track', 'Identifies a track and its presentation properties.', 'required', undefined, { fields: [field('track_ID', 'u32', 'Unique track identifier'), field('duration', 'u32/u64', 'Duration in movie timescale, not media timescale')]}),
  iso('edts', 'Edit box', 'timing', 'Maps the media timeline into the movie timeline.', 'optional', [iso('elst', 'Edit list', 'timing', 'Lists edits with movie duration, media time, and rate.', 'required', undefined, { fields: [field('segment_duration', 'u32/u64', 'Duration in movie timescale'), field('media_time', 'i32/i64', 'Start in track media timescale; -1 denotes an empty edit')] })]),
  iso('mdia', 'Media', 'track', 'Defines track media timescale, handler, and sample information.', 'required', [
    iso('mdhd', 'Media header', 'timing', 'Defines the track media timescale and duration.', 'required', undefined, { fields: [field('timescale', 'u32', 'Ticks per second for this track')] }),
    iso('hdlr', 'Handler reference', 'track', 'Identifies media handler type such as vide or soun.', 'required', undefined, { fields: [field('handler_type', 'FourCC', 'vide, soun, text, and others')] }),
    iso('minf', 'Media information', 'track', 'Contains media-specific header, data reference, and sample table.', 'required', [
      iso('vmhd', 'Video media header', 'track', 'Video-specific media header.', 'conditional'),
      iso('smhd', 'Sound media header', 'track', 'Audio-specific media header.', 'conditional'),
      iso('dinf', 'Data information', 'track', 'Describes where sample data is stored.', 'required', [iso('dref', 'Data reference', 'track', 'Lists data sources for samples.', 'required')]),
      sampleTable(),
    ]),
  ]),
])
const movie = (fragmented = false) => iso('moov', 'Movie', 'metadata', 'Holds movie and track metadata; encoded bytes normally live in mdat.', 'required', [
  iso('mvhd', 'Movie header', 'timing', 'Defines movie-wide timescale and duration.', 'required', undefined, { fields: [field('timescale', 'u32', 'Movie time units per second'), field('duration', 'u32/u64', 'Duration in movie timescale')] }),
  track(),
  ...(fragmented ? [iso('mvex', 'Movie extends', 'metadata', 'Signals that movie fragments follow and supplies defaults.', 'required', [
    iso('trex', 'Track extends', 'track', 'Default sample properties for one fragmented track.', 'required', undefined, { fields: [field('track_ID', 'u32', 'Track these defaults apply to'), field('default_sample_duration', 'u32', 'Fallback duration when absent from tfhd/trun'), field('default_sample_size', 'u32', 'Fallback size when absent from tfhd/trun')] }),
    iso('mehd', 'Movie extends header', 'timing', 'Optional overall fragment duration.', 'optional'),
  ])] : []),
  iso('udta', 'User data', 'metadata', 'Optional movie-level metadata.', 'optional'),
  iso('meta', 'Metadata', 'metadata', 'Structured metadata with handler and items.', 'optional'),
])
const fileType = () => iso('ftyp', 'File type', 'metadata', 'Declares major and compatible brands.', 'required', undefined, { layout: 'size:u32 + "ftyp" + major_brand:FourCC + minor_version:u32 + compatible_brands:FourCC[]', fields: [field('major_brand', 'FourCC', 'Primary brand'), field('minor_version', 'u32', 'Brand-specific version'), field('compatible_brands', 'FourCC[]', 'Additional declared conformance')] })
const mediaData = () => iso('mdat', 'Media data', 'media', 'Carries encoded samples. Metadata elsewhere supplies byte ranges and timestamps.', 'conditional', undefined, { practical: 'A parser uses stco/co64 plus stsc and stsz, or fragment run offsets, to locate a sample inside mdat.' })
const movieFragment = () => iso('moof', 'Movie fragment', 'metadata', 'Carries per-fragment metadata for following media data.', 'required', [
  iso('mfhd', 'Movie fragment header', 'metadata', 'Carries fragment sequence number.', 'required', undefined, { fields: [field('sequence_number', 'u32', 'Monotonically increasing fragment sequence number')] }),
  iso('traf', 'Track fragment', 'track', 'Groups fragment metadata for one track.', 'required', [
    iso('tfhd', 'Track fragment header', 'track', 'Identifies track and optional defaults/base-data-offset.', 'required', undefined, { fields: [field('track_ID', 'u32', 'Track in initialization metadata'), field('flags', '24 bits', 'Controls optional fields and base-data-offset interpretation'), field('default_sample_duration/size/flags', 'optional u32', 'Defaults used when trun omits per-sample values')] }),
    iso('tfdt', 'Track fragment decode time', 'timing', 'Sets base decode time of the first sample in the track fragment.', 'conditional', undefined, { fields: [field('baseMediaDecodeTime', 'u32 v0 / u64 v1', 'Decode time in track media timescale')], variants: 'Required for MSE ISO BMFF media segments; requirements vary with profile/brand.' }),
    iso('trun', 'Track fragment run', 'index', 'Lists samples and optional per-sample duration, size, flags, and composition offset.', 'required', undefined, { layout: 'FullBox + sample_count:u32 + optional data_offset:i32 + optional first_sample_flags:u32 + optional per-sample fields selected by flags', fields: [field('data_offset', 'optional i32', 'Signed offset from fragment base-data-offset'), field('sample_duration', 'optional u32', 'Overrides tfhd/trex duration'), field('sample_size', 'optional u32', 'Overrides tfhd/trex size'), field('sample_composition_time_offset', 'u32 v0 / i32 v1', 'PTS = DTS + offset')], practical: 'Given tfdt=9000, two 1000-tick samples, and a run data offset pointing to byte 1200, their DTS values are 9000 and 10000; use sample sizes to advance from byte 1200.', variants: 'Field presence is controlled by trun FullBox flags; defaults come from tfhd then trex.' }),
  ]),
])

const mkvRoot = (webm = false): ElementDef => ebml('root', '—', webm ? 'WebM file' : 'Matroska file', 'metadata', 'EBML header followed by a Segment.', 'required', [
  ebml('EBML', '0x1A45DFA3', 'EBML header', 'metadata', 'Declares EBML version and DocType.', 'required', undefined, { fields: [field('DocType', 'UTF-8', webm ? 'webm' : 'matroska')], spec: specs.ebml }),
  ebml('Segment', '0x18538067', 'Segment', 'metadata', 'Master element containing tracks, clusters, and optional indexes/metadata.', 'required', [
    ebml('SeekHead', '0x114D9B74', 'Seek head', 'index', 'Directory of important top-level Segment elements.', 'optional'),
    ebml('Info', '0x1549A966', 'Segment information', 'timing', 'Segment timing and identity.', 'required', [ebml('TimestampScale', '0x2AD7B1', 'Timestamp scale', 'timing', 'Nanoseconds per Segment tick; defaults to 1,000,000.', 'optional', undefined, { fields: [field('value', 'unsigned integer', 'Nanoseconds per tick')] })]),
    ebml('Tracks', '0x1654AE6B', 'Tracks', 'track', 'Collection of track declarations.', 'required', [ebml('TrackEntry', '0xAE', 'Track entry', 'track', 'Declares one numbered track and its codec.', 'required', [
      ebml('TrackNumber', '0xD7', 'Track number', 'track', 'Number encoded in each Block header.', 'required'),
      ebml('CodecID', '0x86', 'Codec ID', 'track', 'Names the encoded bitstream format.', 'required', undefined, { variants: webm ? 'WebM Project container guidelines name V_VP8/V_VP9 and A_VORBIS/A_OPUS. Additional codec mappings require their own WebM carriage specification and playback support; arbitrary Matroska CodecIDs are not automatically WebM-compatible.' : 'Matroska supports a broader CodecID registry than WebM.' }),
      ebml('CodecPrivate', '0x63A2', 'Codec private data', 'track', 'Optional codec initialization bytes.', 'conditional'),
      ebml('Video', '0xE0', 'Video settings', 'track', 'Pixel dimensions and video properties.', 'conditional'),
      ebml('Audio', '0xE1', 'Audio settings', 'track', 'Sampling frequency and channels.', 'conditional'),
    ], { practical: 'Match a Block TrackNumber to this TrackEntry, then use CodecID and CodecPrivate to initialize the decoder.' })]),
    ebml('Cluster', '0x1F43B675', 'Cluster', 'media', 'Groups blocks of encoded frames around a common timestamp.', 'conditional', [
      ebml('Timestamp', '0xE7', 'Cluster timestamp', 'timing', 'Absolute timestamp in Segment ticks for this Cluster.', 'required', undefined, { fields: [field('value', 'unsigned integer', 'Cluster time in Segment ticks')] }),
      ebml('SimpleBlock', '0xA3', 'SimpleBlock', 'media', 'Stores track number, signed relative timestamp, flags, and encoded frame(s).', 'optional', undefined, { layout: 'ID + size + TrackNumber:VINT + relative timestamp:i16 BE + flags:u8 + frame data', fields: [field('TrackNumber', 'VINT', 'Identifies TrackEntry'), field('timestamp', 'signed i16', 'Added to Cluster Timestamp'), field('flags', 'u8', 'Keyframe, invisible, lacing, discardable bits')], practical: 'With TimestampScale=1 ms, Cluster Timestamp=5000 and block relative timestamp=40, the block time is 5.040 s.' }),
      ebml('BlockGroup', '0xA0', 'Block group', 'media', 'Wraps a Block with references, duration, and other metadata.', 'optional', [ebml('Block', '0xA1', 'Block', 'media', 'Stores encoded frame(s) with signed relative timestamp and optional lacing.', 'required')]),
    ], { practical: 'Use Cues to seek near a Cluster; read its Timestamp and add each Block relative timestamp.' }),
    ebml('Cues', '0x1C53BB6B', 'Cues', 'index', 'Index of seek points to Clusters and positions within them.', 'optional', [ebml('CuePoint', '0xBB', 'Cue point', 'index', 'CueTime plus per-track Cluster position and optional relative position.', 'required', undefined, { fields: [field('CueTime', 'unsigned integer', 'Timestamp in Segment ticks'), field('CueClusterPosition', 'unsigned integer', 'Offset relative to Segment data start')] })]),
    ...(!webm ? [
      ebml('Chapters', '0x1043A770', 'Chapters', 'metadata', 'Chapter structure and labels.', 'optional'),
      ebml('Attachments', '0x1941A469', 'Attachments', 'metadata', 'Embedded files such as fonts or images.', 'optional'),
      ebml('Tags', '0x1254C367', 'Tags', 'metadata', 'Tagged descriptive metadata.', 'optional'),
    ] : []),
  ], { variants: webm ? 'WebM allows a defined subset of Matroska elements; consult WebM guidelines for element-level support.' : undefined }),
], { spec: webm ? specs.webm : specs.matroska, layout: 'Conceptual file root: EBML header followed by Segment (no enclosing root element)' })

export const formats: Record<FormatId, FormatDef> = {
  mp4: { id: 'mp4', label: 'MP4', family: 'iso', subtitle: 'ISO BMFF · progressive example', root: iso('root', 'MP4 file', 'metadata', 'Top-level boxes in a representative progressive MP4.', 'required', [fileType(), iso('free', 'Free space', 'metadata', 'Padding for later edits.', 'optional'), iso('skip', 'Skip', 'metadata', 'Ignorable padding.', 'optional'), movie(), mediaData()], { layout: 'Conceptual file root: sequential top-level boxes (no enclosing root box)' }) },
  fmp4: { id: 'fmp4', label: 'Fragmented MP4', family: 'iso', subtitle: 'ISO BMFF fragments · CMAF profile notes', root: iso('root', 'Fragmented MP4 presentation', 'metadata', 'Representative initialization and media segment sequence.', 'required', [
    iso('init', 'Initialization segment', 'metadata', 'For MSE: ftyp followed by moov; sample tables are empty and mvex is present.', 'required', [fileType(), movie(true)], { spec: specs.mse, layout: 'Conceptual group: ftyp + moov (no enclosing init box)' }),
    iso('segment', 'Media segment', 'media', 'For MSE: optional styp, one moof, then one or more mdat.', 'required', [
      iso('styp', 'Segment type', 'metadata', 'Declares segment brand compatibility.', 'optional'),
      movieFragment(), mediaData(),
    ], { spec: specs.mse, layout: 'Conceptual group: optional styp + moof + one or more mdat (no enclosing segment box)' }),
    iso('sidx', 'Segment index', 'index', 'Optional top-level index for subsegments and random access.', 'optional'),
    iso('prft', 'Producer reference time', 'timing', 'Optional top-level mapping from media time to a wall-clock reference.', 'optional'),
    iso('emsg', 'Event message', 'metadata', 'Optional top-level timed event metadata.', 'optional'),
    iso('mfra', 'Movie fragment random access', 'index', 'Optional index, commonly near file end.', 'optional', [iso('tfra', 'Track fragment random access', 'index', 'Maps track time to moof byte offset.', 'conditional')]),
  ], { layout: 'Conceptual presentation: initialization + media segments (no enclosing box)', variants: 'CMAF imposes additional track, fragment, chunk, brand, and switching constraints. A CMAF chunk carries a movie fragment and media data; fragment and DASH/HLS delivery segment boundaries need not coincide.', spec: specs.cmaf }) },
  mov: { id: 'mov', label: 'MOV', family: 'iso', subtitle: 'QuickTime atoms · historical parent of MP4', root: iso('root', 'QuickTime movie', 'metadata', 'Representative atom layout; a .mov extension alone does not prove this exact structure.', 'required', [
    iso('ftyp', 'File type atom', 'metadata', 'Often present in modern QuickTime files; older files may omit it.', 'optional', undefined, { spec: specs.apple }),
    iso('wide', 'Wide atom', 'metadata', 'Legacy placeholder used before large media data atoms.', 'optional', undefined, { spec: specs.apple }),
    movie(), mediaData(),
  ], { spec: specs.apple, layout: 'Conceptual file root: sequential top-level atoms (no enclosing root atom)', variants: 'QuickTime uses atom terminology and allows QuickTime-specific sample descriptions, metadata conventions, and edit behavior. Interpret by atom hierarchy, version, and declared brands rather than extension.' }) },
  mkv: { id: 'mkv', label: 'MKV', family: 'ebml', subtitle: 'Matroska · flexible EBML document', root: mkvRoot() },
  webm: { id: 'webm', label: 'WebM', family: 'ebml', subtitle: 'Restricted Matroska profile', root: mkvRoot(true) },
}

export const formatIds: FormatId[] = ['mp4', 'fmp4', 'mov', 'mkv', 'webm']
export function flatten(root: ElementDef): ElementDef[] { return [root, ...(root.children ?? []).flatMap(flatten)] }
export function findElement(format: FormatId, id: string): ElementDef | undefined { return flatten(formats[format].root).find((item) => item.id === id) }

export const glossary: { term: string; definition: string; format: FormatId; element: string }[] = [
  ['Box', 'Size-prefixed ISO BMFF structure.', 'mp4', 'moov'], ['Atom', 'QuickTime name for a box.', 'mov', 'moov'], ['FourCC', 'Four-byte type code such as moov.', 'mp4', 'ftyp'], ['FullBox', 'Box with version byte and 24-bit flags after the usual header.', 'mp4', 'stts'],
  ['EBML', 'Recursive binary language used by Matroska.', 'mkv', 'EBML'], ['VINT', 'Variable-length integer with a leading length marker.', 'mkv', 'Segment'], ['Sample', 'One encoded access unit addressed by sample tables or runs.', 'mp4', 'stsz'], ['Chunk', 'Group of samples sharing one chunk offset in MP4.', 'mp4', 'stsc'],
  ['Fragment', 'A movie fragment described by moof and carried in mdat.', 'fmp4', 'moof'], ['Segment', 'A delivery unit; also a Matroska master element, depending on context.', 'mkv', 'Segment'], ['Track', 'One timed stream such as video or audio.', 'mp4', 'trak'], ['Sample description', 'Codec configuration referenced by samples.', 'mp4', 'stsd'],
  ['Sync sample', 'Sample marked as independently decodable by the container index.', 'mp4', 'stss'], ['Random access point', 'Place suitable to begin decoding, subject to codec and profile rules.', 'fmp4', 'sidx'], ['DTS', 'Decode timestamp in track time units.', 'mp4', 'stts'], ['PTS', 'Presentation timestamp; DTS plus composition offset in MP4.', 'mp4', 'ctts'],
  ['Composition offset', 'Difference between presentation and decode time.', 'mp4', 'ctts'], ['Timescale', 'Number of time ticks per second.', 'mp4', 'mdhd'], ['Decode order', 'Order in which samples enter the decoder.', 'mp4', 'stts'], ['Presentation order', 'Order in which decoded frames are displayed.', 'mp4', 'ctts'],
  ['Lacing', 'Packing multiple frames into a Matroska Block.', 'mkv', 'Block'], ['Cluster', 'Matroska group of Blocks near a common time.', 'mkv', 'Cluster'], ['Cue', 'Matroska seek point to a Cluster and possibly within it.', 'mkv', 'CuePoint'], ['Codec private data', 'Codec initialization bytes in a TrackEntry.', 'mkv', 'CodecPrivate'],
].map(([term, definition, format, element]) => ({ term, definition, format: format as FormatId, element }))
