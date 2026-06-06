# Pattern // static output artifact

A reusable static-artifact scaffold for downstream project-output artifacts — review packets, reports, dashboards, and similar human-readable deliverables that inherit the design-system-ASK visual language.

This is a **Class B** scaffold (project-output artifact templates), distinct from the **Class A** diagram patterns (`patterns/diagram-static-H/`, `patterns/diagram-static-V/`).

## What this pattern is

A small consumption pattern. Four files:

- `README.md` — this file
- `static-output-artifact.html` — the template (`output-artifact v2`)
- `MANIFEST.md.example` — the per-artifact provenance record (records the upstream SHA + per-file sha256)
- `hard-fail-checklist.md` — the fails-inheritance test list

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific template. It is a starting point for downstream artifacts that consume design-system-ASK foundations. The *renderer* that seals an artifact for delivery (see "Sealed output") is the **consuming project's** tooling and is not shipped here.

## Foreground is inherited — no local rebind

The foundation (`colors_and_type.css`) styles base elements (`h1`–`h3`, `p`, `a`, `code`, `body`) bound to the `--fg-*` ramp, with light and dark resolved. Since the foundation light-mode foreground ramp landed (dark ink on the light lavender field), **prose reads correctly in both modes with no local foreground CSS**. This template therefore binds text to the foundation `--fg-*` and **does not** rebind `--fg-*` / `--line-*`. Do not reintroduce a local `--fg` rebind — it is no longer needed and would fork the foreground from the foundation.

## The one sanctioned Class B override — line intensity

Report rules, borders, table lines, and dividers read too faint at the foundation hairline (white `.45` / `.22`) on the light lavender field. The template carries a **Class B-scoped** token — `--artifact-line` / `--artifact-line-soft` — that uses **stronger white lines in light mode** and inherits the foundation lavender lines in dark mode. It is applied to the artifact's **own structural elements** (meta strip, disclosure borders, tables, footer, `hr`) by class — never to base elements — so it cannot affect inherited prose color. This is the single legitimate token override for the class.

This mirrors how **Class A diagrams** solve color: a scoped, class-targeted token layer (`--diagram-*`), not a base-token rebind. The rule across the family:

| Class | Color is applied to… | So foreground binds to… |
| --- | --- | --- |
| **A** — diagrams | SVG elements via classes | scoped `--diagram-*` tokens (text + stroke semantics; a deliberate drift seam) |
| **B** — output artifacts | base elements (`p`/`h1`/`h2` read `--fg-*` directly) | foundation `--fg-*`, plus a class-scoped `--artifact-line*` overlay for structural lines |
| future — interactive | TBD per artifact class | decided by where color is applied |

A scoped container token cannot reach base-element rules, which is why Class B binds foreground to the foundation rather than a scoped layer. Same principle as Class A — opposite answer — because the two classes apply color differently.

## How to use it

1. Copy the four files in `patterns/output-artifact/` into your consuming project.
2. Sync `colors_and_type.css`, fonts, and any required assets from design-system-ASK into a local mirror (e.g. `./_dsa-tokens/`), pinned to a known upstream commit SHA. (For a **single-file** artifact this mirror is only a build input you inline and seal away; only a **multi-file package** keeps a linked mirror — see *Single file vs shared mirror* below.)
3. Edit `static-output-artifact.html`: replace placeholder content (title, sections, meta, footer references) with your artifact's actual content. Replace the sample list/table/code block — do not restyle the element rules. Do not edit the token references, the line overlay, or the theme behavior.
4. Add any project-specific chrome (banners, status rails, review-status strips, branding) in the **Tier 3 overlay slot** — see below.
5. Fill out a `MANIFEST.md` from `MANIFEST.md.example`: record the upstream commit SHA, per-file sha256, your consuming project, artifact path, template version, and render timestamp.
6. Render, seal, and freeze (see "Sealed output"). The rendered artifact is auditable against the recorded SHA.

## Sealed output (contract, not tooling)

A delivered output artifact must be **self-contained**: it must open with full styling from any location (local file, email attachment, copied folder) with **no network and no sidecar**. Review artifacts have to survive delivery without a stylesheet or font going missing.

This is a **contract** the consuming project's renderer meets — typically by inlining the token CSS and embedding fonts at render time. The renderer is consumer-owned and is **not** part of this pattern (no generator / build pipeline lives in design-system-ASK). The template here links the local mirror (`./_dsa-tokens/colors_and_type.css`) as the editable starting point; sealing happens in the consumer's render step. The hard-fail checklist enforces the self-contained requirement on the delivered artifact.

