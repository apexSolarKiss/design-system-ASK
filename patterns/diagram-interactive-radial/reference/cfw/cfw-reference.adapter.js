/* cfw-reference.adapter.js — the adapter of the pattern's reference specimen: the Consciousness +
   Free Will (CFW) research map, rendered through the generalized owner modules.

   REFERENCE CONTENT, NOT OWNER MACHINERY. This file is the specimen's consumer side. It reads
   the captured research input (atlas-data.public.js, beside it, unchanged) and declares, in the
   radial contract's terms, everything the CFW map is: how its objects group into regions and
   branches, how a status reads as a governed state, which relations sit on which plane, and
   every word, field and facet the reader sees. The owner modules know none of it, load none of
   it, and run unchanged on synthetic data (diagram-interactive-radial.neutral.html).

   THE INPUT IS FROZEN; THE IMPLEMENTATION IS NOT. The payload is the CFW map's public data
   as captured on 2026-10-02 (provenance below). This adapter transforms it deterministically
   and rewrites nothing in it: every identifier, label, relation and field reaches the reader
   as captured, except that a reference row shows the first 120 (evidence) or 90 (evidence for)
   characters of a label, as the CFW map does; the full label is the referenced object's view. The projection rules restate the CFW map's own (its region partition, branch
   ladder and state mapping) so the same objects group the same way. */
