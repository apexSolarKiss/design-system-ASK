# Design System // ASK

![design-system-ASK banner](design-system-ASK-banner.jpg)

> Minimal design foundations for the ASK visual identity. Tokens remain irreducible; the repo may also carry artifact inheritance scaffolds and opt-in semantic primitives that show downstream surfaces how to consume them without redefining them.
>
> **order from chaos // beauty in systems**

The line above is the ASK master tagline. It is canonically defined in `brand-architecture.md` (in ASK's context system, not this repo) — displayed here, not defined here. See the Voice section below for the protected-payload rule.

This repo, `design-system-ASK`, is the reference implementation of the ASK design family.

This repo conforms to **`visual-identity-system.md`** in ASK's canonical context as the source of truth. The files here are a downstream implementation; when the two disagree, the canonical file wins.

---

## What this is

A foundational design system for **ASK** — a meta-brand expressed through a single wordmark, two diagonal gradients, and a deliberately small set of colors and weights. The system is reductive on purpose. Interface and interaction state is expressed through **weight, opacity, and motion** — never by introducing a hue outside the named set. The **foundation-level** opt-in exceptions are the ASK semantic-color primitives for data and architecture visualizations — Spectral State (element *state*) and Three Functions (structural *function*), below — not general UI color, and neither expands the palette. A separate **pattern-local participant-identity vocabulary** exists only inside `message-archive`; it is not a foundation primitive and does not open the unrestricted general palette.

Scope is the meta-brand. Sub-brand theming (production, builder, artist) layers on top of these tokens elsewhere; it does not live here.

### Source materials
- `assets/logo-ASK.svg` — primary vector wordmark, `fill: currentColor`
- `assets/logo-ASK-white.png` — raster wordmark, white on transparent (light-mode pairing)
- `assets/logo-ASK-lavender-ASK.png` — raster wordmark, lavender-ASK on transparent (dark-mode pairing)
- Canonical spec: `visual-identity-system.md` (in ASK's canonical context, not in this repo)
- Operator-side vector working source: `ASK 9 4.ai` (Illustrator file, not in this repo by design — production assets only)

---

## Scope

This repo carries three kinds of material:

1. **Foundations** — tokens, type, color, assets, and visual rules. The irreducible expression of the system and the inheritance source for other ASK-family surfaces.
2. **Artifact-inheritance scaffolds** — small, auditable patterns, added when earned, that show consuming projects how to inherit the foundations without redefining them. A scaffold may be wholly static, or may carry self-contained client-side navigation and still freeze for audit; either way it **inherits at generation time and seals**.
3. **Surface patterns** — page-shell contracts for **live deployed surfaces**. They frame a page that stays live, and they **do not seal**: a consumer references or vendors the pattern and re-syncs when it changes, rather than freezing an output for audit. `surface-shell` is the one instance.

The distinction in 2 versus 3 is the lifecycle, and it is load-bearing. An artifact scaffold produces something finished and frozen. A surface pattern produces something that keeps running. Do not apply sealing, freezing, or generation-time inheritance rules to a surface pattern.

These are consumption patterns, not components. They are not a generator, not a build pipeline, not an npm package, and not a component library. The catalog holds **two artifact classes plus one separate surface-pattern group**:

- **Class A** — system / architecture diagram templates, in two kinds:
  - **static:** **`diagram-static-H`** (horizontal left→right top-aligned cascade), **`diagram-static-V`** (vertical top→down centered spine), **`diagram-static-SEQ`** (ordered top→down arrowed sequence — succession, not hierarchy), and **`diagram-static-FLOW`** (convergence flow — many sources converging into a resolved spec, realized, evaluated, governed, fed back) — structural; state-free.
  - **interactive:** **`diagram-interactive-spine`** — a navigable, stateful IA state surface that consumes the Spectral State primitive for node color. The taxonomy encodes static-vs-interactive, not just orientation (the interactive spine is also vertical).
- **Class B** — project-output artifact templates: **`output-artifact`** (static document) and **`message-archive`** (sealed interactive archive — offline search + navigation over frozen content). Client-side navigation over embedded content does not make an artifact Class A and does not earn a new class.
- **Surface patterns** — the separate group, not a third artifact class: **`surface-shell`** (the shared header, control slot, and flush-right footer that make a family of surfaces read as one artifact family with different payloads). It frames a live page and seals nothing, so it is neither a diagram nor a sealed output artifact. **It is not "Class C"** — one instance does not earn a taxonomy, and this is a named group rather than a class.

Artifact scaffolds — Class A and Class B only — inherit at generation time and freeze for audit. A sealed interactive artifact may retain client-side navigation over embedded content; it introduces no live data dependency. Downstream projects supply their own Tier 3 identity, their own source-truth posture, and their own content and domain structure. Hosting a scaffold here does not make this repo the owner of downstream project content.

The repo may also carry **specialized opt-in foundation primitives** beyond the core tokens — small, identity-free systems a surface loads only when it needs them. These are the *foundation-level* bounded exceptions; a **pattern-level** bounded vocabulary also exists (see below). The first foundation primitive is **ASK Spectral State** (`spectral-state.css`), a semantic state-color system for surfaces that encode element *state*. It is not general UI color, and the **static** scaffolds above do not use it; the interactive `diagram-interactive-spine` is the state-bearing member that does.

Bounded color exceptions sit on three distinct axes, and none of them opens the general palette: **semantic state** — Spectral State and its sanctioned profiles (e.g. Evidence State); **structural function** — Three Functions; and **participant identity** — the Class B `message-archive` participant ramp. The first two are opt-in *foundation primitives*; the third is **pattern-local** — it lives inside `patterns/message-archive/`, is not a foundation token, and authorizes no use outside that pattern. No other values are available as unrestricted general-purpose colors.

A primitive may carry sanctioned **profiles** for adjacent semantic domains. The first is **ASK Evidence State** (`evidence-state.css`), an epistemic evidence-state vocabulary built on Spectral State: it reuses three Spectral State values by reference and adds two evidence-specific roles (`weakened`, `not-yet-testable`), leaving Spectral State's own vocabulary unchanged.

A second opt-in primitive, **ASK Three Functions** (`three-functions.css`), sits **alongside** Spectral State on a different axis: where Spectral State encodes an element's *state*, Three Functions encodes its *function* — `legislative` / `executive` / `judicial`, the three separation-of-powers roles read as color. It is a **sibling** primitive, not a Spectral State profile, and it expands no palette: the three roles bind to existing ASK values (magenta, the neutral white / lavender-ASK, cyan).

---

## Index

| Path | What it is |
| --- | --- |
| `colors_and_type.css` | CSS variables — colors, type, spacing, radii, motion |
| `spectral-state.css` + `spectral-state.md` + `spectral-state.html` | ASK Spectral State — specialized **opt-in** state-color primitive (eight `--state-*` roles — seven neon signals plus `neutral`, which resolves to the theme foreground — on a 12-hue wheel), with a rendered visual key (`spectral-state.html`). For surfaces that encode element *state*; not general UI color. Layers on top of `colors_and_type.css`. |
| `evidence-state.css` + `evidence-state.md` + `evidence-state.html` | ASK Evidence State — a sanctioned **profile** under Spectral State (epistemic evidence-state). `supported` / `partially-supported` / `unresolved` reuse Spectral State values by reference; **`weakened`** (muted 30° brown) and **`not-yet-testable`** (lavender-gray, dashed/hollow) are new roles. Rendered key in `evidence-state.html`. Layers on top of `spectral-state.css`; Spectral State's own vocabulary is unchanged. |
| `three-functions.css` + `three-functions.md` + `three-functions.html` | ASK Three Functions — specialized **opt-in** function-color primitive (three `--function-*` roles: `legislative` magenta / `executive` theme-neutral white·lavender-ASK / `judicial` cyan), a **sibling** to Spectral State on the function axis (not a profile). Binds existing ASK values to roles; no palette expansion. Rendered key in `three-functions.html`. Layers on top of `colors_and_type.css`. |
| `surface-panel.css` | **Opt-in live-surface visual rule** — the shared visual contract for live content panels: chrome (`.surface-panel`), primary label (`.surface-panel-title`), supporting copy (`.surface-panel-support`), and the interaction contract for a panel that is *itself* a link (`a.surface-panel`). It owns **presentation only** — no markup, no semantics, no template, no generated preview. Two semantic forms can share this appearance without sharing structure or behavior: a full-panel native link, and an inert panel containing consumer-owned links or actions. It deliberately does **not** own support-copy foreground, and it assigns no interaction to inert panels. Not a component, not a surface pattern, not an artifact scaffold |
| `surface-action.css` | **Opt-in live-surface visual rule** — the shared visual contract for compact action controls, and the sibling of `surface-panel.css` on the action axis: the control itself (`.surface-action`), its foreground-only quieter variant (`.surface-action--secondary`), and one inherited hover / press / focus contract. It owns **presentation and interaction only** — never element type, destination, copy, action-row layout, or placement, so the same grammar styles an `<a>` that navigates and a `<button>` that acts without changing what either one is. Not for full-panel links, theme selectors, lightbox or gallery-overlay triggers, badges, or non-interactive labels — and not for inline text links, which `surface-text-link.css` owns. Not a component, not a surface pattern, not an artifact scaffold |
| `surface-text-link.css` | **Opt-in live-surface visual rule** — the shared visual contract for the **unboxed textual traversal affordance** (`.surface-text-link`): a link inside running prose or a structural title, which unlike a panel or a compact action has no geometry announcing that it is operable. It owns **presentation only** — no markup, no semantics, no destination, no layout, no template, no generated preview — and it deliberately declares **no text color**, so an ordinary link inherits its context's foreground and a role-colored anchor keeps its own. The resting underline is magenta mixed toward `--fg-1` and resolved against the active theme, held to the 3:1 non-text contrast floor because it is the only cue; hover raises the same accent to full value; focus is an independent high-contrast indicator. Opt-in **by class** on purpose: the excluded set — panels, actions, cards, gallery launches, marks, linked figures — is open-ended, and a missing class degrades to a visible foundation underline while a too-narrow deny-list would silently give a shaped object the textual grammar. Not a component, not a surface pattern, not an artifact scaffold |
| `fonts/InterVariable.woff2` + italic | Inter variable webfont, OFL |
| `fonts/JetBrainsMono.woff2` + italic | JetBrains Mono variable webfont, OFL |
| `assets/logo-ASK.svg` | Vector wordmark, **primary** — `fill: currentColor`; the consuming surface sets `currentColor` to the mode-specific wordmark pairing |
| `assets/logo-ASK-white.png` | Raster wordmark in `#FFFFFF`, on transparent (light-mode pairing / fallback) |
| `assets/logo-ASK-lavender-ASK.png` | Raster wordmark in lavender-ASK (`#D4C6E1`), on transparent (dark-mode pairing / fallback) |
| `preview/styleguide.html` | Live token styleguide — the single canonical preview surface |
| `styleguide-theme-control.js` | The style guide's forced-mode selector (auto / light / dark). **Style-guide-only; not vendored, and not part of `surface-shell`.** An inspection surface needs to hold a mode fixed; ordinary public surfaces follow the operating system and load nothing. |
| `SKILL.md` | Agent-skill manifest for cross-tool reuse |
| `CONSUMERS.md` | Known **public** downstream repos that consume these patterns/tokens — transparency record, not a customer list (private consumers tracked operator-side) |
| `patterns/surface-shell/` | Surface pattern — the shared page shell for a family of surfaces: identity-mark **slot**, surface identity, lede, optional status badge, optional control slot, and a flush-right footer carrying the hover/press/focus contract. Header flush left, footer flush right; the shell owns the chrome, never the payload. **Tier-3-neutral, not ASK-neutral** — it inherits Tier 1 + Tier 2 and ships the slot rather than a mark, so a consumer supplies only its own Tier 3 |
| `patterns/output-artifact/` | Class B project-output artifact scaffold — consumption pattern for review packets, reports, dashboards |
| `patterns/message-archive/` | Class B sealed interactive archive scaffold — one template, two flavors, two-party/group modes, offline search and year navigation |
| `patterns/diagram-static-H/` | Class A system / architecture diagram scaffold — horizontal left→right cascade; for architecture trees, topology maps, source-of-truth maps |
| `patterns/diagram-static-V/` | Class A system / architecture diagram scaffold — vertical top→down centered spine; for inheritance chains and one-axis information-architecture diagrams |
| `patterns/diagram-static-SEQ/` | Class A system / architecture diagram scaffold — ordered top→down sequence joined by arrows, left-aligned; for pipelines, workflows, lifecycles (succession, not hierarchy) |
| `patterns/diagram-static-FLOW/` | Class A system / architecture diagram scaffold — convergence flow: many normative sources converging into one resolved spec, realized, evaluated against an evaluation bus, governed, and fed back; for source-resolution / realization-governance topologies |
| `patterns/diagram-interactive-spine/` | Class A **interactive** diagram scaffold — navigable, stateful IA state surface (hover/click/inspector/pan-zoom). Consumes the Spectral State primitive for node color; state-bearing (unlike the static scaffolds) |

---

## Logo placement

**The wordmark uses its own mode-specific brand pairing — it does not inherit the body text color — and it sits on the gradient, not on a fixed lavender-ASK block.**

- **Light mode** — `#FFFFFF` wordmark on the light gradient (the wordmark's brand pairing — **not** the `#6A637F` light-mode text).
- **Dark mode** — `#D4C6E1` (lavender-ASK) wordmark on the dark gradient (here it coincides with the `#D4C6E1` dark-mode text).

In any UI surface — page, card, preview, component — the mark goes on the gradient. The fixed `#D4C6E1` lavender-ASK field is **only** for the standalone exported asset (the JPG/vector deliverable). It is not a UI background. Do not place the wordmark on a flat lavender-ASK block anywhere in the system.

`logo-ASK.svg` is the primary reference: it paints with `fill: currentColor`, so one vector file can be used for both mode pairings when its container sets the correct wordmark color. The two PNGs are raster pairings/fallbacks.

---

## Voice for this system's own surfaces

The README, card labels, and any docs in this repo speak in a **calm, declarative, sentence-case voice**. Quiet. Restrained. One idea per sentence. Plain present tense. Describe the system rather than narrating a maker.

| Trait | Treatment |
| --- | --- |
| Person | Impersonal / declarative. Do not invent a studio "we" — ASK is a personal meta-brand, not a collective. Describe the system as a thing that exists, not a thing "we made". |
| Casing | Sentence case in headings and body. UPPERCASE only for tiny labels (≤14px) with wide tracking (~0.14em). |
| Length | Short. One idea per sentence. |
| Punctuation | Periods, em-dashes, commas. No exclamation marks. No "Introducing:" lead-ins. |
| Numerals | Spell out one through nine in copy; figures in UI labels and prices. |
| Adjective hygiene | No "revolutionary", "leading", "powerful", "next-gen", "AI-powered". Replace with one concrete noun. |
| Verbs | Plain present tense. "The system uses Inter", not "we use Inter". |
| Emoji (scoped) | **No emoji in this design system's own surfaces** (README, cards, docs). This rule applies to the system, not to ASK universally — ASK's broader personal contexts have a sanctioned exception (a single purple heart used as personal branding) which lives outside this repo. Do not propagate a blanket "ASK never uses emoji" rule. |

**Exception to the punctuation rule — protected payloads.** The ASK tagline (`order from chaos // beauty in systems`) and its LinkedIn variant are **protected payloads**: fixed brand strings rendered verbatim, `//` intact. They are exempt from the punctuation and voice rules in the table above — the `//` is part of the string, not prose written in this system's voice. Never normalize it to an em-dash. Canonically defined in `brand-architecture.md`.

ASK's *personal* writing voice is a separate convention (terminalcore — slash-slash for em dashes, plus for ampersand, double-angle arrows). That voice belongs to ASK's personal channels — **not** the design system. Keep them strictly separate. The design system always speaks the calm sentence-case voice above.

### Voice examples

**Yes**
- *"The system uses Inter for interface, JetBrains Mono for code."*
- *"State is expressed through weight, opacity, and motion."*
- *"Two diagonal gradients. A tight core set."*

**No**
- ~~"We've built a revolutionary design system 🚀"~~
- ~~"Introducing: the ASK token library!"~~
- ~~"Our industry-leading typography stack ✨"~~

---

## Visual foundations

### Color

**Backgrounds — two diagonal gradients.** Both 45° (bottom-left → top-right); the lighter end is top-right in light, bottom-left in dark.

- **Light** — `linear-gradient(45deg, #D4C6E1 → #E2D3F0)`. Text is `#6A637F` (the approved dark-purple foreground).
- **Dark** — `linear-gradient(45deg, #201D26 → #0A090C)`. Text is `#D4C6E1`.

The gradient is **fixed to the viewport** (`background-attachment: fixed`), so scrolling reveals one continuous field.

**Core set — the named values.** Everything fundamental is built from these:

| Token | Hex | Use |
| --- | --- | --- |
| `--ask-fg-light` | `#6A637F` | **Default light-mode foreground** (body text — the approved dark purple) |
| `--ask-white` | `#FFFFFF` | Light-mode wordmark (brand mark) — **not** body text |
| `--ask-lavender-light` | `#E2D3F0` | Light gradient, top-right |
| `--ask-lavender-dark` | `#D4C6E1` | **lavender-ASK** — light gradient start; dark-mode text |
| `--ask-ink-light` | `#201D26` | Dark gradient, bottom-left; also the opt-in high-contrast foreground role (`--fg-high-contrast`). Approved uses are registered below — see **High-contrast foreground — registered uses** |
| `--ask-ink-dark` | `#0A090C` | Dark gradient, top-right |

**High-contrast foreground — registered uses.** `--fg-high-contrast` binds `--ask-ink-light` as an **opt-in** foreground role, and this list is its registry: a use is approved only if it appears here. The role never rebinds the default gradient-surface foreground ramp — `--fg-1` / `--fg-2` / `--fg-3` stay as approved — it is never the default foreground, and it is never selected by font size. A bounded element or region may opt in where the ordinary roles do not carry enough contrast, and only by registration below. The list order is organizational, not chronological.

1. `message-archive` pattern roles — one bounded use with two limbs:
   - participant ink and search-highlight text on the sanctioned colored fills;
   - in the AA-compliant **light** theme, essential page chrome, the archive title, and the focus indicator, where the ordinary foreground roles fail. In dark those page-level roles return to the normal dark foreground role.
2. `--fg-on-card` — text on the fixed `--surface-solid` role, which does not flip with the theme and so takes a foreground that does not either.
3. The ASK homepage positioning band on the light gradient, where the ordinary foreground roles fail normal-text contrast.

A new use requires all three of the following before merge: measured evidence that the ordinary foreground roles are insufficient for the exact bounded element or region; explicit ASK source-of-intent authorization; and registration in this list. Density, legal, tabular, accessibility, or a comparable context may create the pressure that justifies *proposing* a use — none of them authorizes one on its own.

A canonical inspection specimen may render the role to display and measure it. Inspection is not an additional registered application.

**Surface.** When a card or container needs a solid fill with more presence than a glass overlay:

| Token | Hex | Use |
| --- | --- | --- |
| `--ask-surface` | `#BFB3D4` | Container fill, rest |
| `--ask-surface-hover` | `#C9BCDE` | Container fill, hover |

**UI accents (two, muted, secondary use).** For dividers, low-emphasis fills, secondary borders:

| Token | Hex |
| --- | --- |
| `--ask-ui-accent-1` | `#8B79A2` (muted plum) |
| `--ask-ui-accent-2` | `#AE87C2` (lavender-mid) |

**Emphasis accents (three, sparing).** Sanctioned for emphasis where the calm field needs a single hot point. Three — full stop. Not an invitation to introduce other hues.

| Token | Hex |
| --- | --- |
| `--ask-emphasis-magenta` | `#FF00FF` |
| `--ask-emphasis-violet` | `#AA40FF` |
| `--ask-emphasis-cyan` | `#00BEFF` |

### Type

**Inter is the default interface, display and explanatory family. JetBrains Mono is reserved for explicit technical, structural or operative roles, owned by selectors in their applicable module or pattern.** Mono is never a generic body or support-copy substitute, and nothing becomes mono merely for being interface-facing — it enters where structure or precision matters. Family is chosen by the owning selector, never by payload text, HTML element type, capitalization, or the presence of `//`.

The **current live-surface allocation**:

| Owner | Selectors | Role |
| --- | --- | --- |
| foundation utility | `code` · `kbd` · `pre` · `samp` · `.mono` · `[data-mono]` · `.tabular` | code, technical and tabular literals |
| `surface-action.css` | `.surface-action` | compact operative control |
| `surface-shell` | `.surface-title` · `.surface-badge` · `.surface-footer` | structural title, status badge, terminal navigation |
| a consuming surface | its own explicitly named operative control | e.g. the style guide's `.surface-theme` mode selector |

Everything else on a live surface is Inter unless the owner of a selector says otherwise, and a generic utility class is not a license to make prose mono.

That table is the live-surface allocation, **not a repo-wide census**. The artifact and diagram patterns own additional pattern-local technical and structural mono selectors — diagram sublabels, stamps, theme tags, archive metadata — under the same principle: an explicit selector in the owning pattern. Those local contracts never make mono a page default, and they do not extend to any surface that has not adopted the pattern. The panel primary label sits between them in the table because it shares the locator's metric exactly, not because it is a third mono role: it is Inter. Both families are loaded locally as variable webfonts in `fonts/` (OFL).

Type hierarchy is **role-driven**. The defined scale steps distinguish semantic roles; do not invent an ad-hoc size merely to add emphasis. Within a role, weight and foreground carry contrast.

Generic H1/H2 display roles use 400. H3 and both primary-label implementations use 300. Body uses 200; Small uses 300; Caption uses 400. Light weights are deliberate. No thick typefaces.

**Element name does not override the explicit role:** an `h1` or `h2` carrying `.surface-title` or `.surface-panel-title` remains a primary label at 300, and conforming it to the generic heading weight is a defect rather than a repair.

The **24px primary label over 18px supporting copy** pair is a sanctioned distinction between two defined roles — not ad-hoc sizing, and not a case where a weight difference should be substituted for the size step. Both sit at 300, and the pair separates on role.

| Role | Family | Weight | Size / line-height | Tracking |
| --- | --- | --- | --- | --- |
| Display | Inter | 200 | 96 / 1.02 | -0.035em |
| H1 | Inter | 400 | 48 / 1.12 | -0.02em |
| H2 | Inter | 400 | 36 / 1.12 | -0.02em |
| H3 | Inter | 300 | 28 / 1.20 | -0.02em |
| Body | Inter | 200 | 24 / 1.45 | 0 |
| Small | Inter | 300 | 18 / 1.40 | 0 |
| Caption | Inter | 400 | 14, UPPERCASE | 0.14em |
| **Primary label — structural locator** | **JetBrains Mono** | **300** | **24 / 1.12** | **-0.02em** |
| **Primary label — panel** | **Inter** | **300** | **24 / 1.12** | **-0.02em** |
| **Compact action** | **JetBrains Mono** | **300** | **14 / 1.20** | **0** |
| Code / inline-code | JetBrains Mono | 300 | 0.9× host | 0 |
| Tabular numerals | JetBrains Mono | inherit | inherit | 0 |

The **primary-label role** names a thing the system has — a surface, a route, a panel, a named primitive — rather than setting prose. Its **shared core** is 24 / 300 / -0.02em, on Body rather than an H-step because a label is a locator and not display type; its **default leading** is 1.12. It has **two implementations**, and each owns its family through its **selector**.

**One bounded exception, on one declaration, in one form.** The `surface-shell` **breadcrumb** title takes a pattern-local `line-height: 1.35` in place of 1.12, because a breadcrumb wraps and its fragments need clearance the label forms never do. Size, weight, tracking and family are unchanged, and the exception is scoped to `.surface-breadcrumb .surface-title` — the pattern's **root-level plain** title and `.surface-panel-title` both keep 1.12. The role still reads as one object across surfaces; a wrapped breadcrumb is the one place it needs more room to do so.

`.surface-title` in the `surface-shell` pattern is the **structural locator** and is mono. That covers **both** of the pattern's title forms — the root-level plain `<h1>` and the breadcrumbed subpage title — because both carry `.surface-title`; those two forms differ in landmark, linkability and leading, never in family. `.surface-panel-title` in `surface-panel.css` is the **panel primary label** and is Inter on the identical metric, and it stays Inter **whatever the label says** — a panel may name something technical or structural, and may carry `//` or any other terminalcore grammar, without changing family. Those two selectors are the canonical implementations; neither is conformed to the other, and the shared size, weight and tracking — plus the default 1.12 leading both the panel label and the plain shell title keep — are what still make a primary label read as one object across surfaces. **No family is ever derived from a payload string.**

Supporting copy under either stays on the Small Inter step, so that pair separates on size rather than weight. `colors_and_type.css` is unchanged by this role: its generic `.mono` utility remains for code, technical and tabular use, and the mono **structural-locator** exception is applied only through `.surface-title`. The compact action (`.surface-action`) is a **separate** mono exception, with its own metric and its own canonical selector — it is not an implementation of this role.

The **compact-action role** is the label on a small control — a chip, a route action, a `preview` or `README` button. `.surface-action` in `surface-action.css` is its canonical implementation. It is **Caption-sized, not the Caption role**, and the distinction is load-bearing: Caption is 14px Inter at 400, uppercased, on 0.14em tracking, and it labels things; the compact action is 14px mono at 300, **sentence- or lower-cased, on zero tracking**, and it is something you click. Conforming a compact action to Caption's uppercase, tracking, or weight — or to Inter — is a defect rather than a repair. This role also does not govern the 18px Inter **CTA** specimen in the style guide, which is a separate and deliberately different object.

### Spacing & layout
- 4-px base unit. Tokens at 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128.
- 12-column grid, 96px outer margin on desktop.
- Generous whitespace. If a layout feels "done", strip another section.

### Radii
- xs 4 · sm 8 · **md 14** (default) · lg 22 · xl 32 · pill 999
- Pills only on interactive elements. Square corners on hairlines and dividers.

### Borders, shadows, transparency
- **Hairlines** at `rgba(white, 0.45)` on light gradient and `rgba(lavender-ASK, 0.22)` on dark. Always 1px.
- **Shadows** are long and soft. Three steps: `sm` (1px), `md` (24px), `lg` (60px). No hard drop shadows, no inner shadows, no colored shadows.
- **Glass cards** — the preferred container on the gradient field. White at 14% opacity, 1px hairline at 32%, 20px backdrop blur, `radius-lg (22)`, `shadow-lg`. The gradient shows through.

### Hover, press, focus
- **Hover** — opacity drops 1.0 → 0.92, and/or the border changes. **No arbitrary new hue is introduced**: where a border changes color, it resolves to something the element already carries. The treatment is **role-driven**, and the roles genuinely differ — do not conform one to another:

  | role | hover treatment |
  | --- | --- |
  | generic anchors (foundation `a`) and **compact actions** (`.surface-action`) | **foreground-bound** — the border resolves to `currentColor` |
  | **full-panel links** (`a.surface-panel`) | the explicit `--line-2` → `--line-1` line-role brightening |
  | **wrapping breadcrumb links** (`.surface-title a`) | their own treatment — a magenta-derived text decoration rising to full magenta, opacity held at 1 so the 0.92 drop reads as press |
  | **the identity mark** (`a.surface-mark`) | declared opacity only; it carries no border |
  | **footer links** (`.surface-footer a`) | the same magenta-derived decoration as the breadcrumb, rising to full magenta, with `scale(0.97)` press and the glow focus |

  A compact action is small, and its rest border is `--line-2` — the faintest line the system has. Resolving it to the control's own governed foreground (`--fg-1`, or `--fg-2` on the `--secondary` variant) is what makes the outline legible at that scale, and it puts compact actions in step with the foundation's generic anchor rather than making them an exception.
- **Press** — `transform: scale(0.97)`, 120ms ease-out. No darker fill. **Exception: inline text that wraps.** A scale press needs a transformable box, and giving one to a wrapping link changes how its text breaks — a segment wider than its column stops fragmenting and swells to the full column. Such links press without geometry: hover brightens the underline and holds opacity at 1, so on them the 0.92 drop reads as press rather than as hover. `patterns/surface-shell/README.md` carries the state model.
- **Focus** — `0 0 0 1px white, 0 0 0 4px rgba(white, 0.25)` glow. Never the browser default. **Same exception: inline text that wraps.** Anything drawn around the box fails on fragmented inline text — sliced it opens at the cuts, cloned the rings overlap, and a rectangular outline is one shape only where the fragments happen to overlap horizontally. Such links take a fragment-native indicator instead: a 2px `--fg-1` underline, which each fragment carries in its own right. `patterns/surface-shell/README.md` records the measurements.

### Motion
- Easing — `cubic-bezier(0.22, 1, 0.36, 1)` for entries; `cubic-bezier(0.65, 0, 0.35, 1)` for cross-fades.
- Durations — 120 / 220 / 420 / 720ms. 220 covers almost everything.
- Default transition is `opacity` and `transform`. Avoid layout transitions and bouncy easings.

### Aesthetic anchors
Linear.app, Stripe, Apple. Structural elegance, mathematical clarity, refined light typography. Avoid: playful or bloated visuals, thick typefaces, emotional/empathic design tropes.

---

## Iconography

The default is **no icons**. The wordmark, the type, and the gradient carry the identity.

When a UI absolutely needs an icon for affordance, treat it as an exception:

- Stroke-only, 1.25 weight, round joins, round caps.
- `currentColor` only — never colored, never two-tone, never filled.
- Sizes 16 / 20 / 24 / 32 / 40. Scale up to make it louder; never add weight.
- No unicode symbols as glyphs (no ✓, ★, →). Use SVG.
- No third-party icon library by default. If a handful are genuinely needed, draw them and drop in `assets/icons/`.

---

## Theme by embedding surface

Every diagram package generates and retains both theme variants (`-light` and `-dark`). The embedding surface selects the default:

- **Repository documentation and operator-system diagrams default to dark.**
- **Substack and other published long-form editorial diagrams default to light.**
- A stated local exception may override the default for a specific figure.

This rule selects which existing render is embedded. It does not suppress, rename, or replace the alternate-theme export.

---

## Consumers

Public downstream repos consume these patterns and tokens by reference. The known public consumers are tracked in [`CONSUMERS.md`](CONSUMERS.md).

Consuming a pattern does not fork it. The two material kinds do not share a lifecycle:

- **Artifact-inheritance scaffolds.** A downstream consumer vendors the applicable canonical artifacts at a pinned commit, supplies its own Tier 3 identity and content, and generates, seals, stamps where the pattern requires, and freezes its output for audit. design-system-ASK owns the engine, CSS, and export script; that consumer owns its source data, chrome, generation, sealing, and the frozen output artifact.
- **Surface patterns.** These frame live deployed surfaces. A consumer takes one by same-repo reference or as a pinned local vendored copy, and nothing seals — Tier 3, payload, deployment, and local adaptations stay with the consumer, and it re-syncs when the owner contract changes. design-system-ASK owns the shared pattern contract and its canonical CSS.

Neither route uses a CDN or a runtime hot-link. Ordinary downstream artifact consumers take the foundations through a local pinned `_dsa-tokens/` mirror; the ASK front door is the exception recorded in [`CONSUMERS.md`](CONSUMERS.md) — it vendors the foundations (tokens, fonts, wordmark) directly rather than via a `_dsa-tokens/` mirror, and carries ASK's own Tier 3.

---

## Caveats / known gaps

- The `.ai` vector working source lives operator-side, not in this repo (production assets only). The repo carries the primary vector at `assets/logo-ASK.svg` (`fill: currentColor`) and two PNG pairings.
- Foundations are present. The Class A diagram scaffolds (horizontal `patterns/diagram-static-H/`, vertical `patterns/diagram-static-V/`, sequence `patterns/diagram-static-SEQ/`, convergence-flow `patterns/diagram-static-FLOW/`, and interactive `patterns/diagram-interactive-spine/`) and the Class B project-output scaffold (`patterns/output-artifact/`) are implemented. The surface pattern (`patterns/surface-shell/`) is implemented and consumed by this repo's own three public surfaces. Landed public consumers, downstream and first-party alike, are recorded in [`CONSUMERS.md`](CONSUMERS.md). No public production Class B output-artifact surface has used this scaffold end-to-end yet. A private operator-internal consumer has exercised the Class B output-artifact flow end-to-end; contents remain firewalled.

---

## License

Copyright 2026 Andrew S Klug // ASK

Licensed under the Apache License 2.0 // see [`LICENSE`](LICENSE)
