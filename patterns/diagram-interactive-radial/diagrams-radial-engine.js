/* diagrams-radial-engine.js — the engine of the interactive radial pattern: mount, rendering,
   camera, Fit, pointer, selection, the core keyboard path, events, deep-link arrival and
   teardown.

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. README.md is the contract this file
   implements; a consumer supplies data, an adapter and the page around the map.

   LOAD ORDER — each a classic script, before this one:
     diagrams-radial-contract.js · diagrams-radial-layout.js · diagrams-radial-labels.js ·
     diagrams-pointer.js · diagrams-fit.js
   and, after it, any optional module an instance lists (diagrams-radial-legend.js, …).

   ONE INSTANCE, ONE HOST. DIAGRAM_RADIAL.mount({ host, data, adapter, modules }) validates
   everything first and renders nothing on any failure. Each instance has its own id prefix,
   markers, event bus, observers and listeners, all attached under one AbortSignal;
   destroy() removes them and leaves the host as it was. No selection, focus, id or event
   crosses instances.

   OVERLAPPING MARKS ARE NOT A TEXT PROBLEM. Marks are drawn in world space and scale with the
   camera, so two marks that overlap overlap at every zoom; deferring their names fixes nothing.
   The engine therefore gives every mark three routes: a pointer hit, tested against each mark's
   true shape, that finds every mark under or near the point and, where more than one is there,
   offers them in a chooser that always lists every mark under it; a keyboard path over the
   hierarchy itself, which does not depend on geometry at all; and a focused or selected mark
   raised above its neighbors with a ring drawn at screen size. */
