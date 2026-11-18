export const inspectStreams = `#include <stdio.h>
#include <libavformat/avformat.h>

/* Call after avformat_find_stream_info() on an open input. */
void print_streams(const AVFormatContext *fmt)
{
    for (unsigned i = 0; i < fmt->nb_streams; i++) {
        const AVStream *st = fmt->streams[i];
        const AVCodecParameters *par = st->codecpar;
        printf("stream %d: %s", st->index, avcodec_get_name(par->codec_id));

        if (par->codec_type == AVMEDIA_TYPE_VIDEO)
            printf(" %dx%d", par->width, par->height);
        if (st->disposition & AV_DISPOSITION_DEFAULT)
            printf(" (default)");
        if (st->disposition & AV_DISPOSITION_ATTACHED_PIC)
            printf(" (cover art, %d bytes)", st->attached_pic.size);

        AVRational avg = st->avg_frame_rate;
        if (avg.num > 0 && avg.den > 0)
            printf(" avg %d/%d fps", avg.num, avg.den);
        if (st->start_time != AV_NOPTS_VALUE && st->time_base.den > 0)
            printf(" start %.3f s", st->start_time * av_q2d(st->time_base));
        puts("");

        const AVDictionaryEntry *entry = NULL;
        while ((entry = av_dict_iterate(st->metadata, entry)))
            printf("  %s=%s\\n", entry->key, entry->value);
    }
}`

export const displayMatrix = `#include <math.h>
#include <string.h>
#include <libavformat/avformat.h>
#include <libavutil/display.h>

/* Returns counterclockwise degrees, or NAN when unavailable. */
double stream_rotation(const AVStream *st)
{
    const AVCodecParameters *par = st->codecpar;
    const AVPacketSideData *sd = av_packet_side_data_get(
        par->coded_side_data, par->nb_coded_side_data,
        AV_PKT_DATA_DISPLAYMATRIX);

    int32_t matrix[9];
    if (!sd || !sd->data || sd->size < sizeof(matrix))
        return NAN;

    memcpy(matrix, sd->data, sizeof(matrix));
    return av_display_rotation_get(matrix);
}`

export const rescaleTimestamp = `#include <libavutil/avutil.h>
#include <libavutil/mathematics.h>

int64_t convert_pts(int64_t pts, AVRational src, AVRational dst)
{
    if (pts == AV_NOPTS_VALUE)
        return AV_NOPTS_VALUE;
    /* src and dst are valid positive time bases. */
    return av_rescale_q(pts, src, dst);
}`
