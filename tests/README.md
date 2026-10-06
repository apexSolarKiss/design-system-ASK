# tests // design-system-ASK

Small, self-contained regression fixtures. No framework — each is an HTML page you
open in a browser and check by eye (and, where noted, by exporting).

## chrome-role-export-fixture.html

Guards **`export-png.js` chrome role resolution**. `diagrams.css` defines the
`--diagram-*` legibility tokens as aliases of the foundation foreground ramp, and the
live page chrome — header, caption, legend — is styled from those semantic roles. The
exporter used to read `--fg-1` / `--fg-2` directly, so a consumer that legitimately
rebound only the semantic roles for its own surface got a corrected live page and an
uncorrected raster. The export is a retained output of the live page; it must not
diverge from it.

The exporter resolves the two roles on **two separate lines**, so the fixture checks
them on two separate lines. Four limbs, each biting independently — a pass on INK never
stands in for MUTED:

```text
DEFAULT  / INK     --diagram-ink aliases --fg-1, and that value is in the
                   exported PRIMARY chrome (mark, title, stamp key)
DEFAULT  / MUTED   --diagram-muted aliases --fg-2, and that value is in the
                   exported SECONDARY chrome (subtitle, date line)
OVERRIDE / INK     exported primary chrome follows --diagram-ink, not --fg-1
OVERRIDE / MUTED   exported secondary chrome follows --diagram-muted, not --fg-2
```

Overall PASS requires every applicable limb to pass. `--fg-2` is a translucent role, so
it is composited over the page ground before being compared against raster pixels.

**The scan is confined to the header band, and that isolation is the test.** The diagram
body is styled from the same semantic roles, so a full-page scan would satisfy every limb
no matter what the exporter did — the fixture would report PASS forever and guard nothing.

**Run it** (served from the repo root, so the `../` foundations resolve):

```
python3 -m http.server 8080
# open http://localhost:8080/tests/chrome-role-export-fixture.html
```

Click **`run pixel check`**, then **`toggle role override`** and run it again; both states
must report PASS on both limbs. The override values are deliberately conspicuous
non-palette colours so a raster that ignored either one is unmistakable.

**Verifying the fixture still bites.** Two regressions must produce two different failures:

```text
revert BOTH exporter lines      >> OVERRIDE / INK   FAIL
                                   OVERRIDE / MUTED FAIL

revert ONLY the fg2 line        >> OVERRIDE / INK   PASS
                                   OVERRIDE / MUTED FAIL
```

The second is the one that matters. An earlier version of this fixture overrode both
roles but only ever measured `--diagram-ink` against `--fg-1`, so it reported PASS against
that second regression — the exported subtitle, date line, caption copy and legend support
copy had all silently returned to the foundation ramp. Serve from a **fresh origin** when
running these, and check the loaded exporter's own hash before trusting a verdict: a
cached script has produced a spurious PASS here before.

## legend-export-fixture.html

