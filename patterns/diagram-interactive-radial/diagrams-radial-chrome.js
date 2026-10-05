/* diagrams-radial-chrome.js — the chrome module of the interactive radial pattern: it coordinates
   the panels around the map (the caption, the legend) with the HUD. Default panels collapse
   before they collide; a panel the reader opens in compact may overlay the drawing.

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. Optional for an instance: list it as
   mount({ …, modules: ['legend', 'chrome'] }) and declare adapter.chrome.panels. Load it after
   the engine. Its triggers take the shared disclosure grammar, so a page that lists it loads
   surface-panel.css then surface-treatments.css before diagrams-radial.css.

   TWO ARRANGEMENTS, decided by measurement, never by one width query
     WIDE     every panel is shown in its corner, the legend at the right and the caption in the
              slot between the HUD and the legend; the triggers are hidden. It holds only while
              that layout fits: the caption slot is at least CAPTION_MIN wide, starting past the
              HUD at its widest (its selection readout at the most its stylesheet allows, its tier
              readout at the widest word it has shown); the caption laid into it takes at most
              OPEN_SHARE of the canvas height; and the legend's box leaves READ_MIN of it, or all
              of it if shorter, to read. With no caption, the legend must clear the HUD.
     COMPACT  the panels close behind triggers that join the HUD in one control area: beside it
              when the row fits there, directly above it when it does not. At most one panel is
              open. It opens upward from the control area, inside the room between the canvas
              top and that area, scrolls there, and never covers the HUD or the triggers.

   ONE STATE PER PANEL, and who changed it
   - Entering compact closes every panel: a panel open only because wide shows it is not a
     reader's choice. Entering wide shows every panel again and forgets what was set aside.
   - While a compact panel remains open, a resize keeps its scroll position within the
     available scroll range. A panel set aside for insufficient room reopens at the top.
   - When the room above the control area falls below READ_MIN, no panel can be read there: the
     triggers are NOT OFFERED (they leave the display and the tab order, with focus handed to the
     HUD's Fit control), and an open panel is SET ASIDE. When the room returns, the triggers
     return and the set-aside panel reopens by itself.
   - A reader action — Escape anywhere in the host, a selection — forgets the set-aside panel,
     so nothing reopens behind the reader's back. A trigger opening or closing a panel forgets
     it too. A resize is never counted as a reader action.
   Each trigger's aria-expanded and its panel's hidden attribute are set together, here only.

   FIT AND ESCAPE
   In wide, the panels keep the edge the page declares (data-diagram-fit-edge), so the Fit
   reserves them. In compact the trigger row declares the bottom edge and every panel "none":
   an open panel is registered as an overlay. It appears in the Fit report's `covered` when it
   covers the drawing or its names. An explicit Fit dismisses an obstructing panel through this
   module; a non-obstructing panel may remain open. A change to the reserved
   chrome, or to which panel is open, refits only while the view is at Fit, and the refit
   carries what caused it (resize, font, reader); a reader's own pan and zoom are left alone.
   At the Fit, a resize can therefore fit twice in one frame: as the engine sees the new size,
   then as this module has arranged the chrome for it, both with the cause resize.
   Escape closes the open panel (after the chooser, before the selection); focus inside the
   panel returns to its trigger.

   FOCUS moves only when its target would disappear: into the shown panel from a trigger the
   wide arrangement hides, to the trigger from a panel compact closes, to the HUD's Fit control
   when neither is shown.

   OTHER MODULES' PANELS. An element another module places in the canvas and marks
   [data-radial-obstacle] (the inspector, the facets drawer) is an obstacle: in wide, a panel
   that would meet any one sends the arrangement to compact; in compact, the room above the
   control area ends below one that reaches into the panels' lane, unless it is marked "yields":
   an open exclusive overlay that a panel opening here closes, so it takes no room. A compact panel
   opened here is exclusive too: opening it closes the other modules' exclusive overlays. A
   module announces a change of its obstacles with the 'obstacle' event. A module whose panel folds
   with the compact arrangement (the inspector) is measured in its wide form: while this module
   judges the wide arrangement it announces a 'probe' event, { arrangement: 'wide' } before and
   { arrangement: null } after, and such a panel shows itself as it would stand in wide between the
   two. The arrangement therefore never depends on the panel's own folding, and the two settle in
   one step. */
