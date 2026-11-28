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
overflows at any viewport. A wide table box and a wide block that a consumer makes focusable
carry the keyboard-focus cases.

The page measures each case once the fonts are ready and reports one overall verdict, with
a row per case:

```text
reach             the dense marker alone draws no padding, no row rule and no numeric alignment,
                  and a dense value still wraps; code there still breaks anywhere; an unmarked
                  table and a table marked without its box take no measure, no row rule and no
                  composition padding; a table nested in a composition cell takes no row rule
                  and no composition padding
composition       the 32rem narrative measure and none on a dense table; none on a compact
                  table, which keeps the cell padding, and the measure kept on a comparison
                  marked compact; --space-3 block padding, --space-5 between columns and
                  none after the last; the --line-2 row rule and the --line-1 header rule;
                  the header row shown in place, visible and unclipped; code breaking at its
                  own opportunities; a numeric header and cell at the end, a numeric header
                  and a narrative numeric cell on tabular figures; a dense value on one
                  line; --space-6 of scroll padding on the box; a consumer rule of one
                  class, loaded before the register, winning over the cell rules; a
                  row a script appends to the table itself taking the cell rules
scroll-into-view  a header link scrolled into view by its nearest edge lands inside its box and
                  clear of the fade, while hidden content remains to its right
focus             a focusable wide table box and a focusable wide block, each drawing the fade
                  at rest: under keyboard focus, a 2px solid --fg-1 outline --space-1 out and
                  no fade; on blur, the fade as it was at rest
range lane        a box without .doc-table-scroll--range-lane takes no lane; a range-lane box
                  reaches the lane (--space-3 and 2px) into the margin and pads it back, its
                  edge that far outside the column, and every header and cell sits where it
                  does in a box without the lane, at rest and scrolled to the end; a
                  consumer's margin shorthand of one class does not split the pair and keeps
                  its block margin
label             the label in capitals; code in it, with the class and without, in its own
                  case; plain text in it, such as mW, in capitals
overflow          a wide table box and a narrative table below its measure report the right
                  side and draw the cue; a box that fits reports nothing; a compact table that
                  fits reports nothing and draws no cue, and one that cannot fit reports the
                  right side and draws the cue; scrolled to the end and to the middle, the
                  attributes and the cue follow; a wide and a fitting block report as before
added             a table box and a block added after load are reported; a box moved in the
                  document, and one added after load, each carry one scroll listener
```

**Run it** from the repo root:

```
python3 -m http.server 8080
# open http://localhost:8080/tests/document-table-fixture.html, then press any key
```

Every case runs on load except keyboard focus, which runs on the first key press: script
focus matches `:focus-visible` only once the page has seen keyboard input, so the focus limb
waits for one, and a box that still does not take keyboard focus is reported `NOT RUN`, never
`PASS`. The label under the title reads `REST PASS` until then, and `PASS`, `NOT RUN` with
the number of focus cases that did not run, or `FAIL` with the number of failing cases. The
cases are also on `window.__tableFixture` and the verdict on `body[data-result]`
(`REST-ONLY`, `PASS`, `NOT-RUN` or `FAIL`).

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
drop .doc-compact-table from the measure's         the compact table's measure case and its
exclusion                                          fits and no-cue cases
drop the comparison clause from the measure rule   the compact comparison's measure case
hide the composition's header row                  the header-row case
drop the range-lane box's start margin             the lane-pair and box-edge cases, and the three
                                                   cases that place the headers and cells
put the range-lane rule at zero specificity        the consumer-margin case
move the focus rule above the mask rule            the two no-fade-while-focused cases
```

## comparison-rail-fixture.html

Guards **the comparison table's assessment lane** in `surface-document.css`, with the rails
`criterion-assessment.css` draws on it. A rail marks the column it assesses, so it never begins
before the content edge of the header that governs its cell; outside a value field it begins on
that edge, and the cell's text keeps the lane's clearance after it. The fixture sets one grouped
comparison: neighboring cells with different ratings, an unassessed row, a cell spanning a group,
a point list, facts below a summary, and a numeric column with rated and unrated figures, whose
value-field templates this table ignores; a copy of it in a 320px box; and a key. It also sets a
legend-led comparison, whose rated figures share the template `000.00` with figures of unequal
width in each column; a copy of it and its key, the table in a 320px box; and a fixed layout
whose figure columns are too narrow for their template; and a last legend-led table whose one
word holds a link. Each legend-led table is followed by its key.

The page measures each case once the fonts are ready and reports one overall verdict, with a row
per case:

```text
rail      each rail is drawn, 2px, absolutely placed in its relatively placed wrapper, so its
          computed place is where it paints; outside a value field it begins on the content edge
          of the header that governs its cell, the column header for a cell in one column and the
          group header for a cell that spans the group, within 1px; it begins at least 13px
          inside its own cell, clear of the gutter before the column
text      in a text cell the first block's text begins 12px after the rail: a paragraph's first
          line, or a list's own box, whose markers hang inside it; assessed and unassessed cells in
          a column, and a cell spanning from it, share that origin
figures   a numeric cell's figure ends where its column header's text ends, rated or not
words     in a table that shows its words, each word is shown; in a legend-led table each word
          stays in the cell as its assessment's text, not hidden from assistive technology, drawn
          nowhere and taking no space, so its wrapper is as tall as what it shows, unless it holds
          a link, when it stays shown; the key follows the table's box
field     a rated figure in a legend-led table with a template: its wrapper is as wide as the
          template in the cell's own figures, or as the figure where wider, and never wider than
          the column's content; its rail sits 12px before it, beside it at the column's end, and
          never before the content edge; in each column the group's rails share one line
key       the key lays out its items in a row; its first rail sits at the key's own start; each
          item's rail is drawn and placed as a cell's is, and its word begins 12px after it
scroll    each narrow box overflows and scrolls, and a rail and its text or figure move with it by
          the same distance; the page itself never scrolls sideways
```

**Run it** from the repo root:

```
python3 -m http.server 8080
# open http://localhost:8080/tests/comparison-rail-fixture.html
```

The label under the title reads `PASS`, or `FAIL` with the number of failing cases. The cases are
also on `window.__compareRailFixture` and the verdict on `body[data-result]`. Run it in both
themes, and at a phone width as well as a desktop one.

**Verifying the fixture still bites.** Each control below loads one regression from a page-local
rule; it fails only the cases named, in both themes and at both widths. The first four touch
only the tables that show their words.

```text
?control=no-lane          body cells lose the lane after the content edge, so each rail hangs in
                          the gutter before its column: every rail-edge case and every inside-its-
                          column case fail
?control=rail-only        the rail alone moves onto the content edge and the text does not: every
                          12px-after-the-rail case fails, the rail touching its text
?control=inline-figures   a rated figure's wrapper takes the figures' width again: the rail-edge
                          cases of the two rated figures fail, in each table
?control=key-indent       the key takes a list's indent and stacks its items: the key's row case
                          and its first-rail case fail
?control=words-shown      a legend-led table's words return to their lines in its text cells:
                          those wrappers' no-space and height cases fail, in each legend-led
                          table with text cells
?control=figure-words-shown
                          the same in its figure cells: those wrappers' no-space and height cases
                          fail; each word widens its field, so the field-width and beside-the-
                          field cases fail wherever the column has room for the word, and so does
                          each column's shared line where its words differ in width
?control=own-width        a value field loses its template and takes its figure's width: the field-
                          width and beside-the-field cases of every figure narrower than its
                          template fail, and so does each column's shared line where its figures
                          differ in width
?control=no-clamp         a value field keeps its template's width in a column too narrow for it,
                          and overflows the column's end: the narrow columns' field-width and
                          figure-end cases fail
?control=end-anchored     the same field is anchored to the column's end instead, and overflows
                          before the content edge: the narrow columns' field-width, beside-the-
                          field, content-edge and inside-its-column cases fail
?control=no-guard         the word that holds a link is hidden as the others are: its stays-
                          shown case fails
```

## rail-paint-fixture.html

Guards **the rail paint** in `surface-treatments.css`: a rail in one governed color takes the
same paint whichever meaning draws it. Each paint is keyed by its color,
`--surface-rail-paint-green`, `-yellow` and `-red`, and the meaning-named `-earned` and `-deflated`
are aliases that read their color's paint; `-structural`, which read yellow, is retired with
structural's move to violet. The fixture sets five review ranges, one per review judgment, and a
neutral range; ten keyed ranges, opened by Spectral State's earned, partial, deflated, structural and
held labels, Evidence State's supported, partially supported, contradicted and weakened labels, and
one Criterion Assessment record for a caution, a bounded assessed range; a comparison that shows its
words, with a favorable, a caution and an adverse summary; a legend-led comparison with the same three
as rated figures in value fields, and their key; a caution summary inside a `.theme-dark` subtree; and
a quotation.

The page measures each case once the fonts are ready and reports one overall verdict, with a row
per case:

```text
stroke    every rail is a 2px solid stroke
paint     each rail's paint is its color's: none for every color, the plain stroke, on both fields,
          in the dark subtree too
one       the declined range's rail, the deflated and contradicted ranges' and every adverse rail
          share one color and one paint; the accepted range's, the earned and supported ranges' and
          every favorable rail, another; caution beside a summary, in a field, in the key, in the dark
          subtree and on the assessed range, and the partial and partially supported ranges', a third
color     each keyed range's rail is its role's physical color, written in the fixture as the 8-bit
          color it resolves to and never read from the owner, within 1 of each component: earned and
          supported green, partial, partially supported and caution yellow, deflated and contradicted
          red, structural violet, weakened orange, held cyan
label     the declined review mark keeps the bordered label's own edge, a 1px reinforcement in
          light and a 0px one in dark
alias     on the root, earned reads green's paint and deflated red's, and nothing declares the
          retired structural alias
follows   with the color-named paints changed on the root (green 3px, yellow 2px, red 1.5px),
          every rail bound to one follows it, and the proposed, open, no-decision, neutral,
          structural, weakened and held ranges' rails stay bare; each alias follows its color; the
          declined mark's edge and the quotation's rail do not move; once the change is removed,
          every rail paints as before
```

**Run it** from the repo root:

```
python3 -m http.server 8080
# open http://localhost:8080/tests/rail-paint-fixture.html
# add ?theme=light or ?theme=dark to hold a mode
# add ?field=ask-lavender (or any name) to declare a root field
```

The label under the title reads `PASS`, or `FAIL` with the number of failing cases. The cases are
also on `window.__railPaintFixture` and the verdict on `body[data-result]`. Run it held light,
held dark and following the browser, each with the browser's preference light and dark, and once
more in each with `?field=ask-lavender`: the rail paint reads no declared field, so every case
expects the same paint with the field declared.

**Verifying the fixture still bites.** Each control below loads one regression from a page-local
rule; it fails only the cases named, in every one of those six settings.

```text
?control=local-dose       caution keeps a dose of its own, as the profile once did: its four rails'
                          paint and follows cases fail, and so does the one-yellow case, since the
                          assessed range and the partial and partially supported ranges keep the
                          shared paint
?control=unbound-range    the review ranges lose their binding to the shared paint: the accepted
                          and declined ranges' follows cases fail
?control=unbound-keyed    the keyed and assessed ranges lose their binding to the shared paint: the
                          earned, partial, deflated, supported, partially supported, contradicted and
                          caution ranges' follows cases fail
?control=label-reach      the red rail paint, --surface-rail-paint-red, is put on the declined
                          review mark: the mark's own-edge case and its untouched case fail
?field=ask-lavender&control=field-dose
                          a declared field gives yellow a dose, as the retired ring did, through
                          --surface-rail-paint-yellow: the four caution rails', the assessed range's and
                          the partial and partially supported ranges' paint cases fail; without
                          ?field= the control is inert
?control=alias-value      the earned alias carries a value of its own instead of reading green's
                          paint: its alias follows case fails
?control=structural-alias the retired structural alias is declared again, reading yellow's paint:
                          the retired-alias case fails
