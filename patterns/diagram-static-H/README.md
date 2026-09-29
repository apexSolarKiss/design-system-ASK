# Pattern // diagram-static-H

A reusable static-artifact scaffold for system / architecture diagrams — architecture trees, topology maps, source-of-truth maps, repo-orientation diagrams, and similar ASK-family system diagrams that inherit the [design-system-ASK](../../README.md) visual language. **`diagram-static-H`** is the **horizontal** Class A static pattern: a left→right, top-aligned cascade.

This is a **Class A static** diagram scaffold (system / architecture diagram templates), distinct from the **Class B** project-output artifact pattern. Its static siblings are `patterns/diagram-static-V/` (vertical top→down centered spine), `patterns/diagram-static-SEQ/` (ordered arrowed sequence — succession, not hierarchy), and `patterns/diagram-static-FLOW/` (convergence flow — many sources converging into a resolved spec, realized, evaluated, governed, fed back). The **interactive** IA spine (`diagram-interactive-spine`) is *a separate interactive Class A pattern* — not a static Class A pattern, and not named `diagram-static-V-interactive`.

## What this pattern is

A small consumption pattern. Nine files:

- `README.md` — this file
- `diagram-static-H.html` — the shell page (header, canvas, legend, HUD, caption), with the caption and legend in the responsive chrome block (see Responsive chrome below)
- `diagram-static-H.source.js` — the tree data, expressed as a single `window.TREE_DIAGRAM` literal
- `diagrams-static-H-engine.js` — shared layout + pan/zoom engine. When it computes column widths it (a) measures against the actual Inter / JetBrains Mono fonts, waiting for them to load first, and (b) adds the CSS `letter-spacing` that `canvas.measureText` ignores (section labels carry `0.18em`). Both are required so first-level labels never bleed into the next column; columns stretch to fit the real rendered text. **If you change a `letter-spacing` value in `diagrams.css`, update the matching `LS_*` constant in the engine.**
- `diagrams-chrome.js` — **DS-owned responsive chrome.** Decides when the caption and legend stay open together at the top of the canvas (wide) and when they close behind triggers in one control area at the bottom (compact), and moves the header's subtitle and stamp into About while compact. It acts only on a page that opts in with the `.diagram-info` block, and the engine uses it where it is present. **Byte-identical to the copies in the sibling patterns** — shared by convention, not a runtime import; re-vendor it alongside the engine.
- `diagrams-fit.js` — **DS-owned shared fit support.** Computes the default zoom-to-fit transform: it measures the *visible* caption / legend and HUD glass panels and, **only when the figure would actually collide with one**, centers it in the edge-safe region that remains. A placement that already clears the chrome is kept exactly as-is — reservation is overlap-gated, so a figure is never shrunk to avoid chrome it does not reach, so a wide, short figure no longer renders its top band underneath the corner panels. Panel heights are measured live, never hard-coded, and hidden or zero-area panels reserve nothing. Chrome may declare the edge it is anchored to with `data-diagram-fit-edge`: the defaults reserve `.hud` and any `[data-diagram-fit-edge="bottom"]` element as bottom chrome, and an undeclared caption or legend (or a declared `"top"`) as top chrome, as before; `"none"` takes a caption, legend or declared element out of both; the HUD is bottom chrome whatever it declares. This is the `diagrams-fit.js` v2 contract (`DIAGRAM_FIT.VERSION`). With no declaration present, the panels selected are exactly the prior ones. **Load it immediately BEFORE the engine** — the engine throws a named error if it is missing rather than silently falling back to the old geometry. **Byte-identical to the copies in the sibling patterns** — shared by convention, not a runtime import; re-vendor it alongside the engine. With no visible panels the prior fit formula is preserved exactly while each available axis is at least twice its requested total clearance. On a more constrained axis (a canvas smaller than twice its clearance) the clearance degrades proportionally and consumes at most half the available space. Within a fixed available rectangle and panel-reservation state, reducing that axis cannot increase its clearance-limited scale contribution — so the Fit stays on-canvas and positive where the old absolute-clearance model produced a non-positive or direction-reversing result.
- `diagrams-text-layout.js` — **DS-owned shared text-layout support, a GENERATED MIRROR.** Canonical source is `patterns/_diagram-shared/diagrams-text-layout.js`; this copy is emitted by `tools/sync-diagram-shared.mjs` and is **byte-identical** to it. It owns line breaking (delimiters matched longest-first, `//` before `/`, breaking after the delimiter; force-break only a token that still exceeds its cap alone; an authored newline is a hard break), measurement, **role metrics — per-role cap, line height and the has-note predicate** — and tspan emission. This engine keeps **no** cap table, **no** line-height table and **no** rendered-secondary predicate of its own: it requests layout by role and receives the resolved metrics, because three engines each holding a private copy is the divergence the shared contract exists to remove — the engine keeps source grammar, topology, placement, connector geometry and the final SVG envelope, because H, V and SEQ have genuinely different geometry contracts. **Load it immediately BEFORE the engine**, after `diagrams-fit.js`; the engine throws a named error if it is missing or its interface is incomplete, rather than silently falling back. **Never hand-edit this file** — `node tools/sync-diagram-shared.mjs --check` exits non-zero on any divergence, so an edit here fails loudly instead of surviving as a silent fork. Its declared target set is H, V and SEQ; `diagram-static-FLOW` and `diagram-interactive-spine` are explicitly excluded.
- `diagrams.css` — diagram-specific style layer (page chrome, including the responsive chrome's wide and compact layouts, + SVG nodes/edges) plus diagram-only token additions (`--node-fill`, `--line-strong`) and the `--diagram-*` legibility tokens (which alias the foundation foreground ramp); **byte-identical to the `-V` / `-SEQ` / `-FLOW` copies**; inherits Tier 1 + Tier 2 from the local `colors_and_type.css` mirror
- `export-png.js` — 3840×2880 PNG export with header, caveat, legend, and the rendered diagram. **Exported chrome resolves the semantic diagram roles first** — `--diagram-ink` then `--fg-1`, `--diagram-muted` then `--fg-2`. `diagrams.css` aliases the semantic roles to the foundation ramp by default, so ordinary consumers export exactly as before; a consumer that legitimately rebinds those roles for its own surface now gets the same treatment in the export that it already gets live, instead of a corrected page and an uncorrected raster.

**Load order is a contract, not a convention.** The page loads
`<source> → diagrams-chrome.js → diagrams-fit.js → diagrams-text-layout.js → engine → fonts-embedded.js → export-png.js`,
with `diagrams-chrome.js` after the chrome markup, and the stylesheets
`colors_and_type.css → diagrams.css → surface-panel.css → surface-treatments.css` (`surface-treatments.css`
requires `surface-panel.css` before it).
The fit and text-layout carriers fail **closed**: an engine loaded without either throws a named error and
renders nothing, so a partial re-vendor is visible immediately rather than looking current while
carrying old geometry. The text-layout check tests the **role-aware interface and the declared target set**,
not just that the global exists — a mirror can be complete, load cleanly, and still be the wrong
member (vendored from a sibling plane, or from a later version that dropped this pattern), and
that case passes a truthiness test and fails nowhere. `diagrams-chrome.js` does not fail closed: without it the page renders, but its chrome stays in the wide layout at every size. An engine driving the chrome does fail closed on a `diagrams-fit.js` older than v2, whose edge declaration the chrome needs.

**What not to edit here.** `diagrams-text-layout.js` is a generated mirror — edit the canonical in
`patterns/_diagram-shared/` and re-emit. `diagrams-chrome.js`, `diagrams-fit.js` and `diagrams.css` are shared by
convention and are byte-identical across the sibling patterns; re-vendor them alongside the engine
rather than diverging one copy. `surface-panel.css` and `surface-treatments.css` are this repository's
root modules, vendored unchanged into the consumer's `_dsa-surface/` mirror. A consumer receipt resolves a vendored mirror's bytes to the
canonical plus the owner commit it was emitted from.

**Zoom floor tracks Fit.** The ordinary zoom-out floor is this pattern's historical base scale, but the panel-aware fit can legitimately land below it on a constrained viewport. When it does, the live floor becomes the fitted scale, so zoom-out is a no-op at Fit rather than *increasing* the scale (which would reverse the control's direction). Fit itself is never clamped — clamping it would restore the panel collision the helper exists to avoid.

