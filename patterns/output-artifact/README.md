# Pattern // static output artifact

A reusable static-artifact scaffold for downstream project-output artifacts — review packets, reports, dashboards, and similar human-readable deliverables that inherit the [design-system-ASK](../../README.md) visual language.

This is a **Class B** scaffold (project-output artifact templates), distinct from the **Class A** diagram patterns (the static `diagram-static-H` / `-V` / `-SEQ` / `-FLOW` and the interactive `diagram-interactive-spine`).

## What this pattern is

A small consumption pattern. Four files:

- `README.md` — this file
- `static-output-artifact.html` — the template (`output-artifact v3`), on the document register
- `MANIFEST.md.example` — the per-artifact provenance record (records the upstream SHA + per-file sha256)
- `hard-fail-checklist.md` — the fails-inheritance test list

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific template. It is a starting point for downstream artifacts that consume design-system-ASK foundations. The *renderer* that seals an artifact for delivery (see "Sealed output") is the **consuming project's** tooling and is not shipped here.

## On the document register

The template is a consumer of the [document register](../../README.md#adopting-the-document-register) and its surface treatments. Its text takes their roles. Each block text role sets its text's complete style — family, size, weight, leading, tracking and foreground; inline code and the disclosure's trigger inherit their leading from where they sit:

| Artifact text | Register role |
| --- | --- |
| the title | `h1.doc-title` |
| the subtitle or one-line context | `p.doc-lede` |
| a section title | `h2.doc-section-title` in a `section.doc-section`; deeper headings take `.doc-subsection-title` and `.doc-deep-title` |
| prose and list items | `.doc-body` |
| a link in artifact text | `a.surface-text-link` |
| a metadata or provenance name | `.doc-label` |
| a metadata or provenance value | `.doc-meta` |
| inline code | `code.doc-code` |
| words presented as someone's | `blockquote.doc-quote`, on the violet rail |
| a code or technical block | `pre.doc-pre`, on the magenta rail |
| a dense technical table | `table.doc-dense-table`, with `.doc-label` headers and `.doc-table-cell` values |
| a narrative table | an unmarked `table`, with `.doc-label` headers and `.doc-body` cells |
| secondary detail behind a disclosure | the treatments' disclosure, composed as the template composes it: `details.surface-disclosure.surface-material-panel.surface-attach-free.surface-elevation-flush`, with its label, indicator and body |

The register's other compositions — an authorial callout, a section framing, a section synthesis — are available to an artifact that needs them, in the same markup the register's key uses. The template's own CSS sets no type metric and no foreground on text. It owns only the artifact's geometry, which the register leaves to its consumer: the column, the metadata strip's and provenance footer's layout, list and table geometry, and rules. Its geometry rules are written at zero specificity, so none outranks a register rule. A narrative table has no shared composition yet: its geometry stays the artifact's, and its text takes the roles above.

Run the register's rendered check on a delivered artifact — `node tools/check-role-conformance.mjs --url <artifact>`, from a design-system-ASK checkout at the commit the artifact's `MANIFEST.md` records. It proves that every element carrying a role computes to that role, and it reports a page with no governed text as vacuous. It does not fail text that carries no role: it lists that text as `unmapped`, and the hard-fail checklist requires that list to be empty.

## Foreground is inherited — no local rebind

The foundation (`colors_and_type.css`) resolves the `--fg-*` ramp in light and dark, and the register's roles bind text to it. Since the foundation light-mode foreground ramp landed (the approved dark-purple foreground — `#6A637F` — on the light lavender field, not near-black ink), **prose reads correctly in both modes with no local foreground CSS**. This template therefore takes its text foreground from the register's roles on the foundation `--fg-*` and **does not** rebind `--fg-*` / `--line-*`. Do not reintroduce a local `--fg` rebind — it is no longer needed and would fork the foreground from the foundation.

## The one sanctioned Class B override — line intensity

Report rules, borders, table lines, and dividers read too faint at the foundation hairline (white `.45` / `.22`) on the light lavender field. The template carries a **Class B-scoped** token — `--artifact-line` / `--artifact-line-soft` — that uses **stronger white lines in light mode** and inherits the foundation lavender lines in dark mode. It is applied to the artifact's **own geometry** (the metadata strip, the rules on a table's cells, the provenance footer, `hr`) — never to a text foreground, a passage rail or the disclosure's panel — so it cannot affect prose color or a register treatment. This is the single legitimate token override for the class.

