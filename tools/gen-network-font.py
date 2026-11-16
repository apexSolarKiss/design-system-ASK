#!/usr/bin/env python3
"""gen-network-font.py -- generate the two font carriers of patterns/diagram-static-network/.

    python3 tools/gen-network-font.py            write both carriers
    python3 tools/gen-network-font.py --check    regenerate in memory; exit 1 if either carrier differs

Run from the repository root. OWNER-ONLY, as tools/gen-peer-font.py is: it needs fontTools and brotli,
which nothing else in this repository uses, and a consumer never runs it: the carriers are vendored with
the pattern. The committed carriers were written with fontTools 4.25.0 and brotli 1.0.9. Another version
may subset to other bytes, which --check then reports as a difference; the version itself is not written
into a carrier, so an unchanged result passes on any machine.

WHAT IT WRITES
  diagrams-static-network-glyphs.js   per face, the advance width of every supported character at the
                                      notation's weight, its ink's bounds [xMin, yMin, xMax, yMax]
                                      (rounded outward, so a label box built from them never understates
                                      the ink, an italic overhang included), and the face's ascent and
                                      descent: roman and
                                      italic Inter, and JetBrains Mono for the one sign Inter lacks. The
                                      italic advances are the face's character variant cv05 ("lower-case
                                      L with tail"), which every italic run sets, so an italic l is never
                                      read as a slash. The summation sign's advance at its own weight.
                                      The engine lays out notation from these numbers and nothing else.
  diagrams-static-network-font.js     three subsets as base64 @font-face rules: Inter roman and Inter
                                      italic to the supported characters, wght and opsz axes kept, and
                                      JetBrains Mono to the set-membership sign. In the italic subset the
                                      character map sends l to the tailed glyph, so a standalone file shows
                                      it with no font feature support; the tool reopens the subset and
                                      fails unless every Unicode character map does. No layout feature
                                      is kept, kerning included, so the browser draws the advances the
                                      carrier records. The rules declare private family names that carry
                                      the subset's own hash (EXPORT_SANS, EXPORT_MONO plus 12 hex digits),
                                      so an exported file inlined on a page never replaces the page's own
                                      Inter or JetBrains Mono, nor another generation's subsets. Each with its copyright and the SIL
                                      Open Font License text. Only the exporter loads it; a page uses the
                                      foundation's own @font-face, with font-feature-settings 'cv05'.

Both are pure functions of the three fonts, their two license files and the subsetter's behavior: no
timestamps, sorted keys, fixed rounding. Each records every source font's sha256, so
tests/network-contract.test.mjs fails when a canonical font changes and the carriers were not
regenerated. Subsetting and remapping are permitted by the SIL Open Font License 1.1 because neither Inter
nor JetBrains Mono declares a Reserved Font Name; each subset carries its copyright and license with it.
"""
import base64
import hashlib
import io
import json
import math
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
ROMAN = Path('fonts/InterVariable.woff2')
ITALIC = Path('fonts/InterVariable-Italic.woff2')
MONO = Path('fonts/JetBrainsMono.woff2')
INTER_LICENSE = Path('fonts/Inter-OFL.txt')
MONO_LICENSE = Path('fonts/JetBrainsMono-OFL.txt')
OUT = Path('patterns/diagram-static-network')
GLYPHS = OUT / 'diagrams-static-network-glyphs.js'
FONT = OUT / 'diagrams-static-network-font.js'

# The supported characters. Roman and italic: printable Basic Latin, the en dash of a page range, the
# minus sign, the partial-derivative sign and the summation sign. Mono: the set-membership sign only.
PRINTABLE = ''.join(chr(c) for c in range(0x20, 0x7F))
TEXT = PRINTABLE + '–−∂Σ'
MEMBER = '∈'
AXES = {'wght': 400, 'opsz': 14}          # the notation, labels, titles and credit
SIGMA_AXES = {'wght': 300, 'opsz': 14}    # the summation sign, set lighter at its larger size
MONO_AXES = {'wght': 400}
# The embedded subsets' family names: private, so an export inlined on a page leaves the page's own
# Inter and JetBrains Mono, and its italic l, untouched, and versioned by the subsets' own sha256, so two
# generations inlined on one page keep their own faces. The exporter names them first in each family list.
EXPORT_SANS = 'dsn-inter'
EXPORT_MONO = 'dsn-mono'
TAIL_FEATURE = 'cv05'
INTER_COPYRIGHT = 'Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)'
MONO_COPYRIGHT = 'Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)'


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def unicodes(chars):
    return ','.join('U+%04X' % ord(c) for c in chars)


def instance(src_bytes, axes):
    font = TTFont(io.BytesIO(src_bytes))
    have = {a.axisTag for a in font['fvar'].axes}
    return instancer.instantiateVariableFont(font, {k: v for k, v in axes.items() if k in have})


