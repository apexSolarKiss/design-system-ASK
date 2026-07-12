---
name: design-system-ASK
description: Use this skill to generate well-branded interfaces and assets for ASK, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and artifact scaffolds / patterns for prototyping.
user-invocable: true
---

This skill is a downstream implementation of ASK's canonical `visual-identity-system.md`. When this skill and the canonical file disagree, the canonical file wins.

Read the README.md file within this skill, and explore the other available files.

Key files:
- `README.md` — voice, visual foundations, iconography, caveats
- `colors_and_type.css` — drop-in CSS variables (light + dark) and base type rules
- `fonts/InterVariable*.woff2` — Inter variable font (interface + display)
- `fonts/JetBrainsMono*.woff2` — JetBrains Mono variable font (code + technical only)
- `assets/logo-ASK.svg` — vector wordmark, **primary** (`fill: currentColor`; the consuming surface sets `currentColor` to the mode-specific wordmark pairing, not the body text color)
- `assets/logo-ASK-white.png` — raster wordmark in `#FFFFFF` (light-mode pairing / fallback)
- `assets/logo-ASK-lavender-ASK.png` — raster wordmark in lavender-ASK `#D4C6E1` (dark-mode pairing / fallback)
- `preview/styleguide.html` — the live token styleguide (look at it before designing)

Cardinal rules — do not break without explicit permission:
1. **Type** — Inter everywhere interface-facing; JetBrains Mono only for code, technical, and tabular data. Headings at 400, body at 200 ExtraLight 24px. Contrast is weight, not size.
2. **Backgrounds** — only the two diagonal gradients. Light: `linear-gradient(45deg, #D4C6E1 → #E2D3F0)` with `#6A637F` default foreground (`#FFFFFF` is the light-mode wordmark pairing only, never body text). Dark: `linear-gradient(45deg, #201D26 → #0A090C)` with `#D4C6E1` text.
3. **Color palette is closed** for brand surfaces, general UI, chrome, emphasis, and interaction state. The core set (`#FFFFFF` wordmark · `#6A637F` default light foreground · `#E2D3F0` / `#D4C6E1` light gradient · `#201D26` / `#0A090C` dark gradient, with `#201D26` doubling as the reserved opt-in high-contrast foreground) + surface (`#BFB3D4` / `#C9BCDE`) + two UI accents (`#8B79A2`, `#AE87C2`) + three emphasis accents (`#FF00FF`, `#AA40FF`, `#00BEFF`, sparing). Nothing else for these surfaces. The opt-in exceptions are the **ASK semantic-color primitives** for data / architecture visualizations, not general UI color: the **Spectral State** family (`spectral-state.css`) and its sanctioned profiles (e.g. `evidence-state.css` — Evidence State) for element / evidence *state*, and **Three Functions** (`three-functions.css`) for structural *function* (`legislative` / `executive` / `judicial`). Both bind roles to the closed palette; neither expands it.
4. **Voice** for system surfaces is calm sentence-case, impersonal/declarative. No studio "we". No emoji in design-system surfaces. No marketing adjectives. Do not import ASK's personal "terminalcore" voice (slash-slash em dashes, plus-for-ampersand) — that's ASK's personal channels, not this system.
5. **No icons by default.** If absolutely needed, stroke-only at 1.25 weight, `currentColor`. Never emoji as icons.
6. **Scope is the meta-brand.** Sub-brand theming (production, builder, artist) layers elsewhere, not here.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and create static HTML files for the user to view. Link `colors_and_type.css` and inherit its tokens — don't redefine them.

For static artifacts, also:
- copy or sync the design-system-ASK files you reference (`colors_and_type.css`, fonts, required assets) into the artifact bundle, rather than linking outside it
- record which design-system-ASK commit the artifact inherited from, when practical, so the freeze is traceable
- let `colors_and_type.css` handle light/dark: explicit `data-theme="dark"`, explicit `data-theme="light"`, the `.theme-dark` class, and the `prefers-color-scheme` OS preference all resolve correctly without artifact-side overrides
- follow cardinal rule #1 for type and cardinal rule #3 for color

Static artifacts freeze inheritance at render time; production code may use a live dependency or import model if appropriate.

If working on production code, copy the tokens into the host system's variable file under an `--ask-` namespace and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
