#!/usr/bin/env node
/* radial-export.mjs — the export harness of the interactive radial pattern: the export module's
   page and diagram plates, on the synthetic specimen.

     node tests/radial-export.mjs              run every check; exit 1 on any failure
     node tests/radial-export.mjs --out DIR    and keep the review PNGs and test-results.json in DIR

   It serves this repository read-only on 127.0.0.1, opens tests/radial-export-fixture.html in
   headless Chrome (Node 22+, Chrome at $CHROME or the default locations; no npm dependency) and
   drives the export through the instance's service('export') and through real clicks on its
   controls. Without --out, what it writes (the review PNGs, the downloaded file) goes to a
   temporary directory that is removed at the end. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (!(args.length === 0 || (args.length === 2 && args[0] === '--out'))) { console.error('usage: radial-export.mjs [--out DIR]'); process.exit(2); }
const KEEP = args.length === 2;
const OUT = KEEP ? path.resolve(args[1]) : fs.mkdtempSync(path.join(os.tmpdir(), 'radial-export-'));
const DL = path.join(OUT, 'downloads');
fs.mkdirSync(DL, { recursive: true });

/* ----------------------------------------------------------- browser -- */
function chromePath() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!c) { console.error('Chrome not found; set $CHROME'); process.exit(2); }
  return c;
}
async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'radial-export-chrome-'));
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
async function page(b, { url, width = 1280, height = 800, scheme = 'light' }) {
  const tgt = await (await fetch(`http://127.0.0.1:${b.port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(), errors = []; let loaded; const onLoad = new Promise((r) => { loaded = r; });
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const q = pending.get(m.id); pending.delete(m.id); m.error ? q.rej(new Error(JSON.stringify(m.error))) : q.res(m.result); }
    if (m.method === 'Page.loadEventFired') loaded();
    if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const call = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
  await call('Page.navigate', { url });
  await Promise.race([onLoad, new Promise((r) => setTimeout(r, 15000))]);
  const evaluate = async (expression) => { const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const frames = () => evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
  await evaluate('document.fonts ? document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 300))) : null');
  const close = async () => { try { ws.close(); } catch { /* closed */ } await fetch(`http://127.0.0.1:${b.port}/json/close/${tgt.id}`).catch(() => {}); };
  return { call, evaluate, frames, close, errors };
}

const results = [];
function check(id, name, ok, detail) {
  results.push({ id, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${name}${detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
}
function ihdr(buf) {
  const sig = buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  return { png: sig, width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await launch();
const { srv, base } = await serve(ROOT);
let p;
try {
  p = await page(b, { url: `${base}/tests/radial-export-fixture.html`, width: 1440, height: 900 });
  const ev = (s) => p.evaluate(s);
  if ((await ev('document.documentElement.dataset.ready')) !== '1') throw new Error('fixture not ready: ' + p.errors.join(' | '));

  /* the page's own state before any export, for the teardown checks */
  const own = await ev('({ faces: FX.faces(), body: document.body.children.length })');

  /* one run in the page, its PNG brought back to Node */
  async function run(name, opts = {}) {
    return ev(`(async () => {
      try {
        const r = await FX.exp.run(${JSON.stringify(name)}, ${JSON.stringify(opts)});
        const png = await FX.b64(r.blob);
        delete r.blob;
        return Object.assign(r, { png });
      } catch (e) { return { ok: false, error: String(e.message), reason: e.reason }; }
    })()`);
  }
  function save(r, file) { const buf = Buffer.from(r.png, 'base64'); fs.writeFileSync(path.join(OUT, file), buf); return buf; }
  async function theme(t) { await ev(`(${t === null} ? document.documentElement.removeAttribute('data-theme') : document.documentElement.setAttribute('data-theme', ${JSON.stringify(t)}), true)`); await p.frames(); }

  /* ------------------------------------------------- E1-E4 plates, sizes, themes -- */
  const pageL = await run('page');
  if (pageL.png) {
    const d = ihdr(save(pageL, pageL.filename));
    check('E1', 'page plate, light: exact size, filename, theme', pageL.ok && pageL.width === 3840 && pageL.height === 2880 && d.png &&
      d.width === 3840 && d.height === 2880 && pageL.filename === 'radial-specimen-page-3840x2880-light.png' && pageL.theme === 'light' && pageL.labels > 0,
      { file: pageL.filename, png: `${d.width}x${d.height}`, bytes: pageL.bytes, labels: pageL.labels, svgChars: pageL.svg.length });
  } else check('E1', 'page plate, light', false, pageL);

  const bounds = await ev('FX.map.layout.bounds');
  const diagL = await run('diagram');
  if (diagL.png) {
    const d = ihdr(save(diagL, diagL.filename));
    const long = Math.max(d.width, d.height), wantShort = Math.round(3840 * Math.min(bounds.w, bounds.h) / Math.max(bounds.w, bounds.h));
    const wide = bounds.w >= bounds.h;
    check('E2', 'diagram plate, light: long edge 3840, natural aspect of the layout bounds', diagL.ok && long === 3840 &&
      (wide ? d.width === 3840 && d.height === wantShort : d.height === 3840 && d.width === wantShort) &&
      diagL.width === d.width && diagL.height === d.height && diagL.filename === 'radial-specimen-diagram-light.png',
      { png: `${d.width}x${d.height}`, bounds: `${bounds.w.toFixed(1)}x${bounds.h.toFixed(1)}`, expectedShort: wantShort, labels: diagL.labels });
  } else check('E2', 'diagram plate, light', false, diagL);

  await theme('dark');
  const pageD = await run('page');
  const diagD = await run('diagram');
  await theme(null);
  if (pageD.png && diagD.png) {
    const d = ihdr(save(pageD, pageD.filename)), dd = ihdr(Buffer.from(diagD.png, 'base64'));
    const tok = (s) => (s.match(/--bg-from:([^;]+);/) || [])[1];
    check('E3', 'page and diagram, dark (data-theme): theme, filenames, sizes, tokens, the dark mark image', pageD.ok && diagD.ok &&
      pageD.theme === 'dark' && pageD.filename === 'radial-specimen-page-3840x2880-dark.png' && d.width === 3840 && d.height === 2880 &&
      diagD.filename === 'radial-specimen-diagram-dark.png' && dd.width === diagL.width && dd.height === diagL.height &&
      tok(pageD.svg) !== tok(pageL.svg) && /<image [^>]*href="data:image\/svg\+xml;base64,/.test(pageD.svg) && !/<image /.test(pageL.svg),
      { light: tok(pageL.svg), dark: tok(pageD.svg), diagram: `${dd.width}x${dd.height}` });
  } else check('E3', 'dark plates', false, { pageD, diagD });

  await p.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await p.frames();
  const diagS = await run('diagram');
  await p.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await p.frames();
  check('E4', 'no data-theme: the theme follows prefers-color-scheme', diagS.ok && diagS.theme === 'dark' && diagS.filename === 'radial-specimen-diagram-dark.png' &&
    diagS.svg === diagD.svg, { theme: diagS.theme, sameAsDataThemeDark: diagS.svg === diagD.svg });

  /* ------------------------------------------------------- E5 determinism -- */
  const pageL2 = await run('page'), diagL2 = await run('diagram');
  check('E5', 'same page state: byte-identical SVG across runs (page and diagram)', pageL2.svg === pageL.svg && diagL2.svg === diagL.svg,
    { page: pageL2.svg === pageL.svg, diagram: diagL2.svg === diagL.svg });

  /* --------------------------------------------------- E6 independence -- */
  const snap = `(() => { const s = FX.map.state(); delete s.export; return JSON.stringify(s); })()`;
  const atFitBefore = await ev(snap);
  await ev('FX.events = []');
  const atFit = await run('page');
  const atFitAfter = await ev(snap), atFitEvents = await ev('FX.events.filter((e) => e.type !== "export")');
  check('E6a', 'at the Fit: an export changes nothing on the screen and emits nothing but its own event',
    atFit.ok && atFitBefore === atFitAfter && atFitEvents.length === 0, { events: atFitEvents });

  const setup = await ev(`(() => {
    const m = FX.map, leaves = m.layout.nodes.filter((n) => n.kind === 'leaf').map((n) => n.id);
    m.setMembership(new Set(leaves.slice(0, 40)), null);
    m.select(leaves[3]);
    m.zoom(4);
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r({ tier: m.state().lod.tier, k: m.view().k, sel: m.state().selection.locked, members: m.state().membership.visibleItems }))));
  })()`);
  const before = await ev(snap);
  await ev('FX.events = []');
  const moved = await run('page');
  const after = await ev(snap), movedEvents = await ev('FX.events.filter((e) => e.type !== "export")');
  const tiers = await ev('FX.map.state && window.DIAGRAM_RADIAL.labels.DEFAULT_TIERS.map((t) => t.name)');
  const counts = await ev('FX.counts');
  const nodeCount = await ev('FX.map.layout.nodes.length');
  const svg = moved.svg || '';
  check('E6b', 'with a selection, a zoom and a membership set: the screen state is unchanged across an export', moved.ok && before === after && movedEvents.length === 0,
    { screen: setup, events: movedEvents });
  check('E6c', 'the plate ignores the screen: SVG identical to the neutral-state plate', svg === pageL.svg);
  check('E6d', 'labels at the plate tier while the screen is at another', counts && counts.tier === tiers[1] && setup.tier !== counts.tier &&
    !/radial-lbl--(leaf|id)\b/.test(svg) && (svg.match(/radial-lbl--top /g) || []).length === 5 && /radial-lbl--root /.test(svg),
    { screenTier: setup.tier, plateTier: counts && counts.tier, top: (svg.match(/radial-lbl--top /g) || []).length,
      container: (svg.match(/radial-lbl--container /g) || []).length, counts: (svg.match(/radial-lbl--count /g) || []).length });
  check('E6e', 'the plate is the neutral state: every node, no state class, drawn-always relations on, drawn-on-selection off',
    (svg.match(/class="radial-node /g) || []).length === nodeCount && !/\bis-(selected|near|dim|out)\b/.test(svg) &&
    !/radial-edge--selection is-on/.test(svg.split('radial-plate-legend')[0]) &&
    (svg.split('radial-plate-legend')[0].match(/radial-edge--always is-on/g) || []).length === counts.relations.greenway &&
    !/style="[^"]*display/.test(svg),
    { nodes: (svg.match(/class="radial-node /g) || []).length, expected: nodeCount });
  await ev('(FX.map.setMembership(null, null), FX.map.select(null), FX.map.fit("explicit"), true)');
  check('E6f', 'counts passed to plateLines', counts && counts.items === 220 && counts.records === 2 && counts.containers['1'] === 5 &&
    counts.relations.greenway >= 0 && counts.relations.barrier >= 0 && Object.keys(counts.relations).length === 3, counts);

  /* ------------------------------------------- E7 planted failure on the control -- */
  const btn = async (name) => ev(`(() => { const b = document.querySelector('[data-radial-export="${name}"]'); const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: b.textContent, title: b.getAttribute('title'), aria: b.getAttribute('aria-label'), cls: b.className, slot: b.parentNode.getAttribute('data-radial-slot') }; })()`);
  async function click(pt) {
    await p.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y });
    await p.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    await p.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  }
  const kept = await ev(`(() => { const s = document.querySelector('[data-radial-slot="mark-light"]'); FX.keptMark = s.innerHTML; s.innerHTML = ''; FX.events = []; return true; })()`);
  const b0 = await btn('page');
  await click(b0);
  await sleep(400);
  const failed = await btn('page');
  const why = 'no mark is displayed for this theme';
  const st = await ev('FX.map.state().export');
  const live = await ev('document.querySelector(\'[data-radial-slot="live"]\').textContent');
  const fev = await ev('FX.events.filter((e) => e.type === "export")');
  check('E7a', 'planted failure (mark required, mark slot emptied): the clicked control says so', kept && failed.text === 'export failed' &&
    failed.title === 'PNG export failed — ' + why && failed.aria === 'PNG export failed — ' + why && /\bis-failed\b/.test(failed.cls) &&
    st.failure === why && st.last && st.last.ok === false && live === 'PNG export failed — ' + why &&
    fev.length === 1 && fev[0].ok === false && fev[0].reason === why && fev[0].cause === 'reader', { button: failed, state: st, live, event: fev[0] });
  await sleep(4000);
  const still = await btn('page');
  await sleep(1000);
  const back = await btn('page');
  check('E7b', 'the control restores itself after 5 s', still.text === 'export failed' && back.text === 'PNG page' && back.title === null &&
    back.aria === null && !/is-failed/.test(back.cls), { at4_4s: still.text, at5_4s: back });
  await ev(`(document.querySelector('[data-radial-slot="mark-light"]').innerHTML = FX.keptMark, true)`);

  /* ------------------------------------------------ E8 carrier missing -- */
  const facesBefore = await ev('FX.faces()');
  const noCarrier = await ev(`(async () => { const c = window.DSA_EMBEDDED_FONTS; delete window.DSA_EMBEDDED_FONTS;
    try { await FX.exp.run('page'); return { ok: true }; } catch (e) { return { ok: false, reason: e.reason }; } finally { window.DSA_EMBEDDED_FONTS = c; } })()`);
  const facesAfter = await ev('FX.faces()');
  check('E8', 'the font carrier missing: the export fails closed', noCarrier.ok === false && noCarrier.reason === 'font carrier missing' &&
    JSON.stringify(facesBefore) === JSON.stringify(facesAfter), noCarrier);

  /* ------------------------------------------------ E9 fonts by URL -- */
  await ev(`(FX.mount({ fonts: { sans: '../fonts/InterVariable.woff2', mono: '../fonts/JetBrainsMono.woff2' } }), true)`);
  const byUrl = await run('page');
  const faceRules = (byUrl.svg || '').match(/@font-face\{[^}]*\}/g) || [];
  check('E9a', 'fonts as { sans, mono } URLs over http: fetched, embedded, applied', byUrl.ok && faceRules.length === 2 &&
    faceRules.every((r) => /src:url\(data:font\/woff2;base64,d09GMg/.test(r)),
    { faces: faceRules.length, sameSvgAsCarrier: byUrl.svg === pageL.svg });
  await ev(`(FX.mount({ fonts: { sans: '../fonts/NoSuchFace.woff2', mono: '../fonts/JetBrainsMono.woff2' } }), true)`);
  const badUrl = await run('page');
  check('E9b', 'a font URL that does not resolve fails closed', badUrl.ok === false && badUrl.reason === 'font fetch failed', badUrl);
  await ev('(FX.mount(), true)');

  /* ------------------------------------------ E10 raster controls -- */
  const ctl = await ev(`(async () => {
    const svg = (await FX.exp.run('page')).svg;
    async function px(s) {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
      await img.decode().catch(() => {});
      const c = document.createElement('canvas'); c.width = 1920; c.height = 1440;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, 1920, 1440);
      return x.getImageData(0, 0, 1920, 1440).data;
    }
    function diff(a, b) { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) n++; return n; }
    const full = await px(svg);
    const noFaces = await px(svg.replace(/@font-face\\{[^}]*\\}/g, ''));
    const style = svg.match(/<style>([\\s\\S]*?)<\\/style>/)[1];
    const keep = (style.match(/@font-face\\{[^}]*\\}/g) || []).join('') + (style.match(/\\.radial-export-plate\\{[^}]*\\}/) || [''])[0];
    const noRules = await px(svg.replace(style, keep));
    return { fonts: diff(full, noFaces), rules: diff(full, noRules) };
  })()`);
  check('E10', 'raster controls: the embedded faces and the read rules both change the raster', ctl.fonts > 2000 && ctl.rules > 20000,
    { pixelsChangedWithoutFaces: ctl.fonts, pixelsChangedWithoutRules: ctl.rules });

  /* ---------------------------------------- E11 the plate checks bite -- */
  await ev(`(FX.mount({ profiles: { page: { detail: 2 }, diagram: true } }), true)`);
  const leafTier = await run('page');
  check('E11a', 'negative control: a tier with leaf names past the gutter fails the label check', leafTier.ok === false &&
    leafTier.reason === 'label outside the label area', leafTier);
  await ev('(FX.mount(), true)');
  await ev(`(FX.keptMark = document.querySelector('[data-radial-slot="mark-light"]').innerHTML, document.querySelector('[data-radial-slot="mark-light"]').textContent = '[org]/'.repeat(80), true)`);
  const longMark = await run('page');
  await ev(`(document.querySelector('[data-radial-slot="mark-light"]').innerHTML = FX.keptMark, true)`);
  check('E11b', 'negative control: a mark text wider than the plate fails the chrome check', longMark.ok === false &&
    longMark.reason === 'chrome text outside the plate', longMark);
  await theme('dark');
  await ev(`(() => { const i = document.querySelector('[data-radial-slot="mark-dark"] img'); FX.keptSrc = i.getAttribute('src');
    i.setAttribute('src', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="10"><rect width="4000" height="10"/></svg>'));
    return new Promise((r) => { if (i.complete && i.naturalWidth === 4000) r(true); else i.onload = () => r(true); }); })()`);
  const wideMark = await run('page');
  await ev(`(() => { const i = document.querySelector('[data-radial-slot="mark-dark"] img'); i.setAttribute('src', FX.keptSrc);
    return new Promise((r) => { if (i.complete && i.naturalWidth === 136) r(true); else i.onload = () => r(true); }); })()`);
  await theme(null);
  check('E11c', 'negative control: a mark image wider than the plate fails the mark check', wideMark.ok === false &&
    wideMark.reason === 'mark outside the plate', wideMark);
  await ev(`(() => { const c = document.querySelector('[data-radial-slot="caption"]'); FX.keptCaption = c.innerHTML;
    c.textContent = 'a caption sentence of plain words that runs on to fill the width of the figure and wrap. '.repeat(20); return true; })()`);
  await ev(`(FX.mount({ plateLines: () => ['a plate line long enough to reach back across the foot of the plate under the caption block, '.repeat(3)] }), true)`);
  const crowded = await run('page');
  await ev(`(document.querySelector('[data-radial-slot="caption"]').innerHTML = FX.keptCaption, FX.mount(), true)`);
  check('E11d', 'negative control: a caption that runs into the plate lines fails the overlap check', crowded.ok === false &&
    crowded.reason === 'chrome blocks overlap', crowded);

  /* ---------------------------------- E12 legend notes and the shape key -- */
  const NOTE = { plane: { greenway: 'a plane note for the plate' }, kind: { water: 'a kind note for the plate' }, shapes: 'a shapes line the plate ignores' };
  await ev(`(FX.notes = ${JSON.stringify(NOTE)}, FX.mount(), true)`);
  const noted = await run('page');
  const nsvg = noted.svg || '';
  /* the legend column's words, read across its wrapped lines */
  const legendText = (s) => s.slice(s.indexOf('radial-plate-legend'), s.indexOf('radial-plate-caption-block')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const meaningLine = (s, t) => new RegExp('class="radial-plate-meaning"[^>]*><tspan>' + t + '</tspan>').test(s);
  check('E12a', 'legend notes: a plane note and a kind note as secondary text; the model\'s shapes line not drawn', noted.ok &&
    meaningLine(nsvg, 'a plane note for the plate') && meaningLine(nsvg, 'a kind note for the plate') &&
    !nsvg.includes('a shapes line the plate ignores'), { ok: noted.ok, reason: noted.reason });
  await ev('(FX.notes = null, true)');
  const KEY = [['circle', 'a round key name'], ['square', 'a square key name'], ['ring', 'a ring key name with words enough to wrap in its column'], ['tri', 'a third key name'], ['hex', 'a hex key name']];
  await ev(`(FX.mount({ shapeKey: ${JSON.stringify(KEY)} }), true)`);
  const keyed = await run('page');
  const ksvg = keyed.svg || '';
  check('E12b', 'shapeKey: one glyph and name per pair, in place of the kind rows', keyed.ok &&
    KEY.every((k) => legendText(ksvg).includes(' ' + k[1] + ' ')) && !legendText(ksvg).includes('grass-surfaced place') &&
    (ksvg.match(/<g transform="translate\([^)]*\)"><(circle|rect|polygon) class="radial-plate-glyph"/g) || []).length === KEY.length,
    { ok: keyed.ok, reason: keyed.reason, glyphs: (ksvg.match(/<g transform="translate\([^)]*\)"><(circle|rect|polygon) class="radial-plate-glyph"/g) || []).length });
  if (keyed.png) save(keyed, 'radial-specimen-page-shapekey-light.png');
  const kinds = await ev('window.RADIAL_SPECIMEN.data.kinds.map((k) => k.label)');
  const glyphsL = (pageL.svg.match(/<g transform="translate\([^)]*\)"><(circle|rect|polygon) class="radial-plate-glyph"/g) || []).length;
  check('E12c', 'no shapeKey: one glyph and label per declared kind', kinds.every((t) => legendText(pageL.svg).includes(' ' + t + ' ')) &&
    glyphsL === kinds.length, { kinds: kinds.length, glyphs: glyphsL });

  /* --------------------------------------------- E13 the adapter is validated -- */
  const BAD = {
    filenameBase: { filenameBase: 'Bad_Name' }, emptyProfiles: { profiles: {} }, falseProfile: { profiles: { page: false } },
    unknownKey: { tint: 'x' }, profileKey: { profiles: { diagram: { size: [10, 10] } } }, size: { profiles: { page: { size: [3840] } } },
    detail: { profiles: { page: { detail: 99 } } }, nullScale: { profiles: { page: { scale: null } } }, mark: { mark: 'maybe' },
    fonts: { fonts: { sans: '', mono: 'x' } }, header: { header: { title: 3 } }, plateLines: { plateLines: 'x' },
    shapeKeyShape: { shapeKey: [['star', 'x']] }, shapeKeyName: { shapeKey: [['circle', ' ']] }, shapeKeyEmpty: { shapeKey: [] },
    tooSmall: { profiles: { page: { size: [800, 600] } } }
  };
  const bad = await ev(`(() => { const out = {}; const B = ${JSON.stringify(BAD)};
    for (const k of Object.keys(B)) { try { FX.mount(B[k]); out[k] = 'mounted'; } catch (e) { out[k] = e.name + ' ' + e.code + ' ' + (FX.host.outerHTML === FX.pristine); } }
    FX.map = null; FX.mount(); return out; })()`);
  check('E13', 'malformed export sections fail the mount (MountError HOOK_MISSING) and leave the host as it was',
    Object.values(bad).every((v) => v === 'MountError HOOK_MISSING true'), bad);

  /* -------------------------------------------- E14 the controls' slots -- */
  const c1 = await ev(`Array.from(document.querySelectorAll('.radial-export-control')).map((b) => [b.type, b.textContent, b.parentNode.getAttribute('data-radial-slot')])`);
  const c2 = await ev(`(() => { const s = document.querySelector('[data-radial-slot="export"]'); s.removeAttribute('data-radial-slot'); FX.mount();
    const r = Array.from(document.querySelectorAll('.radial-export-control')).map((b) => b.parentNode.getAttribute('data-radial-slot'));
    s.setAttribute('data-radial-slot', 'export'); return r; })()`);
  const c3 = await ev(`(async () => { const a = document.querySelector('[data-radial-slot="actions"]'), s = document.querySelector('[data-radial-slot="export"]');
    a.removeAttribute('data-radial-slot'); s.removeAttribute('data-radial-slot'); FX.mount();
    const n = document.querySelectorAll('.radial-export-control').length; let ok = false;
    try { ok = (await FX.exp.run('diagram')).ok; } catch (e) { ok = e.reason; }
    a.setAttribute('data-radial-slot', 'actions'); s.setAttribute('data-radial-slot', 'export'); FX.mount(); return { n, ok }; })()`);
  check('E14', 'controls: two buttons in the export slot, else the actions slot, else none (the API still runs)',
    JSON.stringify(c1) === JSON.stringify([['button', 'PNG page', 'export'], ['button', 'PNG diagram', 'export']]) &&
    JSON.stringify(c2) === JSON.stringify(['actions', 'actions']) && c3.n === 0 && c3.ok === true, { exportSlot: c1, actionsSlot: c2, none: c3 });

  /* ------------------------------------- E15 a real click downloads -- */
  for (const f of fs.readdirSync(DL)) fs.rmSync(path.join(DL, f));
  let dlOk = true;
  try { await p.call('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }); } catch (e) { dlOk = String(e.message); }
  await ev('FX.events = []');
  await click(await btn('diagram'));
  let file = null;
  for (let i = 0; i < 100 && !file; i++) { await sleep(100); file = fs.readdirSync(DL).find((f) => f.endsWith('.png')) || null; }
  await sleep(300);
  const dEv = await ev('FX.events.filter((e) => e.type === "export")');
  const live2 = await ev('document.querySelector(\'[data-radial-slot="live"]\').textContent');
  const dd = file ? ihdr(fs.readFileSync(path.join(DL, file))) : null;
  check('E15', 'a click on "PNG diagram" downloads the file and announces it', dlOk === true && file === 'radial-specimen-diagram-light.png' &&
    dd && dd.png && dd.width === diagL.width && dd.height === diagL.height && dEv.length === 1 && dEv[0].ok === true && dEv[0].cause === 'reader' &&
    live2 === 'PNG export ready', { file, png: dd && `${dd.width}x${dd.height}`, event: dEv[0], live: live2, downloadBehavior: dlOk });

  /* ------------------------- E19-E21 one click-time snapshot across the font wait -- */
  /* An export started in one theme, the theme changed while its first export font is still loading
     (the font's load is held at the native FontFace.load boundary; the exporter is not touched): the
     plate must equal the plate that theme gives without a change, keep its theme and filename, and
     the page must keep the reader's new theme. The third run changes nothing: a held load alone
     changes no byte. */
  async function heldExport(from, to, profile) {
    profile = profile || 'diagram';
    const set = (t) => t === null ? "document.documentElement.removeAttribute('data-theme')" : `document.documentElement.setAttribute('data-theme', ${JSON.stringify(t)})`;
    return ev(`(async () => {
      ${set(from)};
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const stable = await FX.exp.run(${JSON.stringify(profile)});
      const orig = FontFace.prototype.load; let release, held = false, first = true;
      const gate = new Promise((r) => { release = r; });
      FontFace.prototype.load = function () { const self = this; if (!first) return orig.call(self); first = false; held = true; return gate.then(() => orig.call(self)); };
      try {
        const run = FX.exp.run(${JSON.stringify(profile)});
        for (let i = 0; i < 100 && !held; i++) await new Promise((r) => setTimeout(r, 10));
        ${to === undefined ? '' : set(to) + ';'}
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        release();
        const r = await run;
        return { held, same: r.svg === stable.svg, theme: r.theme, stableTheme: stable.theme, filename: r.filename, live: document.documentElement.getAttribute('data-theme') };
      } catch (e) { return { held, error: e.reason || String(e) }; }
      finally { FontFace.prototype.load = orig; }
    })()`);
  }
  const ld = await heldExport('light', 'dark');
  check('E19', 'light at the click, dark during the font wait: the plate is the light plate, named light; the page stays dark',
    ld.held && ld.same && ld.theme === 'light' && /-light\.png$/.test(ld.filename || '') && ld.live === 'dark', ld);
  const dl = await heldExport('dark', 'light');
  check('E20', 'dark at the click, light during the font wait: the plate is the dark plate, named dark; the page stays light',
    dl.held && dl.same && dl.theme === 'dark' && /-dark\.png$/.test(dl.filename || '') && dl.live === 'light', dl);
  const pg = await heldExport('light', 'dark', 'page');
  check('E22', 'the page plate, light at the click, dark during the font wait (its mark, legend and caption taken at the click): the light page plate, named light; the page stays dark',
    pg.held && pg.same && pg.theme === 'light' && /-light\.png$/.test(pg.filename || '') && pg.live === 'dark', pg);
  const nc = await heldExport('light', undefined);
  check('E21', 'control: a held font load with no theme change gives the same plate byte for byte',
    nc.held && nc.same && nc.theme === 'light' && nc.live === 'light', nc);
  await theme(null);

  /* ---------------------------------------------------- E16 busy, teardown -- */
  const busy = await ev(`(async () => { const a = FX.exp.run('diagram'); let second; try { await FX.exp.run('page'); second = 'ran'; } catch (e) { second = e.reason; }
    await a; return second; })()`);
  check('E16a', 'one run at a time: a second run while busy is refused', busy === 'export busy', busy);
  const midway = await ev(`(async () => { const r = FX.exp.run('page').then(() => 'finished', (e) => e.reason);
    await new Promise((res) => setTimeout(res, 5)); FX.map.destroy(); FX.map = null; const reason = await r;
    return { reason, faces: FX.faces(), body: document.body.children.length, html: FX.host.outerHTML === FX.pristine }; })()`);
  check('E16b', 'destroy during a run: the run stops, no face and no offscreen node remain, the host is as it was',
    midway.reason === 'export stopped' && JSON.stringify(midway.faces) === JSON.stringify(own.faces) && midway.body === own.body && midway.html, midway);
  await ev('(FX.mount(), true)');
  const fin = await ev(`(async () => { await FX.exp.run('page'); await FX.exp.run('diagram');
    const shadowed = Array.from(document.body.children).filter((e) => e.getAttribute('aria-hidden') === 'true' && !e.id).length;
    FX.map.destroy(); FX.map = null;
    return { html: FX.host.outerHTML === FX.pristine, faces: FX.faces(), body: document.body.children.length, shadowed,
             buttons: document.querySelectorAll('.radial-export-control').length }; })()`);
  check('E16c', 'destroy leaves the host as it was (outerHTML equal) and no faces beyond the page\'s own', fin.html &&
    JSON.stringify(fin.faces) === JSON.stringify(own.faces) && fin.body === own.body && fin.shadowed === 0 && fin.buttons === 0,
    { html: fin.html, faces: fin.faces.length, ownFaces: own.faces.length, body: fin.body, ownBody: own.body });

  check('E17', 'no page error or console error during the run', p.errors.length === 0, p.errors.slice(0, 5));

  /* the page reaches the export through the instance's service('export'), which ends with the instance */
  const svc = await ev(`(async () => { FX.mount(); if (typeof FX.map.service !== 'function') return null;
    const s = FX.map.service('export'), r = s && (await s.run('diagram')); FX.map.destroy(); const after = FX.map.service('export'); FX.map = null; FX.mount();
    return { offered: !!s, ok: !!(r && r.ok), afterDestroy: after }; })()`);
  check('E18', 'the instance offers the export service; it runs, and it is gone after destroy',
    svc !== null && svc.offered && svc.ok && svc.afterDestroy === null, svc);
} catch (e) {
  check('X', 'harness', false, String(e && e.stack || e));
} finally {
  if (p) await p.close();
  srv.close();
  await stop(b);
}
const failed = results.filter((r) => !r.ok);
if (KEEP) fs.writeFileSync(path.join(OUT, 'test-results.json'), JSON.stringify(results, null, 1));
else fs.rmSync(OUT, { recursive: true, force: true });
console.log(`\nRESULT ${failed.length ? 'FAIL' : 'ALL PASS'} · ${results.length - failed.length} passed · ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
