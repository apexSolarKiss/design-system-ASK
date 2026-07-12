# Three Functions

A semantic **function-color system**: a small, identity-free vocabulary of three role colors — `legislative`, `executive`, `judicial` — that marks which invariant structural **function** an element performs. Defined in [`three-functions.css`](three-functions.css); rendered visual key in [`three-functions.html`](three-functions.html).

It is a **specialized, opt-in foundation primitive** — for surfaces that encode a separation of functions in an apparatus (e.g. a method diagram whose parts author a rule, realize candidates under it, and select and close against it). It is **not** general UI color, and the static diagram scaffolds (`patterns/diagram-static-H/` / `-V/` / `-SEQ/` / `-FLOW/`) do **not** use it.

**Sibling to Spectral State, not a profile under it.** Spectral State (and its Evidence State profile) encodes the *state* of an element — the condition it is in. Three Functions encodes the *function* an element performs — an invariant structural role, not a state. Modeling it as a Spectral State profile would reproduce the category error the architecture exists to prevent: function is a different axis from state.

```text
semantic color
├── state
│   ├── Spectral State
│   └── Evidence State — profile under Spectral State
│
└── function / role
    └── Three Functions
        legislative · executive · judicial
```

**Not a palette expansion.** The three role values are existing ASK values — two emphasis accents (magenta, cyan) plus the neutral white / lavender-ASK identity value. This primitive is a new *semantic binding* over the closed palette, not a new hue.

> **Status: v0.1 — first authored, awaiting first-consumer proving.** Authorized by ASK source-of-intent (2026-07-12). The first consumer will be `method-ASK`'s bounded-generativity figure (by reference); `asset-pipeline-ASK` is the intended second consumer and the portability pressure test. Provisional-but-portable: the mappings are the stable, portable part; the role list is fixed at three.

## The three roles

| Role | Function it marks | ASK mapping |
| --- | --- | --- |
| `--function-legislative` | authors / carries the governing rule and the grant of permitted variance (the aperture) | `--ask-emphasis-magenta` · `#FF00FF` |
| `--function-executive` | realizes candidates under the rule; does not author it and does not judge the result | theme-neutral — `#FFFFFF` light · lavender-ASK `#D4C6E1` dark |
| `--function-judicial` | evaluates candidates against the standard, selects one, ratifies, and closes | `--ask-emphasis-cyan` · `#00BEFF` |

These are the three classical separation-of-powers functions read as color: who **makes** the rule, who **executes** under it, who **judges** against it. They are structural functions, invariant for an element — not states it passes through.

### The executive is deliberately hue-less

`executive` carries no emphasis hue. Its neutrality **is** the signal: execution fills the aperture but neither originates the norm nor closes the judgment. In light it is white (`#FFFFFF`); on the dark ink field pure white is too hot, so it resolves to lavender-ASK (`#D4C6E1`), the dark-mode neutral foreground value. `legislative` (magenta) and `judicial` (cyan) are the two hot points; the executive neutral reads by contrast between them.

## Per-theme resolution

| | legislative | executive | judicial |
| --- | --- | --- | --- |
| **Light** (on lavender) | magenta `#FF00FF` | white `#FFFFFF` | cyan `#00BEFF` |
| **Dark** (on ink) | magenta `#FF00FF` | lavender-ASK `#D4C6E1` | cyan `#00BEFF` |

Only `executive` flips per theme; the two emphasis accents already read on both fields, so `legislative` and `judicial` are theme-invariant. Per the foundation's theme model, the dark executive value appears in both the explicit `[data-theme="dark"]` block and the `prefers-color-scheme: dark` auto block.

## Rendering contract

Color is a **sparse semantic signal**, not a set of opaque blocks. A consuming surface keeps the restrained ASK field and marks function lightly:

```text
role stroke        full role value
role fill          role value at ~16% opacity  ·  color-mix(in srgb, <role> 16%, transparent)
label              standard theme foreground (--fg-1) — never the role hue
structural edges   neutral (frames, arrows, dimension lines stay --fg-* / --line-*)
```