**Fit follows the reader.** The view is at Fit after a fit and until the reader actually moves it — a zoom, a wheel, or a drag of more than a few pixels; a zoom already at its limit, or a tap, leaves it at Fit. Only a view at Fit follows a resize or a `diagram-chrome-change`; a view the reader has zoomed or panned stays where it is, so a browser-toolbar resize no longer resets it. This holds on every page that uses the engine, with or without the responsive chrome. While a compact panel is open (see Responsive chrome below), the drawing moves clear of it only where it keeps its closed-panel size; otherwise it keeps its closed-panel Fit and the panel overlays it. The Fit button always ends at a usable view: when the open panel would cover the drawing, Fit closes it through the chrome (`window.DIAGRAM_CHROME.close`) and fits. A wheel over `.diagram-info` scrolls the panel instead of zooming (a pinch still zooms the drawing, never the page), and a drag that starts on a panel does not pan.

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific diagram. It is a starting point for downstream diagrams that consume design-system-ASK foundations.

## Responsive chrome

A page opts in by wrapping its one caption (`#diagramCaption`) and one legend (`#diagramLegend`) in `.diagram-info[data-diagram-chrome]`, with a `.diagram-info-triggers` row before them of `.diagram-info-trigger.surface-disclosure-trigger.glass` buttons — About, then Legend — whose `aria-controls` name those panels; and by adding `<div class="diagram-cue">illustrative</div>` to `.bar`, the page's visible qualification while the caption sits behind About. The shell page ships this structure. The block stays a direct child of `.canvas-wrap`, itself a direct child of `.shell`; placed anywhere else, the chrome stays in the wide layout. A page without the wrapper keeps its independent corner panels and its header as before.

