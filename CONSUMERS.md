# Consumers // design-system-ASK

Known **public** downstream repos with **landed** consumption of design-system-ASK patterns and tokens.

This file records **landed public consumption only** — which public repo already consumes which pattern or token module. It is a transparency record, not a customer list, not the full propagation ledger, and not a future-state plan. Queued, in-flight, or planned consumption, private/firewalled consumers, **vendored commit pins**, re-sync obligations, and pin drift are tracked operator-side, not here, by design — a pin is operational provenance and does not belong in the public registry.

Pattern consumers vendor a local, pinned mirror (`_dsa-tokens/`) — no CDN, no live hot-link; the ASK front door vendors the foundations (tokens, fonts, wordmark) directly rather than via a `_dsa-tokens/` mirror (see its row below). Each consumer owns its source data, chrome, generation, sealing, and frozen artifact; design-system-ASK owns the engine, CSS, and export script. Re-sync is the consumer's responsibility when an upstream pattern or token module changes.

## Public consumers

| Consumer | Public status | Consumes | Notes |
| --- | --- | --- | --- |
| `asset-pipeline-ASK` | production repo consumer | `diagram-static-H` · `diagram-static-V` · `diagram-static-SEQ` · `diagram-static-FLOW` · `diagram-interactive-spine` · Spectral State | Full Class A set — architecture-tree + ontology-tree (H), inheritance-spine (V), discretion-chain (SEQ), convergence-flow / Visual Payload Architecture (FLOW), interactive IA state spine. First `diagram-static-SEQ` and first `diagram-static-FLOW` consumer — both patterns graduated upstream from AP's own reference implementations. Only the interactive spine loads `spectral-state.css`. |
| `urban-observatory` | public project consumer | `diagram-static-H` · `diagram-interactive-spine` · Spectral State · Evidence State · `output-artifact` v2 | Static architecture-tree + ontology (both H). The **interactive IA-state spine consumes Spectral State directly** (loads `spectral-state.css`; roles `earned` / `structural` / `partial` / `proposed` / `deflated` / `held` / `external` / `neutral`). UO's **assessment / artifact layer consumes the Evidence State profile by reference**; UO keeps its local assessment vocabulary (`confirmed` / `weakened` / `contradicted` / `unresolved` / `not yet testable`) while design-system-ASK owns the reusable Evidence State profile vocabulary, value mapping, and presentation contract. Class B artifact-template wired (Tier 1 + Tier 2). Built three diagrams, not four — no `diagram-static-V` (no Axis-B inheritance ladder in UO). |
| `method-ASK` | method-surface diagram consumer | `diagram-static-H` | Single static topology diagram. |
| `control-surface` | protocol-surface diagram consumer | `diagram-static-H` | Architecture-tree diagram. |
| `ASK` | public reference implementation (live: A-S-K.studio) | `colors_and_type.css` (Tier 1 + Tier 2 tokens) · Inter + JetBrains Mono fonts · `logo-ASK` wordmark | The ASK meta-brand front door — a live static **reference implementation** of `design-system-ASK`. Vendors the canonical tokens, fonts, and wordmark directly (not the diagram `_dsa-tokens/` mirror), adds layout only, and carries **ASK's own Tier 3** — the one consumer that uses ASK's Tier 3 rather than supplying its own (it *is* ASK-the-entity). Not a Class A diagram / Spectral State consumer. |

## Vendoring granularity

**Shared contract, selective renderer.** The diagram source grammar and the `window.DIAGRAMS.render(TREE)` interface are a *shared contract*, uniform across the static pattern family, so source data is portable between engines. The concrete pattern engines (`diagram-static-{H,V,SEQ,FLOW}`, `diagram-interactive-spine`) are *renderer capacity* — the code a consumer actually runs.

Consumers vendor the complete canonical artifacts for the patterns/modules they **actually render**. Optional capabilities inside an adopted module travel with that module, even if unused, and must not be cherry-picked or locally forked. Unused pattern engines are **not** pre-vendored speculatively; a consumer adopts and vendors the *current* canonical engine when it first renders that pattern. Shared artifacts — the static exporter, the token mirror — remain whole shared artifacts, not split by dormant internal branches. The vendoring boundary traces the code seam: selective by pattern where engines diverge, whole where an artifact is genuinely shared — which keeps each consumer's re-sync obligation to exactly the patterns it exercises.

## What this file is not

- **Not a customer or marketing list.** It records implementation relationships between public repos, nothing more.
- **Not the full propagation ledger.** Queued / in-flight consumption, private/firewalled consumers, vendored commit pins, re-sync obligations, and pin drift are tracked operator-side, outside this public repo.
- **Not a currency guarantee.** Listing a consumer here does not assert it tracks the latest upstream; a consumer may lag until it re-syncs. Specific vendored pins and currency are operator-side provenance, deliberately not published here.

A private operator-internal consumer has also exercised the Class B `output-artifact` flow end-to-end; its contents remain firewalled and it is not listed here.
