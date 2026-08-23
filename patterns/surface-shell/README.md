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
      <h1 class="surface-title"><span class="org">[org]</span> <span class="sep" aria-hidden="true">//</span> [repo]</h1>
      <p class="surface-lede">…</p>
    </div>
  </header>

  <hr class="surface-rule">

  <main class="surface-payload">…payload…</main>

  <footer class="surface-footer">…links…</footer>
</div>
```

The `.surface-mark` wrapper above is the **non-interactive** form. Where the mark
is also navigation, the wrapper itself becomes the link —
`<a class="surface-mark" href="…" aria-label="…">`, with no `role="img"`. Both
forms are specified under §The identity mark.

### The structural title, and its two variants

The title is a locator, not a display heading, and every structural separator is
`//` — never a single slash. Each separator is a decorative
`<span class="sep" aria-hidden="true">`, so the glyph stays uniform while segment
color remains free to express hierarchy. Those are separate decisions.

**It carries the structural-locator role** — mono, plus the four metric
declarations `--fs-body`, `--fw-light`, `--lh-heading`, `--tracking-tight`.
Those four are the primary-label object, and a consuming home page's panel
titles resolve to exactly them, so a reader moving between surfaces meets one
thing rather than two dialects. **The family is this role's own**, and it
covers **both** title variants below: the root-level plain heading and the
breadcrumbed subpage title both carry `.surface-title` and both stay mono — the
two forms differ in landmark and linkability, never in family. A panel primary
label (`.surface-panel-title`) takes Inter on the identical metric, whatever
the panel is called. The allocation is per selector, never read off an
instance's copy. Shared metric, different family, deliberately — do not conform
either to the other. Being a locator is why the title sits on Body rather than
an H-step; being a title is why it does not sit on the supporting step its own
lede occupies. The pair
separates on size — 24 against 18 — not on weight.

**Root-level surface — a plain heading.** A surface with no navigable ancestor
takes a bare `<h1 class="surface-title">`. Do not wrap it in a navigation
landmark: a `nav` whose contents are all inert navigates nowhere.

**Subpage — a breadcrumbed title.** Where a navigable ancestor exists, wrap the
same `<h1>` in a breadcrumb landmark. Linkability is decided by **destination,
not by segment class** — the class names what a segment *is*, never whether it
has somewhere to go:

| segment | treatment |
| --- | --- |
| a real ancestor or home destination | linked |
| structural context with no destination of its own | static |
| the current segment | unlinked, with `aria-current="page"` |

Never invent a destination to make a segment interactive.

The example below is design-system-ASK's own topology, in which `apexSolarKiss`
is an organization name with no page of its own and therefore stays static. A
consumer whose organization segment *is* a real home — `ASK` resolving to the
ASK front door, say — links that segment instead. Both are conformant; the
difference is topology, not class:

```html
<nav class="surface-breadcrumb" aria-label="Breadcrumb">
  <h1 class="surface-title">
    <span class="org">[org]</span>
    <span class="sep" aria-hidden="true">//</span>
    <a href="../index.html">[repo]</a>
    <span class="sep" aria-hidden="true">//</span>
    <span class="page" aria-current="page">[surface]</span>
  </h1>
</nav>
```

The `nav` wraps the title only — never the mark, never the lede. `nav` inside
`<h1>` would be invalid, since a heading takes phrasing content; wrapping is the
valid arrangement and keeps the heading exposed as a heading.

**Ancestor links wrap, so their press is non-geometric.** The repo's default
press is `transform: scale(0.97)`, which needs a transformable box. Giving a
breadcrumb link that box makes it shrink-to-fit: an ancestor wider than the
content column stops breaking into inline fragments, fills the whole column,
wraps inside itself, adds a line to the header, and draws its underline across
the column rather than under the words. So these links keep ordinary inline
wrapping and take the non-geometric limbs — opacity and underline — instead:

| State | Opacity | Underline |
| --- | --- | --- |
| rest | 1 | `--line-2` |
| hover | 1 | `--line-1` |
| active | 0.92 | `--line-1` |

Hover spends the border-brightening limb; press adds the opacity drop on top of
the already-bright underline. Both `:hover` declarations are overrides: the
foundation binds `a:hover { border-bottom-color: currentColor; opacity: 0.92 }`,
whose opacity would otherwise make hover and press compute identically, and
whose `currentColor` would shift the underline's hue rather than brighten it.
Declaring both inside `.surface-title` settles each on specificity rather than
on stylesheet order. The foundation rule itself is unchanged.

No state changes display, box construction, line breaking, measured width, or
fragment count.

