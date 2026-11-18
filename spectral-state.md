# Spectral State

A semantic **state-color system**: a small, identity-free vocabulary of state *roles* — seven mapped to a neon hue drawn from a 12-step wheel, plus a `neutral` field role that resolves to the theme foreground — one value per role in both themes. Defined in [`spectral-state.css`](spectral-state.css); rendered visual key in [`spectral-state.html`](spectral-state.html).

It is a **specialized, opt-in foundation primitive** — for surfaces that encode the *state* of architectural elements (e.g. an interactive state diagram where a node's color says "this is earned / held / deflated"). It is **not** general UI color, and the static diagram scaffolds ([`patterns/diagram-static-H/`](patterns/diagram-static-H/README.md) / [`-V/`](patterns/diagram-static-V/README.md) / [`-SEQ/`](patterns/diagram-static-SEQ/README.md) / [`-FLOW/`](patterns/diagram-static-FLOW/README.md)) do **not** use it — those are structural and assert no state. The interactive [`diagram-interactive-spine`](patterns/diagram-interactive-spine/README.md) is the state-bearing member that does, and a document that adopts [Review Semantics](review-semantics.md) shows its state marks beside review and evidence marks.

**Profiles.** Sanctioned *profiles* may build on this primitive for adjacent semantic domains. The first is [`evidence-state.md`](evidence-state.md) (epistemic evidence-state), which reuses three of the roles below by reference and adds two evidence-specific roles. The second is Review State, in [`review-semantics.md`](review-semantics.md), which reuses two of the roles below (`earned`, `deflated`) and the foundation's emphasis magenta, emphasis cyan and `--fg-3` by reference for the five review roles of a document annotation composition, and adds no value. Its Open question shares `held`'s meaning, a matter not yet settled, and since v1.2 its value: both are the emphasis cyan. Spectral State's own eight-role architectural-element vocabulary is unchanged by any profile.

> **Status: v1.3 // each physical value defined once, in the foundation.** Green, yellow, orange and red move into the foundation's **reserved state values** in [`colors_and_type.css`](colors_and_type.css), beside the emphasis accents the other three roles already bind; the role values are unchanged. Those values are not general UI color: a surface reaches them only through a role here. Re-sync this file with `colors_and_type.css` from the same owner commit.
>
> **v1.2 // one value per role in both themes.** So that a state shape can be painted at 100% fill ([`surface-treatments.css`](surface-treatments.css), FILL PAINT), where a color that changed between themes would be a different color, the per-theme calibration is retired. Every chromatic role takes one value in both themes: the former dark values for green, yellow and red; a more vivid orange; and the foundation's emphasis magenta, cyan and violet, by reference, for `proposed`, `held` and `external`. Each physical color is defined once. Role names are unchanged; consumers re-consume by re-sync.
>
> **v1.1 // restructured after first-consumer proving.** The eight-role vocabulary and the wheel-as-resource concept were validated in a real surface — [`asset-pipeline-ASK`](https://github.com/apexSolarKiss/asset-pipeline-ASK)'s interactive IA state spine (first consumer), which exercised all eight roles by reference (no palette fork). That proving surfaced a category error: `proposed` is a *potentiality*, not a degree of achieved provenness, so it does not belong on the health ramp. **v1.1** moves `proposed` to the orthogonal axis (magenta 300°) and recolors the now-4-stop health ramp to a clean **green → yellow → orange → red**, which also retires the prior yellow-family perceptual-evenness watch-point (two near-yellows collapse to one). Role names are unchanged; AP re-consumes the recolor by re-sync.

## The eight roles

| Role | Meaning | Hue |
| --- | --- | --- |
| `--state-earned` | operationally grounded at full depth — "go" | 120° green |
| `--state-structural` | structurally / schema proven; not full-flow pressured | 60° yellow |
| `--state-partial` | operational but at bounded depth | 30° orange |
| `--state-deflated` | pressure showed it unnecessary / dead — "no" | 0° red |
| `--state-held` | a named open question, not yet resolved | about 195° cyan: the foundation's emphasis cyan, `#00BEFF` |
| `--state-external` | owned elsewhere (inherited / upstream) | about 273° violet: the foundation's emphasis violet, `#AA40FF` |
| `--state-proposed` | articulated as a candidate / potentiality; not yet pressured | 300° magenta: the foundation's emphasis magenta, `#FF00FF` |
| `--state-neutral` | no asserted state (the default field) | lavender (`--fg-1`) |

The first four are the **health ramp** (ordered, achieved provenness); `held` / `external` / `proposed` are **orthogonal categories** (not a health judgment); `neutral` is the field.

## Wheel logic

A **12-hue neon wheel** is the palette's *origin*: `hsl(H, S, L)`, `H = n×30°`. It is where the hues were found and a resource, not a mandate to invent twelve states, and not a constraint on the final values: only the eight roles draw from it. Every chromatic role now takes its value from the foundation: green, yellow, orange and red from its reserved state values, and magenta, cyan and violet from its emphasis colors — magenta on the wheel at 300°, and cyan and violet a few degrees off it.

- **Health ramp // the achieved-provenness axis.** One ordered axis, green "go" → red "no": `earned (120° green)` → `structural (60° yellow)` → `partial (30° orange)` → `deflated (0° red)`. Four stops, a clean stoplight-style gradient; the **green↔red anchors are firm**; all stops fall on the wheel's 30° steps.
- **Orthogonal categories // not a health judgment.** `held` (cyan), `external` (violet) and `proposed` (magenta) sit off the ramp — "different axis, not good-vs-bad." They take the foundation's emphasis colors by reference, the same values Three Functions and Review Semantics use for their own meanings: one physical color, distinct meanings. `proposed` lives here because it is a *potentiality* (a candidate, not yet pressured), not a degree of achieved provenness.
- **Neutral // the lavender identity field.** `--state-neutral` is the default (`var(--fg-1)`); a node takes a neon hue only to *say something*.

### One value in both themes

| Role | Value | Where it is defined |
| --- | --- | --- |
| `earned` | `var(--ask-state-value-green)`, `hsl(120, 95%, 60%)` | [`colors_and_type.css`](colors_and_type.css), reserved state values |
| `structural` | `var(--ask-state-value-yellow)`, `hsl(60, 95%, 60%)` | [`colors_and_type.css`](colors_and_type.css), reserved state values |
| `partial` | `var(--ask-state-value-orange)`, `hsl(30, 100%, 50%)` | [`colors_and_type.css`](colors_and_type.css), reserved state values |
| `deflated` | `var(--ask-state-value-red)`, `hsl(0, 95%, 60%)` | [`colors_and_type.css`](colors_and_type.css), reserved state values |
| `held` | `var(--ask-emphasis-cyan)` | [`colors_and_type.css`](colors_and_type.css) |
| `external` | `var(--ask-emphasis-violet)` | [`colors_and_type.css`](colors_and_type.css) |
| `proposed` | `var(--ask-emphasis-magenta)` | [`colors_and_type.css`](colors_and_type.css) |
| `neutral` | `var(--fg-1)`, which follows the theme | [`colors_and_type.css`](colors_and_type.css) |

No theme block redefines a chromatic role. Through v1.1 the light theme took deeper values (S 85% / L 45%) and the dark theme brighter ones (S 95% / L 60%); v1.2 retires that split, because a shape painted at 100% in one color must be the same color in both themes. The surface treatments calibrate *paint*, not color, where a field needs it: a thin edge's strength, or the ink set on a fill.

### Each role's ink

Each role also names its ink, `--state-<role>-ink` (`--state-earned-ink` … `--state-neutral-ink`): the color of text set on a shape filled in that role's color. The bindings are here; the values are FILL PAINT's, in [`surface-treatments.css`](surface-treatments.css), which keys each ink by the fill color, so a held node and a judicial part, one cyan, take one ink. This file defines no ink value.

## Discipline the system preserves

- **Lavender is the identity field; neon is the sparse signal.** Meaning comes from sparse, intentional coloring against the neutral lavender field — ASK's restrained-accent discipline, not a rainbow.
- **One state role per node.** A consuming element asserts exactly one state.
- **Color encodes state only.** Evidence depth, risk, normative-force kind, and structural-axis membership live in panels/metadata on the consuming surface, never in hue. (Consumer-side rule, recorded for context.)
- **Theme-aware, offline, no CDN.** Conforms to the existing Tier 1 / Tier 2 model so it reads as the same family.

## Tiers

- **Tier 1 (identity-free):** the eight `--state-*` role names — a stable vocabulary other ASK-family repos can reuse.
- **Tier 2 (ASK design language):** the seven role values — four of the foundation's reserved state values and its three emphasis colors, each defined there and referenced here — and the wheel logic.
- **No Tier 3.** This primitive carries no instance identity.

## How to use it

1. Load `colors_and_type.css` first (Spectral State relies on its theme resolution, `--fg-*`, emphasis colors and reserved state values), then `spectral-state.css` with `surface-panel.css` and `surface-treatments.css` (whose FILL PAINT supplies the inks the `--state-*-ink` bindings name), all from one design-system commit. `spectral-state.css` declares custom properties only, so its place beside the other two, which keep their own order, changes no resolved value; the rendered key loads it directly after the foundation.
2. On a consuming element, set color or stroke from a single role token, e.g. `stroke: var(--state-held)` or `color: var(--state-held)`. A shape filled in a role takes FILL PAINT: `.surface-fill` with the role's value and its ink.
3. Leave an element with no asserted state neutral, and apply a neon role only to mark a state. A neutral filled shape takes FILL PAINT's neutral shape (`.surface-fill--neutral`), never `--state-neutral`, which is a foreground: in light it would leave the neutral node the darkest shape.

```css
/* example — consuming surface; each node also carries .surface-fill, and a node with no state .surface-fill--neutral */
.node[data-state="earned"]   { --surface-fill-color: var(--state-earned);   --surface-fill-ink: var(--state-earned-ink); }
.node[data-state="held"]     { --surface-fill-color: var(--state-held);     --surface-fill-ink: var(--state-held-ink); }
.node[data-state="deflated"] { --surface-fill-color: var(--state-deflated); --surface-fill-ink: var(--state-deflated-ink); }
```

## What is upstream vs consumer-local

- **Upstream (this repo):** the eight roles, their values, the wheel logic. General; family-reusable. Consumers **inherit by reference and do not mint a divergent palette.**
- **Consumer-local (e.g.** [**asset-pipeline-ASK**](https://github.com/apexSolarKiss/asset-pipeline-ASK)**):** which element gets which state, evidence-depth qualifiers, risk flags, substrate markers, mode coverage, and evidence pointers. Those are data and metadata, not part of this color system.