Guards **`export-png.js` legend fidelity**. The page renders a *semantic* legend —
three differently-colored solid swatches, a dotted divider, a group heading, and one
neutral row — and the `PNG page` export must reproduce all of it: the colored
swatches (drawn from each swatch's computed presentation, not a generic box), the
dotted divider, the group heading, and the quiet neutral row, in both light and dark.

A `.row`-only exporter flattened this: every swatch collapsed to the neutral node
fill and the divider / heading were dropped. If that regresses, this fixture shows it.

**Run it** (served from the repo root, so the `../` foundations resolve):

```
python3 -m http.server 8080
# open http://localhost:8080/tests/legend-export-fixture.html
```

Click **`PNG page`** in the HUD and compare the exported raster against the live
legend. Toggle `data-theme` on `<html>` (or your OS appearance) to check both themes.

## doc-code-size-fixture.html

Guards **`surface-document.css` code sizing**. `.doc-code` is 0.9x the document role
that governs it, and the Caption step where no sized role governs it. An ordinary inline
wrapper — `strong`, `em`, `a`, a bare `span` — carries no role class and must change
nothing: code in a link inside 24px document body is 21.6px, and code in a span inside
the 48px document title is 43.2px. A fallback that tested only the immediate parent
dropped both to 14px.

The page measures every case against its computed expectation and reports one overall
verdict, with a row per case:

```text
host      0.9x the computed size of the nearest [data-host] role: every sized role,
          direct and through a wrapper, a role nested inside another role, and a
          span carrying .doc-code, so the register's own 0.9em is exercised rather
          than the foundation's rule for the code element
caption   the Caption step: plain containers, compositions with no role, and a
          wrapper where no sized role governs
```

**Run it** (served from the repo root, so the `../` foundations resolve):

```
python3 -m http.server 8080
# open http://localhost:8080/tests/doc-code-size-fixture.html
```

The label under the title reads `PASS`, or `FAIL` with the number of failing cases.

**Verifying the fixture still bites.** Restore the immediate-parent fallback
(`:where(:not(<sized roles>)) > .doc-code`) and every wrapped `host` case fails while
every direct case and every `caption` case still passes. Remove `.doc-code`'s own
`font-size: 0.9em` and the two `span.doc-code` cases fail at the host's full size; the
`code` cases do not, because the foundation's code rule also sets 0.9em.

## document-table-fixture.html

Guards **the document table composition** in `surface-document.css` and its cue in
`surface-document-overflow.js`: what the role check cannot see, because none of it is a
text role. A composition is adopted by class, so the fixture sets a dense table, an
unmarked table, a table marked without its box and a table nested in a composition cell
beside the composition, and requires that the composition reach none of them. The boxes
are 320px wide, or the column's width where that is narrower, so every overflow case
overflows at any viewport.

The page measures each case once the fonts are ready and reports one overall verdict, with
a row per case:

```text
reach             the dense marker alone draws no padding, no row rule and no numeric alignment,
                  and a dense value still wraps; code there still breaks anywhere; an unmarked
                  table and a table marked without its box take no measure, no row rule and no
                  composition padding; a table nested in a composition cell takes no row rule
                  and no composition padding
composition       the 32rem narrative measure and none on a dense table; --space-3 block
                  padding, --space-5 between columns and none after the last; the --line-2 row
                  rule and the --line-1 header rule; the header row shown in place, visible and
                  unclipped; code breaking at its own opportunities; a numeric header and cell
                  at the end, a numeric header and a narrative numeric cell on tabular figures;
                  a dense value on one line; --space-6 of scroll padding on the box; a consumer
                  rule of one class, loaded before the register, winning over the cell rules; a
                  row a script appends to the table itself taking the cell rules
scroll-into-view  a header link scrolled into view by its nearest edge lands inside its box and
                  clear of the fade, while hidden content remains to its right
label             the label in capitals; code in it, with the class and without, in its own
                  case; plain text in it, such as mW, in capitals
overflow          a wide table box and a narrative table below its measure report the right
                  side and draw the cue; a box that fits reports nothing; scrolled to the end
                  and to the middle, the attributes and the cue follow; a wide and a fitting
                  block report as before
added             a table box and a block added after load are reported; a box moved in the
                  document, and one added after load, each carry one scroll listener
```

**Run it** from the repo root:

```
python3 -m http.server 8080
# open http://localhost:8080/tests/document-table-fixture.html
```

The label under the title reads `PASS`, or `FAIL` with the number of failing cases. The
cases are also on `window.__tableFixture` and the verdict on `body[data-result]`.

**Verifying the fixture still bites.** Each change below fails only the cases named.

```text
remove .doc-label :is(code, .doc-code)             the two label code cases
set the helper's selector back to .doc-pre         every table-box case that expects overflow,
                                                   the scroll-into-view case that needs the
                                                   fade, and both scroll-listener counts; a box
                                                   that fits and the block cases still pass
let the dense marker reach the cell rule           the dense marker's padding and row-rule cases
drop the box's scroll-padding                      the scroll-padding case and the
                                                   scroll-into-view case that requires the link
                                                   clear of the fade
give the cell rule specificity                     the consumer-override case, and the cases whose
                                                   zero-specificity rules it now outranks
key the measure on the table marker alone          the marker-without-its-box measure case
hide the composition's header row                  the header-row case
```

## doc-actions-end-fixture.html

Guards **the action row at an item's end** in `surface-document.css`: `.doc-actions--end`,
adopted by class on an item's `.doc-actions`. It is a composition, not a text role, so the
role check cannot see it. Each grid is 600px wide inside a box that scrolls, so every case
measures the same layout at any viewport, and each grid keeps the default `align-items`, so
its `.surface-panel` items stretch to their row.

The page measures each case once the fonts are ready and reports one overall verdict, with
a row per case:

```text
stretch   with the modifier, in one grid row of unequal copy: the two action rows share a
          bottom edge, and one-line rows share their top; each row sits at its item's content
          end; the tallest item keeps its gap after its copy; the shorter item's row has moved
plain     the same grid without the modifier: each row stays one gap after its copy, has no
          start margin, and the rows do not align by themselves
wrap      one row wraps to more lines than its neighbor's: the bottoms still meet, and the
          wrapped row's top sits higher by exactly its extra height — the stated limit
block     in a block container and in a column no taller than its content, the modifier
column    moves nothing: the row follows its copy as it would without it
```

**Run it** from the repo root:

```
python3 -m http.server 8080
# open http://localhost:8080/tests/doc-actions-end-fixture.html
```

The label under the title reads `PASS`, or `FAIL` with the number of failing cases. The
cases are also on `window.__actionsFixture` and the verdict on `body[data-result]`.

**Verifying the fixture still bites.** Each change below fails only the cases named.

```text
remove the .doc-actions--end rule                 the stretch cases for the shared bottom edge,
                                                  the shared top, the row at the item's end and
                                                  the shorter item's row, and both wrap cases;
                                                  the kept gap, plain, block and column cases
                                                  still pass
move the auto margin onto .doc-actions itself     the three plain cases; the stretch, wrap,
                                                  block and column cases still pass
```

## role-conformance-fixture.html

Guards **the document-register lock** on a rendered page: `tools/role-conformance.js`,
the check that proves which elements carry which role and what each computes to, and
`tools/check-role-conformance.mjs`, which drives each governed link's states with real
input. A static read of `surface-document.css` (`check-type-roles.mjs` R7) cannot see a
consuming page — a local size override, a table of contents built from bare anchors, a
dense table set as body prose, a block with no rail, a quotation on the wrong accent,
smaller text tucked inside body copy, a hover rule that drops the magenta, a region that
swaps a token. This page can.

It holds one **conforming specimen** — every governed role except the title, which the
page's own heading carries: a quotation on the violet rail with its attribution, a plain
and a structured block on the magenta rail, a block inside an emphasis rail, an authorial
callout on the magenta rail, a quoted code excerpt on the one violet rail, a callout
inside a quotation drawing no second rail, a section framing panel and a section
synthesis panel with their chips, a two-level table of contents, a declared dense table
and an unmarked prose table, an entry title on an operable entry, and links in body,
metadata, a quotation and a dense cell — which must return no finding at rest or in any
link state. After it come **controls**: 101 negative controls, one per failure branch,
each of which must fail with exactly the reason codes it names, no more and no fewer; and
9 positive controls — an unmarked prose table, a complete profile declaration, an
emphasis rail off document text keeping a sanctioned violet accent, and six declared
peer-group blocks (two, five and ten groups, a question set out as three groups, a single
lead label, and a group boundary that also records a blank line, which must not double) —
which must return no finding:

```text
C0.token                    a region that redefines --fs-body, alone and around body
                            text (with C1.lh C1.size C2.body) · one that swaps
                            --font-sans around body text · one that makes
                            --ask-emphasis-magenta gray around a link · one that
                            makes --line-1 magenta around a quotation · one that
                            makes --ask-emphasis-violet gray around a quotation;
                            each finding must name its token, and each of the last
                            four is the only finding, because every other rule
                            resolves the swapped token in the same context
C1.lh C1.size C2.body       body copy at the Small step · a quotation set small
C1.lh C1.size C2.heading    a deep heading smaller than its body
C1.color · C1.weight ·      body in the tertiary foreground · body at 300 · body on
C1.lh · C1.tracking ·       tight leading · body tracked out · a label without
C1.case · C1.family         uppercase · a contents link in sans
C1.family · C1.weight ·     an entry title in mono · an entry title at the body
C1.lh · C1.tracking ·       weight (200) · an entry title on the panel label's heading
C1.case                     leading · an entry title on the panel label's tight
                            tracking · an entry title in uppercase
C3.missing · C3.color ·     a block with no rail · a block on the violet quotation
C3.color · C3.color ·       rail · a quotation on the retired neutral rail · a
C3.missing · C3.color ·     quotation on the magenta emphasis rail · a quotation
C3.double · C3.color ·      with its rail removed · a quotation on the cyan accent ·
C3.width · C3.inset ·       a quotation forced back on inside a callout · a consumer
C3.double · C3.double ·     stylesheet rule that recolors the quotation rail · a 1px
C3.color · C3.color ·       quotation rail · an inset too small · a second rail
C3.color · C3.color ·       inside a rail · an emphasis rail forced on inside a
C3.color · C3.missing ·     quotation · an emphasis rail on the retired neutral
C3.width · C3.hierarchy     color · an authorial callout on the violet quotation
                            rail · an authorial callout on the cyan accent · a rail
                            around body text on the violet accent · a callout group
                            on the cyan accent · an authorial callout with its rail
                            removed · a 1px emphasis rail · a hierarchy level drawn
                            as a 2px magenta rail
C4.class · C4.entry ·       a contents link without the text-link class, in a list
C4.body · C4.underline ·    and outside one · a contents anchor without its role ·
C4.underline-color          a contents entry set as body · an underline removed ·
                            a neutral underline (these two also fail their link
                            states: C9.rest, C9.hover, and C9.focus where focus
                            is lost too)
C4.body C4.entry C7.class   a contents list set as body list items with bare anchors
C4.entry C7.class           a bare contents anchor wrapped in a span inside its entry
C4.body                     a contents link whose text is set in document body
C5.body · C5.cell ·         in a table.doc-dense-table: a cell set as body · a cell
C5.head · C5.scope ·        with no role · a header without the label role; the
C5.scope                    dense cell role in an unmarked table · the dense marker
                            on something that is not a table
C5.body · C5.body           a dense cell holding body text · a dense header holding
                            a lede
(none)                      an ordinary prose table: unmarked, so not the dense role
C6.display                  the retired display quotation
C7.class                    a bare link in body text · in a subsection heading · in
                            a dense table header
C8.size · C8.family         smaller text inside body · undeclared mono inside body
C9.hover                    a contents link and a body link whose hover loses the
                            full magenta
C9.rest                     a resting underline already at full magenta
C9.focus                    keyboard focus that looks like rest · like hover · with
                            no indicator
C9.leave                    a hover a script keeps lit after the pointer leaves
C9.unreached                a governed link taken out of the Tab order
C9.unhittable               a governed link under a transparent overlay
C9.unrendered               a governed link inside a paragraph that never renders
C9.class                    a bare link a script adds when its disclosure opens, so
                            the resting check never saw it
C9.hover                    a lost hover in the first member of an exclusive
                            disclosure group, which the pass must open together
                            with the second rather than close
(none)                      mono text inside body, declared as a complete profile
C10.role + its defect       a profile that captures .doc-body cannot hide body at
                            the Small step (C1.lh C1.size C2.body still fire)
C10.zero                    a profile matching nothing (its region holds no defect,
                            so C10.zero is its only finding)
C10.count · C10.field ·     a miscounted profile · one without an owner · one
C10.field · C10.broad ·     without a reason · one naming an element type · one
C10.broad · C10.selector ·  capturing a container · one whose selector is a list ·
C10.selector · C10.broad ·  one whose list hides inside :where() · span:not(.zz) ·
C10.broad · C10.broad       .doc-body :not(.zz) · span[style]; each also leaves its
                            C8.family finding in place, because an invalid profile
                            exempts nothing
C8.family C8.size C8.weight a valid profile whose member holds a nested run in
                            another face: a profile exempts its member's own text,
                            never the text inside it
C11.gap · C11.gap ·         peer groups with no line between them (a consumer rule
C11.gap · C11.gap           drops the separator) · peer groups two lines apart (a
                            whitespace-only part closes the first group) · a
                            zero-width line closing the first group · groups set to
                            display: contents, which drops their separator
C11.tight · C11.tight ·     a blank line between a label and its lines
C11.tight · C11.tight       (data-lead-lines inside the group) · a blank line inside
                            one part of a group · a blank line made with line
                            breaks · a label set on a taller line
C11.gap C11.tight           a consumer's generic pre padding, which spaces every
                            line apart
C11.shape · C11.shape ·     a peer group outside a structured block · a structured
C11.shape · C11.shape ·     block mixing groups with a loose line · a peer group
C11.shape                   that does not open on its label · a peer group whose
                            label shows no text · loose text beside the groups
```

The page judges each case's **resting** codes itself and writes them to
`window.__roleFixture` and `body[data-result]`; the C9 link-state codes need a real
pointer and real Tab focus, so only the headless runner gives the full verdict. It merges
each case's resting codes with the link-state codes it observes in that case and requires
the union to equal the case's `data-expect` exactly.

**Run it** from the repo root:

```
python3 -m http.server 8080
# open http://localhost:8080/tests/role-conformance-fixture.html
node tools/check-role-conformance.mjs --fixture http://127.0.0.1:8080/tests/role-conformance-fixture.html
```

## attention-edge-fixture.html

Guards **the attention edge adopted by class** in `surface-action.css`:
`.surface-attention-edge`, which gives a shaped interactive object that is neither a
compact action nor a full-panel link the same hover and keyboard-focus edge, and nothing
else. The compact action and the full-panel link sit beside the adopting objects as the
reference, so the page shows one edge across all of them.

```text
reference   a compact action and a full-panel link: the edge they already take
bordered    an image card that lifts and raises its own shadow on hover, a launch
            card, and a media facade: the object's own border turns magenta, with
            the 0.5px ring outside it in light; the image card restates its hover
            shadow with the ring, as an adopting object with a shadow must
borderless  three overlay controls with no border of their own
            (.surface-attention-edge--borderless): an inset 1px ring where a border
            would sit, with the 0.5px ring outside it in light
SVG         a linked card whose box carries .surface-attention-edge-shape, at four
            scales: full size, declaring nothing; half size, fitted by its viewBox and
            declaring --surface-attention-edge-scale: 0.5; quarter size, drawn full
            size inside an HTML box a CSS transform scales, declaring 0.25; and double
            size, fitted by its viewBox and declaring 2. The box's stroke turns magenta.
            Below its own size it measures 1.5 in light and 1 in dark on screen: 1.5
            and 1 units at full size, 3 and 2 at half, 6 and 4 at a quarter. At double
            size it is 1.5 and 1 units and scales with the figure, to 3 and 2 on
            screen. The card's silhouette keeps its stroke
unaffected an inert panel, an unlinked card whose box carries the shape class, and a
            state box: none takes the edge, and each keeps its rest paint while
            every other case is focused
```

Each figure keeps its own size at any viewport — the full-size figure scrolls rather than
shrinking — so the scale it declares is its actual scale, and the SVG check reads both: the
stroke width against the declared scale, and the width on screen, through the shape's screen
matrix, against the edge below scale 1 and the edge times the scale at 1 and above. A figure
that declares a scale other than its own fails the on-screen limb.

The page checks **rest** on load and **keyboard focus** on the first key press: script
focus matches `:focus-visible` only once the page has seen keyboard input, so the focus
limb waits for one, and a case that still does not take keyboard focus is reported
`NOT RUN`, never `PASS`. While it checks, transitions are held off so it reads settled
paint. For each focused case it also confirms that no other case changed. The verdict is
under the title, on `body[data-result]` (`REST-ONLY`, `PASS`, `NOT-RUN` or `FAIL`) and on
`window.__attentionFixture`.

**Hover needs a real pointer**, so the page cannot check it. Check it by hand, or with a
driver that moves one: hover, keyboard focus, both at once, and focus kept after the
pointer leaves each show one edge and no browser focus ring.

**Run it** from the repo root:

```
python3 -m http.server 8080
# open http://localhost:8080/tests/attention-edge-fixture.html, then press any key
# add ?theme=dark or ?theme=light to hold a mode
```

**Verifying the fixture still bites.** Each change below fails only the cases named.

```text
remove the .surface-attention-edge selectors from the  every bordered, borderless and SVG
shared hover and focus rule and its outline rule       case, on focus, with the browser's
                                                       own ring; the reference cases pass
remove the borderless rules                            the three overlay controls
remove the SVG rules                                   the four linked SVG cards
replace the scale-compensated SVG widths with plain    the half- and quarter-scale
1.5 and 1                                              cards; the full- and
                                                       double-size cards still pass
remove the min() clamp from the SVG widths             the double-size card only
declare 0.25 on the half-size figure                   that card only, on its
                                                       on-screen width
```

A shape outside an adopting link takes nothing, so the unlinked card passes in every
case above.

## radial-contract.test.mjs

Guards the **data contract, layout grammar and label solver** of the
`diagram-interactive-radial` surface pattern, on the owner files themselves. It loads the
three DOM-free modules into one global exactly as a page does, so the code tested is the code
shipped. Scripted, not by eye:

```
node tests/radial-contract.test.mjs
```

```text
P  identity, relations, records, unresolved and unsupported references, closed keys
T  scalar types: every malformed owner value is a named error; absence is explicit
L  the tested limits, each failing with its code one step past the bound
S  shallow, ragged, deeper, flat, capacity and the specimen, under both allocations,
   each holding the grammar invariants and deterministic
G  the base hierarchy's equal-share geometry against a stored reference; the fan rule at
   its boundary
N  renaming every identifier, label, kind and plane leaves the geometry unchanged
V  the label tiers, held names, a second target independent of the first, crowding, the
   Fit's population over a sweep of small canvases, and template slots read as own properties
I  opaque identifiers through the label layer: object-property names and delimiter-bearing
   identifiers change no collision relationship (I1-I3, I6) and no decision of the short-canvas
   population rule, which compares pair identities, not their number (I4, I5)
X  negative controls: the invariant checks and the geometry comparison each fail for their
   reason; X6 runs the I checks on mutated copies of the labels module, each of which must fail
   the check written for it: three restore defect classes of the earlier bookkeeping (plain-object
   grouping, pairs joined with '|', directed pairs joined with '>'), two are plausible
   regressions (a directed pair stored undirected, the short-canvas rule comparing counts)
```

**Geometry is compared, not hashed.** `radial-geometry.mjs` holds the one rule both runtimes use:
structure exactly (count, order, identifier, parent, depth, kind, mark radius, container count,
whether it carries a fan radius),
computed numbers within 1e-6 world units. The layout multiplies radii by `Math.cos` and
`Math.sin`, which ECMAScript leaves implementation-approximated, so the last bit of a coordinate
differs between engines (one unit in the last place between Node v22.12.0 and Chrome 154 on this
layout)
and a hash of raw output fails across runtimes with nothing moved. The tolerance's reasons, at
both ends, are in the module's header, which keeps what was measured apart from what is derived.
The root's count is checked against the reference's leaf total, since a reference may record the
root's count by another rule; every computed number must be finite on both sides.

**The reference is independent of the code it checks.** `radial-base-equal.reference.json` was
computed by an implementation independent of the owner layout. Its provenance and the SHA-256 of
each of its inputs (the layout source, the projection, the data) are recorded in the file, and it
is stored, never regenerated from the layout under test. X2 shows the comparison passes a 4.6e-13
perturbation of every coordinate and a displacement inside the tolerance, and fails a leaf moved
just past it, a leaf moved to another container, two siblings declared in the other order, a
wrong root count or root parent, a missing node, a dropped fan radius, a changed bound, a
coordinate that is not a finite number, and the other allocation.

## radial-fixture.html + radial-behavior.mjs

The **browser behavior harness** of `diagram-interactive-radial`. `radial-behavior.mjs` serves
this repository read-only on 127.0.0.1, opens `radial-fixture.html` (three hosts, the owner files
and the specimen generator; no consumer code and no stub) in headless Chrome, and drives it
with real mouse, wheel, touch and key input over the DevTools Protocol. Two per-shape sweeps
visit every mark and run in the page instead: the click sweep calls the click's own resolution
function at each mark's center, and a sample of real clicks per shape must agree with it; the
keyboard sweep dispatches key events on the stage, and the K checks walk with real keys.
Destroy is checked by the browser's own listener count. No npm dependency; Node 22+, Chrome at
`$CHROME` or the default locations.

```
node tests/radial-behavior.mjs           # add --json for the measurements
```

```text
M  the minimum composition         S  every hierarchy shape         P  pointer and wheel
R  the relation layer's first state in both compositions: mount, remount, arrival claimed with
   no link, resolved and unresolved deep links, after a selection clears; and, in the minimum
   composition with motion not reduced, the first frame
G  the reference geometry, computed in the browser                  L  renamed identifiers
O  overlapping marks and the chooser; its focus when a resize closes it (to the figure, unless
   a reader moved it elsewhere; none on destroy)                    T  touch: tap, pan, pinch
F  Fit, the zoom floor, resize     K  the keyboard path             I  two instances, the event bus
D  destroy and remount             E  error paths                   A  deep-link arrival
V  a second label target           X  controls on the harness's own checks
C  the responsive chrome, on the third host and once on the specimen shell: one window narrowed
   step by step from 1600 to 390 CSS px and widened again, with no chrome box meeting another or
   leaving the canvas; fresh compact load against resize arrival; a wide but short canvas; a
   reader's panel kept, re-bounded, set aside and restored, forgotten after a reader action;
   Escape, explicit Fit, a reader's own view across arrangements, focus handoff, an extreme size,
   a phone turned, both themes, destroy and remount, chrome configuration errors; no flip or
   refit loop where the Fit straddles a tier, a selection never changing the arrangement, Escape
   forgetting a set-aside panel, no unreadable legend strip on a short wide canvas, focus never
   passing through another control, refits carrying their cause
```

The first line of its output names the runtimes: Node and V8, and the browser and its V8.

With `--json` it also records the chrome's narrowing sequence and the phone's turn (arrangement,
open panel and Fit scale per CSS viewport). Per shape it also **measures, without judging**: the Fit's scale and clearance, the names it
defers, the pairs of marks whose shapes overlap, how the click resolution resolves at each mark's
center (directly, or through the chooser), the sampled centers that page chrome covers, and the
keyboard reach. Accepting the contract's input limits
says nothing about legibility; these numbers are what the overview actually shows.

## spine-fixture.html + spine-error-fixture.html + spine-behavior.mjs

The **browser behavior harness** of `diagram-interactive-spine`. `spine-behavior.mjs` serves this
repository read-only on 127.0.0.1, opens `spine-fixture.html` (the canonical shell's structure,
loading the owner files by reference in the shell's order; no consumer code and no stub) in headless
Chrome, and drives it with real mouse, wheel and touch input over the DevTools Protocol. The camera
is read from `#vp`'s transform, the selection from `.node.sel` and the inspector, the gesture
controller's listeners by the browser's own count. `spine-error-fixture.html` serves the fail-closed
checks: it leaves out the one support file `?omit=pointer` or `?omit=fit` names. No npm dependency;
Node 22+, Chrome at `$CHROME` or the default locations.

```
node tests/spine-behavior.mjs           # add --json for the measured Fit views
```

```text
M  mouse: click selects, empty canvas clears, hover previews; a drag pans by exactly its distance
   and never changes the selection, from empty canvas or from a node; a move inside the 4px tap
   slop does not pan; one wheel step is x1.12 about the pointer; a horizontal scroll does not zoom;
   the zoom-out floor is the lower of 0.25 and the Fit scale
T  touch (390x844): the stage carries touch-action: none and the panels do not; a tap selects and
   clears; a swipe pans by its distance without changing the selection, from empty canvas or from a
   node; a pinch zooms about its centroid; pinching in stops at the wheel's floor
F  Fit: the Fit control restores the fresh-load view; a resize refits; the floor tracks a Fit below
   0.25 on a constrained canvas
L  lifecycle: after a second render the stage carries one gesture controller, and a drag or a
   wheel step acts once; a render during a drag leaves no gesture state behind
E  error paths: without diagrams-pointer.js, or without diagrams-fit.js, the engine throws its
   named error and draws nothing
```

**Its control is the spine before it consumed the shared pointer.** Run against that tree, M3
(node drag), M4 (tap slop), M7 (horizontal scroll), T0-T6 (touch; T6 because no tap selected
anything to clear), L1 (listener count), L4 (a render during a drag) and E1 (the pointer guard) fail
for their stated reason. The mouse click, drag, wheel step, floor, hover and Fit checks pass
unchanged, and so do E2 (the fit guard predates the pointer) and L2 and L3 (a stale handler acts on
its own detached view).
Headless touch emulation is **not** iPhone or Safari evidence; the pattern's device gate is separate.

## radial-stack-fixture.html + radial-stack.mjs

The **full-stack harness** of `diagram-interactive-radial`: every optional module (inspector,
facets, legend, chrome, export, theme) on the synthetic composition, in two hosts, and once on the
reference specimen, which the fixture loads only when a check asks for it. Keys that peel layers
arrive as trusted DevTools input; the other checks drive the modules' own controls in the page.
Each check is an in-page function, and group X runs some of them again against a planted fault in
a copy of a module, each of which must fail the check written for it.

```
node tests/radial-stack.mjs              # add --json for the measurements
```

```text
U  the inspector: views, preview, references and the way back, Escape, show-all, relation
   direction and flags, locators, text never markup, malformed sections, a record arrival,
   refits at the Fit only, the compact sheet and its exclusivity, the Fit edges it declares by
   state (the collapsed pill top with the right as its option, the open sheet an overlay that
   reserves nothing, the wide panel right), a selection opening the sheet with no refit (also
   over an open chrome panel), focus kept in the panel with trusted keys, the live legend's notes
   and its shapes line; a resize into compact keeping a reader's open record as the sheet, with
   focus in it (a narrow window; a short one under a coarse pointer), and folding a panel open
   only by default, with unrelated focus left alone; a record kept open on the resize with
   unrelated focus left alone; a reader's inspection yielding to the open drawer on the resize,
   with focus inside it handed to its disclosure; on a wide canvas, the panel's own toggle
   refitting only at the Fit after a selection opened it again; a reference to a
   filtered-out node with no facets module, to a node hidden by policy, and the way back to a
   node filtered out since (the record closes; nothing else changes); with a record and a
   filter, the sheet opened and closed through a turn tall portrait > short portrait > landscape
   > short portrait > tall portrait, at the Fit (opening never refits or shrinks the drawing and
   keeps the node beside the sheet; closing returns to the same Fit; each turn refits) and away
   from it (the camera stays); and
   the two public expressions, the CFW reference and the Vellmark parks composition, in each
   theme (the theme in force checked): framed at the whole-map Fit on a touch page turned from
   tall portrait through short portrait (393x666, 390x664) and the short landscape sizes
   (844x390 to 568x320) and back, then tablet and wide, and on a desktop page 1150 tall narrowed
   from 1280 to 767 and widened again, and each of its sizes loaded fresh, each Fit clear (its
   names in the clearance check), as large, within 0.5%, as the best reservation of the inspector
   that clears (each edge it can hold, measured by declaring it alone), and, where the panels
   around the map fold with nothing inspected, as large as the overview the inspector leaves
   folded, a fresh load reaching the walk's Fit; the same walk with a filter, a selection and a
   record kept through it; on a desktop window where the panels around the map fold, the
   inspector folded with them and its dynamic states: hover previews a leaf and leaves it
   folded; over the whole map the open sheet is reported, live, as covering the drawing; a
   record, a node selected under the open sheet, a reference followed from the record with the
   most to show, and that record growing the sheet past its node each keep the selected node
   beside the sheet; the reader's Escape clears the selection and folds the sheet, focus kept on
   the panel; Fit restores the overview; a reading state carried from a roomy window to the
   cramped one takes the new arrangement's Fit before the sheet leaves it, and back returns to
   the roomy Fit, and a camera the reader moves is kept both ways; nothing more happens once the
   observers settle, at the end and at the narrow size; a manual camera is kept through every
   resize; on a landscape desktop window where the panels fold, an arrival and a search result
   land clear of the open sheet; at the narrowest desktop window where the panels stand,
   selections that grow the open wide panel leave no drawn mark under it; where the open drawer
   alone folds the panels, the sheet over a selection yields to it, and a search result chosen
   there closes it as on a phone, and on a window narrowed past the fold with the drawer open
   over a selection, the sheet yields and the drawer and its focus stay; on a touch page turned
   390x844 to 844x390 and back, and the other way, with the reading sheet open (opened from the
   Fit under a filter with an evidence record followed, by a #node= arrival, by a search result
   and by a reference followed), the selection, record and filter kept, the sheet open and the
   selected node on the canvas and clear of it after each turn, a view made from the Fit the new
   size's Fit, never smaller, a node the map centered kept at its zoom, closing the sheet after a
   turn leaving the node on the canvas, Fit restoring the overview, a record with no placed origin
   keeping its view and the focus over a Fit made for the new size, and nothing more once the
   observers settle; a camera the reader moved (a real pan, pinch, wheel or zoom control, or
   keyboard moves that pan away from an arrival) kept through a turn and a desktop resize, a change
   of height alone holding its center; the first leaves arrived at by a #node= link on a fresh
   phone page, and again with every font face loaded before the map mounts, clear of the open
   sheet once the layout settles; where the open drawer alone folds the panels, the sheet opened
   by its own toggle closing the drawer and the wide panel returning to the wide Fit with no change
   of size; on a desktop page narrowed, a node an arrival centered kept on the canvas at its zoom
   and a group the map framed framed again; and, with the wide
   panel placed over the legend's corner by a test style, the chrome and the inspector settle in
   one step, the arrangement counted from before the mount
Q  facets and search: the index, ranking and ties, what a result opens, OR within and AND across,
   counts, census and readout, relations, refit (the whole layout when no item remains), a filter
   clearing a hidden selection, the drawer's bound, edge and focus, exclusivity on a compact canvas,
   the Escape order and the result keyboard with trusted keys, focus after a result closes the
   drawer, no match, is-out; and, on the reference shell, an open drawer meeting a corner panel
W  export with the whole stack in use, and the reference plates
H  theme: the cycle, one owner per document, teardown
N  the synthetic composition in every hierarchy shape, two instances, destroy and remount,
   missing modules and slots, the minimum composition's membership, no reference content loaded
R  the reference specimen on the complete stack
X  planted faults: OR as AND, the record layer below the selection, rows without direction, an
   unbounded drawer, a panel without its claim, a locator linking anything, the root framed alone,
   a hidden selection kept, a selection refitting the opened sheet, the sheet claiming before it
   leaves the Fit, a yielding obstacle ignored in wide, focus dropped when a view is replaced,
   focus kept in a drawer another panel closes, a reveal only through the facets module, a
   resize folding a reader's inspection, a resize hiding the body without the focus hand-off, a
   chrome measuring the inspector as it stands (with no probe: the two fold and unfold each other
   until the mount fails); loaded into the CFW reference and remounted, the collapsed pill with
   no option (at 568x320 the drawing then stands under the controls), the collapsed pill to the
   right alone (at 393x666 the Fit stands clear but squeezed beside it), an inspector ignoring
   the chrome's arrangement (at 860x1150 the idle panel stays open beside a far smaller drawing),
   a report saying only what the last Fit covered (the open sheet over the drawing goes
   unreported), an inspector not keeping the selected node beside the open sheet (a node selected
   under it, and one the growing record covers, stay under it), a resize keeping a reading state
   open without taking the new arrangement's Fit (the cramped sheet over a far smaller drawing),
   the wide panel not returning to the Fit the sheet left (where the sheet's opening closes the
   drawer that folded the panels, the view stays off the wide Fit), the sheet staying open over the
   open
   drawer when the arrangement folds, and a selection without its deferred check (arrived nodes
   end under the sheet); on the public expressions, a size change keeping a view the map made (a
   turned phone leaves the selected node off the canvas or under the sheet), an inspector not
   placing the node beside its sheet after a turn (the node ends under it), a pan not counted as
   the reader's (the turn makes the panned camera again), a keyboard move not counted as the
   reader's (the resize makes its camera again), and the stage size remembered only as
   the map mounts with every view treated as the reader's (the bar filling in moves an arrived
   node under the sheet); on the fixture, the camera kept for the wide panel too (its toggle then
   refits away from the Fit); a control that names its reason fails for it
```

## radial-export-fixture.html + radial-export.mjs

The **export harness**: the page and diagram plates on the synthetic specimen, through the
instance's `service('export')` and through real clicks on the controls. Sizes and filenames in both
themes; byte-identical SVG for one page state; the reader's state untouched and the plate
independent of the screen; the counts the plate lines receive; the failure surfaced on the control
and its restoration; both font routes and their failures; raster controls showing the embedded
faces and the read rules each change the pixels; negative controls for each plate check; legend
notes and the shape key; malformed sections; the controls' slots; a real download; one run at a
time; teardown during and after a run; and one click-time snapshot: a theme changed in either
direction while the first export font's load is held at the native boundary leaves the plate (a
diagram plate both ways, and a page plate with its mark, legend and caption) equal to that theme's
plate without a change, with its theme and filename, and the page with the reader's new theme (a
held load with no change is the control).

```
node tests/radial-export.mjs             # --out DIR keeps the review PNGs and the results
```
