# Hard-fail checklist // static output artifact

A static output artifact fails design-system-ASK inheritance if any of the following are present. Treat each as a hard fail, not a stylistic preference.

## Styling fails

- Generic memo, academic-paper, beige/off-white paper, or serif-document styling
- Body copy in a serif typeface
- Default browser tables dominating layout
- The artifact reads as a static Word document or legal-memo PDF

## Theme inheritance fails

- A theme is hard-coded on `<html>` or `<body>` (e.g. `data-theme="dark"`) without explicit reason
- The artifact does not honor `prefers-color-scheme` (the upstream `colors_and_type.css` resolves it; the artifact must not override)
- A JavaScript theme toggle is present without explicit reason

## Color discipline fails

- Any color outside the closed palette appears: Core 5 + surface (`#BFB3D4` / `#C9BCDE`) + two UI accents (`#8B79A2`, `#AE87C2`) + three emphasis accents (`#FF00FF`, `#AA40FF`, `#00BEFF`)
- A semantic green / red / yellow status system appears
- Invented hex values appear in the artifact's overlay CSS
- A local `--fg-*` / `--line-*` rebind appears (foreground must be inherited from the foundation ramp, not re-declared at the artifact layer). The **only** sanctioned token override is the Class B line-intensity overlay (`--artifact-line` / `--artifact-line-soft`): white at higher alpha in light mode, foundation lines in dark — white is in-palette and the override is scoped to structural lines, not foreground.

## Self-contained / sealed-output fails

- The delivered artifact is **not self-contained**: it requires the network, a sibling stylesheet, or a sidecar font to render with full styling
- An external `<link>` / `@import` / live raw-URL stylesheet reference survives into the delivered artifact (the editable template links the local mirror; the *delivered* artifact must be sealed)
- A relative font URL that resolves outside the artifact survives into the delivered artifact (fonts must be embedded at seal time)
- An unreplaced template marker (`[placeholder]`, `0000000`, etc.) appears in the delivered artifact

## Type discipline fails

- Inter is used for code or tabular data
- JetBrains Mono is used for prose body
- More than ~4 type levels appear (size-based hierarchy proliferation)
- Weights outside the scaffold's approved set appear: Inter 200 / 300 / 400; JetBrains Mono 300 / 500
- 600 SemiBold or heavier weights appear

## Source-truth fails

- The artifact does not record a design-system-ASK source SHA
- A `MANIFEST.md` (or equivalent provenance record) is missing
- Live CSS is hot-linked from the upstream repo's raw URL or any live path (static artifacts must freeze inheritance at render time)
- The artifact cannot be audited against a known upstream commit

## Tier boundary fails

- Visible design-system-ASK Tier 3 instance identity — the "ASK Design System" branding or the `logo-ASK` wordmark — is propagated into the consuming project's artifact unless the consuming project is itself an ASK-instance surface and has explicitly accepted that overlay.
- The consuming project's own Tier 3 identity is fused with the upstream Tier 2 design language rather than layered cleanly on top
