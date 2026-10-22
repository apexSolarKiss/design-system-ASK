#!/usr/bin/env node
/* peer-contract.test.mjs — the relation contract, rendering and export controls of the static peer
   pattern, on the owner files themselves, in Node with no dependency.

     node tests/peer-contract.test.mjs          prints one line per check; exit 1 on any failure

   The engine, glyph carrier and source are classic scripts; they are loaded here as a page loads them,
   into one global, so the code tested is the code shipped.

   P  probes: every specimen spec validates, and its derived structure is the one the page describes.
      P6 holds every shipped perimeter cycle to one clockwise slot per step, listed in reading order,
      and P7 holds R-S-P to rock, paper, scissors' own winners: reversing a cycle keeps every degree
      count and symmetry order, so the degree and symmetry checks, P2 and P3, cannot catch it (X12 to X14)
   V  validation: every malformed spec or option checked here is a named error, and validate() never
      throws. V1 and V2 guard exact membership: a relation type or an endpoint that names a property
      every object inherits (constructor, toString, __proto__ …) is unknown, never one that exists. V7
      reads every array index; V8 keeps a character XML forbids out of a title, the metadata or a
      theme value; V10 and V11 refuse a glyph carrier whose offsets or measured weight are not finite
      numbers, or whose advances are missing, negative or not finite, to validate() and to render()
   C  completeness: an undeclared pair is an error, never a neutral pair; 'unspecified' declares a
      pair open and draws nothing
   R  rendering: relabeling and renaming move nothing, output is deterministic, every element id is
      the plate's own and a plate carries exactly three (R16), mount takes a prefix none of whose ids
      the page already carries (R17), the key lists only drawn types, and each theme mode carries
      what it should
   F  fonts, tokens and export: the carriers match the canonical font, the exporter resolves the
      canonical tokens, fails closed on a broken token file, validates before writing, refuses two
      spec ids that differ only in letter case (F14), runs through a symlinked path, and writes the
      same bytes twice
   E  the specimen's game reading (example content, not the contract): the dominance and equilibria
      its prose states
   X  negative controls: each check fails for its intended reason on a mutated copy of the engine,
      the exporter or a relation source */
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'patterns/diagram-static-peer');
const ENGINE_SRC = fs.readFileSync(path.join(DIR, 'diagrams-static-peer-engine.js'), 'utf8');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

function load(engineSource = ENGINE_SRC) {
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(engineSource, ctx, { filename: 'diagrams-static-peer-engine.js' });
  for (const f of ['diagrams-static-peer-glyphs.js', 'diagram-static-peer.source.js'])
    vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f });
  return { P: ctx.DIAGRAM_PEER, G: ctx.DIAGRAM_PEER_GLYPHS, SPECS: ctx.PEER_DIAGRAMS };
}
/* a copy of the engine with one exact passage replaced; the passage must occur exactly once */
function mutate(from, to) {
  const n = ENGINE_SRC.split(from).length - 1;
  if (n !== 1) throw new Error(`mutation anchor found ${n} times: ${from}`);
  return load(ENGINE_SRC.replace(from, to)).P;
}

const { P, G, SPECS } = load();
const byId = Object.fromEntries(SPECS.map((s) => [s.id, s]));
const clone = (x) => JSON.parse(JSON.stringify(x));
/* a copy of the glyph carrier with one change applied after copying, so NaN and Infinity survive */
const bent = (change) => { const g = clone(G); change(g); return g; };

