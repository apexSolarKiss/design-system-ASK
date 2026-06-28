# AGENTS.md — design-system-ASK

Baseline: `apexSolarKiss/control-surface/AGENTS.md` applies in full. This file adds repo-specific deltas. If this file and the baseline conflict, this file wins for `design-system-ASK`.

## Required reads

Before changing this repo, read:

- `README.md`
- `CONSUMERS.md`
- `SKILL.md` when the change affects generated interface guidance or agent-facing design behavior
- the relevant source file(s): `colors_and_type.css`, `spectral-state.*`, `evidence-state.*`, `patterns/*`, `preview/styleguide.html`, `assets/`, or `fonts/`
- the relevant `patterns/*/README.md` for any scaffold change

For ASK-control-surface work that touches shared foundations, consumers, or propagation, also read the operator-side consumer / propagation ledger:
`design-system-ASK-EXTERNAL/design-system-ASK_consumer-ledger.md`.

Public `CONSUMERS.md` is landed-public-only. It is not the complete propagation map.

## Repo-specific rules

- **Propagation caution.** This repo is upstream of multiple public, operator-side, and private/firewalled consumers. A change to tokens, engines, `diagrams.css`, export scripts, Spectral State, Evidence State, fonts, logo assets, or scaffold contracts may require downstream re-sync. Enumerate the affected consumer class in the change summary and flag the propagation obligation.
- **Foundation discipline.** Tokens, typography, palette, role names, logo logic, and scaffold contracts are identity-bearing. Do not add, rename, remove, or reinterpret them without explicit ASK source-of-intent.
- **Consumer ownership boundary.** `design-system-ASK` owns shared source files, engines, CSS, and export scripts. Consumers own their source data, artifact generation, sealing, committed rasters/PDFs/HTMLs, render stamps, and frozen artifacts.
- **Public registry discipline.** `CONSUMERS.md` records landed public consumption relationships only. Do not add pins, private consumer names, future-state claims, or operator-only propagation details to public repo surfaces.
- **Wall rule.** Private/firewalled payloads never enter this repo. Public surfaces may acknowledge a private operator-internal consumer only in the already-approved abstract form; details live operator-side.
