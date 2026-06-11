/* diagram-static-SEQ.source.js
   Source data for the sequence diagram.
   Renderable by diagrams-static-SEQ-engine.js.

   DOWNSTREAM: replace this placeholder chain with your project's actual
   sequence. Bump the source-v / render-v stamp in diagram-static-SEQ.html
   when steps or major content change.

   Node shape (identical to the diagram-static-H / diagram-static-V scaffolds):
     { kind: 'root'|'node', label, note?, tag?, status?, children? }
     kind defaults to 'node' if omitted
     status: 'earned' (default) | 'held' | 'legacy'

   Sequence note: the engine flattens the chain depth-first into a linear run —
   the root stands alone (no connector), then each step points to the next with
   an arrow. Express the sequence as a single-child chain. The same data renders
   as a centered spine in the V engine. Branching input falls back to depth-first
   order with a console warning — trees belong to the H / V scaffolds.
*/

window.TREE_DIAGRAM = {
  kind: 'root',
  label: '[sequence title]',
  note: '[short root context · what this sequence depicts]',
  children: [
    { label: '1 · [first step]', note: '[what this step does]', children: [
      { label: '2 · [second step]', note: '[what this step does]', children: [
        { label: '3 · [third step]', note: '[what this step does]', children: [
          { label: '4 · [held step]', status: 'held', note: '[held: not yet authorized]' },
        ]},
      ]},
    ]},
  ],
};
