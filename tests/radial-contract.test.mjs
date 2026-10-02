#!/usr/bin/env node
/* radial-contract.test.mjs — the contract, layout and label-solver controls of the interactive
   radial pattern, on the owner files themselves, in Node with no dependency.

     node tests/radial-contract.test.mjs          prints one line per check; exit 1 on any failure

   The owner modules are classic browser scripts; they are loaded here exactly as a page loads
   them, into one global, so the code tested is the code shipped.

   P  probes: identity, relations, records, unresolved and unsupported references, closed keys
   T  scalar types: every malformed owner value is a named error; absence is explicit
   L  the tested limits, each failing with its code one step past the bound
   S  shapes: shallow, ragged, deeper, flat, capacity, each holding the grammar invariants
   G  geometry: the specimen's base hierarchy under the compatibility settings, compared with a
      stored reference computed by an independent implementation (tests/radial-geometry.mjs:
      structure exactly, computed numbers within a stated tolerance); the fan rule at its boundary
   N  behavioral neutrality: renaming everything leaves the geometry unchanged
   V  the label solver: tiers, minLeaves, held names, a second target independent of the first,
      crowding, the Fit's population over a sweep of small canvases, template slots
   I  opaque identifiers through the label layer: the clearance bookkeeping and the short-canvas
      population rule decide the same whatever the identifiers are
   X  negative controls: each check fails for its intended reason, including X6, mutated copies of
      the labels module with the old bookkeeping put back */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from '../tools/gen-radial-specimen.mjs';
import { compare, TOLERANCE } from './radial-geometry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'patterns/diagram-interactive-radial');
/* labelsSource, when given, replaces the labels module's text: the X6 controls load mutated copies */
function load(labelsSource) {
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['diagrams-radial-contract.js', 'diagrams-radial-layout.js', 'diagrams-radial-labels.js'])
    vm.runInContext(f.endsWith('labels.js') && labelsSource ? labelsSource : fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f });
  return ctx.DIAGRAM_RADIAL;
}
const R = load();
/* G1's reference: G.base() under { allocation: 'equal', itemMax: 74 }, computed independently */
const REFERENCE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/radial-base-equal.reference.json'), 'utf8'));
const { assemble, LIMITS } = R.contract;
const layout = R.layout.layout;

let failed = 0, passed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (ok) passed++; else failed++;
};
const clone = (x) => JSON.parse(JSON.stringify(x));
/* a label-check key as the tuple it encodes; a key in any other form is kept whole, so a bookkeeping
   regression fails a named check instead of throwing */
const tuple = (k) => { try { const v = JSON.parse(k); return Array.isArray(v) ? v : [k]; } catch (e) { return [k]; } };

function outcome(data, opts) {
  try { const A = assemble(data); if (opts !== undefined) layout(A, opts); return { ok: true }; }
  catch (e) { return { ok: false, code: e.code, message: e.message }; }
}
function rejects(name, data, code, opts) {
  const o = outcome(data, opts);
  check(name, !o.ok && o.code === code, o.ok ? `accepted; expected ${code}` : o.message.slice(0, 120));
}
const tiny = (extra) => Object.assign({ root: { id: 'R', label: 'root' }, nodes: [{ id: 'n', label: 'n' }] }, extra);
const PL = [{ id: 'p', label: 'p', drawn: 'always', directed: false }];

/* ------------------------------------------------------------------ P -- */
{
  const d = { root: { id: 'R', label: 'r' }, nodes: [
    { id: 'a|b', label: 'g1', container: true }, { id: 'c', label: 'sub c', parent: 'a|b', container: true }, { id: 'x1', label: 'x1', parent: 'c' },
    { id: 'a', label: 'g2', container: true }, { id: 'b|c', label: 'sub b|c', parent: 'a', container: true }, { id: 'x2', label: 'x2', parent: 'b|c' }] };
  const subs = layout(assemble(d)).nodes.filter((n) => n.kind === 'container' && n.depth === 2).map((n) => n.id);
  check('P1 identifiers are opaque: two subgroups stay two, with no derived key', subs.length === 2 && new Set(subs).size === 2, subs.join(' · '));
}
{
  const d = { root: { id: 'R', label: 'r' }, nodes: [{ id: '__proto__', label: 'p' }, { id: 'constructor', label: 'c' }, { id: 'toString', label: 't' }],
    records: [{ id: 'hasOwnProperty', label: 'r' }], planes: [{ id: 'p', label: 'p', drawn: 'never', directed: true }],
    edges: [{ from: '__proto__', to: 'hasOwnProperty', plane: 'p' }, { from: 'hasOwnProperty', to: 'constructor', plane: 'p' }] };
  let ok = false, why = '';
  try { const A = assemble(d); layout(A); ok = A.links.get('__proto__').length === 1 && A.recordLinks.get('hasOwnProperty').length === 2; why = 'assembled; links kept'; }
  catch (e) { why = e.message; }
  check('P2 __proto__, constructor, toString and hasOwnProperty work as identifiers', ok, why);
}
rejects('P3 one identifier declared twice is an error, not a silent first-wins',
  { root: { id: 'R', label: 'r' }, nodes: [{ id: 'k', label: 'first', container: true }, { id: 'k', label: 'second', container: true }] }, 'DUPLICATE_ID');
