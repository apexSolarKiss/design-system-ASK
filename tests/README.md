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

## role-conformance-fixture.html

Guards **the document-register lock** on a rendered page: `tools/role-conformance.js`,
the check that proves which elements carry which role and what each computes to, and
`tools/check-role-conformance.mjs`, which drives each governed link's states with real
input. A static read of `surface-document.css` (`check-type-roles.mjs` R7) cannot see a
consuming page — a local size override, a table of contents built from bare anchors, a
dense table set as body prose, a block with no rail, a quotation on the emphasis color,
smaller text tucked inside body copy, a hover rule that drops the magenta, a region that
swaps a token. This page can.

It holds one **conforming specimen** — every governed role except the title, which the
page's own heading carries: a quotation on the neutral rail with its attribution, a plain
and a structured block on the magenta rail, a block inside an emphasis rail, a two-level
table of contents, a declared dense table and an unmarked prose table, an entry title on
an operable entry, and links in body, metadata, a quotation and a dense cell — which must
return no finding at rest or in any link state. After it come **controls**: 76 negative
controls, one per failure branch, each of which must fail with exactly the reason codes
it names, no more and no fewer; and 2 positive controls — an unmarked prose table and a
complete profile declaration — which must return no finding:

```text
C0.token                    a region that redefines --fs-body, alone and around body
                            text (with C1.lh C1.size C2.body) · one that swaps
                            --font-sans around body text · one that makes
                            --ask-emphasis-magenta gray around a link · one that
                            makes --line-1 magenta around a quotation; each finding
                            must name its token, and each of the last three is the
                            only finding, because every other rule resolves the
                            swapped token in the same context
C1.lh C1.size C2.body       body copy at the Small step · a quotation set small
C1.lh C1.size C2.heading    a deep heading smaller than its body
C1.color · C1.weight ·      body in the tertiary foreground · body at 300 · body on
C1.lh · C1.tracking ·       tight leading · body tracked out · a label without
C1.case · C1.family         uppercase · a contents link in sans
C1.family · C1.weight ·     an entry title in mono · an entry title at the body
C1.lh · C1.tracking ·       weight (200) · an entry title on the panel label's heading
C1.case                     leading · an entry title on the panel label's tight
                            tracking · an entry title in uppercase
C3.missing · C3.color ·     a block with no rail · a block on the neutral quotation
C3.color · C3.width ·       rail · a quotation on the magenta emphasis rail · a 1px
C3.inset · C3.double ·      quotation rail · an inset too small · a second rail
C3.double · C3.color ·      inside a rail · an emphasis rail inside a quotation ·
C3.width · C3.hierarchy     an emphasis rail on the neutral quotation color · a 1px
                            emphasis rail · a hierarchy level drawn as a 2px
                            magenta rail
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
