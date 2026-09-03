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

"Its own" means locally supplied by the consumer's source of intent — not
necessarily a distinct mark. ASK may assign the ASK wordmark to an ASK-family
project; the shell still ships no mark, makes no assignment, and does not make
that project ASK-the-entity.

The shell owns the chrome around the payload. It owns no payload. A consuming
surface supplies everything between the rule and the footer, the footer's own
destinations, and its own Tier 3 identity.

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
| `surface-shell.js` | **Optional** responsive-navigation runtime. Vendored only by surfaces that adopt navigation. |

The rendered specimen is generated to `patterns/_preview/surface-shell.html` by
`tools/gen-pattern-previews.mjs`. It is owner preview evidence — do not vendor
it.

**What to vendor.** The core shell is `surface-shell.css` plus the template, and
every consumer takes those. Two additions are conditional, and they are separate
questions:

| Also vendor | When |
| --- | --- |
| `surface-action.css` (repo root) | The surface renders **footer destinations**, **or** adopts navigation. |
| `surface-shell.js` (this directory) | The surface **adopts navigation**. A declining surface ships no copy. |

**Navigation requires `surface-action.css` on its own**, whether or not the surface has
a footer to style. The panel's **close control is mandatory** and is a compact action —
the runtime builds it for every adopter — while the utility row is optional. A surface
that adopts navigation, has no footer destinations, omits the utility row, and follows
these instructions to the letter would otherwise ship an unstyled mandatory button.

`surface-action.css` sits beside the vendored shell, referenced by bare filename,
exactly as the template does. It is **not** a `_dsa-tokens/` file: that mirror is
for tokens and fonts, and routing a visual module through it would make a
convenient path into a false architecture. CSS pins are tracked for every
consumer; the JS pin only for adopters.

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

  <footer class="surface-footer">
    <a class="surface-action surface-action--secondary" href="…">…</a>
  </footer>
</div>
```

The `.surface-mark` wrapper above is the **non-interactive** form, which is the
right one only where the surface has no home destination and adopts no
navigation. Everywhere else the wrapper itself becomes the link —
`<a class="surface-mark" href="…" aria-label="…">`, with no `role="img"`. Both
forms are specified under §The identity mark.

### The structural title, and its two variants

The title is a locator, not a display heading, and every structural separator is
`//` — never a single slash. Each separator is a decorative
`<span class="sep" aria-hidden="true">`, so the glyph stays uniform while segment
color remains free to express hierarchy. Those are separate decisions.

**It carries the structural-locator role** — mono, plus `--fs-body`,
`--fw-light` and `--tracking-tight`. Those three are shared with the
primary-label object, and a consuming home page's panel titles resolve to
exactly them, so a reader moving between surfaces meets one thing rather than
two dialects.

**Both title forms share one leading; the panel label does not.** The root-level
plain title and the breadcrumb form both sit on **1.16**. `.surface-panel-title`
keeps `--lh-heading` (1.12) — it is a single-line label in a different
implementation, and the adjustment was earned by a condition it does not have.

`1.16` is where two measurements meet. The breadcrumb's old pattern-local `1.35`
was measured against an underline that was a *border*, and survived the change to a
text decoration by inertia; re-measured it is visibly loose. But `--lh-heading`
alone left only **2px** between the underline and the next line's glyphs at 320 /
375 / 390 / 414 in both themes — clear, and visibly cramped on device. `1.16` adds
0.96px per line at 24px. It is the **structural locator's own metric**, not a
foundation token, and nothing else inherits it. **The family is this role's own**, and it
covers **both** title variants below: the plain heading and the breadcrumbed
title both carry `.surface-title` and both stay mono — the
two forms differ in landmark and linkability, never in family. A panel primary
label (`.surface-panel-title`) takes Inter on the same size, weight and
tracking — but on its own `--lh-heading` (1.12) leading — whatever the panel is
called. The allocation is per selector, never read off an instance's copy. Same
core, different family and different leading, deliberately — do not conform
either to the other. Being a locator is why the title sits on Body rather than
an H-step; being a title is why it does not sit on the supporting step its own
lede occupies. The pair
separates on size — 24 against 18 — not on weight.