rejects('P3 a record reusing a placed identifier', tiny({ records: [{ id: 'n', label: 'again' }] }), 'DUPLICATE_ID');
{
  const d = tiny({ records: [{ id: 'r', label: 'r' }], planes: [{ id: 'ref', label: 'ref', drawn: 'selection', directed: true }],
    edges: [{ id: 'E1', from: 'n', to: 'r', plane: 'ref', type: 'cites', note: 'a note' }] });
  const A = assemble(d), a = A.links.get('n')[0], b = A.recordLinks.get('r')[0];
  check('P4 a record link keeps the edge (id, plane, type, note, direction) in both views, as one object',
    a.edge.id === 'E1' && a.edge.plane === 'ref' && a.edge.type === 'cites' && a.edge.note === 'a note' && a.edge.directed === true &&
    a.direction === 'out' && b.direction === 'in' && b.edge === a.edge);
}
{
  const d = tiny({ records: [{ id: 'r1', label: 'r1' }, { id: 'r2', label: 'r2' }], planes: PL, edges: [{ from: 'r1', to: 'r2', plane: 'p' }] });
  const A = assemble(d);
  check('P5 an edge between two records is kept for both records and never drawn',
    A.relations.length === 0 && A.recordLinks.get('r1').length === 1 && A.recordLinks.get('r2').length === 1);
}
{
  const A = assemble(tiny({ planes: PL, edges: [{ id: 'E9', from: 'n', to: 'elsewhere', plane: 'p', type: 't' }] }));
  const u = A.unresolved[0];
  check('P6 an unresolved reference is reported with its reference information, not drawn, not an error',
    A.unresolved.length === 1 && A.relations.length === 0 && u.id === 'E9' && u.from === 'n' && u.to === 'elsewhere' &&
    u.plane === 'p' && u.type === 't' && JSON.stringify(u.missing) === '["elsewhere"]', JSON.stringify(u));
}
{
  const A = assemble(tiny({ planes: PL, edges: [{ id: 'E1', from: 'n', to: 'R', plane: 'p' }, { from: 'R', to: 'n', plane: 'p' }] }));
  const u = A.unsupported;
  check('P6 an edge touching the framing root is reported as an unsupported endpoint, not as missing',
    A.unresolved.length === 0 && u.length === 2 && u.every((x) => x.reason === 'root-endpoint' && JSON.stringify(x.ends) === '["R"]') &&
    u[0].id === 'E1' && u[0].from === 'n' && u[0].to === 'R' && A.relations.length === 0, JSON.stringify(u[0]));
}
{
  const A = assemble(tiny({ planes: PL, edges: [{ from: 'n', to: 'n', plane: 'p' }] }));
  check('P6 a self-loop is reported as unsupported, not drawn', A.unsupported.length === 1 && A.unsupported[0].reason === 'self-loop' && A.relations.length === 0);
}
rejects('P7 an unknown key is an error', tiny({ nodes: [{ id: 'n', label: 'n', subgroup: { key: 'x' } }] }), 'UNKNOWN_FIELD');
check('P7 anything inside data is the consumer\'s', outcome(tiny({ nodes: [{ id: 'n', label: 'n', data: { subgroup: 1, nested: [null, true, 'x', 2.5] } }] })).ok);
rejects('P8 an unknown parent', tiny({ nodes: [{ id: 'n', label: 'n', parent: 'nowhere' }] }), 'NODE_PARENT');
rejects('P8 a record as a parent', tiny({ nodes: [{ id: 'n', label: 'n', parent: 'r' }], records: [{ id: 'r', label: 'r' }] }), 'NODE_PARENT_RECORD');
rejects('P8 a containment cycle', tiny({ nodes: [{ id: 'a', label: 'a', parent: 'b' }, { id: 'b', label: 'b', parent: 'a' }] }), 'CYCLE');
rejects('P8 a node that is its own parent', tiny({ nodes: [{ id: 'a', label: 'a', parent: 'a' }] }), 'CYCLE');
rejects('P8 container: false with children', tiny({ nodes: [{ id: 'a', label: 'a', container: false }, { id: 'b', label: 'b', parent: 'a' }] }), 'CONTAINER_CONFLICT');
{
  const d = tiny({ nodes: [{ id: 'n', label: 'n' }, { id: 'x', label: 'x', container: true }], options: { emptyContainers: 'hide' },
    planes: PL, edges: [{ id: 'E2', from: 'n', to: 'x', plane: 'p' }] });
  const A = assemble(d), h = A.hiddenRefs[0];
  check('P9 an edge to a container hidden by policy is reported with its reference information, not drawn',
    A.relations.length === 0 && A.hiddenRefs.length === 1 && h.id === 'E2' && h.from === 'n' && h.to === 'x' && JSON.stringify(h.hidden) === '["x"]',
    JSON.stringify(h));
}
rejects('P9 a dataset whose placed nodes are all hidden', tiny({ nodes: [{ id: 'x', label: 'x', container: true }], options: { emptyContainers: 'hide' } }), 'NO_VISIBLE_NODES');
rejects('P10 two edges sharing a declared id', tiny({ nodes: [{ id: 'n', label: 'n' }, { id: 'm', label: 'm' }], planes: PL,
  edges: [{ id: 'e', from: 'n', to: 'm', plane: 'p' }, { id: 'e', from: 'm', to: 'n', plane: 'p' }] }), 'DUPLICATE_EDGE_ID');
rejects('P10 a list given as something else', tiny({ planes: {} }), 'NOT_AN_ARRAY');
rejects('P10 no placed nodes', { root: { id: 'R', label: 'r' }, nodes: [] }, 'NO_PLACED_NODES');
rejects('P10 a list with a hole', tiny({ nodes: [{ id: 'n', label: 'n' }, , { id: 'm', label: 'm' }] }), 'NOT_AN_ARRAY');
{
  const A = assemble(tiny({ planes: PL, edges: [{ from: 'R', to: 'nowhere', plane: 'p' }] }));
  check('P6 an edge from the root to a missing identifier keeps both reasons', A.unresolved.length === 1 &&
    JSON.stringify(A.unresolved[0].missing) === '["nowhere"]' && JSON.stringify(A.unresolved[0].unsupportedEnds) === '["R"]', JSON.stringify(A.unresolved[0]));
}

/* ------------------------------------------------------------------ T -- */
/* the four values an earlier validator accepted, then the rest of the typed fields */
rejects('T1 options: false is not "use the default"', tiny({ options: false }), 'OPTIONS');
rejects('T1 options: null', tiny({ options: null }), 'OPTIONS');
rejects('T1 options as an array', tiny({ options: [] }), 'OPTIONS');
rejects('T1 an emptyContainers value outside show / hide', tiny({ options: { emptyContainers: true } }), 'OPTION');
check('T1 options absent, or present as {}, takes the default', outcome(tiny({})).ok && outcome(tiny({ options: {} })).ok && outcome(tiny({ options: undefined })).ok);
rejects('T2 a plane label given as an object', tiny({ planes: [{ id: 'p', label: { text: 'p' }, drawn: 'always', directed: false }] }), 'PLANE_LABEL');
rejects('T2 a plane without a label', tiny({ planes: [{ id: 'p', drawn: 'always', directed: false }] }), 'PLANE_LABEL');
rejects('T2 a plane whose directed is a string', tiny({ planes: [{ id: 'p', label: 'p', drawn: 'always', directed: 'yes' }] }), 'PLANE_DIRECTED');
rejects('T2 a plane drawn by an unknown policy', tiny({ planes: [{ id: 'p', label: 'p', drawn: 'hover', directed: false }] }), 'PLANE_DRAWN');
rejects('T3 a kind declared without a label', tiny({ kinds: [{ id: 'k', shape: 'circle' }] }), 'KIND_LABEL');
rejects('T3 a kind with an empty label', tiny({ kinds: [{ id: 'k', label: '', shape: 'circle' }] }), 'KIND_LABEL');
rejects('T3 a state without a label', tiny({ states: [{ role: 'earned', meaning: 'm' }] }), 'STATE_LABEL');
rejects('T3 a state whose meaning is a number', tiny({ states: [{ role: 'earned', label: 'l', meaning: 3 }] }), 'STATE_MEANING');
rejects('T4 an edge note given as an object', tiny({ nodes: [{ id: 'n', label: 'n' }, { id: 'm', label: 'm' }], planes: PL,
  edges: [{ from: 'n', to: 'm', plane: 'p', note: { text: 'note' } }] }), 'EDGE_NOTE');
