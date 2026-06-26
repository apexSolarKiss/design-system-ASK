# Pattern // diagram-static-V

A reusable static-artifact scaffold for system / architecture diagrams whose natural topology is a **vertical, top-to-bottom, horizontally-centered spine** — ontology maps, inheritance chains, one-axis information-architecture diagrams, and similar ASK-family system diagrams that inherit the design-system-ASK visual language. **`diagram-static-V`** is the **vertical** Class A static pattern: a top→down centered spine.

This is a **Class A static** diagram scaffold (system / architecture diagram templates), distinct from the **Class B** project-output artifact pattern. Its static siblings are `patterns/diagram-static-H/` (the horizontal, top-aligned left→right cascade — also a tree), `patterns/diagram-static-SEQ/` (ordered arrowed sequence — succession, not hierarchy), and `patterns/diagram-static-FLOW/` (convergence flow — many sources converging into a resolved spec, realized, evaluated, governed, fed back). H / V / SEQ share the existing tree/sequence data grammar and export contract. FLOW is a distinct convergence-flow grammar (one shared source model, two render modes), but shares the same visual contract, PNG export discipline, and inheritance-by-reference posture.

> **`diagram-static-V` is the *static* vertical pattern.** A future **interactive** IA spine is a *different artifact class* — also vertical, but not a static Class A scaffold. It is the separately-named `diagram-interactive-spine` (built — a landed Class A interactive scaffold) and must **not** be called `diagram-static-V-interactive`. That is exactly why the taxonomy encodes static-vs-interactive, not just H/V.

## When to use this vs `diagram-static-H` / `diagram-static-SEQ`

- **`diagram-static-H`** — horizontal spine, tree expands **left → right**, vertically top-aligned. Good for broad architecture trees, topology maps, source-of-truth maps.
- **`diagram-static-V`** (this pattern) — vertical spine, tree expands **top → down**, horizontally centered. Good for inheritance chains and one-axis diagrams that read as a centered trunk.
- **`diagram-static-SEQ`** — ordered **sequence** of steps joined by arrows, left-aligned. The relation is succession, not hierarchy — pipelines, workflows, lifecycles, numbered processes.

They are separate patterns with separate placement engines on purpose: a centered top→down spine is not a rotation of the top-aligned horizontal cascade, and a sequence is not a tree. Pick the one whose geometry matches the diagram; do not fork one to fake the other.

## What this pattern is

A small consumption pattern. Six files:

- `README.md` — this file
- `diagram-static-V.html` — the shell page (header, canvas, legend, HUD, caption)
- `diagram-static-V.source.js` — the tree data, expressed as a single `window.TREE_DIAGRAM` literal
- `diagrams-static-V-engine.js` — **the vertical placement + pan/zoom engine** (the only file that genuinely differs from `diagram-static-H`). It measures against the actual Inter / JetBrains Mono fonts, waiting for them to load first, and adds the CSS `letter-spacing` that `canvas.measureText` ignores, so labels never overflow their boxes. **If you change a `letter-spacing` value in `diagrams.css`, update the matching `LS_*` constant in the engine.**
- `diagrams.css` — diagram-specific style layer (page chrome + SVG nodes/edges) plus two diagram-only token additions (`--node-fill`, `--line-strong`) and the `--diagram-*` legibility tokens; inherits Tier 1 + Tier 2 from the local `colors_and_type.css` mirror. **Byte-identical to the `diagram-static-H` / `diagram-static-SEQ` copies** — shared by convention, not a runtime import. The spine engine emits the same CSS classes, and centering is an SVG `text-anchor` attribute the engine sets, so no style change is needed.
- `export-png.js` — 3840×2880 PNG export with header, caveat, legend, and the rendered diagram. **Byte-identical to the `diagram-static-H` / `diagram-static-SEQ` copies** — it is geometry-agnostic (it serializes the rendered SVG and scales it into the export frame), so the same export serves all three patterns.

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

