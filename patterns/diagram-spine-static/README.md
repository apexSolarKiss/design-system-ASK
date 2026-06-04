# Pattern // diagram spine (static)

A reusable static-artifact scaffold for system / architecture diagrams whose natural topology is a **vertical, top-to-bottom, horizontally-centered spine** — ontology maps, inheritance chains, one-axis information-architecture diagrams, and similar ASK-family system diagrams that inherit the design-system-ASK visual language.

This is a **Class A** scaffold (system / architecture diagram templates), distinct from the **Class B** project-output artifact pattern. It is the **vertical sibling** of `patterns/diagram-tree/` (the horizontal, top-aligned left→right cascade). Same data grammar, same visual contract, same PNG export, same inheritance discipline — only the placement geometry differs.

## When to use this vs `diagram-tree`

- **`diagram-tree`** — horizontal spine, tree expands **left → right**, vertically top-aligned. Good for broad architecture trees, topology maps, source-of-truth maps.
- **`diagram-spine-static`** (this pattern) — vertical spine, tree expands **top → down**, horizontally centered. Good for inheritance chains and one-axis diagrams that read as a centered trunk.

They are separate patterns with separate placement engines on purpose: a centered top→down spine is not a rotation of the top-aligned horizontal cascade. Pick the one whose geometry matches the diagram; do not fork one to fake the other.

## What this pattern is

A small consumption pattern. Six files:

- `README.md` — this file
- `diagram-spine-static.html` — the shell page (header, canvas, legend, HUD, caption)
- `diagram-spine-static.source.js` — the tree data, expressed as a single `window.TREE_DIAGRAM` literal
- `diagrams-spine-engine.js` — **the vertical placement + pan/zoom engine** (the only file that genuinely differs from `diagram-tree`). It measures against the actual Inter / JetBrains Mono fonts, waiting for them to load first, and adds the CSS `letter-spacing` that `canvas.measureText` ignores, so labels never overflow their boxes. **If you change a `letter-spacing` value in `diagrams.css`, update the matching `LS_*` constant in the engine.**
- `diagrams.css` — diagram-specific style layer (page chrome + SVG nodes/edges) plus two diagram-only token additions (`--node-fill`, `--line-strong`) and the `--diagram-*` legibility tokens; inherits Tier 1 + Tier 2 from the local `colors_and_type.css` mirror. **Byte-identical to `diagram-tree/diagrams.css`** — shared by convention, not a runtime import. The spine engine emits the same CSS classes, and centering is an SVG `text-anchor` attribute the engine sets, so no style change is needed.
- `export-png.js` — 3840×2880 PNG export with header, caveat, legend, and the rendered diagram. **Byte-identical to `diagram-tree/export-png.js`** — it is geometry-agnostic (it serializes the rendered SVG and scales it into the export frame), so the same export serves both patterns.

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific diagram. It is a starting point for downstream diagrams that consume design-system-ASK foundations.

## Placement model

- Root sits at the top, centered.
- Depth increases top→down; each depth is a horizontal band.
- Every node is centered horizontally over its own children.

Consequences:

- A **linear chain** (each node has a single child) collapses to a **straight centered spine** — the natural shape for an inheritance chain.
- A **branching tree** fans out symmetrically around the trunk — the natural shape for an ontology / classification diagram.

Placement is **automatic**. There is no data-authored side or column control in v1. If a future consumer proves auto-placement cannot render its diagram legibly, the smallest possible addition would be an optional `side?: 'left' | 'right' | 'center'` field — deliberately **not** in v1.

### Known v1 limits

The horizontal placement uses leaf-packing with parents centered over children, plus a lightweight guard that keeps a wide parent within its subtree footprint. It does **not** implement full Reingold-Tilford contour merging, so a node whose own label is much wider than its descendants' horizontal span can crowd an adjacent sibling subtree. For linear chains and the shallow, branching trees this scaffold targets, this does not arise. If you hit it, shorten the label, restructure, or raise it as the first refinement candidate.

## How to use it

1. Copy the six files in `patterns/diagram-spine-static/` into your consuming project (typically under `docs/diagrams/` or similar).
2. Sync `colors_and_type.css`, fonts, and any required project-approved assets from design-system-ASK into a local mirror alongside the diagram bundle (for example `./_dsa-tokens/colors_and_type.css` and `./_dsa-tokens/fonts/*.woff2`), pinned to a known upstream commit SHA. The HTML expects `./_dsa-tokens/colors_and_type.css`; adjust the path if your mirror lives elsewhere.
3. Rename `diagram-spine-static.html` and `diagram-spine-static.source.js` to match your project (e.g. `[your-project]_inheritance-spine.html` and `[your-project]_inheritance-spine.source.js`); update the `<script src>` reference in the HTML accordingly.
4. Edit `diagram-spine-static.source.js`: replace the placeholder tree with your project's actual structure. The tree shape is `{ kind, label, note?, tag?, status?, children? }`.
5. Edit `diagram-spine-static.html` chrome: update `.mark`, `.title-block`, `.stamp`, `.caption`, `<title>`, and `<meta name="description">` to your project's values. Do not edit the canvas / HUD / corner-tick structure.
6. Open the resulting HTML directly in a browser, or via static hosting / GitHub Pages. Use the `PNG` button in the HUD to export a 3840×2880 render at the current resolved theme.

## What downstream must replace

- All tree data in `diagram-spine-static.source.js` (root label, section labels, node labels, notes, tags, statuses)
- All chrome strings in `diagram-spine-static.html`: `.mark`, `.title-block .t`, `.title-block .s`, `.stamp`, `.caption`, legend rows
- The `<title>` and `<meta name="description">` tags
- The file names (`diagram-spine-static.html` and `diagram-spine-static.source.js`) if you prefer project-specific names

## What not to edit

- `diagrams-spine-engine.js`, `diagrams.css`, `export-png.js` (the shared engine + style + export — modifications break inheritance)
- The diagram-only token overlays (`--node-fill`, `--line-strong`) and Tier 1 + Tier 2 references inside `diagrams.css`
- The canvas / HUD / corner-tick / glass-panel structure in the HTML
- The light / dark theme model: explicit `data-theme="dark"`, explicit `data-theme="light"`, and `prefers-color-scheme` auto-resolve all need to keep working

## Static vs dynamic inheritance

Static diagram artifacts inherit at generation time and freeze for audit. The Tier 1 + Tier 2 tokens, type families, theme bridges, and font files come from the local mirror (`./_dsa-tokens/colors_and_type.css` plus `./_dsa-tokens/fonts/`). `diagrams.css` in this bundle is the diagram-specific compiled style layer and is not a substitute for the upstream tokens. There is no runtime fetch from the design-system-ASK repo and no Google Fonts CDN dependency. Re-sync the local mirror when upstream tokens or fonts change; bump the `source-vN` / `render-vN` stamp in the HTML each time.

Production code, by contrast, may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The diagram is **illustrative**, not source truth — the consuming repo's prose (`README.md`, `docs/architecture.md`, etc.) remains authoritative. If the diagram and the repo prose diverge, trust the prose and refresh the diagram. Do not modify the repo prose to match a stale diagram.

The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the diagram's content and structure. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream diagram content.

## Class A vs Class B

This is Class A (system / architecture diagram templates), alongside `patterns/diagram-tree/`. Class B (project-output artifact templates) is a separate pattern at `patterns/output-artifact/`. The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
