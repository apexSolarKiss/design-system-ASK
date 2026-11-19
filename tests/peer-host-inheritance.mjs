#!/usr/bin/env node
/* peer-host-inheritance.mjs — the static peer plate under a host's inherited styles.

     node tests/peer-host-inheritance.mjs              run every check; exit 1 on any failure
     node tests/peer-host-inheritance.mjs --out DIR    and keep results.json and the review PNGs in DIR

   It exports every spec as a consumer would (export-peer.mjs: art plate and keyed, light and dark, with the
   heads at the target and at the midpoint; a declared semantic example keyed only, its roles resolved from
   the systems' stylesheets), serves this repository read-only on 127.0.0.1 and opens the
   specimen page in headless Chrome (Node 22+, Chrome at $CHROME or the default locations; no npm
   dependency). Each exported SVG is inlined, unchanged, into a control host and into hosts that each carry
   ordinary inherited styles a page may set — text anchoring, baseline, direction, writing mode, white
   space, the face's style, weight, width, variants and size adjustment, spacing and case, kerning and
   features, rendering, stroke and shadow — and into one host that sets all of them. One spec, and each
   declared semantic example, is also mounted through the page's engine into the control and the combined
   host. After the fonts load it
   reads, for every text, where its first character starts, its length and box, its computed style and the
   platform font that drew it, and compares them with the control.

   The negative controls run a plate whose rules declare only what the plate declared before it stated its
   text properties, under the inherited anchor, baseline, italic and stroke, and require the checks to fail
   on it for those reasons. The guarantee is about inheritance: a stylesheet rule written against the
   plate's own elements is not part of it. */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'patterns', 'diagram-static-peer');
const args = process.argv.slice(2);
if (!(args.length === 0 || (args.length === 2 && args[0] === '--out'))) { console.error('usage: peer-host-inheritance.mjs [--out DIR]'); process.exit(2); }
const KEEP = args.length === 2;
const OUT = KEEP ? path.resolve(args[1]) : fs.mkdtempSync(path.join(os.tmpdir(), 'peer-host-inheritance-'));
fs.mkdirSync(OUT, { recursive: true });

/* ----------------------------------------------------------- browser -- */
function chromePath() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!c) { console.error('Chrome not found; set $CHROME'); process.exit(2); }
  return c;
}
async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-host-inheritance-chrome-'));
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
  // the peer's own: its key wording is kerned and optically sized as it renders alone
  'kerning-opsz': 'font-kerning: none; font-optical-sizing: none',
};
HOSTS.all = Object.values(HOSTS).join('; ').replace('text-anchor: end; ', '').replace('dominant-baseline: hanging; ', '');

/* the plate's rules before it stated its text properties: no text property beyond family, weight, size, the
   letters' middle anchoring and optical sizing; no stroke rule on heads or the field */
function firstRules(svg) {
  let n = 0;
  const out = svg
    .replace(/(\.peer-glyph\{[^}]*?;text-anchor:middle;font-optical-sizing:auto);[^}]*\}/, (m, a) => { n++; return a + '}'; })
    .replace(/(\.peer-key\{[^}]*?;font-size:[\d.]+px);text-anchor:start;font-optical-sizing:auto;[^}]*\}/, (m, a) => { n++; return a + '}'; })
    .replace(/(\.peer-head\{fill:[^;}]+);stroke:none\}/, (m, a) => { n++; return a + '}'; })
    .replace(/#[A-Za-z0-9_-]+ \.peer-field\{stroke:none\}/, () => { n++; return ''; });
  return n === 4 ? out : null;
}

