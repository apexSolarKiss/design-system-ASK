#!/usr/bin/env node
/* network-contract.test.mjs — the network contract, rendering, layout and export controls of the static
   layered-network pattern, on the owner files themselves, in Node with no dependency.

     node tests/network-contract.test.mjs          prints one line per check; exit 1 on any failure

   The engine, glyph carrier and source are classic scripts; they are loaded here as a page loads them, into
   one global, so the code tested is the code shipped.

   P  probes: every specimen validates; the reference specimen is the source-read topology (layers 3-4-3-2,
      the 23 connections of Fig. 1c-d, the four marks and three weights on their connections); the second
      specimen differs in layer count, populations and connections, carries its own generic annotation and
      no credit, and draws through the same engine; the carrier records ink outside the advance
   V  validation: every malformed spec, notation, carrier or option checked here is a named error, a label a
      connector runs through is refused wherever it is, overprinting annotations are refused, and
      validate() never throws
   R  rendering: deterministic; the art view keeps the annotated view's graph, placement and credit, and
      drops the marks, weights, equations, titles, layer labels and notes; the annotated view draws them; a
      spec with no credit draws none; every element id is the plate's own; italic runs set cv05; the
      description carries the notes in the annotated view and the credit in every view
   L  layout, read back from the rendered SVG with geometry independent of the engine's: every drawn text
      (marks excepted, which sit inside their rings) keeps the minimum clear of every painted connector,
      head and ring, every weight label also of every dot; every annotation keeps the minimum clear of every
      other; every dot lies on a drawn connector and keeps clear of every other connector and every head;
      no notation text comes near a fraction rule of its own; every annotation's drawn ink lies inside the
      box the engine validated; and every drawn text, ring, connector and dot lies inside the plate. The
      parser must read every <text> drawn, or the plate fails
   F  fonts, tokens and export: the carriers record the canonical fonts' sha256; the italic subset's own
      character map sends l to the tailed glyph, read from the WOFF2 itself; the exporter resolves the
      canonical tokens, validates before writing, writes the same bytes twice, embeds the three subsets
      under private family names it names first, carries both licenses, the drawn credit only where a spec
      has one, and no unresolved var()
   X  negative controls on mutated copies of the engine, the page or a font: each named check fails for its
      intended reason */
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'patterns/diagram-static-network');
const ENGINE_SRC = fs.readFileSync(path.join(DIR, 'diagrams-static-network-engine.js'), 'utf8');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

function load(engineSource = ENGINE_SRC) {
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(engineSource, ctx, { filename: 'diagrams-static-network-engine.js' });
  for (const f of ['diagrams-static-network-glyphs.js', 'diagram-static-network.source.js', 'diagrams-static-network-font.js'])
    vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f });
  return { N: ctx.DIAGRAM_NETWORK, G: ctx.DIAGRAM_NETWORK_GLYPHS, SPECS: ctx.NETWORK_DIAGRAMS, FONT: ctx.DIAGRAM_NETWORK_FONT };
}
function mutate(...pairs) {   // mutate([from, to], [from, to], ...): each passage must occur exactly once
  let src = ENGINE_SRC;
  for (const [from, to] of pairs) {
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation passage occurs ${n} times: ${from.slice(0, 60)}`);
    src = src.replace(from, to);
  }
  return load(src).N;
}
const { N, G, SPECS, FONT } = load();
const GM = N.geometry;
const clone = (x) => JSON.parse(JSON.stringify(x));
const FB = SPECS.find((s) => s.id === 'network.forward-backward');
const SP = SPECS.find((s) => s.id === 'network.sparse-5-2-3');

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) passed++; else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  // ' + detail : ''}`);
}
const codes = (eng, spec, glyphs = G) => eng.validate(spec, glyphs).errors.map((e) => e.code);
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.message; } };

/* ---------------------------------------------------------------- the SVG, read back */
const unesc = (t) => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const drawn = (svg) => svg.replace(/<title[^>]*>[\s\S]*?<\/title>|<desc[^>]*>[\s\S]*?<\/desc>|<metadata>[\s\S]*?<\/metadata>/g, '');
const descOf = (svg) => unesc((svg.match(/<desc[^>]*>([^<]*)<\/desc>/) || [])[1] || '');
const FACE = { 't': 'roman', 't ti': 'italic', 't tm': 'mono', 't ts': 'sigma', 't note': 'roman', 't credit': 'roman' };
function texts(chunk) {
  return [...chunk.matchAll(/<text class="([^"]+)" x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"(?: xml:space="preserve")?>([^<]*)<\/text>/g)]
    .map((m) => ({ cls: m[1], x: +m[2], y: +m[3], size: +m[4], text: unesc(m[5]) }));
}
// a text element's ink box, from the carrier's advances and [xMin, yMin, xMax, yMax] ink bounds
function inkBox(t) {
  const f = G.faces[FACE[t.cls]];
  let px = t.x, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const ch of t.text) { const b = f.ink[ch]; if (b) { x0 = Math.min(x0, px + b[0] * t.size); x1 = Math.max(x1, px + b[2] * t.size); y0 = Math.min(y0, t.y - b[3] * t.size); y1 = Math.max(y1, t.y - b[1] * t.size); } px += f.em[ch] * t.size; }
  return x0 <= x1 ? { x0, x1, y0, y1 } : null;
}
const nums = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number);
function paintOf(chunk) {
  const lines = [...chunk.matchAll(/<path class="edge" d="([^"]+)"\/>/g)].map((m) => { const v = nums(m[1]); return [{ x: v[0], y: v[1] }, { x: v[2], y: v[3] }]; });
  const heads = [...chunk.matchAll(/<path class="head" d="([^"]+)"\/>/g)].map((m) => { const v = nums(m[1]); const p = []; for (let i = 0; i < v.length; i += 2) p.push({ x: v[i], y: v[i + 1] }); return p; });
  const rings = [...chunk.matchAll(/<circle class="ring" cx="([^"]+)" cy="([^"]+)" r="([^"]+)"\/>/g)].map((m) => ({ x: +m[1], y: +m[2], r: +m[3] }));
  const dots = [...chunk.matchAll(/<circle class="dot" cx="([^"]+)" cy="([^"]+)" r="([^"]+)"\/>/g)].map((m) => ({ x: +m[1], y: +m[2], r: +m[3] }));
  return { lines, heads, rings, dots };
}
// a panel runs from its <g class="panel"> to the next one, or to the notes and credit band
const panelsOf = (svg) => drawn(svg).split('<g class="panel">').slice(1).map((c) => c.split('<g class="ann band">')[0]);
// each annotation is its own group: a mark, a weight label, a title, a layer label, an equation line, a note, the credit
const groupsOf = (chunk) => [...chunk.matchAll(/<g class="ann (\w+)">([\s\S]*?)<\/g>/g)].map((m) => ({
  kind: m[1], texts: texts(m[2]), rules: [...m[2].matchAll(/<path class="rule" d="M([-\d.]+) ([-\d.]+)H([-\d.]+)"\/>/g)].map((r) => ({ x0: +r[1], y: +r[2], x1: +r[3] })) }));