(function (root) {
  'use strict';

  var A = root.CFW_ATLAS;
  if (!A || !Array.isArray(A.objects)) throw new Error('cfw-reference: the captured payload (atlas-data.public.js) is not loaded');

  var PROVENANCE = {
    label: 'reference content captured on 2026-10-02',
    repository: 'apexSolarKiss/ASK',
    commit: '04ad61051428a4153979ba5a8eb388f2eb8f743e',
    path: 'apex-solar-kiss/consciousness-free-will/atlas-data.public.js',
    bytes: 810551,
    sha256: '19bda6eb0f59881ceb72dc007d611bca2d0ce208e670853e743201fd4fb215b9',
    live: 'https://a-s-k.studio/apex-solar-kiss/consciousness-free-will/map/'
  };

  /* ------------------------------------------------------------ the tables -- */
  var REGION_LABEL = {
    'consciousness_master-context-note.md': 'Consciousness',
    'free-will-agency_master-context-note.md': 'Free will + agency',
    'machine-personhood-recourse_master-context-note.md': 'Machine personhood + recourse',
    'consciousness-free-will_master-context-note.md': 'The hub // shared frame',
    'consciousness-free-will_relation-map.md': 'Relation map',
    'consciousness-free-will_source-ledger.md': 'Evidence ledger'
  };
  var REGION_ORDER = [
    'consciousness_master-context-note.md', 'free-will-agency_master-context-note.md',
    'machine-personhood-recourse_master-context-note.md', 'consciousness-free-will_master-context-note.md',
    'consciousness-free-will_relation-map.md'
  ].map(function (f) { return REGION_LABEL[f] || f; });
  var STATES = [
    { role: 'earned', label: 'ASK-ruled', meaning: 'adjudicated by a ruling' },
    { role: 'held', label: 're-held', meaning: 're-held in sharper form' },
    { role: 'partial', label: 'partially tested', meaning: 'an open obligation' },
    { role: 'deflated', label: 'contested', meaning: 'recorded and contested' },
    { role: 'external', label: 'unclassified', meaning: 'admitted, untyped' },
    { role: 'structural', label: 'ASK-typed', meaning: 'an ASK mapping row' },
    { role: 'neutral', label: 'recorded', meaning: 'no governed state' }
  ];
  var CLASS_SHAPE = {
    'CFW-N': 'circle', 'CFW-C': 'square', 'CFW-B': 'square', 'CFW-M': 'square', 'CFW-F': 'square',
    'CFW-A': 'diamond', 'CFW-Q': 'hex', 'CFW-X': 'tri', 'CFW-T': 'ring', 'CFW-S': 'circle'
  };
  var CLASS_NAME = {
    'CFW-N': 'node \u2014 a survey position, argument, tradition or distinction',
    'CFW-C': 'claim card', 'CFW-B': 'bounded claim', 'CFW-M': 'ASK mapping row',
    'CFW-F': 'frame object', 'CFW-A': 'ASK articulation', 'CFW-Q': 'held question',
    'CFW-X': 'cross-cutting object', 'CFW-T': 'topology object', 'CFW-S': 'evidence owner (inspector plane)'
  };
  var ROOT = { id: 'ROOT', label: 'Consciousness + free will' };
  var RECORD_CLASS = 'CFW-S';                 /* evidence owners: undrawn records, resolvable by identifier */

  /* --------------------------------------------------------- the projection -- */
  function regionKeyOf(o) { return o.region || REGION_LABEL[o.owner] || o.owner; }
  function governedState(o) {
    var s = [o.status, o.state, o.disposition].filter(Boolean).join(' - ');
    if (!s) return (o['class'] === 'CFW-M' || o['class'] === 'CFW-A') ? 'structural' : 'neutral';
    var u = s.toUpperCase();
    if (u.indexOf('UNCLASSIFIED') >= 0) return 'external';
    if (u.indexOf('RE-HELD') >= 0) return 'held';
    if (u.indexOf('ASK-RULED') >= 0 || u.indexOf('RULED CONDITIONALLY') >= 0) return 'earned';
    if (u.indexOf('PARTIALLY TESTED') >= 0) return 'partial';
    if (u.indexOf('CONTESTED') >= 0) return 'deflated';
    return 'neutral';
  }
  function humanizeBranch(key, composed) {
    if (!key) return 'unsectioned';
    var s = String(key).replace(/^[\u00A7\s]+/, '').trim();
    if (!composed) s = s.replace(/^([IVXLC]+(?:\.\d+)*[a-z]?)\s*[\u2014\u2013-]?\s*/, '$1 / ');
    s = s.replace(/\s*\/\s*/g, ' / ').replace(/(\s\/\s)+/g, ' / ').replace(/\s*\/\s*$/, '').trim();
    return s.length > 62 ? s.slice(0, 60).replace(/[\s/,-]+$/, '') + '\u2026' : s;
  }
  function sectionPrefix(s) {
    var m = String(s || '').match(/^\s*(?:\u00A7\s*)?([IVXLC]+(?:\.\d+)*|\d+(?:\.\d+)+)(?![\w])/);
    return m ? m[1] : null;
  }
  function sectionHead(s) {
    var p = sectionPrefix(s); if (!p) return null;
    var rest = String(s).replace(/^\s*(?:\u00A7\s*)?/, '').slice(p.length);
    rest = rest.replace(/^[\s/\u2014\u2013-]+/, '').split(/[\u2014\u2013,;:]|\s\/\s/)[0].trim();
    return rest ? rest.replace(/\s+/g, ' ') : null;
  }

  var byId = new Map();
  A.objects.forEach(function (o) { byId.set(o.id, o); });
  var primary = A.objects.filter(function (o) { return o['class'] !== RECORD_CLASS; });
  var evidence = A.objects.filter(function (o) { return o['class'] === RECORD_CLASS; });

  var secCount = {}, preCount = {}, preHeads = {};
  primary.forEach(function (o) {
    var s = (o.section || '').trim();
    if (!s || /^legacy register ID/i.test(s)) return;
    var rk = regionKeyOf(o);
    secCount[rk + ' ' + s] = (secCount[rk + ' ' + s] || 0) + 1;
    var p = sectionPrefix(s);
    if (p) {
      var pk = rk + ' ' + p;
      preCount[pk] = (preCount[pk] || 0) + 1;
      var h = sectionHead(s);
      if (h) { preHeads[pk] = preHeads[pk] || {}; preHeads[pk][h] = (preHeads[pk][h] || 0) + 1; }
    }
  });
  function prefixLabel(pk, p) {
    var hs = preHeads[pk] ? Object.keys(preHeads[pk]).sort(function (a, b) { return preHeads[pk][b] - preHeads[pk][a]; }) : [];
    if (!hs.length) return p;
    return p + ' / ' + hs.slice(0, 2).map(function (h) {
      h = h.replace(/^[\u00A7\s]+/, '');
      return h.length > 30 ? h.slice(0, 29).replace(/[\s/,-]+$/, '') + '\u2026' : h;
    }).join(' + ');
  }
  /* the branch ladder: field domain, then a numbered section spine shared by two or more, then a
     full section shared by two or more, then the node type, else unsectioned */
  function branchKey(o) {
    if (o.field_domain && String(o.field_domain).trim())
      return { k: 'fd:' + o.field_domain, src: 'field_domain', raw: o.field_domain, pre: false };
    var s = (o.section || '').trim();
    if (s && !/^legacy register ID/i.test(s)) {
      var p = sectionPrefix(s), pk = regionKeyOf(o) + ' ' + p;
      if (p && preCount[pk] >= 2) return { k: 'pre:' + p, src: 'section-spine', raw: prefixLabel(pk, p), pre: true };
      if (secCount[regionKeyOf(o) + ' ' + s] >= 2) return { k: 'sec:' + s, src: 'section', raw: s, pre: false };
    }
    if (o.node_type && String(o.node_type).trim()) return { k: 'nt:' + o.node_type, src: 'node_type', raw: o.node_type, pre: false };
    return { k: 'un:', src: 'unsectioned', raw: 'unsectioned', pre: false };
  }

  /* regions in their declared order; an unknown region opens a new one rather than dropping */
  var regions = [], regionIdx = {};
  REGION_ORDER.forEach(function (key) {
    var r = { id: 'REGION::' + key, key: key, label: REGION_LABEL[key] || key, branches: [], count: 0 };
    regionIdx[key] = r; regions.push(r);
  });
  primary.forEach(function (o) {
    var rk = regionKeyOf(o), r = regionIdx[rk];
    if (!r) { r = { id: 'REGION::' + rk, key: rk, label: REGION_LABEL[rk] || rk, branches: [], count: 0 }; regionIdx[rk] = r; regions.push(r); }
    var bk = branchKey(o), bid = r.id + '|' + bk.k, b = null;
    for (var j = 0; j < r.branches.length; j++) if (r.branches[j].id === bid) { b = r.branches[j]; break; }
    if (!b) { b = { id: bid, label: humanizeBranch(bk.raw, bk.pre), rawLabel: String(bk.raw), src: bk.src, region: r, leaves: [] }; r.branches.push(b); }
    b.leaves.push(o); r.count++;
  });
  regions = regions.filter(function (r) { return r.count > 0; });
  regions.forEach(function (r) {
    r.branches.sort(function (a, b) { return b.leaves.length - a.leaves.length; });
    r.branches.forEach(function (b) { b.leaves.sort(function (x, y) { return String(x.id).localeCompare(String(y.id)); }); });
  });

  /* the grouping each container records: what the inspector reports as "grouped by" */
  var groups = new Map();
  var nodes = [];
  regions.forEach(function (r) {
    groups.set(r.id, { kind: 'region', src: null, region: null });
    nodes.push({ id: r.id, label: r.label, container: true });
    r.branches.forEach(function (b) {
      groups.set(b.id, { kind: 'branch', src: b.src, rawLabel: b.rawLabel, region: r });
      nodes.push({ id: b.id, label: b.label, parent: r.id, container: true });
      b.leaves.forEach(function (o) {
        nodes.push({ id: o.id, label: String(o.label || o.id), parent: b.id, kind: o['class'], state: governedState(o), data: o });
      });
    });
  });
  var records = evidence.map(function (o) { return { id: o.id, label: String(o.label || o.id), kind: o['class'], data: o }; });

  /* relations by plane. Registered: canonical, directed. Recorded: a carrier field; an edge to an
     evidence owner becomes a record link, never drawn. Unedged: a declared non-linkage. */
  var edges = [];
  (A.registered || []).forEach(function (e) {
    if (byId.has(e.from) && byId.has(e.to))
      edges.push({ id: e.id, from: e.from, to: e.to, plane: 'registered', type: e.type, note: e.prose_home_register || e.prose_home || '' });
  });
  (A.recorded || []).forEach(function (e) {
    if (byId.has(e.from) && byId.has(e.to)) edges.push({ from: e.from, to: e.to, plane: 'recorded', type: e.kind, note: e.source_field || '' });
  });
  (A.unedged || []).forEach(function (e) {
    if (byId.has(e.from) && byId.has(e.to)) edges.push({ from: e.from, to: e.to, plane: 'unedged', type: 'declared non-linkage', note: e.reason || '' });
  });

  /* the order the CFW map lists "evidence for" in: each primary object by its first evidence link */
  var firstEvidence = new Map();
  (A.recorded || []).forEach(function (e, i) {
    var a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) return;
    var p = b['class'] === RECORD_CLASS ? a : a['class'] === RECORD_CLASS ? b : null;
    if (p && p['class'] !== RECORD_CLASS && !firstEvidence.has(p.id)) firstEvidence.set(p.id, i);
  });

  /* held-question bearing: a held question, or a registered or recorded relation to one */
  var bearing = new Set();
  primary.forEach(function (o) { if (o['class'] === 'CFW-Q') bearing.add(o.id); });
  edges.forEach(function (e) {
    if (e.plane === 'unedged' || !byId.has(e.from) || !byId.has(e.to)) return;
    if (byId.get(e.from)['class'] === RECORD_CLASS || byId.get(e.to)['class'] === RECORD_CLASS) return;
    if (/^CFW-Q-/.test(e.to)) bearing.add(e.from);
    if (/^CFW-Q-/.test(e.from)) bearing.add(e.to);
  });

  var data = {
    root: ROOT,
    nodes: nodes,
    records: records,
    planes: [
      { id: 'registered', label: 'registered relation', drawn: 'always', directed: true },
      { id: 'recorded', label: 'recorded reference', drawn: 'selection', directed: false },
      { id: 'unedged', label: 'unedged context', drawn: 'never', directed: false }
    ],
    states: STATES,
    kinds: Object.keys(CLASS_NAME).map(function (c) { return { id: c, label: CLASS_NAME[c], shape: CLASS_SHAPE[c] }; }),
    edges: edges
  };

  /* ------------------------------------------------------------- counts -- */
  var lang = 'en';
  function n(x) { return x.toLocaleString(lang); }
  function cap(s, k) { s = String(s || ''); return s.length > k ? s.slice(0, k) : s; }
  var axes = primary.filter(function (o) { return o.axes_addressed && String(o.axes_addressed).trim(); }).length;
  var fd = {};
  primary.forEach(function (o) { if (o.field_domain) fd[o.field_domain] = (fd[o.field_domain] || 0) + 1; });
  var fdOrder = Object.keys(fd).sort(function (a, b) { return fd[b] - fd[a]; });
  function upper(s) { return String(s || '').toUpperCase(); }
  function stateOf(role) { for (var i = 0; i < STATES.length; i++) if (STATES[i].role === role) return STATES[i]; return null; }

  /* ---------------------------------------------------------- the inspector -- */
  var inspector = {
    name: 'inspector',
    controls: { collapse: 'collapse the inspector', expand: 'expand the inspector' },
    idle: 'Hover a concept to preview it. Click to lock. Evidence owners, quotation fidelity and authority detail ' +
          'resolve here \u2014 never in hue, and never in position.\n\nUse atlas in the top bar to search all ' +
          n(A.objects.length) + ' objects by name or exact identifier, or to bound the map to a section.',
    back: '\u2190 back to {label}',
    backMax: 52,
    header: function (t) {
      if (t.type === 'record') return { title: String(t.node.data.work || t.node.label), kind: 'CFW-S \u2014 evidence owner \u00B7 inspector plane' };
      if (t.type === 'item') return { title: t.node.label };
      var g = groups.get(t.id);
      return { title: t.node.label, kind: t.type === 'root' ? 'root' : g.kind };
    },
    sections: function (t, ctx) {
      if (t.type === 'record') return recordSections(t, ctx);
      if (t.type !== 'item') {
        var g = groups.get(t.id) || {};
        return [{ type: 'fields', fields: [
          { label: 'objects under it', value: ctx.filtered() ? t.shown + ' in this section, of ' + t.count : String(t.count) },
          { label: 'grouped by', value: g.src, mono: true },
          { label: 'region', value: g.kind === 'branch' ? g.region.label : null, mono: true }
        ] }];
      }
      var o = t.node.data, sd = stateOf(t.node.state);
      var ev = ctx.links(t.id).filter(function (l) { return l.other && l.other.kind === RECORD_CLASS; });
      var out = [{ type: 'state' }];
      if (o.ask_ruled || o.not_ask_ruled || o.authority_note) out.push({ type: 'fields', title: 'authority', fields: [
        { label: 'ASK ruled', value: o.ask_ruled, format: 'structured', tone: 'earned' },
        { label: 'NOT ASK ruled', value: o.not_ask_ruled, format: 'structured', tone: 'muted' },
        { label: 'authority note', value: o.authority_note }
      ] });
      out.push({ type: 'fields', fields: [
        { label: 'identifier', value: o.id, mono: true },
        { label: 'region', value: String(o.region || o.owner || '') + (o.section ? '  ' + o.section : ''), mono: true },
        { label: 'node type', value: o.node_type },
        { label: 'field domain', value: o.field_domain },
        { label: 'status', value: o.status },
        { label: 'disposition', value: o.disposition && upper(o.disposition) !== upper(sd ? sd.meaning : '') ? o.disposition : null },
        { label: 'question', value: o.question && o.question !== o.label ? o.question : null },
        { label: 'claim', value: o.claim_text && o.claim_text !== o.label ? o.claim_text : null },
        { label: 'logical form', value: o.logical_form },
        { label: 'schema depth', value: o.schema, mono: true },
        { label: 'source basis', value: o.source_basis }
      ] });
      out.push({ type: 'relations', title: 'typed relations \u2014 {count}', show: 'id',
                 tags: { registered: 'registered', recorded: 'recorded', unedged: 'unedged' },
                 never: 'declared non-linkage \u2014 deliberately not drawn',
                 outside: 'outside this section \u2014 the relation is unchanged' });
      out.push({ type: 'references', title: 'evidence owners \u2014 {count}', head: 8, more: 'show all {count} evidence owners',
                 items: ev.map(function (l) {
                   var s = l.other.data || {};
                   return { id: l.other.id, text: cap(l.other.label, 120), detail: s.fidelity ? 'fidelity ' + s.fidelity : undefined };
                 }) });
      return out;
    },
    announce: function (t, ctx) {
      if (t.type === 'record') return 'Evidence owner ' + t.id + ', ' + cap(t.node.data.work || t.node.label, 80);
      if (t.type !== 'item') return (t.type === 'root' ? 'root' : groups.get(t.id).kind) + ' ' + t.node.label + ', ' + t.count + ' objects';
      var ev = ctx.links(t.id).filter(function (l) { return l.other && l.other.kind === RECORD_CLASS; }).length;
      return t.node.data['class'] + ' ' + t.id + ', ' + cap(t.node.label, 90) + (ev ? ', ' + ev + ' evidence owners' : '');
    }
  };
  function recordSections(t, ctx) {
    var o = t.node.data;
    var back = [];
    ctx.links(t.id).forEach(function (l) {
      if (l.other && l.other.kind !== RECORD_CLASS && back.indexOf(l.other.id) < 0) back.push(l.other.id);
    });
    back.sort(function (a, b) { return firstEvidence.get(a) - firstEvidence.get(b); });
    var out = [
      { type: 'fields', fields: [
        { label: 'identifier', value: o.id, mono: true },
        { label: 'source type', value: o.source_type },
        { label: 'author', value: o.author },
        { label: 'exact work', value: o.work },
        { label: 'edition / version', value: o.edition },
        { label: 'access', value: o.access },
        { label: 'license', value: o.licence },
        { label: 'axes addressed', value: o.axes_addressed }
      ] },
      { type: 'fields', title: 'verification', fields: [
        { label: 'verification depth', value: o.verification_depth },
        { label: 'quotation fidelity', value: o.fidelity },
        { label: 'evidence class', value: o.evidence_class },
        { label: 'last verified', value: o.last_verified },
        { label: 'read scope', value: o.read_scope },
        { label: 'strongest', value: o.strongest }
      ] }
    ];
    if (o.canonical_destination || o.bears_on || o.relation_ids) out.push({ type: 'fields', title: 'governed placement', fields: [
      { label: 'canonical destination', value: o.canonical_destination },
      { label: 'bears on', value: o.bears_on, mono: true },
      { label: 'relation IDs', value: o.relation_ids, mono: true },
      { label: 'canonical row', value: o.canonical_row_id, mono: true }
    ] });
    out.push({ type: 'fields', title: 'carrier', fields: [
      { label: 'region', value: String(o.region || o.owner || '') + (o.section ? '  ' + o.section : ''), mono: true },
      { label: 'generation', value: o.generation, mono: true },
      { label: 'citation', labelLinked: 'source link', value: o.locator, format: 'locator' },
      { label: 'fields present', value: o.fields_present, format: 'list' }
    ] });
    out.push({ type: 'references', title: 'evidence for \u2014 {count}',
               items: back.map(function (k) { return { id: k, text: cap(byId.get(k).label, 90) }; }) });
    out.push({ type: 'note', text: 'This evidence owner sits in the inspector plane by the atlas\u2019s declared plane assignment. ' +
                                   'It is searchable and resolvable by exact identifier, and it is never promoted into the graph.' });
    return out;
  }

  /* ------------------------------------------------------------ the facets -- */
  var facets = {
    name: 'atlas',
    title: 'atlas',
    close: 'close atlas controls',
    note: 'A filter bounds the map to a section and always reports its census. It is not level of detail, and it never changes a governed relation.',
    reset: 'reset to complete map',
    families: { items: 'projection', relations: 'relation view' },
    declared: [
      { id: 'region', title: 'conceptual region', family: 'items', note: 'the conceptual region the object is recorded in',
        value: function (x) { return x.data.region || x.data.owner; },
        label: function (v) { return REGION_LABEL[v] || v; },
        order: regions.map(function (r) { return r.key; }) },
      { id: 'cls', title: 'object class', family: 'items', note: 'the CFW class the payload assigns',
        value: function (x) { return x.data['class']; },
        label: function (c) { return c + ' \u2014 ' + String(CLASS_NAME[c] || '').split(' \u2014 ')[0]; },
        order: 'value' },
      { id: 'state', title: 'governed state', family: 'items', note: 'read off status / state / disposition \u2014 the same field color encodes',
        value: function (x) { return x.state; },
        label: function (r) { return stateOf(r).label; },
        order: STATES.map(function (s) { return s.role; }), swatch: true },
      { id: 'qbear', title: 'held-question bearing', family: 'items',
        note: 'IS a held question, or carries a governed relation to one \u2014 declared non-linkages excluded',
        value: function (x) { return bearing.has(x.id) ? 'yes' : 'no'; },
        label: function (v) { return v === 'yes' ? 'bears on a held question' : 'no question relation'; },
        order: ['yes', 'no'] },
      { id: 'fdom', title: 'field domain', family: 'items',
        note: 'SPARSE \u2014 only {present} of {total} primary objects carry this field. Filtering on it bounds the section to those that do; it does not mean the rest are unclassified.',
        value: function (x) { return x.data.field_domain; },
        order: fdOrder },
      { id: 'plane', title: 'relationship plane', family: 'relations',
        note: 'which existing edges are DRAWN. Unedged context is never drawn at any setting \u2014 a line would assert the linkage the record denies.',
        value: function (e) { return e.plane; },
        label: function (p) {
          return { registered: 'registered relation \u2014 CFW-R, canonical, directed', recorded: 'recorded reference \u2014 a carrier field',
                   unedged: 'unedged context \u2014 never drawn, inspector only' }[p] || p;
        },
        order: ['registered', 'recorded', 'unedged'], locked: ['unedged'] },
      { id: 'rtype', title: 'registered relation type', family: 'relations', note: 'the type recorded on the eight canonical CFW-R relations',
        value: function (e) { return e.plane === 'registered' ? e.type : undefined; },
        order: 'value' }
    ],
    notOffered: [{ title: 'axes addressed', tag: 'NOT STRUCTURED / NOT OFFERED',
                   reason: 'NOT STRUCTURED on primary objects \u2014 ' + axes + ' of ' + primary.length + ' carry it. ' +
                           'It is a CFW-S ledger field; it is shown in the evidence-owner inspector instead.' }],
    search: {
      label: 'search \u2014 name or exact identifier',
      placeholder: 'recourse \u00B7 CFW-Q-001 \u00B7 CFW-S-479',
      prefix: /^cfw-/i,
      text: function (e) {
        if (e.type === 'container') {
          var g = groups.get(e.key);
          return g.kind === 'region' ? e.label + ' ' + g.region : e.label + ' ' + g.rawLabel + ' ' + g.region.label;
        }
        var o = e.node.data;
        return [o.id, o.label, o.section, o.node_type, o.field_domain, o.author, o.work, o.question, o.region, o.evidence_class]
          .filter(Boolean).join(' ');
      },
      tag: function (e) { return e.type === 'record' ? 'CFW-S' : e.type === 'container' ? groups.get(e.key).kind : 'object'; },
      sub: function (e) { return e.type === 'container' ? e.count + ' objects' : e.key; },
      limit: 40,
      labelMax: 88
    },
    announce: {
      results: '{count} result{s}',
      group: 'focused {label}, {count} objects',
      outside: '{id} is outside the current section \u2014 resetting to the complete map',
      reset: 'reset to the complete map, {total} objects',
      cleared: 'search cleared'
    }
  };
  /* a region's search text names its region key too, as the CFW index does */
  regions.forEach(function (r) { groups.get(r.id).region = r.key; });

  var adapter = {
    layout: { allocation: 'equal', itemMax: 74 },
    labels: {
      tiers: [
        { k: 0, name: 'regions', containers: 2, leaves: false, ids: false, minLeaves: { 2: 16 } },
        { k: 0.58, name: 'branches', containers: 'all', leaves: false, ids: false, defer: false },
        { k: 1.05, name: 'concepts', containers: 'all', leaves: true, ids: false, defer: false },
        { k: 2.30, name: 'records', containers: 'all', leaves: true, ids: true, defer: false }
      ],
      count: { 1: '{count} objects', '*': '{count}' },
      countFiltered: { 1: '{count} / {total} objects', '*': '{count} / {total}' },
      crowding: 'keep'
    },
    text: {
      census: { complete: '{visible} / {total} objects \u2014 complete map, no filter',
                filtered: '{visible} / {total} objects \u00B7 {relations} edges drawn \u00B7 {active} filter{s} active' },
      filtered: { on: 'filtered {visible}/{total}', off: 'no filter' },
      noMatch: 'no match in {objects} objects, {depth1} regions or {depth2} branches'
    },
    inspector: inspector,
    facets: facets,
    legend: {
      headings: { state: 'color = governed state', line: 'line = relationship plane', shape: 'shape = object class' },
      notes: { planes: { registered: 'CFW-R, canonical, directed', recorded: 'a carrier field \u2014 resolves on selection',
                         unedged: 'a declared NON-linkage \u2014 never drawn; in the inspector' } },
      shapes: 'circle node \u00B7 square claim and frame families \u00B7 diamond ASK articulation \u00B7 hexagon question \u00B7 triangle cross-cutting \u00B7 ring topology',
      bound: 'Edges are the only relation encoding. Distance, width, position and adjacency claim nothing \u2014 see the caption.'
    },
    chrome: { panels: [{ slot: 'caption', trigger: 'About' }, { slot: 'legend', trigger: 'Legend' }] },
    export: {
      filenameBase: 'cfw-mind-map',
      profiles: { page: { size: [3840, 2880], scale: 2, detail: 1 }, diagram: { longEdge: 3840, scale: 2, detail: 1 } },
      mark: 'required',
      fonts: 'carrier',
      header: { title: 'consciousness + free will', subtitle: 'mind map // typed relation atlas',
                stamp: PROVENANCE.label, canonical: 'a-s-k.studio/apex-solar-kiss/consciousness-free-will/map' },
      /* the plate's shape key draws the marks with short names, so a reader can decode the plate */
      shapeKey: [['circle', 'node'], ['square', 'claim + frame'], ['diamond', 'ASK articulation'],
                 ['hex', 'held question'], ['tri', 'cross-cutting'], ['ring', 'topology']],
      /* the census, as the CFW plate states it */
      plateLines: function (c) {
        return [
          c.items + ' primary objects // ' + c.records + ' evidence owners',
          (c.containers[1] || 0) + ' regions // ' + (c.containers[2] || 0) + ' branches',
          (c.relations.registered || 0) + ' registered drawn // ' + (c.relations.recorded || 0) + ' recorded retained, hidden at rest // ' +
            (c.relations.unedged || 0) + ' unedged, never drawn',
          'level of detail: ' + c.tier + ' // full atlas, unfiltered, neutral state'
        ];
      }
    },
    theme: 'own',
    arrival: { hash: true }
  };

  root.RADIAL_REFERENCE = { data: data, adapter: adapter, provenance: PROVENANCE,
                            modules: ['inspector', 'facets', 'legend', 'chrome', 'export', 'theme'] };
})(typeof window !== 'undefined' ? window : globalThis);