let failed = 0, passed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (ok) passed++; else failed++;
};
const codes = (engine, spec, glyphs = G) => {
  try { return engine.validate(spec, glyphs).errors.map((e) => e.code); }
  catch (e) { return ['THREW ' + e.message]; }
};
const rejects = (engine, spec, code) => codes(engine, spec).includes(code);
const renderError = (engine, spec, options) => {
  try { engine.render(spec, options); return null; } catch (e) { return e.code || 'THREW ' + e.message; }
};
const geometry = (svg) => [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
const tri = (ids = ['a', 'b', 'c'], labels = ['A', 'B', 'C'], rels) => ({
  id: 't', preset: 'triangle', nodes: ids.map((id, i) => ({ id, label: labels[i] })),
  relations: rels || [{ from: ids[0], to: ids[2], type: 'directed' }, { from: ids[2], to: ids[1], type: 'directed' }, { from: ids[1], to: ids[0], type: 'directed' }],
});

// ------------------------------------------------------------------ P probes

for (const s of SPECS) check(`P1 ${s.id} validates`, P.validate(s, G).ok, JSON.stringify(P.validate(s, G).errors));
const shape = (s) => P.signatures(s).map((x) => `${x.out.length}${x.in.length}${x.neutral.length}${x.unspecified.length}`).join(' ');
for (const id of ['triangle.A-S-K', 'triangle.template', 'triangle.R-P-S'])
  check(`P2 ${id}: each node one out, one in; threefold`, shape(byId[id]) === '1100 1100 1100' && P.symmetry(byId[id]).order === 3, shape(byId[id]));
for (const id of ['square.L-E-O-V', 'square.template'])
  check(`P3 ${id}: each node one out, one in, one neutral; fourfold`, shape(byId[id]) === '1110 1110 1110 1110' && P.symmetry(byId[id]).order === 4, shape(byId[id]));
check('P4 the all-directed square: O and V beat two, L and E one; no symmetry',
  shape(byId['square.L-E-O-V.original']) === '1200 1200 2100 2100' && P.symmetry(byId['square.L-E-O-V.original']).order === 1);
check('P5 the neutral-opposites square and the all-directed square share the clockwise perimeter', ['l>e', 'e>o', 'o>v', 'v>l'].every((p) => {
  const [a, b] = p.split('>');
  return byId['square.L-E-O-V'].relations.some((r) => r.from === a && r.to === b && r.type === 'directed')
    && byId['square.L-E-O-V.original'].relations.some((r) => r.from === a && r.to === b && r.type === 'directed');
}));
/* the perimeter cycle, listed first: relation k runs from slot k to slot k + 1, one clockwise step */
const clockwise = (s) => { const n = s.nodes.length, at = (k) => s.nodes[k % n].id;
  return s.relations.length >= n && s.relations.slice(0, n).every((r, k) => r.type === 'directed' && r.from === at(k) && r.to === at(k + 1)); };
const firstCycle = (s) => s.relations.slice(0, s.nodes.length).map((r) => `${r.from}>${r.to}`).join(' ');
for (const s of SPECS) check(`P6 ${s.id}: its perimeter cycle steps one slot clockwise, listed in reading order`, clockwise(s), firstCycle(s));
/* R at the top, then S and P clockwise, and the game's own winners by label */
const rps = (s) => { const lab = Object.fromEntries(s.nodes.map((n) => [n.id, n.label]));
  return `${s.nodes.map((n) => n.label).join('')} ${s.relations.filter((r) => r.type === 'directed').map((r) => `${lab[r.from]}>${lab[r.to]}`).sort().join(' ')}`; };
check('P7 R-S-P: R at the top, then S and P clockwise; rock beats scissors, scissors beats paper, paper beats rock',
  rps(byId['triangle.R-P-S']) === 'RSP P>R R>S S>P', rps(byId['triangle.R-P-S']));

// ------------------------------------------------------------------ V validation

const INHERITED = ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'];
for (const t of INHERITED) {
  const s = tri(); s.relations[0].type = t;
  check(`V1 relation type "${t}" is RELATION_TYPE`, rejects(P, s, 'RELATION_TYPE'));
}
for (const e of INHERITED) {
  const s = tri(); s.relations[1].to = e;
  check(`V2 endpoint "${e}" is RELATION_ENDPOINT`, rejects(P, s, 'RELATION_ENDPOINT') && renderError(P, s, { glyphs: G }) === 'RELATION_ENDPOINT');
}
{
  const s = tri(['constructor', 'toString', 'valueOf']);
  const ok = P.validate(s, G).ok, M = ok && P.matrix(s);
  check('V3 node ids that name inherited properties are ordinary ids', ok && JSON.stringify(M) === '[[0,-1,1],[1,0,-1],[-1,1,0]]', JSON.stringify(M));
}
const malformed = [
  ['null spec', null, 'SPEC_NOT_OBJECT'], ['array spec', [], 'SPEC_NOT_OBJECT'], ['string spec', 'triangle', 'SPEC_NOT_OBJECT'],
  ['missing id', { ...tri(), id: undefined }, 'SPEC_ID'], ['id with a space', { ...tri(), id: 'a b' }, 'SPEC_ID'],
  ['unknown field', { ...tri(), relation: [] }, 'SPEC_KEY'], ['numeric title', { ...tri(), title: 3 }, 'SPEC_TITLE'],
  ['unknown preset', { ...tri(), preset: 'pentagon' }, 'PRESET_UNKNOWN'], ['inherited preset', { ...tri(), preset: 'constructor' }, 'PRESET_UNKNOWN'],
  ['nodes not an array', { ...tri(), nodes: { a: 1 } }, 'NODES_NOT_ARRAY'], ['four nodes on a triangle', { ...tri(['a', 'b', 'c', 'd'], ['A', 'B', 'C', 'D']) }, 'NODE_COUNT'],
  ['node not an object', { ...tri(), nodes: ['A', { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] }, 'NODE_NOT_OBJECT'],
  ['node field', { ...tri(), nodes: [{ id: 'a', label: 'A', color: 'x' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] }, 'NODE_KEY'],
  ['node id __proto__', tri(['__proto__', 'b', 'c']), 'NODE_ID'], ['duplicate node id', tri(['a', 'a', 'c']), 'NODE_ID_DUPLICATE'],
  ['two-character label', tri(undefined, ['AB', 'B', 'C']), 'LABEL_UNSUPPORTED'], ['lowercase label', tri(undefined, ['a', 'B', 'C']), 'LABEL_UNSUPPORTED'],
  ['accented label', tri(undefined, ['É', 'B', 'C']), 'LABEL_UNSUPPORTED'], ['empty label', tri(undefined, ['', 'B', 'C']), 'LABEL_UNSUPPORTED'],
  ['numeric label', tri(undefined, [1, 'B', 'C']), 'LABEL_UNSUPPORTED'], ['duplicate label', tri(undefined, ['A', 'A', 'C']), 'LABEL_DUPLICATE'],
  ['relations not an array', { ...tri(), relations: 'a>b' }, 'RELATIONS_NOT_ARRAY'],
  ['relation not an object', { ...tri(), relations: [...tri().relations.slice(1), 'a>c'] }, 'RELATION_NOT_OBJECT'],
  ['relation field', { ...tri(), relations: [{ ...tri().relations[0], weight: 2 }, ...tri().relations.slice(1)] }, 'RELATION_KEY'],
  ['self relation', { ...tri(), relations: [...tri().relations, { from: 'a', to: 'a', type: 'neutral' }] }, 'RELATION_SELF'],
  ['pair declared twice', { ...tri(), relations: [...tri().relations, { from: 'a', to: 'c', type: 'neutral' }] }, 'RELATION_PAIR_DUPLICATE'],
  ['pair declared twice, reversed', { ...tri(), relations: [...tri().relations, { from: 'c', to: 'a', type: 'directed' }] }, 'RELATION_PAIR_DUPLICATE'],
  ['meaning not an object', { ...tri(), meaning: 'beats' }, 'MEANING_NOT_OBJECT'], ['meaning field', { ...tri(), meaning: { winner: 'x' } }, 'MEANING_KEY'],
  ['empty wording', { ...tri(), meaning: { verb: '' } }, 'MEANING_TEXT'], ['non-Latin wording', { ...tri(), meaning: { directed: 'schlägt' } }, 'MEANING_TEXT'],
  ['numeric wording', { ...tri(), meaning: { directed: 1 } }, 'MEANING_TEXT'],
  ['wording wider than its key slot', { ...tri(), meaning: { directed: 'is preferred over, in every case' } }, 'MEANING_KEY_WIDTH'],
];
for (const [name, spec, code] of malformed) check(`V4 ${name} is ${code}`, rejects(P, spec, code), codes(P, spec).join(','));
check('V5 validate never throws', [undefined, null, 0, 'x', [], {}, { nodes: 5 }, { nodes: [null], relations: [null] }, { preset: 'square', nodes: [{}, {}, {}, {}], relations: [{}] }]
  .every((s) => { try { const v = P.validate(s, G); return v.ok === false && v.errors.length > 0; } catch (e) { return false; } }));
const base = byId['triangle.A-S-K'];
for (const [name, options, code] of [
  ['options not an object', 'keyed', 'OPTIONS_NOT_OBJECT'], ['no glyph carrier', {}, 'GLYPHS_MISSING'],
  ['unknown option', { glyphs: G, size: 500 }, 'OPTION_KEY'], ['arrowheads "end"', { glyphs: G, arrowheads: 'end' }, 'OPTION_ARROWHEADS'],
  ['arrowheads "mid"', { glyphs: G, arrowheads: 'mid' }, 'OPTION_ARROWHEADS'], ['keyed "yes"', { glyphs: G, keyed: 'yes' }, 'OPTION_KEYED'],
  ['theme "dark"', { glyphs: G, theme: 'dark' }, 'OPTION_THEME'], ['theme missing a value', { glyphs: G, theme: { name: 'x', fieldFrom: '#000' } }, 'OPTION_THEME'],
  ['theme value with markup', { glyphs: G, theme: { name: 'x', fieldFrom: '#000', fieldTo: '#000', ink: '#fff"/><script>', fontFamily: 'Inter', labelWeight: 200, keyWeight: 400 } }, 'OPTION_THEME'],
  ['id prefix with a space', { glyphs: G, idPrefix: 'a b' }, 'OPTION_ID_PREFIX'], ['font CSS that closes the style', { glyphs: G, fontFaceCSS: '</style>' }, 'OPTION_FONT_FACE'],
]) check(`V6 ${name} is ${code}`, renderError(P, base, options) === code, String(renderError(P, base, options)));

{
  const holeNodes = tri(); holeNodes.nodes = [holeNodes.nodes[0], , holeNodes.nodes[2]];
  check('V7 a hole in the nodes is NODE_NOT_OBJECT, and nothing renders', rejects(P, holeNodes, 'NODE_NOT_OBJECT') && renderError(P, holeNodes, { glyphs: G }) === 'NODE_NOT_OBJECT');
  const holeSquare = clone(byId['square.L-E-O-V']); holeSquare.nodes = [holeSquare.nodes[0], , , holeSquare.nodes[3]];
  check('V7 a square with two holes is NODE_NOT_OBJECT', rejects(P, holeSquare, 'NODE_NOT_OBJECT'));
  const holeRels = tri(); holeRels.relations = [holeRels.relations[0], , holeRels.relations[2]];
  check('V7 a hole in the relations is RELATION_NOT_OBJECT', rejects(P, holeRels, 'RELATION_NOT_OBJECT'));
  for (const [name, title] of [['vertical tab', 'A\u000Bvertical tab'], ['NUL', 'A\u0000'], ['lone surrogate', 'A\uD800B'], ['U+FFFF', 'A\uFFFF']]) {
    const t = { ...tri(), title };
    check(`V8 a title with a ${name} is SPEC_TITLE`, rejects(P, t, 'SPEC_TITLE'));
  }
  check('V8 a title in other scripts, with a surrogate pair, is fine', P.validate({ ...tri(), title: 'Pairs — équipes · 三角 · \uD83D\uDD3A' }, G).ok);
  const theme = { name: 'x', fieldFrom: '#D4C6E1', fieldTo: '#E2D3F0', ink: '#6A637F', fontFamily: 'Inter', labelWeight: 200, keyWeight: 400 };
  for (const [name, opts, code] of [
    ['metadata with a vertical tab', { metadata: 'a\u000Bb' }, 'OPTION_METADATA'],
    ['font CSS with "<"', { fontFaceCSS: 'a<b' }, 'OPTION_FONT_FACE'], ['font CSS with "&"', { fontFaceCSS: 'a&b' }, 'OPTION_FONT_FACE'],
    ['a theme value that opens a comment', { theme: { ...theme, ink: '#fff /*' } }, 'OPTION_THEME'],
    ['a theme value with url()', { theme: { ...theme, fieldFrom: 'url(https://example.org/x)' } }, 'OPTION_THEME'],
    ['a theme value with a backslash', { theme: { ...theme, ink: '\\66 ff' } }, 'OPTION_THEME'],
    ['a label weight the carrier did not measure', { theme: { ...theme, labelWeight: 300 } }, 'OPTION_THEME'],
  ]) check(`V8 ${name} is ${code}`, renderError(P, base, { glyphs: G, ...opts }) === code, String(renderError(P, base, { glyphs: G, ...opts })));
  const getter = { ...tri() }; Object.defineProperty(getter, 'id', { enumerable: true, get() { throw new Error('no'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  check('V9 a spec that cannot be read is SPEC_UNREADABLE, never a throw', codes(P, getter).join() === 'SPEC_UNREADABLE' && codes(P, revoked.proxy).join() === 'SPEC_UNREADABLE');
  check('V10 a malformed glyph carrier given to validate is GLYPHS_MALFORMED', codes(P, base, { labels: 1 }).includes('GLYPHS_MALFORMED') && P.validate(base).ok);
  check('V10 the canonical glyph carrier is well formed', P.validate(base, G).ok && P.validate(byId['square.L-E-O-V'], G).ok);
  for (const [name, carrier] of [
    ['a letter dx that is NaN', bent((g) => { g.labels.em.A.dx = NaN; })],
    ['a letter dy that is Infinity', bent((g) => { g.labels.em.S.dy = Infinity; })],
    ['a letter offset given as text', bent((g) => { g.labels.em.K.dx = '0'; })],
    ['a letter entry that is null, on a letter the plate does not use', bent((g) => { g.labels.em.Z = null; })],
    ['no measured weight (labels.axes removed)', bent((g) => { delete g.labels.axes; })],
    ['a measured weight that is NaN', bent((g) => { g.labels.axes.wght = NaN; })],
    ['an advance that is NaN', bent((g) => { g.advances.em.a = NaN; })],
    ['a negative advance', bent((g) => { g.advances.em.e = -0.5; })],
    ['an advance given as text', bent((g) => { g.advances.em[' '] = '0.25'; })],
    ['no advances at all', bent((g) => { g.advances.em = {}; })],
    ['one printable character without an advance', bent((g) => { delete g.advances.em.k; })],
    ['a NaN letter entry hidden from enumeration', bent((g) => { Object.defineProperty(g.labels.em, 'A', { value: { dx: NaN, dy: 0 }, enumerable: false }); })],
  ]) {
    const got = [codes(P, base, carrier).join(), renderError(P, base, { glyphs: carrier }), renderError(P, base, { glyphs: carrier, theme })];
    check(`V11 ${name} is GLYPHS_MALFORMED to validate and to render, with the page's theme and a resolved one`,
      got[0] === 'GLYPHS_MALFORMED' && got[1] === 'GLYPHS_MALFORMED' && got[2] === 'GLYPHS_MALFORMED', got.join(' | '));
  }
  check('V11 a missing carrier is GLYPHS_MISSING, a null one GLYPHS_MALFORMED',
    renderError(P, base, { glyphs: undefined }) === 'GLYPHS_MISSING' && renderError(P, base, { glyphs: null }) === 'GLYPHS_MALFORMED');
}

// ------------------------------------------------------------------ C completeness

{
  const s = clone(byId['square.L-E-O-V']); s.relations = s.relations.filter((r) => !(r.from === 'l' && r.to === 'o'));
  check('C1 an omitted pair is PAIR_UNDECLARED, and nothing renders', rejects(P, s, 'PAIR_UNDECLARED') && renderError(P, s, { glyphs: G }) === 'PAIR_UNDECLARED');
  const u = clone(byId['square.L-E-O-V']); u.relations.find((r) => r.from === 'l' && r.to === 'o').type = 'unspecified';
  const svg = P.render(u, { glyphs: G, keyed: true }), M = P.matrix(u), sig = P.signatures(u);
  check('C2 an unspecified pair validates, is null in the matrix, and draws nothing',
    P.validate(u, G).ok && M[0][2] === null && M[2][0] === null && !/data-from="l" data-to="o"/.test(svg) && /data-from="e" data-to="v"/.test(svg));
  check('C3 an unspecified pair is reported as unspecified, never neutral',
    sig[0].unspecified.join() === 'O' && sig[0].neutral.length === 0 && /L and O unspecified/.test(P.describe(u)));
  const neutral = P.render(byId['square.L-E-O-V'], { glyphs: G });
  check('C4 a neutral pair draws a dashed line with no head', /<path class="peer-neutral" data-relation="neutral" data-from="l" data-to="o" stroke-dasharray=/.test(neutral));
}

// ------------------------------------------------------------------ R rendering

const svgOf = (s, o = {}) => P.render(s, { glyphs: G, ...o });
const idsIn = (html) => [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
const unique = (a) => a.length === new Set(a).size;
/* a page as mount sees it: getElementById over every id the page holds, and hosts whose content
   joins the page when mount writes it */
const pageWith = (...htmls) => {
  const ids = htmls.flatMap(idsIn);
  const doc = { getElementById: (x) => (ids.includes(x) ? { id: x } : null) };
  const host = () => ({ nodeType: 1, ownerDocument: doc, set innerHTML(v) { ids.push(...idsIn(v)); }, querySelector: () => ({}) });
  return { ids, host };
};
check('R1 relabeling moves no connector: A-S-K, R-S-P and the triangle template draw the same lines',
  geometry(svgOf(byId['triangle.A-S-K'])) === geometry(svgOf(byId['triangle.R-P-S'])) && geometry(svgOf(byId['triangle.A-S-K'])) === geometry(svgOf(byId['triangle.template'])));
{
  const relabeled = clone(byId['square.L-E-O-V']); relabeled.nodes.forEach((n, i) => { n.label = 'WXYZ'[i]; });
  check('R2 relabeling the square moves no connector', geometry(svgOf(relabeled)) === geometry(svgOf(byId['square.L-E-O-V'])));
  const renamed = clone(byId['square.L-E-O-V']); const map = { l: 'p1', e: 'p2', o: 'p3', v: 'p4' };
  renamed.nodes.forEach((n) => { n.id = map[n.id]; }); renamed.relations.forEach((r) => { r.from = map[r.from]; r.to = map[r.to]; });
  check('R3 renaming node ids changes only the data attributes',
    svgOf(renamed).replace(/data-(from|to|node)="[^"]*"/g, '') === svgOf(byId['square.L-E-O-V']).replace(/data-(from|to|node)="[^"]*"/g, ''));
}
check('R4 rendering is deterministic', SPECS.every((s) => svgOf(s, { keyed: true }) === svgOf(s, { keyed: true })));
{
  const ids = (svg) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  const a = svgOf(base, { idPrefix: 'peer-1' }), b = svgOf(base, { idPrefix: 'peer-2' });
  const own = (svg, p) => ids(svg).every((i) => i === p || i.startsWith(p + '_')) && [...svg.matchAll(/(?:url\(#|aria-labelledby=")([^)"]+)/g)].every((m) => ids(svg).includes(m[1]));
  check('R5 every id and id reference belongs to the plate\'s prefix', own(a, 'peer-1') && own(b, 'peer-2') && !ids(a).some((i) => ids(b).includes(i)));
  check('R6 the default prefix is stable for a standalone file', ids(svgOf(base))[0] === 'peer-triangle_0A-S-K');
  const plain = (id) => ({ ...clone(base), id });
  const all = ['a', 'a-title', 'a_title', 'a.b', 'a_b', 'a.title'].map((id) => ids(svgOf(plain(id))));
  check('R15 default prefixes never collide: a, a-title, a_title, a.b, a_b and a.title share no id',
    all.flat().length === new Set(all.flat()).size, all.map((x) => x[0]).join(' '));
  const css = (svg) => svg.match(/<style>([\s\S]*?)<\/style>/)[1];
  check('R7 every style rule is scoped to its plate', css(a).split('}').filter(Boolean).every((r) => r.startsWith('#peer-1 ')));
  check('R16 a plate carries exactly three ids: the plate, its title and its field',
    [a, svgOf(base, { idPrefix: 'peer-1', keyed: true }), svgOf(base, { idPrefix: 'peer-1', arrowheads: 'midpoint' })]
      .every((svg) => ids(svg).join() === 'peer-1,peer-1_title,peer-1_field'));
}
{
  // Each case loads a fresh engine, whose first automatic prefix is peer_1.
  const beside = pageWith(P.render(base, { glyphs: G, idPrefix: 'peer_1_field' }));
  load().P.mount(beside.host(), base, { glyphs: G });
  check('R17 mounted beside a plate whose own prefix is peer_1_field, a plate repeats no id', unique(beside.ids) && beside.ids.length === 6, beside.ids.join(' '));
  for (const suffix of ['', '_title', '_field']) {
    const pg = pageWith(`<p id="peer_1${suffix}"></p>`);
    load().P.mount(pg.host(), base, { glyphs: G });
    check(`R17 an element with the id peer_1${suffix} sends mount on to peer_2`, unique(pg.ids) && pg.ids[1] === 'peer_2', pg.ids.join(' '));
  }
  const thrice = pageWith(), E = load().P;
  for (let i = 0; i < 3; i++) E.mount(thrice.host(), base, { glyphs: G });
  check('R17 the same spec mounted three times repeats no id', unique(thrice.ids) && thrice.ids.length === 9);
}
{
  const keyed = svgOf(byId['square.L-E-O-V'], { keyed: true }), plate = svgOf(byId['square.L-E-O-V']);
  check('R8 the key adds its band and one item per drawn type', /viewBox="0 0 1000 1150"/.test(keyed) && /viewBox="0 0 1000 1000"/.test(plate)
    && (keyed.match(/class="peer-key"/g) || []).length === 2 && />beats</.test(keyed) && />ties \(neutral\)</.test(keyed));
  const tKeyed = svgOf(base, { keyed: true });
  check('R9 a plate with no neutral relation keys only its directed one', (tKeyed.match(/class="peer-key"/g) || []).length === 1);
  check('R10 arrowheads default to the target', svgOf(base) === svgOf(base, { arrowheads: 'target' }) && /data-arrowheads="target"/.test(svgOf(base)));
  const m = svgOf(base, { arrowheads: 'midpoint' });
  check('R11 midpoint heads move only the heads and their lines', /data-arrowheads="midpoint"/.test(m) && m !== svgOf(base)
    && (m.match(/class="peer-head"/g) || []).length === 3 && [...m.matchAll(/<text[^>]*>/g)].join() === [...svgOf(base).matchAll(/<text[^>]*>/g)].join());
  const inherit = svgOf(base);
  const vars = [...new Set([...inherit.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((x) => x[1]))].sort().join(',');
  check('R12 a page plate takes only the foundation roles', vars === '--bg-from,--bg-to,--fg-1,--font-sans,--fw-extralight,--fw-regular' && !/#[0-9A-Fa-f]{3,6}\b/.test(inherit), vars);
  const fixed = svgOf(base, { theme: { name: 'light', fieldFrom: '#D4C6E1', fieldTo: '#E2D3F0', ink: '#6A637F', fontFamily: 'Inter', labelWeight: 200, keyWeight: 400 } });
  check('R13 a standalone plate carries resolved values and no var()', !/var\(/.test(fixed) && /stop-color="#D4C6E1"/.test(fixed) && /fill:#6A637F/.test(fixed));
  check('R14 the description is derived from the relations, in their listed order', /<desc>Three equal nodes \(A, S, K\)\. A beats S; S beats K; K beats A\.<\/desc>/.test(inherit)
    && P.describe(byId['square.L-E-O-V.original']) === 'Four equal nodes (L, E, O, V). L beats E; E beats O; O beats V; V beats L; O beats L; V beats E.');
}

// ------------------------------------------------------------------ F fonts, tokens and export

const FONT = (() => { const c = {}; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(DIR, 'diagrams-static-peer-font.js'), 'utf8'), c); return c.DIAGRAM_PEER_FONT; })();
const canonical = sha256(fs.readFileSync(path.join(ROOT, 'fonts/InterVariable.woff2')));
const driftOk = (sha) => G.source.sha256 === sha && FONT.source.sha256 === sha && G.source.path === 'fonts/InterVariable.woff2';
check('F1 both carriers were generated from the canonical Inter', driftOk(canonical), `${G.source.sha256.slice(0, 12)} vs ${canonical.slice(0, 12)}`);
{
  const b64 = FONT.css.match(/base64,([A-Za-z0-9+/=]+)\)/)[1], bytes = Buffer.from(b64, 'base64');
  check('F2 the embedded subset is the recorded one', bytes.length === FONT.subset.bytes && sha256(bytes) === FONT.subset.sha256 && bytes.subarray(0, 4).toString('latin1') === 'wOF2');
}
check('F3 every supported label is measured, and every printable Basic Latin character has an advance',
  [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'].every((c) => G.labels.em[c] && Number.isFinite(G.labels.em[c].dx) && Number.isFinite(G.labels.em[c].dy))
  && Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).every((c) => Number.isFinite(G.advances.em[c])));
check('F4 the font carrier carries the license text', FONT.license === fs.readFileSync(path.join(ROOT, 'fonts/Inter-OFL.txt'), 'utf8') && /Copyright/.test(FONT.copyright));
const { readThemes } = await import(pathToFileURL(path.join(DIR, 'export-peer.mjs')).href);
{
  const css = fs.readFileSync(path.join(ROOT, 'colors_and_type.css'), 'utf8');
  const decl = (n) => css.match(new RegExp(`${n}:\\s*([^;]+);`))[1].trim();
  const t = readThemes(css);
  check('F5 the exporter resolves the canonical tokens for each theme',
    t.light.ink === decl('--ask-fg-light') && t.light.fieldFrom === decl('--ask-lavender-dark') && t.light.fieldTo === decl('--ask-lavender-light')
    && t.dark.ink === decl('--ask-lavender-dark') && t.dark.fieldFrom === decl('--ask-ink-light') && t.dark.fieldTo === decl('--ask-ink-dark')
    && t.light.labelWeight === Number(decl('--fw-extralight')) && t.dark.keyWeight === Number(decl('--fw-regular')) && t.light.fontFamily === decl('--font-sans'), JSON.stringify(t.dark));
  let failsClosed = false;
  try { readThemes(css.replace(/--fg-1:[^;]+;/g, '')); } catch (e) { failsClosed = /--fg-1/.test(e.message); }
  check('F6 the exporter fails closed on a token file without --fg-1', failsClosed);
  const throwsOn = (text, re) => { try { readThemes(text); return false; } catch (e) { return re.test(e.message); } };
  const lightOnly = ':root { --bg-from:#111; --bg-to:#222; --fg-1:#333; --font-sans:Inter; --fw-extralight:200; --fw-regular:400; }';
  check('F11 a token file with no dark rule fails, rather than export light values as dark', throwsOn(lightOnly, /dark theme does not declare --bg-from/));
  check('F11 a truncated token file fails, and returns', (() => {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e',
      `import { readThemes } from ${JSON.stringify(pathToFileURL(path.join(DIR, 'export-peer.mjs')).href)}; try { readThemes(${JSON.stringify(lightOnly.slice(0, -2))}); process.exit(3); } catch (e) { process.exit(/unclosed/.test(e.message) ? 0 : 4); }`],
      { timeout: 5000 });
    return r.status === 0;
  })());
  check('F11 an unclosed comment fails', throwsOn(lightOnly + ' /* note', /unclosed comment/));
  const darkLate = lightOnly + ' html[data-theme="dark"], :root[data-theme="dark"] { --bg-from:#aaa; --bg-to:#bbb; --fg-1:#ccc }';
  const t2 = readThemes(darkLate);
  check('F11 the dark rule is found anywhere in its selector list, and its last declaration needs no semicolon',
    t2.dark.fieldFrom === '#aaa' && t2.dark.ink === '#ccc' && t2.light.ink === '#333' && t2.dark.labelWeight === 200);
}
/* a relation source of two specs with different content: A-S-K renamed Triad.ASK, and R-S-P as `second` */
const casePair = (second) => `module.exports = ${JSON.stringify([{ ...byId['triangle.A-S-K'], id: 'Triad.ASK' }, { ...byId['triangle.R-P-S'], id: second }])};`;
{
  const run = (args) => spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 60000 });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-export-'));
  try {
    const bad = path.join(tmp, 'bad.source.js');
    fs.writeFileSync(bad, `module.exports = ${JSON.stringify([byId['triangle.A-S-K'], { ...byId['triangle.R-P-S'], relations: byId['triangle.R-P-S'].relations.slice(1) }])};`);
    const dup = path.join(tmp, 'dup.source.js');
    fs.writeFileSync(dup, `module.exports = ${JSON.stringify([byId['triangle.A-S-K'], byId['triangle.A-S-K']])};`);
    const r1 = run([path.join(DIR, 'export-peer.mjs'), '--out', path.join(tmp, 'o1'), '--tokens', path.join(ROOT, 'colors_and_type.css'), '--source', bad]);
    const r2 = run([path.join(DIR, 'export-peer.mjs'), '--out', path.join(tmp, 'o2'), '--tokens', path.join(ROOT, 'colors_and_type.css'), '--source', dup]);
    check('F12 an invalid spec, or a spec id given twice, fails before anything is written',
      r1.status === 1 && /PAIR_UNDECLARED/.test(r1.stderr) && !fs.existsSync(path.join(tmp, 'o1'))
      && r2.status === 1 && /given twice/.test(r2.stderr) && !fs.existsSync(path.join(tmp, 'o2')), `${r1.status} ${r2.status}`);
    fs.symlinkSync(DIR, path.join(tmp, 'link'), 'dir');
    const r3 = run([path.join(tmp, 'link', 'export-peer.mjs'), '--out', path.join(tmp, 'o3'), '--tokens', path.join(ROOT, 'colors_and_type.css'), '--spec', 'triangle.A-S-K']);
    check('F13 run through a symlinked path, the exporter still writes and reports', r3.status === 0 && fs.readdirSync(path.join(tmp, 'o3')).length === 4 && /"svg"/.test(r3.stdout));
    const source = (name, second) => { const f = path.join(tmp, `${name}.source.js`); fs.writeFileSync(f, casePair(second)); return f; };
    const r4 = run([path.join(DIR, 'export-peer.mjs'), '--out', path.join(tmp, 'o4'), '--tokens', path.join(ROOT, 'colors_and_type.css'), '--source', source('cased', 'triad.ask')]);
    check('F14 two spec ids that differ only in letter case fail before anything is written, and the error names both and their files',
      r4.status === 1 && /Triad\.ASK and triad\.ask differ only in letter case.*\(Triad\.ASK_plate-light\.svg, triad\.ask_plate-light\.svg\)/.test(r4.stderr)
      && !fs.existsSync(path.join(tmp, 'o4')), `${r4.status} ${r4.stderr.trim()}`);
    const r5 = run([path.join(DIR, 'export-peer.mjs'), '--out', path.join(tmp, 'o5'), '--tokens', path.join(ROOT, 'colors_and_type.css'), '--source', source('distinct', 'triad.rps')]);
    const kept = r5.status === 0 ? JSON.parse(r5.stdout).svg.map((w) => path.basename(w.file)).sort().join(' ') : `exit ${r5.status}`;
    const expected = ['Triad.ASK', 'triad.rps'].flatMap((id) => ['plate', 'keyed'].flatMap((k) => ['light', 'dark'].map((t) => `${id}_${k}-${t}.svg`))).sort().join(' ');
    check('F14 ids that differ in more than letter case export under their own names, case kept', kept === expected, kept);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
{
  const outs = [0, 1].map(() => fs.mkdtempSync(path.join(os.tmpdir(), 'peer-export-')));
  try {
    const reports = outs.map((out) => JSON.parse(execFileSync(process.execPath,
      [path.join(DIR, 'export-peer.mjs'), '--out', out, '--tokens', path.join(ROOT, 'colors_and_type.css')], { encoding: 'utf8' })));
    const names = fs.readdirSync(outs[0]).sort();
    check('F7 the exporter writes every spec as plate and keyed, light and dark', names.length === SPECS.length * 4
      && SPECS.every((s) => ['plate', 'keyed'].every((k) => ['light', 'dark'].every((t) => names.includes(`${s.id}_${k}-${t}.svg`)))));
    check('F8 two runs write the same bytes', names.every((n) => fs.readFileSync(path.join(outs[0], n)).equals(fs.readFileSync(path.join(outs[1], n)))));
    const one = fs.readFileSync(path.join(outs[0], 'triangle.A-S-K_plate-dark.svg'), 'utf8');
    check('F9 a standalone file embeds the subset and carries the license and token provenance',
      one.includes(FONT.css) && one.includes('SIL OPEN FONT LICENSE Version 1.1') && one.includes(reports[0].tokens.sha256) && /stop-color="#201D26"/.test(one));
    const fileIds = names.map((n) => [...fs.readFileSync(path.join(outs[0], n), 'utf8').matchAll(/ id="([^"]+)"/g)].map((m) => m[1])).flat();
    check('F10 exported files share no element id, so they can be inlined together', fileIds.length === new Set(fileIds).size && fileIds.length === names.length * 3);
  } finally { outs.forEach((o) => fs.rmSync(o, { recursive: true, force: true })); }
}

// ------------------------------------------------------------------ E the specimen's game reading

/* Payoff +1 win, -1 loss, 0 tie, from the declared relations: the specimen's reading, not the contract. */
const F = (n, d = 1n) => { const g = (a, b) => (b ? g(b, a % b) : a < 0n ? -a : a); const k = g(n, d) || 1n; return [n / k * (d < 0n ? -1n : 1n), d / k * (d < 0n ? -1n : 1n)]; };
const add = (a, b) => F(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const mul = (a, b) => F(a[0] * b[0], a[1] * b[1]);
const payoffVs = (M, mix) => M.map((row) => row.reduce((acc, v, j) => add(acc, mul(F(BigInt(v)), mix[j])), F(0n)));
const isEquilibrium = (M, mix) => payoffVs(M, mix).every((p) => p[0] <= 0n);
const dominated = (M) => {
  const out = [];
  M.forEach((x, i) => M.forEach((y, j) => { if (i !== j && y.every((v, k) => v >= x[k]) && y.some((v, k) => v > x[k])) out.push(`${i}<${j}`); }));
  return out;
};
{
  const O = P.matrix(byId['square.L-E-O-V.original']), N = P.matrix(byId['square.L-E-O-V']);
  check('E1 in the all-directed square V weakly dominates L, and nothing else is dominated', dominated(O).join() === '0<3', dominated(O).join());
  check('E2 against an opponent who always plays E, L wins just as V does', O[0][1] === 1 && O[3][1] === 1);
  const third = F(1n, 3n);
  check('E3 the all-directed square: E, O and V equally, L never, is an equilibrium', isEquilibrium(O, [F(0n), third, third, third]));
  check('E4 the neutral-opposites square: nothing is dominated', dominated(N).length === 0);
  check('E5 the neutral-opposites square: (a, 1/2 - a, a, 1/2 - a) is an equilibrium for a = 0, 1/8, 1/4, 3/8, 1/2',
    [0n, 1n, 2n, 3n, 4n].every((k) => { const a = F(k, 8n), b = add(F(1n, 2n), F(-k, 8n)); return isEquilibrium(N, [a, b, a, b]); }));
  check('E6 control: the uniform mix is not an equilibrium of the all-directed square', !isEquilibrium(O, [F(1n, 4n), F(1n, 4n), F(1n, 4n), F(1n, 4n)]));
}

// ------------------------------------------------------------------ X negative controls

{
  const old = mutate("var typeOk = typeof r.type === 'string' && TYPES.indexOf(r.type) !== -1;",
    "var typeOk = !!({ directed: 1, neutral: 1, unspecified: 1 })[r.type];");
  const s = tri(); s.relations[0].type = 'constructor';
  check('X1 V1 bites: a membership test by property lookup accepts "constructor"', !rejects(old, s, 'RELATION_TYPE') && rejects(P, s, 'RELATION_TYPE'));
  const oldEnds = mutate("var ids = Object.create(null), labels = Object.create(null), valid = [];", "var ids = {}, labels = {}, valid = [];");
  const e = tri(); e.relations[1].to = 'toString';
  check('X2 V2 bites: a plain-object id map accepts "toString" as an endpoint', !rejects(oldEnds, e, 'RELATION_ENDPOINT') && rejects(P, e, 'RELATION_ENDPOINT'));
  const loose = mutate("err('PAIR_UNDECLARED', 'spec.relations',", "void (0, 'spec.relations',");
  const c = clone(byId['square.L-E-O-V']); c.relations.pop();
  check('X3 C1 bites: without the completeness check an omitted pair validates', loose.validate(c, G).ok && !P.validate(c, G).ok);
  const moved = mutate('square:   { n: 4, origin: -135 },', 'square:   { n: 4, origin: -134 },');
  const relabeled = clone(byId['square.L-E-O-V']); relabeled.nodes.forEach((n, i) => { n.label = 'WXYZ'[i]; });
  check('X4 R2 bites: a moved vertex changes the geometry', geometry(moved.render(relabeled, { glyphs: G })) !== geometry(svgOf(byId['square.L-E-O-V'])));
  check('X5 F1 bites: a different font hash fails the drift check', !driftOk('0'.repeat(64)));
  const skipping = mutate('for (var ni = 0; ni < nodeCount; ni++) checkNode(spec.nodes[ni], ni);', 'spec.nodes.forEach(checkNode);');
  const hole = tri(); hole.nodes = [hole.nodes[0], , hole.nodes[2]]; hole.relations = [{ from: 'a', to: 'c', type: 'directed' }];
  check('X7 V7 bites: an engine that skips holes validates a triangle with a missing node', skipping.validate(hole, G).ok && !P.validate(hole, G).ok);
  const lax = mutate('var XML_UNSAFE = /', 'var XML_UNSAFE = /(?!)/; var XML_UNUSED = /');
  const ctl = { ...tri(), title: 'A\u000Bb' };
  check('X8 V8 bites: without the XML check a title with a control character validates', lax.validate(ctl, G).ok && !P.validate(ctl, G).ok);
  const twoIds = mutate('while (plateIds(o.idPrefix).some(function (x) { return doc.getElementById(x); }));',
    "while (doc.getElementById(o.idPrefix) || doc.getElementById(o.idPrefix + '_title'));");
  const pg = pageWith(P.render(base, { glyphs: G, idPrefix: 'peer_1_field' }));
  twoIds.mount(pg.host(), base, { glyphs: G });
  check('X9 R17 bites: a mount that checks only the plate and title ids repeats the field id', !unique(pg.ids), pg.ids.join(' '));
  const shallow = mutate('function validGlyphs(glyphs) {',
    'function validGlyphs(glyphs) { return isObject(glyphs) && isObject(glyphs.labels) && isObject(glyphs.labels.em) && isObject(glyphs.advances) && isObject(glyphs.advances.em);');
  const nanDx = bent((g) => { g.labels.em.A.dx = NaN; });
  check('X10 V11 bites: a shape-only carrier check validates a NaN offset and draws x="NaN"',
    shallow.validate(base, nanDx).ok && /x="NaN"/.test(shallow.render(base, { glyphs: nanDx })) && !P.validate(base, nanDx).ok);
  const unscoped = mutate("var s = '#' + id + ' ';", "var s = '';");
  check('X6 R7 bites: unscoped rules are detected', !unscoped.render(base, { glyphs: G, idPrefix: 'peer-1' }).match(/<style>([\s\S]*?)<\/style>/)[1].split('}').filter(Boolean).every((r) => r.startsWith('#peer-1 ')));
}
{
  /* each regular spec with every relation reversed: the counterclockwise cycle P6 exists to catch */
  const reversed = (s) => ({ ...clone(s), relations: s.relations.map((r) => ({ ...r, from: r.to, to: r.from })) });
  const regular = { 'triangle.A-S-K': ['1100 1100 1100', 3], 'triangle.template': ['1100 1100 1100', 3], 'triangle.R-P-S': ['1100 1100 1100', 3],
    'square.L-E-O-V': ['1110 1110 1110 1110', 4], 'square.template': ['1110 1110 1110 1110', 4] };
  const kept = Object.entries(regular).every(([id, [sh, order]]) => shape(reversed(byId[id])) === sh && P.symmetry(reversed(byId[id])).order === order);
  check('X12 P6 bites: reversed, every regular spec keeps the degree counts and symmetry P2 and P3 check, and fails P6',
    kept && Object.keys(regular).every((id) => !clockwise(reversed(byId[id]))));
  /* R-P-S left in its former places with its arrows turned clockwise: rock now beats paper */
  const turned = { ...clone(byId['triangle.R-P-S']), nodes: ['r', 'p', 's'].map((id) => ({ id, label: id.toUpperCase() })),
    relations: [['r', 'p'], ['p', 's'], ['s', 'r']].map(([from, to]) => ({ from, to, type: 'directed' })) };
  check('X13 P7 bites: R-P-S left in place with its arrows turned clockwise passes P2 and P6, and fails P7',
    shape(turned) === '1100 1100 1100' && P.symmetry(turned).order === 3 && clockwise(turned) && rps(turned) !== 'RSP P>R R>S S>P', rps(turned));
  /* R, S and P in their places with the game's winners reversed: P7's node order holds, its winners do not */
  const losers = { ...clone(byId['triangle.R-P-S']), nodes: ['r', 's', 'p'].map((id) => ({ id, label: id.toUpperCase() })),
    relations: [['r', 'p'], ['p', 's'], ['s', 'r']].map(([from, to]) => ({ from, to, type: 'directed' })) };
  check('X14 P7 bites on its winners alone: R, S, P in place with rock beating paper keeps the node order and fails P7',
    P.validate(losers, G).ok && rps(losers).startsWith('RSP ') && rps(losers) !== 'RSP P>R R>S S>P', rps(losers));
}
{
  /* the exporter without its letter-case check, run beside copies of the carriers it loads */
  const guard = "if (clashes.size) throw new Error(`nothing written; ${[...clashes.values()].join('; ')}`);";
  const src = fs.readFileSync(path.join(DIR, 'export-peer.mjs'), 'utf8');
  const n = src.split(guard).length - 1;
  if (n !== 1) throw new Error(`mutation anchor found ${n} times: ${guard}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-export-'));
  try {
    for (const f of ['diagrams-static-peer-engine.js', 'diagrams-static-peer-glyphs.js', 'diagrams-static-peer-font.js']) fs.copyFileSync(path.join(DIR, f), path.join(tmp, f));
    fs.writeFileSync(path.join(tmp, 'export-peer.mjs'), src.replace(guard, ''));
    fs.writeFileSync(path.join(tmp, 'cased.source.js'), casePair('triad.ask'));
    const r = spawnSync(process.execPath, [path.join(tmp, 'export-peer.mjs'), '--out', path.join(tmp, 'out'), '--tokens', path.join(ROOT, 'colors_and_type.css'),
      '--source', path.join(tmp, 'cased.source.js')], { encoding: 'utf8', timeout: 60000 });
    const names = r.status === 0 ? JSON.parse(r.stdout).svg.map((w) => path.basename(w.file)) : [];
    check('X11 F14 bites: an exporter without the letter-case check exits 0, reporting eight files whose names are four when case is ignored',
      names.length === 8 && new Set(names.map((x) => x.toLowerCase())).size === 4, `exit ${r.status}, ${names.length} reported`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
