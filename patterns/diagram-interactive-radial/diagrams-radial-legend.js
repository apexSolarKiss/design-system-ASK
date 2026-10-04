/* diagrams-radial-legend.js — the legend module of the interactive radial pattern: a legend
   model built from the declared states, planes and kinds, and a live legend rendered into the
   host's [data-radial-slot="legend"].

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. Optional for an instance: list it as
   mount({ …, modules: ['legend'] }) and supply adapter.legend.headings.

   The owner draws the legend's grammar (a state swatch, a plane's line style, a kind's shape)
   and escapes every string; the adapter supplies every word: the three headings, and an
   optional bound line stating what the geometry does not encode. State labels and meanings,
   plane labels and kind labels come from the data's own declarations. Optionally the adapter
   adds a note under a plane or a kind (notes.planes, notes.kinds, by id), and may replace the
   per-kind rows with one line of text (shapes) where its kinds are better read as a sentence. */
(function (root) {
  'use strict';

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.modules = R.modules || {};
  var NS = 'http://www.w3.org/2000/svg';
  var KEYS = ['headings', 'bound', 'notes', 'shapes'];
  var HEADINGS = ['state', 'line', 'shape'];

  function LegendError(detail) {
    var e = new Error('radial mount HOOK_MISSING: ' + detail);
    e.name = 'MountError';
    e.code = 'HOOK_MISSING';
    return e;
  }
  function plain(v) { return R.contract.plain(v); }
  function check(cfg) {
    if (!plain(cfg)) throw LegendError('legend must be a plain object');
    Object.keys(cfg).forEach(function (k) { if (KEYS.indexOf(k) < 0) throw LegendError('legend: unknown key ' + k); });
    var h = cfg.headings;
    if (!plain(h)) throw LegendError('legend.headings');
    Object.keys(h).forEach(function (k) { if (HEADINGS.indexOf(k) < 0) throw LegendError('legend.headings: unknown key ' + k); });
    HEADINGS.forEach(function (k) { if (typeof h[k] !== 'string') throw LegendError('legend.headings.' + k); });
    if (cfg.bound !== undefined && typeof cfg.bound !== 'string') throw LegendError('legend.bound must be a string');
    if (cfg.shapes !== undefined && typeof cfg.shapes !== 'string') throw LegendError('legend.shapes must be a string');
    if (cfg.notes !== undefined) {
      if (!plain(cfg.notes)) throw LegendError('legend.notes must be a plain object');
      Object.keys(cfg.notes).forEach(function (k) {
        if (k !== 'planes' && k !== 'kinds') throw LegendError('legend.notes: unknown key ' + k);
        if (!plain(cfg.notes[k])) throw LegendError('legend.notes.' + k + ' must be a plain object');
        Object.keys(cfg.notes[k]).forEach(function (id) {
          if (typeof cfg.notes[k][id] !== 'string') throw LegendError('legend.notes.' + k + '.' + id + ' must be a string');
        });
      });
    }
  }
  function note(cfg, k, id) {
    var n = cfg.notes && cfg.notes[k];
    return n && Object.prototype.hasOwnProperty.call(n, id) ? n[id] : null;
  }

  /* the legend model: data only, shared by the live legend and any other renderer */
  function model(M, cfg) {
    var states = [], planes = [], kinds = [];
    M.states.forEach(function (s) { states.push({ role: s.role, label: s.label, meaning: s.meaning }); });
    M.planes.forEach(function (p) { planes.push({ id: p.id, label: p.label, drawn: p.drawn, directed: p.directed, note: note(cfg, 'planes', p.id) }); });
    M.kinds.forEach(function (k) { kinds.push({ id: k.id, label: k.label, shape: k.shape, note: note(cfg, 'kinds', k.id) }); });
    return { headings: { state: cfg.headings.state, line: cfg.headings.line, shape: cfg.headings.shape },
             states: states, planes: planes, kinds: kinds, shapes: cfg.shapes === undefined ? null : cfg.shapes,
             bound: cfg.bound === undefined ? null : cfg.bound };
  }

  function div(cls, txt) { var e = document.createElement('div'); e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function span(cls, txt) { var e = document.createElement('span'); e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function glyph(shape) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'radial-legend-glyph');
    s.setAttribute('viewBox', '-8 -8 16 16');
    s.setAttribute('aria-hidden', 'true');
    var r = 4.6, e;
    function mk(n, a) { var x = document.createElementNS(NS, n); for (var k in a) x.setAttribute(k, a[k]); return x; }
    if (shape === 'square') e = mk('rect', { x: -r, y: -r, width: r * 2, height: r * 2, rx: r * 0.28 });
    else if (shape === 'diamond') e = mk('polygon', { points: [0, -r * 1.25, r * 1.25, 0, 0, r * 1.25, -r * 1.25, 0].join(' ') });
    else if (shape === 'hex') {
      var p = [];
      for (var i = 0; i < 6; i++) { var t = Math.PI / 6 + i * Math.PI / 3; p.push(Math.cos(t) * r * 1.3 + ',' + Math.sin(t) * r * 1.3); }
      e = mk('polygon', { points: p.join(' ') });
    } else if (shape === 'tri') e = mk('polygon', { points: [0, -r * 1.35, r * 1.2, r * 0.85, -r * 1.2, r * 0.85].join(' ') });
    else if (shape === 'ring') {
      s.appendChild(mk('circle', { r: r * 1.2 }));
      e = mk('circle', { r: r * 0.34, 'class': 'chip' });
    } else e = mk('circle', { r: r });
    s.appendChild(e);
    return s;
  }
  function row(lead, label, sub) {
    var r = div('radial-legend-row');
    r.appendChild(lead);
    var t = span('radial-legend-txt');
    t.appendChild(span('radial-legend-lbl', label));
    if (sub) t.appendChild(span('radial-legend-sub', sub));
    r.appendChild(t);
    return r;
  }

  function render(slot, m) {
    var frag = document.createDocumentFragment();
    if (m.states.length) {
      frag.appendChild(div('radial-legend-h', m.headings.state));
      m.states.forEach(function (s) {
        var sw = span('radial-legend-sw');
        sw.style.setProperty('--st', 'var(--state-' + s.role + ')');
        frag.appendChild(row(sw, s.label, s.meaning));
      });
    }
    if (m.planes.length) {
      frag.appendChild(div('radial-legend-h', m.headings.line));
      m.planes.forEach(function (p) {
        frag.appendChild(row(span('radial-legend-line radial-legend-line--' + p.drawn + (p.directed ? ' is-directed' : '')), p.label, p.note));
      });
    }
    if (m.kinds.length && m.shapes !== null) {
      frag.appendChild(div('radial-legend-h', m.headings.shape));
      var r = div('radial-legend-row');
      var t = span('radial-legend-txt');
      t.appendChild(span('radial-legend-sub', m.shapes));
      r.appendChild(t);
      frag.appendChild(r);
    } else if (m.kinds.length) {
      frag.appendChild(div('radial-legend-h', m.headings.shape));
      m.kinds.forEach(function (k) {
        var g = span('radial-legend-shape');
        g.appendChild(glyph(k.shape));
        frag.appendChild(row(g, k.label, k.note));
      });
    }
    if (m.bound !== null) frag.appendChild(div('radial-legend-bound', m.bound));
    slot.appendChild(frag);
  }

  R.modules.legend = {
    requires: [],
    hooks: ['headings'],
    slots: ['legend'],
    validate: check,
    model: model,
    mount: function (api, cfg) {
      var slot = api.slot('legend');                         /* required: the engine checked it */
      var m = model(api.model, cfg);
      var before = Array.prototype.slice.call(slot.childNodes);
      render(slot, m);
      /* the same model for any other renderer of this instance (the export's page plate) */
      if (api.provide) api.provide('legend', { model: m });
      return {
        model: m,
        destroy: function () {
          Array.prototype.slice.call(slot.childNodes).forEach(function (c) { if (before.indexOf(c) < 0) slot.removeChild(c); });
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
