# Pattern // diagram-interactive-spine

A reusable scaffold for an **interactive information-architecture state surface** — a navigable, stateful spine of architectural layers, seams, and open questions, each node **colored by its state**. It is the **interactive** member of the Class A diagram family, alongside the static members `diagram-static-H` (horizontal cascade), `diagram-static-V` (vertical centered spine), `diagram-static-SEQ` (ordered arrowed sequence), and `diagram-static-FLOW` (convergence flow).

`diagram-interactive-spine` is **Class A — interactive**. It is *not* `diagram-static-V-interactive`: static-vs-interactive is the artifact-class distinction, encoded in the name.

## What this pattern is

A small consumption pattern. Eight files:

- `README.md` — this file
- `diagram-interactive-spine.html` — the shell page (bar, canvas, inspector, legend, HUD, caption; the engine adds the compact triggers)
- `diagram-interactive-spine.source.js` — the IA data, as a single `window.IA_STATE_SPINE` literal (**consumer-owned**)
- `diagrams-interactive-spine-engine.js` — the layout + interaction engine (`window.IA_SPINE.render`)
- `diagrams-fit.js` — **DS-owned shared fit support.** Computes the default zoom-to-fit transform: it measures the *visible* glass panels and, **only when the figure would actually collide with one**, centers it in the edge-safe region that remains. A placement that already clears the chrome is kept exactly as-is — reservation is overlap-gated, so a figure is never shrunk to avoid chrome it does not reach, so a wide, short figure no longer renders its top band underneath them. **This pattern's panel anatomy differs from the static siblings**, and the engine decides which edge each panel costs (below).

**Zoom floor tracks Fit.** The ordinary zoom-out floor is this pattern's historical base scale, but the panel-aware fit can legitimately land below it on a constrained viewport. When it does, the live floor becomes the fitted scale, so zoom-out is a no-op at Fit rather than *increasing* the scale (which would reverse the control's direction). Fit itself is never clamped — clamping it would restore the panel collision the helper exists to avoid.

**Which edge each panel costs.** A panel reserves the band of the edge it is classified under, and that band spans the whole canvas: in the right lane a panel costs its width over the full height, in the bottom band its height over the full width. Which costs the drawing less depends on the canvas, so **every Fit evaluates a small fixed set of arrangements and applies the clear one with the larger scale** (a tie keeps the earlier; where none clears, the first stands):

```text
wide       .inspector right lane, always: it grows down with its content, and only a lane
                      bounded by its width cannot be outgrown by a populated inspector
           .caption   bottom band, always
           .hud + .legend, each on either edge it occupies:
             1  legend right,  HUD bottom
             2  legend bottom, HUD bottom
             3  legend right,  HUD left
             4  legend bottom, HUD left
compact    the HUD, the trigger row and any open panel: one bottom band
```

With this pattern's own chrome the first wins or ties wherever the canvas is wide: the inspector's lane is wider than the legend, so the legend's lane costs nothing more, and the caption is taller than the HUD, so a HUD lane buys nothing. The others decide where a consumer's legend is wider than the inspector or its caption shorter than the HUD. The HUD was once always a left lane. With the exporter's buttons it is over 300px wide, and as a lane it reserved that width down the whole canvas for a control in its bottom-left corner, so an explicit Fit gave the drawing barely half the canvas width; it is now one arrangement among four, chosen only where it costs less. The helper can report a placement that exactly fills its reserved axis as obstructed by a float rounding of a fraction of a pixel, so the engine re-tests such a result against the same visible panels with 0.5px of the gutter's tolerance; a real overlap is far larger and still fails. Panel sizes are measured live, never hard-coded, and hidden or zero-area panels reserve nothing. **Load it immediately BEFORE the engine** — the engine throws a named error if it is missing rather than silently falling back to the old geometry. **Byte-identical to the copies in the sibling patterns** — shared by convention, not a runtime import; re-vendor it alongside the engine. With no visible panels the fit is **algebraically equivalent to the previous fit, with no intentional geometry change** — the engine expresses its long-standing 60px content margin as *expanded bounds* with zero subtractive clearance, and passes its historical `clientWidth`/`clientHeight` viewport measurement explicitly. (Equivalent floating-point evaluation orders may differ at machine precision only.) This pattern passes zero subtractive clearance, so the constrained-clearance branch introduced by this owner correction does not alter its fit — its historical margin remains expressed entirely through the expanded bounds.
- `diagrams-pointer.js` — **DS-owned shared pointer controller, a GENERATED MIRROR.** Canonical source is `patterns/_diagram-shared/diagrams-pointer.js`; this copy is emitted by `tools/sync-diagram-shared.mjs` and is byte-identical to the radial pattern's. It recognizes pan, pinch, tap and wheel on Pointer Events for mouse, pen and touch; the engine keeps the camera, the zoom range and every selection decision. **Load it BEFORE `diagrams-fit.js` and the engine**, as the radial pattern does — the engine throws a named error if it is missing rather than falling back to a mouse-only pan. Never hand-edit it; edit the canonical and re-emit.
- `diagrams-interactive-spine.css` — the interactive style layer
- `export-png.js` — 3840×2880 PNG export that bakes the resolved state colors inline

