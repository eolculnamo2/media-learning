export type GlossaryEntry = { term: string; group: string; definition: string; purpose: string; where: string; example: string; semantics: string; presence: string; omitted: string; mistake: string; related: string[]; lab: string; source: string }
const dash = 'https://dashif.org/Guidelines-TimingModel/'
const iop = 'https://dashif.org/docs/DASH-IF-IOP-v4.2-clean.htm'
const hls = 'https://www.rfc-editor.org/rfc/rfc8216'
const ll = 'https://developer.apple.com/documentation/http-live-streaming/enabling-low-latency-http-live-streaming-hls'
type Row = [string, string, string, string, string?, string?]
const make = (format: 'DASH' | 'HLS', group: string, rows: Row[], lab: string, source: string): GlossaryEntry[] => rows.map(([term, definition, where, example, semantics, mistake]) => ({
  term, group: `${format} · ${group}`, definition, purpose: definition, where, example,
  semantics: semantics ?? 'Interpret in the surrounding presentation or playlist context; this field does not validate the media bytes.',
  presence: 'Context dependent; see the linked specification for exact constraints.',
  omitted: 'No general default is assumed here. The applicable element or playlist rule determines omission behavior.',
  mistake: mistake ?? 'Treating advertised metadata as proof that the encoded media has the same property.',
  related: [], lab, source,
}))

