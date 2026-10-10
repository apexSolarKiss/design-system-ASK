# Pattern // diagram-static-FLOW

A reusable **Class A static** scaffold for diagrams whose natural topology is a **convergence flow** — many normative sources converging into one resolved specification, which is then realized, evaluated, governed, and fed back. It is the **fourth** Class A sibling alongside `patterns/diagram-static-H/`, `patterns/diagram-static-V/`, and `patterns/diagram-static-SEQ/`. FLOW carries its own **convergence-flow data grammar** (one shared source model, two render modes) — distinct from the tree/sequence grammar the other three share — but inherits the same visual contract, PNG export, and inheritance-by-reference discipline.

> **Provenance.** Graduated from an asset-pipeline-ASK reference implementation (handoff `2026-06-20_asset-pipeline-ASK_to_design-system-ASK_flow-scaffold-handoff`). This copy is canonical; the upstream reference is a reference, not a source of truth. Consumers vendor this copy by reference.

## When to use this vs `diagram-static-H` / `-V` / `-SEQ`

- **`diagram-static-H`** // horizontal *tree*: parent→child hierarchy expanding left → right.
- **`diagram-static-V`** // vertical *tree*: parent→child hierarchy as a centered top→down spine.
- **`diagram-static-SEQ`** // vertical *sequence*: ordered steps joined by arrows; the relation is succession, not hierarchy.
- **`diagram-static-FLOW`** (this pattern) // a *convergence flow*: a field of many normative sources **converging** into one resolved specification, a process spine with **parallel realization** that fans out and reconverges, a secondary **evaluation bus** re-entering a later node, and a **return loop** that closes the flow back to its own input lane.

The trees render hierarchy; the sequence renders direction; the flow renders a topology none of the others express — convergence, parallel realization, an evaluation bus, and a return loop in one figure. Pick the one whose geometry matches the diagram; do not fork one to fake another.

## Two render modes (load-bearing)

There is **one shared source model and two render modes that cannot drift**, because both modes read the same `window.FLOW_DIAGRAM` object. The mode is chosen at render time from `window.FLOW_MODE` (`'static'` default | `'interactive'`):

- **static / export** // draws each node's `short` label plus the topology, and **must be legible without interaction**. This is what the article export and the PNG carry.
- **interactive** // identical topology plus a `detail`-fed side panel revealed on hover (click to pin), and a weight-only highlight on the focused node (**no new hue**). In the compact chrome the side panel sits behind its Detail trigger, and pinning a node opens it there.

Descriptive density lives in the side panel, never crammed into the figure. The static figure stays sparse on purpose; the explanation is the panel's job.

## Topology primitives

- **External carrier** in a left lane // an input that sits outside the source field.
- **Typed-reference rail** in its own label-lane across the top of the field // how a carrier qualifies the field (anchor · evidence · constrain); short taps down, never crossing node text.
- A **single left-aligned source field** of normative inputs (inputs recede).
- A **many-to-one convergence trunk** gathering the field into an **anchored resolved specification**.
- A **process spine** descending from the resolved spec.
- An **orthogonal parallel fan-out + reconverge** on the spine (e.g. object and cross-object relations realized in parallel, then rejoined).
- A **secondary dotted evaluation bus** re-entering a later spine node (the conformance re-check against the source obligations).
- A **continuation to a governed-result anchor**.
- A **future-reference return lane + dotted return loop** that closes the governed result back as a potential carrier input.

Tiers: `anchor` (heavier stroke) / `recede` (muted). Per-node `status: earned | held | legacy` (`held` renders **dashed**). **Hierarchy is weight / contrast / dash only — no new hue; this is NOT Spectral State, Evidence State, or Three Functions** (the opt-in semantic-color primitives — element/evidence *state* and structural *function* — none used here; this scaffold is structural, and its resolve → realize → evaluate → govern topology is not a Three Functions surface).

## Data grammar

