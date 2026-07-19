# Pattern // diagram-static-H

A reusable static-artifact scaffold for system / architecture diagrams — architecture trees, topology maps, source-of-truth maps, repo-orientation diagrams, and similar ASK-family system diagrams that inherit the [design-system-ASK](../../README.md) visual language. **`diagram-static-H`** is the **horizontal** Class A static pattern: a left→right, top-aligned cascade.

This is a **Class A static** diagram scaffold (system / architecture diagram templates), distinct from the **Class B** project-output artifact pattern. Its static siblings are `patterns/diagram-static-V/` (vertical top→down centered spine), `patterns/diagram-static-SEQ/` (ordered arrowed sequence — succession, not hierarchy), and `patterns/diagram-static-FLOW/` (convergence flow — many sources converging into a resolved spec, realized, evaluated, governed, fed back). The **interactive** IA spine (`diagram-interactive-spine`) is a *separate artifact class* — not a static Class A pattern, and not named `diagram-static-V-interactive`.

## What this pattern is

A small consumption pattern. Seven files:

- `README.md` — this file
- `diagram-static-H.html` — the shell page (header, canvas, legend, HUD, caption)
- `diagram-static-H.source.js` — the tree data, expressed as a single `window.TREE_DIAGRAM` literal
- `diagrams-static-H-engine.js` — shared layout + pan/zoom engine. When it computes column widths it (a) measures against the actual Inter / JetBrains Mono fonts, waiting for them to load first, and (b) adds the CSS `letter-spacing` that `canvas.measureText` ignores (section labels carry `0.18em`). Both are required so first-level labels never bleed into the next column; columns stretch to fit the real rendered text. **If you change a `letter-spacing` value in `diagrams.css`, update the matching `LS_*` constant in the engine.**
- `diagrams-fit.js` — **DS-owned shared fit support.** Computes the default zoom-to-fit transform: it measures the *visible* caption / legend and HUD glass panels and, **only when the figure would actually collide with one**, centres it in the edge-safe region that remains. A placement that already clears the chrome is kept exactly as-is — reservation is overlap-gated, so a figure is never shrunk to avoid chrome it does not reach, so a wide, short figure no longer renders its top band underneath the corner panels. Panel heights are measured live, never hard-coded, and hidden or zero-area panels reserve nothing. **Load it immediately BEFORE the engine** — the engine throws a named error if it is missing rather than silently falling back to the old geometry. **Byte-identical to the copies in the sibling patterns** — shared by convention, not a runtime import; re-vendor it alongside the engine. With no visible panels the computed scale and translation are arithmetically identical to this pattern's previous fit.
- `diagrams.css` — diagram-specific style layer (page chrome + SVG nodes/edges) plus diagram-only token additions (`--node-fill`, `--line-strong`) and the `--diagram-*` legibility tokens (which alias the foundation foreground ramp); **byte-identical to the `-V` / `-SEQ` / `-FLOW` copies**; inherits Tier 1 + Tier 2 from the local `colors_and_type.css` mirror
- `export-png.js` — 3840×2880 PNG export with header, caveat, legend, and the rendered diagram

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific diagram. It is a starting point for downstream diagrams that consume design-system-ASK foundations.

## How to use it

1. Copy the seven files in `patterns/diagram-static-H/` into your consuming project (typically under `docs/diagrams/` or similar).
2. Sync `colors_and_type.css`, fonts, and any required project-approved assets from design-system-ASK into a local mirror alongside the diagram bundle (for example `./_dsa-tokens/colors_and_type.css`, `./_dsa-tokens/fonts/*.woff2`, and `./_dsa-tokens/fonts-embedded.js` — the embedded-font carrier that lets `PNG page` / `PNG diagram` export offline from a `file://` page, no server), pinned to a known upstream commit SHA. The HTML expects `./_dsa-tokens/colors_and_type.css`; adjust the path if your mirror lives elsewhere.
3. Rename `diagram-static-H.html` and `diagram-static-H.source.js` to match your project (e.g. `[your-project]_architecture-tree.html` and `[your-project]_architecture-tree.source.js`); update the `<script src>` reference in the HTML accordingly.
4. Edit `diagram-static-H.source.js`: replace the placeholder tree with your project's actual structure. The tree shape is `{ kind, label, note?, tag?, status?, children? }`. **`tag` is valid only on `kind: 'section'`** (it renders as the section's `// <tag>` subtitle); the engine does not read `tag` on `root`, `group`, or ordinary `node` records. For secondary text beneath a root, group, or ordinary node, use **`note`**.
5. Edit `diagram-static-H.html` chrome: update `.mark`, `.title-block`, `.stamp`, `.caption`, `<title>`, and `<meta name="description">` to your project's values. Do not edit the canvas / HUD / corner-tick structure.
6. Open the resulting HTML directly in a browser, or via static hosting / GitHub Pages. Use the `PNG page` button in the HUD to export a 3840×2880 chromed render at the current resolved theme, or `PNG diagram` for the canvas-only export (see PNG export below).

## PNG export

### The two exports

The HUD exposes two PNG exports, both rasterizing the live render through one path (`exportPng({ mode })`):

- **`PNG page`** — the chromed poster: a 3840×2880 render with header, legend, caption, and ticks on the resolved gradient field. Auto-export route `?export=png`; filename carries the theme (see Artifact naming below). The legend is reproduced from the live DOM as an ordered list of rows, dividers, and group headings, with each swatch drawn from its **computed** presentation (fill, border color / width / style, radius) — so a consumer's semantic legend (colored role swatches, a downstream-group separator, a group heading) exports faithfully; a plain row-only legend lays out exactly as before.
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

- All tree data in `diagram-static-H.source.js` (root label, section labels, node labels, notes, tags, statuses)
- All chrome strings in `diagram-static-H.html`: `.mark`, `.title-block .t`, `.title-block .s`, `.stamp`, `.caption`, legend rows
- The `<title>` and `<meta name="description">` tags
- The file names (`diagram-static-H.html` and `diagram-static-H.source.js`) if you prefer project-specific names

## What not to edit

- `diagrams-static-H-engine.js`, `diagrams.css`, `export-png.js`, `diagrams-fit.js` (the shared engine + style + export — modifications break inheritance)
- The script load order in the shell — `diagrams-fit.js` must load before the engine; the engine hard-fails if it is absent
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

This is Class A (system / architecture diagram templates) — the **horizontal** left→right cascade. Its static siblings are `patterns/diagram-static-V/` (vertical top→down centered spine), `patterns/diagram-static-SEQ/` (ordered arrowed sequence), and `patterns/diagram-static-FLOW/` (convergence flow), plus the interactive `patterns/diagram-interactive-spine/` — separate Class A patterns with their own placement engines but the same data grammar, visual contract, and export. Class B (project-output artifact templates) is a separate pattern at `patterns/output-artifact/`. The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
