# Evidence State

A semantic state-color **profile** under the Spectral State family. Where [`spectral-state.md`](spectral-state.md) encodes the state of *architectural elements*, Evidence State encodes epistemic **evidence state** — what current evidence shows about an assumption. Defined in [`evidence-state.css`](evidence-state.css); rendered visual key in [`evidence-state.html`](evidence-state.html).

It is a **sanctioned profile, not a separate palette and not a change to Spectral State.** Spectral State's eight-role architectural-element vocabulary is unchanged. This profile **reuses three Spectral State values by reference** and **adds two evidence-specific roles**.

> **Status: v0.1 — first generalized profile.** Authorized by ASK source-of-intent (2026-06-18) as a reusable profile rather than a one-off. First consumer is `urban-observatory` (a domain-partner consumer, by reference). Provisional-but-reusable: the role list may firm up as the profile sees more use; the two new values are the stable, portable part.

## The five roles

| Evidence meaning | Visual implementation | Relationship |
| --- | --- | --- |
| `supported` | value of `--state-earned` | visual-role mapping |
| `partially-supported` | value of `--state-partial` | visual-role mapping |
| `unresolved` | value of `--state-held` | exact mapping |
| `weakened` | new — muted/darkened 30° brown | new Evidence State role |
| `not-yet-testable` | new — neutral lavender-grey + dashed/hollow treatment | new Evidence State role |

**Labels stay evidence labels.** A consuming surface keeps **Supported**, **Partially supported**, and **Unresolved** — it must never relabel them `earned` / `partial` / `held` merely because the colour value is shared. The three reused values are *visual-role* mappings (one exact: `unresolved → held`), not semantic aliases.

## The two new roles

- **`weakened`** — a *tonal derivative* of `partial`: the same 30° hue family, lower saturation and lightness — a muted, darkened orange ("brown"). It reads as a degraded `partial` (the pathway remains viable but has lost credibility), clearly separated from neon `partial` and from red `deflated`. It is **not** a new wheel position and is **not** added to the Spectral State health ramp.
- **`not-yet-testable`** — **off** the chromatic arc entirely: a neutral lavender-grey for "evidence cannot exist yet at this stage" (distinct from `unresolved`, an open question being worked, and from a neutral field with no asserted state). Colour alone is **not** sufficient. Its presentation contract is mandatory:

  ```text
  neutral lavender-grey  +  dashed rail  +  hollow marker  +  visible label
  ```

## Wheel logic (inherited)

Evidence State draws on the same neon wheel as Spectral State. The three reused values sit on it (`earned` 120°, `partial` 30°, `held` 180°); `weakened` is a tonal branch of the 30° orange; `not-yet-testable` is achromatic (off the wheel), like the neutral field. The sparse-signal discipline carries over: a node takes colour only to say something.

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
- **Tier 2 (ASK design language):** the two new per-theme values (`weakened` brown, `not-yet-testable` lavender-grey); the three reused values inherit Spectral State's Tier 2 by reference.
- **No Tier 3.** This profile carries no instance identity.

## How to use it

1. Load `colors_and_type.css`, then `spectral-state.css`, then `evidence-state.css`.
2. On a consuming element, set colour from a single role token, e.g. `fill: var(--evidence-supported)` or `color: var(--evidence-weakened)`.
3. For `not-yet-testable`, apply the full presentation contract (lavender-grey + dashed rail + hollow marker + visible label) — never colour alone.
4. Keep the evidence labels visible; do not relabel reused roles by their Spectral State names.

```css
/* example — consuming surface */
.node[data-evidence="supported"]           { color: var(--evidence-supported); }
.node[data-evidence="partially-supported"] { color: var(--evidence-partially-supported); }
.node[data-evidence="unresolved"]          { color: var(--evidence-unresolved); }
.node[data-evidence="weakened"]            { color: var(--evidence-weakened); }
.node[data-evidence="not-yet-testable"]    { color: var(--evidence-not-yet-testable);
                                             border-left: 2px dashed var(--evidence-not-yet-testable); }
```

## What is upstream vs consumer-local

- **Upstream (this repo):** the five role names, the two new per-theme values, the reuse-by-reference mapping, and the `not-yet-testable` presentation contract. General; family-reusable. Consumers inherit by reference and do not mint a divergent palette.
- **Consumer-local (e.g. `urban-observatory`):** which element carries which evidence state, evidence-depth qualifiers, change-state (revised / deferred) badges, source pointers, and the surface layout. Those are data and metadata, not part of this colour profile. `urban-observatory` consumes Evidence State **by reference as a domain-partner consumer**; the surfaces stay separate sources of repo truth under one ASK source-of-intent.
