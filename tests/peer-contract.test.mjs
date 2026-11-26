#!/usr/bin/env node
/* peer-contract.test.mjs — the relation contract, rendering and export controls of the static peer
   pattern, on the owner files themselves, in Node with no dependency.

     node tests/peer-contract.test.mjs          prints one line per check; exit 1 on any failure

   The engine, glyph carrier and source are classic scripts; they are loaded here as a page loads them,
   into one global, so the code tested is the code shipped.

   P  probes: every specimen spec validates, and its derived structure is the one the page describes.
      P6 holds every shipped perimeter cycle to one clockwise slot per step, listed in reading order,
      and P7 holds R-S-P to rock, paper, scissors' own winners: reversing a cycle keeps every degree
      count and symmetry order, so the degree and symmetry checks, P2 and P3, cannot catch it (X12 to X14).
      P8 holds the two declared semantic examples' relations, P9 the six neutral specs to no semantic field
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
      its prose states, and the assessment example's figures and ratings against its declared mixture (E7)
   N  node rings: one equal ring per node, centered on its vertex; every supported label's measured
      ink leaves the ring's padding clear inside it; every connector stops the ring's gap outside it,
      a neutral line beginning and ending on dash ink; a carrier without a finite ink radius is
      malformed, and a label whose ink would crowd its ring is LABEL_RING_FIT
   S  declared semantic examples: every malformed declaration, assignment and line is a named error;
      an example keeps its relations, rings and letters where the neutral plate has them; its colored
      nodes take their system's tokens on a page and resolved roles in a file, an unassessed node keeps
      the neutral ring and its figure as plain text; it is drawn keyed only, its notes and band stay
      in their slots, and the exporter resolves its roles from the systems' stylesheets to their
      approved values, each ink the exact approved recipe, written here and never read from the
      owner (S11, S12). The engine
      and the exporter read a spec's declaration by one rule, its own property, and a plate is drawn
      only from the role values its theme owns and the engine checked (S14, S15)
   X  negative controls: each check fails for its intended reason on a mutated copy of the engine,
      the exporter or a relation source, or on a former binding or ink (X30, X31) */
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

