/* diagrams-radial-export.js — the export module of the interactive radial pattern: a page plate and
   a diagram plate, each one SVG built from the drawn world, the label solver at a fixed tier and
   the live stylesheet's computed rules, then rasterized to PNG.

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. Optional for an instance: list it as
   mount({ …, modules: [ …, 'export'] }) and declare adapter.export. Load it after the engine (and
   after the legend and chrome modules when they are listed). With fonts 'carrier' (the default),
   load the foundation's fonts-embedded.js before it.

   ADAPTER
     export = { filenameBase, profiles: { page?, diagram? }, plateLines?, mark?, fonts?, header?, shapeKey? }
     profile = true | { size? | longEdge?, scale?, detail?, legend?, caption?, lines? }
     shapeKey = [[shape, name], …]   the page plate's shape group, in place of one row per kind

   PLATES ARE INDEPENDENT OF THE SCREEN. A plate never reads or changes the reader's view,
   selection, preview, focus, membership, open panels or label deferral. It copies the drawn world
   in the neutral state (no selection, every member, drawn-always relations on, drawn-on-selection
   relations off), fits it on its own, and solves its names with the pure label solver at the
   profile's tier. The same page state gives the same SVG string, byte for byte.

   STYLES ARE READ, NOT RESTATED, AND READ AT THE CLICK. The plate's one <style> holds the
   export-only font faces, the theme tokens resolved at the click, and one rule per styled element
   signature, written from the computed style of a temporary probe of that signature inside the
   live drawing, also at the click: everything the plate takes from the page is one snapshot taken
   before the first wait, so a theme change while the fonts load reaches neither the plate nor its
   filename. The page chrome (header, legend column, caption, plate lines) is the owner's own plate
   design.

   FAILS CLOSED. A missing font carrier, a font that does not apply, a required mark that is not
   displayed, a chrome text outside the plate, overlapping chrome blocks, a name outside its
   label area, or an element whose style was not read at the click aborts the export with a brief
   reason; the control that started it says so for five seconds. Registered faces
   and offscreen nodes never outlive a run. */