const unionBox = (bs) => bs.filter(Boolean).reduce((u, b) => u ? { x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) } : { ...b }, null);
const RULE_HALF = 0.6;
const groupBox = (g) => unionBox(g.texts.map(inkBox).concat(g.rules.map((r) => ({ x0: r.x0, x1: r.x1, y0: r.y - RULE_HALF, y1: r.y + RULE_HALF }))));
// the parser must read every <text> and every annotation group drawn, or a check could pass on what it skipped
const parsedAll = (svg) => { const body = drawn(svg); return texts(body).length === (body.match(/<text\b/g) || []).length && (body.match(/<g class="ann /g) || []).length === groupsOf(body).length; };
const plateOf = (svg) => { const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/); return { w: +m[1], h: +m[2] }; };

/* Exact geometry, written here independently of the engine: closest points between segments by clamped
   parameters, segment-box intersection by Liang-Barsky clipping, point-in-polygon by winding number. */
function ptSeg(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0; return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); }
function segSegDist(p1, q1, p2, q2) {
  const d1 = { x: q1.x - p1.x, y: q1.y - p1.y }, d2 = { x: q2.x - p2.x, y: q2.y - p2.y }, r = { x: p1.x - p2.x, y: p1.y - p2.y };
  const a = d1.x * d1.x + d1.y * d1.y, e = d2.x * d2.x + d2.y * d2.y, f = d2.x * r.x + d2.y * r.y, c = d1.x * r.x + d1.y * r.y, b = d1.x * d2.x + d1.y * d2.y, den = a * e - b * b;
  let s = den > 1e-12 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0, t = e > 1e-12 ? (b * s + f) / e : 0;
  if (t < 0) { t = 0; s = a > 1e-12 ? Math.max(0, Math.min(1, -c / a)) : 0; } else if (t > 1) { t = 1; s = a > 1e-12 ? Math.max(0, Math.min(1, (b - c) / a)) : 0; }
  return Math.hypot(p1.x + d1.x * s - p2.x - d2.x * t, p1.y + d1.y * s - p2.y - d2.y * t);
}
function clips(b, a, c) {   // Liang-Barsky: does segment a-c meet box b?
  let t0 = 0, t1 = 1; const dx = c.x - a.x, dy = c.y - a.y;
  for (const [p, q] of [[-dx, a.x - b.x0], [dx, b.x1 - a.x], [-dy, a.y - b.y0], [dy, b.y1 - a.y]]) {
    if (p === 0) { if (q < 0) return false; } else { const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } }
  }
  return true;
}
const edgesOfBox = (b) => { const c = [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 }]; return c.map((p, i) => [p, c[(i + 1) % 4]]); };
const boxSegDist = (b, a, c) => clips(b, a, c) ? 0 : Math.min(...edgesOfBox(b).map(([p, q]) => segSegDist(p, q, a, c)));
function winding(p, poly) { let w = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], s = (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y); if (a.y <= p.y) { if (b.y > p.y && s > 0) w++; } else if (b.y <= p.y && s < 0) w--; } return w !== 0; }
const boxPolyDist = (b, poly) => (poly.some((p) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1) || edgesOfBox(b).some(([p]) => winding(p, poly)))
  ? 0 : Math.min(...poly.map((p, i) => boxSegDist(b, p, poly[(i + 1) % poly.length])));
const boxPtDist = (b, p) => Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.y0 - p.y, 0, p.y - b.y1));
function graphClear(box, paint, withDots) {
  let m = Infinity;
  for (const [a, c] of paint.lines) m = Math.min(m, boxSegDist(box, a, c) - GM.edge / 2);
  for (const h of paint.heads) m = Math.min(m, boxPolyDist(box, h));
  for (const r of paint.rings) m = Math.min(m, boxPtDist(box, r) - (r.r + GM.nodeStroke / 2));
  if (withDots) for (const d of paint.dots) m = Math.min(m, boxPtDist(box, d) - d.r);
  return m;
}
/* A mark is one italic character at the mark size whose ink sits inside a ring of its panel. */
function isMark(t, paint) {
  if (t.cls !== 't ti' || t.size !== GM.markSize || [...t.text].length !== 1) return false;
  const b = inkBox(t); if (!b) return false;
  const c = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
  return paint.rings.some((r) => Math.hypot(c.x - r.x, c.y - r.y) + Math.hypot((b.x1 - b.x0) / 2, (b.y1 - b.y0) / 2) <= r.r);
}
/* The least clearance any drawn text keeps from the graph of its own panel, read from the SVG: marks are
   excluded (they sit inside their rings); weight labels (their size) also keep clear of every dot. */
function leastClear(svg) {
  let least = Infinity, where = '';
  for (const chunk of panelsOf(svg)) {
    const paint = paintOf(chunk);
    for (const t of texts(chunk)) {
      if (isMark(t, paint)) continue;
      const b = inkBox(t); if (!b) continue;
      const weight = t.size === GM.weightSize || Math.abs(t.size - GM.weightSize * 0.66) < 0.01;
      const c = graphClear(b, paint, weight);
      if (c < least) { least = c; where = JSON.stringify(t.text); }
    }
  }
  return { least, where };
}
/* Everything drawn lies inside the plate: every text's ink box, every ring, connector end and dot. */
function outside(svg) {
  const { w, h } = plateOf(svg), body = drawn(svg), out = [];
  const inP = (b) => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= w && b.y1 <= h;
  for (const t of texts(body)) { const b = inkBox(t); if (b && !inP(b)) out.push(t.text.slice(0, 24)); }
  const p = paintOf(body);
  for (const r of p.rings.concat(p.dots)) if (!inP({ x0: r.x - r.r, y0: r.y - r.r, x1: r.x + r.r, y1: r.y + r.r })) out.push('ring/dot');
  for (const [a, c] of p.lines) if (!inP({ x0: Math.min(a.x, c.x), y0: Math.min(a.y, c.y), x1: Math.max(a.x, c.x), y1: Math.max(a.y, c.y) })) out.push('connector');
  return out;
}

/* Every pair of annotations, in any panel or the band, keeps the minimum clear of each other. */
function textTextLeast(svg) {
  const gs = groupsOf(drawn(svg)).map((g) => ({ kind: g.kind, box: groupBox(g) })).filter((g) => g.box);
  let least = Infinity, where = '';
  for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
    const a = gs[i].box, b = gs[j].box, d = Math.hypot(Math.max(a.x0 - b.x1, 0, b.x0 - a.x1), Math.max(a.y0 - b.y1, 0, b.y0 - a.y1));
    if (d < least) { least = d; where = gs[i].kind + ' / ' + gs[j].kind; }
  }
  return { least, where };
}
/* The notes and the credit keep the minimum clear of the graph of every panel. */
function bandLeast(svg) {
  const body = drawn(svg), band = groupsOf(body).filter((g) => g.kind === 'band'), paint = paintOf(body);
  return Math.min(Infinity, ...band.map((g) => graphClear(groupBox(g), paint, true)));
}
/* Each dot lies on a drawn connector of its panel and keeps the minimum clear of every other connector
   (less half its stroke and its radius) and of every head (less its radius). */
