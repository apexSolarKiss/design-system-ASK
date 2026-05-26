# Pattern // static output artifact

A reusable static-artifact scaffold for downstream project-output artifacts — review packets, reports, dashboards, and similar human-readable deliverables that inherit the design-system-ASK visual language.

This is a **Class B** scaffold (project-output artifact templates), distinct from the **Class A** diagram-tree pattern.

## What this pattern is

A small consumption pattern. Four files:

- `README.md` — this file
- `static-output-artifact.html` — the template
- `MANIFEST.md.example` — the per-artifact provenance record
- `hard-fail-checklist.md` — the fails-inheritance test list

The pattern is **not** a component library, a generator, a build pipeline, an npm package, or a project-specific template. It is a starting point for downstream artifacts that consume design-system-ASK foundations.

## How to use it

1. Copy the four files in `patterns/output-artifact/` into your consuming project.
2. Sync `colors_and_type.css`, fonts, and any required assets from design-system-ASK into a local mirror (e.g. `./_dsa-tokens/`) alongside the template, pinned to a known upstream commit SHA.
3. Edit `static-output-artifact.html`: replace placeholder content with your artifact's actual content (title, sections, meta, footer references). Do not edit the token references or theme behavior.
4. Fill out a `MANIFEST.md` from `MANIFEST.md.example`: record the upstream commit SHA, copied files and checksums, your consuming project, your artifact path, your template version, and the render timestamp.
5. Render and freeze. The rendered artifact is auditable against the recorded SHA.

## What downstream must replace

- All placeholder content (title, subtitle, section headings, body text, meta values)
- The relative path to `colors_and_type.css` if your local mirror lives at a different path than `./_dsa-tokens/`
- Any Tier 3 overlay belongs to the consuming project, not to this pattern

## What not to edit

- The token references themselves (`var(--fg-1)`, `var(--bg-gradient)`, etc.)
- The light/dark inheritance behavior (no hardcoded `data-theme`)
- The type discipline (Inter for interface; JetBrains Mono for technical/meta only)
- The closed palette
- The hard-fail checklist baseline; downstream projects may add project-specific checks, but should not weaken or remove the inherited checks

## Static vs dynamic inheritance

Static artifacts inherit at generation time and freeze for audit. The rendered HTML reads the local copy of `colors_and_type.css` synced into the artifact bundle, not a live upstream URL. Re-render only when upstream tokens or the consuming template change in a way that affects the rendered surface; record a new SHA each time.

Production code, by contrast, may use a live dependency or import model.

## Source-truth boundary

design-system-ASK supplies the foundations (Tier 1 + Tier 2). The consuming project supplies its own Tier 3 identity, its own source-truth posture, and the artifact's content and domain structure. Hosting this scaffold in design-system-ASK does not make this repo the owner of downstream artifact content.

## Class A vs Class B

This is Class B (project-output artifact templates). Class A (system / architecture diagram templates) is a separate pattern when implemented. The two stay distinct; do not fuse.
