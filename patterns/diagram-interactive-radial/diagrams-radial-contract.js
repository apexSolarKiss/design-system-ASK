/* diagrams-radial-contract.js — the data contract of the interactive radial pattern:
   validation and assembly. DOM-free; it runs the same in a page and in Node.

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. README.md §Data contract is the text this
   file implements.

   It knows a containment hierarchy (a root, placed nodes, containers and leaves), undrawn
   records, typed edges, planes, kinds and states. It knows nothing about any consumer.

   IDENTITY. Identifiers are opaque strings in one namespace across the root, the placed
   nodes and the records. They are held in Maps, so any string is a valid identifier,
   `__proto__` included, and the contract derives no identifier from another.

   STRUCTURAL ERRORS THROW. A malformed declaration throws a named ContractError
   (`radial contract <CODE>: <detail>`) and nothing renders. A reference the data cannot
   resolve is not a structural error: it is reported, with the edge's own reference
   information, and not drawn.

   ABSENCE IS EXPLICIT. An optional owner field is absent only when its key is missing or its
   value is `undefined`. Any other value must have the field's type: `null`, `false`, an
   object or an empty string is never read as "use the default". `data` is the consumer's
   opaque record and is checked only as a JSON value.

   TESTED LIMITS. Depth 6 below the root and 2,500 placed nodes are enforced input bounds.
   They are what the owner tests exercise, not a capacity or legibility guarantee. */