It is **not** a component library, a generator, a build pipeline, or a project-specific surface. It is a starting point for a project's own interactive IA, building on [design-system-ASK](../../README.md) foundations.

## It consumes Spectral State (unlike the static scaffolds)

The static diagram scaffolds are **structural** and assert no state — they do not load `spectral-state.css`. This interactive surface is **state-bearing**: each node is colored by one of the eight **Spectral State** roles (`--state-*`), set via a single `--st` custom property per node. So it loads, in order: `colors_and_type.css` → `spectral-state.css` → `diagrams-interactive-spine.css`, then the surface modules for the compact triggers (`surface-panel.css` → `surface-treatments.css`). **Color encodes state only.**

## Data grammar

```js
window.IA_STATE_SPINE = {
  meta:   { title, subtitle, stamp },
  states: [ { role, label, meaning }, … ],   // the eight Spectral State roles (the legend)
  nodes:  [ { id, group, label, state, evidence, qualifier?, pointer, modes? }, … ],
};
```

- **`group`** — `'root' | 'mode' | 'spine' | 'question' | 'external'`. The spine is the main vertical axis (layers upstream→downstream); `mode` nodes are orthogonal facets a node may intersect (selecting one isolates them); `question` nodes are open questions / candidates; `external` is owned-elsewhere; `root` is the framing node (asserts no state).
- **`state`** — exactly one of the eight Spectral State roles. Drives node color.
- **`modes`** — ids of the mode nodes a node intersects; selection draws the relationships and isolates the set.
- **`evidence` / `qualifier` / `pointer`** — inspector metadata (never encoded in hue). `pointer` is the authoritative repo source for that node.

## Interactions

Hover previews a node (its relationships + inspector) for a mouse; click or tap locks it; click or tap empty space clears. The inspector shows the node's state + meaning and its metadata. Pan (drag with the primary mouse button, a pen or one finger, from anywhere on the stage, a node included), pinch (two fingers, about their centroid), zoom (wheel / HUD), fit (`⤢`). The `PNG page` button exports a 3840×2880 poster with the resolved state colors baked in (theme-correct at click time); `PNG diagram` exports the spine canvas only (see PNG export below).

**Pointer and touch** (`diagrams-pointer.js`): a drag pans once it passes a tap slop (4px for a mouse, 12px for a finger or pen), so a tap still selects; a moved gesture swallows the click that follows it, so a pan never selects or clears; the wheel zooms one 1.12 step about the pointer, and a horizontal scroll does not zoom. Pinch and wheel share the HUD's zoom range, whose floor tracks the most recent Fit. The stage carries `touch-action: none`, so a gesture on the stage pans or pinches the diagram instead of scrolling or zooming the page; the inspector, legend, caption, HUD and triggers sit outside the stage, so their taps are their own, and an inspector or open panel taller than its room scrolls inside it. A hover preview answers a mouse only, so a touch tap selects rather than previews.

**Responsive chrome.** The engine composes the inspector, legend, caption and HUD as one arrangement, recorded on the canvas as `data-spine-chrome`. It follows the static patterns' responsive chrome (`diagrams-chrome.js`) in everything a reader meets, and differs only where this pattern's anatomy does:

