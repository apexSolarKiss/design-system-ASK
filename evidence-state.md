# Evidence State

A semantic state-color **profile** under the Spectral State family. Where [`spectral-state.md`](spectral-state.md) encodes the state of *architectural elements*, Evidence State encodes epistemic **evidence state** — what the available evidence supports about a scoped claim. Defined in [`evidence-state.css`](evidence-state.css); rendered visual key in [`evidence-state.html`](evidence-state.html).

It is a **sanctioned profile, not a separate palette and not a change to Spectral State.** Spectral State's architectural-element vocabulary is its own. This profile **binds its roles directly to the foundation's physical values**, the same physical colors Spectral State and the other profiles bind: a shared value is a shared family, never a shared meaning.

> **Status: v0.5 // traffic-light coherence (ASK, 2026-11-25).** `partially-supported` takes the yellow and `weakened` the orange, and a new role, **`contradicted`**, takes the red. Each role binds its physical value directly from the foundation, not through a Spectral State role. `weakened` is narrowed: material adverse evidence undermines the scoped claim without sufficient grounds to reject it; it is no longer a tonal derivative of `partial`. Brown leaves the profile: the foundation keeps its value, with no semantic assignment. On a scope rail `supported` takes green's rail paint, `partially-supported` yellow's and `contradicted` red's; `unresolved` and `weakened` keep the plain stroke. Each chromatic role's ink is its fill color's: `supported` on green, `partially-supported` on yellow, `weakened` on orange, `contradicted` on red and `unresolved` on cyan. Re-sync this file with [`spectral-state.css`](spectral-state.css), [`surface-treatments.css`](surface-treatments.css) and [`colors_and_type.css`](colors_and_type.css) from the same owner commit. A consumer's existing `weakened` records keep their role: where one was assigned under the earlier, broader reading, its owner reviews it; nothing here reassigns it.
>
> **v0.4 // each role's ink, and an evidence role in words.** Each chromatic role names its ink on a fill, `--evidence-<role>-ink`, bound by reference to the ink [`surface-treatments.css`](surface-treatments.css)'s FILL PAINT keys by the fill color: `supported` on green, `partially-supported` on orange, `unresolved` on cyan and `weakened` on brown, whose ink is the lavender in both themes. `not-yet-testable` has no ink and is never filled. Outside a multi-axis review annotation, a chromatic role may be named on a keyed bordered label, `.evidence-label` with `data-evidence`, whose words are exactly `Evidence // <Role>`, and a labeled range that label opens takes the role's value on its scope rail, with green's rail paint for `supported` (An evidence role in words, below). `not-yet-testable` takes no keyed label and keeps its note, and inside a Review Semantics annotation evidence keeps its dot. `weakened`'s value, the foundation's brown, moves to a darker, redder chocolate, `hsl(21, 41.8%, 38%)`, `#895538` (ASK, 2026-11-18); the other role values are unchanged. Re-sync this file with `surface-treatments.css` and `colors_and_type.css` from the same owner commit.
>
> **v0.3 // its two values defined in the foundation.** `weakened` and `not-yet-testable` take `var(--ask-state-value-brown)` and `var(--ask-state-value-lavender-gray)`, the foundation's reserved state values in [`colors_and_type.css`](colors_and_type.css), as [Spectral State](spectral-state.md) v1.3's own values do; the values are unchanged. Re-sync this file with `colors_and_type.css` from the same owner commit.
>
> **v0.2 // one value per role in both themes.** As [Spectral State](spectral-state.md) v1.2: `weakened` is `hsl(30, 45%, 48%)` and `not-yet-testable` `hsl(264, 8%, 53%)` on either field, the former dark-theme brown and the former light-theme gray. The three reused roles move with Spectral State: `supported` and `partially-supported` each take one value, and `unresolved` the foundation cyan, a hue of about 195° where it was 180°. Role names and the `not-yet-testable` presentation contract (lavender-gray, dashed rail, hollow marker, visible label) are unchanged.
>
> **v0.1 // first generalized profile.** Authorized by ASK source-of-intent (2026-06-18) as a reusable profile rather than a one-off. First consumer is [`urban-observatory`](https://github.com/apexSolarKiss/urban-observatory) (a domain-partner consumer, by reference). Provisional-but-reusable: the role list may firm up as the profile sees more use; the two new values are the stable, portable part.

## The six roles

| Evidence meaning | Physical value | Shared family |
| --- | --- | --- |
| `supported` | green, `--ask-state-value-green` | affirmative |
| `partially-supported` | yellow, `--ask-state-value-yellow` | qualified |
| `weakened` | orange, `--ask-state-value-orange` | materially undermined |
| `contradicted` | red, `--ask-state-value-red` | negative |
| `unresolved` | cyan, `--ask-emphasis-cyan` | open |
| `not-yet-testable` | lavender-gray, `--ask-state-value-lavender-gray`, with a dashed rail and a hollow marker | off the arc |

