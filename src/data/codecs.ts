export type CodecCategory =
  | 'delivery'
  | 'web'
  | 'professional'
  | 'broadcast'
  | 'cinema'
  | 'emerging'
  | 'historical'

export type Qualitative = 'Excellent' | 'Good' | 'Mixed' | 'Limited' | 'Legacy' | 'Emerging'

export type Codec = {
  id: string
  name: string
  fullName: string
  categories: CodecCategory[]
  introduced: string
  commonContainers: string[]
  commonCodecStrings?: string[]
  strengths: string[]
  weaknesses: string[]
  useCases: string[]
  supportNotes: string
  licensingNotes: string
  workflowNotes: string
  compressionEfficiency: 'Legacy' | 'Fair' | 'Good' | 'Very good' | 'Excellent' | 'Emerging'
  encodeComplexity: 'Low' | 'Medium' | 'High' | 'Very high'
  decodeComplexity: 'Low' | 'Medium' | 'High' | 'Very high'
  compatibility: 'Universal' | 'Strong' | 'Mixed' | 'Limited' | 'Emerging' | 'Legacy'
  era: string
  hardwareDecode: Qualitative
  webCompatibility: Qualitative
  appleEcosystem: Qualitative
  androidEcosystem: Qualitative
  smartTvEcosystem: Qualitative
  editingFriendliness: Qualitative
  notes: string
}

export type CodecScore = {
  id: string
  name: string
  compressionEfficiency: number
  encodeComplexity: number
  decodeComplexity: number
  compatibility: number
  professionalEditing: number
  webStreaming: number
}