(function (root) {
  'use strict';

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.modules = R.modules || {};

  var EDGE = 18;            // the chrome's inset from the canvas edges (diagrams-radial.css)
  var GUTTER = 18;          // wide: the space between the caption and its neighbors
  var GAP = 8;              // compact: between the control area and an open panel
  var SIDE = 12;            // compact: between the HUD and the triggers beside it
  var CAPTION_MIN = 240;    // wide: the narrowest slot the caption is laid into
  var CAPTION_MAX = 420;    // wide: the caption's widest measure
  var OPEN_SHARE = 1 / 3;   // wide: the caption may take at most this share of the canvas height
  var READ_MIN = 72;        // compact: the room a panel needs to be read
  var LANE_MAX = 560;       // compact: the widest an open panel runs (diagrams-radial.css)
  var SLOTS = ['caption', 'legend'];
  var KEYS = ['panels'];
  var seq = 0;

  function ChromeError(code, detail) {
    var e = new Error('radial mount ' + code + ': ' + detail);
    e.name = 'MountError';
    e.code = code;
    return e;
  }
  function plain(v) { return R.contract.plain(v); }
  function check(cfg) {
    if (!plain(cfg)) throw ChromeError('HOOK_MISSING', 'chrome must be a plain object');
    Object.keys(cfg).forEach(function (k) { if (KEYS.indexOf(k) < 0) throw ChromeError('HOOK_MISSING', 'chrome: unknown key ' + k); });
    var p = cfg.panels;
    if (!Array.isArray(p) || !p.length) throw ChromeError('HOOK_MISSING', 'chrome.panels must be a non-empty array');
    var seen = [];
    for (var i = 0; i < p.length; i++) {
      var x = p[i];
      if (!plain(x)) throw ChromeError('HOOK_MISSING', 'chrome.panels[' + i + '] must be a plain object');
      Object.keys(x).forEach(function (k) { if (k !== 'slot' && k !== 'trigger') throw ChromeError('HOOK_MISSING', 'chrome.panels[' + i + ']: unknown key ' + k); });
      if (SLOTS.indexOf(x.slot) < 0) throw ChromeError('HOOK_MISSING', 'chrome.panels[' + i + '].slot must be caption or legend');
      if (seen.indexOf(x.slot) >= 0) throw ChromeError('HOOK_MISSING', 'chrome.panels: slot ' + x.slot + ' declared twice');
      seen.push(x.slot);
      if (typeof x.trigger !== 'string' || !x.trigger.trim()) throw ChromeError('HOOK_MISSING', 'chrome.panels[' + i + '].trigger must be a non-empty string');
    }
  }

  function rendered(el) { return !!el && el.getClientRects().length > 0; }
  function focusQuietly(el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }

  function mount(api, cfg) {
    var canvas = api.canvas, hud = api.slot('hud');
    var fitControl = hud ? hud.querySelector('[data-radial-control="fit"]') : null;
    var n = ++seq;

    /* every declared panel's slot must exist; nothing is changed before this holds */
    var panels = cfg.panels.map(function (d) {
      var el = api.slot(d.slot);
      if (!el) throw ChromeError('SLOT', 'the chrome module needs [data-radial-slot="' + d.slot + '"]');
      if (!canvas.contains(el)) throw ChromeError('SLOT', 'the ' + d.slot + ' panel must be inside the canvas');
      return { slot: d.slot, label: d.trigger, el: el, edge: el.getAttribute('data-diagram-fit-edge') };
    });
    function panel(slot) { for (var i = 0; i < panels.length; i++) if (panels[i].slot === slot) return panels[i]; return null; }

    /* restore-on-destroy: every attribute and property this module changes on host markup */
    var restore = [], kept = new Map();                     /* element -> the attribute names recorded */
    function attr(el, k, v) { if (v === null) el.removeAttribute(k); else el.setAttribute(k, v); }
    function set(el, k, v) {
      if (!kept.has(el)) kept.set(el, []);
      if (kept.get(el).indexOf(k) < 0) {
        kept.get(el).push(k);
        var old = el.getAttribute(k);
        restore.push(function () { attr(el, k, old); });
      }
      attr(el, k, v);
    }

    /* the trigger row: one controlled trigger per panel, in the shared disclosure grammar */
    var row = document.createElement('div');
    row.className = 'radial-chrome-triggers';
    row.hidden = true;
    panels.forEach(function (p) {
      if (!p.el.id) set(p.el, 'id', 'radial-chrome-' + n + '-' + p.slot);
      set(p.el, 'data-radial-chrome-panel', p.slot);
      var t = document.createElement('button');
      t.type = 'button';
      t.className = 'radial-chrome-trigger surface-disclosure-trigger';
      t.setAttribute('aria-controls', p.el.id);
      t.setAttribute('aria-expanded', 'true');
      var l = document.createElement('span'); l.className = 'surface-disclosure-label'; l.textContent = p.label;
      var ind = document.createElement('span'); ind.className = 'surface-disclosure-indicator'; ind.setAttribute('aria-hidden', 'true');
      ind.textContent = '\u25BC';
      t.appendChild(l); t.appendChild(ind);
      row.appendChild(t);
      p.trigger = t;
    });
    canvas.appendChild(row);
    /* the canvas carries the measured geometry as custom properties, each written literally below;
       its inline style is recorded once and restored through the declaration itself, then the
       attribute: an inline style changed through the CSSOM can otherwise reappear as an empty
       attribute after its removal */
    var cs = canvas.style, styleKept = false;
    function keepStyle() {
      if (styleKept) return;
      styleKept = true;
      var old = canvas.getAttribute('style');
      restore.push(function () { cs.cssText = old || ''; canvas.getAttribute('style'); attr(canvas, 'style', old); });
    }
    function noCaption() { keepStyle(); cs.removeProperty('--radial-caption-left'); cs.removeProperty('--radial-caption-w'); }

    var arrangement = null, open = null, aside = null, offered = true, sig = null, destroyed = false;

    function setOpen(p, on, quiet) {
      if (!on && !quiet && p.el.contains(document.activeElement)) handoff(p);
      p.trigger.setAttribute('aria-expanded', on ? 'true' : 'false');
      set(p.el, 'hidden', on ? null : '');
    }
    function handoff(p) {
      if (rendered(p.trigger)) focusQuietly(p.trigger);
      else if (fitControl && rendered(fitControl)) focusQuietly(fitControl);
    }
    function scrolls(el) { return el.scrollHeight > el.clientHeight + 1; }

    /* The HUD's right edge at its widest, relative to the canvas. Its tier readout counts at the
       widest word it has shown. A newly encountered wider word can change a placement decision,
       but returning to a shorter word cannot shrink that allowance and restart the refit loop.
       With `selection`, the selection readout counts at the widest its stylesheet allows, so a
       newly shown selection never folds the panels away. */
    var tierMax = 0;
    function hudExtent(hr, cr, selection) {
      var w = hr.width, gap = parseFloat(getComputedStyle(hud).columnGap) || 0;
      var tier = hud.querySelector('[data-radial-readout="tier"]');
      if (tier && rendered(tier)) { var tw = tier.getBoundingClientRect().width; if (tw > tierMax) tierMax = tw; w += tierMax - tw; }
      var sel = selection ? hud.querySelector('[data-radial-readout="selection"]') : null;
      var mx = sel ? parseFloat(getComputedStyle(sel).maxWidth) : NaN;
      if (isFinite(mx)) w += rendered(sel) ? Math.max(0, mx - sel.getBoundingClientRect().width) : mx + gap;
      return hr.left - cr.left + w;
    }

    /* the other modules' obstacles, rendered. In wide every one counts: no panel opens there to close
       it. In compact one that yields takes no room, since the panel that opens closes it. */
    function obstacles(yielding) {
      return Array.prototype.filter.call(canvas.querySelectorAll('[data-radial-obstacle]'), function (e) {
        return (yielding || e.getAttribute('data-radial-obstacle') !== 'yields') && !e.hidden && rendered(e);
      }).map(function (e) { return e.getBoundingClientRect(); });
    }
    function meets(a, b) { return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; }

    /* WIDE, laid out and measured: does every panel fit beside the others and the HUD? */
    function layWide() {
      set(canvas, 'data-radial-chrome', 'wide');
      row.hidden = true;
      panels.forEach(function (p) { set(p.el, 'hidden', null); });
      var cr = canvas.getBoundingClientRect(), W = cr.width, H = cr.height;
      var hr = hud && rendered(hud) ? hud.getBoundingClientRect() : null;
      var hudRight = hr ? hudExtent(hr, cr, true) : 0;
      var legend = panel('legend'), caption = panel('caption');
      var lw = legend ? legend.el.getBoundingClientRect().width : 0;
      var slotL = Math.max(EDGE, hudRight) + GUTTER;
      /* a legend kept in its corner must leave enough of itself to read */
      if (legend && legend.el.clientHeight < Math.min(READ_MIN, legend.el.scrollHeight)) return false;
      var slotR = W - EDGE - (legend ? lw + GUTTER : 0);
      var obs = obstacles(true);
      function clear() { return panels.every(function (p) { var r = p.el.getBoundingClientRect(); return !obs.some(function (o) { return meets(r, o); }); }); }
      if (!caption) {
        noCaption();
        return (!legend || W - EDGE - lw >= hudRight + GUTTER) && clear();
      }
      var slotW = slotR - slotL;
      if (slotW < CAPTION_MIN) return false;
      var w = Math.min(CAPTION_MAX, slotW);
      keepStyle();
      cs.setProperty('--radial-caption-left', Math.round(slotL + (slotW - w) / 2) + 'px');
      cs.setProperty('--radial-caption-w', Math.round(w) + 'px');
      return caption.el.getBoundingClientRect().height <= H * OPEN_SHARE && clear();
    }

    /* COMPACT geometry: the control area beside or above the HUD, and the room above it */
    function place() {
      var cr = canvas.getBoundingClientRect();
      var hr = hud && rendered(hud) ? hud.getBoundingClientRect() : null;
      /* every trigger offered while measuring: the room is judged with the row as the reader would get it */
      row.hidden = false;
      panels.forEach(function (p) { p.trigger.hidden = false; });
      /* measured at the edge inset, so its width is its own, not what an earlier placement left it */
      keepStyle();
      cs.setProperty('--radial-row-left', EDGE + 'px');
      var rw = row.getBoundingClientRect().width;
      var beside = !!hr && cr.left + hudExtent(hr, cr, false) + SIDE + rw <= cr.right - EDGE;
      var left = !hr ? EDGE : beside ? hr.right - cr.left + SIDE : EDGE;
      var bottom = !hr ? EDGE : beside ? cr.bottom - hr.bottom : cr.bottom - hr.top + GAP;
      cs.setProperty('--radial-row-left', Math.round(left) + 'px');
      cs.setProperty('--radial-row-bottom', Math.round(bottom) + 'px');
      if (beside) cs.setProperty('--radial-row-h', Math.round(hr.height) + 'px'); else cs.removeProperty('--radial-row-h');
      set(canvas, 'data-radial-chrome-row', !hr ? 'alone' : beside ? 'beside' : 'above');
      var rr = row.getBoundingClientRect();
      var floor = Math.min(rr.top, hr ? hr.top : cr.bottom - EDGE);
      /* the room begins below an obstacle that reaches into the panels' lane from above */
      var ceil = cr.top + EDGE, lane = { left: cr.left + EDGE, right: cr.left + EDGE + Math.min(cr.width - 2 * EDGE, LANE_MAX) };
      obstacles().forEach(function (o) {
        if (o.left < lane.right && lane.left < o.right && o.top < floor && o.bottom + GAP > ceil) ceil = o.bottom + GAP;
      });
      var room = Math.floor(floor - GAP - ceil);
      cs.setProperty('--radial-panel-bottom', Math.round(cr.bottom - floor + GAP) + 'px');
      cs.setProperty('--radial-panel-max', Math.max(0, room) + 'px');
      return room;
    }
    /* the triggers leave the display and the tab order together when the room is too small to read a panel */
    function offer() { panels.forEach(function (p) { p.trigger.hidden = !offered; }); row.hidden = !offered; }
    function unplace() {
      ['--radial-row-left', '--radial-row-bottom', '--radial-row-h', '--radial-panel-bottom', '--radial-panel-max']
        .forEach(function (k) { keepStyle(); cs.removeProperty(k); });
      set(canvas, 'data-radial-chrome-row', null);
    }
    function edges(compact) {
      panels.forEach(function (p) { set(p.el, 'data-diagram-fit-edge', compact ? 'none' : p.edge); });
      if (compact) row.setAttribute('data-diagram-fit-edge', 'bottom'); else row.removeAttribute('data-diagram-fit-edge');
    }

    /* everything the Fit and its report depend on; a change refits, at Fit only. The open panel is
       an overlay and reserves nothing, so opening or closing one moves nothing: the refit keeps the
       Fit's report of what covers the drawing current */
    function fitSignature() {
      var cr = canvas.getBoundingClientRect();
      return [arrangement, offered, open ? open.slot : '', canvas.getAttribute('data-radial-chrome-row'),
              canvas.style.getPropertyValue('--radial-row-left'), canvas.style.getPropertyValue('--radial-row-bottom'),
              canvas.style.getPropertyValue('--radial-caption-left'), canvas.style.getPropertyValue('--radial-caption-w'),
              Math.round(cr.width), Math.round(cr.height)].join('|');
    }
    /* the refit carries what caused it; under an explicit Fit the engine fits next, so none here */
    function settle(cause, before) {
      if (arrangement !== before) api.emit('arrangement', { arrangement: arrangement, cause: cause });
      var s = fitSignature();
      if (s === sig) return;
      var first = sig === null; sig = s;
      if (!first && cause !== 'fit' && api.view().atFit) api.fit(cause);
    }
    function keepFocus(fa) {
      if (!fa || fa === document.body || !document.contains(fa) || fa === document.activeElement && rendered(fa)) return;
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i];
        if (fa === p.trigger) { if (!p.el.hidden && rendered(p.el)) focusQuietly(p.el); else handoff(p); return; }
        if (p.el.contains(fa)) { handoff(p); return; }
      }
    }

    function update(cause) {
      if (destroyed) return;
      var cr = canvas.getBoundingClientRect();
      if (!(cr.width > 0 && cr.height > 0)) return;
      var fa = document.activeElement, before = arrangement;
      var top = open ? open.el.scrollTop : 0;
      /* the wide arrangement is judged with every other module's panel as it would stand in wide:
         a panel that folds with this arrangement (the inspector) shows its wide form while this
         measures, so the decision never depends on what that panel did because of it */
      api.emit('probe', { arrangement: 'wide' });
      var wide = layWide();
      api.emit('probe', { arrangement: null });
      if (wide) {
        arrangement = 'wide';
        unplace(); edges(false);
        row.hidden = true;
        panels.forEach(function (p) {
          p.trigger.setAttribute('aria-expanded', 'true');
          set(p.el, 'hidden', null);
          set(p.el, 'tabindex', scrolls(p.el) ? '0' : '-1');
        });
        open = null; aside = null; offered = true;
      } else {
        arrangement = 'compact';
        set(canvas, 'data-radial-chrome', 'compact');
        noCaption();
        edges(true);
        if (before !== 'compact') { open = null; aside = null; }   /* entering compact closes every panel */
        /* the one state, applied again after the wide measurement showed every panel; focus is
           settled once, at the end, so it never passes through a control on its way */
        panels.forEach(function (p) { setOpen(p, p === open, true); set(p.el, 'tabindex', '0'); });
        var room = place();
        offered = room >= READ_MIN;
        if (!offered && open) { aside = open; setOpen(open, false, true); open = null; }
        else if (offered && aside) { open = aside; aside = null; setOpen(open, true); }
        offer();
        if (open) open.el.scrollTop = top;
      }
      keepFocus(fa);
      settle(cause, before);
    }

    function toggle(p) {
      if (arrangement !== 'compact' || !offered) return;
      var on = open !== p;
      if (open && open !== p) setOpen(open, false);
      if (on) api.claim(p.slot);                          /* one exclusive panel at a time */
      setOpen(p, on);
      open = on ? p : null;
      aside = null;                                       /* a reader action wins over automatic state */
      place(); offer();
      settle('reader', arrangement);
    }
    function close(p, cause) {
      if (open !== p) return false;
      setOpen(p, false); open = null; aside = null;
      place(); offer();
      settle(cause, arrangement);
      return true;
    }

    var on = function (t, type, fn) { t.addEventListener(type, fn, { signal: api.signal }); };
    panels.forEach(function (p) { on(p.trigger, 'click', function (ev) { ev.stopPropagation(); toggle(p); }); });
    /* Escape anywhere in the host forgets a set-aside panel: the reader's way to say "leave it" while
       its trigger is not offered. It consumes nothing, so the same key still peels its layer. */
    on(api.host, 'keydown', function (ev) { if (ev.key === 'Escape' && aside && !open) aside = null; });

    var unregister = panels.map(function (p) {
      return api.registerOverlay({ name: p.slot, side: 'bottom', element: p.el, exclusive: true,
        isOpen: function () { return arrangement === 'compact' && open === p; },
        /* closed for another module's panel: the reader's own action */
        dismiss: function (cause) { close(p, cause === 'claim' ? 'reader' : cause || 'module'); } });
    });
    var unescape = api.escape({ name: 'chrome', priority: 20,
      isActive: function () { return arrangement === 'compact' && !!open; },
      dismiss: function () {
        var p = open, inside = p.el.contains(document.activeElement) || document.activeElement === p.trigger;
        close(p, 'reader');
        if (inside && rendered(p.trigger)) focusQuietly(p.trigger);
      } });

    /* a reader's selection forgets a set-aside panel, and closes the open one if the node is under it */
    api.on('select', function (ev) {
      if (destroyed || ev.cause !== 'reader') return;
      aside = null;
      if (!open || ev.id === null) return;
      var pt = api.project(ev.id); if (!pt) return;
      var sr = api.slot('stage').getBoundingClientRect(), r = open.el.getBoundingClientRect();
      var x = sr.left + pt.x, y = sr.top + pt.y;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) close(open, 'reader');
    });

    /* another module's obstacle changed (the inspector expanded, the drawer opened) */
    api.on('obstacle', function (ev) { update(ev.cause || 'module'); });

    /* re-measure on any change of the canvas or the HUD, and when the webfonts land */
    var ro = null;
    if (root.ResizeObserver) {
      ro = new root.ResizeObserver(function () { update('resize'); });
      ro.observe(canvas);
      if (hud) ro.observe(hud);
    } else on(root, 'resize', function () { update('resize'); });
    if (document.fonts && document.fonts.addEventListener) on(document.fonts, 'loadingdone', function () { update('font'); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { update('font'); }).catch(function () {});

    update('load');

    return {
      state: function () {
        return { arrangement: arrangement, open: open ? open.slot : null, offered: offered, setAside: aside ? aside.slot : null };
      },
      update: function () { update('module'); },
      destroy: function () {
        destroyed = true;
        if (ro) ro.disconnect();
        unregister.forEach(function (u) { u(); });
        unescape();
        if (row.parentNode) row.parentNode.removeChild(row);
        restore.slice().reverse().forEach(function (f) { f(); });
      }
    };
  }

  R.modules.chrome = {
    requires: [],
    hooks: ['panels'],
    slots: [],
    validate: check,
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
