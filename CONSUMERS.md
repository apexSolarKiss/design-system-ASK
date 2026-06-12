# Consumers // design-system-ASK

Known **public** downstream repos with **landed** consumption of design-system-ASK patterns and tokens.

This file records **landed public consumption only** — which public repo already consumes which pattern or token module. It is a transparency record, not a customer list, not the full propagation ledger, and not a future-state plan. Queued, in-flight, or planned consumption, private/firewalled consumers, **vendored commit pins**, re-sync obligations, and pin drift are tracked operator-side, not here, by design — a pin is operational provenance and does not belong in the public registry.

Every consumer vendors a local, pinned mirror (`_dsa-tokens/`) — no CDN, no live hot-link. Each consumer owns its source data and chrome; design-system-ASK owns the engine, CSS, and export. Re-sync is the consumer's responsibility when an upstream pattern or token module changes.

## Public consumers

| Consumer | Public status | Consumes | Notes |
| --- | --- | --- | --- |
| `asset-pipeline-ASK` | production repo consumer | `diagram-static-H` · `diagram-static-V` · `diagram-static-SEQ` · `diagram-interactive-spine` · Spectral State | Full Class A set — architecture-tree + ontology-tree (H), inheritance-spine (V), discretion-chain (SEQ), interactive IA state spine. First `diagram-static-SEQ` consumer — the pattern graduated upstream from AP's own reference implementation. Only the interactive spine loads `spectral-state.css`. |
| `urban-observatory` | public project consumer | `diagram-static-H` · `diagram-interactive-spine` · Spectral State · `output-artifact` v2 | Static architecture-tree + ontology (both H); interactive IA state spine (Spectral State). Class B artifact-template wired (Tier 1 + Tier 2). Built three diagrams, not four — no `diagram-static-V` (no Axis-B inheritance ladder in UO). |
| `method-ASK` | method-surface diagram consumer | `diagram-static-H` | Single static topology diagram. |
| `control-surface` | protocol-surface diagram consumer | `diagram-static-H` | Architecture-tree diagram. |

## What this file is not

- **Not a customer or marketing list.** It records implementation relationships between public repos, nothing more.
- **Not the full propagation ledger.** Queued / in-flight consumption, private/firewalled consumers, vendored commit pins, re-sync obligations, and pin drift are tracked operator-side, outside this public repo.
- **Not a currency guarantee.** Listing a consumer here does not assert it tracks the latest upstream; a consumer may lag until it re-syncs. Specific vendored pins and currency are operator-side provenance, deliberately not published here.

A private operator-internal consumer has also exercised the Class B `output-artifact` flow end-to-end; its contents remain firewalled and it is not listed here.