export const codecs: Codec[] = [
  {
    id: 'h264', name: 'H.264 / AVC', fullName: 'Advanced Video Coding', categories: ['delivery', 'web', 'broadcast'], introduced: '2003', era: 'Early 2000s', commonContainers: ['MP4', 'MOV', 'MPEG-TS', 'fMP4', 'MKV'], commonCodecStrings: ['avc1.42E01E', 'avc1.4D401F', 'avc1.640028', 'avc1.64002A'],
    strengths: ['Universal baseline for web video compatibility', 'Excellent hardware decode coverage', 'Mature encoders, packagers, players, and debugging tools', 'Practical for HLS, DASH, WebRTC, cameras, and broadcast contribution'],
    weaknesses: ['Less bitrate-efficient than HEVC, VP9, and AV1', 'Long-GOP delivery files are not ideal editing masters', 'Licensing still matters for commercial distribution'],
    useCases: ['Fallback rendition for almost every streaming service', 'Browser playback in MP4/HLS/DASH', 'WebRTC and device capture', 'Broadcast and camera workflows'],
    supportNotes: 'The safest practical target for browser playback is still H.264 video in MP4/fMP4 with AAC audio. Baseline, Main, and High profiles appear often; level constrains resolution, bitrate, and frame rate.',
    licensingNotes: 'Patent pool licensing may apply depending on distribution and business model.',
    workflowNotes: 'Usually the compatibility floor in a multi-codec ladder. Use High profile for efficient VOD where supported; keep constrained profiles/levels for older devices.',
    compressionEfficiency: 'Good', encodeComplexity: 'Medium', decodeComplexity: 'Low', compatibility: 'Universal', hardwareDecode: 'Excellent', webCompatibility: 'Excellent', appleEcosystem: 'Excellent', androidEcosystem: 'Excellent', smartTvEcosystem: 'Excellent', editingFriendliness: 'Mixed', notes: 'Universal fallback; not the most efficient, but often the most reliable.'
  },
  {
    id: 'hevc', name: 'H.265 / HEVC', fullName: 'High Efficiency Video Coding', categories: ['delivery', 'web'], introduced: '2013', era: '2010s', commonContainers: ['MP4', 'MOV', 'fMP4', 'MPEG-TS', 'MKV'], commonCodecStrings: ['hvc1.1.6.L93.B0', 'hev1.1.6.L93.B0'],
    strengths: ['Better compression than H.264, especially for 4K and HDR', 'Strong Apple, camera, smart TV, UHD Blu-ray, and premium streaming presence', 'Good hardware decode on many modern devices'],
    weaknesses: ['Licensing and patent-pool complexity limited universal web adoption', 'Browser support varies strongly by platform', 'Higher encode and decode complexity than H.264'],
    useCases: ['Apple-first HLS', '4K/HDR delivery', 'UHD Blu-ray', 'Camera acquisition and premium VOD'],
    supportNotes: 'In MP4, hvc1 generally indicates parameter sets are stored in the sample description, while hev1 may allow parameter sets in samples. For Apple/browser compatibility, hvc1 is often the safer practical target.',
    licensingNotes: 'Multiple patent pools and licensing terms require product-specific review.',
    workflowNotes: 'Useful when Apple, HDR, or smart-TV coverage is important, usually with H.264 fallback.',
    compressionEfficiency: 'Very good', encodeComplexity: 'High', decodeComplexity: 'Medium', compatibility: 'Mixed', hardwareDecode: 'Good', webCompatibility: 'Mixed', appleEcosystem: 'Excellent', androidEcosystem: 'Mixed', smartTvEcosystem: 'Good', editingFriendliness: 'Mixed', notes: 'Excellent Apple/HDR choice, but not a universal web replacement for H.264.'
  },
  {
    id: 'vp8', name: 'VP8', fullName: 'Google VP8', categories: ['web', 'historical'], introduced: '2008-2010', era: 'Late 2000s', commonContainers: ['WebM', 'MKV'], commonCodecStrings: ['vp8'],
    strengths: ['Open codec with important WebRTC history', 'Broad enough browser support for legacy web use', 'Simpler than newer web codecs'], weaknesses: ['Mostly superseded by VP9 and AV1 for streaming efficiency', 'Not a common premium VOD delivery target today'], useCases: ['Historical WebM', 'WebRTC compatibility paths', 'Legacy open web video'],
    supportNotes: 'Still relevant to understand older WebRTC and WebM systems, but rarely selected for new bitrate-efficient VOD ladders.', licensingNotes: 'Open codec from Google; review current legal guidance for product use.', workflowNotes: 'Usually appears as legacy support rather than a new delivery strategy.', compressionEfficiency: 'Fair', encodeComplexity: 'Low', decodeComplexity: 'Low', compatibility: 'Strong', hardwareDecode: 'Mixed', webCompatibility: 'Good', appleEcosystem: 'Mixed', androidEcosystem: 'Good', smartTvEcosystem: 'Mixed', editingFriendliness: 'Limited', notes: 'Historically important; mostly replaced by VP9/AV1 for delivery.'
  },
  {
    id: 'vp9', name: 'VP9', fullName: 'Google VP9', categories: ['delivery', 'web'], introduced: '2013', era: '2010s', commonContainers: ['WebM', 'MKV', 'MP4 in some workflows'], commonCodecStrings: ['vp09.00.10.08', 'vp09.02.10.10'],
    strengths: ['Open codec with strong YouTube/web streaming history', 'Better compression than H.264', 'Mature compared with AV1 on some older device classes'], weaknesses: ['Hardware decode varies by device age', 'Apple support arrived later and is platform-dependent', 'Less efficient than AV1 in many modern encodes'], useCases: ['DASH/WebM streaming', 'Bandwidth saving for browsers/devices with VP9 decode', 'YouTube-style web delivery'],
    supportNotes: 'Good option where device measurement shows VP9 hardware decode coverage. Older mobile and TV devices can be uneven.', licensingNotes: 'Open codec from Google; still validate product legal requirements.', workflowNotes: 'Often paired with H.264 fallback and increasingly complemented or replaced by AV1 on modern targets.', compressionEfficiency: 'Very good', encodeComplexity: 'High', decodeComplexity: 'Medium', compatibility: 'Strong', hardwareDecode: 'Good', webCompatibility: 'Good', appleEcosystem: 'Mixed', androidEcosystem: 'Good', smartTvEcosystem: 'Good', editingFriendliness: 'Limited', notes: 'Practical web efficiency codec, especially for DASH/WebM ecosystems.'
  },
  {
    id: 'av1', name: 'AV1', fullName: 'AOMedia Video 1', categories: ['delivery', 'web'], introduced: '2018', era: 'Late 2010s', commonContainers: ['MP4', 'WebM', 'MKV'], commonCodecStrings: ['av01.0.05M.08', 'av01.0.08M.10'],
    strengths: ['Designed to outperform VP9 and compete with or surpass HEVC', 'Open and increasingly important for VOD, 4K, HDR, and bandwidth savings', 'Hardware decode is becoming common on newer devices'], weaknesses: ['Encoding is computationally expensive compared with older codecs', 'Older device coverage is not universal', 'Real playback support depends on profile, level, bit depth, and container'], useCases: ['Bandwidth-sensitive VOD', 'Modern browser/device ladders', '4K/HDR where supported', 'Large-scale streaming with H.264 fallback'],
    supportNotes: 'AV1 codec strings carry profile, level, tier, and bit-depth information. isTypeSupported may pass even when a specific stream fails due to hardware, level, DRM, or platform issues.', licensingNotes: 'Developed by Alliance for Open Media as an open codec; review current patent and product guidance.', workflowNotes: 'Best treated as a measured modern-device optimization, not the only rendition family.', compressionEfficiency: 'Excellent', encodeComplexity: 'Very high', decodeComplexity: 'High', compatibility: 'Strong', hardwareDecode: 'Good', webCompatibility: 'Good', appleEcosystem: 'Mixed', androidEcosystem: 'Good', smartTvEcosystem: 'Emerging', editingFriendliness: 'Limited', notes: 'Strong bandwidth savings when target devices can decode it efficiently.'
  },
  {
    id: 'mpeg2', name: 'MPEG-2 Video', fullName: 'MPEG-2 Part 2 Video', categories: ['broadcast', 'historical'], introduced: '1995', era: '1990s', commonContainers: ['MPEG-PS', 'MPEG-TS', 'VOB', 'MXF'], commonCodecStrings: ['mp4v-style legacy identifiers vary'],
    strengths: ['Historically enormous footprint', 'Still useful in legacy broadcast, DVD, and cable/satellite systems', 'Low complexity by modern standards'], weaknesses: ['Inefficient by modern standards', 'Not a normal modern web delivery choice', 'Limited support in browser MSE workflows'], useCases: ['DVD', 'Broadcast TV', 'Early digital cable/satellite', 'Legacy archive ingest'], supportNotes: 'Important because many broadcast systems and archives still carry MPEG-2 assumptions.', licensingNotes: 'Legacy patent/licensing situation depends on jurisdiction and use.', workflowNotes: 'Usually transcode to modern delivery formats for web playback.', compressionEfficiency: 'Legacy', encodeComplexity: 'Low', decodeComplexity: 'Low', compatibility: 'Legacy', hardwareDecode: 'Legacy', webCompatibility: 'Limited', appleEcosystem: 'Limited', androidEcosystem: 'Limited', smartTvEcosystem: 'Mixed', editingFriendliness: 'Mixed', notes: 'Legacy foundation for many broadcast workflows.'
  },
  {
    id: 'prores', name: 'ProRes', fullName: 'Apple ProRes family', categories: ['professional'], introduced: '2007', era: '2000s', commonContainers: ['MOV', 'MXF'], commonCodecStrings: ['apcn', 'apch', 'ap4h'],
    strengths: ['Excellent editing and mezzanine behavior', 'Intra-frame focused and visually robust', 'Common in acquisition, post, and mastering workflows', 'Variants cover Proxy through 4444/RAW needs'], weaknesses: ['Large files', 'Not usually a final web delivery codec', 'Browser playback support is not the goal'], useCases: ['Editing', 'Post-production', 'Mezzanine masters', 'Camera acquisition', 'VFX handoff'], supportNotes: 'ProRes Proxy, LT, 422, 422 HQ, 4444, and RAW trade size, quality, alpha, and workflow needs.', licensingNotes: 'Apple-controlled professional codec family; encoder/decoder availability depends on platform and tools.', workflowNotes: 'Use as an intermediate/master, then transcode to delivery codecs such as H.264, HEVC, VP9, or AV1.', compressionEfficiency: 'Fair', encodeComplexity: 'Medium', decodeComplexity: 'Low', compatibility: 'Strong', hardwareDecode: 'Mixed', webCompatibility: 'Limited', appleEcosystem: 'Excellent', androidEcosystem: 'Limited', smartTvEcosystem: 'Limited', editingFriendliness: 'Excellent', notes: 'Editing codec, not a bandwidth-efficient web delivery codec.'
  },
  {
    id: 'dnx', name: 'DNxHD / DNxHR', fullName: 'Avid DNxHD and DNxHR', categories: ['professional'], introduced: '2000s', era: '2000s', commonContainers: ['MXF', 'MOV'], commonCodecStrings: ['AVdn'], strengths: ['Edit-friendly intra-frame professional codec family', 'DNxHD suits HD-era workflows; DNxHR supports higher resolutions', 'Common in Avid and interchange pipelines'], weaknesses: ['Large compared with delivery codecs', 'Not a normal browser delivery format'], useCases: ['Editing', 'Post-production', 'Broadcast interchange', 'Mezzanine workflows'], supportNotes: 'Strong in professional NLE contexts, not designed as an MSE/browser streaming target.', licensingNotes: 'Avid codec family; availability depends on tooling and platform.', workflowNotes: 'Similar role to ProRes: preserve quality and timeline performance before final delivery transcodes.', compressionEfficiency: 'Fair', encodeComplexity: 'Medium', decodeComplexity: 'Low', compatibility: 'Strong', hardwareDecode: 'Limited', webCompatibility: 'Limited', appleEcosystem: 'Good', androidEcosystem: 'Limited', smartTvEcosystem: 'Limited', editingFriendliness: 'Excellent', notes: 'Professional intermediate for editing and interchange.'
  },
  {
    id: 'jpeg2000', name: 'JPEG 2000', fullName: 'JPEG 2000 Video / Motion JPEG 2000', categories: ['cinema', 'professional'], introduced: '2000', era: '2000s', commonContainers: ['MXF', 'JP2', 'MJ2'], commonCodecStrings: ['mjp2-style identifiers vary'], strengths: ['Intra-frame wavelet compression', 'Important in Digital Cinema Package workflows', 'High quality and robust for mastering contexts'], weaknesses: ['Not common for everyday web streaming', 'Different ecosystem than browser delivery codecs'], useCases: ['Digital Cinema Package (DCP)', 'Archival/mastering niches', 'High-quality intra workflows'], supportNotes: 'DCP relevance makes it important even though it is not a daily web codec.', licensingNotes: 'Standards-based codec; review implementation licensing.', workflowNotes: 'Usually part of cinema packaging rather than ABR streaming.', compressionEfficiency: 'Good', encodeComplexity: 'High', decodeComplexity: 'High', compatibility: 'Limited', hardwareDecode: 'Limited', webCompatibility: 'Limited', appleEcosystem: 'Limited', androidEcosystem: 'Limited', smartTvEcosystem: 'Limited', editingFriendliness: 'Good', notes: 'Cinema-oriented intra-frame wavelet codec.'
  },
  {
    id: 'vvc', name: 'VVC / H.266', fullName: 'Versatile Video Coding', categories: ['emerging', 'delivery'], introduced: '2020', era: '2020s', commonContainers: ['MP4', 'MPEG-TS', 'emerging workflows'], commonCodecStrings: ['vvc1 examples vary by packaging'], strengths: ['Very high compression potential', 'Designed as HEVC successor'], weaknesses: ['High complexity', 'Limited web playback deployment today', 'Support and licensing realities remain practical blockers'], useCases: ['Forward-looking trials', 'Research', 'Future premium distribution'], supportNotes: 'Not broadly deployable for general browser playback today.', licensingNotes: 'Licensing/patent terms are a key deployment consideration.', workflowNotes: 'Track for future strategy, but use measured target-device support before production adoption.', compressionEfficiency: 'Emerging', encodeComplexity: 'Very high', decodeComplexity: 'Very high', compatibility: 'Emerging', hardwareDecode: 'Emerging', webCompatibility: 'Emerging', appleEcosystem: 'Emerging', androidEcosystem: 'Emerging', smartTvEcosystem: 'Emerging', editingFriendliness: 'Limited', notes: 'High potential, low current web practicality.'
  },
  {
    id: 'evc', name: 'EVC', fullName: 'MPEG-5 Essential Video Coding', categories: ['emerging'], introduced: '2020', era: '2020s', commonContainers: ['MP4', 'emerging workflows'], strengths: ['Designed with licensing structure in mind', 'Aims for modern compression with clearer baseline licensing story'], weaknesses: ['Less common in mainstream web delivery', 'Limited device/browser ecosystem'], useCases: ['Specialized deployments', 'Standards evaluation', 'Emerging codec strategy'], supportNotes: 'Not a common browser ABR target today.', licensingNotes: 'Created partly to address licensing concerns, but deployments still require legal review.', workflowNotes: 'Emerging/specialized rather than a default production choice.', compressionEfficiency: 'Emerging', encodeComplexity: 'High', decodeComplexity: 'High', compatibility: 'Emerging', hardwareDecode: 'Emerging', webCompatibility: 'Emerging', appleEcosystem: 'Emerging', androidEcosystem: 'Emerging', smartTvEcosystem: 'Emerging', editingFriendliness: 'Limited', notes: 'Licensing-aware emerging codec with limited mainstream deployment.'
  },
  {
    id: 'lcevc', name: 'LCEVC', fullName: 'MPEG-5 Low Complexity Enhancement Video Coding', categories: ['emerging'], introduced: '2020', era: '2020s', commonContainers: ['Used alongside base codec streams'], strengths: ['Enhancement-layer approach over a base codec', 'Goal is quality/compression improvement with lower complexity'], weaknesses: ['Not a normal standalone codec in the same sense as H.264 or AV1', 'Ecosystem integration and player support are deployment questions'], useCases: ['Enhancement-layer trials', 'Specialized distribution', 'Base-codec augmentation'], supportNotes: 'Think of LCEVC as an enhancement approach paired with a base codec, not as a simple replacement bitstream.', licensingNotes: 'Review vendor and standards licensing for deployment.', workflowNotes: 'Requires player/decoder integration beyond ordinary MIME support.', compressionEfficiency: 'Emerging', encodeComplexity: 'Medium', decodeComplexity: 'Medium', compatibility: 'Emerging', hardwareDecode: 'Emerging', webCompatibility: 'Emerging', appleEcosystem: 'Emerging', androidEcosystem: 'Emerging', smartTvEcosystem: 'Emerging', editingFriendliness: 'Limited', notes: 'Enhancement coding strategy, not a typical standalone delivery codec.'
  },
  {
    id: 'theora', name: 'Theora', fullName: 'Xiph Theora', categories: ['historical', 'web'], introduced: '2004', era: '2000s', commonContainers: ['Ogg'], commonCodecStrings: ['theora'], strengths: ['Important in open web video history', 'Royalty-free/open design goals'], weaknesses: ['Mostly obsolete for modern delivery', 'Poor efficiency and ecosystem relevance compared with modern codecs'], useCases: ['Historical open web video', 'Legacy Ogg content'], supportNotes: 'Useful context for why open codecs mattered before VP8/VP9/AV1.', licensingNotes: 'Open codec from Xiph ecosystem.', workflowNotes: 'Do not choose for new production streaming ladders.', compressionEfficiency: 'Legacy', encodeComplexity: 'Low', decodeComplexity: 'Low', compatibility: 'Legacy', hardwareDecode: 'Limited', webCompatibility: 'Legacy', appleEcosystem: 'Limited', androidEcosystem: 'Limited', smartTvEcosystem: 'Limited', editingFriendliness: 'Limited', notes: 'Historical open-web codec.'
  }
]