1. Copy the six files in `patterns/diagram-static-V/` into your consuming project (typically under `docs/diagrams/` or similar).
2. Sync `colors_and_type.css`, fonts, and any required project-approved assets from design-system-ASK into a local mirror alongside the diagram bundle (for example `./_dsa-tokens/colors_and_type.css` and `./_dsa-tokens/fonts/*.woff2`), pinned to a known upstream commit SHA. The HTML expects `./_dsa-tokens/colors_and_type.css`; adjust the path if your mirror lives elsewhere.
3. Rename `diagram-static-V.html` and `diagram-static-V.source.js` to match your project (e.g. `[your-project]_inheritance-spine.html` and `[your-project]_inheritance-spine.source.js`); update the `<script src>` reference in the HTML accordingly.
4. Edit `diagram-static-V.source.js`: replace the placeholder tree with your project's actual structure. The tree shape is `{ kind, label, note?, tag?, status?, children? }`.
5. Edit `diagram-static-V.html` chrome: update `.mark`, `.title-block`, `.stamp`, `.caption`, `<title>`, and `<meta name="description">` to your project's values. Do not edit the canvas / HUD / corner-tick structure.
6. Open the resulting HTML directly in a browser, or via static hosting / GitHub Pages. Use the `PNG page` button in the HUD to export a 3840×2880 chromed render at the current resolved theme, or `PNG diagram` for the canvas-only export (see PNG export below).

## PNG export

### The two exports

The HUD exposes two PNG exports, both rasterizing the live render through one path (`exportPng({ mode })`):

- **`PNG page`** — the chromed poster: a 3840×2880 render with header, legend, caption, and ticks on the resolved gradient field. Auto-export route `?export=png`; filename carries the theme (see Artifact naming below). This is the existing export; its contract is unchanged.
- **`PNG diagram`** — the diagram canvas only: no header, HUD, caption, legend, or ticks, on the resolved gradient field, at the diagram's natural (variable) aspect. Auto-export route `?export=png-diagram`; filename `<slug>-diagram-<theme>.png`.

The diagram bounds are the **engine-authored SVG `width` / `height` / `viewBox`**, so return loops, arrowheads, edge labels, and landscape/portrait geometry are preserved without clipping. `PNG diagram` replaces the old chrome-free `.clean.html` + Puppeteer two-build workaround — a clean diagram PNG now comes straight from the full diagram HTML.

### Artifact naming

The `PNG page` button exports at the page's resolved theme, and the **exported filename carries that theme** — `<base>_source-vN_render-vN-light.png` or `…-dark.png` (theme resolved by the same precedence as the CSS: an explicit `data-theme` on `<html>` wins, otherwise the OS `prefers-color-scheme`). The suffix keeps a light and a dark export of the same diagram from colliding in Downloads, scratch, review folders, or handoff contexts.

That suffix is a property of **raw exporter output**, not of repo-committed artifacts:

- A repo-committed **canonical raster** — a single chosen representative image, e.g. `your-project_<diagram>.png` — **may keep a semantic, unsuffixed filename**. In repo context the filename already says what the image is, and only one variant is committed.
- If a repo commits **both** the light and dark variants, the `-light` / `-dark` suffixes are **required** to tell them apart.

Example: `asset-pipeline-ASK_discretion-chain.png` is a valid single chosen canonical (dark) raster; if both variants were ever committed they would be named `…-light.png` / `…-dark.png`.

### Theme by embedding surface

Every diagram package generates and retains both theme variants (`-light` and `-dark`). The embedding surface selects the default:

- **Repository documentation and operator-system diagrams default to dark.**
- **Substack and other published long-form editorial diagrams default to light.**
- A stated local exception may override the default for a specific figure.

This rule selects which existing render is embedded. It does not suppress, rename, or replace the alternate-theme export.

## What downstream must replace

- All tree data in `diagram-static-V.source.js` (root label, section labels, node labels, notes, tags, statuses)
- All chrome strings in `diagram-static-V.html`: `.mark`, `.title-block .t`, `.title-block .s`, `.stamp`, `.caption`, legend rows
- The `<title>` and `<meta name="description">` tags
- The file names (`diagram-static-V.html` and `diagram-static-V.source.js`) if you prefer project-specific names

## What not to edit

- `diagrams-static-V-engine.js`, `diagrams.css`, `export-png.js` (the shared engine + style + export — modifications break inheritance)
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

This is Class A (system / architecture diagram templates), alongside its static siblings `patterns/diagram-static-H/`, `patterns/diagram-static-SEQ/`, and `patterns/diagram-static-FLOW/`, plus the interactive `patterns/diagram-interactive-spine/`. Class B (project-output artifact templates) is a separate pattern at `patterns/output-artifact/`. The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
