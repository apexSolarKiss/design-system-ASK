# Pattern // message archive

**Class B — sealed interactive archive.**

A reusable scaffold for a conversation archive: one self-contained `.html` per archive **timeline**, rendered from a source-neutral normalized model, sealed for audit, and readable offline with client-side search and year navigation.

## What this pattern is

One delivered file per archive **timeline**. A timeline may consume one **or more** source threads or channels and merge them chronologically, preserving channel, source, and fidelity provenance per message. The source threads are *provenance inputs*, not separate output files — "thread" is not a synonym for the delivered object.

It is a **consumption pattern, not a generator**. `design-system-ASK` owns the presentation and semantic-role contract; each consumer owns source extraction, identity resolution, chronology, deduplication, media acquisition, rendering, and sealing. No source adapter, chat-database code, or extraction logic belongs in this repo.

## Sealed and interactive are not in tension

The archive carries client-side search and year navigation and still freezes for audit. Interaction here **navigates fixed content; it never fetches it.** The delivered file has no network dependency, no sidecar, and no live upstream link — the same freeze-for-audit posture as the static Class B `output-artifact`, with an offline reading affordance on top. This is a Class B artifact, not a new class.

## Normalized archive contract

The seam that stops every consumer reinventing the model is this source-neutral shape — not a shared extractor or renderer:

```text
archive
  id · title · source_types[] · start_at · end_at · message_count · media_mode · provenance · caveats[]

participants[]
  id            // stable, source-neutral identity
  label
  is_author
  archive_role  // persistent role token — NOT frequency-derived

channels[]
  id · label · source_type · participant_ids[]

messages[]
  id · channel_id · sender_id · sent_at · text · attachments[] · reactions[] · fidelity

attachments[]
  id · kind · display_name · mime_type · state · source_pointer

reactions[]
  type · actor_id · target_message_id · reacted_at   // reacted_at optional where unavailable
```

## Reaction fidelity — two valid source representations

`reactions[]` is a **destination, not a mandate.** Sources represent reactions in more than one way, and forcing every reaction-like record into that array can destroy source truth rather than normalize it.

**Structured targeted reaction** — manifest mode `structured-targeted`. Use `reactions[]` only where the source carries a **deterministic target relationship** — enough to populate `target_message_id` without speculative association.

**Source-native reaction message** — manifest mode `message-records`. Where the source itself exports a reaction as an **ordinary message record**, with its own sender and timestamp, and supplies no deterministic target relationship, preserve it 1:1 in `messages[]`:

- keep its source provenance and its place in the ordinary message count;
- **do not infer a target** from quoted text, proximity, matching prose, or any other heuristic evidence;
- do not delete the message merely to populate `reactions[]`;
- do not reduce the archive's message count to force a different model.

A source that genuinely contains both representations is `mixed`, and mixed is valid. A source carrying neither is `none`. What is not valid is collapsing one representation into the other silently.

The distinction the manifest must preserve is between a **relationship the source recorded** and one the **consumer inferred**. An inferred association presented as source truth is a fidelity failure even when the guess is good — and a heuristic that resolves most records still strands the remainder in a different representation from their siblings.

## Attachment fidelity — four states, none silent

```text
embedded            bytes inlined into the sealed file
referenced          named by filename; bytes live beside or outside the artifact
omitted-by-export   the source export carried no media
bytes-unavailable   the message row exists; the bytes never reached the source device
```

The consumer selects a media-fidelity profile, and the delivered archive stays self-contained under it. Provenance must state the profile **and the counts** for every omitted or unavailable item. **No attachment may disappear silently** — an archive that drops media without saying so is a false record.

## Bubble roles

```text
author               .ma-author   right, plum, ALWAYS; never recolored, never reassigned
participant-default  .ma-default  left, frosted — the two-party counterpart
participant-a … -e   .ma-role-*   left, distinct fill + sender label (group mode)
```

Party mode is one seam on the root element, not a second template:

