# Evidence State

A semantic state-color **profile** under the Spectral State family. Where [`spectral-state.md`](spectral-state.md) encodes the state of *architectural elements*, Evidence State encodes epistemic **evidence state** — what current evidence shows about an assumption. Defined in [`evidence-state.css`](evidence-state.css); rendered visual key in [`evidence-state.html`](evidence-state.html).

It is a **sanctioned profile, not a separate palette and not a change to Spectral State.** Spectral State's eight-role architectural-element vocabulary is unchanged. This profile **reuses three Spectral State values by reference** and **adds two evidence-specific roles**.

> **Status: v0.3 // its two values defined in the foundation.** `weakened` and `not-yet-testable` take `var(--ask-state-value-brown)` and `var(--ask-state-value-lavender-gray)`, the foundation's reserved state values in [`colors_and_type.css`](colors_and_type.css), as [Spectral State](spectral-state.md) v1.3's own values do; the values are unchanged. Re-sync this file with `colors_and_type.css` from the same owner commit.
>
> **v0.2 // one value per role in both themes.** As [Spectral State](spectral-state.md) v1.2: `weakened` is `hsl(30, 45%, 48%)` and `not-yet-testable` `hsl(264, 8%, 53%)` on either field, the former dark-theme brown and the former light-theme gray. The three reused roles move with Spectral State: `supported` and `partially-supported` each take one value, and `unresolved` the foundation cyan, a hue of about 195° where it was 180°. Role names and the `not-yet-testable` presentation contract (lavender-gray, dashed rail, hollow marker, visible label) are unchanged.
>
> **v0.1 // first generalized profile.** Authorized by ASK source-of-intent (2026-06-18) as a reusable profile rather than a one-off. First consumer is [`urban-observatory`](https://github.com/apexSolarKiss/urban-observatory) (a domain-partner consumer, by reference). Provisional-but-reusable: the role list may firm up as the profile sees more use; the two new values are the stable, portable part.

## The five roles

| Evidence meaning | Visual implementation | Relationship |
| --- | --- | --- |
| `supported` | value of `--state-earned` | visual-role mapping |
| `partially-supported` | value of `--state-partial` | visual-role mapping |
| `unresolved` | value of `--state-held` | exact mapping |
| `weakened` | new — muted/darkened 30° brown | new Evidence State role |
| `not-yet-testable` | new — neutral lavender-gray + dashed/hollow treatment | new Evidence State role |

**Labels stay evidence labels.** A consuming surface keeps **Supported**, **Partially supported**, and **Unresolved** — it must never relabel them `earned` / `partial` / `held` merely because the color value is shared. The three reused values are *visual-role* mappings (one exact: `unresolved → held`), not semantic aliases.

## The two new roles

- **`weakened`** // a *tonal derivative* of `partial`: the same 30° hue family, lower saturation and lightness — a muted, darkened orange ("brown"). It reads as a degraded `partial` (the pathway remains viable but has lost credibility), clearly separated from neon `partial` and from red `deflated`. It is **not** a new wheel position and is **not** added to the Spectral State health ramp.
- **`not-yet-testable`** // **off** the chromatic arc entirely: a neutral lavender-gray for "evidence cannot exist yet at this stage" (distinct from `unresolved`, an open question being worked, and from a neutral field with no asserted state). Color alone is **not** sufficient. Its presentation contract is mandatory:

  ```text
  neutral lavender-gray  +  dashed rail  +  hollow marker  +  visible label
  ```

## Each role's ink

Each chromatic role also names its ink, `--evidence-<role>-ink` (`--evidence-supported-ink`, `--evidence-partially-supported-ink`, `--evidence-unresolved-ink` and `--evidence-weakened-ink`): the color of text set on a shape filled in that role's color. The bindings are here; the values are FILL PAINT's, in [`surface-treatments.css`](surface-treatments.css), which keys each ink by the fill color, so an unresolved shape and a held node, one cyan, take one ink, and weakened takes brown's. This file defines no ink value. A filled shape keeps its evidence label visible, on the shape or beside it. **`not-yet-testable` has no ink and is never filled:** its contract is hollow, dashed and labeled.

