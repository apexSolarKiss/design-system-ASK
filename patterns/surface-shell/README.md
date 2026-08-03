# Pattern // surface shell

The shared page shell for a family of public surfaces.

---

## What this pattern is

One page composition, applied across a family of surfaces so they read as one
artifact family with different payloads rather than as separate sites. The shell
carries an identity-mark slot, the surface identity, a lede, an optional status
badge, an optional payload control slot, the rule that closes the header, and
the footer that closes the page.

`surface-shell` is an **ASK-family pattern**. It inherits the shared Tier-1
foundations and the Tier-2 design language — role tokens, typography, spacing,
palette discipline, motion, and the interaction grammar — and it hard-codes no
consuming surface's **Tier-3** identity. Tier-3-neutral is not ASK-neutral: a
consumer adopting this pattern is adopting the ASK design language, and supplies
only its own Tier 3. `design-system-ASK`'s own pages are its first consumers,
not its required identity.

The shell owns the chrome around the payload. It owns no payload. A consuming
surface supplies everything between the rule and the footer, the footer's own
links, and its own Tier 3 identity.

The header is flush left and the footer is flush right. That pairing is the
shell's, not a per-surface preference: the reader's eye travels top-left to
bottom-right, so the page opens where reading starts and closes where reading
ends. A left-aligned footer restarts the eye in a column the page has already
finished with. Do not re-align either one locally.

This is a **surface pattern**, not Class A and not Class B. Class A templates
render diagrams; Class B templates seal project-output artifacts. This one
frames a live public page and seals nothing. It is catalogued in its own group
for that reason. Do not file it under an existing class, and do not read a new
class label into it — one surface pattern does not earn a taxonomy.

---

## Files

| File | What it is |
| --- | --- |
| `surface-shell.css` | The canonical implementation. Composes existing `var()` roles; defines no token. |
| `surface-shell.template.html` | The canonical markup specimen, with the required structure and both optional slots. |

The rendered specimen is generated to `patterns/_preview/surface-shell.html` by
`tools/gen-pattern-previews.mjs`. It is owner preview evidence — do not vendor
it. Vendor this directory's two files.

---

## Required markup

```html
<div class="surface">
  <header class="surface-head">
    <div class="surface-head-main">
      <div class="surface-mark" role="img" aria-label="[org]">…your mark…</div>
      <h1 class="surface-title"><span class="org">[org]</span> / [repo] <span class="page">// [surface]</span></h1>
      <p class="surface-lede">…</p>
    </div>
  </header>

  <hr class="surface-rule">

  <main class="surface-payload">…payload…</main>

  <footer class="surface-footer">…links…</footer>
</div>
```

The `.org` span carries the owning organization and the `.page` span the payload
name within the family. A consumer with a single public surface omits the
`.page` span.

### Landmarks are part of the contract

`header`, `main`, and `footer` are **required elements**, not styling
preferences. Because this pattern frames a whole page, it owns that page's
landmark structure: one **banner**, one **main**, one **contentinfo** per
surface. That is how a nonvisual reader skips the chrome and lands on the
payload.

Every selector in `surface-shell.css` is class-based, so restyling never depends
on the element — but substituting a `<div>` for any of the three silently
deletes a landmark while the page still looks correct. Keep `<footer>` outside
`<main>`, or it stops being contentinfo.

`.surface-payload` is a hook for your own layout. The shell requires the `main`
element and declares **no** payload styling of its own.

### The identity mark

`.surface-mark` is a **slot**, not a mark. The shell owns its width, its
alignment, and the optional mode-pairing mechanism. You own what goes in it:

| The shell owns | The consuming surface owns |
| --- | --- |
| Slot width and alignment | The mark itself — image asset or inline SVG |
| The optional light/dark visibility mechanism | Whether to have a pairing at all, and which asset is which mode |
| Nothing about identity | The accessible name, and the Tier 3 identity it names |

This pattern ships **no organization's wordmark**. A consuming project supplies
its own Tier 3 — the same boundary
[`output-artifact`](../output-artifact/README.md) already draws. The specimen in
`surface-shell.template.html` is a neutral placeholder; replace it wholesale.

**The accessible name goes on the wrapper, never on a child.** A name carried by
the light mark disappears with that element when dark mode hides it, leaving the
visible mark unnamed — so `role="img"` plus `aria-label` on `.surface-mark`, and
decorative children:

```html
<!-- One mark, any mode -->
<div class="surface-mark" role="img" aria-label="[org]">
  <svg viewBox="…" aria-hidden="true" focusable="false">…</svg>
</div>

<!-- Or a light/dark pairing -->
<div class="surface-mark" role="img" aria-label="[org]">
  <img class="surface-mark-light" src="…" alt="" aria-hidden="true">
  <img class="surface-mark-dark"  src="…" alt="" aria-hidden="true">
</div>
```