**The test is ancestry, not local rootedness.** Every page shows its complete,
real, navigable public ancestry, from the public family root down to itself:

| condition | treatment |
| --- | --- |
| no real navigable public ancestor at any level | plain `<h1 class="surface-title">`, no landmark |
| one or more real public ancestors, inside the local family or above it | the same `<h1>` wrapped in a breadcrumb landmark |

A **real** ancestor is one with a public destination a reader can actually reach.
An ancestor that exists only as a concept, or whose page is not public, is not
one, and inventing a destination to manufacture a segment is the failure this
rule guards against — not the absence of one.

The distinction is deliberately **not** "inside this surface's own family". A
project root with a genuine public parent above it — a studio route above a
project, an organization above a studio — *has* ancestry, and hiding it makes
the same surface announce a different depth depending on which family happens to
own it. A reader crossing between two of a studio's projects should meet one
hierarchy, not two dialects of one.

> **This supersedes an earlier rule.** Before this change the pattern said a
> root-level surface kept a plain title even when its `.org` segment linked
> outward, on the reasoning that one outward link does not make a surface a
> subpage *of its own family*. That is true and no longer the test: the crumb
> describes public ancestry, and a real public parent is ancestry. The
> design-system's own root page was the named example, and it is now a
> breadcrumb.

**A breadcrumbed title.** Linkability is decided by **destination,
not by segment class** — the class names what a segment *is*, never whether it
has somewhere to go:

| segment | treatment |
| --- | --- |
| a real ancestor or home destination | linked |
| structural context with no destination of its own | static |
| the current segment | unlinked, with `aria-current="page"` |

The classes say nothing about what kind of thing a segment names, and **they do
not share a scope** — one is available to both title forms and one is not:

| class | plain title | breadcrumbed title |
| --- | --- | --- |
| `.org` | the static owning context | the outermost ancestry segment |
| *(none)* | the local current surface label | an intermediate ancestor |
| `.page` | — | the inert current leaf, **at any depth in the path** |

`.org` is **valid in both forms**, which is why the generic plain specimen
carries `<span class="org">[org]</span>`. Only `.page` and the intermediate
reading of an unclassed segment belong to a breadcrumb path, because only a path
has depth to grade.

`.page` is the *current* segment, not a "payload" one. A family root that is the
page you are on takes it, exactly as a deep subpage does — which is why the
design-system's own front door carries
`<span class="page" aria-current="page">design-system-ASK</span>`. There is no
root-page exception, because an exception is precisely what would reintroduce
two grammars.

**Currentness and linkability are different axes, and the table above grades only
the first.** A current leaf carries no `href` *because* it is current — that is a
consequence of being current, never the reason it takes `.page`. Never omit
`.page` from a breadcrumb leaf on the ground that it has no destination, and
never promote ordinary static context to `.page` merely because it also lacks
one.

**A plain title's local label is unclassed because the plain form carries no
breadcrumb path** — not because classes are unavailable to it, and not because
the label has no destination. That is a distinction between the two *title
forms*, and it is not a licence to leave a breadcrumbed family root's leaf
bare.

Never invent a destination to make a segment interactive.

The generic form below leaves `[org]` static, because a placeholder organization
has no destination to link to. That is the *placeholder's* topology, not a
default — an organization segment is static only while it genuinely has nowhere
to go:

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

**design-system-ASK's own surfaces are the linked case**, and they are worth
reading against the generic form above. Every ancestor above them is real and
public, so every one of them appears:

```html
<a class="org" href="https://a-s-k.studio/">ASK</a>
<span class="sep" aria-hidden="true">//</span>
<a href="https://a-s-k.studio/apex-solar-kiss">apex solar kiss</a>
<span class="sep" aria-hidden="true">//</span>
<a href="../index.html">design-system-ASK</a>
<span class="sep" aria-hidden="true">//</span>
<span class="page" aria-current="page">style guide</span>
```