rejects('T4 an edge type given as a number', tiny({ nodes: [{ id: 'n', label: 'n' }, { id: 'm', label: 'm' }], planes: PL,
  edges: [{ from: 'n', to: 'm', plane: 'p', type: 7 }] }), 'EDGE_TYPE');
rejects('T4 an edge id given as null', tiny({ nodes: [{ id: 'n', label: 'n' }, { id: 'm', label: 'm' }], planes: PL,
  edges: [{ id: null, from: 'n', to: 'm', plane: 'p' }] }), 'EDGE_ID');
rejects('T4 an edge whose ends are not strings', tiny({ planes: PL, edges: [{ from: 'n', to: 4, plane: 'p' }] }), 'EDGE_ENDS');
rejects('T5 a node label given as an object', tiny({ nodes: [{ id: 'n', label: { t: 'n' } }] }), 'NODE');
rejects('T5 a node id given as a number', tiny({ nodes: [{ id: 7, label: 'n' }] }), 'NODE');
rejects('T5 a parent given as null', tiny({ nodes: [{ id: 'n', label: 'n', parent: null }] }), 'NODE_PARENT');
rejects('T5 container given as a string', tiny({ nodes: [{ id: 'n', label: 'n', container: 'yes' }] }), 'CONTAINER');
rejects('T5 a kind given as a number', tiny({ kinds: [{ id: 'k', label: 'k', shape: 'circle' }], nodes: [{ id: 'n', label: 'n', kind: 1 }] }), 'KIND');
rejects('T5 a state given as null', tiny({ states: [{ role: 'earned', label: 'l', meaning: 'm' }], nodes: [{ id: 'n', label: 'n', state: null }] }), 'NODE_STATE');
rejects('T5 a record label missing', tiny({ records: [{ id: 'r' }] }), 'RECORD');
rejects('T5 the root label missing', { root: { id: 'R' }, nodes: [{ id: 'n', label: 'n' }] }, 'ROOT');
rejects('T6 data holding a function is not JSON', tiny({ nodes: [{ id: 'n', label: 'n', data: { f: () => 1 } }] }), 'DATA_NOT_JSON');
rejects('T6 data holding NaN is not JSON', tiny({ nodes: [{ id: 'n', label: 'n', data: { v: NaN } }] }), 'DATA_NOT_JSON');
rejects('T6 data holding a Date is not JSON', tiny({ nodes: [{ id: 'n', label: 'n', data: { when: new Date(0) } }] }), 'DATA_NOT_JSON');
{ const cyc = { a: 1 }; cyc.self = cyc;
  rejects('T6 data holding a cycle is not JSON', tiny({ nodes: [{ id: 'n', label: 'n', data: cyc }] }), 'DATA_NOT_JSON'); }
rejects('T6 the contract itself is a class instance, not a plain object', new (class C { constructor() { this.root = { id: 'R', label: 'r' }; this.nodes = [{ id: 'n', label: 'n' }]; } })(), 'NOT_AN_OBJECT');

/* ------------------------------------------------------------------ L -- */
check(`L1 depth ${LIMITS.depth} below the root is accepted`, outcome(G.chain(LIMITS.depth), {}).ok);
rejects(`L1 depth ${LIMITS.depth + 1}`, G.chain(LIMITS.depth + 1), 'DEPTH_LIMIT');
check(`L2 ${LIMITS.placed} placed nodes are accepted`, (() => { const d = G.capacity(); return d.nodes.length === LIMITS.placed && outcome(d, {}).ok; })());
rejects(`L2 ${LIMITS.placed + 1} placed nodes`, G.capacity(LIMITS.placed + 1), 'CAPACITY_LIMIT');

/* ------------------------------------------------------------------ S -- */
function invariants(L) {
  const by = new Map(L.nodes.map((n) => [n.id, n])), eps = 1e-9;
  let contain = 0, disjoint = 0, radial = 0;
  for (const n of L.nodes) {
    if (n.kind === 'root') continue;
    const p = by.get(n.parent);
    if (!(n.ang >= p.wedge[0] - eps && n.ang <= p.wedge[1] + eps)) contain++;
    if (!(Math.hypot(n.x, n.y) > Math.hypot(p.x, p.y))) radial++;
  }
  const groups = new Map();
  for (const w of L.wedges) if (!w.fan) { if (!groups.has(w.parent)) groups.set(w.parent, []); groups.get(w.parent).push(w); }
  for (const ws of groups.values()) {
    ws.sort((a, b) => a.lo - b.lo);
    for (let i = 1; i < ws.length; i++) if (ws[i].lo < ws[i - 1].hi - eps) disjoint++;
  }
  return { contain, disjoint, radial };
}
const D = G.parks();
const SHAPES = [['shallow', G.shallow(D)], ['ragged', G.ragged(D, 'show')], ['ragged, empties hidden', G.ragged(D, 'hide')],
  ['deeper', G.deeper(D)], ['flat', G.flat(D)], ['capacity', G.capacity()], ['specimen', G.specimen(D)]];
for (const [name, d] of SHAPES) {
  for (const allocation of ['weighted', 'equal']) {
    const L = layout(assemble(d), { allocation }), inv = invariants(L);
    const again = JSON.stringify(layout(assemble(clone(d)), { allocation }));
    const depth = Math.max(...L.nodes.map((n) => n.depth));
    check(`S ${name} (${allocation}): invariants hold and the layout is deterministic`,
      inv.contain + inv.disjoint + inv.radial === 0 && again === JSON.stringify(L),
      `placed ${L.nodes.length - 1}, depth ${depth}; outside parent wedge ${inv.contain}, overlapping sibling wedges ${inv.disjoint}, not outward ${inv.radial}`);
  }
}
{
  const A = assemble(G.ragged(D, 'hide'));
  check('S ragged: hidden empty containers are reported, not lost', A.hidden.size === 2, [...A.hidden].join(', '));
  const B = assemble(G.ragged(D, 'show'));
  check('S ragged: a record link, a record-to-record link and an unresolved reference are each kept in their place',
    B.links.size === 1 && B.recordLinks.get('OFFICE-1').length === 2 && B.unresolved.length === 1 && B.unresolved[0].id === 'ADM-3');
}
{
  const L = layout(assemble(G.ragged(D, 'show')));
  const loose = L.nodes.filter((n) => n.kind === 'leaf' && n.depth === 1);
  check('S ragged: places directly under the root are laid out as one fan of the root', loose.length === 3 && loose.every((n) => n.parent === 'ROOT'));
}
check('S the default allocation is weighted, and equal must be declared',
  layout(assemble(G.deeper(D))).settings.allocation === 'weighted' &&
  JSON.stringify(layout(assemble(G.deeper(D))).nodes) !== JSON.stringify(layout(assemble(G.deeper(D)), { allocation: 'equal' }).nodes));