(function (root) {
  'use strict';

  var SHAPES = ['circle', 'square', 'diamond', 'hex', 'tri', 'ring'];
  var STATE_ROLES = ['earned', 'partial', 'held', 'deflated', 'external', 'structural', 'proposed', 'neutral'];
  var DRAWN = ['always', 'selection', 'never'];
  var LIMITS = { depth: 6, placed: 2500 };

  /* every key set is closed; `data` is the one opaque value */
  var KEYS = {
    top: ['root', 'nodes', 'records', 'planes', 'states', 'kinds', 'edges', 'options'],
    root: ['id', 'label'],
    node: ['id', 'label', 'parent', 'container', 'kind', 'state', 'data'],
    record: ['id', 'label', 'kind', 'state', 'data'],
    plane: ['id', 'label', 'drawn', 'directed'],
    state: ['role', 'label', 'meaning'],
    kind: ['id', 'label', 'shape'],
    edge: ['id', 'from', 'to', 'plane', 'type', 'note'],
    options: ['emptyContainers']
  };

  function ContractError(code, detail) {
    var e = new Error('radial contract ' + code + ': ' + detail);
    e.name = 'ContractError';
    e.code = code;
    return e;
  }
  function need(ok, code, detail) { if (!ok) throw ContractError(code, detail); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function absent(o, k) { return !has(o, k) || o[k] === undefined; }
  function text(v) { return typeof v === 'string' && v.length > 0; }
  /* a plain object from any realm (a page, a frame, a test context): its prototype is null or
     an Object.prototype, never a class, a Date or a Map */
  function plain(v) {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
    if (Object.prototype.toString.call(v) !== '[object Object]') return false;
    var p = Object.getPrototypeOf(v);
    return p === null || Object.getPrototypeOf(p) === null;
  }
  function show(v) {
    if (typeof v === 'string') return JSON.stringify(v.length > 40 ? v.slice(0, 40) + '…' : v);
    if (v === null || typeof v !== 'object') return String(v);
    return Array.isArray(v) ? 'an array' : 'an object';
  }
  function closed(o, set, where) {
    need(plain(o), 'NOT_AN_OBJECT', where + ' must be a plain object, got ' + show(o));
    var ks = Object.keys(o);
    for (var i = 0; i < ks.length; i++)
      need(KEYS[set].indexOf(ks[i]) >= 0, 'UNKNOWN_FIELD', where + ': ' + ks[i]);
  }
  /* a required non-empty string */
  function req(o, k, code, where) {
    need(text(o[k]), code, where + '.' + k + ' must be a non-empty string, got ' + show(o[k]));
  }
  /* an optional string: absent, or a string (empty allowed for free text) */
  function optText(o, k, code, where) {
    if (absent(o, k)) return;
    need(typeof o[k] === 'string', code, where + '.' + k + ' must be a string when present, got ' + show(o[k]));
  }
  /* `data` must be a JSON value: plain objects, arrays, strings, finite numbers, booleans,
     null; no cycle. Checked, so the contract's JSON precondition is a tested claim. */
  function jsonValue(v, path, seen) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
    if (typeof v === 'number') { need(isFinite(v), 'DATA_NOT_JSON', path + ' is not a finite number'); return; }
    need(Array.isArray(v) || plain(v), 'DATA_NOT_JSON', path + ' is ' + (typeof v === 'object' ? 'not a plain object or array' : 'a ' + typeof v));
    need(seen.indexOf(v) < 0, 'DATA_NOT_JSON', path + ' contains a cycle');
    seen.push(v);
    if (Array.isArray(v)) for (var i = 0; i < v.length; i++) jsonValue(v[i], path + '[' + i + ']', seen);
    else { var ks = Object.keys(v); for (var j = 0; j < ks.length; j++) jsonValue(v[ks[j]], path + '.' + ks[j], seen); }
    seen.pop();
  }
  function list(d, k) {
    if (absent(d, k)) return [];
    need(Array.isArray(d[k]), 'NOT_AN_ARRAY', k + ' must be an array, got ' + show(d[k]));
    for (var i = 0; i < d[k].length; i++) need(i in d[k], 'NOT_AN_ARRAY', k + ' has a hole at ' + i);
    return d[k];
  }

  /* Validation. Structural errors throw; unresolved and unsupported references are returned. */
  function validate(d) {
    closed(d, 'top', 'contract');
    var nodes = list(d, 'nodes'), records = list(d, 'records'), planesIn = list(d, 'planes'),
        statesIn = list(d, 'states'), kindsIn = list(d, 'kinds'), edges = list(d, 'edges');
    closed(d.root, 'root', 'root');
    need(text(d.root.id) && text(d.root.label), 'ROOT', 'root.id and root.label must be non-empty strings');
    var emptyContainers = 'show';
    if (!absent(d, 'options')) {
      need(plain(d.options), 'OPTIONS', 'options must be a plain object when present, got ' + show(d.options));
      closed(d.options, 'options', 'options');
      if (!absent(d.options, 'emptyContainers')) {
        need(d.options.emptyContainers === 'show' || d.options.emptyContainers === 'hide', 'OPTION',
             'emptyContainers must be "show" or "hide", got ' + show(d.options.emptyContainers));
        emptyContainers = d.options.emptyContainers;
      }
    }

    var planes = new Map(), states = new Map(), kinds = new Map();
    planesIn.forEach(function (p, i) {
      closed(p, 'plane', 'planes[' + i + ']');
      need(text(p.id) && !planes.has(p.id), 'PLANE_ID', 'planes[' + i + '].id ' + show(p.id) + ' is missing or repeated');
      req(p, 'label', 'PLANE_LABEL', 'plane ' + show(p.id));
      need(DRAWN.indexOf(p.drawn) >= 0, 'PLANE_DRAWN', 'plane ' + show(p.id) + '.drawn must be one of ' + DRAWN.join(', ') + ', got ' + show(p.drawn));
      need(typeof p.directed === 'boolean', 'PLANE_DIRECTED', 'plane ' + show(p.id) + '.directed must be a boolean, got ' + show(p.directed));
      planes.set(p.id, p);
    });
    statesIn.forEach(function (s, i) {
      closed(s, 'state', 'states[' + i + ']');
      need(STATE_ROLES.indexOf(s.role) >= 0, 'STATE_ROLE', show(s.role) + ' is not a Spectral State role');
      need(!states.has(s.role), 'DUPLICATE_STATE', s.role);
      req(s, 'label', 'STATE_LABEL', 'state ' + s.role);
      req(s, 'meaning', 'STATE_MEANING', 'state ' + s.role);
      states.set(s.role, s);
    });
    kindsIn.forEach(function (k, i) {
      closed(k, 'kind', 'kinds[' + i + ']');
      need(text(k.id) && !kinds.has(k.id), 'KIND_ID', 'kinds[' + i + '].id ' + show(k.id) + ' is missing or repeated');
      req(k, 'label', 'KIND_LABEL', 'kind ' + show(k.id));
      need(SHAPES.indexOf(k.shape) >= 0, 'KIND_SHAPE', 'kind ' + show(k.id) + '.shape must be one of ' + SHAPES.join(', ') + ', got ' + show(k.shape));
      kinds.set(k.id, k);
    });

    var ids = new Map([[d.root.id, 'root']]);     // one namespace: the root, placed nodes, records
    nodes.forEach(function (n, i) {
      closed(n, 'node', 'nodes[' + i + ']');
      need(text(n.id), 'NODE', 'nodes[' + i + '].id must be a non-empty string, got ' + show(n.id));
      req(n, 'label', 'NODE', 'node ' + show(n.id));
      need(!ids.has(n.id), 'DUPLICATE_ID', show(n.id));
      ids.set(n.id, 'node');
    });
    records.forEach(function (r, i) {
      closed(r, 'record', 'records[' + i + ']');
      need(text(r.id), 'RECORD', 'records[' + i + '].id must be a non-empty string, got ' + show(r.id));
      req(r, 'label', 'RECORD', 'record ' + show(r.id));
      need(!ids.has(r.id), 'DUPLICATE_ID', show(r.id));
      ids.set(r.id, 'record');
    });
    nodes.concat(records).forEach(function (x) {
      if (!absent(x, 'kind')) need(typeof x.kind === 'string' && kinds.has(x.kind), 'KIND', show(x.id) + ': kind ' + show(x.kind) + ' is not a declared kind');
      if (!absent(x, 'state')) need(typeof x.state === 'string' && states.has(x.state), 'NODE_STATE', show(x.id) + ': state ' + show(x.state) + ' is not a declared state');
      if (!absent(x, 'data')) jsonValue(x.data, show(x.id) + '.data', []);
    });

    var children = new Map([[d.root.id, []]]);
    nodes.forEach(function (n) { children.set(n.id, []); });
    nodes.forEach(function (n) {
      var p = absent(n, 'parent') ? d.root.id : n.parent;
      need(text(p) && ids.has(p), 'NODE_PARENT', show(n.id) + ': parent ' + show(p) + ' is not a declared node');
      need(ids.get(p) !== 'record', 'NODE_PARENT_RECORD', show(n.id) + ': parent ' + show(p) + ' is an undrawn record');
      need(p !== n.id, 'CYCLE', show(n.id) + ' is its own parent');
      if (!absent(n, 'container')) need(typeof n.container === 'boolean', 'CONTAINER', show(n.id) + ': container must be a boolean, got ' + show(n.container));
      children.get(p).push(n.id);
    });
    nodes.forEach(function (n) {
      need(!(n.container === false && children.get(n.id).length), 'CONTAINER_CONFLICT', show(n.id) + ' declares container: false and has children');
    });

    /* depth, cycles and capacity: walk from the root; a node never reached sits on a cycle */
    var depth = new Map([[d.root.id, 0]]), stack = [d.root.id];
    while (stack.length) {
      var id = stack.pop(), cs = children.get(id);
      for (var c = 0; c < cs.length; c++) {
        depth.set(cs[c], depth.get(id) + 1);
        need(depth.get(cs[c]) <= LIMITS.depth, 'DEPTH_LIMIT', show(cs[c]) + ' at depth ' + depth.get(cs[c]) + ' (tested limit ' + LIMITS.depth + ')');
        stack.push(cs[c]);
      }
    }
    nodes.forEach(function (n) { need(depth.has(n.id), 'CYCLE', show(n.id) + ' is not reachable from the root'); });
    need(nodes.length > 0, 'NO_PLACED_NODES', 'nothing to draw');
    need(nodes.length <= LIMITS.placed, 'CAPACITY_LIMIT', nodes.length + ' placed nodes (tested limit ' + LIMITS.placed + ')');

    /* Edges. A reference the data cannot resolve is reported, never dropped silently. The framing
       root is a known identifier but not a supported relation endpoint in this version, so an edge
       touching it is reported as unsupported, not as missing. */
    var edgeIds = new Set(), unresolved = [], unsupported = [];
    edges.forEach(function (e, i) {
      closed(e, 'edge', 'edges[' + i + ']');
      need(typeof e.plane === 'string' && planes.has(e.plane), 'EDGE_PLANE', 'edges[' + i + '].plane ' + show(e.plane) + ' is not a declared plane');
      need(text(e.from) && text(e.to), 'EDGE_ENDS', 'edges[' + i + '].from and .to must be non-empty strings');
      if (!absent(e, 'id')) {
        need(text(e.id), 'EDGE_ID', 'edges[' + i + '].id must be a non-empty string when present, got ' + show(e.id));
        need(!edgeIds.has(e.id), 'DUPLICATE_EDGE_ID', show(e.id));
        edgeIds.add(e.id);
      }
      optText(e, 'type', 'EDGE_TYPE', 'edges[' + i + ']');
      optText(e, 'note', 'EDGE_NOTE', 'edges[' + i + ']');
      var ref = reference(e, i);
      var missing = [e.from, e.to].filter(function (x) { return !ids.has(x); });
      if (missing.length) {
        ref.missing = missing;
        if (e.from === d.root.id || e.to === d.root.id) ref.unsupportedEnds = [d.root.id];   /* both reasons kept */
        unresolved.push(ref);
        return;
      }
      if (e.from === d.root.id || e.to === d.root.id) { ref.reason = 'root-endpoint'; ref.ends = [d.root.id]; unsupported.push(ref); return; }
      if (e.from === e.to) { ref.reason = 'self-loop'; ref.ends = [e.from]; unsupported.push(ref); }
    });
    return { ids: ids, children: children, depth: depth, planes: planes, states: states, kinds: kinds,
             emptyContainers: emptyContainers, unresolved: unresolved, unsupported: unsupported };
  }
  /* an edge's own reference information, kept whole in every diagnostic */
  function reference(e, i) {
    var r = { index: i, from: e.from, to: e.to, plane: e.plane };
    if (!absent(e, 'id')) r.id = e.id;
    if (!absent(e, 'type')) r.type = e.type;
    return r;
  }

  /* Assembly. Containment, relations and record visibility stay separate. An edge between placed
     nodes is a relation. An edge touching an undrawn record is a link in both views, the placed
     node's and the record's, and each view holds the same edge object. An edge between two records
     is kept for both records' views and never drawn. */
  function assemble(d) {
    var v = validate(d);
    var byId = new Map([[d.root.id, { id: d.root.id, label: d.root.label, root: true }]]);
    (d.nodes || []).forEach(function (n) { byId.set(n.id, n); });
    (d.records || []).forEach(function (r) { byId.set(r.id, r); });
    var parentOf = new Map();
    v.children.forEach(function (cs, p) { cs.forEach(function (c) { parentOf.set(c, p); }); });
    function isContainer(n) { return !!n.root || n.container === true || v.children.get(n.id).length > 0; }
    var leafCount = new Map();
    (function count(id) {
      var c = 0;
      v.children.get(id).forEach(function (k) { c += isContainer(byId.get(k)) ? count(k) : 1; });
      leafCount.set(id, c);
      return c;
    })(d.root.id);

    var hidden = new Set();
    if (v.emptyContainers === 'hide')
      d.nodes.forEach(function (n) { if (isContainer(n) && leafCount.get(n.id) === 0) hidden.add(n.id); });
    if (d.nodes.every(function (n) { return hidden.has(n.id); }))
      throw ContractError('NO_VISIBLE_NODES', 'every placed node is a hidden empty container');

    var relations = [], links = new Map(), recordLinks = new Map(), hiddenRefs = [];
    function add(m, id, x) { if (!m.has(id)) m.set(id, []); m.get(id).push(x); }
    var skip = new Set();
    v.unresolved.concat(v.unsupported).forEach(function (r) { skip.add(r.index); });
    (d.edges || []).forEach(function (e, i) {
      if (skip.has(i)) return;
      var hid = [e.from, e.to].filter(function (x) { return hidden.has(x); });
      if (hid.length) {                                   // a container hidden by policy: reported
        var ref = reference(e, i); ref.hidden = hid; hiddenRefs.push(ref);
        return;
      }
      var edge = { key: i, from: e.from, to: e.to, plane: e.plane, directed: v.planes.get(e.plane).directed };
      if (!absent(e, 'id')) edge.id = e.id;
      if (!absent(e, 'type')) edge.type = e.type;
      if (!absent(e, 'note')) edge.note = e.note;
      var a = v.ids.get(e.from), b = v.ids.get(e.to);
      if (a === 'node' && b === 'node') relations.push(edge);
      else if (a === 'record' && b === 'record') {
        add(recordLinks, e.from, { edge: edge, direction: 'out', other: byId.get(e.to) });
        add(recordLinks, e.to, { edge: edge, direction: 'in', other: byId.get(e.from) });
      } else {
        var placed = a === 'node' ? e.from : e.to, rec = a === 'record' ? e.from : e.to;
        add(links, placed, { edge: edge, direction: placed === e.from ? 'out' : 'in', other: byId.get(rec) });
        add(recordLinks, rec, { edge: edge, direction: rec === e.from ? 'out' : 'in', other: byId.get(placed) });
      }
    });

    function kids(id) {
      return (v.children.get(id) || []).filter(function (c) { return !hidden.has(c); })
        .map(function (c) { return byId.get(c); });
    }
    return {
      root: byId.get(d.root.id), byId: byId, kids: kids, parentOf: parentOf,
      depth: v.depth, leafCount: leafCount, isContainer: isContainer, hidden: hidden,
      relations: relations, links: links, recordLinks: recordLinks,
      unresolved: v.unresolved, unsupported: v.unsupported, hiddenRefs: hiddenRefs,
      kinds: v.kinds, planes: v.planes, states: v.states, emptyContainers: v.emptyContainers,
      kindOf: function (id) { return v.ids.get(id); }
    };
  }

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.contract = { SHAPES: SHAPES, STATE_ROLES: STATE_ROLES, DRAWN: DRAWN, LIMITS: LIMITS, KEYS: KEYS,
                 ContractError: ContractError, validate: validate, assemble: assemble, plain: plain };
})(typeof window !== 'undefined' ? window : globalThis);
