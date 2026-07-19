/* diagrams-fit.js — design-system-ASK shared fit contract (v1, 2026-07-18)

   DS-OWNED SUPPORT FILE. Do not hand-edit in a consumer; re-vendor byte-identical.

   WHY THIS EXISTS
   Every diagram engine independently computed fit from the full canvasWrap and reserved
   no band for the top-corner caption / legend glass panels or the bottom HUD. A wide,
   short figure therefore fit-scaled to width, centred vertically, and rendered its top
   band underneath the panels. The collision is between SVG content and HTML chrome, so
   no SVG bbox check sees it. Five engines carried the same defect because they carried
   the same calculation five times.

   WHAT THIS IS
   A pure measurement + arithmetic function. It measures the visible chrome, computes the
   remaining rectangle, and returns the scale + translation that centre the content in it.

   WHAT THIS IS NOT
   It installs no event handlers; owns no drag / wheel / zoom / resize state; never touches
   the stage, viewport group, or SVG; knows no H / V / SEQ / FLOW data grammar; owns no
   export composition. Each engine keeps its own interaction model and applies the result.

   LEGACY EQUIVALENCE — the binding contract
   With no visible panels both bands are 0 and the result is arithmetically identical to
   that engine's previous formula. Two caller-owned inputs carry the differences between
   engines, because this utility normalizes none of them:
     - `clearanceX/Y` is TOTAL clearance (the value previously subtracted from the
       viewport), not per-side padding. An engine that instead EXPANDED its content by a
       per-side margin expresses that margin as expanded `bounds` with zero clearance.
     - `viewport` overrides the measured border box for engines that historically sized
       themselves from clientWidth/clientHeight rather than getBoundingClientRect().
   Reserving the panel band is the only behavior this file is authorized to change.

   DISTRIBUTION
   Self-contained by convention, like diagrams.css and export-png.js: a byte-identical copy
   lives in each pattern directory so a pattern stays independently copyable. There is no
   cross-directory runtime import and no build step. Load it immediately BEFORE the engine. */
(function () {
  'use strict';

  var DEFAULTS = {
    clearanceX: 80,
    clearanceY: 80,
    maxScale: 1.2,
    gutter: 26,
    topSelector: '.caption, .legend',
    bottomSelector: '.hud',
    minAvailable: 120
  };

  /* A panel counts only if it is actually rendered: display:none, visibility:hidden,
     opacity:0, and zero-area elements are ignored rather than reserving a phantom band. */
  function isVisible(el) {
    if (!el) return false;
    var cs = (el.ownerDocument.defaultView || window).getComputedStyle(el);
    if (!cs) return true;
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    return true;
  }

  /* Panel offsets are always measured RELATIVE TO the wrap's own border box
     (wrapRect.top), but the bottom band is expressed against the caller's chosen
     viewport height — so an engine that owns an integer viewport measurement stays
     internally consistent instead of mixing two coordinate scales. */
  function measureBand(wrap, wrapRect, viewportHeight, selector, edge) {
    if (!selector) return 0;
    var els;
    try { els = wrap.querySelectorAll(selector); } catch (e) { return 0; }
    var band = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!isVisible(el)) continue;
      var r = el.getBoundingClientRect();
      if (!(r.width > 0) || !(r.height > 0)) continue;
      var depth = edge === 'top'
        ? (r.bottom - wrapRect.top)
        : (viewportHeight - (r.top - wrapRect.top));
      if (isFinite(depth) && depth > band) band = depth;
    }
    return band > 0 ? band : 0;
  }

  function num(v, fallback) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  /* compute({ wrap, viewport?:{width,height}, bounds:{minX,minY,maxX,maxY},
               clearanceX, clearanceY, maxScale, gutter, topSelector, bottomSelector })
     -> { scale, tx, ty, topBand, bottomBand } */
  function compute(opts) {
    opts = opts || {};
    var wrap = opts.wrap;
    var maxScale   = num(opts.maxScale,   DEFAULTS.maxScale);
    var clearanceX = num(opts.clearanceX, DEFAULTS.clearanceX);
    var clearanceY = num(opts.clearanceY, DEFAULTS.clearanceY);
    var gutter     = num(opts.gutter,     DEFAULTS.gutter);

    var fallback = { scale: Math.min(1, maxScale), tx: 0, ty: 0, topBand: 0, bottomBand: 0 };
    if (!wrap || typeof wrap.getBoundingClientRect !== 'function') return fallback;

    var b = opts.bounds || {};
    var minX = num(b.minX, 0), minY = num(b.minY, 0);
    var cw = num(b.maxX, 0) - minX;
    var ch = num(b.maxY, 0) - minY;
    if (!(cw > 0) || !(ch > 0)) return fallback;   // degenerate bounds — never NaN out

    var rect = wrap.getBoundingClientRect();

    /* VIEWPORT SIZE IS CALLER-OWNED. Engines historically differ in how they measure
       the canvas: the static engines read getBoundingClientRect() (fractional), the
       interactive spine reads clientWidth/clientHeight (integer, border-box excluded).
       That distinction belongs to each engine, not to this utility — silently picking
       one source for all of them would be an unrelated render-contract change. So the
       caller may supply its own measurement; absent it, the border box is the default. */
    var vp = opts.viewport;
    var availW = (vp && isFinite(vp.width))  ? +vp.width  : rect.width;
    var viewportHeight = (vp && isFinite(vp.height)) ? +vp.height : rect.height;
    if (!(availW > 0) || !(viewportHeight > 0)) return fallback;

    var topBand    = measureBand(wrap, rect, viewportHeight, opts.topSelector    !== undefined ? opts.topSelector    : DEFAULTS.topSelector,    'top');
    var bottomBand = measureBand(wrap, rect, viewportHeight, opts.bottomSelector !== undefined ? opts.bottomSelector : DEFAULTS.bottomSelector, 'bottom');
    if (topBand > 0)    topBand    += gutter;
    if (bottomBand > 0) bottomBand += gutter;

    /* If the chrome would leave no usable room, reserving it would push content out of
       view — worse than the defect. Degrade to legacy full-wrap geometry instead. */
    if (viewportHeight - topBand - bottomBand < DEFAULTS.minAvailable) {
      topBand = 0; bottomBand = 0;
    }

    var availH = viewportHeight - topBand - bottomBand;

    var scale = Math.min((availW - clearanceX) / cw, (availH - clearanceY) / ch, maxScale);
    if (!isFinite(scale) || scale <= 0) scale = Math.min(1, maxScale);

    /* Centre the content box in the available rectangle. Subtracting minX/minY*scale
       supports negative-origin content bounds (FLOW's viewBox origin, the interactive
       spine's layout bounds); with a zero origin these terms vanish and the expression
       reduces exactly to the legacy centring. */
    var tx = (availW - cw * scale) / 2 - minX * scale;
    var ty = topBand + (availH - ch * scale) / 2 - minY * scale;

    return { scale: scale, tx: tx, ty: ty, topBand: topBand, bottomBand: bottomBand };
  }

  window.DIAGRAM_FIT = { compute: compute, VERSION: 1 };
})();
