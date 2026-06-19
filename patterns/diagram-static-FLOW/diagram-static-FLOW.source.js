/* diagram-static-FLOW.source.js
   GENERIC placeholder data for the convergence-flow diagram.
   Renderable by diagrams-static-FLOW-engine.js.

   This fixture is intentionally domain-free — it exercises every primitive of
   the convergence-flow topology class so the scaffold can be inspected on its
   own, NOT a specific project's diagram. DOWNSTREAM: replace it wholesale with
   your project's structure, rename the files, and bump the source-v / render-v
   stamp in diagram-static-FLOW.html.

   Grammar (see diagrams-static-FLOW-engine.js header for the full contract):
     band      — optional top band of shared attributes (small boxes + a tag)
     carrier   — optional left carrier joined to the field by a lateral rail
     field     — a grouped set of source nodes that converge
     converge  — the many-to-one convergence node
     spine     — ordered process rows; a row may be a single node or a
                 { parallel: [...] } fan-out that reconverges into the next row
     evalEdges — dashed cross-stage evaluation edges (a source evaluating a
                 realized result a second time — not a feedback loop)
     returnEdge— optional dotted edge from a late node back to the carrier
   status: 'earned' (default) | 'held' | 'legacy', honored on any node.
*/

window.FLOW_DIAGRAM = {
  band: {
    tag: 'shared attribute band',
    items: ['attribute one', 'attribute two', 'attribute three', 'attribute four'],
  },
  carrier: {
    label: 'carrier',
    note: 'participates via the rail',
    railTag: 'lateral relation',
  },
  field: {
    tag: 'source field',
    nodes: [
      { id: 'src1', label: 'source one' },
      { id: 'src2', label: 'source two', note: 'with a note' },
      { id: 'src3', label: 'source three' },
      { id: 'src4', label: 'held source', status: 'held', note: 'not yet authorized' },
    ],
  },
  converge: { id: 'resolved', label: 'resolved specification', note: 'many-to-one convergence' },
  spine: [
    { id: 'process', label: 'process' },
    { parallel: [
      { id: 'branchA', label: 'realized object a' },
      { id: 'branchB', label: 'realized object b' },
    ] },
    { id: 'evaluate', label: 'conformance', note: 'cross-stage evaluation' },
    { id: 'select', label: 'selection' },
    { id: 'govern', label: 'governance' },
    { id: 'output', label: 'governed output' },
  ],
  evalEdges: [
    { from: 'src1', to: 'evaluate' },
    { from: 'src3', to: 'evaluate' },
  ],
  returnEdge: { from: 'output', tag: 'reused as carrier' },
};