export const codecScores: CodecScore[] = [
  { id: 'h264', name: 'H.264/AVC', compressionEfficiency: 6, encodeComplexity: 4, decodeComplexity: 3, compatibility: 10, professionalEditing: 3, webStreaming: 10 },
  { id: 'hevc', name: 'HEVC', compressionEfficiency: 8, encodeComplexity: 7, decodeComplexity: 6, compatibility: 6, professionalEditing: 3, webStreaming: 7 },
  { id: 'vp9', name: 'VP9', compressionEfficiency: 8, encodeComplexity: 7, decodeComplexity: 6, compatibility: 7, professionalEditing: 2, webStreaming: 8 },
  { id: 'av1', name: 'AV1', compressionEfficiency: 9, encodeComplexity: 9, decodeComplexity: 8, compatibility: 7, professionalEditing: 2, webStreaming: 8 },
  { id: 'vvc', name: 'VVC/H.266', compressionEfficiency: 10, encodeComplexity: 10, decodeComplexity: 10, compatibility: 2, professionalEditing: 1, webStreaming: 2 },
  { id: 'prores', name: 'ProRes', compressionEfficiency: 3, encodeComplexity: 4, decodeComplexity: 2, compatibility: 4, professionalEditing: 10, webStreaming: 1 },
  { id: 'mpeg2', name: 'MPEG-2', compressionEfficiency: 2, encodeComplexity: 2, decodeComplexity: 2, compatibility: 5, professionalEditing: 4, webStreaming: 1 }
]

