/* diagrams-radial-facets.js — the facets module of the interactive radial pattern: a drawer with
   search over every node and record, the declared facets, and the membership they set.

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. Optional for an instance: list it as
   mount({ …, modules: ['facets', …] }), give the host an [data-radial-slot="actions"] slot for
   its trigger, and declare adapter.facets. Load it after the engine.

   SEARCH covers the placed containers, the placed items and the undrawn records. A query is
   normalized (lower case, compatibility decomposition, combining marks removed) and ranked:
     0 the exact identifier          1 an identifier prefix, for identifiers the adapter names
     2 the exact name                3 a name prefix
     4 a word in the name            5 anywhere in the name
     6 anywhere in the adapter's search text
   ties by kind (items, then containers by depth, then records), then shorter name, then
   identifier. Choosing a result opens a record's view, frames and selects a container, or
   selects and centers an item; a node a filter hides resets the filter first.

   FACETS are the adapter's declared dimensions, each over one family:
     items      which items are members; a container is a member while any member item lies
                under it, and the root always is
     relations  which relations between members are drawn
   Values are OR'd within a facet and AND'd across facets; a facet with nothing chosen is
   inactive. A value the adapter locks is listed and cannot be chosen. Every option shows its
   count over the whole data. A filter never moves a mark and never changes the tier; a tier's
   minimum of leaves for naming a container counts its members.
   A change of filter refits to the members; a filter that leaves no item frames the whole layout.

   THE DRAWER is closed by default behind its trigger. Opening it focuses the search; closing
   it returns focus to the trigger. While open it reserves the left edge for the Fit and is
   bounded above the control area; it is an exclusive overlay, so opening it closes another
   exclusive panel. Escape peels, in order with the engine's layers: the search text, the
   filters, then the drawer. A change to the reserved chrome refits only at the Fit. */