def tail_glyph(font):
    """The glyph cv05 substitutes for l, read from the font's own GSUB: never assumed by name."""
    base = font.getBestCmap()[ord('l')]
    gsub = font['GSUB'].table
    for fr in gsub.FeatureList.FeatureRecord:
        if fr.FeatureTag != TAIL_FEATURE:
            continue
        for li in fr.Feature.LookupListIndex:
            for st in gsub.LookupList.Lookup[li].SubTable:
                mapping = getattr(st, 'mapping', None)
                if mapping and base in mapping:
                    return mapping[base]
    raise SystemExit('the italic font has no ' + TAIL_FEATURE + ' substitution for l')


def metrics(font, chars, remap=None):
    """Per character: the advance (em), and the ink's bounds [xMin, yMin, xMax, yMax] (em, the minima
    rounded down and the maxima up, so a label box built from them never understates the ink, an italic
    overhang past the advance included; a space has none). The face's typographic ascent and descent."""
    cmap, upem, gs = font.getBestCmap(), font['head'].unitsPerEm, font.getGlyphSet()
    em, ink = {}, {}
    for c in chars:
        g = (remap or {}).get(c) or cmap.get(ord(c))
        if g is None:
            raise SystemExit('U+%04X is not in the font' % ord(c))
        em[c] = round(font['hmtx'][g][0] / upem, 4)
        pen = BoundsPen(gs)
        gs[g].draw(pen)
        if pen.bounds:
            lo = lambda v: math.floor(v / upem * 10000) / 10000
            hi = lambda v: math.ceil(v / upem * 10000) / 10000
            ink[c] = [lo(pen.bounds[0]), lo(pen.bounds[1]), hi(pen.bounds[2]), hi(pen.bounds[3])]
    os2 = font['OS/2']
    return {'em': em, 'ink': ink, 'ascent': round(os2.sTypoAscender / upem, 4), 'descent': round(-os2.sTypoDescender / upem, 4)}


def subset_bytes(src_bytes, chars, extra_glyphs=()):
    args = ['--unicodes=' + unicodes(chars), '--layout-features=', '--flavor=woff2',     # no layout feature, kerning included
            '--name-IDs=*', '--name-legacy', '--name-languages=*']
    if extra_glyphs:
        # keep the extra glyphs, and every glyph's name, so the remap below can address the tailed l
        args += ['--glyphs=' + ','.join(extra_glyphs), '--glyph-names']
    with tempfile.TemporaryDirectory() as d:
        src = Path(d) / 'src.woff2'
        out = Path(d) / 'out.woff2'
        src.write_bytes(src_bytes)
        ft_subset.main([str(src), '--output-file=' + str(out)] + args)
        return out.read_bytes(), args


def remap_tail(woff2, tail):
    """Point every cmap subtable's l at the tailed glyph, so the subset draws it unconditionally."""
    font = TTFont(io.BytesIO(woff2), recalcTimestamp=False)   # no save-time timestamp: the carrier stays reproducible
    for table in font['cmap'].tables:
        if table.isUnicode() and ord('l') in table.cmap:
            table.cmap[ord('l')] = tail
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    out = buf.getvalue()
    # Fail closed: reopen the subset that will ship and require every Unicode map to send l to the tail.
    check = TTFont(io.BytesIO(out))
    maps = [t for t in check['cmap'].tables if t.isUnicode()]
    if not maps or any(t.cmap.get(ord('l')) != tail for t in maps) or check.getBestCmap().get(ord('l')) != tail:
        raise SystemExit('the italic subset does not map l to ' + tail)
    return out


def umd(global_name, header, data):
    body = json.dumps(data, indent=2, sort_keys=True, ensure_ascii=True)
    return (header + '\n'
            "(function (root, data) {\n"
            "  if (typeof module === 'object' && module.exports) module.exports = data;\n"
            "  else root." + global_name + " = data;\n"
            "})(typeof self !== 'undefined' ? self : this, " + body + ");\n")


def face_rule(family, style, weight, b64):
    return ("@font-face{font-family:'" + family + "';font-style:" + style + ";font-weight:" + weight +
            ";font-display:block;src:url(data:font/woff2;base64," + b64 + ") format('woff2');}")


