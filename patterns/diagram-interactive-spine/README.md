# Pattern // diagram-interactive-spine

A reusable scaffold for an **interactive information-architecture state surface** — a navigable, stateful spine of architectural layers, seams, and open questions, each node **colored by its state**. It is the **interactive** member of the Class A diagram family, alongside the static members `diagram-static-H` (horizontal cascade), `diagram-static-V` (vertical centered spine), `diagram-static-SEQ` (ordered arrowed sequence), and `diagram-static-FLOW` (convergence flow).

`diagram-interactive-spine` is **Class A — interactive**. It is *not* `diagram-static-V-interactive`: static-vs-interactive is the artifact-class distinction, encoded in the name.

## What this pattern is

A small consumption pattern. Six files:

- `README.md` — this file
- `diagram-interactive-spine.html` — the shell page (bar, canvas, inspector, legend, HUD, caption)
- `diagram-interactive-spine.source.js` — the IA data, as a single `window.IA_STATE_SPINE` literal (**consumer-owned**)
- `diagrams-interactive-spine-engine.js` — the layout + interaction engine (`window.IA_SPINE.render`)
- `diagrams-interactive-spine.css` — the interactive style layer
- `export-png.js` — 3840×2880 PNG export that bakes the resolved state colors inline

It is **not** a component library, a generator, a build pipeline, or a project-specific surface. It is a starting point for a project's own interactive IA, building on design-system-ASK foundations.

## It consumes Spectral State (unlike the static scaffolds)

The static diagram scaffolds are **structural** and assert no state — they do not load `spectral-state.css`. This interactive surface is **state-bearing**: each node is colored by one of the eight **Spectral State** roles (`--state-*`), set via a single `--st` custom property per node. So it loads, in order: `colors_and_type.css` → `spectral-state.css` → `diagrams-interactive-spine.css`. **Color encodes state only.**

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

Hover previews a node (its relationships + inspector); click locks it; click empty space clears. The inspector shows the node's state + meaning and its metadata. Pan (drag), zoom (wheel / HUD), fit (`⤢`). The `PNG page` button exports a 3840×2880 poster with the resolved state colors baked in (theme-correct at click time); `PNG diagram` exports the spine canvas only (see PNG export below).

## How to use it

1. Copy the six files into your project (e.g. `docs/diagrams/interactive/`).
2. Sync a local `_dsa-tokens` mirror — `colors_and_type.css` **and `spectral-state.css`** + fonts — pinned to a known design-system-ASK commit SHA. **No CDN.** The HTML expects `./_dsa-tokens/`; adjust if yours differs.
3. Rename `diagram-interactive-spine.html` / `.source.js` to your project; update the `<script src>` ref.
4. Replace `diagram-interactive-spine.source.js` with your own IA (`window.IA_STATE_SPINE`).
5. Edit the HTML chrome (`.mark`, `.title-block`, `.stamp`, `<title>`, `<meta>`). Do not edit the canvas / inspector / legend / HUD / corner-tick structure.
6. Open the HTML directly, or via static hosting. The `PNG page` button (or `?export=png`) exports a poster in the resolved theme; `PNG diagram` (or `?export=png-diagram`) exports the canvas only.

## PNG export

### The two exports

The HUD exposes two PNG exports, both rasterizing the live render through one path (`exportPng({ mode })`):

- **`PNG page`** — the chromed poster: a 3840×2880 render with header, caption, and legend on the resolved gradient field. Auto-export route `?export=png`; filename carries the theme (see Artifact naming below). This is the existing export; its contract is unchanged.
- **`PNG diagram`** — the spine canvas only: no header, HUD, caption, or legend, on the resolved gradient field, at the spine's natural (variable) aspect. Auto-export route `?export=png-diagram`; filename `<slug>-diagram-<theme>.png`.

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

- `diagrams-interactive-spine-engine.js`, `diagrams-interactive-spine.css`, `export-png.js` (the shared engine + style + export — modifications break inheritance)
- The Spectral State role vocabulary (the eight `--state-*` roles) — inherited; do not rename or recolor
- The load order (`colors_and_type.css` → `spectral-state.css` → pattern CSS)

## Discipline

- **Color encodes state only.** Evidence depth, risk, mode coverage, repo pointers live in the inspector, never in hue.
- **One state role per node.**
- **Title by dimension, not the umbrella.** This surface depicts *state* (status / maturity) of the architecture — it is not "the" information architecture. Title it for its dimension, e.g. **"Information architecture — state"** (the placeholder default), not the bare "Information architecture". Structural diagrams name their axis (ontology, inheritance); this one names its dimension (state). Claiming the umbrella title would imply the other diagrams are sub-views of this one — they are peers.
- **Consumer owns** source data + chrome; **design-system owns** engine / CSS / export.
- **Offline / no CDN**; local pinned `_dsa-tokens` mirror. No Tier 3.

## Source-truth boundary

design-system-ASK supplies Tier 1 + Tier 2 (and the Spectral State primitive). The diagram is **illustrative**, not source truth — the consuming repo's prose remains authoritative. The consuming project supplies its own Tier 3 identity, its IA content, and its source-truth posture.

## Class A static vs interactive · Class B

- **Class A — static:** `diagram-static-H`, `diagram-static-V`, `diagram-static-SEQ`, `diagram-static-FLOW` (structural; state-free).
- **Class A — interactive:** `diagram-interactive-spine` (this pattern; state-bearing; consumes Spectral State).
- **Class B:** `patterns/output-artifact/` (project-output artifacts).

The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2; they serve different artifact classes.
