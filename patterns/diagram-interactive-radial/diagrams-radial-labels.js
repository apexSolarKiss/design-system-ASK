/* diagrams-radial-labels.js — label placement, level of detail and the Fit's population for
   the interactive radial pattern. DOM-free: text measurement is injected, so the same solver
   runs for the screen and for any other target at its own dimensions.

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. README.md §Labels and level of detail is the
   text this file implements.

   LEVEL OF DETAIL IS NOT MEMBERSHIP. A tier decides which names are drawn at a zoom; it never
   removes a node. Names live in SCREEN space, outside the zoom transform, so they stay upright
   (leaves read along their own radius), constant in size, and are separated from one another.

   TIERS. A tier is { k, name, containers, leaves, ids, minLeaves?, defer? }: from zoom k up,
   name containers to depth `containers` (or 'all'), leaves when `leaves`, identifiers when
   `ids`; a container at a depth listed in minLeaves is named only with at least that many
   leaves; `defer` (default true) lets a whole-map Fit leave names to the next tier where they
   cannot stand clear. Names are the adapter's; the owner's defaults are neutral.

   THE FIT'S POPULATION. Labels can stand beyond the drawing the Fit placed, under chrome,
   outside the canvas or over one another. At a whole-map Fit the population settles what the
   overview names: counts go before names, the depth-1 names and the root's go as whole tiers
   (never one of several), and deeper callouts are kept largest first only while every kept
   name still stands clear. Deferred names return at the next tier. Screen-space text crowding
   is answered this way; overlapping MARKS are not a text problem, and the engine answers them
   with its own selection routes.

   CROWDING AWAY FROM THE FIT. Under 'yield' (the default) a name yields while its mark is off the
   canvas; a callout below depth 1 yields where it would overprint one already kept (kept shallower
   first, then larger); and a leaf name yields where it would cross a kept callout or an inner leaf
   name on its own ray. A zoomed or panned view never piles names from elsewhere at its edges, and
   a yielded name returns as zoom separates it. The root's and the depth-1 names never yield this way: they go only as
   whole tiers, through the Fit's population. 'keep' places every name the tier calls for, clamped
   into the canvas, and thins names only at the Fit; it is the setting that reproduces an accepted
   presentation built that way. */