(function (root) {
  'use strict';

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.modules = R.modules || {};
  var NS = 'http://www.w3.org/2000/svg';

  /* the plate geometry, in virtual units: a plate is drawn on a canvas `scale` times smaller than
     its pixels */
  var G = { head: 116, foot: 244, pad: 64, legendW: 330, legendGap: 44, legendTop: 142, gutterX: 190, gutterY: 40,
            captionGap: 30, captionLead: 21, linesUp: 74, lineStep: 18, lines: 4,
            markY: 26, markH: 34, markGap: 20, titleY: 46, subY: 70, stampY: 44, canonY: 68, ruleY: 98 };
  var MAX_PX = 16384, FAIL_MS = 5000, REVOKE_MS = 30000;
  var KEYS = ['filenameBase', 'profiles', 'plateLines', 'mark', 'fonts', 'header', 'shapeKey'];
  var SHAPE_NAMES = ['circle', 'square', 'diamond', 'hex', 'tri', 'ring'];
  var PROFILE_KEYS = { page: ['size', 'scale', 'detail', 'legend', 'caption', 'lines'], diagram: ['longEdge', 'scale', 'detail'] };
  var HEADER_KEYS = ['title', 'subtitle', 'stamp', 'canonical'];
  var FAMILY = { sans: 'RadialExport Sans', mono: 'RadialExport Mono' };
  var NOT_A_FAMILY = 'RadialExportNotAFamily';
  var WORD = { page: 'PNG page', diagram: 'PNG diagram', failed: 'export failed', failure: 'PNG export failed \u2014 ',
               ready: 'PNG export ready' };
  var WHY = { carrier: 'font carrier missing', fetch: 'font fetch failed', applied: 'export fonts not applied',
              mark: 'no mark is displayed for this theme', image: 'mark image unavailable', markOut: 'mark outside the plate',
              tokens: 'theme tokens missing', lines: 'plate lines must be strings', chrome: 'chrome text outside the plate',
              overlap: 'chrome blocks overlap', label: 'label outside the label area', raster: 'raster failed',
              busy: 'export busy', stopped: 'export stopped', profile: 'no such profile',
              capture: 'plate style not captured at the click' };
  /* the state the screen paints and a plate never shows */
  var STATE = ['is-selected', 'is-near', 'is-dim', 'is-out', 'is-on'];
  /* the computed properties a probe reports, by kind of element */
  var GROUP = ['opacity'];
  var SHAPE = ('fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset ' +
               'stroke-linecap stroke-linejoin stroke-miterlimit opacity paint-order vector-effect').split(' ');
  var TEXT = SHAPE.concat(('font-size font-style font-weight font-stretch letter-spacing word-spacing text-transform ' +
                           'text-decoration-line font-kerning font-variant-ligatures font-variant-numeric').split(' '));
  var SHAPES = ['path', 'circle', 'rect', 'polygon', 'polyline', 'line', 'ellipse'];
  /* a property the engine also writes as an attribute is a rule only where the stylesheet decides it */
  var ANCHOR = [['text-anchor', 'start', 'end'], ['dominant-baseline', 'auto', 'hanging']];
  var SENTINEL = 'rgb(1, 2, 3)';
  /* the plate chrome: the owner's own design, in the export families */
  var CHROME = [
    ['mark', 'sans', 26, 500, 'fg-1'], ['title', 'sans', 30, 500, 'fg-1', '-0.3px'], ['subtitle', 'mono', 14, 400, 'fg-2'],
    ['stamp', 'mono', 13, 400, 'fg-1'], ['canonical', 'mono', 12, 400, 'fg-2'], ['heading', 'mono', 11, 500, 'fg-2', '1.76px'],
    ['label', 'sans', 15, 400, 'fg-1'], ['meaning', 'sans', 12.5, 400, 'fg-2'], ['bound', 'sans', 13, 400, 'fg-2'],
    ['caption', 'sans', 15, 400, 'fg-2'], ['line', 'mono', 12, 400, 'fg-2']];

  function ExportError(detail) {                                /* a mount-time error, as the legend's */
    var e = new Error('radial mount HOOK_MISSING: ' + detail);
    e.name = 'MountError';
    e.code = 'HOOK_MISSING';
    return e;
  }
  function fail(reason) {                                       /* a run-time failure, with its brief reason */
    var e = new Error('radial export: ' + reason);
    e.reason = reason;
    return e;
  }
  function plain(v) { return R.contract.plain(v); }
  function given(o, k) { return Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined; }
  function whole(v, lo, hi) { return Number.isInteger(v) && v >= lo && v <= hi; }
  function closed(o, keys, where) {
    Object.keys(o).forEach(function (k) { if (keys.indexOf(k) < 0) throw ExportError(where + ': unknown key ' + k); });
  }

  /* --------------------------------------------------------------- validate -- */
  function checkProfile(name, v) {
    var at = 'export.profiles.' + name;
    if (v === true) return;
    if (!plain(v)) throw ExportError(at + ' must be true or a plain object');
    closed(v, PROFILE_KEYS[name], at);
    if (given(v, 'size') && !(Array.isArray(v.size) && v.size.length === 2 && whole(v.size[0], 64, MAX_PX) && whole(v.size[1], 64, MAX_PX)))
      throw ExportError(at + '.size must be [width, height] in whole pixels');
    if (given(v, 'longEdge') && !whole(v.longEdge, 64, MAX_PX)) throw ExportError(at + '.longEdge must be whole pixels');
    if (given(v, 'scale') && !(typeof v.scale === 'number' && isFinite(v.scale) && v.scale > 0 && v.scale <= 8))
      throw ExportError(at + '.scale must be a number above 0');
    if (given(v, 'detail') && !whole(v.detail, 0, 1e6)) throw ExportError(at + '.detail must be a tier index');
    ['legend', 'caption', 'lines'].forEach(function (k) {
      if (given(v, k) && typeof v[k] !== 'boolean') throw ExportError(at + '.' + k + ' must be a boolean');
    });
  }
  function check(cfg) {
    if (!plain(cfg)) throw ExportError('export must be a plain object');
    closed(cfg, KEYS, 'export');
    if (typeof cfg.filenameBase !== 'string' || !/^[a-z0-9-]+$/.test(cfg.filenameBase))
      throw ExportError('export.filenameBase must match [a-z0-9-]+');
    var p = cfg.profiles;
    if (!plain(p)) throw ExportError('export.profiles must be a plain object');
    closed(p, ['page', 'diagram'], 'export.profiles');
    if (!given(p, 'page') && !given(p, 'diagram')) throw ExportError('export.profiles must declare page or diagram');
    ['page', 'diagram'].forEach(function (k) { if (given(p, k)) checkProfile(k, p[k]); });
    if (given(cfg, 'plateLines') && typeof cfg.plateLines !== 'function') throw ExportError('export.plateLines must be a function');
    if (given(cfg, 'mark') && cfg.mark !== 'required' && cfg.mark !== 'none') throw ExportError('export.mark must be required or none');
    if (given(cfg, 'fonts') && cfg.fonts !== 'carrier') {
      if (!plain(cfg.fonts)) throw ExportError('export.fonts must be carrier or { sans, mono }');
      closed(cfg.fonts, ['sans', 'mono'], 'export.fonts');
      ['sans', 'mono'].forEach(function (k) {
        if (typeof cfg.fonts[k] !== 'string' || !cfg.fonts[k]) throw ExportError('export.fonts.' + k + ' must be a url');
      });
    }
    if (given(cfg, 'header')) {
      if (!plain(cfg.header)) throw ExportError('export.header must be a plain object');
      closed(cfg.header, HEADER_KEYS, 'export.header');
      HEADER_KEYS.forEach(function (k) {
        if (given(cfg.header, k) && typeof cfg.header[k] !== 'string') throw ExportError('export.header.' + k + ' must be a string');
      });
    }
    /* the plate's shape key: [shape, name] pairs drawn in place of one row per declared kind */
    if (given(cfg, 'shapeKey')) {
      var sk = cfg.shapeKey;
      if (!Array.isArray(sk) || !sk.length) throw ExportError('export.shapeKey must be a non-empty array of [shape, name] pairs');
      for (var i = 0; i < sk.length; i++) {
        if (!(i in sk) || !Array.isArray(sk[i]) || sk[i].length !== 2 || SHAPE_NAMES.indexOf(sk[i][0]) < 0 ||
            typeof sk[i][1] !== 'string' || !sk[i][1].trim())
          throw ExportError('export.shapeKey[' + i + '] must be [shape, name] with a declared shape and a non-empty name');
      }
    }
  }

  /* ---------------------------------------------------------------- helpers -- */
  function el(n, a) {
    var e = document.createElementNS(NS, n);
    if (a) for (var k in a) if (a[k] !== null && a[k] !== undefined) e.setAttribute(k, a[k]);
    return e;
  }
  function num(v) { return String(Math.round(v * 1e4) / 1e4); }
  function tokens(e) { var c = e.getAttribute('class'); return c ? c.split(/\s+/).filter(Boolean) : []; }
  function firstFamily(list) { return String(list || '').split(',')[0].trim().replace(/^[\x22\x27]|[\x22\x27]$/g, ''); }
  function b64ToBytes(b64) {
    var s = atob(b64), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out.buffer;
  }
  function bytesToB64(buf) {
    var bytes = new Uint8Array(buf), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  /* a font's container, from its own first bytes */
  function formatOf(buf) {
    var b = new Uint8Array(buf, 0, Math.min(4, buf.byteLength)), sig = String.fromCharCode.apply(null, b);
    if (sig === 'wOF2') return ['woff2', 'font/woff2'];
    if (sig === 'wOFF') return ['woff', 'font/woff'];
    if (sig === 'OTTO') return ['opentype', 'font/otf'];
    return ['truetype', 'font/ttf'];
  }
  function box(r, o, s) { return { l: (r.left - o.left) * s, t: (r.top - o.top) * s, r: (r.right - o.left) * s, b: (r.bottom - o.top) * s }; }
  function inside(b, x0, y0, x1, y1) { return b.l >= x0 - 1 && b.t >= y0 - 1 && b.r <= x1 + 1 && b.b <= y1 + 1; }
  function meets(a, b) { return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b; }
  function readAsDataUrl(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsDataURL(blob);
    });
  }

  /* ------------------------------------------------------------------ mount -- */
  function mount(api, cfg) {
    var model = api.model, L = api.layout, LC = api.labelsConfig();
    var hdr = given(cfg, 'header') ? cfg.header : {};
    var markRule = given(cfg, 'mark') ? cfg.mark : 'none';
    var fontsCfg = given(cfg, 'fonts') ? cfg.fonts : 'carrier';

    /* the profiles, settled against this instance's tiers and layout */
    var profiles = {};
    ['page', 'diagram'].forEach(function (name) {
      if (!given(cfg.profiles, name)) return;
      var v = cfg.profiles[name] === true ? {} : cfg.profiles[name];
      var P = { name: name, scale: given(v, 'scale') ? v.scale : 2 };
      if (given(v, 'detail')) {
        if (v.detail >= LC.tiers.length) throw ExportError('export.profiles.' + name + '.detail names no tier');
        P.detail = v.detail;
      } else P.detail = Math.min(1, LC.tiers.length - 1);
      P.tier = LC.tiers[P.detail];
      if (name === 'page') {
        var size = given(v, 'size') ? v.size : [3840, 2880];
        P.width = size[0]; P.height = size[1];
        P.legend = !given(v, 'legend') || v.legend;
        P.caption = !given(v, 'caption') || v.caption;
        P.lines = !given(v, 'lines') || v.lines;
      } else {
        var b = L.bounds, le = given(v, 'longEdge') ? v.longEdge : 3840;
        if (b.w >= b.h) { P.width = le; P.height = Math.max(1, Math.round(le * b.h / b.w)); }
        else { P.height = le; P.width = Math.max(1, Math.round(le * b.w / b.h)); }
      }
      P.vw = P.width / P.scale; P.vh = P.height / P.scale;
      var fa = figureArea(P, P.legend);
      if (fa.w - 2 * G.gutterX < 1 || fa.h - 2 * G.gutterY < 1) throw ExportError('export.profiles.' + name + ' leaves no figure area');
      profiles[name] = P;
    });
    function figureArea(P, legend) {
      if (P.name !== 'page') return { x: 0, y: 0, w: P.vw, h: P.vh };
      return { x: G.pad, y: G.head, w: P.vw - 2 * G.pad - (legend ? G.legendW + G.legendGap : 0), h: P.vh - G.head - G.foot };
    }

    /* ------------------------------------------------------------ the run -- */
    var busy = false, last = null, failure = null, job = null, dead = false;
    var timers = [], urls = [];
    function alive(j) { if (dead || j.stopped) throw fail(WHY.stopped); }
    function dispose(j) {
      j.added.forEach(function (f) { try { document.fonts.delete(f); } catch (e) { /* already gone */ } });
      j.added = [];
      if (j.off && j.off.parentNode) j.off.parentNode.removeChild(j.off);
      j.off = null;
    }
    function themeNow() {
      var t = document.documentElement.getAttribute('data-theme');
      if (t === 'dark' || t === 'light') return t;
      return root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function filenameOf(P, theme) {
      return cfg.filenameBase + '-' + (P.name === 'page' ? 'page-' + P.width + 'x' + P.height : 'diagram') + '-' + theme + '.png';
    }

    /* the export families: registered for measurement, embedded for the raster */
    async function prepareFonts(j) {
      var cs = getComputedStyle(document.documentElement), src = {};
      if (fontsCfg === 'carrier') {
        var c = root.DSA_EMBEDDED_FONTS;
        if (!Array.isArray(c) || !c.length) throw fail(WHY.carrier);
        ['sans', 'mono'].forEach(function (k) {
          var want = firstFamily(cs.getPropertyValue('--font-' + k));
          var hit = c.filter(function (f) {
            return f && typeof f.b64 === 'string' && f.b64 && firstFamily(f.family) === want && (f.style || 'normal') === 'normal';
          })[0];
          if (!want || !hit) throw fail(WHY.carrier);
          src[k] = { bytes: b64ToBytes(hit.b64), b64: hit.b64, weight: hit.weight || 'normal' };
        });
      } else {
        var href = { sans: new URL(fontsCfg.sans, document.baseURI).href, mono: new URL(fontsCfg.mono, document.baseURI).href };
        for (var i = 0; i < 2; i++) {
          var k = i ? 'mono' : 'sans', resp;
          try { resp = await fetch(href[k]); } catch (e) { throw fail(WHY.fetch); }
          alive(j);
          if (!resp.ok) throw fail(WHY.fetch);
          var buf = await resp.arrayBuffer();
          alive(j);
          src[k] = { bytes: buf, b64: bytesToB64(buf), weight: '100 900' };
        }
      }
      var css = '';
      for (var n = 0; n < 2; n++) {
        var key = n ? 'mono' : 'sans', s = src[key], fmt = formatOf(s.bytes);
        var face = new FontFace(FAMILY[key], s.bytes, { style: 'normal', weight: s.weight, display: 'block' });
        try { await face.load(); } catch (e) { throw fail(WHY.applied); }
        alive(j);
        /* added once loaded, so the document's font set reports no load the screen would answer */
        document.fonts.add(face);
        j.added.push(face);
        css += '@font-face{font-family:"' + FAMILY[key] + '";font-style:normal;font-weight:' + s.weight +
               ';font-display:block;src:url(data:' + fmt[1] + ';base64,' + s.b64 + ') format("' + fmt[0] + '")}';
      }
      /* the positive control: each export family measures unlike a family that does not exist */
      var cx = document.createElement('canvas').getContext('2d'), probe = 'Width mark 0 1 label';
      ['sans', 'mono'].forEach(function (key) {
        cx.font = '400 48px "' + FAMILY[key] + '"';
        var a = cx.measureText(probe).width;
        cx.font = '400 48px "' + NOT_A_FAMILY + '"';
        if (!(a > 0) || Math.abs(a - cx.measureText(probe).width) < 0.5) throw fail(WHY.applied);
      });
      return css;
    }

    /* the theme tokens, resolved now, as custom properties on the plate's root */
    function tokensRule() {
      var cs = getComputedStyle(document.documentElement), roles = ['neutral'], out = [];
      model.states.forEach(function (s, role) { if (roles.indexOf(role) < 0) roles.push(role); });
      L.nodes.forEach(function (n) { if (n.state && roles.indexOf(n.state) < 0) roles.push(n.state); });
      ['--fg-1', '--fg-2', '--fg-3', '--bg-from', '--bg-to'].concat(roles.map(function (r) { return '--state-' + r; })).forEach(function (t) {
        var v = cs.getPropertyValue(t).trim();
        if (!v) throw fail(WHY.tokens);
        out.push(t + ':' + v);
      });
      return '.radial-export-plate{' + out.join(';') + '}';
    }
    function chromeRules() {
      return CHROME.map(function (c) {
        return '.radial-plate-' + c[0] + '{font-family:"' + FAMILY[c[1]] + '";font-size:' + c[2] + 'px;font-weight:' + c[3] +
               ';fill:var(--' + c[4] + ')' + (c[5] ? ';letter-spacing:' + c[5] : '') + '}';
      }).join('') +
        '.radial-plate-strong{font-weight:600;fill:var(--fg-1)}' +
        '.radial-plate-rule{stroke:var(--fg-3);stroke-width:1}' +
        '.radial-plate-glyph{fill:var(--fg-1);fill-opacity:0.15;stroke:var(--fg-1);stroke-width:1.3}' +
        '.radial-plate-chip{fill:var(--fg-1);fill-opacity:1;stroke:none}';
    }

    /* every styled element signature of a plate, in document order: its element, its classes, its
       nearest classed context and whether it lies in the drawn world */
    function signatures(svg) {
      var out = [], seen = new Set();
      (function walk(e, world, anc) {
        Array.prototype.forEach.call(e.children, function (c) {
          var t = tokens(c), tag = c.localName;
          if (t.some(function (x) { return x.indexOf('radial-plate') === 0; })) { walk(c, world, null); return; }
          var own = t.some(function (x) { return x.indexOf('radial-') === 0; });
          if ((own || (anc && !t.length)) && (tag === 'g' || tag === 'text' || SHAPES.indexOf(tag) >= 0)) {
            var s = { world: world, anc: anc, tag: tag, tokens: t };
            var key = JSON.stringify([s.world, s.anc, s.tag, s.tokens]);
            if (!seen.has(key)) { seen.add(key); out.push(s); }
          }
          var isWorld = t.indexOf('radial-world') >= 0;
          walk(c, world || isWorld, isWorld ? null : (t.length ? { tag: tag, tokens: t } : anc));
        });
      })(svg, false, null);
      return out;
    }
    function selectorOf(s) {
      function dots(t) { return t.map(function (x) { return '.' + CSS.escape(x); }).join(''); }
      return (s.world ? '.radial-world ' : '') + (s.anc ? s.anc.tag + dots(s.anc.tokens) + ' ' : '') + s.tag + dots(s.tokens);
    }
    function sigKey(s) { return JSON.stringify([s.world, s.anc, s.tag, s.tokens]); }
    /* one rule per signature, from a temporary probe of it inside the live drawing, keyed by
       signature: read once, at the click */
    function probedRules(sigs) {
      var live = api.world().svg, rules = new Map();
      var mono = el('text', { style: 'font-family: var(--font-mono)' });
      live.appendChild(mono);
      var monoFamily = getComputedStyle(mono).fontFamily;
      live.removeChild(mono);
      sigs.forEach(function (s) {
        var top = el('g', s.world ? { 'class': 'radial-world' } : null), parent = top;
        top.style.setProperty('--st', SENTINEL);
        if (s.world) { parent = el('g'); top.appendChild(parent); }
        if (s.anc) { var a = el(s.anc.tag, { 'class': s.anc.tokens.join(' ') }); parent.appendChild(a); parent = a; }
        var e = el(s.tag, s.tokens.length ? { 'class': s.tokens.join(' ') } : null);
        parent.appendChild(e);
        live.appendChild(top);
        try {
          var cs = getComputedStyle(e), out = [];
          (s.tag === 'g' ? GROUP : s.tag === 'text' ? TEXT : SHAPE).forEach(function (p) {
            var v = cs.getPropertyValue(p).trim();
            if (v === SENTINEL) v = 'var(--st)';
            if (v) out.push(p + ':' + v);
          });
          if (s.tag === 'text') {
            out.push('font-family:"' + (cs.fontFamily === monoFamily ? FAMILY.mono : FAMILY.sans) + '"');
            ANCHOR.forEach(function (x) {
              e.setAttribute(x[0], x[1]);
              var va = getComputedStyle(e).getPropertyValue(x[0]);
              e.setAttribute(x[0], x[2]);
              if (va === getComputedStyle(e).getPropertyValue(x[0])) out.push(x[0] + ':' + va);
            });
          }
          rules.set(sigKey(s), selectorOf(s) + '{' + out.join(';') + '}');
        } finally { live.removeChild(top); }
      });
      return rules;
    }

    /* the world as the neutral state draws it */
    function neutral(e) {
      var c = e.getAttribute('class');
      if (c !== null) {
        var t = c.split(/\s+/).filter(function (x) { return x && STATE.indexOf(x) < 0; });
        if (t.indexOf('radial-edge--always') >= 0) t.push('is-on');
        e.setAttribute('class', t.join(' '));
      }
      if (e.style && e.style.display) {
        e.style.removeProperty('display');
        if (!e.getAttribute('style')) e.removeAttribute('style');
      }
    }
    function worldCopy(fit) {
      var w = api.world(), g = w.world.cloneNode(true);
      Array.prototype.slice.call(g.querySelectorAll('.radial-raise')).forEach(function (x) { x.parentNode.removeChild(x); });
      [g].concat(Array.prototype.slice.call(g.querySelectorAll('*'))).forEach(neutral);
      g.setAttribute('transform', 'translate(' + num(fit.x) + ' ' + num(fit.y) + ') scale(' + num(fit.k) + ')');
      var mk = null;
      Array.prototype.forEach.call(w.svg.querySelectorAll('marker'), function (m) { if (m.id === w.markerId) mk = m.cloneNode(true); });
      return { world: g, marker: mk };
    }

    /* what a profile's plate lines are told */
    function countsFor(tierName) {
      var c = { items: 0, records: 0, containers: Object.create(null), relations: Object.create(null), tier: tierName };
      L.nodes.forEach(function (n) {
        if (n.kind === 'leaf') c.items++;
        else if (n.kind === 'container') c.containers[n.depth] = (c.containers[n.depth] || 0) + 1;
      });
      model.byId.forEach(function (v, id) { if (model.kindOf(id) === 'record') c.records++; });
      model.planes.forEach(function (p, id) { c.relations[id] = 0; });
      model.relations.forEach(function (e) { c.relations[e.plane]++; });
      return c;
    }

    /* the displayed mark: the theme-visible mark slot's image or text */
    function markNow() {
      var found = null;
      ['mark-light', 'mark-dark'].forEach(function (name) {
        var s = api.slot(name);
        if (found !== null || !s || !s.getClientRects().length || getComputedStyle(s).display === 'none') return;
        var img = s.querySelector('img'), t = s.textContent.replace(/\s+/g, ' ').trim();
        found = img ? { img: img } : t ? { text: t } : false;
      });
      return found || null;
    }
    /* the displayed mark image's address and proportion, read at the click */
    function markSource(img) {
      var ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
      if (!(ratio > 0)) { var b = img.getBoundingClientRect(); ratio = b.height ? b.width / b.height : 0; }
      return { src: img.currentSrc || img.src, ratio: ratio };
    }
    async function markImage(m, j) {
      var src = m.src, ratio = m.ratio, blob;
      try {
        var r = await fetch(src);
        alive(j);
        if (!r.ok) throw fail(WHY.image);
        blob = await r.blob();
      } catch (e) { if (e.reason === WHY.stopped) throw e; throw fail(WHY.image); }
      alive(j);
      if (!(ratio > 0)) throw fail(WHY.image);
      return { href: await readAsDataUrl(blob), ratio: ratio };
    }

    /* the caption's paragraphs, as lines of words; a leading bold run stays bold */
    function captionWords(slot) {
      var paras = slot.querySelectorAll('p'), out = [];
      (paras.length ? Array.prototype.slice.call(paras) : [slot]).forEach(function (p) {
        var lines = [[]], lead = true;
        (function walk(n, strong) {
          Array.prototype.forEach.call(n.childNodes, function (c) {
            if (c.nodeType === 1) {
              var tag = c.localName;
              if (tag === 'br') { lines.push([]); return; }
              walk(c, strong || tag === 'b' || tag === 'strong');
            } else if (c.nodeType === 3) {
              c.textContent.split(/\s+/).forEach(function (w) {
                if (!w) return;
                if (!strong) lead = false;
                lines[lines.length - 1].push({ t: w, strong: strong && lead });
              });
            }
          });
        })(p, false);
        out.push(lines.filter(function (l) { return l.length; }));
      });
      return out.filter(function (p) { return p.length; });
    }

    /* ONE CLICK-TIME SNAPSHOT. Everything a plate takes from the page (the theme tokens, the drawn
       world, the names, the computed style of every element the plate will draw, the mark, the
       legend model, the caption, the plate lines) is read synchronously at the click, before the
       first wait. A theme change while the fonts load reaches neither the plate nor its name, and the
       page keeps the reader's new theme. */
    async function produce(P, theme, j) {
      var page = P.name === 'page';
      var base = tokensRule() + chromeRules();
      var legendSvc = api.service('legend');
      var showLegend = page && P.legend && !!legendSvc && !!legendSvc.model;
      var legendModel = showLegend ? legendSvc.model : null;
      var FA = figureArea(P, showLegend), b = L.bounds;
      var k = Math.min((FA.w - 2 * G.gutterX) / b.w, (FA.h - 2 * G.gutterY) / b.h);
      var view = { k: k, x: FA.w / 2 - (b.x + b.w / 2) * k, y: FA.h / 2 - (b.y + b.h / 2) * k };
      var mark = page ? markNow() : null;
      if (page && markRule === 'required' && !mark) throw fail(WHY.mark);
      var lines = [];
      if (page && P.lines && typeof cfg.plateLines === 'function') {
        var got = cfg.plateLines(countsFor(P.tier.name));
        if (!Array.isArray(got) || got.some(function (s) { return typeof s !== 'string'; })) throw fail(WHY.lines);
        lines = got.slice(0, G.lines).filter(function (s) { return s.trim(); });
      }
      var capSlot = page && P.caption ? api.slot('caption') : null;
      var capWords = capSlot ? captionWords(capSlot) : [];
      var copy = worldCopy({ k: k, x: FA.x + view.x, y: FA.y + view.y });
      var markSrc = mark && mark.img ? markSource(mark.img) : null;

      /* the plate */
      var svg = el('svg', { 'class': 'radial-export-plate', width: P.width, height: P.height, viewBox: '0 0 ' + num(P.vw) + ' ' + num(P.vh) });
      var style = el('style'); svg.appendChild(style);
      style.textContent = base;
      var defs = el('defs'); svg.appendChild(defs);
      var grad = el('linearGradient', { id: 'radial-export-ground', x1: 0, y1: 1, x2: 1, y2: 0 });
      grad.appendChild(el('stop', { offset: 0, style: 'stop-color: var(--bg-from)' }));
      grad.appendChild(el('stop', { offset: 1, style: 'stop-color: var(--bg-to)' }));
      defs.appendChild(grad);
      if (copy.marker) defs.appendChild(copy.marker);
      svg.appendChild(el('rect', { width: num(P.vw), height: num(P.vh), fill: 'url(#radial-export-ground)' }));
      svg.appendChild(copy.world);

      /* the names: the pure solver at the profile's tier, over the label area */
      var M = api.measurer(), count = 0;
      var sol = R.labels.solve({ nodes: L.nodes, view: view, W: FA.w, H: FA.h, tier: P.tier,
        visible: function (id) { return !model.hidden.has(id); }, shownCount: function (n) { return n.count || 0; },
        held: null, measure: M.measure, font: M.font, crowding: LC.crowding, bands: {},
        countText: function (n) { return R.labels.countText(LC, n); } });
      var gArea = el('g', { transform: 'translate(' + num(FA.x) + ' ' + num(FA.y) + ')' }), gLead = el('g'), gText = el('g');
      gArea.appendChild(gLead); gArea.appendChild(gText); svg.appendChild(gArea);
      function nameLine(ln, role) {
        if (!ln || !ln.text) return;
        var t = el('text', { 'class': 'radial-lbl radial-lbl--' + role + ' radial-halo', x: num(ln.x), y: num(ln.y), 'text-anchor': ln.anchor,
          transform: ln.rotate ? 'rotate(' + num(ln.rotate.deg) + ' ' + num(ln.rotate.cx) + ' ' + num(ln.rotate.cy) + ')' : null });
        t.textContent = ln.text;
        gText.appendChild(t);
        count++;
      }
      sol.forEach(function (e) {
        if (!e.show) return;
        if (e.leader) gLead.appendChild(el('path', { 'class': 'radial-leader',
          d: 'M' + num(e.leader.x1) + ' ' + num(e.leader.y1) + ' L' + num(e.leader.x2) + ' ' + num(e.leader.y2) }));
        nameLine(e.name, e.role);
        if (e.count && e.count.show) nameLine(e.count, 'count');
        nameLine(e.idLine, 'id');
      });

      /* the computed style of every element the plate draws, read now from the live drawing: the
         world and the names as built, and the legend's line samples, briefly added for the read */
      var samples = null;
      if (showLegend) {
        samples = el('g', { 'class': 'radial-plate-legend' });
        legendModel.planes.forEach(function (p) { if (p.drawn !== 'never') samples.appendChild(el('path', { 'class': 'radial-edge radial-edge--' + p.drawn + ' is-on' })); });
        svg.appendChild(samples);
      }
      var ruleOf = probedRules(signatures(svg));
      if (samples) svg.removeChild(samples);

      /* the first wait: the export fonts, then the mark's image */
      var fontCss = await prepareFonts(j);
      alive(j);
      var markImg = markSrc ? await markImage(markSrc, j) : null;

      /* mounted offscreen, in its own shadow tree, to measure the chrome and check the plate */
      var off = document.createElement('div');
      off.setAttribute('aria-hidden', 'true');
      off.style.cssText = 'all: initial; position: fixed; left: -200000px; top: 0; opacity: 0; pointer-events: none;';
      off.attachShadow({ mode: 'closed' }).appendChild(svg);
      (document.body || document.documentElement).appendChild(off);
      j.off = off;
      var meas = el('text'); svg.appendChild(meas);
      function width(cls, runs) {
        meas.setAttribute('class', 'radial-plate-' + cls);
        while (meas.firstChild) meas.removeChild(meas.firstChild);
        if (typeof runs === 'string') meas.textContent = runs;
        else runs.forEach(function (r) {
          var s = el('tspan', r.strong ? { 'class': 'radial-plate-strong' } : null);
          s.textContent = r.t; meas.appendChild(s);
        });
        return meas.getComputedTextLength();
      }
      function fitText(cls, s, max) {
        if (width(cls, s) <= max) return s;
        var a = Array.from(s), lo = 0, hi = a.length;
        while (lo < hi) {                                        /* the longest head that fits with its ellipsis */
          var mid = Math.ceil((lo + hi) / 2);
          if (width(cls, a.slice(0, mid).join('').replace(/\s+$/, '') + '\u2026') <= max) lo = mid; else hi = mid - 1;
        }
        return a.slice(0, lo).join('').replace(/\s+$/, '') + '\u2026';
      }
      function runsOf(ws) {
        var out = [];
        ws.forEach(function (w, i) {
          var t = (i ? ' ' : '') + w.t, prev = out[out.length - 1];
          if (prev && prev.strong === w.strong) prev.t += t; else out.push({ t: t, strong: w.strong });
        });
        return out;
      }
      function wrap(cls, words, max) {
        var out = [], cur = [];
        words.forEach(function (w) {
          if (cur.length && width(cls, runsOf(cur.concat([w]))) > max) { out.push(cur); cur = []; }
          cur.push(w);
        });
        if (cur.length) out.push(cur);
        return out;
      }
      function plainWords(s) { return String(s).split(/\s+/).filter(Boolean).map(function (t) { return { t: t, strong: false }; }); }
      function text(parent, cls, x, y, runs, anchor) {
        var t = el('text', { 'class': 'radial-plate-' + cls, x: num(x), y: num(y), 'text-anchor': anchor || null });
        if (typeof runs === 'string') t.textContent = runs;
        else runsOf(runs).forEach(function (r) {
          var s = el('tspan', r.strong ? { 'class': 'radial-plate-strong' } : null);
          s.textContent = r.t; t.appendChild(s);
        });
        parent.appendChild(t);
        return t;
      }

      var blocks = [], markEl = null;
      if (page) {
        var right = P.vw - G.pad;
        /* header: the mark, the title and subtitle beside it, the stamp lines at the right, a rule */
        var gH = el('g', { 'class': 'radial-plate-header' }); svg.appendChild(gH); blocks.push(gH);
        var markW = 0;
        if (markImg) {
          markW = G.markH * markImg.ratio;
          markEl = el('image', { href: markImg.href, x: G.pad, y: G.markY, width: num(markW), height: G.markH });
          gH.appendChild(markEl);
        } else if (mark && mark.text) {
          markEl = text(gH, 'mark', G.pad, G.markY + 26, mark.text);
          markW = width('mark', mark.text);
        }
        var tx = G.pad + (markW ? markW + G.markGap : 0);
        var stamp = given(hdr, 'stamp') ? hdr.stamp.trim() : '', canon = given(hdr, 'canonical') ? hdr.canonical.trim() : '';
        var half = (right - tx) / 2;
        if (stamp) stamp = fitText('stamp', stamp, half);
        if (canon) canon = fitText('canonical', canon, half);
        var rw = Math.max(stamp ? width('stamp', stamp) : 0, canon ? width('canonical', canon) : 0);
        var avail = right - (rw ? rw + 32 : 0) - tx;
        var title = (given(hdr, 'title') ? hdr.title : model.root.label).trim();
        var sub = given(hdr, 'subtitle') ? hdr.subtitle.trim() : '';
        if (title) text(gH, 'title', tx, G.titleY, fitText('title', title, avail));
        if (sub) text(gH, 'subtitle', tx, G.subY, fitText('subtitle', sub, avail));
        if (stamp) text(gH, 'stamp', right, G.stampY, stamp, 'end');
        if (canon) text(gH, 'canonical', right, G.canonY, canon, 'end');
        gH.appendChild(el('line', { 'class': 'radial-plate-rule', x1: G.pad, y1: G.ruleY, x2: num(right), y2: G.ruleY }));

        /* the legend column, from the legend's own model */
        if (showLegend) {
          var m = legendModel, x0 = right - G.legendW, tw = G.legendW - 40, y = G.legendTop, sections = 0;
          var gG = el('g', { 'class': 'radial-plate-legend' }); svg.appendChild(gG); blocks.push(gG);
          var heading = function (s) {
            if (sections++) y += 16;
            text(gG, 'heading', x0, y + 11, s.toUpperCase());
            y += 23;
          };
          /* a cell's words, wrapped to its width, one line per lead below its top */
          var cellText = function (cls, s, x, w, top, lead, at) {
            var rows = wrap(cls, plainWords(s), w);
            rows.forEach(function (ln, i) { text(gG, cls, x, at + top + i * lead, ln); });
            return rows.length * lead;
          };
          var rowText = function (cls, s, lead, top) { y += cellText(cls, s, x0 + 40, tw, top, lead, y); };
          /* a note is secondary text under its label, as a state's meaning; absent reads as none */
          var note = function (v) { return typeof v === 'string' && v.trim() ? v : null; };
          if (m.states.length) {
            heading(m.headings.state);
            m.states.forEach(function (s) {
              gG.appendChild(el('rect', { x: x0 + 9, y: num(y + 3), width: 12, height: 12, rx: 3, style: 'fill: var(--state-' + s.role + ')' }));
              rowText('label', s.label, 19, 14);
              if (note(s.meaning)) rowText('meaning', s.meaning, 16, 12);
              y += 7;
            });
          }
          if (m.planes.length) {
            heading(m.headings.line);
            m.planes.forEach(function (p) {
              if (p.drawn !== 'never') gG.appendChild(el('path', { 'class': 'radial-edge radial-edge--' + p.drawn + ' is-on',
                d: 'M' + x0 + ' ' + num(y + 9) + ' L' + (x0 + 30) + ' ' + num(y + 9),
                'marker-end': p.directed && copy.marker ? 'url(#' + copy.marker.id + ')' : null }));
              rowText('label', p.label, 19, 14);
              if (note(p.note)) rowText('meaning', p.note, 16, 12);
              y += 7;
            });
          }
          /* the shapes: the adapter's shape key in two columns, else one row per declared kind; the
             model's one-line `shapes` text is the live legend's alternative and is not drawn here */
          if (given(cfg, 'shapeKey')) {
            heading(m.headings.shape);
            var colW = (G.legendW - 16) / 2;
            for (var si = 0; si < cfg.shapeKey.length; si += 2) {
              var tall = 0;
              cfg.shapeKey.slice(si, si + 2).forEach(function (pair, ci) {
                var cx0 = x0 + ci * (colW + 16);
                gG.appendChild(glyph(pair[0], cx0 + 15, y + 9));
                tall = Math.max(tall, cellText('label', pair[1], cx0 + 34, colW - 34, 14, 19, y));
              });
              y += tall + 7;
            }
          } else if (m.kinds.length) {
            heading(m.headings.shape);
            m.kinds.forEach(function (kd) {
              gG.appendChild(glyph(kd.shape, x0 + 15, y + 9));
              rowText('label', kd.label, 19, 14);
              if (note(kd.note)) rowText('meaning', kd.note, 16, 12);
              y += 7;
            });
          }
          if (m.bound !== null && m.bound !== undefined && String(m.bound).trim()) {
            y += 10;
            wrap('bound', plainWords(m.bound), G.legendW).forEach(function (ln, i) { text(gG, 'bound', x0, y + 13 + i * 18, ln); });
          }
        }

        /* the caption: the host's own words, below the figure */
        if (capWords.length) {
          var gC = el('g', { 'class': 'radial-plate-caption-block' }), cy = FA.y + FA.h + G.captionGap, any = false;
          capWords.forEach(function (para, pi) {
            if (pi) cy += 8;
            para.forEach(function (ln) {
              wrap('caption', ln, FA.w).forEach(function (row) { text(gC, 'caption', FA.x, cy, row); cy += G.captionLead; any = true; });
            });
          });
          if (any) { svg.appendChild(gC); blocks.push(gC); }
        }

        /* the plate lines, right-aligned at the foot */
        if (lines.length) {
          var gN = el('g', { 'class': 'radial-plate-lines' }); svg.appendChild(gN); blocks.push(gN);
          lines.forEach(function (s, i) { text(gN, 'line', right, P.vh - G.linesUp + i * G.lineStep, fitText('line', s.trim(), right - G.pad), 'end'); });
        }
      }
      svg.removeChild(meas);

      /* the rules read at the click, in the plate's document order; an element signature not read
         then would be read now, after the wait, so it fails closed instead */
      var late = signatures(svg);
      if (late.some(function (x) { return !ruleOf.has(sigKey(x)); })) throw fail(WHY.capture);
      var rules = base + late.map(function (x) { return ruleOf.get(sigKey(x)); }).join('');
      style.textContent = rules;
      var o = svg.getBoundingClientRect(), sc = P.vw / (o.width || 1);
      if (markEl && markImg) {                                   /* first: everything in the header follows it */
        var mb = box(markEl.getBoundingClientRect(), o, sc);
        if (!(mb.r - mb.l > 0 && mb.b - mb.t > 0) || !inside(mb, 0, 0, P.vw, P.vh)) throw fail(WHY.markOut);
      }
      Array.prototype.forEach.call(svg.querySelectorAll('text'), function (t) {
        var bx = box(t.getBoundingClientRect(), o, sc);
        if (t.parentNode === gText) {
          if (!inside(bx, FA.x, FA.y, FA.x + FA.w, FA.y + FA.h)) throw fail(WHY.label);
        } else if (!(bx.r - bx.l > 0) || !inside(bx, 0, 0, P.vw, P.vh)) throw fail(WHY.chrome);
      });
      var boxes = blocks.map(function (g) { return box(g.getBoundingClientRect(), o, sc); });
      for (var i = 0; i < boxes.length; i++) for (var q = i + 1; q < boxes.length; q++) if (meets(boxes[i], boxes[q])) throw fail(WHY.overlap);

      /* the standalone plate: its faces embedded, serialized off the page */
      dispose(j);
      style.textContent = fontCss + rules;
      var str = new XMLSerializer().serializeToString(svg);
      return { svg: str, labels: count };
    }
    /* the owner's kind shapes, as the legend draws them */
    function glyph(shape, cx, cy) {
      var g = el('g', { transform: 'translate(' + num(cx) + ' ' + num(cy) + ')' }), r = 5.6, e, cls = { 'class': 'radial-plate-glyph' };
      function mk(n, a) { return el(n, Object.assign({}, cls, a)); }
      if (shape === 'square') e = mk('rect', { x: num(-r), y: num(-r), width: num(r * 2), height: num(r * 2), rx: num(r * 0.28) });
      else if (shape === 'diamond') e = mk('polygon', { points: [0, -r * 1.25, r * 1.25, 0, 0, r * 1.25, -r * 1.25, 0].map(num).join(' ') });
      else if (shape === 'hex') {
        var p = [];
        for (var i = 0; i < 6; i++) { var t = Math.PI / 6 + i * Math.PI / 3; p.push(num(Math.cos(t) * r * 1.3) + ',' + num(Math.sin(t) * r * 1.3)); }
        e = mk('polygon', { points: p.join(' ') });
      } else if (shape === 'tri') e = mk('polygon', { points: [0, -r * 1.35, r * 1.2, r * 0.85, -r * 1.2, r * 0.85].map(num).join(' ') });
      else if (shape === 'ring') {
        g.appendChild(mk('circle', { r: num(r * 1.2) }));
        e = el('circle', { 'class': 'radial-plate-chip', r: num(r * 0.34) });
      } else e = mk('circle', { r: num(r) });
      g.appendChild(e);
      return g;
    }

    async function raster(svgStr, P, j) {
      var img = new Image();
      await new Promise(function (res, rej) {
        img.onload = res;
        img.onerror = function () { rej(fail(WHY.raster)); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
      });
      if (img.decode) await img.decode().catch(function () {});
      alive(j);
      var cv = document.createElement('canvas');
      cv.width = P.width; cv.height = P.height;
      cv.getContext('2d').drawImage(img, 0, 0, P.width, P.height);
      var blob = await new Promise(function (res) { cv.toBlob(res, 'image/png'); });
      cv.width = 0; cv.height = 0;
      if (!blob) throw fail(WHY.raster);
      alive(j);
      return blob;
    }
    function download(blob, filename) {
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename;
      a.click();
      urls.push(url);
      timers.push(setTimeout(function () { URL.revokeObjectURL(url); urls = urls.filter(function (u) { return u !== url; }); }, REVOKE_MS));
    }

    function start(name, opts, button) {
      var cause = button ? 'reader' : (typeof opts.cause === 'string' ? opts.cause : 'module');
      if (dead) return Promise.reject(fail(WHY.stopped));
      if (!Object.prototype.hasOwnProperty.call(profiles, name)) return Promise.reject(fail(WHY.profile));
      if (busy) return Promise.reject(fail(WHY.busy));
      var P = profiles[name], theme = themeNow(), filename = filenameOf(P, theme);
      var j = job = { added: [], off: null, stopped: false };
      busy = true;
      if (button) button.setAttribute('aria-busy', 'true');
      var made = null;
      return produce(P, theme, j).then(function (r) {
        made = r;
        return raster(r.svg, P, j);
      }).then(function (blob) {
        var out = { ok: true, profile: name, theme: theme, width: P.width, height: P.height, filename: filename,
                    svg: made.svg, bytes: blob.size, labels: made.labels, blob: blob };
        last = { profile: name, theme: theme, width: P.width, height: P.height, filename: filename, labels: made.labels, ok: true };
        failure = null;
        if (opts.download) download(blob, filename);
        api.announce(WORD.ready);
        api.emit('export', { cause: cause, ok: true, profile: name, theme: theme, width: P.width, height: P.height, filename: filename });
        return out;
      }, function (err) {
        var reason = err && err.reason ? err.reason : 'unexpected error';
        var e = err && err.reason ? err : fail(reason);
        if (e !== err) e.cause = err;
        if (dead) throw e;
        last = { profile: name, theme: theme, width: P.width, height: P.height, filename: filename, labels: null, ok: false };
        failure = reason;
        if (button) showFailure(button, reason);
        api.announce(WORD.failure + reason);
        api.emit('export', { cause: cause, ok: false, profile: name, theme: theme, width: P.width, height: P.height,
                             filename: filename, reason: reason });
        throw e;
      }).finally(function () {
        dispose(j);
        if (job === j) job = null;
        busy = false;
        if (button) button.removeAttribute('aria-busy');
      });
    }

    /* ------------------------------------------------------------ controls -- */
    var slot = api.slot('export') || api.slot('actions'), buttons = [];
    function restoreButton(b) {
      if (b.__failTimer) { clearTimeout(b.__failTimer); b.__failTimer = 0; }
      b.textContent = WORD[b.getAttribute('data-radial-export')];
      b.removeAttribute('title'); b.removeAttribute('aria-label');
      b.classList.remove('is-failed');
    }
    function showFailure(b, reason) {
      restoreButton(b);
      b.textContent = WORD.failed;
      b.setAttribute('title', WORD.failure + reason);
      b.setAttribute('aria-label', WORD.failure + reason);
      b.classList.add('is-failed');
      b.__failTimer = setTimeout(function () { b.__failTimer = 0; restoreButton(b); }, FAIL_MS);
    }
    if (slot) ['page', 'diagram'].forEach(function (name) {
      if (!profiles[name]) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'surface-action radial-export-control';      /* the bar's compact-action grammar */
      b.setAttribute('data-radial-export', name);
      b.textContent = WORD[name];
      b.addEventListener('click', function () {
        if (busy) return;
        restoreButton(b);
        start(name, { download: true }, b).catch(function () { /* surfaced on the control */ });
      }, { signal: api.signal });
      slot.appendChild(b);
      buttons.push(b);
    });

    function run(name, opts) { return start(name, plain(opts) ? opts : {}, null); }
    api.provide('export', { run: run });
    return {
      run: run,
      state: function () { return { busy: busy, last: last ? Object.assign({}, last) : null, failure: failure }; },
      destroy: function () {
        dead = true;
        if (job) { job.stopped = true; dispose(job); }
        timers.forEach(clearTimeout); timers = [];
        urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
        buttons.forEach(function (b) {
          if (b.__failTimer) clearTimeout(b.__failTimer);
          if (b.parentNode) b.parentNode.removeChild(b);
        });
        buttons = [];
      }
    };
  }

  R.modules.export = {
    requires: [],
    hooks: ['filenameBase', 'profiles'],
    slots: [],
    validate: check,
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