Two details there are consumer topology rather than pattern rule, and a
different consumer will resolve them differently. The **human-facing brand name**
is the label — `apex solar kiss`, not the `apexSolarKiss` GitHub handle, because
a breadcrumb names a place a reader goes rather than a repository namespace. And
**within this breadcrumb path the segment classes grade depth**: `.org` on the
outermost ancestor, `.page` on the inert current leaf, nothing on the segments
between. That grading is what lets a four-segment chain still read as one object
rather than four equal words. A plain title has no path to grade, so it has no
intermediate tier and no `.page` — it still carries `.org` for its owning
context.

The public IA parent is the destination, not the code host: a GitHub
organization is a **utility** destination and belongs in the navigation panel,
never in the breadcrumb's ancestry. Both forms are conformant, and the
difference is topology rather than class.

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
| rest | 1 | `--surface-shell-link-underline` — the emphasis accent at 50% opacity |
| hover | 1 | `--ask-emphasis-magenta` at full opacity |
| active | 0.92 | `--ask-emphasis-magenta` at full opacity |

The underline is a **text decoration**, not a border. It was a 1px `--line-2`
border measuring 1.11:1 and 1.08:1 against the light gradient stops — texture
rather than information — brightening only to 1.26:1 on hover.

The new resting value is the accent's own hue at half dose, **not** a mix toward
the foreground: mixing changes what color it is, and the resulting plum reads as
a darker text color rather than a quieter magenta. It measures 1.72:1 / 1.82:1
light and 2.11:1 / 2.23:1 dark, so it does **not** clear the strict 3:1 non-text
floor in either theme, and no strict AA claim is made for it. In light that floor
is unreachable by any opacity; in dark a higher one would reach it, but that
would be a different treatment from the single uniform default. The affordance
rests on the **presence** of a rule where the surrounding text has none, plus an
independently governed focus indicator. `surface-text-link.css` carries the full
disposition.

Hover spends the brightening limb; press adds the opacity drop on top of the
already-bright underline. The `:hover` opacity declaration is an override: the
foundation binds `a:hover { opacity: 0.92 }`, which would otherwise make hover
and press compute identically. Declaring it inside `.surface-title` settles it on
specificity rather than on stylesheet order. The foundation rule is unchanged.

No state changes display, box construction, line breaking, measured width, or
fragment count.

**Focus is a text-decoration underline here, because this link fragments.**
Anything drawn around the *box* fails on fragmented inline text. A `box-shadow`
ring sliced — the default — is drawn around the unbroken box and then cut, so it
opens on the cut edges. Cloned, each fragment closes, but the result is one ring
per line rather than a single typographic indicator. A rectangular outline is a
single shape only where consecutive fragments overlap
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
  text-decoration-color: var(--fg-1);
  text-decoration-thickness: 2px;
  text-underline-offset: 2px;
}
```

The rest state is **also** a text decoration, so focus recolors and thickens the
single decoration already there rather than clearing a competing one. Exactly one
underline renders in every state, and nothing reflows because only color,
thickness and offset change. `--fg-1` is the existing theme-resolving default
foreground role: no new token, no `--fg-high-contrast` registration, and the same
treatment on the quieter `.org` home link as on an ordinary ancestor.

**Two focus anatomies, and they are not interchangeable.** A fragmenting inline
link cannot carry a ring; a box can. Do not describe one anatomy across both:

| Role | Focus indicator | Rest underline during focus |
| --- | --- | --- |
| `.surface-title a` (breadcrumb) | the same decoration, recolored to `--fg-1` at 2px / 2px | becomes the indicator |
| `.surface-text-link` (module) | `--fg-1` decoration at 2px / 2px | becomes the indicator |
| the identity mark | the white `box-shadow` ring | n/a |
| footer destinations | `surface-action.css`'s own focus limb | n/a — they carry no underline |

Two properties are worth naming so they are not mistaken for defects.
`text-decoration-skip-ink` stays at its initial `auto`, so the underline breaks
around descenders — per-glyph typographic clearance, not a contour opening at a
line break. And `:focus-visible` is last among the equal-specificity state
rules, so while a link is focused its underline *is* the focus indicator and the
hover and active magenta limbs are suppressed; active still dims the whole
element, because the focus rule sets no opacity.

Measured at 320 / 360 / 375 / 393 / 414px in both themes:

| Property | Result |
| --- | --- |
| every fragment carries the indicator | yes, at every width |
| indicator pixels landing on neighboring glyph ink | 0 |
| contrast against the light gradient stops | 3.50:1 · 4.00:1 |
| contrast against the dark gradient stops | 10.25:1 · 12.26:1 |
| fragment count, line breaks, width, title and header height, page overflow | identical focused and unfocused |

The identity mark does not fragment and keeps the box-shadow glow. Footer
destinations keep a ring too, but it is `surface-action.css`'s, not this
pattern's.

This is a surface-pattern exception for wrapping text, not a general retirement
of press feedback. The identity mark is a block-level slot, and a footer
destination is a compact action with a box of its own, so both are objects a
transform can act on rather than inline text that fragments; both keep the scale
press — the footer's now through `surface-action.css` rather than through a rule
of the shell's.

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

The shell **footer** sits on no type step of its own, because it declares no
type. Its destinations **are compact actions**, and `surface-action.css` owns
their family, size, weight, tracking, padding, radius, fill, border, foreground,
hover, press and focus:

```html
<footer class="surface-footer">
  <a class="surface-action surface-action--secondary" href="…">…</a>
