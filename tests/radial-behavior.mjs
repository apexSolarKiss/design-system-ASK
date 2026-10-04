#!/usr/bin/env node
/* radial-behavior.mjs — the browser behavior harness of the interactive radial pattern.

     node tests/radial-behavior.mjs           run every group; exit 1 on any failure
     node tests/radial-behavior.mjs --json    the same, with the measurements as JSON at the end

   It serves this repository read-only on 127.0.0.1, opens tests/radial-fixture.html in headless
   Chrome (no npm dependency; Node 22+, Chrome found at $CHROME or the default locations), and
   drives the owner files with real input wherever a check says so: mouse, wheel, touch and keys
   arrive through the Chrome DevTools Protocol as trusted events. Two per-shape sweeps run in the
   page instead, because they visit every mark: the click sweep calls the click's own resolution
   function, tap(), at each mark's center (a sample of real clicks per shape must agree with it),
   and the keyboard sweep dispatches key events on the stage (K1-K9 use real keys). Owner files
   and the specimen generator only: no consumer code and no stub.

   GROUPS
     M  the minimum composition (no optional module) renders, fits and reports
     R  the relation layer's first state: drawn-always relations on, drawn-on-selection relations
        off, never-drawn relations absent, in the minimum and the legend compositions: on a fresh
        mount and a remount, with URL arrival claimed and no link, on a resolved and an unresolved
        deep link, and after a selection clears; and, with motion not reduced, in the first frame
     G  the base hierarchy's geometry, computed in the browser, matches the stored reference
        within the tolerance tests/radial-geometry.mjs states
     L  every identifier renamed (object-property names, then delimiter-bearing strings) leaves the
        engine's labels and its Fit's population (short-canvas rule included) unchanged. The renaming
        puts object-property names on shown callouts; the delimiter case is proved where it can bite,
        by the Node suite's I2, I4 and X6
     S  every hierarchy shape mounts and draws every visible node
     P  pointer: click selects; a click on empty canvas clears; hover previews; a pan never selects;
        the wheel zooms about the pointer and a horizontal scroll does not
     O  overlapping marks: a click where marks overlap offers them all in a chooser, operable by
        pointer and by keyboard, closed by a pan or a zoom; every visible mark resolves from a
        click at its own center, and sampled real clicks agree
     T  touch: a tap selects; a one-finger drag pans without selecting; a pinch zooms about its centroid
     F  Fit: an explicit Fit restores the fitted view and reports it; the zoom floor; a resize refits
     K  keyboard: Tab reaches the figure; the arrows walk the hierarchy and reach every visible node;
        Enter selects and, on a selected container, frames it; Escape peels one layer
     I  two instances on one page share nothing; a second URL-arrival owner is refused; the event
        bus takes any type string
     D  destroy leaves the host as it was and silences every listener; a remount reproduces the view
     E  error paths: each named failure renders nothing and leaves the host untouched
     A  deep-link arrival: an encoded identifier selects; an unknown one is ignored and reported
     V  a second label target leaves the reader's labels and state untouched
     C  the responsive chrome (the third host, and once each shell): one window narrowed step by
        step from 1600 to 390 CSS px and widened again, with no chrome box meeting another or leaving
        the canvas, wide while the panels fit and compact once they do not; a fresh compact load
        equals a resize arrival; a wide but short canvas is compact; a reader's open panel is kept and
        re-bounded, set aside when its room is too small and restored when it returns, and forgotten
        after a reader action; Escape and explicit Fit close it; a reader's own view and selection
        survive the arrangement changing; focus moves only when its target disappears; an extreme size
        offers no panel; a phone turned keeps its panel; both themes; destroy and remount; chrome
        configuration errors; and the classes an internal challenge found, each checked: a Fit
        straddling a tier settles with no flip or refit loop, a selection never changes the
        arrangement, Escape forgets a set-aside panel, a short wide canvas keeps no unreadable
        legend strip, focus never passes through another control, and refits carry their cause
     X  controls: the isolation, teardown, reach, relation and chrome-collision checks each fail for their
        intended reason

   MEASUREMENTS (reported, not judged): per shape at 1280x800, the Fit, the names it defers, the
   pairs of marks whose shapes overlap, how the click resolution resolves at each mark's center,
   the mark centers that page chrome covers, and the keyboard reach. Accepting the input limits says nothing about legibility; these numbers are
   the evidence of what the overview actually shows. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
if (process.argv.slice(2).some((a) => a !== '--json')) { console.error('usage: radial-behavior.mjs [--json]'); process.exit(2); }

/* ----------------------------------------------------------- browser -- */
function chromePath() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!c) { console.error('Chrome not found; set $CHROME'); process.exit(2); }
  return c;
}
async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'radial-behavior-'));
  const child = spawn(chromePath(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const exited = new Promise((r) => child.once('exit', r));
  for (let i = 0; i < 150; i++) {
    try {
      const port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      if (port && (await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return { child, profile, exited, port };
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Chrome did not start');
}
async function stop(b) {
  try { b.child.kill(); } catch { /* gone */ }
  await Promise.race([b.exited, new Promise((r) => setTimeout(r, 5000))]);
  for (let i = 0; i < 5; i++) { try { fs.rmSync(b.profile, { recursive: true, force: true }); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
}
/* a read-only static server over this repository, loopback only */
function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
                  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(ROOT, rel);
    if (req.method !== 'GET' || !f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}
const KEYS = { Tab: 9, Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, ' ': 32 };
async function open(b, url, { width = 1280, height = 800, touch = false, scheme = 'light', motion = 'reduce', ready = true } = {}) {
  const tgt = await (await fetch(`http://127.0.0.1:${b.port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(), errors = []; let loaded; const onLoad = new Promise((r) => { loaded = r; });
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
    if (m.method === 'Page.loadEventFired') loaded();
    if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
  });
  const call = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await call('Page.enable'); await call('Runtime.enable');
  const size = async (w, h) => call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: touch });
  await size(width, height);
  if (touch) await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }] });
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
  await call('Page.navigate', { url });
  await Promise.race([onLoad, new Promise((r) => setTimeout(r, 15000))]);
  const ev = async (expression) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  for (let i = 0; ready && i < 100 && !(await ev('document.documentElement.dataset.ready === "1"')); i++) await new Promise((r) => setTimeout(r, 50));
  await ev('document.fonts ? document.fonts.ready : null');
  const frames = () => ev('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
  const mouse = (type, x, y, extra = {}) => call('Input.dispatchMouseEvent', Object.assign({ type, x, y, button: 'none' }, extra));
  const P = {
    ev, frames, errors, size, call,
    async move(x, y) { await mouse('mouseMoved', x, y); await frames(); },
    async click(x, y) {
      await mouse('mouseMoved', x, y);
      await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
      await mouse('mouseReleased', x, y, { button: 'left', buttons: 0, clickCount: 1 });
      await frames();
    },
    async drag(x0, y0, x1, y1, steps = 8) {
      await mouse('mouseMoved', x0, y0);
      await mouse('mousePressed', x0, y0, { button: 'left', buttons: 1, clickCount: 1 });
      for (let i = 1; i <= steps; i++) await mouse('mouseMoved', x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, { button: 'left', buttons: 1 });
      await mouse('mouseReleased', x1, y1, { button: 'left', buttons: 0, clickCount: 1 });
      await frames();
    },
    async wheel(x, y, dx, dy) { await mouse('mouseWheel', x, y, { deltaX: dx, deltaY: dy }); await frames(); },
    async touch(type, pts) { await call('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) }); },
    async tap(x, y) { await P.touch('touchStart', [{ x, y }]); await P.touch('touchEnd', []); await new Promise((r) => setTimeout(r, 60)); await frames(); },
    async swipe(x0, y0, x1, y1, steps = 8) {
      await P.touch('touchStart', [{ x: x0, y: y0 }]);
      for (let i = 1; i <= steps; i++) await P.touch('touchMove', [{ x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps }]);
      await P.touch('touchEnd', []); await new Promise((r) => setTimeout(r, 60)); await frames();
    },
    async pinch(cx, cy, d0, d1, steps = 8) {
      const pts = (d) => [{ x: cx - d / 2, y: cy }, { x: cx + d / 2, y: cy }];
      await P.touch('touchStart', pts(d0));
      for (let i = 1; i <= steps; i++) await P.touch('touchMove', pts(d0 + (d1 - d0) * i / steps));
      await P.touch('touchEnd', []); await new Promise((r) => setTimeout(r, 60)); await frames();
    },
    async key(k) {
      const code = KEYS[k];
      const base = { key: k, code: k === ' ' ? 'Space' : k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
      if (k === 'Enter' || k === ' ') await call('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown', text: k === 'Enter' ? '\r' : ' ' }, base));
      else await call('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown' }, base));
      await call('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
      await frames();
    },
    /* event listeners on an object, counted by the browser itself */
    async listeners(expression) {
      const r = await call('Runtime.evaluate', { expression });
      const l = await call('DOMDebugger.getEventListeners', { objectId: r.result.objectId, depth: 0 });
      return l.listeners.length;
    },
    async close() { try { ws.close(); } catch { /* closed */ } await fetch(`http://127.0.0.1:${b.port}/json/close/${tgt.id}`).catch(() => {}); }
  };
  return P;
}

/* ------------------------------------------------------------ checks -- */
let failed = 0, passed = 0;
const measures = {};
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (ok) passed++; else failed++;
};
const J = (x) => JSON.stringify(x);
const near = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;
/* the relation layer's state with nothing selected */
const relationsAtRest = (r) => r.always.n > 0 && r.always.on === r.always.n && r.always.visible === r.always.n &&
  r.selection.on === 0 && r.selection.visible === 0 && r.never === 0;

/* in-page helpers, installed on each page after load */
const HELPERS = `
window.H = {
  /* events an instance emits, recorded per host */
  record(h) { const log = []; ['select', 'preview', 'focus', 'fit', 'arrival', 'destroy'].forEach((t) => FX.inst[h].on(t, (e) => log.push({ type: t, id: e.id, cause: e.cause, via: e.via }))); return (FX.log = FX.log || {})[h] = log; },
  /* the visible marks of an instance, with their centers in page coordinates */
  marks(h) { const inst = FX.inst[h]; const out = []; FX.host(h).querySelectorAll('.radial-node').forEach((g) => { const id = g.getAttribute('data-radial-id'); if (inst.model.hidden.has(id)) return; out.push(id); }); return out; },
  /* a point inside two overlapping marks, if any: the midpoint of the closest overlapping pair */
  overlapPoint(h) {
    const inst = FX.inst[h], L = inst.layout.nodes.filter((n) => !inst.model.hidden.has(n.id));
    let best = null;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0 && d < Math.min(a.r, b.r) * 0.9 && (!best || d < best.d)) best = { a: a.id, b: b.id, d, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    if (!best) return null;
    const v = inst.view(), r = FX.stageRect(h);
    return Object.assign(best, { px: r.x + best.x * v.k + v.x, py: r.y + best.y * v.k + v.y });
  },
  /* how a click at each visible mark's own center resolves, through the same function the click uses */
  centerTaps(h, tol) {
    const inst = FX.inst[h], out = { self: 0, chooser: 0, missed: [], chooserMax: 0, total: 0 };
    inst.layout.nodes.forEach((n) => {
      if (inst.model.hidden.has(n.id)) return;
      out.total++;
      const p = inst.project(n.id), t = inst.tap(p.x, p.y, tol);
      if (t.action === 'select' && t.id === n.id) out.self++;
      else if (t.action === 'choose' && t.shown.indexOf(n.id) >= 0) { out.chooser++; out.chooserMax = Math.max(out.chooserMax, t.shown.length); }
      else out.missed.push(n.id);
    });
    return out;
  },
  /* pairs of visible marks whose drawn extents overlap (world space, so at every zoom) */
  overlappingPairs(h) {
    const inst = FX.inst[h], L = inst.layout.nodes.filter((n) => !inst.model.hidden.has(n.id));
    const ext = (n) => n.kind === 'leaf' ? n.r * 1.35 : n.kind === 'container' && n.depth === 1 ? n.r : n.r;
    let pairs = 0, cont = 0;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < ext(a) + ext(b)) { pairs++; if (a.kind !== 'leaf' && b.kind !== 'leaf') cont++; }
    }
    return { pairs, containerPairs: cont };
  },
  /* walk the whole hierarchy with the documented keys, dispatched on the stage, and return what was reached */
  walk(h) {
    const inst = FX.inst[h], st = FX.host(h).querySelector('[data-radial-slot="stage"]');
    const key = (k) => st.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    const focus = () => inst.state().selection.focus;
    const seen = new Set(), add = (x) => { if (x) seen.add(x); };
    inst.focus(inst.model.root.id); add(focus());
    (function visit() {
      const here = focus();
      key('ArrowDown');
      if (focus() === here) return;                          /* a leaf, or an empty container */
      const first = focus();
      do { add(focus()); visit(); key('ArrowRight'); } while (focus() !== first);
      key('ArrowUp');
    })();
    return { reached: seen.size, visible: inst.layout.nodes.filter((n) => !inst.model.hidden.has(n.id)).length };
  },
  snapshot(h) { return FX.host(h).outerHTML; },
  /* the relation layer as drawn: per plane policy, how many paths, how many on, how many visible */
  relations(h) {
    const host = FX.host(h), all = (cls) => [...host.querySelectorAll('.radial-edge--' + cls)];
    const st = (els) => ({ n: els.length, on: els.filter((e) => e.classList.contains('is-on')).length,
                           visible: els.filter((e) => +getComputedStyle(e).opacity > 0.3).length });
    return { always: st(all('always')), selection: st(all('selection')), never: all('never').length,
             undrawn: FX.inst[h].report().undrawnRelations };
  },
  /* the relations incident to a node, by plane policy */
  incident(h, id) {
    const inst = FX.inst[h], out = { always: 0, selection: 0 };
    inst.model.relations.forEach((e) => { if (e.from === id || e.to === id) { const d = inst.model.planes.get(e.plane).drawn; if (out[d] !== undefined) out[d]++; } });
    return out;
  },
  code(f) { try { f(); return 'accepted'; } catch (e) { return e.code || e.message; } }
};`;

async function page(b, base, opts = {}) {
  const p = await open(b, `${base}/tests/radial-fixture.html${opts.hash || ''}`, opts);
  await p.ev(HELPERS);
  return p;
}

async function run() {
  const b = await launch(), { srv, base } = await serve();
  const version = await (await fetch(`http://127.0.0.1:${b.port}/json/version`)).json();
  console.log(`RUNTIME  node ${process.version} (V8 ${process.versions.v8}, ${process.platform}-${process.arch}) · ${version.Browser} (V8 ${version['V8-Version']})`);
  try {
    /* ---------------------------------------------------------------- M -- */
    {
      const p = await page(b, base);
      const r = await p.ev(`(() => { const i = FX.mount('A', 'specimen', { noArrival: true }); const rep = i.report(), f = rep.fit;
        return { marks: FX.host('A').querySelectorAll('.radial-node').length, nodes: i.layout.nodes.length, modules: rep.modules,
          legend: FX.host('A').querySelector('[data-radial-slot="legend"]').childNodes.length, clear: f.clear, k: f.scale,
          atFit: i.view().atFit, svg: FX.host('A').querySelectorAll('svg.radial-svg').length }; })()`);
      check('M1 the minimum composition renders every node and fits', r.marks === r.nodes && r.svg === 1 && r.atFit && r.modules.length === 0, J(r));
      check('M2 with no legend listed, the legend slot is left untouched', r.legend === 0);
      check('M3 the minimum composition\'s first Fit is clear at 1280x800', r.clear === true);
      check('M4 no exception', p.errors.length === 0, p.errors.join(' | '));
      await p.close();
    }

    {
      const p = await page(b, base);
      const settle = () => p.ev(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 200)))`);
      await p.ev(`FX.host('A').style.display = 'none'; FX.mount('A', 'specimen', { noArrival: true }); true`);
      await p.ev(`FX.host('A').style.display = ''; true`); await settle(); await p.frames();
      const geo = `(() => { const v = FX.inst.A.view(); return JSON.stringify([FX.inst.A.labels(), v.k, v.x, v.y, v.atFit]); })()`;
      const hidden = await p.ev(geo);
      await p.ev(`FX.inst.A.destroy(); FX.mount('A', 'specimen', { noArrival: true }); true`); await settle();
      const shown = await p.ev(geo);
      check('M5 a map mounted in a hidden host and then shown measures and fits as one mounted visible', hidden === shown && p.errors.length === 0);
      await p.close();
    }

    /* ---------------------------------------------------------------- R -- */
    {
      const settle = (p) => p.ev(`new Promise((r) => setTimeout(r, 120))`).then(() => p.frames());
      /* a node with incident relations of both drawn planes, for the deep-link cases */
      const Gm = await import('../tools/gen-radial-specimen.mjs');
      const spec = Gm.specimen(), placed = new Set(spec.nodes.map((n) => n.id));
      const ends = (plane) => new Set(spec.edges.filter((e) => e.plane === plane && placed.has(e.from) && placed.has(e.to)).flatMap((e) => [e.from, e.to]));
      const onSel = ends('crew'), target = [...ends('greenway')].find((id) => onSel.has(id));
      for (const [label, mods] of [['minimum', []], ['legend', ['legend']]]) {
        const p = await page(b, base);
        await p.ev(`FX.mount('A', 'specimen', { noArrival: true, modules: ${J(mods)} }); true`); await settle(p);
        const fresh = await p.ev(`H.relations('A')`);
        check(`R1 ${label} composition, fresh mount: every drawn-always relation is on and visible; none drawn on selection is; never-drawn ones are absent`,
          relationsAtRest(fresh) && fresh.undrawn > 0, J(fresh));
        await p.ev(`FX.inst.A.destroy(); FX.mount('A', 'specimen', { noArrival: true, modules: ${J(mods)} }); true`); await settle(p);
        const again = await p.ev(`H.relations('A')`);
        check(`R2 ${label} composition, remount: the same first state`, relationsAtRest(again) && J(again) === J(fresh), J(again));
        await p.ev(`FX.inst.A.destroy(); FX.mount('A', 'specimen', { modules: ${J(mods)} }); true`); await settle(p);
        /* the claim is shown by its effect: a second instance claiming URL arrival is refused */
        const shipped = await p.ev(`({ secondClaim: H.code(() => FX.mount('B', 'flat', { adapter: { arrival: { hash: true } } })), rel: H.relations('A') })`);
        check(`R3 ${label} composition, URL arrival claimed (the specimen's own adapter) and no link: the same first state`,
          shipped.secondClaim === 'ARRIVAL_OWNER_CONFLICT' && relationsAtRest(shipped.rel), J(shipped));
        await p.close();
        const d = await page(b, base, { hash: '#node=' + encodeURIComponent(target) });
        await d.ev(`FX.mount('A', 'specimen', { modules: ${J(mods)} }); true`); await settle(d);
        const arr = await d.ev(`({ sel: FX.inst.A.state().selection.locked, rel: H.relations('A'), inc: H.incident('A', ${J(target)}) })`);
        check(`R4 ${label} composition, deep-link arrival: the arriving node's relations of both drawn planes show, and the other drawn-always ones are hidden`,
          arr.sel === target && arr.inc.always > 0 && arr.inc.selection > 0 && arr.rel.always.on === arr.inc.always && arr.rel.always.visible === arr.inc.always &&
          arr.rel.selection.on === arr.inc.selection && arr.rel.selection.visible === arr.inc.selection && arr.rel.never === 0, J(arr));
        const sr = await d.ev(`FX.stageRect('A')`);
        await d.click(sr.x + 30, sr.y + 30); await settle(d);
        const cleared = await d.ev(`({ sel: FX.inst.A.state().selection.locked, rel: H.relations('A') })`);
        check(`R5 ${label} composition: when the selection clears, the first state returns`, cleared.sel === null && relationsAtRest(cleared.rel), J(cleared));
        await d.close();
        const q = await page(b, base, { hash: '#node=NOT-A-NODE' });
        await q.ev(`FX.mount('A', 'specimen', { modules: ${J(mods)} }); true`); await settle(q);
        const unk = await q.ev(`({ sel: FX.inst.A.state().selection.locked, rel: H.relations('A') })`);
        check(`R6 ${label} composition, an arrival that does not resolve: the first state`, unk.sel === null && relationsAtRest(unk.rel), J(unk));
        await q.close();
      }
      /* motion not reduced: the drawn-always relations are visible in the first frame after mount, not faded in */
      const m = await page(b, base, { motion: 'no-preference' });
      const first = await m.ev(`new Promise((r) => { FX.mount('A', 'specimen', { noArrival: true }); requestAnimationFrame(() => r(H.relations('A'))); })`);
      check('R7 with motion not reduced, the first frame after mount already shows every drawn-always relation', relationsAtRest(first), J(first));
      await m.close();
      /* the predicate itself: it rejects drawn-always relations left off, and a drawn-on-selection relation left on */
      const x = await page(b, base);
      await x.ev(`FX.mount('A', 'specimen', { noArrival: true }); true`); await settle(x);
      await x.ev(`FX.host('A').querySelectorAll('.radial-edge--always').forEach((e) => e.classList.remove('is-on')); true`); await settle(x);
      const offState = await x.ev(`H.relations('A')`);
      await x.ev(`FX.inst.A.destroy(); FX.mount('A', 'specimen', { noArrival: true }); FX.host('A').querySelector('.radial-edge--selection').classList.add('is-on'); true`); await settle(x);
      const onState = await x.ev(`H.relations('A')`);
      check('X5 the first-state predicate rejects drawn-always relations left off, and a drawn-on-selection relation left on',
        !relationsAtRest(offState) && !relationsAtRest(onState), J({ offState, onState }));
      await x.close();
    }

    /* ---------------------------------------------------------------- G -- */
    {
      const p = await page(b, base);
      const g = await p.ev(`(async () => { const ref = await (await fetch('radial-base-equal.reference.json')).json();
        const R = DIAGRAM_RADIAL, r = FX.compare(R.layout.layout(R.contract.assemble(FX.G.base()), { allocation: 'equal', itemMax: 74 }), ref);
        return { ok: r.ok, nodes: r.nodes, exactCount: r.exactCount, numericCount: r.numericCount, maxDiff: r.maxDiff }; })()`);
      measures.geometryInBrowser = g;
      check('G1 the base hierarchy\'s geometry, computed in the browser, matches the stored reference within the tolerance', g.ok,
        `${g.nodes} nodes; structural differences ${g.exactCount}; largest numeric difference ${g.maxDiff.toExponential(2)}`);
      await p.close();
    }

    /* ---------------------------------------------------------------- L -- */
    {
      const p = await page(b, base, { width: 360, height: 640 });
      const run1 = async (name) => {
        await p.ev(`(() => { if (FX.inst.A) FX.inst.A.destroy(); FX.host('A').querySelector('[data-radial-slot="canvas"]').setAttribute('data-radial-short', '');
          FX.mount('A', ${J(name)}, { adapter: JSON.parse(JSON.stringify(FX.G.ADAPTER)), noArrival: true }); return true; })()`);
        await p.ev(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 150)))`); await p.frames();
        return p.ev(`(() => { const i = FX.inst.A, f = i.report().fit;
          return JSON.stringify({ labels: i.labels().map((e) => [e.show, e.held, e.name, e.count]), fit: [f.scale, f.tx, f.ty, f.labelsUnder, f.labelsOutside, f.overprinted, f.obscured, f.deferred, f.clear] }); })()`);
      };
      const plainRun = await run1('specimen'), renamedRun = await run1('specimenRenamed');
      const summary = JSON.parse(plainRun).fit;
      check('L1 every identifier renamed leaves the engine\'s labels, its Fit and its population unchanged (short-canvas rule on)', plainRun === renamedRun,
        `360x640 short canvas · deferred ${J(summary[7])} · clear ${summary[8]}`);
      await p.close();
    }

    /* ---------------------------------------------------------------- S -- */
    {
      const p = await page(b, base);
      for (const name of ['specimen', 'base', 'shallow', 'ragged', 'raggedHidden', 'deeper', 'flat', 'capacity', 'chain']) {
        const r = await p.ev(`(() => { if (FX.inst.A) FX.inst.A.destroy(); const i = FX.mount('A', ${J(name)}, { noArrival: true, modules: ['legend'] });
          const rep = i.report(), f = rep.fit;
          return { drawn: H.marks('A').length, visible: i.layout.nodes.filter((n) => !i.model.hidden.has(n.id)).length, k: f.scale,
            drawingClear: f.drawingClear, clear: f.clear, deferred: f.deferred, tier: f.tier, hidden: rep.hidden.length,
            unresolved: rep.unresolved.length, undrawn: rep.undrawnRelations, overlap: H.overlappingPairs('A'),
            taps: H.centerTaps('A', 4), walk: H.walk('A') }; })()`);
        measures[name] = r;
        check(`S ${name}: mounts and draws every visible node; the drawing clears the chrome`, r.drawn === r.visible && r.drawingClear,
          `${r.visible} visible · k ${r.k.toFixed(3)} · ${r.tier} · deferred ${J(r.deferred)}${r.hidden ? ' · hidden ' + r.hidden : ''}${r.unresolved ? ' · unresolved ' + r.unresolved : ''}`);
        check(`O ${name}: a click at each mark's center selects it or offers it in the chooser`, r.taps.missed.length === 0,
          `${r.taps.self} selected directly · ${r.taps.chooser} through the chooser (largest ${r.taps.chooserMax}) · overlapping pairs ${r.overlap.pairs} (containers ${r.overlap.containerPairs})`);
        check(`K ${name}: the arrow keys reach every visible node`, r.walk.reached === r.walk.visible, `${r.walk.reached} / ${r.walk.visible}`);
        /* a sample of real clicks at mark centers must resolve as tap() says; a center that page chrome
           covers is counted, not clicked */
        const sample = await p.ev(`(() => { const i = FX.inst.A, L = i.layout.nodes.filter((n) => !i.model.hidden.has(n.id)), out = [];
          const st = FX.host('A').querySelector('[data-radial-slot="stage"]');
          for (let j = 0; j < 8 && j < L.length; j++) { const n = L[Math.floor(j * L.length / Math.min(8, L.length))], pt = FX.at('A', n.id);
            const el = document.elementFromPoint(pt.x, pt.y), open = !!el && (el === st || st.contains(el));
            const p = i.project(n.id), t = i.tap(p.x, p.y, 4);
            out.push({ id: n.id, x: pt.x, y: pt.y, open, t }); }
          return out; })()`);
        let agree = 0, covered = 0, clicked = 0;
        for (const c of sample) {
          if (!c.open) { covered++; continue; }
          clicked++;
          await p.click(c.x, c.y);
          const got = await p.ev(`({ sel: FX.inst.A.state().selection.locked, items: [...FX.host('A').querySelectorAll('.radial-chooser-item')].length })`);
          if (c.t.action === 'select' ? got.sel === c.t.id : got.items === c.t.shown.length) agree++;
          if (got.items) await p.key('Escape');
        }
        measures[name].realClicks = { clicked, agree, covered };
        check(`O ${name}: sampled real clicks at mark centers resolve as the click resolution says`, agree === clicked && clicked > 0,
          `${agree} / ${clicked} agree · ${covered} centers under page chrome`);
      }
      check('S no exception across the shapes', p.errors.length === 0, p.errors.join(' | '));
      await p.close();
    }

    /* ---------------------------------------------------------------- P -- */
    {
      const p = await page(b, base);
      await p.ev(`FX.mount('A', 'specimen', { noArrival: true }); H.record('A'); true`);
      const id = await p.ev(`FX.inst.A.layout.nodes.find((n) => n.kind === 'container' && n.depth === 1 && n.label === 'Lower Marrowby').id`);
      const pt = await p.ev(`FX.at('A', ${J(id)})`);
      await p.click(pt.x, pt.y);
      let s = await p.ev(`({ sel: FX.inst.A.state().selection.locked, cls: FX.host('A').querySelector('.radial-node.is-selected')?.getAttribute('data-radial-id'), ev: FX.log.A.filter((e) => e.type === 'select').pop(), ro: FX.host('A').querySelector('[data-radial-readout="selection"]').textContent })`);
      check('P1 a click on a mark selects it: state, class, event and readout agree', s.sel === id && s.cls === id && s.ev.id === id && s.ev.via === 'pointer' && s.ro === 'Lower Marrowby', J(s));
      const empty = await p.ev(`(() => { const r = FX.stageRect('A'); return { x: r.x + 30, y: r.y + 30 }; })()`);
      await p.click(empty.x, empty.y);
      check('P2 a click on empty canvas clears the selection', (await p.ev(`FX.inst.A.state().selection.locked`)) === null);
      await p.move(pt.x, pt.y);
      const pv = await p.ev(`FX.inst.A.state().selection.preview`);
      await p.move(empty.x, empty.y);
      const pv2 = await p.ev(`FX.inst.A.state().selection.preview`);
      check('P3 hovering a mark previews it; leaving it ends the preview', pv === id && pv2 === null, `${pv} · ${pv2}`);
      await p.click(pt.x, pt.y);
      const v0 = await p.ev(`FX.inst.A.view()`);
      await p.drag(empty.x + 200, empty.y + 200, empty.x + 320, empty.y + 260);
      const v1 = await p.ev(`FX.inst.A.view()`), sel1 = await p.ev(`FX.inst.A.state().selection.locked`);
      check('P4 a mouse drag pans by its distance and never changes the selection', near(v1.x - v0.x, 120) && near(v1.y - v0.y, 60) && sel1 === id && !v1.atFit, `dx ${(v1.x - v0.x).toFixed(1)} dy ${(v1.y - v0.y).toFixed(1)} · selection ${sel1}`);
      const c = { x: empty.x + 400, y: empty.y + 300 }, sr = await p.ev(`FX.stageRect('A')`);
      const w0 = await p.ev(`FX.inst.A.view()`);
      await p.wheel(c.x, c.y, 0, -100);
      const w1 = await p.ev(`FX.inst.A.view()`);
      const wx0 = (c.x - sr.x - w0.x) / w0.k, wx1 = (c.x - sr.x - w1.x) / w1.k;
      check('P5 the wheel zooms one step about the pointer', near(w1.k / w0.k, 1.13, 1e-6) && near(wx0, wx1, 1e-6), `k ${w0.k.toFixed(4)} -> ${w1.k.toFixed(4)}`);
      await p.wheel(c.x, c.y, 60, 0);
      const w2 = await p.ev(`FX.inst.A.view()`);
      check('P6 a horizontal scroll (deltaY 0) does not zoom (a declared correction of the donor)', w2.k === w1.k && w2.x === w1.x && w2.y === w1.y);
      /* the triangle's true shape: at a large zoom, a point inside its bounding box but outside the drawn
         triangle does not hit it, and its centroid does */
      const tri = await p.ev(`(() => { const i = FX.inst.A, n = i.layout.nodes.find((x) => x.kind === 'leaf' && x.kindId === 'wooded');
        i.select(null); i.frame(n.parent);
        for (let j = 0; j < 30 && i.view().k < 10; j++) { const q = i.project(n.id); i.zoom(1.3, q.x, q.y); }
        const v = i.view(), r = FX.stageRect('A');
        const at = (dx, dy) => ({ x: r.x + (n.x + dx * n.r) * v.k + v.x, y: r.y + (n.y + dy * n.r) * v.k + v.y });
        return { id: n.id, k: v.k, out: at(0.9, -0.6), mid: at(0, 0.12) }; })()`);
      await p.frames();
      await p.click(tri.out.x, tri.out.y);
      const outSel = await p.ev(`FX.inst.A.state().selection.locked`);
      await p.click(tri.mid.x, tri.mid.y);
      const midSel = await p.ev(`FX.inst.A.state().selection.locked`);
      check('P8 a click outside a triangle\'s drawn edge but inside its bounding box misses it; its centroid hits it',
        outSel !== tri.id && midSel === tri.id, `k ${tri.k.toFixed(1)} · outside -> ${outSel} · centroid -> ${midSel}`);
      check('P7 no exception', p.errors.length === 0, p.errors.join(' | '));
      await p.close();
    }

    /* ---------------------------------------------------------------- O -- */
    {
      const p = await page(b, base);
      await p.ev(`FX.mount('A', 'deeper', { noArrival: true }); H.record('A'); true`);
      const o = await p.ev(`H.overlapPoint('A')`);
      check('O1 the deeper shape has overlapping marks to resolve', !!o, o ? `${o.a} · ${o.b}` : 'none');
      if (o) {
        await p.click(o.px, o.py);
        const ch = await p.ev(`(() => { const c = FX.host('A').querySelector('.radial-chooser'); if (!c) return null;
          return { items: [...c.querySelectorAll('.radial-chooser-item')].map((b) => b.querySelector('.radial-chooser-lbl').textContent), focused: c.contains(document.activeElement), overlay: FX.inst.A.state().overlays }; })()`);
        const labels = await p.ev(`[${J(o.a)}, ${J(o.b)}].map((x) => FX.inst.A.layout.nodes.find((n) => n.id === x).label)`);
        check('O2 a click where marks overlap opens the chooser with both, and moves focus into it',
          !!ch && labels.every((l) => ch.items.includes(l)) && ch.focused && ch.overlay.includes('chooser'), J(ch));
        const second = ch.items[1];                             /* the chooser's own second entry */
        await p.key('ArrowDown');
        await p.key('Enter');
        const after = await p.ev(`({ selLabel: (FX.inst.A.layout.nodes.find((n) => n.id === FX.inst.A.state().selection.locked) || {}).label, sel: FX.inst.A.state().selection.locked, open: !!FX.host('A').querySelector('.radial-chooser'), focus: document.activeElement === FX.host('A').querySelector('[data-radial-slot="stage"]'), via: FX.log.A.filter((e) => e.type === 'select').pop()?.via })`);
        check('O3 the chooser is operable by keyboard: ArrowDown then Enter selects the second mark and returns focus to the figure',
          after.selLabel === second && !after.open && after.focus && after.via === 'chooser', J(Object.assign({ second }, after)));
        await p.click(o.px, o.py);
        const before = await p.ev(`FX.inst.A.state().selection.locked`);
        await p.key('Escape');
        const esc = await p.ev(`({ open: !!FX.host('A').querySelector('.radial-chooser'), sel: FX.inst.A.state().selection.locked })`);
        check('O4 Escape closes the chooser first and keeps the selection', !esc.open && esc.sel === before, J(esc));
        await p.click(o.px, o.py);
        const item = await p.ev(`(() => { const b = FX.host('A').querySelectorAll('.radial-chooser-item')[0]; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        await p.click(item.x, item.y);
        check('O5 a pointer click on a chooser item selects it', (await p.ev(`FX.log.A.filter((e) => e.type === 'select').pop().via`)) === 'chooser');
        const sr = await p.ev(`FX.stageRect('A')`);
        await p.click(o.px, o.py);
        await p.drag(sr.x + 60, sr.y + 60, sr.x + 140, sr.y + 100);
        const afterPan = await p.ev(`!!FX.host('A').querySelector('.radial-chooser')`);
        await p.click(o.px + 80, o.py + 40);
        const reopened = await p.ev(`!!FX.host('A').querySelector('.radial-chooser')`);
        await p.wheel(sr.x + 300, sr.y + 300, 0, -100);
        const afterWheel = await p.ev(`!!FX.host('A').querySelector('.radial-chooser')`);
        check('O7 a pan or a wheel zoom closes the chooser, whose list belongs to the point it opened at', !afterPan && reopened && !afterWheel,
          J({ afterPan, reopened, afterWheel }));
      }
      check('O6 no exception', p.errors.length === 0, p.errors.join(' | '));
      await p.close();
    }

    /* ---------------------------------------------------------------- T -- */
    {
      const p = await page(b, base, { width: 390, height: 844, touch: true });
      await p.ev(`FX.mount('A', 'specimen', { noArrival: true }); H.record('A'); true`);
      const id = await p.ev(`FX.inst.A.layout.nodes.find((n) => n.kind === 'container' && n.depth === 1 && n.label === 'Lower Marrowby').id`);
      const pt = await p.ev(`FX.at('A', ${J(id)})`);
      await p.tap(pt.x, pt.y);
      const t1 = await p.ev(`({ sel: FX.inst.A.state().selection.locked, via: FX.log.A.filter((e) => e.type === 'select').pop()?.via })`);
      check('T1 a tap on a mark selects it', t1.sel === id && t1.via === 'pointer', J(t1));
      const v0 = await p.ev(`FX.inst.A.view()`), sr = await p.ev(`FX.stageRect('A')`);
      await p.swipe(sr.x + 60, sr.y + 120, sr.x + 140, sr.y + 180);
      const v1 = await p.ev(`FX.inst.A.view()`), s1 = await p.ev(`FX.inst.A.state().selection.locked`);
      check('T2 a one-finger drag pans by its distance and the tap that ends it changes nothing', near(v1.x - v0.x, 80) && near(v1.y - v0.y, 60) && s1 === id,
        `dx ${(v1.x - v0.x).toFixed(1)} dy ${(v1.y - v0.y).toFixed(1)} · selection ${s1}`);
      const c = { x: sr.x + 190, y: sr.y + 380 };
      const wx0 = (c.x - sr.x - v1.x) / v1.k, wy0 = (c.y - sr.y - v1.y) / v1.k;
      await p.pinch(c.x, c.y, 80, 200);
      const v2 = await p.ev(`FX.inst.A.view()`);
      const wx1 = (c.x - sr.x - v2.x) / v2.k, wy1 = (c.y - sr.y - v2.y) / v2.k;
      check('T3 a pinch zooms by the ratio of finger spread and keeps the world point under its centroid',
        near(v2.k / v1.k, 2.5, 0.02) && near(wx0, wx1, 0.5) && near(wy0, wy1, 0.5), `k ${v1.k.toFixed(3)} -> ${v2.k.toFixed(3)}`);
      check('T4 no exception', p.errors.length === 0, p.errors.join(' | '));
      await p.close();
    }

    /* ---------------------------------------------------------------- F -- */
    {
      const p = await page(b, base);
      await p.ev(`FX.mount('A', 'specimen', { noArrival: true }); H.record('A'); true`);
      const v0 = await p.ev(`FX.inst.A.view()`), sr = await p.ev(`FX.stageRect('A')`);
      await p.drag(sr.x + 300, sr.y + 300, sr.x + 500, sr.y + 400);
      const fitBtn = await p.ev(`(() => { const r = FX.host('A').querySelector('[data-radial-control="fit"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await p.click(fitBtn.x, fitBtn.y);
      const v1 = await p.ev(`FX.inst.A.view()`), rep = await p.ev(`(() => { const f = FX.inst.A.report().fit; return { cause: f.cause, explicit: f.explicit, clear: f.clear }; })()`);
      check('F1 the Fit control restores the fitted view and reports cause explicit', v1.atFit && v1.fitCause === 'explicit' && near(v1.k, v0.k, 1e-9) && near(v1.x, v0.x) && near(v1.y, v0.y) && rep.explicit, J(rep));
      const out = await p.ev(`(() => { const r = FX.host('A').querySelector('[data-radial-control="zoom-out"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      for (let i = 0; i < 8; i++) await p.click(out.x, out.y);
      const v2 = await p.ev(`FX.inst.A.view()`);
      check('F2 zooming out stops at the floor: the Fit\'s scale or 0.24, whichever is smaller', near(v2.k, Math.min(v0.k, 0.24), 1e-9), `k ${v2.k.toFixed(4)} · fit ${v0.k.toFixed(4)}`);
      await p.click(fitBtn.x, fitBtn.y);
      await p.size(1000, 700); await new Promise((r) => setTimeout(r, 200)); await p.frames();
      const v3 = await p.ev(`FX.inst.A.view()`);
      check('F3 a resize at the Fit refits, reported as cause resize', v3.atFit && v3.fitCause === 'resize' && v3.k !== v0.k, `k ${v0.k.toFixed(4)} -> ${v3.k.toFixed(4)}`);
      await p.ev(`FX.inst.A.zoom(1.5)`); await p.frames();
      const v4 = await p.ev(`FX.inst.A.view()`);
      await p.size(1100, 700); await new Promise((r) => setTimeout(r, 200)); await p.frames();
      const v5 = await p.ev(`FX.inst.A.view()`);
      check('F4 away from the Fit, a resize keeps the reader\'s zoom', !v5.atFit && near(v5.k, v4.k, 1e-9), `k ${v4.k.toFixed(4)} -> ${v5.k.toFixed(4)}`);
      check('F5 no exception', p.errors.length === 0, p.errors.join(' | '));
      await p.close();
    }

    /* ---------------------------------------------------------------- K -- */
    {
      const p = await page(b, base);
      await p.ev(`FX.mount('A', 'specimen', { noArrival: true }); H.record('A'); true`);
      await p.key('Tab');
      const k0 = await p.ev(`({ active: document.activeElement === FX.host('A').querySelector('[data-radial-slot="stage"]'), focus: FX.inst.A.state().selection.focus, ring: FX.host('A').querySelectorAll('.radial-focus-ring').length, live: FX.host('A').querySelector('[data-radial-slot="live"]').textContent })`);
      check('K1 Tab reaches the figure; the focus starts at the root, is drawn and announced',
        k0.active && k0.focus === 'ROOT' && k0.ring === 1 && /Vellmark parks/.test(k0.live), J(k0));
      const kids = await p.ev(`FX.inst.A.layout.nodes.filter((n) => n.parent === 'ROOT').map((n) => n.id)`);
      await p.key('ArrowDown');
      const f1 = await p.ev(`FX.inst.A.state().selection.focus`);
      await p.key('ArrowRight');
      const f2 = await p.ev(`FX.inst.A.state().selection.focus`);
      await p.key('ArrowLeft'); await p.key('ArrowLeft');
      const f3 = await p.ev(`FX.inst.A.state().selection.focus`);
      check('K2 Down goes to the first child; Right and Left move around the ring and wrap',
        f1 === kids[0] && f2 === kids[1] && f3 === kids[kids.length - 1], `${f1} · ${f2} · ${f3}`);
      await p.key('ArrowUp');
      check('K3 Up goes to the parent', (await p.ev(`FX.inst.A.state().selection.focus`)) === 'ROOT');
      await p.key('ArrowDown');
      const live = await p.ev(`FX.host('A').querySelector('[data-radial-slot="live"]').textContent`);
      check('K4 a move is announced with its position', new RegExp('1 of ' + kids.length + ' in Vellmark parks').test(live), JSON.stringify(live));
      await p.key('Enter');
      const s1 = await p.ev(`({ sel: FX.inst.A.state().selection.locked, via: FX.log.A.filter((e) => e.type === 'select').pop()?.via })`);
      check('K5 Enter selects the focused node', s1.sel === kids[0] && s1.via === 'keyboard', J(s1));
      const v0 = await p.ev(`FX.inst.A.view()`);
      await p.key('Enter');
      const v1 = await p.ev(`FX.inst.A.view()`);
      check('K6 Enter on the selected container frames it', v1.fitCause === 'frame' && !v1.atFit && v1.k > v0.k, `k ${v0.k.toFixed(3)} -> ${v1.k.toFixed(3)}`);
      await p.key('Escape');
      check('K7 Escape clears the selection', (await p.ev(`FX.inst.A.state().selection.locked`)) === null);
      await p.key('Escape');
      check('K8 a further Escape with nothing to peel changes nothing', (await p.ev(`FX.inst.A.state().selection.locked`)) === null && p.errors.length === 0);
      /* a real-key walk of one whole subtree, depth first: every node of the smallest district */
      const small = await p.ev(`(() => { const L = FX.inst.A.layout.nodes; const d = L.filter((n) => n.depth === 1 && n.kind === 'container').sort((a, b) => a.count - b.count)[0];
        const under = (n) => { let x = n; while (x && x.depth > 1) x = L.find((m) => m.id === x.parent); return x && x.id === d.id; };
        return { id: d.id, size: L.filter(under).length }; })()`);
      await p.ev(`FX.inst.A.focus(${JSON.stringify(small.id)})`);
      const focusOf = () => p.ev(`FX.inst.A.state().selection.focus`);
      const seen = new Set();
      async function dfs() {                                   /* enters at a node and leaves focus on it */
        const x = await focusOf(); seen.add(x);
        await p.key('ArrowDown');
        const first = await focusOf();
        if (first === x) return;
        let cur = first;
        do { await dfs(); await p.key('ArrowRight'); cur = await focusOf(); } while (cur !== first);
        await p.key('ArrowUp');
      }
      await dfs();
      const back = await focusOf();
      check('K9 real keys walk every node of a subtree, depth first, and return to where they began', seen.size === small.size && back === small.id, `${seen.size} / ${small.size} in ${small.id}`);
      await p.close();
    }

    /* ---------------------------------------------------------------- I -- */
    {
      const p = await page(b, base);
      await p.ev(`FX.mode('two'); FX.mount('A', 'specimen', { modules: ['legend'] }); FX.mount('B', 'shallow'); H.record('A'); H.record('B'); true`);
      const ids = await p.ev(`({ a: FX.inst.A.id, b: FX.inst.B.id, ma: FX.host('A').querySelector('marker').id, mb: FX.host('B').querySelector('marker').id,
        dup: (() => { const all = [...document.querySelectorAll('[id]')].map((e) => e.id); return all.length - new Set(all).size; })() })`);
      check('I1 two instances: distinct prefixes, distinct marker ids, no repeated id in the document', ids.a !== ids.b && ids.ma !== ids.mb && ids.dup === 0, J(ids));
      const id = await p.ev(`FX.inst.A.layout.nodes.find((n) => n.kind === 'container' && n.depth === 1).id`);
      const pt = await p.ev(`FX.at('A', ${J(id)})`);
      await p.click(pt.x, pt.y);
      const s = await p.ev(`({ a: FX.inst.A.state().selection.locked, b: FX.inst.B.state().selection.locked, bEvents: FX.log.B.filter((e) => e.type !== 'fit').length })`);
      check('I2 a selection in one instance reaches nothing in the other', s.a === id && s.b === null && s.bEvents === 0, J(s));
      await p.ev(`FX.host('B').querySelector('[data-radial-slot="stage"]').focus()`);
      await p.key('Escape');
      check('I3 Escape inside the other instance leaves this selection alone', (await p.ev(`FX.inst.A.state().selection.locked`)) === id);
      const conflict = await p.ev(`(() => { FX.inst.B.destroy(); return H.code(() => FX.mount('B', 'flat', { adapter: { arrival: { hash: true } } })); })()`);
      check('I4 a second URL-arrival owner in one document is refused', conflict === 'ARRIVAL_OWNER_CONFLICT', conflict);
      const bAfter = await p.ev(`(() => { FX.mount('B', 'flat'); H.record('B'); FX.inst.A.destroy(); return FX.inst.B.select(FX.inst.B.layout.nodes[1].id); })()`);
      check('I5 destroying one instance leaves the other working', bAfter === true && p.errors.length === 0, p.errors.join(' | '));
      /* event types are strings too: prototype-named ones register, fire nothing, and unsubscribe */
      const bus = await p.ev(`(() => { const i = FX.inst.B, out = { threw: [], fired: 0 };
        for (const t of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf']) {
          try { const offFn = i.on(t, () => {}); offFn(); i.off(t, () => {}); } catch (e) { out.threw.push(t + ': ' + e.message); } }
        const offSel = i.on('select', () => { out.fired++; });
        i.select(i.layout.nodes[2].id); offSel(); i.select(i.layout.nodes[3].id);
        return out; })()`);
      check('I6 the event bus takes any type string: prototype-named types neither throw nor leak, and on() returns a working unsubscribe',
        bus.threw.length === 0 && bus.fired === 1, J(bus));
      await p.close();
    }

    /* ---------------------------------------------------------------- D -- */
    {
      const p = await page(b, base);
      const before = await p.ev(`H.snapshot('A')`);
      const STAGE = `FX.host('A').querySelector('[data-radial-slot="stage"]')`;
      const targets = { stage: STAGE, host: `FX.host('A')`, window: 'window', document: 'document', fonts: 'document.fonts',
                        hudFit: `FX.host('A').querySelector('[data-radial-control="fit"]')` };
      const count = async () => { const o = {}; for (const [k, e] of Object.entries(targets)) o[k] = await p.listeners(e); return o; };
      const c0 = await count();
      await p.ev(`FX.mount('A', 'deeper', { noArrival: true, modules: ['legend'] }); H.record('A'); true`);
      const cm = await count();
      /* the first mount can measure a name before its webfont weight has loaded; the engine's own
         font refit corrects it, so both sides of the comparison are taken once the fonts settle */
      const settle = () => p.ev(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 150)))`);
      await settle();
      const v0 = await p.ev(`FX.inst.A.view()`), l0 = await p.ev(`JSON.stringify(FX.inst.A.labels())`);
      const o = await p.ev(`H.overlapPoint('A')`);
      await p.click(o.px, o.py);
      await p.key('Escape');
      const sr = await p.ev(`FX.stageRect('A')`);
      await p.drag(sr.x + 300, sr.y + 300, sr.x + 380, sr.y + 360);
      await p.ev(`FX.host('A').querySelector('[data-radial-slot="stage"]').focus(); true`);
      await p.ev(`FX.inst.A.destroy(); true`);
      const after = await p.ev(`H.snapshot('A')`);
      check('D1 destroy leaves the host exactly as it was', after === before, after === before ? '' : `${before.length} -> ${after.length} bytes`);
      const c1 = await count();
      check('D2 destroy removes every listener the instance attached (stage, host, window, document, fonts, controls)',
        J(c1) === J(c0) && J(cm) !== J(c0), `before ${J(c0)} · mounted ${J(cm)} · after ${J(c1)}`);
      const n0 = (await p.ev(`FX.log.A.length`));
      await p.click(sr.x + 300, sr.y + 300); await p.wheel(sr.x + 300, sr.y + 300, 0, -100); await p.key('Escape');
      check('D2 after destroy, clicks, wheel and keys change nothing: no event, no host change, no exception',
        (await p.ev(`FX.log.A.length`)) === n0 && (await p.ev(`H.snapshot('A')`)) === before && p.errors.length === 0, p.errors.join(' | '));
      const dead = await p.ev(`(() => { const i = FX.inst.A; const r = [i.select(i.layout.nodes[1].id), i.focus(i.layout.nodes[1].id), i.frame(i.layout.nodes[1].id)]; i.fit(); i.zoom(2); return r; })()`);
      check('D2 a destroyed handle\'s actions do nothing and change nothing', J(dead) === '[false,false,false]' && (await p.ev(`H.snapshot('A')`)) === before);
      await p.ev(`${STAGE}.addEventListener('click', function stray() {}); true`);
      check('X4 the listener count detects one listener left on the stage', (await p.listeners(STAGE)) === c0.stage + 1);
      await p.ev(`FX.mount('A', 'deeper', { noArrival: true, modules: ['legend'] }); true`);
      await settle();
      const v1 = await p.ev(`FX.inst.A.view()`), l1 = await p.ev(`JSON.stringify(FX.inst.A.labels())`);
      check('D3 a remount reproduces the first mount\'s view and labels', near(v1.k, v0.k, 1e-12) && near(v1.x, v0.x, 1e-9) && near(v1.y, v0.y, 1e-9) && l1 === l0);
      await p.close();
    }

    /* ---------------------------------------------------------------- E -- */
    {
      const p = await page(b, base);
      const r = await p.ev(`(() => {
        const snap = () => H.snapshot('A'), base = snap(), out = {};
        const t = (k, f) => { out[k] = { code: H.code(f), untouched: snap() === base }; };
        const M = (o) => () => DIAGRAM_RADIAL.mount(Object.assign({ host: FX.host('A'), data: FX.DATA.base() }, o));
        t('module', M({ modules: ['inspector'] }));
        t('hook', M({ modules: ['legend'] }));
        t('hookShape', M({ modules: ['legend'], adapter: { legend: { headings: { state: 's', line: 'l' } } } }));
        t('theme', M({ adapter: { theme: 'own' } }));
        t('adapter', M({ adapter: { colors: {} } }));
        t('layout', M({ adapter: { layout: { allocation: 'sqrt' } } }));
        t('contract', M({ data: { root: { id: 'R', label: 'r' }, nodes: [{ id: 'n', label: { t: 1 } }] } }));
        t('option', M({ modules: 'legend' }));
        const fit = window.DIAGRAM_FIT; delete window.DIAGRAM_FIT; t('fit', M({})); window.DIAGRAM_FIT = fit;
        const ptr = window.DIAGRAM_POINTER; delete window.DIAGRAM_POINTER; t('pointer', M({})); window.DIAGRAM_POINTER = ptr;
        out.slot = { code: H.code(() => DIAGRAM_RADIAL.mount({ host: document.createElement('div'), data: FX.DATA.base() })) };
        const c = DIAGRAM_RADIAL.contract; delete DIAGRAM_RADIAL.contract; t('contractModule', M({})); DIAGRAM_RADIAL.contract = c;
        t('twiceListed', M({ modules: ['legend', 'legend'], adapter: { legend: { headings: { state: 's', line: 'l', shape: 'h' } } } }));
        t('announceKey', M({ adapter: { text: { announce: { selct: 'x' } } } }));
        t('controlKey', M({ adapter: { text: { controls: { zoomin: 'x' } } } }));
        t('headingKey', M({ modules: ['legend'], adapter: { legend: { headings: { state: 's', line: 'l', shape: 'h', extra: 'x' } } } }));
        t('layoutDate', M({ adapter: { layout: new Date(0) } }));
        t('labelsMap', M({ adapter: { labels: new Map() } }));
        DIAGRAM_RADIAL.modules.inspector = { mount() { throw new Error('planted module failure'); } };
        t('moduleThrows', M({ modules: ['inspector'], adapter: { inspector: { header: 1, sections: [] } } }));
        delete DIAGRAM_RADIAL.modules.inspector;
        const snapB = H.snapshot('B');
        out.legendSlot = { code: H.code(() => DIAGRAM_RADIAL.mount({ host: FX.host('B'), data: FX.DATA.base(), adapter: { legend: { headings: { state: 's', line: 'l', shape: 'h' } } }, modules: ['legend'] })), untouched: H.snapshot('B') === snapB };
        FX.mount('A', 'base'); out.twice = { code: H.code(M({})) };
        out.ignored = (() => { FX.inst.A.destroy(); return FX.mount('A', 'base', { adapter: { inspector: { header: 1 } } }).report().ignoredAdapterSections; })();
        return out; })()`);
      const want = { module: 'MODULE_MISSING', hook: 'HOOK_MISSING', hookShape: 'HOOK_MISSING', theme: 'MODULE_MISSING', adapter: 'ADAPTER',
                     layout: 'LAYOUT_OPTION', contract: 'NODE', option: 'MOUNT', fit: 'MODULE_MISSING', pointer: 'MODULE_MISSING',
                     contractModule: 'MODULE_MISSING', twiceListed: 'MOUNT', announceKey: 'ADAPTER', controlKey: 'ADAPTER',
                     headingKey: 'HOOK_MISSING', layoutDate: 'LAYOUT_OPTION', labelsMap: 'LABELS', moduleThrows: 'planted module failure',
                     legendSlot: 'SLOT' };
      for (const [k, code] of Object.entries(want))
        check(`E ${k}: fails as ${code} and leaves the host untouched`, r[k].code === code && r[k].untouched, J(r[k]));
      check('E a host with no stage slot fails as SLOT', r.slot.code === 'SLOT', J(r.slot));
      check('E a host that already carries an instance is refused', r.twice.code === 'HOST', J(r.twice));
      check('E an adapter section for an unlisted module is reported and ignored', J(r.ignored) === '["inspector"]', J(r.ignored));
      await p.close();
    }

    /* ---------------------------------------------------------------- A -- */
    {
      const enc = encodeURIComponent('D-HG/1 #north');
      const p = await page(b, base, { hash: `#node=${enc}` });
      await p.ev(`FX.mount('A', 'specimen'); true`);
      const a = await p.ev(`({ sel: FX.inst.A.state().selection.locked, arrival: FX.inst.A.report().arrival })`);
      check('A1 a deep link with an encoded identifier selects that node on arrival', a.sel === 'D-HG/1 #north' && a.arrival.resolved, J(a));
      await p.ev(`location.hash = '#node=NOT-A-NODE'; true`); await new Promise((r) => setTimeout(r, 100));
      const u = await p.ev(`({ sel: FX.inst.A.state().selection.locked, arrival: FX.inst.A.report().arrival })`);
      check('A2 an unknown identifier is ignored and reported unresolved', u.sel === 'D-HG/1 #north' && u.arrival.resolved === false && u.arrival.id === 'NOT-A-NODE', J(u));
      await p.ev(`location.hash = '#node=VM-HG-245'; true`); await new Promise((r) => setTimeout(r, 100));
      check('A3 a later hash change selects again', (await p.ev(`FX.inst.A.state().selection.locked`)) === 'VM-HG-245');
      await p.close();
    }

    /* ---------------------------------------------------------------- V -- */
    {
      const p = await page(b, base, { width: 390, height: 844 });
      const r = await p.ev(`(() => { const i = FX.mount('A', 'specimen', { noArrival: true }); const before = JSON.stringify([i.labels(), i.state()]);
        const cfg = DIAGRAM_RADIAL.labels.configure(FX.G.ADAPTER.labels);
        const plate = DIAGRAM_RADIAL.labels.solve({ nodes: i.layout.nodes, view: { k: 1.1, x: 1920, y: 1440 }, W: 3840, H: 2880,
          tier: cfg.tiers[1], visible: () => true, shownCount: (n) => n.count || 0, held: null, bands: {},
          measure: (s) => s.length * 7, countText: (n) => DIAGRAM_RADIAL.labels.countText(cfg, n) });
        return { same: JSON.stringify([i.labels(), i.state()]) === before, plateHeld: plate.filter((e) => e.held).length,
                 screenDeferred: i.state().lod.deferred }; })()`);
      check('V1 a second label target is independent of the screen and leaves its labels and state untouched', r.same && r.plateHeld === 0, J(r));
      await p.size(1280, 800); await new Promise((res) => setTimeout(res, 150)); await p.frames();
      const z = await p.ev(`(() => { const i = FX.inst.A; i.select('K-LM-02'); i.frame('K-LM-02');
        const W = FX.stageRect('A').w, Hh = FX.stageRect('A').h, v = i.view();
        const shown = i.labels().filter((e) => e.show && e.name && i.layout.nodes.find((n) => n.id === e.id).kind === 'container');
        const offCanvas = shown.filter((e) => { const p = i.project(e.id); return p.x < 0 || p.x > W || p.y < 0 || p.y > Hh; }).length;
        return { tier: i.state().lod.tier, shown: shown.length, offCanvas, deferred: i.state().lod.deferred, k: v.k }; })()`);
      check('V2 a framed view shows no callout whose mark is off the canvas', z.offCanvas === 0 && z.deferred.offscreen > 0, J(z));
      await p.close();
    }

    /* ---------------------------------------------------------------- C -- */
    {
      /* the chrome module on host C: one window resized through its sizes, as a reader drags it */
      const CH = `window.HC = {
        inst() { return FX.inst.C; },
        el(s) { return FX.host('C').querySelector(s); },
        box(el) { if (!el || !el.getClientRects().length) return null; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return null;
                  const r = el.getBoundingClientRect(); return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; },
        boxes() { const o = {}; [['hud', '[data-radial-slot="hud"]'], ['legend', '[data-radial-slot="legend"]'], ['caption', '[data-radial-slot="caption"]'],
                                 ['triggers', '.radial-chrome-triggers']].forEach(([k, s]) => { const b = this.box(this.el(s)); if (b) o[k] = b; }); return o; },
        collisions() { const b = this.boxes(), k = Object.keys(b), out = [], cv = this.el('[data-radial-slot="canvas"]').getBoundingClientRect();
          k.forEach((n) => { const a = b[n]; if (a.l < cv.left - 0.5 || a.t < cv.top - 0.5 || a.r > cv.right + 0.5 || a.b > cv.bottom + 0.5) out.push(n + ' outside the canvas'); });
          for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) { const a = b[k[i]], c = b[k[j]];
            if (Math.min(a.r, c.r) - Math.max(a.l, c.l) > 0.5 && Math.min(a.b, c.b) - Math.max(a.t, c.t) > 0.5) out.push(k[i] + 'x' + k[j]); }
          return out; },
        triggers() { return Array.from(FX.host('C').querySelectorAll('.radial-chrome-trigger')).map((t) => ({ label: t.textContent.replace(/[^a-z]/g, ''),
          expanded: t.getAttribute('aria-expanded'), shown: !!this.box(t), truthful: (t.getAttribute('aria-expanded') === 'true') === !document.getElementById(t.getAttribute('aria-controls')).hidden })); },
        trigger(slot) { return FX.host('C').querySelector('.radial-chrome-trigger[aria-controls="' + this.el('[data-radial-slot="' + slot + '"]').id + '"]'); },
        snap() { const c = this.inst().state(); const cv = this.el('[data-radial-slot="canvas"]').getBoundingClientRect();
          return { w: innerWidth, h: innerHeight, canvas: [Math.round(cv.width), Math.round(cv.height)], chrome: c.chrome, view: c.view, overlays: c.overlays,
                   sel: c.selection.locked, collisions: this.collisions(), triggers: this.triggers(), clear: this.inst().report().fit.clear,
                   covered: this.inst().report().fit.covered, focus: document.activeElement ? (document.activeElement.getAttribute('data-radial-control') ||
                   document.activeElement.getAttribute('data-radial-slot') || (document.activeElement.classList.contains('radial-chrome-trigger') ? 'trigger:' + document.activeElement.textContent.replace(/[^a-z]/g, '') : document.activeElement.tagName)) : null }; },
        room() { const p = this.el('[data-radial-slot="legend"]'), h = this.box(this.el('[data-radial-slot="hud"]')), t = this.box(this.el('.radial-chrome-triggers')), b = this.box(p), cv = this.el('[data-radial-slot="canvas"]').getBoundingClientRect();
          const floor = Math.min(h ? h.t : 1e9, t ? t.t : 1e9); return { panel: b, floor, top: cv.top, scroll: p.scrollTop, scrolls: p.scrollHeight > p.clientHeight + 1 }; }
      };`;
      const settleC = async (p) => { await p.frames(); await p.ev('new Promise((r) => setTimeout(r, 120))'); await p.frames(); };
      const sizeC = async (p, w, h) => { await p.size(w, h); await settleC(p); return p.ev('HC.snap()'); };
      const openC = async (w, h, o = {}) => {
        const p = await page(b, base, Object.assign({ width: w, height: h }, o));
        await p.ev(CH);
        await p.ev(`FX.mode('chrome'); FX.mount('C', 'specimen', { noArrival: true, modules: ['legend', 'chrome'] }); true`);
        await p.ev(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 150)))`);
        await settleC(p);
        return p;
      };

      /* C1-C3: the reported path. One window, wide, narrowed step by step to a phone width and widened again */
      const p = await openC(1600, 1000);
      const SEQ = [1600, 1440, 1280, 1180, 1080, 980, 900, 820, 768, 767, 700, 600, 520, 430, 390, 430, 600, 767, 768, 900, 1080, 1280, 1600];
      const seq = [];
      for (const w of SEQ) seq.push(await sizeC(p, w, 1000));
      measures.chrome = { sequence: seq.map((s) => ({ viewport: [s.w, s.h], canvas: s.canvas, arrangement: s.chrome.arrangement, open: s.chrome.open,
                                                      collisions: s.collisions, k: +s.view.k.toFixed(4), atFit: s.view.atFit })) };
      const flips = seq.map((s) => s.chrome.arrangement[0]).join('');
      check('C1 narrowing one window: no chrome box ever meets another (HUD, legend, caption, triggers) at any step, either way',
        seq.every((s) => s.collisions.length === 0), J(seq.filter((s) => s.collisions.length).map((s) => [s.w, s.collisions])));
      check('C1 wide while the panels fit beside each other, compact once they do not, and wide again on the way back', /^w+c+w+$/.test(flips) &&
        seq.every((s) => s.chrome.arrangement === 'wide' ? s.triggers.every((t) => !t.shown) && s.chrome.open === null
                                                      : s.triggers.every((t) => t.shown && t.expanded === 'false' && t.truthful)), flips);
      check('C2 entering compact closes the wide default: no panel is left open over the narrowed map', seq.filter((s) => s.chrome.arrangement === 'compact').every((s) => s.chrome.open === null && s.overlays.length === 0));
      check('C3 at Fit, each size refits the drawing with nothing reserved for a closed panel, and its report is clear',
        seq.every((s) => s.view.atFit && s.clear), J(seq.filter((s) => !s.clear).map((s) => s.w)));
      const arrived = seq[SEQ.indexOf(700)];
      await p.close();
      const f = await openC(700, 1000);
      const fresh = await f.ev('HC.snap()');
      check('C3 a fresh compact load and a resize arrival at the same size agree: arrangement, panels and view',
        fresh.chrome.arrangement === arrived.chrome.arrangement && fresh.chrome.open === arrived.chrome.open && near(fresh.view.k, arrived.view.k, 1e-9) &&
        near(fresh.view.x, arrived.view.x, 1e-6) && near(fresh.view.y, arrived.view.y, 1e-6), J([fresh.chrome, fresh.view.k, arrived.view.k]));
      await f.close();

      /* C4: the wide rule is measured, not a width: a wide but short window is compact */
      const s4 = await openC(1600, 1000);
      const tall = await s4.ev('HC.snap()');
      const capH = await s4.ev(`HC.el('[data-radial-slot="caption"]').getBoundingClientRect().height`);
      const short = await sizeC(s4, 1600, Math.floor(capH * 3) - 2);
      check('C4 a wide but short window is compact: the caption would take more than a third of the height', tall.chrome.arrangement === 'wide' &&
        short.chrome.arrangement === 'compact' && short.w === 1600, J({ capH, h: short.h, chrome: short.chrome }));
      await s4.close();

      /* C5-C11: a reader's panel, in compact, on a canvas short enough that the legend scrolls */
      const q = await openC(700, 520);
      await q.ev(`FX.inst.C.select(FX.inst.C.layout.nodes[1].id); true`); await settleC(q);
      let t = await q.ev(`(() => { const r = HC.trigger('legend').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await q.click(t.x, t.y); await settleC(q);
      let s = await q.ev('HC.snap()'), rm = await q.ev('HC.room()');
      check('C5 a reader opens the legend: one panel open, its trigger says so, and the selection is kept',
        s.chrome.open === 'legend' && s.triggers.find((x) => x.label === 'legend').expanded === 'true' && s.triggers.every((x) => x.truthful) && s.sel === (await q.ev('FX.inst.C.layout.nodes[1].id')), J(s.chrome));
      check('C5 the open panel stands above the control area and inside the canvas, scrolls, and meets no other box',
        !!rm.panel && s.collisions.length === 0 && rm.panel.b <= rm.floor - 8 + 1 && rm.panel.t >= rm.top + 18 - 1 && rm.scrolls, J({ rm, col: s.collisions }));
      check('C11 an automatic refit with a panel open reports it as covering, not clear', await q.ev(`(() => { FX.inst.C.fit('module'); const f = FX.inst.C.report().fit; return f.covered.includes('legend') && !f.clear; })()`));
      t = await q.ev(`(() => { const r = HC.trigger('caption').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await q.click(t.x, t.y); await settleC(q);
      s = await q.ev('HC.snap()');
      check('C6 opening the caption closes the legend: at most one panel is open', s.chrome.open === 'caption' && s.triggers.every((x) => x.truthful) && s.overlays.join() === 'caption', J(s.chrome));
      await q.click(t.x, t.y); await settleC(q);
      t = await q.ev(`(() => { const r = HC.trigger('legend').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await q.click(t.x, t.y); await settleC(q);
      const sc = await q.ev(`(() => { const p = HC.el('[data-radial-slot="legend"]'); p.scrollTop = Math.floor((p.scrollHeight - p.clientHeight) / 2); return p.scrollTop; })()`);
      const kept = [];
      for (const w of [600, 520]) { const x = await sizeC(q, w, 520); kept.push({ w, open: x.chrome.open, scroll: (await q.ev('HC.room()')).scroll, col: x.collisions }); }
      check('C7 a resize that stays compact keeps the reader\'s open panel and its scroll position, re-bounded', sc > 0 && kept.every((k) => k.open === 'legend' && k.scroll === sc && k.col.length === 0), J({ sc, kept }));
      /* C8: too little room sets the panel aside and stops offering the triggers; the room returning restores it */
      await q.ev(`HC.el('[data-radial-slot="legend"]').focus(); true`);
      const a1 = await sizeC(q, 520, 190);
      check('C8 too little room for a panel sets it aside and withdraws the triggers from display and the tab order; focus goes to the HUD\'s Fit control',
        a1.chrome.open === null && a1.chrome.setAside === 'legend' && !a1.chrome.offered && a1.triggers.every((x) => !x.shown) && a1.focus === 'fit', J(a1));
      const a2 = await sizeC(q, 520, 520);
      check('C8 when the room returns, the set-aside panel reopens by itself', a2.chrome.open === 'legend' && a2.chrome.offered && a2.chrome.setAside === null, J(a2.chrome));
      /* C9: a reader action forgets the set-aside panel */
      await sizeC(q, 520, 190);
      await q.ev(`FX.host('C').querySelector('[data-radial-slot="stage"]').focus(); true`);
      await q.key('ArrowDown'); await q.key('Enter'); await settleC(q);
      const a3 = await sizeC(q, 520, 520);
      check('C9 a reader\'s selection forgets the set-aside panel: the room returning does not reopen it', a3.chrome.open === null && a3.chrome.setAside === null, J(a3.chrome));
      /* C10: Escape peels the open panel before the selection, and focus returns to its trigger */
      t = await q.ev(`(() => { const r = HC.trigger('legend').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await q.click(t.x, t.y); await settleC(q);
      await q.ev(`HC.el('[data-radial-slot="legend"]').focus(); true`);
      const selBefore = (await q.ev('HC.snap()')).sel;
      await q.key('Escape'); await settleC(q);
      const e1 = await q.ev('HC.snap()');
      check('C10 Escape in the open panel closes it, keeps the selection, and returns focus to its trigger', e1.chrome.open === null && e1.sel === selBefore && selBefore !== null && e1.focus === 'trigger:legend', J(e1));
      await q.key('Escape'); await settleC(q);
      check('C10 the next Escape clears the selection', (await q.ev('HC.snap()')).sel === null);
      /* C11: an explicit Fit closes the panel that covers the drawing, through the module */
      await q.click(t.x, t.y); await settleC(q);
      const fitB = await q.ev(`(() => { const r = HC.el('[data-radial-control="fit"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await q.click(fitB.x, fitB.y); await settleC(q);
      const e2 = await q.ev('HC.snap()');
      check('C11 an explicit Fit closes the covering panel through the chrome module and reports clear, cause explicit',
        e2.chrome.open === null && e2.triggers.every((x) => x.truthful) && e2.view.fitCause === 'explicit' && e2.clear && e2.covered.length === 0, J(e2));
      await q.close();

      /* C12: a reader's own view and selection survive the arrangement changing under them */
      const m = await openC(1600, 1000);
      await m.ev(`FX.inst.C.select(FX.inst.C.layout.nodes[3].id); true`);
      const sr = await m.ev(`FX.stageRect('C')`);
      await m.wheel(sr.x + sr.w / 2, sr.y + sr.h / 2, 0, -200);
      await m.drag(sr.x + 400, sr.y + 300, sr.x + 460, sr.y + 340);
      const v0 = (await m.ev('HC.snap()')).view;
      const m1 = await sizeC(m, 700, 1000);
      const m2 = await sizeC(m, 1600, 1000);
      check('C12 away from the Fit, crossing wide to compact and back keeps the reader\'s zoom and the selection; the view is not reset',
        !v0.atFit && m1.chrome.arrangement === 'compact' && m2.chrome.arrangement === 'wide' && !m1.view.atFit && !m2.view.atFit &&
        near(m1.view.k, v0.k, 1e-9) && near(m2.view.k, v0.k, 1e-9) && m1.sel !== null && m2.sel === m1.sel, J({ v0, m1: m1.view, m2: m2.view }));
      /* C14: from compact back to wide, a focused trigger hands focus to its panel, now shown */
      await sizeC(m, 700, 1000);
      await m.ev(`HC.trigger('legend').focus(); true`);
      const w14 = await sizeC(m, 1600, 1000);
      check('C14 compact to wide shows every panel again; focus on a trigger the wide arrangement hides moves into its panel',
        w14.chrome.arrangement === 'wide' && w14.chrome.open === null && w14.focus === 'legend', J({ chrome: w14.chrome, focus: w14.focus }));
      await m.close();

      /* C15: a canvas too small for any panel offers none, rather than a strip */
      const x = await openC(320, 170);
      const xs = await x.ev('HC.snap()');
      check('C15 at an extreme size the panels yield on purpose: not offered, no trigger shown, no strip, nothing open',
        xs.chrome.arrangement === 'compact' && !xs.chrome.offered && xs.triggers.every((tt) => !tt.shown) && xs.chrome.open === null && xs.collisions.length === 0, J(xs));
      await x.close();

      /* C16: a phone turned between portrait and landscape (touch) */
      const ph = await openC(390, 844, { touch: true });
      t = await ph.ev(`(() => { const r = HC.trigger('legend').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await ph.tap(t.x, t.y); await settleC(ph);
      const r0 = await ph.ev('HC.snap()');
      const r1 = await sizeC(ph, 844, 390);
      const r2 = await sizeC(ph, 390, 844);
      check('C16 a phone turned to landscape and back keeps the tapped legend open and bounded, with no box meeting another',
        r0.chrome.open === 'legend' && r1.chrome.open === 'legend' && r2.chrome.open === 'legend' && [r0, r1, r2].every((z) => z.collisions.length === 0 && z.chrome.arrangement === 'compact'),
        J([r0, r1, r2].map((z) => [z.w, z.h, z.chrome, z.collisions])));
      measures.chrome.rotation = [r0, r1, r2].map((z) => ({ viewport: [z.w, z.h], canvas: z.canvas, chrome: z.chrome }));
      await ph.close();

      /* C17: both themes resolve the triggers and panels from the tokens */
      const themes = {};
      for (const scheme of ['light', 'dark']) {
        const d = await openC(700, 1000, { scheme });
        themes[scheme] = await d.ev(`(() => { const t = HC.trigger('legend'), p = HC.el('[data-radial-slot="legend"]'); const ct = getComputedStyle(t), cp = getComputedStyle(p);
          return { bg: ct.backgroundColor, fg: ct.color, panel: cp.backgroundColor }; })()`);
        await d.close();
      }
      check('C17 the triggers and panels take their colors from the theme in force', themes.light.bg !== themes.dark.bg && themes.light.fg !== themes.dark.fg && themes.light.panel !== themes.dark.panel, J(themes));

      /* C18: teardown and remount */
      const dd = await page(b, base, { width: 700, height: 1000 });
      await dd.ev(CH);
      await dd.ev(`FX.mode('chrome'); true`);
      const pre = await dd.ev(`FX.host('C').outerHTML`);
      await dd.ev(`FX.mount('C', 'specimen', { noArrival: true, modules: ['legend', 'chrome'] }); true`); await settleC(dd);
      const st0 = (await dd.ev('HC.snap()')).chrome, k0 = (await dd.ev('HC.snap()')).view.k;
      t = await dd.ev(`(() => { const r = HC.trigger('legend').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await dd.click(t.x, t.y); await settleC(dd);
      await dd.ev(`FX.inst.C.destroy(); true`);
      const post = await dd.ev(`FX.host('C').outerHTML`);
      const at = (() => { let i = 0; while (i < pre.length && pre[i] === post[i]) i++; return i; })();
      check('C18 destroy leaves the chrome host exactly as it was: triggers removed, every attribute and style restored', post === pre,
        post === pre ? '' : `${pre.length} -> ${post.length} bytes at ${J(post.slice(Math.max(0, at - 60), at + 40))}`);
      await dd.ev(`FX.mount('C', 'specimen', { noArrival: true, modules: ['legend', 'chrome'] }); true`); await settleC(dd);
      const st1 = (await dd.ev('HC.snap()')).chrome, k1 = (await dd.ev('HC.snap()')).view.k;
      check('C18 a remount reproduces the arrangement, the closed panels and the view', J(st1) === J(st0) && near(k1, k0, 1e-12), J([st0, st1]));
      /* C19: chrome configuration errors render nothing and leave the host untouched */
      await dd.ev(`FX.inst.C.destroy(); true`);
      const errs = await dd.ev(`(() => { const base = JSON.parse(JSON.stringify(FX.G.ADAPTER)); const out = {};
        const tryMount = (h, ad, mods) => { const before = FX.host(h).outerHTML; const c = H.code(() => DIAGRAM_RADIAL.mount({ host: FX.host(h), data: FX.DATA.base(), adapter: ad, modules: mods }));
          return { code: c, untouched: FX.host(h).outerHTML === before }; };
        const noPanels = Object.assign({}, base, { chrome: {} }); out.noPanels = tryMount('C', noPanels, ['legend', 'chrome']);
        const badSlot = Object.assign({}, base, { chrome: { panels: [{ slot: 'inspector', trigger: 'x' }] } }); out.badSlot = tryMount('C', badSlot, ['legend', 'chrome']);
        const twice = Object.assign({}, base, { chrome: { panels: [{ slot: 'legend', trigger: 'a' }, { slot: 'legend', trigger: 'b' }] } }); out.twice = tryMount('C', twice, ['legend', 'chrome']);
        const empty = Object.assign({}, base, { chrome: { panels: [{ slot: 'legend', trigger: ' ' }] } }); out.empty = tryMount('C', empty, ['legend', 'chrome']);
        const noSlot = { chrome: { panels: [{ slot: 'caption', trigger: 'x' }] } }; out.noSlot = tryMount('B', noSlot, ['chrome']);
        return out; })()`);
      const want = { noPanels: 'HOOK_MISSING', badSlot: 'HOOK_MISSING', twice: 'HOOK_MISSING', empty: 'HOOK_MISSING', noSlot: 'SLOT' };
      check('C19 a malformed chrome section, or a declared panel the host lacks, fails closed with its code and leaves the host untouched',
        Object.keys(want).every((k) => errs[k].code === want[k] && errs[k].untouched), J(errs));
      /* X7: the collision measure fails for its intended reason: the same panels without the chrome module collide */
      await dd.ev(`FX.mount('C', 'specimen', { noArrival: true, modules: ['legend'] }); true`); await settleC(dd);
      const x7 = await sizeC(dd, 820, 1000);
      check('X7 the collision measure detects panels the chrome does not coordinate meeting at 820 wide', x7.collisions.length > 0, J(x7.collisions));
      await dd.close();

      /* C21-C26: the failure classes an internal challenge found, each held by a check */
      {
        const AD = `{ chrome: { panels: [{ slot: 'caption', trigger: 'about' }, { slot: 'legend', trigger: 'legend' }] }, legend: { headings: { state: 's', line: 'l', shape: 'h' } } }`;
        const loopRun = async (shape, w, h) => {
          const lp = await page(b, base, { width: w, height: h });
          await lp.ev(CH);
          await lp.ev(`(() => { FX.mode('chrome'); window.ROERR = 0; window.addEventListener('error', (e) => { if (/ResizeObserver/.test(e.message)) ROERR++; });
            FX.mount('C', ${J(shape)}, { noArrival: true, modules: ['legend', 'chrome'], adapter: ${AD} }); return true; })()`);
          await lp.ev(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 500)))`);
          const r = await lp.ev(`new Promise((res) => { let flips = 0, fits = 0; ROERR = 0;
            new MutationObserver((m) => { flips += m.length; }).observe(HC.el('[data-radial-slot="canvas"]'), { attributes: true, attributeFilter: ['data-radial-chrome-row', 'data-radial-chrome'] });
            FX.inst.C.on('fit', () => fits++);
            setTimeout(() => res({ flips, fits, roErrors: ROERR, row: HC.el('[data-radial-slot="canvas"]').getAttribute('data-radial-chrome-row'), k: FX.inst.C.view().k }), 1500); })`);
          await lp.close();
          return r;
        };
        const l1 = await loopRun('chain', 488, 1024), l2 = await loopRun('flat', 640, 600);
        check('C21 a Fit whose scale straddles a tier settles: no arrangement or row flips, no refit, no ResizeObserver loop, for 1.5 s',
          [l1, l2].every((x) => x.flips === 0 && x.fits === 0 && x.roErrors === 0), J({ chain488: l1, flat640: l2 }));

        const sel22 = [];
        for (const w of [1000, 1100]) {
          const sp = await openC(w, 800);
          const s0 = await sp.ev('HC.snap()');
          const longest = await sp.ev(`(() => { const ns = FX.inst.C.layout.nodes.filter((n) => n.depth === 1); ns.sort((a, b) => b.label.length - a.label.length); return ns[0].id; })()`);
          const at = await sp.ev(`FX.at('C', ${J(longest)})`);
          await sp.click(at.x, at.y); await settleC(sp);
          const s1 = await sp.ev('HC.snap()');
          sel22.push({ w, before: s0.chrome.arrangement, after: s1.chrome.arrangement, sel: s1.sel === longest, col: s1.collisions });
          await sp.close();
        }
        check('C22 a reader\'s selection, with the longest label, never changes the arrangement: the HUD at its widest is already reserved',
          sel22.every((x) => x.sel && x.before === x.after && x.col.length === 0) && sel22.some((x) => x.before === 'wide'), J(sel22));

        const ep = await openC(700, 520);
        t = await ep.ev(`(() => { const r = HC.trigger('legend').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        await ep.click(t.x, t.y); await settleC(ep);
        const e0 = await sizeC(ep, 700, 150);
        await ep.key('Escape'); await settleC(ep);
        const e1 = await sizeC(ep, 700, 520);
        check('C23 Escape while a panel is set aside forgets it: the room returning does not reopen it',
          e0.chrome.setAside === 'legend' && e0.focus === 'fit' && e1.chrome.open === null && e1.chrome.setAside === null, J({ aside: e0.chrome, after: e1.chrome }));
        await ep.close();

        const hp = await openC(1600, 1000);
        const strips = [];
        for (const hh of [140, 150, 160, 170, 180, 190, 200, 220, 240]) {
          const z = await sizeC(hp, 1600, hh);
          const lg = await hp.ev(`(() => { const p = HC.el('[data-radial-slot="legend"]'); return { box: p.clientHeight, content: p.scrollHeight }; })()`);
          strips.push({ h: hh, arrangement: z.chrome.arrangement, box: lg.box, content: lg.content });
        }
        check('C24 on a short, wide canvas the legend stays in its corner only while 72px of it can be read; otherwise the arrangement is compact',
          strips.every((x) => x.arrangement === 'compact' || x.box >= Math.min(72, x.content)) && strips.some((x) => x.arrangement === 'compact'), J(strips));
        await hp.close();

        const fp = await openC(1600, 1000);
        await fp.ev(`(() => { window.FOCUSES = []; FX.host('C').addEventListener('focusin', (e) => FOCUSES.push(e.target.getAttribute('data-radial-control') || e.target.getAttribute('data-radial-slot') ||
          (e.target.classList.contains('radial-chrome-trigger') ? 'trigger:' + e.target.textContent.replace(/[^a-z]/g, '') : e.target.tagName))); HC.el('[data-radial-slot="legend"]').focus(); return true; })()`);
        const f1 = await sizeC(fp, 700, 1000);
        const seqF = await fp.ev('FOCUSES');
        check('C25 a panel holding focus as the arrangement turns compact hands focus straight to its trigger, through nothing else',
          f1.focus === 'trigger:legend' && J(seqF) === J(['legend', 'trigger:legend']), J(seqF));
        await fp.close();

        const cp = await openC(1500, 1000);
        await cp.ev(`(() => { window.FITC = []; FX.inst.C.on('fit', (e) => FITC.push(e.cause)); return true; })()`);
        const c1 = await sizeC(cp, 700, 1000);
        const causes = await cp.ev('FITC');
        check('C26 a resize at the Fit refits with the cause resize, however many times the chrome needs',
          causes.length > 0 && causes.every((x) => x === 'resize') && c1.view.fitCause === 'resize' && c1.chrome.arrangement === 'compact', J({ causes, last: c1.view.fitCause }));
        await cp.close();
      }

      /* C20: the two shells themselves, as the gallery serves them: the reference specimen and the
         synthetic composition, each with the complete module stack */
      for (const [label, file] of [['the reference shell', 'diagram-interactive-radial.html'], ['the synthetic shell', 'diagram-interactive-radial.neutral.html']]) {
        const sh = await open(b, `${base}/patterns/_preview/${file}`, { width: 1600, height: 1000, ready: false });
        await sh.ev(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 200)))`);
        const shellAt = async (w, h) => { await sh.size(w, h); await sh.frames(); await sh.ev('new Promise((r) => setTimeout(r, 120))');
          return sh.ev(`(() => { const s = RADIAL_MAP.state(); return { arrangement: s.chrome.arrangement, open: s.chrome.open, clear: RADIAL_MAP.report().fit.clear }; })()`); };
        const sh1 = await shellAt(1600, 1000), sh2 = await shellAt(820, 1000), sh3 = await shellAt(390, 844), sh4 = await shellAt(1600, 1000);
        check(`C20 ${label} lists the chrome: wide, compact with its panels closed as the window narrows, wide again; no error`,
          sh1.arrangement === 'wide' && sh2.arrangement === 'compact' && sh2.open === null && sh3.arrangement === 'compact' && sh4.arrangement === 'wide' &&
          [sh1, sh2, sh3, sh4].every((z) => z.clear) && sh.errors.length === 0, J([sh1, sh2, sh3, sh4, sh.errors]));
        await sh.close();
      }
    }

    /* ---------------------------------------------------------------- X -- */
    {
      const p = await page(b, base);
      const before = await p.ev(`H.snapshot('A')`);
      await p.ev(`FX.mount('A', 'base', { noArrival: true }); FX.inst.A.destroy(); FX.host('A').setAttribute('data-stray', '1'); true`);
      check('X1 the teardown comparison detects one stray attribute left on the host', (await p.ev(`H.snapshot('A')`)) !== before);
      await p.ev(`FX.host('A').removeAttribute('data-stray'); FX.mode('two'); FX.mount('A', 'base', { noArrival: true }); FX.mount('B', 'base', { noArrival: true }); H.record('B'); true`);
      await p.ev(`FX.inst.B.select(FX.inst.B.layout.nodes[1].id); true`);
      check('X2 the isolation count detects an event that did reach the other instance', (await p.ev(`FX.log.B.filter((e) => e.type !== 'fit').length`)) > 0);
      const w = await p.ev(`(() => { const i = FX.inst.A, st = FX.host('A').querySelector('[data-radial-slot="stage"]');
        const orig = i.state; let n = 0; const tgt = i.layout.nodes.find((x) => x.kind === 'leaf').id;
        /* plant a defect in a copy of the walk: a node whose focus is never reported */
        i.state = () => { const s = orig(); if (s.selection.focus === tgt) s.selection.focus = null; return s; };
        const r = H.walk('A'); i.state = orig; return r; })()`);
      check('X3 the reach walk detects a node the keys never report', w.reached < w.visible, `${w.reached} / ${w.visible}`);
      await p.close();
    }
  } finally {
    srv.close();
    await stop(b);
  }
  console.log(`\nRESULT ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} · ${passed} passed`);
  if (JSON_OUT) console.log(JSON.stringify({ measurements: measures }, null, 1));
  process.exitCode = failed ? 1 : 0;
}
run().catch((e) => { console.error(e); process.exit(2); });
