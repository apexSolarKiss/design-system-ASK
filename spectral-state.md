# Spectral State

A semantic **state-color system**: a small, identity-free vocabulary of state *roles* — seven mapped to a neon hue on a 12-step wheel, plus a `neutral` field role that resolves to the theme foreground — calibrated per theme. Defined in [`spectral-state.css`](spectral-state.css); rendered visual key in [`spectral-state.html`](spectral-state.html).

It is a **specialized, opt-in foundation primitive** — for surfaces that encode the *state* of architectural elements (e.g. an interactive state diagram where a node's color says "this is earned / held / deflated"). It is **not** general UI color, and the static diagram scaffolds (`patterns/diagram-static-H/` / `-V/` / `-SEQ/` / `-FLOW/`) do **not** use it — those are structural and assert no state. The interactive `diagram-interactive-spine` is the state-bearing member that does.

**Profiles.** Sanctioned *profiles* may build on this primitive for adjacent semantic domains. The first is [`evidence-state.md`](evidence-state.md) (epistemic evidence-state), which reuses three of the roles below by reference and adds two evidence-specific roles. Spectral State's own eight-role architectural-element vocabulary is unchanged by any profile.

> **Status: v1.1 — restructured after first-consumer proving.** The eight-role vocabulary and the wheel-as-resource concept were validated in a real surface — `asset-pipeline-ASK`'s interactive IA state spine (first consumer), which exercised all eight roles by reference (no palette fork). That proving surfaced a category error: `proposed` is a *potentiality*, not a degree of achieved provenness, so it does not belong on the health ramp. **v1.1** moves `proposed` to the orthogonal axis (magenta 300°) and recolors the now-4-stop health ramp to a clean **green → yellow → orange → red**, which also retires the prior yellow-family perceptual-evenness watch-point (two near-yellows collapse to one). Role names are unchanged; AP re-consumes the recolor by re-sync.

## The eight roles

| Role | Meaning | Hue |
| --- | --- | --- |
| `--state-earned` | operationally grounded at full depth — "go" | 120° green |
| `--state-structural` | structurally / schema proven; not full-flow pressured | 60° yellow |
| `--state-partial` | operational but at bounded depth | 30° orange |
| `--state-deflated` | pressure showed it unnecessary / dead — "no" | 0° red |
| `--state-held` | a named open question, not yet resolved | 180° cyan |
| `--state-external` | owned elsewhere (inherited / upstream) | 270° violet |
| `--state-proposed` | articulated as a candidate / potentiality; not yet pressured | 300° magenta |
| `--state-neutral` | no asserted state (the default field) | lavender (`--fg-1`) |

The first four are the **health ramp** (ordered, achieved provenness); `held` / `external` / `proposed` are **orthogonal categories** (not a health judgment); `neutral` is the field.

## Wheel logic

A **12-hue neon wheel** is the palette *resource*: `hsl(H, S, L)`, `H = n×30°`. The wheel is a resource, not a mandate to invent twelve states — only the eight roles draw from it.

- **Health ramp — the achieved-provenness axis.** One ordered axis, green "go" → red "no": `earned (120° green)` → `structural (60° yellow)` → `partial (30° orange)` → `deflated (0° red)`. Four stops, a clean stoplight-style gradient; the **green↔red anchors are firm**; all stops fall on the wheel's 30° steps.
- **Orthogonal categories — not a health judgment.** `held (180° cyan)`, `external (270° violet)`, and `proposed (300° magenta)` sit off the ramp — "different axis, not good-vs-bad." `proposed` lives here because it is a *potentiality* (a candidate, not yet pressured), not a degree of achieved provenness.
- **Neutral — the lavender identity field.** `--state-neutral` is the default (`var(--fg-1)`); a node takes a neon hue only to *say something*.

### Per-theme calibration

| | Saturation | Lightness | Why |
| --- | --- | --- | --- |
| **Light** (on lavender) | 85% | 45% | deeper neon so each hue reads against the light field |
| **Dark** (on ink) | 95% | 60% | bright neon to pop against the dark field |

Per the foundation's theme model, the dark values appear in both the explicit `[data-theme="dark"]` block and the `prefers-color-scheme: dark` auto block. The prior yellow-family perceptual-evenness watch-point is **retired by the v1.1 restructure**: the ramp no longer carries two adjacent near-yellows (yellow-green 90° + yellow 60°) — it is now green / yellow / orange / red, four maximally-distinct stops. `structural` (60° yellow) is the single brightest stop; as one accent in a four-way-distinct ramp it reads cleanly. A one-value `L` tone-down on `structural` remains available if ever wanted.

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