**Focus is a text-decoration underline here, because this link fragments.**
Anything drawn around the *box* fails on fragmented inline text. A `box-shadow`
ring sliced — the default — is drawn around the unbroken box and then cut, so it
opens on the cut edges. Cloned, each fragment closes, but the fragment boxes
already overlap at this line-height, so the rings overlap each other. A
rectangular outline is a single shape only where consecutive fragments overlap
horizontally, which is a property of where the text happens to break, not of the
treatment: at a 256px column the break is `asymptotic` / `system key` and it is
one shape; at 311px it is `asymptotic system` / `key` and it splits into one ring
per line. All three were rendered before the rule was chosen.

A text decoration is fragment-native — it follows each line's own text — so the
indicator is:

```css
.surface-title a:focus-visible {
  outline: none;
  box-shadow: none;
  border-bottom-color: transparent;
  text-decoration-line: underline;
  text-decoration-style: solid;
  text-decoration-color: var(--fg-1);
  text-decoration-thickness: 2px;
  text-underline-offset: 2px;
}
```

`border-bottom-color: transparent` clears the 1px rest underline so it does not
sit beneath the indicator. That clear is transitioned along with the rest of
`border-bottom-color`, so the border fades out over `--dur-2`: at steady state
one underline renders, and during the transition both do briefly. The border's
*width* is untouched, so nothing reflows. `--fg-1` is the existing
theme-resolving default foreground role: no new token, no `--fg-high-contrast`
registration, and the same treatment on the quieter `.org` home link as on an
ordinary ancestor.

Two properties are worth naming so they are not mistaken for defects.
`text-decoration-skip-ink` stays at its initial `auto`, so the underline breaks
around descenders — per-glyph typographic clearance, not a contour opening at a
line break. And `:focus-visible` is last among the equal-specificity state
rules, so while a link is focused its underline *is* the focus indicator and the
hover and active border limbs are suppressed; active still dims the whole
element, because the focus rule sets no opacity.

Measured at 320 / 360 / 375 / 393 / 414px in both themes:

| Property | Result |
| --- | --- |
| every fragment carries the indicator | yes, at every width |
| indicator pixels landing on neighboring glyph ink | 0 |
| contrast against the light gradient stops | 3.50:1 · 4.00:1 |
| contrast against the dark gradient stops | 10.25:1 · 12.26:1 |
| fragment count, line breaks, width, title and header height, page overflow | identical focused and unfocused |

The mark and the footer links do not fragment and keep the box-shadow glow.

This is a surface-pattern exception for wrapping text, not a general retirement
of press feedback. The identity mark is a block-level slot and the footer links
declare `display: inline-block`, so both are boxes a transform can act on rather
than inline text that fragments; both keep the scale press. The footer's
`inline-block` is load-bearing in its own right — `surface-shell.css` records
why above `.surface-footer a` — and is not merely a consequence of the flex row.

The `.org` span carries the owning organization; the `.page` span carries the
current segment and takes `aria-current="page"`. The root variant omits `.page`
because it has no navigable ancestor, not because the consumer has one surface.
Either of `.org` and the repo segment may be a link or static — apply the
destination test above to each, per surface.

### The lede

One or two calm declarative sentences about the surface. The shell sets the
foundation's **Small supporting-text role — 18px / 300** — and imposes **no
measure**, so the lede uses the full header width that `.surface-head-main`
grows into. A per-surface measure is the consuming surface's call.
Implementation detail belongs in the payload.

The lede is **not** Caption text. Caption is the 14px uppercase label role: the
`.caption` utility sets 400 weight, wide tracking, and uppercase over the
foundation's inherited Inter. The lede is prose a reader reads, so it sits on
the supporting-text step instead.

The shell **footer** sits on that same Small step. The lede and the footer are
the surface's supporting voice at its open and its close, so they read at one
size — and at one foreground: both carry `--fg-2`. That shared foreground is
continuity, not a distinction, and recoloring either one to manufacture a
distinction would be a defect. The footer stays distinct through its mono
family, its right alignment, and its terminal position rather than through being
smaller or darker than the text it closes under.

Its tracking is `--tracking-normal`, and that is a correction rather than an
omission. Wide tracking adds 1.44px between letters at this step, and mono's
fixed advances are already wider than the lede's proportional Inter; together
they made a footer measuring the same size as the lede read visibly larger than
it. The family carries the distinction without help.

It is still **not** Caption. It is never uppercased and it does not take
Caption's weight. Do not "conform" it to Caption by uppercasing it, changing
its family, or raising its weight.

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
| Slot width — a fixed 116px at every breakpoint — and its alignment | The mark itself — image asset or inline SVG |
| The optional light/dark visibility mechanism | Whether to have a pairing at all, and which asset is which mode |
| Nothing about the wrapper's semantics | The wrapper element and its role — a non-interactive `<div role="img">`, or a native `<a>` when the mark is navigation |
| Nothing about identity | The accessible name, and the Tier 3 identity it names |

