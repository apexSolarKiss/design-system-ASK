# Pattern // diagram-static-FLOW

A reusable **Class A static** scaffold for diagrams whose natural topology is a **convergence flow** — many normative sources converging into one resolved specification, which is then realized, evaluated, governed, and fed back. It is the **fourth** Class A sibling alongside `patterns/diagram-static-H/`, `patterns/diagram-static-V/`, and `patterns/diagram-static-SEQ/`. FLOW carries its own **convergence-flow data grammar** (one shared source model, two render modes) — distinct from the tree/sequence grammar the other three share — but inherits the same visual contract, PNG export, and inheritance-by-reference discipline.

> **Provenance.** Graduated from an asset-pipeline-ASK reference implementation (handoff `2026-06-20_asset-pipeline-ASK_to_design-system-ASK_flow-scaffold-handoff`). This copy is canonical; the upstream reference is a reference, not a source of truth. Consumers vendor this copy by reference.

## When to use this vs `diagram-static-H` / `-V` / `-SEQ`

- **`diagram-static-H`** — horizontal *tree*: parent→child hierarchy expanding left → right.
- **`diagram-static-V`** — vertical *tree*: parent→child hierarchy as a centered top→down spine.
- **`diagram-static-SEQ`** — vertical *sequence*: ordered steps joined by arrows; the relation is succession, not hierarchy.
- **`diagram-static-FLOW`** (this pattern) — a *convergence flow*: a field of many normative sources **converging** into one resolved specification, a process spine with **parallel realization** that fans out and reconverges, a secondary **evaluation bus** re-entering a later node, and a **return loop** that closes the flow back to its own input lane.

The trees render hierarchy; the sequence renders direction; the flow renders a topology none of the others express — convergence, parallel realization, an evaluation bus, and a return loop in one figure. Pick the one whose geometry matches the diagram; do not fork one to fake another.

## Two render modes (load-bearing)

There is **one shared source model and two render modes that cannot drift**, because both modes read the same `window.FLOW_DIAGRAM` object. The mode is chosen at render time from `window.FLOW_MODE` (`'static'` default | `'interactive'`):

- **static / export** — draws each node's `short` label plus the topology, and **must be legible without interaction**. This is what the article export and the PNG carry.
- **interactive** — identical topology plus a `detail`-fed side panel revealed on hover (click to pin), and a weight-only highlight on the focused node (**no new hue**).

Descriptive density lives in the side panel, never crammed into the figure. The static figure stays sparse on purpose; the explanation is the panel's job.

## Topology primitives

- **External carrier** in a left lane — an input that sits outside the source field.
- **Typed-reference rail** in its own label-lane across the top of the field — how a carrier qualifies the field (anchor · evidence · constrain); short taps down, never crossing node text.
- A **single left-aligned source field** of normative inputs (inputs recede).
- A **many-to-one convergence trunk** gathering the field into an **anchored resolved specification**.
- A **process spine** descending from the resolved spec.
- An **orthogonal parallel fan-out + reconverge** on the spine (e.g. object and cross-object relations realized in parallel, then rejoined).
- A **secondary dotted evaluation bus** re-entering a later spine node (the conformance re-check against the source obligations).
- A **continuation to a governed-result anchor**.
- A **future-reference return lane + dotted return loop** that closes the governed result back as a potential carrier input.

Tiers: `anchor` (heavier stroke) / `recede` (muted). Per-node `status: earned | held | legacy` (`held` renders **dashed**). **Hierarchy is weight / contrast / dash only — no new hue; this is NOT Spectral State or Evidence State** (those are the only opt-in state-color families, and they are not used here).

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

- `README.md` — this file
- `diagram-static-FLOW.html` — the **chrome-free static export shell**: diagram only, on the gradient field. This is the article target.
- `diagram-static-FLOW.interactive.html` — the **full-chrome interactive shell** (header, canvas, legend, HUD, caption, side panel). This is the repo-native explanatory artifact; it sets `window.FLOW_MODE = 'interactive'`.
- `diagram-static-FLOW.source.js` — a **generic demo fixture** expressed as a single `window.FLOW_DIAGRAM` literal; illustrates the grammar only and is replaced downstream.
- `diagrams-static-FLOW-engine.js` — **the convergence-flow placement + pan/zoom engine**. It measures against the actual Inter / JetBrains Mono fonts, waiting for them to load first, and adds the CSS `letter-spacing` that `canvas.measureText` ignores, so labels never overflow their boxes. **If you change a `letter-spacing` value in `diagrams.css`, update the matching `LS_*` constant in the engine.**
- `diagrams.css` — diagram-specific style layer (page chrome + SVG nodes/edges) plus the diagram-only token additions and `--diagram-*` legibility tokens; inherits Tier 1 + Tier 2 from the local `colors_and_type.css` mirror. **Byte-identical to the `-H` / `-V` / `-SEQ` copies** — shared by convention, not a runtime import.
- `export-png.js` — 3840×2880 PNG export with header, caveat, legend, and the rendered diagram. **Byte-identical to the `-H` / `-V` / `-SEQ` copies** — it is geometry-agnostic (it serializes the rendered SVG and scales it into the export frame), so the same export serves all four patterns.

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific diagram. It is a starting point for downstream diagrams that consume design-system-ASK foundations.