This mirrors how **Class A diagrams** scope color: a class-targeted `--diagram-*` token layer whose **text roles alias the foundation `--fg-*` ramp** while its structural **stroke roles stay local** — not a base-token rebind. The rule across the family:

| Class | Color is applied to… | So foreground binds to… |
| --- | --- | --- |
| **A** — diagrams | SVG elements via classes | foundation `--fg-*`, via aliased `--diagram-*` text roles; structural strokes use a local `--diagram-line*` overlay |
| **B** — output artifacts | the document register's role classes | foundation `--fg-*`, through the register's roles, plus a class-scoped `--artifact-line*` overlay for the artifact's own structural lines |
| **B** — message archive | bubble elements, and — in the `AA-compliant` flavor — page-level chrome, all via role classes | **role-scoped foregrounds.** `--fg-high-contrast` reaches two limbs: participant ink and search-highlight text on the sanctioned colored fills, and, in the `AA-compliant` **light** theme, essential page chrome, the archive title, and the focus indicator. In dark those page-level roles return to `--fg-1`. The author / frosted role foregrounds sit elsewhere. No global `--fg-*` rebind. Registered in [design-system-ASK](../../README.md) under **High-contrast foreground — registered uses** |

The two document-and-diagram classes bind **text** to the foundation `--fg-*` ramp; they differ only in how color reaches the element — Class B through the document register's role classes, Class A through class-targeted diagram roles that alias the foundation (SVG elements need class-targeted fills, and the diagram speaks in diagram roles). Each keeps a single scoped overlay for **structural lines only** (`--diagram-line*` / `--artifact-line*`), never for foreground — so neither forks the foreground from the foundation. The Class B **`message-archive`** is the one implemented case where bubble text does **not** read `--fg-*`: its bubble foregrounds are role-scoped per participant fill (identity, not state), and its `AA-compliant` flavor additionally raises page-level chrome, the archive title, and the focus indicator to the opt-in high-contrast role in the **light** theme, returning them to `--fg-1` in dark. Both limbs are one registered bounded use — see [design-system-ASK](../../README.md) **High-contrast foreground — registered uses**. It still adds no global rebind: every role color is applied by class to the archive's own elements, so inherited prose is untouched.

## How to use it

1. Copy the four files in `patterns/output-artifact/` into your consuming project.
2. Sync `colors_and_type.css`, fonts, and any required assets from design-system-ASK into a local mirror (e.g. `./_dsa-tokens/`), pinned to a known upstream commit SHA. Vendor the four document-register modules — `surface-panel.css`, `surface-text-link.css`, `surface-document.css`, `surface-treatments.css` — beside the template, from the same commit. They are visual modules, not part of the token mirror. (For a **single-file** artifact the mirror and the modules are only build inputs you inline and seal away; only a **multi-file package** keeps them linked — see *Single file vs shared mirror* below.)
3. Edit `static-output-artifact.html`: replace placeholder content (title, sections, meta, footer references) with your artifact's actual content. Replace the sample list, quotation, table, code block and disclosure, keeping each element's register role — do not restyle a role or add type declarations. Do not edit the token references, the line overlay, or the theme behavior.
4. Add any project-specific chrome (banners, status rails, review-status strips, branding) in the **Tier 3 overlay slot** — see below.
5. Fill out a `MANIFEST.md` from `MANIFEST.md.example`: record the upstream commit SHA, per-file sha256 (the token mirror and the register modules), your consuming project, artifact path, template version, and render timestamp.
6. Render, seal, and freeze (see "Sealed output"). The rendered artifact is auditable against the recorded SHA.

## Sealed output (contract, not tooling)

A delivered output artifact must be **self-contained**: it must open with full styling from any location (local file, email attachment, copied folder) with **no network and no sidecar**. Review artifacts have to survive delivery without a stylesheet or font going missing.

