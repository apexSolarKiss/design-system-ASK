/* diagrams-radial-inspector.js — the inspector module of the interactive radial pattern: the
   panel that reports the selected, previewed or opened node or record in text.

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. Optional for an instance: list it as
   mount({ …, modules: ['inspector', …] }), give the host a [data-radial-slot="inspector"]
   panel, and declare adapter.inspector. Load it after the engine.

   THE OWNER DRAWS THE GRAMMAR; THE ADAPTER SUPPLIES EVERY WORD. The adapter answers two
   questions about a target: its header (a title and an optional kind line) and its sections.
   A section is one of a closed set the owner knows how to render: a state row, a group of
   fields, the node's relations, a list of references, or a note. Every string is rendered as
   text, never as markup; only a locator field makes links, and only of standalone http(s)
   addresses with a real host.

   VIEWS
     idle       nothing selected or previewed: the adapter's idle text
     root · container · item
                the selected node, or the previewed one while nothing is selected
     record     an undrawn record, opened from a reference, a search or an arrival. It keeps
                the node it was opened from, offers a way back to it, and is closed by Escape
                before the selection is.
   A reference to a placed node selects and centers it. A node a membership hides is revealed
   first by clearing the membership, through the facets module when it is listed and through the
   engine when it is not, so a reference never lands on a hidden node; the camera moves only once
   the node is shown and selected, and a node hidden by policy is not reached.

   PLACEMENT. The panel is a corner panel on a wide canvas and a sheet across the top of a
   compact one, where it starts collapsed. A canvas is compact on a narrow or short window, and
   also while the chrome module's measured arrangement is compact: the panel folds with the
   panels around the map. The wide panel declares the right edge, and keeps that lane because it
   grows with what it shows, with no refit. Collapsed to its pill, a small box that keeps its size
   until the next Fit, it declares the top edge with the right as its option, and the Fit keeps
   whichever reservation leaves the larger placement that clears. The open compact sheet is an
   exclusive overlay and reserves nothing: opening it closes another exclusive panel, opening one
   of those collapses it, and an explicit Fit dismisses it where it covers the drawing.
   OPENING AND CLOSING. Entering compact folds a panel that is open only by default; a reader's
   inspection (a selection, a record, or the panel opened with its own toggle) stays open, as the
   sheet, unless another exclusive panel is open, to which it yields. From the Fit the view takes
   the new arrangement's Fit and leaves it with the selected node beside the sheet, and a camera
   the reader has moved stays put. Opening the sheet, by the toggle or a selection, never refits:
   the view leaves the Fit and the selected node is brought into the room beside the sheet, and
   so it is again whenever what the open sheet shows changes, or a search result or an arrival is
   centered on. (Where the sheet's opening closes the panel that had folded the others, the
   arrangement turns wide, and the wide panel returns to the Fit as below.) Closing the sheet, or
   the arrangement turning back to the wide panel, returns to the Fit when the sheet was opened
   there and the camera is as it left it; otherwise the camera stays, unless that comes with a
   change of size, which makes a view the map made again (the engine's placed). The reader's own
   toggle on a wide canvas refits only at the Fit. */
