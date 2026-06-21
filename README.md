# Design System // ASK

![design-system-ASK banner](design-system-ASK-banner.jpg)

> Minimal design foundations for the ASK visual identity. Tokens remain irreducible; the repo may also carry static-artifact inheritance scaffolds that show downstream surfaces how to consume them without redefining them.
>
> **order from chaos // beauty in systems**

The line above is the ASK master tagline. It is canonically defined in `brand-architecture.md` (in ASK's context system, not this repo) — displayed here, not defined here. See the Voice section below for the protected-payload rule.

This repo, `design-system-ASK`, is the reference implementation of the ASK design family.

This repo conforms to **`visual-identity-system.md`** in ASK's canonical context as the source of truth. The files here are a downstream implementation; when the two disagree, the canonical file wins.

---

## What this is

A foundational design system for **ASK** — a meta-brand expressed through a single wordmark, two diagonal gradients, and a deliberately small set of colors and weights. The system is reductive on purpose. Interface and interaction state is expressed through **weight, opacity, and motion** — never by introducing a hue outside the named set. The one opt-in exception is semantic state in data and architecture visualizations, which may use the ASK Spectral State primitive (below) — not general UI color.

Scope is the meta-brand. Sub-brand theming (production, builder, artist) layers on top of these tokens elsewhere; it does not live here.

### Source materials
- `assets/logo-ASK.svg` — primary vector wordmark, `fill: currentColor`
- `assets/logo-ASK-white.png` — raster wordmark, white on transparent (light-mode pairing)
- `assets/logo-ASK-lavender-ASK.png` — raster wordmark, lavender-ASK on transparent (dark-mode pairing)
- Canonical spec: `visual-identity-system.md` (in ASK's canonical context, not in this repo)
- Operator-side vector working source: `ASK 9 4.ai` (Illustrator file, not in this repo by design — production assets only)

---

## Scope

This repo carries foundations and may carry static-artifact inheritance scaffolds:

1. **Foundations** — tokens, type, color, assets, and visual rules. The irreducible expression of the system and the inheritance source for other ASK-family surfaces.
2. **Static-artifact inheritance scaffolds** — small, auditable patterns, added when earned, that show consuming projects how to inherit the foundations without redefining them.

Scaffolds are consumption patterns, not components. They are not a generator, not a build pipeline, not an npm package, and not a component library. Two artifact classes are kept distinct:

- **Class A** — system / architecture diagram templates, in two kinds:
  - **static:** **`diagram-static-H`** (horizontal left→right top-aligned cascade), **`diagram-static-V`** (vertical top→down centered spine), **`diagram-static-SEQ`** (ordered top→down arrowed sequence — succession, not hierarchy), and **`diagram-static-FLOW`** (convergence flow — many sources converging into a resolved spec, realized, evaluated, governed, fed back) — structural; state-free.
  - **interactive:** **`diagram-interactive-spine`** — a navigable, stateful IA state surface that consumes the Spectral State primitive for node color. The taxonomy encodes static-vs-interactive, not just orientation (the interactive spine is also vertical).
- **Class B** — project-output artifact templates.

Static artifacts inherit at generation time and freeze for audit. Downstream projects supply their own Tier 3 identity, their own source-truth posture, and their own content and domain structure. Hosting a scaffold here does not make this repo the owner of downstream project content.

The repo may also carry **specialized opt-in foundation primitives** beyond the core tokens — small, identity-free systems a surface loads only when it needs them. The first is **ASK Spectral State** (`spectral-state.css`), a semantic state-color system for surfaces that encode element *state*. It is not general UI color and the scaffolds above do not use it.

A primitive may carry sanctioned **profiles** for adjacent semantic domains. The first is **ASK Evidence State** (`evidence-state.css`), an epistemic evidence-state vocabulary built on Spectral State: it reuses three Spectral State values by reference and adds two evidence-specific roles (`weakened`, `not-yet-testable`), leaving Spectral State's own vocabulary unchanged.

---

## Index

| Path | What it is |
| --- | --- |
| `colors_and_type.css` | CSS variables — colors, type, spacing, radii, motion |
| `spectral-state.css` + `spectral-state.md` + `spectral-state.html` | ASK Spectral State — specialized **opt-in** state-color primitive (eight neon `--state-*` roles on a 12-hue wheel), with a rendered visual key (`spectral-state.html`). For surfaces that encode element *state*; not general UI color. Layers on top of `colors_and_type.css`. |
| `evidence-state.css` + `evidence-state.md` + `evidence-state.html` | ASK Evidence State — a sanctioned **profile** under Spectral State (epistemic evidence-state). `supported` / `partially-supported` / `unresolved` reuse Spectral State values by reference; **`weakened`** (muted 30° brown) and **`not-yet-testable`** (lavender-gray, dashed/hollow) are new roles. Rendered key in `evidence-state.html`. Layers on top of `spectral-state.css`; Spectral State's own vocabulary is unchanged. |
| `fonts/InterVariable.woff2` + italic | Inter variable webfont, OFL |
| `fonts/JetBrainsMono.woff2` + italic | JetBrains Mono variable webfont, OFL |
| `assets/logo-ASK.svg` | Vector wordmark, **primary** — `fill: currentColor`, inherits the mode's text color |
| `assets/logo-ASK-white.png` | Raster wordmark in `#FFFFFF`, on transparent (light-mode pairing / fallback) |
| `assets/logo-ASK-lavender-ASK.png` | Raster wordmark in lavender-ASK (`#D4C6E1`), on transparent (dark-mode pairing / fallback) |
| `preview/*.html` | Design System tab cards, grouped Brand / Colors / Type / Spacing / Components |
| `SKILL.md` | Agent-skill manifest for cross-tool reuse |
| `CONSUMERS.md` | Known **public** downstream repos that consume these patterns/tokens — transparency record, not a customer list (private consumers tracked operator-side) |
| `patterns/output-artifact/` | Class B project-output artifact scaffold — consumption pattern for review packets, reports, dashboards |
| `patterns/diagram-static-H/` | Class A system / architecture diagram scaffold — horizontal left→right cascade; for architecture trees, topology maps, source-of-truth maps |
| `patterns/diagram-static-V/` | Class A system / architecture diagram scaffold — vertical top→down centered spine; for inheritance chains and one-axis information-architecture diagrams |
| `patterns/diagram-static-SEQ/` | Class A system / architecture diagram scaffold — ordered top→down sequence joined by arrows, left-aligned; for pipelines, workflows, lifecycles (succession, not hierarchy) |
| `patterns/diagram-static-FLOW/` | Class A system / architecture diagram scaffold — convergence flow: many normative sources converging into one resolved spec, realized, evaluated against an evaluation bus, governed, and fed back; for source-resolution / realization-governance topologies |
| `patterns/diagram-interactive-spine/` | Class A **interactive** diagram scaffold — navigable, stateful IA state surface (hover/click/inspector/pan-zoom). Consumes the Spectral State primitive for node color; state-bearing (unlike the static scaffolds) |

---

## Logo placement

**The wordmark's color is always the same as the text color for its mode, and it sits on the gradient — not on a fixed lavender-ASK block.**

- **Light mode** — `#FFFFFF` wordmark on the light gradient (same as light-mode text).
- **Dark mode** — `#D4C6E1` (lavender-ASK) wordmark on the dark gradient (same as dark-mode text).

In any UI surface — page, card, preview, component — the mark goes on the gradient. The fixed `#D4C6E1` lavender-ASK field is **only** for the standalone exported asset (the JPG/vector deliverable). It is not a UI background. Do not place the wordmark on a flat lavender-ASK block anywhere in the system.

`logo-ASK.svg` is the primary reference: it paints with `fill: currentColor`, so a single file inherits the correct mode's text color automatically. The two PNGs are raster pairings/fallbacks.

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
- *"Two diagonal gradients. Five core colors."*

**No**
- ~~"We've built a revolutionary design system 🚀"~~
- ~~"Introducing: the ASK token library!"~~
- ~~"Our industry-leading typography stack ✨"~~

---

## Visual foundations

### Color

**Backgrounds — two diagonal gradients.** Both 45°, both with the lighter end at top-right.

- **Light** — `linear-gradient(45deg, #D4C6E1 → #E2D3F0)`. Text is `#FFFFFF`.
- **Dark** — `linear-gradient(45deg, #201D26 → #0A090C)`. Text is `#D4C6E1`.

The gradient is **fixed to the viewport** (`background-attachment: fixed`), so scrolling reveals one continuous field.

**Core 5 — the named set.** Everything fundamental is built from these:

| Token | Hex | Use |
| --- | --- | --- |
| `--ask-white` | `#FFFFFF` | Light-mode text |
| `--ask-lavender-light` | `#E2D3F0` | Light gradient, top-right |
| `--ask-lavender-dark` | `#D4C6E1` | **lavender-ASK** — light gradient start; dark-mode text |
| `--ask-ink-light` | `#201D26` | Dark gradient, bottom-left |
| `--ask-ink-dark` | `#0A090C` | Dark gradient, top-right |

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

**Inter for interface and display. JetBrains Mono for code, technical, and tabular data.** Inter leads everywhere interface-facing; mono enters only where structure or precision matters. Both are loaded locally as variable webfonts in `fonts/` (OFL).

Contrast is **weight, not size** — headings sit at 400, body at 200. The 200-unit weight gap does the work. Light weights are deliberate. No thick typefaces.

| Role | Family | Weight | Size / line-height | Tracking |
| --- | --- | --- | --- | --- |
| Display | Inter | 200 | 96 / 1.02 | -0.035em |
| H1 | Inter | 400 | 48 / 1.12 | -0.02em |
| H2 | Inter | 400 | 36 / 1.12 | -0.02em |
| H3 | Inter | 300 | 28 / 1.20 | -0.02em |
| Body | Inter | 200 | 24 / 1.45 | 0 |
| Small | Inter | 300 | 18 / 1.40 | 0 |
| Caption | Inter | 400 | 14, UPPERCASE | 0.14em |
| Code / inline-code | JetBrains Mono | 300 | 0.9× host | 0 |
| Tabular numerals | JetBrains Mono | inherit | inherit | 0 |

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
- **Hover** — opacity drops 1.0 → 0.92, or border brightens. No color shifts.
- **Press** — `transform: scale(0.97)`, 120ms ease-out. No darker fill.
- **Focus** — `0 0 0 1px white, 0 0 0 4px rgba(white, 0.25)` glow. Never the browser default.

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

Public downstream repos consume these patterns and tokens by reference, vendored at a pinned commit. The known public consumers are tracked in [`CONSUMERS.md`](CONSUMERS.md).

Consuming a pattern does not fork it. A consumer vendors a local pinned mirror (`_dsa-tokens/`, no CDN), supplies its own Tier 3 identity and content, and re-syncs when an upstream pattern or token module changes. design-system-ASK owns the engine, CSS, and export; the consumer owns its source data and chrome.

---

## Caveats / known gaps

- The `.ai` vector working source lives operator-side, not in this repo (production assets only). The repo carries the primary vector at `assets/logo-ASK.svg` (`fill: currentColor`) and two PNG pairings.
- Foundations are present. The Class A diagram scaffolds (horizontal `patterns/diagram-static-H/`, vertical `patterns/diagram-static-V/`, sequence `patterns/diagram-static-SEQ/`, convergence-flow `patterns/diagram-static-FLOW/`, and interactive `patterns/diagram-interactive-spine/`) and the Class B project-output scaffold (`patterns/output-artifact/`) are implemented. Landed public consumers are recorded in [`CONSUMERS.md`](CONSUMERS.md). No public production surface has been built on top yet. A private operator-internal consumer has exercised the Class B output-artifact flow end-to-end; contents remain firewalled.

---

## License

Copyright 2026 Andrew S Klug // ASK

Licensed under the Apache License 2.0 // see [`LICENSE`](LICENSE)