/* ------------------------------------------------------------------ G -- */
const BASE_EQUAL = { allocation: 'equal', itemMax: 74 };
{
  /* the base hierarchy under equal allocation against the stored reference: identity, order,
     parent, depth, kind, radius and container counts exactly, the root's count against the
     reference's leaf total; x, y, bearing, fan radius and bounds finite and within TOLERANCE (the
     reasons for that bound are in tests/radial-geometry.mjs) */
  const r = compare(layout(assemble(G.base(D)), BASE_EQUAL), REFERENCE);
  check('G1 the base hierarchy under allocation equal matches the independent reference geometry', r.ok,
    `${r.nodes} nodes; structural differences ${r.exactCount}; largest numeric difference ${r.maxDiff.toExponential(2)} (tolerance ${TOLERANCE.toExponential(0)}) · ${process.version} ${process.arch}`);
}
{
  const leaves = (n) => Array.from({ length: n }, (_, i) => ({ id: 'x' + i, label: 'x' + i, parent: 'A' }));
  const only = { root: { id: 'R', label: 'r' }, nodes: [{ id: 'A', label: 'a', container: true }, ...leaves(6), { id: 'Z', label: 'z', container: true }, { id: 'z1', label: 'z1', parent: 'Z' }] };
  const mixed = clone(only); mixed.nodes.push({ id: 'B', label: 'b', parent: 'A', container: true });
  const ext = (L) => { const a = L.nodes.filter((n) => n.parent === 'A' && n.kind === 'leaf').slice(0, 4).map((n) => n.ang); const A = L.nodes.find((n) => n.id === 'A'); return (Math.max(...a) - Math.min(...a)) / (A.wedge[1] - A.wedge[0]); };
  const e1 = ext(layout(assemble(only), { allocation: 'equal' })), e2 = ext(layout(assemble(mixed), { allocation: 'equal' }));
  check('G2 the fan rule at its boundary: leaves only 0.900 of the wedge; leaves beside a container 0.396',
    Math.abs(e1 - 0.9) < 1e-9 && Math.abs(e2 - 0.396) < 1e-9, `${e1.toFixed(3)} · ${e2.toFixed(3)}`);
}
{
  const L = layout(assemble(tiny({ nodes: [{ id: 'n', label: 'a😀b😀c' }] })), { itemMax: 4 });
  const lab = L.nodes.find((n) => n.id === 'n').label;
  check('G3 itemMax never splits a surrogate pair', lab === 'a😀b', JSON.stringify(lab));
}

/* ------------------------------------------------------------------ N -- */
{
  const src = G.ragged(D, 'show'), ren = new Map(); let k = 0;
  const r = (x) => { if (!ren.has(x)) ren.set(x, 'q' + (++k)); return ren.get(x); };
  const t = clone(src);
  t.root = { id: r(src.root.id), label: 'renamed root' };
  t.kinds = src.kinds.map((x) => ({ ...x, id: r('kind:' + x.id), label: 'k' }));
  t.planes = src.planes.map((x) => ({ ...x, id: r('plane:' + x.id), label: 'p' }));
  t.nodes = src.nodes.map((n) => { const m = { ...n, id: r(n.id), label: 'L' + n.id.length };
    if (n.parent) m.parent = r(n.parent); if (n.kind) m.kind = r('kind:' + n.kind); if (n.data) m.data = { other: 1 }; return m; });
  t.records = src.records.map((x) => ({ ...x, id: r(x.id), label: 'rec' }));
  t.edges = src.edges.map((e) => { const m = { ...e, from: r(e.from), to: r(e.to), plane: r('plane:' + e.plane), type: 't', note: 'n' }; if (e.id) m.id = r('edge:' + e.id); return m; });
  const g = (L) => JSON.stringify(L.nodes.map((n) => [n.x, n.y, n.r, n.ang, n.count ?? null, n.depth]));
  check('N1 renaming every identifier, label, kind and plane leaves the geometry unchanged',
    g(layout(assemble(src))) === g(layout(assemble(t))), `${src.nodes.length} placed nodes`);
}