(function (root) {
  'use strict';

  var DEFAULT_TIERS = [
    { k: 0,    name: 'overview',    containers: 2,     leaves: false, ids: false, minLeaves: { 2: 16 } },
    { k: 0.58, name: 'containers',  containers: 'all', leaves: false, ids: false },
    { k: 1.05, name: 'items',       containers: 'all', leaves: true,  ids: false },
    { k: 2.30, name: 'identifiers', containers: 'all', leaves: true,  ids: true }
  ];
  var TIER_KEYS = ['k', 'name', 'containers', 'leaves', 'ids', 'minLeaves', 'defer'];
  var LABEL_KEYS = ['tiers', 'count', 'countFiltered', 'crowding'];

  function LabelError(code, detail) {
    var e = new Error('radial labels ' + code + ': ' + detail);
    e.name = 'LabelError';
    e.code = code;
    return e;
  }

  function plain(v) { return root.DIAGRAM_RADIAL.contract.plain(v); }
  /* the adapter's label configuration, validated: { tiers?, count?, countFiltered?, crowding? } */
  function configure(cfg) {
    if (cfg === undefined) cfg = {};
    if (!plain(cfg)) throw LabelError('LABELS', 'labels must be a plain object');
    Object.keys(cfg).forEach(function (k) { if (LABEL_KEYS.indexOf(k) < 0) throw LabelError('LABELS', 'unknown key ' + k); });
    var tiers = cfg.tiers === undefined ? DEFAULT_TIERS : cfg.tiers;
    if (!Array.isArray(tiers) || !tiers.length) throw LabelError('TIERS', 'tiers must be a non-empty array');
    var prev = -Infinity;
    tiers = tiers.map(function (t, i) {
      if (!plain(t)) throw LabelError('TIER', 'tiers[' + i + '] must be a plain object');
      Object.keys(t).forEach(function (k) { if (TIER_KEYS.indexOf(k) < 0) throw LabelError('TIER', 'tiers[' + i + ']: unknown key ' + k); });
      if (typeof t.k !== 'number' || !isFinite(t.k) || t.k < 0 || t.k <= prev) throw LabelError('TIER', 'tiers[' + i + '].k must be a number above the previous tier');
      if (i === 0 && t.k !== 0) throw LabelError('TIER', 'the first tier starts at k 0');
      prev = t.k;
      if (typeof t.name !== 'string' || !t.name) throw LabelError('TIER', 'tiers[' + i + '].name must be a non-empty string');
      if (!(t.containers === 'all' || (Number.isInteger(t.containers) && t.containers >= 0)))
        throw LabelError('TIER', 'tiers[' + i + '].containers must be a depth or "all"');
      ['leaves', 'ids'].forEach(function (k) { if (typeof t[k] !== 'boolean') throw LabelError('TIER', 'tiers[' + i + '].' + k + ' must be a boolean'); });
      if (t.defer !== undefined && typeof t.defer !== 'boolean') throw LabelError('TIER', 'tiers[' + i + '].defer must be a boolean');
      var ml = {};
      if (t.minLeaves !== undefined) {
        if (!plain(t.minLeaves)) throw LabelError('TIER', 'tiers[' + i + '].minLeaves must be a plain object');
        Object.keys(t.minLeaves).forEach(function (d) {
          var v = t.minLeaves[d];
          if (!/^[1-9][0-9]*$/.test(d) || !Number.isInteger(v) || v < 0)
            throw LabelError('TIER', 'tiers[' + i + '].minLeaves must map a depth to a whole number');
          ml[d] = v;
        });
      }
      return { k: t.k, name: t.name, containers: t.containers, leaves: t.leaves, ids: t.ids, minLeaves: ml,
               defer: t.defer === undefined ? true : t.defer };
    });
    function counts(c, key) {
      if (!plain(c)) throw LabelError('COUNT', key + ' must be a plain object');
      Object.keys(c).forEach(function (d) {
        if (!(d === '*' || /^[1-9][0-9]*$/.test(d)) || typeof c[d] !== 'string') throw LabelError('COUNT', key + ' maps a depth or "*" to a template string');
      });
      return c;
    }
    var count = counts(cfg.count === undefined ? { '*': '{count}' } : cfg.count, 'count');
    /* while a membership is in force, a count line reads its members of its total; a depth the
       adapter leaves out takes the owner's '*' */
    var countFiltered = Object.assign({ '*': '{count} / {total}' }, cfg.countFiltered === undefined ? {} : counts(cfg.countFiltered, 'countFiltered'));
    var crowding = cfg.crowding === undefined ? 'yield' : cfg.crowding;
    if (crowding !== 'yield' && crowding !== 'keep') throw LabelError('CROWDING', 'crowding must be "yield" or "keep"');
    return { tiers: tiers, count: count, countFiltered: countFiltered, crowding: crowding };
  }
  function tierFor(tiers, k) {
    var t = tiers[0];
    for (var i = 0; i < tiers.length; i++) if (k >= tiers[i].k) t = tiers[i];
    return t;
  }
  /* a template's {slot}s, read as own properties only, so "{constructor}" is left as written */
  function fill(tpl, slots) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(slots, k) && slots[k] !== undefined ? String(slots[k]) : m;
    });
  }
  /* a container's count line; with `shown` (its members while a membership is in force), the
     filtered template, {count} of {total} */
  function countText(cfg, n, shown) {
    var set = shown === undefined ? cfg.count : (cfg.countFiltered || cfg.count);
    var tpl = set[String(n.depth)] !== undefined ? set[String(n.depth)] : set['*'];
    return tpl === undefined ? null : fill(tpl, shown === undefined ? { count: n.count } : { count: shown, total: n.count });
  }
  function role(n) { return n.kind === 'root' ? 'root' : n.kind === 'leaf' ? 'leaf' : n.depth === 1 ? 'top' : 'container'; }
  /* drop the last n code points, never half of a surrogate pair */
  function dropTail(s, n) {
    var a = Array.from(s);
    return a.slice(0, Math.max(0, a.length - n)).join('');
  }

  /* One placement of every label for a view, a viewport and a tier. Pure: the result depends only
     on its inputs and the injected measure(text, role). */
  function solve(inp) {
    var view = inp.view, W = inp.W, H = inp.H, tier = inp.tier, held = inp.held;
    var bands = inp.bands || {}, measure = inp.measure;
    var out = [], sides = { l: [], r: [] }, rootObstacle = null;
    var cx0 = view.x, cy0 = view.y;                             /* world origin, projected */
    var mine = held && held.tier === tier.name ? held : null;
    var yielding = inp.crowding === 'yield';
    var countsHeld = !!(mine && mine.counts);
    inp.nodes.forEach(function (n) {
      var e = { node: n, id: n.id, role: role(n), show: false, held: false, name: null, count: null, idLine: null, leader: null };
      out.push(e);
      var show;
      if (!inp.visible(n.id)) show = false;                    /* outside the membership */
      else if (n.kind === 'leaf') show = tier.leaves;
      else if (n.kind === 'container') {
        show = tier.containers === 'all' || n.depth <= tier.containers;
        var min = tier.minLeaves[String(n.depth)];
        if (show && min !== undefined) show = inp.shownCount(n) >= min;
      } else show = true;
      e.held = !!(show && mine && n.kind !== 'leaf' && (n.kind === 'root' ? mine.root
                 : n.depth === 1 ? mine.top : mine.top || !mine.keep.has(n.id)));
      if (e.held) show = false;
      e.show = show;
      if (!show) return;
      var p = { x: n.x * view.k + view.x, y: n.y * view.k + view.y };
      e.p = p;
      if (yielding && n.kind === 'container') {
        var rk = n.r * view.k * 1.3;
        if (p.x + rk < 0 || p.x - rk > W || p.y + rk < 0 || p.y - rk > H) { e.show = false; e.offscreen = true; return; }
      }
      if (n.kind === 'root') {
        var ry = p.y + n.r * view.k + 30;
        e.name = { x: p.x, y: ry, anchor: 'middle', text: n.label, rotate: null, middle: true };
        /* the root label sits ON the vertical axis, where callouts from the inner ring also want
           to be; it is pinned into both side lists, so relaxation moves them around it */
        rootObstacle = { y: ry, halfW: n.label.length * 6.0 + 14, x: p.x };
        return;
      }
      if (n.kind === 'leaf') {
        var left = Math.cos(n.ang) < 0, deg = n.ang * 180 / Math.PI;
        var lx = p.x + (left ? -9 : 9), ly = p.y + 3.5, rot = left ? deg + 180 : deg;
        e.name = { x: lx, y: ly, anchor: left ? 'end' : 'start', text: n.label, rotate: { deg: rot, cx: lx, cy: ly } };
        if (tier.ids) e.idLine = { x: lx, y: ly + 11, anchor: left ? 'end' : 'start', text: n.id, rotate: { deg: rot, cx: lx, cy: ly + 11 } };
        return;
      }
      /* containers: an upright callout, its side chosen by the mark's bearing. A container below
         depth 1 with a leaf fan is named past its own fan, so a name never sits on its dots */
      var side = Math.cos(n.ang) >= 0 ? 'r' : 'l', ax, ay;
      if (n.depth >= 2 && n.outerR) {
        var rr = n.outerR * view.k;
        ax = cx0 + Math.cos(n.ang) * rr + (side === 'r' ? 10 : -10);
        ay = cy0 + Math.sin(n.ang) * rr + 4;
      } else {
        var off = (n.r * view.k) + 16;
        ax = p.x + (side === 'r' ? off : -off);
        ay = p.y + 5;
      }
      if (rootObstacle && Math.abs(ay - rootObstacle.y) < 30 && Math.abs(ax - rootObstacle.x) < rootObstacle.halfW + 16)
        ay = rootObstacle.y + (ay >= rootObstacle.y ? 30 : -30);
      sides[side].push({ e: e, n: n, x: ax, wantY: ay, mx: p.x, my: p.y, h: n.depth === 1 ? 38 : 30 });
    });

    ['l', 'r'].forEach(function (s) {
      var list = sides[s];
      if (rootObstacle) list.push({ pinned: true, x: rootObstacle.x, wantY: rootObstacle.y, h: 32 });
      list.sort(function (a, b) { return a.wantY - b.wantY; });
      var pin = -1, i;
      for (i = 0; i < list.length; i++) if (list[i].pinned) { pin = i; break; }
      if (pin < 0) {
        var y = -1e9;
        list.forEach(function (it) { it.y = Math.max(it.wantY, y + it.h); y = it.y; });
      } else {
        list[pin].y = list[pin].wantY;
        var yd = list[pin].y;
        for (i = pin + 1; i < list.length; i++) { list[i].y = Math.max(list[i].wantY, yd + list[i].h); yd = list[i].y; }
        var yu = list[pin].y;
        for (i = pin - 1; i >= 0; i--) { list[i].y = Math.min(list[i].wantY, yu - list[i].h); yu = list[i].y; }
      }
      list = list.filter(function (it) { return !it.pinned; });
      /* clamp into the canvas on both edges; where the root label's band is reachable, each side
         of it is clamped on its own and nothing is ever moved across it */
      function clampInto(arr, top, bot) {
        if (!arr.length) return;
        arr.sort(function (a, b) { return a.y - b.y; });
        var need = arr.reduce(function (t, it) { return t + it.h; }, 0);
        if (need > (bot - top)) {                              /* more labels than room: spread them */
          var stepY = (bot - top) / arr.length;
          arr.forEach(function (it, j) { it.y = top + stepY * (j + 0.5); });
          return;
        }
        var prev = top - arr[0].h * 0.4;
        arr.forEach(function (it) { it.y = Math.max(it.y, prev + it.h); prev = it.y; });
        var next = bot;
        for (var j = arr.length - 1; j >= 0; j--) { arr[j].y = Math.min(arr[j].y, next); next = arr[j].y - arr[j].h; }
      }
      if (list.length) {
        var TOP = 16, BOT = H - 14, band = null;
        if (rootObstacle) {
          var reach = list.some(function (it) {
            var w = String(it.n.label).length * 6.2;
            var lo = s === 'r' ? it.x : it.x - w, hi = s === 'r' ? it.x + w : it.x;
            return hi > rootObstacle.x - rootObstacle.halfW && lo < rootObstacle.x + rootObstacle.halfW;
          });
          if (reach) band = { t: rootObstacle.y - 24, b: rootObstacle.y + 24 };
        }
        if (band && band.t > TOP + 24 && band.b < BOT - 24) {
          clampInto(list.filter(function (it) { return it.y < rootObstacle.y; }), TOP, band.t);
          clampInto(list.filter(function (it) { return it.y >= rootObstacle.y; }), band.b, BOT);
        } else clampInto(list, TOP, BOT);
      }
      list.forEach(function (it) {
        var e = it.e, n = it.n, r = e.role;
        /* keep the callout inside the chrome-safe envelope: pull the anchor off the reserved edge
           as far as the label needs (up to a cap), then ellipsize to the room that is left */
        var natural = measure(n.label, r);
        var lim = s === 'r' ? (W - (bands.right || 0) - 8) : ((bands.left || 0) + 8);
        var avail = s === 'r' ? lim - it.x : it.x - lim;
        var want = Math.min(natural, 150);
        if (avail < want) { it.x += (s === 'r' ? -(want - avail) : (want - avail)); avail = want; }
        var txt = n.label, shown = n.label;
        if (natural > avail) {
          while (Array.from(txt).length > 2 && measure(shown, r) > avail) {
            txt = dropTail(txt, 2);
            shown = txt.replace(/[\s\/,–—-]+$/, '') + '…';
          }
        }
        e.name = { x: it.x, y: it.y, anchor: s === 'r' ? 'start' : 'end', text: shown, rotate: null };
        var ct = inp.countText ? inp.countText(n) : null;
        if (ct !== null && ct !== undefined) {
          e.count = { x: it.x, y: it.y + (n.depth === 1 ? 15 : 12), anchor: s === 'r' ? 'start' : 'end',
                      text: ct, held: countsHeld, show: !countsHeld };
        }
        var mx = it.mx + Math.cos(n.ang) * (n.r * view.k), my = it.my + Math.sin(n.ang) * (n.r * view.k);
        e.leader = { x1: mx, y1: my, x2: it.x - (s === 'r' ? 7 : -7), y2: it.y };
      });
    });
    if (yielding && inp.font) yieldCrowded(out, { measure: measure, font: inp.font }, view, W, H);
    return out;
  }
  /* The 'yield' pass. Callouts below depth 1, in priority order, give way to names already kept;
     then leaf names, innermost first, give way to every kept callout and to inner leaf names. A
     leaf name reads outward along its own bearing, so two leaves in successive rows of one fan
     share a ray and their names would overprint; the outer one yields until zoom separates them.
     Each name is measured as the segment its rendered letters occupy, identifier line included. */
  function yieldCrowded(sol, m, view, W, H) {
    function box(e) {
      var b = lineBox(e.name, e.role, m);
      if (e.count && e.count.show) { var c = lineBox(e.count, 'count', m); b = { l: Math.min(b.l, c.l), t: Math.min(b.t, c.t), r: Math.max(b.r, c.r), b: Math.max(b.b, c.b) }; }
      return b;
    }
    var kept = [], rest = [], leaves = [];
    sol.forEach(function (e, i) {
      if (!e.show || !e.name) return;
      if (e.role === 'leaf') leaves.push({ e: e, i: i });
      else if (e.role === 'root' || e.node.depth === 1) kept.push(box(e));
      else rest.push({ e: e, i: i });
    });
    rest.sort(function (a, b) { return a.e.node.depth - b.e.node.depth || (b.e.node.count || 0) - (a.e.node.count || 0) || a.i - b.i; });
    rest.forEach(function (x) {
      var b = box(x.e);
      if (kept.some(function (k) { return overlap(b, k); })) {
        x.e.show = false; x.e.yielded = true; x.e.name = null; x.e.count = null; x.e.leader = null;
      } else kept.push(b);
    });
    if (!leaves.length) return;
    var placed = [];
    leaves.forEach(function (x) {
      var e = x.e, p = e.p;
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) { e.show = false; e.offscreen = true; e.name = null; e.idLine = null; x.skip = true; return; }
      x.segs = [segment(e.name, 'leaf', m)];
      if (e.idLine) x.segs.push(segment(e.idLine, 'id', m));
      x.r0 = Math.hypot(p.x - view.x, p.y - view.y);
    });
    leaves = leaves.filter(function (x) { return !x.skip; });
    leaves.sort(function (a, b) { return a.r0 - b.r0 || a.i - b.i; });
    leaves.forEach(function (x) {
      var hit = placed.some(function (y) {
        return x.segs.some(function (a) { return y.segs.some(function (b) { return segDist(a, b) < (a.h + b.h) / 2; }); });
      });
      if (!hit) hit = x.segs.some(function (a) {
        return kept.some(function (k) { return segBoxDist(a, k) < a.h / 2; });
      });
      if (hit) { x.e.show = false; x.e.yielded = true; x.e.name = null; x.e.idLine = null; }
      else placed.push(x);
    });
  }
  /* a rotated text line as the segment its letters' center line runs along, with its height: the
     anchor, the rendered rotation and text-anchor, and the glyph box's center above the baseline */
  function segment(line, role, m) {
    var w = m.measure(line.text, role), f = m.font(role);
    var th = (line.rotate ? line.rotate.deg : 0) * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
    var x0 = line.anchor === 'end' ? -w : line.anchor === 'middle' ? -w / 2 : 0, yc = (f.d - f.a) / 2;
    function at(x) { return { x: line.x + x * c - yc * sn, y: line.y + x * sn + yc * c }; }
    var a = at(x0), b = at(x0 + w);
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y, h: f.a + f.d };
  }
  function ptSeg(px, py, s) {
    var dx = s.bx - s.ax, dy = s.by - s.ay, l2 = dx * dx + dy * dy;
    var t = l2 ? Math.max(0, Math.min(1, ((px - s.ax) * dx + (py - s.ay) * dy) / l2)) : 0;
    return Math.hypot(px - (s.ax + t * dx), py - (s.ay + t * dy));
  }
  function crosses(a, b) {
    function o(px, py, qx, qy, rx, ry) { return (qx - px) * (ry - py) - (qy - py) * (rx - px); }
    var d1 = o(a.ax, a.ay, a.bx, a.by, b.ax, b.ay), d2 = o(a.ax, a.ay, a.bx, a.by, b.bx, b.by);
    var d3 = o(b.ax, b.ay, b.bx, b.by, a.ax, a.ay), d4 = o(b.ax, b.ay, b.bx, b.by, a.bx, a.by);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }
  function segDist(a, b) {
    if (crosses(a, b)) return 0;
    return Math.min(ptSeg(a.ax, a.ay, b), ptSeg(a.bx, a.by, b), ptSeg(b.ax, b.ay, a), ptSeg(b.bx, b.by, a));
  }
  function segBoxDist(sg, k) {
    function inside(x, y) { return x >= k.l && x <= k.r && y >= k.t && y <= k.b; }
    if (inside(sg.ax, sg.ay) || inside(sg.bx, sg.by)) return 0;
    var edges = [{ ax: k.l, ay: k.t, bx: k.r, by: k.t }, { ax: k.r, ay: k.t, bx: k.r, by: k.b },
                 { ax: k.r, ay: k.b, bx: k.l, by: k.b }, { ax: k.l, ay: k.b, bx: k.l, by: k.t }];
    return Math.min.apply(null, edges.map(function (ed) { return segDist(sg, ed); }));
  }

  /* --------------------------------------------------- boxes and the clearance checks -- */
  /* A line's box in stage coordinates: across, its measured width from its anchor; down, the
     font box of its role (the root label is centered on its y). inkBox uses the glyphs' own
     ascent and descent, where a neighbor's letters, not its leading, are what can collide. */
  function lineBox(line, r, m) {
    var w = m.measure(line.text, r), fm = m.font(r);
    var l = line.anchor === 'start' ? line.x : line.anchor === 'end' ? line.x - w : line.x - w / 2;
    var t = line.middle ? line.y - (fm.a + fm.d) / 2 : line.y - fm.a;
    return { l: l, r: l + w, t: t, b: t + fm.a + fm.d };
  }
  function inkBox(line, r, m) {
    var b = lineBox(line, r, m), g = m.ink(line.text, r), fm = m.font(r);
    if (!g) return b;
    var base = b.b - fm.d;
    return { l: b.l, r: b.r, t: base - g.a, b: base + g.d };
  }
  function lines(sol, m, ink) {
    var out = [];
    sol.forEach(function (e) {
      if (!e.show || e.role === 'leaf' || !e.name) return;
      var f = ink ? inkBox : lineBox;
      out.push({ id: e.id, line: 'name', box: f(e.name, e.role, m) });
      if (e.count && e.count.show) out.push({ id: e.id, line: 'count', box: f(e.count, 'count', m) });
    });
    return out;
  }
  function overlap(a, b) { return a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1; }
  function touches(a, c) { return a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b; }
  /* IDENTITY IN THE BOOKKEEPING. Identifiers are opaque strings, so every record below is keyed
     the way the contract keys them: lines are grouped in a Map, and each result is a Set of tuple
     keys, a JSON array of the identifiers involved. A JSON array is unambiguous whatever the
     identifiers hold ("a" with "b|c" never meets "a|b" with "c"), and no identifier, __proto__
     included, can reach an object's prototype. An undirected pair is sorted; a directed one keeps
     its order. */
  function lineKey(id, line) { return JSON.stringify([id, line]); }
  function pairKey(a, b) { return JSON.stringify(a < b ? [a, b] : [b, a]); }
  /* the shown callout and root lines under any of the given chrome rectangles */
  function under(sol, m, cs) {
    var out = new Set();
    lines(sol, m, false).forEach(function (x) {
      if (cs.some(function (c) { return touches(x.box, c); })) out.add(lineKey(x.id, x.line));
    });
    return out;
  }
  /* the shown callout and root lines that run more than a pixel outside the canvas */
  function outside(sol, m, W, H) {
    var out = new Set();
    lines(sol, m, false).forEach(function (x) {
      var b = x.box;
      if (b.l < -1 || b.t < -1 || b.r > W + 1 || b.b > H + 1) out.add(lineKey(x.id, x.line));
    });
    return out;
  }
  /* pairs of shown names (the root's, a container's) that overprint one another */
  function overprints(sol, m) {
    var B = lines(sol, m, false).filter(function (x) { return x.line === 'name'; }), out = new Set();
    for (var i = 0; i < B.length; i++) for (var j = i + 1; j < B.length; j++)
      if (overlap(B[i].box, B[j].box)) out.add(pairKey(B[i].id, B[j].id));
    return out;
  }
  /* pairs of whole callouts (a name with its count) that overlap: the short-canvas guard */
  function crowding(sol, m) {
    var by = new Map(), out = new Set();
    lines(sol, m, false).forEach(function (x) {
      var b = by.get(x.id);
      by.set(x.id, b ? { l: Math.min(b.l, x.box.l), t: Math.min(b.t, x.box.t), r: Math.max(b.r, x.box.r), b: Math.max(b.b, x.box.b) } : x.box);
    });
    var ids = Array.from(by.keys());
    for (var i = 0; i < ids.length; i++) for (var j = i + 1; j < ids.length; j++)
      if (overlap(by.get(ids[i]), by.get(ids[j]))) out.add(pairKey(ids[i], ids[j]));
    return out;
  }
  /* a shown count line whose letters meet another label's name: directed, count first */
  function obscured(sol, m) {
    var L = lines(sol, m, true), out = new Set();
    L.filter(function (x) { return x.line === 'count'; }).forEach(function (q) {
      L.filter(function (x) { return x.line === 'name' && x.id !== q.id; }).forEach(function (a) {
        if (overlap(q.box, a.box)) out.add(JSON.stringify([q.id, a.id]));
      });
    });
    return out;
  }
  function empty(set) { return set.size === 0; }
  function within(a, b) { var ok = true; a.forEach(function (k) { if (!b.has(k)) ok = false; }); return ok; }
  function namesClear(sol, m, cs, W, H) { return empty(under(sol, m, cs)) && empty(outside(sol, m, W, H)) && empty(overprints(sol, m)); }

  /* The whole-map Fit's population (header). Returns the held set, or null where nothing is
     deferred. `guard` adds the short-canvas rule: a kept callout must not add a new overlap. */
  function population(inp, m, cs, guard) {
    var tier = inp.tier, W = inp.W, H = inp.H;
    if (!tier.defer) return null;
    function run(h) { return solve(Object.assign({}, inp, { held: h })); }
    var sol = run(null);
    var order = [];
    sol.forEach(function (e, i) {
      if (e.show && e.node.kind === 'container' && e.node.depth >= 2) order.push({ id: e.id, i: i, n: inp.shownCount(e.node) });
    });
    order.sort(function (a, b) { return b.n - a.n || a.i - b.i; });
    var held;
    if (!guard && namesClear(sol, m, cs, W, H)) {
      if (empty(obscured(sol, m))) return null;
      held = { tier: tier.name, root: false, top: false, counts: true, keep: new Set(order.map(function (o) { return o.id; })) };
      return held;
    }
    held = { tier: tier.name, root: false, top: false, counts: false, keep: new Set() };
    sol = run(held);
    if (!namesClear(sol, m, cs, W, H)) {
      held.counts = true; sol = run(held);
      if (!namesClear(sol, m, cs, W, H)) {
        held.top = true; sol = run(held);
        if (!namesClear(sol, m, cs, W, H)) held.root = true;
        return held;
      }
    }
    var baseO = guard ? crowding(sol, m) : null;
    order.forEach(function (o) {
      held.keep.add(o.id);
      sol = run(held);
      if (!namesClear(sol, m, cs, W, H) || (guard && !within(crowding(sol, m), baseO))) held.keep.delete(o.id);
    });
    sol = run(held);
    if (!held.counts && !empty(obscured(sol, m))) held.counts = true;
    return held;
  }
  /* what a placement leaves deferred, by tier of name */
  function deferred(sol) {
    var d = { root: 0, top: 0, deeper: 0, counts: 0, offscreen: 0, yielded: 0 };
    sol.forEach(function (e) {
      if (e.held) d[e.role === 'root' ? 'root' : e.node.depth === 1 ? 'top' : 'deeper']++;
      if (e.count && e.count.held) d.counts++;
      if (e.offscreen) d.offscreen++;
      if (e.yielded) d.yielded++;
    });
    return d;
  }

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.labels = { DEFAULT_TIERS: DEFAULT_TIERS, configure: configure, tierFor: tierFor, countText: countText, fill: fill,
               solve: solve, population: population, deferred: deferred, LabelError: LabelError,
               checks: { lineBox: lineBox, inkBox: inkBox, under: under, outside: outside, overprints: overprints,
                         crowding: crowding, obscured: obscured, namesClear: namesClear } };
})(typeof window !== 'undefined' ? window : globalThis);
