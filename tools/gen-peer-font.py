#!/usr/bin/env python3
"""gen-peer-font.py -- generate the two font carriers of patterns/diagram-static-peer/.

    python3 tools/gen-peer-font.py            write both carriers
    python3 tools/gen-peer-font.py --check    regenerate in memory; exit 1 if either carrier differs

Run from the repository root. OWNER-ONLY: it needs fontTools and brotli, which nothing else in this
repository uses, and a consumer never runs it: the carriers are vendored with the pattern. The committed
carriers were written with fontTools 4.25.0 and brotli 1.0.9. Another version may subset to other
bytes, which --check then reports as a difference; the version itself is not written into a carrier,
so an unchanged result passes on any machine.

WHAT IT WRITES
  diagrams-static-peer-glyphs.js   per-glyph centering for the supported vertex labels (A-Z, 0-9) at
                                   the plate's display weight, and the advance width of each printable
                                   Basic Latin character at the key's weight. The engine reads both:
                                   the first centers each label's ink on its vertex, the second keeps
                                   the key's wording inside its slot.
  diagrams-static-peer-font.js     Inter subset to printable Basic Latin (U+0020-007E), wght and opsz
                                   axes kept, as a base64 @font-face rule. Only the exporter loads it,
                                   so a standalone SVG resolves its letters and key without the font
                                   files; a page uses the foundation's own @font-face.

Both are pure functions of fonts/InterVariable.woff2, fonts/Inter-OFL.txt and the subsetter's
behavior: no timestamps, sorted keys, fixed rounding. Each records the source font's sha256, so tests/peer-contract.test.mjs fails when the canonical font changes
and the carriers were not regenerated. Subsetting is permitted by the SIL Open Font License 1.1 because
Inter declares no Reserved Font Name; the subset carries the copyright and license notice with it.
"""
import base64
import hashlib
import io
import json
import sys
import tempfile
from pathlib import Path

from fontTools import subset as ft_subset
from fontTools import version as ft_version
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
import brotli

ROOT = Path.cwd()
SOURCE = Path('fonts/InterVariable.woff2')
LICENSE = Path('fonts/Inter-OFL.txt')
OUT = Path('patterns/diagram-static-peer')
GLYPHS = OUT / 'diagrams-static-peer-glyphs.js'
FONT = OUT / 'diagrams-static-peer-font.js'

LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
PRINTABLE = ''.join(chr(c) for c in range(0x20, 0x7F))
LABEL_AXES = {'wght': 200, 'opsz': 32}   # the plate's letters: Display weight; opsz is Inter's maximum
KEY_AXES = {'wght': 400, 'opsz': 32}     # the key's wording
SUBSET_ARGS = ['--unicodes=U+0020-007E', '--layout-features=kern', '--flavor=woff2',
               '--name-IDs=*', '--name-legacy', '--name-languages=*']
COPYRIGHT = 'Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)'


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def instance(src_bytes, axes):
    font = TTFont(io.BytesIO(src_bytes))
    return instancer.instantiateVariableFont(font, dict(axes))


def glyph_data(src_bytes):
    """Label centering (em): dx moves the advance center onto the ink center; dy is the baseline offset
    that puts the ink center on the vertex. Key advances (em) at the key weight."""
    lab = instance(src_bytes, LABEL_AXES)
    gs, cmap, upem = lab.getGlyphSet(), lab.getBestCmap(), lab['head'].unitsPerEm
    labels = {}
    for c in LABELS:
        g = cmap[ord(c)]
        pen = BoundsPen(gs)
        gs[g].draw(pen)
        xmin, ymin, xmax, ymax = pen.bounds
        adv = lab['hmtx'][g][0]
        labels[c] = {'dx': round((adv / 2 - (xmin + xmax) / 2) / upem, 4),
                     'dy': round(((ymin + ymax) / 2) / upem, 4)}
    key = instance(src_bytes, KEY_AXES)
    kcmap, kupem = key.getBestCmap(), key['head'].unitsPerEm
    advances = {c: round(key['hmtx'][kcmap[ord(c)]][0] / kupem, 4) for c in PRINTABLE}
    return labels, advances