Each role means, for one scoped claim under its stated conditions:

- **`supported`** // available evidence supports the claim.
- **`partially-supported`** // available evidence supports only a bounded part or a qualified extent of the claim.
- **`weakened`** // material adverse evidence undermines the claim, without sufficient grounds to reject it.
- **`contradicted`** // current evidence provides sufficient grounds to reject the claim as stated, within its declared scope and conditions; the assignment may change with new evidence.
- **`unresolved`** // no sufficiently grounded positive or adverse disposition is warranted.
- **`not-yet-testable`** // a meaningful test is unavailable at the current stage; ordinary missing or uncollected evidence is not enough.

**Thresholds are not shortcuts.** A declining confidence number alone does not establish `weakened`, and a contrary observation alone does not establish `contradicted` without the claim's scope. Evidence State records what the available evidence supports; **it is not a verdict on what is true**, and supported evidence need not describe a desirable outcome.

**Labels stay evidence labels.** A consuming surface keeps **Supported**, **Partially supported**, **Weakened**, **Contradicted** and **Unresolved**, and never relabels them `earned` / `partial` / `deflated` / `held`, or by a review or assessment word, because a color value is shared. The physical values are a shared family: green affirmative, yellow qualified, orange materially undermined and red negative, each within the question its own system asks. That is not a universal ranking: Contradicted is not a declined review, and a supported claim is not an accepted one.

## Not yet testable

`not-yet-testable` is **off** the chromatic arc entirely: a neutral lavender-gray for "a meaningful test cannot exist yet at this stage" (distinct from `unresolved`, an open question being worked, and from a neutral field with no asserted state). Color alone is **not** sufficient. Its presentation contract is mandatory:

```text
neutral lavender-gray  +  dashed rail  +  hollow marker  +  visible label
```

## Each role's ink

Each chromatic role also names its ink, `--evidence-<role>-ink` (`--evidence-supported-ink`, `--evidence-partially-supported-ink`, `--evidence-weakened-ink`, `--evidence-contradicted-ink` and `--evidence-unresolved-ink`): the color of text set on a shape filled in that role's color. The bindings are here; the values are FILL PAINT's, in [`surface-treatments.css`](surface-treatments.css), which keys each ink by the fill color — `supported` on green, `partially-supported` on yellow, `weakened` on orange, `contradicted` on red and `unresolved` on cyan — so an unresolved shape and a held node, one cyan, take one ink. This file defines no ink value. A filled shape keeps its evidence label visible, on the shape or beside it. **`not-yet-testable` has no ink and is never filled:** its contract is hollow, dashed and labeled.

## An evidence role in words

Outside a multi-axis review annotation, for a statement in a report, a figure or a table, what the evidence supports may be named in words on the surface treatments' **bordered label** ([`surface-treatments.css`](surface-treatments.css), BORDERED LABEL): `.evidence-label` on a `.surface-bordered-label`, `.doc-label` in a document, with `data-evidence`. Its words are exactly the axis and the role's word, `Evidence // Supported` or `Evidence // Contradicted`, so the evidence labels stay evidence labels and a green edge never reads as an earned state or an accepted review. Its edge takes the role's value. A **labeled range** whose first child is that label takes the same value on its scope rail (LABELED RANGE), with green's rail paint for `supported`, yellow's for `partially-supported` and red's for `contradicted` (RAIL PAINT); `weakened` and `unresolved` keep the plain stroke. The bindings are here; the box, the rail and each paint are the surface treatments'.

- **Words, not a control.** The label is inert and unfilled: no ink, hover, press or focus.
- **`not-yet-testable` takes no keyed label and no scope rail.** It is never a solid edge or a solid rail: it keeps its whole contract, lavender-gray, a dashed rail, a hollow marker and its visible label, as in Review Semantics' not-yet-testable note.
- **Inside Review Semantics, the dot.** Within a multi-axis review annotation evidence keeps its dot, beside its label: a keyed label never sits in the composition's rows, items, lists or notes.
- **The class, the attribute and the words together.** A bare `data-evidence` keys nothing, and a label whose words do not name its axis and role is not an evidence label. `tools/role-conformance.js` checks the key (C13.key), the label's edge (C13.color) and the range's rail (C14.color).

## The words carry the distinction

Two pairs sit close: Supported beside Partially supported, green beside yellow, and Weakened beside Contradicted, orange beside red. Simulated color-vision output is not user testing, and it does not establish that either pair reads apart. **The visible words carry each role**, on its label, beside its dot or its shape, or in a key. In a review annotation the dot tells evidence from a state's square, across two axes; it does not tell two evidence roles apart. The sparse-signal discipline carries over from Spectral State: a node takes color only to say something.

## Tiers