The fill is a restrained wash (14–18%; 16% is the canonical value), never a solid slab. Labels stay the theme foreground so the role reads as a tint on structure, not as colored text. Color must remain **redundant** with the labels and geometry: the surface still communicates legislative / executive / judicial in monochrome.

## Coexistence with Spectral State and Evidence State

Three semantic axes may appear on one surface; they may not compete for one visual channel on one element.

```text
function role   ≠   element state   ≠   evidence state
```

**Reused hue does not create semantic identity.** `--function-legislative` and `--state-proposed` are both magenta; `--function-judicial` and `--state-held` are both named cyan. That is a shared hue *name*, **not** a shared token or resolved value — the function roles bind independently to the fixed emphasis accents, while `--state-*` are per-theme `hsl()` values, so they render differently (the magenta pair shares the 300° hue at different saturation/lightness; the two "cyans" are in fact different hues). These are **not** aliases: color proximity never turns different labels into the same meaning — the same discipline Evidence State applies to its *exact* reused values. Visible labels stay mandatory.

Channel contract when more than one system is present on an element:

```text
function role   → fill / principal node treatment
state           → outline, badge, or separate state marker
evidence state  → evidence marker, rail, dash, or labelled annotation
```

## Tiers

- **Tier 1 (identity-free):** the three `--function-*` role names — a stable vocabulary other ASK-family surfaces can reuse.
- **Tier 2 (ASK design language):** the mappings to ASK palette values (magenta, the theme-neutral executive, cyan) and the per-theme executive resolution.
- **No Tier 3.** This primitive carries no instance identity.

## How to use it

1. Load `colors_and_type.css` first (Three Functions relies on its theme resolution + palette tokens), then `three-functions.css`.
2. On a consuming element, set the stroke from a single role token and a restrained translucent fill from the same value:

   ```css
   /* example — consuming surface */
   .part[data-function="legislative"] {
     stroke: var(--function-legislative);
     fill:   color-mix(in srgb, var(--function-legislative) 16%, transparent);
   }
   ```

3. Keep labels at `--fg-1` and structural edges neutral. Color only the parts that perform a function; leave everything else on the neutral field.
4. If the surface also carries state or evidence color, assign them to different channels (outline / marker / rail), never the same fill.

## Worked example — the bounded-generativity figure (first consumer)

`method-ASK`'s bounded-generativity figure binds the three functions to its domain parts:

- **legislative → the `grammar / brief` box** — it grants the aperture (authors the rule).
- **executive → the realization chamber and its candidate glyphs** — generation fills the aperture, nonjudgmental (a faint neutral wash on the field, not one opaque slab).
- **judicial → the selection ring and the ratified candidate** — evaluation, selection, closure.

Everything else stays **neutral**, and those exclusions are load-bearing:

- **source of intent / normative apex** — coloring it legislative would collapse *source of intent* into the legislative function;
- **the aperture dimension and iris geometry** — coloring a *quantity* would make it look like an actor;
- **the outer bounded-generativity frame, the dotted authorized-judgment path, artifact governance, and the governed artifact + record** — carrying judicial cyan up into governance would imply *selection = governance*, and coloring the connecting arrows would suggest function propagates along the chain.

Artifact governance stays downstream and outside the three-function palette — it is not a fourth color. This binding is **consumer-local**: the primitive is the three identity-free roles; the domain mapping and the neutral exclusions belong to the consuming figure.

## What is upstream vs consumer-local

- **Upstream (this repo):** the three role names, their ASK mappings, the per-theme executive resolution, the rendering contract, and the channel-coexistence rule. General; family-reusable. Consumers inherit by reference and do not mint a divergent palette.
- **Consumer-local (e.g. `method-ASK`, `asset-pipeline-ASK`):** which element performs which function, the domain vocabulary, the neutral exclusions, and the surface layout. Those are the application, not the color system.