/* ------------------------------------------------------------------ V -- */
{
  const cfg = R.labels.configure({});
  const L = layout(assemble(G.base(D)));
  const width = (s, role) => s.length * ({ root: 12, top: 8.5, container: 7, leaf: 5.5, count: 5.4, id: 4.8 }[role]);
  const font = (role) => ({ root: { a: 21, d: 6 }, top: { a: 15, d: 4 }, container: { a: 12, d: 3 }, leaf: { a: 10, d: 3 }, count: { a: 8, d: 2 }, id: { a: 7, d: 2 } }[role]);
  const M = { measure: width, font, ink: () => null };
  const base = { nodes: L.nodes, view: { k: 0.36, x: 465, y: 330 }, W: 1280, H: 800, visible: () => true, shownCount: (n) => n.count || 0,
                 measure: width, bands: {}, countText: (n) => R.labels.countText(cfg, n) };
  const t0 = R.labels.tierFor(cfg.tiers, 0.36), t1 = R.labels.tierFor(cfg.tiers, 0.6);
  const s0 = R.labels.solve({ ...base, tier: t0, held: null });
  const named = (s) => s.filter((e) => e.show && e.node.kind === 'container').map((e) => e.id);
  const deep0 = named(s0).filter((id) => L.nodes.find((n) => n.id === id).depth === 2);
  check('V1 the overview names depth-2 containers only at their minLeaves (16 by default)',
    deep0.every((id) => L.nodes.find((n) => n.id === id).count >= 16) && deep0.length > 0, `${deep0.length} named`);
  const s1 = R.labels.solve({ ...base, tier: t1, held: null });
  check('V1 the next tier names every container', named(s1).length === L.nodes.filter((n) => n.kind === 'container').length);
  check('V1 leaves are named only from the items tier', s1.every((e) => e.node.kind !== 'leaf' || !e.show) &&
    R.labels.solve({ ...base, tier: R.labels.tierFor(cfg.tiers, 1.1), held: null }).some((e) => e.node.kind === 'leaf' && e.show));
  const held = { tier: t0.name, root: false, top: true, counts: true, keep: new Set() };
  const sh = R.labels.solve({ ...base, tier: t0, held });
  check('V2 a held tier defers names and counts; it never removes a node',
    sh.filter((e) => e.held).length > 0 && sh.every((e) => !e.show || e.role === 'root') && sh.length === L.nodes.length);
  /* a second target (a large plate) solved while the screen holds names: independent of the screen's
     held set, and the screen's own placement is unchanged by it */
  const before = JSON.stringify(sh);
  const plate = R.labels.solve({ ...base, view: { k: 1.2, x: 1920, y: 1440 }, W: 3840, H: 2880, tier: t1, held: null });
  check('V3 a second target solves at its own size and tier, ignoring the screen\'s held names',
    plate.filter((e) => e.held).length === 0 && named(plate).length === L.nodes.filter((n) => n.kind === 'container').length &&
    JSON.stringify(sh) === before);
  /* the population's contract, over a sweep of small canvases with chrome across the bottom quarter:
     with nothing deferred the names already stand clear; otherwise it ends with every kept name clear,
     or with the whole depth-1 tier (and the root's name where needed) left to the next tier — never
     part of a tier. At least one canvas must exercise the deferral path, or the check proves nothing */
  const sweep = [[360, 640], [300, 420], [240, 320], [200, 260], [160, 200]].map(([w, h]) => {
    const k = Math.min(w, h) / 2400, cs = [{ l: 0, r: w, t: h * 0.75, b: h }];
    const inp = { ...base, tier: t0, held: null, W: w, H: h, view: { k, x: w / 2, y: h * 0.4 } };
    const pop = R.labels.population(inp, M, cs, false);
    const after = R.labels.solve({ ...inp, held: pop });
    const clear = R.labels.checks.namesClear(after, M, cs, w, h);
    const topShown = after.filter((e) => e.node.depth === 1 && e.node.kind === 'container' && e.show).length;
    const topAll = L.nodes.filter((n) => n.depth === 1 && n.kind === 'container').length;
    const ok = pop === null ? clear : ((clear || pop.top) && (topShown === 0 || topShown === topAll));
    return { size: w + 'x' + h, ok, deferred: !!pop, top: !!(pop && pop.top), counts: !!(pop && pop.counts), kept: pop ? pop.keep.size : null, clear };
  });
  check('V4 the Fit\'s population ends clear, or defers the whole depth-1 tier, never part of it',
    sweep.every((x) => x.ok) && sweep.some((x) => x.deferred), sweep.map((x) => `${x.size} ${x.deferred ? (x.top ? 'top deferred' : x.counts ? 'counts deferred, ' + x.kept + ' kept' : x.kept + ' kept') : 'nothing deferred'}${x.ok ? '' : ' VIOLATION'}`).join(' · '));
  /* crowding away from the Fit: one zoomed view under 'keep' and under 'yield' */
  {
    const tI = R.labels.tierFor(cfg.tiers, 1.2), target = L.nodes.find((n) => n.id === 'K-LM-02');
    const zoom = { ...base, tier: tI, held: null, font, view: { k: 1.2, x: 640 - target.x * 1.2, y: 400 - target.y * 1.2 } };
    const keep = R.labels.solve({ ...zoom, crowding: 'keep' }), yld = R.labels.solve({ ...zoom, crowding: 'yield' });
    const off = (sol) => sol.filter((e) => e.show && e.node.kind === 'container' && (() => { const p = e.p, rk = e.node.r * 1.2 * 1.3; return p.x + rk < 0 || p.x - rk > 1280 || p.y + rk < 0 || p.y - rk > 800; })()).length;
    const depth1Yield = yld.filter((e) => (e.yielded || e.offscreen) && e.node.depth === 1 && e.p && e.p.x >= 0 && e.p.x <= 1280 && e.p.y >= 0 && e.p.y <= 800).length;
    check('V6 under keep, a zoomed view places the callouts of off-canvas marks at its edges (the landed behavior)', off(keep) > 0, `${off(keep)} off-canvas callouts shown`);
    check('V6 under yield, the same view shows no off-canvas callout, and no on-canvas depth-1 name yields', off(yld) === 0 && depth1Yield === 0, JSON.stringify(R.labels.deferred(yld)));
    /* the whole map on a small canvas, every container named: every mark is on the canvas, so only
       the overprint pass can act */
    const all = R.labels.configure({ tiers: [{ k: 0, name: 'all', containers: 'all', leaves: false, ids: false, defer: false }] });
    const b = L.bounds, kk = Math.min(700 / b.w, 500 / b.h) * 0.95;
    const whole = { ...base, W: 700, H: 500, tier: all.tiers[0], held: null, font, countText: (n) => R.labels.countText(all, n),
                    view: { k: kk, x: 350 - (b.x + b.w / 2) * kk, y: 250 - (b.y + b.h / 2) * kk } };
    const crowdedDeep = (sol) => [...R.labels.checks.crowding(sol, M)].map(tuple).filter((pair) => pair.some((id) => (L.nodes.find((n) => n.id === id) || {}).depth >= 2)).length;
    const k2 = R.labels.solve({ ...whole, crowding: 'keep' }), y2 = R.labels.solve({ ...whole, crowding: 'yield' });
    const topShown = y2.filter((e) => e.show && e.node.kind === 'container' && e.node.depth === 1).length;
    check('V6 with every mark on the canvas, keep lets deeper callouts collide; yield gives way until none does, keeping every depth-1 name',
      crowdedDeep(k2) > 0 && crowdedDeep(y2) === 0 && topShown === L.nodes.filter((n) => n.kind === 'container' && n.depth === 1).length && R.labels.deferred(y2).yielded > 0,
      `colliding pairs with a deeper callout: keep ${crowdedDeep(k2)}, yield ${crowdedDeep(y2)} · ${JSON.stringify(R.labels.deferred(y2))}`);
    /* V7, computed independently of the solver's own segment model: sample each shown leaf name's
       rendered letters (its anchor, rotation and text-anchor, a 1px step along its width, across its
       height) and call two names colliding where any samples come within 1px */
    const samples = (line) => {
      const w = width(line.text, 'leaf'), f = font('leaf'), th = line.rotate.deg * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
      const x0 = line.anchor === 'end' ? -w : 0, pts = [];
      for (let x = x0; x <= x0 + w; x += 1) for (let y = -f.a; y <= f.d; y += 2) pts.push([line.x + x * c - y * sn, line.y + x * sn + y * c]);
      return pts;
    };
    const rayHits = (sol) => {
      const ls = sol.filter((e) => e.show && e.role === 'leaf' && e.name).map((e) => samples(e.name));
      let n = 0;
      for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
        const grid = new Map();
        for (const [x, y] of ls[i]) grid.set(Math.round(x) + ',' + Math.round(y), true);
        if (ls[j].some(([x, y]) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (grid.has((Math.round(x) + dx) + ',' + (Math.round(y) + dy))) return true; return false; })) n++;
      }
      return n;
    };
    check('V7 at the items tier, keep lets leaf names overprint; under yield no two shown leaf names touch, and leaf names show',
      rayHits(keep) > 0 && rayHits(yld) === 0 && yld.some((e) => e.show && e.role === 'leaf'),
      `colliding pairs: keep ${rayHits(keep)}, yield ${rayHits(yld)} · leaf names shown under yield ${yld.filter((e) => e.show && e.role === 'leaf').length}`);
    check('V6 crowding defaults to yield, and keep must be declared', cfg.crowding === 'yield' && R.labels.configure({ crowding: 'keep' }).crowding === 'keep');
    let bc = null; try { R.labels.configure({ crowding: false }); } catch (e) { bc = e.code; }
    check('V6 a crowding value other than yield or keep is rejected', bc === 'CROWDING');
  }
  let bad = null;
  try { R.labels.configure({ tiers: [{ k: 0.5, name: 'x', containers: 1, leaves: false, ids: false }] }); } catch (e) { bad = e.code; }
  check('V5 a tier list that does not start at k 0 is rejected', bad === 'TIER');
  const code = (f) => { try { f(); return 'accepted'; } catch (e) { return e.code; } };
  const t0x = (x) => ({ tiers: [Object.assign({ k: 0, name: 'x', containers: 1, leaves: false, ids: false }, x)] });
  const filled = R.labels.fill('{count} places {constructor} {toString} {__proto__} {missing}', { count: 3 });
  check('V5 a template fills only its own slots: {constructor}, {toString} and {__proto__} are left as written',
    filled === '3 places {constructor} {toString} {__proto__} {missing}', JSON.stringify(filled));
  check('V5 non-finite depths and leaf minimums are rejected; label settings must be plain objects',
    code(() => R.labels.configure(t0x({ containers: Infinity }))) === 'TIER' && code(() => R.labels.configure(t0x({ minLeaves: { 2: Infinity } }))) === 'TIER' &&
    code(() => R.labels.configure(new Map())) === 'LABELS' && code(() => R.labels.configure({ count: [] })) === 'COUNT');
}