function dotsLeast(svg) {
  let onLine = true, least = Infinity;
  for (const chunk of panelsOf(svg)) {
    const p = paintOf(chunk);
    for (const d of p.dots) {
      const dists = p.lines.map(([a, c]) => ptSeg(d, a, c)), own = dists.indexOf(Math.min(...dists));
      if (!(dists[own] < 0.02)) onLine = false;
      dists.forEach((x, i) => { if (i !== own) least = Math.min(least, x - GM.edge / 2 - d.r); });
      for (const h of p.heads) least = Math.min(least, (winding(d, h) ? 0 : Math.min(...h.map((q, i) => ptSeg(d, q, h[(i + 1) % h.length])))) - d.r);
    }
  }
  return { onLine, least };
}
/* No notation text comes near a fraction rule of its own annotation: the least distance from any text's
   ink to any rule of its group, less the rule's half width. */
function rulesLeast(svg) {
  let least = Infinity;
  for (const g of groupsOf(drawn(svg))) for (const t of g.texts) { const b = inkBox(t); if (!b) continue;
    for (const r of g.rules) least = Math.min(least, boxSegDist(b, { x: r.x0, y: r.y }, { x: r.x1, y: r.y }) - RULE_HALF); }
  return least;
}
/* Every annotation's drawn ink lies inside the box the engine validated for it: per panel, the weight labels
   in order against layout().placed, the title, layer labels and equation lines in order against layout()'s
   annotations; then the notes and the credit. */
function enclosed(svg, spec, eng = N) {
  const L = eng.layout(spec, G), bad = [];
  const inside = (ink, box, name) => { if (ink && box && !(ink.x0 >= box.x0 - 0.01 && ink.x1 <= box.x1 + 0.01 && ink.y0 >= box.y0 - 0.01 && ink.y1 <= box.y1 + 0.01)) bad.push(name); };
  panelsOf(svg).forEach((chunk, pi) => {
    const gs = groupsOf(chunk), ws = gs.filter((g) => g.kind === 'weight'), rest = gs.filter((g) => g.kind === 'title' || g.kind === 'layer' || g.kind === 'equation');
    ws.forEach((g, k) => inside(groupBox(g), L.placed[pi].boxes[k], 'weight ' + k + ' in panel ' + pi));
    rest.forEach((g, k) => inside(groupBox(g), L.panels[pi].annotations[k] && L.panels[pi].annotations[k].box, g.kind + ' ' + k + ' in panel ' + pi));
    if (ws.length !== L.placed[pi].boxes.length || rest.length !== L.panels[pi].annotations.length) bad.push('group count in panel ' + pi);
  });
  const band = groupsOf(drawn(svg)).filter((g) => g.kind === 'band'), engineBand = L.notes.map((n) => n.box).concat(L.credit ? [L.credit.box] : []);
  band.forEach((g, k) => inside(groupBox(g), engineBand[k], 'band ' + k));
  return bad;
}

/* ---------------------------------------------------------------- P // probes */
/* SOURCE_EDGES and P3's marks restate network.forward-backward's connections and marks, which are
   excluded from design-system-ASK's Apache License 2.0 grant; no license to the source material is
   granted. See design-system-ASK's NOTICE. */
const SOURCE_EDGES = [
  'in.0>h1.0', 'in.0>h1.1', 'in.0>h1.2', 'in.1>h1.1', 'in.1>h1.2', 'in.1>h1.3', 'in.2>h1.2', 'in.2>h1.3',
  'h1.0>h2.0', 'h1.0>h2.1', 'h1.1>h2.0', 'h1.1>h2.1', 'h1.2>h2.0', 'h1.2>h2.1', 'h1.2>h2.2', 'h1.3>h2.1', 'h1.3>h2.2',
  'h2.0>out.0', 'h2.0>out.1', 'h2.1>out.0', 'h2.1>out.1', 'h2.2>out.0', 'h2.2>out.1'];
const referenceTopology = (spec) => spec.layers.map((L) => L.n).join('-') === '3-4-3-2'
  && spec.edges.length === 23 && SOURCE_EDGES.every((e) => spec.edges.some(([a, b]) => a + '>' + b === e));
check('P1 every specimen validates', SPECS.every((s) => N.validate(s, G).ok), SPECS.map((s) => s.id).join(', '));
check('P2 the reference specimen is the source-read topology: layers 3-4-3-2 and the 23 connections of Fig. 1c-d', referenceTopology(FB));
check('P3 the marks are i, j, k, l on the marked units, and each weight labels a declared connection',
  JSON.stringify(FB.marks) === JSON.stringify({ 'in.1': 'i', 'h1.2': 'j', 'h2.1': 'k', 'out.1': 'l' })
  && FB.weights.every((w) => FB.edges.some(([a, b]) => a === w.from && b === w.to)));
check('P4 the second specimen differs in layer count, populations and connections', SP.layers.length !== FB.layers.length
  && SP.layers.map((L) => L.n).join('-') === '5-2-3' && SP.edges.length === 10);
check('P5 the reference carries the credit and the notes; the second specimen carries neither, and annotates itself',
  typeof FB.credit === 'string' && FB.notes.length === 2 && !SP.credit && !SP.notes
  && SP.weights.length === 1 && Object.keys(SP.marks).length === 2 && SP.panels[0].equations.length === 1 && !!SP.panels[0].title);
check('P6 the carrier records ink outside the advance: the italic j reaches left of its origin, the italic f past its advance',
  G.faces.italic.ink.j[0] < 0 && G.faces.italic.ink.f[2] > G.faces.italic.em.f, `j xMin ${G.faces.italic.ink.j[0]}, f xMax ${G.faces.italic.ink.f[2]} > ${G.faces.italic.em.f}`);

/* ---------------------------------------------------------------- V // validation */
const bad = (fn) => { const s = clone(FB); fn(s); return codes(N, s); };
check('V1 an edge between non-adjacent layers is EDGE_NOT_ADJACENT', bad((s) => s.edges.push(['in.0', 'h2.0'])).includes('EDGE_NOT_ADJACENT'));
check('V2 an edge running backward is EDGE_NOT_ADJACENT', bad((s) => s.edges.push(['h1.0', 'in.0'])).includes('EDGE_NOT_ADJACENT'));
check('V3 a repeated edge is EDGE_DUPLICATE', bad((s) => s.edges.push(['in.0', 'h1.0'])).includes('EDGE_DUPLICATE'));
check('V4 an edge naming no node is EDGE_ENDPOINT', bad((s) => s.edges.push(['in.9', 'h1.0'])).includes('EDGE_ENDPOINT'));
check('V5 a weight on an undeclared connection is WEIGHT_EDGE', bad((s) => { s.weights[0].to = 'h1.0'; }).includes('WEIGHT_EDGE'));
check('V6 an unsupported character in notation is NOTATION_UNSUPPORTED', bad((s) => { s.weights[0].label = [{ i: 'w→' }]; }).includes('NOTATION_UNSUPPORTED'));
check('V7 a look-alike sign in the sign run is NOTATION_UNSUPPORTED', bad((s) => { s.panels[0].equations[0].lines[1].find((x) => x.sum).sum[1] = { m: 'ε' }; }).includes('NOTATION_UNSUPPORTED'));
check('V8 a misspelled field is SPEC_KEY, LAYER_KEY, WEIGHT_KEY or PANEL_KEY, each on its own spec', bad((s) => { s.edge = []; }).includes('SPEC_KEY')
  && bad((s) => { s.layers[0].count = 3; }).includes('LAYER_KEY') && bad((s) => { s.weights[0].lable = s.weights[0].label; }).includes('WEIGHT_KEY')
  && bad((s) => { s.panels[0].dir = 'up'; }).includes('PANEL_KEY'));
