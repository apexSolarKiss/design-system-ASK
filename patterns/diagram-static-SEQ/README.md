# Pattern // diagram-static-SEQ

A reusable static-artifact scaffold for diagrams whose natural topology is an **ordered, top-to-bottom sequence of steps joined by arrows** — pipelines, workflows, lifecycles, doctrine chains, and similar ASK-family process diagrams that inherit the design-system-ASK visual language. **`diagram-static-SEQ`** is the **sequence** Class A static pattern: succession, not hierarchy.

This is a **Class A static** diagram scaffold (system / architecture diagram templates), distinct from the **Class B** project-output artifact pattern. It sits alongside `patterns/diagram-static-H/` (horizontal left→right cascade), `patterns/diagram-static-V/` (vertical centered spine), and `patterns/diagram-static-FLOW/` (convergence flow — many sources converging into a resolved spec, realized, evaluated, governed, fed back). H / V / SEQ share the existing tree/sequence data grammar and export contract. FLOW is a distinct convergence-flow grammar (one shared source model, two render modes), but shares the same visual contract, PNG export discipline, and inheritance-by-reference posture.

> **Provenance.** Graduated from an asset-pipeline-ASK reference implementation (handoff `2026-06-11_asset-pipeline-ASK_to_design-system-ASK_sequence-scaffold-handoff`). This copy is canonical; the AP scratch original is a reference, not a source of truth. Consumers — AP included — vendor this copy by reference.

## When to use this vs `diagram-static-H` / `diagram-static-V`

- **`diagram-static-H`** — horizontal *tree*: parent→child hierarchy expanding left → right.
- **`diagram-static-V`** — vertical *tree*: parent→child hierarchy as a centered top→down spine.
- **`diagram-static-SEQ`** (this pattern) — vertical *sequence*: ordered steps joined by **arrows**, left-aligned. The relation between boxes is **succession** (step 2 follows step 1), not hierarchy (step 2 is not a child of step 1).

The trees render relationship; the sequence renders direction. A numbered process forced into a tree scaffold reads as a hierarchy it isn't — that is exactly the misfit this pattern exists to remove. Pick the one whose geometry matches the diagram; do not fork one to fake the other.

## What this pattern is

A small consumption pattern. Six files:

- `README.md` — this file
- `diagram-static-SEQ.html` — the shell page (header, canvas, legend, HUD, caption)
- `diagram-static-SEQ.source.js` — the sequence data, expressed as a single `window.TREE_DIAGRAM` literal (a single-child chain)
- `diagrams-static-SEQ-engine.js` — **the sequence placement + pan/zoom engine** (the only file that genuinely differs from the H / V siblings). It measures against the actual Inter / JetBrains Mono fonts, waiting for them to load first, and adds the CSS `letter-spacing` that `canvas.measureText` ignores, so labels never overflow their boxes. **If you change a `letter-spacing` value in `diagrams.css`, update the matching `LS_*` constant in the engine.**
- `diagrams.css` — diagram-specific style layer (page chrome + SVG nodes/edges) plus two diagram-only token additions (`--node-fill`, `--line-strong`) and the `--diagram-*` legibility tokens; inherits Tier 1 + Tier 2 from the local `colors_and_type.css` mirror. **Byte-identical to the `diagram-static-H` / `diagram-static-V` copies** — shared by convention, not a runtime import. The sequence engine adds exactly one class to the shared vocabulary: `.edge-arrowhead`.
- `export-png.js` — 3840×2880 PNG export with header, caveat, legend, and the rendered diagram. **Byte-identical to the `diagram-static-H` / `diagram-static-V` copies** — it is geometry-agnostic (it serializes the rendered SVG and scales it into the export frame), so the same export serves all three patterns.

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific diagram. It is a starting point for downstream diagrams that consume design-system-ASK foundations.

## Placement model

The engine is `diagrams-static-V-engine.js` with exactly three geometry changes:

