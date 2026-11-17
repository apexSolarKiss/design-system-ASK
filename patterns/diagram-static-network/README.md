# Pattern // diagram-static-network

A reusable static-artifact scaffold for **layered networks**: ordered layers of neutral nodes, joined by declared connections between adjacent layers, in one or two panels that each run in a direction of their own, with the notation and equations a source sets beside them. It inherits the [design-system-ASK](../../README.md) visual language. The reference specimen draws the forward and backward passes of a feed-forward network; a second, synthetic specimen draws a sparse network of another shape through the same engine.

This is a **Class A static** diagram scaffold, distinct from the **Class B** project-output artifact patterns. Its static siblings — [`patterns/diagram-static-H/`](../diagram-static-H/README.md), [`-V/`](../diagram-static-V/README.md), [`-SEQ/`](../diagram-static-SEQ/README.md) and [`-FLOW/`](../diagram-static-FLOW/README.md) — share the `window.DIAGRAMS.render` interface; [`patterns/diagram-static-peer/`](../diagram-static-peer/README.md) arranges equal peers on a sealed plate. This pattern arranges ordered layers. It has its own network grammar, engine, glyph carrier and exporter, and takes none of the siblings' chrome, fit, pointer or text-layout carriers: a sealed plate of fixed geometry has no canvas to pan and no label to wrap.

## What this pattern is

A plate is drawn in units of its own: the foundation's 45-degree gradient field, the network's nodes as neutral outlined rings, and a connector for each declared connection, a line with a filled, slightly notched head. In each panel the first layer sits at the bottom and the last at the top; every layer is centered on the panel's axis. A panel that runs **up** points each connector from a layer to the next; a panel that runs **down** points it back. A panel may draw **signals** at the top layer — arrows leaving it upward, or entering it from above — and may carry **equations** beside its layers. Under the panels sit the **notes**, then the **credit**.

A node carries no state, emphasis or selection, and a connector no meaning beyond its direction: the engine reads nothing into a connection. The spec owns the content — the layers, the connections, the marks, the weights, each panel's direction, signals and equations, the notes and the credit — and the engine owns placement, connectors, notation layout and presentation.

Eight files:

- `README.md` // this file
- `diagram-static-network.html` // the specimen: the reference specimen, the second specimen and the checks, drawn from the network sources, with one mode selector
- `diagram-static-network.source.js` // the network sources the specimen draws, as one `window.NETWORK_DIAGRAMS` array
- `diagrams-static-network-engine.js` // **DS-owned engine** (`window.DIAGRAM_NETWORK`, or a Node module): validation, layout, the clearance of every weight label, and the renderer, a pure function from a spec to a standalone SVG string. The page and the exporter run the same code
- `diagrams-static-network.css` // the specimen's column, figure stack, plate frame and mode selector. Its text takes the document register
- `diagrams-static-network-glyphs.js` // **DS-owned, GENERATED** by `tools/gen-network-font.py`: per face — Inter roman, Inter italic with its tailed `l`, JetBrains Mono for the set-membership sign, and the summation sign at its own weight — each supported character's advance and its ink's bounds `[xMin, yMin, xMax, yMax]`, rounded outward so a box built from them never understates the ink, an italic overhang past the advance included, and the face's ascent and descent. Never hand-edit it
- `diagrams-static-network-font.js` // **DS-owned, GENERATED** by the same tool: the three subsets as base64 `@font-face` rules under private family names, `dsn-inter-` and `dsn-mono-` followed by the first 12 hex digits of the sha256 of that family's subsets (Inter's roman and italic together), with Inter's and JetBrains Mono's copyright and SIL Open Font License text. Only the exporter loads it
- `export-network.mjs` // **DS-owned exporter** (Node 18 or later, no dependency): writes each spec as standalone SVG files and, on request, PNG files

**Load order is a contract.** The page loads the stylesheets `colors_and_type.css → surface-text-link.css → surface-document.css → diagrams-static-network.css`, then the scripts `<source> → diagrams-static-network-glyphs.js → diagrams-static-network-engine.js`, then its own script. The engine reads nothing global: the page passes it the glyph carrier on every call, and `render` fails closed rather than lay notation out by guesswork: without one, `GLYPHS_MISSING`; with one that lacks a face's advances, ink bounds, ascent or descent, or an advance for a supported character or the summation sign, or whose numbers are unusable, `GLYPHS_MALFORMED`. `validate` without a usable carrier reports the carrier's error and no character errors.

