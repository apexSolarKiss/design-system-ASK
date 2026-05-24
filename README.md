# ASK — Design System

![design-system-ASK banner](design-system-ASK-banner.jpg)

> Minimal design foundations for the ASK visual identity. Tokens, not components — the irreducible expression of the system, meant to be imported and built on.
>
> **order from chaos // beauty in systems**

The line above is the ASK master tagline. It is canonically defined in `brand-architecture.md` (in ASK's context system, not this repo) — displayed here, not defined here. See the Voice section below for the protected-payload rule.

This repo conforms to **`visual-identity-system.md`** in ASK's canonical context as the source of truth. The files here are a downstream implementation; when the two disagree, the canonical file wins.

---

## What this is

A foundational design system for **ASK** — a meta-brand expressed through a single wordmark, two diagonal gradients, and a deliberately small set of colors and weights. The system is reductive on purpose. State is expressed through **weight, opacity, and motion** — never by introducing a hue outside the named set.

Scope is the meta-brand. Sub-brand theming (production, builder, artist) layers on top of these tokens elsewhere; it does not live here.

### Source materials
- `uploads/ASK 9 4.jpg` — primary brand mark, 2160×2160 raster
- `uploads/ASK 9 4.ai` *(referenced but not transmitted; vector source not currently in project — request when needed for print/large-format)*
- Canonical spec: `visual-identity-system.md` (in ASK's personal context system; not present in this repo)

---

## Index

| Path | What it is |
| --- | --- |
| `colors_and_type.css` | CSS variables — colors, type, spacing, radii, motion |
| `fonts/InterVariable.woff2` + italic | Inter variable webfont, OFL |
| `fonts/JetBrainsMono.woff2` + italic | JetBrains Mono variable webfont, OFL |
| `assets/logo-ASK.svg` | Vector wordmark, **primary** — `fill: currentColor`, inherits the mode's text color |
| `assets/logo-ASK-white.png` | Raster wordmark in `#FFFFFF`, on transparent (light-mode pairing / fallback) |
| `assets/logo-ASK-lavender-ASK.png` | Raster wordmark in lavender-ASK (`#D4C6E1`), on transparent (dark-mode pairing / fallback) |
| `preview/*.html` | Design System tab cards, grouped Brand / Colors / Type / Spacing / Components |
| `SKILL.md` | Agent-skill manifest for cross-tool reuse |

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
Linear.app, Coinbase dark mode, Apple, Artblocks. Structural elegance, mathematical clarity, refined light typography. Avoid: playful or bloated visuals, thick typefaces, emotional/empathic design tropes.

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

## Caveats / known gaps

- The `.ai` vector source was not transmitted — the wordmark currently lives only as a 2160×2160 raster. Send the vector for print or large-format work.
- This is foundations only. No product, codebase, or sub-brand surface has been built on top yet.
