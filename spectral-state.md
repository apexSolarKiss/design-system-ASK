# Spectral State

A semantic **state-color system**: a small, identity-free vocabulary of state *roles* — six mapped to a neon hue, found on a 12-step wheel, plus a `neutral` field role that resolves to the theme foreground — one value per role in both themes. Defined in [`spectral-state.css`](spectral-state.css); rendered visual key in [`spectral-state.html`](spectral-state.html).

It is a **specialized, opt-in foundation primitive** — for surfaces that encode the *state* of architectural elements (e.g. an interactive state diagram where a node's color says "this is earned / held / deflated"). It is **not** general UI color, and the static diagram scaffolds ([`patterns/diagram-static-H/`](patterns/diagram-static-H/README.md) / [`-V/`](patterns/diagram-static-V/README.md) / [`-SEQ/`](patterns/diagram-static-SEQ/README.md) / [`-FLOW/`](patterns/diagram-static-FLOW/README.md)) do **not** use it — those are structural and assert no state. The interactive [`diagram-interactive-spine`](patterns/diagram-interactive-spine/README.md) is the state-bearing member that does, a declared Criterion Assessment example of [`diagram-static-peer`](patterns/diagram-static-peer/README.md#declared-semantic-examples) takes the shared physical values only through that profile, and a document that adopts [Review Semantics](review-semantics.md) shows its state marks beside review and evidence marks. Outside that composition, an architecture description, a caption or a table may name an element's state in words, in a keyed state label: a word that is read, not an interface status chip.

**Profiles.** Sanctioned *profiles* build on this primitive for adjacent semantic domains. Each binds its roles directly to the foundation's physical values, the same physical colors this primitive binds: **a shared value is a shared family, never a shared meaning.** The first is [`evidence-state.md`](evidence-state.md) (epistemic evidence state), with six roles of its own. The second is Review State, in [`review-semantics.md`](review-semantics.md), which binds the foundation's green and red, its emphasis magenta and emphasis cyan and `--fg-3` for the five review roles of a document annotation composition, and adds no value. Its Open question shares `held`'s meaning, a matter not yet settled, and its value: both are the emphasis cyan. The third is [`criterion-assessment.md`](criterion-assessment.md), which binds green, yellow and red. Spectral State's own vocabulary is its own; no profile changes it.

> **Status: v2.0 // traffic-light coherence (ASK, 2026-11-25).** `partial` takes the yellow and `structural` the violet, and `external` leaves the state vocabulary. The **evaluative sequence** is `earned`, `partial` and `deflated`: green, yellow and red, affirmative, qualified and negative within the question this system asks. `structural`, `held` and `proposed` are categories off that sequence, and no role ranks `structural` above or below `partial`: [the selection rule](#the-selection-rule), below, says which applies. Orange has no Spectral role. That an element is owned elsewhere is provenance, not a state ([Provenance is not a state](#provenance-is-not-a-state), below). Each role binds its physical value directly, from the foundation. A keyed range takes yellow's rail paint for `partial`; `structural` keeps the plain stroke. Re-sync this file with [`colors_and_type.css`](colors_and_type.css), [`surface-treatments.css`](surface-treatments.css) and every profile from the same owner commit. A consumer whose data names the retired `external` migrates that data by what it meant — outside ownership, a proposal, an unclassified record — before rendering; there is no alias.
>
> **v1.4 // a state named in words.** Outside a multi-axis review annotation, an element's state may be named on a keyed bordered label, `.state-label` with `data-state`, whose words are exactly `State // <Role>`, and a labeled range that label opens takes the role's value on its scope rail, with green's, yellow's or red's rail paint for `earned`, `structural` and `deflated` (A state in words, below). `neutral` takes no keyed label, and inside a Review Semantics annotation state keeps its square. The role values are unchanged. Re-sync this file with [`surface-treatments.css`](surface-treatments.css) from the same owner commit.
>
> **v1.3 // each physical value defined once, in the foundation.** Green, yellow, orange and red move into the foundation's **reserved state values** in [`colors_and_type.css`](colors_and_type.css), beside the emphasis accents the other three roles already bind; the role values are unchanged. Those values are not general UI color: a surface reaches them only through a role here. Re-sync this file with `colors_and_type.css` from the same owner commit.
>
> **v1.2 // one value per role in both themes.** So that a state shape can be painted at 100% fill ([`surface-treatments.css`](surface-treatments.css), FILL PAINT), where a color that changed between themes would be a different color, the per-theme calibration is retired. Every chromatic role takes one value in both themes: the former dark values for green, yellow and red; a more vivid orange; and the foundation's emphasis magenta, cyan and violet, by reference, for `proposed`, `held` and `external`. Each physical color is defined once. Role names are unchanged; consumers re-consume by re-sync.
>
> **v1.1 // restructured after first-consumer proving.** The eight-role vocabulary and the wheel-as-resource concept were validated in a real surface — [`asset-pipeline-ASK`](https://github.com/apexSolarKiss/asset-pipeline-ASK)'s interactive IA state spine (first consumer), which exercised all eight roles by reference (no palette fork). That proving surfaced a category error: `proposed` is a *potentiality*, not a degree of achieved provenness, so it does not belong on the health ramp. **v1.1** moves `proposed` to the orthogonal axis (magenta 300°) and recolors the now-4-stop health ramp to a clean **green → yellow → orange → red**, which also retires the prior yellow-family perceptual-evenness watch-point (two near-yellows collapse to one). Role names are unchanged; AP re-consumes the recolor by re-sync.

## The seven roles

| Role | Meaning | Hue |
| --- | --- | --- |
| `--state-earned` | operationally grounded at full depth — "go" | 120° green |
| `--state-partial` | operational at bounded depth | 60° yellow |
| `--state-deflated` | pressure showed it unnecessary / dead — "no" | 0° red |
| `--state-structural` | structural or schema assurance established; operational assurance not established at this scope | about 273° violet: the foundation's emphasis violet, `#AA40FF` |
| `--state-held` | a named open question, not yet resolved | about 195° cyan: the foundation's emphasis cyan, `#00BEFF` |
| `--state-proposed` | articulated as a candidate / potentiality; not yet pressured | 300° magenta: the foundation's emphasis magenta, `#FF00FF` |
| `--state-neutral` | no asserted state (the default field) | lavender (`--fg-1`) |

The first three are the **evaluative sequence**: green affirmative, yellow qualified, red negative, within the question Spectral State asks. `structural`, `held` and `proposed` are **categories off that sequence** (not a health judgment), and `neutral` is the field. The sequence is Spectral State's own: it ranks no role of another system, and the profiles that bind the same physical colors share their family, not their meaning.

## Roles and the wheel

The hues were found on a **12-hue neon wheel**, `hsl(H, S, L)`, `H = n×30°`. The wheel is their origin and a resource, not a mandate to invent twelve states, and not a constraint on the final values. Every chromatic role takes its value from the foundation: green, yellow and red from its reserved state values, and violet, cyan and magenta from its emphasis colors — magenta on the wheel at 300°, and cyan and violet a few degrees off it.

- **The evaluative sequence // affirmative, qualified, negative.** `earned (120° green)`, `partial (60° yellow)` and `deflated (0° red)`, within the question this system asks: how far an element is operationally grounded. The green and red anchors are firm.
- **Categories off the sequence // not a health judgment.** `structural` (violet), `held` (cyan) and `proposed` (magenta) sit off the sequence — "different axis, not good-vs-bad." They take the foundation's emphasis colors by reference, the same values Three Functions and Review Semantics use for their own meanings: one physical color, distinct meanings. `structural` is an assurance category, not a degree between `partial` and `deflated`; `proposed` lives here because it is a *potentiality* (a candidate, not yet pressured), not a degree of achieved provenness.
- **Orange has no Spectral role.** The foundation keeps its value; Evidence State's `weakened` binds it.
- **Neutral // the lavender identity field.** `--state-neutral` is the default (`var(--fg-1)`); a node takes a neon hue only to *say something*.

### One value in both themes

| Role | Value | Where it is defined |
| --- | --- | --- |
| `earned` | `var(--ask-state-value-green)`, `hsl(120, 95%, 60%)` | [`colors_and_type.css`](colors_and_type.css), reserved state values |
| `partial` | `var(--ask-state-value-yellow)`, `hsl(60, 95%, 60%)` | [`colors_and_type.css`](colors_and_type.css), reserved state values |
| `deflated` | `var(--ask-state-value-red)`, `hsl(0, 95%, 60%)` | [`colors_and_type.css`](colors_and_type.css), reserved state values |
| `structural` | `var(--ask-emphasis-violet)` | [`colors_and_type.css`](colors_and_type.css) |
| `held` | `var(--ask-emphasis-cyan)` | [`colors_and_type.css`](colors_and_type.css) |
| `proposed` | `var(--ask-emphasis-magenta)` | [`colors_and_type.css`](colors_and_type.css) |
| `neutral` | `var(--fg-1)`, which follows the theme | [`colors_and_type.css`](colors_and_type.css) |

No theme block redefines a chromatic role. Through v1.1 the light theme took deeper values (S 85% / L 45%) and the dark theme brighter ones (S 95% / L 60%); v1.2 retires that split, because a shape painted at 100% in one color must be the same color in both themes. The surface treatments calibrate *paint*, not color, where a field needs it: a thin edge's strength, or the ink set on a fill.

### Each role's ink

Each role also names its ink, `--state-<role>-ink` (`--state-earned-ink` … `--state-neutral-ink`): the color of text set on a shape filled in that role's color. The bindings are here; the values are FILL PAINT's, in [`surface-treatments.css`](surface-treatments.css), which keys each ink by the fill color — `earned` on green, `partial` on yellow, `deflated` on red, `structural` on violet, `held` on cyan, `proposed` on magenta — so a held node and a judicial part, one cyan, take one ink. This file defines no ink value.

## The selection rule

For one element at one declared scope or version, show **one primary state**. Where operation is established only at bounded depth, the state is `partial`, and any structural or schema assurance is recorded as its basis. `structural` applies where structural or schema assurance is established and operational assurance is not, for that scope. `earned` still requires full-depth operational grounding. Different scopes may carry separate labeled records.

The rule replaces no consumer's own evidence: it does not reassign an existing element's state on its own, and old paint is never evidence of a state — never infer `structural` from the violet `external` used to take, or `partial` from the yellow `structural` used to take.

## Provenance is not a state

That an element is owned elsewhere — inherited, upstream, outside this surface's authority — is its **source**, not its condition. v2.0 retires `external` from the state vocabulary: there is no `--state-external`, no `--state-external-ink`, and no `data-state="external"` label, square or range, and no alias stands in for one.

- **Outside a review annotation, a neutral label or metadata.** A consumer shows provenance as neutral metadata or a neutral bordered label, its words `Source // External`: a plain `.surface-bordered-label` (`.doc-label` in a document) with no keyed class and no state attribute, which takes the theme's neutral edge. It sits beside whatever state the element asserts, or beside none.
- **Inside a Review Semantics annotation, the basis.** Provenance goes in the item's basis or a neutral metadata item, never a state square.
- **Migrate by meaning.** Data that names `external` migrates to what it meant before rendering: an element owned elsewhere becomes External provenance with its condition unasserted; a proposal becomes `proposed`; an unclassified record keeps its classification as metadata and asserts no condition. Never infer `structural` from violet.

## A state in words

Outside a multi-axis review annotation, an element's state may be named in words on the surface treatments' **bordered label** ([`surface-treatments.css`](surface-treatments.css), BORDERED LABEL): `.state-label` on a `.surface-bordered-label`, `.doc-label` in a document, with `data-state`. Its words are exactly the axis and the role's word, `State // Held`, so a green edge never reads as an accepted review. Its edge takes the role's value. A **labeled range** whose first child is that label takes the same value on its scope rail (LABELED RANGE), and that color's rail paint where the surface treatments give one (RAIL PAINT): `earned` green, `partial` yellow and `deflated` red. `structural`, `held` and `proposed` keep the plain stroke. The bindings are here; the box, the rail and each paint are the surface treatments'.

- **Words, not a control.** The label is inert and unfilled: no ink, hover, press or focus, and never a status chip, a button or a link.
- **Neutral takes no keyed label.** It asserts no state.
- **Inside Review Semantics, the square.** Within a multi-axis review annotation state keeps its square, beside its label: a keyed label never sits in the composition's rows, items, lists or notes.
- **The class, the attribute and the words together.** A bare `data-state` keys nothing, and a label whose words do not name its axis and role is not a state label. `tools/role-conformance.js` checks the key (C13.key), the label's edge (C13.color) and the range's rail (C14.color).

## Discipline the system preserves

- **Lavender is the identity field; neon is the sparse signal.** Meaning comes from sparse, intentional coloring against the neutral lavender field — ASK's restrained-accent discipline, not a rainbow.
- **One state per element, at one declared scope.** A consuming element asserts exactly one primary state there; the selection rule says which.
- **Color encodes state only.** Evidence depth, risk, normative-force kind, provenance (owned elsewhere) and structural-axis membership live in panels, metadata or neutral labels on the consuming surface, never in hue. (Consumer-side rule, recorded for context.)
- **The words carry the role.** Changing which role a color carries changes the reading task, so separations measured for the earlier assignment say nothing about the new one, and simulated color-vision output is not user testing. Close pairs stay close under it, green beside yellow and violet beside magenta among them. Every state keeps its visible words, on its label, beside its mark or in a key. A square beside a dot tells a state from an evidence role, across two axes; it does not tell two states apart.
- **Theme-aware, offline, no CDN.** Conforms to the existing Tier 1 / Tier 2 model so it reads as the same family.

## Tiers

- **Tier 1 (identity-free):** the seven `--state-*` role names and the `.state-label` class — a stable vocabulary other ASK-family repos can reuse.
- **Tier 2 (ASK design language):** the six role values — three of the foundation's reserved state values and its three emphasis colors, each defined there and referenced here — the evaluative sequence and the selection rule.
- **No Tier 3.** This primitive carries no instance identity.

## How to use it

1. Load `colors_and_type.css` first (Spectral State relies on its theme resolution, `--fg-*`, emphasis colors and reserved state values), then `spectral-state.css` with `surface-panel.css` and `surface-treatments.css` (whose FILL PAINT supplies the inks the `--state-*-ink` bindings name, and whose bordered label and labeled range draw the state label and its range), all from one design-system commit. `spectral-state.css` declares custom properties only: role values and inks on `:root`, and the state label's and its range's color and paint properties on their own selectors, which no other module sets on those elements. So its place beside the other two, which keep their own order, changes no resolved value; the rendered key loads it directly after the foundation.
2. On a consuming element, set color or stroke from a single role token, e.g. `stroke: var(--state-held)` or `color: var(--state-held)`. A shape filled in a role takes FILL PAINT: `.surface-fill` with the role's value and its ink.
3. Leave an element with no asserted state neutral, and apply a neon role only to mark a state. A neutral filled shape takes FILL PAINT's neutral shape (`.surface-fill--neutral`), never `--state-neutral`, which is a foreground: in light it would leave the neutral node the darkest shape.
4. To name a state in words outside a review annotation, put `.state-label` and `data-state` on the document's bordered label, its words `State // <Role>`. To mark the blocks it governs, make it the first child of a `.surface-labeled-range`: the range's scope rail takes the role's value. Neutral takes no keyed label, and inside a Review Semantics annotation state keeps its square.
5. Where an element is owned elsewhere, say so as provenance: neutral metadata, or a neutral `Source // External` bordered label beside its state, or beside none. Never a state color.

```css
/* example — consuming surface; each node also carries .surface-fill, and a node with no state .surface-fill--neutral */
.node[data-state="earned"]   { --surface-fill-color: var(--state-earned);   --surface-fill-ink: var(--state-earned-ink); }
.node[data-state="held"]     { --surface-fill-color: var(--state-held);     --surface-fill-ink: var(--state-held-ink); }
.node[data-state="deflated"] { --surface-fill-color: var(--state-deflated); --surface-fill-ink: var(--state-deflated-ink); }
```

```html
<!-- example — a held architectural question, named in words over the blocks it governs -->
<div class="doc-group surface-labeled-range">
  <span class="doc-label surface-bordered-label state-label" data-state="held">State // Held</span>
  <p class="doc-body">Whether the search index belongs in the primary store or in a separate service is not yet settled.</p>
</div>

<!-- example — provenance beside a state: the neutral label carries no state color -->
<p class="doc-meta">
  <span class="doc-label surface-bordered-label state-label" data-state="partial">State // Partial</span>
  <span class="doc-label surface-bordered-label">Source // External</span>
  the shared token layer, inherited from upstream; runs here at bounded depth
</p>
```

## What is upstream vs consumer-local

- **Upstream (this repo):** the seven roles, their values, the evaluative sequence, the selection rule, each role's ink binding, the state label's and its range's bindings, and the rule that provenance is not a state. General; family-reusable. Consumers **inherit by reference and do not mint a divergent palette.**
- **Consumer-local (e.g.** [**asset-pipeline-ASK**](https://github.com/apexSolarKiss/asset-pipeline-ASK)**):** which element gets which state, evidence-depth qualifiers, risk flags, substrate markers, mode coverage, provenance records and evidence pointers. Those are data and metadata, not part of this color system.