```
ONE shared source model, TWO render modes that cannot drift (read window.FLOW_MODE
at render time: 'static' default | 'interactive'):
  - static/export: draws each node's `short` + topology ONLY; legible without interaction.
  - interactive:   identical topology + a hover/click side panel fed by `detail`.

Data grammar (window.FLOW_DIAGRAM):
  band?:         { tag?, short?, perImage?:[…], setLevel?, detail? }   // optional dimensions ribbon
  carrier?:      { label, short?, note?, rail?, railTerms?, detail? }
  rail?:         { detail? }
  field:         { tag?, nodes:[ { id?, label, short?, status?, detail? }, … ] }
  converge:      { id?, label, short?, anchor?, detail? }
  spine:         [ { id?, label, short?, status?, anchor?, detail? } | { parallel:[ {…}, … ] } ]
  evalEdges?:    [ { from:'<id>', to:'<id>' }, … ]              // one compact rail per target
  futureCarrier?:{ from:'<id>', node, short?, edge?, detail? }  // the return loop
Per node: label = full phrase (interactive panel title); short = the label drawn in the
static figure; detail = { def, eg?, not? } shown in the interactive panel.
status: earned (default) | held | legacy.  ids default f0.. / converge / s0.. / carrier.
```

## Files

Ten files:

