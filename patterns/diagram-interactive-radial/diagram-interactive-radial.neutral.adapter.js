/* diagram-interactive-radial.neutral.adapter.js — the full-stack adapter of the synthetic
   composition: the generated park-system specimen (diagram-interactive-radial.source.js) with
   the inspector, facets, export and theme sections a complete instance declares.

   DEVELOPMENT AND TEST COMPOSITION. It shows the owner modules running on content that shares
   nothing with the reference specimen: other identifiers, other fields, another hierarchy. It
   derives everything from the data it is given, so the same function serves every hierarchy
   shape the owner tests use (base, shallow, ragged, deeper, flat).
   DOWNSTREAM: write your own; nothing here is part of the owner contract. */
(function (root) {
  'use strict';

  function adapterFor(data, base) {
    base = base || {};
    var byId = new Map();
    (data.nodes || []).forEach(function (n) { byId.set(n.id, n); });
    (data.records || []).forEach(function (r) { byId.set(r.id, r); });
    var states = new Map((data.states || []).map(function (s) { return [s.role, s]; }));
    var planes = new Map((data.planes || []).map(function (p) { return [p.id, p]; }));
    var kinds = new Map((data.kinds || []).map(function (k) { return [k.id, k]; }));
    /* the first-level group a node sits in, or none when it sits directly under the root */
    function top(n) {
      var cur = n;
      while (cur && cur.parent !== undefined && byId.has(cur.parent)) cur = byId.get(cur.parent);
      return cur && cur !== n ? cur : null;
    }
    var groups = [];
    (data.nodes || []).forEach(function (n) { if (n.parent === undefined && n.container) groups.push(n.id); });

    var inspector = {
      name: 'details',
      idle: 'Select a place or a group to see it here. Search and filters are under find.',
      header: function (t) {
        if (t.type === 'record') return { title: t.node.label, kind: 'record' };
        if (t.type === 'root') return { title: t.node.label, kind: 'the whole system' };
        if (t.type === 'container') return { title: t.node.label, kind: 'group, depth ' + t.depth };
        return { title: t.node.label };
      },
      sections: function (t, ctx) {
        if (t.type === 'record') return [
          { type: 'fields', fields: [{ label: 'identifier', value: t.id, mono: true }] },
          { type: 'references', title: 'linked // {count}', items: ctx.links(t.id).map(function (l) {
            return { id: l.other.id, button: l.other.label, detail: (l.edge.type || '') + (l.direction === 'out' ? ' \u2192' : ' \u2190') };
          }) }
        ];
        if (t.type !== 'item') return [{ type: 'fields', fields: [
          { label: 'places under it', value: ctx.filtered() ? t.shown + ' of ' + t.count : String(t.count) },
          { label: 'part of', value: t.parent ? t.parent.label : null }
        ] }];
        var d = t.node.data || {};
        var g = top(t.node);
        return [
          { type: 'state' },
          { type: 'fields', fields: [
            { label: 'identifier', value: t.id, mono: true },
            { label: 'group', value: g ? g.label : null },
            { label: 'status', value: d.status },
            { label: 'area', value: d.area_ha === undefined || d.area_ha === null ? null : d.area_ha + ' ha' },
            { label: 'opened', value: d.opened === undefined || d.opened === null ? null : String(d.opened) },
            { label: 'facilities', value: d.facilities, format: 'list' }
          ] },
          { type: 'relations', title: 'links // {count}', never: 'declared, never drawn', outside: 'filtered out' },
          { type: 'references', title: 'records // {count}', head: 3, items: ctx.links(t.id).map(function (l) {
            return { id: l.other.id, button: l.other.label, detail: l.edge.type };
          }) }
        ];
      }
    };

    var facets = {
      name: 'find',
      note: 'A filter shows a subset and reports how many; it never moves a place.',
      declared: [
        { id: 'status', title: 'status', family: 'items', value: function (x) { return x.state; },
          label: function (r) { return states.has(r) ? states.get(r).label : r; },
          order: (data.states || []).map(function (s) { return s.role; }), swatch: true },
        { id: 'surface', title: 'surface', family: 'items', value: function (x) { return x.kind; },
          label: function (k) { return kinds.has(k) ? kinds.get(k).label : k; }, order: 'value' },
        { id: 'group', title: 'group', family: 'items', value: function (x) { var g = top(x); return g ? g.id : undefined; },
          label: function (id) { return byId.has(id) ? byId.get(id).label : id; }, order: groups },
        { id: 'link', title: 'link kind', family: 'relations', value: function (e) { return e.plane; },
          label: function (p) { return planes.has(p) ? planes.get(p).label : p; },
          order: (data.planes || []).map(function (p) { return p.id; }),
          locked: (data.planes || []).filter(function (p) { return p.drawn === 'never'; }).map(function (p) { return p.id; }) }
      ],
      search: {
        label: 'search places, groups and records',
        placeholder: 'name or identifier',
        text: function (e) { var d = e.node && e.node.data; return [e.key, e.label, d && d.status].filter(Boolean).join(' '); }
      }
    };

    return Object.assign({}, base, {
      text: Object.assign({}, base.text || {}, {
        census: { complete: '{visible} of {total} places', filtered: '{visible} of {total} places \u00B7 {relations} links \u00B7 {active} filter{s}' },
        filtered: { on: '{visible} of {total}', off: '' },
        noMatch: 'nothing matches among {items} places, {records} records and {entries} entries'
      }),
      inspector: inspector,
      facets: facets,
      export: {
        filenameBase: 'radial-specimen',
        profiles: { page: true, diagram: true },
        mark: 'required',
        fonts: 'carrier',
        header: { subtitle: 'specimen \u00B7 synthetic data' },
        plateLines: function (c) {
          return [c.items + ' places \u00B7 ' + c.records + ' records', 'detail: ' + c.tier];
        }
      },
      theme: 'own'
    });
  }

  root.RADIAL_NEUTRAL = { adapterFor: adapterFor, modules: ['inspector', 'facets', 'legend', 'chrome', 'export', 'theme'] };
})(typeof window !== 'undefined' ? window : globalThis);