The pattern is **not** a component library, a generator, a build pipeline, an npm package or a project-specific diagram. It is a starting point for downstream layered-network diagrams that consume design-system-ASK foundations.

## The network contract

```text
spec = {
  id:        letters, digits, '.', '_' and '-'                  'network.forward-backward'
  title?:    the plate's accessible name, with no control character; defaults to id
  role?:     free text for the page; the engine ignores it
  layers:    [{ id, n, label? }, ...]  two to eight, first layer first; n is one to twelve nodes
  edges:     [[from, to], ...]          node ids, each from a layer to the next
  marks?:    { nodeId: 'i', ... }       one character drawn on a node, in italic
  weights?:  [{ from, to, label }, ...] a label on a declared connection, in notation
  panels:    [{ title?, direction, signals?, layerLabels?, equations? }, ...]  one or two
  notes?:    [text, ...]                drawn under the panels in the annotated view
  credit?:   text                       drawn under the notes in every view
}
```

- **Nodes.** A layer's nodes are `<layer id>.<k>`, `k` from 0 to `n − 1`, left to right. A layer id starts with a letter and continues in letters, digits, `_` or `-`; layer ids are distinct.
- **Connections.** A connection joins a node to a node of the **next** layer, in that order; one to a layer further on, or backward, is `EDGE_NOT_ADJACENT`. **An undrawn connection is absent**: the engine never completes a layer's connections. A source whose equations sum over a complete layer says, in its notes, how absent connections enter that sum.
- **Panels.** `direction` is `up` (forward, first layer to last) or `down`. `signals` is `leaving`, `entering` or `none` (default). `layerLabels` draws each layer's `label` beside the panel. `equations` is `[{ layer, lines }]`, one or two notation lines set beside the named layer.
- **Notation.** A line is an array of items, each with exactly one key: `{ r: text }` roman, `{ i: text }` italic, `{ m: '∈' }` the set-membership sign, `{ sub: [items] }` a subscript, `{ frac: [[items], [items]] }` a fraction, `{ sum: [items] }` a summation sign with its limit set below; items nest at most three levels, and every run has at least one item. A fraction stacks by extent, as TeX does: its numerator's lowest ink sits a gap of 0.18 of the size above the bar and its denominator's highest ink as far below it, whatever either holds, nested fractions and subscripts included; a sum's limits sit below the sign's ink. One placement function decides where every piece goes, and the engine both draws and measures from it. Text is the supported characters only — printable Basic Latin and `–`, `−`, `∂`, `Σ` — and the sign run carries `∈` only: nothing falls back to another font, and a look-alike is `NOTATION_UNSUPPORTED`. Every italic run sets Inter's character variant `cv05`, the lower-case `l` with a tail, so an italic `l` never reads as a slash or a one.
- **Text.** Panel titles, layer labels, notes and the credit are supported characters only; the title is accessible text and may be any text with no control character.
- **Closed fields.** A spec, a layer, a weight, a panel, an equation block, the options and a theme each accept only the fields above. A misspelled field is an error, not an omission.
- **Weight clearance.** A weight's dot sits on its connector near the connector's upper node. Its label goes where its ink box — built from each character's ink bounds, overhangs included — keeps the most clearance from every painted connector (less half its stroke width), every head (zero when either holds a point of the other), every ring, every dot (its own included) and every other annotation in its panel, inside its panel's band and the plate; its dot also keeps the minimum from every other connector and from every head, its own included, so a weight never sits on a crossing. Weights are placed in spec order, each avoiding those placed before it. The distances are exact, closed-form, never sampled. Candidates near the connector's upper node, below and beside the dot, are tried first; only when none keeps the minimum does a second tier go further along the connector and above the dot. Within a tier the order is fixed and a later candidate wins only by half a unit, so the placement is deterministic. A weight whose best placement keeps less than **3 units** clear in any panel is `WEIGHT_CLEARANCE`: the engine refuses to draw a label over the graph. Dense networks refuse more: for a single three-character label `w_ij`, placed on each connection of a fully connected network in turn, every connection of 2-3-2, 3-3-3, 2-4-1 and 3-4-3-2 was accepted when this was measured, 94% of 4-4-4, 89% of 4-5-3, 72% of 5-5-5 and 44% of 6-6-2. A refused weight moves to another connection or shortens its label.
- **Layout.** A panel is as wide as its network, its layer labels, its equations and its title, whichever reach furthest, and the plate is as wide as every panel, weight label, note and the credit, so nothing drawn is clipped. After placement, every drawn text — titles, layer labels, equation lines, weight labels, notes and the credit — must lie inside the plate (`LAYOUT_BOUNDS`) and keep 3 units from the graph and from every other text (`ANNOTATION_COLLISION`); a panel takes one equation block per layer (`EQUATION_LAYER_DUPLICATE`). A collision or an overflow is refused, never drawn. Each annotation is drawn as its own group, `<g class="ann mark|weight|title|layer|equation|band">`, so its parts can be read back together.