?control=former-colors    structural takes the yellow and partial the orange again, as before
                          Spectral State v2.0: the partial and structural ranges' color cases fail,
                          and so does the one-yellow case
```

Until the yellow ring was retired (Spectral State v1.2), the fixture carried two controls for the
ring's field and subtree logic; with every paint none, neither can fail, so both are gone. The
`?field=` run and its control stand in their place, guarding that no field brings a dose back.

## fill-paint-fixture.html

Guards **the fill paint** in `surface-treatments.css` as the semantic systems bind it: each fill
color's ink is the ink ASK approved for it (2026-11-25), the same in both themes, magenta's included;
each chromatic role takes its assigned physical color and names its ink, `--state-<role>-ink`,
`--evidence-<role>-ink`, `--review-<role>-ink`, `--assessment-<role>-ink` and `--function-<role>-ink`,
bound by reference to the ink FILL PAINT keys by the fill color; and brown, which no role draws, keeps
the lavender ink. The fixture sets the five chromatic evidence roles and the three assessment roles as
filled HTML boxes and SVG shapes, each composed by the recipe its contract documents, and the four
pending and decided review roles as decision nodes, which `review-semantics.css` binds itself; it loads
Three Functions after the state modules, and the Evidence State, Review Semantics, Criterion
Assessment, Spectral State and Three Functions keys and the style guide in frames.

Every expected color is written in the fixture as the 8-bit value the approved recipe resolves to, never
read from the owner, and compared within 1 of each component, alpha exact: a browser may round an HSL
recipe either way, and the closest two approved inks, white's and green's, differ by 2 in each.

The page measures each case once the fonts and the frames are ready and reports one overall
verdict, with a row per case:

```text
ink       each fill color's ink is its approved ink, in both themes: green rgb(132, 125, 154), yellow
          rgb(123, 115, 146), orange rgb(61, 57, 73), red rgb(225, 215, 234), violet rgb(217, 205, 228),
          magenta rgb(235, 228, 241), white rgb(130, 123, 152); cyan, lavender and the neutral shape the
          foreground's light value, #6A637F; brown the lavender, #D4C6E1
neutral   the neutral shape is #BFB3D4 inside a white edge at 90% in light, and the lavender, edge and
          all, in dark
assigned  each role takes its physical color: earned, supported, accepted and favorable green;
          partial, partially supported and caution yellow; weakened orange; deflated, contradicted,
          declined and adverse red; structural violet; held, unresolved, open and judicial cyan;
          proposed, review proposed and legislative magenta; executive white in light and the lavender
          in dark; no role brown
value     each role's ink is its color's approved ink, the executive's white's in light and the
          lavender's in dark, and Spectral State's neutral ink the neutral shape's
box, svg  each filled box takes its role's color as fill and edge and that color's ink as text color;
          each SVG shape its role's color as fill, and its text the ink
no ink    not yet testable, no decision recorded, unassessed and lavender-gray declare no ink
no fill   a record for no decision recorded takes no fill
follows   with each fill color's ink changed on the root, every role's ink reads its own color's
never     no .surface-fill shape on this page or in a frame is painted lavender-gray, and each page
filled    draws at least one filled shape, so the case cannot pass on a page that failed to load
```

**Run it** from the repo root:

```
python3 -m http.server 8080
# open http://localhost:8080/tests/fill-paint-fixture.html
# add ?theme=light or ?theme=dark to hold a mode
```

The label under the title reads `PASS`, or `FAIL` with the number of failing cases. The cases are
also on `window.__fillPaintFixture` and the verdict on `body[data-result]`. Run it held light,
held dark and following the browser, each with the browser's preference light and dark: every ink
takes no theme exception, so every ink case expects the same value in all four; the executive's color
and ink and the neutral shape follow the root theme, as Three Functions and FILL PAINT declare. The
frames follow the browser's preference; lavender-gray is one value in both themes, so their case is the
same in each. The never-filled case reads `.surface-fill` shapes only: a lavender-gray swatch in the
style guide's color tokens is a token's specimen, not a filled shape, and is not read.

**Verifying the fixture still bites.** Each control below loads one regression; it fails only the
cases named.

```text
?control=brown-theme      brown's ink takes a dark theme exception, #6A637F: in the held-dark and
                          follow-dark settings the brown ink case fails, and no role's, since none
                          draws brown; in the light settings the control is inert
?control=magenta-theme    magenta's ink takes the retired dark exception, the high-contrast #201D26:
                          in the held-dark and follow-dark settings the magenta ink case, the proposed
                          state's, review proposed's and legislative's value cases and the proposed
                          node's box and SVG ink cases fail; in the light settings the control is inert
?control=caution-structural
                          caution reads Spectral State's structural again, as it did before structural
                          moved to violet: caution's assigned, value and follows cases and its box and
                          SVG cases fail, in every setting
?control=weakened-brown   weakened takes brown and brown's ink again: weakened's assigned, value and
                          follows cases and its box and SVG cases fail, in every setting
?control=restated-ink     the weakened ink restates orange's recipe instead of reading orange's ink:
                          its follows case fails, in every setting
?control=restated-review-ink
                          the open ink restates #6A637F instead of reading cyan's: its follows case
                          fails, in every setting
?control=nyt-ink          not yet testable declares an ink: its no-ink case fails, in every setting
?control=nyt-fill         a filled not-yet-testable shape is added to the Evidence State key's
                          frame, as a key that broke the contract would draw it: that frame's
                          never-filled case fails, in every setting
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
and an unmarked prose table, an entry title on an operable entry, links in body,
metadata, a quotation and a dense cell, and the bordered label without Review Semantics:
a neutral label in text, an emphasis panel's chip, violet and cyan chips, a chip outside
an accented surface, a scrolling table whose first and last columns hold a label and
whose label of several words keeps its line beside a long cell, and a label set directly
in a column composition; the labeled range without Review Semantics: two neutral
ranges in a row, one in a table's second column, and, in tables whose box keeps the
range lane, one in each of a first, an interior and a last column and one in a table's
only column, and a list that opens on two item hosts after a range, keeping the passage
buffer from it; and the scope underline without Review Semantics: a neutral underline in
body text, and one under a phrase holding a link, which keeps its own line and states;
an ordered sequence of three steps, each opening on its label; and the marker: a neutral
dot, a square and a hollow dot at the three sizes, a dot in a meaning's color, a dot in
its field's color inside its 1px edge, and a square inline in body text — which must
return no finding at rest or in any link state, on screen or under print media.
After it come **controls**: 242 negative controls, one per failure branch, and two more
under print media,
each of which must fail with exactly the reason codes it names, no more and no fewer; and
19 positive controls (17 under print media) — an unmarked prose table, a call to action in a meta line, a shaped object that owns its own interaction and so takes no text-link class, a complete profile declaration, a
declared presentation assignment's own foreground with a bordered label under it, an
emphasis rail off document text keeping a sanctioned violet accent, six declared
peer-group blocks (two, five and ten groups, a question set out as three groups, a single
lead label, and a group boundary that also records a blank line, which must not double),
a labeled range whose label holds its words in an inline child, a labeled range the
page does not show, whose hidden label is then not judged, a wrapped list closing on
an item host followed by a list opening on one, which keeps the buffer across the
wrapper, and item hosts in two neighboring table cells, which owe no buffer across a
row, and three ordered sequences — one in a closed disclosure, judged once the runner
opens it, one whose step a local print rule lets break and one whose step it keeps whole
only in columns (`avoid-column`), which on screen draw as they should and under print
media are the two more negative controls (`C16.print`), and a marker in a closed
disclosure, judged once the runner opens it — which must return no finding:

```text
C0.token                    a region that redefines --fs-body, alone and around body
                            text (with C1.lh C1.size C2.body) · one that swaps
                            --font-sans around body text · one that makes
                            --ask-emphasis-magenta gray around a link · one that
                            makes --line-1 magenta around a quotation · one that
                            makes --ask-emphasis-violet gray around a quotation ·
                            one that restores the retired --state-external, alone,
                            and one that restores the retired
                            --state-external-ink around a neutral label, whose
                            finding names external as retired in Spectral State
                            v2.0; each finding must name its token, and each of the
                            last six is the only finding, because every other rule
                            resolves the swapped token in the same context, and no
                            rule reads the retired one
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
(none)                      a call to action in a meta line: a shaped object that owns
                            its interaction, so it takes no text-link class
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
(none)                      a declared presentation assignment's own --fg-1, the
                            assignment named, with its field, on its root, and a
                            bordered label under it, whose theme the assignment's
                            context gives
C0.token                    a foreground value the assignment does not declare ·
C0.token                    a light-only assignment inside a .theme-dark region,
                            where its context binds nothing
C0.assignment C0.token ·    an assignment its root does not declare · one
C0.assignment C0.token ·    declared without a field · one whose declaration names
C0.assignment C0.token      another field than its root; an invalid assignment
                            admits nothing, so its drift is reported too
C0.assignment ·             an assignment that tries to bind a type size · one
C0.assignment               naming an inherited object key as a role
C0.assignment               a root declaring an assignment, checked without its
                            declaration, even though it binds only the field and
                            every checked role inherits
C0.assignment C0.token      a declaration that names no field, on a root whose
                            field it never recorded; it admits nothing
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
C13.edge · C13.edge ·       a bordered label with no reinforcement · reinforced at
C13.edge                    neither theme's dose · reinforced in another color
C13.padding · C13.border ·  1px block padding · a 2px border · pill corners
C13.corner
C13.box · C13.box ·         kept on one line by a local rule · drawn as an inline
C13.box · C13.box ·         flex box · stretched by its column (width auto) ·
C13.box · C13.box ·         squeezed by its table column (width auto) · shrinkable
C13.box                     in a flex row that does not wrap · sized by its content
                            box · given no maximum width
C13.fill                    a bordered label given a fill
C13.corner · C13.padding    a page that redefines --radius-sm as a pill · one that
                            shrinks --space-2: the check holds the owner's 8px, not
                            the page's token
C13.clearance               no inline margin, so a clipping box can cut its edge
C13.color · C13.color       a neutral label given a color · an emphasis chip whose
                            accent is not one of the three
C14.label · C14.label ·     a labeled range with no label · opened by an emphasis
C14.label · C14.label ·     chip · whose label is not its first child · whose label
C14.label · C14.label ·     is empty · hidden · at zero opacity · whose label's words
C14.label · C14.label ·     are at zero opacity · transparent, in a label with no
C14.nest                    text role · a range nested in a range
C14.host · C14.host ·       a labeled range inside a list item · inside a quotation ·
C14.host · C14.host ·       inside a panel · an item host in a nested list · an item
C14.host                    host outside a list (with C14.rail)
C14.box · C14.box ·         a labeled range insetting what it holds · drawn as a
C14.box · C14.box ·         passage rail on its own box (with C14.rail) · given a
C14.box · C14.box ·         wash · moved by a transparent border · by a position
C14.box                     offset · by a transform · drawn as display: contents
C14.rail · C14.rail ·       its scope rail at the content edge · capped with feet at
C14.rail · C14.rail ·       both ends · drawn 3px wide · on a dashed stroke · given
C14.rail · C14.rail ·       a shadow · cut by a clip path · moved by translate · by a
C14.rail · C14.rail ·       margin · around a range with a static position · under a
C14.rail · C14.rail ·       page that shrinks --space-3, where the check holds the
C14.rail · C14.rail ·       owner's 14px lane, not the page's token · made invisible ·
C14.rail · C14.rail         cut short · past a last block that keeps its margin · an
                            item host in a list indented 40px whose indentation is
                            unnamed, so its rail falls short of the lane
C14.clearance ·             a labeled range in a clipping box · in a paint-contained
C14.clearance ·             box · at the page edge · in a table's first column and
C14.clearance ·             in a table's only column, where a scrolling box without
C14.clearance ·             the range lane cuts its lane
C14.clearance
C14.buffer · C14.buffer ·   two labeled ranges in a row with no buffer between them ·
C14.buffer · C14.buffer     a wrapped list closing on an item host, then a list
                            opening on one · a range, then a wrapped list opening on
                            an item host · a list closing on an item host, then a
                            range; each with no buffer between them
C14.color                   a neutral labeled range given a color
C15.line · C15.line ·       a scope underline 1px thick · at a link's 0.22em offset ·
C15.line                    broken at descenders
C15.words · C15.words ·     a scope underline given a fill · recoloring its words ·
C15.words · C15.words       drawn as a block · drawn as display: contents
C15.color                   a neutral scope underline given a color
C15.attach · C15.attach     a scope underline made focusable · set inside a link
C16.rail · C16.rail ·       an ordered sequence whose rail is made invisible · drawn in
C16.rail · C16.rail ·       an accent · given a glow · drawn again in its background ·
C16.rail                    doubled by a second rail in its ::after
C16.gap · C16.gap           its steps at a group's --space-3 rhythm · spaced by a
                            margin of their own
C16.direction               a right-to-left sequence, which is not yet served
C16.hierarchy               a sequence that also composes .doc-hierarchy
C16.step · C16.step         a loose item in a sequence · a step outside a sequence
C16.reach · C16.reach       a sequence whose box ends before its last step · a last
                            step set too short for its body, which runs past the rail
C16.overflow                a step body held on one line past the column's edge
C16.clearance               a sequence whose box clips the node left of its rail
C16.label                   a step that does not open on its label
C16.center · C16.center ·   a step that moves its label down · a label set lower by
C16.center                  its own padding · a node off the rail
C16.center C16.segment      a step drawn with a rail of its own, which also moves its
                            node
C16.segment · C16.segment · a step drawing a rail segment over the sequence's rail ·
C16.segment · C16.segment   drawing one in its shadow · a line in its background ·
                            given an outline
C16.node                    a node removed
C16.fill · C16.fill ·       a node given a fill · given a glow · given a fill in a
C16.fill                    closed disclosure, which only the runner returns, once it
                            opens the disclosure (data-expect-open)
C16.color                   a node in an accent
C16.center C16.ring ·       a node drawn 9px wide, which also moves its center · moved
C16.center C16.ring ·       by a margin · drawn square · moved by a transform
C16.ring · C16.ring
C16.print · C16.print       under print media only (data-expect-print): a step a local
                            print rule lets break · one it keeps whole only in columns
                            (avoid-column), which does not hold on paper
C17.box · C17.box ·         a large marker drawn at the small size · a hollow marker
C17.box · C17.box ·         sized by its content box, its dashed edge outside its 30px ·
C17.box · C17.box           a marker a flex row may shrink · one holding a word · one
                            moved by a transform · a page that redefines
                            --surface-marker-size-lg, where the check holds the owner's
                            30px, not the page's property
C17.corner · C17.corner     a square marker drawn round · a dot drawn square
C17.fill · C17.fill ·       a filled marker made transparent · painted by a local rule
C17.fill · C17.fill ·       in a color that is not its own · given a dashed edge ·
C17.fill                    given a glow · faded to 30% opacity
C17.hollow · C17.hollow ·   a hollow marker filled · its edge drawn solid · its edge in
C17.hollow                  another color
C17.shape · C17.shape ·     a hollow square · a marker at two sizes · a marker with an
C17.shape                   unknown modifier; none is judged further
C12.rail C17.attach ·       a marker composed with an annotation item, which C12 also
C17.attach · C17.attach     reports for its fill · composed with a fill · made
                            focusable; none is judged further
C17.corner                  a marker in a closed disclosure drawn square, which only the
                            runner returns, once it opens the disclosure
                            (data-expect-open)
```

