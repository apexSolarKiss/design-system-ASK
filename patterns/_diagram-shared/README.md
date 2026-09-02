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
lets the no-wrap case prove geometric identity rather than merely look unchanged.

## What the helper does not own — and the trap that follows

The helper returns **added** height (`height` is 0 when a run does not wrap). The consuming engine
adds that to its own box, which means **the engine, not the helper, owns where a wrapped run is
anchored**.

That split has one sharp edge, and every consumer hits it: once a box has grown, a run anchored to
the box's **bottom or centre** must subtract its own growth. Anchoring the *first* baseline to a
grown edge deposits the new height as dead space at one end and pushes the run's remaining lines
out the other. A run anchored to the box **top** needs no correction, because it grows in the same
direction the box did.

The failure is quiet: nothing collides, nothing leaves the viewBox, and the text wraps correctly —
it simply renders outside its own box. A containment assertion is the only check that sees it.
