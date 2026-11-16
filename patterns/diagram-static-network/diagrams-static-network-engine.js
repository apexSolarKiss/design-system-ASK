/* diagrams-static-network-engine.js — the engine of the static layered-network pattern.

   design-system-ASK Class A static scaffold `diagram-static-network`. DS-owned: re-vendor byte-identical.
   A browser global (window.DIAGRAM_NETWORK) or a Node module. It reads nothing global: the caller passes
   the glyph carrier (diagrams-static-network-glyphs.js) on every call.

     validate(spec, glyphs)        { ok, errors }, never throws
     render(spec, options)         one standalone <svg> string; throws NetworkError
     mount(host, spec, options)    renders into a host element with an id prefix no element there carries
     idPrefixFor(id)               the default id prefix for a spec id
     layout(spec, glyphs)          the placement render draws: nodes, edges, weight labels and their
                                   clearance, every annotation's box, panel extents and the plate's size
                                   (for tests and tools)
     describe(spec, mode?)         the plate's description; annotated (the default) carries the notes

   The spec owns the content: the layers, the connections, the marks, the weights, each panel's direction,
   signals and equations, the notes and the credit. The engine owns placement, connectors, notation layout
   and presentation. It reads no meaning into a connection. See README.md for the contract. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DIAGRAM_NETWORK = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------ geometry (plate units) -- */
  const G = Object.freeze({
    node: 16, nodeStroke: 2.4, edge: 1.3, gap: 6,                       // a node ring; a connector stops gap outside it
    head: Object.freeze({ length: 13, width: 4.2, notch: 0.22 }),       // a filled, slightly notched head
    pitchX: 92, pitchY: 182,                                            // between nodes in a layer, between layers
    signal: 0.42,                                                       // an entering or leaving signal, in pitchY
    margin: 40, panelGap: 120, labelGap: 34, eqGap: 74,                 // plate margin and column gaps
    top: 52, titleSize: 24, titleBand: 64,                              // the panel titles' band
    eqSize: 25, weightSize: 18, markSize: 20, labelSize: 19,            // notation, weight labels, marks, layer labels
    noteSize: 15, creditSize: 15, lineGap: 10, bottom: 28,              // the notes and the credit under the panels
    dot: 3.4, minClear: 3,                                              // a weight's dot; a label's least clearance
  });
  const ID_RE = /^[A-Za-z0-9._-]+$/;
  const NODE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;
  const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
  const SPEC_KEYS = ['id', 'title', 'role', 'layers', 'edges', 'marks', 'weights', 'panels', 'notes', 'credit'];
  const LAYER_KEYS = ['id', 'n', 'label'];
  const WEIGHT_KEYS = ['from', 'to', 'label'];
  const PANEL_KEYS = ['title', 'direction', 'signals', 'layerLabels', 'equations'];
  const EQ_KEYS = ['layer', 'lines'];
  const OPTION_KEYS = ['glyphs', 'theme', 'mode', 'idPrefix', 'fontFaceCSS', 'metadata'];
  // theme values by form: a color is a hex color, an rgb/hsl function or a color keyword; a family list is
  // single-quoted names or bare identifiers, comma-separated. Anything else could void the plate's style.
  const COLOR_RE = /^(#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})|(rgba?|hsla?)\([0-9.,%\s\/+-]+\)|[A-Za-z]+)$/;
  const FAMILY = "('[^'\\;{}<>&()/*]+'|-?[A-Za-z][A-Za-z0-9 -]*)";
  const FAMILY_RE = new RegExp('^\\s*' + FAMILY + '(\\s*,\\s*' + FAMILY + ')*\\s*$');
  const singleQuote = (v) => typeof v === 'string' ? v.replace(/"([^"']*)"/g, "'$1'") : v;
  const THEME_KEYS = ['name', 'fieldFrom', 'fieldTo', 'ink', 'fontFamily', 'monoFamily'];
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const has = (list, v) => list.indexOf(v) >= 0;

  class NetworkError extends Error {
    constructor(errors) {
      super(errors.map((e) => e.code + ' at ' + e.path + ': ' + e.message).join('; '));
      this.name = 'NetworkError';
      this.code = errors[0] ? errors[0].code : 'UNKNOWN';
      this.errors = errors;
    }
  }

  /* ------------------------------------------------------------ the glyph carrier -- */
  function glyphsErrors(glyphs) {
    if (!glyphs || typeof glyphs !== 'object') return [{ code: 'GLYPHS_MISSING', path: 'options.glyphs', message: 'the glyph carrier is required' }];
    const bad = (m) => [{ code: 'GLYPHS_MALFORMED', path: 'options.glyphs', message: m }];
    const f = glyphs.faces, sup = glyphs.supported;
    if (!f || !sup || typeof sup.text !== 'string' || typeof sup.member !== 'string') return bad('faces and supported characters are required');
    for (const face of ['roman', 'italic', 'mono', 'sigma']) {
      const x = f[face];
      if (!x || !x.em || !x.ink || !(x.ascent > 0) || !(x.descent >= 0)) return bad('face ' + face + ' lacks advances, ink bounds, ascent or descent');
      for (const k of Object.keys(x.ink)) { const b = x.ink[k]; if (!Array.isArray(b) || b.length !== 4 || !b.every(Number.isFinite) || b[0] > b[2] || b[1] > b[3]) return bad('face ' + face + ' has unusable ink bounds for ' + JSON.stringify(k)); }
      for (const k of Object.keys(x.em)) if (!(Number.isFinite(x.em[k]) && x.em[k] >= 0)) return bad('face ' + face + ' has an unusable advance for ' + JSON.stringify(k));
    }
    for (const ch of sup.text) if (!(ch in f.roman.em) || !(ch in f.italic.em)) return bad('a supported character has no advance: ' + JSON.stringify(ch));
    if (!(sup.member in f.mono.em)) return bad('the set-membership sign has no advance');
    if (!('Σ' in f.sigma.em) || !('Σ' in f.sigma.ink)) return bad('the summation sign has no advance or ink bounds');
    return [];
  }
  function width(glyphs, face, s, size) {
    let w = 0;
    for (const ch of s) w += glyphs.faces[face].em[ch] * size;
    return w;
  }

  /* ------------------------------------------------------------ notation -- */
  /* A line is an array of items: {r: text} roman, {i: text} italic, {m: '∈'} the set-membership sign,
     {sub: [items]} a subscript, {frac: [[items], [items]]} a fraction, {sum: [items]} a summation sign with
     its limit set below. Text is supported characters only; nothing falls back to another font. */
  function notationErrors(items, glyphs, path, depth) {
    const errs = [];
    if (!Array.isArray(items)) return [{ code: 'NOTATION_ITEM', path, message: 'a notation line is an array of items' }];
    if (!items.length) return [{ code: 'NOTATION_ITEM', path, message: 'a notation run has at least one item' }];
    if (depth > 3) return [{ code: 'NOTATION_ITEM', path, message: 'notation nests more than three levels' }];
    for (let k = 0; k < items.length; k++) {           // by index, so a hole is an item that is not an object
      const it = items[k], p = path + '[' + k + ']';
      if (!it || typeof it !== 'object' || Array.isArray(it)) { errs.push({ code: 'NOTATION_ITEM', path: p, message: 'an item is an object' }); continue; }
      const keys = Object.keys(it);
      if (keys.length !== 1 || !has(['r', 'i', 'm', 'sub', 'frac', 'sum'], keys[0])) { errs.push({ code: 'NOTATION_ITEM', path: p, message: 'an item has exactly one of r, i, m, sub, frac or sum' }); continue; }
      const key = keys[0], v = it[key];
      if (key === 'r' || key === 'i') {
        if (typeof v !== 'string' || !v.length) errs.push({ code: 'NOTATION_ITEM', path: p, message: 'text is a non-empty string' });
        else if (glyphs) for (const ch of v) if (glyphs.supported.text.indexOf(ch) < 0) errs.push({ code: 'NOTATION_UNSUPPORTED', path: p, message: 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + ' is not a supported character' });
      } else if (key === 'm') {
        if (glyphs && v !== glyphs.supported.member) errs.push({ code: 'NOTATION_UNSUPPORTED', path: p, message: 'the sign run carries the set-membership sign only' });
      } else if (key === 'frac') {
        if (!Array.isArray(v) || v.length !== 2) errs.push({ code: 'NOTATION_ITEM', path: p, message: 'a fraction is [numerator, denominator]' });
        else { errs.push(...notationErrors(v[0], glyphs, p + '.frac[0]', depth + 1)); errs.push(...notationErrors(v[1], glyphs, p + '.frac[1]', depth + 1)); }
      } else errs.push(...notationErrors(v, glyphs, p + '.' + key, depth + 1));
    }
    return errs;
  }
  function measure(glyphs, items, size) {
    let w = 0;
    for (const it of items) {
      if (it.r !== undefined) w += width(glyphs, 'roman', it.r, size);
      else if (it.i !== undefined) w += width(glyphs, 'italic', it.i, size);
      else if (it.m !== undefined) w += width(glyphs, 'mono', it.m, size);
      else if (it.sub) w += measure(glyphs, it.sub, size * 0.66) + size * 0.02;
      else if (it.frac) w += Math.max(measure(glyphs, it.frac[0], size * 0.8), measure(glyphs, it.frac[1], size * 0.8)) + size * 0.3;
      else if (it.sum) w += Math.max(width(glyphs, 'sigma', 'Σ', size * 1.3), measure(glyphs, it.sum, size * 0.58)) + size * 0.25;
    }
    return w;
  }
  /* The ink's vertical extent above and below a line's baseline, from each character's measured ink
     bounds [xMin, yMin, xMax, yMax] (rounded outward by the generator, so it never understates the ink). */
  function inkOf(glyphs, face, s) {
    let up = 0, down = 0;
    for (const ch of s) { const b = glyphs.faces[face].ink[ch]; if (b) { up = Math.max(up, b[3]); down = Math.max(down, -b[1]); } }
    return { up, down };
  }
  /* PLACEMENT. One function decides where every piece of a notation run goes, set at (x, baseline y) and
     size, and hands each piece to emit: a text run { face, text, x, y, size } or a fraction's rule
     { rule, x0, x1, y }. set() draws what it places; extent() and hspan() measure what it places; so what is
     measured is what is drawn. A fraction stacks by extent, as TeX does: its numerator's lowest ink sits a
     gap above the bar and its denominator's highest ink a gap below it, whatever either holds, nested
     fractions and subscripts included. A summation sign's limits sit below its ink by a gap at least. */
  const FRAC_GAP = 0.18, SUM_GAP = 0.14, RULE = 1.2;
  function place(glyphs, items, x, y, size, emit) {
    for (const it of items) {
      if (it.r !== undefined || it.i !== undefined || it.m !== undefined) {
        const face = it.r !== undefined ? 'roman' : it.i !== undefined ? 'italic' : 'mono', s = it.r ?? it.i ?? it.m;
        emit({ face, text: s, x, y, size });
        x += width(glyphs, face, s, size);
      } else if (it.sub) {
        place(glyphs, it.sub, x + size * 0.02, y + size * 0.26, size * 0.66, emit);
        x += measure(glyphs, it.sub, size * 0.66) + size * 0.02;
      } else if (it.frac) {
        const z = size * 0.8, wn = measure(glyphs, it.frac[0], z), wd = measure(glyphs, it.frac[1], z), w = Math.max(wn, wd) + size * 0.3;
        const axis = y - size * 0.3, gap = size * FRAC_GAP, en = extent(glyphs, it.frac[0], z), ed = extent(glyphs, it.frac[1], z);
        place(glyphs, it.frac[0], x + (w - wn) / 2, axis - gap - en.down, z, emit);
        place(glyphs, it.frac[1], x + (w - wd) / 2, axis + gap + ed.up, z, emit);
        emit({ rule: true, x0: x + size * 0.08, x1: x + w - size * 0.08, y: axis });
        x += w;
      } else if (it.sum) {
        const S = size * 1.3, z = size * 0.58, ws = width(glyphs, 'sigma', 'Σ', S), wb = measure(glyphs, it.sum, z), w = Math.max(ws, wb) + size * 0.25;
        const sy = y + size * 0.12, sigma = inkOf(glyphs, 'sigma', 'Σ'), lim = extent(glyphs, it.sum, z);
        emit({ face: 'sigma', text: 'Σ', x: x + (w - ws) / 2, y: sy, size: S });
        place(glyphs, it.sum, x + (w - wb) / 2, Math.max(y + size * 0.86, sy + sigma.down * S + size * SUM_GAP + lim.up), z, emit);
        x += w;
      }
    }
    return x;
  }
  /* The ink's extent above and below a run's baseline, from what place() puts down. */
  function extent(glyphs, items, size) {
    let up = 0, down = 0;
    place(glyphs, items, 0, 0, size, (p) => {
      if (p.rule) { up = Math.max(up, -p.y + RULE / 2); down = Math.max(down, p.y + RULE / 2); return; }
      const k = inkOf(glyphs, p.face, p.text);
      up = Math.max(up, k.up * p.size - p.y); down = Math.max(down, k.down * p.size + p.y);
    });
    return { up, down };
  }
  /* The ink's horizontal span [left, right] of a run set at x, from what place() puts down: each character's
     ink, an italic overhang past the advance included, and every rule. */
  function hspan(glyphs, items, x, size) {
    let l = Infinity, r = -Infinity;
    place(glyphs, items, x, 0, size, (p) => {
      if (p.rule) { l = Math.min(l, p.x0); r = Math.max(r, p.x1); return; }
      let px = p.x;
      for (const ch of p.text) { const b = glyphs.faces[p.face].ink[ch]; if (b) { l = Math.min(l, px + b[0] * p.size); r = Math.max(r, px + b[2] * p.size); } px += glyphs.faces[p.face].em[ch] * p.size; }
    });
    return l <= r ? [l, r] : null;
  }
  /* A notation run's ink box set at (x, baseline). */
  function textBox(glyphs, items, x, base, size) {
    const h = hspan(glyphs, items, x, size) || [x, x], e = extent(glyphs, items, size);
    return { x0: h[0], x1: h[1], y0: base - e.up, y1: base + e.down };
  }
  const fmt = (v) => (Math.round(v * 100) / 100).toString();
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function set(glyphs, items, x, y, size, out) {
    return place(glyphs, items, x, y, size, (p) => {
      if (p.rule) { out.push('<path class="rule" d="M' + fmt(p.x0) + ' ' + fmt(p.y) + 'H' + fmt(p.x1) + '"/>'); return; }
      const cls = p.face === 'roman' ? 't' : p.face === 'italic' ? 't ti' : p.face === 'mono' ? 't tm' : 't ts';
      out.push('<text class="' + cls + '" x="' + fmt(p.x) + '" y="' + fmt(p.y) + '" font-size="' + fmt(p.size) + '"' + (p.face === 'sigma' ? '' : ' xml:space="preserve"') + '>' + esc(p.text) + '</text>');
    });
  }

  /* ------------------------------------------------------------ validation -- */
  const nodeIds = (spec) => spec.layers.flatMap((L) => Array.from({ length: L.n }, (_, k) => L.id + '.' + k));
  const layerIndex = (spec, id) => spec.layers.findIndex((L) => id.startsWith(L.id + '.') && /^\d+$/.test(id.slice(L.id.length + 1)) && +id.slice(L.id.length + 1) < L.n);
  function textErrors(v, path, code, glyphs) {
    if (typeof v !== 'string' || !v.length) return [{ code, path, message: 'a non-empty string' }];
    if (CONTROL_RE.test(v)) return [{ code, path, message: 'carries a control character' }];
    if (glyphs) for (const ch of v) if (glyphs.supported.text.indexOf(ch) < 0) return [{ code: 'NOTATION_UNSUPPORTED', path, message: 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + ' is not a supported character' }];
    return [];
  }
  function validate(spec, glyphs) {
    const errors = [], ge = glyphsErrors(glyphs);
    const e = (code, path, message) => errors.push({ code, path, message });
    const stop = () => ({ ok: false, errors: errors.concat(ge) });     // an early stop still reports the carrier
    try {
      if (!spec || typeof spec !== 'object' || Array.isArray(spec)) { e('SPEC_NOT_OBJECT', 'spec', 'the spec is an object'); return stop(); }
      for (const k of Object.keys(spec)) if (!has(SPEC_KEYS, k)) e('SPEC_KEY', 'spec.' + k, 'not a spec field');
      if (typeof spec.id !== 'string' || !ID_RE.test(spec.id)) e('SPEC_ID', 'spec.id', 'letters, digits, ".", "_" and "-"');
      if (spec.title !== undefined) errors.push(...textErrors(spec.title, 'spec.title', 'SPEC_TITLE', null));
      if (spec.role !== undefined && typeof spec.role !== 'string') e('SPEC_ROLE', 'spec.role', 'free text');
      const g = ge.length ? null : glyphs;
      // layers
      if (!Array.isArray(spec.layers)) { e('LAYERS_NOT_ARRAY', 'spec.layers', 'the layers are an array, first layer first'); return stop(); }
      if (spec.layers.length < 2 || spec.layers.length > 8) e('LAYER_COUNT', 'spec.layers', 'two to eight layers');
      const seenLayer = new Set();
      for (let i = 0; i < spec.layers.length; i++) {
        const L = spec.layers[i], p = 'spec.layers[' + i + ']';
        if (!L || typeof L !== 'object' || Array.isArray(L)) { e('LAYER_NOT_OBJECT', p, 'a layer is an object'); continue; }
        for (const k of Object.keys(L)) if (!has(LAYER_KEYS, k)) e('LAYER_KEY', p + '.' + k, 'not a layer field');
        if (typeof L.id !== 'string' || !NODE_ID_RE.test(L.id)) e('LAYER_ID', p + '.id', 'starts with a letter; letters, digits, "_" or "-"');
        else if (seenLayer.has(L.id)) e('LAYER_ID_DUPLICATE', p + '.id', 'layer ids are distinct');
        else seenLayer.add(L.id);
        if (!Number.isInteger(L.n) || L.n < 1 || L.n > 12) e('LAYER_SIZE', p + '.n', 'one to twelve nodes');
        if (L.label !== undefined) errors.push(...textErrors(L.label, p + '.label', 'LAYER_LABEL', g));
      }
      if (errors.length) return stop();
      const ids = new Set(nodeIds(spec));
      // edges
      const edgeKeys = new Set();
      if (!Array.isArray(spec.edges)) e('EDGES_NOT_ARRAY', 'spec.edges', 'the connections are an array of [from, to] pairs');
      else for (let i = 0; i < spec.edges.length; i++) {
        const E = spec.edges[i], p = 'spec.edges[' + i + ']';
        if (!Array.isArray(E) || E.length !== 2 || typeof E[0] !== 'string' || typeof E[1] !== 'string') { e('EDGE_NOT_PAIR', p, 'a connection is [from, to]'); continue; }
        if (!ids.has(E[0]) || !ids.has(E[1])) { e('EDGE_ENDPOINT', p, 'names no node: ' + E.join(' -> ')); continue; }
        if (layerIndex(spec, E[1]) - layerIndex(spec, E[0]) !== 1) { e('EDGE_NOT_ADJACENT', p, 'joins a layer to the next one, in order'); continue; }
        const key = E[0] + '>' + E[1];
        if (edgeKeys.has(key)) e('EDGE_DUPLICATE', p, 'declared twice'); else edgeKeys.add(key);
      }
      // marks
      if (spec.marks !== undefined) {
        if (!spec.marks || typeof spec.marks !== 'object' || Array.isArray(spec.marks)) e('MARKS_NOT_OBJECT', 'spec.marks', 'node id -> one character');
        else for (const k of Object.keys(spec.marks)) {
          if (!ids.has(k)) e('MARK_NODE', 'spec.marks.' + k, 'names no node');
          const v = spec.marks[k];
          if (typeof v !== 'string' || [...v].length !== 1) e('MARK_TEXT', 'spec.marks.' + k, 'one character');
          else if (g && g.supported.text.indexOf(v) < 0) e('NOTATION_UNSUPPORTED', 'spec.marks.' + k, 'not a supported character');
        }
      }
      // weights
      if (spec.weights !== undefined) {
        if (!Array.isArray(spec.weights)) e('WEIGHTS_NOT_ARRAY', 'spec.weights', 'an array of { from, to, label }');
        else for (let i = 0; i < spec.weights.length; i++) {
          const W = spec.weights[i], p = 'spec.weights[' + i + ']';
          if (!W || typeof W !== 'object' || Array.isArray(W)) { e('WEIGHT_NOT_OBJECT', p, 'a weight is an object'); continue; }
          for (const k of Object.keys(W)) if (!has(WEIGHT_KEYS, k)) e('WEIGHT_KEY', p + '.' + k, 'not a weight field');
          if (!edgeKeys.has(W.from + '>' + W.to)) e('WEIGHT_EDGE', p, 'labels a declared connection only');
          errors.push(...notationErrors(W.label, g, p + '.label', 0));
        }
      }
      // panels
      if (!Array.isArray(spec.panels) || spec.panels.length < 1 || spec.panels.length > 2) e('PANEL_COUNT', 'spec.panels', 'one or two panels');
      else for (let i = 0; i < spec.panels.length; i++) {
        const P = spec.panels[i], p = 'spec.panels[' + i + ']';
        if (!P || typeof P !== 'object' || Array.isArray(P)) { e('PANEL_NOT_OBJECT', p, 'a panel is an object'); continue; }
        for (const k of Object.keys(P)) if (!has(PANEL_KEYS, k)) e('PANEL_KEY', p + '.' + k, 'not a panel field');
        if (!has(['up', 'down'], P.direction)) e('PANEL_DIRECTION', p + '.direction', '"up" (forward, first layer to last) or "down"');
        if (P.signals !== undefined && !has(['leaving', 'entering', 'none'], P.signals)) e('PANEL_SIGNALS', p + '.signals', '"leaving", "entering" or "none"');
        if (P.layerLabels !== undefined && typeof P.layerLabels !== 'boolean') e('PANEL_KEY', p + '.layerLabels', 'true or false');
        if (P.title !== undefined) errors.push(...textErrors(P.title, p + '.title', 'PANEL_TITLE', g));
        if (P.equations !== undefined) {
          if (!Array.isArray(P.equations)) e('EQUATIONS_NOT_ARRAY', p + '.equations', 'an array of { layer, lines }');
          else for (let j = 0; j < P.equations.length; j++) {
            const Q = P.equations[j], q = p + '.equations[' + j + ']';
            if (!Q || typeof Q !== 'object' || Array.isArray(Q)) { e('EQUATION_NOT_OBJECT', q, 'an equation block is an object'); continue; }
            if (P.equations.findIndex((R) => R && R.layer === Q.layer) !== j) e('EQUATION_LAYER_DUPLICATE', q + '.layer', 'one equation block per layer in a panel');
            for (const k of Object.keys(Q)) if (!has(EQ_KEYS, k)) e('EQUATION_KEY', q + '.' + k, 'not an equation field');
            if (!seenLayer.has(Q.layer)) e('EQUATION_LAYER', q + '.layer', 'names no layer');
            if (!Array.isArray(Q.lines) || Q.lines.length < 1 || Q.lines.length > 2) e('EQUATION_LINES', q + '.lines', 'one or two lines');
            else for (let k = 0; k < Q.lines.length; k++) errors.push(...notationErrors(Q.lines[k], g, q + '.lines[' + k + ']', 0));
          }
        }
      }
      if (spec.notes !== undefined) {
        if (!Array.isArray(spec.notes)) e('NOTES_NOT_ARRAY', 'spec.notes', 'an array of strings');
        else for (let i = 0; i < spec.notes.length; i++) errors.push(...textErrors(spec.notes[i], 'spec.notes[' + i + ']', 'NOTE_TEXT', g));
      }
      if (spec.credit !== undefined) errors.push(...textErrors(spec.credit, 'spec.credit', 'CREDIT_TEXT', g));
    } catch (x) {
      return { ok: false, errors: [{ code: 'SPEC_UNREADABLE', path: 'spec', message: String(x && x.message || x) }] };
    }
    if (ge.length) errors.push(...ge);
    else if (!errors.length) {
      try {
        const L = layoutOf(spec, glyphs);
        for (const w of L.weights) if (w.clear < G.minClear) errors.push({ code: 'WEIGHT_CLEARANCE', path: 'spec.weights[' + w.index + ']', message: 'no placement inside its panel keeps the label and its dot ' + G.minClear + ' units clear of every drawn stroke, head, node, dot and annotation (best ' + w.clear.toFixed(2) + ')' });
        errors.push(...layoutErrors(L));
      } catch (x) {
        return { ok: false, errors: [{ code: 'SPEC_UNREADABLE', path: 'spec', message: String(x && x.message || x) }] };
      }
    }
    return { ok: errors.length === 0, errors };
  }

  /* ------------------------------------------------------------ layout -- */
  function headPolygon(P, Q, to) {
    const dx = Q.x - P.x, dy = Q.y - P.y, len = Math.hypot(dx, dy), u = { x: dx / len, y: dy / len }, n = { x: -u.y, y: u.x }, H = G.head;
    const tip = { x: Q.x - u.x * to, y: Q.y - u.y * to };
    return [tip,
      { x: tip.x - u.x * H.length + n.x * H.width, y: tip.y - u.y * H.length + n.y * H.width },
      { x: tip.x - u.x * H.length * (1 - H.notch), y: tip.y - u.y * H.length * (1 - H.notch) },
      { x: tip.x - u.x * H.length - n.x * H.width, y: tip.y - u.y * H.length - n.y * H.width }];
  }
  function connector(P, Q, from, to) {
    const dx = Q.x - P.x, dy = Q.y - P.y, len = Math.hypot(dx, dy), u = { x: dx / len, y: dy / len };
    const a = { x: P.x + u.x * from, y: P.y + u.y * from }, back = G.head.length * (1 - G.head.notch) - 0.3;
    const tip = { x: Q.x - u.x * to, y: Q.y - u.y * to }, end = { x: tip.x - u.x * back, y: tip.y - u.y * back };
    return { line: [a, end], head: headPolygon(P, Q, to) };
  }
  const C = G.node + G.nodeStroke / 2 + G.gap;

  /* Exact, closed-form distances: nothing between sample points goes unmeasured. */
  function segDist(p, A, B) {
    const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
    let t = L2 ? ((p.x - A.x) * dx + (p.y - A.y) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (A.x + t * dx), p.y - (A.y + t * dy));
  }
  function segSeg(a, b, c, d) {
    const cr = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
    return Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b));
  }
  function inPoly(p, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  }
  const corners = (b) => [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 }];
  const inBox = (p, b) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;
  function boxSeg(b, A, B) {
    if (inBox(A, b) || inBox(B, b)) return 0;
    const c = corners(b);
    let m = Infinity;
    for (let i = 0; i < 4; i++) m = Math.min(m, segSeg(c[i], c[(i + 1) % 4], A, B));
    return m;
  }
  function boxPoly(b, poly) {
    if (poly.some((p) => inBox(p, b)) || corners(b).some((p) => inPoly(p, poly))) return 0;
    let m = Infinity;
    for (let i = 0; i < poly.length; i++) m = Math.min(m, boxSeg(b, poly[i], poly[(i + 1) % poly.length]));
    return m;
  }
  const boxPt = (b, p) => Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.y0 - p.y, 0, p.y - b.y1));
  const boxBox = (a, b) => Math.hypot(Math.max(a.x0 - b.x1, 0, b.x0 - a.x1), Math.max(a.y0 - b.y1, 0, b.y0 - a.y1));
  /* The least distance from a box to painted ink: a connector less half its stroke, a head's polygon (zero
     when either holds a point of the other), a ring less its outer radius, a dot less its radius, and any
     other annotation's box. */
  function boxClearance(box, paint) {
    let best = Infinity;
    for (const s of paint.lines) best = Math.min(best, boxSeg(box, s[0], s[1]) - s[2] / 2);
    for (const h of paint.heads) best = Math.min(best, boxPoly(box, h));
    for (const c of paint.rings) best = Math.min(best, boxPt(box, c) - (G.node + G.nodeStroke / 2));
    for (const d of paint.dots || []) best = Math.min(best, boxPt(box, d) - G.dot);
    for (const r of paint.boxes || []) best = Math.min(best, boxBox(box, r));
    return Math.max(0, best);
  }

  function layoutOf(spec, glyphs) {
    const panels = spec.panels.map((P) => ({ P }));
    const N = spec.layers.length, maxN = Math.max(...spec.layers.map((L) => L.n));
    const annotatedTop = G.top + (spec.panels.some((P) => P.title) ? G.titleBand : 0);
    const signalRoom = spec.panels.some((P) => P.signals && P.signals !== 'none') ? G.pitchY * G.signal + 6 : 0;
    const lastY = annotatedTop + signalRoom + G.node + 8;          // the top layer's center
    const firstY = lastY + (N - 1) * G.pitchY;                       // the first layer's center
    const layerY = (li) => firstY - li * G.pitchY;
    const netW = (maxN - 1) * G.pitchX + 2 * (G.node + G.nodeStroke);
    const tb = (items, x, base, size) => textBox(glyphs, items, x, base, size);
    let x = G.margin;
    for (const pan of panels) {
      const P = pan.P;
      // a panel is as wide as its network, its layer labels, its equations and its title, whichever reach furthest
      pan.labelW = P.layerLabels ? Math.max(0, ...spec.layers.map((L) => L.label ? width(glyphs, 'roman', L.label, G.labelSize) : 0)) + G.labelGap : 0;
      pan.eqW = (P.equations || []).reduce((m, Q) => Math.max(m, ...Q.lines.map((l) => measure(glyphs, l, G.eqSize))), 0);
      const titleW = P.title ? width(glyphs, 'roman', P.title, G.titleSize) : 0;
      const left = Math.max(pan.labelW + netW / 2, titleW / 2), right = Math.max(netW / 2 + (pan.eqW ? G.eqGap + pan.eqW : 0), titleW / 2);
      pan.x0 = x;
      pan.cx = x + left;
      pan.eqX = pan.cx + netW / 2 + (pan.eqW ? G.eqGap : 0);
      pan.x1 = pan.cx + right;
      x = pan.x1 + G.panelGap;
      pan.pos = {};
      spec.layers.forEach((L, li) => { for (let k = 0; k < L.n; k++) pan.pos[L.id + '.' + k] = { x: pan.cx + (k - (L.n - 1) / 2) * G.pitchX, y: layerY(li) }; });
      // the painted ink
      pan.paint = { lines: [], heads: [], rings: Object.values(pan.pos), dots: [], boxes: [] };
      pan.connectors = spec.edges.map(([a, b]) => {
        const [P0, Q0] = P.direction === 'up' ? [pan.pos[a], pan.pos[b]] : [pan.pos[b], pan.pos[a]];
        const c = connector(P0, Q0, C, C);
        c.key = a + '>' + b; c.entry = [c.line[0], c.line[1], G.edge];
        pan.paint.lines.push(c.entry); pan.paint.heads.push(c.head); return c;
      });
      const top = spec.layers[N - 1];
      pan.signals = [];
      if (P.signals === 'leaving' || P.signals === 'entering') for (let k = 0; k < top.n; k++) {
        const Q = pan.pos[top.id + '.' + k], far = { x: Q.x, y: Q.y - G.pitchY * G.signal };
        const c = P.signals === 'leaving' ? connector(Q, far, C, 0) : connector(far, Q, 0, C);
        pan.signals.push(c); pan.paint.lines.push([c.line[0], c.line[1], G.edge]); pan.paint.heads.push(c.head);
      }
      // every annotation but the weights: the title, the layer labels and each equation line, each with its ink box
      pan.annotations = [];
      if (P.title) { const ax = pan.cx - titleW / 2, ay = G.top + G.titleSize; pan.title = { x: ax, y: ay }; pan.annotations.push({ kind: 'title', box: tb([{ r: P.title }], ax, ay, G.titleSize) }); }
      pan.layerLabels = [];
      if (P.layerLabels) spec.layers.forEach((Ly, li) => {
        if (!Ly.label) return;
        const ax = pan.cx - (maxN - 1) * G.pitchX / 2 - G.node - G.nodeStroke - G.labelGap + 10 - width(glyphs, 'roman', Ly.label, G.labelSize), ay = layerY(li) + G.labelSize * 0.32;
        pan.layerLabels.push({ text: Ly.label, x: ax, y: ay }); pan.annotations.push({ kind: 'layer label', box: tb([{ r: Ly.label }], ax, ay, G.labelSize) });
      });
      pan.equationLines = [];
      for (const Q of P.equations || []) {
        const y = layerY(spec.layers.findIndex((L) => L.id === Q.layer)), frac = Q.lines.some((l) => JSON.stringify(l).includes('"frac"'));
        const offs = frac ? [-22, 46] : [-12, 34];
        Q.lines.forEach((line, k) => { pan.equationLines.push({ line, x: pan.eqX, y: y + offs[k] }); pan.annotations.push({ kind: 'equation', box: tb(line, pan.eqX, y + offs[k], G.eqSize) }); });
      }
    }
    // weight labels: in each panel, a dot on the marked connector near its upper node, and the label where its
    // ink box keeps the most clearance from every painted stroke, head, ring and dot and every other annotation,
    // its own dot included, inside its panel's band. Weights are placed in spec order, each avoiding those before
    // it. Candidates are tried in a fixed order and a later one wins only by half a unit, so the result is
    // deterministic. The weight's clearance is the least its panels keep.
    // Tier one keeps the label near its connector's upper node, below and beside the dot; tier two, tried only
    // when tier one keeps less than the minimum, goes further along and also above the dot.
    const ALONG = [18, 24, 30, 38, 46, 54], DROP = [21, 14, 28, 10, 34], OFF = [7, 10, 14], SIDES = ['right', 'left'];
    const TIERS = [{ along: ALONG, drop: DROP }, { along: ALONG.concat([64, 76, 90, 106, 124, 144]), drop: DROP.concat([-8, -14, -21]) }];
    // the dot's own clearance: from every connector but its own (less half its stroke), from every head, its
    // own included, each less the dot's radius
    const dotClear = (pan, m, own) => {
      let d = Infinity;
      for (const s of pan.paint.lines) if (s !== own) d = Math.min(d, segDist(m, s[0], s[1]) - s[2] / 2 - G.dot);
      for (const h of pan.paint.heads) { let k = inPoly(m, h) ? 0 : Infinity; for (let i = 0; i < h.length; i++) k = Math.min(k, segDist(m, h[i], h[(i + 1) % h.length])); d = Math.min(d, k - G.dot); }
      return d;
    };
    const placed = panels.map(() => ({ dots: [], boxes: [] }));
    const weights = (spec.weights || []).map((W, index) => {
      const lw = measure(glyphs, W.label, G.weightSize);
      const per = panels.map((pan, pi) => {
        const P0 = pan.pos[W.from], Q0 = pan.pos[W.to], len = Math.hypot(Q0.x - P0.x, Q0.y - P0.y);
        const lo = pan.x0, hi = pi === panels.length - 1 ? Infinity : pan.x1 + G.panelGap / 2;
        const ownLine = pan.connectors.find((c) => c.key === W.from + '>' + W.to).entry;
        const obstacles = { lines: pan.paint.lines, heads: pan.paint.heads, rings: pan.paint.rings, dots: placed[pi].dots,
          boxes: pan.annotations.map((a) => a.box).concat(placed[pi].boxes) };
        let pick = null, first = null;
        for (const tier of TIERS) {
        if (pick && pick.clear >= G.minClear) break;
        for (const along of tier.along) for (const drop of tier.drop) for (const off of OFF) for (const side of SIDES) {
          if (C + along > len - C - 6) continue;                          // the dot stays on the drawn connector
          const t = 1 - (C + along) / len, m = { x: P0.x + (Q0.x - P0.x) * t, y: P0.y + (Q0.y - P0.y) * t };
          const x0 = side === 'right' ? m.x + off : m.x - off - lw, base = m.y + drop;
          const box = tb(W.label, x0, base, G.weightSize);
          const cand = { dot: m, x: x0, y: base, box, clear: 0 };
          if (!first) first = cand;
          if (box.x0 < lo || box.x1 > hi || box.y0 < 0) continue;      // inside its panel's band and the plate
          const own = Object.assign({}, obstacles, { dots: obstacles.dots.concat([m]) });
          let c = boxClearance(box, own);
          for (const b of placed[pi].boxes) c = Math.min(c, Math.max(0, boxPt(b, m) - G.dot));   // its dot clears earlier labels
          for (const d of placed[pi].dots) c = Math.min(c, Math.max(0, Math.hypot(d.x - m.x, d.y - m.y) - 2 * G.dot));
          c = Math.min(c, Math.max(0, dotClear(pan, m, ownLine)));
          cand.clear = c;
          if (!pick || c > pick.clear + 0.5) pick = cand;
        }
        }
        pick = pick || first;
        placed[pi].dots.push(pick.dot); placed[pi].boxes.push(pick.box);
        return pick;
      });
      return { index, clear: Math.min(...per.map((q) => q.clear)), per };
    });
    // bands under the panels: the notes, then the credit, below every box and the network
    const netBottom = firstY + G.node + G.nodeStroke;
    const boxesAbove = panels.flatMap((pan, pi) => pan.annotations.map((a) => a.box).concat(placed[pi].boxes));
    const bandTop = Math.max(netBottom, ...boxesAbove.map((b) => b.y1), ...placed.flatMap((p) => p.dots.map((d) => d.y + G.dot)));
    let y = bandTop + 34;
    const notesY = [], notes = [];
    for (let i = 0; i < (spec.notes || []).length; i++) { notesY.push(y); notes.push({ kind: 'note', box: tb([{ r: spec.notes[i] }], G.margin, y, G.noteSize) }); y += G.noteSize + G.lineGap; }
    const creditY = spec.credit ? y + 6 : null;
    const credit = spec.credit ? { kind: 'credit', box: tb([{ r: spec.credit }], G.margin, creditY, G.creditSize) } : null;
    // the plate holds every network, every annotation, every weight label, the notes and the credit
    const reach = Math.max(x - G.panelGap, ...boxesAbove.map((b) => b.x1), ...notes.map((n) => n.box.x1), credit ? credit.box.x1 : 0);
    const plateW = Math.ceil(reach + G.margin);
    const plateH = Math.ceil((creditY !== null ? credit.box.y1 : notes.length ? notes[notes.length - 1].box.y1 : bandTop) + G.bottom);
    return { panels, weights, placed, plateW, plateH, firstY, notesY, notes, creditY, credit, layerY };
  }
  /* After placement, every drawn text must lie inside the plate and keep the minimum clear of the graph and of
     every other text, within a panel and across panels: a collision or an overflow is refused, never drawn. */
  function layoutErrors(L) {
    const errs = [], items = [];
    L.panels.forEach((pan, pi) => {
      pan.annotations.forEach((a) => items.push({ kind: a.kind, pi, box: a.box }));
      L.placed[pi].boxes.forEach((b, wi) => items.push({ kind: 'weight label', pi, box: b, weight: wi }));
    });
    L.notes.forEach((n) => items.push({ kind: n.kind, pi: -1, box: n.box }));
    if (L.credit) items.push({ kind: 'credit', pi: -1, box: L.credit.box });
    const where = (it) => it.kind + (it.pi >= 0 ? ' in panel ' + it.pi : '');
    for (const it of items) {
      const b = it.box;
      if (b.x0 < 0 || b.y0 < 0 || b.x1 > L.plateW || b.y1 > L.plateH) errs.push({ code: 'LAYOUT_BOUNDS', path: 'spec', message: 'the ' + where(it) + ' would be drawn outside the plate' });
      if (it.kind !== 'weight label' && it.pi >= 0) {
        const pan = L.panels[it.pi], c = boxClearance(b, { lines: pan.paint.lines, heads: pan.paint.heads, rings: pan.paint.rings, dots: L.placed[it.pi].dots });
        if (c < G.minClear) errs.push({ code: 'ANNOTATION_COLLISION', path: 'spec.panels[' + it.pi + ']', message: 'the ' + where(it) + ' comes within ' + c.toFixed(2) + ' units of the graph' });
      }
    }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const c = boxBox(items[i].box, items[j].box);
      if (c < G.minClear) errs.push({ code: 'ANNOTATION_COLLISION', path: 'spec', message: 'the ' + where(items[i]) + ' and the ' + where(items[j]) + ' come within ' + c.toFixed(2) + ' units' });
    }
    return errs;
  }

  /* ------------------------------------------------------------ render -- */
  function idPrefixFor(id) {
    // distinct texts never share a prefix: letters, digits and '-' kept, every other character escaped
    return 'dn-' + String(id).replace(/[^A-Za-z0-9-]/g, (c) => '_' + c.codePointAt(0).toString(16) + '_');
  }
  function optionErrors(o) {
    const errs = [];
    if (!o || typeof o !== 'object' || Array.isArray(o)) return [{ code: 'OPTIONS_NOT_OBJECT', path: 'options', message: 'the options are an object' }];
    for (const k of Object.keys(o)) if (!has(OPTION_KEYS, k)) errs.push({ code: 'OPTION_KEY', path: 'options.' + k, message: 'not an option' });
    errs.push(...glyphsErrors(o.glyphs));
    if (o.mode !== undefined && !has(['annotated', 'art'], o.mode)) errs.push({ code: 'OPTION_MODE', path: 'options.mode', message: '"annotated" (default) or "art"' });
    if (o.theme !== undefined && o.theme !== 'inherit') {
      const t = o.theme;
      if (!t || typeof t !== 'object') errs.push({ code: 'OPTION_THEME', path: 'options.theme', message: '"inherit" or a resolved theme' });
      else {
        for (const k of Object.keys(t)) if (!has(THEME_KEYS, k)) errs.push({ code: 'OPTION_THEME', path: 'options.theme.' + k, message: 'not a theme field' });
        for (const k of THEME_KEYS) {
          const v = singleQuote(t[k]);
          const ok = typeof v === 'string' && !CONTROL_RE.test(v) && (k === 'name' ? /^[A-Za-z0-9_-]+$/.test(v)
            : k === 'fontFamily' || k === 'monoFamily' ? FAMILY_RE.test(v) : COLOR_RE.test(v.trim()));
          if (!ok) errs.push({ code: 'OPTION_THEME', path: 'options.theme.' + k, message: k === 'name' ? 'letters, digits, "_" or "-"' : k.endsWith('amily') ? 'a family list: quoted names or identifiers, comma-separated' : 'a hex color, an rgb() or hsl() value, or a color keyword' });
        }
      }
    }
    if (o.idPrefix !== undefined && (typeof o.idPrefix !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(o.idPrefix))) errs.push({ code: 'OPTION_ID_PREFIX', path: 'options.idPrefix', message: 'starts with a letter; letters, digits, "_" or "-"' });
    if (o.fontFaceCSS !== undefined && (typeof o.fontFaceCSS !== 'string' || /<\//.test(o.fontFaceCSS))) errs.push({ code: 'OPTION_FONT_FACE', path: 'options.fontFaceCSS', message: 'CSS text with no closing tag' });
    if (o.metadata !== undefined && (typeof o.metadata !== 'string' || CONTROL_RE.test(o.metadata))) errs.push({ code: 'OPTION_METADATA', path: 'options.metadata', message: 'text with no control character' });
    return errs;
  }
  /* A notation run as plain text: subscripts after an underscore, a fraction as (a)/(b), a sum in words. */
  function say(items) {
    return items.map((it) => it.r ?? it.i ?? it.m ?? (it.sub ? '_' + say(it.sub) : it.frac ? '(' + say(it.frac[0]) + ')/(' + say(it.frac[1]) + ')' : it.sum ? ' sum over ' + say(it.sum) + ' of ' : ''))
      .join('').replace(/\s+/g, ' ').trim();
  }
  function annotationText(spec) {
    const unit = (id) => { const li = layerIndex(spec, id), L = spec.layers[li]; return (L.label || 'layer ' + (li + 1)) + ' unit ' + (+id.slice(L.id.length + 1) + 1); };
    const out = [];
    if (spec.panels.some((P) => P.layerLabels) && spec.layers.some((L) => L.label)) out.push('Layers, first to last: ' + spec.layers.map((L) => L.label || L.id).join(', ') + '.');
    const marks = Object.entries(spec.marks || {});
    if (marks.length) out.push('Marked units: ' + marks.map(([id, m]) => m + ', ' + unit(id)).join('; ') + '.');
    if ((spec.weights || []).length) out.push('Weights: ' + spec.weights.map((W) => say(W.label) + ' on the connection from ' + unit(W.from) + ' to ' + unit(W.to)).join('; ') + '.');
    for (const P of spec.panels) if ((P.equations || []).length) out.push((P.title ? P.title + ' equations' : 'Equations') + ': ' + P.equations.map((Q) => Q.lines.map(say).join('; ')).join('; ') + '.');
    return out.join(' ');
  }
  function describe(spec, mode) {
    const sizes = spec.layers.map((L) => L.n).join('-');
    const dirs = spec.panels.map((P) => (P.title ? P.title + ': ' : '') + (P.direction === 'up' ? 'signals run from the first layer to the last' : 'signals run from the last layer back to the first'));
    return 'A layered network of ' + spec.layers.length + ' layers (' + sizes + ' nodes) and ' + spec.edges.length + ' connections between adjacent layers. ' + dirs.join('. ') + '.' + (mode !== 'art' ? (annotationText(spec) ? ' ' + annotationText(spec) : '') + (spec.notes && spec.notes.length ? ' ' + spec.notes.join(' ') : '') : '') + (spec.credit ? ' ' + spec.credit : '');
  }
  function render(spec, options) {
    const o = options || {};
    const oe = optionErrors(o);
    if (oe.length) throw new NetworkError(oe);
    const v = validate(spec, o.glyphs);
    if (!v.ok) throw new NetworkError(v.errors);
    const glyphs = o.glyphs, mode = o.mode || 'annotated', annotated = mode === 'annotated';
    const pre = o.idPrefix || idPrefixFor(spec.id);
    const L = layoutOf(spec, glyphs);
    const t = o.theme && o.theme !== 'inherit' ? o.theme : null;
    const ink = t ? t.ink : 'var(--fg-1)', from = t ? t.fieldFrom : 'var(--bg-from)', to = t ? t.fieldTo : 'var(--bg-to)';
    const sans = t ? singleQuote(t.fontFamily) : 'var(--font-sans)', mono = t ? singleQuote(t.monoFamily) : 'var(--font-mono)';
    const out = [];
    const ring = (p) => out.push('<circle class="ring" cx="' + fmt(p.x) + '" cy="' + fmt(p.y) + '" r="' + G.node + '"/>');
    const draw = (c) => { out.push('<path class="edge" d="M' + fmt(c.line[0].x) + ' ' + fmt(c.line[0].y) + 'L' + fmt(c.line[1].x) + ' ' + fmt(c.line[1].y) + '"/>'); out.push('<path class="head" d="M' + c.head.map((p) => fmt(p.x) + ' ' + fmt(p.y)).join('L') + 'Z"/>'); };
    L.panels.forEach((pan, pi) => {
      const P = pan.P;
      out.push('<g class="panel">');
      pan.connectors.forEach(draw);
      pan.signals.forEach(draw);
      Object.values(pan.pos).forEach(ring);
      if (annotated) {
        for (const [id, mark] of Object.entries(spec.marks || {})) {
          const p = pan.pos[id];
          out.push('<g class="ann mark">'); set(glyphs, [{ i: mark }], p.x - width(glyphs, 'italic', mark, G.markSize) / 2, p.y + G.markSize * 0.35, G.markSize, out); out.push('</g>');
        }
        L.weights.forEach((w) => {
          const at = w.per[pi], W = spec.weights[w.index];
          out.push('<circle class="dot" cx="' + fmt(at.dot.x) + '" cy="' + fmt(at.dot.y) + '" r="' + G.dot + '"/>');
          out.push('<g class="ann weight">'); set(glyphs, W.label, at.x, at.y, G.weightSize, out); out.push('</g>');
        });
        if (pan.title) out.push('<g class="ann title"><text class="t" x="' + fmt(pan.title.x) + '" y="' + fmt(pan.title.y) + '" font-size="' + G.titleSize + '">' + esc(P.title) + '</text></g>');
        for (const lab of pan.layerLabels) out.push('<g class="ann layer"><text class="t" x="' + fmt(lab.x) + '" y="' + fmt(lab.y) + '" font-size="' + G.labelSize + '">' + esc(lab.text) + '</text></g>');
        for (const q of pan.equationLines) { out.push('<g class="ann equation">'); set(glyphs, q.line, q.x, q.y, G.eqSize, out); out.push('</g>'); }
      }
      out.push('</g>');
    });
    if (annotated) (spec.notes || []).forEach((n, i) => out.push('<g class="ann band"><text class="t note" x="' + G.margin + '" y="' + fmt(L.notesY[i]) + '" font-size="' + G.noteSize + '">' + esc(n) + '</text></g>'));
    if (spec.credit) out.push('<g class="ann band"><text class="t credit" x="' + G.margin + '" y="' + fmt(L.creditY) + '" font-size="' + G.creditSize + '">' + esc(spec.credit) + '</text></g>');
    const title = spec.title || spec.id;
    // The text is laid out from unkerned advances, each run starting at its x on an alphabetic baseline at its y.
    // The plate states, rather than inherits, every property that would move a run, change the face that draws
    // it or extend its ink: anchoring, baseline, direction, writing mode and orientation, white space, the
    // face's style, weight, width, variants, size adjustment and optical sizing, kerning, ligatures, features,
    // variations, synthesis, spacing, case, rendering, stroke and shadow; heads, dots and the field's rectangle
    // take no stroke either.
    // A plate inlined or mounted under a host's inherited styles draws what was measured;
    // tests/network-host-inheritance.mjs measures it in a browser.
    const style = '#' + pre + ' .t{font-family:' + sans + ';font-style:normal;font-weight:400;font-stretch:normal;font-size-adjust:none;font-variant:normal;'
      + 'fill:' + ink + ';stroke:none;text-shadow:none;font-optical-sizing:none;font-kerning:none;'
      + 'font-variant-ligatures:none;font-feature-settings:normal;font-variation-settings:normal;font-synthesis:none;letter-spacing:0;word-spacing:0;text-transform:none;'
      + 'text-anchor:start;dominant-baseline:alphabetic;direction:ltr;writing-mode:horizontal-tb;text-orientation:mixed;white-space:pre;text-rendering:auto}'
      + '#' + pre + ' .ti{font-style:italic;font-feature-settings:"cv05"}'
      + '#' + pre + ' .tm{font-family:' + mono + '}'
      + '#' + pre + ' .ts{font-weight:300}'
      + '#' + pre + ' .ring{fill:none;stroke:' + ink + ';stroke-width:' + G.nodeStroke + '}'
      + '#' + pre + ' .edge{fill:none;stroke:' + ink + ';stroke-width:' + G.edge + '}'
      + '#' + pre + ' .head,#' + pre + ' .dot{fill:' + ink + ';stroke:none}'
      + '#' + pre + '>rect{stroke:none}'
      + '#' + pre + ' .rule{fill:none;stroke:' + ink + ';stroke-width:' + RULE + '}'
      + '#' + pre + '_from{stop-color:' + from + '}#' + pre + '_to{stop-color:' + to + '}';
    return '<svg xmlns="http://www.w3.org/2000/svg" id="' + pre + '" viewBox="0 0 ' + L.plateW + ' ' + L.plateH + '" width="' + L.plateW + '" height="' + L.plateH + '" role="img" aria-labelledby="' + pre + '_title" aria-describedby="' + pre + '_desc" data-mode="' + mode + '">'
      + '<title id="' + pre + '_title">' + esc(title) + '</title><desc id="' + pre + '_desc">' + esc(describe(spec, mode)) + '</desc>'
      + (o.metadata ? '<metadata>' + esc(o.metadata) + '</metadata>' : '')
      + '<defs><linearGradient id="' + pre + '_field" x1="0%" y1="100%" x2="100%" y2="0%"><stop id="' + pre + '_from" offset="0%"/><stop id="' + pre + '_to" offset="100%"/></linearGradient></defs>'
      + '<style>' + String(o.fontFaceCSS || '').replace(/&/g, '&amp;').replace(/</g, '&lt;') + style + '</style>'
      + '<rect width="' + L.plateW + '" height="' + L.plateH + '" fill="url(#' + pre + '_field)"/>'
      + out.join('') + '</svg>';
  }
  function mount(host, spec, options) {
    if (!host || typeof host.querySelector !== 'function') throw new NetworkError([{ code: 'MOUNT_HOST', path: 'host', message: 'an element' }]);
    const o = Object.assign({}, options || {});
    const doc = host.ownerDocument;
    let pre = o.idPrefix || idPrefixFor(spec && spec.id), n = 1;
    // an id the host's own previous plate carries is not taken: re-rendering into one host keeps its prefix
    const taken = (p) => ['', '_title', '_desc', '_field', '_from', '_to'].some((s) => { const el = doc.getElementById(p + s); return el && !host.contains(el); });
    // idPrefixFor writes '_' only before a hex code, so a suffix of '_n' and a number is never another id's prefix
    if (!o.idPrefix) while (taken(pre)) pre = idPrefixFor(spec.id) + '_n' + (++n);
    o.idPrefix = pre;
    host.innerHTML = render(spec, o);
    return host.firstElementChild;
  }

  return Object.freeze({ validate, render, mount, idPrefixFor, layout: (spec, glyphs) => layoutOf(spec, glyphs), describe, NetworkError, geometry: G });
});
