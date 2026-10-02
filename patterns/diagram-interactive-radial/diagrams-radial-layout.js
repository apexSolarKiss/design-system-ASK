/* diagrams-radial-layout.js — the layout grammar of the interactive radial pattern.
   DOM-free; it runs the same in a page and in Node. It reads an assembled contract
   (diagrams-radial-contract.js) and returns world geometry.

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. README.md §Layout grammar is the text this
   file implements.

   GRAMMAR INVARIANTS — not configurable
     the root at the center; the first unit at 12 o'clock, proceeding clockwise
     every node's bearing lies inside its parent's wedge; sibling wedges are disjoint
     radius grows with containment depth along each lineage
     a container's leaves fan in rows beyond it, as one unit placed where the first leaf
       stands among its siblings

   DEFAULTS — fixed values, not settings
     ring radii 250 · 610 · 800, then +190 per tier; a 96 stagger between alternate
       containers below depth 1
     the root shares its circle by the square root of each unit's leaf count, with no inset
     a container below the root that holds containers shares its wedge after a 6% inset on
       each side, its leaves (if any) forming one unit
     a container that holds only leaves fans them across 90% of its own wedge, with no
       inset; a leaf unit inside a mixed container fans across 90% of its share
     fan rows of max(3, ceil(sqrt(1.9 n))), 34 apart
     mark radii 44 root · 76 depth-1 container · 15 deeper container · 5.2 leaf
     a bounds pad of 45

   SETTINGS — a closed set; an unknown key or a bad value is LAYOUT_OPTION
     allocation  how a container below the root shares its wedge:
                   'weighted'  by the square root of each unit's leaf count (the default)
                   'equal'     equal shares; reproduces an accepted equal-share geometry
     itemMax     an optional positive-integer character cap on leaf labels; it never splits
                 a surrogate pair

   GEOMETRY CLAIM BOUND. Radial distance grows with containment depth; wedge width is a unit's
   weight; angle and adjacency encode nothing. The layout makes no legibility claim at its
   tested limits: crowding there is measured and handled by the engine's interaction, not
   promised away here. */