- **Wide**, where the canvas holds the panels apart and keeping them open costs the drawing little: each keeps its place. The caption is centered in the slot between the HUD at its widest and the legend; the inspector keeps the top-right corner and scrolls inside the room above the legend, in the tab order so a keyboard can scroll it. Wide holds while that slot is at least 240px, that room at least 160px, the caption no taller than the legend, and the wide Fit keeps at least 80% of the scale the compact arrangement would give the drawing: on a tall, narrow window or a tablet held upright, the inspector's lane would otherwise take most of the drawing's width while the canvas has height to spare.
- **Compact**, everywhere else: the inspector, legend and caption close behind **About**, **Legend** and **Inspector** triggers in the shared disclosure grammar (`surface-treatments.css`), which the engine adds and which sit beside the HUD where the band has room and directly above it where it does not. At most one panel is open; it opens upward from the band across the canvas and scrolls inside the room between the canvas top and the band (at most 60% of the canvas). Each trigger's `aria-expanded` and its panel's `hidden` attribute are set together. Entering compact closes every panel, so the first view gives the drawing the canvas; staying compact keeps the reader's panel and its scroll position. Escape, from the open panel or the triggers, closes it and leaves focus on its trigger.
- **A tap or click that locks a node** opens the inspector where it sits behind its trigger. While the view is at Fit, an open panel moves the drawing only where the drawing keeps its closed-panel scale clear of the panel, and otherwise overlays it; a camera the reader moved stays put. Where the inspector sheet still covers the locked node, the drawing moves up just enough, at the same scale, to show the node above it (a node taller than that room shows its top). The `⤢` control closes a panel that would cover the drawing, then fits.
- **Settled chrome and Fit mode.** The first render fits before the exporter has added its buttons and before the webfonts land, and a header that wraps resizes the canvas without a window resize. The engine observes the canvas and the HUD and awaits the webfonts and the page load; each change re-lays the chrome and refits a view that is still **at Fit** — after a Fit and until the reader pans, pinches, wheels or zooms, or a locked node is revealed above the compact inspector. A camera the reader moved stays where the reader left it, and a HUD narrowed by a running export is not a change to fit to. A window resize refits whatever the view, as it always has.
- `window.IA_SPINE.report()` returns a read-only account of the camera, the arrangement and the last Fit (including how an open compact panel entered it: reserved, or overlaid), for diagnostics and the behavior harness.
- **It follows the static patterns' responsive chrome** (`diagrams-chrome.js`) in its trigger grammar and panel behavior. It does not move the header's subtitle and stamp into About: this pattern's exporter reads them from the header.

## How to use it

1. Copy the eight files into your project (e.g. `docs/diagrams/interactive/`).
2. Sync a local `_dsa-tokens` mirror — `colors_and_type.css` **and `spectral-state.css`** + fonts + `fonts-embedded.js` (the embedded-font carrier that lets `PNG page` / `PNG diagram` export offline from a `file://` page, no server) — pinned to a known design-system-ASK commit SHA. **No CDN.** The HTML expects `./_dsa-tokens/`; adjust if yours differs. For the compact triggers' disclosure grammar, also sync `surface-panel.css` and `surface-treatments.css` into a surface-module mirror; the HTML expects `./_dsa-surface/` (adjust if yours differs) and loads `surface-panel.css` first, as `surface-treatments.css` requires. An existing consumer adds that mirror and the two `<link>`s when it re-syncs; without them the triggers still work, but lose the shared grammar's type, case and turning indicator.
3. Rename `diagram-interactive-spine.html` / `.source.js` to your project; update the `<script src>` ref.
4. Replace `diagram-interactive-spine.source.js` with your own IA (`window.IA_STATE_SPINE`).
5. Edit the HTML chrome (`.mark`, `.title-block`, `.stamp`, `<title>`, `<meta>`). Do not edit the canvas / inspector / legend / HUD / caption / corner-tick structure; the engine adds the trigger row itself.
6. Open the HTML directly, or via static hosting. The `PNG page` button (or `?export=png`) exports a poster in the resolved theme; `PNG diagram` (or `?export=png-diagram`) exports the canvas only.

