# Hard-fail checklist // message archive

Run before sealing. Any item below fails the artifact.

**Colour scope.** Colour rules below govern *pattern-owned presentation* — the pattern's own CSS, archive chrome, participant roles, interaction roles, and any consumer overlay CSS where ASK conformance is claimed. They do **not** govern source media: an embedded photograph, screenshot, or video frame may contain any colour without violating the ramp. Approved Tier 3 overlays remain consumer-owned and require their own validation.

## Identity-vs-state fails

- Participant color encodes anything other than **which person** — urgency, evidence, status, approval, priority, or emphasis
- A Spectral State or Evidence State hue is used **as a pattern role** — chrome, participant, or interaction — anywhere in the archive
- Participant → role assignment is **frequency-derived**, so a refresh recolors a person
- The author is recolored, moved off the right, or assigned a participant role
- A legend or sender labels appear in `data-party-mode="two-party"`
- **`data-party-mode="two-party"` contains more than two distinct participant IDs**
- **`data-party-mode="two-party"` contains any `participant-a` … `participant-e` message role** — two-party is author + one frosted counterpart, nothing else
- **`data-party-mode="group"` contains fewer than three distinct participants**
- `data-party-mode="group"` renders without its legend, or without sender labels
- The group legend does not carry **exactly one entry per distinct participant**, including the frosted `participant-default`
- Invalid overflow or mis-moded messages are **hidden or discarded in CSS** instead of failing closed — party mode is a semantic contract, not a presentational filter

## Capacity fails

- The archive contains **more than seven distinct participants** (author + frosted default + a–e) and was rendered anyway instead of failing closed
- Participant colors are **cycled or reused** across different people
- One role is assigned to **two or more** people
- Overflow participants are **silently collapsed** into the frosted default role
- `participant-f` / `-g` / further roles have been **invented** without an owner-approved overflow contract
- A participant is **dropped** to fit the supported capacity

## Flavor fails

- A second template, duplicated message markup, duplicated script, or a flavor-specific geometry branch exists
- Flavor is selected by anything other than the root `data-flavor` attribute
- `default-ASK` has been "improved" toward AA — its lower-contrast metadata treatment is intentional
- `AA-compliant` ships without raising the information-bearing roles, so the name overstates the artifact
- A flavor value differs from the ratified set
- The pattern-local participant values have been added to `colors_and_type.css` as general-purpose tokens
- A literal color value appears in the template that is not enumerated in the pattern README

## Color discipline fails

- Any colour outside the closed palette plus this pattern's ratified participant ramp appears **in pattern-owned presentation**
- A global `--fg-*` / `--line-*` rebind appears (foreground must be inherited, not re-declared)
- Invented hex values appear in the archive's overlay CSS
- `#201d26` is applied as a general default foreground rather than as the opt-in role on colored participant fills

## Attachment-honesty fails

- An attachment is dropped silently
- An attachment carries a state outside `embedded` · `referenced` · `omitted-by-export` · `bytes-unavailable`
- Provenance omits the media-fidelity profile, or omits counts for omitted / unavailable items
- The archive claims completeness it does not have

## Source-data safety fails

- A source-derived text node or attribute value is emitted **unescaped**
- Source payload is inserted through `innerHTML`
- Message text, participant labels, attachment filenames, channel labels, reactions, source pointers, or the precomputed `data-s` string are treated as trusted markup rather than untrusted data
- Linkification is added without escaping both label and URL, or without allowlisting protocols
- **Any path exists by which source content becomes executable markup in the sealed archive**

## Self-contained / sealed-output fails

- The delivered archive is **not self-contained**: it requires the network, a sibling stylesheet, or a sidecar font
- An external `<link>` / `@import` / live raw-URL stylesheet reference survives into the delivered artifact
- A relative font URL resolving outside the artifact survives into the delivered artifact
- Search or year navigation fetches anything at runtime
- An unreplaced template marker (`[placeholder]`, `0000000`) appears in the delivered artifact

## Accessibility-semantics fails

- The document omits `<meta name="color-scheme" content="light dark">`
- The live message count is not exposed as a status region (`role="status"` / `aria-live`)
- Two-party mode removes sender identity from the **accessibility tree** rather than only hiding it visually
- The author's messages carry no sender identification at all, visible or assistive
- The archive title is not a real heading element
- A focus indicator or control boundary falls below 3:1 in the `AA-compliant` flavor
- The **visible reaction glyph or label** falls below the applicable contrast threshold against its bubble fill — audit the rendered glyph, not only the chip container's computed color
- The reaction uses a **forced emoji-presentation** sequence (e.g. `U+2764 U+FE0F`), which paints a fixed colour and ignores `currentColor`; use a text-presentation glyph (`U+2665 U+FE0E`) or a textual label

## Theme inheritance fails

- A theme is hard-coded on `<html>` / `<body>` without explicit reason
- The artifact does not honor `prefers-color-scheme`
- The participant ramp changes between light and dark (it is theme-invariant; only the author fill and page-level AA foreground resolve per theme)

## Whitespace / markup fails

- A message bubble renders leading whitespace because the generator emitted a newline or indentation between the opening tag and the first child (`.ma-m` is `white-space: pre-wrap`)
- A message is missing `data-pid`, `data-role`, or `data-s`, so search or role binding breaks
- A merged-channel message is missing `data-channel`, losing its source provenance

## Type discipline fails

- Inter is used for code, timestamps, or tabular metadata
- JetBrains Mono is used for prose message body
- Weights outside the approved set appear: Inter 200 / 300 / 400; JetBrains Mono 300 / 500
- 600 SemiBold or heavier appears
- Hierarchy is carried by opacity to the point that essential text becomes unreadable

## Source-truth fails

- The artifact does not record a `design-system-ASK` source SHA
- A `MANIFEST.md` (or equivalent provenance record) is missing
- The manifest omits the flavor in use or the persistent participant → role mapping
- Live CSS is hot-linked from the upstream repo's raw URL or any live path
- A prior sealed archive was edited in place rather than superseded by a new render

## Privacy fails

- Private message content, real participant names, identifiers, or archive payload appear in any file committed to `design-system-ASK`
- The pattern's example content is anything other than generic, wall-safe placeholders

## Accessibility scope note

`AA-compliant` is validated for the pattern's **built-in roles and default states**. Consumer-supplied content, custom media, and Tier 3 overlays are **not** covered by that validation — the consumer validates the final rendered archive.