- `README.md` // this file
- `diagram-static-FLOW.html` // the **chrome-free static export shell**: diagram only, on the gradient field. This is the article target. It loads no responsive chrome and its markup is unchanged by it.
- `diagram-static-FLOW.interactive.html` // the **full-chrome interactive shell** (header, canvas, legend, HUD, caption, side panel), with the caption, legend and side panel under the responsive chrome (see Responsive chrome below). This is the repo-native explanatory artifact; it sets `window.FLOW_MODE = 'interactive'`.
- `diagram-static-FLOW.source.js` // a **generic demo fixture** expressed as a single `window.FLOW_DIAGRAM` literal; illustrates the grammar only and is replaced downstream.
- `diagrams-static-FLOW-engine.js` // **the convergence-flow placement + pan/zoom engine**. It measures against the actual Inter / JetBrains Mono fonts, waiting for them to load first, and adds the CSS `letter-spacing` that `canvas.measureText` ignores, so labels never overflow their boxes. **If you change a `letter-spacing` value in `diagrams.css`, update the matching `LS_*` constant in the engine.**
- `diagrams-chrome.js` // **DS-owned responsive chrome.** Decides when the caption, legend and side panel stay open in their wide places and when they close behind triggers in one control area at the bottom of the canvas (compact), and moves the header's subtitle and stamp into About while compact. It acts only on a page that opts in with the `.diagram-info` block, and the engine uses it where it is present. **Byte-identical to the copies in the sibling patterns** — shared by convention, not a runtime import; re-vendor it alongside the engine.
- `diagrams-fit.js` // **DS-owned shared fit support.** Computes the default zoom-to-fit transform: it measures the *visible* glass panels and, **only when the figure would actually collide with one**, centers it in the edge-safe region that remains. A placement that already clears the chrome keeps its scale — reservation is overlap-gated, so a figure is never shrunk to avoid chrome it does not reach, so a wide, short figure no longer renders its top band underneath them. **This engine tests the chrome against the marks it actually draws** (the v3 `marks` option, measured by `DIAGRAM_FIT.marksOf`). A FLOW figure is sparse — a source rail, a spine and feedback loops leave wide empty corners — so an empty corner under a panel costs no scale. The fit looks for a placement where every drawn mark keeps the 26px gutter from every panel — the side panel included at the tallest height a node's definition gives it, which the engine measures on an off-screen copy and declares as `data-diagram-fit-max-height`. Nothing refits when a definition appears, so the drawing never moves under the pointer, and whenever the fit reports `clear` a definition shown on hover or pin covers no node. The fit counts the side panel at that declared height, and also starts from the reservation it would make at rest, so declaring the height never does worse than a panel already that tall. When the full-canvas placement would bring a mark too close to a panel, scales are tried in 1% steps down to the edge reservation described next and the first that clears is used; where no reservation has a clear position, the steps continue down to 40% of the full-canvas scale, or the reservation's own scale if that is lower. If none clears, the result reports `clear: false`. It also opts into `balance` and `compactClearance`, as the static siblings do: the drawing is centered vertically in the free range the chrome leaves it, and the clearance is capped at 32px while the chrome is compact. Both previews take this Fit unchanged, so they show what a consumer receives. **This pattern reserves one panel the siblings do not:** the full-chrome shell's explanatory side panel (`.flow-panel`), always visible in the wide chrome, is DS-owned chrome that overlays the canvas. There it is anchored bottom-right with a fixed 300px width and a height that grows with its content, so the engine names it as a **right-side exclusion lane**, not a bottom band — its fixed width bounds the reserved area, and its height growth does not consume page height. (Treating it as bottom chrome reserves a full-width strip as tall as the panel and collapses the figure.) In the compact chrome the panel joins the control area behind its Detail trigger and declares the bottom edge like every compact panel, so the lane selector (`.flow-panel:not([data-diagram-fit-edge])`) leaves it out. The chrome-free static shell contains none of these elements, so nothing is reserved there and its transform is unchanged. Panel heights are measured live, never hard-coded, and hidden or zero-area panels reserve nothing, except that a laid-out panel declaring `data-diagram-fit-max-height` counts at that height. Chrome may declare the edge it is anchored to with `data-diagram-fit-edge`: the defaults reserve `.hud` and any `[data-diagram-fit-edge="bottom"]` element as bottom chrome, and an undeclared caption or legend (or a declared `"top"`) as top chrome, as before; `"none"` takes a caption, legend or declared element out of both; the HUD is bottom chrome whatever it declares. This is the `diagrams-fit.js` v2 edge contract, carried unchanged in v3 (`DIAGRAM_FIT.VERSION` 3). With no declaration present, the panels selected are exactly the prior ones. **Load it immediately BEFORE the engine** — the engine throws a named error if it is missing or older than v3, rather than silently falling back to the old geometry. **Byte-identical to the copies in the sibling patterns** — shared by convention, not a runtime import; re-vendor it alongside the engine. With no visible panels the prior fit formula is preserved exactly while each available axis is at least twice its requested total clearance. On a more constrained axis (a canvas smaller than twice its clearance) the clearance degrades proportionally and consumes at most half the available space. Within a fixed available rectangle and panel-reservation state, reducing that axis cannot increase its clearance-limited scale contribution — so the Fit stays on-canvas and positive where the old absolute-clearance model produced a non-positive or direction-reversing result. (This engine transforms the stage container, whose box starts at the origin in CSS space, so it passes zero-origin bounds — the SVG's own viewBox origin never enters the transform.)
- `diagrams-pointer.js` // **DS-owned gesture controller, a GENERATED MIRROR** of `patterns/_diagram-shared/diagrams-pointer.js` (v2), emitted by `tools/sync-diagram-shared.mjs` and **byte-identical** to it; both shells load it before `diagrams-fit.js` and the engine (in the interactive shell, after `diagrams-chrome.js`). The engine hands it the canvas: one pointer pans from anywhere on the drawing — a node's hit area included, so a drag that starts on a node pans while a tap still pins it — two pinch about their centroid, and a wheel zooms about the pointer. The caption, legend, HUD, chrome block and side panel are excluded, so they keep their taps and native scrolling. The controller marks the canvas it owns (`data-diagram-pointer`) and lays its own `touch-action: none` layer under the drawing and the panels, and `diagrams.css` gives the drawing the same, so a touch gesture on the drawing or the empty canvas moves the drawing and never the page, while the panels keep the browser's own touch behavior, page zoom included. Without it the engine keeps the mouse drag and wheel it always had and says so in the console; a copy older than v2 fails closed. **Never hand-edit this file.**
- `diagrams.css` // diagram-specific style layer (page chrome, including the responsive chrome's wide and compact layouts, + SVG nodes/edges) plus the diagram-only token additions and `--diagram-*` legibility tokens; inherits Tier 1 + Tier 2 from the local `colors_and_type.css` mirror. **Byte-identical to the `-H` / `-V` / `-SEQ` copies** — shared by convention, not a runtime import.
- `export-png.js` // 3840×2880 PNG export with header, caveat, legend, and the rendered diagram. **Byte-identical to the `-H` / `-V` / `-SEQ` copies** — it is geometry-agnostic (it serializes the rendered SVG and scales it into the export frame), so the same export serves all four patterns. **Exported chrome resolves the semantic diagram roles first** — `--diagram-ink` then `--fg-1`, `--diagram-muted` then `--fg-2`. `diagrams.css` aliases the semantic roles to the foundation ramp by default, so ordinary consumers export exactly as before; a consumer that legitimately rebinds those roles for its own surface now gets the same treatment in the export that it already gets live, instead of a corrected page and an uncorrected raster.