The page judges each case's **resting** codes itself and writes them to
`window.__roleFixture` and `body[data-result]`; the C9 link-state codes need a real
pointer and real Tab focus, so only the headless runner gives the full verdict. It merges
each case's resting codes with the link-state codes it observes in that case and requires
the union to equal the case's `data-expect` exactly, and the page's own resting verdict to
pass.

A case may name two more expectations. `data-expect-print` replaces `data-expect` when the
page is judged under print media. `data-expect-open` names codes only the runner returns,
once it has opened the case's disclosures and judged what they hold; the runner requires
its own findings for that case to equal them exactly.

**Run it** from the repo root, on screen and under print media:

```
python3 -m http.server 8080
# open http://localhost:8080/tests/role-conformance-fixture.html
node tools/check-role-conformance.mjs --fixture http://127.0.0.1:8080/tests/role-conformance-fixture.html
node tools/check-role-conformance.mjs --fixture http://127.0.0.1:8080/tests/role-conformance-fixture.html --media print
```

Both pass at the runner's default 1440×900 and at 375×812 (`--width 375 --height 812
--mobile`), in both themes.

**The document-register key**, [`surface-document.html`](../surface-document.html), takes the same check in two parts. Its
records-and-inspector section selects a record at load and hides the other records' views, as a
consuming surface may. A link in a hidden view renders no box, so its states can be proven only in
a run where its view is shown:

```
python3 -m http.server 8080
node tools/check-role-conformance.mjs --url http://127.0.0.1:8080/surface-document.html
node tools/check-role-conformance.mjs --url 'http://127.0.0.1:8080/surface-document.html#view-CFW-N-217' --scope '#view-CFW-N-217'
```

The first run checks the whole page at load and is expected to **fail** with exactly six
`C9.unrendered` findings per theme and no other finding: the relation links of the two hidden
views that hold any, four in `CFW-N-217` and two in `CFW-S-435`. It is kept because it is the
only run that covers the rest of the page; 14 of the page's 20 governed links are driven in it.
The second is run once per record — `CFW-C-008`, `CFW-N-217`, `CFW-S-435` and `CFW-S-014` — with
the address selecting that record and the scope narrowing the check to its view. Each run passes;
the `CFW-S-014` view holds no governed link, so its run checks roles only. Together the runs drive
every governed link, the six hidden ones included. The scope never stands in for the selection:
scoped to `#view-CFW-N-217` while another record is selected, the check still fails, with four
`C9.unrendered` per theme.

Limits: each run proves the selection the page loads with, after the runner has opened every
disclosure; none drives a selection change, the adapter's focus handling or the way back, which
are page-local. The key's five locator links stand in `code.doc-code` outside any text role, so
they are not governed links (C7) and no run drives them. Both parts give the same result at the
runner's default 1440×900 and at 375×812 (`--width 375 --height 812 --mobile`), in both themes,
on screen and under `--media print`. Revisit this account when the key gains another hidden population, when the whole-page run is
offered as evidence on its own, or when the checker changes.

## sequence-print-fixture.html

Guards **the ordered sequence on paper**: the register keeps each `.doc-sequence-step` whole in
print, and the sequence's one rail, the list's own border, runs to the foot of every sheet the
sequence continues past. Emulated print media lays a page out without pages, so this fixture makes
its own sheets: a multi-column container of fixed height, whose columns are fragmentainers as
printed sheets are, so the browser's own fragmentation applies the register's print rule. Each case
is nine steps of differing length across those sheets, judged by `tools/role-conformance.js` and
by the fixture's own continuation measure:

- **a sequence across sheets** must return no finding, and its continuation must hold: the
  sequence breaks at least once; it draws its rail as its own visible border; every fragment but
  the last reaches the foot of its sheet; every fragment but the first starts at the head of its
  sheet; the last ends with the last step; and every step a sheet can hold is one fragment.
- **a step allowed to break across sheets**, under a local print rule that sets
  `break-inside: auto`, must fail with exactly `C16.print C16.split`, its continuation still
  holding.
- **a rail drawn on each step instead of the list** must fail with exactly
  `C16.center C16.rail C16.segment`, and its continuation must break: the list draws no visible
  rail.

**Run it** under print media. Under screen media every case fails by design: the print rule is not
in effect there, and the conforming case's steps then break across sheets.

```
python3 -m http.server 8080
node tools/check-role-conformance.mjs --fixture http://127.0.0.1:8080/tests/sequence-print-fixture.html --media print
```

It passes at the runner's default 1440×900 and at 375×812 (`--width 375 --height 812 --mobile`),
in both themes.

Limits: the sheets are columns, not printed pages. The fixture proves what the browser's
fragmentation does with the register's rule; where a printed page breaks, with its margins and a
printer's own handling, is shown by printing, not checked here.

## review-semantics-fixture.html

The regression fixture for rule **C12** of `tools/role-conformance.js`, the Review Semantics annotation composition (`review-semantics.css`, [`review-semantics.md`](../review-semantics.md)), for rule **C13** where a review mark takes the shared bordered label, for rule **C14** where an annotation range takes the shared labeled range, a whole list item included, and for rule **C15** where a passage mark takes the shared scope underline, and for all three where a neutral label, range or underline is held in a closed disclosure. It is also the fixture for Spectral State's, Evidence State's and Criterion Assessment's keyed labels and the ranges they open, Criterion Assessment's assessment record and its bounded assessed range among them (`C13.key`, `C13.color`, `C14.record`, `C14.color`, `C12.attach`), since it loads all three modules, and for rule **C18**, the decision record, a panel or a declared node, which `review-semantics.css` binds and `surface-treatments.css` draws. It loads the foundation, the four register modules, `spectral-state.css`, `evidence-state.css`, `criterion-assessment.css` and `review-semantics.css` in the contract's order, and `../tools/role-conformance.js`. Every review mark carries `.surface-bordered-label`, and every passage mark `.surface-scope-underline`, except where a control omits it.

A conforming specimen must return no finding; it includes annotation ranges over one paragraph whose passage mark's note follows the range, over two paragraphs and over one beside them, over a quotation alone, over a callout, which keeps its own rail, over a list with the lead-in that introduces it, over a quotation with the sentence that reads it, over a synthesis panel, over a whole table, and over a heading that alone poses a question, two in one table cell of a second column, and two in a table's first column, whose box keeps the range lane; an annotation list naming its item; a decided judgment on exact words, its words under an Accepted passage mark that names the note quoting them; two whole list items in a row, each its own range, beside an item whose pending words keep their passage mark and note after the item's text, and an item whose paragraph ends on declined words, its note keeping its 12px attachment below them; and an explicit-target prompt standing just before a range over a table. Each range's row leads with its judgment, and no review row trails the block it judges. A pass reports no finding in what the checker reads, within the limits `tools/role-conformance.js` states. It does not establish that a range was opened wherever a judgment needed one, that a range holds the right blocks or that a passage mark underlines the right words: a review row left trailing a block or a list item's text passes, and so do a prompt stranded after its target, a prompt row that does not open on its review item, and a decided judgment's note that no passage mark names, so scope and placement stay with the author, a consumer's renderer tests and the reviewer. Two disclosure controls below keep a review row after a paragraph; they test disclosure behavior, not composition. After it come **260 controls**, each judged like the role-conformance fixture's: it must return exactly the reason codes it names, no more and no fewer. The runner reports 261 cases: these 260 controls and the conforming specimen.