</footer>
```

**They stay anchors.** A destination is navigation; a `<button>` would keep the
appearance and lose the destination, open-in-new-tab, copy-link, and every other
thing a link is. The `--secondary` variant is the quieter foreground-only form,
which preserves the footer's previous `--fg-2` weighting.

**The row declares nothing but layout** — `display`, `flex-wrap`,
`justify-content`, `gap`, `margin-top`. That is deliberate rather than an
omission: leaving `font-family`, `font-size`, `letter-spacing` or `color` on the
row would let an item that forgot its classes inherit an approximation of the
retired treatment and look roughly correct. A missing class should fail
**visibly**. Any future non-action footer content earns an explicit role of its
own; it does not acquire typography by accident from a navigation row.

**What this replaced.** The footer used to carry its own unboxed terminal-link
treatment — a magenta text decoration, a load-bearing `inline-block`, and a
footer-specific focus ring. All of it is retired.
`--surface-shell-link-underline` survives, with **two** consumers in this file:
the **breadcrumb** and the **operable panel hierarchy rows**. It does not regain
the footer.

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
| The mark's **action** where the surface adopts navigation — see §Responsive navigation | Nothing about that action; the authored anchor is upgraded in place |
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

## Responsive navigation

**Optional.** A surface adopts it by authoring one navigation source and loading
`surface-shell.js` **and `surface-action.css`** — the panel's close control is
mandatory and is a compact action, so the module is required by navigation
itself and not only by a footer. A surface that adopts none of it renders
exactly as before: no panel, no trigger, no terminal reserve, no scroll
padding, no scrollbar gutter. None of the navigation CSS engages, because all
of it is gated on a state attribute only the runtime sets.

### What the breadcrumb is for, and what it is not

The visible breadcrumb was doing two jobs. It keeps one.

| | |
| --- | --- |
| **Header breadcrumb** | orientation — the structural title, the current path, ancestor shortcuts. It may wrap. It is **not** the navigation interface. |
| **Identity mark** | the navigation disclosure. One meaning at every placement. |
| **Panel** | the navigation interface — a vertical, tiered hierarchy, identical on both breakpoints. |
| **Footer** | terminal destination actions. |

The breadcrumb is not removed, shortened, or moved into the panel.

### The mark is the disclosure

Where navigation is adopted, the mark **opens the panel** — the persistent
desktop mark, the mobile opening mark, and the mobile seated mark alike. At any
instant exactly **one** trigger is operable and exactly **one** is in the tab
order; operability transfers atomically at the phase-locked handoff. A visible
but inert mark is the defect this replaces.

**One authored mark.** You author a single `<a class="surface-mark" href="…">`
with a real home destination. The runtime upgrades that element in place into
the navigation button and derives the seated placement from the same payload.
There is no second authored mark to drift out of step.

**Without JavaScript it stays a home link.** The panel and the button never
appear, and no dead control is exposed. That is the whole reason the authored
element is an anchor rather than a button.

### One panel, two entrances

One native `<dialog>`, one content tree, one interaction contract:

| | Desktop | Mobile |
| --- | --- | --- |
| trigger | persistent top-left mark | opening mark, then the seated mark |
| entrance | drawer, from the top | sheet, from the bottom |

**Mobile is not a width.** The mode is `narrow` **or** `short and coarse`:

```text
(max-width: 767px)
OR
(min-width: 768px) and (max-height: 499px) and (hover: none) and (pointer: coarse)
```

A landscape phone at 844×390 is wider than the desktop breakpoint and still wants
the lower-right mark; a width-only divide hands it a fixed top-left mark and a top
drawer on a 390px-tall touch viewport. The mode is **published as state** by the
runtime and the geometry keys to that state, never to a raw query — which is also
what lets a rotation *while the panel is open* close under the geometry it opened
with and commit the new mode afterwards, rather than swapping drawer for sheet
mid-exit.

Identical in both: content, hierarchy, current-page state, focus entry and
return, the explicit close control, outside dismissal, `Escape`, background
scroll lock, and glass paint. Do not maintain separate desktop and mobile menu
markup.

Three details are contracts rather than implementation preferences. The dialog's
UA box is reset **explicitly**, because without `box-sizing: border-box` the
`max-height` bound constrains the content box while padding and safe-area
compensation extend past it — recreating overflow at exactly the short viewport
the bound protects. `::backdrop` is made **transparent** by declaration, so no
unruled veil alters the composition. And the dialog stays **open and in the top
layer for the whole exit**, with `close()` called on completion, so the motion is
never cut short.

### The mark is chrome, so the page fades behind it

A fixed mark that payload content scrolls *through* reads as floating in front of
the page rather than as part of its chrome. Both placements therefore carry a
gradient fade, on **one** DOM carrier — `.surface-nav-fade`, a body-level sibling
— with mode-specific geometry:

| | Desktop | Mobile |
| --- | --- | --- |
| edge | top | bottom |
| protects | the persistent top-left mark | the seated lower-right mark |
| opaque zone | viewport top to the mark's **resting** bottom | the seated unit |
| ramp | `--surface-nav-gap`, ending exactly where payload content begins | `--surface-nav-fade`, 48px |
| motion | none — the mask is static | the mask edge travels with `--surface-nav-p` |

Both paint `var(--bg-gradient)` with `background-attachment: fixed`, which is what
makes a settled frame's fade indistinguishable from the page rather than a panel
over it. That parity is spatial and is the contract; one real-device timing
residual is recorded below. The attachment is load-bearing and fragile in one
specific way: **an ancestor with a `transform` collapses the background
positioning area from the viewport to the element's own box**, and because the
gradient is 45°, its axis length and endpoint colours are functions of that box's
diagonal — so the fade becomes a *different* gradient, not a shifted one, and
reads as a hard rectangle. That is why the fade is a sibling of the transformed
mobile seat rather than a child of it.

The desktop opaque zone is measured from the mark's **resting** offset, which is
the lowest it ever sits; the 64px → 40px settle therefore travels entirely inside a
band that was already opaque, and the shield needs no per-frame geometry. Its ramp
depth is not a taste decision: `.surface-head` takes
`padding-top: --surface-nav-mark-block + --space-5` in this mode, so ramping over
that same gap puts the fade at zero opacity exactly where the title starts. At the
top of the page nothing is attenuated and the band is invisible, because it paints
the page's own gradient over the page's own padding.

**A mask changes what is painted and nothing about what is hit.** Each placement
therefore carries a shield over exactly its *opaque* region and no further, so
content scrolled out of sight cannot still take a click while content that is
merely dimmed stays usable. Scrolling is unaffected — the shields intercept
pointer activation, not wheel or trackpad movement.

#### Known iOS Safari limitation

On real iPhone Safari, the mobile fade may **intermittently keep painting a stale
gradient after fast upward inertial scrolling**, so a seam becomes briefly visible
between the fade and the page behind it. Scrolling a small further amount normally
repaints it. The effect has not reproduced in a desktop browser's device
emulation, and **no root cause has been established** — it is not a claim about
the progress value, the mask, or WebKit's compositing of a fixed-attachment
background.

Settled-frame spatial parity remains the contract. **Temporal pixel parity during
iOS inertial scrolling is not claimed.**

The limitation is **accepted and non-blocking**. It is a property of painting the
page's own gradient twice, and the alternative that removes it entirely — a
blurred glass shelf, which is not a copy of the page — was rejected because it is
permanently visible and reduces the readability of content passing beneath it. The
gradient fade is invisible when correct; ASK selected it knowing this residual.

Reproduction evidence, the full experiment inventory, and the criteria a remedy
would have to satisfy live in [issue #133](https://github.com/apexSolarKiss/design-system-ASK/issues/133),
which is open to external investigation. Nothing further is authorized here.

### Where the close control sits, and why it differs by mode

The control is the same button in both modes — same class, semantics, label and
focus treatment. Only its corner differs, because the two panels enter from
opposite edges:

| | Desktop | Mobile |
| --- | --- | --- |
| panel enters from | the top | the bottom |
| close sits at | the drawer's **lower** right | the sheet's **upper** right |
| reason | the corner furthest from the edge it came from, and nearest the reader | the corner nearest the thumb |

On desktop the control sits **in an ordinary layout row**, not out of flow. The
first attempt did pin it absolutely to the drawer's lower-right and padded the
scroller to keep content out from under it; that produced two defects with one
cause. It shared no layout with the repository utility, so the two could not be
aligned to each other, and the padding protecting content from a floating button
became empty depth the drawer had no content to fill. Both disappear once the
control is simply *in* the layout.

`display: contents` on `.surface-nav-head` is what allows that without touching
the DOM. The head's own box is dropped, so the hierarchy, the utilities and the
close all become grid items of `.surface-nav-panel-inner` directly, and the
desktop override arranges them as a scrolling hierarchy above one shared bottom
row: hierarchy across the upper row, repository utilities lower-left, close
lower-right. The two footer items align to a common bottom edge because they are
siblings in one row that both end-align inside it — not because either is
positioned against the panel.

**The scroller moves from the inner element to the hierarchy.** That is what lets
a short drawer fit its content and a long one cap at the viewport, while the
action row stays visible in both cases — the hierarchy alone scrolls, and the
drawer carries no bottom padding compensating for a floating control, because
there is no longer one to compensate for. Mobile is unchanged: the sheet's inner
element scrolls, the close stays at its upper-right corner, and the padding it
does carry is the safe-area inset rather than close-button clearance. **DOM order is unchanged in both modes**, so the tab order a
keyboard user walks is the one the markup states; only the boxes move.

### Swipe-to-close, and why it is only ever an enhancement

The mobile sheet carries a visible drag handle. A downward drag on it dismisses
the panel; the explicit close button remains, unchanged and mandatory.

That order matters. The gesture is discoverable only by trying it, has no
keyboard equivalent, and is invisible to assistive technology by design — the
handle is `aria-hidden` and carries no tab stop, because announcing a control
that only a finger can operate would be worse than not announcing it. So the
gesture never becomes the means of dismissal; it becomes a *second* means
alongside a button that every input can reach.

**Two thresholds, either of which commits.** A single threshold fails a whole
class of natural gesture in one direction or the other: a quick flick never
travels far, and a careful drag is never fast.

| | value | commits on |
| --- | --- | --- |
| distance | `88px` | a slow, deliberate pull, at any speed |
| velocity | `0.55px/ms` downward at release | a short, fast flick |

Both are named constants in one place in `surface-shell.js`. This is
deliberately not a physics model or a tuning surface.

**Upward travel is clamped to zero**, not tracked — the sheet is bottom-anchored,
so following a pointer upward would lift it off its own edge. A
horizontal-dominant movement is a swipe *across* the handle rather than down it,
and does not commit.

**The handle is the only drag origin.** `touch-action: none` is scoped to the
handle and appears nowhere else. Placing it on the panel, the hierarchy or the
utility region would take the browser's own scrolling away from the content —
which is exactly why the capture is constrained rather than the surface.

**A committed swipe routes through the existing `closePanel()`**, so open-state
bookkeeping, exit motion, focus return, dialog closure and queued-frame
cancellation are the ones already reviewed. There is no second close path. An
insufficient drag returns the sheet to its exact open position and clears every
temporary class, inline property and capture.

**Mouse is excluded.** A desktop drawer has no swipe affordance, and a mouse drag
that dismissed it would be an undiscoverable action with no visible handle. The
handle is `display: none` outside mobile mode, where mobile keeps the runtime's
existing definition — narrow, *or* short and coarse — not a width-only test.

While a finger is down the panel's transition is suppressed, so the sheet tracks
the pointer directly instead of easing toward each move event. It is restored the
moment the gesture ends, which is what makes the insufficient-drag return
animate. Under reduced motion the settle simply snaps.

### Focus is established the same way; only its *presentation* varies

Opening the panel always moves focus to the first destination — a modal needs an
internal focus destination, and that does not change with input modality. What
varies is whether a **keyboard indicator** is painted:

```text
opened by pointer / touch   focus moves · keyboard ring suppressed
opened by keyboard          focus moves · keyboard ring visible
first keypress after a      suppression clears immediately, so a hardware
  pointer open              keyboard gets its indicator the moment it is used
