/* diagram-static-network.source.js — the network sources the specimen draws, as one NETWORK_DIAGRAMS array
   (window.NETWORK_DIAGRAMS in a page, module.exports in Node). Payload, not engine: a consumer replaces it
   with its own sources.

   network.forward-backward  the reference specimen: a feed-forward network and its forward and backward
                             passes, with the topology, notation and equations of LeCun, Bengio and Hinton,
                             "Deep learning", Nature 521, 436–444 (2015), Fig. 1c–d, read from the paper:
                             layers of 3, 4, 3 and 2 units, the 23 connections the figure draws, the marked
                             units i, j, k, l and the weights w_ij, w_jk, w_kl. The paper sets the summation
                             limit's membership as "ε"; this source sets "∈", the sign for that relation.
                             Its notes carry the caption's assumptions and how undrawn connections enter a sum.
                             The credit names the figure; it is drawn in every mode and every export.
                             This entry and the forward and backward equation sets it uses are excluded,
                             with every rendering or export of the specimen, from design-system-ASK's
                             Apache License 2.0 grant; no license to the source material is granted.
                             See design-system-ASK's NOTICE.
   network.sparse-5-2-3      a synthetic second specimen with no source and no credit: a different layer
                             count, different populations and sparse connections, with generic labels, two
                             marks, one weight and one equation of its own, drawn through the same engine with
                             no specimen-specific branch. */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.NETWORK_DIAGRAMS = data;
})(typeof self !== 'undefined' ? self : this, (function () {
  'use strict';
  const I = (s) => ({ i: s }), R = (s) => ({ r: s });
  const v = (name, idx) => [I(name), { sub: [I(idx)] }];
  const d = (top, bot) => ({ frac: [[R('∂'), ...top], [R('∂'), ...bot]] });
  const inSet = (idx, setName) => ({ sum: [I(idx), { m: '∈' }, R(setName)] });

  /* network.forward-backward's equations: excluded from design-system-ASK's Apache License 2.0 grant,
     as the header says. */
  const forward = [
    { layer: 'out', lines: [[...v('y', 'l'), R(' = '), I('f'), R('('), ...v('z', 'l'), R(')')], [...v('z', 'l'), R(' = '), inSet('k', 'H2'), ...v('w', 'kl'), R(' '), ...v('y', 'k')]] },
    { layer: 'h2', lines: [[...v('y', 'k'), R(' = '), I('f'), R('('), ...v('z', 'k'), R(')')], [...v('z', 'k'), R(' = '), inSet('j', 'H1'), ...v('w', 'jk'), R(' '), ...v('y', 'j')]] },
    { layer: 'h1', lines: [[...v('y', 'j'), R(' = '), I('f'), R('('), ...v('z', 'j'), R(')')], [...v('z', 'j'), R(' = '), inSet('i', 'Input'), ...v('w', 'ij'), R(' '), ...v('x', 'i')]] },
  ];
  const backward = [
    { layer: 'out', lines: [[d([I('E')], v('y', 'l')), R(' = '), ...v('y', 'l'), R(' − '), ...v('t', 'l')], [d([I('E')], v('z', 'l')), R(' = '), d([I('E')], v('y', 'l')), R(' '), d(v('y', 'l'), v('z', 'l'))]] },
    { layer: 'h2', lines: [[d([I('E')], v('y', 'k')), R(' = '), inSet('l', 'out'), ...v('w', 'kl'), R(' '), d([I('E')], v('z', 'l'))], [d([I('E')], v('z', 'k')), R(' = '), d([I('E')], v('y', 'k')), R(' '), d(v('y', 'k'), v('z', 'k'))]] },
    { layer: 'h1', lines: [[d([I('E')], v('y', 'j')), R(' = '), inSet('k', 'H2'), ...v('w', 'jk'), R(' '), d([I('E')], v('z', 'k'))], [d([I('E')], v('z', 'j')), R(' = '), d([I('E')], v('y', 'j')), R(' '), d(v('y', 'j'), v('z', 'j'))]] },
  ];

  return [
    {
      id: 'network.forward-backward',
      title: 'Layered networks // forward and backward passes',
      layers: [
        { id: 'in', n: 3, label: 'Input units' },
        { id: 'h1', n: 4, label: 'Hidden units H1' },
        { id: 'h2', n: 3, label: 'Hidden units H2' },
        { id: 'out', n: 2, label: 'Output units' },
      ],
      edges: [
        ['in.0', 'h1.0'], ['in.0', 'h1.1'], ['in.0', 'h1.2'], ['in.1', 'h1.1'], ['in.1', 'h1.2'], ['in.1', 'h1.3'], ['in.2', 'h1.2'], ['in.2', 'h1.3'],
        ['h1.0', 'h2.0'], ['h1.0', 'h2.1'], ['h1.1', 'h2.0'], ['h1.1', 'h2.1'], ['h1.2', 'h2.0'], ['h1.2', 'h2.1'], ['h1.2', 'h2.2'], ['h1.3', 'h2.1'], ['h1.3', 'h2.2'],
        ['h2.0', 'out.0'], ['h2.0', 'out.1'], ['h2.1', 'out.0'], ['h2.1', 'out.1'], ['h2.2', 'out.0'], ['h2.2', 'out.1'],
      ],
      marks: { 'in.1': 'i', 'h1.2': 'j', 'h2.1': 'k', 'out.1': 'l' },
      weights: [
        { from: 'in.1', to: 'h1.2', label: v('w', 'ij') },
        { from: 'h1.2', to: 'h2.1', label: v('w', 'jk') },
        { from: 'h2.1', to: 'out.1', label: v('w', 'kl') },
      ],
      panels: [
        { title: 'Forward pass', direction: 'up', signals: 'leaving', layerLabels: true, equations: forward },
        { title: 'Backward pass', direction: 'down', signals: 'entering', equations: backward },
      ],
      notes: [
        'Bias terms omitted. The displayed output derivative assumes squared-error loss.',
        'Undrawn connections are absent; weights for absent connections are zero in sums over a complete layer.',
      ],
      credit: 'Topology and notation after LeCun, Bengio and Hinton, "Deep learning", Nature 521, 436–444 (2015), Fig. 1c–d. Redrawn by ASK.',
    },
    {
      id: 'network.sparse-5-2-3',
      title: 'Layered networks // a sparse network',
      layers: [{ id: 'a', n: 5, label: 'Inputs' }, { id: 'b', n: 2, label: 'Hidden' }, { id: 'c', n: 3, label: 'Outputs' }],
      edges: [['a.0', 'b.0'], ['a.1', 'b.0'], ['a.2', 'b.0'], ['a.2', 'b.1'], ['a.3', 'b.1'], ['a.4', 'b.1'], ['b.0', 'c.0'], ['b.0', 'c.1'], ['b.1', 'c.1'], ['b.1', 'c.2']],
      marks: { 'a.2': 'p', 'b.1': 'q' },
      weights: [{ from: 'a.2', to: 'b.1', label: v('v', 'pq') }],
      panels: [{
        title: 'One pass', direction: 'up', signals: 'leaving', layerLabels: true,
        equations: [{ layer: 'b', lines: [[...v('h', 'q'), R(' = '), I('g'), R('('), inSet('p', 'A'), ...v('v', 'pq'), R(' '), ...v('x', 'p'), R(')')]] }],
      }],
    },
  ];
})());