`validate(spec, glyphs)` never throws: it returns `{ ok, errors }`, each error a `{ code, path, message }`, and a spec whose fields cannot even be read is `SPEC_UNREADABLE`. It validates in stages: any spec- or layer-level error ends validation before the connections are read, and the layout checks run only for a spec otherwise valid; every stop also reports the carrier's own error. Arrays are read at every index, so a hole is an entry that is not an object, never one that is skipped. `render` throws a `NetworkError` carrying `code` and every error.

| Code | Raised when |
| --- | --- |
| `SPEC_NOT_OBJECT` · `SPEC_UNREADABLE` · `SPEC_ID` · `SPEC_KEY` · `SPEC_ROLE` · `SPEC_TITLE` | the spec, its id, its title or its fields are malformed, or the spec cannot be read |
| `LAYERS_NOT_ARRAY` · `LAYER_COUNT` · `LAYER_NOT_OBJECT` · `LAYER_KEY` · `LAYER_ID` · `LAYER_ID_DUPLICATE` · `LAYER_SIZE` · `LAYER_LABEL` | the layers are malformed, too many or too few, repeat an id, or a layer's size or label is out of range |
| `EDGES_NOT_ARRAY` · `EDGE_NOT_PAIR` · `EDGE_ENDPOINT` · `EDGE_NOT_ADJACENT` · `EDGE_DUPLICATE` | a connection is malformed, names no node, does not join a layer to the next in order, or repeats |
| `MARKS_NOT_OBJECT` · `MARK_NODE` · `MARK_TEXT` | a mark names no node or is not one character |
| `WEIGHTS_NOT_ARRAY` · `WEIGHT_NOT_OBJECT` · `WEIGHT_KEY` · `WEIGHT_EDGE` · `WEIGHT_CLEARANCE` | a weight is malformed, labels an undeclared connection, or no placement keeps its label clear |
| `PANEL_COUNT` · `PANEL_NOT_OBJECT` · `PANEL_KEY` · `PANEL_DIRECTION` · `PANEL_SIGNALS` · `PANEL_TITLE` | a panel is malformed, too many or too few, or its direction, signals or title is out of range |
| `EQUATIONS_NOT_ARRAY` · `EQUATION_NOT_OBJECT` · `EQUATION_KEY` · `EQUATION_LAYER` · `EQUATION_LAYER_DUPLICATE` · `EQUATION_LINES` | an equation block is malformed, names no layer, repeats a layer in its panel, or has other than one or two lines |
| `ANNOTATION_COLLISION` · `LAYOUT_BOUNDS` | a drawn text would come within 3 units of the graph or of another text, or would fall outside the plate |
| `NOTATION_ITEM` · `NOTATION_UNSUPPORTED` | a notation item is malformed or nests too deep, or a character is not supported |
| `NOTES_NOT_ARRAY` · `NOTE_TEXT` · `CREDIT_TEXT` | a note or the credit is not supported text |
| `OPTIONS_NOT_OBJECT` · `OPTION_KEY` · `OPTION_MODE` · `OPTION_THEME` · `OPTION_ID_PREFIX` · `OPTION_FONT_FACE` · `OPTION_METADATA` · `GLYPHS_MISSING` · `GLYPHS_MALFORMED` | a render option, or the glyph carrier, is malformed or missing; a theme value not of its form — a color as a hex value, an `rgb()` or `hsl()` value or a keyword; a family list as quoted names or identifiers, comma-separated — is among them |
| `MOUNT_HOST` | `mount` is given no element |

`layout(spec, glyphs)` returns the placement `render` draws — each panel's node positions and connectors, each weight's placement and clearance, and the plate's size — for tests and tools. `describe(spec)` returns the plate's description.

