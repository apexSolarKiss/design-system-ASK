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

   tag is SECTION-ONLY: only a `kind: 'section'` node renders `tag`, as its
   `// <tag>` subtitle (measured for width, granted box height, emitted). The
   engine does not read `tag` on root, group, or ordinary node records — a tag
   there is inert (never measured, sized, or drawn). For secondary text beneath
   a root, group, or ordinary node, use `note`, not `tag`.
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
        // REGRESSION GUARD (static-H engine, 2026-07): a group WITH a note — the mirror
        // image of the section guard below. The group branch used to measure this note
        // into the column width and take the taller note-bearing box, then never emit it:
        // invisible text that still moved layout, and a label centered in a box sized for
        // content that was not there. Unlike a section note, a group note IS part of the
        // visual grammar and is authored across live packages, so it must RENDER. Keep
        // this case so the note stays visible and keeps sizing its own column.
        { kind: 'group', label: 'group example', note: '[group note — must render, and must size its own column]', children: [
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
      // REGRESSION GUARD (static-H engine, 2026-06 width · 2026-07 height): a section
      // WITH a long note — reproduces the asset-pipeline-ASK ontology failure where a
      // measured-but-unrendered section note inflated the depth-1 column and stretched
      // every first-level connector. The section render branch does not draw notes, so
      // this note must contribute NEITHER measured column width NOR box height: the
      // section keeps the short box and centers its label. (The 2026-06 pass fixed only
      // width — the note stopped stretching the column but still bought the taller box,
      // leaving the label lifted over empty space.) A section TAG is rendered, so it
      // earns both. Keep this case unless/until section-note rendering is deliberately
      // added to the visual grammar.
      kind: 'section', label: 'third section',
      note: 'deliberately long section note, present only to verify that an unrendered section note affects neither the depth-1 column width nor the section box height — it must not stretch the column or its connector spans, and must not buy the taller note-bearing box',
      children: [
        { label: '[node-5]' },
        { label: '[node-6]', note: '[short note]' },
      ],
    },
  ],
};
