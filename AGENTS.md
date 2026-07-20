# AGENTS.md — design-system-ASK

Baseline: `apexSolarKiss/control-surface/AGENTS.md` applies in full. This file adds repo-specific deltas. If this file and the baseline conflict, this file wins for `design-system-ASK`.

## Required reads

Before changing this repo, read:

- `README.md`
- `CONSUMERS.md`
- `SKILL.md` when the change affects generated interface guidance or agent-facing design behavior
- the relevant source file(s): `colors_and_type.css`, `spectral-state.*`, `evidence-state.*`, `three-functions.*`, `patterns/*`, `preview/styleguide.html`, `assets/`, or `fonts/`
- the relevant `patterns/*/README.md` for any scaffold change

For ASK-control-surface work that touches shared foundations, consumers, or propagation, also read the operator-side consumer / propagation ledger:
`ecology-ASK-EXTERNAL/design-system-ASK_consumer-ledger.md`.

Public `CONSUMERS.md` is landed-public-only. It is not the complete propagation map.

## Repo-specific rules

- **Propagation caution.** This repo is upstream of multiple public, operator-side, and private/firewalled consumers. A change to tokens, engines, `diagrams.css`, export scripts, Spectral State, Evidence State, Three Functions, fonts, logo assets, or scaffold contracts may require downstream re-sync. Enumerate the affected consumer class in the change summary and flag the propagation obligation.
- **Foundation discipline.** Tokens, typography, palette, role names, logo logic, and scaffold contracts are identity-bearing. Do not add, rename, remove, or reinterpret them without explicit ASK source-of-intent.
- **Consumer ownership boundary.** `design-system-ASK` owns shared source files, engines, CSS, and export scripts. Consumers own their source data, artifact generation, sealing, committed rasters/PDFs/HTMLs, render stamps, and frozen artifacts.
- **Public registry discipline.** `CONSUMERS.md` records landed public consumption relationships only. Do not add pins, private consumer names, future-state claims, or operator-only propagation details to public repo surfaces.
- **Wall rule.** Private/firewalled payloads never enter this repo. Public surfaces may acknowledge a private operator-internal consumer only in the already-approved abstract form; details live operator-side.

## Upstream propagation trigger

design-system-ASK is the diagram/foundation **owner**, not a downstream consumer: it carries the propagation *trigger*, not a recipient grant. Recipient grants live in each consumer's own `AGENTS.md`.

On a merged change to a vendored foundation, engine, helper, stylesheet, exporter, font carrier, semantic primitive, or scaffold contract, produce an **owner-delta manifest** and invoke the control-surface propagation-wave protocol (`control-surface/AGENTS.md` §Cross-Repo Propagation Waves and `control-surface/prompts/cross-repo-propagation-wave.md`).

The owner-delta manifest names: the landed SHA; the changed files and their blobs; the affected pattern classes; the expected live-render impact; the expected export/raster impact; the known neutral classes; and the consumer classes requiring census.

Record the manifest and propagation state **operator-side**, in `ecology-ASK-EXTERNAL/design-system-ASK_consumer-ledger.md` (already the propagation ledger per §Required reads), honoring the wall and public-registry discipline: no pins, private/firewalled consumer names, future-state claims, or operator-only propagation details enter the public `CONSUMERS.md`, which stays landed-public-only. This extends the existing **Propagation caution** bullet under §Repo-specific rules (which already establishes the enumerate-affected-consumers-and-flag obligation) with the standing mechanism; it does not duplicate or supersede it. Consumer adaptation, sealing, stamps, and rasters remain under each consumer's governing contract.