- **209 negative controls**, one or more per C12 reason (`C12.role`, `.facet`, `.vocab`, `.label`, `.base`, `.attach`, `.geometry`, `.color`, `.nyt`, `.passage`, `.note`, `.rail`, `.range`, `.mixed`) and three for an element's hierarchy rail (`C3.hierarchy`), among them a not-yet-testable rail at width 0, an evidence marker not displayed, role tokens made transparent, and a not-yet-testable note drawn in its text color while its value is undefined. A passage mark fails with its own reasons and the shared line's: one naming No decision recorded (`C12.vocab`), one without `.surface-scope-underline` (`C12.base`), one whose line takes another role's value (`C12.color`), one drawn as a dotted line (`C15.line`), one that recolors its words and one given a tint (`C15.words`), and, in a closed disclosure, a neutral underline drawn dotted once open (`C15.line`, open only). A note in a list item at the old 4px attachment fails `C12.note`, after a paragraph and after the item's own text alike. A whole list item a review row leads without the range classes fails `C12.base`; an item host whose words come before its row fails `C12.range`; an item host in a list indented 40px that does not name its indentation fails `C14.rail`; and an item host holding a note of its own fails `C12.mixed`. The shared box fails with the bordered label's own reasons: a review mark without `.surface-bordered-label` (`C12.base`), an evidence and a state mark carrying it (`C12.attach`), a review mark on pill corners and one with three pill corners (`C13.corner`), one with a padding of its own (`C13.padding`), and a repainted outline, whose reinforcement keeps the role's color (`C12.color` and `C13.edge`). An annotation range fails with its own reasons: one without `.surface-labeled-range`, and a labeled range a review judgment opens without `.doc-annotation-range` (`C12.base`, the latter with `C14.label`); one opened by a paragraph and one whose row names no judgment (`C12.range`, each with `C14.label`); one whose row names two judgments, and one whose row opens on its basis rather than its judgment (`C12.range`); one holding a second judgment, or a nested range (`C12.mixed`, the latter with `C14.nest`); a scope rail in another role's color (`C12.color`); a range carrying `data-review`, and one that is itself a quotation (`C12.attach`, the latter with `C14.box`); a quotation inside a range repainted in the range's color (`C3.color`); a range inside a panel (`C14.host`); one in a table's first column without the range lane (`C14.clearance`); and a range in a closed disclosure drawn at the content edge once open (`C14.rail`, open only). A neutral labeled range in a closed disclosure fails `C14.label` when its label has no words, at rest, and when its label is hidden, once open. A keyed label fails `C13.key` when its words lack the axis (`Held`) or name another role (`State // Earned` on a held label), when it keys neutral, not yet testable or a role outside its axis's vocabulary, when it is not a bordered label or is an emphasis chip, when it names both axes, and when a state label also carries an evidence attribute; a range that such a label opens fails `C13.key` alone, unjudged for its color. A plain bordered label set to a state value, and one set to not yet testable's lavender-gray, fail `C13.color`, as does a keyed label repainted in another role; a keyed range repainted in another role, and a neutral range in lavender-gray, fail `C14.color`; a keyed role token made transparent fails both; and a keyed range in a closed disclosure repainted once open fails `C14.color`, open only. A keyed label in an annotation row, an annotation list's value or an annotation note fails `C12.attach`, and one that carries an annotation class fails it with `C12.rail` and `C13.box`. External, which Spectral State v2.0 retired, fails as retired, in words that say provenance is not a state: a keyed state label naming it and a range that label opens fail `C13.key`, and a state mark naming it `C12.vocab`. An assessment label fails `C13.key` when it stands alone in text, when it opens a range without its record, when it keys unassessed and when it carries a state attribute, and in an annotation row it fails `C12.attach` with `C13.key`. An assessment record fails `C14.record` when it lacks its basis (unscoped), names two criteria, holds a second assessment label or a state label, opens on a state label or on a bare `data-assessment` label, carries an assessment attribute of its own, stands outside a range, sits in a comparison table, or opens a range with no passage after it; and when a field sits deeper than the record, is named outside the four, lacks `.doc-meta`, has no words after its name or is not led by it. A field set outside any record fails `C14.record` too. A bounded assessed range nested in another fails `C14.nest`, one repainted in another role `C14.color`, an assessment label repainted in another role `C13.color`, and an assessment role token made transparent both. A decision record fails `C18.vocab` when it names no decision recorded or no role, and is judged no further; `C18.presentation` when it declares a presentation other than `node`, or is a node outside a diagram; `C18.words` when its words outside its fields state no outcome, name another, state it only inside a field, or hide it, with `C18.label` where it is a panel whose outcome label is then wrong or missing; `C18.fields` when it lacks its actor, names two objects, uses a field outside the vocabulary, or hides or empties a field, including a field whose only words sit in a child hidden by `display`, `visibility` or zero opacity, a field at zero opacity around its child's words, and a field that shows only punctuation around hidden words; `C18.inert` when it is a link, holds a button, takes focus, or sits inside a link, an attention-edge object, a checkbox or a select's option; and `C18.attach` when it sits inside an annotation range, an annotation note or another record, or carries a state attribute. A panel fails `C18.panel` when it lacks its perimeter, sits on the panel material, is raised, has its bloom removed, is washed or tinted in its role's value, has its edge take another value, sits on bare page ground, takes smaller corners, gains an added shadow, or is faded by its wrapper or blended into the page; with `C18.attach` when it is drawn as a content-emphasis panel; with `C18.label` and `C18.text` when it is a filled reading card not declared a node, or an SVG record not declared one. It fails `C18.label` when it has no outcome label, when its label follows its fields, is a review mark or an emphasis chip, lacks the label role (`.doc-label`), or names another outcome (with `C18.words`), and when its label's border takes another value (with `C13.edge`, since the label's reinforcement keeps the record's color); and `C18.text` when its words take its role's value or a fill's ink. A node on the neutral shape fails `C18.attach` and, since the neutral shape claims its edge, `C18.fill`; one drawn as a separate surface fails `C18.attach`; and one holding an outcome label fails `C18.attach` and, since that label heads no panel, `C13.color`. A node fails `C18.fill` alone when its fill or its edge takes another value, when it draws no filled shape, which leaves its words unjudged, when an SVG node holds two shapes or strokes its shape in another value, when it is at half opacity, and when its role token is made transparent; and `C18.ink` when its words take the theme foreground, a paragraph's foundation color or a text role's, when an SVG node's text lacks the ink, and when its ink token is made transparent or left undefined. The HTML nodes sit in an element whose role is img.
- **51 positive controls**, which must return no finding: harmless evidence metadata on document text, an Evidence State not-yet-testable presentation outside the composition, a state marker with 10% corners, a passage mark described by two ids, a passage mark naming a decided outcome, labeled marks in a closed disclosure, the same marks with their disclosure open, a mark in a closed disclosure's summary, a passage whose line is suppressed only while its disclosure is closed and the same passage open from the start, a neutral scope underline in a closed disclosure, which C15 judges once open, an item host in a list indented 40px that names its indentation, an item host holding a passage mark whose note follows the list, a note after a paragraph whose larger margin the attachment collapses into, a note in a list item that is itself a group and keeps the group's gap, a review row trailing a list item's text, which the checker does not judge, a composition restyled only while its disclosure is closed, a not-yet-testable note in a closed disclosure, rows without a mark in a closed disclosure, an emphasis chip and a neutral bordered label in a closed disclosure, which C13 judges once open, an annotation range in a closed disclosure, which C12 and C14 judge once open, a neutral labeled range in a closed disclosure, which C14 judges once open, an annotation range holding a passage mark whose note follows the range, since words judged otherwise keep their own, narrower record, every keyed state label and every keyed evidence label, contradicted among them, keyed state ranges and keyed evidence ranges in the flow, partial and every chromatic evidence role among them, a neutral `Source // External` label beside a state or beside none, every state mark and every chromatic evidence mark, contradicted among them, bounded assessed ranges in each assessment role and one in a closed disclosure, which C13 and C14 judge once open, a comparison table's assessed cells, whose table application this check leaves to its own fixture, a keyed item host, a keyed range in a table's first column with the range lane, a keyed label in a table cell and one in an annotation range's content, plain bordered labels and a neutral range whose labels carry a `data-state`, `data-evidence` or `data-assessment` attribute and no key, and a keyed range in a closed disclosure, which C13 and C14 judge once open. For the decision record: one panel per pending or decided role, a Correction requested panel, a decision node in SVG and one in an HTML diagram, a panel beside the link to its object, a panel in a closed disclosure, which C18 judges at rest and never holds, while its outcome label is held for C13, a decision board of panels, a node whose paragraph takes the ink, a record whose fields hold their words in shown children, a record whose actor shows its words beside hidden ones, and a `data-review` attribute on a separate surface that is no record, which binds no color.

**Disclosures.** Forty-seven controls sit in a disclosure. An element of the composition that a closed disclosure keeps from being seen is collapsed: a mark, a passage mark, a note, a row, an item, a list, or a list's key or value, with or without a mark among them; so is a bordered label, a labeled range or a scope underline held there. The resting check judges its syntax, vocabulary and relationships, requires that a mark and a neutral range's label have words (`C12.label`, `C14.label`), and reports the element collapsed. The runner judges what it presents once it has opened every disclosure in scope and judged the link states, and once the animations on the element, inside it and on its ancestors have finished; an element's hierarchy rail (`C3.hierarchy`) is judged there too. Such a control names the codes expected at rest in `data-expect`, those the runner returns in `data-expect-open` (absent means none), and how many elements the resting check must report collapsed in `data-collapsed`. The runner passes a case only when the page's resting verdict passes and its own codes for the case equal `data-expect-open` exactly. It compares reason codes, not the state a finding carries (`open`, `collapsed` or `removed`).

- Labeled marks in a closed disclosure pass, nested and in a table cell included, and so do rows without a mark and a not-yet-testable note on its rail.
- At rest, a collapsed mark with no words, one without the label role, one wearing the emphasis chip class, one carrying two facets, a review role outside the vocabulary and a passage mark with no note fail as they would outside a disclosure.
- Once opened, a mark fails when its words are hidden inside it, when it is drawn without its flex box or reduced to a gray dot, when it is repainted, whether always or only once open, when it renders no box once open, and when an animation hides it as its disclosure opens. A bordered label held there, a review mark or a neutral label, fails C13 once open when it loses its reinforcement.
- A composition restyled only once its disclosure opens fails there:
  - a passage mark whose line turns dotted (`C15.line`), its note that loses its hierarchy rail (`C3.hierarchy`) and the note's row that takes a rail (`C12.rail`), in one control, which fails the same way at rest when its disclosure is open from the start;
  - a not-yet-testable note that loses its rail (`C12.note`);
  - a row and a list without a mark that take a rail, and an item, a list key and a list value that take a wash (`C12.rail`);
  - a row on the hierarchy rail that loses it (`C3.hierarchy`).
- A composition restyled only while its disclosure is closed passes, since what it presents open conforms: a passage whose line is suppressed, and the same passage open from the start; and a composition whose passage mark, notes, rows, item, list, list key, list value and marks are each repainted or have their rails removed or added.
- An element fails, too, when its disclosure is closed again before it is judged, or when it is replaced as its disclosure opens: what it presents cannot be proven. Two controls hold a row and its mark, and two hold a passage mark, its note, a not-yet-testable note and their rows, items and marks, so each kind fails with its own reason.
- A mark in a closed disclosure's summary, or one the page shows although its disclosure is closed, is seen, so it is judged at rest; with its words hidden there, it fails.
- Outside any disclosure, a visible mark whose words are hidden fails at rest.
- A neutral labeled range in a closed disclosure passes, and so does a bounded assessed range, its record judged at rest and its label and rail once open. At rest, a neutral range whose label has no words fails `C14.label`; once opened, one whose label is hidden fails `C14.label`. A neutral scope underline in a closed disclosure passes, and one drawn dotted once open fails `C15.line`.

A `data-review`, `data-evidence` or `data-state` attribute alone opts nothing in, which the two compatibility controls hold.

