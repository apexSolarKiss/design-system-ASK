/* diagrams-static-peer-engine.js — the engine of the static peer-relation pattern.

   design-system-ASK Class A static scaffold `diagram-static-peer`. DS-owned: re-vendor byte-identical,
   never hand-edit in a consumer. A classic script: a page loads it as a <script>, and Node requires it,
   so the plates a page shows and the files the exporter writes come from the same code.

   A peer diagram is three or four equal nodes on a regular polygon — a triangle or a square — joined by
   declared relations. The spec owns the content: labels, relations and their wording. The engine owns
   placement, connectors and presentation, and reads no meaning into a relation beyond its type.

     spec = {
       id:        'triangle.A-S-K'            letters, digits, '.', '_' and '-'
       preset:    'triangle' | 'square'
       role?:     free text for the page (template, instance, comparison …); the engine ignores it
       title?:    the plate's accessible name; defaults to id
       nodes:     [{ id, label }, …]          clockwise from the preset origin: the triangle's top,
                                              the square's upper left. label is one of A–Z or 0–9
       relations: [{ from, to, type }, …]     every pair of nodes exactly once:
                                              'directed'     from → to, drawn with an arrowhead
                                              'neutral'      drawn dashed, no direction
                                              'unspecified'  declared open, drawn as nothing
       meaning?:  { directed?, neutral?, verb?, neutralPlain? }
                                              the instance's wording: the key's label for each drawn
                                              type, 'X verb Y' and 'X and Y neutralPlain' in the
                                              description. Printable Basic Latin only
     }

   An undeclared pair is an error, never a neutral pair: completeness is explicit, and 'unspecified'
   is the one way to leave a pair open.

   API (window.DIAGRAM_PEER, or module.exports)
     validate(spec, glyphs?)   { ok, errors: [{ code, path, message }] } — never throws. With glyphs
                               it also checks the carrier and the key's wording against its slot
     render(spec, options)     a standalone SVG string; throws a PeerError (err.code, err.errors)
                               for an invalid spec or option
     mount(host, spec, opts)   renders into an element and returns the <svg>; unless opts names a
                               prefix, it takes one whose plate ids no element in the document carries
     idPrefixFor(text)         the default id prefix: distinct texts never share one
     matrix · signatures · symmetry · describe   derived from the declared relations

   options
     glyphs      required: the DIAGRAM_PEER_GLYPHS carrier (diagrams-static-peer-glyphs.js). Each
                 letter's offsets and the letters' measured weight must be finite numbers, and every
                 printable Basic Latin character needs a finite advance of zero or more, or the
                 carrier is GLYPHS_MALFORMED
     theme       'inherit' (default): the page's foundation roles, so the plate follows the page's
                 theme; or a resolved theme object for a standalone file:
                 { name, fieldFrom, fieldTo, ink, fontFamily, labelWeight, keyWeight }, whose
                 labelWeight must be the weight the glyph carrier measured
     keyed       false (default) | true: add the relation key under the plate
     arrowheads  'target' (default, the canonical presentation) | 'midpoint' (comparison)
     idPrefix    prefix for the plate's element ids; defaults to idPrefixFor(spec id)
     fontFaceCSS @font-face rules to embed (standalone files)
     metadata    text for <metadata> (provenance, font license)
   A title, the metadata and every theme value are checked before anything is written: a character
   XML forbids, or markup or CSS punctuation in a value, is an error rather than a broken file. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DIAGRAM_PEER = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = 1;
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  function freeze(o) { Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') freeze(o[k]); }); return Object.freeze(o); }

  // Vertex 0 sits at the preset origin; later vertices follow clockwise on screen.
  var PRESETS = freeze({
    triangle: { n: 3, origin: -90 },    // top
    square:   { n: 4, origin: -135 },   // upper left
  });
  var TYPES = freeze(['directed', 'neutral', 'unspecified']);
  var LABEL = /^[A-Z0-9]$/;
  var SPEC_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  var NODE_ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
  var ID_PREFIX = /^[A-Za-z][A-Za-z0-9_-]*$/;
  var PRINTABLE = /^[\x20-\x7E]*$/;
  // A character XML 1.0 forbids in a document, or a lone surrogate: in a title or the metadata it
  // would leave the standalone file unreadable.
  var XML_UNSAFE = /[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/;
  // A resolved theme value is a color, a font stack or a weight: it never needs these.
  var THEME_UNSAFE = /[<>{};\\&@"]|\/\*|\*\/|url\(/i;
  var SPEC_KEYS = ['id', 'preset', 'role', 'title', 'nodes', 'relations', 'meaning'];
  var NODE_KEYS = ['id', 'label'];
  var RELATION_KEYS = ['from', 'to', 'type'];
  var MEANING_KEYS = ['directed', 'neutral', 'verb', 'neutralPlain'];
  var OPTION_KEYS = ['glyphs', 'theme', 'keyed', 'arrowheads', 'idPrefix', 'fontFaceCSS', 'metadata'];
  var THEME_KEYS = ['name', 'fieldFrom', 'fieldTo', 'ink', 'fontFamily', 'labelWeight', 'keyWeight'];

  // The plate's geometry, in viewBox units. Owned by the pattern; not an option.
  var GEOMETRY = freeze({
    size: 1000,            // square plate
    radius: 318,           // circumradius of the polygon
    fontSize: 150,         // vertex letters
    clearance: 104,        // distance from a vertex where every connector stops
    stroke: 2.6,           // directed connector
    neutralStroke: 1.8,    // neutral connector
    dash: [12, 10],        // neutral dash / gap, fitted per segment
    arrow: { length: 32, width: 10, notch: 0.22 },
    keyBand: 150,          // height added under the plate by the key
    keyBaseline: 40,       // key baseline below the plate
    keyFontSize: 34,
    keyCapCenter: 0.3638,  // em: the sample line sits at the key's cap-height center
    keyPitch: 360,         // horizontal step between key items
    keySample: 84,         // length of each drawn sample
    keyGap: 22,            // sample end to wording
    keyTextMax: 242,       // widest wording a slot holds: keyPitch - keySample - keyGap - 12
  });

  // ------------------------------------------------------------------ validation

  function PeerError(errors) {
    var e = new Error('diagram-static-peer: ' + errors.map(function (x) { return x.code + ' ' + x.path + ': ' + x.message; }).join('; '));
    e.name = 'PeerError';
    e.code = errors[0].code;
    e.errors = errors;
    return e;
  }

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  function closedKeys(obj, allowed, code, path, errors) {
    Object.keys(obj).forEach(function (k) {
      if (allowed.indexOf(k) === -1) errors.push({ code: code, path: path + '.' + k, message: 'unknown field' });
    });
  }

  function textWidth(s, glyphs) {
    var adv = glyphs.advances.em, w = 0;
    for (var i = 0; i < s.length; i++) w += own(adv, s[i]) ? adv[s[i]] : 0;
    return w * GEOMETRY.keyFontSize;
  }

  function finite(v) { return typeof v === 'number' && isFinite(v); }

  // The characters the key's wording may use (PRINTABLE): each needs an advance to be measured.
  var MEASURED_CHARS = [];
  for (var cc = 0x20; cc <= 0x7E; cc++) MEASURED_CHARS.push(String.fromCharCode(cc));

  /** A carrier the engine can draw from: each letter entry's dx and dy and the weight the letters were
      measured at are finite numbers, and every printable Basic Latin character has a finite advance of
      zero or more. Anything else is malformed here, rather than a NaN coordinate, an unmeasured word or
      a TypeError later. */
  function validGlyphs(glyphs) {
    try {
      if (!isObject(glyphs) || !isObject(glyphs.labels) || !isObject(glyphs.labels.em) || !isObject(glyphs.labels.axes)
        || !isObject(glyphs.advances) || !isObject(glyphs.advances.em) || !finite(glyphs.labels.axes.wght)) return false;
      var em = glyphs.labels.em, adv = glyphs.advances.em;
      return Object.getOwnPropertyNames(em).every(function (k) { return isObject(em[k]) && finite(em[k].dx) && finite(em[k].dy); })
        && MEASURED_CHARS.every(function (ch) { return own(adv, ch) && finite(adv[ch]) && adv[ch] >= 0; });
    } catch (e) { return false; }
  }
  var GLYPHS_SHAPE = 'not a DIAGRAM_PEER_GLYPHS carrier: each letter\'s dx and dy and the measured weight must be finite numbers, '
    + 'and every printable Basic Latin character needs a finite advance of zero or more';

  /** Check a spec. Returns { ok, errors }; never throws, whatever the input: a spec whose fields
      cannot even be read (a throwing getter, a revoked proxy) is SPEC_UNREADABLE. */
  function validate(spec, glyphs) {
    try { return inspect(spec, glyphs); }
    catch (e) { return { ok: false, errors: [{ code: 'SPEC_UNREADABLE', path: 'spec', message: 'reading the spec threw' }] }; }
  }

  function inspect(spec, glyphs) {
    var errors = [];
    function err(code, path, message) { errors.push({ code: code, path: path, message: message }); }
    var measured = glyphs !== undefined && validGlyphs(glyphs);
    if (glyphs !== undefined && !measured) err('GLYPHS_MALFORMED', 'glyphs', GLYPHS_SHAPE);
    if (!isObject(spec)) { err('SPEC_NOT_OBJECT', 'spec', 'a spec is an object'); return { ok: false, errors: errors }; }
    closedKeys(spec, SPEC_KEYS, 'SPEC_KEY', 'spec', errors);
    if (typeof spec.id !== 'string' || !SPEC_ID.test(spec.id)) err('SPEC_ID', 'spec.id', 'letters, digits, ".", "_" and "-", starting with a letter or digit');
    if (own(spec, 'role') && typeof spec.role !== 'string') err('SPEC_ROLE', 'spec.role', 'text');
    if (own(spec, 'title') && (typeof spec.title !== 'string' || XML_UNSAFE.test(spec.title))) err('SPEC_TITLE', 'spec.title', 'text with no control character');
    var preset = typeof spec.preset === 'string' && own(PRESETS, spec.preset) ? PRESETS[spec.preset] : null;
    if (!preset) err('PRESET_UNKNOWN', 'spec.preset', '"triangle" or "square"');

    // Every index is read, so a hole in an array is a missing entry, never a skipped one.
    var ids = Object.create(null), labels = Object.create(null), valid = [];
    function checkNode(n, i) {
      var p = 'spec.nodes[' + i + ']';
      if (!isObject(n)) { err('NODE_NOT_OBJECT', p, 'a node is an object'); return; }
      closedKeys(n, NODE_KEYS, 'NODE_KEY', p, errors);
      if (typeof n.id !== 'string' || !NODE_ID.test(n.id)) err('NODE_ID', p + '.id', 'a letter, then letters, digits, "_" or "-"');
      else if (ids[n.id]) err('NODE_ID_DUPLICATE', p + '.id', '"' + n.id + '" is already a node');
      else { ids[n.id] = true; valid.push(n.id); }
      if (typeof n.label !== 'string' || !LABEL.test(n.label)) err('LABEL_UNSUPPORTED', p + '.label', 'one character, A–Z or 0–9');
      else if (labels[n.label]) err('LABEL_DUPLICATE', p + '.label', '"' + n.label + '" already labels a node');
      else {
        labels[n.label] = true;
        if (measured && !own(glyphs.labels.em, n.label)) err('LABEL_UNMEASURED', p + '.label', 'the glyph carrier has no centering for "' + n.label + '"');
      }
    }
    if (!Array.isArray(spec.nodes)) err('NODES_NOT_ARRAY', 'spec.nodes', 'an array of nodes');
    else {
      var nodeCount = spec.nodes.length;
      if (preset && nodeCount !== preset.n) err('NODE_COUNT', 'spec.nodes', spec.preset + ' takes ' + preset.n + ' nodes, not ' + nodeCount);
      for (var ni = 0; ni < nodeCount; ni++) checkNode(spec.nodes[ni], ni);
    }

    var pairs = Object.create(null), types = Object.create(null);
    function checkRelation(r, i) {
      var p = 'spec.relations[' + i + ']';
      if (!isObject(r)) { err('RELATION_NOT_OBJECT', p, 'a relation is an object'); return; }
      closedKeys(r, RELATION_KEYS, 'RELATION_KEY', p, errors);
      var typeOk = typeof r.type === 'string' && TYPES.indexOf(r.type) !== -1;
      if (!typeOk) err('RELATION_TYPE', p + '.type', '"directed", "neutral" or "unspecified"');
      var endsOk = true;
      ['from', 'to'].forEach(function (end) {
        if (typeof r[end] !== 'string' || !ids[r[end]]) { endsOk = false; err('RELATION_ENDPOINT', p + '.' + end, 'not a declared node id'); }
      });
      if (!endsOk) return;
      if (r.from === r.to) { err('RELATION_SELF', p, 'a node does not relate to itself'); return; }
      var key = [r.from, r.to].sort().join('\u0000');
      if (pairs[key]) err('RELATION_PAIR_DUPLICATE', p, 'the pair ' + r.from + '–' + r.to + ' is already declared');
      pairs[key] = true;
      if (typeOk) types[r.type] = true;
    }
    if (!Array.isArray(spec.relations)) err('RELATIONS_NOT_ARRAY', 'spec.relations', 'an array of relations');
    else for (var ri = 0; ri < spec.relations.length; ri++) checkRelation(spec.relations[ri], ri);
    if (Array.isArray(spec.nodes) && Array.isArray(spec.relations)) {
      for (var i = 0; i < valid.length; i++)
        for (var j = i + 1; j < valid.length; j++)
          if (!pairs[[valid[i], valid[j]].sort().join('\u0000')])
            err('PAIR_UNDECLARED', 'spec.relations', 'the pair ' + valid[i] + '–' + valid[j] + ' is not declared; declare it, as "unspecified" if it is open');
    }

    if (own(spec, 'meaning')) {
      if (!isObject(spec.meaning)) err('MEANING_NOT_OBJECT', 'spec.meaning', 'an object of wording');
      else {
        closedKeys(spec.meaning, MEANING_KEYS, 'MEANING_KEY', 'spec.meaning', errors);
        MEANING_KEYS.forEach(function (k) {
          if (!own(spec.meaning, k)) return;
          var v = spec.meaning[k], p = 'spec.meaning.' + k;
          if (typeof v !== 'string' || !v.length || !PRINTABLE.test(v)) { err('MEANING_TEXT', p, 'non-empty printable Basic Latin text'); return; }
          if ((k === 'directed' || k === 'neutral') && measured && textWidth(v, glyphs) > GEOMETRY.keyTextMax)
            err('MEANING_KEY_WIDTH', p, 'too wide for its key slot (' + Math.round(textWidth(v, glyphs)) + ' of ' + GEOMETRY.keyTextMax + ' units)');
        });
      }
    }
    if (measured) ['directed', 'neutral'].forEach(function (t) {
      if (types[t] && textWidth(keyText(spec, t), glyphs) > GEOMETRY.keyTextMax && !(isObject(spec.meaning) && own(spec.meaning, t)))
        err('MEANING_KEY_WIDTH', 'spec.meaning.' + t, 'the default wording is too wide for its key slot');
    });
    return { ok: errors.length === 0, errors: errors };
  }

  function check(spec, glyphs) {
    var v = validate(spec, glyphs);
    if (!v.ok) throw PeerError(v.errors);
  }

  // ------------------------------------------------------------------ derived from the relations

  function indexOf(spec) {
    var map = Object.create(null);
    spec.nodes.forEach(function (n, i) { map[n.id] = i; });
    return map;
  }

  /** Relation matrix in vertex order: 1 row → column, -1 column → row, 0 neutral, null unspecified. */
  function matrix(spec) {
    check(spec);
    var n = spec.nodes.length, ix = indexOf(spec), M = [];
    for (var i = 0; i < n; i++) { M.push([]); for (var j = 0; j < n; j++) M[i].push(i === j ? 0 : null); }
    spec.relations.forEach(function (r) {
      var a = ix[r.from], b = ix[r.to];
      if (r.type === 'directed') { M[a][b] = 1; M[b][a] = -1; }
      else if (r.type === 'neutral') { M[a][b] = 0; M[b][a] = 0; }
    });
    return M;
  }

  /** Each node's relations, by label: out (it → other), in (other → it), neutral, unspecified. */
  function signatures(spec) {
    var M = matrix(spec);
    return spec.nodes.map(function (node, i) {
      var s = { id: node.id, label: node.label, out: [], in: [], neutral: [], unspecified: [] };
      spec.nodes.forEach(function (other, j) {
        if (i === j) return;
        var v = M[i][j];
        (v === 1 ? s.out : v === -1 ? s.in : v === 0 ? s.neutral : s.unspecified).push(other.label);
      });
      return s;
    });
  }

  /** Rotations k (0 < k < n) that carry the relation pattern onto itself, and the order they give. */
  function symmetry(spec) {
    var M = matrix(spec), n = M.length, shifts = [];
    for (var k = 1; k < n; k++) {
      var same = true;
      for (var i = 0; i < n && same; i++)
        for (var j = 0; j < n && same; j++)
          if (M[i][j] !== M[(i + k) % n][(j + k) % n]) same = false;
      if (same) shifts.push(k);
    }
    return { order: shifts.length + 1, shifts: shifts };
  }

  function wording(spec) { return isObject(spec.meaning) ? spec.meaning : {}; }
  function keyText(spec, type) { var m = wording(spec); return own(m, type) ? m[type] : type; }

  /** Plain-language description for <desc>, derived from the spec. */
  function describe(spec) {
    check(spec);
    var lab = Object.create(null), m = wording(spec);
    spec.nodes.forEach(function (n) { lab[n.id] = n.label; });
    var rel = spec.relations.map(function (r) {
      if (r.type === 'directed') return lab[r.from] + ' ' + (own(m, 'verb') ? m.verb : 'to') + ' ' + lab[r.to];
      if (r.type === 'neutral') return lab[r.from] + ' and ' + lab[r.to] + ' ' + (own(m, 'neutralPlain') ? m.neutralPlain : 'are neutral');
      return lab[r.from] + ' and ' + lab[r.to] + ' unspecified';
    });
    var count = ['Three', 'Four'][spec.nodes.length - 3];
    return count + ' equal nodes (' + spec.nodes.map(function (n) { return n.label; }).join(', ') + '). ' + rel.join('; ') + '.';
  }

  // ------------------------------------------------------------------ geometry

  function vertices(preset, cx, cy, R) {
    var p = PRESETS[preset], pts = [];
    for (var i = 0; i < p.n; i++) {
      var a = (p.origin + i * 360 / p.n) * Math.PI / 180;
      pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
    }
    // Center the vertex bounding box on (cx, cy) so the triangle sits optically level.
    var ys = pts.map(function (q) { return q.y; });
    var dy = cy - (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
    return pts.map(function (q) { return { x: q.x, y: q.y + dy }; });
  }

  function f(v) { return (Math.round(v * 100) / 100).toString(); }
  function f3(v) { return (Math.round(v * 1000) / 1000).toString(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /** Dash pattern fitted to a length: whole periods, with a dash centered on the midpoint, so both
      ends match and two crossing neutral diagonals cross as lines, not at a node. */
  function dashFit(len, dash) {
    var period = dash[0] + dash[1];
    var count = Math.max(1, Math.round(len / period));
    var scale = len / (count * period);
    var d = Math.round(dash[0] * scale * 1000) / 1000, g = Math.round(dash[1] * scale * 1000) / 1000, p = d + g;
    var offset = ((d / 2 - len / 2) % p + p) % p;
    return 'stroke-dasharray="' + f3(d) + ' ' + f3(g) + '" stroke-dashoffset="' + f3(offset) + '"';
  }

  function segment(P, Q, clearance) {
    var dx = Q.x - P.x, dy = Q.y - P.y, len = Math.sqrt(dx * dx + dy * dy);
    var u = { x: dx / len, y: dy / len };
    return {
      u: u, n: { x: -u.y, y: u.x },
      a: { x: P.x + u.x * clearance, y: P.y + u.y * clearance },
      b: { x: Q.x - u.x * clearance, y: Q.y - u.y * clearance },
      len: len - 2 * clearance,
    };
  }

  /** A filled, slightly notched head, drawn as a path rather than an SVG marker: markers rasterize
      unreliably, which is why the DS static patterns avoid them. */
  function arrowHead(tip, u, n, A) {
    var bl = { x: tip.x - u.x * A.length + n.x * A.width, y: tip.y - u.y * A.length + n.y * A.width };
    var br = { x: tip.x - u.x * A.length - n.x * A.width, y: tip.y - u.y * A.length - n.y * A.width };
    var nc = { x: tip.x - u.x * A.length * (1 - A.notch), y: tip.y - u.y * A.length * (1 - A.notch) };
    return 'M' + f(tip.x) + ' ' + f(tip.y) + 'L' + f(bl.x) + ' ' + f(bl.y) + 'L' + f(nc.x) + ' ' + f(nc.y) + 'L' + f(br.x) + ' ' + f(br.y) + 'Z';
  }

  // ------------------------------------------------------------------ options

  /** The default id prefix for a text such as a spec id: '.' becomes '_0' and '_' becomes '_1', so
      distinct texts never share a prefix, and the plate's own ids ('_title', '_field') can never
      equal another plate's prefix or ids. */
  function idPrefixFor(text) {
    return 'peer-' + String(text).replace(/[._]/g, function (c) { return c === '.' ? '_0' : '_1'; });
  }

  /** Every element id a plate carries for a prefix — the plate, its title and its field — in that
      order. render writes these and no others; mount checks each of them before it takes a prefix. */
  var ID_SUFFIXES = freeze(['', '_title', '_field']);
  function plateIds(prefix) { return ID_SUFFIXES.map(function (s) { return prefix + s; }); }

  function readOptions(spec, options) {
    var errors = [], o = {};
    function err(code, path, message) { errors.push({ code: code, path: path, message: message }); }
    if (options !== undefined && !isObject(options)) { err('OPTIONS_NOT_OBJECT', 'options', 'an object'); throw PeerError(errors); }
    options = options || {};
    closedKeys(options, OPTION_KEYS, 'OPTION_KEY', 'options', errors);
    var measured = validGlyphs(options.glyphs);
    if (options.glyphs === undefined) err('GLYPHS_MISSING', 'options.glyphs', 'pass the DIAGRAM_PEER_GLYPHS carrier (diagrams-static-peer-glyphs.js)');
    else if (!measured) err('GLYPHS_MALFORMED', 'options.glyphs', GLYPHS_SHAPE);
    o.glyphs = options.glyphs;
    o.keyed = own(options, 'keyed') ? options.keyed : false;
    if (typeof o.keyed !== 'boolean') err('OPTION_KEYED', 'options.keyed', 'true or false');
    o.arrowheads = own(options, 'arrowheads') ? options.arrowheads : 'target';
    if (o.arrowheads !== 'target' && o.arrowheads !== 'midpoint') err('OPTION_ARROWHEADS', 'options.arrowheads', '"target" or "midpoint"');
    o.theme = own(options, 'theme') ? options.theme : 'inherit';
    if (o.theme !== 'inherit') {
      if (!isObject(o.theme)) err('OPTION_THEME', 'options.theme', '"inherit" or a resolved theme object');
      else {
        closedKeys(o.theme, THEME_KEYS, 'OPTION_THEME', 'options.theme', errors);
        THEME_KEYS.forEach(function (k) {
          var v = o.theme[k];
          if (k === 'labelWeight' || k === 'keyWeight') { if (typeof v !== 'number' || !(v >= 1 && v <= 1000)) err('OPTION_THEME', 'options.theme.' + k, 'a font weight'); }
          else if (typeof v !== 'string' || !v.length || THEME_UNSAFE.test(v) || XML_UNSAFE.test(v)) err('OPTION_THEME', 'options.theme.' + k, 'a resolved value');
        });
        // The letters are centered by ink measured at one weight; another weight would set them off center.
        if (measured && typeof o.theme.labelWeight === 'number' && o.theme.labelWeight !== options.glyphs.labels.axes.wght)
          err('OPTION_THEME', 'options.theme.labelWeight', 'the glyph carrier measured the letters at weight ' + options.glyphs.labels.axes.wght);
      }
    }
    o.idPrefix = own(options, 'idPrefix') ? options.idPrefix : idPrefixFor(isObject(spec) && typeof spec.id === 'string' ? spec.id : '');
    if (typeof o.idPrefix !== 'string' || !ID_PREFIX.test(o.idPrefix)) err('OPTION_ID_PREFIX', 'options.idPrefix', 'a letter, then letters, digits, "_" or "-"');
    o.fontFaceCSS = own(options, 'fontFaceCSS') ? options.fontFaceCSS : '';
    if (typeof o.fontFaceCSS !== 'string' || /[<&]/.test(o.fontFaceCSS) || XML_UNSAFE.test(o.fontFaceCSS)) err('OPTION_FONT_FACE', 'options.fontFaceCSS', 'CSS text with no "<", "&" or control character');
    o.metadata = own(options, 'metadata') ? options.metadata : '';
    if (typeof o.metadata !== 'string' || XML_UNSAFE.test(o.metadata)) err('OPTION_METADATA', 'options.metadata', 'text with no control character');
    if (errors.length) throw PeerError(errors);
    return o;
  }

  // ------------------------------------------------------------------ render

  function render(spec, options) {
    var o = readOptions(spec, options);
    check(spec, o.glyphs);
    var G = GEOMETRY, S = G.size, H = S + (o.keyed ? G.keyBand : 0);
    var pts = vertices(spec.preset, S / 2, S / 2, G.radius);
    var ix = indexOf(spec), id = o.idPrefix, pid = plateIds(id), fixed = o.theme !== 'inherit';
    var c = fixed
      ? { from: o.theme.fieldFrom, to: o.theme.fieldTo, ink: o.theme.ink, font: o.theme.fontFamily, lw: o.theme.labelWeight, kw: o.theme.keyWeight }
      : { from: 'var(--bg-from)', to: 'var(--bg-to)', ink: 'var(--fg-1)', font: 'var(--font-sans)', lw: 'var(--fw-extralight)', kw: 'var(--fw-regular)' };

    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" id="' + pid[0] + '" class="peer-plate" viewBox="0 0 ' + S + ' ' + H + '" width="' + S + '" height="' + H
      + '" role="img" aria-labelledby="' + pid[1] + '" data-spec="' + esc(spec.id) + '" data-arrowheads="' + o.arrowheads + '"' + (o.keyed ? ' data-keyed="true"' : '') + '>');
    out.push('<title id="' + pid[1] + '">' + esc(own(spec, 'title') ? spec.title : spec.id) + '</title>');
    out.push('<desc>' + esc(describe(spec)) + '</desc>');
    if (o.metadata) out.push('<metadata>' + esc(o.metadata) + '</metadata>');

    // Every rule is scoped to this plate's id, so plates of different themes can share a page.
    var s = '#' + id + ' ';
    out.push('<style>' + o.fontFaceCSS
      + s + '.peer-glyph{fill:' + c.ink + ';font-family:' + c.font + ';font-weight:' + c.lw + ';font-size:' + G.fontSize + 'px;text-anchor:middle;font-optical-sizing:auto}'
      + s + '.peer-edge{fill:none;stroke:' + c.ink + ';stroke-width:' + G.stroke + ';stroke-linecap:butt}'
      + s + '.peer-head{fill:' + c.ink + '}'
      + s + '.peer-neutral{fill:none;stroke:' + c.ink + ';stroke-width:' + G.neutralStroke + ';stroke-linecap:butt}'
      + s + '.peer-key{fill:' + c.ink + ';font-family:' + c.font + ';font-weight:' + c.kw + ';font-size:' + G.keyFontSize + 'px}'
      + (fixed ? '' : s + '.peer-field-from{stop-color:' + c.from + '}' + s + '.peer-field-to{stop-color:' + c.to + '}')
      + '</style>');

    // The field: the foundation's 45-degree gradient, lighter end top right in light, bottom left in dark.
    // A standalone file carries its resolved stops as attributes; a page plate takes the page's roles.
    var stops = fixed
      ? '<stop offset="0%" stop-color="' + esc(c.from) + '"/><stop offset="100%" stop-color="' + esc(c.to) + '"/>'
      : '<stop class="peer-field-from" offset="0%"/><stop class="peer-field-to" offset="100%"/>';
    out.push('<defs><linearGradient id="' + pid[2] + '" x1="0%" y1="100%" x2="100%" y2="0%">' + stops + '</linearGradient></defs>');
    out.push('<rect class="peer-field" x="0" y="0" width="' + S + '" height="' + H + '" fill="url(#' + pid[2] + ')"/>');

    // Neutral connectors first, so directed relations read on top. An unspecified pair draws nothing.
    out.push('<g class="peer-relations">');
    spec.relations.forEach(function (r) {
      if (r.type !== 'neutral') return;
      var sg = segment(pts[ix[r.from]], pts[ix[r.to]], G.clearance);
      out.push('<path class="peer-neutral" data-relation="neutral" data-from="' + esc(r.from) + '" data-to="' + esc(r.to) + '" ' + dashFit(sg.len, G.dash)
        + ' d="M' + f(sg.a.x) + ' ' + f(sg.a.y) + 'L' + f(sg.b.x) + ' ' + f(sg.b.y) + '"/>');
    });
    var directed = spec.relations.filter(function (r) { return r.type === 'directed'; }).map(function (r) {
      var sg = segment(pts[ix[r.from]], pts[ix[r.to]], G.clearance);
      return { r: r, sg: sg, c: { x: (sg.a.x + sg.b.x) / 2, y: (sg.a.y + sg.b.y) / 2 } };
    });
    // Midpoint heads: where two directed relations cross at their midpoints, slide each head toward its
    // own target so the crossing never reads as a node.
    if (o.arrowheads === 'midpoint') directed.forEach(function (e, i) {
      var crowded = directed.some(function (other, j) { return j !== i && Math.hypot(other.c.x - e.c.x, other.c.y - e.c.y) < 1.5 * G.arrow.length; });
      if (crowded) e.c = { x: e.c.x + e.sg.u.x * G.arrow.length * 1.25, y: e.c.y + e.sg.u.y * G.arrow.length * 1.25 };
    });
    directed.forEach(function (e) {
      var sg = e.sg, A = G.arrow, lineEnd, tip;
      if (o.arrowheads === 'midpoint') {
        tip = { x: e.c.x + sg.u.x * A.length / 2, y: e.c.y + sg.u.y * A.length / 2 };
        lineEnd = sg.b;
      } else {
        tip = sg.b;
        // Stop the stroke inside the head's notch so no square end shows past the head.
        var back = A.length * (1 - A.notch) - 0.5;
        lineEnd = { x: tip.x - sg.u.x * back, y: tip.y - sg.u.y * back };
      }
      out.push('<g data-relation="directed" data-from="' + esc(e.r.from) + '" data-to="' + esc(e.r.to) + '">'
        + '<path class="peer-edge" d="M' + f(sg.a.x) + ' ' + f(sg.a.y) + 'L' + f(lineEnd.x) + ' ' + f(lineEnd.y) + '"/>'
        + '<path class="peer-head" d="' + arrowHead(tip, sg.u, sg.n, A) + '"/></g>');
    });
    out.push('</g>');

    // Vertex letters: one size, weight and ink, each centered on its vertex by its measured ink bounds.
    out.push('<g class="peer-nodes">');
    spec.nodes.forEach(function (node, i) {
      var gm = o.glyphs.labels.em[node.label];
      out.push('<text class="peer-glyph" data-node="' + esc(node.id) + '" x="' + f(pts[i].x + gm.dx * G.fontSize) + '" y="' + f(pts[i].y + gm.dy * G.fontSize) + '">' + esc(node.label) + '</text>');
    });
    out.push('</g>');

    if (o.keyed) out.push(key(spec));
    out.push('</svg>');
    return out.join('');
  }

  /** The key: under the plate, starting at the left edge of the polygon's circumcircle, a drawn
      sample of each type the plate draws and the instance's wording for it. */
  function key(spec) {
    var G = GEOMETRY, S = G.size;
    var drawn = ['directed', 'neutral'].filter(function (t) { return spec.relations.some(function (r) { return r.type === t; }); });
    var y = S + G.keyBaseline, x0 = (S - 2 * G.radius) / 2, mid = y - G.keyCapCenter * G.keyFontSize, parts = [];
    drawn.forEach(function (type, k) {
      var xs = x0 + k * G.keyPitch, xe = xs + G.keySample;
      if (type === 'directed') {
        parts.push('<path class="peer-edge" d="M' + f(xs) + ' ' + f(mid) + 'L' + f(xe - G.arrow.length * (1 - G.arrow.notch) + 0.5) + ' ' + f(mid) + '"/>');
        parts.push('<path class="peer-head" d="' + arrowHead({ x: xe, y: mid }, { x: 1, y: 0 }, { x: 0, y: 1 }, G.arrow) + '"/>');
      } else {
        parts.push('<path class="peer-neutral" ' + dashFit(G.keySample, G.dash) + ' d="M' + f(xs) + ' ' + f(mid) + 'L' + f(xe) + ' ' + f(mid) + '"/>');
      }
      parts.push('<text class="peer-key" x="' + f(xe + G.keyGap) + '" y="' + f(y) + '">' + esc(keyText(spec, type)) + '</text>');
    });
    return '<g class="peer-key-group">' + parts.join('') + '</g>';
  }

  // ------------------------------------------------------------------ mount

  var mounted = 0;

  /** Render into an element. Unless the caller names one, each mount takes an id prefix none of whose
      plate ids (plateIds) any element in the document carries, so a page can show the same spec any
      number of times, beside plates rendered with prefixes of their own, without repeating an element
      id. Mount prefixes ('peer_' and a number) never take the form of a spec's default. */
  function mount(host, spec, options) {
    if (!host || host.nodeType !== 1) throw PeerError([{ code: 'MOUNT_HOST', path: 'host', message: 'an element' }]);
    var o = {}, k;
    for (k in (options || {})) if (own(options, k)) o[k] = options[k];
    if (!own(o, 'idPrefix')) {
      var doc = host.ownerDocument;
      do { o.idPrefix = 'peer_' + (++mounted); }
      while (plateIds(o.idPrefix).some(function (x) { return doc.getElementById(x); }));
    }
    host.innerHTML = render(spec, o);
    return host.querySelector('svg');
  }

  return {
    VERSION: VERSION, PRESETS: PRESETS, TYPES: TYPES, GEOMETRY: GEOMETRY,
    validate: validate, render: render, mount: mount, idPrefixFor: idPrefixFor,
    matrix: matrix, signatures: signatures, symmetry: symmetry, describe: describe,
  };
});