export const ladderBase = [
  { codec: 'H264', resolution: '426x240', bitrateKbps: 350 }, { codec: 'H264', resolution: '640x360', bitrateKbps: 700 }, { codec: 'H264', resolution: '854x480', bitrateKbps: 1200 }, { codec: 'H264', resolution: '1280x720', bitrateKbps: 2800 }, { codec: 'H264', resolution: '1920x1080', bitrateKbps: 5500 }, { codec: 'H264', resolution: '2560x1440', bitrateKbps: 11000 }, { codec: 'H264', resolution: '3840x2160', bitrateKbps: 22000 },
  { codec: 'HEVC', resolution: '426x240', bitrateKbps: 240 }, { codec: 'HEVC', resolution: '640x360', bitrateKbps: 480 }, { codec: 'HEVC', resolution: '854x480', bitrateKbps: 850 }, { codec: 'HEVC', resolution: '1280x720', bitrateKbps: 1850 }, { codec: 'HEVC', resolution: '1920x1080', bitrateKbps: 3600 }, { codec: 'HEVC', resolution: '2560x1440', bitrateKbps: 7600 }, { codec: 'HEVC', resolution: '3840x2160', bitrateKbps: 14500 },
  { codec: 'VP9', resolution: '426x240', bitrateKbps: 260 }, { codec: 'VP9', resolution: '640x360', bitrateKbps: 520 }, { codec: 'VP9', resolution: '854x480', bitrateKbps: 900 }, { codec: 'VP9', resolution: '1280x720', bitrateKbps: 2000 }, { codec: 'VP9', resolution: '1920x1080', bitrateKbps: 3900 }, { codec: 'VP9', resolution: '2560x1440', bitrateKbps: 8000 }, { codec: 'VP9', resolution: '3840x2160', bitrateKbps: 15500 },
  { codec: 'AV1', resolution: '426x240', bitrateKbps: 210 }, { codec: 'AV1', resolution: '640x360', bitrateKbps: 420 }, { codec: 'AV1', resolution: '854x480', bitrateKbps: 720 }, { codec: 'AV1', resolution: '1280x720', bitrateKbps: 1600 }, { codec: 'AV1', resolution: '1920x1080', bitrateKbps: 3100 }, { codec: 'AV1', resolution: '2560x1440', bitrateKbps: 6500 }, { codec: 'AV1', resolution: '3840x2160', bitrateKbps: 12000 }
] as const

export const codecStringExplanations: Record<string, string> = {
  'avc1.64002A': 'H.264/AVC in an MP4-style sample entry. 64 is High profile, 00 carries compatibility flags, and 2A is level 4.2. Level limits combinations such as resolution, frame rate, decoded picture buffer, and bitrate.',
  'hvc1.1.6.L93.B0': 'HEVC/H.265 using hvc1 signaling. Parameter sets are expected in the container sample description, which is commonly the safer practical target for Apple/browser playback. The fields communicate profile, compatibility, level/tier, and constraints.',
  'vp09.00.10.08': 'VP9 codec string. The fields identify profile 0, level 1.0, and 8-bit video. More detailed strings can also communicate bit depth, chroma subsampling, color primaries, transfer, and matrix.',
  'av01.0.05M.08': 'AV1 codec string. av01 is AV1, 0 is Main profile, 05M is level 5 main tier, and 08 is 8-bit. AV1 strings may also include monochrome, chroma, color, and range fields.',
  'mp4a.40.2': 'AAC audio in MP4 signaling. 40 means MPEG-4 audio object types, and 2 is AAC-LC. Video capability checks often fail because the audio codec string is wrong or omitted.'
}