## Wheel logic (inherited)

Evidence State draws on the same neon wheel as [Spectral State](spectral-state.md). The three reused values come from it (`earned` 120°, `partial` 30°, and `held`, now the foundation's emphasis cyan at about 195°); `weakened` is a tonal branch of the 30° orange; `not-yet-testable` is achromatic (off the wheel), like the neutral field. The sparse-signal discipline carries over: a node takes color only to say something.

The Spectral State health ramp is **unchanged**:

```text
Spectral State ramp (unchanged)
  earned → structural → partial → deflated

Evidence State derivation
  partially-supported  → value of partial
  weakened             → muted 30° brown (tonal branch of partial, off the ramp)
```

## Tiers

- **Tier 1 (identity-free):** the `--evidence-*` role names — a stable vocabulary other ASK-family surfaces can reuse.
- **Tier 2 (ASK design language):** the two new values, one each in both themes (`weakened` brown `hsl(30, 45%, 48%)`, `not-yet-testable` lavender-gray `hsl(264, 8%, 53%)`), defined in the foundation's reserved state values ([`colors_and_type.css`](colors_and_type.css)); the three reused values inherit [Spectral State](spectral-state.md)'s Tier 2 by reference.
- **No Tier 3.** This profile carries no instance identity.

## How to use it

1. Load `colors_and_type.css` first, then `spectral-state.css` and `evidence-state.css`, in that order, with `surface-panel.css` and `surface-treatments.css` (whose FILL PAINT supplies the inks the `--state-*-ink` and `--evidence-*-ink` bindings name), all from one design-system commit. `spectral-state.css` and `evidence-state.css` declare custom properties only, so their place beside the other two, which keep their own order, changes no resolved value; the rendered key loads them directly after the foundation.
2. On a consuming element, set color or stroke from a single role token, e.g. `stroke: var(--evidence-supported)` or `color: var(--evidence-weakened)`. A shape filled in a chromatic role takes FILL PAINT: `.surface-fill` with the role's value and its ink, `--evidence-<role>-ink`. `not-yet-testable` is never filled.
3. For `not-yet-testable`, apply the full presentation contract (lavender-gray + dashed rail + hollow marker + visible label) — never color alone.
4. Keep the evidence labels visible; do not relabel reused roles by their Spectral State names.
5. In a document, the [Review Semantics](review-semantics.md) annotation composition shows an evidence role as a labeled dot and keeps the `not-yet-testable` contract whole. Evidence State's other presentations are unaffected.

```css
/* example — consuming surface; each filled node also carries .surface-fill, and a not-yet-testable node never does */
.node[data-evidence="supported"]           { --surface-fill-color: var(--evidence-supported);           --surface-fill-ink: var(--evidence-supported-ink); }
.node[data-evidence="partially-supported"] { --surface-fill-color: var(--evidence-partially-supported); --surface-fill-ink: var(--evidence-partially-supported-ink); }
.node[data-evidence="unresolved"]          { --surface-fill-color: var(--evidence-unresolved);          --surface-fill-ink: var(--evidence-unresolved-ink); }
.node[data-evidence="weakened"]            { --surface-fill-color: var(--evidence-weakened);            --surface-fill-ink: var(--evidence-weakened-ink); }
.node[data-evidence="not-yet-testable"]    { color: var(--evidence-not-yet-testable);
                                             border-left: 2px dashed var(--evidence-not-yet-testable); }
```

## What is upstream vs consumer-local

- **Upstream (this repo):** the five role names, the two new values, the reuse-by-reference mapping, each chromatic role's ink binding (`--evidence-*-ink`) to FILL PAINT, and the `not-yet-testable` presentation contract. General; family-reusable. Consumers inherit by reference and do not mint a divergent palette.
- **Consumer-local (e.g. [`urban-observatory`](https://github.com/apexSolarKiss/urban-observatory)):** which element carries which evidence state, evidence-depth qualifiers, change-state (revised / deferred) badges, source pointers, and the surface layout. Those are data and metadata, not part of this color profile. `urban-observatory` consumes Evidence State **by reference as a domain-partner consumer**; the surfaces stay separate sources of repo truth under one ASK source-of-intent.