```
python3 -m http.server 8080
node tools/check-role-conformance.mjs --fixture http://127.0.0.1:8080/tests/review-semantics-fixture.html
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
            shadow with the ring, as an adopting object with a shadow must. Two
            calls to action from surface-cta.css, a primary button and a ghost
            anchor, take the same edge: the primary's transparent rest border
            turns magenta, as the ghost's hairline does. Two text inputs from
            surface-input.css, at the standard density and at the compact density
            in the query role, take it on their --fg-3 border
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
remove .surface-attention-edge from a CTA's markup     that CTA, on focus, with the
                                                       browser's own ring
remove .surface-attention-edge from an input's markup  that input, on focus, with the
                                                       browser's own ring
add a page rule that sets the inputs' border color on  both inputs, on focus: each
focus above the shared rule's specificity              border keeps the page rule's
(.row input:focus-visible)                             color
set the primary CTA's transparent border at a          the primary CTA, on focus: its
specificity above the shared edge rule                 border stays transparent
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
[`diagram-interactive-radial`](../patterns/diagram-interactive-radial/README.md) surface pattern, on the owner files themselves. It loads the
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
M  the semantic resolver: Spectral State's paint, token and row strings for every role, read as
   literals, never from the owner; an explicit { system: 'spectral-state' } giving the model and
   layout of no declaration, every field compared, Maps and Sets by their entries in order, on the
   specimen and the ragged shapes under both allocations; Criterion Assessment's resolver on the
   visitor-facilities composition
C  Criterion Assessment's contract: every SEMANTIC_SYSTEM, SEMANTIC_DECLARATION, UNKNOWN_FIELD,
   NODE_ASSIGNMENT and ASSIGNMENT_SCOPE refusal, each with its whole message; each role accepted on
   a leaf; the visitor-facilities composition accepted with its counts (220 leaves: 26 favorable,
   103 caution, 70 adverse, 21 unassessed) and laid out at the parks specimen's geometry,
   identifier for identifier, under both allocations; C8 SYSTEMS, ASSESSMENT_ROLES and
   DECLARATIONS frozen, each refusing a host script's push, and a system name pushed onto SYSTEMS
   still SEMANTIC_SYSTEM
X  negative controls: the invariant checks and the geometry comparison each fail for their
   reason; X4 rejects Spectral State's retired external role, declared or on a node or a record,
   with a message that names it retired, and accepts each of the seven remaining roles; X6 runs
   the I checks on mutated copies of the labels module, each of which must fail the check written
   for it: three restore defect classes of the earlier bookkeeping (plain-object grouping, pairs
   joined with '|', directed pairs joined with '>'), two are plausible regressions (a directed pair
   stored undirected, the short-canvas rule comparing counts); X7 runs the M and C checks on mutated
   copies of the contract module (a leaf without an assessment accepted, an assessment on a
   container or a record accepted, states admitted beside Criterion, an empty declaration
   accepted, an unknown system read as Spectral State, the unassessed wash painted from a --state-
   token, an absent role painted as no token, an explicit declaration reordering the states, the
   system names left open to a host script), each
   failing the check written for it, and shows the geometry and model comparisons detect a moved
   leaf, a 1e-9 displacement, a reordered state, a changed label and a hidden container
```

**The retired role's control is the contract before Spectral State v2.0.** Run against that
contract, the three retired-external checks of X4 fail for their stated reason: the declared role
is accepted, and a node or a record naming it fails only as an undeclared state, with no word of
its retirement. The seven-role check passes there too, as it should.

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

## peer-contract.test.mjs

Guards the **relation contract, rendering and export** of the [`diagram-static-peer`](../patterns/diagram-static-peer/README.md) pattern, on
the owner files themselves. It loads the engine, the glyph carrier and the specimen's relation
sources into one global exactly as a page does, and runs the exporter as a consumer would.
Scripted, not by eye:

```
node tests/peer-contract.test.mjs
```

```text
P  every specimen spec validates, and its derived structure is the one the page describes:
   each triangle node one outgoing and one incoming relation, threefold; each neutral-opposites
   node one of each and one neutral, fourfold; the all-directed square uneven, with no
   symmetry. Every shipped perimeter cycle steps one slot clockwise, the order the labels read,
   and is listed in that order (P6), and R-S-P keeps rock, paper, scissors' own winners (P7):
   a reversed cycle keeps every degree count and symmetry order, so P2 and P3 cannot see it.
   The assessment example keeps the A-S-K game's relations and derived structure, L-E-J is three
   neutral interfaces, threefold (P8), and the six neutral specs carry no semantic field (P9)
V  every malformed spec or render option checked is its named error, and validate() never
   throws, even on a spec whose fields cannot be read (V9). V1 and V2 guard exact membership:
   a relation type or an endpoint that names a property every object inherits (constructor,
   toString, __proto__, hasOwnProperty, valueOf) is unknown, never one that exists; V3 shows
   such names work as node ids. V7 reads every array index, so a hole is a missing entry. V8
   keeps a character XML forbids out of a title, the metadata and the font CSS, markup and CSS
   punctuation out of a theme value, and a label weight the carrier did not measure out of a
   standalone file. V10 and V11 refuse a glyph carrier whose letter offsets or measured weight
   are not finite numbers or are missing, or whose advances are missing, negative or not
   finite numbers, as GLYPHS_MALFORMED to validate() and to render(), with the page's theme
   and a resolved one
C  completeness: an omitted pair is PAIR_UNDECLARED and renders nothing; an 'unspecified'
   pair validates, is null in the matrix, draws nothing and is never reported as neutral
R  relabeling and renaming node ids move nothing; rendering is deterministic; every element
   id and id reference belongs to the plate's prefix, every style rule is scoped to it, and
   default prefixes never collide (R15); a plate carries exactly three ids, the plate, its
   title and its field (R16), and mount takes a prefix none of whose three ids the page
   already carries, beside a plate rendered with a prefix of its own such as peer_1_field
   (R17); the key lists drawn types only; arrowheads default to
   the target; a page plate takes only the foundation roles and a standalone one only resolved
   values
F  both font carriers match the canonical fonts/InterVariable.woff2, the embedded subset is
   the recorded one, and the license text travels. The exporter resolves the canonical tokens,
   and fails, rather than guess or hang, on a token file without --fg-1, with no dark rule,
   truncated, or with an unclosed comment (F6, F11). It refuses, before writing anything, an
   invalid spec or a repeated spec id (F12) and two spec ids that differ only in letter case,
   naming both and their files, while ids that differ in more than letter case keep their own
   names, case and all (F14); it runs through a symlinked path (F13), writes the same bytes
   twice, and gives every exported file ids no other file shares (F10)
E  the specimen's game reading, which is example content and not the contract: V weakly
   dominates L in the all-directed square, (0, 1/3, 1/3, 1/3) is an equilibrium there, and
   every (a, 1/2 - a, a, 1/2 - a) is one in the neutral-opposites square, in exact fractions.
   The assessment example's figures follow from its relations against A 1/2, S 1/4, K 1/4 (A 0,
   S -1/4, K +1/4), each rating from its declared rule, and its basis declares that mixture (E7)
S  declared semantic examples: every malformed declaration, assignment and line is its named
   error, an inherited name included, and a semantic declaration the spec only inherits reads
   as neutral to validate and to render alike (S1); an example draws the neutral plate's connectors,
   heads, key, rings and letters exactly (S2); on a page a colored node takes its system's role
   and ink tokens and no other, and in a file its resolved roles with no var() (S3, S4); a
   neutral plate draws no assignment, fill rule, note or band, and its theme takes no roles of its
   own (S4);
   an example is keyed by default and refuses an art plate, and a resolved theme without its
   system's roles, with the other system's, or with a malformed or quoted value, is refused
   (S5, S6); notes show the figure then the word, or the function's
   name (S7); an unassessed node keeps the neutral ring and its figure as plain text, and a node
   of no function shows nothing (S8); every note and band line sits in its slot, inside the
   plate and clear of every ring, at the most lines a source may give and on a square; every
   letter beside any function's name fits the band's label column; the plate grows by its band
   alone, and the band's last drawn baseline sits its foot above the plate's (S9); the
   description, determinism, ids and scoping hold (S10); the exporter resolves each role through
   the systems' stylesheets to its approved value, light and dark, each fill its physical color and
   each ink the exact approved recipe (ASK, 2026-11-25), written in the test and never read from the
   owner, and fails rather than guess without them; Criterion Assessment resolves through the fill
   paint and its own stylesheet, reading no Spectral State declaration, and the same without
   spectral-state.css (S11); it writes each example keyed only, recording the sha256 of each
   stylesheet its roles resolved through and no other, a Criterion Assessment file naming no
   spectral-state.css; each file it writes carries every role's approved fill on its ring and
   boundary and the exact approved ink recipe, spaces and all, on its letter, light and dark; and a
   malformed stylesheet writes nothing and is named (S12); with no --semantic-css it reads each system's stylesheets from the
   mirrors beside it and draws what the owner's run draws (S13); a spec that only inherits a
   declaration exports the neutral plate's four files byte for byte: alone it opens no
   stylesheet, an absent --semantic-css never being read, and the same files come out with the
   systems' stylesheets given and beside a declared example in one run (S14); on an example a
   null role or a quoted fill is OPTION_THEME whether the theme owns its roles or inherits them,
   a valid mapping the theme only inherits is not its roles, a neutral plate ignores inherited
   roles, and each role value is drawn as it was checked, read once (S15)
X  negative controls on mutated copies of the engine, the exporter and the relation sources: a
   membership test by property lookup (X1) and a plain-object id map (X2) let inherited names
   through, a removed completeness check lets an omitted pair through (X3), a moved vertex
   changes the geometry (X4), a different font hash fails the drift check (X5), unscoped style
   rules are detected (X6), an engine that skips holes validates a missing node (X7), one
   without the XML check validates a control character (X8), a mount that checks only the plate
   and title ids repeats the field id (X9), a carrier check of shape alone validates a NaN
   offset and draws it (X10), an exporter without the letter-case check exits 0 on two spec ids
   that differ only in letter case, reporting eight files whose names are four when case is
   ignored (X11), every regular spec reversed keeps the counts and symmetry P2 and P3 check but
   fails P6 (X12), R-P-S left in its former places with its arrows turned clockwise passes P6
   but fails P7, since rock would then beat paper (X13), and R, S and P in place with the
   game's winners reversed keep P7's node order but fail its winners (X14). Semantic controls:
   an engine without the keyed-only guard accepts an art plate of an example (X21), one without
   the band width check validates a line wider than the band (X22), one that sets each letter in
   its fill rather than its ink fails the paint check (X23), one that writes every assignment
   beside its node draws "unassessed" as a rating (X24), S rated caution against its -1/4 fails
   E7 (X25), an engine that sets each note from its vertex draws notes inside the rings (X26),
   a band drawn without its row gaps ends off its foot (X27), an exporter that reads a spec's
   semantic through its prototype, either to find the run's systems or to choose each spec's
   files, fails a neutral plate and writes nothing (X28), and an engine that draws from the theme's roles rather than the ones it checked
   throws a raw error on an inherited null role and writes an inherited quote into its rules (X29).
   Approved-value controls: caution bound through Spectral State's structural again, as it was
   before structural moved to violet, resolves to the violet and its ink, which S11's approved
   values reject, and reads spectral-state.css (X30); a dark Three Functions file whose legislative
   letter takes the retired high-contrast ink, #201D26, fails S12's approved values on that letter
   alone (X31)
```

**Determinism is within one runtime.** The engine rounds every coordinate to two decimals, so the
last-bit differences `Math.cos` and `Math.sin` may show between engines rarely reach the output,
but a byte comparison across runtimes is not claimed. The test renders no PNG and opens no
browser: the PNG route and the rendering in Chrome are checked outside it. The plate under a host's
inherited styles is checked in Chrome by peer-host-inheritance.mjs.

## peer-host-inheritance.mjs

Guards the [`diagram-static-peer`](../patterns/diagram-static-peer/README.md) plate **under a host's
inherited styles**, in headless Chrome (Node 22+, Chrome at `$CHROME` or the default locations; no
npm dependency). It exports every spec as a consumer would, with the heads at the target and at the
midpoint (56 files: a declared semantic example keyed only, its roles resolved from the systems'
stylesheets), opens the specimen page, gives it the owner's token file and the systems' stylesheets
(the page links them at the vendored `_dsa-tokens/` and `_dsa-surface/` paths, which this repository
does not carry), and inlines each
exported SVG, unchanged, into a control host and into hosts that each carry ordinary inherited
styles. After the fonts load it reads every text's first-character position, length, box, computed
style and the platform font that drew it.

```
node tests/peer-host-inheritance.mjs             # --out DIR keeps results.json and the review PNGs
```