```text
data-party-mode="two-party"   author right · frosted other left · no legend · no sender labels
data-party-mode="group"       full-fill participant roles · legend · sender labels
```

**Participant → role mapping is manifest-owned and persistent.** It is never frequency-derived: a refresh must not recolor a person because their message count moved. Reassignment happens only under explicit operator intent.

## Participant color is identity, not state

Color answers *which person*. It never encodes urgency, evidence, status, approval, or emphasis, and no Spectral State or Evidence State hue is used. The muted foundation roles lead so ordinary archives read calmly; the softened derivations of the emphasis hues appear only once a conversation has enough additional participants to reach them.

The pattern-local values are **not foundation tokens**. They do not enter the general palette, are not available as general-purpose colors, and authorize no use outside this pattern. Where a role reuses an existing canonical token it does so **by reference**, without redefining it. The three raw emphasis accents are unchanged and remain sparing.

## Supported capacity — seven participants

```text
Supported capacity: seven distinct participants total, including the author.
More than seven requires a future owner-approved overflow contract before rendering.
```

The seven roles are `author` · `participant-default` · `participant-a` … `participant-e`.

A larger distinct participant set is **not supported by the current pattern version**. A consumer that encounters more than seven must **fail closed** and surface that a new DS-owner decision is required. It must not:

```text
cycle or reuse participant colors
assign one role to multiple people
silently collapse overflow participants into the frosted role
invent participant-f / g / … roles
drop participants
```

This is a **bounded initial capacity, not a permanent claim** that message archives can never exceed seven participants. Overflow behaviour is deferred until a real archive creates that pressure, at which point it is ratified against an actual case rather than designed speculatively.

## Two flavors

One template, selected by one attribute on the root element:

```text
data-flavor="default-ASK"    the ASK-preferred visual default (template default)
data-flavor="AA-compliant"   the accessibility-tuned alternative
```

Both share one DOM, one geometry, one script, one theme mechanism, one attachment and reaction model, and one party-mode implementation. **Flavors differ only in pattern-local role variables.** Do not fork the template.

| Role | `default-ASK` | `AA-compliant` |
|---|---|---|
| author — light | `var(--ask-ui-accent-1)` `#8b79a2` | `#7f6b99` |
| participant c | `#c44fc4` | `#c95fc9` |
| participant d | `#a56bd4` | `#a870d6` |

Shared by both: author — dark `#6e5c86` · participant a `var(--ask-ui-accent-2)` `#ae87c2` · participant b `var(--ask-surface)` `#bfb3d4` · participant e `#569dbd` · participant ink `var(--fg-high-contrast)` `#201d26`.

`default-ASK` is the preferred treatment — **not** a defect, not a legacy state, not a version awaiting correction. Its lower-contrast metadata rendering is intentional and must not be pulled toward AA.

`AA-compliant` additionally raises the information-bearing roles: inside a bubble, essential metadata inherits `currentColor` at full opacity, riding the bubble's own already-passing foreground; page-level chrome resolves to `#201d26` in light and `#d4c6e1` in dark. Hierarchy moves into size, weight, spacing and grouping — never into unreadably faint essential text.

### What `AA-compliant` claims, and what it does not

It claims that the **canonical pattern's built-in visual roles, controls, default states, and supplied example content** meet the applicable AA thresholds in both themes.

It does **not** claim that every downstream archive is compliant regardless of consumer-supplied content, Tier 3 overlays, custom media, or modification. **Final rendered archives require the consumer's own validation** after content and overlays are applied.

## Foreground is inherited — no global rebind

The template adds no global `--fg-*` rebind. Every foreground is role-scoped and applied by class, so none can leak into inherited prose. `#201d26` reaches this pattern only as the foundation's **opt-in high-contrast role** (`--fg-high-contrast`), and it does so through two distinct limbs — not one:

