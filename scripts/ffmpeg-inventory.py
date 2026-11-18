"""Generate or check the explorer inventory against the FFmpeg 9.0.2 source archive."""
import argparse
import json
import re
from pathlib import Path

VERSION = "9.0.2"
HEADERS = {
    "libavformat/avformat.h": ("AVStream",),
    "libavcodec/codec_par.h": ("AVCodecParameters",),
    "libavcodec/packet.h": ("AVPacket AVPacketSideData", "AVPacketSideDataType"),
    "libavcodec/codec_id.h": ("", "AVCodecID"),
    "libavcodec/defs.h": ("", "AVFieldOrder AVDiscard"),
    "libavutil/avutil.h": ("", "AVMediaType"),
    "libavutil/pixfmt.h": ("", "AVPixelFormat AVColorRange AVColorPrimaries AVColorTransferCharacteristic AVColorSpace AVChromaLocation AVAlphaMode"),
    "libavutil/samplefmt.h": ("", "AVSampleFormat"),
    "libavutil/rational.h": ("AVRational",),
    "libavutil/channel_layout.h": ("AVChannelLayout AVChannelCustom", "AVChannelOrder AVChannel"),
    "libavutil/dict.h": ("AVDictionaryEntry",),
    "libavutil/buffer.h": ("AVBufferRef",),
    "libavutil/log.h": ("AVClass", "AVClassCategory AVClassStateFlags"),
    "libavutil/opt.h": ("AVOption AVOptionArrayDef AVOptionRanges AVOptionRange", "AVOptionType"),
}
FLAGS = {
    "AVStreamDisposition": ("libavformat/avformat.h", r"AV_DISPOSITION_\w+"),
    "AVStreamEvents": ("libavformat/avformat.h", r"AVSTREAM_EVENT_FLAG_\w+"),
    "AVPacketFlags": ("libavcodec/packet.h", r"AV_PKT_FLAG_\w+"),
    "AVChannelMask": ("libavutil/channel_layout.h", r"AV_CH_\w+"),
    "AVOptionFlags": ("libavutil/opt.h", r"AV_OPT_FLAG_\w+"),
}


def clean_c(source):
    # Preserve header line numbers for deep links to the release tag.
    return re.sub(r"/\*.*?\*/|//[^\n]*", lambda m: re.sub(r"[^\n]", " ", m[0]), source, flags=re.S)


def normalize(value):
    return re.sub(r"\s*\*\s*", " *", " ".join(value.split())).replace("* *", "**")


def fields(body, offset, parent, header, inventory):
    result = []
    union = re.compile(r"union\s*\{([^{}]*)\}\s*(\w+)", re.S)
    consumed = 0
    for raw in re.split(r";(?![^{}]*\})", body):
        line = offset + body.count("\n", 0, consumed + len(raw) - len(raw.lstrip()))
        consumed += len(raw) + 1
        decl = raw.strip()
        if not decl:
            continue
        if match := union.fullmatch(decl):
            members, name = match.groups()
            target = f"{parent}.{name}"
            inventory[target] = dict(kind="union", header=header, line=line,
                                     fields=fields(members, line, target, header, inventory))
            result.append(dict(name=name, cType="union", line=line, target=target))
        elif match := re.fullmatch(r"(.*?)\(\*(\w+)\)(\(.*\))", decl, re.S):
            returns, name, args = match.groups()
            result.append(dict(name=name, cType=f"{normalize(returns)} (*){' '.join(args.split())}",
                               line=line, declaration=" ".join(decl.split())))
        else:
            match = re.fullmatch(r"(.*?)(\b\w+(?:\s*,\s*\w+)*)(\[\d+\])?", decl, re.S)
            if not match or not match[1].strip():
                raise ValueError(f"{parent}: {decl}")
            c_type, names, array = match.groups()
            for name in re.split(r"\s*,\s*", names):
                result.append(dict(name=name, cType=normalize(c_type) + (array or ""), line=line))
    return result


def extract(root):
    if (root / "VERSION").read_text().strip() != VERSION:
        raise ValueError(f"Expected a source archive for {VERSION}")
    texts = {path: clean_c((root / path).read_text()) for path in HEADERS}
    inventory = {}
    for path, (structs, *enums) in HEADERS.items():
        source = texts[path]
        for name in structs.split():
            match = re.search(r"typedef struct " + name + r"\s*\{(.*?)\n\} " + name + ";", source, re.S)
            body = re.sub(r"^#define [^\n]*", "", match[1], flags=re.M)
            if "#" in body:
                raise ValueError(f"Unexpected preprocessor directive in {name}")
            line = source.count("\n", 0, match.start()) + 1
            members = fields(body, line, name, path, inventory)
            inventory[name] = dict(kind="struct", header=path, line=line, fields=members)
        for name in (enums[0].split() if enums else []):
            match = re.search(r"enum\s+" + name + r"\s*\{([^{}]*)\}", source)
            if name == "AVClassCategory":
                match = re.search(r"typedef enum\s*\{([^{}]*)\}\s*AVClassCategory;", source)
            if not match:
                raise ValueError(f"Missing {name} in {path}")
            body = match[1]
            aliases = dict(re.findall(r"^#define (AV_CODEC_ID_\w+) (AV_CODEC_ID_\w+)\s*$", body, re.M))
            body = re.sub(r"^#define AV_CODEC_ID_\w+ AV_CODEC_ID_\w+[^\S\n]*$", "", body, flags=re.M)
            if "#" in body:
                raise ValueError(f"Unexpected preprocessor directive in {name}")
            constants = []
            for entry in body.split(","):
                if entry.strip():
                    symbol, _, value = entry.strip().partition("=")
                    if not re.fullmatch(r"\w+", symbol.strip()):
                        raise ValueError(entry)
                    constants.append(dict(name=symbol.strip(), value=" ".join(value.split())))
            constants.extend(dict(name=alias, value=value) for alias, value in aliases.items())
            inventory[name] = dict(kind="bitmask" if name == "AVClassStateFlags" else "enum",
                                   header=path, line=source.count("\n", 0, match.start()) + 1,
                                   constants=constants)
    for name, (path, prefix) in FLAGS.items():
        matches = list(re.finditer(r"^#define\s+(" + prefix + r")\s+([^\n]+)", texts[path], re.M))
        inventory[name] = dict(kind="bitmask", header=path,
                               line=texts[path].count("\n", 0, matches[0].start()) + 1,
                               constants=[dict(name=m[1], value=m[2].strip()) for m in matches])
    return inventory


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "src/data/ffmpeg-internals/inventory.json"
    expected = json.dumps(dict(version=VERSION, types=extract(args.source_dir)), indent=2) + "\n"
    if args.check:
        if output.read_text() != expected:
            raise SystemExit("Explorer inventory differs from the release headers")
    else:
        output.write_text(expected)