**Zoom floor tracks Fit.** The ordinary zoom-out floor is this pattern's historical base scale, but the panel-aware fit can legitimately land below it on a constrained viewport. When it does, the live floor becomes the fitted scale, so zoom-out is a no-op at Fit rather than *increasing* the scale (which would reverse the control's direction). Fit itself is never clamped — clamping it would restore the panel collision the helper exists to avoid.

**Fit follows the reader.** The view is at Fit after a fit and until the reader actually moves it — a zoom, a wheel, or a drag of more than a few pixels; a zoom already at its limit, or a tap, leaves it at Fit. Only a view at Fit follows a resize or a `diagram-chrome-change`; a view the reader has zoomed or panned stays where it is, so a browser-toolbar resize no longer resets it. This holds in both shells, the chrome-free static shell included. While a compact panel is open (see Responsive chrome below), the drawing moves clear of it only where it keeps its closed-panel size; otherwise it keeps its closed-panel Fit and the panel overlays it. The Fit button always ends at a usable view: when the open panel would cover the drawing, Fit closes it through the chrome (`window.DIAGRAM_CHROME.close`) and fits. A wheel over `.diagram-info` scrolls the panel instead of zooming (a pinch still zooms the drawing, never the page), and a drag that starts on a panel does not pan. With `diagrams-pointer.js` loaded, touch works the same way: a finger on the drawing pans it, two fingers pinch it, and neither scrolls nor zooms the page; a moved gesture swallows its own click, so a pan neither pins nor unpins a node. In the wide chrome the side panel sits outside the block and lets the pointer through to the canvas, as before.

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific diagram. It is a starting point for downstream diagrams that consume [design-system-ASK](../../README.md) foundations.

## Responsive chrome

The interactive shell opts in; the static shell does not. The interactive shell wraps its one caption (`#diagramCaption`) and one legend (`#diagramLegend`) in `.diagram-info[data-diagram-chrome]`, with a `.diagram-info-triggers` row before them of `.diagram-info-trigger.surface-disclosure-trigger.glass` buttons — About, Legend and Detail — whose `aria-controls` name those panels and the side panel (`#flowPanel`), which stays authored outside the block; and it adds `<div class="diagram-cue">illustrative</div>` to `.bar`, the page's visible qualification while the caption sits behind About. The block stays a direct child of `.canvas-wrap`, itself a direct child of `.shell`; placed anywhere else, the chrome stays in the wide layout. A page without the wrapper keeps its independent panels and its header as before. The script order is `<source> → diagrams-chrome.js → diagrams-fit.js → engine → fonts-embedded.js → export-png.js`, with `diagrams-chrome.js` after the chrome markup, and the stylesheets load `colors_and_type.css → diagrams.css → surface-panel.css → surface-treatments.css`. The engine fails closed on a `diagrams-fit.js` older than v2 when it drives the chrome, whose edge declaration needs it.

`diagrams-chrome.js` chooses one of two layouts and measures again on every resize and when the webfonts land:

- **Wide** // the caption and legend sit together at the top of the canvas: side by side while both fit, the legend wrapping below the caption when they do not, never overlapping. The side panel stays in its bottom-right lane. The header keeps its subtitle and stamp; the triggers and the cue are hidden. On a viewport 960px wide or narrower the header keeps the stamp beside the identity and gives the title block its own row.
- **Compact** // when the canvas is narrower than 640px, or when the open caption and legend would take more than a third of its height, or an open panel would need more width than it gives, or would leave the drawing too little room between them and the HUD for the fit to keep it clear of both (120px after a 26px gutter on each side — the fit helper's own minimum), as under a two-row header on a short landscape phone. The header keeps identity, title and the cue; the subtitle (`.title-block .s`) and the stamp move into About — the same nodes, moved back in wide. The side panel joins the block behind Detail and returns to its own place in wide. What the engine writes into it on hover or pin never switches the mode and does not move the drawing. The triggers join the HUD in one control area at the bottom of the canvas, beside the HUD when there is room and directly above it when not. At most one panel is open. It opens upward and scrolls within the real space between the canvas top and the control area, capped at 60% of the canvas height and never enlarged to a minimum the canvas does not have. Entering compact closes every panel; a resize while compact keeps the reader's choice and the open panel's scroll position. Pinning a node opens Detail. Escape anywhere in the block closes the open panel and returns focus to its trigger, and focus moves only when its target would disappear.