check('V9 a mark on no node is MARK_NODE; a mark of two characters is MARK_TEXT', bad((s) => { s.marks['in.7'] = 'q'; }).includes('MARK_NODE') && bad((s) => { s.marks['in.0'] = 'ab'; }).includes('MARK_TEXT'));
check('V10 a panel direction outside up and down is PANEL_DIRECTION', bad((s) => { s.panels[0].direction = 'left'; }).includes('PANEL_DIRECTION'));
check('V11 validate() never throws: a spec whose fields cannot be read is SPEC_UNREADABLE',
  (() => { const s = clone(FB); Object.defineProperty(s, 'edges', { get() { throw new Error('boom'); }, enumerable: true }); return codes(N, s).includes('SPEC_UNREADABLE'); })());
check('V12 without a glyph carrier, validate() and render() report GLYPHS_MISSING, not a character error',
  JSON.stringify([...new Set(N.validate(FB).errors.map((e) => e.code))]) === '["GLYPHS_MISSING"]' && throws(() => N.render(FB, {})) === 'GLYPHS_MISSING');
check('V13 a carrier whose ink bounds are not [xMin, yMin, xMax, yMax], or with no summation sign, is GLYPHS_MALFORMED', (() => {
  const a = clone(G); a.faces.italic.ink.l = [0, 1]; const b = clone(G); delete b.faces.sigma.em['Σ'];
  return throws(() => N.render(FB, { glyphs: a })) === 'GLYPHS_MALFORMED' && throws(() => N.render(FB, { glyphs: b })) === 'GLYPHS_MALFORMED';
})());
const theme = (k, v) => Object.assign({ name: 'x', fieldFrom: '#D4C6E1', fieldTo: '#E2D3F0', ink: '#6A637F', fontFamily: "'Inter', sans-serif", monoFamily: "'JetBrains Mono', monospace" }, { [k]: v });
check('V14 a theme value with markup, CSS punctuation or an ampersand is OPTION_THEME', ['red;}', 'a<b', "'Foo & Bar'"].every((v) => throws(() => N.render(FB, { glyphs: G, theme: theme('fontFamily', v) })) === 'OPTION_THEME'));
check('V15 a second equation block for one layer in a panel is EQUATION_LAYER_DUPLICATE', bad((s) => { s.panels[0].equations.push(clone(s.panels[0].equations[0])); }).includes('EQUATION_LAYER_DUPLICATE'));
const WIDE = [{ r: 'n'.repeat(14) }];   // a label a sampled clearance accepts with a connector through it
const DENSE = (label) => { const edges = []; for (let p = 0; p < 3; p++) for (let q = 0; q < 4; q++) edges.push(['x.' + p, 'y.' + q]); return { id: 'probe.dense', layers: [{ id: 'x', n: 3 }, { id: 'y', n: 4 }], edges, weights: [{ from: 'x.0', to: 'y.3', label }], panels: [{ direction: 'up' }] }; };
check('V16 a wide label a connector runs through is WEIGHT_CLEARANCE, wherever the sample points of a grid would fall', codes(N, DENSE(WIDE)).includes('WEIGHT_CLEARANCE'));
const UP = (z) => [{ frac: [[{ frac: [[{ frac: [[{ i: z }], [{ i: z }]] }], [{ i: z }]] }], [{ i: z }]] }];      // tall above its baseline
const DOWN = (z) => [{ frac: [[{ i: z }], [{ frac: [[{ i: z }], [{ frac: [[{ i: z }], [{ i: z }]] }]] }]] }];  // deep below it
const OVERPRINT = () => { const s = clone(FB); s.panels[0].equations[0].lines = [DOWN('a'), UP('b')]; return s; };
check('V17 two equation lines that would overprint are ANNOTATION_COLLISION', codes(N, OVERPRINT()).includes('ANNOTATION_COLLISION'));
const NARROW = (() => { const s = clone(FB); s.id = 'probe.forward-only'; s.panels = [s.panels[0]]; return s; })();
check('V18 a credited one-panel plate narrower than its credit validates: the plate grows to hold it', N.validate(NARROW, G).ok);
const holey = (fn) => { const s = clone(FB); fn(s); try { return N.validate(s, G).errors.map((e) => e.code); } catch (e) { return ['THREW ' + e.name]; } };
check('V19 a hole in the weights, panels, equations or a notation line is a named error, and validate() does not throw', (() => {
  const w = holey((s) => { s.weights = [, s.weights[0]]; }), p = holey((s) => { s.panels = [s.panels[0], , ]; s.panels.length = 2; }),
    q = holey((s) => { s.panels[0].equations = [, s.panels[0].equations[0]]; }), n = holey((s) => { s.weights[0].label = [, { i: 'w' }]; });
  return w.includes('WEIGHT_NOT_OBJECT') && p.includes('PANEL_NOT_OBJECT') && q.includes('EQUATION_NOT_OBJECT') && n.includes('NOTATION_ITEM') && throws(() => N.render((() => { const s = clone(FB); s.weights = [, s.weights[0]]; return s; })(), { glyphs: G })) === 'WEIGHT_NOT_OBJECT';
})());
check('V20 an empty notation run is NOTATION_ITEM', bad((s) => { s.weights[0].label = [{ frac: [[], [{ i: 'x' }]] }]; }).includes('NOTATION_ITEM'));
check('V21 a spec-level error and a missing carrier are both reported', (() => { const s = clone(FB); s.edge = []; const c = N.validate(s).errors.map((e) => e.code); return c.includes('SPEC_KEY') && c.includes('GLYPHS_MISSING'); })());
check('V22 theme values are checked by form: a double-quoted family is accepted, and a comment opener, an unbalanced quote or a url() is OPTION_THEME',
  throws(() => N.render(FB, { glyphs: G, theme: theme('fontFamily', '"Inter", ui-sans-serif, sans-serif') })) === null
  && ['#6A637F/*', "'Inter", 'url(x)'].every((v) => throws(() => N.render(FB, { glyphs: G, theme: theme('ink', v) })) === 'OPTION_THEME')
  && throws(() => N.render(FB, { glyphs: G, theme: theme('fontFamily', "'Inter") })) === 'OPTION_THEME');
check('V23 a font-face CSS option carrying & or < is written escaped, so the plate stays well-formed', (() => {
  const svg = N.render(FB, { glyphs: G, fontFaceCSS: "@font-face{font-family:'X';src:url(x.woff2?v=1&display=swap)}/* a<b */" });
  return /\?v=1&amp;display=swap/.test(svg) && /a&lt;b/.test(svg) && !/&(?!amp;|lt;|gt;|quot;)/.test(svg);
})());