`diagrams-chrome.js` chooses one of two layouts and measures again on every resize and when the webfonts land:

- **Wide** — the panels sit together at the top of the canvas: side by side while both fit, the legend wrapping below the caption when they do not, never overlapping. The header keeps its subtitle and stamp; the triggers and the cue are hidden. On a viewport 960px wide or narrower the header keeps the stamp beside the identity and gives the title block its own row.
- **Compact** — when the canvas is narrower than 640px, or when the open panels would take more than a third of its height or need more width than it gives. The header keeps identity, title and the cue; the subtitle (`.title-block .s`) and the stamp move into About — the same nodes, moved back in wide. The triggers join the HUD in one control area at the bottom of the canvas, beside the HUD when there is room and directly above it when not. At most one panel is open. It opens upward and scrolls within the real space between the canvas top and the control area, capped at 60% of the canvas height and never enlarged to a minimum the canvas does not have. Entering compact closes every panel; a resize while compact keeps the reader's choice and the open panel's scroll position. Escape anywhere in the block closes the open panel and returns focus to its trigger, and focus moves only when its target would disappear.

Each trigger's `aria-expanded` and its panel's `hidden` attribute are set together, and the triggers take the controlled disclosure trigger's grammar from `surface-treatments.css`. In compact the trigger row and the open panel declare `data-diagram-fit-edge="bottom"`, so `diagrams-fit.js` reserves the whole control area, HUD included, as bottom chrome; after each change the chrome dispatches `diagram-chrome-change` on the canvas wrap, and the engine refits a view that is at Fit (see Fit follows the reader above).

## How to use it

1. Copy the **complete nine-file bundle** in `patterns/diagram-static-H/` into your consuming project (typically under `docs/diagrams/` or similar). **All nine, including `diagrams-text-layout.js` and `diagrams-chrome.js`** — the engine fails closed on a missing fit or text-layout carrier, so a copy without either renders nothing and names the file it wants, and a copy without `diagrams-chrome.js` keeps its chrome in the wide layout at every size.
2. Sync `colors_and_type.css`, fonts, and any required project-approved assets from design-system-ASK into a local mirror alongside the diagram bundle (for example `./_dsa-tokens/colors_and_type.css`, `./_dsa-tokens/fonts/*.woff2`, and `./_dsa-tokens/fonts-embedded.js` — the embedded-font carrier that lets `PNG page` / `PNG diagram` export offline from a `file://` page, no server), pinned to a known upstream commit SHA. The HTML expects `./_dsa-tokens/colors_and_type.css`; adjust the path if your mirror lives elsewhere. For the responsive chrome, also sync `surface-panel.css` and `surface-treatments.css` into a surface-module mirror; the HTML expects `./_dsa-surface/` and loads `surface-panel.css` first, as `surface-treatments.css` requires.
3. Rename `diagram-static-H.html` and `diagram-static-H.source.js` to match your project (e.g. `[your-project]_architecture-tree.html` and `[your-project]_architecture-tree.source.js`); update the `<script src>` reference in the HTML accordingly.
4. Edit `diagram-static-H.source.js`: replace the placeholder tree with your project's actual structure. The tree shape is `{ kind, label, note?, tag?, status?, children? }`. **`tag` is valid only on `kind: 'section'`** (it renders as the section's `// <tag>` subtitle); the engine does not read `tag` on `root`, `group`, or ordinary `node` records. For secondary text beneath a root, group, or ordinary node, use **`note`**.
5. Edit `diagram-static-H.html` chrome: update `.mark`, `.title-block`, `.stamp`, `.caption`, `<title>`, and `<meta name="description">` to your project's values. Keep the `.diagram-cue` and the `.diagram-info` structure — one caption, one legend, their triggers with About first — and edit only the panels' content. Do not edit the canvas / HUD / corner-tick structure.
6. Open the resulting HTML directly in a browser, or via static hosting / GitHub Pages. Use the `PNG page` button in the HUD to export a 3840×2880 chromed render at the current resolved theme, or `PNG diagram` for the canvas-only export (see PNG export below).