/* ------------------------------------------------------------------ I -- */
/* The label layer keys its bookkeeping the way the contract keys identifiers: opaque. identity(RL)
   runs every identity check against one labels module and returns which hold; the real module must
   pass all of them, and each X6 mutation, a copy of the module with one defect class of the earlier
   bookkeeping restored or one plausible regression introduced, must fail the check written for it. */
function identity(RL) {
  const width = (s, role) => s.length * ({ root: 12, top: 8.5, container: 7, leaf: 5.5, count: 5.4, id: 4.8 }[role]);
  const font = (role) => ({ root: { a: 21, d: 6 }, top: { a: 15, d: 4 }, container: { a: 12, d: 3 }, leaf: { a: 10, d: 3 }, count: { a: 8, d: 2 }, id: { a: 7, d: 2 } }[role]);
  const M = { measure: width, font, ink: (s, role) => ({ a: font(role).a - 2, d: font(role).d }) };
  const C = RL.labels.checks, out = {};
  /* a shown container callout, its name and count, at (x, y) */
  const callout = (id, x, y) => ({ id, role: 'container', show: true, held: false, node: { kind: 'container', depth: 2, count: 9 },
    name: { x, y, anchor: 'start', text: 'A shared name', rotate: null }, count: { x, y: y + 12, anchor: 'start', text: '9', show: true, held: false } });
  const results = (sol) => ({ crowding: [...C.crowding(sol, M)].map(tuple), overprints: [...C.overprints(sol, M)].map(tuple),
    obscured: [...C.obscured(sol, M)].map(tuple), under: [...C.under(sol, M, [{ l: 0, r: 400, t: 0, b: 400 }])].map(tuple),
    outside: [...C.outside(sol, M, 120, 120)].map(tuple) });
  /* I1: with the ids written back to placeholders, every result equals the plain pair's; an undirected
     pair compares as a set, a directed one in its order */
  const shape = (r, a, b) => {
    const ph = (v) => v === a ? '#A' : v === b ? '#B' : v;
    const und = (list) => list.map((p) => JSON.stringify(p.map(ph).sort())).sort();
    const dir = (list) => list.map((p) => JSON.stringify(p.map(ph))).sort();
    return JSON.stringify({ crowding: und(r.crowding), overprints: und(r.overprints), obscured: dir(r.obscured), under: dir(r.under), outside: dir(r.outside) });
  };
  const plain = shape(results([callout('n1', 100, 100), callout('n2', 104, 112)]), 'n1', 'n2');
  const IDS = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', 'a|b', 'x>y', 'p/q', '["a","b"]'];
  const off = IDS.filter((id) => shape(results([callout(id, 100, 100), callout('n2', 104, 112)]), id, 'n2') !== plain ||
                                 shape(results([callout('n1', 100, 100), callout(id, 104, 112)]), 'n1', id) !== plain);
  const r0 = JSON.parse(plain);
  out.I1 = { ok: off.length === 0 && r0.crowding.length === 1 && r0.overprints.length === 1 && r0.obscured.length === 1 && r0.under.length === 4 && r0.outside.length > 0,
             detail: off.length ? 'differs for ' + off.join(', ') : `${IDS.length} identifiers in either position · crowding ${r0.crowding.length}, overprints ${r0.overprints.length}, obscured ${r0.obscured.length}, under ${r0.under.length}, outside ${r0.outside.length}` };
  /* I2: (a, b|c) and (a|b, c), overlapping in two places, are two relationships, never one */
  const twoSol = [callout('a', 100, 100), callout('b|c', 108, 104), callout('a|b', 300, 300), callout('c', 308, 304)];
  const two = results(twoSol), sizes = { crowding: C.crowding(twoSol, M).size, overprints: C.overprints(twoSol, M).size };
  const want = JSON.stringify([['a', 'b|c'], ['a|b', 'c']]);
  out.I2 = { ok: sizes.crowding === 2 && sizes.overprints === 2 && JSON.stringify(two.crowding) === want && JSON.stringify(two.overprints) === want,
             detail: JSON.stringify({ sizes, crowding: two.crowding }), crowdingSize: sizes.crowding };
  /* I3: a directed relationship keeps its direction: b's count line meets a's name, so exactly [b, a],
     which sorting would turn into [a, b] */
  const dir = results([callout('b', 100, 100), callout('a', 100, 112)]).obscured;
  out.I3 = { ok: JSON.stringify(dir) === JSON.stringify([['b', 'a']]), detail: JSON.stringify(dir) };
  /* I6: two directed relationships whose identifiers hold '>', in two places: (a>b over c) and
     (a over b>c), which a '>' join would read as one */
  const dSol = [callout('a>b', 100, 100), callout('c', 100, 112), callout('a', 300, 300), callout('b>c', 300, 312)];
  const dRes = [...C.obscured(dSol, M)].map(tuple);
  out.I6 = { ok: C.obscured(dSol, M).size === 2 && JSON.stringify(dRes) === JSON.stringify([['a>b', 'c'], ['a', 'b>c']]), detail: JSON.stringify(dRes) };
  /* I4 and I5, the decision itself, on a short canvas where two depth-1 callouts (Alpha, Gamma) already
     crowd each other and one deeper candidate (Delta) is tried. Crowding is held at 'keep' so the
     short-canvas rule, not the yield pass, decides. */
  const top = (id, x, y, ang, label) => ({ kind: 'container', id, depth: 1, x, y, r: 76, ang, label, count: 3 });
  const rootNode = { kind: 'root', id: 'scene-root', depth: 0, x: -5000, y: -5000, r: 44, ang: -Math.PI / 2, label: 'root', count: 0 };
  const allTier = RL.labels.configure({ tiers: [{ k: 0, name: 'all', containers: 'all', leaves: false, ids: false }] }).tiers[0];
  const decide = (nodes) => {
    const inp = { nodes, view: { k: 1, x: 0, y: 0 }, W: 600, H: 600, tier: allTier, visible: (id) => id !== 'scene-root',
                  shownCount: (n) => n.count, measure: width, font, bands: {}, held: null, crowding: 'keep', countText: (n) => String(n.count) };
    const held = RL.labels.population(inp, M, [], true);
    const base = RL.labels.solve({ ...inp, held: { tier: 'all', root: false, top: false, counts: false, keep: new Set() } });
    return { kept: held ? [...held.keep] : null, baseline: [...C.crowding(base, M)].map(tuple) };
  };
  /* I4: Delta adds one new crowding pair (with Beta) to the existing (Alpha, Gamma), and must be refused
     whatever the identifiers: plain; delimiter-bearing, where the new pair joined with a delimiter would
     read like the existing one ((a|b, c) against (a, b|c)); and a __proto__ candidate */
  const addScene = ([p, q, r, cand]) => [rootNode, top(p, 100, 100, 0, 'Alpha district'), top(q, 400, 120, Math.PI, 'Gamma district'),
    top(r, 100, 400, 0, 'Beta district'), { kind: 'container', id: cand, depth: 2, x: 300, y: 417, r: 15, ang: Math.PI, label: 'Delta kind', count: 9 }];
  const scenes = { plain: ['p1', 'p2', 'p3', 'p4'], delimiters: ['a|b', 'c', 'b|c', 'a'], prototype: ['n1', 'n2', 'n3', '__proto__'] };
  const got = Object.fromEntries(Object.entries(scenes).map(([k, ids]) => [k, decide(addScene(ids))]));
  out.I4 = { ok: Object.values(got).every((g) => g.kept !== null && g.kept.length === 0 && g.baseline.length === 1), detail: JSON.stringify(got),
             keptDelimiter: got.delimiters.kept, keptPrototype: got.prototype.kept };
  /* I5: Delta, tried on Gamma's side just above it, pushes Gamma clear of Alpha (the existing pair goes)
     and meets Alpha itself (a different pair comes): one pair traded for another. The rule compares pair
     identities, not their number, so Delta is refused */
  const trade = decide([rootNode, top('p1', 100, 100, 0, 'Alpha district'), top('p2', 400, 120, Math.PI, 'Gamma district'),
    { kind: 'container', id: 'p4', depth: 2, x: 330, y: 117, r: 15, ang: Math.PI, label: 'Delta kind', count: 9 }]);
  out.I5 = { ok: trade.kept !== null && trade.kept.length === 0 && trade.baseline.length === 1 && trade.baseline[0].includes('p1') && trade.baseline[0].includes('p2'),
             detail: JSON.stringify(trade) };
  return out;
}
{
  const real = identity(R);
  check('I1 the same overlapping callouts give the same collision relationships whatever their identifiers', real.I1.ok, real.I1.detail);
  check('I2 delimiter-bearing identifiers keep distinct pairs distinct', real.I2.ok, real.I2.detail);
  check('I3 a directed relationship keeps its direction', real.I3.ok, real.I3.detail);
  check('I4 the short-canvas rule refuses a callout that adds one new crowding pair, whatever the identifiers', real.I4.ok, real.I4.detail);
  check('I5 the short-canvas rule refuses a callout that trades one crowding pair for another', real.I5.ok, real.I5.detail);
  check('I6 directed relationships whose identifiers hold \'>\' stay distinct', real.I6.ok, real.I6.detail);
}