```text
I1  in the control host every exported plate draws its texts where its layout placed them: each
    letter and a semantic example's note centered on its x, each key wording and band line
    starting at its x, all on the baseline at y; no text leaves the plate; and every face it
    needs has loaded
I2  the control draws every letter and key wording with an upright Inter face
I3  with every host declaration applied (each parsed into the host's style), under each host —
    text-anchor middle and end; dominant-baseline middle and hanging; italic; bold; condensed;
    small caps; font-size-adjust; letter and word spacing and case; kerning, features,
    variations, synthesis and optical sizing; direction rtl; vertical writing; white space; text
    rendering; stroke and shadow; kerning and optical sizing turned off, the peer's own host; and
    all of them at once — every exported plate's texts start, measure and box as in the control,
    keep their faces and stay inside the plate, and text, heads and the field take no stroke, and
    text no shadow
I4  a keyed spec mounted through the page's engine, with the page's theme, under all the host
    styles at once measures and faces as in the control host
I5  a key wording with edge and doubled spaces, rendered now, draws as the former rules draw it:
    its white space collapses, as an SVG text's does on its own
I6  each declared semantic example, mounted through the page's engine with the page's light
    theme, draws each colored ring and its boundary in its role's value and its letter in the
    role's ink, as the page's tokens resolve them, each the approved color written in the test,
    and under all the host styles at once except text rendering, which the plate leaves to the
    page, its texts start, measure, box and face as in the control host
I7  under an inherited text-rendering: optimizeSpeed, each mounted example's texts keep their
    faces and stay inside the plate
I8  each exported semantic example, at the target and at the midpoint, light and dark, inlined
    unchanged in the control host, draws each colored ring and its boundary in its role's
    approved fill and its letter in the approved ink on it, as the browser resolves the file's
    own values: the approved inks (ASK, 2026-11-25) and the physical fills are written in the test
    as the 8-bit colors Chrome resolves them to, never read from the owner
N   negative controls on a plate whose rules declare only what the plate declared before it
    stated its text properties (its text rules with only family, weight, size, the letters'
    middle anchoring and optical sizing; no stroke rule on heads or the field), rebuilt from the
    plate. N0 fails unless all four rules are found. The rebuilt plate is unchanged and
    identically painted in an ordinary host (N1); an inherited text-anchor: end moves the key's
    wording (N2); an inherited dominant-baseline: hanging moves the letters (N3); an inherited
    italic draws the texts in an italic style (N4); an inherited stroke strokes the texts, the
    heads and the field (N5). With the page's criterion-assessment.css switched off, the
    favorable ring is no longer the approved green (N6). The former stylesheet sentinel, three
    values in one string tested as /^200 \S+ \S+$/, rejects the approved ink, an HSL recipe with
    spaces in it, while the structured fields accept it (N7); on a fresh page a stylesheet that
    does not load is named, and with criterion-assessment.css left out the favorable ink alone
    fails (N8). The dark Three Functions file with its legislative letter in the retired
    high-contrast ink, #201D26, fails I8 on that letter alone (N9)
```

**The owner's stylesheets are checked as they load.** Before anything is mounted the page loads the
token file and the systems' stylesheets, and the harness stops unless each loaded and three
sentinels, read as separate fields, are their expected values: the foundation's extra-light weight,
200; Criterion Assessment's favorable ink through the fill paint, the approved ink on green; and
Three Functions' judicial fill, the foundation cyan. Each color is checked as the color the page
resolves, never by its spelling, so an ink written as an HSL recipe with spaces passes, and a
stylesheet that is missing or left out still stops the run.

**The guarantee is about inheritance, and only the properties the rules state.** A stylesheet rule
written against the plate's own elements, or one marked `!important`, is not part of it. Neither is
text rendering, which the rules leave to the page (the foundation sets it on its pages on purpose),
nor the stroke styles the plate does not set, such as dashes on its solid connectors and rings,
joins and miters, nor paint opacity.

**Not every host fails the plate's former rules.** They already pass the bold, condensed,
white-space and rendering hosts. They declared the weight. The embedded face has one width. In
Chrome an SVG text computes `white-space: nowrap` on its own, and the host's `pre-wrap` did not
change it; the rule now states that value. Text rendering moves nothing the test measures in the
exported files; mounted on the page with the page's own Inter, an inherited `optimizeSpeed` turns
kerning off and lengthens one band line of the Three Functions example by about one unit, which is
why I6 leaves that one declaration to I7. The
declarations for width and white space state the layout's assumptions; they do not repair an
observed failure. The kerning-and-optical-sizing host is the peer's own: its key wording is kerned
and optically sized as it renders alone, and the former rules let a host turn both off.

## network-contract.test.mjs

Guards the **network contract, rendering, layout and export** of the [`diagram-static-network`](../patterns/diagram-static-network/README.md)
pattern, on the owner files themselves. It loads the engine, the glyph carrier, the font carrier and the
specimen's network sources into one global exactly as a page does, and runs the exporter as a consumer would.
Scripted, not by eye:

```
node tests/network-contract.test.mjs
```

```text
P  every specimen validates; the reference is the source-read topology (layers 3-4-3-2 and the
   23 connections of Fig. 1c-d, by name), its marks i, j, k, l sit on the marked units and each
   weight labels a declared connection; the second specimen differs in layer count, populations
   and connections, carries its own generic annotation and no credit; the glyph carrier records
   ink outside the advance (the italic j left of its origin, the italic f past its advance)
V  every malformed spec, notation, carrier or option checked is its named error, and validate()
   never throws: misplaced, repeated or unknown connections, a weight on an undeclared one,
   unsupported and look-alike characters, misspelled fields, bad marks and directions, an
   unreadable spec, a missing carrier (GLYPHS_MISSING, also beside a spec-level error), ink bounds
   that are not four numbers and a missing summation sign, a repeated equation layer, a wide label
   a connector runs through on a dense network, equation lines that would overprint, a hole in the
   weights, panels, equations or a notation line, an empty notation run; theme values by form (a
   double-quoted family accepted; markup, CSS punctuation, an ampersand, a comment opener, an
   unbalanced quote or a url() refused); font-face CSS written escaped; a credited one-panel plate
   narrower than its credit validates, its plate grown to hold it
R  rendering is deterministic; the art view keeps the annotated view's rings, connectors, heads,
   plate size and drawn credit, and draws no other text and no dot; the annotated view draws the
   notes, the four marks in each panel and a dot per weight per panel; a spec with no credit draws
   none; six ids, all the plate's own; italic runs set cv05; the description names every panel,
   reads the annotation and the notes in the annotated view, and carries the credit in every view;
   the page's selector reads only its own buttons; the second specimen's annotation draws, and its
   descriptions differ by view; no opacity anywhere and no rule of their own for the notes and
   the credit; no kerning or ligatures, and the rules declaring each property the text's layout and
   ink depend on (R14 reads the declarations; network-host-inheritance.mjs shows what they do); the
   plate named by its title alone and described by its description; re-mounting into a host keeps
   its prefix
L  read back from five rendered plates — the reference, the second specimen, a one-panel credited
   probe, a nested-fraction probe and an italic-overhang probe — with geometry written in the
   test, independent of the engine's (closest points between segments, Liang-Barsky clipping, a
   winding-number polygon test), and ink boxes built from the carrier's [xMin, yMin, xMax, yMax]:
   every drawn text but the marks keeps 3 units from every connector, head and ring of its panel,
   and every weight label also from every dot (L1); everything drawn lies inside the plate (L2);
   the parser read every text and annotation group drawn (L3); every annotation keeps 3 units from
   every other (L4); the notes and the credit keep 3 units from the graph (L5); every dot lies on
   a drawn connector and keeps 3 units from every other connector and every head (L6); no
   notation text comes within 1.5 units of a fraction rule of its own (L7); every annotation's
   drawn ink lies inside the box the engine validated for it (L8)
F  both carriers record the canonical fonts' sha256; the italic subset's own WOFF2 — its table
   directory, Brotli stream, character map, glyph names and advances, decoded here — sends l to
   the tailed glyph, whose advance is the glyph carrier's; the font carrier declares three faces
   under private, hash-named families, keeps no layout feature, and carries both license texts
   byte-equal to fonts/*-OFL.txt; the exporter resolves the canonical tokens, writes eight files
   and the same bytes twice; the credited specimen's files draw the credit and the other's do not;
   every file embeds the three subsets, names the private families first, carries both license
   texts in full and no var(); each theme's field and ink are written; no id is shared between
   files; an invalid source writes nothing
X  negative controls on mutated copies of the engine, the page or a font, each run against the
   check it guards: a fully connected network fails P2 (X1); keeping the first candidate is
   refused by the engine's guard (X2) and, with the guard off, found by the read-back (X3); the
   former sampled clearance accepts the wide dense label and the read-back finds the connector
   through it (X4); a plate sized to its networks alone is LAYOUT_BOUNDS (X5) and, with that
   guard off, the read-back finds the credit outside (X6); without the pairwise guard the
   overprinting lines validate (X7); dropping the art view's credit fails R3 (X8); dropping cv05
   fails R9 (X9); the canonical italic font fails F3 (X10); the former bare page selector fails
   R11 (X11); the former fixed fraction offsets put the nested probe's operands into their bars
   (X12, L7); a box built from advances does not hold the overhang probe's ink (X13, L8); without
   the dot's own clearance the dot lands on another connector (X14, L6); a credit drawn on a note
   fails L4 (X15); a text the parser cannot read fails L3 (X16)
```

**Determinism is within one runtime.** The engine rounds every coordinate to two decimals; a byte
comparison across runtimes is not claimed. The test renders no PNG and opens no browser: the PNG
route, the tailed l in a standalone PNG and the rendering in Chrome are checked outside it. The plate
under a host's inherited styles is checked in Chrome by network-host-inheritance.mjs.

## network-host-inheritance.mjs

Guards the [`diagram-static-network`](../patterns/diagram-static-network/README.md) plate **under a
host's inherited styles**, in headless Chrome (Node 22+, Chrome at `$CHROME` or the default locations;
no npm dependency). It exports every spec as a consumer would, opens the specimen page and inlines
each exported SVG, unchanged, into a control host and into hosts that each carry ordinary inherited
styles. After the fonts load it reads every text's first-character position, length, box, computed
style and the platform font that drew it.

```
node tests/network-host-inheritance.mjs             # --out DIR keeps results.json and the review PNGs
```

```text
I1  in the control host every exported plate draws what its layout measured: each text starts at
    its x and y; its length is the glyph carrier's advances, within 0.0001 of the size per character
    for the carrier's rounding and 0.02 units for Chrome's 1/64-unit length grid; no text leaves the
    plate; and every private face it uses has loaded
I2  the control draws roman and sigma runs with the roman face and italic runs with the italic face
I3  with every host declaration applied (each parsed into the host's style), under each host —
    text-anchor middle and end; dominant-baseline middle and hanging; italic; bold; condensed;
    small caps; font-size-adjust; letter and word spacing and case; kerning, features, variations,
    synthesis and optical sizing; direction rtl; vertical writing; white space; text rendering;
    stroke and shadow; and all of them at once — every exported plate's texts start, measure and
    box as in the control, keep their faces and stay inside the plate, and text, heads, dots and
    the field's rectangle take no stroke, and text no shadow
I4  the reference spec mounted through the page's engine, with the page's theme, under all the
    host styles at once measures and faces as in the control host
N   negative controls on a plate whose rules declare only what the first version declared (its
    text rule without anchoring, baseline, direction, writing mode, white space, face, ink and
    rendering; no stroke rule on heads, dots or the field's rectangle), rebuilt from the plate. N0
    fails unless all three rules are found. The rebuilt plate is unchanged and identically painted
    in an ordinary host (N1); an inherited text-anchor: middle moves its texts and draws some
    outside the plate (N2); an inherited dominant-baseline: middle moves them vertically (N3); an
    inherited italic draws roman text with the italic face and changes its length (N4); an
    inherited stroke strokes text, heads, dots and the field's rectangle (N5)
```

**The guarantee is about inheritance, and only the properties above.** A stylesheet rule written
against the plate's own elements, or one marked `!important`, is not part of it. Neither are the
connectors', rings' and rules' stroke styles beyond color and width, such as dashes, caps and joins,
or paint opacity.