This pattern ships **no organization's wordmark**. A consuming project supplies
its own Tier 3 — the same boundary
[`output-artifact`](../output-artifact/README.md) already draws. The specimen in
`surface-shell.template.html` is a neutral placeholder; replace it wholesale.

**The accessible name goes on the wrapper, never on a child.** A name carried by
the light mark disappears with that element when dark mode hides it, leaving the
visible mark unnamed. Which wrapper carries it depends on whether the mark is
also navigation, and the two forms are not interchangeable.

**A — a non-interactive identity mark.** The wrapper is a `<div>` carrying
`role="img"` and the name; every child is decorative:

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

**B — a mark that is also navigation.** The wrapper *is* the link. Do not put
`role="img"` on it, and do not nest a link inside a `role="img"` wrapper:

```html
<a class="surface-mark" href="/" aria-label="[destination or purpose]">
  <img class="surface-mark-light" src="…" alt="" aria-hidden="true">
  <img class="surface-mark-dark"  src="…" alt="" aria-hidden="true">
</a>
```

`role="img"` makes its descendants presentational, so an interactive descendant
inside one is pruned from the accessibility tree — a wordmark link that looks
and clicks correctly while being unreachable to a screen reader. The image role
must therefore neither contain nor be applied to an interactive element. Name
the anchor for where it goes rather than for what it depicts: "Back to
example.com", not "example".

Both forms share one rule: the accessible name belongs on the semantic wrapper,
never on a child. The consuming surface owns that wrapper element,
its native semantics, its accessible name, and the Tier 3 mark; the shell owns
the slot geometry and the optional mode-pairing mechanism.

The rendered specimen in `surface-shell.template.html` is **variant A**, the
non-interactive form; the prose in both that template and `surface-shell.css`
documents both variants and how to switch between them.

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

### The status note

`.surface-badge` is a **note, not a control.** It is inert on every surface that
uses it, so it carries no button geometry — the repo README puts pills on
interactive elements only, and a bordered capsule around inert text offers an
affordance the element cannot honor. The shell opens the row with a decorative
`///` instead, which marks it as an aside without implying it can be pressed.

The marker is generated content the shell supplies, so **a consuming surface
writes only its own words** — no markup changes to receive the marker, and
nothing to keep in sync across a fleet. Where the browser supports the
`content: "…" / ""` alt syntax the marker is drawn but not announced, so the
note reads as its own words to a screen reader; where it does not, the fallback
declaration draws the marker with its slashes rather than losing it.

**The marker inherits the note's color.** It is the same ink as the words it
opens, so a short note carries one hierarchy rather than two — and a consuming
surface that recolors the note recolors the marker with it. That is what makes
a color-only instance override sufficient: set `color` on `.surface-badge` and
the whole note follows, with no page-specific exception anywhere.

The note takes the Caption size in the mono family, uppercased, and it wraps.
Its payload is the consuming surface's, verbatim — a `//` or `>>` inside that
string is the author's own separator. The shell prefixes; it never rewrites.

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

The mark is a **fixed 116px at every breakpoint**. Below the shell's 640px
breakpoint the header stacks and `.surface-head-main` takes the full width, but
that changes the header's arrangement, not the identity mark's scale — the same
116px on a 320px phone and a 1280px desktop is what makes the mark read as the
same object across a fleet of surfaces. That width is the shell's, not a
per-surface choice; a consumer whose mark is square rather than a wide wordmark
should check the resulting height, since the child keeps its own aspect ratio.

A surface that wants its wordmark to become the content column at a narrow
viewport is describing a **different composition**, not a shell parameter. It
owns that composition outside this generic shell rather than redefining the
slot — the way a front-door homepage owns its own hero.

**Live same-repo surfaces** reference the canonical file directly.
design-system-ASK's own root, style guide, and pattern gallery page consume the
shell this way: no copied bundle, no pin, resolving the canonical owner file at
repo `HEAD`. When the shell contract changes, verify their rendering, landmarks,
interaction, and behavior. They are hand-maintained pages, and they are not
regenerated merely because the stylesheet they reference changed.

**The generated owner preview is a distinct artifact.**
`patterns/_preview/surface-shell.html` is regenerated from
`surface-shell.template.html` through the owner generator, and it takes the
generated-artifact treatment: generator `--check`, generated-set parity, and
visual verification. The gallery page consuming the shell for its own chrome is
a separate relationship from the gallery cataloguing that generated specimen.

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
