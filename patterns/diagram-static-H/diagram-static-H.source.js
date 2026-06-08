/* diagram-static-H.source.js
   Source data for the diagram tree.
   Renderable by diagrams-static-H-engine.js.

   DOWNSTREAM: replace this placeholder tree with your project's actual
   structure. Bump the source-v / render-v stamp in diagram-static-H.html
   when topology or major content changes.

   Tree node shape:
     { kind: 'root'|'section'|'group'|'node', label, note?, tag?, status?, children? }
     kind defaults to 'node' if omitted
     status: 'earned' (default) | 'held' | 'legacy'
*/

window.TREE_DIAGRAM = {
  kind: 'root',
  label: '[project-root]',
  note: '[short root context · what this repo is]',
  children: [
    {
      kind: 'section', label: 'first section',
      children: [
        { label: '[node-1]', note: '[note placeholder]' },
        { label: '[node-2]' },
        { kind: 'group', label: 'group example', children: [
          { label: '[child-a]' },
          { label: '[child-b]' },
          { label: '[child-c]', note: '[group child with note]' },
        ]},
        { label: '[held-node]', status: 'held', note: '[held: not yet authorized]' },
      ],
    },
    {
      kind: 'section', label: 'second section',
      tag: 'optional-section-tag',
      children: [
        { label: '[node-3]', note: '[note placeholder]' },
        { label: '[node-4]' },
        { label: '[legacy-node]', status: 'legacy', note: '[legacy residue]' },
      ],
    },
    {
      // REGRESSION GUARD (static-H engine, 2026-06): a section WITH a long note —
      // reproduces the asset-pipeline-ASK ontology failure where a measured-but-
      // unrendered section note inflated the depth-1 column and stretched every
      // first-level connector. The section render branch does not draw notes, so this
      // note must NOT contribute to measured column width. Keep this case unless/until
      // section-note rendering is deliberately added to the visual grammar.
      kind: 'section', label: 'third section',
      note: 'deliberately long section note, present only to verify that an unrendered section note does not stretch the depth-1 column or its connector spans — it must not contribute to measured width',
      children: [
        { label: '[node-5]' },
        { label: '[node-6]', note: '[short note]' },
      ],
    },
  ],
};