## PNG export

### The two exports

The HUD exposes two PNG exports, both rasterizing the live render through one path (`exportPng({ mode })`):

- **`PNG page`** — the chromed poster: a 3840×2880 render with header, caption, and legend on the resolved gradient field. Auto-export route `?export=png`; filename carries the theme (see Artifact naming below). This is the existing export; its contract is unchanged.
- **`PNG diagram`** — the spine canvas only: no header, HUD, caption, or legend, on the resolved gradient field, at the spine's natural (variable) aspect. Auto-export route `?export=png-diagram`; filename `<slug>-diagram-<theme>.png`.

Neither export depends on the arrangement: the panels are the same authored elements in every state, so a legend and caption folded behind their triggers still reach `PNG page`, the trigger words never do, and `PNG diagram` stays chrome-free.

The diagram bounds are the **`#vp` content bounds** (the full edges + nodes subtree, the same bounds the page export uses), reset to the neutral resting frame, so nodes, connectors, and labels are preserved without clipping. `PNG diagram` replaces the old chrome-free `.clean.html` + Puppeteer two-build workaround — a clean diagram PNG now comes straight from the full diagram HTML.

### Artifact naming

The `PNG page` button exports at the page's resolved theme, and the **exported filename carries that theme** — `<base>_source-vN_render-vN-light.png` or `…-dark.png` (theme resolved by the same precedence as the CSS: an explicit `data-theme` on `<html>` wins, otherwise the OS `prefers-color-scheme`). The suffix keeps a light and a dark export of the same spine from colliding in Downloads, scratch, review folders, or handoff contexts.

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

- All IA data in `diagram-interactive-spine.source.js` (states are inherited — keep the eight roles; author your own nodes)
- The chrome strings in the HTML (`.mark`, `.title-block`, `.stamp`, `<title>`, `<meta>`)
- The file names (`diagram-interactive-spine.html` / `.source.js`) if you prefer project-specific names

## What not to edit

- `diagrams-interactive-spine-engine.js`, `diagrams-interactive-spine.css`, `export-png.js`, `diagrams-fit.js`, `diagrams-pointer.js` (the shared engine + style + export + support — modifications break inheritance)
- The script load order in the shell — `diagrams-pointer.js` and `diagrams-fit.js` must load before the engine; the engine hard-fails if either is absent
- The Spectral State role vocabulary (the eight `--state-*` roles) — inherited; do not rename or recolor
- The load order (`colors_and_type.css` → `spectral-state.css` → pattern CSS → `surface-panel.css` → `surface-treatments.css`)

## Discipline

- **Color encodes state only.** Evidence depth, risk, mode coverage, repo pointers live in the inspector, never in hue.
- **One state role per node.**
- **Title by dimension, not the umbrella.** This surface depicts *state* (status / maturity) of the architecture — it is not "the" information architecture. Title it for its dimension, e.g. **"Information architecture — state"** (the placeholder default), not the bare "Information architecture". Structural diagrams name their axis (ontology, inheritance); this one names its dimension (state). Claiming the umbrella title would imply the other diagrams are sub-views of this one — they are peers.
- **Consumer owns** source data, chrome, generation, sealing + the frozen artifact; **design-system owns** engine / CSS / export script.
- **Offline / no CDN**; local pinned `_dsa-tokens` and `_dsa-surface` mirrors. No Tier 3.

## Source-truth boundary

design-system-ASK supplies Tier 1 + Tier 2 (and the Spectral State primitive). The diagram is **illustrative**, not source truth — the consuming repo's prose remains authoritative. The consuming project supplies its own Tier 3 identity, its IA content, and its source-truth posture.

## Class A static vs interactive · Class B

- **Class A — static:** `diagram-static-H`, `diagram-static-V`, `diagram-static-SEQ`, `diagram-static-FLOW` (structural; state-free).
- **Class A — interactive:** `diagram-interactive-spine` (this pattern; state-bearing; consumes Spectral State).
- **Class B:** `patterns/output-artifact/` (project-output artifacts).

The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2; they serve different artifact classes.
