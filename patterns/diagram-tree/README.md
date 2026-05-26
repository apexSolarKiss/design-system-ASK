# Pattern // diagram tree

A reusable static-artifact scaffold for system / architecture diagrams — architecture trees, topology maps, source-of-truth maps, repo-orientation diagrams, and similar ASK-family system diagrams that inherit the design-system-ASK visual language.

This is a **Class A** scaffold (system / architecture diagram templates), distinct from the **Class B** project-output artifact pattern.

## What this pattern is

A small consumption pattern. Six files:

- `README.md` — this file
- `diagram-tree.html` — the shell page (header, canvas, legend, HUD, caption)
- `diagram-tree.source.js` — the tree data, expressed as a single `window.TREE_DIAGRAM` literal
- `diagrams-engine.js` — shared layout + pan/zoom engine
- `diagrams.css` — diagram-specific style layer (page chrome + SVG nodes/edges) plus two diagram-only token additions (`--node-fill`, `--line-strong`); inherits Tier 1 + Tier 2 from the local `colors_and_type.css` mirror
- `export-png.js` — 3840×2880 PNG export with header, caveat, legend, and the rendered diagram

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific diagram. It is a starting point for downstream diagrams that consume design-system-ASK foundations.

## How to use it

1. Copy the six files in `patterns/diagram-tree/` into your consuming project (typically under `docs/diagrams/` or similar).
2. Sync `colors_and_type.css`, fonts, and any required project-approved assets from design-system-ASK into a local mirror alongside the diagram bundle (for example `./_dsa-tokens/colors_and_type.css` and `./_dsa-tokens/fonts/*.woff2`), pinned to a known upstream commit SHA. The HTML expects `./_dsa-tokens/colors_and_type.css`; adjust the path if your mirror lives elsewhere.
3. Rename `diagram-tree.html` and `diagram-tree.source.js` to match your project (e.g. `[your-project]_architecture-tree.html` and `[your-project]_architecture-tree.source.js`); update the `<script src>` reference in the HTML accordingly.
4. Edit `diagram-tree.source.js`: replace the placeholder tree with your project's actual structure. The tree shape is `{ kind, label, note?, tag?, status?, children? }`.
5. Edit `diagram-tree.html` chrome: update `.mark`, `.title-block`, `.stamp`, `.caption`, `<title>`, and `<meta name="description">` to your project's values. Do not edit the canvas / HUD / corner-tick structure.
6. Open the resulting HTML directly in a browser, or via static hosting / GitHub Pages. Use the `PNG` button in the HUD to export a 3840×2880 render at the current resolved theme.

## What downstream must replace

- All tree data in `diagram-tree.source.js` (root label, section labels, node labels, notes, tags, statuses)
- All chrome strings in `diagram-tree.html`: `.mark`, `.title-block .t`, `.title-block .s`, `.stamp`, `.caption`, legend rows
- The `<title>` and `<meta name="description">` tags
- The file names (`diagram-tree.html` and `diagram-tree.source.js`) if you prefer project-specific names

## What not to edit

- `diagrams-engine.js`, `diagrams.css`, `export-png.js` (the shared engine + style + export — modifications break inheritance)
- The diagram-only token overlays (`--node-fill`, `--line-strong`) and Tier 1 + Tier 2 references inside `diagrams.css`
- The canvas / HUD / corner-tick / glass-panel structure in the HTML
- The light / dark theme model: explicit `data-theme="dark"`, explicit `data-theme="light"`, and `prefers-color-scheme` auto-resolve all need to keep working

## Static vs dynamic inheritance

Static diagram artifacts inherit at generation time and freeze for audit. The Tier 1 + Tier 2 tokens, type families, theme bridges, and font files come from the local mirror (`./_dsa-tokens/colors_and_type.css` plus `./_dsa-tokens/fonts/`). `diagrams.css` in this bundle is the diagram-specific compiled style layer — page chrome, legend, HUD, SVG node and edge styles, and the diagram-only `--node-fill` and `--line-strong` token additions — and is not a substitute for the upstream tokens. There is no runtime fetch from the design-system-ASK repo and no Google Fonts CDN dependency. Re-sync the local mirror when upstream tokens or fonts change; bump the `source-vN` / `render-vN` stamp in the HTML each time.

Production code, by contrast, may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The diagram is **illustrative**, not source truth — the consuming repo's prose (`README.md`, `docs/architecture.md`, etc.) remains authoritative. If the diagram and the repo prose diverge, trust the prose and refresh the diagram. Do not modify the repo prose to match a stale diagram.

The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the diagram's content and structure. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream diagram content.

## Class A vs Class B

This is Class A (system / architecture diagram templates). Class B (project-output artifact templates) is a separate pattern at `patterns/output-artifact/`. The two stay distinct; do not fuse. Both inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