**Not every host fails the first version.** Its plates already pass the bold, condensed, small-caps,
spacing-and-case, features, white-space and rendering hosts. It declared the weight, features,
synthesis, spacing and case. In Chrome these plates' faces have one width, and no text without
`xml:space="preserve"` holds an edge space or a run of spaces, so collapsing white space changes
nothing. The declarations for width, variants, white space and rendering state the layout's
assumptions; they do not repair an observed failure.

## radial-fixture.html + radial-behavior.mjs

The **browser behavior harness** of [`diagram-interactive-radial`](../patterns/diagram-interactive-radial/README.md). `radial-behavior.mjs` serves
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
   a reader moved it elsewhere; none on destroy); a press on a chooser button keeping focus, so
   a real click and a real tap choose, and "zoom in here" zooms, where a pressed button takes no
   focus, as in WebKit, which the harness emulates (X8 and X9 its controls); Tab out of it; a
   long list scrolled by touch
T  touch: tap, pan, pinch
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
   passing through another control, refits carrying their cause; C20 opens all three shells;
   C27 to C30 the visitor-facilities shell's keyed legend: offered, and opened by a real press, at
   1024x768, 390x844, 393x666, 844x390 and 568x320, its three words and five declarations each
   scrolled whole into the panel and the canvas and drawn on top; withdrawn with every other
   trigger at 520x190 and 320x170, with and without a selection; kept open and readable over the
   inspector's pill where the panels' own room falls below 72px (568x320 proves the trap fires);
   no uncaught error. X10, a chrome copy with the keyed branch removed, fails C29. C31 the same
   legend over the pill at 568x320, the camera away from the Fit, set aside at 520x190 and
   restored, the pill still leaving the panels less than 72px: it reopens on that first settled
   measure with the room it first opened with, every row readable; X11, a chrome copy that does
   not set the budget again once it is restored, fails C31 with a box under 72px. C32 the shell's
   legend slot closed to every reader: by a wrapper carrying hidden (until-found too), inert or
   aria-hidden="true", or a closed <dialog> or a popover not showing around it; by its own hidden
   with no module to disclose it (the chrome listed without a legend panel included); by its own
   inert or aria-hidden="true": each mount refused KEY_REQUIRED, naming what closes it, the host
   left as it was. C33 folded at the mount but open to the reader: the chrome's compact
   disclosure and the slot's own hidden the chrome discloses, each opened by a real press and
   readable row by row; a closed <details>, unseen until opened, then its three words and five
   declarations shown; the canvas, which holds the stage, hidden with the key, mounted and shown
   with it; an open <dialog>. X12, an engine copy without the open-key check, fails C32 with every
   closed legend mounted; X13, a check that walks past the element holding the map, fails C33 at
   the hidden canvas
```

M6 checks that `DIAGRAM_RADIAL.VERSION` is 2.

The first line of its output names the runtimes: Node and V8, and the browser and its V8.

With `--json` it also records the chrome's narrowing sequence and the phone's turn (arrangement,
open panel and Fit scale per CSS viewport). Per shape it also **measures, without judging**: the Fit's scale and clearance, the names it
defers, the pairs of marks whose shapes overlap, how the click resolution resolves at each mark's
center (directly, or through the chooser), the sampled centers that page chrome covers, and the
keyboard reach. Accepting the contract's input limits
says nothing about legibility; these numbers are what the overview actually shows.

## spine-fixture.html + spine-error-fixture.html + spine-behavior.mjs

The **browser behavior harness** of [`diagram-interactive-spine`](../patterns/diagram-interactive-spine/README.md). `spine-behavior.mjs` serves this
repository read-only on 127.0.0.1, opens `spine-fixture.html` (the canonical shell's canvas structure
and stylesheets, loading the owner files by reference in the shell's order, without the exporter;
no consumer code and no stub) in headless Chrome, and drives it with real mouse, wheel and touch
input over the DevTools Protocol. The composition group (C) opens the canonical shell itself, exporter
and font carrier included, through the consumer mirrors `_dsa-tokens/` and `_dsa-surface/`, which the
server maps onto this repository's root. The camera
is read from `#vp`'s transform, the selection from `.node.sel` and the inspector, the gesture
controller's listeners by the browser's own count. `spine-error-fixture.html` serves the fail-closed
checks: it leaves out the one support file `?omit=pointer` or `?omit=fit` names, or, with
`?retired=node` or `?retired=legend`, gives the specimen the retired external state on its node
`x-1` or in a legend row, as a source written before Spectral State v2.0 would. No npm dependency;
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
C  composition, the complete shell (exporter and font carrier included). C1-C5 at 1280x1400,
   1440x900, 390x844, 390x664, 844x390, 768x1024 and 960x1050, light and dark: with the exporter's
   buttons in the HUD, the settled first view, an explicit Fit and a second Fit are one view; no
   panel or control lies on another or leaves the canvas, and nothing covers a control; the drawing
   runs under no chrome; the Fit is the largest clear overview the harness's reference arrangements
   find through diagrams-fit.js, and keeps at least 80% of the scale the canvas could give the
   drawing with only the HUD reserved, a bound that knows no arrangement. C6-C11 and C7b, compact at
   390x844, 390x664 and 844x390 in light and 390x844 in dark: About, Legend and Inspector are
   offered and start closed; each opens its panel alone, inside the canvas and clear of the band,
   scrolling where its content is taller than its room, and the camera agrees with how the engine
   reports the panel entered the Fit (reserved: moved clear at the same scale; overlay: unmoved);
   Escape closes it onto its trigger; a tap on a node opens its inspector with the node in view
   above the sheet, scrolling a record taller than the sheet; Legend and Inspector trade places
   without losing the selection; after a reader's pan, opening and closing a panel moves nothing.
   C12, wide at 1440x900, 1280x720 and 1280x600: the tallest record fills the inspector in its
   corner, clear of the legend, caption and HUD and of the drawing, scrolling and in the tab order
   where it is taller than its room. C13: a window resized through 390x844, 844x390, 768x1024 and
   back, after a reader's pan, and across the arrangement change with a panel open, arrives where a
   fresh load does. C16: a camera the reader zoomed stays put through a webfont load, a HUD that
   grows and shrinks and the page load. C14-C15, light and dark: PNG page from the compact
   arrangement carries every legend row (one more of each label than the drawing alone) and the
   caption and no trigger word, and equals the wide arrangement's; PNG diagram carries no title,
   caption, legend title or trigger word and does not depend on the arrangement; both run to their
   download without an alert
E  error paths: without diagrams-pointer.js, or without diagrams-fit.js, the engine throws its
   named error and draws nothing. E3-E4: a node, or a legend row, naming Spectral State's retired
   external state is refused the same way, the node by its identifier. E5 is their control: the
   unplanted specimen renders through the same fixture, names external in no legend row or node,
   and keeps x-1 in group external, asserting no state, with Source // External as its qualifier
```

**Its control is the spine before it consumed the shared pointer.** Run against that tree, M3
(node drag), M4 (tap slop), M7 (horizontal scroll), T0-T6 (touch; T6 because no tap selected
anything to clear), L1 (listener count), L4 (a render during a drag) and E1 (the pointer guard) fail
for their stated reason. The mouse click, drag, wheel step, floor, hover and Fit checks pass
unchanged, and so do E2 (the fit guard predates the pointer) and L2 and L3 (a stale handler acts on
its own detached view). **E3 and E4's control is the engine before Spectral State v2.0**, which
had no retired-state guard: there both render the planted source, so the drawing is not empty and
no named error is recorded.
**The composition group's control is the spine with the shared pointer but before its responsive
chrome** (the pointer integration alone, with this harness). There C1 fails at every view: the
exporter's buttons arrive after the first Fit, and an explicit Fit then lands elsewhere — smaller on
the desktops, where the HUD's left lane grows, and moved on the phones and in short landscape. C2
fails at both phone heights, in short landscape, at 768x1024 and at 960x1050 (the caption, legend and
HUD overlap, the caption buries the PNG buttons, and the inspector runs over the legend). C4 fails at
the desktops and the tablet, whose Fit falls far below the bound, and at the phones, where no
reference arrangement clears among the overlapping panels. C6-C10 and C7b fail for want of the
triggers; C12 at 1280x600, where the inspector runs over the legend; C13 because a resize lands off
the fresh-load view, overlapping; and C16 because its Fit does not return to the first view (C1's
defect: the reader's camera itself stays put there). C3, C14, and C12 at the two taller views, fail
there only for want of report(), an arrangement to name or the inspector's tab stop; that engine's
drawing ran under no chrome at these views and its exports were already arrangement-independent.
Headless touch emulation is **not** iPhone or Safari evidence; the pattern's device gate is separate.

## radial-stack-fixture.html + radial-stack.mjs

The **full-stack harness** of [`diagram-interactive-radial`](../patterns/diagram-interactive-radial/README.md): every optional module (inspector,
facets, legend, chrome, export, theme) on the synthetic composition, in two hosts, once on the
reference specimen, which the fixture loads only when a check asks for it, and on the
visitor-facilities composition under Criterion Assessment. Keys that peel layers
arrive as trusted DevTools input; the other checks drive the modules' own controls in the page.
Each check is an in-page function, and group X runs some of them again against a planted fault in
a copy of a module, each of which must fail the check written for it.

```
node tests/radial-stack.mjs              # add --json for the measurements
```

```text
U  the inspector: views, the default kind line and an adapter's own kept as given (its
   punctuation, and an empty one drawing none), preview, references and the way back, Escape,
   show-all, relation direction and flags, locators, text never markup, malformed sections,
   a record arrival, a record's origin (one opened with none, by the page, a search result or a
   link that is no origin, or with another origin than the locked node clears that lock as the
   module's clearing before its view is drawn, the record open, nothing drawn as selected and the
   camera still, and by the page with the focus kept and the live region written once; one
   followed from the selected node, opened by the page from it or followed on from that record's
   view keeps it and the way back; the page's own clearing leaves the record open; a select
   listener that opens another view at the clearing ends the opening, the record neither drawn
   nor announced), a later arrival naming a record over a lock, the record context (a record
   opened with no origin frames each shown place it links to through the adapter's linkPlanes,
   1px at full strength with nothing dimmed, and no link on another plane; one of two linked
   places framed under a filter that hides the other, and the context held with every linked place
   filtered out, with no link and with no plane named; the context moving to another record's set
   when that record's reference is followed; none from a record opened from a node; a selection
   ending it; teardown), hover in it by a real mouse (nothing previewed, dimmed or framed and the
   pixels unchanged, against the control with nothing open; the pointer cursor kept; a linked leaf
   keeping its frame; the same with every linked place filtered out and beside a record with no
   link; a click selecting, and a click on the framed leaf offering no way back), the keyboard
   focus in it by real keys (its ring drawn with the linked frame kept, on the linked place too), the chooser's
   preview overriding it until Escape restores the frames or a choice ends it, and a click on empty
   canvas closing the chooser and the record together, the way back to a record from a place
   reached by one of its references and from nowhere else (none left behind by a followed
   reference whose selection throws, by the adapter's error or a malformed section, the error
   reaching the page, against the control with nothing thrown), and closing a record by a click on
   empty canvas with the camera still (a record whose origin a filter cleared included), not by a
   drag, by Escape, and with a node selected together with the selection, each written once to the
   live region in the default or the adapter's words, an empty one writing nothing, Escape back to
   a selected origin announcing it, and a click with nothing open writing nothing, an opening or a
   close a listener interrupts ending there (a preview listener that selects another leaf, or
   destroys the map, as the record context ends a hover preview, against the control with no
   listener; an inspector listener that opens another record as Escape, a click or a tap closes
   one, and an obstacle listener that does so as the sheet folds, that record kept open and
   announced, the camera left where its opening put it, and nothing announced closed),
   refits at the Fit only, the compact sheet and its exclusivity, the Fit edges it declares by
   state (the collapsed pill top with the right as its option, the open sheet an overlay that
   reserves nothing, the wide panel right), a selection opening the sheet with no refit (also
   over an open chrome panel), a record opened with no origin over a lock and a folded sheet
   clearing the lock before the sheet opens, with the camera where it was, and stopping, with
   the restored host left as it was, when a select listener destroys the map at that clearing,
   a touch drag leaving a record and its sheet open and a tap on empty canvas closing the record
   and folding the sheet, focus kept in the panel with trusted keys, the live legend's notes
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
   the CFW reference and the Vellmark parks composition, in each
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
W  export with the whole stack in use, a plate with a record context held equal to the neutral
   one, and the reference plates