Each trigger's `aria-expanded` and its panel's `hidden` attribute are set together, and the triggers take the controlled disclosure trigger's grammar from `surface-treatments.css`. In compact the trigger row and the open panel declare `data-diagram-fit-edge="bottom"`, so `diagrams-fit.js` reserves the whole control area, HUD included, as bottom chrome; after each change the chrome dispatches `diagram-chrome-change` on the canvas wrap, and the engine refits a view that is at Fit (see Fit follows the reader above).

## How to use it

1. Copy the files in `patterns/diagram-static-FLOW/` into your consuming project (typically under `docs/diagrams/` or similar). Without `diagrams-chrome.js` the interactive shell still renders, but its chrome stays in the wide layout at every size; without `diagrams-pointer.js` both shells keep the mouse drag and wheel but no touch pan or pinch.
2. Sync `colors_and_type.css`, fonts, and any required project-approved assets from design-system-ASK into a local mirror alongside the diagram bundle (for example `./_dsa-tokens/colors_and_type.css`, `./_dsa-tokens/fonts/*.woff2`, and `./_dsa-tokens/fonts-embedded.js` — the embedded-font carrier that lets `PNG page` / `PNG diagram` export offline from a `file://` page, no server), pinned to a known upstream commit SHA. The HTML expects `./_dsa-tokens/colors_and_type.css`; adjust the path if your mirror lives elsewhere. For the interactive shell's responsive chrome, also sync `surface-panel.css` and `surface-treatments.css` into a surface-module mirror; the HTML expects `./_dsa-surface/` and loads `surface-panel.css` first, as `surface-treatments.css` requires.
3. Rename the shells and `diagram-static-FLOW.source.js` to match your project; update the `<script src>` references accordingly.
4. Edit `diagram-static-FLOW.source.js`: replace the generic fixture with your project's actual convergence flow.
5. Edit the interactive shell chrome: update `.mark`, `.title-block`, `.stamp`, `.caption`, `<title>`, `<meta name="description">`, and the legend rows to your project's values. Keep the `.diagram-cue` and the `.diagram-info` structure — one caption, one legend, one side panel, their triggers with About first — and edit only the panels' content. Do not edit the canvas / HUD / corner-tick / glass-panel structure.
6. The **static export shell** (`diagram-static-FLOW.html`) is the chrome-free article target; the **interactive shell** (`diagram-static-FLOW.interactive.html`) is the repo-native explanatory artifact. Open either directly in a browser, or via static hosting / GitHub Pages.

## PNG export

The HUD exposes two PNG exports, both rasterizing the live render through one path (`exportPng({ mode })`):

- **`PNG page`** // the chromed poster: a 3840×2880 render with header, legend, caption, and ticks on the resolved gradient field. Auto-export route `?export=png`. The legend is reproduced from the live DOM as an ordered list of rows, dividers, and group headings, with each swatch drawn from its **computed** presentation (fill, border color / width / style, radius) — so a consumer's semantic legend (colored role swatches, a downstream-group separator, a group heading) exports faithfully; a plain row-only legend lays out exactly as before.
- **`PNG diagram`** // the diagram canvas only: no header, HUD, caption, legend, or ticks, on the resolved gradient field, at the diagram's natural (variable) aspect. Auto-export route `?export=png-diagram`; filename `<slug>-diagram-<theme>.png`.

The diagram bounds are the **engine-authored SVG `width` / `height` / `viewBox`**, so the convergence trunk, eval-bus elbows, arrowheads, and the wide landscape geometry are preserved without clipping. `PNG diagram` replaces the old chrome-free `.clean.html` + Puppeteer two-build workaround — a clean diagram PNG now comes straight from the full diagram HTML. The `PNG page` filename carries the page's resolved theme — `<base>_source-vN_render-vN-light.png` or `…-dark.png` — so a light and a dark export never collide.