/* ---------------------------------------------------------------- R // rendering */
const ann = N.render(FB, { glyphs: G }), art = N.render(FB, { glyphs: G, mode: 'art' });
const creditText = (svg) => (texts(drawn(svg)).find((t) => t.cls === 't credit') || {}).text || '';
const shapes = (svg) => (svg.match(/<(circle class="ring"|path class="(edge|head)")[^>]*>/g) || []).join('\n');
check('R1 rendering is deterministic', ann === N.render(FB, { glyphs: G }) && art === N.render(FB, { glyphs: G, mode: 'art' }));
check('R2 the art view keeps the annotated view\'s rings, connectors and heads exactly, and its plate size', shapes(ann) === shapes(art) && shapes(ann).length > 0
  && JSON.stringify(plateOf(ann)) === JSON.stringify(plateOf(art)), `${(shapes(ann).match(/\n/g) || []).length + 1} shapes`);
check('R3 every view of the reference draws its credit', creditText(ann) === FB.credit && creditText(art) === FB.credit);
check('R4 the art view drops the marks, weights, equations, titles, layer labels and notes: it draws one text, the credit, and no dot', !/class="dot"/.test(art)
  && (drawn(art).match(/<text\b/g) || []).length === 1 && creditText(art) === FB.credit);
const marksDrawn = (svg) => panelsOf(svg).flatMap((chunk) => { const paint = paintOf(chunk); return texts(chunk).filter((t) => isMark(t, paint)).map((t) => t.text); }).sort().join('');
check('R5 the annotated view draws the notes, the four marks in each panel and a dot for each weight in each panel', marksDrawn(ann) === 'iijjkkll'
  && texts(drawn(ann)).filter((t) => t.cls === 't note').map((t) => t.text).join('|') === FB.notes.join('|') && (ann.match(/class="dot"/g) || []).length === 6);