## How to use it

1. Copy the files in `patterns/diagram-static-FLOW/` into your consuming project (typically under `docs/diagrams/` or similar).
2. Sync `colors_and_type.css`, fonts, and any required project-approved assets from design-system-ASK into a local mirror alongside the diagram bundle (for example `./_dsa-tokens/colors_and_type.css`, `./_dsa-tokens/fonts/*.woff2`, and `./_dsa-tokens/fonts-embedded.js` — the embedded-font carrier that lets `PNG page` / `PNG diagram` export offline from a `file://` page, no server), pinned to a known upstream commit SHA. The HTML expects `./_dsa-tokens/colors_and_type.css`; adjust the path if your mirror lives elsewhere.
3. Rename the shells and `diagram-static-FLOW.source.js` to match your project; update the `<script src>` references accordingly.
4. Edit `diagram-static-FLOW.source.js`: replace the generic fixture with your project's actual convergence flow.
5. Edit the interactive shell chrome: update `.mark`, `.title-block`, `.stamp`, `.caption`, `<title>`, `<meta name="description">`, and the legend rows to your project's values. Do not edit the canvas / HUD / corner-tick / glass-panel structure.
6. The **static export shell** (`diagram-static-FLOW.html`) is the chrome-free article target; the **interactive shell** (`diagram-static-FLOW.interactive.html`) is the repo-native explanatory artifact. Open either directly in a browser, or via static hosting / GitHub Pages.

## PNG export

The HUD exposes two PNG exports, both rasterizing the live render through one path (`exportPng({ mode })`):

- **`PNG page`** — the chromed poster: a 3840×2880 render with header, legend, caption, and ticks on the resolved gradient field. Auto-export route `?export=png`. This is the existing export; its contract is unchanged.
- **`PNG diagram`** — the diagram canvas only: no header, HUD, caption, legend, or ticks, on the resolved gradient field, at the diagram's natural (variable) aspect. Auto-export route `?export=png-diagram`; filename `<slug>-diagram-<theme>.png`.

The diagram bounds are the **engine-authored SVG `width` / `height` / `viewBox`**, so the convergence trunk, eval-bus elbows, arrowheads, and the wide landscape geometry are preserved without clipping. `PNG diagram` replaces the old chrome-free `.clean.html` + Puppeteer two-build workaround — a clean diagram PNG now comes straight from the full diagram HTML. The `PNG page` filename carries the page's resolved theme — `<base>_source-vN_render-vN-light.png` or `…-dark.png` — so a light and a dark export never collide.

This pattern's `export-png.js` carries **two corrections** versus the `-H` / `-V` / `-SEQ` baseline, both backward-compatible and now folded into the shared canonical exporter:

- a **viewBox-origin offset** for centered / negative-origin content, so a diagram whose geometry extends left of the origin is not clipped;
- a **landscape near-full-height fit**, so a wide convergence-flow figure fills the export frame rather than floating small.

Because both are backward-compatible, the same canonical `export-png.js` continues to serve the portrait siblings unchanged.

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

- `diagrams-static-FLOW-engine.js`, `diagrams.css`, `export-png.js` (the shared engine + style + export — modifications break inheritance)
- The diagram-only token overlays and Tier 1 + Tier 2 references inside `diagrams.css`
- The canvas / HUD / corner-tick / glass-panel / side-panel structure in the HTML
- The light / dark theme model: explicit `data-theme="dark"`, explicit `data-theme="light"`, and `prefers-color-scheme` auto-resolve all need to keep working

## Static vs dynamic inheritance

Static diagram artifacts inherit at generation time and freeze for audit. The Tier 1 + Tier 2 tokens, type families, theme bridges, and font files come from the local mirror (`./_dsa-tokens/colors_and_type.css` plus `./_dsa-tokens/fonts/`). `diagrams.css` in this bundle is the diagram-specific compiled style layer and is not a substitute for the upstream tokens. There is no runtime fetch from the design-system-ASK repo and no Google Fonts CDN dependency. Re-sync the local mirror when upstream tokens or fonts change; bump the `source-vN` / `render-vN` stamp in the shell each time.

Production code, by contrast, may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The diagram is **illustrative**, not source truth — the consuming repo's prose (`README.md`, `docs/architecture.md`, doctrine files, etc.) remains authoritative. If the diagram and the repo prose diverge, trust the prose and refresh the diagram. Do not modify the repo prose to match a stale diagram.

The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the diagram's content and structure. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream diagram content.

## Class A vs Class B

This is Class A (system / architecture diagram templates), alongside `patterns/diagram-static-H/`, `patterns/diagram-static-V/`, and `patterns/diagram-static-SEQ/`. Class B (project-output artifact templates) is a separate pattern at `patterns/output-artifact/`. The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