/* a copy of the engine with several exact passages replaced, each occurring exactly once */
function mutateEach(pairs) {
  let src = ENGINE_SRC;
  for (const [from, to] of pairs) {
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor found ${n} times: ${from}`);
    src = src.replace(from, to);
  }
  return load(src).P;
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
/* every spec with a directed relation: L-E-J's interfaces are neutral, and P8 holds them */
const cyclic = SPECS.filter((s) => s.relations.some((r) => r.type === 'directed'));
for (const s of cyclic) check(`P6 ${s.id}: its perimeter cycle steps one slot clockwise, listed in reading order`, clockwise(s), firstCycle(s));
check('P6 every shipped spec but L-E-J has a directed perimeter for P6 to hold', cyclic.length === SPECS.length - 1 && !cyclic.some((s) => s.id === 'triangle.L-E-J.functions'));
/* R at the top, then S and P clockwise, and the game's own winners by label */
const rps = (s) => { const lab = Object.fromEntries(s.nodes.map((n) => [n.id, n.label]));
  return `${s.nodes.map((n) => n.label).join('')} ${s.relations.filter((r) => r.type === 'directed').map((r) => `${lab[r.from]}>${lab[r.to]}`).sort().join(' ')}`; };
check('P7 R-S-P: R at the top, then S and P clockwise; rock beats scissors, scissors beats paper, paper beats rock',
  rps(byId['triangle.R-P-S']) === 'RSP P>R R>S S>P', rps(byId['triangle.R-P-S']));
{
  const asm = byId['triangle.A-S-K.assessment'], lej = byId['triangle.L-E-J.functions'];
  check('P8 the assessment example keeps the A-S-K game: the same relations, matrix, signatures and symmetry',
    JSON.stringify(asm.relations) === JSON.stringify(byId['triangle.A-S-K'].relations) && JSON.stringify(P.matrix(asm)) === JSON.stringify(P.matrix(byId['triangle.A-S-K']))
    && JSON.stringify(P.signatures(asm)) === JSON.stringify(P.signatures(byId['triangle.A-S-K'])) && P.symmetry(asm).order === 3);
  check('P8 L-E-J: L at the top, then E and J clockwise; every pair a neutral interface; threefold',
    lej.nodes.map((n) => n.label).join('') === 'LEJ' && lej.relations.every((r) => r.type === 'neutral') && shape(lej) === '0020 0020 0020' && P.symmetry(lej).order === 3, shape(lej));
  check('P9 the six neutral specs stay neutral: no semantic declaration, no node assignment',
    SPECS.filter((x) => !x.semantic).length === 6 && SPECS.filter((x) => !x.semantic).every((x) => x.nodes.every((n) => Object.keys(n).join() === 'id,label')));
}

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
/* the systems' stylesheets in load order, from this repository's root, as a run here passes them */
const SEMANTIC_SHEETS = ['surface-treatments.css', 'spectral-state.css', 'criterion-assessment.css', 'three-functions.css'];
const SEMANTIC_ARGS = SEMANTIC_SHEETS.flatMap((f) => ['--semantic-css', path.join(ROOT, f)]);
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
      [path.join(DIR, 'export-peer.mjs'), '--out', out, '--tokens', path.join(ROOT, 'colors_and_type.css'), ...SEMANTIC_ARGS], { encoding: 'utf8' })));
    const names = fs.readdirSync(outs[0]).sort();
    const kinds = (s) => (s.semantic ? ['keyed'] : ['plate', 'keyed']);
    check('F7 the exporter writes every neutral spec as plate and keyed, and every declared semantic example keyed only, light and dark',
      names.length === SPECS.reduce((n, s) => n + 2 * kinds(s).length, 0)
      && SPECS.every((s) => kinds(s).every((k) => ['light', 'dark'].every((t) => names.includes(`${s.id}_${k}-${t}.svg`))))
      && !names.some((n) => /\.(assessment|functions)_plate-/.test(n)));
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
/* The assessment example: each letter's expected points against the declared opponent mixture, from its
   relations, and the rating its declared rule gives that figure. Example content, not the contract. */
const assessmentHolds = (spec) => {
  const M = P.matrix(spec), mix = [F(1n, 2n), F(1n, 4n), F(1n, 4n)], pts = payoffVs(M, mix);
  const word = (p) => (p[0] > 0n ? 'favorable' : p[0] < 0n ? 'adverse' : 'caution');
  const shown = (p) => (p[0] === 0n ? '0' : `${p[0] > 0n ? '+' : '-'}${(Math.abs(Number(p[0])) / Number(p[1])).toFixed(2)}`);
  const got = spec.nodes.map((n, i) => `${n.label} ${pts[i][0]}/${pts[i][1]} ${n.assessment === word(pts[i]) && n.figure.join() === shown(pts[i])}`);
  return { ok: got.every((g) => g.endsWith('true')), got: got.join(' · ') };
};
{
  const a = assessmentHolds(byId['triangle.A-S-K.assessment']);
  check('E7 the assessment example: against A 1/2, S 1/4, K 1/4, A scores 0 (caution), S -1/4 (adverse) and K +1/4 (favorable), its figures and ratings as declared',
    a.ok && a.got === 'A 0/1 true · S -1/4 true · K 1/4 true', a.got);
  const mixLine = byId['triangle.A-S-K.assessment'].semantic.basis.join(' ');
  check('E7 its basis declares that mixture, and its rule the thresholds the ratings follow', /A 50%, S 25%, K 25%/.test(mixLine)
    && byId['triangle.A-S-K.assessment'].semantic.rule.join(' ') === 'above 0 favorable; 0 caution; below 0 adverse');
}

// ------------------------------------------------------------------ N node rings

const RING = P.GEOMETRY.ring;
const num = (s) => s.match(/-?[\d.]+/g).map(Number);
/* each ring's center, by node id */
const ringsOf = (svg) => [...svg.matchAll(/<circle class="peer-ring" data-node="([^"]+)" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"(?: data-(?:assessment|function)="[a-z]+")?\/>/g)]
  .map((m) => ({ id: m[1], x: +m[2], y: +m[3], r: +m[4] }));
/* a neutral dash fit's distance from "an even number of whole periods plus one dash" */
const fitMiss = (len, d, g) => Math.abs(2 * Math.round((len - d) / (2 * (d + g))) * (d + g) + d - len);
/* how far each connector end sits from the vertex it leaves or reaches, and each neutral dash fit */
function connectorEnds(engine, spec, options = {}) {
  const svg = engine.render(spec, { glyphs: G, keyed: true, ...options });
  const at = Object.fromEntries(ringsOf(svg).map((c) => [c.id, c]));
  const dist = (p, id) => Math.hypot(p[0] - at[id].x, p[1] - at[id].y);
  const ends = [], fits = [];
  for (const m of svg.matchAll(/<path class="peer-neutral" data-relation="neutral" data-from="([^"]+)" data-to="([^"]+)" stroke-dasharray="([\d.]+) ([\d.]+)" stroke-dashoffset="([\d.]+)" d="([^"]+)"\/>/g)) {
    const [x1, y1, x2, y2] = num(m[6]), len = Math.hypot(x2 - x1, y2 - y1);
    ends.push(dist([x1, y1], m[1]), dist([x2, y2], m[2]));
    fits.push({ what: 'plate', len, offset: +m[5], miss: fitMiss(len, +m[3], +m[4]) });
  }
  for (const m of svg.matchAll(/<path class="peer-neutral" stroke-dasharray="([\d.]+) ([\d.]+)" stroke-dashoffset="([\d.]+)" d="([^"]+)"\/>/g)) {
    const [x1, , x2] = num(m[4]);
    fits.push({ what: 'key', len: x2 - x1, offset: +m[3], miss: fitMiss(x2 - x1, +m[1], +m[2]) });
  }
  for (const m of svg.matchAll(/<g data-relation="directed" data-from="([^"]+)" data-to="([^"]+)"><path class="peer-edge" d="([^"]+)"\/><path class="peer-head" d="([^"]+)"\/><\/g>/g)) {
    const [x1, y1, x2, y2] = num(m[3]), tip = num(m[4]).slice(0, 2);
    ends.push(dist([x1, y1], m[1]));
    // target heads: the tip reaches the gap; midpoint heads: the stroke itself runs to the gap
    ends.push(options.arrowheads === 'midpoint' ? dist([x2, y2], m[2]) : dist(tip, m[2]));
  }
  return { svg, ends, fits };
}
/* N1: one ring per node, all of the ring radius, each centered on its letter's vertex */
function ringsCentered(svg, spec, radius = RING.radius) {
  const rings = ringsOf(svg);
  const letters = [...svg.matchAll(/<text class="peer-glyph" data-node="([^"]+)" x="([\d.]+)" y="([\d.]+)"(?: data-(?:assessment|function)="[a-z]+")?>(.)<\/text>/g)];
  return rings.length === spec.nodes.length && letters.length === spec.nodes.length && rings.every((c) => c.r === radius) && letters.every((t) => {
    const c = rings.find((q) => q.id === t[1]), gm = G.labels.em[t[4]];
    return c && Math.abs(c.x - (+t[2] - gm.dx * P.GEOMETRY.fontSize)) < 0.02 && Math.abs(c.y - (+t[3] - gm.dy * P.GEOMETRY.fontSize)) < 0.02;
  });
}
/* N2: a keyed plate has its key, and the key holds no ring */
const keyRingless = (svg) => { const k = svg.indexOf('<g class="peer-key-group">'); return k !== -1 && !svg.slice(k).includes('peer-ring'); };
/* N3: room inside the ring around each supported label's ink */
const roomFor = (glyphs) => [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'].map((c) => [c, RING.radius - RING.stroke / 2 - glyphs.labels.em[c].r * P.GEOMETRY.fontSize]);
/* every neutral length class the plates draw: triangle sides, square sides and square diagonals */
const NEUTRAL = [
  tri(['a', 'b', 'c'], ['A', 'B', 'C'], [{ from: 'a', to: 'b', type: 'neutral' }, { from: 'b', to: 'c', type: 'neutral' }, { from: 'c', to: 'a', type: 'neutral' }]),
  { id: 'q', preset: 'square', nodes: ['a', 'b', 'c', 'd'].map((id, i) => ({ id, label: 'ABCD'[i] })),
    relations: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a'], ['a', 'c'], ['b', 'd']].map(([from, to]) => ({ from, to, type: 'neutral' })) },
];
{
  const plates = SPECS.map((s) => ({ s, svg: P.render(s, { glyphs: G, keyed: true }) }));
  check('N1 every plate draws one ring per node, all of the ring radius, each centered on its vertex', plates.every(({ s, svg }) => ringsCentered(svg, s)));
  check('N2 every keyed plate has its key, and the key draws no ring', plates.every(({ svg }) => keyRingless(svg)));
  const roomy = roomFor(G), tightest = roomy.reduce((a, b) => (b[1] < a[1] ? b : a));
  check('N3 every supported label leaves at least the ring padding clear inside its ring', roomy.length === 36 && roomy.every(([, room]) => room >= RING.padding),
    `tightest ${tightest[0]} ${tightest[1].toFixed(1)} of ${RING.padding}`);
  check('N4 the clearance is the ring outer edge plus the gap', P.GEOMETRY.clearance === RING.radius + RING.stroke / 2 + RING.gap);
  const want = P.GEOMETRY.clearance;
  const runs = [['target', {}], ['midpoint', { arrowheads: 'midpoint' }]].flatMap(([mode, o]) => [...SPECS, ...NEUTRAL].map((s) => ({ mode, s, ...connectorEnds(P, s, o) })));
  const worst = Math.max(...runs.flatMap((r) => r.ends.map((e) => Math.abs(e - want))));
  check('N5 every connector end, directed and neutral, in both arrowhead modes, sits the gap outside its ring', runs.every((r) => r.ends.length) && worst < 0.02, `worst ${worst.toFixed(3)}`);
  const fits = runs.flatMap((r) => r.fits), lens = new Set(fits.filter((x) => x.what === 'plate').map((x) => x.len.toFixed(1)));
  check('N6 every neutral line, of each length the plates draw, and the key sample begin and end on dash ink: an even number of whole periods plus one dash, unshifted',
    lens.size === 3 && fits.some((x) => x.what === 'key') && fits.every((x) => x.offset === 0 && x.miss < 0.01),
    `${fits.length} lines, lengths ${[...lens].join(' / ')} + key, worst miss ${Math.max(...fits.map((x) => x.miss)).toFixed(4)}`);
  const base = byId['triangle.A-S-K'];
  check('N7 a carrier whose letter lacks a finite, non-negative ink radius is GLYPHS_MALFORMED',
    [bent((g) => { delete g.labels.em.Z.r; }), bent((g) => { g.labels.em.A.r = -0.1; }), bent((g) => { g.labels.em.K.r = NaN; })]
      .every((g) => codes(P, base, g).includes('GLYPHS_MALFORMED') && renderError(P, base, { glyphs: g }) === 'GLYPHS_MALFORMED'));
  const crowd = bent((g) => { g.labels.em.S.r = (RING.radius - RING.stroke / 2 - RING.padding) / P.GEOMETRY.fontSize + 0.001; });
  check('N8 a label whose ink would crowd its ring is LABEL_RING_FIT; one exactly at the padding is not',
    codes(P, base, crowd).includes('LABEL_RING_FIT')
    && !codes(P, base, bent((g) => { g.labels.em.S.r = (RING.radius - RING.stroke / 2 - RING.padding) / P.GEOMETRY.fontSize; })).includes('LABEL_RING_FIT'));
}


// ------------------------------------------------------------------ S declared semantic examples

const ASM = byId['triangle.A-S-K.assessment'], LEJ = byId['triangle.L-E-J.functions'];
const GM = P.GEOMETRY, X0 = (GM.size - 2 * GM.radius) / 2, TEXT_MAX = GM.bandRight - X0 - GM.bandLabelWidth;
const adv = (t, size) => [...t].reduce((w, c) => w + G.advances.em[c], 0) * size;
const RESOLVED = { name: 'light', fieldFrom: '#D4C6E1', fieldTo: '#E2D3F0', ink: '#6A637F', fontFamily: 'Inter', labelWeight: 200, keyWeight: 400 };
/* the approved inks (ASK, 2026-11-25) as their exact recipes, written here and never read from the owner: the
   ink on green, yellow, orange and white is #6A637F's hue and saturation at a selected lightness, on red, violet
   and magenta the lavender's, and on cyan #6A637F itself; each is the same in both themes */
const INK = { green: 'hsl(255.0000 12.3894% 54.6289%)', yellow: 'hsl(255.0000 12.3894% 51.0988%)', red: 'hsl(271.1111 31.0345% 88.0838%)',
  magenta: 'hsl(271.1111 31.0345% 91.9618%)', white: 'hsl(255.0000 12.3894% 53.9877%)', cyan: '#6A637F', lavender: '#6A637F' };
const ROLES = {
  'criterion-assessment': { favorable: { fill: '#38FA38', ink: INK.green }, caution: { fill: '#FAFA38', ink: INK.yellow }, adverse: { fill: '#FA3838', ink: INK.red } },
  'three-functions': { legislative: { fill: '#FF00FF', ink: INK.magenta }, executive: { fill: '#FFFFFF', ink: INK.white }, judicial: { fill: '#00BEFF', ink: INK.cyan } },
};
/* each role's approved physical fill and ink, for each theme: the same in both but the executive's, white and its
   ink in light, the lavender and #6A637F in dark */
const APPROVED = {
  'criterion-assessment': { light: ROLES['criterion-assessment'], dark: ROLES['criterion-assessment'] },
  'three-functions': { light: ROLES['three-functions'], dark: { ...ROLES['three-functions'], executive: { fill: '#D4C6E1', ink: INK.lavender } } },
};
/* a color as #RRGGBB: a hex value as written, an hsl() in either syntax converted and rounded to 8 bits */
const hex = (v) => {
  const t = String(v).trim();
  if (/^#[0-9a-f]{6}$/i.test(t)) return t.toUpperCase();
  const m = t.match(/^hsl\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/i);
  if (!m) return 'NOT A COLOR ' + t;
  const h = +m[1] / 360, sat = +m[2] / 100, l = +m[3] / 100, q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, p0 = 2 * l - q;
  const ch = (x) => { x = (x + 1) % 1; const c = x < 1 / 6 ? p0 + (q - p0) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p0 + (q - p0) * (2 / 3 - x) * 6 : p0;
    return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return ('#' + ch(h + 1 / 3) + ch(h) + ch(h - 1 / 3)).toUpperCase();
};
/* each resolved role that is not its approved value: its fill as a color, its ink as the exact recipe */
const offApproved = (roles, system, theme) => Object.entries(APPROVED[system][theme]).filter(([r, w]) => !roles[r] || hex(roles[r].fill) !== w.fill || roles[r].ink !== w.ink)
  .map(([r]) => `${system} ${theme} ${r} ${roles[r] ? roles[r].fill + ' / ' + roles[r].ink : 'missing'}`);
/* the colored roles a file's rules draw: each ring's fill and boundary, and each letter's ink, as written */
const paintIn = (svg, attr) => {
  const out = {};
  for (const m of svg.matchAll(new RegExp(`\\.peer-ring\\[data-${attr}="([a-z]+)"\\]\\{fill:([^;}]+);stroke:([^;}]+)\\}`, 'g'))) out[m[1]] = { ...out[m[1]], fill: m[2], stroke: m[3] };
  for (const m of svg.matchAll(new RegExp(`\\.peer-glyph\\[data-${attr}="([a-z]+)"\\]\\{fill:([^;}]+)\\}`, 'g'))) out[m[1]] = { ...out[m[1]], ink: m[2] };
  return out;
};
/* each colored role a file draws that is not its approved value: a ring and its boundary the role's color, its letter
   the exact approved recipe */
const fileOff = (svg, attr, system, theme) => { const got = paintIn(svg, attr);
  return Object.entries(APPROVED[system][theme]).filter(([r, w]) => !got[r] || hex(got[r].fill) !== w.fill || got[r].stroke !== got[r].fill || got[r].ink !== w.ink)
    .map(([r]) => `${theme} ${r} ${JSON.stringify(got[r] || null)}`); };
/* a copy of the assessment example with one change */
const asm = (change) => { const x = clone(ASM); change(x); return x; };
const lej = (change) => { const x = clone(LEJ); change(x); return x; };
const texts = (svg, cls) => [...svg.matchAll(new RegExp(`<text class="${cls}"(?: data-node="([^"]+)")? x="([\\d.]+)" y="([\\d.]+)">([^<]*)</text>`, 'g'))]
  .map((m) => ({ node: m[1], x: +m[2], y: +m[3], text: m[4].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') }));
const styleOf = (svg) => svg.match(/<style>([\s\S]*?)<\/style>/)[1];
{
  for (const [name, spec, code] of [
    ['semantic not an object', asm((x) => { x.semantic = 'criterion-assessment'; }), 'SEMANTIC_NOT_OBJECT'],
    ['an unknown system', asm((x) => { x.semantic.system = 'spectral-state'; }), 'SEMANTIC_SYSTEM'],
    ['an inherited system name', asm((x) => { x.semantic.system = 'constructor'; }), 'SEMANTIC_SYSTEM'],
    ['an unknown declaration', asm((x) => { x.semantic.thresholds = ['0']; }), 'SEMANTIC_KEY'],
    ['the other system\'s declaration shape', lej((x) => { x.semantic.rule = ['x']; }), 'SEMANTIC_KEY'],
    ['a missing declaration', asm((x) => { delete x.semantic.direction; }), 'SEMANTIC_DECLARATION'],
    ['a declaration given as a string', asm((x) => { x.semantic.rule = 'above 0 favorable'; }), 'SEMANTIC_TEXT'],
    ['an empty declaration', asm((x) => { x.semantic.scope = []; }), 'SEMANTIC_TEXT'],
    ['a blank line', asm((x) => { x.semantic.scope = ['A, S and K', '   ']; }), 'SEMANTIC_TEXT'],
    ['a line outside printable Basic Latin', asm((x) => { x.semantic.direction = ['higher is better ↑']; }), 'SEMANTIC_TEXT'],
    ['a hole in a declaration', asm((x) => { x.semantic.basis = ['a', , 'c']; }), 'SEMANTIC_TEXT'],
    ['a line too wide for the band', asm((x) => { x.semantic.direction = ['higher is better, as every reader of this plate knows']; }), 'SEMANTIC_TEXT_WIDTH'],
    ['more lines than a band holds', asm((x) => { x.semantic.basis = Array.from({ length: 13 }, (_, i) => `line ${i}`); }), 'SEMANTIC_BAND'],
    ['a node with no assessment', asm((x) => { delete x.nodes[1].assessment; }), 'NODE_ASSIGNMENT'],
    ['an unknown assessment', asm((x) => { x.nodes[1].assessment = 'neutral'; }), 'NODE_ASSIGNMENT'],
    ['an inherited assessment name', asm((x) => { x.nodes[1].assessment = 'toString'; }), 'NODE_ASSIGNMENT'],
    ['a function on an assessment example', asm((x) => { x.nodes[0].function = 'judicial'; }), 'NODE_KEY'],
    ['an assessment on a neutral spec', { ...clone(byId['triangle.A-S-K']), nodes: byId['triangle.A-S-K'].nodes.map((n) => ({ ...n, assessment: 'caution' })) }, 'NODE_KEY'],
    ['a figure given as a string', asm((x) => { x.nodes[2].figure = '+0.25'; }), 'NODE_TEXT'],
    ['a figure of three lines', asm((x) => { x.nodes[2].figure = ['+0.25', 'points', 'per round']; }), 'NODE_TEXT'],
    ['a figure too wide for its note', asm((x) => { x.nodes[2].figure = ['+0.25 points per round, on average']; }), 'NODE_TEXT_WIDTH'],
    ['a role-bearing node with no does', lej((x) => { delete x.nodes[1].does; }), 'NODE_TEXT'],
    ['a node of no function that gives a does', lej((x) => { x.nodes[1].function = 'none'; }), 'NODE_TEXT'],
    ['an unknown function', lej((x) => { x.nodes[0].function = 'authorial'; }), 'NODE_ASSIGNMENT'],
    ['a does too wide for the band', lej((x) => { x.nodes[0].does = ['authorizes the brief, and signs every contract for it']; }), 'NODE_TEXT_WIDTH'],
  ]) check(`S1 ${name} is ${code}`, rejects(P, spec, code), codes(P, spec).join(','));
  // A semantic declaration the spec inherits is not its own: validate and render both read the plate as neutral.
  const inherited = Object.assign(Object.create({ semantic: clone(ASM.semantic) }), clone(byId['triangle.A-S-K']));
  let inheritedSvg = ''; try { inheritedSvg = svgOf(inherited); } catch (e) { inheritedSvg = 'THREW ' + e.message; }
  check('S1 an inherited semantic declaration is not the spec\'s: it validates as neutral and renders the neutral plate',
    P.validate(inherited, G).ok && inheritedSvg === svgOf(byId['triangle.A-S-K']), inheritedSvg.slice(0, 80));
  check('S1 an unassessed node may give a figure, and an unassessed one without a figure is fine too',
    P.validate(asm((x) => { x.nodes[2].assessment = 'unassessed'; }), G).ok && P.validate(asm((x) => { x.nodes[2].assessment = 'unassessed'; delete x.nodes[2].figure; }), G).ok);
  check('S1 a node of no function, with no does, is fine', P.validate(lej((x) => { x.nodes[1].function = 'none'; delete x.nodes[1].does; }), G).ok);
  check('S1 validate never throws on a malformed semantic spec', [asm((x) => { x.semantic = null; }), asm((x) => { x.semantic.criterion = [null]; }), asm((x) => { x.nodes[0].figure = [{}]; })]
    .every((x) => { try { return P.validate(x, G).ok === false; } catch (e) { return false; } }));

  // The plate a neutral spec draws and the one an example draws share relations, rings and letters.
  const strip = (svg) => svg.replace(/ data-(assessment|function)="[a-z]+"/g, '');
  const tagsOf = (svg, re) => [...strip(svg).matchAll(re)].map((m) => m[0]).join('');
  const nPlate = svgOf(byId['triangle.A-S-K'], { keyed: true }), aPlate = svgOf(ASM);
  check('S2 the assessment example draws the A-S-K plate\'s connectors, heads, key sample, rings and letters exactly where the neutral plate does',
    geometry(nPlate) === geometry(aPlate) && tagsOf(nPlate, /<circle [^>]*\/>/g) === tagsOf(aPlate, /<circle [^>]*\/>/g)
    && tagsOf(nPlate, /<text class="peer-glyph"[^>]*>/g) === tagsOf(aPlate, /<text class="peer-glyph"[^>]*>/g));
  check('S2 L-E-J draws a triangle template\'s rings and letters', ringsCentered(svgOf(LEJ), LEJ) && ringsCentered(aPlate, ASM));

  // Paint: tokens on a page, resolved roles in a file; one rule per colored role the plate carries.
  const css = styleOf(aPlate), lcss = styleOf(svgOf(LEJ));
  const paints = (c, a, r, t) => c.includes(`.peer-ring[data-${a}="${r}"]{fill:var(--${t}-${r});stroke:var(--${t}-${r})}`) && c.includes(`.peer-glyph[data-${a}="${r}"]{fill:var(--${t}-${r}-ink)}`);
  check('S3 on a page each colored node fills its ring and its boundary with its role\'s token, and its letter takes the role\'s ink token',
    ['favorable', 'caution', 'adverse'].every((r) => paints(css, 'assessment', r, 'assessment')) && ['legislative', 'executive', 'judicial'].every((r) => paints(lcss, 'function', r, 'function')));
  const vars = (svg) => [...new Set([...svg.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((x) => x[1]))].sort().join(',');
  check('S3 a page example takes the foundation roles and its own system\'s role and ink tokens, and no other',
    vars(aPlate) === '--assessment-adverse,--assessment-adverse-ink,--assessment-caution,--assessment-caution-ink,--assessment-favorable,--assessment-favorable-ink,--bg-from,--bg-to,--fg-1,--font-sans,--fw-extralight,--fw-regular'
    && vars(svgOf(LEJ)) === '--bg-from,--bg-to,--fg-1,--font-sans,--function-executive,--function-executive-ink,--function-judicial,--function-judicial-ink,--function-legislative,--function-legislative-ink,--fw-extralight,--fw-regular', vars(svgOf(LEJ)));
  const fixedA = svgOf(ASM, { theme: { ...RESOLVED, roles: ROLES['criterion-assessment'] } }), fixedL = svgOf(LEJ, { theme: { ...RESOLVED, roles: ROLES['three-functions'] } });
  check('S4 a standalone example carries its resolved roles and no var()', !/var\(/.test(fixedA) && !/var\(/.test(fixedL)
    && styleOf(fixedA).includes('.peer-ring[data-assessment="adverse"]{fill:#FA3838;stroke:#FA3838}') && styleOf(fixedA).includes(`.peer-glyph[data-assessment="adverse"]{fill:${INK.red}}`) && styleOf(fixedA).includes('.peer-glyph[data-assessment="caution"]{fill:hsl(255.0000 12.3894% 51.0988%)}')
    && styleOf(fixedL).includes('.peer-ring[data-function="executive"]{fill:#FFFFFF;stroke:#FFFFFF}'));
  const neutralPlates = SPECS.filter((x) => !x.semantic).flatMap((x) => [svgOf(x), svgOf(x, { keyed: true }), svgOf(x, { theme: RESOLVED })]);
  check('S4 a neutral plate draws no assignment, fill rule, note or band, and refuses roles in its theme',
    neutralPlates.every((v) => !/data-(assessment|function)=|peer-note|peer-band|\[data-/.test(v)) && neutralPlates.every((v) => /viewBox="0 0 1000 1(000|150)"/.test(v))
    && SPECS.filter((x) => !x.semantic).every((x) => renderError(P, x, { glyphs: G, theme: { ...RESOLVED, roles: ROLES['criterion-assessment'] } }) === 'OPTION_THEME'));

  // Keyed only.
  check('S5 an example is drawn keyed by default, and an explicit art plate is OPTION_KEYED',
    /data-keyed="true"/.test(svgOf(ASM)) && svgOf(ASM) === svgOf(ASM, { keyed: true }) && renderError(P, ASM, { glyphs: G, keyed: false }) === 'OPTION_KEYED'
    && renderError(P, LEJ, { glyphs: G, keyed: false }) === 'OPTION_KEYED');
  for (const [name, theme] of [
    ['a resolved theme with no roles', RESOLVED],
    ['a resolved theme missing one role', { ...RESOLVED, roles: { favorable: ROLES['criterion-assessment'].favorable, caution: ROLES['criterion-assessment'].caution } }],
    ['the other system\'s roles', { ...RESOLVED, roles: ROLES['three-functions'] }],
    ['an unknown role', { ...RESOLVED, roles: { ...ROLES['criterion-assessment'], earned: { fill: '#000', ink: '#fff' } } }],
    ['a role value with markup', { ...RESOLVED, roles: { ...ROLES['criterion-assessment'], caution: { fill: '#FAFA38"/><script>', ink: '#6A637F' } } }],
    ['a role with a third field', { ...RESOLVED, roles: { ...ROLES['criterion-assessment'], caution: { fill: '#FAFA38', ink: '#6A637F', edge: '#000' } } }],
    ['its own roles beside the other system\'s', { ...RESOLVED, roles: { ...ROLES['criterion-assessment'], ...ROLES['three-functions'] } }],
    ['a role value with a quote, which would open a CSS string', { ...RESOLVED, roles: { ...ROLES['criterion-assessment'], caution: { fill: '#FAFA38', ink: "#6A637F'" } } }],
  ]) check(`S6 ${name} is OPTION_THEME`, renderError(P, ASM, { glyphs: G, theme }) === 'OPTION_THEME', String(renderError(P, ASM, { glyphs: G, theme })));

  // Notes: the figure and the word beside a colored node, the figure alone beside an unassessed one.
  const notes = (svg) => texts(svg, 'peer-note');
  const byNode = (svg) => notes(svg).reduce((m, t) => { (m[t.node] = m[t.node] || []).push(t.text); return m; }, {});
  check('S7 each assessed node shows its figure, then its word, in the plate\'s ink', JSON.stringify(byNode(aPlate)) === '{"a":["0","caution"],"s":["-0.25","adverse"],"k":["+0.25","favorable"]}'
    && css.includes('.peer-note{fill:var(--fg-1);'), JSON.stringify(byNode(aPlate)));
  check('S7 each role-bearing node shows its function\'s name', JSON.stringify(byNode(svgOf(LEJ))) === '{"l":["legislative"],"e":["executive"],"j":["judicial"]}');
  const un = asm((x) => { x.nodes[2].assessment = 'unassessed'; }), unPlate = svgOf(un), unRings = ringsOf(unPlate);
  check('S8 an unassessed node keeps the neutral ring, no fill rule names it, and its known figure stays as plain text with no assessment word',
    /data-node="k"[^>]*data-assessment="unassessed"\/>/.test(unPlate) && !/\[data-assessment="unassessed"\]/.test(unPlate) && !/\[data-assessment="favorable"\]/.test(unPlate)
    && JSON.stringify(byNode(unPlate).k) === '["+0.25"]' && unRings.length === 3 && /K: unassessed, figure \+0\.25/.test(P.describe(un)), JSON.stringify(byNode(unPlate).k));
  const noneNode = lej((x) => { x.nodes[1].function = 'none'; delete x.nodes[1].does; }), nonePlate = svgOf(noneNode);
  check('S8 a node of no function keeps the neutral ring and shows nothing beside it or in the band',
    !byNode(nonePlate).e && !/\[data-function="executive"\]/.test(nonePlate) && !texts(nonePlate, 'peer-band').some((t) => /^E /.test(t.text)));

  // Fit: every note and band line in its slot, inside the plate and clear of every ring.
  const fits = (spec) => {
    const svg = svgOf(spec), H = +svg.match(/viewBox="0 0 1000 (\d+)"/)[1], rings = ringsOf(svg), bad = [];
    if (!notes(svg).length || !texts(svg, 'peer-band').length) bad.push('no notes or band lines found');
    const cap = 2 * GM.keyCapCenter, rim = GM.ring.radius + GM.ring.stroke / 2;
    for (const t of notes(svg)) {
      const w = adv(t.text, GM.noteFontSize), top = t.y - cap * GM.noteFontSize, foot = t.y + 0.24 * GM.noteFontSize;
      if (t.x - w / 2 < 0 || t.x + w / 2 > GM.size || top < 0 || foot > GM.size || w > GM.noteTextMax) bad.push(`note ${t.text}`);
      for (const c of rings) if (Math.abs(t.x - c.x) < w / 2 + rim && top < c.y + rim && foot > c.y - rim) bad.push(`note ${t.text} meets ring ${c.id}`);
    }
    for (const t of texts(svg, 'peer-band')) {
      const w = adv(t.text, GM.bandFontSize), label = Math.abs(t.x - X0) < 0.01;
      if (t.y <= GM.size + GM.keyBaseline || t.y + 0.24 * GM.bandFontSize > H || t.x + w > GM.bandRight || (!label && w > TEXT_MAX)) bad.push(`band ${t.text}`);
    }
    return bad;
  };
  const maxed = asm((x) => { x.nodes.forEach((n) => { n.figure = ['-0.25', '+0.25']; }); x.semantic.basis = Array.from({ length: 8 }, (_, i) => `line ${i}`); });
  const square = { id: 'q.assessed', preset: 'square', nodes: ['a', 'b', 'c', 'd'].map((id, i) => ({ id, label: 'WMQG'[i], assessment: ['favorable', 'caution', 'adverse', 'unassessed'][i], figure: ['-0.25', '+0.25'] })),
    relations: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a'], ['a', 'c'], ['b', 'd']].map(([from, to]) => ({ from, to, type: 'neutral' })), semantic: clone(ASM.semantic) };
  const fitted = [ASM, LEJ, un, noneNode, maxed, square].map((x) => [x.id + (x === maxed ? ' (most lines)' : ''), fits(x)]);
  check('S9 every note and band line sits in its slot, inside the plate and clear of every ring: both examples, the unassessed and no-function controls, an example at its most lines and a square',
    P.validate(maxed, G).ok && P.validate(square, G).ok && fitted.every(([, b]) => b.length === 0), JSON.stringify(fitted.filter(([, b]) => b.length)));
  const roomiest = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'].flatMap((c) => ['legislative', 'executive', 'judicial'].map((fn) => adv(`${c} ${fn}`, GM.bandFontSize)));
  check('S9 every letter beside every function\'s name fits the band\'s label column, with room before the text', Math.max(...roomiest) <= GM.bandLabelWidth - 16, Math.max(...roomiest).toFixed(1));
  const h = (spec) => +svgOf(spec).match(/viewBox="0 0 1000 (\d+)"/)[1];
  const rowsOf = (spec) => spec.semantic.system === 'criterion-assessment' ? P.SEMANTIC['criterion-assessment'].declarations.length : 1 + spec.nodes.filter((n) => n.function !== 'none').length;
  const linesOf = (spec) => Object.entries(spec.semantic).filter(([k]) => k !== 'system').reduce((t, [, v]) => t + v.length, 0) + spec.nodes.reduce((t, n) => t + (n.does ? n.does.length : 0), 0);
  const expect = (spec) => GM.size + GM.keyBaseline + GM.bandFirst + GM.bandLeading + GM.bandHeadGap + (linesOf(spec) - 1) * GM.bandLeading + (rowsOf(spec) - 1) * GM.bandRowGap + GM.bandFoot;
  check('S9 the plate grows by its band and no more', h(ASM) === expect(ASM) && h(LEJ) === expect(LEJ), `${h(ASM)} ${expect(ASM)} ${h(LEJ)} ${expect(LEJ)}`);
  // The band as drawn: its last baseline sits the band's foot above the plate's foot.
  const footGap = (engine, spec) => { const svg = engine.render(spec, { glyphs: G }), ys = texts(svg, 'peer-band').map((t) => t.y);
    return ys.length ? +svg.match(/viewBox="0 0 1000 (\d+)"/)[1] - Math.max(...ys) : NaN; };
  check('S9 each band\'s last drawn baseline sits the band\'s foot above the plate\'s foot, at its most lines too',
    [ASM, LEJ, maxed].every((x) => footGap(P, x) === GM.bandFoot), [ASM, LEJ, maxed].map((x) => footGap(P, x)).join(' '));

  // Description and determinism.
  check('S10 the description adds every assignment and declaration', /Criterion Assessment\. A: caution, figure 0; S: adverse, figure -0\.25; K: favorable, figure \+0\.25\. Criterion: /.test(P.describe(ASM))
    && /Rule: above 0 favorable; 0 caution; below 0 adverse\.$/.test(P.describe(ASM)) && /Three Functions\. L: legislative, adopts the design criteria and authorizes the brief; E: executive/.test(P.describe(LEJ)));
  check('S10 an example renders the same bytes twice, and carries exactly three ids', svgOf(ASM) === svgOf(ASM) && svgOf(LEJ) === svgOf(LEJ)
    && idsIn(svgOf(ASM, { idPrefix: 'peer-1' })).join() === 'peer-1,peer-1_title,peer-1_field');
  check('S10 every rule an example adds is scoped to its plate', styleOf(svgOf(ASM, { idPrefix: 'peer-1' })).split('}').filter(Boolean).every((r) => r.startsWith('#peer-1 ')));
}
{
  // The exporter: a declared semantic example's roles, from the systems' stylesheets.
  const { readRoles } = await import(pathToFileURL(path.join(DIR, 'export-peer.mjs')).href);
  const sheets = ['colors_and_type.css', ...SEMANTIC_SHEETS].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const ca = readRoles(sheets, P.SEMANTIC['criterion-assessment']), tf = readRoles(sheets, P.SEMANTIC['three-functions']);
  const tok = (f, n) => fs.readFileSync(path.join(ROOT, f), 'utf8').match(new RegExp(`${n}:\\s*([^;]+);`))[1].trim();
  const off = ['light', 'dark'].flatMap((t) => [...offApproved(ca[t], 'criterion-assessment', t), ...offApproved(tf[t], 'three-functions', t)]);
  check('S11 the exporter resolves each role to its approved value, light and dark: favorable green, caution yellow and adverse red, legislative magenta, executive white in light and the lavender in dark, and judicial cyan, each ink the exact approved recipe',
    off.length === 0 && ca.light.caution.fill === tok('colors_and_type.css', '--ask-state-value-yellow') && tf.light.executive.fill === tok('colors_and_type.css', '--ask-white'), off.join('; '));
  const named = ['colors_and_type.css', ...SEMANTIC_SHEETS];
  const caWithout = readRoles(sheets.filter((x, i) => named[i] !== 'spectral-state.css'), P.SEMANTIC['criterion-assessment']);
  check('S11 Criterion Assessment resolves through the fill paint and its own stylesheet only: its roles read no Spectral State declaration, and resolve the same without spectral-state.css',
    ca.used.map((i) => named[i]).join() === 'colors_and_type.css,surface-treatments.css,criterion-assessment.css'
    && tf.used.map((i) => named[i]).join() === 'colors_and_type.css,surface-treatments.css,three-functions.css'
    && JSON.stringify({ light: caWithout.light, dark: caWithout.dark }) === JSON.stringify({ light: ca.light, dark: ca.dark }), `${ca.used.map((i) => named[i])} | ${tf.used.map((i) => named[i])}`);
  let undeclared = false;
  try { readRoles(sheets.slice(0, 3), P.SEMANTIC['criterion-assessment']); } catch (e) { undeclared = /--assessment-favorable is not declared/.test(e.message); }
  check('S11 without its own stylesheet a system\'s roles fail, rather than guess', undeclared);
  const run = (args) => spawnSync(process.execPath, [path.join(DIR, 'export-peer.mjs'), ...args], { encoding: 'utf8', timeout: 60000 });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-export-'));
  try {
    const r1 = run(['--out', path.join(tmp, 'o1'), '--tokens', path.join(ROOT, 'colors_and_type.css'), '--spec', 'triangle.A-S-K.assessment']);
    check('S12 with no stylesheet beside it or named, an example writes nothing and names the file it needs',
      r1.status === 1 && /nothing written; a Criterion Assessment example needs .*surface-treatments\.css/.test(r1.stderr) && !fs.existsSync(path.join(tmp, 'o1')), r1.stderr.trim());
    const r2 = run(['--out', path.join(tmp, 'o2'), '--tokens', path.join(ROOT, 'colors_and_type.css'), '--spec', 'triangle.L-E-J.functions', '--semantic-css', path.join(ROOT, 'surface-treatments.css')]);
    check('S12 with a stylesheet missing from the list, a role that does not resolve writes nothing', r2.status === 1 && /--function-legislative is not declared/.test(r2.stderr) && !fs.existsSync(path.join(tmp, 'o2')), r2.stderr.trim());
    const r3 = run(['--out', path.join(tmp, 'o3'), '--tokens', path.join(ROOT, 'colors_and_type.css'), '--spec', 'triangle.A-S-K.assessment', '--spec', 'triangle.L-E-J.functions', ...SEMANTIC_ARGS]);
    const files = r3.status === 0 ? fs.readdirSync(path.join(tmp, 'o3')).sort() : [];
    const read = (f) => (files.length ? fs.readFileSync(path.join(tmp, 'o3', f), 'utf8') : '');
    const one = read('triangle.L-E-J.functions_keyed-dark.svg'), two = read('triangle.A-S-K.assessment_keyed-light.svg');
    const report = r3.status === 0 ? JSON.parse(r3.stdout) : {};
    const pins = (svg, f) => svg.includes(`${f} (sha256 ${sha256(fs.readFileSync(path.join(ROOT, f)))})`);
    check('S12 the exporter writes each example keyed only, light and dark, with its resolved roles, its band and the sha256 of each stylesheet its roles resolved through, and no other',
      files.join() === 'triangle.A-S-K.assessment_keyed-dark.svg,triangle.A-S-K.assessment_keyed-light.svg,triangle.L-E-J.functions_keyed-dark.svg,triangle.L-E-J.functions_keyed-light.svg'
      && /\.peer-ring\[data-function="executive"\]\{fill:#D4C6E1;stroke:#D4C6E1\}/.test(one) && one.includes(`.peer-glyph[data-function="legislative"]{fill:${INK.magenta}}`)
      && pins(one, 'surface-treatments.css') && pins(one, 'three-functions.css') && !pins(one, 'spectral-state.css') && !pins(one, 'criterion-assessment.css')
      && pins(two, 'surface-treatments.css') && pins(two, 'criterion-assessment.css') && !pins(two, 'spectral-state.css') && !pins(two, 'three-functions.css')
      && one.includes('>Three Functions</text>') && one.includes('SIL OPEN FONT LICENSE Version 1.1') && !/var\(/.test(one)
      && report.semantic['three-functions'].roles.dark.executive.fill === '#D4C6E1', `${r3.status} ${files.join()}`);
    const fileOffs = files.flatMap((f) => { const [, sys, theme] = f.match(/\.(assessment|functions)_keyed-(light|dark)\.svg$/);
      return fileOff(read(f), sys === 'assessment' ? 'assessment' : 'function', sys === 'assessment' ? 'criterion-assessment' : 'three-functions', theme).map((x) => `${f}: ${x}`); });
    check('S12 each written example carries its roles\' approved values, light and dark: each ring and its boundary the role\'s color, and each letter\'s ink the exact approved recipe, spaces and all',
      files.length === 4 && fileOffs.length === 0 && !/hsl\([^)]*var\(/.test(files.map(read).join('')), fileOffs.join('; '));
    const broken = path.join(tmp, 'broken.css'); fs.writeFileSync(broken, fs.readFileSync(path.join(ROOT, 'three-functions.css'), 'utf8') + '\n.unclosed {');
    const r4 = run(['--out', path.join(tmp, 'o4'), '--tokens', path.join(ROOT, 'colors_and_type.css'), '--spec', 'triangle.L-E-J.functions',
      '--semantic-css', path.join(ROOT, 'surface-treatments.css'), '--semantic-css', broken]);
    check('S12 a malformed stylesheet writes nothing, and the error names that stylesheet', r4.status === 1 && /broken\.css leaves a block unclosed/.test(r4.stderr) && !fs.existsSync(path.join(tmp, 'o4')), r4.stderr.trim());
    // The default path, as a consumer runs it: the bundle beside its _dsa-tokens/ and _dsa-surface/ mirrors.
    const kit = path.join(tmp, 'kit');
    fs.mkdirSync(path.join(kit, '_dsa-tokens'), { recursive: true }); fs.mkdirSync(path.join(kit, '_dsa-surface'));
    for (const f of ['diagrams-static-peer-engine.js', 'diagrams-static-peer-glyphs.js', 'diagrams-static-peer-font.js', 'diagram-static-peer.source.js', 'export-peer.mjs']) fs.copyFileSync(path.join(DIR, f), path.join(kit, f));
    for (const f of ['colors_and_type.css', 'spectral-state.css', 'criterion-assessment.css', 'three-functions.css']) fs.copyFileSync(path.join(ROOT, f), path.join(kit, '_dsa-tokens', f));
    fs.copyFileSync(path.join(ROOT, 'surface-treatments.css'), path.join(kit, '_dsa-surface', 'surface-treatments.css'));
    const r5 = spawnSync(process.execPath, [path.join(kit, 'export-peer.mjs'), '--out', path.join(tmp, 'o5'), '--spec', 'triangle.A-S-K.assessment', '--spec', 'triangle.L-E-J.functions'], { encoding: 'utf8', timeout: 60000 });
    const same = r5.status === 0 && fs.readdirSync(path.join(tmp, 'o5')).every((f) => {
      const a = fs.readFileSync(path.join(tmp, 'o5', f), 'utf8'), b = fs.readFileSync(path.join(tmp, 'o3', f), 'utf8');
      const body = (x) => x.replace(/<metadata>[\s\S]*?<\/metadata>/, '');
      return body(a) === body(b);
    });
    check('S13 with no --semantic-css, the exporter reads each system\'s stylesheets from the mirrors beside it and draws what the owner\'s run draws',
      same && fs.readdirSync(path.join(tmp, 'o5')).length === 4, `${r5.status} ${r5.stderr.trim()}`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// ------------------------------------------------------------------ S one declaration rule, one set of role values

/* A source module whose specs are built in the module, as a source may build them: the specimen's specs by id,
   cloned, with a spec that only inherits a semantic declaration. */
const inheritedSource = (dir, ids) => {
  const file = path.join(dir, 'inherited.source.js');
  fs.writeFileSync(file, `const base = require(${JSON.stringify(path.join(DIR, 'diagram-static-peer.source.js'))});
const pick = (id) => JSON.parse(JSON.stringify(base.find((s) => s.id === id)));
const inherited = Object.assign(Object.create({ semantic: pick('triangle.A-S-K.assessment').semantic }), pick('triangle.A-S-K'));
module.exports = [inherited].concat(${JSON.stringify(ids)}.map(pick));
`);
  return file;
};
const exportWith = (exporter, args) => spawnSync(process.execPath, [exporter, '--tokens', path.join(ROOT, 'colors_and_type.css'), ...args], { encoding: 'utf8', timeout: 60000 });
const filesIn = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []);
const sameFiles = (a, b, names) => names.length > 0 && names.every((f) => fs.existsSync(path.join(b, f)) && fs.readFileSync(path.join(a, f)).equals(fs.readFileSync(path.join(b, f))));
const NEUTRAL_FOUR = ['triangle.A-S-K_keyed-dark.svg', 'triangle.A-S-K_keyed-light.svg', 'triangle.A-S-K_plate-dark.svg', 'triangle.A-S-K_plate-light.svg'];
{
  const exporter = path.join(DIR, 'export-peer.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-export-'));
  try {
    const src = inheritedSource(tmp, []), mixed = path.join(tmp, 'mixed'); fs.mkdirSync(mixed);
    const mixedSrc = inheritedSource(mixed, ['triangle.A-S-K.assessment']);
    const ordinary = exportWith(exporter, ['--out', path.join(tmp, 'ordinary'), '--spec', 'triangle.A-S-K']);
    const absent = path.join(tmp, 'absent.css');
    const r1 = exportWith(exporter, ['--out', path.join(tmp, 'o1'), '--source', src, '--semantic-css', absent]);
    check('S14 a spec that only inherits a semantic declaration exports the neutral plate\'s four files, byte for byte, and opens no stylesheet: a --semantic-css that does not exist is never read',
      ordinary.status === 0 && r1.status === 0 && filesIn(path.join(tmp, 'o1')).join() === NEUTRAL_FOUR.join() && sameFiles(path.join(tmp, 'o1'), path.join(tmp, 'ordinary'), NEUTRAL_FOUR)
      && JSON.stringify(JSON.parse(r1.stdout).semantic) === '{}', `${r1.status} ${r1.stderr.trim()}`);
    const r2 = exportWith(exporter, ['--out', path.join(tmp, 'o2'), '--source', src, ...SEMANTIC_ARGS]);
    check('S14 given the systems\' stylesheets, it still exports the neutral plate, with no roles',
      r2.status === 0 && filesIn(path.join(tmp, 'o2')).join() === NEUTRAL_FOUR.join() && sameFiles(path.join(tmp, 'o2'), path.join(tmp, 'ordinary'), NEUTRAL_FOUR), `${r2.status} ${r2.stderr.trim()}`);
    const declared = exportWith(exporter, ['--out', path.join(tmp, 'declared'), '--spec', 'triangle.A-S-K.assessment', ...SEMANTIC_ARGS]);
    const r3 = exportWith(exporter, ['--out', path.join(tmp, 'o3'), '--source', mixedSrc, ...SEMANTIC_ARGS]);
    const keyedOnly = ['triangle.A-S-K.assessment_keyed-dark.svg', 'triangle.A-S-K.assessment_keyed-light.svg'];
    check('S14 beside a declared example in one run, the inheriting spec exports neutral and the example keyed only, each as it exports alone',
      declared.status === 0 && r3.status === 0 && filesIn(path.join(tmp, 'o3')).join() === [...keyedOnly, ...NEUTRAL_FOUR].sort().join()
      && sameFiles(path.join(tmp, 'o3'), path.join(tmp, 'ordinary'), NEUTRAL_FOUR) && sameFiles(path.join(tmp, 'o3'), path.join(tmp, 'declared'), keyedOnly),
      `${r3.status} ${r3.stderr.trim()} ${filesIn(path.join(tmp, 'o3')).join()}`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
const CA = ROLES['criterion-assessment'];
const ownRoles = (roles) => ({ ...RESOLVED, roles });
const inheritedRoles = (roles) => Object.assign(Object.create({ roles }), RESOLVED);
/* the error code, or what was drawn: a plate, and whether a quote reached its rules */
const outcome = (engine, spec, theme) => {
  try { const svg = engine.render(spec, { glyphs: G, theme }); return 'rendered' + (/'/.test(styleOf(svg)) ? ', with a quote in its rules' : ''); }
  catch (e) { return e.code || 'THREW ' + e.message; }
};
const ROLE_PAIRS = [
  ['a role that is null', { ...CA, caution: null }],
  ['a fill carrying a quote', { ...CA, caution: { fill: "#FAFA38'", ink: '#6A637F' } }],
];
{
  const valid = svgOf(ASM, { theme: ownRoles(CA) });
  check('S15 a valid mapping of the theme\'s own draws the example with its resolved roles',
    styleOf(valid).includes('.peer-ring[data-assessment="caution"]{fill:#FAFA38;stroke:#FAFA38}') && !/var\(/.test(valid));
  for (const [name, roles] of ROLE_PAIRS) {
    check(`S15 ${name}, in the theme's own roles, is OPTION_THEME`, renderError(P, ASM, { glyphs: G, theme: ownRoles(roles) }) === 'OPTION_THEME', String(renderError(P, ASM, { glyphs: G, theme: ownRoles(roles) })));
    check(`S15 ${name}, in roles the theme inherits, is OPTION_THEME on an example: no raw error and no plate`, outcome(P, ASM, inheritedRoles(roles)) === 'OPTION_THEME', outcome(P, ASM, inheritedRoles(roles)));
  }
  check('S15 a valid mapping the theme only inherits is not its roles: the example is OPTION_THEME, as with none',
    outcome(P, ASM, inheritedRoles(CA)) === 'OPTION_THEME' && outcome(P, ASM, RESOLVED) === 'OPTION_THEME', outcome(P, ASM, inheritedRoles(CA)));
  check('S15 a neutral plate ignores roles its theme only inherits, and draws as with none',
    svgOf(byId['triangle.A-S-K'], { theme: inheritedRoles(CA) }) === svgOf(byId['triangle.A-S-K'], { theme: RESOLVED }));
  // A value read twice could differ between the check and the draw; the engine reads each once.
  let reads = 0;
  const fickle = { ...CA, caution: { ink: '#6A637F', get fill() { reads += 1; return reads === 1 ? '#FAFA38' : "#FAFA38'"; } } };
  let once = ''; try { once = svgOf(ASM, { theme: ownRoles(fickle) }); } catch (e) { once = 'THREW ' + (e.code || e.message); }
  check('S15 each role value is drawn as it was checked, read once', reads === 1 && !once.includes("#FAFA38'") && /\{fill:#FAFA38;stroke:#FAFA38\}/.test(once), `${reads} reads${once.startsWith('THREW') ? ', ' + once : ''}`);
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

{
  // N controls: each ring check fails for its intended reason on a mutated engine or carrier
  const A = byId['triangle.A-S-K'];
  const fixed = mutate('clearance: RING.radius + RING.stroke / 2 + RING.gap,', 'clearance: 104,');
  const ends = SPECS.flatMap((s) => connectorEnds(fixed, s).ends);
  check('X15 N5 bites: a clearance set apart from the ring leaves connector ends off the ring gap',
    Math.max(...ends.map((e) => Math.abs(e - P.GEOMETRY.clearance))) > 1);
  const oldFit = mutate("var k = Math.max(1, Math.round((len - dash[0]) / (2 * period)));\n    var scale = len / (2 * k * period + dash[0]);",
    'var k = Math.max(1, Math.round(len / period)) / 2;\n    var scale = len / (2 * k * period);');
  const fits = [...SPECS, ...NEUTRAL].flatMap((s) => connectorEnds(oldFit, s).fits);
  check('X16 N6 bites: whole periods alone end a neutral line in a gap or a partial dash', fits.some((x) => x.miss >= 0.01), `${fits.length} lines`);
  const noR = mutate('finite(em[k].dy) && finite(em[k].r) && em[k].r >= 0;', 'finite(em[k].dy);');
  check('X17 N7 bites: an engine that does not require the ink radius accepts a carrier without one',
    !codes(noR, A, bent((g) => { delete g.labels.em.Z.r; })).includes('GLYPHS_MALFORMED'));
  const ringTag = "out.push('<circle class=\"peer-ring\" data-node=\"' + esc(node.id) + '\" cx=\"' + f(pts[i].x) + '\" cy=\"' + f(pts[i].y) + '\" r=\"' + f(G.ring.radius) + '\"' + assigned + '/>');";
  const ringless = mutate(ringTag, '');
  const shifted = mutate(ringTag, ringTag.replace('f(pts[i].x)', 'f(pts[i].x + 3)'));
  check('X18 N1 bites: an engine that draws no ring, or draws one off its vertex, fails the ring check',
    !ringsCentered(ringless.render(A, { glyphs: G }), A) && !ringsCentered(shifted.render(A, { glyphs: G }), A) && !ringsCentered(P.render(A, { glyphs: G }), A, RING.radius + 1));
  const keyRing = mutate("return '<g class=\"peer-key-group\">' + parts.join('') + '</g>';",
    "return '<g class=\"peer-key-group\"><circle class=\"peer-ring\" cx=\"0\" cy=\"0\" r=\"1\"/>' + parts.join('') + '</g>';");
  check('X19 N2 bites: a key that draws a ring, or a keyed plate with no key, fails the key check',
    !keyRingless(keyRing.render(A, { glyphs: G, keyed: true })) && !keyRingless(P.render(A, { glyphs: G, keyed: false })));
  const wide = bent((g) => { g.labels.em.W.r = (RING.radius - RING.stroke / 2 - RING.padding) / P.GEOMETRY.fontSize + 0.01; });
  check('X20 N3 bites: a carrier whose W ink reaches past the padding fails the room check', !roomFor(wide).every(([, room]) => room >= RING.padding));
}

{
  // S controls: each semantic check fails for its intended reason on a mutated engine or source
  const A = byId['triangle.A-S-K.assessment'];
  const artful = mutate("if (o.keyedGiven && o.keyed === false)", "if (false)");
  check('X21 S5 bites: an engine without the keyed-only guard accepts an art plate of an example, where the shipped one refuses it',
    renderError(artful, A, { glyphs: G, keyed: false }) === null && renderError(P, A, { glyphs: G, keyed: false }) === 'OPTION_KEYED');
  const loose = mutate("if (w > bandTextMax()) err('SEMANTIC_TEXT_WIDTH'", "if (false) err('SEMANTIC_TEXT_WIDTH'");
  const wide = clone(A); wide.semantic.direction = ['higher is better, as every reader of this plate knows'];
  check('X22 S1 bites: without the band width check a line wider than the band validates', loose.validate(wide, G).ok && rejects(P, wide, 'SEMANTIC_TEXT_WIDTH'));
  const inkless = mutate("+ s + '.peer-glyph' + on + '{fill:' + ink + '}';", "+ s + '.peer-glyph' + on + '{fill:' + fill + '}';");
  check('X23 S3 bites: an engine that sets each letter in its fill rather than its ink fails the paint check',
    !styleOf(inkless.render(A, { glyphs: G })).includes('.peer-glyph[data-assessment="caution"]{fill:var(--assessment-caution-ink)}'));
  const wordy = mutate("if (sys.colored.indexOf(a) !== -1) lines.push(a);", "lines.push(a);");
  const unK = clone(A); unK.nodes[2].assessment = 'unassessed';
  check('X24 S8 bites: an engine that writes every assignment beside its node draws "unassessed" as if it were a rating',
    /<text class="peer-note" data-node="k"[^>]*>unassessed<\/text>/.test(wordy.render(unK, { glyphs: G })));
  const flipped = clone(A); flipped.nodes[1].assessment = 'caution';
  check('X25 E7 bites: S rated caution, against its -1/4, fails the example check', P.validate(flipped, G).ok && !assessmentHolds(flipped).ok);
  const inside = (engine) => { const svg = engine.render(A, { glyphs: G }), rings = ringsOf(svg), rim = GM.ring.radius + GM.ring.stroke / 2;
    return texts(svg, 'peer-note').some((t) => rings.some((c) => Math.abs(t.x - c.x) < 1 && t.y + 0.24 * GM.noteFontSize > c.y - rim && t.y - 2 * GM.keyCapCenter * GM.noteFontSize < c.y + rim)); };
  const rimless = mutate("var rim = G.ring.radius + G.ring.stroke / 2 + G.noteGap;", "var rim = 0;");
  check('X26 S9 bites: an engine that sets each note from its vertex, with no rim, draws notes inside the rings; the engine as shipped draws none there',
    inside(rimless) && !inside(P));
  const gapless = mutate('if (r) y += G.bandRowGap;', '');
  const gap = (engine) => { const svg = engine.render(A, { glyphs: G }), ys = texts(svg, 'peer-band').map((t) => t.y);
    return +svg.match(/viewBox="0 0 1000 (\d+)"/)[1] - Math.max(...ys); };
  check('X27 S9 bites: a band drawn without its row gaps ends further above the plate\'s foot than the band\'s foot', gap(gapless) !== GM.bandFoot && gap(P) === GM.bandFoot,
    `${gap(gapless)} vs ${gap(P)}`);
}

{
  // One declaration rule, one set of role values: each check fails for its intended reason on the earlier reading
  const reading = "const systems = [...new Set(chosen.map((s) => ENGINE.semanticSystem(s)).filter(Boolean))];";
  const src = fs.readFileSync(path.join(DIR, 'export-peer.mjs'), 'utf8');
  const n = src.split(reading).length - 1;
  if (n !== 1) throw new Error(`mutation anchor found ${n} times: ${reading}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-export-'));
  try {
    for (const f of ['diagrams-static-peer-engine.js', 'diagrams-static-peer-glyphs.js', 'diagrams-static-peer-font.js']) fs.copyFileSync(path.join(DIR, f), path.join(tmp, f));
    fs.writeFileSync(path.join(tmp, 'export-peer.mjs'), src.replace(reading, "const systems = [...new Set(chosen.filter((s) => s.semantic).map((s) => s.semantic.system))];"));
    const absent = path.join(tmp, 'absent.css');
    const r = exportWith(path.join(tmp, 'export-peer.mjs'), ['--out', path.join(tmp, 'out'), '--source', inheritedSource(tmp, []), '--semantic-css', absent]);
    check('X28 S14 bites: an exporter that finds the run\'s systems through a spec\'s prototype tries to read a stylesheet for the inheriting spec, and writes nothing',
      r.status === 1 && r.stderr.includes('absent.css') && !fs.existsSync(path.join(tmp, 'out')), r.stderr.trim());
    const choice = 'const system = ENGINE.semanticSystem(spec), sem = system ? semantic[system] : null;';
    if (src.split(choice).length !== 2) throw new Error(`mutation anchor not found once: ${choice}`);
    fs.writeFileSync(path.join(tmp, 'export-peer.mjs'), src.replace(choice, 'const system = spec.semantic ? spec.semantic.system : null, sem = system ? semantic[system] : null;'));
    const mixedDir = path.join(tmp, 'mixed'); fs.mkdirSync(mixedDir);
    const m = exportWith(path.join(tmp, 'export-peer.mjs'), ['--out', path.join(tmp, 'out2'), '--source', inheritedSource(mixedDir, ['triangle.A-S-K.assessment']), ...SEMANTIC_ARGS]);
    check('X28 S14 bites: an exporter that chooses each spec\'s files through its prototype gives the inheriting spec, beside a declared example, roles it refuses, and writes nothing',
      m.status === 1 && /OPTION_THEME/.test(m.stderr) && !fs.existsSync(path.join(tmp, 'out2')), m.stderr.trim());
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const rereading = mutateEach([
    ['var given = o.roles ? Object.keys(o.roles) : [];', 'var given = isObject(o.theme.roles) ? Object.keys(o.theme.roles) : [];'],
    ['semanticRules(spec, sys, s, c, fixed ? o.roles : null)', 'semanticRules(spec, sys, s, c, fixed ? o.theme.roles : null)'],
  ]);
  const [[, nulled], [, quoted]] = ROLE_PAIRS;
  let drawn = ''; try { drawn = rereading.render(ASM, { glyphs: G, theme: inheritedRoles(quoted) }); } catch (e) { drawn = 'THREW ' + e.message; }
  check('X29 S15 bites: an engine that draws from the theme\'s roles, not the ones it checked, throws a raw error on an inherited null role and writes an inherited quote into its rules',
    String(renderError(rereading, ASM, { glyphs: G, theme: inheritedRoles(nulled) })).startsWith('THREW') && drawn.includes("#FAFA38'"), drawn.slice(0, 60));
}

{
  // The approved values bite: each check fails for its intended reason on the former binding and the former ink
  const { readRoles } = await import(pathToFileURL(path.join(DIR, 'export-peer.mjs')).href);
  const named = ['colors_and_type.css', ...SEMANTIC_SHEETS, 'former binding'];
  const sheets = ['colors_and_type.css', ...SEMANTIC_SHEETS].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .concat(':root { --assessment-caution: var(--state-structural); --assessment-caution-ink: var(--state-structural-ink); }');
  const former = readRoles(sheets, P.SEMANTIC['criterion-assessment']);
  const off = offApproved(former.light, 'criterion-assessment', 'light');
  check('X30 S11 bites: caution bound through Spectral State\'s structural again, as it was before structural moved to violet, resolves to the violet and its ink, which the approved values reject, and reads spectral-state.css',
    off.length === 1 && /^criterion-assessment light caution /.test(off[0]) && hex(former.light.caution.fill) === '#AA40FF' && former.used.map((i) => named[i]).includes('spectral-state.css'), off.join('; '));
  const lejDark = svgOf(LEJ, { theme: { ...RESOLVED, name: 'dark', roles: APPROVED['three-functions'].dark } });
  const retired = lejDark.replace(`.peer-glyph[data-function="legislative"]{fill:${INK.magenta}}`, '.peer-glyph[data-function="legislative"]{fill:#201D26}');
  const offs = [fileOff(lejDark, 'function', 'three-functions', 'dark'), fileOff(retired, 'function', 'three-functions', 'dark')];
  check('X31 S12 bites: a dark Three Functions file whose legislative letter takes the retired high-contrast ink fails on that letter alone; drawn with the approved roles it passes',
    retired !== lejDark && offs[0].length === 0 && offs[1].length === 1 && /^dark legislative .*#201D26/.test(offs[1][0]), offs.map((o) => o.join('; ')).join(' | '));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
