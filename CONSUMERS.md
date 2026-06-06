# Consumers // design-system-ASK

Known **public** downstream repos with **landed** consumption of design-system-ASK patterns and tokens.

This file records **landed public consumption only** — which public repo already consumes which pattern or token module, vendored by reference at a pinned commit. It is a transparency record, not a customer list, not the full propagation ledger, and not a future-state plan. Queued, in-flight, or planned consumption, private/firewalled consumers, re-sync obligations, and pin drift are tracked operator-side, not here, by design.

Every consumer vendors a local, pinned mirror (`_dsa-tokens/`) — no CDN, no live hot-link. Each consumer owns its source data and chrome; design-system-ASK owns the engine, CSS, and export. Re-sync is the consumer's responsibility when an upstream pattern or token module changes.

## Public consumers

| Repo | Consumes | Vendored pin | Notes |
| --- | --- | --- | --- |
| `asset-pipeline-ASK` | `diagram-static-H` · `diagram-static-V` · `diagram-interactive-spine` · Spectral State | `b3b32a5` | Full Class A set — architecture-tree + ontology-tree (H), inheritance-spine (V), interactive IA state spine. Only the interactive spine loads `spectral-state.css` (Spectral State v1.1). |
| `urban-observatory` | `diagram-static-H` · `output-artifact` (v2) | diagrams `20fc5d6` · artifact-template `040e7ca` | Static architecture-tree + ontology (H); Class B artifact-template wired as a Tier 1 + Tier 2 inheritance proof. |
| `method-ASK` | `diagram-static-H` | `3ecc03e` | Single static topology diagram. |
| `control-surface` | `diagram-static-H` | `3ecc03e` | Meta-surface architecture-tree diagram. |

## What this file is not

- **Not a customer or marketing list.** It records implementation relationships between public repos, nothing more.
- **Not the full propagation ledger.** Queued / in-flight consumption, private/firewalled consumers, re-sync obligations, and pin drift are tracked operator-side, outside this public repo.
- **Not a currency guarantee.** A vendored pin is a point-in-time snapshot; a consumer may lag the latest upstream commit until it re-syncs. The pin column records what each consumer vendored, not what is current upstream.

A private operator-internal consumer has also exercised the Class B `output-artifact` flow end-to-end; its contents remain firewalled and it is not listed here.
