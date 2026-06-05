# ASK Spectral State

A semantic **state-color system**: a small, identity-free vocabulary of state *roles*, each mapped to a neon hue on a 12-step wheel, calibrated per theme. Defined in [`spectral-state.css`](spectral-state.css).

It is a **specialized, opt-in foundation primitive** — for surfaces that encode the *state* of architectural elements (e.g. an interactive state diagram where a node's color says "this is earned / held / deflated"). It is **not** general UI color, and the static diagram scaffolds (`patterns/diagram-tree/`, `patterns/diagram-spine-static/`) do **not** use it — those are structural and assert no state.

> **Status: v1 — AP-proving-first.** The role vocabulary and the wheel structure (anchors, health ramp, cool arc, neutral field) are stable. The exact S/L calibration and per-theme values are **provisional**, to be confirmed after the first consumer — `asset-pipeline-ASK`'s interactive spine — proves them in a real surface.

## The eight roles

| Role | Meaning | Hue |
| --- | --- | --- |
| `--state-earned` | operationally grounded at full depth — "go" | 120° green |
| `--state-structural` | structurally / schema proven; not full-flow pressured | 90° yellow-green |
| `--state-partial` | operational but at bounded depth | 60° yellow |
| `--state-proposed` | articulated as a candidate; not yet pressured | 30° orange |
| `--state-deflated` | pressure showed it unnecessary / dead — "no" | 0° red |
| `--state-held` | a named open question, not yet resolved | 180° cyan |
| `--state-external` | owned elsewhere (inherited / upstream) | 240° blue |
| `--state-neutral` | no asserted state (the default field) | lavender (`--fg-1`) |

## Wheel logic

A **12-hue neon wheel** is the palette *resource*: `hsl(H, S, L)`, `H = n×30°`. The wheel is a resource, not a mandate to invent twelve states — only the eight roles draw from it.

- **Health arc — the maturity ramp.** One ordered axis from green "go" to red "no": `earned (120°)` → `structural (90°)` → `partial (60°)` → `proposed (30°)` → `deflated (0°)`. The **green↔red anchors are firm**; the intermediate stops fall on the wheel's 30° steps.
- **Cool arc — orthogonal categories.** `held (180° cyan)` and `external (240° blue)` take cool hues to signal "different axis, not good-vs-bad" — they are not points on the health ramp.
- **Neutral — the lavender identity field.** `--state-neutral` is the default (`var(--fg-1)`); a node takes a neon hue only to *say something*.

### Per-theme calibration (provisional)

| | Saturation | Lightness | Why |
| --- | --- | --- | --- |
| **Light** (on lavender) | 85% | 45% | deeper neon so each hue reads against the light field |
| **Dark** (on ink) | 95% | 60% | bright neon to pop against the dark field |

Per the foundation's theme model, the dark values appear in both the explicit `[data-theme="dark"]` block and the `prefers-color-scheme: dark` auto block. **Watch-points** (provisional, to confirm post-AP): yellow/yellow-green legibility on the light field, and perceptual-evenness across hues (yellow reads lighter than blue at equal `L`).

## Discipline the system preserves

- **Lavender is the identity field; neon is the sparse signal.** Meaning comes from sparse, intentional coloring against the neutral lavender field — ASK's restrained-accent discipline, not a rainbow.
- **One state role per node.** A consuming element asserts exactly one state.
- **Color encodes state only.** Evidence depth, risk, normative-force kind, and structural-axis membership live in panels/metadata on the consuming surface, never in hue. (Consumer-side rule, recorded for context.)
- **Theme-aware, offline, no CDN.** Conforms to the existing Tier 1 / Tier 2 model so it reads as the same family.

## Tiers

- **Tier 1 (identity-free):** the eight `--state-*` role names — a stable vocabulary other ASK-family repos can reuse.
- **Tier 2 (ASK design language):** the per-theme neon `hsl()` values + the wheel logic.
- **No Tier 3.** This primitive carries no instance identity.

## How to use it

1. Load `colors_and_type.css` first (Spectral State relies on its theme resolution + `--fg-*`), then `spectral-state.css`.
2. On a consuming element, set color/fill/stroke from a single role token, e.g. `fill: var(--state-earned)` or `color: var(--state-held)`.
3. Default everything to `--state-neutral`; apply a neon role only to mark a state.

```css
/* example — consuming surface */
.node              { fill: var(--state-neutral); }
.node[data-state="earned"]   { fill: var(--state-earned); }
.node[data-state="held"]     { fill: var(--state-held); }
.node[data-state="deflated"] { fill: var(--state-deflated); }
```

## What is upstream vs consumer-local

- **Upstream (this repo):** the eight roles, the per-theme neon values, the wheel logic. General; family-reusable. Consumers **inherit by reference and do not mint a divergent palette.**
- **Consumer-local (e.g. asset-pipeline-ASK):** which element gets which state, evidence-depth qualifiers, risk flags, substrate markers, mode coverage, and evidence pointers. Those are data and metadata, not part of this color system.