## PNG export

### The two exports

The HUD exposes two PNG exports, both rasterizing the live render through one path (`exportPng({ mode })`):

- **`PNG page`** — the chromed poster: a 3840×2880 render with header, legend, caption, and ticks on the resolved gradient field. Auto-export route `?export=png`; filename carries the theme (see Artifact naming below). The legend is reproduced from the live DOM as an ordered list of rows, dividers, and group headings, with each swatch drawn from its **computed** presentation (fill, border color / width / style, radius) — so a consumer's semantic legend (colored role swatches, a downstream-group separator, a group heading) exports faithfully; a plain row-only legend lays out exactly as before.
- **`PNG diagram`** — the diagram canvas only: no header, HUD, caption, legend, or ticks, on the resolved gradient field, at the diagram's natural (variable) aspect. Auto-export route `?export=png-diagram`; filename `<slug>-diagram-<theme>.png`.

The diagram bounds are the **engine-authored SVG `width` / `height` / `viewBox`**, so return loops, arrowheads, edge labels, and landscape/portrait geometry are preserved without clipping. `PNG diagram` replaces the old chrome-free `.clean.html` + Puppeteer two-build workaround — a clean diagram PNG now comes straight from the full diagram HTML.

**`PNG page` is the same whatever the live layout.** The exporter reads the subtitle and stamp wherever they sit — in the header, or in About while the chrome is compact — and reads the caption without the block that holds them there, so the page and its filename do not depend on the viewport or on which panel is open. The exported caption keeps every line; it is no longer cut at three. The caption and the legend share the page width: side by side at their natural widths where both fit, as before; otherwise the caption wraps to the width left beside the legend; and where that would leave the caption too narrow, it takes the full width and the legend drops below it, right-aligned. A landscape figure keeps its placement unless one of its drawn marks would come within the exporter's panel gutter; then it is fitted below the panels. `PNG diagram` is unchanged.

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

- `diagrams-static-H-engine.js`, `diagrams.css`, `export-png.js`, `diagrams-fit.js`, `diagrams-chrome.js` (the shared engine + style + export + chrome — modifications break inheritance), and the vendored `surface-panel.css` / `surface-treatments.css`
- The script and stylesheet load order in the shell — `diagrams-chrome.js` loads after the chrome markup and before `diagrams-fit.js`; `diagrams-fit.js` must load before the engine, and the engine hard-fails if it is absent; `surface-panel.css` loads before `surface-treatments.css`
- The diagram-only token overlays (`--node-fill`, `--line-strong`) and Tier 1 + Tier 2 references inside `diagrams.css`
- The canvas / HUD / corner-tick / glass-panel structure in the HTML, and the `.diagram-info` block's structure (one caption, one legend, the trigger row with About first) and the `.diagram-cue`
- The light / dark theme model: explicit `data-theme="dark"`, explicit `data-theme="light"`, and `prefers-color-scheme` auto-resolve all need to keep working

## Static vs dynamic inheritance

Static diagram artifacts inherit at generation time and freeze for audit. The Tier 1 + Tier 2 tokens, type families, theme bridges, and font files come from the local mirror (`./_dsa-tokens/colors_and_type.css` plus `./_dsa-tokens/fonts/`). `diagrams.css` in this bundle is the diagram-specific compiled style layer — page chrome, legend, HUD, SVG node and edge styles, and the diagram-only `--node-fill` and `--line-strong` token additions — and is not a substitute for the upstream tokens. The responsive chrome's trigger grammar comes the same way, from the surface-module mirror (`./_dsa-surface/`). There is no runtime fetch from the design-system-ASK repo and no Google Fonts CDN dependency. Re-sync the local mirrors when upstream tokens, fonts or surface modules change; bump the `source-vN` / `render-vN` stamp in the HTML each time.

Production code, by contrast, may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The diagram is **illustrative**, not source truth — the consuming repo's prose (`README.md`, `docs/architecture.md`, etc.) remains authoritative. If the diagram and the repo prose diverge, trust the prose and refresh the diagram. Do not modify the repo prose to match a stale diagram.

The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the diagram's content and structure. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream diagram content.

## Class A vs Class B

This is Class A (system / architecture diagram templates) — the **horizontal** left→right cascade. Its static siblings are `patterns/diagram-static-V/` (vertical top→down centered spine), `patterns/diagram-static-SEQ/` (ordered arrowed sequence), and `patterns/diagram-static-FLOW/` (convergence flow), plus the interactive `patterns/diagram-interactive-spine/` — separate Class A patterns with their own placement engines but the same data grammar, visual contract, and export. Class B (project-output artifact templates) is a separate pattern at `patterns/output-artifact/`. The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
