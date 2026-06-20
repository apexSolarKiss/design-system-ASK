/* diagram-static-FLOW.source.js — GENERIC demo fixture for the convergence-flow scaffold.
   Illustrates the data grammar ONLY; not tied to any consuming project's content.

   ONE shared source model, TWO render modes (cannot drift):
     - static/export: draws each node's `short` + topology; legible without interaction.
     - interactive:   same topology + a hover/click side panel fed by `detail`.
   Per node: label (interactive panel title) · short (static figure label) · detail {def, eg?, not?}.

   DOWNSTREAM: replace this generic fixture with your project's actual convergence flow.
   This is an example consumer of the grammar, not part of the template. */

window.FLOW_DIAGRAM = {
  carrier: {
    label: 'external carrier', short: 'carrier', note: 'input',
    rail: 'typed-reference rail', railTerms: 'anchor · evidence · constrain',
    detail: {
      def: 'An external input that sits outside the source field; the flow anchors to it, takes evidence from it, or constrains against it.',
      not: 'Not itself a source statement — it qualifies the field, it is not part of it.',
    },
  },
  rail: {
    detail: { def: 'Typed-reference rail: how a carrier qualifies the source field — as an anchor, as evidence, or as a constraint.', eg: 'anchor · evidence · constrain' },
  },
  field: {
    tag: 'source field',
    nodes: [
      { id: 's1', label: 'inherited specification', short: 'inherited spec',
        detail: { def: 'The instruction inherited down the scope chain to this point.', eg: 'scope » … » local' } },
      { id: 's2', label: 'ground truth', short: 'ground truth',
        detail: { def: 'The non-negotiable facts the realized result must stay faithful to.' } },
      { id: 's3', label: 'local specialization', short: 'local profile', status: 'held',
        detail: { def: 'Context-specific overrides applied locally.', not: 'Drawn dashed: not yet authorized — its placement is still open.' } },
      { id: 's4', label: 'output obligations', short: 'obligations',
        detail: { def: 'Required properties the realized output must satisfy.' } },
      { id: 's5', label: 'scoped prohibitions', short: 'prohibitions',
        detail: { def: 'What is disallowed within this scope.' } },
    ],
  },
  converge: { id: 'resolved', label: 'resolved specification', short: 'resolved spec', anchor: true,
    detail: { def: 'Every source input converged into one resolved instruction the next stage works from.' } },
  spine: [
    { id: 'realize', label: 'realization', short: 'realization',
      detail: { def: 'The resolved specification is realized into concrete output.' } },
    { parallel: [
      { id: 'object', label: 'realized object', short: 'object',
        detail: { def: 'A produced output and the properties it actually realized.' } },
      { id: 'relations', label: 'cross-object relations', short: 'relations',
        detail: { def: 'How outputs relate across the set — consistency, variation, sequence.', not: 'A set-level property, not a per-object one; the two are realized in parallel.' } },
    ] },
    { id: 'conform', label: 'conformance evaluation', short: 'conformance',
      detail: { def: 'The realized result is evaluated against the source obligations a second time.', eg: 'faithful? · fits? · permitted? · coherent?' } },
    { id: 'select', label: 'selection', short: 'selection',
      detail: { def: 'Choosing among conforming candidates.', not: 'Selection chooses; governance records.' } },
    { id: 'govern', label: 'governance', short: 'governance',
      detail: { def: 'The chosen output is recorded and made authoritative.' } },
    { id: 'result', label: 'governed result', short: 'governed result', anchor: true,
      detail: { def: 'The accepted, governed output of the flow.' } },
  ],
  evalEdges: [
    { from: 's2', to: 'conform' },
    { from: 's4', to: 'conform' },
    { from: 's5', to: 'conform' },
  ],
  futureCarrier: { from: 'result', node: 'future reference', short: 'future reference', edge: 'later reused',
    detail: { def: 'A governed result can later be supplied as a carrier input to a new run — closing the loop.' } },
};