1. **Standalone lead box** — the root/title box stands on its own with a larger gap and **no connector** to the first step. A sequence's title is not the parent of its steps.
2. **Arrowed sequence connectors** — consecutive steps are joined by a vertical line ending in an **arrowhead**, encoding direction/succession (vs. the trees' plain parent→child edges). Arrowheads are explicit `<path class="edge-arrowhead">` triangles, **not** SVG `marker` elements — markers rasterize unreliably through the `data:image/svg+xml → <img> → canvas` PNG path, so explicit triangles keep the Class A export faithful.
3. **Left-aligned geometry** — all boxes share one left edge; label + note text inside each box is left-aligned (`text-anchor: start`); the connector runs at a small indent (`EDGE_INDENT`) from the shared left edge, not down a horizontal center.

Everything else — public contract (`window.DIAGRAMS.render(TREE)`), data grammar (`{ kind, label, note?, tag?, status?, children? }`, with `status: 'earned'|'held'|'legacy'` honored on step boxes and connectors), CSS classes, PNG export, font-load gate, pan/zoom — is identical to the siblings.

The engine **flattens the node tree depth-first into a linear run**, so the same `*.source.js` data renders as a centered spine in `diagram-static-V` or as a sequence here. Branching input warns to console and falls back to depth-first order — trees belong to the H / V scaffolds.

## How to use it

1. Copy the six files in `patterns/diagram-static-SEQ/` into your consuming project (typically under `docs/diagrams/` or similar).
2. Sync `colors_and_type.css`, fonts, and any required project-approved assets from design-system-ASK into a local mirror alongside the diagram bundle (for example `./_dsa-tokens/colors_and_type.css` and `./_dsa-tokens/fonts/*.woff2`), pinned to a known upstream commit SHA. The HTML expects `./_dsa-tokens/colors_and_type.css`; adjust the path if your mirror lives elsewhere.
3. Rename `diagram-static-SEQ.html` and `diagram-static-SEQ.source.js` to match your project (e.g. `[your-project]_pipeline-chain.html` and `[your-project]_pipeline-chain.source.js`); update the `<script src>` reference in the HTML accordingly.
4. Edit `diagram-static-SEQ.source.js`: replace the placeholder chain with your project's actual sequence, expressed as a single-child chain under a `root` node.
5. Edit `diagram-static-SEQ.html` chrome: update `.mark`, `.title-block`, `.stamp`, `.caption`, `<title>`, and `<meta name="description">` to your project's values. Do not edit the canvas / HUD / corner-tick structure.
6. Open the resulting HTML directly in a browser, or via static hosting / GitHub Pages. Use the `PNG` button in the HUD to export a 3840×2880 render at the current resolved theme.

## PNG export artifact naming

The `PNG` button exports at the page's resolved theme, and the **exported filename carries that theme** — `<base>_source-vN_render-vN-light.png` or `…-dark.png` (theme resolved by the same precedence as the CSS: an explicit `data-theme` on `<html>` wins, otherwise the OS `prefers-color-scheme`). The suffix keeps a light and a dark export of the same diagram from colliding in Downloads, scratch, review folders, or handoff contexts.

That suffix is a property of **raw exporter output**, not of repo-committed artifacts:

- A repo-committed **canonical raster** — a single chosen representative image, e.g. `your-project_<diagram>.png` — **may keep a semantic, unsuffixed filename**. In repo context the filename already says what the image is, and only one variant is committed.
- If a repo commits **both** the light and dark variants, the `-light` / `-dark` suffixes are **required** to tell them apart.

Example: `asset-pipeline-ASK_discretion-chain.png` is a valid single chosen canonical (dark) raster; if both variants were ever committed they would be named `…-light.png` / `…-dark.png`.

## What downstream must replace

- All sequence data in `diagram-static-SEQ.source.js` (root label, step labels, notes, tags, statuses)
- All chrome strings in `diagram-static-SEQ.html`: `.mark`, `.title-block .t`, `.title-block .s`, `.stamp`, `.caption`, legend rows
- The `<title>` and `<meta name="description">` tags
- The file names (`diagram-static-SEQ.html` and `diagram-static-SEQ.source.js`) if you prefer project-specific names

## What not to edit

- `diagrams-static-SEQ-engine.js`, `diagrams.css`, `export-png.js` (the shared engine + style + export — modifications break inheritance)
- The diagram-only token overlays (`--node-fill`, `--line-strong`) and Tier 1 + Tier 2 references inside `diagrams.css`
- The canvas / HUD / corner-tick / glass-panel structure in the HTML
- The light / dark theme model: explicit `data-theme="dark"`, explicit `data-theme="light"`, and `prefers-color-scheme` auto-resolve all need to keep working

## Static vs dynamic inheritance

Static diagram artifacts inherit at generation time and freeze for audit. The Tier 1 + Tier 2 tokens, type families, theme bridges, and font files come from the local mirror (`./_dsa-tokens/colors_and_type.css` plus `./_dsa-tokens/fonts/`). `diagrams.css` in this bundle is the diagram-specific compiled style layer and is not a substitute for the upstream tokens. There is no runtime fetch from the design-system-ASK repo and no Google Fonts CDN dependency. Re-sync the local mirror when upstream tokens or fonts change; bump the `source-vN` / `render-vN` stamp in the HTML each time.

Production code, by contrast, may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The diagram is **illustrative**, not source truth — the consuming repo's prose (`README.md`, `docs/architecture.md`, doctrine files, etc.) remains authoritative. If the diagram and the repo prose diverge, trust the prose and refresh the diagram. Do not modify the repo prose to match a stale diagram.

The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the diagram's content and structure. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream diagram content.

## Class A vs Class B

This is Class A (system / architecture diagram templates), alongside `patterns/diagram-static-H/` and `patterns/diagram-static-V/`. Class B (project-output artifact templates) is a separate pattern at `patterns/output-artifact/`. The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
