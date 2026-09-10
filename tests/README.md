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

The fixture holds both cases and checks the exported pixels, not just the eye:

```text
DEFAULT     the roles alias the foundation ramp
            >> exported chrome unchanged from before the contract

OVERRIDE    a consumer rebinds only --diagram-ink / --diagram-muted
            >> exported chrome follows those semantic roles
```

**Run it** (served from the repo root, so the `../` foundations resolve):

```
python3 -m http.server 8080
# open http://localhost:8080/tests/chrome-role-export-fixture.html
```

Click **`run pixel check`** — it exports the page, scans the header band of the raster,
and reports which candidate colour the chrome actually used. Then click **`toggle role
override`** and run it again; both states must report PASS. The override value is a
deliberately conspicuous non-palette colour so a raster that ignored it is unmistakable.

Reverting the exporter to its pre-contract form makes the OVERRIDE case fail and leaves
the DEFAULT case passing — which is the discrimination the fixture exists to provide.

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