- **participant ink** (`--ma-ink`) — bubble text on the sanctioned colored fills, and the search-highlight text that rides those same fills;
- **AA-compliant page-level roles, light theme only** — `--ma-page-aa`, which carries essential page chrome and the archive title, and `--ma-focus`, the AA focus indicator, where the ordinary foreground roles do not clear the applicable threshold.

In **dark**, `--ma-page-aa` and `--ma-focus` resolve to `var(--fg-1)`, the normal dark foreground role: the high-contrast role is a light-theme measure here, not a permanent substitution. Both limbs are registered together as one bounded pattern use in [design-system-ASK](../../README.md), under **High-contrast foreground — registered uses**. The role does not become the default foreground anywhere.

## Source data is untrusted — escaping contract

Message text, participant labels, attachment filenames, channel labels, reaction values, source pointers, and the precomputed `data-s` search string are all **source-derived data emitted into HTML**. A malformed or markup-bearing message must not be able to corrupt the archive or become executable content.

```text
HTML-escape every source-derived text node AND attribute value.
Never insert source payload through innerHTML.
Treat message text, labels, filenames, channel names, reactions, source
  pointers, and precomputed search strings as untrusted data.
If linkification is added, escape both label and URL, and allowlist protocols.
```

A rendered archive **hard-fails** if source content can become executable markup. The pattern's own search implementation reads `dataset.s` and uses `classList` / `textContent` only — it never assigns `innerHTML`, and a consumer's generator must hold the same line.

## Every locally declared color value this template uses

Foundation tokens are consumed by reference and are not restated here. The values below are **pattern-local** — they exist only inside this pattern, are not foundation tokens, and authorize no use elsewhere. Nothing is hidden in the CSS.

| Value | Role | Flavor |
|---|---|---|
| `#6e5c86` | author bubble fill, dark mode | both |
| `#569dbd` | participant e fill | both |
| `#c44fc4` | participant c fill | `default-ASK` |
| `#a56bd4` | participant d fill | `default-ASK` |
| `#7f6b99` | author bubble fill, light mode | `AA-compliant` |
| `#c95fc9` | participant c fill | `AA-compliant` |
| `#a870d6` | participant d fill | `AA-compliant` |
| `#ffffff` | author bubble **foreground**, light mode | both |
| `#f3ecfa` | author bubble **foreground**, dark mode | both |
| `#e8def3` | frosted default-bubble **foreground**, dark mode | both |
| `rgba(255,255,255,.62)` / `rgba(212,198,225,.10)` | frosted default-bubble fill, light / dark | both |
| `rgba(255,255,255,.24)` / `rgba(212,198,225,.08)` | day-header + control chip fill, light / dark | both |
| `rgba(212,198,225,.58)` / `rgba(16,14,20,.72)` | sticky-bar backdrop, light / dark | both |
| `rgba(255,255,255,.55)` / `rgba(212,198,225,.14)` | AA control fill, light / dark | `AA-compliant` |
| `rgba(32,29,38,.65)` / `rgba(212,198,225,.65)` | AA control boundary, light / dark | `AA-compliant` |

The bubble **foregrounds** and translucent chrome fills are implementation-local surface values, not identity colors: they carry no participant meaning and were not part of the ratified identity ramp. They are recorded here so the template holds no undocumented color.

## How to use it

1. Copy `message-archive.template.html` into the consuming project and sync a local `_dsa-tokens/` mirror. For the **editable template** the mirror is a linked build input; for the **delivered archive** it is inlined and sealed away — see *Seal-time font handling* below, because inlining the token CSS alone does **not** seal the fonts.
2. Emit the message markup from your normalized model. Preserve `data-pid`, `data-role`, `data-channel`, and `data-s`.
3. Set `data-flavor` and `data-party-mode` on the root element.
4. Replace every `[placeholder]`.
5. Record the manifest — see `MANIFEST.md.example`.
6. Run `hard-fail-checklist.md` before sealing.

