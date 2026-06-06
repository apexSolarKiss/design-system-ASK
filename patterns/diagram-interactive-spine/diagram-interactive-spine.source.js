/* diagram-interactive-spine.source.js
   Placeholder source data for the interactive IA state spine.
   Renderable by diagrams-interactive-spine-engine.js.

   DOWNSTREAM: replace this placeholder with your project's own information
   architecture. The consuming project owns this file (source data + chrome);
   the engine / CSS / export are design-system-owned — do not edit them.

   DISCIPLINE: color encodes STATE only. Everything else — evidence, qualifier,
   mode coverage, repo pointer — is metadata shown in the inspector panel, never
   in hue. One state role per node. Draw states from current repo truth; give
   every state an honest example, do not invent nodes just for palette coverage.
   Illustrative, not source truth — repo prose remains authoritative.

   Node: { id, group, label, state, evidence, qualifier?, pointer, modes? }
     group: 'root' | 'mode' | 'spine' | 'question' | 'external'
     state: one of the eight Spectral State roles (see `states` below)
     modes: ids of the mode nodes this node intersects (selection isolates them)

   window.IA_SPINE.render(window.IA_STATE_SPINE) is called by the page.
*/

window.IA_STATE_SPINE = {
  meta: {
    title: '[IA state surface]',
    subtitle: '[axis-independent state surface · what is earned / held / deflated, and where]',
    stamp: { source: 'source-v1', render: 'render-v1', date: '[YYYY-MM-DD]' },
  },

  // Legend / state vocabulary — the eight Spectral State roles (inherited, do not rename).
  states: [
    { role: 'earned',     label: 'earned',     meaning: 'operationally grounded at full depth' },
    { role: 'structural', label: 'structural', meaning: 'structurally / schema proven; not full-flow pressured' },
    { role: 'partial',    label: 'partial',    meaning: 'operational at bounded depth' },
    { role: 'proposed',   label: 'proposed',   meaning: 'articulated as a candidate; not yet pressured' },
    { role: 'deflated',   label: 'deflated',   meaning: 'pressure showed it unnecessary / dead' },
    { role: 'held',       label: 'held',       meaning: 'a named open question, not yet resolved' },
    { role: 'external',   label: 'external',   meaning: 'owned elsewhere (inherited / upstream)' },
    { role: 'neutral',    label: 'neutral',    meaning: 'no asserted state (the lavender field)' },
  ],

  nodes: [
    // ---- root / framing (asserts no state) ----
    { id: 'root', group: 'root', label: '[IA root / framing]', state: 'neutral',
      evidence: '[Framing root — asserts no state.]', pointer: '[docs/architecture.md]' },

    // ---- mode axes (orthogonal; selecting one isolates the nodes that touch it) ----
    { id: 'm-a', group: 'mode', label: '[mode A]', state: 'earned',
      evidence: '[Full-flow exercised in this mode.]', pointer: '[docs/...]' },
    { id: 'm-b', group: 'mode', label: '[mode B]', state: 'partial',
      evidence: '[Operational at bounded depth in this mode.]',
      qualifier: '[bounded operational depth]', pointer: '[docs/...]' },

    // ---- spine: the IA layers / surfaces (upstream → downstream) ----
    { id: 's-1', group: 'spine', label: '[upstream layer]', state: 'structural',
      evidence: '[Structurally signaled; not full-flow pressured.]',
      pointer: '[docs/...]', modes: ['m-a', 'm-b'] },
    { id: 's-2', group: 'spine', label: '[middle layer]', state: 'earned',
      evidence: '[The strongest current carrier; operationally grounded.]',
      pointer: '[docs/...]', modes: ['m-a', 'm-b'] },
    { id: 's-3', group: 'spine', label: '[seam / transform]', state: 'partial',
      evidence: '[Operational where pressured; bounded elsewhere.]',
      qualifier: '[earned where operationally pressured]', pointer: '[docs/...]', modes: ['m-a'] },
    { id: 's-4', group: 'spine', label: '[downstream terminal layer]', state: 'earned',
      evidence: '[Durable terminal output; operationally exercised.]',
      pointer: '[docs/...]', modes: ['m-a', 'm-b'] },

    // ---- architectural-question nodes (open questions / candidates) ----
    { id: 'q-1', group: 'question', label: '[open question]', state: 'held',
      evidence: '[A named open question, not yet resolved.]', pointer: '[docs/...]', modes: ['m-a', 'm-b'] },
    { id: 'q-2', group: 'question', label: '[candidate path]', state: 'proposed',
      evidence: '[Articulated as a candidate; not yet pressured.]', pointer: '[docs/...]' },
    { id: 'q-3', group: 'question', label: '[retired idea]', state: 'deflated',
      evidence: '[Pressure showed it unnecessary / dead.]',
      qualifier: '[held for other modes]', pointer: '[docs/...]', modes: ['m-b'] },

    // ---- external (owned elsewhere / inherited) ----
    { id: 'x-1', group: 'external', label: '[upstream / inherited surface]', state: 'external',
      evidence: '[Owned elsewhere — inherited by reference; this project is the consumer.]',
      pointer: '[docs/.../MANIFEST.md]' },
  ],
};
