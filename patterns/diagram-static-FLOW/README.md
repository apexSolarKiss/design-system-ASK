# Pattern // diagram-static-FLOW

A reusable static-artifact scaffold for diagrams whose natural topology is a **convergence flow** — several grouped source inputs that converge into a resolved node, a process spine that may fan out into parallel objects and reconverge, a lateral relation rail, secondary cross-stage evaluation edges, and an optional return edge. This is the topology the tree and sequence scaffolds cannot express without distorting it.

This is a **Class A static** diagram scaffold (system / architecture diagram templates), distinct from the **Class B** project-output artifact pattern. It is the **fourth static sibling** alongside `patterns/diagram-static-H/` (horizontal cascade), `patterns/diagram-static-V/` (vertical spine), and `patterns/diagram-static-SEQ/` (ordered sequence). Same public contract, same theme model, same PNG export, same inheritance discipline — only the placement geometry and a small set of edge styles differ. It is **state-free** (structural), like the other static siblings; the stateful surface is `patterns/diagram-interactive-spine/`.

## When to use this vs `diagram-static-H` / `-V` / `-SEQ`

- **`diagram-static-H`** — horizontal *tree*: parent→child hierarchy, left → right.
- **`diagram-static-V`** — vertical *tree*: parent→child hierarchy, centered top→down.
- **`diagram-static-SEQ`** — vertical *sequence*: ordered steps joined by arrows; succession, not hierarchy.
- **`diagram-static-FLOW`** (this pattern) — *convergence flow*: many-to-one convergence, a process spine with parallel fan-out and reconvergence, a lateral relation rail, and secondary evaluation edges. The relation is neither pure hierarchy nor a single linear chain.

A convergence flow forced into a tree reads as a hierarchy it is not; forced into a sequence it loses its parallelism and its convergence. That misfit is what this pattern removes. Pick the geometry that matches the diagram; do not fork one scaffold to fake another.

## What this pattern is

A small consumption pattern. Six files:

- `README.md` — this file
- `diagram-static-FLOW.html` — the shell page (header, canvas, legend, HUD, caption)
- `diagram-static-FLOW.source.js` — the flow data, expressed as a single `window.FLOW_DIAGRAM` literal (a generic, domain-free fixture that exercises every primitive)
- `diagrams-static-FLOW-engine.js` — **the convergence-flow placement + pan/zoom engine** (the file that genuinely differs from the siblings). Same public contract `window.DIAGRAMS.render(DATA)`, same font-load gate, same pan/zoom. It measures against the actual Inter / JetBrains Mono fonts, waiting for them to load, and adds the CSS `letter-spacing` that `canvas.measureText` ignores, so labels never overflow.
- `diagrams.css` — the diagram-specific style layer. **A superset of the byte-identical `diagram-static-H` / `-V` / `-SEQ` copy:** the shared base is unchanged, and a clearly-marked *Convergence-flow additions* block at the end adds the flow-only classes (`.flow-group`, `.flow-tag`, `.edge-rail` / `.edge-rail-cap`, `.edge-eval`, `.edge-return`). No new color — every stroke is theme-driven; the new dash patterns differ from the held/legacy dashes so a relation reads as a relation, not a state. (Folding this block into the shared base and re-syncing the three sibling copies to restore four-way byte-identity is an optional follow-up; it is left out here to keep the change contained to this directory.)
- `export-png.js` — 3840×2880 PNG export. **Byte-identical to the sibling copies** — it is geometry-agnostic (it serializes the rendered SVG and scales it into the export frame), so the same export serves this pattern unchanged.

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a general-purpose flowchart library. It renders the convergence-flow topology class and nothing more.

## Topology model

The engine reads a declarative `window.FLOW_DIAGRAM` and places, top to bottom on a single central axis:

1. **Top band (optional)** — a row of small boxes naming attributes shared across the diagram, with a mono tag.
2. **Carrier + lateral rail (optional)** — a carrier box in a left lane, joined to the source field by a horizontal **rail** (diamond end-caps, a tag) that spans the whole field. The carrier participates *through* the rail; it is not a peer source branch.
3. **Source field** — a labelled frame grouping the source nodes.
4. **Convergence** — the source nodes converge many-to-one into a single resolved node (a fan of lines to one arrowhead).
5. **Process spine** — an ordered, centered, arrow-joined chain. A row may be a single node or a `{ parallel: [...] }` row that **fans out** from the previous node and **reconverges** into the next.
6. **Secondary evaluation edges** — dashed edges routed through a right gutter, from a source (or earlier node) to a later node — a source operating a second time to *evaluate* a realized result. These are evaluation edges, **not** feedback: they do not feed the result back upstream.
7. **Return edge (optional)** — a dotted edge routed through a left gutter from a late node back to the carrier (e.g. an output later reused as a carrier).