## Rendering

`render(spec, options)` returns one standalone `<svg>`:

- **`glyphs`** // required: the `DIAGRAM_NETWORK_GLYPHS` carrier.
- **`mode`** // `'annotated'` (default) draws everything. `'art'` keeps the rings, connectors, heads, signals and the credit, at the same placement and plate size, and drops the marks, the weights and their dots, the panel titles, the layer labels, the equations and the notes.
- **`theme`** // `'inherit'` (default) draws with the page's foundation roles — the field from `--bg-from` and `--bg-to`, ink from `--fg-1`, text in `--font-sans`, the membership sign in `--font-mono` — so a plate on a page follows the page's theme. A **resolved theme object** — `{ name, fieldFrom, fieldTo, ink, fontFamily, monoFamily }` — draws a standalone file with those values written in. Each value is checked by its form, so nothing in it can void the plate's style; a double-quoted family name is accepted and written single-quoted.
- **`idPrefix`** // every element id in the plate begins with it, and every rule in the plate's `<style>` is scoped to it, except the `@font-face` rules an export embeds, which declare private families. It defaults to `idPrefixFor(spec.id)`, an encoding under which distinct texts never share a prefix. A plate carries six ids: the prefix itself, `<prefix>_title`, `<prefix>_desc`, `<prefix>_field`, `<prefix>_from` and `<prefix>_to`. On a page, **`mount(host, spec, options)`** takes a prefix none of whose six ids any element in the document carries — adding `_n2`, `_n3` and so on, a suffix `idPrefixFor` never writes — so the same spec can appear any number of times; re-rendering into the same host keeps its prefix, and a caller that names its own prefix keeps all six unique.
- **`fontFaceCSS`**, **`metadata`** // embedded in a standalone file; `&` and `<` in the CSS are written escaped, so the file stays well-formed.

Each plate is `role="img"`, named by its `<title>` alone (`aria-labelledby`) and described by its `<desc>` (`aria-describedby`), derived from its layers, connections and panels. In the annotated view the description also reads what the annotation draws — the layer labels, the marked units, each weight and the connection it labels, each equation line as text — and the notes, since a figure's assumptions belong to its description; the credit is in every view. The notes and the credit are drawn at full ink, as every other text is. The plate sets no kerning and no ligatures, and its rules state rather than inherit every property that would move a text, change the face that draws it or extend its ink: anchoring, baseline, direction, writing mode and orientation, white space, the face's style, weight, width, variants, size adjustment and optical sizing, features, variations and synthesis, letter and word spacing, case and rendering, the shadow of text, and the stroke of text, heads, dots and the field's rectangle. A plate mounted or inlined under a host's inherited styles therefore draws the positions, advances and faces its layout measured; [`tests/network-host-inheritance.mjs`](../../tests/network-host-inheritance.mjs) measures this in Chrome. The guarantee covers inheritance, and only these properties: a stylesheet rule written against the plate's own elements, or one marked `!important`, is outside it, and so are the connectors', rings' and rules' stroke styles beyond color and width, such as dashes, caps and joins, and paint opacity. Heads are drawn as paths, not SVG markers, which rasterize unreliably. The geometry — the ring's radius and stroke, the connector's width and the gap where it stops outside a ring, the head's dimensions, the layer and node pitch, the signal length, the notation sizes, the margins and the 3-unit clearance — belongs to the pattern and is not an option.

## The specimen

`diagram-static-network.html` draws every spec in the source. It follows the system's light or dark setting and has **no theme selector**. Its one mode selector is a quiet pill that reports its state, the [style guide](../../preview/styleguide.html)'s selector grammar: **view** // `annotated` or `art`. Nothing is stored: the page always opens annotated. The page's text takes the document register, and the checks table — whether each source validates, its layers and connections, and its least label clearance — is derived from the sources when the page loads.

## The reference specimen and its source

