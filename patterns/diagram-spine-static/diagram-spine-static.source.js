/* diagram-spine-static.source.js
   Source data for the vertical spine diagram.
   Renderable by diagrams-spine-engine.js.

   DOWNSTREAM: replace this placeholder tree with your project's actual
   structure. Bump the source-v / render-v stamp in diagram-spine-static.html
   when topology or major content changes.

   Tree node shape (identical to the horizontal diagram-tree scaffold):
     { kind: 'root'|'section'|'group'|'node', label, note?, tag?, status?, children? }
     kind defaults to 'node' if omitted
     status: 'earned' (default) | 'held' | 'legacy'

   Placement note: the engine centers each parent over its children. A run of
   single-child nodes renders as a straight centered spine; branching nodes fan
   out symmetrically. No side/column field — placement is automatic.
*/

window.TREE_DIAGRAM = {
  kind: 'root',
  label: '[project-root]',
  note: '[short root context · what this axis depicts]',
  children: [
    {
      kind: 'section', label: 'first axis',
      children: [
        { label: '[node-1]', note: '[note placeholder]' },
        { kind: 'group', label: 'group example', children: [
          { label: '[child-a]' },
          { label: '[child-b]', note: '[group child with note]' },
        ]},
        { label: '[held-node]', status: 'held', note: '[held: not yet authorized]' },
      ],
    },
    {
      kind: 'section', label: 'second axis',
      tag: 'optional-section-tag',
      children: [
        // a single-child chain — demonstrates the straight centered spine
        { label: '[node-2]', children: [
          { label: '[node-3]', note: '[inherits from node-2]', children: [
            { label: '[node-4]', note: '[leaf of the chain]' },
          ]},
        ]},
        { label: '[legacy-node]', status: 'legacy', note: '[legacy residue]' },
      ],
    },
  ],
};
