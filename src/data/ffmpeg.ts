export type StageId = 'input' | 'demux' | 'packet' | 'decode' | 'frame' | 'filter' | 'encode' | 'mux' | 'output'
export type Scenario = { id: string; title: string; command: string; summary: string; video: StageId[]; audio?: StageId[]; note: string }
export const stages: Record<StageId, { title: string; io: string; detail: string; api: string; options: string[] }> = {
  input: { title: 'Input', io: 'File or URL → container bytes', detail: 'An input can contain several video, audio, subtitle, or data streams. Input options belong before its -i.', api: 'libavformat', options: ['-i', '-ss', '-f'] },
  demux: { title: 'Demux', io: 'Container → encoded streams', detail: 'The demuxer separates selected streams and yields compressed packets with timing metadata. It does not decompress media.', api: 'libavformat', options: ['-map'] },
  packet: { title: 'AVPacket', io: 'Encoded payload + timestamps', detail: 'A packet carries encoded data for one stream. Codec buffering and reordering mean packets and frames do not always correspond one to one.', api: 'AVPacket', options: ['-c copy'] },
  decode: { title: 'Decode', io: 'Encoded packets → decoded media', detail: 'A decoder reconstructs video frames or audio samples; it may buffer and reorder its output.', api: 'libavcodec', options: ['-c:v', '-c:a'] },
  frame: { title: 'AVFrame', io: 'Raw picture or audio samples', detail: 'A video AVFrame contains decoded pixel data; an audio AVFrame contains decoded samples. Frames can enter filters.', api: 'AVFrame', options: ['-pix_fmt', '-r'] },
  filter: { title: 'Filter', io: 'Decoded frames → decoded frames', detail: 'Simple filters process one stream. A complex filtergraph can join, split, or combine streams from multiple inputs.', api: 'libavfilter', options: ['-vf', '-af', '-filter_complex'] },
  encode: { title: 'Encode', io: 'Decoded frames → encoded packets', detail: 'An encoder compresses frames. Rate control and keyframe decisions occur here; encoder behavior depends on implementation.', api: 'libavcodec', options: ['-c:v', '-crf', '-b:v', '-g'] },
  mux: { title: 'Mux', io: 'Encoded packets → container', detail: 'The muxer interleaves and writes selected encoded streams and container metadata. Packaging muxers may create segments and manifests.', api: 'libavformat', options: ['-f', '-movflags', '-hls_time'] },
  output: { title: 'Output', io: 'File, segments, or stream', detail: 'Output URL and extension often select a muxer. HLS and DASH outputs can include manifests plus media segments.', api: 'libavformat', options: ['-f'] },
}
const full: StageId[] = ['input','demux','packet','decode','frame','filter','encode','mux','output']
const transcode: StageId[] = full.filter(x => x !== 'filter')
const copy: StageId[] = ['input','demux','packet','mux','output']
export const scenarios: Scenario[] = [
  { id:'copy', title:'Stream copy / remux', command:'ffmpeg -i input.mp4 -c copy output.mkv', summary:'Compressed streams move into a new container.', video:copy, audio:copy, note:'Both lanes represent selected streams. No decode, filter, or encode. Encoded bitstreams are copied, though metadata, timestamps, and packet framing may be rewritten or adapted. The target muxer must support the codecs.' },
  { id:'transcode', title:'Video transcode', command:'ffmpeg -i input.mp4 -c:v libx264 -crf 23 output.mp4', summary:'Decode video, encode H.264, then mux.', video:transcode, note:'Other streams may be selected and encoded automatically. Specify -map and codec options when exact stream handling matters.' },
  { id:'scale', title:'Scale and transcode', command:'ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 output.mp4', summary:'The scale filter receives decoded video frames.', video:full, note:'Filtering requires decoding and encoding the filtered stream. The example uses automatic stream selection for other streams.' },
  { id:'mixed', title:'Video transcode · audio copy', command:'ffmpeg -i input.mp4 -map 0:v:0 -map 0:a:0 -c:v libx264 -crf 23 -c:a copy output.mp4', summary:'Video and audio take separate paths.', video:transcode, audio:copy, note:'Video is decoded and encoded; audio packets bypass both. Explicit -map selects the first video and audio streams; this command requires both to exist.' },
  { id:'complex', title:'Two-input overlay', command:'ffmpeg -i input.mp4 -i logo.png -filter_complex "[0:v][1:v]overlay=20:20[v]" -map "[v]" -map 0:a? -c:v libx264 -c:a copy output.mp4', summary:'Two decoded video inputs meet in a filtergraph.', video:full, audio:copy, note:'The diagram condenses the second input into the filter stage. The optional audio map copies audio when present; a still image has its own demux and decode path.' },
  { id:'hls', title:'HLS packaging', command:'ffmpeg -i input.mp4 -c:v libx264 -c:a aac -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename "seg_%03d.ts" index.m3u8', summary:'The HLS muxer writes segments and a playlist.', video:transcode, audio:transcode, note:'This example encodes media, then uses the HLS muxer to write MPEG-TS segments and a VOD M3U8 playlist. Segment cuts depend on suitable keyframes; other HLS workflows can use fMP4 or copied streams.' },
]
export type Option = { key: string; category: string; scope: string; values: string; purpose: string; caveat: string; example: string }
const row = (category:string, scope:string, key:string, values:string, purpose:string, caveat:string, example:string):Option => ({category,scope,key,values,purpose,caveat,example})
export const options: Option[] = [
  row('Input & output','input','-i','input URL','Open an input.','Options before -i apply to that input.','-i input.mp4'),
  row('Input & output','input or output','-ss','timestamp','Seek to a time.','Before -i seeks in the input; after -i seeks on output. Transcoding with accurate input seek may decode and discard before target.','-ss 00:01:30 -i input.mp4'),
  row('Input & output','input or output','-t','duration','Limit input read or output duration.','Position before an input gives an input duration; after inputs it limits the output.','-t 10 output.mp4'),
  row('Input & output','input or output','-to','timestamp','Stop at a position.','Cannot combine with -t for the same file; position determines scope.','-to 00:00:10 output.mp4'),
  row('Input & output','input or output','-f','format name','Force demuxer or muxer format.','Often inferred from filename, but pipes may need it explicitly.','-f matroska output.mkv'),
  row('Input & output','global','-y','none','Overwrite outputs.','Use cautiously in scripts.','-y output.mp4'),
  row('Input & output','global','-n','none','Refuse to overwrite outputs.','Conflicts with -y.','-n output.mp4'),
  row('Stream selection','output','-map','input:stream or label','Explicitly choose output streams.','Once used for an output, automatic selection is disabled for that output.','-map 0:v:0 -map 0:a?'),
  row('Stream selection','output','-map_metadata','input index','Choose metadata source.','Metadata selection is separate from media stream selection.','-map_metadata 0'),
  row('Stream selection','output','-an','none','Disable audio output.','Do not confuse with selecting an audio stream using -map.','-an output.mp4'),
  row('Stream selection','output','-vn','none','Disable video output.','Useful for audio extraction.','-vn audio.m4a'),
  row('Stream selection','output','-sn','none','Disable subtitle output.','Subtitle handling is container and codec dependent.','-sn output.mp4'),
  row('Codecs','output stream','-c copy','copy','Copy all selected streams.','No filters on a copied stream; muxer must accept the codec.','-c copy output.mkv'),
  row('Codecs','output video stream','-c:v','encoder or copy','Select video encoder or copy.','libx264 availability depends on build.','-c:v libx264'),
  row('Codecs','output audio stream','-c:a','encoder or copy','Select audio encoder or copy.','A copied audio stream bypasses decode and encode.','-c:a copy'),
  row('Codecs','output subtitle stream','-c:s','encoder or copy','Select subtitle encoder or copy.','Subtitle conversion support varies.','-c:s copy'),
  row('Codecs','output','-preset','encoder preset','Trade encode speed for compression efficiency.','Values are encoder specific.','-preset medium'),
  row('Quality & rate','encoder specific','-crf','quality number','Constant-quality style rate control.','Scale and defaults depend on encoder; not a universal quality score.','-c:v libx264 -crf 23'),
  row('Quality & rate','encoder specific','-qp','quantizer','Set constant quantizer when supported.','Meaning and support depend on encoder.','-c:v libx264 -qp 22'),
  row('Quality & rate','output video stream','-b:v','bitrate','Set target video bitrate.','Rate-control behavior depends on encoder.','-b:v 3M'),
  row('Quality & rate','output audio stream','-b:a','bitrate','Set target audio bitrate.','Accepted rates depend on encoder.','-b:a 192k'),
  row('Quality & rate','encoder specific','-maxrate','bitrate','Set maximum rate constraint.','Usually paired with -bufsize; behavior is encoder specific.','-maxrate 4M'),
  row('Quality & rate','encoder specific','-bufsize','bits','Set rate-control buffer size.','It is a model of allowed bitrate variation, not output file size.','-bufsize 8M'),
  row('Quality & rate','encoder specific','-minrate','bitrate','Set minimum rate constraint.','Support and results vary by encoder.','-minrate 2M'),
  row('GOP & keyframes','output video stream','-g','frames','Set maximum GOP size.','Scene cuts and encoder rules may place keyframes earlier.','-g 60'),
  row('GOP & keyframes','encoder specific','-keyint_min','frames','Set minimum keyframe interval.','Encoder specific and may interact with scene cuts.','-keyint_min 60'),
  row('GOP & keyframes','output video stream','-force_key_frames','timestamps or expression','Request keyframes at times.','Encoder time base can shift actual positions.','-force_key_frames 0,4,8'),
  row('GOP & keyframes','output video stream','-sc_threshold','number','Control scene-change keyframe detection.','Encoder support and meaning vary.','-sc_threshold 0'),
  row('Filtering','output video stream','-vf','filter chain','Apply simple video filters.','Filtered streams must be encoded.','-vf scale=1280:720'),
  row('Filtering','output audio stream','-af','filter chain','Apply simple audio filters.','Filtered streams must be encoded.','-af volume=0.8'),
  row('Filtering','global graph','-filter_complex','filtergraph','Build a graph across streams or inputs.','Map labeled outputs explicitly for predictable results.','-filter_complex "[0:v][1:v]overlay[v]"'),
  row('Filtering','filter parameter','scale','width:height','Resize decoded video.','An FFmpeg filter, used inside -vf or a graph.','-vf scale=1280:720'),
  row('Filtering','filter parameter','crop','w:h:x:y','Crop decoded video.','Coordinates and dimensions should fit the source.','-vf crop=640:360:0:0'),
  row('Filtering','filter parameter','fps','rate','Select output frames at a target cadence.','Can drop or duplicate frames; differs from output -r.','-vf fps=30'),
  row('Filtering','filter parameter','overlay','x:y','Composite one video over another.','Requires two video input pads.','[0:v][1:v]overlay=20:20'),
  row('Pixel format & time','output video stream','-pix_fmt','pixel format','Choose encoder input/output pixel format.','Encoder may reject unsupported formats.','-pix_fmt yuv420p'),
  row('Pixel format & time','input or output','-r','frames per second','Set input interpretation or output rate.','Before input, it changes input frame-rate interpretation; as output it can duplicate/drop.','-r 30 output.mp4'),
  row('Pixel format & time','output video stream','-fps_mode','mode','Choose video frame synchronization mode.','Modes include passthrough, cfr, vfr, auto; use per-stream when needed.','-fps_mode vfr'),
  row('Pixel format & time','input or output','-thread_queue_size','packets','Set packet queue capacity.','As an input option it helps live or multi-input workflows; as an output option it sets a muxing-thread queue.','-thread_queue_size 512 -i live.ts'),
  row('Muxing','output muxer','-movflags','flag list','Control MOV/MP4 muxer behavior.','faststart relocates metadata after writing; fragmentation uses different flags.','-movflags +faststart'),
  row('Muxing','output muxer','-avoid_negative_ts','mode','Shift negative timestamps in muxing.','Can alter output timestamps; inspect before using as a repair.','-avoid_negative_ts make_zero'),
  row('Muxing','global','-copyts','none','Keep input timestamps.','Timestamp interactions are nuanced; test resulting files.','-copyts'),
  row('HLS & DASH','HLS muxer','-hls_time','seconds','Target HLS segment length.','Cutting generally waits for a suitable keyframe, so segments may differ.','-hls_time 4'),
  row('HLS & DASH','HLS muxer','-hls_segment_filename','pattern','Name segment files.','Pattern must not collide across segments.','-hls_segment_filename "seg_%03d.ts"'),
  row('HLS & DASH','HLS muxer','-hls_playlist_type','event or vod','Choose playlist mode.','Only meaningful with the HLS muxer.','-hls_playlist_type vod'),
  row('HLS & DASH','HLS muxer','-hls_segment_type','mpegts or fmp4','Select HLS segment container.','Player compatibility depends on target devices.','-hls_segment_type fmp4'),
  row('HLS & DASH','DASH muxer','-seg_duration','seconds','Target DASH segment duration.','Actual boundaries depend on encoded keyframes and muxer behavior.','-seg_duration 4'),
  row('HLS & DASH','DASH muxer','-use_template','0 or 1','Use a template in the MPD.','DASH muxer option, not a general FFmpeg flag.','-use_template 1'),
  row('Diagnostics','global','-loglevel','level','Control diagnostic verbosity.','debug is verbose; warnings need context.','-loglevel debug'),
  row('Diagnostics','global','-report','none','Write a diagnostic report.','Includes command and logs; inspect before sharing.','-report'),
  row('Diagnostics','global','-benchmark','none','Report processing time and memory.','Measures this run and environment, not codec quality.','-benchmark'),
  row('Diagnostics','global','-hide_banner','none','Suppress build banner.','Useful in scripts without hiding warnings.','-hide_banner'),
]
export type Recipe = { id:string; category:string; title:string; command:string; use:string; process:string; caveat:string; related:string[] }
const recipe=(id:string,category:string,title:string,command:string,useText:string,process:string,caveat:string,related:string[]):Recipe=>({id,category,title,command,use:useText,process,caveat,related})
export const recipes:Recipe[] = [
  recipe('probe','Inspect','Inspect streams','ffprobe -v error -show_format -show_streams input.mp4','See container and stream metadata.','Probes headers and stream properties; does not transcode.','Some fields are absent or estimated.',['-i','-map']),
  recipe('json','Inspect','JSON metadata','ffprobe -v error -show_format -show_streams -of json input.mp4','Feed stream metadata to a tool.','Serializes probe sections as JSON.','Do not assume every field exists.',['-map']),
  recipe('packets','Inspect','Inspect packets and timestamps','ffprobe -v error -select_streams v:0 -show_packets -show_entries packet=pts_time,dts_time,size,flags -of csv=p=0 input.mp4','Trace encoded packet timing.','Reads selected encoded video packets.','B frames can make PTS and DTS differ.',['-map']),
  recipe('frames','Inspect','Inspect decoded frames','ffprobe -v error -select_streams v:0 -show_frames -show_entries frame=best_effort_timestamp_time,pict_type,key_frame -of csv=p=0 input.mp4','Inspect decoded picture types.','Decodes video to report frame properties.','Frame output can take much longer than probing headers.',['-map']),
  recipe('keyframes','Inspect','Find keyframe timestamps','ffprobe -v error -select_streams v:0 -skip_frame nokey -show_frames -show_entries frame=best_effort_timestamp_time,pict_type -of csv=p=0 input.mp4','Find candidate random-access points.','Decodes selected keyframes.','Keyframe flags alone do not describe every codec access rule.',['-g']),
  recipe('fields','Inspect','Codec, dimensions, rates','ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,avg_frame_rate,time_base -of default=noprint_wrappers=1 input.mp4','Compare reported video properties.','Reads stream metadata.','r_frame_rate and avg_frame_rate have different meanings.',['-r']),
  recipe('remux','Transcode & remux','Remux without re-encoding','ffmpeg -i input.mp4 -map 0 -c copy output.mkv','Change container while preserving encoded streams.','Demuxes and remuxes selected packets.','Target muxer must support every mapped stream.',['-map','-c copy']),
  recipe('h264','Transcode & remux','Encode H.264','ffmpeg -i input.mp4 -c:v libx264 -crf 23 -c:a aac output.mp4','Produce common MP4 delivery media.','Decodes then encodes video and audio.','libx264 depends on the FFmpeg build.',['-c:v','-crf','-c:a']),
  recipe('hevc','Transcode & remux','Encode HEVC','ffmpeg -i input.mp4 -c:v libx265 -crf 28 -c:a aac output.mp4','Try HEVC delivery.','Decodes video, encodes HEVC, muxes MP4.','Device support and libx265 availability vary.',['-c:v','-crf']),
  recipe('mixed','Transcode & remux','Encode video, copy audio','ffmpeg -i input.mp4 -map 0:v:0 -map 0:a:0 -c:v libx264 -crf 23 -c:a copy output.mp4','Preserve compatible audio while changing video.','Video decodes and encodes; audio packets are copied.','Requires an audio stream compatible with MP4.',['-map','-c:v','-c:a']),
  recipe('resize','Transcode & remux','Resize video','ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -crf 23 -c:a copy output.mp4','Create a 1280×720 version.','Decoded video frames pass through scale.','May distort if source aspect ratio differs.',['-vf','scale']),
  recipe('pixel','Transcode & remux','Set pixel format','ffmpeg -i input.mp4 -c:v libx264 -pix_fmt yuv420p -c:a aac output.mp4','Target common 8-bit 4:2:0 playback.','Converts decoded pixels before encoding.','This can discard bit depth or chroma information.',['-pix_fmt']),
  recipe('rate','Transcode & remux','Constrain video rate','ffmpeg -i input.mp4 -c:v libx264 -b:v 3M -maxrate 4M -bufsize 8M -c:a aac output.mp4','Set a target and short-term rate bounds.','Encoder rate control allocates bits over time.','Values are goals and constraints, not a prediction.',['-b:v','-maxrate','-bufsize']),
  recipe('audio','Transcode & remux','Extract audio','ffmpeg -i input.mp4 -map 0:a:0 -vn -c:a aac audio.m4a','Make an audio-only file.','Selects and encodes the first audio stream.','Requires an audio stream.',['-map','-vn','-c:a']),
  recipe('inputseek','Edit & filter','Trim with input seeking','ffmpeg -ss 00:01:30 -i input.mp4 -t 10 -c:v libx264 -c:a aac clip.mp4','Fast seek and make a ten-second clip.','Seeks input, then decodes/discards as needed for accurate transcoding.','Accuracy and speed depend on format and options.',['-ss','-t']),
  recipe('outputseek','Edit & filter','Trim with output seeking','ffmpeg -i input.mp4 -ss 00:01:30 -t 10 -c:v libx264 -c:a aac clip.mp4','Compare output-side seeking.','Reads/decodes from input toward requested output position.','Can be slower for distant targets.',['-ss','-t']),
  recipe('concat','Edit & filter','Concatenate compatible files','ffmpeg -f concat -safe 0 -i list.txt -c copy joined.mp4','Join files listed in a concat-demuxer list.','Demuxes listed files and remuxes packets.','Files must have compatible streams and parameters; list.txt uses concat demuxer syntax.',['-f','-c copy']),
  recipe('crop','Edit & filter','Crop video','ffmpeg -i input.mp4 -vf crop=640:360:0:0 -c:v libx264 -c:a copy cropped.mp4','Keep a 640×360 region.','Crop filters decoded frames before encoding.','Coordinates must fit the source.',['-vf','crop']),
  recipe('fps','Edit & filter','Change frame cadence','ffmpeg -i input.mp4 -vf fps=30 -c:v libx264 -c:a copy output.mp4','Create a 30 fps output.','The fps filter selects, drops, or duplicates decoded frames.','Motion cadence can change.',['fps','-vf']),
  recipe('overlay','Edit & filter','Overlay a logo','ffmpeg -i input.mp4 -i logo.png -filter_complex "[0:v][1:v]overlay=20:20[v]" -map "[v]" -map 0:a? -c:v libx264 -c:a copy output.mp4','Composite an image over video.','Two decoded video inputs meet at overlay.','Check image dimensions and alpha; audio is optional.',['-filter_complex','overlay','-map']),
  recipe('images','Edit & filter','Extract image frames','ffmpeg -i input.mp4 -vf fps=1 frame_%04d.png','Save one image each second.','Decodes video, samples frames, encodes PNG images.','Generates many files for long inputs.',['fps','-vf']),
  recipe('gop','GOP & keyframes','Set GOP length','ffmpeg -i input.mp4 -c:v libx264 -g 60 -c:a aac output.mp4','Set a maximum keyframe interval in frames.','Encoder plans GOP structure.','Scene cuts may insert earlier keyframes.',['-g']),
  recipe('forced','GOP & keyframes','Force keyframes at times','ffmpeg -i input.mp4 -c:v libx264 -force_key_frames 0,4,8,12 -c:a aac output.mp4','Place requested access points.','Encoder receives keyframe requests.','Actual placement is rounded to encoder time base.',['-force_key_frames']),
  recipe('align','GOP & keyframes','Regular streaming GOP','ffmpeg -i input.mp4 -c:v libx264 -g 120 -keyint_min 120 -sc_threshold 0 -c:a aac output.mp4','Try a fixed 4-second GOP for 30 fps input.','Encoder limits and scene-cut settings shape access points.','Only 4 seconds when output is 30 fps; inspect the result.',['-g','-keyint_min','-sc_threshold']),
  recipe('sizes','GOP & keyframes','Investigate packet size spikes','ffprobe -v error -select_streams v:0 -show_packets -show_entries packet=pts_time,size,flags -of csv=p=0 input.mp4','Compare packet sizes around keyframes.','Reads encoded video packets.','One packet is not necessarily one displayed frame.',['-g']),
  recipe('hls','Streaming','Generate HLS','ffmpeg -i input.mp4 -c:v libx264 -c:a aac -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename "seg_%03d.ts" index.m3u8','Create a basic VOD playlist and segments.','Encodes then HLS muxer writes TS segments and M3U8.','Segment length depends on keyframes; tune GOP for stable cuts.',['-f','-hls_time','-hls_playlist_type','-hls_segment_filename']),
  recipe('dash','Streaming','Generate DASH','ffmpeg -i input.mp4 -c:v libx264 -c:a aac -f dash -seg_duration 4 manifest.mpd','Create a DASH MPD and segments.','Encodes media; DASH muxer writes fragmented media and MPD.','Inspect keyframe and segment alignment.',['-f','-seg_duration']),
  recipe('fmp4','Streaming','Create fragmented MP4','ffmpeg -i input.mp4 -c copy -movflags +frag_keyframe+empty_moov output.mp4','Explore MP4 fragments.','Copies compatible packets into a fragmented MP4.','Fragmentation alone does not create HLS or DASH manifests.',['-c copy','-movflags']),
  recipe('testvideo','Diagnostics','Generate test video','ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -t 5 -c:v libx264 test.mp4','Make deterministic synthetic video.','lavfi source emits frames that are encoded.','libx264 availability depends on build.',['-f','-t']),
  recipe('testaudio','Diagnostics','Generate test audio','ffmpeg -f lavfi -i sine=frequency=1000:sample_rate=48000 -t 5 -c:a aac tone.m4a','Make a five-second tone.','lavfi generates audio samples; AAC encodes them.','Listen at a safe volume.',['-f','-t']),
  recipe('debug','Diagnostics','Log detailed processing','ffmpeg -loglevel debug -i input.mp4 -f null -','Investigate selection, decoding, and warnings.','Decodes selected streams and discards output via null muxer.','Debug logs can be very large.',['-loglevel','-f']),
  recipe('bench','Diagnostics','Benchmark a transcode','ffmpeg -benchmark -i input.mp4 -c:v libx264 -an -f null -','Compare local encode settings.','Transcodes video and discards output.','Runs vary with hardware, build, and input.',['-benchmark','-an']),
]
export const tokenize = (command:string) => command.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []
export const illustrativeSeekPoint = (target:number, keyframeInterval:number) => Math.max(0,Math.floor(target/keyframeInterval)*keyframeInterval)
export type CommandGroup = { text:string; key?:string; scope:string; detail:string; stage?:StageId }
export function annotateCommand(command:string): CommandGroup[] {
  const tokens=tokenize(command)
  const result:CommandGroup[]=[]
  let inputSeen=0
  for(let i=0;i<tokens.length;i++) {
    const token=tokens[i]
    if(i===0){ result.push({text:token,scope:'program',detail:token==='ffprobe'?'Inspect media without creating output.':'The FFmpeg command-line program.'});continue }
    if(token==='-i') {result.push({text:`-i ${tokens[++i]??''}`,key:'-i',scope:`input ${++inputSeen}`,detail:'Opens an input. Options immediately before this -i belong to this input.',stage:'input'});continue}
    if(token.startsWith('-') && token!=='-') {
      const candidate=token.startsWith('-c:v')?'-c:v':token.startsWith('-c:a')?'-c:a':token
      const opt=options.find(o=>o.key===candidate || (token==='-c' && o.key==='-c copy'))
      const hasValue = i+1<tokens.length && !tokens[i+1].startsWith('-') && !['-y','-n','-an','-vn','-sn','-benchmark','-report','-hide_banner','-copyts'].includes(token)
      const value=hasValue?tokens[++i]:''
      const key=token==='-c'&&value==='copy'?'-c copy':candidate
      const found=options.find(o=>o.key===key)??opt
      const beforeInput=tokens.slice(i+1).includes('-i')
      const stage:StageId|undefined = token==='-ss'?(beforeInput?'input':'output'):token==='-map'?'demux':token==='-vf'||token==='-af'||token==='-filter_complex'?'filter':token.startsWith('-c')&&value==='copy'?'packet':token.startsWith('-c')||['-crf','-g','-b:v'].includes(token)?'encode':token==='-f'?'mux':undefined
      const scope=token==='-ss'?(beforeInput?'input option, before -i':'output option, after -i'):(found?.scope??'command option')
      result.push({text:`${token}${value?' '+value:''}`,key:found?.key,scope,detail:found?`${found.purpose} ${found.caveat}`:'See the FFmpeg documentation for exact behavior.',stage})
    } else result.push({text:token,scope:'output URL',detail:'The output name or URL ends this output option group.',stage:'output'})
  }
  return result
}