`network.forward-backward` redraws the topology, notation and equations of LeCun, Bengio and Hinton, "Deep learning", *Nature* 521, 436–444 (2015), Fig. 1c–d, read from the paper: layers of 3, 4, 3 and 2 units, the 23 connections the figure draws, the marked units `i`, `j`, `k`, `l` and the weights `w_ij`, `w_jk`, `w_kl`. Its notes carry the figure's assumptions — bias terms omitted, and the displayed output derivative assuming squared-error loss — and how undrawn connections enter a sum over a complete layer. Its credit names the figure and is drawn in every view and every exported file. The credit is attribution, not a statement of reuse clearance. The specimen's data — its entry in `diagram-static-network.source.js` and the forward and backward equation sets it uses, and the restatement of its connections and marks in `tests/network-contract.test.mjs` — and every rendering or export of it are excluded from design-system-ASK's Apache License 2.0 grant, and no license to the source material is granted; [`NOTICE`](../../NOTICE) records the boundary. The engine, the stylesheet, the exporter, the page and the synthetic specimen are under the repository's license; the embedded font subsets keep the SIL Open Font License 1.1.

`network.sparse-5-2-3` is synthetic: five inputs, two hidden units and three outputs, joined sparsely, with no source and no credit. It differs from the reference in layer count, populations and connections, carries a generic title, layer labels, two marks, one weight and one equation of its own, and is drawn by the same engine with no specimen-specific branch.

## Export

```text
node export-network.mjs --out <dir>          every spec: annotated and art, light and dark, SVG
node export-network.mjs --out <dir> --png    the same, plus a PNG of each SVG
```

`--tokens <file>` names the token file (default `_dsa-tokens/colors_and_type.css` beside the script), `--source <file>` the network sources, `--spec <id>` one spec (repeatable), `--chrome <path>` the browser and `--scale <n>` the PNG's pixels per unit (1 to 4). From this repository's root, pass `--tokens colors_and_type.css`. It prints a JSON report; it exits 0 when written, 1 on a failure and 2 on a usage error.

- **Files.** `<spec>_<annotated|art>-<light|dark>.svg`, and the same name in `.png`. Both themes are always written. Each file's element ids take a prefix of its own, and its fonts are private families, so files exported together can be inlined on one page without touching its ids or its own fonts. Write each sealed generation to a directory of its own: the exporter overwrites a file of the same name, and the names carry no source or render version.
- **Tokens.** For each theme the exporter resolves `--bg-from`, `--bg-to`, `--fg-1`, `--font-sans` and `--font-mono` from the token file, following `var()` references, and writes the values into the file. It reads the light values on `:root` and the dark overrides on the rule whose selector list includes `:root[data-theme="dark"]`, which must declare the field and the ink itself. It fails rather than guess on a name that does not resolve, a cycle, an unbalanced block or an unclosed comment. Each file records the token file's sha256 in `<metadata>`.
- **Font.** Each file embeds the three subsets, so its text resolves with no font installed, and carries both families' copyright and the full SIL Open Font License 1.1 text in `<metadata>`. The subsets keep no layout feature, kerning included, and are declared under private families named for their own sha256 (`dsn-inter-` and `dsn-mono-` with 12 hex digits), named first in the file's font lists, so a file inlined on a page never replaces the page's own Inter or JetBrains Mono, nor another generation's subsets. In the italic subset the character map sends `l` to the tailed glyph, so a standalone file shows the tailed `l` even where the viewer applies no font feature; the generator reopens the subset and fails unless every Unicode map does. Subsetting and remapping are permitted because neither Inter nor JetBrains Mono declares a Reserved Font Name.
- **Credit.** A spec's credit is drawn in every mode, so every file a credited spec writes carries it.
- **Checked first.** Every spec the run exports is validated before any file is written, and the run is refused if a spec id is given twice or two differ only in letter case: a file system that ignores case would store their files as one. Each of these failures writes no files. A failure once writing has begun — no browser found for `--png`, for example — leaves the files already written in place.
- **Determinism.** In one runtime the SVG is a pure function of the spec, the options, the token file and the carriers: two runs write the same bytes, and nothing in a file records the time.
- **PNG.** `--png` rasterizes each SVG with headless Chrome or Chromium at the SVG's own size times `--scale`, and checks the PNG's dimensions. The browser is `--chrome`, else `$CHROME`, else the platform's usual install paths or `google-chrome`, `chromium` and `chromium-browser` on `PATH`.