Escape closes               focus returns to the invoking mark, visibly
```

iOS Safari matches `:focus-visible` on programmatic focus whatever began the
interaction, so a tapped-open panel painted a white ring around the first row
and implied a selection the user never made. The suppression is scoped to that
one element by a bounded attribute and removes **only** `outline` and
`box-shadow`: the row keeps its resting destination underline, its hover and
active feedback, and its real focus. The trigger carries the equivalent
treatment on the *return* path, under a separate attribute — the two states are
cleared by different events, and sharing one would let each clear the other's.

**The visible ring after `Escape` is correct and deliberate.** `Escape` is
keyboard input; focus returns to the mark, and the ring is what tells a keyboard
user where it landed. Removing it would make focus restoration invisible.

### One path source, plus what a path cannot contain

The visible structural title owns the **complete current public path** — every
real navigable ancestor and the inert current leaf. A breadcrumb cannot supply
siblings it does not contain, so the remaining sources are strictly *off-path*:

| Source | Authored | Used for |
| --- | --- | --- |
| the header breadcrumb | once, visibly | the panel's vertical **current path**, derived — never restated |
| `.surface-nav-local` | once, optionally | **sibling or child** destinations the path cannot contain |
| `.surface-nav-utilities` | once, optionally | repository and other external routes |

**No public ancestor is repeated in source configuration.** A segment that
belongs to the current path belongs in the visible title, where a reader can see
it — not in an attribute that only the panel reads.

> **`data-nav-root-*` is legacy runtime compatibility, not current authoring.**
> It predates the ancestry rule, when the public root was configured *above* the
> crumb instead of appearing *inside* it. The runtime still honours it so that
> already-landed consumers are not broken by taking a newer `surface-shell.js`,
> and it is **retained for that reason alone**.
>
> Do not author it on a new surface. Authoring it alongside a visible root
> produces the exact defect the one-path rule exists to prevent — the runtime
> prepends the configured root and then appends the visible chain, so `ASK`
> appears twice in the panel. A configured legacy root must never name a segment
> the structural title already shows.
>
> Removal is a later cleanup unit, gated on the propagation census reaching zero
> live use — not on this document.

**The current page is never authored twice.** `data-surface-nav-current` is an
inert **position marker**: you say where the current location sits among its
neighbours, and the runtime fills it with the segment derived from the visible
breadcrumb. Writing the label again — or a second `aria-current` — would give
the panel an independent current-page source that can drift from the visible
title, which is exactly what the one-authored-path rule exists to prevent.

```html
<!-- SIBLING form: this surface sits among its siblings. The template carries no
     root configuration — the public ancestry is already in the visible title. -->