def subset_bytes(src_bytes):
    with tempfile.TemporaryDirectory() as d:
        src = Path(d) / 'src.woff2'
        out = Path(d) / 'out.woff2'
        src.write_bytes(src_bytes)
        ft_subset.main([str(src), '--output-file=' + str(out)] + SUBSET_ARGS)
        return out.read_bytes()


def umd(global_name, header, data):
    body = json.dumps(data, indent=2, sort_keys=True, ensure_ascii=True)
    return (header + '\n'
            "(function (root, data) {\n"
            "  if (typeof module === 'object' && module.exports) module.exports = data;\n"
            "  else root." + global_name + " = data;\n"
            "})(typeof self !== 'undefined' ? self : this, " + body + ");\n")


def build():
    src_bytes = (ROOT / SOURCE).read_bytes()
    src_sha = sha256(src_bytes)
    labels, advances = glyph_data(src_bytes)
    sub = subset_bytes(src_bytes)
    source = {'path': str(SOURCE), 'sha256': src_sha}
    tool = 'tools/gen-peer-font.py'

    glyphs = umd('DIAGRAM_PEER_GLYPHS', (
        '/* diagrams-static-peer-glyphs.js -- GENERATED by tools/gen-peer-font.py. DO NOT EDIT.\n'
        '   Regenerate: python3 tools/gen-peer-font.py (repository root).\n'
        '   Measured from ' + str(SOURCE) + ' (sha256 ' + src_sha + ').\n'
        '   labels    the supported vertex labels: dx, dy in em at wght ' + str(LABEL_AXES['wght']) + ', opsz ' + str(LABEL_AXES['opsz']) + '\n'
        '   advances  printable Basic Latin advance widths in em at wght ' + str(KEY_AXES['wght']) + ', opsz ' + str(KEY_AXES['opsz']) + ' (no kerning) */'), {
        'source': source, 'tool': tool,
        'labels': {'axes': LABEL_AXES, 'em': labels},
        'advances': {'axes': KEY_AXES, 'em': advances},
    })

    b64 = base64.b64encode(sub).decode('ascii')
    css = ("@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:block;"
           "src:url(data:font/woff2;base64," + b64 + ") format('woff2');}")
    license_text = (ROOT / LICENSE).read_text(encoding='utf-8')
    font = umd('DIAGRAM_PEER_FONT', (
        '/* diagrams-static-peer-font.js -- GENERATED by tools/gen-peer-font.py. DO NOT EDIT.\n'
        '   Regenerate: python3 tools/gen-peer-font.py (repository root).\n'
        '   Inter, subset to printable Basic Latin (U+0020-007E) with the wght and opsz axes kept, from\n'
        '   ' + str(SOURCE) + ' (sha256 ' + src_sha + '). ' + COPYRIGHT + '.\n'
        '   SIL Open Font License 1.1: the full text is in license below and in ' + str(LICENSE) + '.\n'
        '   Subsetting is permitted because Inter declares no Reserved Font Name. Loaded only by\n'
        '   export-peer.mjs, which embeds css in each standalone SVG. */'), {
        'source': source, 'tool': tool,
        'subset': {'unicodes': 'U+0020-007E', 'args': SUBSET_ARGS, 'bytes': len(sub), 'sha256': sha256(sub)},
        'family': 'Inter', 'copyright': COPYRIGHT, 'license': license_text, 'css': css,
    })
    return {GLYPHS: glyphs, FONT: font}


def main(argv):
    check = '--check' in argv
    unknown = [a for a in argv if a != '--check']
    if unknown:
        print('usage: gen-peer-font.py [--check]', file=sys.stderr)
        return 2
    out = build()
    report = {}
    differ = []
    for path, text in out.items():
        data = text.encode('utf-8')
        report[str(path)] = {'bytes': len(data), 'sha256': sha256(data)}
        if check:
            on_disk = (ROOT / path).read_bytes() if (ROOT / path).exists() else None
            if on_disk != data:
                differ.append(str(path))
        else:
            (ROOT / path).write_bytes(data)
    versions = {'fontTools': ft_version, 'brotli': brotli.__version__}
    print(json.dumps({'versions': versions, 'check': report, 'differing': differ} if check else {'versions': versions, 'written': report}, indent=2))
    return 1 if differ else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
