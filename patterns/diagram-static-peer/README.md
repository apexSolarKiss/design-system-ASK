# Pattern // diagram-static-peer

A reusable static-artifact scaffold for **peer relations**: three or four equal peers on a regular polygon, joined by declared relations, that inherits the [design-system-ASK](../../README.md) visual language. It has two presets, which fix placement only: a **triangle** of three positions and a **square** of four. Each ships a template: the triangle's joins its three peers in a directed cycle, and the square's joins four by a directed perimeter with its opposite pairs neutral.

This is a **Class A static** diagram scaffold, distinct from the **Class B** project-output artifact patterns. Its static siblings — `patterns/diagram-static-H/`, `-V/`, `-SEQ/` and `-FLOW/` — arrange hierarchy, succession and convergence, and share the `window.DIAGRAMS.render` interface and one PNG exporter. This pattern arranges peers. It has its own relation grammar, engine and exporter, and takes none of their chrome, fit, pointer or text-layout carriers: a fixed plate of three or four letters has no canvas to pan and no label to wrap. The surface pattern `patterns/diagram-interactive-radial/` arranges a containment hierarchy on a live page; this one arranges equals on a sealed plate.

## What this pattern is

A plate is a 1000-unit square: the foundation's 45-degree gradient field, one letter at each vertex, and a connector for each declared relation. A **directed** relation is a line with a filled, slightly notched head at its target. A **neutral** relation is a fitted dash with no head, lighter than a directed one, so two neutral diagonals cross as lines and never as a node. The **keyed** plate adds a band under the polygon: a drawn sample of each relation type the plate uses, with the instance's own word for it.

The spec owns the content: the labels, which pairs relate, and the words for each relation. The engine owns placement, connectors and presentation, and reads no meaning into a relation beyond its type. A-S-K and L-E-O-V are ASK's instances, read as a game; the templates carry numbered slots and no reading.

Eight files:

- `README.md` // this file
- `diagram-static-peer.html` // the specimen: the instances, the square beside the original, the templates, a relabeling and the checks, drawn from the relation sources
- `diagram-static-peer.source.js` // the relation sources the specimen draws, as one `window.PEER_DIAGRAMS` array
- `diagrams-static-peer-engine.js` // **DS-owned engine** (`window.DIAGRAM_PEER`, or a Node module): validation, the derived checks, and the renderer, a pure function from a spec to a standalone SVG string. The page and the exporter run the same code
- `diagrams-static-peer.css` // the specimen's column, figure grid, plate frame and two mode selectors. Its text takes the document register
- `diagrams-static-peer-glyphs.js` // **DS-owned, GENERATED** by `tools/gen-peer-font.py` from `fonts/InterVariable.woff2`: each supported label's measured centering, and each printable Basic Latin character's advance at the key's weight. Never hand-edit it
- `diagrams-static-peer-font.js` // **DS-owned, GENERATED** by the same tool: Inter subset to printable Basic Latin, with the `wght` and `opsz` axes kept, as a base64 `@font-face` rule, with Inter's copyright and the SIL Open Font License text. Only the exporter loads it
- `export-peer.mjs` // **DS-owned exporter** (Node 18 or later, no dependency): writes each spec as standalone SVG files and, on request, PNG files

**Load order is a contract.** The page loads the stylesheets `colors_and_type.css → surface-text-link.css → surface-document.css → diagrams-static-peer.css`, then the scripts `<source> → diagrams-static-peer-glyphs.js → diagrams-static-peer-engine.js`, then its own script. The engine reads nothing global: the page passes it the glyph carrier, and `render` fails closed rather than centering letters by guesswork: without one, `GLYPHS_MISSING`; with one whose letter offsets or measured weight are not finite numbers, or that lacks a finite, non-negative advance for a printable Basic Latin character, `GLYPHS_MALFORMED`.

The pattern is **not** a component library, a generator, a build pipeline, an npm package or a project-specific diagram. It is a starting point for downstream peer diagrams that consume design-system-ASK foundations.

## The relation contract

```text
spec = {
  id:         letters, digits, '.', '_' and '-'           'triangle.A-S-K'
  preset:     'triangle' | 'square'
  role?:      free text for the page; the engine ignores it
  title?:     the plate's accessible name, with no control character; defaults to id
  nodes:      [{ id, label }, ...]  clockwise from the preset origin:
              the triangle's top, the square's upper left
  relations:  [{ from, to, type }, ...]  every pair exactly once
  meaning?:   { directed?, neutral?, verb?, neutralPlain? }
}
```