Data grammar (see the engine header for the full contract):

```
band?:   { tag?, items: [ '<label>', … ] }
carrier?:{ label, note?, railTag? }
field:   { tag?, nodes: [ { id?, label, note?, status? }, … ] }
converge:{ id?, label, note?, status? }
spine:   [ { id?, label, note?, status? } | { parallel: [ { … }, … ] } ]
evalEdges?:  [ { from: '<id>', to: '<id>' }, … ]
returnEdge?: { from: '<id>', tag? }
```

`status` is `'earned'` (default) `| 'held' | 'legacy'`, honored on every box and on spine connectors. ids default to `f0..fN` (field), `converge`, `s0..sN` (spine, `s0b0..` for branches), and `carrier`; `evalEdges` / `returnEdge` reference these ids. Arrowheads are explicit `<path>` triangles (not SVG `marker`s), which rasterize reliably through the PNG export path.

## How to use it

1. Copy the six files in `patterns/diagram-static-FLOW/` into your consuming project (typically under `docs/diagrams/`).
2. Sync `colors_and_type.css`, fonts, and any required project-approved assets from design-system-ASK into a local mirror alongside the bundle (for example `./_dsa-tokens/colors_and_type.css` and `./_dsa-tokens/fonts/*.woff2`), pinned to a known upstream commit SHA. The HTML expects `./_dsa-tokens/colors_and_type.css`; adjust the path if your mirror lives elsewhere.
3. Rename `diagram-static-FLOW.html` and `diagram-static-FLOW.source.js` to match your project (e.g. `[your-project]_<diagram>-flow.html` / `.source.js`); update the `<script src>` reference in the HTML accordingly.
4. Edit `diagram-static-FLOW.source.js`: replace the generic fixture with your project's actual convergence flow.
5. Edit `diagram-static-FLOW.html` chrome: update `.mark`, `.title-block`, `.stamp`, `.caption`, `<title>`, and `<meta name="description">`. Do not edit the canvas / HUD / corner-tick structure.
6. Open the resulting HTML in a browser or via static hosting / GitHub Pages. Use the `PNG` button in the HUD to export a 3840×2880 render at the current resolved theme.

## PNG export artifact naming

The `PNG` button exports at the page's resolved theme, and the exported filename carries that theme — `<base>_source-vN_render-vN-light.png` or `…-dark.png` (theme resolved by the same precedence as the CSS: an explicit `data-theme` on `<html>` wins, otherwise the OS `prefers-color-scheme`). A repo-committed canonical raster may keep a semantic, unsuffixed name; if both variants are committed, the `-light` / `-dark` suffixes are required to tell them apart.

## What downstream must replace

- All flow data in `diagram-static-FLOW.source.js`
- All chrome strings in `diagram-static-FLOW.html`: `.mark`, `.title-block .t`, `.title-block .s`, `.stamp`, `.caption`, legend rows
- The `<title>` and `<meta name="description">` tags
- The file names (if you prefer project-specific names)

## What not to edit

- `diagrams-static-FLOW-engine.js`, `export-png.js`, and the **shared base** of `diagrams.css` (the convergence-flow additions block at the end is the only flow-specific style surface; modifying the shared base breaks inheritance)
- The diagram-only token overlays (`--node-fill`, `--line-strong`) and Tier 1 + Tier 2 references inside `diagrams.css`
- The canvas / HUD / corner-tick / glass-panel structure in the HTML
- The light / dark theme model: explicit `data-theme="dark"`, explicit `data-theme="light"`, and `prefers-color-scheme` auto-resolve all need to keep working

## Static vs dynamic inheritance

Static diagram artifacts inherit at generation time and freeze for audit. The Tier 1 + Tier 2 tokens, type families, theme bridges, and font files come from the local mirror (`./_dsa-tokens/colors_and_type.css` plus `./_dsa-tokens/fonts/`). `diagrams.css` is the diagram-specific compiled style layer and is not a substitute for the upstream tokens. There is no runtime fetch from design-system-ASK and no font CDN dependency. Re-sync the local mirror when upstream tokens or fonts change; bump the `source-vN` / `render-vN` stamp each time. Production code may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The diagram is **illustrative**, not source truth — the consuming repo's prose remains authoritative. If the diagram and the prose diverge, trust the prose and refresh the diagram. The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the diagram's content and structure. Hosting this scaffold here does not make this repo the owner of downstream diagram content.

## Class A vs Class B

This is Class A (system / architecture diagram templates), alongside `patterns/diagram-static-H/`, `-V/`, and `-SEQ/`. Class B (project-output artifact templates) is a separate pattern at `patterns/output-artifact/`. The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