- **Tier 1 (identity-free):** the `--evidence-*` role names and the `.evidence-label` class — a stable vocabulary other ASK-family surfaces can reuse.
- **Tier 2 (ASK design language):** the six role values, each bound directly from the foundation ([`colors_and_type.css`](colors_and_type.css)): four of its reserved state values (green, yellow, orange, red), its emphasis cyan, and lavender-gray `hsl(264, 8%, 53%)`, one value each in both themes.
- **No Tier 3.** This profile carries no instance identity.

## How to use it

1. Load `colors_and_type.css` first, then `spectral-state.css` and `evidence-state.css`, in that order, with `surface-panel.css` and `surface-treatments.css` (whose FILL PAINT supplies the inks the `--state-*-ink` and `--evidence-*-ink` bindings name, and whose bordered label and labeled range draw the keyed labels and ranges the two files bind), all from one design-system commit. `spectral-state.css` and `evidence-state.css` declare custom properties only: role values and inks on `:root`, and the keyed label's and range's color and paint properties on their own selectors, which no other module sets on those elements. So their place beside the other two, which keep their own order, changes no resolved value; the rendered key loads them directly after the foundation.
2. On a consuming element, set color or stroke from a single role token, e.g. `stroke: var(--evidence-supported)` or `color: var(--evidence-contradicted)`. A shape filled in a chromatic role takes FILL PAINT: `.surface-fill` with the role's value and its ink, `--evidence-<role>-ink`. `not-yet-testable` is never filled.
3. For `not-yet-testable`, apply the full presentation contract (lavender-gray + dashed rail + hollow marker + visible label) — never color alone.
4. Keep the evidence labels visible; never relabel a role by a Spectral State, review or assessment name.
5. Assign `weakened` and `contradicted` by their thresholds, against the claim's declared scope and conditions. An existing `weakened` record assigned under the earlier, broader reading is its owner's to review; this profile reassigns nothing.
6. In a document, the [Review Semantics](review-semantics.md) annotation composition shows an evidence role as a labeled dot and keeps the `not-yet-testable` contract whole. Evidence State's other presentations are unaffected.
7. To name a statement's evidence in words outside a review annotation, put `.evidence-label` and `data-evidence` on the document's bordered label, its words `Evidence // <Role>`, for `supported`, `partially-supported`, `weakened`, `contradicted` or `unresolved`. To mark the blocks it governs, make it the first child of a `.surface-labeled-range`: the range's scope rail takes the role's value. `not-yet-testable` takes neither; outside the composition it keeps its whole contract.

```css
/* example — consuming surface; each filled node also carries .surface-fill, and a not-yet-testable node never does */
.node[data-evidence="supported"]           { --surface-fill-color: var(--evidence-supported);           --surface-fill-ink: var(--evidence-supported-ink); }
.node[data-evidence="partially-supported"] { --surface-fill-color: var(--evidence-partially-supported); --surface-fill-ink: var(--evidence-partially-supported-ink); }
.node[data-evidence="weakened"]            { --surface-fill-color: var(--evidence-weakened);            --surface-fill-ink: var(--evidence-weakened-ink); }
.node[data-evidence="contradicted"]        { --surface-fill-color: var(--evidence-contradicted);        --surface-fill-ink: var(--evidence-contradicted-ink); }
.node[data-evidence="unresolved"]          { --surface-fill-color: var(--evidence-unresolved);          --surface-fill-ink: var(--evidence-unresolved-ink); }
.node[data-evidence="not-yet-testable"]    { color: var(--evidence-not-yet-testable);
                                             border-left: 2px dashed var(--evidence-not-yet-testable); }
```

```html
<!-- example — a statement's evidence, named in words over the blocks it governs; the claim and its figures are illustrative -->
<div class="doc-group surface-labeled-range">
  <span class="doc-label surface-bordered-label evidence-label" data-evidence="partially-supported">Evidence // Partially supported</span>
  <p class="doc-body">Read latency stays under 40 ms at the expected load: measured in two of three regions.</p>
</div>
```

## What is upstream vs consumer-local

- **Upstream (this repo):** the six role names, their meanings and thresholds, each role's binding to a physical value, each chromatic role's ink binding (`--evidence-*-ink`) to FILL PAINT, the evidence label's and its range's bindings, and the `not-yet-testable` presentation contract. General; family-reusable. Consumers inherit by reference and do not mint a divergent palette.
- **Consumer-local (e.g. [`urban-observatory`](https://github.com/apexSolarKiss/urban-observatory)):** which claim carries which evidence state and on what recorded scope and basis, evidence-depth qualifiers, change-state (revised / deferred) badges, source pointers, and the surface layout. Those are data and metadata, not part of this color profile. `urban-observatory` consumes Evidence State **by reference as a domain-partner consumer**; the surfaces stay separate sources of repo truth under one ASK source-of-intent.
