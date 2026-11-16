#!/usr/bin/env node
/* network-host-inheritance.mjs — the static layered-network plate under a host's inherited styles.

     node tests/network-host-inheritance.mjs              run every check; exit 1 on any failure
     node tests/network-host-inheritance.mjs --out DIR    and keep results.json and the review PNGs in DIR

   It exports every spec as a consumer would (export-network.mjs: annotated and art, light and dark),
   serves this repository read-only on 127.0.0.1 and opens the specimen page in headless Chrome (Node 22+,
   Chrome at $CHROME or the default locations; no npm dependency). Each exported SVG is inlined, unchanged,
   into a control host and into hosts that each carry ordinary inherited styles a page may set — text
   anchoring, baseline, direction, writing mode, white space, the face's style, weight, width, variants and
   size adjustment, spacing and case, kerning and features, rendering, stroke and shadow — and into one host
   that sets all of them. One spec is also mounted through the page's engine into the control and the
   combined host. After the fonts load it reads, for every text, where its first character starts, its
   length and box, its computed style and the platform font that drew it, and compares them with the
   control and with the advances in the glyph carrier.

   The negative controls run a plate whose rules declare only what the first version declared, under the
   inherited anchor, baseline, italic and stroke, and require the checks to fail on it for those reasons.
   The guarantee is about inheritance: a stylesheet rule written against the plate's own elements is not
   part of it. */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'patterns', 'diagram-static-network');
const GLYPHS = createRequire(import.meta.url)(path.join(DIR, 'diagrams-static-network-glyphs.js'));
const args = process.argv.slice(2);
if (!(args.length === 0 || (args.length === 2 && args[0] === '--out'))) { console.error('usage: network-host-inheritance.mjs [--out DIR]'); process.exit(2); }
const KEEP = args.length === 2;
const OUT = KEEP ? path.resolve(args[1]) : fs.mkdtempSync(path.join(os.tmpdir(), 'network-host-inheritance-'));
fs.mkdirSync(OUT, { recursive: true });