export const glossary: GlossaryEntry[] = [
  ...make('DASH', 'Presentation structure', [
    ['MPD', 'Top-level Media Presentation Description document.', 'Document root', '<MPD type="static">…</MPD>', 'Contains periods, timing, and presentation-wide metadata.'],
    ['MPD profiles', 'Identifiers for constrained DASH feature sets.', 'MPD@profiles', '<MPD profiles="urn:mpeg:dash:profile:isoff-live:2011">', 'Core DASH and DASH-IF interoperability points impose different constraints.'],
    ['type="static" / type="dynamic"', 'Distinguishes finite on-demand presentations from updating live presentations.', 'MPD@type', '<MPD type="dynamic">', 'Dynamic MPDs can evolve; availability still depends on timing rules.'],
    ['Period', 'A bounded interval of a presentation with its own adaptation sets.', 'MPD child', '<Period id="p0" start="PT0S">…</Period>', 'Period boundaries may affect continuity but are not HLS discontinuity tags.'],
    ['AdaptationSet', 'Groups substitutable media components such as video or audio.', 'Period child', '<AdaptationSet contentType="video">…</AdaptationSet>'],
    ['Representation', 'A particular encoded alternative within an adaptation set.', 'AdaptationSet child', '<Representation id="v720" bandwidth="2800000"/>', 'Switching also depends on media compatibility and access points.'],
    ['BaseURL', 'Base address used to resolve segment URLs.', 'MPD, Period, AdaptationSet, or Representation', '<BaseURL>https://cdn.example/video/</BaseURL>', 'Hierarchical resolution applies.'],
    ['EssentialProperty / SupplementalProperty', 'Descriptor declaring essential or supplemental processing information.', 'AdaptationSet or Representation', '<EssentialProperty schemeIdUri="urn:example:feature" value="x"/>', 'Unknown essential schemes can affect playability.'],
    ['Role', 'Describes a media component’s role, such as main or commentary.', 'AdaptationSet', '<Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>'],
    ['ContentProtection', 'Signals protection scheme and related DRM metadata.', 'AdaptationSet or Representation', '<ContentProtection schemeIdUri="urn:mpeg:dash:mp4protection:2011" value="cenc"/>'],
  ], 'overview', iop),
  ...make('DASH', 'Segment addressing', [
    ['SegmentTemplate', 'Constructs segment URLs from a template and timing information.', 'AdaptationSet or Representation segment information', '<SegmentTemplate media="seg-$Number$.m4s" duration="2000" timescale="1000"/>'],
    ['SegmentTimeline', 'Explicit sequence of segment start times and durations.', 'Inside SegmentTemplate or SegmentList', '<SegmentTimeline><S t="0" d="2000" r="2"/></SegmentTimeline>', 'Timing is in timescale units.'],
    ['SegmentList', 'Explicit list of segment URLs.', 'Segment information element', '<SegmentList><SegmentURL media="s1.m4s"/></SegmentList>'],
    ['SegmentBase', 'Addresses media through indexes and byte ranges in a resource.', 'Segment information element', '<SegmentBase indexRange="100-500"/>'],
    ['Initialization', 'Reference to initialization data required before media samples.', 'SegmentBase or SegmentList', '<Initialization sourceURL="init.mp4"/>'],
    ['SegmentURL', 'A media segment URL and optional byte range.', 'SegmentList child', '<SegmentURL media="seg-1.m4s"/>'],
    ['SegmentTimeline S', 'One run of equal-duration segment references.', 'SegmentTimeline child', '<S t="0" d="2000" r="2"/>'],
    ['t', 'Explicit start time of an S run.', 'S@t', '<S t="6000" d="2000"/>', 'If absent, the preceding run establishes the next start where defined.'],
    ['d', 'Duration of each segment in an S run.', 'S@d', '<S d="2000"/>', 'Required for an S element; positive timescale units.'],
    ['r', 'Number of additional repeats of an S element.', 'S@r', '<S d="2000" r="2"/>', 'r=2 describes three segments; negative repetition needs a following boundary or period end.'],
    ['timescale', 'Units per second for template timing fields.', 'SegmentTemplate@timescale', '<SegmentTemplate timescale="1000"/>', 'Where specified, omitted timescale is 1.'],
    ['presentationTimeOffset', 'Maps media timeline time to period presentation time.', 'SegmentTemplate or SegmentBase', '<SegmentTemplate presentationTimeOffset="900000" timescale="90000"/>'],
    ['$Number$', 'Substitutes the segment number into a media URL.', 'SegmentTemplate@media', 'media="seg-$Number$.m4s"'],
    ['$Time$', 'Substitutes the segment start time in timescale units.', 'SegmentTemplate@media', 'media="chunk-$Time$.m4s"'],
    ['$RepresentationID$', 'Substitutes the Representation identifier.', 'SegmentTemplate URL pattern', 'media="$RepresentationID$/$Time$.m4s"'],
    ['$Bandwidth$', 'Substitutes declared Representation bandwidth.', 'SegmentTemplate URL pattern', 'media="$Bandwidth$/$Number$.m4s"'],
    ['startNumber', 'First segment number for number-based addressing.', 'SegmentTemplate or SegmentList', '<SegmentTemplate startNumber="1"/>', 'Where defined, omitted startNumber is 1.'],
    ['duration', 'Constant segment duration for duration-based addressing.', 'SegmentTemplate@duration', '<SegmentTemplate duration="2000" timescale="1000"/>', 'Do not assume sample-exact boundaries from a nominal duration.'],
  ], 'addressing', dash),
  ...make('DASH', 'Decoding and switching', [
    ['startWithSAP', 'Advertises a stream access point type at segment starts.', 'AdaptationSet or Representation', '<Representation startWithSAP="1"/>', 'SAP type values have specific random-access semantics; type 1 is not a universal synonym for IDR.'],
    ['segmentAlignment', 'Signals aligned segment boundaries among representations.', 'AdaptationSet', '<AdaptationSet segmentAlignment="true">', 'Alignment alone does not promise independent decoding or codec compatibility.'],
    ['subsegmentAlignment', 'Signals aligned subsegment boundaries.', 'AdaptationSet', '<AdaptationSet subsegmentAlignment="true">'],
    ['subsegmentStartsWithSAP', 'Advertises SAP type at subsegment starts.', 'AdaptationSet or Representation', '<AdaptationSet subsegmentStartsWithSAP="1">'],
    ['bitstreamSwitching', 'Signals whether switching can avoid reinitializing decoder state under the relevant profile.', 'AdaptationSet', '<AdaptationSet bitstreamSwitching="true">', 'Never infer from boundary alignment alone.'],
    ['codecs', 'RFC 6381 style codec identifiers for the encoded media.', 'AdaptationSet or Representation', '<Representation codecs="avc1.64001f"/>'],
    ['mimeType', 'MIME media type for representation data.', 'AdaptationSet or Representation', '<AdaptationSet mimeType="video/mp4">'],
    ['bandwidth', 'Declared maximum bandwidth for a Representation under DASH semantics.', 'Representation@bandwidth', '<Representation bandwidth="2800000"/>'],
    ['width, height, frameRate', 'Descriptive video dimensions and frame rate.', 'AdaptationSet or Representation', '<Representation width="1280" height="720" frameRate="30000/1001"/>'],
    ['Stream Access Points', 'Defined entry points with different decode and output conditions.', 'SAP signaling and media indexes', '<Representation startWithSAP="1"/>', 'Types 1–6 are not interchangeable; inspect the relevant ISO definition and media.'],
    ['Random access and switching', 'Player entry into a segment and change between alternatives.', 'Manifest signaling plus media samples', '<AdaptationSet segmentAlignment="true"><Representation startWithSAP="1"/></AdaptationSet>', 'Requires compatible timing, initialization, codec state, and decodable references.'],
  ], 'sap', iop),
  ...make('DASH', 'Live', [
    ['availabilityStartTime', 'Wall-clock anchor for a dynamic presentation.', 'MPD@availabilityStartTime', '<MPD type="dynamic" availabilityStartTime="2026-01-01T00:00:00Z">'],
    ['publishTime', 'Time this MPD instance was published.', 'MPD@publishTime', '<MPD publishTime="2026-01-01T00:00:10Z">'],
    ['minimumUpdatePeriod', 'Minimum interval after which an MPD update may be expected.', 'MPD@minimumUpdatePeriod', '<MPD minimumUpdatePeriod="PT2S">', 'It is not a fixed segment download schedule.'],
    ['timeShiftBufferDepth', 'Advertised duration of the moving time-shift window.', 'MPD@timeShiftBufferDepth', '<MPD timeShiftBufferDepth="PT30S">'],
    ['suggestedPresentationDelay', 'Suggested delay behind the live edge.', 'MPD@suggestedPresentationDelay', '<MPD suggestedPresentationDelay="PT6S">'],
    ['minBufferTime', 'Minimum buffer duration associated with smooth playback assumptions.', 'MPD@minBufferTime', '<MPD minBufferTime="PT2S">', 'Not a player’s mandatory startup buffer.'],
    ['Segment availability windows', 'Intervals when a segment may be requested according to dynamic timing.', 'Derived from MPD and segment timing', '<MPD type="dynamic" timeShiftBufferDepth="PT30S">'],
    ['UTCTiming', 'A method for aligning client and server clocks.', 'MPD child', '<UTCTiming schemeIdUri="urn:mpeg:dash:utc:http-iso:2014" value="https://time.example/"/>'],
    ['ServiceDescription', 'Service-level latency and playback-rate guidance.', 'MPD child', '<ServiceDescription><Latency target="3000"/></ServiceDescription>'],
    ['ProducerReferenceTime', 'Correlates media presentation time to wall clock.', 'AdaptationSet or Representation', '<ProducerReferenceTime id="1" type="encoder" wallClockTime="2026-01-01T00:00:00Z" presentationTime="0"/>'],
  ], 'live', dash),
  ...make('HLS', 'Multivariant playlist', [
    ['#EXTM3U', 'Required opening line identifying an extended M3U playlist.', 'First line', '#EXTM3U'],
    ['#EXT-X-STREAM-INF', 'Introduces a Variant Stream URI and its attributes.', 'Multivariant playlist', '#EXT-X-STREAM-INF:BANDWIDTH=2800000\n720p.m3u8'],
    ['#EXT-X-MEDIA', 'Declares an alternative rendition such as audio or subtitles.', 'Multivariant playlist', '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="English",DEFAULT=YES,URI="en.m3u8"'],
    ['BANDWIDTH', 'Peak aggregate bitrate value for a Variant Stream.', 'EXT-X-STREAM-INF attribute', '#EXT-X-STREAM-INF:BANDWIDTH=2800000'],
    ['AVERAGE-BANDWIDTH', 'Average aggregate bitrate for a Variant Stream.', 'EXT-X-STREAM-INF attribute', '#EXT-X-STREAM-INF:BANDWIDTH=2800000,AVERAGE-BANDWIDTH=2200000'],
    ['CODECS', 'Codec identifiers for media in a Variant Stream.', 'EXT-X-STREAM-INF attribute', '#EXT-X-STREAM-INF:BANDWIDTH=2800000,CODECS="avc1.64001f,mp4a.40.2"'],
    ['RESOLUTION', 'Advertised video dimensions.', 'EXT-X-STREAM-INF attribute', '#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720'],
    ['FRAME-RATE', 'Maximum frame rate for video in a Variant Stream.', 'EXT-X-STREAM-INF attribute', '#EXT-X-STREAM-INF:BANDWIDTH=2800000,FRAME-RATE=29.970'],
    ['Audio groups', 'GROUP-ID connects variants to alternative audio renditions.', 'EXT-X-MEDIA and EXT-X-STREAM-INF AUDIO', '#EXT-X-STREAM-INF:BANDWIDTH=2800000,AUDIO="aud"'],
    ['Subtitle groups', 'GROUP-ID connects variants to subtitle renditions.', 'EXT-X-MEDIA and EXT-X-STREAM-INF SUBTITLES', '#EXT-X-STREAM-INF:BANDWIDTH=2800000,SUBTITLES="subs"'],
    ['#EXT-X-I-FRAME-STREAM-INF', 'Describes an I-frame only rendition for trick play.', 'Multivariant playlist', '#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=200000,URI="iframes.m3u8"'],
  ], 'comparison', hls),
  ...make('HLS', 'Media playlist', [
    ['#EXTINF', 'Duration of the next Media Segment.', 'Before segment URI', '#EXTINF:2.000,\nseg-1.m4s'],
    ['#EXT-X-TARGETDURATION', 'Maximum rounded segment duration in the playlist.', 'Media playlist', '#EXT-X-TARGETDURATION:2'],
    ['#EXT-X-MEDIA-SEQUENCE', 'Media Sequence Number of the first listed segment.', 'Media playlist', '#EXT-X-MEDIA-SEQUENCE:42'],
    ['#EXT-X-DISCONTINUITY', 'Marks a discontinuity before the next segment.', 'Media playlist', '#EXT-X-DISCONTINUITY\n#EXTINF:2,\nseg-9.ts'],
    ['#EXT-X-DISCONTINUITY-SEQUENCE', 'Discontinuity sequence number for the first segment.', 'Media playlist', '#EXT-X-DISCONTINUITY-SEQUENCE:3'],
    ['#EXT-X-MAP', 'Specifies media initialization data, required for fMP4 segments.', 'Media playlist', '#EXT-X-MAP:URI="init.mp4"'],
    ['#EXT-X-BYTERANGE', 'Specifies a byte range for the following segment URI.', 'Before segment URI', '#EXT-X-BYTERANGE:1000@0\nmedia.mp4'],
    ['#EXT-X-ENDLIST', 'Declares that no more Media Segments will be added.', 'Media playlist end', '#EXT-X-ENDLIST'],
    ['#EXT-X-PLAYLIST-TYPE', 'Restricts how a Media Playlist may change.', 'Media playlist', '#EXT-X-PLAYLIST-TYPE:EVENT', 'EVENT or VOD; absent does not assign either type.'],
    ['#EXT-X-PROGRAM-DATE-TIME', 'Maps a segment’s first timestamp to wall clock.', 'Before segment URI', '#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00Z'],
    ['#EXT-X-INDEPENDENT-SEGMENTS', 'Asserts every media sample in each segment can be decoded without information from other segments.', 'Multivariant or Media playlist', '#EXT-X-INDEPENDENT-SEGMENTS'],
    ['#EXT-X-KEY', 'Specifies encryption method and key retrieval for following segments.', 'Media playlist', '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"'],
    ['#EXT-X-START', 'Preferred initial playback position.', 'Multivariant or Media playlist', '#EXT-X-START:TIME-OFFSET=-6.0'],
  ], 'live', hls),
  ...make('HLS', 'Low-Latency HLS', [
    ['#EXT-X-PART', 'Identifies a partial segment and its duration.', 'Media playlist', '#EXT-X-PART:DURATION=0.333,URI="part-1.m4s",INDEPENDENT=YES'],
    ['#EXT-X-PART-INF', 'Declares part target duration.', 'Media playlist', '#EXT-X-PART-INF:PART-TARGET=0.333'],
    ['#EXT-X-SERVER-CONTROL', 'Advertises server support for low-latency playlist behavior.', 'Media playlist', '#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=1.0'],
    ['#EXT-X-PRELOAD-HINT', 'Hints at a resource expected to become available.', 'Media playlist', '#EXT-X-PRELOAD-HINT:TYPE=PART,URI="next.m4s"'],
    ['#EXT-X-SKIP', 'Marks segments omitted from a delta playlist update.', 'Media playlist delta update', '#EXT-X-SKIP:SKIPPED-SEGMENTS=3'],
    ['#EXT-X-RENDITION-REPORT', 'Reports another rendition’s latest media and part sequence.', 'Media playlist', '#EXT-X-RENDITION-REPORT:URI="low.m3u8",LAST-MSN=42,LAST-PART=2'],
    ['Blocking playlist reloads', 'Request waits until requested media or part is available when server support is advertised.', 'Playlist request query and SERVER-CONTROL', 'live.m3u8?_HLS_msn=42&_HLS_part=2'],
    ['Partial segments', 'Smaller delivery units within a complete segment.', 'EXT-X-PART entries', '#EXT-X-PART:DURATION=0.333,URI="part-1.m4s"'],
  ], 'live', ll),
]

