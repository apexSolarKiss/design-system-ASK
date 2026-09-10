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