check('R6 a spec with no credit draws no credit', !/class="t credit"/.test(N.render(SP, { glyphs: G })));
const pre = N.idPrefixFor(FB.id), ids = [...ann.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
check('R7 every element id is the plate\'s own', ids.length === 6 && ids.every((i) => i.startsWith(pre)), ids.join(' '));
check('R8 the reference draws 23 connectors per panel and 2 signals per panel', (ann.match(/class="edge"/g) || []).length === 2 * (23 + 2));
const r9 = (svg) => /\.ti\{font-style:italic;font-feature-settings:"cv05"\}/.test(svg);
check('R9 italic runs set cv05', r9(ann));
check('R10 the description names every panel, reads the annotation and the notes in the annotated view, and carries the credit in every view',
  FB.panels.every((P) => descOf(ann).includes(P.title) && descOf(art).includes(P.title)) && FB.notes.every((n) => descOf(ann).includes(n)) && !FB.notes.some((n) => descOf(art).includes(n))
  && ['Marked units: i,', 'w_ij on the connection from Input units unit 2 to Hidden units H1 unit 3', 'y_l = f(z_l)', 'sum over k∈H2 of w_kl y_k'].every((x) => descOf(ann).includes(x))
  && !/Marked units|Weights:|equations:/.test(descOf(art)) && descOf(ann).endsWith(FB.credit) && descOf(art).endsWith(FB.credit));
const PAGE = fs.readFileSync(path.join(DIR, 'diagram-static-network.html'), 'utf8');
const r11 = (page) => /data-mode="/.test(ann) && !/querySelectorAll\('\[data-mode\]'\)/.test(page) && (page.match(/querySelectorAll\('\.network-mode\[data-mode\]'\)/g) || []).length === 2;
check('R11 the specimen\'s selector script reads only its own buttons: a plate\'s <svg> carries data-mode too', r11(PAGE));
const spAnn = N.render(SP, { glyphs: G }), spArt = N.render(SP, { glyphs: G, mode: 'art' });
check('R12 the second specimen\'s annotation draws through the same engine: its marks, weight, title and equation, and none in art',
  marksDrawn(spAnn) === 'pq' && (spAnn.match(/class="dot"/g) || []).length === 1 && texts(drawn(spAnn)).some((t) => t.text === 'One pass')
  && /class="t ts"/.test(spAnn) && (drawn(spArt).match(/<text\b/g) || []).length === 0 && descOf(spAnn) !== descOf(spArt));
check('R13 the notes and the credit are drawn at full ink, as every other text is: no opacity anywhere in the plate, no rule of their own, no attribute beyond position and size',
  !/opacity/.test(ann) && !/\.(note|credit)\b[^{]*\{/.test(ann) && [...drawn(ann).matchAll(/<text class="t (note|credit)"([^>]*)>/g)].every((m) => /^ x="[\d.]+" y="[\d.]+" font-size="[\d.]+"$/.test(m[2])));
// R14 reads the declarations only; tests/network-host-inheritance.mjs shows in a browser what they hold under a host's styles
check('R14 the plate sets no kerning or ligatures and its rules declare each property the text\'s layout and ink depend on; heads, dots and the field\'s rectangle take no stroke',
  ['font-style:normal', 'font-weight:400', 'font-stretch:normal', 'font-size-adjust:none', 'font-variant:normal', 'stroke:none', 'text-shadow:none',
    'font-optical-sizing:none', 'font-kerning:none', 'font-variant-ligatures:none', 'font-feature-settings:normal', 'font-variation-settings:normal',
    'font-synthesis:none', 'letter-spacing:0', 'word-spacing:0', 'text-transform:none', 'text-anchor:start', 'dominant-baseline:alphabetic',
    'direction:ltr', 'writing-mode:horizontal-tb', 'text-orientation:mixed', 'white-space:pre', 'text-rendering:auto'].every((x) => (ann.match(/ \.t\{[^}]*\}/) || [''])[0].includes(x))
  && / \.dot\{[^}]*stroke:none\}/.test(ann) && />rect\{stroke:none\}/.test(ann));
check('R15 a plate is named by its title alone and described by its description',
  new RegExp(' aria-labelledby="' + pre + '_title" aria-describedby="' + pre + '_desc"').test(ann));
// a minimal document for mount(): ids registered per host, as the browser would
function fakeDom() {
  const ids = new Map(), doc = { getElementById: (id) => ids.get(id) || null };
  const host = () => { const h = { ownerDocument: doc, html: '', querySelector: () => null, firstElementChild: null, contains: (el) => el.host === h };
    Object.defineProperty(h, 'innerHTML', { set(v) { for (const [id, el] of [...ids]) if (el.host === h) ids.delete(id); for (const m of v.matchAll(/ id="([^"]+)"/g)) ids.set(m[1], { host: h }); h.html = v; } });
    return h; };
  return host;
}
check('R16 re-mounting into the same host keeps its id prefix; the same spec in a second host takes a prefix of its own', (() => {
  const host = fakeDom(), a = host(), b = host(), idOf = (h) => h.html.match(/<svg[^>]* id="([^"]+)"/)[1];
  N.mount(a, FB, { glyphs: G }); const first = idOf(a);
  N.mount(a, FB, { glyphs: G, mode: 'art' }); const again = idOf(a);
  N.mount(b, FB, { glyphs: G });
  return first === pre && again === pre && idOf(b) === pre + '_n2';
})());

/* ---------------------------------------------------------------- L // layout, read back from the SVG */
const I = (x) => ({ i: x }), R = (x) => ({ r: x }), FR = (a, b) => ({ frac: [a, b] });
const NESTED = { id: 'probe.nested', layers: [{ id: 'a', n: 1 }, { id: 'b', n: 1 }], edges: [['a.0', 'b.0']], panels: [{ direction: 'up', equations: [
  { layer: 'b', lines: [[FR([FR([I('a')], [I('b')])], [I('c')])], [FR([R('1')], [R('1 + '), FR([R('1')], [I('x')])])]] }] }] };
const OVERHANG = { id: 'probe.overhang', layers: [{ id: 'a', n: 1 }, { id: 'b', n: 1 }], edges: [['a.0', 'b.0']], weights: [{ from: 'a.0', to: 'b.0', label: [I('f'), { sub: [I('j')] }] }], panels: [{ direction: 'up' }] };
check('L0 the probes the layout checks read validate', [NESTED, OVERHANG].every((s) => N.validate(s, G).ok), [NESTED, OVERHANG].map((s) => s.id + ' ' + N.validate(s, G).errors.map((e) => e.code).join(',')).join('; '));
const PLATES = [['the reference', ann, FB], ['the second specimen', spAnn, SP], ['the one-panel credited probe', N.render(NARROW, { glyphs: G }), NARROW],
  ['the nested-fraction probe', N.render(NESTED, { glyphs: G }), NESTED], ['the overhang probe', N.render(OVERHANG, { glyphs: G }), OVERHANG]];
for (const [name, svg] of PLATES) {
  const r = leastClear(svg);
  check(`L1 in ${name}, every drawn text but the marks keeps the minimum clear of its panel's connectors, heads and rings, and every weight label of every dot`,
    r.least >= GM.minClear, `least ${r.least.toFixed(2)} units, at ${r.where}`);
  const o = outside(svg);
  check(`L2 in ${name}, every drawn text, ring, connector and dot lies inside the plate`, o.length === 0, o.join(', ') || `${plateOf(svg).w} x ${plateOf(svg).h}`);
}
for (const [name, svg, spec] of PLATES) {
  check(`L3 in ${name}, the parser reads every text and every annotation group drawn`, parsedAll(svg));
  const tt = textTextLeast(svg);
  check(`L4 in ${name}, every annotation keeps the minimum clear of every other`, tt.least >= GM.minClear, tt.least === Infinity ? 'one annotation or none' : `least ${tt.least.toFixed(2)} units, ${tt.where}`);
  const bl = bandLeast(svg);
  check(`L5 in ${name}, the notes and the credit keep the minimum clear of the graph`, bl >= GM.minClear, bl === Infinity ? 'no band' : `least ${bl.toFixed(2)} units`);
  const dl = dotsLeast(svg);
  check(`L6 in ${name}, every dot lies on a drawn connector and keeps the minimum clear of every other connector and every head`, dl.onLine && dl.least >= GM.minClear, dl.least === Infinity ? 'no dot' : `least ${dl.least.toFixed(2)} units`);
  const rl = rulesLeast(svg);
  check(`L7 in ${name}, no notation text comes within 1.5 units of a fraction rule of its own`, rl >= 1.5, rl === Infinity ? 'no rule' : `least ${rl.toFixed(2)} units`);
  const en = enclosed(svg, spec);
  check(`L8 in ${name}, every annotation's drawn ink lies inside the box the engine validated for it`, en.length === 0, en.join(', '));
}

/* ---------------------------------------------------------------- F // fonts, tokens, export */
const fontSha = (p) => sha256(fs.readFileSync(path.join(ROOT, p)));
check('F1 the glyph carrier records the canonical fonts', ['roman', 'italic', 'mono'].every((k) => G.sources[k].sha256 === fontSha(G.sources[k].path)));
check('F2 the font carrier records the canonical fonts', ['roman', 'italic', 'mono'].every((k) => FONT.sources[k].sha256 === fontSha(FONT.sources[k].path)));
/* The WOFF2 itself: the table directory, the Brotli stream, then cmap (format 4 or 12) and post (format 2). */
function woff2Tables(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not WOFF2');
  const TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
  const numTables = buf.readUInt16BE(12), compressed = buf.readUInt32BE(20);
  let p = 48;
  const b128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const c = buf[p++]; v = v * 128 + (c & 0x7f); if (!(c & 0x80)) return v; } throw new Error('bad UIntBase128'); };
  const dir = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[p++], ti = flags & 0x3f, ver = flags >> 6;
    let tag = TAGS[ti]; if (ti === 63) { tag = buf.toString('latin1', p, p + 4); p += 4; }
    const orig = b128(), transformed = (tag === 'glyf' || tag === 'loca') ? ver === 0 : ver !== 0;
    dir.push({ tag, len: transformed ? b128() : orig });
  }
  const data = zlib.brotliDecompressSync(buf.subarray(p, p + compressed)), out = {};
  let off = 0; for (const t of dir) { out[t.tag] = data.subarray(off, off + t.len); off += t.len; }
  if (!out.head || out.head.readUInt32BE(12) !== 0x5F0F3CF5) throw new Error('the table stream did not parse');
  return out;
}
function glyphsForCode(cmap, code) {
  const out = [];
  for (let i = 0, n = cmap.readUInt16BE(2); i < n; i++) {
    const pid = cmap.readUInt16BE(4 + i * 8), eid = cmap.readUInt16BE(6 + i * 8), o = cmap.readUInt32BE(8 + i * 8), fmt = cmap.readUInt16BE(o);
    if (!(pid === 0 || (pid === 3 && (eid === 1 || eid === 10)))) continue;
    if (fmt === 4) {
      const seg2 = cmap.readUInt16BE(o + 6), seg = seg2 / 2;
      for (let k = 0; k < seg; k++) {
        const end = cmap.readUInt16BE(o + 14 + 2 * k), start = cmap.readUInt16BE(o + 16 + seg2 + 2 * k);
        if (code < start || code > end) continue;
        const delta = cmap.readInt16BE(o + 16 + 2 * seg2 + 2 * k), roAt = o + 16 + 3 * seg2 + 2 * k, ro = cmap.readUInt16BE(roAt);
        let g = ro === 0 ? (code + delta) & 0xffff : cmap.readUInt16BE(roAt + ro + 2 * (code - start));
        if (ro !== 0 && g !== 0) g = (g + delta) & 0xffff;
        out.push(g); break;
      }
    } else if (fmt === 12) {
      for (let k = 0, n12 = cmap.readUInt32BE(o + 12); k < n12; k++) { const at = o + 16 + 12 * k, s = cmap.readUInt32BE(at), e = cmap.readUInt32BE(at + 4); if (code >= s && code <= e) { out.push(cmap.readUInt32BE(at + 8) + code - s); break; } }
    }
  }
  return out;
}
function glyphName(post, gid) {
  if (post.readUInt32BE(0) !== 0x00020000) return null;
  const n = post.readUInt16BE(32), idx = post.readUInt16BE(34 + 2 * gid);
  if (idx < 258) return 'standard:' + idx;
  let p = 34 + 2 * n; for (let k = 258; k < idx; k++) p += 1 + post[p];
  return post.toString('latin1', p + 1, p + 1 + post[p]);
}
const tailOf = (woff2) => { const t = woff2Tables(woff2), gs = glyphsForCode(t.cmap, 0x6C); return gs.length && gs.every((g) => g === gs[0]) ? glyphName(t.post, gs[0]) : 'inconsistent maps: ' + gs.join(','); };
const italicSubset = Buffer.from(FONT.css.match(/font-style:italic;[^}]*?base64,([A-Za-z0-9+/=]+)/)[1], 'base64');
const advanceOfL = (woff2) => { const t = woff2Tables(woff2), g = glyphsForCode(t.cmap, 0x6C)[0], upem = t.head.readUInt16BE(18), nh = t.hhea.readUInt16BE(34);
  return t.hmtx.readUInt16BE(4 * Math.min(g, nh - 1)) / upem; };
