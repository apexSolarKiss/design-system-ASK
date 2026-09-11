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

> **Status: v0.2 — semantic generation.** Authorized by ASK source-of-intent (2026-07-12; source-role correction 2026-09-11). **Landed public consumption is recorded in [`CONSUMERS.md`](CONSUMERS.md), which remains the record of what consumers have actually landed.** The v0.2 bounded-generativity binding is documented in the worked example below as the **upstream semantic contract**, not as a claim about any consumer's current rendering. A landed consumption record is not, by itself, a portability, usability, or generality verdict. **v0.2 changes which elements qualify for `legislative`, not how the role renders once assigned** — no role token, palette binding, selector, cascade or resolved value changes. The role list is fixed at three and the role-to-palette mappings are unchanged and remain the portable part; the **admissible population of `legislative`** is what this generation revises. v0.1 held that colouring the source-of-intent apex legislative would collapse source of intent into the legislative function; v0.2 corrects that.

## The three roles

| Role | Function it marks | ASK mapping |
| --- | --- | --- |
| `--function-legislative` | adopts or authorizes the governing standard, or carries it into operative scope through a grammar, brief, rule, or grant; the grant produces the aperture | `--ask-emphasis-magenta` · `#FF00FF` |
| `--function-executive` | realizes candidates under the rule; does not author it and does not judge the result | theme-neutral — `#FFFFFF` light · lavender-ASK `#D4C6E1` dark |
| `--function-judicial` | evaluates candidates against the standard, selects one, ratifies, and closes | `--ask-emphasis-cyan` · `#00BEFF` |

These are the three classical separation-of-powers functions read as color: who **makes** the rule, who **executes** under it, who **judges** against it. They are structural functions, invariant for an element — not states it passes through.

### What performs the legislative function, and what sits around it

`legislative` is one function, and more than one kind of thing stands near it. Some of those things **perform** it; the rest sit outside it and take no role colour. The role colour does not draw this line, so the surface must.

```text
source-of-intent / normative-apex ROLE     constitutive legislative source — it adopts or
                                           authorizes the governing standard
grammar · brief · rule · grant             delegated legislative apparatus, WHERE IT CARRIES THE
                                           GOVERNING STANDARD INTO OPERATIVE SCOPE
artifact of intent                         classified by WHAT IT DOES: legislative where it acts
                                           as the grammar, brief, rule or grant — NOT legislative
                                           merely because it carries intent
─────────────────────────────────────────  ──────────────────────────────────────────────────────
standing intent                            adopted normative content. NO function colour merely
                                           because it is normative content
passive storage · citation · routing ·     neutral carriage
  relay · preservation
aperture                                   bounded permission PRODUCED BY the grant — a neutral
                                           quantity, not apparatus
aperture dimension · iris geometry         neutral representation of that quantity
```

The entries above the divider identify things that perform the legislative function **under the stated conditions**. The entries below do not, and none takes `--function-legislative`.

**The grant and the aperture are two objects.** The grant is apparatus and may be legislative; the aperture is the permission the grant produces, and colouring a quantity would make it look like an actor.

**The role is not the actor.** Classifying a *role* within a function makes neither the role identical to the function nor the person or institution occupying it exhausted by that function. The same actor may occupy a legislative role and a judicial one without collapsing either, so this contract does **not** say that an occupying actor is legislative only.

**Constitutive and delegated legislation share one identity.** Both take `--function-legislative`. Hierarchy between them is carried by topology, labels and geometry — never by a second magenta, an opacity rank, or a fourth role.

### The executive is deliberately hue-less

`executive` carries no emphasis hue. Its neutrality **is** the signal: execution fills the aperture but neither originates the norm nor closes the judgment. In light it is white (`#FFFFFF`); on the dark ink field pure white is too hot, so it resolves to lavender-ASK (`#D4C6E1`), the dark-mode neutral foreground value. `legislative` (magenta) and `judicial` (cyan) are the two hot points; the executive neutral reads by contrast between them.

## Conceptual anchor — the Montesquieu spine

Three Functions renders the separation between **rule-making, execution, and judgment** as semantic role color — the classical separation of powers (Montesquieu) read onto a surface. *"Three Functions"* names the reusable vocabulary; *"the Montesquieu spine"* names its conceptual lineage. The lineage is what makes the mapping mean something — it is why `legislative`, `executive`, and `judicial` are the roles and why they are distinct — but the primitive is named for what it does, so it stays legible beside the literal `Spectral State` / `Evidence State` and portable to any surface that instantiates the same rule → execution → judgment separation.

The abstraction is **domain-general but not role-agnostic.** Its three roles are fixed. A future three-part model does not reuse these tokens merely because it also has three parts — Three Functions is the separation-of-powers triptych specifically, not a generic palette for arbitrary triads.

## Per-theme resolution

| | legislative | executive | judicial |
| --- | --- | --- | --- |
| **Light** (on lavender) | magenta `#FF00FF` | white `#FFFFFF` | cyan `#00BEFF` |
| **Dark** (on ink) | magenta `#FF00FF` | lavender-ASK `#D4C6E1` | cyan `#00BEFF` |

Only `executive` flips per theme; the two emphasis accents already read on both fields, so `legislative` and `judicial` are theme-invariant. Per the foundation's theme model, the dark executive value appears in both the explicit `[data-theme="dark"]` block and the `prefers-color-scheme: dark` auto block.

