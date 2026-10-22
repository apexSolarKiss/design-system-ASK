/* diagram-static-peer.source.js — the relation sources this specimen draws.

   DOWNSTREAM: replace these with your own specs. Each lists its nodes clockwise from the preset origin
   (triangle: top; square: upper left) and declares every pair once, as 'directed' (from → to),
   'neutral', or 'unspecified' for a pair left open. Labels are one character, A–Z or 0–9. The words in
   meaning are the instance's own: the engine draws a relation by its type and reads no meaning into it.
   Replacing a label moves nothing; the geometry belongs to the preset.

   A-S-K and L-E-O-V are ASK's instances, read as a game (directed: beats; neutral: ties). The templates
   carry numbered slots and no reading. The all-directed square and R-S-P are the specimen's comparison
   and relabeling examples. Every directed cycle here runs clockwise, the order the labels read, and its
   relations are listed in that order: a convention of these sources, not a rule of the engine, which
   draws whichever direction a spec declares. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PEER_DIAGRAMS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var GAME = { directed: 'beats', neutral: 'ties (neutral)', verb: 'beats', neutralPlain: 'tie' };
  var SLOTS = { directed: 'directed relation', neutral: 'neutral relation', verb: 'to', neutralPlain: 'are neutral' };

  return [
    // ---- instances

    {
      id: 'triangle.A-S-K', preset: 'triangle', role: 'instance',
      title: 'A-S-K // A beats S, S beats K, K beats A',
      nodes: [{ id: 'a', label: 'A' }, { id: 's', label: 'S' }, { id: 'k', label: 'K' }],
      relations: [
        { from: 'a', to: 's', type: 'directed' },
        { from: 's', to: 'k', type: 'directed' },
        { from: 'k', to: 'a', type: 'directed' },
      ],
      meaning: GAME,
    },
    {
      id: 'square.L-E-O-V', preset: 'square', role: 'instance',
      title: 'L-E-O-V // L beats E, E beats O, O beats V, V beats L; opposites tie',
      nodes: [{ id: 'l', label: 'L' }, { id: 'e', label: 'E' }, { id: 'o', label: 'O' }, { id: 'v', label: 'V' }],
      relations: [
        { from: 'l', to: 'e', type: 'directed' },
        { from: 'e', to: 'o', type: 'directed' },
        { from: 'o', to: 'v', type: 'directed' },
        { from: 'v', to: 'l', type: 'directed' },
        { from: 'l', to: 'o', type: 'neutral' },
        { from: 'e', to: 'v', type: 'neutral' },
      ],
      meaning: GAME,
    },

    // ---- comparison: the all-directed square, with decisive diagonals

    {
      id: 'square.L-E-O-V.original', preset: 'square', role: 'comparison',
      title: 'L-E-O-V, the all-directed square // decisive diagonals: O beats L, V beats E',
      nodes: [{ id: 'l', label: 'L' }, { id: 'e', label: 'E' }, { id: 'o', label: 'O' }, { id: 'v', label: 'V' }],
      relations: [
        { from: 'l', to: 'e', type: 'directed' },
        { from: 'e', to: 'o', type: 'directed' },
        { from: 'o', to: 'v', type: 'directed' },
        { from: 'v', to: 'l', type: 'directed' },
        { from: 'o', to: 'l', type: 'directed' },
        { from: 'v', to: 'e', type: 'directed' },
      ],
      meaning: GAME,
    },

    // ---- templates: numbered slots, the relation structure each preset ships with

    {
      id: 'triangle.template', preset: 'triangle', role: 'template',
      title: 'Triangle template // three equal slots, one directed cycle',
      nodes: [{ id: 'n1', label: '1' }, { id: 'n2', label: '2' }, { id: 'n3', label: '3' }],
      relations: [
        { from: 'n1', to: 'n2', type: 'directed' },
        { from: 'n2', to: 'n3', type: 'directed' },
        { from: 'n3', to: 'n1', type: 'directed' },
      ],
      meaning: SLOTS,
    },
    {
      id: 'square.template', preset: 'square', role: 'template',
      title: 'Square template // four equal slots, a directed perimeter cycle, neutral opposites',
      nodes: [{ id: 'n1', label: '1' }, { id: 'n2', label: '2' }, { id: 'n3', label: '3' }, { id: 'n4', label: '4' }],
      relations: [
        { from: 'n1', to: 'n2', type: 'directed' },
        { from: 'n2', to: 'n3', type: 'directed' },
        { from: 'n3', to: 'n4', type: 'directed' },
        { from: 'n4', to: 'n1', type: 'directed' },
        { from: 'n1', to: 'n3', type: 'neutral' },
        { from: 'n2', to: 'n4', type: 'neutral' },
      ],
      meaning: SLOTS,
    },

    // ---- relabeling: rock, paper, scissors on the same triangle, in its clockwise order R, S, P

    {
      id: 'triangle.R-P-S', preset: 'triangle', role: 'relabel',
      title: 'R-S-P // rock beats scissors, scissors beats paper, paper beats rock',
      nodes: [{ id: 'r', label: 'R' }, { id: 's', label: 'S' }, { id: 'p', label: 'P' }],
      relations: [
        { from: 'r', to: 's', type: 'directed' },
        { from: 's', to: 'p', type: 'directed' },
        { from: 'p', to: 'r', type: 'directed' },
      ],
      meaning: GAME,
    },
  ];
});