const f3 = (woff2) => tailOf(woff2) === FONT.subsets.italic.tail && Math.abs(advanceOfL(woff2) - G.faces.italic.em.l) < 0.00006;
check('F3 the italic subset\'s own character map sends l to the tailed glyph, read from the WOFF2, and the glyph carrier\'s italic l advance is that glyph\'s',
  sha256(italicSubset) === FONT.subsets.italic.sha256 && G.faces.italic.tail === FONT.subsets.italic.tail && f3(italicSubset),
  `l -> ${tailOf(italicSubset)}, advance ${advanceOfL(italicSubset).toFixed(4)} em, carrier ${G.faces.italic.em.l}`);
check('F4 the font carrier embeds three faces under private families, and both licenses', (FONT.css.match(/@font-face/g) || []).length === 3
  && /^dsn-inter-[0-9a-f]{12}$/.test(FONT.families.sans) && /^dsn-mono-[0-9a-f]{12}$/.test(FONT.families.mono) && !/font-family:'(Inter|JetBrains Mono)'/.test(FONT.css)
  && ['roman', 'italic', 'mono'].every((k) => FONT.subsets[k].args.includes('--layout-features='))
  && FONT.licenses.inter === fs.readFileSync(path.join(ROOT, 'fonts/Inter-OFL.txt'), 'utf8') && FONT.licenses.mono === fs.readFileSync(path.join(ROOT, 'fonts/JetBrainsMono-OFL.txt'), 'utf8'),
  `${FONT.families.sans}, ${FONT.families.mono}`);