A single responsive SVG is a first-class implementation — a vector that paints
with `fill: currentColor` covers both modes from one file, and needs neither
modifier class. Two PNGs are not required.

**Why the pairing is done in CSS rather than `<picture>`/`srcset`.** Not because
`<picture>` ignores environment changes — it does react to them; the HTML
standard requires it. The reason is narrower: a `<picture>` media query can only
see the **environment**, and this design system has two *DOM-state* theme
mechanisms that no media query can observe. The shell must therefore track all
three dark paths the foundation defines:

| Path | Set by | Media query can see it? |
| --- | --- | --- |
| `@media (prefers-color-scheme: dark)` | the operating system | yes |
| `:root[data-theme="dark"]` | the page, explicitly | no |
| `.theme-dark` | the page, explicitly | no |

CSS sees all three, so the mark stays consistent with the tokens under every
one. If the foundation ever adds a fourth path, `surface-shell.css` must gain it
too — a consumer whose tokens go dark under a mark that stays light is exactly
the failure this mirroring prevents.

---

## Optional slots

| Slot | When to use it | When to omit it |
| --- | --- | --- |
| `.surface-badge` | The surface carries a standing classification, environment, or similar short fact. | Omit the element. |
| `.surface-head-aside` | The surface needs a payload-specific control in the header. | **Omit the element.** The shell reserves no space for an absent control. |

Do not emit an empty slot element to hold space. An absent slot must be absent
from the markup.

The control inside `.surface-head-aside` belongs to the consuming surface — its
behavior, its styling, and its script. The shell positions the slot and stops
there. design-system-ASK's own style guide is the reference case: it places a
theme selector in the slot and owns that control entirely, in
`styleguide-theme-control.js` and its own page CSS. That control is **not** part
of this pattern and is not vendored with it.

---

## What the shell does not own

- **The gradient field, base type, and base element styling.** `colors_and_type.css`
  binds `html, body` to the gradient, the foreground ramp, and the base font.
  The shell defines **no `body` rule at all**. A consuming surface *may* add a
  deliberate, token-based instance or payload default there — a page whose
  payload defaults to `var(--font-mono)`, for instance. It may **not** redefine
  a Tier-1 or Tier-2 role, and duplicating a foundation binding to no purpose is
  noise rather than a default. Two of this repo's own three surfaces carry such
  a delta — a mono payload default — and nothing else; a re-stated `background`
  shorthand in particular is not free, because it also resets the foundation's
  `background-attachment: fixed` to `scroll` and gives that surface a different
  gradient behavior from the rest of its family.
- **Payload layout.** Everything between `.surface-rule` and `.surface-footer`.
- **Footer content.** Which links a surface closes with is the surface's business.
  Their right alignment and interaction behavior are not — those belong to the
  shell, which carries the repo README's hover/press/focus contract so every
  consumer inherits it rather than reimplementing it.
- **Identity.** The mark slot is the shell's; the mark, its pairing, and its
  accessible name are the consuming project's Tier 3.
- **Tokens.** The shell composes existing `var()` roles and introduces no token
  and no palette color. The one literal value is the focus glow's translucent
  white, which the repo README's focus contract specifies verbatim and for which
  no token exists. Any other raw color value, or a font stack, in
  `surface-shell.css` is a defect.
- **Theme selection.** The shell responds to the resolved mode; it never sets one.

---

## Consuming this pattern

**Same-repo surfaces** reference the canonical file directly. There is no pin
and no copied bundle; currency is maintained by regeneration and verification.
design-system-ASK's own root, style guide, and pattern gallery consume the shell
this way.

**Downstream repos** vendor a local pinned copy of `surface-shell.css` alongside
the foundation mirror, with no CDN and no live hot-link to a design-system
deployment. A cross-origin runtime dependency on another surface's host is not a
consumption path this pattern offers.

Do not hand-edit a vendored copy. Local differences belong in the consuming
repo's own stylesheet, layered over the vendored file — that keeps the vendored
bytes verifiable against the owner at its pinned commit, and keeps the local
delta legible as a delta.

Your own identity mark must be reachable from the consuming surface — from
wherever your repo already keeps it. Nothing about it is vendored from here:
`design-system-ASK` ships the slot, not the mark. A surface that legitimately
fills this slot with the `logo-ASK` wordmark does so because it is itself an
ASK-instance surface carrying ASK's own Tier 3 — a property of that consumer,
never an instruction from this pattern.

When `surface-shell.css` changes upstream, each downstream consumer re-syncs on
its own schedule. Consumption relationships are recorded in
[`CONSUMERS.md`](../../CONSUMERS.md); vendored pins and currency are tracked
operator-side, not in this repo.