(function (root) {
  'use strict';

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.modules = R.modules || {};
  var KEYS = ['header', 'sections', 'name', 'idle', 'back', 'backMax', 'more', 'controls', 'announce'];
  var CONTROL_KEYS = ['collapse', 'expand'];
  var SECTION_TYPES = ['state', 'fields', 'relations', 'references', 'note'];
  var FORMATS = ['text', 'list', 'structured', 'locator'];
  var COMPACT_Q = '(max-width: 767px), (max-height: 520px) and (pointer: coarse)';
  var DEFAULTS = { name: 'details', idle: '', back: '\u2190 back to {label}', backMax: 52, more: 'show all {count}',
                   collapse: 'collapse {name}', expand: 'expand {name}' };

  function InspectorError(detail) {
    var e = new Error('radial mount HOOK_MISSING: ' + detail);
    e.name = 'MountError';
    e.code = 'HOOK_MISSING';
    return e;
  }
  function plain(v) { return R.contract.plain(v); }
  function check(cfg) {
    if (!plain(cfg)) throw InspectorError('inspector must be a plain object');
    Object.keys(cfg).forEach(function (k) { if (KEYS.indexOf(k) < 0) throw InspectorError('inspector: unknown key ' + k); });
    if (typeof cfg.header !== 'function') throw InspectorError('inspector.header must be a function');
    if (typeof cfg.sections !== 'function') throw InspectorError('inspector.sections must be a function');
    ['name', 'idle', 'back', 'more'].forEach(function (k) {
      if (cfg[k] !== undefined && typeof cfg[k] !== 'string') throw InspectorError('inspector.' + k + ' must be a string');
    });
    if (cfg.name !== undefined && !cfg.name.trim()) throw InspectorError('inspector.name must not be empty');
    if (cfg.backMax !== undefined && !(Number.isInteger(cfg.backMax) && cfg.backMax > 0)) throw InspectorError('inspector.backMax must be a positive integer');
    if (cfg.announce !== undefined && typeof cfg.announce !== 'function') throw InspectorError('inspector.announce must be a function');
    if (cfg.controls !== undefined) {
      if (!plain(cfg.controls)) throw InspectorError('inspector.controls must be a plain object');
      Object.keys(cfg.controls).forEach(function (k) {
        if (CONTROL_KEYS.indexOf(k) < 0) throw InspectorError('inspector.controls: unknown key ' + k);
        if (typeof cfg.controls[k] !== 'string') throw InspectorError('inspector.controls.' + k + ' must be a string');
      });
    }
  }

  /* a section the adapter returned, checked when it is rendered: a malformed section is the
     adapter's error, reported by name; the view is built whole, so the previous one stays */
  function SectionError(detail) {
    var e = new Error('radial inspector SECTION: ' + detail);
    e.name = 'InspectorError';
    e.code = 'SECTION';
    return e;
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }
  function empty(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string') return v.trim() === '';
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v).length === 0;
    return false;
  }
  function str(v) { return typeof v === 'string' ? v : JSON.stringify(v); }
  function cap(s, n) {
    s = String(s);
    if (!(n > 0) || s.length <= n) return s;
    var cut = s.slice(0, n);
    if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);   /* never split a surrogate pair */
    return cut;
  }
  function fill(tpl, slots) { return R.labels.fill(tpl, slots); }

  /* A locator is usually mixed text: a citation, an address, prose between them. Only the
     tokens that are standalone http(s) addresses with a real dotted host and no elision become
     links; trailing prose punctuation stays outside the link; everything else is text. */
  var HOST_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}(?::\d+)?$/i;
  function linkURL(tok) {
    var m = /^(https?:\/\/[^\s]*?)([.,;:)\]]*)$/.exec(tok);
    if (!m) return null;
    var u = m[1];
    if (/\u2026|\.\.\./.test(u)) return null;
    var h = /^https?:\/\/([^/?#]*)/i.exec(u);
    if (!h || !HOST_RE.test(h[1])) return null;
    return { url: u, tail: m[2] };
  }
  function linkify(v, into) {
    var parts = String(v).split(/(\s+)/), links = 0;
    parts.forEach(function (t) {
      var L = /^https?:\/\//i.test(t) ? linkURL(t) : null;
      if (L) {
        links++;
        var a = el('a', 'radial-insp-link surface-text-link', L.url);
        a.href = L.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        into.appendChild(a);
        if (L.tail) into.appendChild(document.createTextNode(L.tail));
      } else into.appendChild(document.createTextNode(t));
    });
    return links;
  }

  function mount(api, cfg) {
    var slot = api.slot('inspector');                     /* required: the engine checked it */
    var M = api.model, signal = api.signal;
    var words = {
      name: cfg.name !== undefined ? cfg.name : DEFAULTS.name,
      idle: cfg.idle !== undefined ? cfg.idle : DEFAULTS.idle,
      back: cfg.back !== undefined ? cfg.back : DEFAULTS.back,
      more: cfg.more !== undefined ? cfg.more : DEFAULTS.more,
      collapse: cfg.controls && cfg.controls.collapse !== undefined ? cfg.controls.collapse : DEFAULTS.collapse,
      expand: cfg.controls && cfg.controls.expand !== undefined ? cfg.controls.expand : DEFAULTS.expand
    };
    var backMax = cfg.backMax || DEFAULTS.backMax;
    var COMPACT = root.matchMedia ? root.matchMedia(COMPACT_Q) : { matches: false };

    /* restore-on-destroy: every attribute this module changes on the slot */
    var restore = [], kept = [];
    function set(e, k, v) {
      if (kept.indexOf(k) < 0) {
        kept.push(k);
        var had = e.hasAttribute(k), old = e.getAttribute(k);
        restore.push(function () { if (had) e.setAttribute(k, old); else e.removeAttribute(k); });
      }
      if (v === null) e.removeAttribute(k); else e.setAttribute(k, v);
    }
    var before = Array.prototype.slice.call(slot.childNodes);
    var stKept = false;
    function tone(v) {
      if (!stKept) { stKept = true; var old = slot.style.getPropertyValue('--st');
        restore.push(function () { if (old) slot.style.setProperty('--st', old); else slot.style.removeProperty('--st');
                                   if (!slot.getAttribute('style')) slot.removeAttribute('style'); }); }
      if (v) slot.style.setProperty('--st', v); else slot.style.removeProperty('--st');
    }

    /* the bar: one disclosure trigger in the shared grammar, then the body */
    var bodyId = api.id + '-inspector-body';
    var bar = el('div', 'radial-insp-bar');
    var toggle = el('button', 'radial-insp-toggle surface-disclosure-trigger');
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', bodyId);
    var tl = el('span', 'surface-disclosure-label radial-insp-name', words.name);
    var ti = el('span', 'surface-disclosure-indicator', '\u25BC'); ti.setAttribute('aria-hidden', 'true');
    toggle.appendChild(tl); toggle.appendChild(ti);
    bar.appendChild(toggle);
    var body = el('div', 'radial-insp-body'); body.id = bodyId;
    slot.appendChild(bar); slot.appendChild(body);
    set(slot, 'data-radial-inspector', '');
    set(slot, 'data-radial-obstacle', '');
    set(slot, 'tabindex', '-1');                          /* where focus goes when the view under it is replaced */

    var view = 'idle', target = null, origin = null, showAll = false, destroyed = false;
    /* compact: a narrow or short window, or the chrome module's measured compact arrangement */
    var folded = api.canvas.getAttribute('data-radial-chrome') === 'compact';
    var compact = COMPACT.matches || folded, expanded = !compact;
    var opened = false;              /* the reader opened the panel with its own toggle */
    var probing = false;             /* shown in its wide form while the chrome measures */
    var sheetView = null;            /* the camera as the open panel left it, and whether it left the Fit */

    function kindOf(x) { return x && x.kind !== undefined ? M.kinds.get(x.kind) || null : null; }
    function stateOf(x) { return x && x.state !== undefined ? M.states.get(x.state) || null : null; }
    /* the target an adapter sees: its type, the contract object, and what the owner knows of it */
    function targetFor(id) {
      var t = M.kindOf(id);
      if (t === 'record') {
        var r = M.byId.get(id);
        return { type: 'record', id: id, node: r, kind: kindOf(r), state: stateOf(r), origin: origin ? M.byId.get(origin) : null };
      }
      var n = api.node(id);
      if (!n) return null;
      var raw = M.byId.get(id);
      var parent = n.parent !== undefined && n.parent !== null ? M.byId.get(n.parent) : null;
      var shown = api.membership.state().active ? memberCount(id) : n.count;
      return { type: n.kind === 'root' ? 'root' : n.kind === 'leaf' ? 'item' : 'container', id: id, node: raw,
               depth: n.depth, count: n.kind === 'leaf' ? undefined : (n.count || 0), shown: n.kind === 'leaf' ? undefined : shown,
               parent: parent, kind: kindOf(raw), state: n.kind === 'leaf' ? stateOf(raw) : null };
    }
    /* a container's member leaves under the current filter */
    function memberCount(id) {
      var c = 0;
      (function walk(x) {
        M.kids(x).forEach(function (k) { if (M.isContainer(k)) walk(k.id); else if (api.visible(k.id)) c++; });
      })(id);
      return c;
    }
    var ctx = {
      /* the node's relations between placed nodes, every plane, never-drawn ones included */
      relations: function (id) {
        var out = [];
        M.relations.forEach(function (e) {
          if (e.from !== id && e.to !== id) return;
          var otherId = e.from === id ? e.to : e.from, pl = M.planes.get(e.plane);
          out.push({ edge: e, plane: pl, direction: e.from === id ? 'out' : 'in', other: M.byId.get(otherId),
                     outside: api.membership.state().active && pl.drawn !== 'never' && !api.visible(otherId) });
        });
        return out;
      },
      /* a placed node's links to records, or a record's links to placed nodes and records */
      links: function (id) {
        var t = M.kindOf(id);
        return ((t === 'record' ? M.recordLinks.get(id) : M.links.get(id)) || []).slice();
      },
      node: function (id) { return M.byId.get(id) || null; },
      visible: function (id) { return api.visible(id); },
      filtered: function () { return api.membership.state().active; }
    };

    /* ------------------------------------------------------------ render -- */
    function field(f, where) {
      if (!plain(f)) throw SectionError(where + ': a field must be a plain object');
      var fmt = f.format === undefined ? 'text' : f.format;
      if (FORMATS.indexOf(fmt) < 0) throw SectionError(where + ': unknown format ' + fmt);
      if (typeof f.label !== 'string') throw SectionError(where + ': a field needs a label');
      var v = f.value;
      if (fmt === 'list' && Array.isArray(v)) v = v.filter(function (x) { return !empty(x); }).map(str).join(' \u00B7 ');
      if (empty(v)) return null;
      var row = el('div', 'radial-insp-field');
      if (fmt === 'structured') {
        row.className = 'radial-insp-block' + (f.tone ? ' has-tone' : '');
        if (f.tone) row.style.setProperty('--tone', f.tone === 'muted' ? 'var(--fg-3)' : 'var(--state-' + f.tone + ')');
        row.appendChild(el('span', 'radial-insp-lbl', f.label));
        if (typeof v === 'string') row.appendChild(el('span', 'radial-insp-val', v));
        else if (Array.isArray(v)) v.forEach(function (x) { row.appendChild(el('div', 'radial-insp-val', str(x))); });
        else Object.keys(v).forEach(function (k) {
          var sub = el('div', 'radial-insp-field');
          sub.appendChild(el('span', 'radial-insp-lbl', k.replace(/_/g, ' ')));
          sub.appendChild(el('span', 'radial-insp-val', str(v[k])));
          row.appendChild(sub);
        });
        return row;
      }
      var lbl = el('span', 'radial-insp-lbl', f.label);
      row.appendChild(lbl);
      var val = el('span', f.mono || fmt === 'locator' ? 'radial-insp-mono' : 'radial-insp-val');
      if (fmt === 'locator') {
        var links = linkify(v, val);
        if (links && typeof f.labelLinked === 'string') lbl.textContent = f.labelLinked;
      } else val.textContent = str(v);
      row.appendChild(val);
      return row;
    }
    function reference(item, where) {
      if (!plain(item) || typeof item.id !== 'string') throw SectionError(where + ': a reference needs an id');
      var row = el('div', 'radial-insp-field radial-insp-refrow');
      var b = el('button', 'radial-insp-ref', item.button !== undefined ? item.button : item.id);
      b.type = 'button';
      b.setAttribute('data-radial-ref', item.id);
      row.appendChild(b);
      if (!empty(item.text)) { row.appendChild(document.createTextNode(' ')); row.appendChild(el('span', 'radial-insp-val', item.text)); }
      if (!empty(item.detail)) row.appendChild(el('span', 'radial-insp-lbl radial-insp-detail', item.detail));
      return row;
    }
    function heading(title) {
      var f = document.createDocumentFragment();
      f.appendChild(el('div', 'radial-insp-rule'));
      f.appendChild(el('div', 'radial-insp-h', title));
      return f;
    }
    function section(s, t, i) {
      var where = 'section ' + i;
      if (!plain(s) || SECTION_TYPES.indexOf(s.type) < 0) throw SectionError(where + ': type must be one of ' + SECTION_TYPES.join(', '));
      var frag = document.createDocumentFragment();
      if (s.type === 'state') {
        var st = t.state;
        if (!st) return null;
        var row = el('div', 'radial-insp-state');
        var dot = el('span', 'radial-insp-dot'); dot.style.setProperty('--st', 'var(--state-' + st.role + ')');
        row.appendChild(dot);
        row.appendChild(el('span', 'radial-insp-state-name', st.label));
        row.appendChild(el('span', 'radial-insp-state-mean', st.meaning));
        frag.appendChild(row);
        return frag;
      }
      if (s.type === 'note') {
        if (empty(s.text)) return null;
        frag.appendChild(el('div', 'radial-insp-note', s.text));
        return frag;
      }
      if (s.type === 'fields') {
        if (!Array.isArray(s.fields)) throw SectionError(where + ': fields must be an array');
        var rows = s.fields.map(function (f, j) { return field(f, where + ' field ' + j); }).filter(Boolean);
        if (!rows.length) return null;
        if (s.title !== undefined) frag.appendChild(heading(s.title));
        rows.forEach(function (r) { frag.appendChild(r); });
        return frag;
      }
      if (s.type === 'relations') {
        var rel = ctx.relations(t.id).filter(function (r) { return !s.planes || s.planes.indexOf(r.plane.id) >= 0; });
        if (!rel.length) return null;
        frag.appendChild(heading(fill(s.title || '{count}', { count: rel.length })));
        rel.forEach(function (r) {
          var row = el('div', 'radial-insp-field radial-insp-relrow');
          var tag = s.tags && typeof s.tags[r.plane.id] === 'string' ? s.tags[r.plane.id] : r.plane.label;
          row.appendChild(el('span', 'radial-insp-tag', tag));
          row.appendChild(document.createTextNode(' '));
          /* direction is shown: out of this node, into it, or undirected */
          var arrow = !r.plane.directed ? '\u2014' : r.direction === 'out' ? '\u2192' : '\u2190';
          var type = r.edge.type !== undefined && r.edge.type !== '' ? r.edge.type : '';
          row.appendChild(el('span', 'radial-insp-mono radial-insp-reltype', (type ? type + ' ' : '') + arrow + ' '));
          var b = el('button', 'radial-insp-ref', s.show === 'id' ? r.other.id : r.other.label);
          b.type = 'button'; b.setAttribute('data-radial-ref', r.other.id);
          row.appendChild(b);
          if (r.plane.drawn === 'never' && !empty(s.never)) row.appendChild(el('span', 'radial-insp-lbl radial-insp-flag', s.never));
          if (r.outside && !empty(s.outside)) row.appendChild(el('span', 'radial-insp-lbl radial-insp-flag', s.outside));
          frag.appendChild(row);
        });
        return frag;
      }
      /* references */
      if (!Array.isArray(s.items)) throw SectionError(where + ': items must be an array');
      if (!s.items.length) return null;
      var head = Number.isInteger(s.head) && s.head > 0 ? s.head : Infinity;
      var shown = showAll ? s.items : s.items.slice(0, head);
      frag.appendChild(heading(fill(s.title || '{count}', { count: s.items.length })));
      shown.forEach(function (it, j) { frag.appendChild(reference(it, where + ' item ' + j)); });
      if (shown.length < s.items.length) {
        var more = el('button', 'radial-insp-more', fill(s.more !== undefined ? s.more : words.more, { count: s.items.length }));
        more.type = 'button'; more.setAttribute('data-radial-more', '');
        frag.appendChild(more);
      }
      return frag;
    }

    /* A view is built whole, then swapped in: a section that throws leaves the previous view. Focus
       inside the panel stays inside it: on the way back where there is one, else on the panel. */
    function render() {
      var out = document.createDocumentFragment(), st = null;
      if (view === 'idle' || !target) {
        /* idle: the panel's own name, then the adapter's idle text (its line breaks kept) */
        out.appendChild(el('div', 'radial-insp-h', words.name));
        if (words.idle) out.appendChild(el('div', 'radial-insp-idle', words.idle));
      } else {
        var t = targetFor(target);
        if (!t) { view = 'idle'; target = null; render(); return; }
        var h = cfg.header(t);
        if (!plain(h) || typeof h.title !== 'string') throw SectionError('header must return { title, kind? }');
        if (t.type === 'record' && origin && M.byId.get(origin)) {
          var back = el('button', 'radial-insp-back', fill(words.back, { label: cap(M.byId.get(origin).label, backMax) }));
          back.type = 'button'; back.setAttribute('data-radial-back', origin);
          out.appendChild(back);
        }
        var kindLine = h.kind !== undefined ? h.kind : (t.kind ? t.kind.id + ' \u2014 ' + t.kind.label : '');
        if (!empty(kindLine)) out.appendChild(el('div', 'radial-insp-h radial-insp-kind', kindLine));
        out.appendChild(el('div', 'radial-insp-title', h.title));
        var secs = cfg.sections(t, ctx);
        if (!Array.isArray(secs)) throw SectionError('sections must return an array');
        secs.forEach(function (s, i) { var f = section(s, t, i); if (f) out.appendChild(f); });
        st = t.type === 'item' && t.state ? 'var(--state-' + t.state.role + ')' : t.type === 'record' ? null : 'var(--state-neutral)';
      }
      var focused = body.contains(document.activeElement);
      while (body.firstChild) body.removeChild(body.firstChild);
      body.appendChild(out);
      tone(st);
      slot.scrollTop = 0;
      keepTarget();
      if (focused) {
        var to = body.querySelector('.radial-insp-back') || slot;
        try { to.focus({ preventScroll: true }); } catch (e) { to.focus(); }
      }
    }
    function say(t) {
      if (!t) return;
      var msg = cfg.announce ? cfg.announce(t, ctx) : cfg.header(t).title;
      if (typeof msg === 'string' && msg) api.announce(msg);
    }

    /* ----------------------------------------------------------- views -- */
    function showNode(id, announce) {
      if (id !== target) showAll = false;
      if (id === null) { view = 'idle'; target = null; origin = null; render(); emitState(); return; }
      view = 'node'; target = id; origin = null;
      render();
      if (announce) say(targetFor(id));
      emitState();
    }
    function openRecord(id, from, cause) {
      if (M.kindOf(id) !== 'record') return false;
      if (id !== target) showAll = false;
      origin = from !== undefined ? from : (origin || api.selection().locked || null);
      view = 'record'; target = id;
      render();
      expand(true, cause || 'reader', false);
      say(targetFor(id));
      emitState();
      return true;
    }
    function closeRecord(cause) {
      if (view !== 'record') return false;
      var back = api.selection().locked;
      origin = null; view = 'idle'; target = null;
      showNode(back || null, false);
      if (cause === 'reader' && back) say(targetFor(back));
      return true;
    }
    function emitState() { api.emit('inspector', { cause: 'module', view: viewName(), target: target }); }
    function viewName() { return view === 'record' ? 'record' : view === 'node' && target ? targetFor(target).type : 'idle'; }

    /* a placed node a membership hides is revealed by clearing the membership: through the facets
       module when it is listed (so its controls stay true), else through the engine. A node hidden
       by policy, or anything that stays hidden, is not reached. */
    function reach(id) {
      if (!api.node(id)) return false;
      if (!api.visible(id) && api.membership.state().active) {
        var f = api.service('facets');
        if (f && f.reset) f.reset('reader'); else api.membership.reset('reader');
      }
      return api.visible(id);
    }
    /* the camera moves only once the node is shown and selected */
    function follow(id) {
      if (M.kindOf(id) === 'record') { openRecord(id, view === 'record' ? origin : (target || null), 'reader'); return; }
      if (!reach(id) || !api.select(id, 'inspector', 'reader')) return;
      api.centerOn(id, Math.max(api.view().k, 1.35));
      keepTarget();
    }

    /* ------------------------------------------------- expand / collapse -- */
    function rendered(e) { return !!e && e.getClientRects().length > 0; }
    function place() {
      set(slot, 'data-radial-inspector', compact ? 'compact' : 'wide');
      /* the open compact sheet is an overlay over the drawing and reserves nothing */
      set(slot, 'data-diagram-fit-edge', compact ? (expanded ? 'none' : 'top') : 'right');
      /* the collapsed pill keeps its size until the next Fit, so it can be reserved above the drawing
         or beside it, and the Fit keeps the larger placement that clears. The wide panel grows with a
         selection, with no refit: a band above it sized as it stands at the Fit would not hold it, so
         it keeps its lane */
      set(slot, 'data-radial-fit-option', compact && !expanded ? 'right' : null);
      set(slot, 'data-radial-expanded', expanded ? 'true' : 'false');
      /* an expanded compact sheet yields to another exclusive panel; the pill takes its room */
      set(slot, 'data-radial-obstacle', compact && expanded ? 'yields' : '');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      var lbl = fill(expanded ? words.collapse : words.expand, { name: words.name });
      toggle.setAttribute('aria-label', lbl); toggle.setAttribute('title', lbl);
      body.hidden = !expanded;
    }
    /* the reader's own toggle refits at the Fit; a selection or a record that opens the panel does
       not refit, and brings the node into the room beside the panel instead */
    /* before the body is hidden, by the reader or by a resize: focus inside it moves to the panel's
       own disclosure (else the panel), which stays shown; focus anywhere else is left alone */
    function handoff() {
      if (!body.contains(document.activeElement)) return;
      var to = rendered(toggle) ? toggle : slot;
      try { to.focus({ preventScroll: true }); } catch (e) { to.focus(); }
    }
    function same(a, b) { return Math.abs(a.k - b.k) < 1e-9 && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6; }
    /* the open panel over the drawing: the view leaves the Fit and the node, if any, is brought into the
       room beside it. On a compact canvas the camera is kept, so that closing the sheet can tell whether
       the reader has moved it since */
    function beside(id, fromFit) {
      var sr = api.slot('stage').getBoundingClientRect(), r = slot.getBoundingClientRect();
      api.reveal(id || null, { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top });
      var v = api.view();
      sheetView = compact ? { k: v.k, x: v.x, y: v.y, fit: !!fromFit } : null;
    }
    /* what the open sheet shows changed (a selection, a record, a reference followed, more rows): the
       selected node stays beside it. A record has no placed mark of its own to bring in */
    function keepTarget() {
      if (!compact || !expanded || probing || destroyed) return;
      var id = api.selection().locked, p = id ? api.project(id) : null;
      if (!p) return;
      var sr = api.slot('stage').getBoundingClientRect(), r = slot.getBoundingClientRect(), x = sr.left + p.x, y = sr.top + p.y, m = 12;
      if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) return;
      beside(id, !!sheetView && sheetView.fit && same(api.view(), sheetView));
    }
    /* a reader's inspection: a selection, a record, or the panel opened with its own toggle */
    function inspecting() { return view === 'record' || !!api.selection().locked || opened; }
    function expand(on, cause, refit, reveal) {
      if (on === expanded) return;
      if (!on) handoff();
      var atFit = api.view().atFit;
      /* closing returns to the Fit when the panel was opened there and the camera is as it left it */
      var back = !on && !!sheetView && sheetView.fit && same(api.view(), sheetView);
      expanded = on;
      if (!on) { opened = false; sheetView = null; }
      place();
      /* the view leaves the Fit before the other panels close or the chrome hears of the change, so
         nothing refits behind it */
      if (refit === false && on) beside(reveal === undefined ? api.selection().locked : reveal, atFit);
      if (on && compact) api.claim('inspector');            /* one exclusive panel at a time */
      api.emit('obstacle', { cause: cause });
      if (refit !== false && cause !== 'fit' && (atFit || back)) api.fit(cause === 'compact' ? 'resize' : cause === 'claim' ? 'reader' : cause);
    }
    on(toggle, 'click', function (ev) {
      ev.stopPropagation();
      if (!expanded) opened = true;
      /* opening the compact sheet never refits: it brings the selected node beside it */
      if (!expanded && compact) expand(true, 'reader', false, api.selection().locked);
      else expand(!expanded, 'reader');
    });
    /* the window or the chrome's arrangement made the canvas compact or wide */
    function arrange() {
      var next = COMPACT.matches || folded;
      if (destroyed || next === compact) return;
      var atFit = api.view().atFit, was = expanded;
      /* the sheet goes as it came: opened at the Fit, with the camera as it left it, the wide panel
         returns to the Fit */
      var back = !next && was && !!sheetView && sheetView.fit && same(api.view(), sheetView);
      compact = next;
      /* a reader's inspection stays open, as the sheet, unless another exclusive panel is open: a resize
         is not a reader opening the sheet, so it yields to that panel, as it does when that panel opens */
      var keep = compact && was && inspecting() && !api.othersOpen('inspector');
      if (compact && was && !keep) handoff();               /* the body hides */
      expanded = compact ? keep : true;                     /* compact folds a panel open only by default; wide shows it */
      if (!expanded) opened = false;
      sheetView = null;
      place();
      if (keep) {
        /* from the Fit the view takes the Fit of the new arrangement and leaves it, with the selected
           node beside the sheet; a view the map made keeps its node beside the sheet too; a camera the
           reader has moved stays where it is, since a resize is not a reader's action */
        if (atFit) { api.fit('resize'); beside(api.selection().locked, true); }
        else if (!api.view().manual) beside(api.selection().locked, false);
        else { var v = api.view(); sheetView = { k: v.k, x: v.x, y: v.y, fit: false }; }
        api.emit('obstacle', { cause: 'resize' });
        return;
      }
      api.emit('obstacle', { cause: 'resize' });
      if (api.view().atFit || back) api.fit('resize');
    }
    if (COMPACT.addEventListener) COMPACT.addEventListener('change', arrange, { signal: signal });
    api.on('arrangement', function (ev) {
      if (destroyed) return;
      folded = ev.arrangement === 'compact';
      var was = compact;
      arrange();
      /* the window made the canvas compact before the chrome settled: a sheet still as the resize left it
         (opened at the Fit, the camera as it left it) takes the settled Fit again */
      if (was === compact && compact && expanded && !!sheetView && sheetView.fit && same(api.view(), sheetView)) {
        api.fit('resize'); beside(api.selection().locked, true);
      }
    });
    /* a size change that keeps the canvas compact (a phone turned): the engine made its view again for
       the new size, and the open sheet keeps the selected node beside it; closing it then returns to the
       Fit when that view was made from one. A camera the reader has moved is not made again */
    api.on('placed', function (ev) {
      if (destroyed || !compact || !expanded || probing) return;
      beside(api.selection().locked, ev.basis === 'fit');
    });
    /* while the chrome measures its wide arrangement, a panel folded only by the chrome stands in its
       wide form, open in its corner, so that the chrome's decision never depends on this panel's folding */
    api.on('probe', function (ev) {
      if (destroyed) return;
      if (ev.arrangement === 'wide') {
        probing = compact && !COMPACT.matches;
        if (!probing) return;
        slot.setAttribute('data-radial-inspector', 'wide');
        slot.setAttribute('data-radial-expanded', 'true');
        slot.setAttribute('data-radial-obstacle', '');
        body.hidden = false;
      } else if (probing) { probing = false; place(); }
    });
    function on(t, type, fn) { t.addEventListener(type, fn, { signal: signal }); }

    on(body, 'click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button') : null;
      if (!b || !body.contains(b)) return;
      ev.stopPropagation();
      if (b.hasAttribute('data-radial-ref')) follow(b.getAttribute('data-radial-ref'));
      else if (b.hasAttribute('data-radial-back')) {
        var o = b.getAttribute('data-radial-back');
        origin = null;
        if (api.visible(o)) { api.select(o, 'inspector', 'reader'); }
        else closeRecord('reader');
      } else if (b.hasAttribute('data-radial-more')) { showAll = true; render(); }
    });
    /* a click inside the panel is the panel's, never the map's */
    on(slot, 'pointerdown', function (ev) { ev.stopPropagation(); });

    /* ------------------------------------------------------------ events -- */
    api.on('select', function (ev) {
      if (destroyed) return;
      if (ev.id === null) {
        /* the reader's own clearing (a tap on empty canvas, Escape) closes a record view too and,
           on a compact canvas, collapses the sheet; a clearing a module makes (a filter that hides
           the selection) leaves an open record and the sheet as they are */
        var own = ev.via === 'pointer' || ev.via === 'keyboard';
        if (view === 'record' && !own) return;
        showNode(null, false);
        if (own && compact && expanded) expand(false, 'reader');
        return;
      }
      showNode(ev.id, true);
      if (!expanded) expand(true, ev.cause === 'load' ? 'load' : 'reader', false, ev.id);
      /* a module that selects may move the camera right after (a search result and an arrival are
         centered on): once it has, the selected node is kept beside the open sheet */
      var id = ev.id;
      Promise.resolve().then(function () { if (api.selection().locked === id) keepTarget(); });
    });
    api.on('preview', function (ev) {
      if (destroyed || view === 'record' || api.selection().locked) return;
      if (ev.id === null) showNode(null, false);
      else { if (ev.id !== target) showAll = false; view = 'node'; target = ev.id; origin = null; render(); }
    });
    api.on('membership', function () {
      if (destroyed) return;
      if (view === 'node' && target && !api.visible(target)) { showNode(null, false); return; }
      if (view !== 'idle') render();
    });
    /* an arrival naming an undrawn record opens its view */
    api.on('arrival', function (ev) {
      if (!destroyed && !ev.resolved && typeof ev.id === 'string' && M.kindOf(ev.id) === 'record') openRecord(ev.id, null, 'load');
    });

    var unregister = api.registerOverlay({ name: 'inspector', side: 'top', element: slot, exclusive: true,
      isOpen: function () { return compact && expanded; },
      dismiss: function (cause) { expand(false, cause === 'claim' ? 'reader' : cause || 'module'); } });
    var unescape = api.escape({ name: 'record', priority: 11,
      isActive: function () { return view === 'record'; },
      dismiss: function () { closeRecord('reader'); } });

    place();
    render();
    var service = { show: function (id) { return id === null ? (showNode(null, false), true) : !!api.node(id) && (api.select(id, 'inspector', 'module'), true); },
                    openRecord: function (id, from) { return openRecord(id, from === undefined ? null : from, 'reader'); },
                    state: function () { return state(); } };
    api.provide('inspector', service);
    function state() { return { view: viewName(), target: target, origin: origin, expanded: expanded, arrangement: compact ? 'compact' : 'wide' }; }

    return {
      state: state,
      openRecord: service.openRecord,
      destroy: function () {
        destroyed = true;
        unregister(); unescape();
        Array.prototype.slice.call(slot.childNodes).forEach(function (c) { if (before.indexOf(c) < 0) slot.removeChild(c); });
        restore.slice().reverse().forEach(function (f) { f(); });
      }
    };
  }

  R.modules.inspector = {
    requires: [],
    hooks: ['header', 'sections'],
    slots: ['inspector'],
    validate: check,
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