- **Nodes.** A triangle takes three nodes and a square four. A node id starts with a letter and continues in letters, digits, `_` or `-`. A **label** is one character, `A`–`Z` or `0`–`9`: the glyph carrier measures the ink of exactly these, so every letter sits centered on its vertex. Labels are distinct.
- **Relations.** Every pair of nodes is declared exactly once, in either orientation. `directed` reads *from → to* and draws its head at `to`. `neutral` draws the dash. `unspecified` declares a pair open and draws nothing. **An undeclared pair is an error, never a neutral pair**: completeness is explicit, and `unspecified` is the one way to leave a pair open.
- **Meaning.** The instance's own words, all optional and all printable Basic Latin, the range the exported font covers. `directed` and `neutral` label the key's samples; each must fit its slot, measured against the key's advance widths. `verb` joins *X verb Y* in the plate's description (default `to`), and `neutralPlain` phrases *X and Y neutralPlain* (default `are neutral`). The engine reads no meaning from any of them.
- **Closed fields.** A spec, a node, a relation, the meaning and the options each accept only the fields above. A misspelled field is an error, not an omission.
- **Every entry is read.** The nodes and relations are read at every index, so a hole in either array is an entry that is not an object, never one that is skipped.

`validate(spec, glyphs)` never throws: it returns `{ ok, errors }`, each error a `{ code, path, message }`, and a spec whose fields cannot even be read is `SPEC_UNREADABLE`. `render` throws a `PeerError` carrying `code` and every error. Membership tests are exact: a relation type, a node id or a preset is matched against its own declared set, so a name every object inherits, such as `constructor` or `toString`, is an ordinary unknown value and never passes as one that exists.

| Code | Raised when |
| --- | --- |
| `SPEC_NOT_OBJECT` · `SPEC_UNREADABLE` · `SPEC_ID` · `SPEC_KEY` · `SPEC_ROLE` · `SPEC_TITLE` | the spec, its id, its title or its fields are malformed, or the spec cannot be read |
| `PRESET_UNKNOWN` | the preset is not `triangle` or `square` |
| `NODES_NOT_ARRAY` · `NODE_COUNT` · `NODE_NOT_OBJECT` · `NODE_KEY` · `NODE_ID` · `NODE_ID_DUPLICATE` | the nodes are malformed, too many or too few, or repeat an id |
| `LABEL_UNSUPPORTED` · `LABEL_DUPLICATE` · `LABEL_UNMEASURED` | a label is not one of `A`–`Z`, `0`–`9`, repeats, or has no measured centering |
| `RELATIONS_NOT_ARRAY` · `RELATION_NOT_OBJECT` · `RELATION_KEY` · `RELATION_TYPE` · `RELATION_ENDPOINT` · `RELATION_SELF` · `RELATION_PAIR_DUPLICATE` | a relation is malformed, has an unknown type or endpoint, relates a node to itself, or repeats a pair |
| `PAIR_UNDECLARED` | a pair has no relation |
| `MEANING_NOT_OBJECT` · `MEANING_KEY` · `MEANING_TEXT` · `MEANING_KEY_WIDTH` | the wording is malformed, outside printable Basic Latin, or too wide for its key slot |
| `OPTIONS_NOT_OBJECT` · `OPTION_KEY` · `GLYPHS_MISSING` · `GLYPHS_MALFORMED` · `OPTION_THEME` · `OPTION_KEYED` · `OPTION_ARROWHEADS` · `OPTION_ID_PREFIX` · `OPTION_FONT_FACE` · `OPTION_METADATA` | a render option, or the glyph carrier, is malformed or missing; a title, the metadata or a theme value carrying a character XML forbids, or markup or CSS punctuation in a theme value, is among them |
| `MOUNT_HOST` | `mount` is given no element |