(function (root) {
  'use strict';

  var RING = [0, 250, 610, 800], STEP = 190, STAGGER = 96, INSET = 0.06, FAN = 0.9, ROW = 34, PAD = 45;
  var MARK = { root: 44, top: 76, container: 15, leaf: 5.2 };
  var OPTIONS = ['allocation', 'itemMax'];

  function ring(d) { return d < RING.length ? RING[d] : RING[RING.length - 1] + (d - RING.length + 1) * STEP; }
  function markR(d, isC) { return !isC ? MARK.leaf : d === 1 ? MARK.top : MARK.container; }
  function LayoutError(code, detail) {
    var e = new Error('radial layout ' + code + ': ' + detail);
    e.name = 'LayoutError';
    e.code = code;
    return e;
  }
  /* a character cap that never splits a surrogate pair */
  function cut(s, n) {
    var t = String(s).slice(0, n);
    if (/[\uD800-\uDBFF]$/.test(t)) t = t.slice(0, -1);
    return t;
  }
  function settings(opts) {
    if (opts === undefined) opts = {};
    if (!root.DIAGRAM_RADIAL.contract.plain(opts)) throw LayoutError('LAYOUT_OPTION', 'settings must be a plain object');
    Object.keys(opts).forEach(function (k) {
      if (OPTIONS.indexOf(k) < 0) throw LayoutError('LAYOUT_OPTION', 'unknown setting ' + k);
    });
    var allocation = opts.allocation === undefined ? 'weighted' : opts.allocation;
    if (allocation !== 'weighted' && allocation !== 'equal')
      throw LayoutError('LAYOUT_OPTION', 'allocation ' + String(allocation));
    if (opts.itemMax !== undefined && !(typeof opts.itemMax === 'number' && isFinite(opts.itemMax) &&
        Math.floor(opts.itemMax) === opts.itemMax && opts.itemMax > 0))
      throw LayoutError('LAYOUT_OPTION', 'itemMax ' + String(opts.itemMax));
    return { allocation: allocation, itemMax: opts.itemMax };
  }

  function layout(A, opts) {
    var S = settings(opts);
    var nodes = [], spines = [], wedges = [];
    var rootDecl = A.root;
    var top = { kind: 'root', id: rootDecl.id, depth: 0, x: 0, y: 0, r: MARK.root, ang: -Math.PI / 2,
                label: rootDecl.label, count: A.leafCount.get(rootDecl.id), wedge: [-Math.PI / 2, Math.PI * 1.5] };
    nodes.push(top);

    /* containers are their own units; all of a container's leaves form one fan unit, placed where
       the first leaf stands among its siblings */
    function units(id) {
      var out = [], block = null;
      A.kids(id).forEach(function (k) {
        if (A.isContainer(k)) out.push({ c: k });
        else if (!block) { block = { leaves: [k] }; out.push(block); }
        else block.leaves.push(k);
      });
      return out;
    }
    function emit(n, d, x, y, ang, parent, group, isC) {
      var rec = { kind: isC ? 'container' : 'leaf', id: n.id, depth: d, parent: parent.id, group: group,
                  x: x, y: y, r: markR(d, isC), ang: ang,
                  label: isC ? n.label : (S.itemMax ? cut(n.label, S.itemMax) : n.label),
                  kindId: n.kind === undefined ? null : n.kind,
                  state: n.state === undefined ? 'neutral' : n.state };
      if (isC) rec.count = A.leafCount.get(n.id);
      nodes.push(rec);
      spines.push({ d: 'M' + parent.x + ' ' + parent.y + ' L' + x + ' ' + y, id: n.id, depth: d });
      return rec;
    }
    function fan(leaves, center, share, base, parent, d, group) {
      var nL = leaves.length;
      var perRow = Math.max(3, Math.ceil(Math.sqrt(nL * 1.9)));
      var lSpan = share * FAN;
      parent.outerR = base + Math.max(0, Math.ceil(nL / perRow) - 1) * ROW + 18;
      wedges.push({ parent: parent.id, lo: center - lSpan / 2, hi: center + lSpan / 2, fan: true });
      leaves.forEach(function (o, li) {
        var rowN = Math.floor(li / perRow), col = li % perRow;
        var inRow = Math.min(perRow, nL - rowN * perRow);
        var t = inRow === 1 ? 0.5 : col / (inRow - 1);
        var la = center - lSpan / 2 + t * lSpan;
        var lr = base + rowN * ROW;
        emit(o, d, Math.cos(la) * lr, Math.sin(la) * lr, la, parent, group, false);
      });
    }
    function place(n, rec, a0, W, d, group) {
      var us = units(n.id);
      if (!us.length) return;
      if (us.length === 1 && us[0].leaves && d > 0) {          // a container of leaves only
        fan(us[0].leaves, rec.ang, W, ring(d + 1), rec, d + 1, group);
        return;
      }
      function weight(u) { return Math.max(u.c ? A.leafCount.get(u.c.id) : u.leaves.length, 1); }
      if (d === 0) {                                           // the root: square-root shares, no inset
        var total = us.reduce(function (s, u) { return s + Math.sqrt(weight(u)); }, 0);
        var a = a0;
        us.forEach(function (u) {
          var span = (Math.sqrt(weight(u)) / total) * Math.PI * 2;
          var mid = a + span / 2;
          wedges.push({ parent: n.id, lo: a, hi: a + span });
          if (u.c) {
            var r1 = ring(1);
            var child = emit(u.c, 1, Math.cos(mid) * r1, Math.sin(mid) * r1, mid, rec, u.c.id, true);
            child.wedge = [a, a + span];
            place(u.c, child, a, span, 1, u.c.id);
          } else fan(u.leaves, mid, span, ring(1), rec, 1, null);
          a += span;
        });
        return;
      }
      var inset = W * INSET, inner = W - inset * 2, k = us.length;   // below the root: after the inset
      var tot = S.allocation === 'weighted'
        ? us.reduce(function (s, u) { return s + Math.sqrt(weight(u)); }, 0) : 0;
      var ci = 0, acc = a0 + inset;
      us.forEach(function (u, i) {
        var center, share;
        if (S.allocation === 'weighted') {
          share = (Math.sqrt(weight(u)) / tot) * inner; center = acc + share / 2; acc += share;
        } else {
          center = a0 + inset + (k === 1 ? inner / 2 : (i + 0.5) * (inner / k)); share = inner / k;
        }
        wedges.push({ parent: n.id, lo: center - share / 2, hi: center + share / 2 });
        if (u.c) {
          var R = ring(d + 1) - (ci % 2) * STAGGER; ci++;
          var child = emit(u.c, d + 1, Math.cos(center) * R, Math.sin(center) * R, center, rec, group, true);
          child.wedge = [center - share / 2, center + share / 2];
          place(u.c, child, center - share / 2, share, d + 1, group);
        } else fan(u.leaves, center, share, ring(d + 1), rec, d + 1, group);
      });
    }
    place(rootDecl, top, -Math.PI / 2, Math.PI * 2, 0, null);

    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    nodes.forEach(function (n) {
      x0 = Math.min(x0, n.x - n.r * 2); y0 = Math.min(y0, n.y - n.r * 2);
      x1 = Math.max(x1, n.x + n.r * 2); y1 = Math.max(y1, n.y + n.r * 2);
    });
    return { nodes: nodes, spines: spines, wedges: wedges, settings: S,
             bounds: { x: x0 - PAD, y: y0 - PAD, w: (x1 - x0) + PAD * 2, h: (y1 - y0) + PAD * 2 } };
  }

  /* the bounds of a node subset, with the same pad: what Fit and framing use */
  function boundsOf(list, pad) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
    list.forEach(function (nd) {
      n++;
      x0 = Math.min(x0, nd.x - nd.r * 2); y0 = Math.min(y0, nd.y - nd.r * 2);
      x1 = Math.max(x1, nd.x + nd.r * 2); y1 = Math.max(y1, nd.y + nd.r * 2);
    });
    if (!n) return null;
    var p = pad === undefined ? PAD : pad;
    return { x: x0 - p, y: y0 - p, w: (x1 - x0) + p * 2, h: (y1 - y0) + p * 2 };
  }

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.layout = { layout: layout, boundsOf: boundsOf, settings: settings, LayoutError: LayoutError,
               MARK: MARK, RING: RING, STEP: STEP, ROW: ROW };
})(typeof window !== 'undefined' ? window : globalThis);