<template class="surface-nav-source">
  <ul class="surface-nav-local">
    <li><a href="…">a sibling</a></li>
    <li data-surface-nav-current></li>
  </ul>
  <p class="surface-nav-utilities">
    <a class="surface-action surface-action--secondary" href="…">repository</a>
  </p>
</template>
```

```html
<!-- PARENT form: this surface is the root of its own family, and the local
     destinations are its children rather than its siblings. Being a family root
     says nothing about ancestry: this surface may still have public ancestors
     above it, and if it does they are in its visible title. -->
<ul class="surface-nav-local">
  <li data-surface-nav-current>
    <ul>
      <li><a href="…">a child</a></li>
      <li><a href="…">another child</a></li>
    </ul>
  </li>
</ul>
```

The authored order and nesting are rendered as authored: the panel's shape is the
consumer's, and only the current row's *content* comes from the shell.

A `<template>` is inert by definition, so an unenhanced page renders nothing from
it and exposes no partial control.

**Do not list the ancestor twice.** The deepest ancestor already has its own row
and its own destination; adding an "overview" child pointing at the same place
puts two rows on one target, which is the defect this IA exists to remove.

### The hierarchy is a hierarchy

Rows are nested list items. Tier is carried by indentation and the branch guide;
the current item is inert and carries `aria-current="page"`.

**Hierarchy rows are not compact actions.** Rendering every tier as an identical
pill would flatten exactly the structure the panel exists to express.
`surface-action` stays where it belongs: utilities, explicit local action rows,
and the footer.

**An operable row carries the magenta text affordance** — the same resting rule
the breadcrumb uses, at partial opacity, rising to full magenta on hover and
press. The glass row-fill is a *hover* response, so without the underline the
resting hierarchy would read as a diagram of the site rather than a set of
destinations. Shape communicates operability for a shaped control; text needs the
rule beneath it. The **full-row ring** remains the focus indicator and the
underline stays visible beneath it — these rows are blocks and do not fragment,
so the breadcrumb's fragment-native focus anatomy would be the wrong one to copy.
The current row is a `span`, carries no underline, and has no hover state.

### What a declining surface gets

Nothing. That is the test, and it is worth running: no `surface-shell.js`, no
`data-surface-nav` attribute, no `data-surface-nav-mode`, no fixed mark, no
seated unit, no `scroll-padding-bottom`, no `scrollbar-gutter`, and an identity
mark that is still an ordinary anchor.

Declining is a real option for a surface with nowhere to go. It is **not** a way
to give one page of a family a different mark behavior from the rest: the mark's
meaning is supposed to be the same wherever it appears, so a family either adopts
together or has a stated reason not to.

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
- **Footer content.** Which destinations a surface closes with is the surface's
  business. Their right alignment, wrap and row gap are the shell's; their
  presentation and interaction are `surface-action.css`'s. Three owners, one
  row — and none of them is the consuming page's own stylesheet.
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

**Downstream repos** vendor local pinned copies alongside the foundation mirror,
with no CDN and no live hot-link to a design-system deployment. A cross-origin
runtime dependency on another surface's host is not a consumption path this
pattern offers. What to vendor is in §Files: always `surface-shell.css` and the
template, plus `surface-action.css` wherever footer destinations are rendered,
plus `surface-shell.js` for navigation adopters only. A repo with at least one
adopting page may vendor **one** shared copy of the runtime.

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
