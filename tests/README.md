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