/* ----------------------------------------------------------- browser -- */
function chromePath() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!c) { console.error('Chrome not found; set $CHROME'); process.exit(2); }
  return c;
}
async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'network-host-inheritance-chrome-'));
  const child = spawn(chromePath(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const exited = new Promise((r) => child.once('exit', r));
  for (let i = 0; i < 150; i++) {
    try { const port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      if (port && (await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return { child, profile, exited, port }; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Chrome did not start');
}
async function stop(b) {
  try { b.child.kill(); } catch { /* gone */ }
  await Promise.race([b.exited, new Promise((r) => setTimeout(r, 4000))]);
  try { fs.rmSync(b.profile, { recursive: true, force: true }); } catch { /* best effort */ }
}
function serve(root) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
                  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(root, u);
    if (req.method !== 'GET' || !f.startsWith(root + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}
async function page(b, url) {
  const tgt = await (await fetch(`http://127.0.0.1:${b.port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(), errors = []; let loaded; const onLoad = new Promise((r) => { loaded = r; });
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const q = pending.get(m.id); pending.delete(m.id); m.error ? q.rej(new Error(JSON.stringify(m.error))) : q.res(m.result); }
    if (m.method === 'Page.loadEventFired') loaded();
    if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
  });
  const call = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await call('Page.enable'); await call('Runtime.enable'); await call('DOM.enable'); await call('CSS.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1400, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Page.navigate', { url });
  await Promise.race([onLoad, new Promise((r) => setTimeout(r, 15000))]);
  const evaluate = async (expression) => { const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await evaluate('document.fonts.ready');
  const close = async () => { try { ws.close(); } catch { /* closed */ } await fetch(`http://127.0.0.1:${b.port}/json/close/${tgt.id}`).catch(() => {}); };
  return { call, evaluate, close, errors };
}

/* ------------------------------------------------------------ hosts -- */
// Ordinary inherited styles a page may set on a container. Each is set on the host element only; the
// plate inherits it through <svg> and <g>. One host sets them all at once.
const HOSTS = {
  'anchor-middle': 'text-anchor: middle',
  'anchor-end': 'text-anchor: end',
  'baseline-middle': 'dominant-baseline: middle',
  'baseline-hanging': 'dominant-baseline: hanging',
  'italic': 'font-style: italic',
  'bold': 'font-weight: 700',
  'condensed': 'font-stretch: condensed',
  'small-caps': 'font-variant: small-caps',
  'size-adjust': 'font-size-adjust: 0.6',
  'spacing-case': 'letter-spacing: 3px; word-spacing: 6px; text-transform: uppercase',
  'features': 'font-kerning: normal; font-feature-settings: "liga" 1, "kern" 1, "ss02" 1; font-variation-settings: "wght" 800; font-synthesis: weight style; font-optical-sizing: auto',
  'rtl': 'direction: rtl',
  'vertical': 'writing-mode: vertical-rl; text-orientation: upright',
  'white-space': 'white-space: pre-wrap',
  'rendering': 'text-rendering: optimizeSpeed',
  'stroke-shadow': 'stroke: #e00; stroke-width: 4px; text-shadow: 0 0 6px #e00',
};
HOSTS.all = Object.values(HOSTS).join('; ').replace('text-anchor: end; ', '').replace('dominant-baseline: hanging; ', '');

/* the first version's rules: only kerning, ligatures, features, variations, synthesis, spacing and case;
   no stroke rule on heads, dots or the field */
function firstVersionRules(svg) {
  let n = 0;
  const out = svg.replace(/( \.t\{font-family:)([^;]+);font-style:normal;font-weight:400;font-stretch:normal;font-size-adjust:none;font-variant:normal;fill:([^;]+);stroke:none;text-shadow:none;(font-optical-sizing:none;font-kerning:none;font-variant-ligatures:none;font-feature-settings:normal;font-variation-settings:normal;font-synthesis:none;letter-spacing:0;word-spacing:0;text-transform:none);text-anchor:start;dominant-baseline:alphabetic;direction:ltr;writing-mode:horizontal-tb;text-orientation:mixed;white-space:pre;text-rendering:auto\}/,
    (m, a, fam, ink, rest) => { n++; return `${a}${fam};font-weight:400;fill:${ink};${rest}}`; })
    .replace(/( \.dot\{fill:[^;}]+);stroke:none\}/, (m, a) => { n++; return a + '}'; })
    .replace(/#[A-Za-z0-9_-]+>rect\{stroke:none\}/, () => { n++; return ''; });
  return n === 3 ? out : null;
}

const results = [];
function check(id, name, ok, detail) {
  results.push({ id, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${name}${detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`);
}

/* ---------------------------------------------------------- exports -- */
const EXP = fs.mkdtempSync(path.join(os.tmpdir(), 'network-host-inheritance-export-'));
execFileSync(process.execPath, [path.join(DIR, 'export-network.mjs'), '--out', EXP, '--tokens', path.join(ROOT, 'colors_and_type.css')], { stdio: ['ignore', 'ignore', 'inherit'] });
const PLATES = fs.readdirSync(EXP).filter((f) => f.endsWith('.svg')).sort().map((f) => ({ file: f, svg: fs.readFileSync(path.join(EXP, f), 'utf8') }));
fs.rmSync(EXP, { recursive: true, force: true });

/* what the layout measured: the glyph carrier's advances for a run's face and size */
const faceOf = (cls) => { const c = cls.split(' '); return c.includes('ti') ? 'italic' : c.includes('tm') ? 'mono' : c.includes('ts') ? 'sigma' : 'roman'; };
const modelLength = (cls, text, size) => { let w = 0; for (const ch of text) w += GLYPHS.faces[faceOf(cls)].em[ch] * size; return w; };

const b = await launch();
const { srv, base } = await serve(ROOT);
let p;
const TOL = 0.01;
try {
  p = await page(b, `${base}/patterns/diagram-static-network/diagram-static-network.html`);
  await p.evaluate(`(() => { const c = document.createElement('div'); c.id = 'nhi';
    c.style.cssText = 'position:absolute;left:0;top:0;z-index:99;background:#fff;padding:0;margin:0';
    document.body.appendChild(c); return true; })()`);

  /* render one plate in one host and read every text, head and dot */
  async function measure(hostStyle, html) {
    await p.evaluate(`(() => { const c = document.getElementById('nhi'); c.innerHTML = '';
      const h = document.createElement('div'); h.id = 'nhi-host'; h.setAttribute('style', ${JSON.stringify(hostStyle)});
      h.innerHTML = ${JSON.stringify(html)}; c.appendChild(h); return true; })()`);
    return read(hostStyle);
  }
  async function read(hostStyle = '') {
    const r = await p.evaluate(`(async () => {
      // a host declaration the browser dropped would leave its host testing nothing
      const host = document.getElementById('nhi-host');
      const dropped = ${JSON.stringify(hostStyle)}.split(';').map((d) => d.trim()).filter(Boolean)
        .map((d) => d.slice(0, d.indexOf(':')).trim()).filter((prop) => host.style.getPropertyValue(prop) === '');
      for (const t of document.querySelectorAll('#nhi-host text')) t.getBBox();
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const svg = document.querySelector('#nhi-host svg'), vb = svg.viewBox.baseVal;
      const faces = [...document.fonts].filter((f) => /dsn-/.test(f.family)).map((f) => f.status);
      const texts = [...svg.querySelectorAll('text')].map((t) => {
        const s = t.getStartPositionOfChar(0), bb = t.getBBox(), cs = getComputedStyle(t);
        return { cls: t.getAttribute('class'), text: t.textContent, x: +t.getAttribute('x'), y: +t.getAttribute('y'), size: +t.getAttribute('font-size'),
          sx: s.x, sy: s.y, len: t.getComputedTextLength(), bb: [bb.x, bb.y, bb.width, bb.height],
          style: cs.fontStyle, stroke: cs.stroke, shadow: cs.textShadow };
      });
      const marks = [...svg.querySelectorAll('.head, .dot, rect')].map((e) => getComputedStyle(e).stroke);
      const paint = [...svg.querySelectorAll('.head, .dot, .ring, .edge, stop')].map((e) => { const c = getComputedStyle(e); return [c.fill, c.stroke, c.stopColor].join(' '); });
      return { w: vb.width, h: vb.height, faces, texts, marks, paint, dropped };
    })()`);
    // the platform font that drew each text, read from the browser
    const doc = await p.call('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await p.call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: '#nhi-host svg text' });
    for (let i = 0; i < nodeIds.length; i++) {
      const f = (await p.call('CSS.getPlatformFontsForNode', { nodeId: nodeIds[i] })).fonts;
      r.texts[i].font = f.map((x) => x.postScriptName || x.familyName).join('+');
    }
    return r;
  }
  async function shot(file) {
    const box = await p.evaluate(`(() => { const r = document.querySelector('#nhi-host svg').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`);
    const s = await p.call('Page.captureScreenshot', { format: 'png', clip: { x: box[0], y: box[1], width: box[2], height: box[3], scale: 1 } });
    fs.writeFileSync(path.join(OUT, file), Buffer.from(s.data, 'base64'));
  }

  const outside = (m) => m.texts.filter((t) => t.bb[0] < -TOL || t.bb[1] < -TOL || t.bb[0] + t.bb[2] > m.w + TOL || t.bb[1] + t.bb[3] > m.h + TOL);
  const moved = (m, c) => {
    let most = 0; const which = [];
    m.texts.forEach((t, i) => { const k = c.texts[i];
      const d = Math.max(Math.abs(t.sx - k.sx), Math.abs(t.sy - k.sy), Math.abs(t.len - k.len), ...t.bb.map((v, j) => Math.abs(v - k.bb[j])));
      if (d > TOL) which.push(t.text); most = Math.max(most, d); });
    return { most: +most.toFixed(3), which };
  };
  const faceOff = (m, c) => m.texts.filter((t, i) => t.font !== c.texts[i].font || (t.style === 'italic') !== / ti\b/.test(t.cls)).map((t) => t.text);
  // every private face the plate uses has loaded: none is still loading or failed (an unused face stays unloaded)
  const settled = (m) => m.faces.length > 0 && m.faces.every((s) => s === 'loaded' || s === 'unloaded') && (m.texts.length === 0 || m.faces.includes('loaded'));
  const ink = (m) => m.texts.filter((t) => t.stroke !== 'none' || t.shadow !== 'none').length + m.marks.filter((s) => s !== 'none').length;

  /* ------------------------------------------------------- I1 control -- */
  const control = {}, model = { runs: 0, most: 0 }, I1bad = [];
  let faceNames = new Set();
  for (const P of PLATES) {
    const m = await measure('', P.svg);
    control[P.file] = m;
    for (const t of m.texts) {
      model.runs++;
      const want = modelLength(t.cls, t.text, t.size), d = Math.abs(t.len - want);
      model.most = Math.max(model.most, d);
      // the carrier rounds each advance to 4 decimals of an em, and Chrome reports lengths on a 1/64-unit grid:
      // allow 0.0001 of the size per character and 0.02 units for the grid
      if (Math.abs(t.sx - t.x) > TOL || Math.abs(t.sy - t.y) > TOL || d > 0.0001 * t.size * [...t.text].length + 0.02) I1bad.push(`${P.file}: ${t.text}`);
      faceNames.add(`${faceOf(t.cls)}=${t.font}`);
    }
    if (outside(m).length || !settled(m)) I1bad.push(`${P.file}: outside ${outside(m).length}, faces ${m.faces.join(',')}`);
  }
  faceNames = [...faceNames].sort();
  const roman = faceNames.filter((f) => /^(roman|sigma)=/.test(f)), italic = faceNames.filter((f) => f.startsWith('italic='));
  check('I1', 'in the control host every exported plate draws what its layout measured: each text starts at its x and y, its length is the glyph carrier\'s advances within the rounding and grid allowance, no text leaves the plate, and every private face loaded',
    PLATES.length === 8 && model.runs > 0 && I1bad.length === 0, { plates: PLATES.length, runs: model.runs, mostModelDelta: +model.most.toFixed(4), bad: I1bad.slice(0, 5) });
  check('I2', 'the control draws roman and sigma runs with the roman face and italic runs with the italic face',
    roman.length > 0 && italic.length > 0 && roman.every((f) => !/italic/i.test(f)) && italic.every((f) => /italic/i.test(f)), { faces: faceNames });
  if (KEEP) { await measure('', PLATES.find((x) => x.file === 'network.forward-backward_annotated-light.svg').svg); await shot('control_forward-backward_annotated-light.png'); }

  /* ------------------------------------------------- I3 inherited hosts -- */
  for (const [name, style] of Object.entries(HOSTS)) {
    const per = [];
    for (const P of PLATES) {
      const m = await measure(style, P.svg), c = control[P.file], mv = moved(m, c);
      per.push({ plate: P.file, moved: mv.which.length, most: mv.most, outside: outside(m).length, face: faceOff(m, c).length, ink: ink(m), loaded: settled(m), dropped: m.dropped });
      if (KEEP && P.file === 'network.forward-backward_annotated-light.svg' && (name === 'anchor-middle' || name === 'all')) await shot(`host-${name}_forward-backward_annotated-light.png`);
    }
    const bad = per.filter((q) => q.moved || q.outside || q.face || q.ink || !q.loaded || q.dropped.length);
    check(`I3.${name}`, `with every declaration applied, under the host's ${style.length > 60 ? 'combined styles' : style}, every exported plate's texts start, measure and box as in the control, keep their faces, stay inside the plate, and text, heads, dots and the field\'s rectangle take no stroke, and text no shadow`,
      bad.length === 0, bad.length ? bad.slice(0, 3) : { plates: per.length });
  }

  /* --------------------------------------------- I4 mounted through the engine -- */
  const mountIn = async (style) => {
    await p.evaluate(`(() => { const c = document.getElementById('nhi'); c.innerHTML = '';
      const h = document.createElement('div'); h.id = 'nhi-host'; h.setAttribute('style', ${JSON.stringify(style)}); c.appendChild(h);
      const spec = window.NETWORK_DIAGRAMS.find((s) => s.id === 'network.forward-backward');
      window.DIAGRAM_NETWORK.mount(h, spec, { glyphs: window.DIAGRAM_NETWORK_GLYPHS }); return true; })()`);
    return read(style);
  };
  const mc = await mountIn(''), ma = await mountIn(HOSTS.all), mmv = moved(ma, mc);
  check('I4', 'mounted through the engine with the page\'s theme, the reference plate under all the host styles at once starts, measures, boxes and faces as in the control host',
    mc.texts.length > 0 && mmv.which.length === 0 && outside(ma).length === 0 && faceOff(ma, mc).length === 0 && ink(ma) === 0 && outside(mc).length === 0 && ma.dropped.length === 0,
    { texts: mc.texts.length, moved: mmv.which.length, most: mmv.most, outside: outside(ma).length, face: faceOff(ma, mc).length });

  /* ------------------------------------------------------ negative controls -- */
  const REF = PLATES.find((x) => x.file === 'network.forward-backward_annotated-light.svg');
  const first = firstVersionRules(REF.svg);
  check('N0', 'the first version\'s rules are reconstructed from the reference plate: its text rule without the stated anchoring, baseline, direction, writing mode, white space, face, ink and rendering, and no stroke rule on heads, dots or the field', first !== null);
  if (first) {
    const c = await measure('', first), cmv = moved(c, control[REF.file]);
    const paintSame = JSON.stringify(c.paint) === JSON.stringify(control[REF.file].paint);
    check('N1', 'with the first version\'s rules and no host style, the reference plate measures and paints as the current one: the declarations change nothing an ordinary host shows',
      cmv.which.length === 0 && faceOff(c, control[REF.file]).length === 0 && paintSame && c.paint.length > 0, { most: cmv.most, paintSame, painted: c.paint.length });
    const a = await measure(HOSTS['anchor-middle'], first), amv = moved(a, control[REF.file]);
    const note = (m) => m.texts.find((t) => t.cls === 't note'), credit = (m) => m.texts.find((t) => t.cls === 't credit');
    check('N2', 'I3 bites: with the first version\'s rules, an inherited text-anchor: middle moves the texts and draws some outside the plate',
      amv.which.length > 0 && outside(a).length > 0, { moved: amv.which.length, outside: outside(a).length, noteLeft: +note(a).bb[0].toFixed(2), creditLeft: +credit(a).bb[0].toFixed(2), controlNoteLeft: +note(control[REF.file]).bb[0].toFixed(2) });
    if (KEEP) await shot('first-version-rules_host-anchor-middle_forward-backward_annotated-light.png');
    const bl = await measure(HOSTS['baseline-middle'], first), blmv = moved(bl, control[REF.file]);
    const dy = Math.max(...bl.texts.map((t, i) => Math.abs(t.bb[1] - control[REF.file].texts[i].bb[1])));
    check('N3', 'I3 bites: with the first version\'s rules, an inherited dominant-baseline: middle moves the texts vertically', blmv.which.length > 0 && dy > TOL, { moved: blmv.which.length, mostDy: +dy.toFixed(2) });
    const it = await measure(HOSTS.italic, first), itf = faceOff(it, control[REF.file]);
    const fwd = (m) => m.texts.find((t) => t.text === 'Forward pass');
    check('N4', 'I3 bites: with the first version\'s rules, an inherited font-style: italic draws roman text with the italic face and changes its length',
      itf.length > 0 && fwd(it) && /italic/i.test(fwd(it).font) && Math.abs(fwd(it).len - fwd(control[REF.file]).len) > TOL,
      { faceChanged: itf.length, forwardPass: fwd(it) && { control: +fwd(control[REF.file]).len.toFixed(2), italic: +fwd(it).len.toFixed(2), font: fwd(it).font } });
    const st = await measure(HOSTS['stroke-shadow'], first);
    check('N5', 'I3 bites: with the first version\'s rules, an inherited stroke strokes the text, heads, dots and the field\'s rectangle', ink(st) > 0, { stroked: ink(st) });
  }
  check('P1', 'the page raised no exception', p.errors.length === 0, p.errors.slice(0, 3));
} catch (e) {
  check('RUN', 'the harness completed', false, String(e && e.stack || e));
} finally {
  if (p) await p.close();
  srv.close();
  await stop(b);
}

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ chrome: chromePath(), results }, null, 1) + '\n');
console.log(`\n${results.length - failed.length}/${results.length} checks passed${KEEP ? '; results and review PNGs in ' + OUT : ''}`);
if (!KEEP) fs.rmSync(OUT, { recursive: true, force: true });
process.exit(failed.length ? 1 : 0);
