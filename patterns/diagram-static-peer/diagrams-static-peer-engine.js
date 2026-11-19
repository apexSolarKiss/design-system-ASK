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
       semantic?: { system, … }                only on a declared semantic example (below)
     }

   An undeclared pair is an error, never a neutral pair: completeness is explicit, and 'unspecified'
   is the one way to leave a pair open.

   A plate is neutral unless its spec is a DECLARED SEMANTIC EXAMPLE, which applies one opt-in system
   to its nodes and shows everything a reader needs to read the color:
     semantic: { system: 'criterion-assessment', criterion, direction, scope, basis, rule }
       each node: assessment 'favorable' | 'caution' | 'adverse' | 'unassessed', and figure?
     semantic: { system: 'three-functions', scope }
       each node: function 'legislative' | 'executive' | 'judicial' | 'none', and does (a role-bearing
       node only)
   system and each assignment are strings from their closed sets. Every declaration, figure and does is
   a list of one or more lines of printable Basic Latin, each measured against its slot: the engine sets
   the lines as declared and wraps nothing. A colored node is filled at 100% of its role's value, its
   ring in the same value, and its letter takes the role's ink; an unassessed or 'none' node keeps the
   neutral ring, and a figure an unassessed node gives stays as plain text. The assignments are the
   example's own: they change no relation, matrix, signature or symmetry. An example is drawn keyed
   only, with an explanation band under the key: its key and explanation are part of reading its color.

   API (window.DIAGRAM_PEER, or module.exports)
     validate(spec, glyphs?)   { ok, errors: [{ code, path, message }] } — never throws. With glyphs
                               it also checks the carrier, that each label's ink clears its ring,
                               the key's wording against its slot, and a declared semantic
                               example's lines against theirs
     render(spec, options)     a standalone SVG string; throws a PeerError (err.code, err.errors)
                               for an invalid spec or option
     mount(host, spec, opts)   renders into an element and returns the <svg>; unless opts names a
                               prefix, it takes one whose plate ids no element in the document carries
     idPrefixFor(text)         the default id prefix: distinct texts never share one
     semanticSystem(spec)      the name of the system a spec declares as its own, or null: the rule
                               render applies, for a caller that chooses how to export a spec
     matrix · signatures · symmetry · describe   derived from the declared relations

   options
     glyphs      required: the DIAGRAM_PEER_GLYPHS carrier (diagrams-static-peer-glyphs.js). Each
                 letter's offsets, its ink radius (zero or more) and the letters' measured weight
                 must be finite numbers, and every
                 printable Basic Latin character needs a finite advance of zero or more, or the
                 carrier is GLYPHS_MALFORMED
     theme       'inherit' (default): the page's foundation roles, so the plate follows the page's
                 theme; or a resolved theme object for a standalone file:
                 { name, fieldFrom, fieldTo, ink, fontFamily, labelWeight, keyWeight, roles? },
                 whose labelWeight must be the weight the glyph carrier measured. A declared
                 semantic example drawn with a resolved theme needs roles: its system's three
                 colored roles and no other, each { fill, ink }, resolved from the system's own
                 stylesheets, as the theme's own property: an inherited roles is not the theme's.
                 A neutral plate takes no roles of its own and ignores inherited ones.
                 With 'inherit' it reads --assessment-<role> and --assessment-<role>-ink, or
                 --function-<role> and --function-<role>-ink, from the page
     keyed       false (default) | true: add the relation key under the plate. A declared semantic
                 example is keyed by default and refuses false
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

  var VERSION = 2;
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
  // A role value is a color: it never needs a quote, which would open a CSS string in the plate's rules.
  var ROLE_UNSAFE = /'/;
  var SPEC_KEYS = ['id', 'preset', 'role', 'title', 'nodes', 'relations', 'meaning', 'semantic'];
  var NODE_KEYS = ['id', 'label'];
  var RELATION_KEYS = ['from', 'to', 'type'];
  var MEANING_KEYS = ['directed', 'neutral', 'verb', 'neutralPlain'];
  var OPTION_KEYS = ['glyphs', 'theme', 'keyed', 'arrowheads', 'idPrefix', 'fontFaceCSS', 'metadata'];
  var THEME_KEYS = ['name', 'fieldFrom', 'fieldTo', 'ink', 'fontFamily', 'labelWeight', 'keyWeight'];
  var THEME_OPTIONAL = ['roles'];

  // The two opt-in systems a declared semantic example may apply, one per plate. Each names its
  // declarations (line lists, in the order the band shows them, with the band's label for each), the node
  // field that carries its closed assignment, the assignments that color a node, the node's own text
  // field, and the page tokens its colors and inks are read from. The systems' stylesheets own the
  // values: Criterion Assessment and Three Functions bind each role to its color and to the surface
  // treatments' FILL PAINT ink for that color. The engine owns none of them.
  var SEMANTIC = freeze({
    'criterion-assessment': {
      name: 'Criterion Assessment',
      declarations: ['criterion', 'direction', 'scope', 'basis', 'rule'],
      labels: { criterion: 'Criterion', direction: 'Direction', scope: 'Scope', basis: 'Basis', rule: 'Rule' },
      assignment: 'assessment',
      values: ['favorable', 'caution', 'adverse', 'unassessed'],
      colored: ['favorable', 'caution', 'adverse'],
      text: 'figure',          // optional on any node; drawn beside it, above its assessment word
      textRequired: false,
      tokens: 'assessment',    // --assessment-<role>, --assessment-<role>-ink
    },
    'three-functions': {
      name: 'Three Functions',
      declarations: ['scope'],
      labels: { scope: 'Scope' },
      assignment: 'function',
      values: ['legislative', 'executive', 'judicial', 'none'],
      colored: ['legislative', 'executive', 'judicial'],
      text: 'does',            // required on a role-bearing node, refused on 'none'; drawn in the band
      textRequired: true,
      tokens: 'function',      // --function-<role>, --function-<role>-ink
    },
  });
  var SEMANTIC_NODE_KEYS = ['assessment', 'figure', 'function', 'does'];
  var ROLE_KEYS = ['fill', 'ink'];

  // The plate's geometry, in viewBox units. Owned by the pattern; not an option.
  // Each node is one outlined ring centered on its vertex. Every connector stops a fixed gap outside the
  // ring's outer edge, so clearance is derived from the ring rather than set beside it.
  var RING = { radius: 112, stroke: 3.6, gap: 14, padding: 18 };
  var GEOMETRY = freeze({
    size: 1000,            // square plate
    radius: 318,           // circumradius of the polygon
    fontSize: 150,         // vertex letters
    ring: RING,            // node ring: centerline radius, stroke, the gap outside it where connectors
                           // stop, and the least clear space inside it around any supported letter's ink
    clearance: RING.radius + RING.stroke / 2 + RING.gap,   // distance from a vertex where every connector stops
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
    // A declared semantic example only. Its notes sit beside each node, outside the ring: the figure's
    // lines and the assessment word, or the function word, centered on the vertex, above a node in the
    // plate's upper half and below one in its lower half. Its explanation band runs under the key: the
    // system's name, then each declaration, and each role-bearing node's does, under a label in its
    // own column. Both are set at 32 units or more, where the font's optical size is the one the carrier
    // measured: a line's measured width is the unkerned sum of its advances at the weight and optical
    // size it draws at, and kerning moves the drawn width by little.
    noteFontSize: 34,
    noteLeading: 40,
    noteGap: 14,           // ring outer edge to the nearest note line's ink
    noteTextMax: 360,      // widest note line, centered on its vertex
    noteLinesMax: 2,       // a figure's lines; the assessment word adds one
    bandFontSize: 32,
    bandLeading: 44,
    bandFirst: 110,        // the key's baseline to the band heading's baseline
    bandHeadGap: 16,       // added below the heading
    bandRowGap: 12,        // added between rows
    bandFoot: 56,          // last baseline to the plate's foot
    bandLabelWidth: 196,   // the label column, whose room holds every letter beside any function's name
    bandRight: 920,        // the text column's right edge
    bandLinesMax: 18,      // every row line a band holds, heading excluded
  });

  // What both text rules state, rather than inherit, beyond their family, weight, size, anchoring and optical
  // sizing: each at the value a plate draws with on its own (the subset's kerning stays on, as it renders today;
  // white space collapses, as an SVG text's does), and synthesis off, since the plate never asks for a face that
  // would need it. Text rendering is left to the page, whose foundation sets it on purpose.
  var TEXT_RULES = 'font-style:normal;font-stretch:normal;font-size-adjust:none;font-variant:normal;font-kerning:auto;'
    + 'font-feature-settings:normal;font-variation-settings:normal;font-synthesis:none;letter-spacing:0;word-spacing:0;'
    + 'text-transform:none;dominant-baseline:alphabetic;direction:ltr;writing-mode:horizontal-tb;text-orientation:mixed;'
    + 'white-space:nowrap;stroke:none;text-shadow:none';

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

  function widthAt(s, glyphs, size) {
    var adv = glyphs.advances.em, w = 0;
    for (var i = 0; i < s.length; i++) w += own(adv, s[i]) ? adv[s[i]] : 0;
    return w * size;
  }
  function textWidth(s, glyphs) { return widthAt(s, glyphs, GEOMETRY.keyFontSize); }

  /** A human-readable field of a declared semantic example: one or more lines, each a string of printable
      Basic Latin with at least one character that is not a space. Every index is read. Returns the
      problem, or null. */
  function lineProblem(v, maxLines) {
    if (!Array.isArray(v) || v.length < 1) return 'a list of one or more lines';
    if (maxLines && v.length > maxLines) return 'at most ' + maxLines + ' line' + (maxLines > 1 ? 's' : '');
    for (var i = 0; i < v.length; i++)
      if (typeof v[i] !== 'string' || !/[^ ]/.test(v[i]) || !PRINTABLE.test(v[i])) return 'line ' + i + ' is not a line of printable Basic Latin';
    return null;
  }

  /** The name of the system a spec declares as its own, or null when the spec has no semantic of its own
      naming a known system. A spec that only inherits one draws neutral; a malformed declaration of its
      own is a validation error, so the answer is the plate's for a spec that validates. render and
      describe read a spec's system through this rule, and so do the exporter and the specimen page. */
  function semanticSystem(spec) {
    return isObject(spec) && own(spec, 'semantic') && isObject(spec.semantic) && typeof spec.semantic.system === 'string' && own(SEMANTIC, spec.semantic.system)
      ? spec.semantic.system : null;
  }
  function systemOf(spec) { var name = semanticSystem(spec); return name ? SEMANTIC[name] : null; }

  // The band's text column, and each band label's room in its own column.
  function bandTextMax() { return GEOMETRY.bandRight - (GEOMETRY.size - 2 * GEOMETRY.radius) / 2 - GEOMETRY.bandLabelWidth; }

  function finite(v) { return typeof v === 'number' && isFinite(v); }

  // The characters the key's wording may use (PRINTABLE): each needs an advance to be measured.
  var MEASURED_CHARS = [];
  for (var cc = 0x20; cc <= 0x7E; cc++) MEASURED_CHARS.push(String.fromCharCode(cc));

  /** A carrier the engine can draw from: each letter entry's dx, dy and ink radius r (zero or more)
      and the weight the letters were measured at are finite numbers, and every printable Basic Latin character has a finite advance of
      zero or more. Anything else is malformed here, rather than a NaN coordinate, an unmeasured word or
      a TypeError later. */
  function validGlyphs(glyphs) {
    try {
      if (!isObject(glyphs) || !isObject(glyphs.labels) || !isObject(glyphs.labels.em) || !isObject(glyphs.labels.axes)
        || !isObject(glyphs.advances) || !isObject(glyphs.advances.em) || !finite(glyphs.labels.axes.wght)) return false;
      var em = glyphs.labels.em, adv = glyphs.advances.em;
      return Object.getOwnPropertyNames(em).every(function (k) { return isObject(em[k]) && finite(em[k].dx) && finite(em[k].dy) && finite(em[k].r) && em[k].r >= 0; })
        && MEASURED_CHARS.every(function (ch) { return own(adv, ch) && finite(adv[ch]) && adv[ch] >= 0; });
    } catch (e) { return false; }
  }
  var GLYPHS_SHAPE = 'not a DIAGRAM_PEER_GLYPHS carrier: each letter\'s dx, dy and ink radius r (zero or more) and the measured weight must be finite numbers, '
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

    // A declared semantic example: one system, every declaration it names, each a measured line list.
    var sys = null, bandLines = 0;
    if (own(spec, 'semantic')) {
      var sem = spec.semantic;
      if (!isObject(sem)) err('SEMANTIC_NOT_OBJECT', 'spec.semantic', 'an object naming one system and its declarations');
      else {
        if (typeof sem.system !== 'string' || !own(SEMANTIC, sem.system))
          err('SEMANTIC_SYSTEM', 'spec.semantic.system', '"criterion-assessment" or "three-functions"');
        else {
          sys = SEMANTIC[sem.system];
          closedKeys(sem, ['system'].concat(sys.declarations), 'SEMANTIC_KEY', 'spec.semantic', errors);
          sys.declarations.forEach(function (d) {
            var p = 'spec.semantic.' + d;
            if (!own(sem, d)) { err('SEMANTIC_DECLARATION', p, sys.name + ' declares its ' + d); return; }
            var problem = lineProblem(sem[d]);
            if (problem) { err('SEMANTIC_TEXT', p, problem); return; }
            bandLines += sem[d].length;
            if (measured) sem[d].forEach(function (line, k) {
              var w = widthAt(line, glyphs, GEOMETRY.bandFontSize);
              if (w > bandTextMax()) err('SEMANTIC_TEXT_WIDTH', p + '[' + k + ']', 'too wide for the band (' + Math.round(w) + ' of ' + bandTextMax() + ' units)');
            });
          });
        }
      }
    }

    // Every index is read, so a hole in an array is a missing entry, never a skipped one.
    var ids = Object.create(null), labels = Object.create(null), valid = [];
    function checkAssignment(n, p) {
      var a = sys.assignment, t = sys.text;
      if (!own(n, a)) { err('NODE_ASSIGNMENT', p + '.' + a, 'every node of a ' + sys.name + ' example declares its ' + a); return; }
      if (typeof n[a] !== 'string' || sys.values.indexOf(n[a]) === -1) { err('NODE_ASSIGNMENT', p + '.' + a, '"' + sys.values.join('", "') + '"'); return; }
      var colored = sys.colored.indexOf(n[a]) !== -1;
      if (!own(n, t)) {
        if (sys.textRequired && colored) err('NODE_TEXT', p + '.' + t, 'a role-bearing node says what it ' + t + ' in this example');
        return;
      }
      if (sys.textRequired && !colored) { err('NODE_TEXT', p + '.' + t, 'a node that performs no function gives no ' + t); return; }
      var problem = lineProblem(n[t], sys.textRequired ? 0 : GEOMETRY.noteLinesMax);
      if (problem) { err('NODE_TEXT', p + '.' + t, problem); return; }
      // A does goes in the band's text column; a figure beside its node.
      var size = sys.textRequired ? GEOMETRY.bandFontSize : GEOMETRY.noteFontSize;
      var max = sys.textRequired ? bandTextMax() : GEOMETRY.noteTextMax;
      if (sys.textRequired) bandLines += n[t].length;
      if (measured) n[t].forEach(function (line, k) {
        var w = widthAt(line, glyphs, size);
        if (w > max) err('NODE_TEXT_WIDTH', p + '.' + t + '[' + k + ']', 'too wide for its slot (' + Math.round(w) + ' of ' + max + ' units)');
      });
    }
    function checkNode(n, i) {
      var p = 'spec.nodes[' + i + ']';
      if (!isObject(n)) { err('NODE_NOT_OBJECT', p, 'a node is an object'); return; }
      var allowed = sys ? NODE_KEYS.concat([sys.assignment, sys.text]) : NODE_KEYS;
      Object.keys(n).forEach(function (k) {
        if (allowed.indexOf(k) !== -1) return;
        err('NODE_KEY', p + '.' + k, SEMANTIC_NODE_KEYS.indexOf(k) !== -1
          ? 'accepted only on a declared semantic example whose system assigns it' : 'unknown field');
      });
      if (sys) checkAssignment(n, p);
      if (typeof n.id !== 'string' || !NODE_ID.test(n.id)) err('NODE_ID', p + '.id', 'a letter, then letters, digits, "_" or "-"');
      else if (ids[n.id]) err('NODE_ID_DUPLICATE', p + '.id', '"' + n.id + '" is already a node');
      else { ids[n.id] = true; valid.push(n.id); }
      if (typeof n.label !== 'string' || !LABEL.test(n.label)) err('LABEL_UNSUPPORTED', p + '.label', 'one character, A–Z or 0–9');
      else if (labels[n.label]) err('LABEL_DUPLICATE', p + '.label', '"' + n.label + '" already labels a node');
      else {
        labels[n.label] = true;
        if (measured && !own(glyphs.labels.em, n.label)) err('LABEL_UNMEASURED', p + '.label', 'the glyph carrier has no centering for "' + n.label + '"');
        else if (measured && glyphs.labels.em[n.label].r * GEOMETRY.fontSize + GEOMETRY.ring.padding > GEOMETRY.ring.radius - GEOMETRY.ring.stroke / 2)
          err('LABEL_RING_FIT', p + '.label', '"' + n.label + '" leaves less than ' + GEOMETRY.ring.padding + ' units inside its ring');
      }
    }
    if (!Array.isArray(spec.nodes)) err('NODES_NOT_ARRAY', 'spec.nodes', 'an array of nodes');
    else {
      var nodeCount = spec.nodes.length;
      if (preset && nodeCount !== preset.n) err('NODE_COUNT', 'spec.nodes', spec.preset + ' takes ' + preset.n + ' nodes, not ' + nodeCount);
      for (var ni = 0; ni < nodeCount; ni++) checkNode(spec.nodes[ni], ni);
    }

    if (sys && bandLines > GEOMETRY.bandLinesMax)
      err('SEMANTIC_BAND', 'spec.semantic', 'the explanation takes ' + bandLines + ' lines; a band holds ' + GEOMETRY.bandLinesMax);

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
    return count + ' equal nodes (' + spec.nodes.map(function (n) { return n.label; }).join(', ') + '). ' + rel.join('; ') + '.'
      + describeSemantic(spec);
  }

  /** A declared semantic example's assignments and declarations, for <desc>: everything the plate
      shows beside its nodes and in its band, as text. Empty for a neutral plate. */
  function describeSemantic(spec) {
    var sys = systemOf(spec);
    if (!sys) return '';
    var lines = function (v) { return v.map(function (x) { return x.trim(); }).join(' ').replace(/[.]+$/, ''); };
    var nodes = spec.nodes.map(function (n) {
      var a = n[sys.assignment], parts = [];
      if (sys.textRequired) { if (a !== 'none') parts.push(a, lines(n[sys.text])); else parts.push('no function'); }
      else { parts.push(a); if (own(n, sys.text)) parts.push('figure ' + lines(n[sys.text])); }
      return n.label + ': ' + parts.join(', ');
    });
    var decl = sys.declarations.map(function (d) { return sys.labels[d] + ': ' + lines(spec.semantic[d]); });
    return ' ' + sys.name + '. ' + nodes.join('; ') + '. ' + decl.join('. ') + '.';
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
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /** Dash pattern fitted to a length: an even number of whole periods plus one dash, scaled together,
      so the line begins and ends on dash ink where it stops, to within the dash values' rounding (each
      rim keeps the same gap as a directed connector), and a dash sits centered on the midpoint, so two
      crossing neutral diagonals cross as lines, not at a node. */
  function dashFit(len, dash) {
    var period = dash[0] + dash[1];
    var k = Math.max(1, Math.round((len - dash[0]) / (2 * period)));
    var scale = len / (2 * k * period + dash[0]);
    var d = Math.round(dash[0] * scale * 10000) / 10000, g = Math.round(dash[1] * scale * 10000) / 10000;
    return 'stroke-dasharray="' + d + ' ' + g + '" stroke-dashoffset="0"';
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
    o.keyedGiven = own(options, 'keyed');
    o.keyed = o.keyedGiven ? options.keyed : false;
    if (typeof o.keyed !== 'boolean') err('OPTION_KEYED', 'options.keyed', 'true or false');
    o.arrowheads = own(options, 'arrowheads') ? options.arrowheads : 'target';
    if (o.arrowheads !== 'target' && o.arrowheads !== 'midpoint') err('OPTION_ARROWHEADS', 'options.arrowheads', '"target" or "midpoint"');
    o.theme = own(options, 'theme') ? options.theme : 'inherit';
    o.roles = null;
    if (o.theme !== 'inherit') {
      if (!isObject(o.theme)) err('OPTION_THEME', 'options.theme', '"inherit" or a resolved theme object');
      else {
        closedKeys(o.theme, THEME_KEYS.concat(THEME_OPTIONAL), 'OPTION_THEME', 'options.theme', errors);
        // A declared semantic example's resolved role values: each colored role a system names, as
        // { fill, ink }, resolved values like every other in the theme. Only the theme's own roles are
        // its roles: an inherited mapping is not the theme's, as an inherited semantic is not the spec's.
        // Each value is read once, checked and kept, and render draws from what was kept, never from the
        // theme again. Which roles a plate needs is its system's, checked when the spec is known.
        if (own(o.theme, 'roles')) {
          var roles = o.theme.roles, known = [];
          Object.keys(SEMANTIC).forEach(function (n) { known = known.concat(SEMANTIC[n].colored); });
          if (!isObject(roles)) err('OPTION_THEME', 'options.theme.roles', 'an object of resolved role values');
          else {
            o.roles = {};
            Object.keys(roles).forEach(function (r) {
              var rp = 'options.theme.roles.' + r, v = roles[r], kept = {};
              if (known.indexOf(r) === -1) { err('OPTION_THEME', rp, 'not a colored role of a semantic system'); return; }
              if (!isObject(v)) { err('OPTION_THEME', rp, '{ fill, ink }'); return; }
              closedKeys(v, ROLE_KEYS, 'OPTION_THEME', rp, errors);
              ROLE_KEYS.forEach(function (k) {
                var x = v[k];
                if (typeof x !== 'string' || !x.length || THEME_UNSAFE.test(x) || ROLE_UNSAFE.test(x) || XML_UNSAFE.test(x)) err('OPTION_THEME', rp + '.' + k, 'a resolved color value');
                kept[k] = x;
              });
              o.roles[r] = kept;
            });
          }
        }
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
    // A declared semantic example is drawn keyed, with its band: its key and explanation are part of
    // reading its color, so no option strips them. Its resolved theme carries its system's role values.
    var sys = systemOf(spec), band = sys ? bandRows(spec, sys) : null;
    if (sys) {
      if (o.keyedGiven && o.keyed === false)
        throw PeerError([{ code: 'OPTION_KEYED', path: 'options.keyed', message: 'a declared semantic example is drawn keyed only: its key and explanation are part of reading its color' }]);
      o.keyed = true;
      if (o.theme !== 'inherit') {
        var given = o.roles ? Object.keys(o.roles) : [];
        var missing = sys.colored.filter(function (r) { return given.indexOf(r) === -1; });
        var foreign = given.filter(function (r) { return sys.colored.indexOf(r) === -1; });
        if (missing.length || foreign.length) throw PeerError(missing.map(function (r) {
          return { code: 'OPTION_THEME', path: 'options.theme.roles.' + r, message: 'a ' + sys.name + ' example drawn with a resolved theme needs each of its roles resolved in the theme\'s own roles' };
        }).concat(foreign.map(function (r) {
          return { code: 'OPTION_THEME', path: 'options.theme.roles.' + r, message: 'not a role of ' + sys.name };
        })));
      }
    } else if (o.roles)
      throw PeerError([{ code: 'OPTION_THEME', path: 'options.theme.roles', message: 'roles belong to a declared semantic example; a neutral plate takes none' }]);
    var G = GEOMETRY, S = G.size, H = S + (o.keyed ? G.keyBand : 0) + (band ? band.height : 0);
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
    // The letters are centered by their measured ink on an alphabetic baseline, and the key's wording starts
    // at its x. So each text rule states, rather than inherits, its anchoring and the properties that would
    // move a text, change the face that draws it or extend its ink (TEXT_RULES); heads and the field take no
    // stroke. A plate inlined or mounted under a host's inherited styles draws as it does alone;
    // tests/peer-host-inheritance.mjs measures it in a browser.
    var s = '#' + id + ' ';
    out.push('<style>' + o.fontFaceCSS
      + s + '.peer-ring{fill:none;stroke:' + c.ink + ';stroke-width:' + G.ring.stroke + '}'
      + s + '.peer-glyph{fill:' + c.ink + ';font-family:' + c.font + ';font-weight:' + c.lw + ';font-size:' + G.fontSize + 'px;text-anchor:middle;font-optical-sizing:auto;' + TEXT_RULES + '}'
      + s + '.peer-edge{fill:none;stroke:' + c.ink + ';stroke-width:' + G.stroke + ';stroke-linecap:butt}'
      + s + '.peer-head{fill:' + c.ink + ';stroke:none}'
      + s + '.peer-neutral{fill:none;stroke:' + c.ink + ';stroke-width:' + G.neutralStroke + ';stroke-linecap:butt}'
      + s + '.peer-key{fill:' + c.ink + ';font-family:' + c.font + ';font-weight:' + c.kw + ';font-size:' + G.keyFontSize + 'px;text-anchor:start;font-optical-sizing:auto;' + TEXT_RULES + '}'
      + s + '.peer-field{stroke:none}'
      + (fixed ? '' : s + '.peer-field-from{stop-color:' + c.from + '}' + s + '.peer-field-to{stop-color:' + c.to + '}')
      + (sys ? semanticRules(spec, sys, s, c, fixed ? o.roles : null) : '')
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

    // Nodes: one equal ring per vertex, then its letter — one size, weight and ink, centered on the
    // vertex by its measured ink bounds.
    out.push('<g class="peer-nodes">');
    spec.nodes.forEach(function (node, i) {
      var gm = o.glyphs.labels.em[node.label];
      // A declared semantic example's node carries its assignment; a colored one is painted by it.
      var assigned = sys ? ' data-' + sys.assignment + '="' + esc(node[sys.assignment]) + '"' : '';
      out.push('<circle class="peer-ring" data-node="' + esc(node.id) + '" cx="' + f(pts[i].x) + '" cy="' + f(pts[i].y) + '" r="' + f(G.ring.radius) + '"' + assigned + '/>');
      out.push('<text class="peer-glyph" data-node="' + esc(node.id) + '" x="' + f(pts[i].x + gm.dx * G.fontSize) + '" y="' + f(pts[i].y + gm.dy * G.fontSize) + '"' + assigned + '>' + esc(node.label) + '</text>');
    });
    out.push('</g>');

    if (sys) out.push(notes(spec, sys, pts));
    if (o.keyed) out.push(key(spec));
    if (band) out.push(drawBand(band, S + G.keyBaseline + G.bandFirst));
    out.push('</svg>');
    return out.join('');
  }

  // ------------------------------------------------------------------ declared semantic examples

  /** The paint of each colored role the plate's nodes carry: the ring filled at 100% of the role's
      value, its stroke in the same value, and the letter in the role's ink. A page plate reads the
      system's tokens; a standalone file its resolved roles. An unassessed or 'none' node matches no
      rule and keeps the neutral ring. Every rule is scoped to the plate. */
  function semanticRules(spec, sys, s, c, resolved) {
    var used = sys.colored.filter(function (r) { return spec.nodes.some(function (n) { return n[sys.assignment] === r; }); });
    var G = GEOMETRY, out = '';
    used.forEach(function (r) {
      var fill = resolved ? resolved[r].fill : 'var(--' + sys.tokens + '-' + r + ')';
      var ink = resolved ? resolved[r].ink : 'var(--' + sys.tokens + '-' + r + '-ink)';
      var on = '[data-' + sys.assignment + '="' + r + '"]';
      out += s + '.peer-ring' + on + '{fill:' + fill + ';stroke:' + fill + '}'
        + s + '.peer-glyph' + on + '{fill:' + ink + '}';
    });
    return out
      + s + '.peer-note{fill:' + c.ink + ';font-family:' + c.font + ';font-weight:' + c.kw + ';font-size:' + G.noteFontSize + 'px;text-anchor:middle;font-optical-sizing:auto;' + TEXT_RULES + '}'
      + s + '.peer-band{fill:' + c.ink + ';font-family:' + c.font + ';font-weight:' + c.kw + ';font-size:' + G.bandFontSize + 'px;text-anchor:start;font-optical-sizing:auto;' + TEXT_RULES + '}';
  }

  /** Each node's note, outside its ring and centered on its vertex, in the plate's ink: a figure's lines
      and the assessment word, or the function's name. Above a node in the plate's upper half, below one
      in its lower half. An unassessed node shows its figure alone; a 'none' node shows nothing. */
  function notes(spec, sys, pts) {
    var G = GEOMETRY, S = G.size, out = [], cap = 2 * G.keyCapCenter * G.noteFontSize;
    var rim = G.ring.radius + G.ring.stroke / 2 + G.noteGap;
    spec.nodes.forEach(function (node, i) {
      var a = node[sys.assignment], lines = [];
      if (sys.textRequired) { if (a !== 'none') lines.push(a); }
      else {
        if (own(node, sys.text)) lines = lines.concat(node[sys.text]);
        if (sys.colored.indexOf(a) !== -1) lines.push(a);
      }
      if (!lines.length) return;
      var above = pts[i].y < S / 2;
      // Above: the last line's baseline sits the gap above the ring, with room for a descender. Below:
      // the first line's cap height sits the gap below it.
      var first = above ? pts[i].y - rim - 0.24 * G.noteFontSize - (lines.length - 1) * G.noteLeading : pts[i].y + rim + cap;
      lines.forEach(function (line, k) {
        out.push('<text class="peer-note" data-node="' + esc(node.id) + '" x="' + f(pts[i].x) + '" y="' + f(first + k * G.noteLeading) + '">' + esc(line) + '</text>');
      });
    });
    return '<g class="peer-notes">' + out.join('') + '</g>';
  }

  /** The band's rows: each declaration under its label, then, for Three Functions, each role-bearing
      node's does under its letter and function. Its height runs from the key band's foot to the plate's
      foot. */
  function bandRows(spec, sys) {
    var rows = sys.declarations.map(function (d) { return { label: sys.labels[d], lines: spec.semantic[d] }; });
    if (sys.textRequired) spec.nodes.forEach(function (n) {
      if (n[sys.assignment] !== 'none') rows.push({ label: n.label + ' ' + n[sys.assignment], lines: n[sys.text] });
    });
    var G = GEOMETRY, count = rows.reduce(function (t, r) { return t + r.lines.length; }, 0);
    var last = G.keyBaseline + G.bandFirst + G.bandLeading + G.bandHeadGap + (count - 1) * G.bandLeading + (rows.length - 1) * G.bandRowGap;
    return { name: sys.name, rows: rows, height: last + G.bandFoot - G.keyBand };
  }

  function drawBand(band, y) {
    var G = GEOMETRY, x0 = (G.size - 2 * G.radius) / 2, xt = x0 + G.bandLabelWidth, out = [];
    out.push('<text class="peer-band" x="' + f(x0) + '" y="' + f(y) + '">' + esc(band.name) + '</text>');
    y += G.bandLeading + G.bandHeadGap;
    band.rows.forEach(function (row, r) {
      if (r) y += G.bandRowGap;
      out.push('<text class="peer-band" x="' + f(x0) + '" y="' + f(y) + '">' + esc(row.label) + '</text>');
      row.lines.forEach(function (line) {
        out.push('<text class="peer-band" x="' + f(xt) + '" y="' + f(y) + '">' + esc(line) + '</text>');
        y += G.bandLeading;
      });
    });
    return '<g class="peer-band-group">' + out.join('') + '</g>';
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
    VERSION: VERSION, PRESETS: PRESETS, TYPES: TYPES, GEOMETRY: GEOMETRY, SEMANTIC: SEMANTIC,
    validate: validate, render: render, mount: mount, idPrefixFor: idPrefixFor, semanticSystem: semanticSystem,
    matrix: matrix, signatures: signatures, symmetry: symmetry, describe: describe,
  };
});