/* ------------------------------------------------------------------ X -- */
{ const L = layout(assemble(G.shallow(D))); const n = L.nodes.find((x) => x.kind === 'leaf'); n.ang += 1.0;
  check('X1 the invariant check detects a node pushed outside its parent\'s wedge', invariants(L).contain === 1); }
{ const L = layout(assemble(G.shallow(D))); const ws = L.wedges.filter((w) => !w.fan && w.parent === 'ROOT'); ws[1].lo = ws[0].hi - 0.1;
  check('X1 the invariant check detects overlapping sibling wedges', invariants(L).disjoint === 1); }
{ const L = layout(assemble(G.shallow(D))); const n = L.nodes.find((x) => x.kind === 'leaf'); n.x *= 0.1; n.y *= 0.1;
  check('X1 the invariant check detects a node drawn inside its parent', invariants(L).radial === 1); }
/* X2: the G1 comparison passes runtime-sized noise and fails every real change */
{
  const base = () => layout(assemble(G.base(D)), BASE_EQUAL);
  const L1 = base(); L1.nodes.forEach((n, i) => { if (n.kind !== 'root') { n.x += (i % 2 ? 1 : -1) * 4.6e-13; n.y -= (i % 3 ? 1 : -1) * 4.6e-13; } });
  const noise = compare(L1, REFERENCE);
  check('X2 a 4.6e-13 perturbation of every node coordinate (one last-place unit of any coordinate below 4,096, and more for these) passes', noise.ok, `largest difference ${noise.maxDiff.toExponential(2)}`);
  const L2 = base(); L2.nodes.find((n) => n.kind === 'leaf').x += 5e-7;
  check('X2 a displacement inside the tolerance (5e-7) passes', compare(L2, REFERENCE).ok);
  const L3 = base(); L3.nodes.find((n) => n.kind === 'leaf').x += 2e-6;
  const r3 = compare(L3, REFERENCE);
  check('X2 one leaf moved by 2e-6, just past the tolerance, fails as a numeric difference', !r3.ok && r3.exactCount === 0 && r3.numericCount === 1 && r3.numeric[0].field === 'x', JSON.stringify(r3.numeric[0]));
  const m = G.base(D); const i = m.nodes.findIndex((n) => n.kind); const j = m.nodes.findIndex((n, x) => x > i && n.kind && n.parent !== m.nodes[i].parent);
  m.nodes[i].parent = m.nodes[j].parent;
  const r4 = compare(layout(assemble(m), BASE_EQUAL), REFERENCE);
  check('X2 one leaf moved to another container fails structurally', !r4.ok && r4.exactCount > 0, `${r4.exactCount} structural differences, first ${JSON.stringify(r4.exact[0])}`);
  const o = G.base(D); const a = o.nodes.findIndex((n) => n.kind); const t = o.nodes[a]; o.nodes[a] = o.nodes[a + 1]; o.nodes[a + 1] = t;
  const r5 = compare(layout(assemble(o), BASE_EQUAL), REFERENCE);
  check('X2 two sibling leaves declared in the other order fail structurally', !r5.ok && r5.exact.some((e) => e.field === 'id'), JSON.stringify(r5.exact[0]));
  const L7 = base(); L7.nodes[0].count += 1;
  const r7 = compare(L7, REFERENCE);
  check('X2 a root count other than the reference\'s leaf total fails structurally', !r7.ok && r7.exact.some((e) => e.where === 'root' && e.field === 'count'), JSON.stringify(r7.exact[0]));
  const L8 = base(); L8.nodes[5].x = null; L8.nodes[6].ang = NaN;
  const r8 = compare(L8, REFERENCE);
  check('X2 a coordinate or bearing that is not a finite number fails structurally', !r8.ok && r8.exact.filter((e) => e.why === 'not a finite number').length === 2, JSON.stringify(r8.exact.slice(0, 2)));
  const L9 = base(); L9.nodes[0].parent = 'elsewhere';
  check('X2 a root with a parent fails structurally', compare(L9, REFERENCE).exact.some((e) => e.where === 0 && e.field === 'parent'));
  const L10 = base(); L10.nodes.pop();
  check('X2 a missing node fails structurally', compare(L10, REFERENCE).exact.some((e) => e.where === 'nodes' && e.field === 'count'));
  const L11 = base(); L11.bounds.w += 50;
  const r11 = compare(L11, REFERENCE);
  check('X2 a changed bound fails numerically', !r11.ok && r11.numeric.some((e) => e.where === 'bounds' && e.field === 'w'), JSON.stringify(r11.numeric[0]));
  const L12 = base(); delete L12.nodes.find((n) => n.outerR !== undefined).outerR;
  const L13 = base(); L13.nodes.find((n) => n.kind === 'leaf').outerR = 900;
  const r12 = compare(L12, REFERENCE), r13 = compare(L13, REFERENCE);
  check('X2 a dropped or an added fan radius fails structurally', [r12, r13].every((r) => !r.ok && r.exact.some((e) => e.field === 'outerR present') && r.numericCount === 0));
  const r6 = compare(layout(assemble(G.base(D)), { allocation: 'weighted', itemMax: 74 }), REFERENCE);
  check('X2 the weighted allocation fails numerically, by far more than the tolerance', !r6.ok && r6.exactCount === 0 && r6.maxDiff > 1, `largest difference ${r6.maxDiff.toFixed(1)} world units`);
}
rejects('X3 a misspelled layout setting', G.base(D), 'LAYOUT_OPTION', { alocation: 'equal' });
rejects('X3 an itemMax that is not a positive integer', G.base(D), 'LAYOUT_OPTION', { itemMax: -1 });
rejects('X3 an itemMax of 2.5', G.base(D), 'LAYOUT_OPTION', { itemMax: 2.5 });
rejects('X3 settings given as false', G.base(D), 'LAYOUT_OPTION', false);
rejects('X3 settings given as a Date', G.base(D), 'LAYOUT_OPTION', new Date(0));
rejects('X4 a state outside the Spectral State roles', { ...G.base(D), states: [{ role: 'magenta', label: 'x', meaning: 'x' }] }, 'STATE_ROLE');
rejects('X4 an edge on an undeclared plane', (() => { const m = G.base(D); m.edges[0].plane = 'none'; return m; })(), 'EDGE_PLANE');
rejects('X4 a kind with a shape outside the owner set', (() => { const m = G.base(D); m.kinds[0].shape = 'star'; return m; })(), 'KIND_SHAPE');