## Single file vs shared mirror

The `_dsa-tokens/` mirror is the right shape for a **multi-file package** — it is not a mandatory sidecar on every artifact. Choose by how many HTML files share the foundation:

- **A single HTML payload ships as one self-contained file.** Inline the token CSS and base64-embed the fonts at render time, so the artifact is literally one `.html` with no sidecar. The mirror, if used at all, is a build *input* that does not travel with the delivered file — do not ship a `_dsa-tokens/` folder next to a lone HTML.
- **A package of multiple HTML files that share the foundation vendors one shared `_dsa-tokens/` mirror** the files link, pinned to a known commit. The tokens live once for the package rather than being duplicated into every file.

The rule, in one line: **link a shared mirror only when more than one file consumes it; a single payload seals to a single file.** Either way the delivered artifact still meets the self-contained contract above — sealed-inline for one file, folder-portable for a package.

## Snapshot / retention convention

A rendered output artifact is a **frozen audit object** once it is reviewed, accepted, or externally shared. The render → seal → freeze step is not the end of the story: how a *regenerated* artifact is retained is part of the contract.

**Required principle.** This is fixed across all consumers:

- A reviewed, accepted, or shared artifact is frozen. Regenerating it produces a **new** artifact, not an edit of the old one.
- Do **not** overwrite or delete a prior reviewed artifact as "stale". Superseding means **history, not deletion** — prior reviewed renders stay retained.

**Naming — consumer-owned.** The audit rule above is fixed; the filename shape is not. The scaffold prescribes no single default — choose the flavor that matches the artifact's rhythm:

- **Date-driven** outputs: `YYYY-MM-DD_<artifact-name>.html`
- **Iterative / revision-driven** outputs: `<artifact-name>_v<N>.html`

A consumer may also keep a stable canonical copy under a consumer-owned name for convenience, but prior reviewed renders must remain retained as dated or versioned snapshots. The consuming project picks the flavor; the design system fixes only the retention doctrine, not the filesystem convention.

## Tier 3 overlay slot

`static-output-artifact.html` carries a clearly marked, intentionally empty **Tier 3 overlay slot**. Project-specific identity — banners, status rails, review-status strips, project branding — belongs there, layered on top:

- Bind to foundation tokens (`--fg-*`, `--artifact-line`, type/spacing tokens). Do not redefine Tier 1/2 tokens.
- Stay inside the closed palette; introduce no new hues.
- Do **not** propagate the design-system's own identity (`logo-ASK`, the ASK wordmark, "ASK Design System" chrome) into the artifact unless the consuming project is itself an ASK-instance surface that has explicitly accepted that overlay.

A project that needs a distinct aesthetic (e.g. a sub-brand) layers it here as Tier 3, or maintains a child design-system layer — it does **not** fork this shared Class B foundation.

## What downstream must replace

- All placeholder content (title, subtitle, section headings, body text, meta values, sample list/table/code)
- The relative path to `colors_and_type.css` if your local mirror lives at a different path than `./_dsa-tokens/`
- The provenance footer values (from your `MANIFEST.md`)
- Any Tier 3 overlay (in the slot) belongs to the consuming project, not to this pattern

## What not to edit

- The token references themselves (`var(--fg-1)`, `var(--bg-gradient)`, `var(--artifact-line)`, etc.)
- The line-intensity overlay tokens and their light/dark blocks
- The light/dark inheritance behavior (no hardcoded `data-theme`; foreground inherited from the foundation, never rebound locally)
- The type discipline (Inter for interface; JetBrains Mono for code/technical/meta only)
- The closed palette
- The hard-fail checklist baseline; downstream projects may add project-specific checks, but should not weaken or remove the inherited checks

## Static vs dynamic inheritance

Static artifacts inherit at generation time and freeze for audit. The rendered HTML reads the local copy of `colors_and_type.css` synced into the artifact bundle (or inlined at seal time), not a live upstream URL. Re-render only when upstream tokens or the consuming template change in a way that affects the rendered surface; record a new SHA each time.

Production code, by contrast, may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the artifact's content and domain structure. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream artifact content.

## Class A vs Class B

This is Class B (project-output artifact templates). Class A (system / architecture diagram templates) are separate patterns at `patterns/diagram-static-H/` (horizontal) and `patterns/diagram-static-V/` (vertical). The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes and — per the table above — bind color differently because they apply it differently.