const special: Record<string, Partial<GlossaryEntry>> = {
  'd': { presence: 'Required on each S element.' },
  'timescale': { omitted: 'Defaults to 1 where the SegmentTemplate timescale default applies.' },
  'startNumber': { omitted: 'Defaults to 1 where startNumber applies.' },
  '#EXTM3U': { presence: 'Required as the first line of every HLS playlist.' },
  '#EXT-X-TARGETDURATION': { presence: 'Required in a Media Playlist.' },
  '#EXTINF': { presence: 'Required for every Media Segment.' },
  '#EXT-X-MAP': { presence: 'Required for every fMP4 Media Segment under RFC 8216.' },
  '#EXT-X-MEDIA-SEQUENCE': { omitted: 'The first Media Sequence Number is 0 if omitted.' },
  '#EXT-X-INDEPENDENT-SEGMENTS': { omitted: 'No playlist-wide independence assertion is made.' },
  '#EXT-X-KEY': { omitted: 'Segments are not encrypted unless another applicable key declaration exists.' },
  '#EXT-X-ENDLIST': { omitted: 'The playlist may be updated, subject to its other constraints.' },
  '#EXT-X-PLAYLIST-TYPE': { omitted: 'No EVENT or VOD restriction is declared.' },
}
glossary.forEach((entry) => Object.assign(entry, special[entry.term] ?? {}))
glossary.forEach((entry) => {
  const peers = glossary.filter((candidate) => candidate.group === entry.group)
  const index = peers.indexOf(entry)
  entry.related = [peers[index - 1]?.term, peers[index + 1]?.term].filter((term): term is string => Boolean(term))
})
