# `patterns/_diagram-shared/`

Canonical source plane for text-layout logic that more than one static diagram engine
consumes. Files here are **authored once and mirrored out** by
[`tools/sync-diagram-shared.mjs`](../../tools/sync-diagram-shared.mjs).

## The plane confers no authority

`_diagram-shared` is a location, not a mandate. **Each member declares its own explicit
target set**, and that declaration — not this folder's name — decides which patterns
consume it. A future member may serve a different set, or one pattern only.

This matters because the owner's Class A static family is **four** patterns —
`diagram-static-H`, `diagram-static-V`, `diagram-static-SEQ` **and `diagram-static-FLOW`** —
and FLOW carries a different grammar. A member that governs three of them must say so, or
a later maintainer reads FLOW's absence as partial vendoring and "completes" it.

## Current members

| Member | Target set | Excluded |
| --- | --- | --- |
| `diagrams-text-layout.js` | `diagram-static-H` · `diagram-static-V` · `diagram-static-SEQ` | `diagram-static-FLOW` · `diagram-interactive-spine` |

## Canonical and mirrors

```text
canonical   patterns/_diagram-shared/diagrams-text-layout.js
mirrors     patterns/diagram-static-{H,V,SEQ}/diagrams-text-layout.js
```

A mirror is **byte-identical** to its canonical and is a generated artifact.

```bash
node tools/sync-diagram-shared.mjs          # emit
node tools/sync-diagram-shared.mjs --check  # exit 1 on any missing or divergent mirror
```

**Never hand-edit a mirror.** The mirror exists so a consumer vendors one self-contained
bundle directory rather than reaching across the repo; `--check` exists so a hand edit
fails loudly instead of surviving as a silent fork. Edit the canonical and re-emit.

## What a member owns, and what it must not

`diagrams-text-layout.js` owns exact measurement, role metrics, cap application,
deterministic line breaking, wrapped height and tspan emission.

It does **not** own source grammar, topology, placement, connector geometry or the final
SVG envelope. Those stay with each engine, because H, V and SEQ have genuinely different
geometry contracts — a horizontal top-aligned cascade, a vertical band layout, and a
linear sequence — and folding them together would produce a fourth engine wearing three
names.

**Measurement parity is the first gate.** A string that does not wrap must measure exactly
as it did before this plane existed, letter-spacing compensation included. That is what
lets a no-wrap page prove geometric identity rather than merely look unchanged — and it
held on every page of the measured fleet.

**It is not a blanket render-neutrality guarantee, and two V tree shapes change with no
wrapping at all.** Both are corrections to notes V measured and never drew:

```text
V section with a note   the note no longer inflates band WIDTH   (base: ~+434px for
                        text that was never drawn)
V group with a note     the note is now DRAWN, and the group label takes the paired
                        offset — base selected BOX_H_NOTE for it and drew nothing
```

Nothing in the current fleet authors either shape, so no existing page moves. A downstream
V diagram that *does* author one will render differently after re-vendoring, and should:
the published grammar permits `note` on a group and on a section, and the old behaviour
spent geometry on invisible text. Re-vendor is render-neutral for every other tree shape.

## What the helper does not own — and the trap that follows

The helper returns **added** height (`addedHeight` is 0 when a run does not wrap). The consuming engine
adds that to its own box, which means **the engine, not the helper, owns where a wrapped run is
anchored**.

That split has one sharp edge, and every consumer hits it: once a box has grown, a run anchored to
the box's **bottom or centre** must subtract its own growth. Anchoring the *first* baseline to a
grown edge deposits the new height as dead space at one end and pushes the run's remaining lines
out the other. A run anchored to the box **top** needs no correction, because it grows in the same
direction the box did.

The failure is quiet: nothing collides, nothing leaves the viewBox, and the text wraps correctly —
it simply renders outside its own box. A containment assertion is the only check that sees it.

## What the helper owns

```text
line breaking    delimiter matching, longest-first, and force-break
measurement      wrapped width and height for a given role cap
role metrics     per-role cap, line height, and the has-note predicate
tspan emission   the emitted text structure for a wrapped label or note
```

**An engine that keeps a private copy of any of those is the divergence this file exists to
remove.** That is not a style preference, and the historical case is measured rather than recalled.
V's local predicate counted a note on **any** kind while V drew one on neither a section nor a
group:

```text
base V, note on a GROUP     BOX_H_NOTE selected · box 26 -> 44px · +18px height · +511px width
base V, note on a SECTION   no height change at all — a section takes SECTION_H / SECTION_H_TAG,
                            never BOX_H_NOTE — but +434px of band WIDTH
both                        the note is never drawn
```

Two different symptoms from one drifted predicate. It is now resolved here and is **target-aware**:
H and V draw a section as label + rule + tag and never its note, while SEQ has no section branch at
all, so a `kind: 'section'` record there is an ordinary node that *does* render its note.

Engines keep what is genuinely theirs: source grammar, topology, base box geometry, placement,
anchoring, connectors, the final envelope — and fonts and letter-spacing, which are CSS-derived
and belong with the stylesheet.

## The break contract

```text
authored \n                 hard break, always
delimiters                  matched LONGEST-FIRST — // before / — breaking AFTER the delimiter
whitespace                  a break opportunity
a token still over its cap  force-broken, and only then
```

A visual line boundary does not corrupt an identifier: no source character is inserted, removed,
reordered or normalized. The helper returns two parallel forms — `segments`, the exact partition
where `segments.join('') === source` proves exact runtime string equality, and `lines`, the rendered payload,
which drops only trailing whitespace at a boundary so a `text-anchor: middle` run centres on its
glyphs. Keeping them apart is what lets the preservation gate assert exact identity without
pushing stray whitespace into the DOM.

That is a claim about the runtime JavaScript string, not about file bytes: two different literal
spellings or encodings can produce the same runtime string. Source-file byte preservation is a
separate fact, established because every `*.source.js` path is outside this change.