This is a **contract** the consuming project's renderer meets — typically by inlining the token CSS and embedding fonts at render time, then inlining the four register modules verbatim after it, in the order the template loads them: `surface-panel.css`, `surface-text-link.css`, `surface-document.css`, `surface-treatments.css`. None of the four loads a resource or imports a stylesheet. The renderer is consumer-owned and is **not** part of this pattern (no generator / build pipeline lives in design-system-ASK). The template here links the local mirror (`./_dsa-tokens/colors_and_type.css`) as the editable starting point; sealing happens in the consumer's render step. The hard-fail checklist enforces the self-contained requirement on the delivered artifact.

## Single file vs shared mirror

The `_dsa-tokens/` mirror is the right shape for a **multi-file package** — it is not a mandatory sidecar on every artifact. Choose by how many HTML files share the foundation:

- **A single HTML payload ships as one self-contained file.** Inline the token CSS and base64-embed the fonts at render time, so the artifact is literally one `.html` with no sidecar. The mirror, if used at all, is a build *input* that does not travel with the delivered file — do not ship a `_dsa-tokens/` folder next to a lone HTML.
- **A package of multiple HTML files that share the foundation vendors one shared `_dsa-tokens/` mirror** the files link, pinned to a known commit, and links the four register modules once from the package as well. The tokens and modules live once for the package rather than being duplicated into every file.

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

- Bind to foundation tokens (`--fg-*`, `--artifact-line`, type/spacing tokens) and give any text a register role. Do not redefine Tier 1/2 tokens, and do not restyle a register role.
- Stay inside the closed palette; introduce no new hues.
- Do **not** propagate the design-system's own identity (`logo-ASK`, the ASK wordmark, "ASK Design System" chrome) into the artifact unless the consuming project is itself an ASK-instance surface that has explicitly accepted that overlay, or, for the `logo-ASK` wordmark alone, ASK has explicitly assigned that wordmark to the consuming project as its locally supplied Tier 3 and the artifact falls within the assignment's recorded scope. An assignment is not inheritance, and it does not make that project ASK-the-entity.

A project that needs a distinct aesthetic (e.g. a sub-brand) layers it here as Tier 3, or maintains a child design-system layer — it does **not** fork this shared Class B foundation.

## What downstream must replace

- All placeholder content (title, subtitle, section headings, body text, the sample link, meta values, and the sample list, quotation and attribution, table, code, preformatted block and disclosure)
- The relative path to `colors_and_type.css` if your local mirror lives at a different path than `./_dsa-tokens/`, and the paths to the four register modules if you vendor them anywhere but beside the template
- The provenance footer values (from your `MANIFEST.md`)
- Any Tier 3 overlay (in the slot) belongs to the consuming project, not to this pattern

## What not to edit

- The token references themselves (`var(--fg-1)`, `var(--bg-gradient)`, `var(--artifact-line)`, etc.)
- The line-intensity overlay tokens and their light/dark blocks
- The light/dark inheritance behavior (no hardcoded `data-theme`; foreground inherited from the foundation, never rebound locally)
- The register role on each piece of text, and the register modules themselves (text takes its role, never a local type declaration)
- The closed palette
- The hard-fail checklist baseline; downstream projects may add project-specific checks, but should not weaken or remove the inherited checks

## Static vs dynamic inheritance

Static artifacts inherit at generation time and freeze for audit. The rendered HTML reads the local copies of `colors_and_type.css` and the register modules synced into the artifact bundle (or inlined at seal time), not a live upstream URL. Re-render only when upstream tokens or the consuming template change in a way that affects the rendered surface; record a new SHA each time.

Production code, by contrast, may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the artifact's content and domain structure. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream artifact content.

## Class A vs Class B

This is Class B (project-output artifact templates). Class A (system / architecture diagram templates) are separate patterns — the static `diagram-static-H` / `-V` / `-SEQ` / `-FLOW` and the interactive `diagram-interactive-spine`. The classes stay distinct; do not fuse. All inherit Tier 1 + Tier 2 from design-system-ASK, but they serve different artifact classes and — per the table above — bind color differently because they apply it differently.