The derived checks read only the declared relations: `matrix` (1 for *row → column*, −1 for the reverse, 0 neutral, `null` unspecified), `signatures` (each node's outgoing, incoming, neutral and unspecified partners), `symmetry` (the rotations that carry the pattern onto itself) and `describe`. They are structural: no score, payoff or ranking belongs to the contract. A reading such as the specimen's game is the instance's.

## Rendering

`render(spec, options)` returns one standalone `<svg>`:

- **`glyphs`** // required: the `DIAGRAM_PEER_GLYPHS` carrier.
- **`theme`** // `'inherit'` (default) draws with the page's foundation roles — the field from `--bg-from` and `--bg-to`, ink from `--fg-1`, letters in `--font-sans` at `--fw-extralight`, the key at `--fw-regular` — so a plate on a page follows the page's theme. A **resolved theme object** — `{ name, fieldFrom, fieldTo, ink, fontFamily, labelWeight, keyWeight }` — draws a standalone file with those values written in. Its `labelWeight` must be the weight the glyph carrier measured the letters at, or they would sit off center.
- **`keyed`** // `false` (default) is the art plate; `true` adds the key band, 150 units, with one item per drawn type.
- **`arrowheads`** // **`'target'` is the default, the canonical presentation and the standard export.** `'midpoint'` is a comparison mode: each head sits at its connector's midpoint, and where two directed connectors cross there, as on the original square's diagonals, each head slides toward its own target so the crossing never reads as a node.
- **`idPrefix`** // every element id in the plate begins with it, and every rule in the plate's `<style>` is scoped to it. It defaults to `idPrefixFor(spec.id)`, an encoding under which distinct texts never share a prefix. A plate carries three ids: the prefix itself, `<prefix>_title` and `<prefix>_field`. On a page, **`mount(host, spec, options)`** takes a prefix none of whose three ids any element in the document carries, so the same spec can appear any number of times, beside plates rendered with prefixes of their own; a caller that names its own prefix keeps all three unique. The exporter gives each file a prefix of its own, so exported files can be inlined on one page; the `@font-face` rule they embed declares `Inter`, which joins a host page's Inter for the characters it covers.
- **`fontFaceCSS`**, **`metadata`** // embedded in a standalone file.

Each plate is `role="img"`, named by its `<title>` and described by a `<desc>` derived from its relations. Heads are drawn as paths, not SVG markers, which rasterize unreliably. The geometry — the circumradius, the letter size, the clearance where connectors stop, the stroke widths, the fitted dash, the head's dimensions and the key's layout — belongs to the pattern and is not an option.

## The specimen

`diagram-static-peer.html` draws every spec in the source. It follows the system's light or dark setting and has **no theme selector**. Its two mode selectors are quiet pills that report their state, the style guide's selector grammar:

- **view** // `art plate` or `with key`. With the key, the instances also show their relation tables.
- **arrowheads** // `at target` (default) or `at midpoint`, for comparison.

Nothing is stored: the page always opens at the art plate with heads at the target. The page's text takes the document register, and the checks table is derived from the relations when the page loads.

## Export

```text
node export-peer.mjs --out <dir>          every spec: art plate and keyed, light and dark, SVG
node export-peer.mjs --out <dir> --png    the same, plus a PNG of each SVG
```

`--tokens <file>` names the token file (default `_dsa-tokens/colors_and_type.css` beside the script), `--source <file>` the relation sources, `--spec <id>` one spec (repeatable), `--arrowheads midpoint` the comparison mode, `--chrome <path>` the browser and `--scale <n>` the PNG's pixels per unit (1 to 4). From this repository's root, pass `--tokens colors_and_type.css`.

- **Files.** `<spec>_<plate|keyed>-<light|dark>.svg`, and the same name in `.png`. Both themes are always written, each with the `-light` or `-dark` suffix that Theme by embedding surface below names. Write each sealed generation to a directory of its own: the exporter overwrites a file of the same name, and the names carry no source or render version. A file's `<metadata>` records the token file's and the font subset's sha256, but not the relation source or the engine revision, so it is not a manifest to reproduce the file from: keep each sealed generation's sources and carriers with it.
- **Tokens.** For each theme the exporter resolves `--bg-from`, `--bg-to`, `--fg-1`, `--font-sans`, `--fw-extralight` and `--fw-regular` from the token file, following `var()` references, and writes the values into the file. It reads the light values on `:root` and the dark overrides on the rule whose selector list includes `:root[data-theme="dark"]`, which must declare the field and the ink itself, so a dark file never borrows a light value. It fails rather than guess on a name that does not resolve, an unbalanced block or an unclosed comment. Each file records the token file's sha256.
- **Font.** Each file embeds the Inter subset, so its letters and key resolve with no font installed, and carries Inter's copyright and the full SIL Open Font License 1.1 text in `<metadata>`. Subsetting is permitted because Inter declares no Reserved Font Name.
- **Checked first.** Every spec the run exports is validated before any file is written, and the run is refused if a spec id is given twice or two differ only in letter case, such as `Triad.ASK` and `triad.ask`: a file system that ignores case, as macOS's and Windows' do by default, would store their files as one, the later replacing the earlier. Each of these failures writes no files. A failure once writing has begun — no browser found for `--png`, for example — leaves the files already written in place: a run that finds no browser writes the SVGs and no PNG.
- **Determinism.** In one runtime the SVG is a pure function of the spec, the options, the token file and the carriers: two runs write the same bytes, and nothing in a file records the time.
- **PNG.** `--png` rasterizes each SVG with headless Chrome or Chromium at the SVG's own size times `--scale`, and checks the PNG's dimensions. The browser is `--chrome`, else `$CHROME`, else the platform's usual install paths (macOS, Windows) or `google-chrome`, `chromium` and `chromium-browser` on `PATH`; with none found it stops and names the paths it tried.

**What is checked, and what is not.** `tests/peer-contract.test.mjs` checks the SVG export on every run: the files written, their determinism, the embedded subset, the license text and the resolved tokens. When the pattern was admitted, the plates were also rendered in Chrome and the PNG route was run on macOS with Google Chrome; neither is part of the test. Not tested: the PNG route on Windows or Linux, and how other editors — Illustrator, Inkscape, Figma — import a file with live text, an embedded variable-font subset and CSS rules in `<style>`. Treat import into an editor as unverified.

### Theme by embedding surface

Every diagram package generates and retains both theme variants (`-light` and `-dark`). The embedding surface selects the default:

- **Repository documentation and operator-system diagrams default to dark.**
- **Substack and other published long-form editorial diagrams default to light.**
- A stated local exception may override the default for a specific figure.

This rule selects which existing render is embedded. It does not suppress, rename, or replace the alternate-theme export.

## The generated carriers

`tools/gen-peer-font.py` writes `diagrams-static-peer-glyphs.js` and `diagrams-static-peer-font.js` from `fonts/InterVariable.woff2`; `--check` regenerates them in memory and fails on any difference. It is owner-only and needs fontTools and brotli, which nothing else in this repository uses; another version of either may subset to other bytes, which `--check` reports. Each carrier records the source font's sha256, and `tests/peer-contract.test.mjs` fails when the canonical font changes and the carriers were not regenerated. A consumer vendors the carriers and never runs the tool.

## How to use it

1. Copy the pattern's files, except this README if you wish, into your consuming project, beside each other.
2. Sync `colors_and_type.css` and the fonts from design-system-ASK into a local `_dsa-tokens/` mirror, and `surface-text-link.css` and `surface-document.css` into a `_dsa-surface/` mirror, pinned to a known upstream commit. The page expects both mirrors beside it.
3. Replace `diagram-static-peer.source.js` with your own relation sources, and the page's title, lede, sections and figures with your own. Rename the page and the source if you wish, and update the `<script src>` reference.
4. Open the page in a browser to see the plates, then run `export-peer.mjs` to write the standalone files you embed.

## What downstream must replace

- The relation sources in `diagram-static-peer.source.js`: ids, presets, titles, labels, relations and wording
- The page's words: the `<title>`, the description, the title and lede, each section, each figure's label, and each figure's `data-columns`, the column names of its relation table
- The file names of the page and the source, if you prefer project-specific names

## What not to edit

- `diagrams-static-peer-engine.js`, `diagrams-static-peer.css`, `export-peer.mjs` and the two generated carriers: re-vendor them byte-identical
- The load order, and the page's figure structure (`.peer-figure` with its `data-spec`, `.peer-host` and the `data-relations` caption)
- The light and dark theme model: the page sets no theme, and `colors_and_type.css` resolves `data-theme` and `prefers-color-scheme`

## Static vs dynamic inheritance

Static diagram artifacts inherit at generation time and freeze for audit. The exporter resolves the Tier 1 + Tier 2 tokens from the local mirror and writes them into each file, with the embedded font subset, so an exported plate depends on nothing outside itself. The page takes the same tokens live from the mirror. There is no runtime fetch from the design-system-ASK repo and no font CDN. Re-sync the mirrors and re-vendor the bundle when upstream changes, and re-export.

## Source-truth boundary

design-system-ASK supplies the foundations and the pattern. What the peers are, how they relate and what a relation means are the consuming project's: a plate illustrates its spec, and the spec's own source remains authoritative. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream content, and A-S-K and L-E-O-V remain ASK's instances, not the pattern's vocabulary.

## Class A vs Class B

This is Class A (system / architecture diagram templates) — the **peer** grammar. Its static siblings `patterns/diagram-static-H/`, `-V/`, `-SEQ/` and `-FLOW/` share the `window.DIAGRAMS.render` interface; the interactive `patterns/diagram-interactive-spine/` is a separate Class A pattern. Class B (project-output artifact templates) is `patterns/output-artifact/` and `patterns/message-archive/`. The classes stay distinct. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes.