const results = [];
function check(id, name, ok, detail) {
  results.push({ id, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${name}${detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`);
}

/* ---------------------------------------------------------- exports -- */
const EXP = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-host-inheritance-export-'));
const PLATES = [];
// The systems' stylesheets, in load order: the exporter resolves a declared semantic example's roles from
// them, and the page takes them as it takes the token file.
const SEMANTIC_SHEETS = ['surface-treatments.css', 'spectral-state.css', 'criterion-assessment.css', 'three-functions.css'];
for (const heads of ['target', 'midpoint']) {
  const dir = path.join(EXP, heads);
  execFileSync(process.execPath, [path.join(DIR, 'export-peer.mjs'), '--out', dir, '--tokens', path.join(ROOT, 'colors_and_type.css'), '--arrowheads', heads,
    ...SEMANTIC_SHEETS.flatMap((f) => ['--semantic-css', path.join(ROOT, f)])], { stdio: ['ignore', 'ignore', 'inherit'] });
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.svg')).sort()) PLATES.push({ file: `${heads}/${f}`, svg: fs.readFileSync(path.join(dir, f), 'utf8') });
}
fs.rmSync(EXP, { recursive: true, force: true });

const b = await launch();
const { srv, base } = await serve(ROOT);
let p;
const TOL = 0.01;
try {
  p = await page(b, `${base}/patterns/diagram-static-peer/diagram-static-peer.html`);
  // The specimen links its tokens and the systems' stylesheets at the vendored paths a consumer copies them
  // to (_dsa-tokens/, _dsa-surface/), which the owner repository does not carry; a page plate takes the
  // page's foundation roles, and a declared semantic example its system's tokens, so give the page the
  // owner's files, in load order, before anything is mounted.
  const tokens = await p.evaluate(`(async () => { for (const href of ${JSON.stringify(['/colors_and_type.css', ...SEMANTIC_SHEETS.map((f) => '/' + f)])}) {
      const ok = await new Promise((done) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
        l.onload = () => done(true); l.onerror = () => done(false); document.head.appendChild(l); });
      if (!ok) return 'MISSING ' + href; }
    await document.fonts.ready; const cs = getComputedStyle(document.documentElement);
    return cs.getPropertyValue('--fw-extralight').trim() + ' ' + cs.getPropertyValue('--assessment-favorable-ink').trim() + ' ' + cs.getPropertyValue('--function-judicial').trim(); })()`);
  if (!/^200 \S+ \S+$/.test(tokens)) throw new Error('the owner stylesheets did not load: ' + JSON.stringify(tokens));
  await p.evaluate(`(() => { const c = document.createElement('div'); c.id = 'nhi';
    c.style.cssText = 'position:absolute;left:0;top:0;z-index:99;background:#fff;padding:0;margin:0';
    document.body.appendChild(c); return true; })()`);

  /* render one plate in one host and read every text, head and the field */
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
      const faces = [...document.fonts].map((f) => f.status);
      const texts = [...svg.querySelectorAll('text')].map((t) => {
        const s = t.getStartPositionOfChar(0), bb = t.getBBox(), cs = getComputedStyle(t);
        return { cls: t.getAttribute('class'), text: t.textContent, x: +t.getAttribute('x'), y: +t.getAttribute('y'),
          sx: s.x, sy: s.y, len: t.getComputedTextLength(), bb: [bb.x, bb.y, bb.width, bb.height],
          style: cs.fontStyle, stroke: cs.stroke, shadow: cs.textShadow };
      });
      const marks = [...svg.querySelectorAll('.peer-head, rect')].map((e) => getComputedStyle(e).stroke);
      const paint = [...svg.querySelectorAll('.peer-head, .peer-ring, .peer-edge, .peer-neutral, rect, stop')].map((e) => { const c = getComputedStyle(e); return [c.fill, c.stroke, c.stopColor].join(' '); });
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
  const faceOff = (m, c) => m.texts.filter((t, i) => t.font !== c.texts[i].font || t.style !== 'normal').map((t) => t.text);
  // every face has loaded or was never needed: none is still loading or failed
  const settled = (m) => m.faces.length > 0 && m.faces.every((s) => s === 'loaded' || s === 'unloaded') && m.faces.includes('loaded');
  const ink = (m) => m.texts.filter((t) => t.stroke !== 'none' || t.shadow !== 'none').length + m.marks.filter((s) => s !== 'none').length;

  /* --------------------------------------------------------- I1 control -- */
  const control = {}, I1bad = [];
  let faceNames = new Set(), runs = 0;
  for (const P of PLATES) {
    const m = await measure('', P.svg);
    control[P.file] = m;
    for (const t of m.texts) {
      runs++;
      // a letter and a semantic example's note are centered on their x, a key's wording and a band line
      // start at theirs; all sit on the baseline at y
      const at = t.cls === 'peer-glyph' || t.cls === 'peer-note' ? t.sx + t.len / 2 : t.sx;
      if (Math.abs(at - t.x) > TOL || Math.abs(t.sy - t.y) > TOL) I1bad.push(`${P.file}: ${t.text} ${at.toFixed(3)},${t.sy.toFixed(3)} for ${t.x},${t.y}`);
      faceNames.add(`${t.cls}=${t.font}`);
    }
    if (outside(m).length || !settled(m)) I1bad.push(`${P.file}: outside ${outside(m).length}, faces ${m.faces.join(',')}`);
  }
  faceNames = [...faceNames].sort();
  check('I1', 'in the control host every exported plate draws its texts where its layout placed them: each letter and note centered on its x, each key wording and band line starting at its x, all on the baseline at y; no text leaves the plate; and every face it needs has loaded',
    PLATES.length === 56 && runs > 0 && I1bad.length === 0 && [...faceNames].some((f) => f.startsWith('peer-note=')) && [...faceNames].some((f) => f.startsWith('peer-band=')),
    { plates: PLATES.length, runs, bad: I1bad.slice(0, 5) });
  check('I2', 'the control draws every letter and key wording with an upright Inter face: no text is italic',
    faceNames.length > 0 && faceNames.every((f) => /=Inter/i.test(f) && !/italic/i.test(f)), { faces: faceNames });
  const REF = PLATES.find((x) => x.file === 'target/square.L-E-O-V_keyed-light.svg');
  if (KEEP) { await measure('', REF.svg); await shot('control_square.L-E-O-V_keyed-light.png'); }

  /* --------------------------------------------------- I3 inherited hosts -- */
  for (const [name, style] of Object.entries(HOSTS)) {
    const per = [];
    for (const P of PLATES) {
      const m = await measure(style, P.svg), c = control[P.file], mv = moved(m, c);
      per.push({ plate: P.file, moved: mv.which.length, most: mv.most, outside: outside(m).length, face: faceOff(m, c).length, ink: ink(m), loaded: settled(m), dropped: m.dropped });
      if (KEEP && P === REF && (name === 'baseline-hanging' || name === 'all')) await shot(`host-${name}_square.L-E-O-V_keyed-light.png`);
    }
    const bad = per.filter((q) => q.moved || q.outside || q.face || q.ink || !q.loaded || q.dropped.length);
    check(`I3.${name}`, `with every declaration applied, under the ${name} host (${style.length > 60 ? style.split(';').length + ' declarations' : style}), every exported plate's texts start, measure and box as in the control, keep their faces, stay inside the plate, and text, heads and the field take no stroke, and text no shadow`,
      bad.length === 0, bad.length ? bad.slice(0, 3) : { plates: per.length });
  }

  /* --------------------------------------------- I4 mounted through the engine -- */
  const mountIn = async (style, id = 'square.L-E-O-V') => {
    await p.evaluate(`(() => { const c = document.getElementById('nhi'); c.innerHTML = '';
      const h = document.createElement('div'); h.id = 'nhi-host'; h.setAttribute('style', ${JSON.stringify(style)}); c.appendChild(h);
      const spec = window.PEER_DIAGRAMS.find((s) => s.id === ${JSON.stringify(id)});
      window.DIAGRAM_PEER.mount(h, spec, { glyphs: window.DIAGRAM_PEER_GLYPHS, keyed: true }); return true; })()`);
    return read(style);
  };
  const mc = await mountIn(''), ma = await mountIn(HOSTS.all), mmv = moved(ma, mc);
  check('I4', 'mounted through the engine with the page\'s theme, a keyed plate under all the host styles at once starts, measures, boxes and faces as in the control host',
    mc.texts.length > 0 && mmv.which.length === 0 && outside(ma).length === 0 && faceOff(ma, mc).length === 0 && ink(ma) === 0 && outside(mc).length === 0 && ma.dropped.length === 0,
    { texts: mc.texts.length, moved: mmv.which.length, most: mmv.most, outside: outside(ma).length, face: faceOff(ma, mc).length });
  // Each declared semantic example, mounted with the page's theme: its notes and band hold under every
  // host style at once, and each colored ring and letter takes the value its system's tokens resolve to.
  const rgb = (v) => p.evaluate(`(() => { const d = document.createElement('div'); d.style.color = ${JSON.stringify(v)}; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })()`);
  // Text rendering is outside the plate's guarantee: it is left to the page. Mounted on the page, where the
  // page's own Inter draws the text, an inherited optimizeSpeed turns kerning off, so I6 applies every other
  // host declaration and I7 holds the rendering host to faces and the plate's bounds.
  const ALL_BUT_RENDERING = HOSTS.all.replace(`${HOSTS.rendering}; `, '');
  if (ALL_BUT_RENDERING === HOSTS.all) throw new Error('the combined host no longer carries the rendering declaration I6 leaves out');
  for (const [id, attr, roles] of [['triangle.A-S-K.assessment', 'assessment', ['favorable', 'caution', 'adverse']], ['triangle.L-E-J.functions', 'function', ['legislative', 'executive', 'judicial']]]) {
    const sc = await mountIn('', id), sa = await mountIn(ALL_BUT_RENDERING, id), smv = moved(sa, sc);
    const want = [];
    for (const r of roles) want.push([r, await rgb(`var(--${attr}-${r})`), await rgb(`var(--${attr}-${r}-ink)`)]);
    const got = await p.evaluate(`(() => ${JSON.stringify(roles)}.map((r) => { const ring = document.querySelector('#nhi-host .peer-ring[data-${attr}="' + r + '"]'),
      glyph = document.querySelector('#nhi-host .peer-glyph[data-${attr}="' + r + '"]'), a = getComputedStyle(ring), b = getComputedStyle(glyph); return [r, a.fill, a.stroke, b.fill]; }))()`);
    const painted = got.every(([r, fill, stroke, letter], i) => fill === want[i][1] && stroke === want[i][1] && letter === want[i][2] && !/rgb\(0, 0, 0\)/.test(fill + letter));
    check(`I6.${attr}`, `mounted through the engine with the page's theme, ${id} draws each colored ring and its boundary in its role's value and its letter in the role's ink, and under all the host styles at once but text rendering its texts start, measure, box and face as in the control host`,
      sc.texts.some((t) => t.cls === 'peer-band') && painted && smv.which.length === 0 && outside(sa).length === 0 && faceOff(sa, sc).length === 0 && ink(sa) === 0 && sa.dropped.length === 0,
      { texts: sc.texts.length, moved: smv.which.length, painted: got.map(([r, f, , l]) => `${r} ${f} / ${l}`) });
    const sr = await mountIn(HOSTS.rendering, id), srm = moved(sr, sc);
    check(`I7.${attr}`, `under an inherited ${HOSTS.rendering}, which the plate leaves to the page, ${id}'s texts keep their faces and stay inside the plate`,
      sr.texts.length === sc.texts.length && outside(sr).length === 0 && faceOff(sr, sc).length === 0 && sr.dropped.length === 0,
      { moved: srm.which, most: srm.most });
  }

  /* ----------------------------------------------- I5 white space in the content -- */
  // A text's own white space collapses, as an SVG text's does on its own: a key wording with edge and doubled
  // spaces, rendered now, draws as the former rules draw it.
  const spaced = await p.evaluate(`(() => { const spec = JSON.parse(JSON.stringify(window.PEER_DIAGRAMS.find((s) => s.id === 'square.L-E-O-V')));
    spec.meaning.directed = '  beats  you  ';
    const v = window.DIAGRAM_PEER.validate(spec, window.DIAGRAM_PEER_GLYPHS);
    return v.ok ? window.DIAGRAM_PEER.render(spec, { glyphs: window.DIAGRAM_PEER_GLYPHS, keyed: true, idPrefix: 'nhi-ws' }) : 'INVALID ' + JSON.stringify(v.errors); })()`);
  const spacedFirst = spaced.startsWith('<svg') ? firstRules(spaced) : null;
  if (spacedFirst) {
    const now = await measure('', spaced), was = await measure('', spacedFirst), key = (m) => m.texts.find((t) => t.cls === 'peer-key' && /beats/.test(t.text));
    check('I5', 'a key wording with edge and doubled spaces draws as the former rules draw it: its white space collapses, as an SVG text\'s does on its own',
      key(now) && key(was) && moved(now, was).which.length === 0, { now: key(now) && +key(now).len.toFixed(3), former: key(was) && +key(was).len.toFixed(3) });
  } else check('I5', 'a key wording with edge and doubled spaces renders and rebuilds', false, spaced.slice(0, 200));

  /* ------------------------------------------------------ negative controls -- */
  const first = firstRules(REF.svg);
  check('N0', 'the plate\'s former rules are rebuilt from the reference plate: its text rules without the stated properties, and no stroke rule on heads or the field', first !== null);
  if (first) {
    const c = await measure('', first), cmv = moved(c, control[REF.file]);
    const paintSame = JSON.stringify(c.paint) === JSON.stringify(control[REF.file].paint);
    check('N1', 'with the former rules and no host style, the reference plate measures and paints as the current one: the declarations change nothing an ordinary host shows',
      cmv.which.length === 0 && faceOff(c, control[REF.file]).length === 0 && paintSame && c.paint.length > 0, { most: cmv.most, paintSame, painted: c.paint.length });
    const keys = (m) => m.texts.filter((t) => t.cls === 'peer-key');
    const a = await measure(HOSTS['anchor-end'], first);
    const keyMoved = keys(a).filter((t, i) => Math.abs(t.sx - keys(control[REF.file])[i].sx) > TOL).length;
    check('N2', 'I3 bites: with the former rules, an inherited text-anchor: end moves the key\'s wording off its start', keyMoved > 0, { keyMoved, keys: keys(a).length });
    if (KEEP) await shot('former-rules_host-anchor-end_square.L-E-O-V_keyed-light.png');
    const bl = await measure(HOSTS['baseline-hanging'], first);
    const dy = Math.max(...bl.texts.map((t, i) => t.cls === 'peer-glyph' ? Math.abs(t.bb[1] - control[REF.file].texts[i].bb[1]) : 0));
    check('N3', 'I3 bites: with the former rules, an inherited dominant-baseline: hanging moves the letters off their rings\' centers', moved(bl, control[REF.file]).which.length > 0 && dy > TOL, { mostDy: +dy.toFixed(2) });
    if (KEEP) await shot('former-rules_host-baseline-hanging_square.L-E-O-V_keyed-light.png');
    const it = await measure(HOSTS.italic, first), itf = faceOff(it, control[REF.file]);
    check('N4', 'I3 bites: with the former rules, an inherited font-style: italic draws the texts in an italic style', itf.length > 0, { faceChanged: itf.length, of: it.texts.length });
    const st = await measure(HOSTS['stroke-shadow'], first);
    check('N5', 'I3 bites: with the former rules, an inherited stroke strokes the texts, the heads and the field', ink(st) > 0, { stroked: ink(st) });
  }
  // I6 bites: with the page's criterion-assessment.css switched off, a colored ring is not its role's value.
  const switched = await p.evaluate(`(() => { const l = [...document.querySelectorAll('link')].find((x) => x.getAttribute('href') === '/criterion-assessment.css'); if (!l) return false; l.disabled = true; return true; })()`);
  if (switched) {
    await mountIn('', 'triangle.A-S-K.assessment');
    const off = await p.evaluate(`(() => { const ring = document.querySelector('#nhi-host .peer-ring[data-assessment="favorable"]'); return getComputedStyle(ring).fill; })()`);
    const on = await rgb('var(--state-earned)');
    await p.evaluate(`(() => { [...document.querySelectorAll('link')].find((x) => x.getAttribute('href') === '/criterion-assessment.css').disabled = false; return true; })()`);
    check('N6', 'I6 bites: with the page\'s criterion-assessment.css switched off, the favorable ring no longer takes its role\'s value', off !== on, { off, on });
  } else check('N6', 'I6 bites: the page carries the criterion-assessment.css it can switch off', false);
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