H  theme: the cycle, one owner per document, teardown
N  the synthetic composition in every hierarchy shape, two instances, destroy and remount,
   missing modules and slots, the minimum composition's membership, no reference content loaded
R  the reference specimen on the complete stack
A  Criterion Assessment on the visitor-facilities composition, on its own page: the key (the three
   words on their own --assessment- tokens, then the system's name and its five declarations); the
   default announcements carrying the owner word, and the start message the criterion; the
   chooser's words by a real click; the facet's three options with their counts and no unassessed
   option; the inspector's word, criterion line and the slot's `--st`, and none for an unassessed leaf, a
   container, the root or a record; KEY_REQUIRED, TOKENS, the strict swatch facet and the muted-only
   tone, each refused with its message and the host untouched; the export's one control, its page
   plate, key and refusals; no uncaught error. X65 to X70 plant the Criterion paint read from a
   --state- token, an unassessed row, option or word, and the diagram plate accepted, each failing
   the A check written for it
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
   refits away from the Fit); the default kind line planted with the dash it replaced, and an
   adapter's kind line planted to be replaced by the default; a record keeping a lock other than
   its origin (the lock stays drawn as selected beside it), one clearing the lock only once its
   panel has opened (the camera brings the cleared node beside the sheet), one clearing it only
   once its view is drawn, one going on opening after a select listener destroyed the map (it
   writes onto the restored host), one announcing at the clearing (two live-region writes where
   one is due), and one going on opening after a select listener opened another view (the record
   is announced over it); hover suppressed only while a linked place is shown, a linked set
   taking every plane, a context held only with a qualifying link, hover previewing in the
   context, the context's hover rule dropped from the stylesheet, the exporter keeping the linked
   class, the way back following any record, empty canvas closing only a record with no origin,
   Escape closing a record unannounced, the chooser not repainting as it closes, teardown leaving
   the context's class, the empty-canvas close not folding the sheet, the linked frame on a
   filtered-out place, the context keeping its first record's set when another record opens, an
   empty closed announced as an empty write, an opening going on after drawing its view (the
   record announced over a leaf a preview listener selected, or written onto the restored host),
   a close folding the sheet, or announcing itself, whatever a listener opened, the fold
   returning to the Fit under a record an obstacle listener opened, and a follow keeping its way
   back when the selection throws, or swallowing the error; a control that names its reason fails
   for it
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
held load with no change is the control). Under Criterion Assessment, on the visitor-facilities
composition (E23 to E28): the diagram plate and a page plate without its legend refused at mount;
KEY_REQUIRED and TOKENS, each leaving the host untouched; one control and the diagram plate refused
at the click; the page plate in both themes carrying the three words, the system's name and the five
declarations, its tokens the base five and the three assessment tokens, with no --state- token and no
unassessed word; with controls for a key removed at the click ('key missing') and for that reading on
the Spectral specimen, which fails it.

```
node tests/radial-export.mjs             # --out DIR keeps the review PNGs and the results
```

## fill-paint-engines.mjs

Guards the interactive [`diagram-interactive-spine`](../patterns/diagram-interactive-spine/README.md) and
[`diagram-interactive-radial`](../patterns/diagram-interactive-radial/README.md) on the surface treatments'
fill paint ([`surface-treatments.css`](../surface-treatments.css), FILL PAINT). It serves the repository
read-only and opens the spine's and the radial's gallery previews, the radial's synthetic composition, its
visitor-facilities composition and its arrow fixture ([`radial-arrows-fixture.html`](radial-arrows-fixture.html)), in headless Chrome, in both schemes: hover and a locking click with a real pointer, keyboard focus with
real keys, and the rest of selection, zoom and Fit through the page's own API or a dispatched click on a
node or a zoom button.

```text
S  spine: every node at 100% of its role, the root as the neutral filled shape, its label and tag in the
   role's ink, and the state map read as values, never from the owner, the same in both schemes: each
   role's physical fill (earned green, partial yellow, deflated red, structural violet, held cyan,
   proposed magenta) and the approved ink on it (ASK, 2026-11-25: green rgb(132, 125, 154), yellow
   rgb(123, 115, 146), red rgb(225, 215, 234), violet rgb(217, 205, 228), magenta rgb(235, 228, 241),
   cyan and the neutral shape #6A637F); its chip a hole; no frame at rest; a
   locked node 2px and a hovered related node 1px (the relation itself checked), the locked node hovered
   keeping its 2px, none of it stepping a fill or outline, dimming or filtering; a hover with nothing
   locked previewing at 1px, a real click locking at 2px; a dimmed node under the pointer in full; every
   hole on its box's center line, the backbone through each spine node's hole and the selected node's
   edges ending on holes; the frame 4.75px beyond the box's painted edge at both ends of the zoom; the
   legend's and inspector's dots in their own paint (the root's neutral fill inside its edge; in dark the
   neutral fill equals the theme foreground, so this discriminates in light only); the exports, taken with
   a node locked and the pointer on the topmost node, equal to exports taken with the pointer away, and
   baking no node part-faded
R  radial: every state mark at 100% of its role, its fill the state map's, a state mark's chip a hole, every mark asserting no
   state at the 15% wash, no mark's fill, wash or outline stepped by selection, relation or hover, and no
   emphasized mark dimmed or filtered; the frame matrix (selected 2px, a hovered related node 1px at full,
   the other related 1px at half); a preview at 1px, a real click locking at 2px; a dimmed mark under the
   pointer in full; the frame 4.75px beyond its mark's painted edge zoomed in, at the Fit, and on a square
   and a triangle at the greatest zoom; the keyboard focus ring, centered, 3px clear of the round-joined
   frame at all three; every leaf's own name and identifier line clear of its frame on rays right, left,
   up and down and in a triangle's cluster deep in; each directed relation, by its real target: into a
   filled mark the head's tip outside the target, none reported obscured, and the head off other filled
   marks (on the synthetic composition, except its one accepted base corner: VM-SE-213 > VM-LM-177, at
   most 0.111 under VM-LM-185), into a washed mark the full curve; the inspector's dot the wash for no
   asserted state; the page plate drawing no frame and keeping the fill paint by reference; on the
   synthetic composition's holed rings, every mask the plate references resolving, and each ring's hole
   the chip's geometry at its center, inside the ring
R  the arrow fixture (R16–R19): a relation between close neighbors (the target's stop at least half their
   distance, asserted, so the check cannot pass vacuously) cut in its first half, its tip on no filled mark;
   every unreported head past its target's true painted reach, the circle through the tip meeting no
   painted point of the target on any of 1,440 bearings, on a 76-unit triangle, a leaf-size triangle (its
   mitered corners) and a pill among them; report().obscuredHeads naming exactly the relations whose tip
   lies on a filled mark (the source's center within the target's reach, the cut inside a filled source,
   the tip on a filled neighbor); the exported diagram, opened as its own document with its own styles,
   drawing the live relation paths, its heads on a fill exactly where the live drawing reports one
C  the visitor-facilities composition, Criterion Assessment: every assessed mark at 100% of its
   --assessment- token, read by token reference and against an independent value map, its chip a hole,
   and every unassessed leaf, container and the root at the 15% wash of --fg-1 (C1); the assessed
   rings holed at their chips' geometry, and the page plate keeping the fill paint by reference with
   its masks resolving and no --state- token (C2); every --state- role token overridden with a sentinel
   moving no mark, swatch or dot (C3), and --assessment-favorable overridden moving exactly the
   favorable marks and their key, facet and dot (C4): equal values cannot tell aliasing apart, so
   this reads token references
N  controls: with surface-treatments.css off, S's paint check fails (N1); with structural painted its
   former yellow, role and ink bound alike, the binding checks pass and S fails its state and ink maps on
   the structural nodes only (N2); the assessment tokens aliased to --state- tokens fail C3 (N3), caution
   aliased to favorable fails C4 (N4), and criterion-assessment.css off fails C1 (N5)
```

Each fix this guard was written for was reverted alone, in its own copy, and the suite run against it: the
frame measured from the geometric edge (radial R7, spine S5), mitered frame corners (R8), names placed
without the frame's clearance (R5) or offset in screen y (R5), a 1.5 arrow stop (R6, R15), washed targets
shortened too (R6), the inspector's solid no-state dot (R12; the spine's, S8 in light), a 2px preview (S9,
R13), a dimmed node that stays dim under the pointer (S10, R14), an unsettled export (S11), and stepped
outlines on hover or relation (S6, R4) each fail their check, in both schemes unless noted. Frames kept in
the spine's export fail `spine-behavior.mjs` C14 and C15, not this suite.

The arrow fixture's controls, each in its own copy:
- **An engine that cuts only when the stop is under half the relation's length, and reports nothing,** fails R16 to R19. The short relation ends at its target's center, its tip on the fill.
- **The triangle's reach at 1.35** fails R17: the circle through the tip meets the triangle on 46 of 1,440 bearings.
  - The tip itself is clear on both approaches.
  - That is why the gallery compositions never caught it: the reference directs no relation into a filled triangle, and the synthetic composition's two reach leaf-size triangles on bearings clear of their corners, so a test at the tip alone stayed clear.
- **The pill's reach at 1** (its rounded corners reach 1.0142 of its radius) fails R17: the circle meets the pill on 212 bearings.
- **No allowance for a triangle's mitered corner** fails R17 on the leaf-size triangle: the circle meets it on 4 bearings.
- **The cut confined to the curve's second half** fails R16 to R18.
- **Removing either reporting path** fails R17 to R19.

```
node tests/fill-paint-engines.mjs        # --out DIR keeps the results
```

## instrument.mjs

The **rendered check** of [`instrument`](../patterns/instrument/README.md), on its specimen
(`patterns/_preview/instrument.html`: the canonical template, the pattern's stylesheet and script, and
the example product). It serves the repository read-only and opens the specimen in headless Chrome; clicks
and keys arrive as trusted DevTools input.

```text
F  frames: each frame's canvas keeps its shape inside the stage and meets it on one side; free takes the stage
V  views: full window and back by Escape; the fullscreen control, reported as what the browser did
   (native fullscreen or the full-window fallback) and never more; exit
E  saved sizes: 2160 × 2160, 2880 × 2160, 3840 × 2160, free at 2160 on its short side, and free on a
   very wide stage at 3840 on its long side; an export draws for the frame it saves, not the one on screen; the live canvas untouched; the
   filename's name, date stamp, product suffix and size
T  touch: on a coarse pointer an action and the disclosure trigger reach 44 px of hit height, from
   their boxes and margins, and selector segments are at least 44 px tall
R  the canvas focus ring by keyboard, on light, dark and plum artwork (plum close to the outer band's
   color), docked in light and dark chrome (plum in light chrome only) and in full window in light
   chrome: an outer 2 px band of #6A637F and an inner 2 px band of #FFFFFF on every edge, one of them
   well apart from the artwork,
   and no ring without focus
X  planted faults: the specimen without the ring's overlay keeps the outline and loses the inner
   band, failing R; without the touch margin, T
```

Headless Chrome only. Safari, Firefox, a physical device, a device's save or share flow, native
fullscreen where this browser declines it, and a page opened from disk are not exercised; the standalone specimen is the page for
those checks, not the gallery's framed host, whose frame does not allow fullscreen.

```
node tests/instrument.mjs                # --shots DIR keeps the focus-ring screenshots
node tools/check-instrument-neutrality.mjs   # --deny FILE adds a consumer's own tokens; --self-test
```