**Whitespace contract:** `.ma-m` carries `white-space: pre-wrap` so message text keeps its own line breaks. A generator must emit the opening tag and the first child with **nothing between them** — any newline or indentation there is rendered as literal leading whitespace inside the bubble.

## Seal-time font handling

The editable template **links** `./_dsa-tokens/colors_and_type.css` as a build input. A delivered single-file archive must carry **no sibling stylesheet and no font dependency** — and inlining the token CSS alone does not achieve that: `colors_and_type.css` declares four `@font-face` blocks whose `src` values are **relative** (`fonts/InterVariable.woff2` and siblings). Inlined unchanged, those URLs resolve against the archive's own location and break.

Two sealing modes are valid. **Declare which one the artifact used in its manifest.** The mechanical mode can be inspected in the delivered bytes; input-file provenance, recorded hashes, and whether a fidelity downgrade was deliberate cannot be established from those bytes alone.

### `embedded-data-uri` — preferred, full fidelity

For a single delivered HTML:

- inline `colors_and_type.css`;
- **preserve** the `@font-face` declarations;
- replace every relative font URL with a **base64 `data:` URI generated from the copied WOFF2 bytes**;
- preserve Inter and JetBrains Mono;
- record the input font files, their SHA-256, and the sealing mode in the manifest.

Bind each embedded payload to the **copied mirror file and its recorded hash**. Base64-encoding an arbitrary local font that merely shares a name is not this mode.

### `fallback-stacks` — permitted, documented downgrade

Where the consumer deliberately chooses not to embed font bytes:

- **remove** the `@font-face` declarations entirely;
- retain the existing `--font-sans` / `--font-mono` fallback stacks so font *roles* survive;
- leave no relative or external font URL anywhere in the delivered artifact;
- record in the manifest that **canonical font files are not carried by the artifact** and that **exact typography is not guaranteed** by it.

Be precise about what this mode does and does not determine. The retained stacks still *begin* with `'Inter'` and `'JetBrains Mono'`, so rendering is **environment-dependent**: a viewing system with those families installed locally may resolve them; another falls through to the later generic entries. The invariant is not a prediction about which family appears — it is that the artifact **carries no canonical font bytes and therefore cannot guarantee typography across environments**.

This is a legitimate sealed-output option. It is **not** typography parity — do not present a fallback-mode archive as equivalent to one with embedded Inter + JetBrains Mono, and do not claim guaranteed typography on the strength of a machine that happens to have the fonts installed.

Prior sealed archives remain valid at their recorded SHA. This clarification records how to seal correctly going forward; it **creates no retrofit obligation** (see below).

## Snapshot / retention doctrine

An archive is frozen at render time. Regenerating an archive produces a **new artifact**, not an edit of the old one. A new render may supersede an earlier one under the consumer's own status and naming convention, but every reviewed, accepted, or shared prior render **remains retained** — supersession is history, not deletion. This pattern prescribes **no universal supersession filename marker**. Prior sealed archives remain valid at their recorded SHA and are not retrofitted when this pattern changes.

## Tier 3 overlay slot

Consumers supply their own Tier 3 identity, source-truth posture, content, and domain structure. Hosting this scaffold here does not make `design-system-ASK` the owner of downstream archive content.

## What not to edit

Do not fork the template, duplicate the message markup or script, add a flavor-specific geometry branch, rebind `--fg-*` globally, promote the pattern-local participant values into `colors_and_type.css`, or introduce a semantic state system on participant color.

## Class A vs Class B

This is Class B (project-output artifacts). Class A is the system / architecture diagram family. The classes stay distinct; do not fuse. Both inherit Tier 1 + Tier 2, but they bind color differently because they apply it differently. Class A represents system / architecture structures; the **static** Class A patterns are explicitly structural and **state-free**, while some Class A surfaces opt into a semantic *state* or *function* role (Spectral State, Evidence State, Three Functions). This pattern uses color for **participant identity** — a third axis, and pattern-local.