**What is checked, and what is not.** `tests/network-contract.test.mjs` checks, on every run, the layout read back from each rendered plate with geometry of its own — every drawn text's clearance from the graph, every annotation's from every other, every dot's from every other connector and head, every notation text's from its own fraction rules, every annotation's drawn ink inside the box the engine validated, and every drawn thing inside the plate — and the SVG export: the files written, their determinism, the validation before writing, the three embedded subsets under their private families, the italic subset's own character map, both licenses, the drawn credit, the resolved tokens and unique ids. When the pattern was admitted, the plates were also rendered in Chrome, and the PNG route was run on macOS with Google Chrome, where the tailed `l` was confirmed in a standalone PNG; neither is part of the test. Not tested: the PNG route on Windows or Linux, and how other editors import a file with live text, embedded variable-font subsets and CSS rules in `<style>`. Treat import into an editor as unverified.

### Theme by embedding surface

Every diagram package generates and retains both theme variants (`-light` and `-dark`). The embedding surface selects the default:

- **Repository documentation and operator-system diagrams default to dark.**
- **Substack and other published long-form editorial diagrams default to light.**
- A stated local exception may override the default for a specific figure.

This rule selects which existing render is embedded. It does not suppress, rename, or replace the alternate-theme export.

## The generated carriers

`tools/gen-network-font.py` writes `diagrams-static-network-glyphs.js` and `diagrams-static-network-font.js` from `fonts/InterVariable.woff2`, `fonts/InterVariable-Italic.woff2` and `fonts/JetBrainsMono.woff2`, with their license files; `--check` regenerates them in memory and fails on any difference. It is owner-only and needs fontTools and brotli, which nothing else in this repository uses; another version of either may subset to other bytes, which `--check` reports. Each carrier records every source font's sha256, and `tests/network-contract.test.mjs` fails when a canonical font changes and the carriers were not regenerated. A consumer vendors the carriers and never runs the tool.

## How to use it

1. Copy the pattern's files, except this README if you wish, into your consuming project, beside each other.
2. Sync `colors_and_type.css` and the fonts from design-system-ASK into a local `_dsa-tokens/` mirror, and `surface-text-link.css` and `surface-document.css` into a `_dsa-surface/` mirror, pinned to a known upstream commit. The page expects both mirrors beside it.
3. Replace `diagram-static-network.source.js` with your own network sources, and the page's title, lede, sections and figures with your own. Rename the page and the source if you wish, and update the `<script src>` reference.
4. Open the page in a browser to see the plates, then run `export-network.mjs` to write the standalone files you embed.

## What downstream must replace

- The network sources in `diagram-static-network.source.js`: ids, titles, layers, connections, marks, weights, panels, equations, notes and credits
- The page's words: the `<title>`, the description, the title and lede, each section and each figure's label
- The file names of the page and the source, if you prefer project-specific names

## What not to edit

- `diagrams-static-network-engine.js`, `diagrams-static-network.css`, `export-network.mjs` and the two generated carriers: re-vendor them byte-identical
- The load order, and the page's figure structure (`.network-figure` with its `data-spec`, `.network-host` and the `data-summary` caption)
- The light and dark theme model: the page sets no theme, and `colors_and_type.css` resolves `data-theme` and `prefers-color-scheme`

## Static vs dynamic inheritance

Static diagram artifacts inherit at generation time and freeze for audit. The exporter resolves the Tier 1 + Tier 2 tokens from the local mirror and writes them into each file, with the embedded font subsets, so an exported plate depends on nothing outside itself. The page takes the same tokens live from the mirror. There is no runtime fetch from the design-system-ASK repo and no font CDN. Re-sync the mirrors and re-vendor the bundle when upstream changes, and re-export.

## Source-truth boundary

design-system-ASK supplies the foundations and the pattern. What a network is, which connections exist and what its notation means are the source's: a plate illustrates its spec, and the spec's own source remains authoritative. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream content, and the reference specimen's figure remains its authors'.

## Class A vs Class B

This is Class A (system / architecture diagram templates) — the **layered-network** grammar. Its static siblings [`patterns/diagram-static-H/`](../diagram-static-H/README.md), [`-V/`](../diagram-static-V/README.md), [`-SEQ/`](../diagram-static-SEQ/README.md) and [`-FLOW/`](../diagram-static-FLOW/README.md) share the `window.DIAGRAMS.render` interface, and [`patterns/diagram-static-peer/`](../diagram-static-peer/README.md) has a grammar of its own, as this pattern does; the interactive [`patterns/diagram-interactive-spine/`](../diagram-interactive-spine/README.md) is a separate Class A pattern. Class B (project-output artifact templates) is [`patterns/output-artifact/`](../output-artifact/README.md) and [`patterns/message-archive/`](../message-archive/README.md). The classes stay distinct. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