const { exportAll, readThemes } = await import(pathToFileURL(path.join(DIR, 'export-network.mjs')).href);
const themes = readThemes(fs.readFileSync(path.join(ROOT, 'colors_and_type.css'), 'utf8'));
check('F5 the exporter resolves the canonical tokens', themes.light.ink === '#6A637F' && themes.dark.ink === '#D4C6E1' && themes.light.fieldFrom === '#D4C6E1' && themes.dark.fieldTo === '#0A090C');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'network-test-'));
try {
  const opts = (out, source = path.join(DIR, 'diagram-static-network.source.js')) => ({ out: path.join(tmp, out), tokens: path.join(ROOT, 'colors_and_type.css'), source, specs: [], png: false, chrome: null, scale: 1 });
  const a = exportAll(opts('a')), b = exportAll(opts('b'));
  check('F6 the exporter writes eight files, and the same bytes twice', a.svg.length === 8 && a.svg.every((f, i) => f.sha256 === b.svg[i].sha256));
  const files = a.svg.map((f) => ({ name: path.basename(f.file), text: fs.readFileSync(f.file, 'utf8') }));
  const ref = files.filter((f) => f.name.includes('forward-backward')), sp = files.filter((f) => f.name.includes('sparse'));
  check('F7 every file of the credited specimen draws the credit; no file of the uncredited one draws a credit',
    ref.length === 4 && ref.every((f) => creditText(f.text) === FB.credit) && sp.length === 4 && sp.every((f) => !/class="t credit"/.test(f.text)));
  const xmlEsc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  check('F8 every file embeds the three subsets, names the private families first, carries both license texts in full and leaves no var()',
    files.every((f) => (f.text.match(/@font-face\{font-family:'dsn-(inter|mono)-[0-9a-f]{12}'/g) || []).length === 3
      && f.text.includes(`font-family:'${FONT.families.sans}', 'Inter'`) && f.text.includes(`font-family:'${FONT.families.mono}', 'JetBrains Mono'`)
      && f.text.includes(xmlEsc(FONT.licenses.inter)) && f.text.includes(xmlEsc(FONT.licenses.mono)) && !/var\(/.test(f.text)));
  const has = (f, ...v) => v.every((x) => f.text.includes(x));
  check('F9 every file writes its theme\'s resolved field and ink', files.every((f) => f.name.endsWith('-light.svg')
    ? has(f, 'stop-color:#D4C6E1', 'stop-color:#E2D3F0', 'fill:#6A637F') : has(f, 'stop-color:#201D26', 'stop-color:#0A090C', 'fill:#D4C6E1')));
  const ids = files.flatMap((f) => [...f.text.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
  check('F10 no element id is shared between any two exported files', new Set(ids).size === ids.length, `${ids.length} ids`);
  const badSource = path.join(tmp, 'bad.source.js'), broken = clone(SPECS);
  broken[0].edges.push(['in.0', 'out.0']); fs.writeFileSync(badSource, 'module.exports = ' + JSON.stringify(broken) + ';');
  let refused = false;
  try { exportAll(opts('c', badSource)); } catch (e) { refused = /nothing written/.test(e.message); }
  check('F11 the exporter validates before writing: a broken source writes nothing', refused && !fs.existsSync(path.join(tmp, 'c')));
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

/* ---------------------------------------------------------------- X // negative controls */
const dense = clone(FB); dense.edges = [];
FB.layers.forEach((L, li) => { if (li + 1 < FB.layers.length) for (let p = 0; p < L.n; p++) for (let q = 0; q < FB.layers[li + 1].n; q++) dense.edges.push([L.id + '.' + p, FB.layers[li + 1].id + '.' + q]); });
check('X1 P2 bites: a fully connected 3-4-3-2 network is not the source-read topology', !referenceTopology(dense), `${dense.edges.length} edges`);
const FIRST_PICK = ['          if (!pick || c > pick.clear + 0.5) pick = cand;', '          if (!pick) pick = cand;'];
const GUARD = ['for (const w of L.weights) if (w.clear < G.minClear) errors.push(', 'for (const w of L.weights) if (false) errors.push('];
check('X2 the engine\'s own guard bites: keeping the first placement is WEIGHT_CLEARANCE', codes(mutate(FIRST_PICK), FB).includes('WEIGHT_CLEARANCE'));
const unguarded = mutate(FIRST_PICK, GUARD), firstSvg = unguarded.render(FB, { glyphs: G });
check('X3 L1 bites independently: with that guard disabled, the read-back finds the overlap', leastClear(firstSvg).least < GM.minClear, `least ${leastClear(firstSvg).least.toFixed(2)} units`);
// the former sampled clearance: an 11 x 5 grid of points, which a connector can pass between
const EXACT_BODY = ENGINE_SRC.slice(ENGINE_SRC.indexOf('  function boxClearance(box, paint) {'), ENGINE_SRC.indexOf('    return Math.max(0, best);\n  }', ENGINE_SRC.indexOf('  function boxClearance(box, paint) {')));
const SAMPLED = [EXACT_BODY, `  function boxClearance(box, paint) {
    let best = Infinity;
    for (let a = 0; a <= 10; a++) for (let c = 0; c <= 4; c++) {
      const p = { x: box.x0 + (box.x1 - box.x0) * a / 10, y: box.y0 + (box.y1 - box.y0) * c / 4 };
      for (const s of paint.lines) best = Math.min(best, segDist(p, s[0], s[1]) - s[2] / 2);
      for (const h of paint.heads) { if (inPoly(p, h)) return 0; for (let i = 0; i < h.length; i++) best = Math.min(best, segDist(p, h[i], h[(i + 1) % h.length])); }
      for (const r of paint.rings) best = Math.min(best, Math.hypot(p.x - r.x, p.y - r.y) - (G.node + G.nodeStroke / 2));
    }
`];
const sampled = mutate(SAMPLED), denseSvg = sampled.validate(DENSE(WIDE), G).ok ? sampled.render(DENSE(WIDE), { glyphs: G }) : null;
check('X4 V16 and L1 bite: a sampled clearance accepts the wide label, and the read-back finds the connector through it',
  denseSvg !== null && leastClear(denseSvg).least < GM.minClear, denseSvg ? `least ${leastClear(denseSvg).least.toFixed(2)} units` : 'the sampled engine refused it');
const NETWORK_ONLY = ['    const reach = Math.max(x - G.panelGap, ...boxesAbove.map((b) => b.x1), ...notes.map((n) => n.box.x1), credit ? credit.box.x1 : 0);',
  '    const reach = x - G.panelGap;'];
const BOUNDS = ['      if (b.x0 < 0 || b.y0 < 0 || b.x1 > L.plateW || b.y1 > L.plateH) errs.push(', '      if (false) errs.push('];
check('X5 the engine\'s bounds guard bites: a plate sized to its networks alone is LAYOUT_BOUNDS for the one-panel credited probe', codes(mutate(NETWORK_ONLY), NARROW).includes('LAYOUT_BOUNDS'));
const clipped = mutate(NETWORK_ONLY, BOUNDS).render(NARROW, { glyphs: G });
check('X6 L2 bites independently: with that guard disabled, the read-back finds the credit outside the plate', outside(clipped).some((t) => FB.credit.startsWith(t)), outside(clipped).join(', '));
const COLLIDE = ['      if (c < G.minClear) errs.push({ code: \'ANNOTATION_COLLISION\', path: \'spec\',', '      if (false) errs.push({ code: \'ANNOTATION_COLLISION\', path: \'spec\','];
check('X7 V17 bites: without the pairwise guard, overprinting equation lines validate', mutate(COLLIDE).validate(OVERPRINT(), G).ok);
const noCredit = mutate(["    if (spec.credit) out.push(", "    if (spec.credit && annotated) out.push("]);
check('X8 R3 bites: an engine that drops the drawn credit in the art view fails the credit check', creditText(noCredit.render(FB, { glyphs: G, mode: 'art' })) !== FB.credit);
const noTail = mutate(["+ '#' + pre + ' .ti{font-style:italic;font-feature-settings:\"cv05\"}'", "+ '#' + pre + ' .ti{font-style:italic}'"]);
check('X9 R9 bites: an engine that drops cv05 fails the italic-feature check', !r9(noTail.render(FB, { glyphs: G })));
const plainItalic = fs.readFileSync(path.join(ROOT, G.sources.italic.path));
check('X10 F3 bites: the canonical italic font, whose l is not remapped, does not read as the tail', tailOf(plainItalic) !== FONT.subsets.italic.tail, `canonical l -> ${tailOf(plainItalic)}`);
const PAGE_BARE = PAGE.split("'.network-mode[data-mode]'").join("'[data-mode]'");
check('X11 R11 bites: the page\'s former bare [data-mode] selector fails it', !r11(PAGE_BARE));
const FIXED_FRAC = ['        place(glyphs, it.frac[0], x + (w - wn) / 2, axis - gap - en.down, z, emit);\n        place(glyphs, it.frac[1], x + (w - wd) / 2, axis + gap + ed.up, z, emit);',
  '        place(glyphs, it.frac[0], x + (w - wn) / 2, axis - size * 0.2, z, emit);\n        place(glyphs, it.frac[1], x + (w - wd) / 2, axis + size * 0.78, z, emit);'];
const fixedFrac = mutate(FIXED_FRAC);
check('X12 L7 bites: the former fixed fraction offsets draw the nested probe\'s operands into their bars', fixedFrac.validate(NESTED, G).ok && rulesLeast(fixedFrac.render(NESTED, { glyphs: G })) < 1.5,
  `least ${rulesLeast(fixedFrac.render(NESTED, { glyphs: G })).toFixed(2)} units`);
const ADVANCE_SPAN = ['      for (const ch of p.text) { const b = glyphs.faces[p.face].ink[ch]; if (b) { l = Math.min(l, px + b[0] * p.size); r = Math.max(r, px + b[2] * p.size); } px += glyphs.faces[p.face].em[ch] * p.size; }',
  '      for (const ch of p.text) { const b = glyphs.faces[p.face].ink[ch]; if (b) { l = Math.min(l, px); r = Math.max(r, px + glyphs.faces[p.face].em[ch] * p.size); } px += glyphs.faces[p.face].em[ch] * p.size; }'];
const advanceSpan = mutate(ADVANCE_SPAN);
check('X13 L8 bites: a box built from advances, not ink, does not hold the overhang probe\'s drawn ink', enclosed(advanceSpan.render(OVERHANG, { glyphs: G }), OVERHANG, advanceSpan).length > 0,
  enclosed(advanceSpan.render(OVERHANG, { glyphs: G }), OVERHANG, advanceSpan).join(', '));
const DOT_PROBE = { id: 'probe.dot', layers: [{ id: 'a', n: 8 }, { id: 'b', n: 3 }], edges: [['a.2', 'b.1'], ['a.0', 'b.2']], weights: [{ from: 'a.2', to: 'b.1', label: [I('w'), { sub: [I('ij')] }] }], panels: [{ direction: 'up' }] };
const noDot = mutate(['          c = Math.min(c, Math.max(0, dotClear(pan, m, ownLine)));', '']);
check('X14 L6 bites: without the dot\'s own clearance, the dot probe validates and its dot lands near the other connector', noDot.validate(DOT_PROBE, G).ok && dotsLeast(noDot.render(DOT_PROBE, { glyphs: G })).least < GM.minClear,
  `least ${dotsLeast(noDot.render(DOT_PROBE, { glyphs: G })).least.toFixed(2)} units; the shipped engine: ${N.validate(DOT_PROBE, G).ok ? 'validates, least ' + dotsLeast(N.render(DOT_PROBE, { glyphs: G })).least.toFixed(2) : 'refuses'}`);
const creditOnNote = mutate([`'" y="' + fmt(L.creditY) + '"`, `'" y="' + fmt(L.notesY[0]) + '"`]);
check('X15 L4 bites: an engine that draws the credit on the first note fails the annotation read-back', textTextLeast(creditOnNote.render(FB, { glyphs: G })).least < GM.minClear);
check('X16 L3 bites: a plate with a text the parser cannot read fails it', !parsedAll(ann.replace('<text class="t note" x=', '<text data-x="1" class="t note" x=')));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