/* X6: the identity checks against mutated copies of the labels module. Three restore defect classes
   of the earlier bookkeeping (grouping by a plain object, pairs joined with '|', directed pairs joined
   with '>'); two introduce plausible regressions (a directed pair stored undirected, the short-canvas
   rule comparing counts). Every mutation must fail the check written for it. A replacement that no
   longer matches the source is itself a failure, so the controls cannot go stale silently. */
{
  const src = fs.readFileSync(path.join(DIR, 'diagrams-radial-labels.js'), 'utf8');
  const mutate = (pairs) => pairs.reduce((t, [a, b]) => (t.split(a).length === 2 ? t.split(a).join(b) : null), src);
  const MUTATIONS = [
    ['crowding keyed by a plain object', 'I1', [['var by = new Map(), out = new Set();', 'var by = {}, out = new Set();'], ['var b = by.get(x.id);', 'var b = by[x.id];'],
      ['by.set(x.id, ', 'by[x.id] = ('], ['var ids = Array.from(by.keys());', 'var ids = Object.keys(by);'], ['overlap(by.get(ids[i]), by.get(ids[j]))', 'overlap(by[ids[i]], by[ids[j]])']]],
    ['pairs joined with a delimiter', 'I2', [["function lineKey(id, line) { return JSON.stringify([id, line]); }", "function lineKey(id, line) { return id + '|' + line; }"],
      ["function pairKey(a, b) { return JSON.stringify(a < b ? [a, b] : [b, a]); }", "function pairKey(a, b) { return [a, b].sort().join('|'); }"]]],
    ['directed pairs joined with \'>\'', 'I6', [['out.add(JSON.stringify([q.id, a.id]));', "out.add(q.id + '>' + a.id);"]]],
    ['a directed pair stored undirected', 'I3', [['out.add(JSON.stringify([q.id, a.id]));', 'out.add(pairKey(q.id, a.id));']]],
    ['the short-canvas rule comparing counts', 'I5', [['function within(a, b) { var ok = true; a.forEach(function (k) { if (!b.has(k)) ok = false; }); return ok; }', 'function within(a, b) { return a.size <= b.size; }']]],
  ];
  MUTATIONS.forEach(([what, target, pairs]) => {
    const text = mutate(pairs);
    if (text === null) { check(`X6 ${what}: the mutation applies`, false, 'a replacement no longer matches the labels source'); return; }
    const res = identity(load(text)), failing = Object.keys(res).filter((k) => !res[k].ok);
    check(`X6 ${what} fails ${target}`, failing.includes(target), `failing: ${failing.join(', ') || 'none'} · ${res[target].detail.slice(0, 110)}`);
  });
  const plainObj = identity(load(mutate(MUTATIONS[0][2])));
  check('X6 crowding keyed by a plain object also changes the population decision: the __proto__ candidate is kept (I4)',
    JSON.stringify(plainObj.I4.keptPrototype) === '["__proto__"]', plainObj.I4.detail.slice(0, 160));
  const joined = identity(load(mutate(MUTATIONS[1][2])));
  check('X6 pairs joined with \'|\' collapse the two pairs into one and keep the delimiter candidate (I2, I4)',
    joined.I2.crowdingSize === 1 && JSON.stringify(joined.I4.keptDelimiter) === '["a"]', `crowding size ${joined.I2.crowdingSize}; kept ${JSON.stringify(joined.I4.keptDelimiter)}`);
}

console.log(`\nRESULT ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} · ${passed} passed`);
process.exitCode = failed ? 1 : 0;