def build():
    roman_src, italic_src, mono_src = ((ROOT / p).read_bytes() for p in (ROMAN, ITALIC, MONO))
    sources = {'roman': {'path': str(ROMAN), 'sha256': sha256(roman_src)},
               'italic': {'path': str(ITALIC), 'sha256': sha256(italic_src)},
               'mono': {'path': str(MONO), 'sha256': sha256(mono_src)}}
    tool = 'tools/gen-network-font.py'

    roman = instance(roman_src, AXES)
    italic = instance(italic_src, AXES)
    tail = tail_glyph(italic)
    sigma = instance(roman_src, SIGMA_AXES)
    mono = instance(mono_src, MONO_AXES)
    faces = {
        'roman': dict(metrics(roman, TEXT), axes=AXES),
        'italic': dict(metrics(italic, TEXT, {'l': tail}), axes=AXES, feature=TAIL_FEATURE, tail=tail),
        'mono': dict(metrics(mono, MEMBER), axes=MONO_AXES),
        'sigma': dict(metrics(sigma, 'Σ'), axes=SIGMA_AXES),
    }
    glyphs = umd('DIAGRAM_NETWORK_GLYPHS', (
        '/* diagrams-static-network-glyphs.js -- GENERATED by tools/gen-network-font.py. DO NOT EDIT.\n'
        '   Regenerate: python3 tools/gen-network-font.py (repository root).\n'
        '   Advance widths, ink bounds [xMin, yMin, xMax, yMax] (rounded outward), ascent and descent in em, measured from ' + str(ROMAN) + ', ' + str(ITALIC) + '\n'
        '   (italic with ' + TAIL_FEATURE + ', its l the tailed ' + tail + ') and ' + str(MONO) + '; each source is recorded\n'
        '   with its sha256 below. No kerning. */'), {
        'sources': sources, 'tool': tool, 'supported': {'text': TEXT, 'member': MEMBER}, 'faces': faces,
    })

    inter_license = (ROOT / INTER_LICENSE).read_text(encoding='utf-8')
    mono_license = (ROOT / MONO_LICENSE).read_text(encoding='utf-8')
    roman_sub, roman_args = subset_bytes(roman_src, TEXT)
    italic_sub, italic_args = subset_bytes(italic_src, TEXT, (tail,))
    italic_sub = remap_tail(italic_sub, tail)
    mono_sub, mono_args = subset_bytes(mono_src, MEMBER)
    sans_family = EXPORT_SANS + '-' + sha256(roman_sub + italic_sub)[:12]
    mono_family = EXPORT_MONO + '-' + sha256(mono_sub)[:12]
    css = (face_rule(sans_family, 'normal', '100 900', base64.b64encode(roman_sub).decode('ascii')) +
           face_rule(sans_family, 'italic', '100 900', base64.b64encode(italic_sub).decode('ascii')) +
           face_rule(mono_family, 'normal', '100 800', base64.b64encode(mono_sub).decode('ascii')))
    font = umd('DIAGRAM_NETWORK_FONT', (
        '/* diagrams-static-network-font.js -- GENERATED by tools/gen-network-font.py. DO NOT EDIT.\n'
        '   Regenerate: python3 tools/gen-network-font.py (repository root).\n'
        '   Inter roman and italic subset to the supported characters, wght and opsz axes kept, the italic l\n'
        '   mapped to its tailed glyph (' + tail + '); JetBrains Mono subset to U+2208. ' + INTER_COPYRIGHT + '.\n'
        '   ' + MONO_COPYRIGHT + '. SIL Open Font License 1.1: the full texts are in licenses below and in\n'
        '   ' + str(INTER_LICENSE) + ' and ' + str(MONO_LICENSE) + '. Subsetting and remapping are permitted because\n'
        '   neither family declares a Reserved Font Name. No layout feature is kept. The rules declare the private families\n'
        '   ' + sans_family + ' and ' + mono_family + ', so an inlined export never replaces a page\'s own fonts. Loaded only by\n'
        '   export-network.mjs,\n'
        '   which embeds css in each standalone SVG and names these families first. */'), {
        'sources': sources, 'tool': tool,
        'subsets': {
            'roman': {'args': roman_args, 'bytes': len(roman_sub), 'sha256': sha256(roman_sub)},
            'italic': {'args': italic_args, 'bytes': len(italic_sub), 'sha256': sha256(italic_sub), 'tail': tail},
            'mono': {'args': mono_args, 'bytes': len(mono_sub), 'sha256': sha256(mono_sub)},
        },
        'families': {'sans': sans_family, 'mono': mono_family},
        'copyright': {'inter': INTER_COPYRIGHT, 'mono': MONO_COPYRIGHT},
        'licenses': {'inter': inter_license, 'mono': mono_license},
        'css': css,
    })
    return {GLYPHS: glyphs, FONT: font}


def main(argv):
    check = '--check' in argv
    unknown = [a for a in argv if a != '--check']
    if unknown:
        print('usage: gen-network-font.py [--check]', file=sys.stderr)
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
            (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
            (ROOT / path).write_bytes(data)
    versions = {'fontTools': ft_version, 'brotli': brotli.__version__}
    print(json.dumps({'versions': versions, 'check': report, 'differing': differ} if check else {'versions': versions, 'written': report}, indent=2))
    return 1 if differ else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