(function (root) {
  'use strict';

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.modules = R.modules || {};
  var NS = 'http://www.w3.org/2000/svg';
  var MODULES = ['inspector', 'facets', 'legend', 'chrome', 'export', 'theme'];
  var ADAPTER_KEYS = ['layout', 'text', 'labels'].concat(MODULES).concat(['arrival']);
  /* text sections the engine reads now (controls, announce, idle) and those its optional modules
     read (nouns, census, filtered, noMatch) */
  var TEXT_KEYS = ['controls', 'announce', 'idle', 'nouns', 'census', 'filtered', 'noMatch'];
  var HOOKS = { inspector: ['header', 'sections'], facets: ['declared', 'search'], legend: ['headings'],
                chrome: ['panels'], export: ['filenameBase', 'profiles'], theme: [] };
  var CONTROLS = { zoomIn: 'zoom in', zoomOut: 'zoom out', fit: 'fit', close: 'close', choose: 'choose a mark',
                   zoomHere: 'zoom in here', more: '{count} more' };
  var ANNOUNCE = { focus: '{label}, {index} of {total} in {parent}', focusRoot: '{label}, the center',
                   select: '{label} selected', clear: 'selection cleared', frame: '{label} framed',
                   choose: '{count} marks here', leaf: 'nothing inside {label}', top: '{label} is the center',
                   start: '{label}. Arrow keys move between nodes; Enter selects; Escape clears.' };
  var COMPACT_Q = '(max-width: 767px), (max-height: 520px) and (pointer: coarse)';
  var CHOOSER_MAX = 8;
  var seq = 0, arrivalOwner = null, themeOwner = null;

  function MountError(code, detail) {
    var e = new Error('radial mount ' + code + ': ' + detail);
    e.name = 'MountError';
    e.code = code;
    return e;
  }
  function plainObj(v) { return R.contract.plain(v); }      /* one predicate across the owner modules */
  function el(n, a) {
    var e = document.createElementNS(NS, n);
    if (a) for (var k in a) if (a[k] !== null && a[k] !== undefined) e.setAttribute(k, a[k]);
    return e;
  }
  function html(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function fill(tpl, slots) { return R.labels.fill(tpl, slots); }

  /* ------------------------------------------------------------------ mount -- */
  function mount(opts) {
    /* everything is validated before anything is drawn */
    if (!root.DIAGRAM_FIT || typeof root.DIAGRAM_FIT.compute !== 'function')
      throw MountError('MODULE_MISSING', 'diagrams-fit (load diagrams-fit.js before the engine)');
    ['contract', 'layout', 'labels'].forEach(function (m) {
      if (!R[m]) throw MountError('MODULE_MISSING', 'diagrams-radial-' + m);
    });
    if (!root.DIAGRAM_POINTER || typeof root.DIAGRAM_POINTER.attach !== 'function')
      throw MountError('MODULE_MISSING', 'diagrams-pointer');
    if (!plainObj(opts)) throw MountError('MOUNT', 'mount takes { host, data, adapter?, modules? }');
    Object.keys(opts).forEach(function (k) {
      if (['host', 'data', 'adapter', 'modules'].indexOf(k) < 0) throw MountError('MOUNT', 'unknown option ' + k);
    });
    var host = opts.host;
    if (!host || host.nodeType !== 1) throw MountError('HOST', 'host must be an element');
    if (host.__radial) throw MountError('HOST', 'this host already carries a mounted instance');
    var stage = host.querySelector('[data-radial-slot="stage"]');
    if (!stage) throw MountError('SLOT', 'the host has no [data-radial-slot="stage"]');
    var adapter = opts.adapter === undefined ? {} : opts.adapter;
    if (!plainObj(adapter)) throw MountError('ADAPTER', 'adapter must be an object');
    Object.keys(adapter).forEach(function (k) {
      if (ADAPTER_KEYS.indexOf(k) < 0) throw MountError('ADAPTER', 'unknown adapter section ' + k);
    });
    var listed = opts.modules === undefined ? [] : opts.modules;
    if (!Array.isArray(listed) || listed.some(function (m) { return typeof m !== 'string'; }))
      throw MountError('MOUNT', 'modules must be an array of module names');
    listed.forEach(function (m) {
      if (listed.indexOf(m) !== listed.lastIndexOf(m)) throw MountError('MOUNT', 'module listed twice: ' + m);
      if (MODULES.indexOf(m) < 0 || !R.modules[m] || typeof R.modules[m].mount !== 'function') throw MountError('MODULE_MISSING', m);
      (R.modules[m].slots || []).forEach(function (sl) {
        if (!host.querySelector('[data-radial-slot="' + sl + '"]')) throw MountError('SLOT', 'the ' + m + ' module needs [data-radial-slot="' + sl + '"]');
      });
      (R.modules[m].requires || []).forEach(function (dep) {
        if (listed.indexOf(dep) < 0 || !R.modules[dep]) throw MountError('MODULE_MISSING', dep + ' (required by ' + m + ')');
      });
      var sec = adapter[m];
      (HOOKS[m] || []).forEach(function (h) {
        if (!plainObj(sec) || sec[h] === undefined) throw MountError('HOOK_MISSING', m + '.' + h);
      });
      if (typeof R.modules[m].validate === 'function') R.modules[m].validate(sec);   /* before anything renders */
    });
    if (adapter.theme !== undefined && adapter.theme !== 'own' && adapter.theme !== 'host')
      throw MountError('ADAPTER', 'theme must be "own" or "host"');
    if (adapter.theme === 'own' && listed.indexOf('theme') < 0) throw MountError('MODULE_MISSING', 'theme (adapter.theme is "own")');
    var arrival = adapter.arrival;
    if (arrival !== undefined && !(plainObj(arrival) && Object.keys(arrival).every(function (k) { return k === 'hash'; }) && typeof arrival.hash === 'boolean'))
      throw MountError('ADAPTER', 'arrival must be { hash: boolean }');
    var claimsArrival = !!(arrival && arrival.hash);
    if (claimsArrival && arrivalOwner) throw MountError('ARRIVAL_OWNER_CONFLICT', 'instance ' + arrivalOwner + ' already owns URL arrival');
    /* the document theme has one writer: the one instance that declares adapter.theme 'own' */
    var ownsTheme = adapter.theme === 'own';
    if (ownsTheme && themeOwner) throw MountError('THEME_OWNER_CONFLICT', 'instance ' + themeOwner + ' already owns the document theme');
    var text = adapter.text === undefined ? {} : adapter.text;
    if (!plainObj(text)) throw MountError('ADAPTER', 'text must be an object');
    Object.keys(text).forEach(function (k) {
      if (TEXT_KEYS.indexOf(k) < 0) throw MountError('ADAPTER', 'unknown text key ' + k);
    });
    [['controls', CONTROLS], ['announce', ANNOUNCE]].forEach(function (p) {
      var k = p[0], t = text[k];
      if (t === undefined) return;
      if (!plainObj(t)) throw MountError('ADAPTER', 'text.' + k + ' must be a plain object');
      Object.keys(t).forEach(function (x) {
        if (!Object.prototype.hasOwnProperty.call(p[1], x)) throw MountError('ADAPTER', 'unknown text.' + k + ' key ' + x);
        if (typeof t[x] !== 'string') throw MountError('ADAPTER', 'text.' + k + '.' + x + ' must be a string');
      });
    });
    if (text.idle !== undefined && typeof text.idle !== 'string') throw MountError('ADAPTER', 'text.idle must be a string');
    var controls = Object.assign({}, CONTROLS, plainObj(text.controls) ? text.controls : {});
    var announceT = Object.assign({}, ANNOUNCE, plainObj(text.announce) ? text.announce : {});
    var ignored = [];
    MODULES.forEach(function (m) { if (adapter[m] !== undefined && listed.indexOf(m) < 0 && m !== 'theme') ignored.push(m); });

    var model = R.contract.assemble(opts.data);                 /* throws: radial contract <CODE> */
    var L = R.layout.layout(model, adapter.layout);             /* throws: radial layout <CODE> */
    var LC = R.labels.configure(adapter.labels);                /* throws: radial labels <CODE> */

    /* -------------------------------------------------------------- instance -- */
    var id = 'radial-' + (++seq);
    if (claimsArrival) arrivalOwner = id;
    if (ownsTheme) themeOwner = id;
    host.__radial = id;
    var ac = new AbortController(), signal = ac.signal, destroyed = false;
    function on(target, type, fn, extra) {
      var x = extra ? Object.assign({}, extra) : {};
      x.signal = signal;
      target.addEventListener(type, fn, x);
    }
    var bus = new Map();                                       /* keyed by event type, any string */
    function onEvent(type, fn) {
      if (!bus.has(type)) bus.set(type, []);
      bus.get(type).push(fn);
      return function () { offEvent(type, fn); };
    }
    function offEvent(type, fn) { if (bus.has(type)) bus.set(type, bus.get(type).filter(function (f) { return f !== fn; })); }
    function emit(type, detail) {
      var ev = Object.assign({ type: type, instance: id }, detail || {});
      (bus.get(type) || []).slice().forEach(function (fn) { fn(ev); });
      return ev;
    }

    /* restore-on-destroy bookkeeping: every attribute or text the engine changes on host markup */
    var restore = [];
    function setAttr(e, k, v) {
      var had = e.hasAttribute(k), old = e.getAttribute(k);
      restore.push(function () { if (had) e.setAttribute(k, old); else e.removeAttribute(k); });
      e.setAttribute(k, v);
    }
    function setText(e, v) {
      if (!e.__radialText) { var old = e.textContent; e.__radialText = true;
        restore.push(function () { e.textContent = old; delete e.__radialText; }); }
      e.textContent = v;
    }
    var created = [];
    function adopt(e) { created.push(e); return e; }

    var canvas = host.querySelector('[data-radial-slot="canvas"]') || stage.parentNode;
    var live = host.querySelector('[data-radial-slot="live"]');
    if (!live) {
      live = adopt(html('div', 'radial-sr-only'));
      live.setAttribute('aria-live', 'polite');
      host.appendChild(live);
    }
    function announce(msg) { setText(live, msg); }
    var hud = host.querySelector('[data-radial-slot="hud"]');
    function readout(name) { return hud ? hud.querySelector('[data-radial-readout="' + name + '"]') : null; }
    var COMPACT = root.matchMedia ? root.matchMedia(COMPACT_Q) : { matches: false };
    var COARSE = root.matchMedia ? root.matchMedia('(pointer: coarse)') : { matches: false };

    /* ------------------------------------------------------------------ svg -- */
    var svg = adopt(el('svg', { xmlns: NS, 'class': 'radial-svg', 'aria-hidden': 'true', focusable: 'false' }));
    stage.appendChild(svg);
    var defs = el('defs'); svg.appendChild(defs);
    var arrowId = id + '-arrow';
    var mk = el('marker', { id: arrowId, 'class': 'radial-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5,
                            markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
    mk.appendChild(el('path', { d: 'M 0 0 L 10 5 L 0 10 z' }));
    defs.appendChild(mk);
    var gRoot = el('g', { 'class': 'radial-world' }); svg.appendChild(gRoot);
    var gSpine = el('g'); gRoot.appendChild(gSpine);
    var gEdge = el('g'); gRoot.appendChild(gEdge);
    var gNode = el('g'); gRoot.appendChild(gNode);
    var gRaise = el('g', { 'class': 'radial-raise' }); gRoot.appendChild(gRaise);
    var gLead = el('g'); svg.appendChild(gLead);
    var gLabel = el('g'); svg.appendChild(gLabel);
    var gFocus = el('g', { 'class': 'radial-focus' }); svg.appendChild(gFocus);
    var gProbe = el('g', { 'class': 'radial-probe' }); svg.appendChild(gProbe);

    var byId = new Map(), index = new Map();
    L.nodes.forEach(function (n, i) { byId.set(n.id, n); index.set(n.id, i); });
    /* sibling order as drawn: clockwise, the order the layout placed them */
    var siblings = new Map();
    L.nodes.forEach(function (n) {
      if (n.kind === 'root') return;
      if (!siblings.has(n.parent)) siblings.set(n.parent, []);
      siblings.get(n.parent).push(n.id);
    });
    function shapeOf(n) {
      var k = n.kindId ? model.kinds.get(n.kindId) : null;
      if (k) return k.shape;
      return n.kind === 'container' && n.depth === 1 ? 'pill' : 'circle';
    }
    function nodeClass(n) { return n.kind === 'root' ? 'root' : n.kind === 'leaf' ? 'leaf' : n.depth === 1 ? 'top' : 'container'; }

    var spineEls = new Map();                                  /* by the node each limb reaches */
    L.spines.forEach(function (s) {
      var p = el('path', { 'class': 'radial-spine' + (s.depth === 1 ? ' radial-spine--top' : ''), d: s.d });
      gSpine.appendChild(p);
      spineEls.set(s.id, p);
    });

    /* relations, drawn by their plane's policy; a 'never' plane is never drawn */
    var edgeEls = [], undrawn = 0;
    model.relations.forEach(function (e) {
      var pl = model.planes.get(e.plane);
      if (pl.drawn === 'never') { undrawn++; return; }
      var A = byId.get(e.from), B = byId.get(e.to);
      if (!A || !B) return;
      var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y;
      var bow = Math.sqrt(dx * dx + dy * dy) * 0.15, nl = Math.sqrt(dx * dx + dy * dy) || 1;
      var p = el('path', { 'class': 'radial-edge radial-edge--' + pl.drawn,
        d: 'M' + A.x + ' ' + A.y + ' Q' + (mx - dy / nl * bow) + ' ' + (my + dx / nl * bow) + ' ' + B.x + ' ' + B.y });
      if (pl.directed) p.setAttribute('marker-end', 'url(#' + arrowId + ')');
      /* created in the state paint(null) gives it, so a drawn-always relation is visible in the first
         rendered frame rather than fading in from nothing */
      if (pl.drawn === 'always') p.classList.add('is-on');
      gEdge.appendChild(p);
      edgeEls.push({ p: p, e: e, drawn: pl.drawn });
    });

    /* marks: the root, then containers by depth, then leaves, so a small mark is never drawn
       under a large one; within a group, the layout's order */
    var nodeEls = new Map();
    var drawOrder = L.nodes.slice().sort(function (a, b) {
      var ra = a.kind === 'root' ? 0 : a.kind === 'container' ? a.depth : 100;
      var rb = b.kind === 'root' ? 0 : b.kind === 'container' ? b.depth : 100;
      return ra - rb || index.get(a.id) - index.get(b.id);
    });
    drawOrder.forEach(function (n) {
      var g = el('g', { 'class': 'radial-node radial-node--' + nodeClass(n), id: id + '-n' + index.get(n.id) });
      g.setAttribute('data-radial-id', n.id);
      g.style.setProperty('--st', 'var(--state-' + (n.kind === 'root' ? 'neutral' : n.state) + ')');
      var r = n.r, sh = n.kind === 'root' ? 'circle' : shapeOf(n);
      if (sh === 'pill')
        g.appendChild(el('rect', { 'class': 'radial-mark', x: n.x - r, y: n.y - r * 0.62, width: r * 2, height: r * 1.24, rx: r * 0.5, ry: r * 0.5 }));
      else if (sh === 'square')
        g.appendChild(el('rect', { 'class': 'radial-mark', x: n.x - r, y: n.y - r, width: r * 2, height: r * 2, rx: r * 0.28, ry: r * 0.28 }));
      else if (sh === 'diamond')
        g.appendChild(el('polygon', { 'class': 'radial-mark', points: [n.x, n.y - r * 1.25, n.x + r * 1.25, n.y, n.x, n.y + r * 1.25, n.x - r * 1.25, n.y].join(' ') }));
      else if (sh === 'hex') {
        var pts = [];
        for (var i = 0; i < 6; i++) { var t = Math.PI / 6 + i * Math.PI / 3; pts.push((n.x + Math.cos(t) * r * 1.3) + ',' + (n.y + Math.sin(t) * r * 1.3)); }
        g.appendChild(el('polygon', { 'class': 'radial-mark', points: pts.join(' ') }));
      } else if (sh === 'tri')
        g.appendChild(el('polygon', { 'class': 'radial-mark', points: [n.x, n.y - r * 1.35, n.x + r * 1.2, n.y + r * 0.85, n.x - r * 1.2, n.y + r * 0.85].join(' ') }));
      else if (sh === 'ring') {
        g.appendChild(el('circle', { 'class': 'radial-mark', cx: n.x, cy: n.y, r: r * 1.2 }));
        g.appendChild(el('circle', { 'class': 'radial-chip', cx: n.x, cy: n.y, r: r * 0.34 }));
      } else g.appendChild(el('circle', { 'class': 'radial-mark', cx: n.x, cy: n.y, r: r }));
      gNode.appendChild(g);
      nodeEls.set(n.id, { g: g, n: n, shape: sh });
    });

    /* screen-space label elements, built once and positioned on every apply() */
    var labelEls = new Map();
    L.nodes.forEach(function (n) {
      var rl = n.kind === 'root' ? 'root' : n.kind === 'leaf' ? 'leaf' : n.depth === 1 ? 'top' : 'container';
      var t = el('text', { 'class': 'radial-lbl radial-lbl--' + rl + ' radial-halo' });
      gLabel.appendChild(t);
      var x = { t: t, cnt: null, idl: null, lead: null };
      if (n.kind === 'container') {
        x.cnt = el('text', { 'class': 'radial-lbl radial-lbl--count radial-halo' }); gLabel.appendChild(x.cnt);
        x.lead = el('path', { 'class': 'radial-leader' }); gLead.appendChild(x.lead);
      }
      if (n.kind === 'leaf') { x.idl = el('text', { 'class': 'radial-lbl radial-lbl--id radial-halo' }); gLabel.appendChild(x.idl); }
      labelEls.set(n.id, x);
    });

    /* ---------------------------------------------------------- measurement -- */
    /* Widths come from the rendered text engine (an SVG probe per role), so the stylesheet is the
       one source of every label metric; vertical metrics come from a canvas at the same font. */
    var probes = {}, widthCache = new Map(), fontCache = new Map(), inkCache = new Map(), ctx2d = null;
    ['root', 'top', 'container', 'leaf', 'count', 'id'].forEach(function (rl) {
      var t = el('text', { 'class': 'radial-lbl radial-lbl--' + rl });
      gProbe.appendChild(t); probes[rl] = t;
    });
    /* a webfont weight is requested lazily, the first time text needs it, and document.fonts.status
       reads "loaded" both before that request and after it settles; so the caches are keyed by a
       generation that every completed font load advances, never by the status */
    var fontGen = 0;
    function fontsKey() { return fontGen; }
    function fontOf(rl) {
      var cs = getComputedStyle(probes[rl]);
      return cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    }
    var M = {
      measure: function (s, rl) {
        var k = fontsKey() + '|' + rl + '|' + s;
        if (widthCache.has(k)) return widthCache.get(k);
        probes[rl].textContent = s;
        var w = probes[rl].getComputedTextLength();
        if (w > 0 || !s) widthCache.set(k, w);        /* a hidden host measures 0: never keep it */
        return w;
      },
      font: function (rl) {
        var k = fontsKey() + '|' + rl;
        if (fontCache.has(k)) return fontCache.get(k);
        ctx2d = ctx2d || document.createElement('canvas').getContext('2d');
        var f = { a: 10, d: 3 }, px = parseFloat(getComputedStyle(probes[rl]).fontSize) || 12;
        if (ctx2d) {
          ctx2d.font = fontOf(rl);
          var m = ctx2d.measureText('Hg');
          f = (m.fontBoundingBoxAscent >= 0) ? { a: m.fontBoundingBoxAscent, d: m.fontBoundingBoxDescent } : { a: px * 0.92, d: px * 0.24 };
        }
        fontCache.set(k, f);
        return f;
      },
      ink: function (s, rl) {
        var k = fontsKey() + '|' + rl + '|' + s;
        if (inkCache.has(k)) return inkCache.get(k);
        ctx2d = ctx2d || document.createElement('canvas').getContext('2d');
        var g = null;
        if (ctx2d) {
          ctx2d.font = fontOf(rl);
          var m = ctx2d.measureText(s);
          if (m.actualBoundingBoxAscent >= 0) g = { a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent || 0 };
        }
        inkCache.set(k, g);
        return g;
      }
    };

    /* --------------------------------------------------------------- view -- */
    var view = { k: 1, x: 0, y: 0 }, fitK = 1, wholeK = 0, atFit = false, fitCause = null;
    var held = null, fitSeq = 0, lastFit = null, frame = 0;
    /* WHO MADE THE VIEW. manual: the reader or the page has moved the camera (a pan, a pinch, the wheel,
       a zoom control or zoom(), a keyboard move or focus() that pans) since the map last placed it.
       made: the last placement the map made itself, made again for a new stage size while the view is
       not the reader's: the Fit ('fit'), a framed group ('frame') or a node centered by an arrival, a
       search result or a reference followed ('node'). sw, sh: the stage size that placement was made
       for. */
    var manual = false, made = null, sw = 0, sh = 0;
    /* room: the bands the chrome reserves as it stands after a size change away from the Fit, measured as
       a Fit would measure them; the visible area reads them in place of the last Fit's, which belong to
       the size it was made at. A Fit clears it, its own bands being current */
    var room = null;
    function remember() { sw = W(); sh = H(); }
    /* MEMBERSHIP. null: every node and relation (no facet module, or no filter). Otherwise the
       member nodes (the root always; a container while any member leaf lies under it) and,
       separately, the member relations; memberCount is each container's member leaves. */
    var membership = null, relMembership = null, memberCount = null;
    function visible(nid) { return !model.hidden.has(nid) && (!membership || membership.has(nid)); }
    function relVisible(e) { return (!relMembership || relMembership.has(e.key)) && visible(e.from) && visible(e.to); }
    function shownCount(n) { return membership ? (memberCount.get(n.id) || 0) : (n.count || 0); }
    function project(n) { return { x: n.x * view.k + view.x, y: n.y * view.k + view.y }; }
    function W() { return stage.clientWidth; }
    function H() { return stage.clientHeight; }
    function bands() { var f = room || lastFit; return f ? { left: f.leftBand || 0, right: f.rightBand || 0, top: f.topBand || 0, bottom: f.bottomBand || 0 } : {}; }
    function tier() { return R.labels.tierFor(LC.tiers, view.k); }
    function solveInput(h) {
      return { nodes: L.nodes, view: view, W: W(), H: H(), tier: tier(), visible: visible, shownCount: shownCount,
               held: h === undefined ? held : h, measure: M.measure, font: M.font, crowding: LC.crowding, bands: bands(),
               countText: function (n) { return R.labels.countText(LC, n, membership ? shownCount(n) : undefined); } };
    }
    var solution = [];
    function placeLabels() {
      solution = R.labels.solve(solveInput());
      solution.forEach(function (e) {
        var x = labelEls.get(e.id);
        function put(t, line) {
          if (!t) return;
          if (!line) { t.style.display = 'none'; return; }
          t.style.display = '';
          t.setAttribute('x', line.x); t.setAttribute('y', line.y);
          t.setAttribute('text-anchor', line.anchor);
          if (line.rotate) t.setAttribute('transform', 'rotate(' + line.rotate.deg + ' ' + line.rotate.cx + ' ' + line.rotate.cy + ')');
          else t.removeAttribute('transform');
          t.textContent = line.text;
        }
        if (!e.show) { put(x.t, null); put(x.cnt, null); put(x.idl, null); if (x.lead) x.lead.style.display = 'none'; return; }
        put(x.t, e.name);
        put(x.cnt, e.count && e.count.show ? e.count : null);
        put(x.idl, e.idLine);
        if (x.lead) {
          if (e.leader) { x.lead.style.display = ''; x.lead.setAttribute('d', 'M' + e.leader.x1 + ' ' + e.leader.y1 + ' L' + e.leader.x2 + ' ' + e.leader.y2); }
          else x.lead.style.display = 'none';
        }
      });
    }
    function apply() {
      if (destroyed) return;
      gRoot.setAttribute('transform', 'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
      placeLabels();
      drawFocus();
      var pct = readout('zoom'), tr = readout('tier');
      if (pct) setText(pct, Math.round(view.k * 100) + '%');
      if (tr) setText(tr, tier().name);
    }
    function scheduleApply() {
      if (frame) return;
      frame = (root.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); })(function () { frame = 0; apply(); });
    }
    function clampK(k) { return Math.max(Math.min(fitK, wholeK || fitK, 0.24), Math.min(k, 14)); }
    function zoomAt(f, cx, cy) {
      closeChooser();
      cx = cx === undefined ? W() / 2 : cx; cy = cy === undefined ? H() / 2 : cy;
      var nk = clampK(view.k * f);
      view.x = cx - (cx - view.x) * (nk / view.k);
      view.y = cy - (cy - view.y) * (nk / view.k);
      view.k = nk; atFit = false; manual = true; scheduleApply();
    }

    /* ---------------------------------------------------------------- Fit -- */
    function edge(e) { return '[data-diagram-fit-edge="' + e + '"]'; }
    function fitCandidate(b, sel) {
      return root.DIAGRAM_FIT.compute({
        wrap: canvas, bounds: { minX: b.x, minY: b.y, maxX: b.x + b.w, maxY: b.y + b.h },
        viewport: { width: W(), height: H() },
        clearanceX: 22, clearanceY: 22, gutter: 16, maxScale: 1.2,
        topSelector: sel.top, bottomSelector: sel.bottom, leftSelector: sel.left, rightSelector: sel.right
      });
    }
    /* the Fit frames the members; with no member item (the root alone) it frames the whole layout */
    function visibleBounds() {
      if (!membership) return L.bounds;
      var vis = L.nodes.filter(function (n) { return visible(n.id); });
      return vis.length > 1 ? R.layout.boundsOf(vis) || L.bounds : L.bounds;
    }
    /* the chrome the Fit reserves, as boxes in stage coordinates */
    function chromeRects(only) {
      var sr = stage.getBoundingClientRect(), out = [];
      var els = only ? [only] : canvas.querySelectorAll('[data-diagram-fit-edge]:not([data-diagram-fit-edge="none"])');
      Array.prototype.forEach.call(els, function (e) {
        if (!e.getClientRects().length) return;
        var st = getComputedStyle(e);
        if (st.visibility === 'hidden' || +st.opacity === 0) return;
        var r = e.getBoundingClientRect();
        if (r.width && r.height) out.push({ l: r.left - sr.left, r: r.right - sr.left, t: r.top - sr.top, b: r.bottom - sr.top });
      });
      return out;
    }
    /* chrome that declares an optional edge (data-radial-fit-option: a panel in a corner, which can
       be reserved beside the drawing or above it) is reserved there instead, and at no other edge */
    function option(e) {
      return '[data-diagram-fit-edge="' + e + '"]:not([data-radial-fit-option]), [data-radial-fit-option="' + e + '"]';
    }
    function placement(b, E) {
      var r = fitCandidate(b, { top: E('top'), bottom: E('bottom'), left: E('left'), right: E('right') });
      r.mode = 'side';
      if (COMPACT.matches) {
        var band = fitCandidate(b, { top: E('top'), left: E('left'), right: null, bottom: E('bottom') + ', ' + E('right') });
        if (band.clear && (!r.clear || band.scale > r.scale)) { r = band; r.mode = 'band'; }
      }
      return r;
    }
    /* every Fit chooses again, from the chrome as it stands: the declared edges, or the optional
       edges where any are declared; the larger placement that clears wins, and a tie keeps the declared */
    function choose(b) {
      var r = placement(b, edge);
      r.option = false;
      if (canvas.querySelector('[data-radial-fit-option]')) {
        var a = placement(b, option);
        if (a.clear && (!r.clear || a.scale > r.scale)) { r = a; r.option = true; }
      }
      return r;
    }
    function fitTo(b, whole, cause) {
      var r = choose(b);
      room = null;
      view.k = r.scale; view.x = r.tx; view.y = r.ty;
      fitK = r.scale; if (whole) wholeK = r.scale;
      lastFit = r; atFit = !!whole; fitCause = cause;
      manual = false; made = { basis: whole ? 'fit' : 'frame', id: null }; remember();
      held = null;
      apply();
      if (whole) {
        held = R.labels.population(solveInput(null), M, chromeRects(), canvas.hasAttribute('data-radial-short'));
        if (held) apply();
      }
      report(r, whole, cause);
      emit('fit', { cause: cause, report: lastFit });
    }
    function fit(cause) { fitTo(visibleBounds(), true, cause || 'load'); }
    /* what a Fit's report says: the helper's drawing clearance, and on top of it that no name sits
       under reserved chrome or outside the canvas, none overprints another, no count's letters meet
       a name, and no open overlay covers the drawing or its names */
    function report(r, whole, cause) {
      var chk = R.labels.checks, w = W(), h = H();
      r.cause = cause; r.explicit = cause === 'explicit'; r.seq = ++fitSeq; r.whole = !!whole;
      r.drawingClear = r.clear;
      r.labelsUnder = chk.under(solution, M, chromeRects()).size;
      r.labelsOutside = chk.outside(solution, M, w, h).size;
      r.overprinted = chk.overprints(solution, M).size;
      r.obscured = chk.obscured(solution, M).size;
      r.deferred = R.labels.deferred(solution);
      r.tier = tier().name;
      r.covered = overlays.filter(function (o) { return o.isOpen() && covers(o.element); }).map(function (o) { return o.name; });
      r.clear = r.drawingClear && !r.labelsUnder && !r.labelsOutside && !r.overprinted && !r.obscured && !r.covered.length;
    }
    function covers(e) {
      if (!e || !e.getClientRects().length) return false;
      var g = gRoot.getBoundingClientRect(), r = e.getBoundingClientRect();
      return (r.left < g.right && g.left < r.right && r.top < g.bottom && g.top < r.bottom) ||
             R.labels.checks.under(solution, M, chromeRects(e)).size > 0;
    }
    /* An explicit Fit keeps its word: it dismisses each open overlay that covers the drawing or the
       names an unheld overview would place, then fits again and reports cause 'explicit'. */
    function explicitFit() {
      fit('reader');
      overlays.slice().forEach(function (o) {
        if (!o.isOpen()) return;
        var h = held; held = null; placeLabels();
        var c = covers(o.element); held = h; placeLabels();
        if (c) o.dismiss('fit');
      });
      fit('explicit');
    }

    /* ------------------------------------------------------------ framing -- */
    function visibleArea() {
      var b = bands(), w = W(), h = H();
      var r = { x0: b.left || 0, y0: b.top || 0, x1: w - (b.right || 0), y1: h - (b.bottom || 0) };
      if (r.y1 - r.y0 < 80) { r.y0 = 0; r.y1 = h; }
      if (r.x1 - r.x0 < 80) { r.x0 = 0; r.x1 = w; }
      return r;
    }
    function reveal(nid) {
      var n = byId.get(nid); if (!n) return;
      var vr = visibleArea(), p = project(n), m = 24;
      if (p.x >= vr.x0 + m && p.x <= vr.x1 - m && p.y >= vr.y0 + m && p.y <= vr.y1 - m) return;
      view.x += (vr.x0 + vr.x1) / 2 - p.x; view.y += (vr.y0 + vr.y1) / 2 - p.y;
      atFit = false; manual = true; apply();
    }
    /* bring a node into the room a panel over the drawing leaves (cover: the panel's box in stage
       coordinates): the largest free band beside it within the visible area. The view pans only if
       the node is outside that room, and either way it is no longer the Fit of the chrome on screen.
       With no node, the view only leaves the Fit. */
    function revealBeside(nid, cover) {
      var n = nid === null ? null : byId.get(nid);
      if (!n) { if (nid === null) { atFit = false; apply(); } return false; }
      var vr = visibleArea(), m = 12;
      if (cover) {
        var c = [{ x0: vr.x0, y0: vr.y0, x1: vr.x1, y1: Math.min(vr.y1, cover.t) }, { x0: vr.x0, y0: Math.max(vr.y0, cover.b), x1: vr.x1, y1: vr.y1 },
                 { x0: vr.x0, y0: vr.y0, x1: Math.min(vr.x1, cover.l), y1: vr.y1 }, { x0: Math.max(vr.x0, cover.r), y0: vr.y0, x1: vr.x1, y1: vr.y1 }];
        c.sort(function (a, b) { return Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0) - Math.max(0, a.x1 - a.x0) * Math.max(0, a.y1 - a.y0); });
        if (c[0].x1 - c[0].x0 > 2 * m && c[0].y1 - c[0].y0 > 2 * m) vr = c[0];
      }
      var p = project(n), moved = !(p.x >= vr.x0 + m && p.x <= vr.x1 - m && p.y >= vr.y0 + m && p.y <= vr.y1 - m);
      if (moved) { view.x += (vr.x0 + vr.x1) / 2 - p.x; view.y += (vr.y0 + vr.y1) / 2 - p.y; }
      atFit = false; apply();
      return moved;
    }
    function centerOn(nid, k) {
      var n = byId.get(nid); if (!n) return false;
      var nk = clampK(k || Math.max(view.k, 1.35));
      var vr = visibleArea();
      view.k = nk; view.x = (vr.x0 + vr.x1) / 2 - n.x * nk; view.y = (vr.y0 + vr.y1) / 2 - n.y * nk;
      atFit = false; manual = false; made = { basis: 'node', id: nid }; remember(); apply(); return true;
    }
    function subtree(nid) {
      var out = [];
      (function walk(x) { out.push(byId.get(x)); (siblings.get(x) || []).forEach(walk); })(nid);
      return out.filter(function (n) { return n && visible(n.id); });
    }
    /* frame a container: the same map, framed on its subtree */
    function frameNode(nid, cause) {
      var n = byId.get(nid);
      if (!n || n.kind === 'leaf') return false;
      if (n.kind === 'root') { fit(cause || 'reader'); return true; }
      var b = R.layout.boundsOf(subtree(nid), 60);
      fitTo(b, false, 'frame');
      made.id = nid;
      announce(fill(announceT.frame, { label: n.label }));
      return true;
    }

    /* ---------------------------------------------------------- selection -- */
    var locked = null, previewId = null, focusId = null;
    var neighbors = new Map();
    edgeEls.forEach(function (x) {
      [[x.e.from, x.e.to], [x.e.to, x.e.from]].forEach(function (p) {
        if (!neighbors.has(p[0])) neighbors.set(p[0], new Set());
        neighbors.get(p[0]).add(p[1]);
      });
    });
    function paint(nid) {
      var near = nid ? (neighbors.get(nid) || new Set()) : null;
      nodeEls.forEach(function (x, k) {
        x.g.classList.toggle('is-selected', !!nid && k === nid);
        x.g.classList.toggle('is-near', !!nid && k !== nid && near.has(k));
        x.g.classList.toggle('is-dim', !!nid && k !== nid && !near.has(k) && x.n.kind === 'leaf');
      });
      edgeEls.forEach(function (x) {
        var hot = !!nid && (x.e.from === nid || x.e.to === nid);
        x.p.classList.toggle('is-on', x.drawn === 'always' ? (!nid || hot) : hot);
      });
      raise();
    }
    /* a selected and a focused mark are drawn again above everything, never moved */
    function raise() {
      while (gRaise.firstChild) gRaise.removeChild(gRaise.firstChild);
      [locked || previewId, focusId].forEach(function (k) {
        if (!k || !nodeEls.has(k) || !visible(k)) return;
        var u = el('use', { href: '#' + nodeEls.get(k).g.id });
        gRaise.appendChild(u);
      });
    }
    function selectedReadout() {
      var s = readout('selection');
      if (!s) return;
      var n = locked ? byId.get(locked) : null;
      setText(s, n ? n.label : (typeof text.idle === 'string' ? text.idle : ''));
    }
    function select(nid, via, cause) {
      if (nid !== null && (!byId.has(nid) || !visible(nid))) return false;
      locked = nid; previewId = null;
      paint(nid);
      selectedReadout();
      if (nid) announce(fill(announceT.select, { label: byId.get(nid).label }));
      emit('select', { id: nid, cause: cause || (via === 'api' ? 'module' : 'reader'), via: via || 'api' });
      return true;
    }
    function preview(nid) {
      if (locked) return;
      if (nid === previewId) return;
      previewId = nid;
      paint(nid);
      emit('preview', { id: nid, cause: 'reader' });
    }

    /* ---------------------------------------------------------- membership -- */
    /* A module (the facets) sets which leaves and which relations are members. Membership never
       moves a mark: non-members, their limbs and the relations that lose an end are hidden, their
       names leave the labels, a container counts only its member leaves, and a selection, preview
       or focus that leaves the membership is cleared. The caller decides whether to refit. */
    var leafTotal = L.nodes.filter(function (n) { return n.kind === 'leaf'; }).length;
    var relTotal = edgeEls.length;
    function applyMembership() {
      nodeEls.forEach(function (x, k) { x.g.classList.toggle('is-out', !visible(k)); });
      spineEls.forEach(function (p, k) { p.classList.toggle('is-out', !visible(k)); });
      edgeEls.forEach(function (x) { x.p.classList.toggle('is-out', !relVisible(x.e)); });
    }
    function membershipState() {
      var items = 0, rels = 0;
      L.nodes.forEach(function (n) { if (n.kind === 'leaf' && visible(n.id)) items++; });
      edgeEls.forEach(function (x) { if (relVisible(x.e)) rels++; });
      return { active: !!(membership || relMembership), visibleItems: items, totalItems: leafTotal,
               visibleRelations: rels, totalRelations: relTotal };
    }
    function setMembership(leaves, relations, cause) {
      if (leaves !== null && !(leaves instanceof Set)) throw MountError('MOUNT', 'membership leaves must be a Set or null');
      if (relations !== null && !(relations instanceof Set)) throw MountError('MOUNT', 'membership relations must be a Set or null');
      if (leaves === null) { membership = null; memberCount = null; }
      else {
        membership = new Set([model.root.id]); memberCount = new Map();
        L.nodes.forEach(function (n) {
          if (n.kind !== 'leaf' || !leaves.has(n.id) || model.hidden.has(n.id)) return;
          membership.add(n.id);
          for (var p = n.parent; p !== undefined && p !== null; p = byId.get(p).parent) {
            membership.add(p);
            memberCount.set(p, (memberCount.get(p) || 0) + 1);
            if (byId.get(p).kind === 'root') break;
          }
        });
      }
      relMembership = relations;
      closeChooser();
      if (previewId && !visible(previewId)) previewId = null;
      if (focusId && !visible(focusId)) focusId = null;
      if (locked && !visible(locked)) select(null, 'api', cause || 'module');
      applyMembership();
      paint(locked);
      apply();
      var st = membershipState();
      emit('membership', Object.assign({ cause: cause || 'module' }, st));
      return st;
    }

    /* ------------------------------------------------------------ hit test -- */
    /* every mark under or near a stage point, in world terms; nearest first, then smaller marks */
    /* the outer reach of a mark, as a multiple of its radius: what the focus ring encloses */
    var REACH = { circle: 1, ring: 1.2, hex: 1.3, diamond: 1.25, tri: 1.35, square: 1.3, pill: 1 };
    function reach(x) { return x.n.r * (REACH[x.shape] || 1); }
    function polygon(x) {
      if (x.poly) return x.poly;
      var r = x.n.r, p;
      if (x.shape === 'diamond') p = [[0, -r * 1.25], [r * 1.25, 0], [0, r * 1.25], [-r * 1.25, 0]];
      else if (x.shape === 'tri') p = [[0, -r * 1.35], [r * 1.2, r * 0.85], [-r * 1.2, r * 0.85]];
      else { p = []; for (var i = 0; i < 6; i++) { var t = Math.PI / 6 + i * Math.PI / 3; p.push([Math.cos(t) * r * 1.3, Math.sin(t) * r * 1.3]); } }
      return (x.poly = p);
    }
    function polyGap(p, dx, dy) {                             /* signed distance to a convex polygon */
      var inside = false, d = Infinity;
      for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
        var ax = p[j][0], ay = p[j][1], bx = p[i][0], by = p[i][1], ex = bx - ax, ey = by - ay;
        var t = Math.max(0, Math.min(1, ((dx - ax) * ex + (dy - ay) * ey) / (ex * ex + ey * ey)));
        d = Math.min(d, Math.hypot(dx - (ax + t * ex), dy - (ay + t * ey)));
        if ((ay > dy) !== (by > dy) && dx < ax + (dy - ay) * ex / ey) inside = !inside;
      }
      return inside ? -d : d;
    }
    function boxGap(dx, dy, hw, hh, rr) {                     /* signed distance to a rounded rectangle */
      var qx = Math.abs(dx) - (hw - rr), qy = Math.abs(dy) - (hh - rr);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
    }
    /* the world distance from a point to a mark's drawn shape; <= 0 inside it */
    function gap(x, wx, wy) {
      var r = x.n.r, dx = wx - x.n.x, dy = wy - x.n.y;
      switch (x.shape) {
        case 'ring': return Math.hypot(dx, dy) - r * 1.2;
        case 'square': return boxGap(dx, dy, r, r, r * 0.28);
        case 'pill': return boxGap(dx, dy, r, r * 0.62, r * 0.5);
        case 'diamond': case 'tri': case 'hex': return polyGap(polygon(x), dx, dy);
        default: return Math.hypot(dx, dy) - r;
      }
    }
    function hits(sx, sy, tolPx) {
      var wx = (sx - view.x) / view.k, wy = (sy - view.y) / view.k, tol = tolPx / view.k;
      var inside = [], near = [];
      nodeEls.forEach(function (x, k) {
        if (!visible(k)) return;
        var g = gap(x, wx, wy);
        if (g <= 0) inside.push({ id: k, d: Math.hypot(wx - x.n.x, wy - x.n.y), r: x.n.r });
        else if (g <= tol) near.push({ id: k, d: Math.hypot(wx - x.n.x, wy - x.n.y), r: x.n.r });
      });
      function order(a, b) { return a.d - b.d || a.r - b.r || index.get(a.id) - index.get(b.id); }
      inside.sort(order); near.sort(order);
      return { inside: inside.map(function (h) { return h.id; }), near: near.map(function (h) { return h.id; }) };
    }
    var lastPointerType = 'mouse';
    on(stage, 'pointerdown', function (e) { lastPointerType = e.pointerType || 'mouse'; }, { capture: true });
    function tolerance() { return lastPointerType === 'mouse' ? 4 : 10; }
    /* a tap: one mark under the point selects it; several marks under it, or none under it and several
       near it, open the chooser; one near it selects it; nothing there clears the selection */
    /* the chooser lists every mark under the point, since zoom cannot separate overlapping marks,
       then marks near it up to CHOOSER_MAX in all; the rest of the near ones separate with zoom */
    function chooseFrom(inside, near) {
      var ids = inside.concat(near);
      return { action: 'choose', ids: ids, shown: ids.slice(0, Math.max(inside.length, CHOOSER_MAX)) };
    }
    function tapAt(sx, sy, tolPx) {
      var h = hits(sx, sy, tolPx === undefined ? tolerance() : tolPx);
      if (h.inside.length === 1) return { action: 'select', id: h.inside[0] };
      if (h.inside.length > 1) return chooseFrom(h.inside, h.near);
      if (h.near.length === 1) return { action: 'select', id: h.near[0] };
      if (h.near.length > 1) return chooseFrom([], h.near);
      return { action: 'clear' };
    }
    on(stage, 'click', function (e) {
      var r = stage.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      var t = tapAt(sx, sy);
      if (t.action === 'select') { closeChooser(); select(t.id, 'pointer'); focusId = t.id; drawFocus(); }
      else if (t.action === 'choose') openChooser(t, sx, sy);
      else { closeChooser(); if (locked) { select(null, 'pointer'); announce(announceT.clear); } }
    });
    /* hover: the mark under a mouse previews while nothing is selected */
    var hoverFrame = 0, hoverAt = null;
    on(stage, 'pointermove', function (e) {
      if (e.pointerType !== 'mouse' || pointer.panning()) return;
      var r = stage.getBoundingClientRect();
      hoverAt = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (hoverFrame) return;
      hoverFrame = (root.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); })(function () {
        hoverFrame = 0;
        if (destroyed || !hoverAt) return;
        var h = hits(hoverAt.x, hoverAt.y, 0);
        stage.classList.toggle('is-over-mark', h.inside.length > 0);
        preview(h.inside.length === 1 ? h.inside[0] : null);
      });
    });
    on(stage, 'pointerleave', function () { hoverAt = null; stage.classList.remove('is-over-mark'); preview(null); });

    /* ------------------------------------------------------------- chooser -- */
    var chooser = null, overlays = [], escapes = [];
    function registerOverlay(o) { overlays.push(o); return function () { overlays = overlays.filter(function (x) { return x !== o; }); }; }
    function pushEscape(x) { escapes.push(x); escapes.sort(function (a, b) { return a.priority - b.priority; }); }
    function openChooser(t, sx, sy) {
      closeChooser(true);
      var ids = t.ids, shown = t.shown, more = ids.length - shown.length;
      var box = adopt(html('div', 'radial-chooser'));
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', fill(announceT.choose, { count: ids.length }));
      box.appendChild(html('div', 'radial-chooser-h', fill(announceT.choose, { count: ids.length })));
      var items = [];
      shown.forEach(function (k) {
        var n = byId.get(k), b = html('button', 'radial-chooser-item');
        b.type = 'button';
        var sw = html('span', 'radial-chooser-sw');
        sw.style.setProperty('--st', 'var(--state-' + (n.kind === 'root' ? 'neutral' : n.state) + ')');
        b.appendChild(sw);
        var tx = html('span', 'radial-chooser-txt');
        tx.appendChild(html('span', 'radial-chooser-lbl', n.label));
        var par = byId.get(n.parent);
        if (par) tx.appendChild(html('span', 'radial-chooser-sub', par.label));
        b.appendChild(tx);
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          closeChooser(true);
          select(k, 'chooser'); focusId = k; drawFocus();
          stage.focus({ preventScroll: true });
        });
        b.addEventListener('pointerenter', function () { previewInChooser(k); });
        b.addEventListener('focus', function () { previewInChooser(k); });
        box.appendChild(b); items.push(b);
      });
      if (more > 0) {
        var z = html('button', 'radial-chooser-zoom', controls.zoomHere + ' (' + fill(controls.more, { count: more }) + ')');
        z.type = 'button';
        z.addEventListener('click', function (ev) { ev.stopPropagation(); closeChooser(true); zoomAt(2.5, sx, sy); stage.focus({ preventScroll: true }); });
        box.appendChild(z); items.push(z);
      }
      box.addEventListener('keydown', function (ev) {
        var i = items.indexOf(document.activeElement);
        if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length].focus(); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      });
      box.addEventListener('click', function (ev) { ev.stopPropagation(); });
      box.addEventListener('focusout', function (ev) { if (!box.contains(ev.relatedTarget)) closeChooser(); });
      box.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
      canvas.appendChild(box);
      var cw = canvas.clientWidth, ch = canvas.clientHeight, bw = box.offsetWidth, bh = box.offsetHeight;
      var sr = stage.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
      var px = sx + (sr.left - cr.left) + 14, py = sy + (sr.top - cr.top) - 12;
      if (px + bw > cw - 8) px = Math.max(8, px - bw - 28);
      if (py + bh > ch - 8) py = Math.max(8, ch - bh - 8);
      box.style.left = px + 'px'; box.style.top = Math.max(8, py) + 'px';
      var entry = { name: 'chooser', side: 'float', element: box, isOpen: function () { return !!chooser; },
                    dismiss: function () { closeChooser(); } };
      var esc = { name: 'chooser', priority: 30, isActive: function () { return !!chooser; },
                  dismiss: function () { closeChooser(true); stage.focus({ preventScroll: true }); } };
      chooser = { box: box, items: ids, unregister: registerOverlay(entry), esc: esc };
      pushEscape(esc);
      announce(fill(announceT.choose, { count: ids.length }));
      items[0].focus({ preventScroll: true });
    }
    function previewInChooser(k) {
      if (locked) { paint(k); return; }
      previewId = k; paint(k);
    }
    /* a chooser that closes on its own (a resize, a pan, a zoom, a filter) while it holds focus hands
       focus to the figure, so the next key still reaches it; a caller that places focus itself passes own.
       Focus a reader has moved elsewhere stays there, and destroy moves none */
    function closeChooser(own) {
      if (!chooser) return;
      var c = chooser; chooser = null;
      var held = !own && !destroyed && c.box.contains(document.activeElement);
      c.unregister();
      escapes = escapes.filter(function (x) { return x !== c.esc; });
      if (c.box.parentNode) c.box.parentNode.removeChild(c.box);
      created = created.filter(function (x) { return x !== c.box; });
      previewId = null; paint(locked);
      if (held) stage.focus({ preventScroll: true });
    }

    /* ----------------------------------------------------- keyboard path -- */
    /* Tab reaches the stage; arrows move a focus over the hierarchy itself, so every node is
       reachable whatever its geometry: Left / Right the previous / next sibling around the ring,
       Down the first child, Up the parent. Enter selects; Enter on the selected container frames
       it. Escape peels one layer: the chooser, then the selection. Focus is drawn and announced. */
    setAttr(stage, 'tabindex', '0');
    setAttr(stage, 'role', 'group');
    setAttr(stage, 'aria-roledescription', 'radial diagram');
    setAttr(stage, 'aria-label', model.root.label);
    var keyboard = false;
    function position(nid) {
      var n = byId.get(nid);
      if (n.kind === 'root') return fill(announceT.focusRoot, { label: n.label });
      var sib = (siblings.get(n.parent) || []).filter(visible);
      return fill(announceT.focus, { label: n.label, index: sib.indexOf(nid) + 1, total: sib.length,
                                     parent: byId.get(n.parent).label, depth: n.depth, count: n.count === undefined ? '' : n.count });
    }
    function drawFocus() {
      while (gFocus.firstChild) gFocus.removeChild(gFocus.firstChild);
      if (!focusId || !keyboard || document.activeElement !== stage || !visible(focusId)) return;
      var n = byId.get(focusId), p = project(n), x = nodeEls.get(focusId);
      var rr = reach(x) * view.k;
      gFocus.appendChild(el('circle', { 'class': 'radial-focus-ring', cx: p.x, cy: p.y, r: Math.max(rr * 1.25 + 4, 10) }));
    }
    function focusNode(nid, cause) {
      if (!nid || !byId.has(nid) || !visible(nid)) return false;
      focusId = nid;
      raise();
      reveal(nid);
      drawFocus();
      announce(position(nid));
      emit('focus', { id: nid, cause: cause || 'reader' });
      return true;
    }
    on(stage, 'focus', function () {
      keyboard = stage.matches(':focus-visible');
      if (!keyboard) return;
      if (!focusId || !visible(focusId)) focusId = locked || model.root.id;
      raise(); drawFocus();
      announce(fill(announceT.start, { label: byId.get(focusId).label }) + ' ' + position(focusId));
    });
    on(stage, 'blur', function () { drawFocus(); });
    on(stage, 'keydown', function (ev) {
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
      var k = ev.key, cur = focusId || locked || model.root.id, n = byId.get(cur), handled = true;
      keyboard = true;
      if (k !== 'Escape' && k !== 'Tab') closeChooser();
      if (k === 'ArrowRight' || k === 'ArrowLeft') {
        if (n.kind === 'root') announce(fill(announceT.top, { label: n.label }));
        else {
          var sib = (siblings.get(n.parent) || []).filter(visible), i = sib.indexOf(cur);
          focusNode(sib[(i + (k === 'ArrowRight' ? 1 : -1) + sib.length) % sib.length]);
        }
      } else if (k === 'ArrowDown') {
        var kids = (siblings.get(cur) || []).filter(visible);
        if (kids.length) focusNode(kids[0]); else announce(fill(announceT.leaf, { label: n.label }));
      } else if (k === 'ArrowUp') {
        if (n.kind === 'root') announce(fill(announceT.top, { label: n.label }));
        else focusNode(n.parent);
      } else if (k === 'Enter' || k === ' ') {
        if (locked === cur && n.kind !== 'leaf') frameNode(cur, 'reader');
        else { select(cur, 'keyboard'); focusId = cur; reveal(cur); drawFocus(); }
      } else handled = false;
      if (handled) ev.preventDefault();
    });
    /* Escape peels one layer at a time, inside this host only */
    pushEscape({ name: 'selection', priority: 10, isActive: function () { return !!locked; },
                 dismiss: function () { select(null, 'keyboard'); announce(announceT.clear); } });
    on(host, 'keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      for (var i = escapes.length - 1; i >= 0; i--) {
        if (escapes[i].isActive()) { escapes[i].dismiss(); ev.preventDefault(); ev.stopPropagation(); return; }
      }
    });

    /* ------------------------------------------------------------- pointer -- */
    var pointer = root.DIAGRAM_POINTER.attach({
      stage: stage, signal: signal, clampK: clampK,
      getView: function () { return { k: view.k, x: view.x, y: view.y }; },
      setView: function (v) { closeChooser(); view.k = v.k; view.x = v.x; view.y = v.y; atFit = false; manual = true; scheduleApply(); },
      zoomAt: function (f, cx, cy) { zoomAt(f, cx, cy); }
    });

    /* ----------------------------------------------------------------- HUD -- */
    if (hud) {
      [['zoom-in', function () { zoomAt(1.3); }, controls.zoomIn],
       ['zoom-out', function () { zoomAt(1 / 1.3); }, controls.zoomOut],
       ['fit', explicitFit, controls.fit]].forEach(function (c) {
        var b = hud.querySelector('[data-radial-control="' + c[0] + '"]');
        if (!b) return;
        if (!b.hasAttribute('aria-label')) setAttr(b, 'aria-label', c[2]);
        if (!b.hasAttribute('title')) setAttr(b, 'title', c[2]);
        on(b, 'click', function (ev) { ev.stopPropagation(); c[1](); });
      });
    }

    /* -------------------------------------------------------------- resize -- */
    /* A size change refits at the Fit. A camera the reader has moved stays where it is: on a touch
       screen a change of height alone (the address bar, the keyboard) holds its center. A view the map
       made itself is made again for the new size: the Fit, a framed group, or the centered node brought
       back into the visible area at its zoom, the selection taking its place; then the modules, told by
       the placed event, put the selection beside their open panels. The comparison is with the size the
       last placement was made for, so a settling layout cannot move a view already made for it. A view is
       made again only once every module has arranged its chrome for the new size: a second observer, made
       after the modules mount (a window listener where there is no observer), looks after theirs, and measures
       the room that chrome reserves for any view off the Fit, the reader's included. */
    remember();
    var resized = false;
    function onResize() {
      var w = W(), h = H();
      if (w === sw && h === sh) return;
      closeChooser();
      var ow = sw, oh = sh;
      sw = w; sh = h;
      if (atFit) { fit('resize'); return; }
      if (manual || !made) { if (COARSE.matches && w === ow && h !== oh) view.y += (h - oh) / 2; apply(); }
      resized = true;
    }
    function settled() {
      if (!resized || destroyed) return;
      resized = false;
      if (atFit) return;
      room = choose(visibleBounds());
      if (!manual && made) reframe('resize'); else apply();
    }
    function reframe(cause) {
      var basis = made.basis, id = locked || made.id;
      if (basis === 'fit') fit(cause);
      else if (basis === 'frame' && made.id && byId.has(made.id) && visible(made.id)) {
        var g = made.id;
        fitTo(R.layout.boundsOf(subtree(g), 60), false, 'frame');
        made.id = g;
      }
      else if (id && byId.has(id) && visible(id)) {
        var vr = visibleArea(), p = project(byId.get(id)), m = 24;
        if (p.x >= vr.x0 + m && p.x <= vr.x1 - m && p.y >= vr.y0 + m && p.y <= vr.y1 - m) { made = { basis: 'node', id: id }; apply(); }
        else centerOn(id, view.k);
      } else apply();
      emit('placed', { cause: cause, basis: basis, id: id || null });
    }
    var ro = null, late = null;
    if (root.ResizeObserver) { ro = new root.ResizeObserver(function () { onResize(); }); ro.observe(stage); }
    else on(root, 'resize', onResize);
    if (document.readyState !== 'complete') on(root, 'load', function () { if (atFit) fit('load'); });
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(function () { if (!destroyed && atFit) fit('font'); }).catch(function () {});
    if (document.fonts && document.fonts.addEventListener)
      on(document.fonts, 'loadingdone', function () {
        fontGen++; widthCache.clear(); fontCache.clear(); inkCache.clear();
        if (atFit) fit('font'); else apply();
      });

    /* ------------------------------------------------------------- arrival -- */
    var arrivalState = null;
    function arrive(cause) {
      var m = /^#node=(.+)$/.exec(root.location ? root.location.hash : '');
      if (!m) return;
      var want;
      try { want = decodeURIComponent(m[1]); } catch (err) { want = null; }
      var ok = want !== null && byId.has(want) && visible(want);
      arrivalState = { id: want, resolved: ok };
      if (ok) { select(want, 'arrival', cause); focusId = want; centerOn(want); }
      emit('arrival', { id: want, resolved: ok, cause: cause });
    }
    if (claimsArrival) on(root, 'hashchange', function () { arrive('reader'); });

    /* ------------------------------------------------------------- modules -- */
    var services = new Map();
    var api = { model: model, layout: L, host: host, canvas: canvas, signal: signal, on: onEvent, emit: emit,
                registerOverlay: registerOverlay, controls: controls, slot: function (name) { return host.querySelector('[data-radial-slot="' + name + '"]'); },
                /* for a module that changes the reserved chrome: read the view, refit (it decides
                   whether, by atFit), join the Escape stack, and place a node on the stage */
                view: function () { return { k: view.k, x: view.x, y: view.y, atFit: atFit, fitCause: fitCause, manual: manual }; },
                fit: function (cause) { if (!destroyed) fit(cause || 'module'); },
                escape: function (x) { pushEscape(x); return function () { escapes = escapes.filter(function (e) { return e !== x; }); }; },
                project: function (nid) { var n = byId.get(nid); return n ? project(n) : null; },
                /* for the inspector, the facets and export: selection and framing on the reader's
                   behalf, the live region, the adapter's text, the membership, the measurer and the
                   label configuration a second target solves with, and the drawn world to copy */
                id: id, text: text, announce: function (msg) { if (!destroyed) announce(msg); },
                node: function (nid) { return byId.get(nid) || null; },
                visible: function (nid) { return visible(nid); },
                selection: function () { return { locked: locked, preview: previewId, focus: focusId }; },
                select: function (nid, via, cause) { if (destroyed) return false; closeChooser(); return select(nid, via || 'api', cause); },
                centerOn: function (nid, k) { return !destroyed && centerOn(nid, k); },
                reveal: function (nid, cover) { return !destroyed && revealBeside(nid, cover || null); },
                frame: function (nid, cause) { return !destroyed && frameNode(nid, cause || 'module'); },
                membership: { set: function (leaves, relations, cause) { return setMembership(leaves, relations, cause); },
                              reset: function (cause) { return setMembership(null, null, cause); },
                              state: function () { return membershipState(); },
                              relationVisible: function (e) { return relVisible(e); } },
                measurer: function () { return M; },
                labelsConfig: function () { return LC; },
                world: function () { return { svg: svg, world: gRoot, markerId: arrowId }; },
                /* one module may offer another a service by a generic name ('inspector', 'facets') */
                provide: function (name, obj) { services.set(name, obj); },
                service: function (name) { return services.get(name) || null; },
                /* an exclusive overlay closes the others when it opens */
                claim: function (name) {
                  overlays.slice().forEach(function (o) { if (o.exclusive && o.name !== name && o.isOpen()) o.dismiss('claim'); });
                },
                /* whether another exclusive overlay is open: a panel that would stay open without a
                   reader opening it yields to it instead of claiming */
                othersOpen: function (name) {
                  return overlays.some(function (o) { return o.exclusive && o.name !== name && o.isOpen(); });
                } };
    var mounted = [];
    try {
      listed.forEach(function (m) { mounted.push({ name: m, inst: R.modules[m].mount(api, adapter[m]) }); });
      if (ro) { late = new root.ResizeObserver(function () { settled(); }); late.observe(stage); }
      else on(root, 'resize', settled);
      /* while the room is in use, a panel that changes (opening, folding, yielding) is measured again, once the
         modules have heard of it */
      onEvent('obstacle', function () { if (room && !atFit && !destroyed) { room = choose(visibleBounds()); apply(); } });
      /* the relation layer's first state, before any reader action: with nothing selected, every
         drawn-always relation is on and every drawn-on-selection relation is off */
      paint(locked);
      fit('load');
      selectedReadout();
      if (claimsArrival) arrive('load');
    } catch (err) {                                            /* a failure here leaves the host as it was */
      destroy(true);
      throw err;
    }

    function destroy(silent) {
      if (destroyed) return;
      if (!silent) emit('destroy', { cause: 'module' });
      destroyed = true;
      mounted.slice().reverse().forEach(function (m) { if (m.inst && m.inst.destroy) m.inst.destroy(); });
      closeChooser();
      ac.abort();
      if (ro) ro.disconnect();
      if (late) late.disconnect();
      if (frame && root.cancelAnimationFrame) root.cancelAnimationFrame(frame);
      if (hoverFrame && root.cancelAnimationFrame) root.cancelAnimationFrame(hoverFrame);
      created.slice().reverse().forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); });
      stage.classList.remove('panning', 'is-over-mark');
      restore.slice().reverse().forEach(function (f) { f(); });
      if (arrivalOwner === id) arrivalOwner = null;
      if (themeOwner === id) themeOwner = null;
      delete host.__radial;
      bus = new Map();
    }

    return {
      id: id, model: model, layout: L,
      on: onEvent, off: offEvent,
      select: function (nid) { return !destroyed && select(nid === undefined ? null : nid, 'api'); },
      focus: function (nid) { return !destroyed && focusNode(nid, 'module'); },
      frame: function (nid) { return !destroyed && frameNode(nid, 'module'); },
      fit: function (cause) { if (destroyed) return; if (cause === 'explicit') explicitFit(); else fit(cause || 'module'); },
      zoom: function (f, cx, cy) { if (!destroyed) zoomAt(f, cx, cy); },
      project: function (nid) { var n = byId.get(nid); return n ? project(n) : null; },
      hits: function (sx, sy, tolPx) { return hits(sx, sy, tolPx === undefined ? tolerance() : tolPx); },
      tap: function (sx, sy, tolPx) { return tapAt(sx, sy, tolPx); },
      view: function () { return { k: view.k, x: view.x, y: view.y, atFit: atFit, fitCause: fitCause, manual: manual }; },
      state: function () {
        var s = { view: { k: view.k, x: view.x, y: view.y, atFit: atFit, fitCause: fitCause, manual: manual },
                  selection: { locked: locked, preview: previewId, focus: focusId },
                  lod: { tier: tier().name, deferred: R.labels.deferred(solution) },
                  overlays: overlays.filter(function (o) { return o.isOpen(); }).map(function (o) { return o.name; }),
                  membership: membershipState() };
        /* a module that keeps state reports it under its own name: chrome { arrangement, open, offered, setAside } */
        mounted.forEach(function (m) { if (m.inst && typeof m.inst.state === 'function') s[m.name] = m.inst.state(); });
        return s;
      },
      report: function () {
        /* fit is the last Fit as it was made; covered is what covers the drawing or its names now */
        return { fit: lastFit, covered: overlays.filter(function (o) { return o.isOpen() && covers(o.element); }).map(function (o) { return o.name; }),
                 unresolved: model.unresolved, unsupported: model.unsupported, hiddenRefs: model.hiddenRefs,
                 hidden: Array.from(model.hidden), undrawnRelations: undrawn, ignoredAdapterSections: ignored,
                 arrival: arrivalState, modules: listed.slice() };
      },
      labels: function () { return solution.map(function (e) { return { id: e.id, show: e.show, held: e.held, name: e.name, count: e.count }; }); },
      /* membership without a facet module: leaves and relations as Sets (or null for all) */
      setMembership: function (leaves, relations) { return destroyed ? null : setMembership(leaves || null, relations || null, 'module'); },
      /* what a module offers the page by a generic name: the inspector, the facets, the export */
      service: function (name) { return destroyed ? null : services.get(name) || null; },
      destroy: function () { destroy(false); }
    };
  }

  R.mount = mount;
  R.MountError = MountError;
  R.VERSION = 1;
})(typeof window !== 'undefined' ? window : globalThis);