## Rendering contract

Color is a **sparse semantic signal**, not a set of opaque blocks. A consuming surface keeps the restrained ASK field and marks each role-bearing apparatus at one intensity:

```text
role stroke       full role value
role fill         30%  ·  color-mix(in srgb, <role> 30%, transparent)
label             standard theme foreground (--fg-1) — never the role hue
structural edges  neutral (frames, arrows, dimension lines stay --fg-* / --line-*)
```

Every **role-bearing apparatus** — a labelled box, a bounded field or chamber, a selected node — carries a **30%** fill and the full role value as stroke. The field-vs-object distinction is carried by **geometry and negative space, not opacity**: a large field reads as a field because it is large and because the artifacts inside it are cut *out* of it — not because its wash is lighter. Labels stay the theme foreground so the role reads as a tint on structure, not as colored text. Color must remain **redundant** with the labels and geometry: the surface still communicates legislative / executive / judicial in monochrome.

**Semantic function color attaches to the role-bearing apparatus, not automatically to the artifacts produced inside it.** A function that *produces* things — an executive field emitting candidates — colors the **field**; the candidates it emits stay neutral content, rendered as **negative cutouts** (holes) through the field with neutral outlines, never a second role fill. The 30% fill is the rendering contract, not a palette addition — the three role colors are unchanged.

## Non-function elements

A consuming surface often contains consequential elements that are **not** functions — most commonly a **downstream governance** step that binds the accepted result. Represent these in the **existing neutral structural treatment**; they take no role color.

When a legend or key enumerates the three functions, a prominent neutral element (a governance box, an output node) can be left unexplained. If so, key it with **one neutral exemplar** under a separated, explicitly-labelled heading — a dotted legend-only divider, then a single neutral swatch (matching the scale and grammar of the three function swatches) under a label such as *"downstream — not a fourth function."* The key identifies the element's **visual treatment**; it does **not** reproduce the consuming surface's topology (no process chain, no arrows), and it is never a fourth colored swatch.

This creates **no fourth role and no fourth color.** There is no `--function-governance`. The separated row is explanatory: it teaches the reader that a consequential element sits *outside* the three functions — exactly the boundary the primitive holds.

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

1. Load `colors_and_type.css` first (Three Functions relies on its theme resolution and palette tokens), then `three-functions.css`.
2. On a consuming element, set the stroke from a single role token and a restrained translucent fill from the same value:

   ```css
   /* example — consuming surface */
   .part[data-function="legislative"] {              /* discrete role object → 30% */
     stroke: var(--function-legislative);
     fill:   color-mix(in srgb, var(--function-legislative) 30%, transparent);
   }
   .field[data-function="executive"] {               /* a bounded field is a role-bearing apparatus → 30% */
     fill:   color-mix(in srgb, var(--function-executive) 30%, transparent);
   }
   ```

3. Keep labels at `--fg-1` and structural edges neutral. Color only the parts that perform a function; leave everything else on the neutral field.
4. If the surface also carries state or evidence color, assign them to different channels (outline / marker / rail), never the same fill.

## Worked example — bounded-generativity binding

For the bounded-generativity model — first instantiated by [`method-ASK`](https://github.com/apexSolarKiss/method-ASK) — Three Functions v0.2 binds the three functions to the domain parts as follows. This is the **upstream semantic contract**; what any consumer has actually landed is recorded in [`CONSUMERS.md`](CONSUMERS.md), not here.

- **legislative → the source-of-intent / normative-apex role as constitutive source, and the `grammar / brief` box as delegated apparatus** — the apex adopts or authorizes the governing standard; the `grammar / brief` carries it into operative scope, and its grant produces the aperture.
- **executive → the bounded-realization chamber** — the apparatus carries a 30% executive fill; generation fills the aperture, nonjudgmental. The **candidate glyphs are variance the chamber produces — content, not executive-function objects** — so they are rendered as **negative cutouts through the wash with neutral outlines** (consumer-local): the field reads as executive, the candidates read as uncommitted variance.
- **judicial → the selection ring and the candidate it ratifies** — evaluation, selection, closure. The ratified candidate is judicial's closed output, no longer neutral chamber variance — which is why it, alone among the glyphs, takes a role fill.

Everything else stays **neutral**, and those exclusions are load-bearing:

- **the aperture dimension and iris geometry** — coloring a *quantity* would make it look like an actor;
- **the outer bounded-generativity frame, the dotted authorized-judgment path, artifact governance, and the governed artifact with its governance record** — carrying judicial cyan up into governance would imply *selection = governance*, and coloring the connecting arrows would suggest function propagates along the chain.

Artifact governance stays downstream and outside the three-function palette — it is not a fourth color. This binding is **consumer-local**: the primitive is the three identity-free roles; the domain mapping and the neutral exclusions belong to the consuming figure.

## What is upstream vs consumer-local

- **Upstream (this repo):** the three role names, their ASK mappings, the per-theme executive resolution, the rendering contract, and the channel-coexistence rule. General; family-reusable. Consumers inherit by reference and do not mint a divergent palette.
- **Consumer-local (e.g. [`method-ASK`](https://github.com/apexSolarKiss/method-ASK), [`asset-pipeline-ASK`](https://github.com/apexSolarKiss/asset-pipeline-ASK)):** which element performs which function, the domain vocabulary, the neutral exclusions, and the surface layout. Those are the application, not the color system.