**`PNG page` is the same whatever the live layout.** The exporter reads the subtitle and stamp wherever they sit — in the header, or in About while the chrome is compact — and reads the caption without the block that holds them there, so the page and its filename do not depend on the viewport or on which panel is open. The exported caption keeps every line; it is no longer cut at three. The caption and the legend share the page width: side by side at their natural widths where both fit, as before; otherwise the caption wraps to the width left beside the legend; and where that would leave the caption too narrow, it takes the full width and the legend drops below it, right-aligned. A landscape figure keeps its placement unless one of its drawn marks would come within the exporter's panel gutter; then it is fitted below the panels. `PNG diagram` is unchanged.

This pattern's `export-png.js` carries **two corrections** versus the `-H` / `-V` / `-SEQ` baseline, both now folded into the shared canonical exporter:

- a **viewBox-origin offset** for centered / negative-origin content, so a diagram whose geometry extends left of the origin is not clipped;
- a **landscape near-full-height fit**, so a wide convergence-flow figure fills the export frame rather than floating small — unless one of its drawn marks would come within the exporter's panel gutter of the caption or the legend, when it fits below the panel band instead.

The same canonical `export-png.js` serves all four static patterns.

### Theme by embedding surface

Every diagram package generates and retains both theme variants (`-light` and `-dark`). The embedding surface selects the default:

- **Repository documentation and operator-system diagrams default to dark.**
- **Substack and other published long-form editorial diagrams default to light.**
- A stated local exception may override the default for a specific figure.

This rule selects which existing render is embedded. It does not suppress, rename, or replace the alternate-theme export.

## What to replace

- All flow data in `diagram-static-FLOW.source.js` (carrier, rail, field nodes, converge, spine, evalEdges, futureCarrier — labels, shorts, statuses, details)
- All chrome strings in `diagram-static-FLOW.interactive.html`: `.mark`, `.title-block .t`, `.title-block .s`, `.stamp`, `.caption`, legend rows
- The `<title>` and `<meta name="description">` tags in both shells
- The file names if you prefer project-specific names

## What not to edit

- `diagrams-static-FLOW-engine.js`, `diagrams.css`, `export-png.js`, `diagrams-fit.js`, `diagrams-chrome.js`, `diagrams-pointer.js` (the shared engine + style + export + chrome + gestures — modifications break inheritance), and the vendored `surface-panel.css` / `surface-treatments.css`
- The script and stylesheet load order in the shells — in the interactive shell `diagrams-chrome.js` loads after the chrome markup and before `diagrams-fit.js`, and `surface-panel.css` before `surface-treatments.css`; in both, `diagrams-fit.js` must load before the engine, and the engine hard-fails if it is absent, and `diagrams-pointer.js` loads before `diagrams-fit.js`
- The diagram-only token overlays and Tier 1 + Tier 2 references inside `diagrams.css`
- The canvas / HUD / corner-tick / glass-panel / side-panel structure in the HTML, and the `.diagram-info` block's structure (one caption, one legend, the trigger row with About first and Detail for the side panel) and the `.diagram-cue`
- The light / dark theme model: explicit `data-theme="dark"`, explicit `data-theme="light"`, and `prefers-color-scheme` auto-resolve all need to keep working

## Static vs dynamic inheritance

Static diagram artifacts inherit at generation time and freeze for audit. The Tier 1 + Tier 2 tokens, type families, theme bridges, and font files come from the local mirror (`./_dsa-tokens/colors_and_type.css` plus `./_dsa-tokens/fonts/`). `diagrams.css` in this bundle is the diagram-specific compiled style layer and is not a substitute for the upstream tokens. The interactive shell's trigger grammar comes the same way, from the surface-module mirror (`./_dsa-surface/`). There is no runtime fetch from the design-system-ASK repo and no Google Fonts CDN dependency. Re-sync the local mirrors when upstream tokens, fonts or surface modules change; bump the `source-vN` / `render-vN` stamp in the shell each time.

Production code, by contrast, may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The diagram is **illustrative**, not source truth — the consuming repo's prose (`README.md`, `docs/architecture.md`, doctrine files, etc.) remains authoritative. If the diagram and the repo prose diverge, trust the prose and refresh the diagram. Do not modify the repo prose to match a stale diagram.

The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the diagram's content and structure. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream diagram content.

## Class A vs Class B

This is Class A (system / architecture diagram templates), alongside `patterns/diagram-static-H/`, `patterns/diagram-static-V/`, and `patterns/diagram-static-SEQ/`. Class B (project-output artifact templates) is a separate pattern at `patterns/output-artifact/`. The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