(function (root) {
  'use strict';

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.modules = R.modules || {};
  var KEYS = ['declared', 'search', 'name', 'title', 'close', 'note', 'reset', 'families', 'notOffered', 'announce'];
  var FACET_KEYS = ['id', 'title', 'family', 'note', 'value', 'label', 'order', 'swatch', 'locked'];
  var SEARCH_KEYS = ['label', 'placeholder', 'text', 'prefix', 'tag', 'sub', 'limit', 'labelMax'];
  var ANNOUNCE_KEYS = ['results', 'group', 'outside', 'reset', 'cleared'];
  var FAMILIES = ['items', 'relations'];
  var DEFAULTS = {
    name: 'filters', note: '', reset: 'reset filters', close: 'close {name}',
    families: { items: 'items', relations: 'relations' },
    search: { label: 'search', placeholder: '', limit: 40, labelMax: 88 },
    announce: { results: '{count} result{s}', group: '{label} framed, {count}', outside: '{label} is filtered out; showing everything',
                reset: 'filters reset, {total}', cleared: 'search cleared' },
    census: { complete: '{visible} / {total}', filtered: '{visible} / {total} \u00B7 {relations} drawn \u00B7 {active} active' },
    filtered: { on: '{visible}/{total}', off: '' },
    noMatch: 'no match'
  };
  var MARGIN = 8, EDGE = 18;

  function FacetsError(detail) {
    var e = new Error('radial mount HOOK_MISSING: ' + detail);
    e.name = 'MountError';
    e.code = 'HOOK_MISSING';
    return e;
  }
  function plain(v) { return R.contract.plain(v); }
  function closed(o, keys, where) {
    if (!plain(o)) throw FacetsError(where + ' must be a plain object');
    Object.keys(o).forEach(function (k) { if (keys.indexOf(k) < 0) throw FacetsError(where + ': unknown key ' + k); });
  }
  function optString(o, k, where) { if (o[k] !== undefined && typeof o[k] !== 'string') throw FacetsError(where + '.' + k + ' must be a string'); }
  function check(cfg) {
    closed(cfg, KEYS, 'facets');
    if (!Array.isArray(cfg.declared)) throw FacetsError('facets.declared must be an array');
    var ids = [];
    cfg.declared.forEach(function (f, i) {
      var w = 'facets.declared[' + i + ']';
      closed(f, FACET_KEYS, w);
      if (typeof f.id !== 'string' || !f.id || ids.indexOf(f.id) >= 0) throw FacetsError(w + '.id must be a unique non-empty string');
      ids.push(f.id);
      if (typeof f.title !== 'string' || !f.title) throw FacetsError(w + '.title must be a non-empty string');
      if (FAMILIES.indexOf(f.family) < 0) throw FacetsError(w + '.family must be items or relations');
      if (typeof f.value !== 'function') throw FacetsError(w + '.value must be a function');
      if (f.label !== undefined && typeof f.label !== 'function') throw FacetsError(w + '.label must be a function');
      if (f.order !== undefined && !(f.order === 'count' || f.order === 'value' || Array.isArray(f.order) || typeof f.order === 'function'))
        throw FacetsError(w + '.order must be "count", "value", an array of values or a comparator');
      if (f.swatch !== undefined && typeof f.swatch !== 'boolean') throw FacetsError(w + '.swatch must be a boolean');
      if (f.locked !== undefined && !Array.isArray(f.locked)) throw FacetsError(w + '.locked must be an array of values');
      optString(f, 'note', w);
    });
    closed(cfg.search, SEARCH_KEYS, 'facets.search');
    ['label', 'placeholder'].forEach(function (k) { optString(cfg.search, k, 'facets.search'); });
    ['text', 'tag', 'sub'].forEach(function (k) {
      if (cfg.search[k] !== undefined && typeof cfg.search[k] !== 'function') throw FacetsError('facets.search.' + k + ' must be a function');
    });
    if (cfg.search.prefix !== undefined && !(cfg.search.prefix instanceof RegExp)) throw FacetsError('facets.search.prefix must be a RegExp');
    ['limit', 'labelMax'].forEach(function (k) {
      if (cfg.search[k] !== undefined && !(Number.isInteger(cfg.search[k]) && cfg.search[k] > 0)) throw FacetsError('facets.search.' + k + ' must be a positive integer');
    });
    ['name', 'title', 'close', 'note', 'reset'].forEach(function (k) { optString(cfg, k, 'facets'); });
    if (cfg.name !== undefined && !cfg.name.trim()) throw FacetsError('facets.name must not be empty');
    if (cfg.families !== undefined) {
      closed(cfg.families, FAMILIES, 'facets.families');
      FAMILIES.forEach(function (k) { optString(cfg.families, k, 'facets.families'); });
    }
    if (cfg.notOffered !== undefined) {
      if (!Array.isArray(cfg.notOffered)) throw FacetsError('facets.notOffered must be an array');
      cfg.notOffered.forEach(function (d, i) {
        closed(d, ['title', 'tag', 'reason'], 'facets.notOffered[' + i + ']');
        ['title', 'tag', 'reason'].forEach(function (k) { optString(d, k, 'facets.notOffered[' + i + ']'); });
      });
    }
    if (cfg.announce !== undefined) {
      closed(cfg.announce, ANNOUNCE_KEYS, 'facets.announce');
      ANNOUNCE_KEYS.forEach(function (k) { optString(cfg.announce, k, 'facets.announce'); });
    }
  }
  /* the facets' words in adapter.text: census, filtered, noMatch */
  function checkText(text) {
    if (text.census !== undefined) { closed(text.census, ['complete', 'filtered'], 'text.census');
      ['complete', 'filtered'].forEach(function (k) { optString(text.census, k, 'text.census'); }); }
    if (text.filtered !== undefined) { closed(text.filtered, ['on', 'off'], 'text.filtered');
      ['on', 'off'].forEach(function (k) { optString(text.filtered, k, 'text.filtered'); }); }
    if (text.noMatch !== undefined && typeof text.noMatch !== 'string') throw FacetsError('text.noMatch must be a string');
  }

  function norm(s) {
    return String(s === null || s === undefined ? '' : s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036F]/g, '');
  }
  function rxEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }
  function values(v) {
    if (v === undefined || v === null) return [];
    return (Array.isArray(v) ? v : [v]).filter(function (x) { return x !== undefined && x !== null && x !== ''; }).map(String);
  }

  /* the ranked search, pure: entries { key, label, hay, rank } */
  function search(index, q, limit, prefix) {
    var raw = String(q || '').trim();
    if (!raw) return [];
    var n = norm(raw), wb = new RegExp('\\b' + rxEsc(n)), out = [];
    index.forEach(function (e) {
      var kid = e.nkey, lab = e.nlabel, sc = -1;
      if (kid === n) sc = 0;
      else if (prefix && kid.indexOf(n) === 0 && prefix.test(e.key)) sc = 1;
      else if (lab === n) sc = 2;
      else if (lab.indexOf(n) === 0) sc = 3;
      else if (wb.test(lab)) sc = 4;
      else if (lab.indexOf(n) >= 0) sc = 5;
      else if (e.hay.indexOf(n) >= 0) sc = 6;
      if (sc >= 0) out.push({ e: e, sc: sc });
    });
    out.sort(function (a, b) {
      if (a.sc !== b.sc) return a.sc - b.sc;
      if (a.e.rank !== b.e.rank) return a.e.rank - b.e.rank;
      if (a.e.label.length !== b.e.label.length) return a.e.label.length - b.e.label.length;
      return a.e.key.localeCompare(b.e.key);
    });
    return out.slice(0, limit).map(function (x) { return x.e; });
  }

  function mount(api, cfg) {
    var M = api.model, L = api.layout, text = api.text || {};
    checkText(text);
    var fill = R.labels.fill;
    var lang = document.documentElement.lang || 'en';
    function num(n) { return typeof n === 'number' ? n.toLocaleString(lang) : n; }
    var name = cfg.name !== undefined ? cfg.name : DEFAULTS.name;
    var fam = Object.assign({}, DEFAULTS.families, cfg.families || {});
    var scfg = Object.assign({}, DEFAULTS.search, cfg.search);
    var say = Object.assign({}, DEFAULTS.announce, cfg.announce || {});
    var census = Object.assign({}, DEFAULTS.census, text.census || {});
    var filteredT = Object.assign({}, DEFAULTS.filtered, text.filtered || {});
    var noMatch = text.noMatch !== undefined ? text.noMatch : DEFAULTS.noMatch;
    var actions = api.slot('actions'), canvas = api.canvas, host = api.host;
    var hud = api.slot('hud');

    /* -------------------------------------------------------- population -- */
    var items = L.nodes.filter(function (n) { return n.kind === 'leaf' && !M.hidden.has(n.id); });
    var containers = L.nodes.filter(function (n) { return n.kind === 'container' && !M.hidden.has(n.id); });
    var records = []; M.byId.forEach(function (x, id) { if (M.kindOf(id) === 'record') records.push(x); });
    var depthCount = {};
    containers.forEach(function (n) { depthCount['depth' + n.depth] = (depthCount['depth' + n.depth] || 0) + 1; });
    var counts = Object.assign({ items: items.length, records: records.length, entries: items.length + records.length + containers.length,
                                 objects: items.length + records.length }, depthCount);
    var countSlots = {}; Object.keys(counts).forEach(function (k) { countSlots[k] = num(counts[k]); });

    /* the facets: values per item or relation, options with their counts over the whole data */
    var facets = cfg.declared.map(function (f, fi) {
      var pop = f.family === 'items' ? items.map(function (n) { return M.byId.get(n.id); }) : M.relations;
      var of = new Map(), tally = new Map(), present = 0;
      pop.forEach(function (x) {
        var vs = values(f.value(x));
        of.set(f.family === 'items' ? x.id : x.key, vs);
        if (vs.length) present++;
        vs.forEach(function (v) { tally.set(v, (tally.get(v) || 0) + 1); });
      });
      var opts = Array.from(tally.keys());
      var ord = f.order === undefined ? 'count' : f.order;
      if (Array.isArray(ord)) opts.sort(function (a, b) {
        var ia = ord.map(String).indexOf(a), ib = ord.map(String).indexOf(b);
        return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib) || (a < b ? -1 : a > b ? 1 : 0);
      });
      else if (ord === 'value') opts.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
      else if (ord === 'count') opts.sort(function (a, b) { return tally.get(b) - tally.get(a) || (a < b ? -1 : a > b ? 1 : 0); });
      else opts.sort(ord);
      var locked = values(f.locked);
      return { def: f, index: fi, of: of, present: present, total: pop.length,
               options: opts.map(function (v) {
                 return { value: v, label: f.label ? String(f.label(v)) : v, count: tally.get(v), locked: locked.indexOf(v) >= 0 };
               }),
               chosen: new Set() };
    });
    function active() { return facets.filter(function (f) { return f.chosen.size > 0; }); }
    function passes(f, key) { var vs = f.of.get(key) || []; return vs.some(function (v) { return f.chosen.has(v); }); }

    /* ------------------------------------------------------------- index -- */
    function hayOf(entry) { return scfg.text ? norm(scfg.text(entry)) : ''; }
    var index = [];
    /* names as declared, not as the layout caps them for display */
    containers.forEach(function (n) {
      index.push({ type: 'container', key: n.id, label: M.byId.get(n.id).label, node: M.byId.get(n.id), depth: n.depth, count: n.count, rank: n.depth });
    });
    items.forEach(function (n) { index.push({ type: 'item', key: n.id, label: M.byId.get(n.id).label, node: M.byId.get(n.id), depth: n.depth, rank: 0 }); });
    records.forEach(function (r) { index.push({ type: 'record', key: r.id, label: r.label, node: r, rank: 1000 }); });
    index.forEach(function (e) { e.nkey = norm(e.key); e.nlabel = norm(e.label); e.hay = hayOf(e); });

    /* ------------------------------------------------------------ the DOM -- */
    var created = [], restore = [];
    function adopt(e) { created.push(e); return e; }
    function setAttr(e, k, v) {
      var had = e.hasAttribute(k), old = e.getAttribute(k);
      restore.push(function () { if (had) e.setAttribute(k, old); else e.removeAttribute(k); });
      if (v === null) e.removeAttribute(k); else e.setAttribute(k, v);
    }
    var pid = api.id + '-facets';
    var trigger = el('button', 'surface-action radial-drawer-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', pid);
    trigger.appendChild(el('span', 'radial-drawer-dot')).setAttribute('aria-hidden', 'true');
    trigger.appendChild(document.createTextNode(name));
    actions.appendChild(adopt(trigger));

    var drawer = adopt(el('div', 'radial-drawer radial-glass'));
    drawer.id = pid;
    drawer.hidden = true;
    drawer.setAttribute('role', 'region');
    drawer.setAttribute('aria-label', cfg.title !== undefined ? cfg.title : name);
    drawer.setAttribute('data-radial-obstacle', 'yields');      /* open only as an exclusive overlay */
    var head = el('div', 'radial-drawer-head');
    head.appendChild(el('span', 'radial-drawer-title', cfg.title !== undefined ? cfg.title : name));
    var closeB = el('button', 'radial-drawer-close', '\u00D7');
    closeB.type = 'button';
    closeB.setAttribute('aria-label', fill(cfg.close !== undefined ? cfg.close : DEFAULTS.close, { name: name }));
    head.appendChild(closeB);
    drawer.appendChild(head);

    var qid = pid + '-q', rid = pid + '-results';
    var qlabel = el('label', 'radial-drawer-lbl', scfg.label); qlabel.htmlFor = qid;
    drawer.appendChild(qlabel);
    var input = el('input', 'radial-drawer-q');
    input.id = qid; input.type = 'search'; input.autocomplete = 'off'; input.spellcheck = false;
    input.placeholder = scfg.placeholder;
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', rid); input.setAttribute('aria-autocomplete', 'list');
    drawer.appendChild(input);
    var resBox = el('div', 'radial-drawer-results'); resBox.id = rid;
    resBox.setAttribute('role', 'listbox'); resBox.setAttribute('aria-label', scfg.label);
    drawer.appendChild(resBox);
    var censusEl = el('div', 'radial-drawer-census'); censusEl.setAttribute('role', 'status');
    drawer.appendChild(censusEl);
    if (cfg.note) drawer.appendChild(el('div', 'radial-drawer-note', cfg.note));

    facets.forEach(function (f) {
      var d = el('details', 'radial-facet');
      d.setAttribute('data-radial-facet', f.def.id);
      var s = el('summary');
      s.appendChild(el('span', 'radial-facet-title', f.def.title));
      s.appendChild(el('span', 'radial-facet-family', fam[f.def.family]));
      d.appendChild(s);
      if (f.def.note) d.appendChild(el('div', 'radial-facet-note', fill(f.def.note, { present: num(f.present), total: num(f.total) })));
      f.options.forEach(function (o, oi) {
        var id = pid + '-' + f.index + '-' + oi;
        var lab = el('label', 'radial-facet-opt' + (o.locked ? ' is-locked' : ''));
        lab.htmlFor = id;
        var cb = el('input'); cb.type = 'checkbox'; cb.id = id; cb.value = o.value; cb.disabled = o.locked;
        cb.setAttribute('data-radial-facet', f.def.id);
        lab.appendChild(cb);
        if (f.def.swatch) { var sw = el('span', 'radial-facet-sw'); sw.style.setProperty('--st', 'var(--state-' + o.value + ')'); lab.appendChild(sw); }
        lab.appendChild(el('span', 'radial-facet-lbl', o.label));
        lab.appendChild(el('span', 'radial-facet-n', num(o.count)));
        d.appendChild(lab);
        o.input = cb;
      });
      drawer.appendChild(d);
    });
    (cfg.notOffered || []).forEach(function (d) {
      var b = el('div', 'radial-facet-off');
      if (d.title) b.appendChild(el('span', 'radial-facet-title', d.title));
      if (d.tag) b.appendChild(el('span', 'radial-facet-offtag', d.tag));
      if (d.reason) b.appendChild(el('div', 'radial-facet-note', d.reason));
      drawer.appendChild(b);
    });
    var resetB = el('button', 'radial-drawer-reset', cfg.reset !== undefined ? cfg.reset : DEFAULTS.reset);
    resetB.type = 'button';
    drawer.appendChild(resetB);
    canvas.appendChild(drawer);

    var readout = hud ? hud.querySelector('[data-radial-readout="filter"]') : null;
    var readoutOld = readout ? readout.textContent : null;
    if (readout) restore.push(function () { readout.textContent = readoutOld; readout.classList.remove('is-active'); });

    /* ------------------------------------------------------------ census -- */
    var destroyed = false, open = false;
    function slots() {
      var st = api.membership.state(), n = active().length;
      return { visible: num(st.visibleItems), total: num(st.totalItems), relations: num(st.visibleRelations),
               relationsTotal: num(st.totalRelations), active: num(n), s: n === 1 ? '' : 's' };
    }
    function filtering() { return active().length > 0; }
    function censusText() { return fill(filtering() ? census.filtered : census.complete, slots()); }
    function updateCensus() {
      censusEl.textContent = censusText();
      censusEl.classList.toggle('is-active', filtering());
      trigger.classList.toggle('is-filtering', filtering());
      if (readout) { readout.textContent = fill(filtering() ? filteredT.on : filteredT.off, slots()); readout.classList.toggle('is-active', filtering()); }
    }

    /* -------------------------------------------------------- membership -- */
    function apply(cause, refit) {
      var items_ = active().filter(function (f) { return f.def.family === 'items'; });
      var rels_ = active().filter(function (f) { return f.def.family === 'relations'; });
      var leaves = null, rels = null;
      if (items_.length) {
        leaves = new Set();
        items.forEach(function (n) { if (items_.every(function (f) { return passes(f, n.id); })) leaves.add(n.id); });
      }
      if (rels_.length) {
        rels = new Set();
        M.relations.forEach(function (e) { if (rels_.every(function (f) { return passes(f, e.key); })) rels.add(e.key); });
      }
      var st = api.membership.set(leaves, rels, cause);
      updateCensus();
      /* a change of filter refits to the members (the whole layout when none remain) */
      if (refit) api.fit(cause);
      api.emit('facets', { cause: cause, active: active().map(function (f) { return f.def.id; }), membership: st });
      return st;
    }
    function readChecks() {
      facets.forEach(function (f) {
        f.chosen = new Set();
        f.options.forEach(function (o) { if (o.input.checked && !o.input.disabled) f.chosen.add(o.value); });
      });
    }
    function reset(cause, refit) {
      facets.forEach(function (f) { f.options.forEach(function (o) { o.input.checked = false; }); f.chosen = new Set(); });
      var st = apply(cause || 'module', refit);
      api.announce(fill(say.reset, { total: num(st.totalItems) }));
      return st;
    }
    function on(t, type, fn) { t.addEventListener(type, fn, { signal: api.signal }); }
    on(drawer, 'change', function (ev) {
      if (!ev.target.matches || !ev.target.matches('input[type="checkbox"][data-radial-facet]')) return;
      readChecks();
      apply('reader', true);
      api.announce(censusText());
    });
    on(resetB, 'click', function (ev) { ev.stopPropagation(); reset('reader', true); });

    /* ------------------------------------------------------------ search -- */
    var results = [], cursor = -1;
    function tagOf(e) { return scfg.tag ? String(scfg.tag(e)) : e.type === 'container' ? 'group' : e.type; }
    function subOf(e) { return scfg.sub ? String(scfg.sub(e)) : e.type === 'container' ? String(num(e.count)) : e.key; }
    function renderResults() {
      while (resBox.firstChild) resBox.removeChild(resBox.firstChild);
      if (!results.length) {
        if (input.value.trim()) resBox.appendChild(el('div', 'radial-drawer-none', fill(noMatch, countSlots)));
        input.setAttribute('aria-expanded', 'false');
        return;
      }
      results.forEach(function (e, i) {
        var b = el('button', 'radial-drawer-r');
        b.type = 'button'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', 'false');
        b.id = pid + '-r' + i;
        b.appendChild(el('span', 'radial-drawer-rk', tagOf(e)));
        b.appendChild(el('span', 'radial-drawer-rl', e.label.length > scfg.labelMax ? e.label.slice(0, scfg.labelMax) : e.label));
        b.appendChild(el('span', 'radial-drawer-rs', subOf(e)));
        b.addEventListener('click', function (ev) { ev.stopPropagation(); activate(i); });
        resBox.appendChild(b);
      });
      input.setAttribute('aria-expanded', 'true');
    }
    function runSearch() {
      results = search(index, input.value, scfg.limit, scfg.prefix);
      cursor = -1;
      renderResults();
      if (input.value.trim()) api.announce(fill(say.results, { count: num(results.length), s: results.length === 1 ? '' : 's' }));
    }
    function activate(i) {
      var e = results[i]; if (!e) return false;
      var insp = api.service('inspector');
      if (e.type === 'record') { if (insp) insp.openRecord(e.key, null); else api.announce(e.label); return true; }
      if (!api.visible(e.key)) {
        api.announce(fill(say.outside, { label: e.label, id: e.key }));
        reset('reader', false);
      }
      /* a node still hidden moves nothing; the camera moves only for a node shown, and an item
         only once it is selected */
      if (!api.visible(e.key)) return false;
      if (e.type === 'container') {
        api.frame(e.key, 'reader');
        api.select(e.key, 'search', 'reader');
        api.announce(fill(say.group, { label: e.label, count: num(e.count) }));
      } else {
        if (!api.select(e.key, 'search', 'reader')) return false;
        api.centerOn(e.key, Math.max(api.view().k, 1.35));
      }
      return true;
    }
    function focusResult(i) {
      var bs = resBox.querySelectorAll('.radial-drawer-r');
      if (!bs.length) return;
      i = Math.max(0, Math.min(i, bs.length - 1));
      Array.prototype.forEach.call(bs, function (b, j) { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      cursor = i; bs[i].focus();
    }
    on(input, 'input', runSearch);
    on(input, 'keydown', function (ev) {
      if (ev.key === 'ArrowDown' && results.length) { ev.preventDefault(); focusResult(0); }
      else if (ev.key === 'Enter' && results.length) { ev.preventDefault(); activate(0); }
    });
    on(resBox, 'keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); focusResult(cursor + 1); }
      else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (cursor <= 0) { cursor = -1; input.focus(); } else focusResult(cursor - 1);
      }
    });

    /* ------------------------------------------------------------ drawer -- */
    function rendered(e) { return !!e && e.getClientRects().length > 0; }
    /* bounded above the control area: the HUD, or a trigger row placed above it */
    function bound() {
      if (!open) return;
      var cr = canvas.getBoundingClientRect(), floor = cr.bottom - EDGE;
      [hud, canvas.querySelector('.radial-chrome-triggers')].forEach(function (x) {
        if (rendered(x) && !x.hidden) floor = Math.min(floor, x.getBoundingClientRect().top - MARGIN);
      });
      drawer.style.setProperty('--radial-drawer-max', Math.max(0, Math.floor(floor - cr.top - EDGE)) + 'px');
    }
    function setOpen(on_, cause, focus) {
      if (on_ === open) return;
      if (!on_ && drawer.contains(document.activeElement) && focus !== false) { try { trigger.focus({ preventScroll: true }); } catch (e) { trigger.focus(); } }
      open = on_;
      if (on_) api.claim('facets');
      drawer.hidden = !on_;
      trigger.setAttribute('aria-expanded', on_ ? 'true' : 'false');
      if (on_) drawer.setAttribute('data-diagram-fit-edge', 'left'); else drawer.removeAttribute('data-diagram-fit-edge');
      bound();
      api.emit('obstacle', { cause: cause });
      if (api.view().atFit && cause !== 'fit') api.fit(cause);
      if (on_ && focus !== false) { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }
    }
    on(trigger, 'click', function (ev) { ev.stopPropagation(); setOpen(!open, 'reader'); });
    on(closeB, 'click', function (ev) { ev.stopPropagation(); setOpen(false, 'reader'); });
    on(drawer, 'pointerdown', function (ev) { ev.stopPropagation(); });
    on(drawer, 'click', function (ev) { ev.stopPropagation(); });
    var ro = root.ResizeObserver ? new root.ResizeObserver(function () { bound(); }) : null;
    if (ro) { ro.observe(canvas); if (hud) ro.observe(hud); }
    api.on('arrangement', function () { bound(); });

    var unregister = api.registerOverlay({ name: 'facets', side: 'left', element: drawer, exclusive: true,
      isOpen: function () { return open; },
      dismiss: function (cause) { setOpen(false, cause === 'claim' ? 'reader' : cause || 'module'); } });
    var unescapes = [
      api.escape({ name: 'search', priority: 15, isActive: function () { return open && !!input.value.trim(); },
                   dismiss: function () { input.value = ''; runSearch(); input.focus(); api.announce(say.cleared); } }),
      api.escape({ name: 'filters', priority: 6, isActive: function () { return filtering(); },
                   dismiss: function () { reset('reader', true); } }),
      api.escape({ name: 'facets', priority: 4, isActive: function () { return open; },
                   dismiss: function () { setOpen(false, 'reader'); } })
    ];

    setAttr(host, 'data-radial-facets', '');
    updateCensus();
    var service = {
      reset: function (cause, refit) { return reset(cause || 'module', !!refit); },
      search: function (q) { return search(index, q, scfg.limit, scfg.prefix).map(function (e) { return { type: e.type, key: e.key, label: e.label }; }); },
      set: function (id, vals) {
        var f = facets.filter(function (x) { return x.def.id === id; })[0];
        if (!f) return null;
        var want = values(vals);
        f.options.forEach(function (o) { o.input.checked = !o.locked && want.indexOf(o.value) >= 0; });
        readChecks();
        return apply('module', true);
      },
      census: function () { return { text: censusText(), active: active().length, membership: api.membership.state() }; },
      open: function (on_) { setOpen(on_ !== false, 'module', false); },
      query: function (q) { input.value = q; runSearch(); return results.map(function (e) { return { type: e.type, key: e.key, label: e.label }; }); },
      activate: function (i) { return activate(i || 0); }
    };
    api.provide('facets', service);

    return {
      state: function () {
        return { open: open, query: input.value, results: results.length, active: active().map(function (f) { return { id: f.def.id, values: Array.from(f.chosen) }; }),
                 census: censusText(), options: facets.map(function (f) { return { id: f.def.id, family: f.def.family, options: f.options.map(function (o) { return { value: o.value, label: o.label, count: o.count, locked: o.locked }; }) }; }),
                 entries: index.length };
      },
      service: service,
      destroy: function () {
        destroyed = true;
        if (ro) ro.disconnect();
        unregister(); unescapes.forEach(function (u) { u(); });
        created.slice().reverse().forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); });
        restore.slice().reverse().forEach(function (f) { f(); });
      }
    };
  }

  R.modules.facets = {
    requires: [],
    hooks: ['declared', 'search'],
    slots: ['actions'],
    validate: check,
    search: search,
    norm: norm,
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
