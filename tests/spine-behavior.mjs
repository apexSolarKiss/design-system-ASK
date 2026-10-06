#!/usr/bin/env node
/* spine-behavior.mjs — the browser behavior harness of the interactive spine pattern.

     node tests/spine-behavior.mjs           run every group; exit 1 on any failure
     node tests/spine-behavior.mjs --json    the same, with the measurements as JSON at the end

   It serves this repository read-only on 127.0.0.1, opens tests/spine-fixture.html in headless
   Chrome (no npm dependency; Node 22+, Chrome found at $CHROME or the default locations), and drives
   the owner files with real input: mouse, wheel and touch arrive through the Chrome DevTools Protocol
   as trusted events. The camera is read from #vp's transform, the selection from .node.sel and the
   inspector. tests/spine-fixture.html is the canonical shell's structure; tests/spine-error-fixture.html
   serves the fail-closed checks. Owner files only: no consumer code and no stub.

   GROUPS
     M  mouse: click selects, empty canvas clears, hover previews; a drag pans by exactly its
        distance and never changes the selection, from empty canvas or from a node; a move inside
        the tap slop does not pan; the wheel zooms one 1.12 step about the pointer and a horizontal
        scroll does not zoom; the zoom-out floor is the lower of 0.25 and the Fit's scale
     T  touch (390x844, touch emulation): a tap selects and clears; a one-finger swipe pans by its
        distance without changing the selection, from empty canvas or from a node; a pinch zooms
        about its centroid inside the same range; the stage carries touch-action: none and the
        panels do not
     F  Fit: the Fit control restores the fresh-load view after a pan and a zoom; a resize refits;
        the floor tracks the Fit on a constrained canvas
     L  lifecycle: a second render replaces the gesture controller instead of stacking it, and a
        render during a drag leaves no gesture state behind
     E  error paths: without diagrams-pointer.js, or without diagrams-fit.js, the engine fails closed
        with its named error and draws nothing

   Run against a tree without the shared pointer (the spine before it consumed the carrier),
   M3, M4, M7, T0-T6, L1, L4 and E1 fail for their stated reason (T6 because no tap selected
   anything to clear): that is the harness's own control. The rest pass there too: E2 because the fit
   guard predates the pointer, and L2 and L3 because a stale handler acts on its own detached view.
   Headless touch emulation is not iPhone or Safari evidence. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
if (process.argv.slice(2).some((a) => a !== '--json')) { console.error('usage: spine-behavior.mjs [--json]'); process.exit(2); }

/* ----------------------------------------------------------- browser -- */
function chromePath() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!c) { console.error('Chrome not found; set $CHROME'); process.exit(2); }
  return c;
}
async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-behavior-'));
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
async function open(b, url, { width = 1280, height = 800, touch = false } = {}) {
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
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Page.navigate', { url });
  await Promise.race([onLoad, new Promise((r) => setTimeout(r, 15000))]);
  const ev = async (expression) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  for (let i = 0; i < 100 && !(await ev('document.documentElement.dataset.ready === "1"')); i++) await new Promise((r) => setTimeout(r, 50));
  await ev('document.fonts ? document.fonts.ready : null');
  const frames = () => ev('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
  await frames();
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
    async listeners(expression) {
      const r = await call('Runtime.evaluate', { expression });
      const l = await call('DOMDebugger.getEventListeners', { objectId: r.result.objectId, depth: 0 });
      return l.listeners;
    },
    async close() { try { ws.close(); } catch { /* closed */ } await fetch(`http://127.0.0.1:${b.port}/json/close/${tgt.id}`).catch(() => {}); }
  };
  await ev(HELPERS);
  return P;
}

/* in-page helpers, installed on each page after load */
const HELPERS = `
window.H = {
  cam() {
    const t = (document.getElementById('vp') || { getAttribute: () => '' }).getAttribute('transform') || '';
    const m = /translate\\(([-\\d.e]+),([-\\d.e]+)\\) scale\\(([-\\d.e]+)\\)/.exec(t);
    return m ? { x: +m[1], y: +m[2], k: +m[3] } : null;
  },
  origin() { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; },
  sel() { return Array.from(document.querySelectorAll('#nodes .node.sel')).map((g) => g.getAttribute('data-id')); },
  inspectorName() { const n = document.querySelector('#inspector .name'); return n ? n.textContent : null; },
  nodes() { return Array.from(document.querySelectorAll('#nodes .node')).map((g) => g.getAttribute('data-id')); },
  center(id) { const b = document.querySelector('#nodes .node[data-id="' + id + '"] .box').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; },
  /* a point over the stage's empty canvas, at least 40px from every node box and every panel (a
     touch tap is adjusted onto a nearby target, so a point merely outside a box is not enough),
     preferring the point nearest the given fraction of the stage */
  empty(fx, fy) {
    const o = H.origin(), CL = 40;
    const rects = Array.from(document.querySelectorAll('#nodes .node .box, .inspector, .legend, .hud, .caption'))
      .map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
    const dist = (r, x, y) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
    let best = null;
    for (let gy = 0.05; gy < 0.96; gy += 0.01) for (let gx = 0.05; gx < 0.96; gx += 0.01) {
      const x = o.x + o.w * gx, y = o.y + o.h * gy;
      if (x < o.x + CL || x > o.x + o.w - CL || y < o.y + CL || y > o.y + o.h - CL) continue;
      if (rects.some((r) => dist(r, x, y) < CL)) continue;
      const e = document.elementFromPoint(x, y);
      if (!e || !(e.id === 'svg' || e.id === 'stage')) continue;
      const d = Math.hypot(gx - fx, gy - fy);
      if (!best || d < best.d) best = { x, y, d };
    }
    return best ? { x: Math.round(best.x), y: Math.round(best.y) } : null;
  },
  touchAction(sel) { const e = document.querySelector(sel); return e ? getComputedStyle(e).touchAction : null; },
  svgChildren() { const s = document.getElementById('svg'); return s ? s.childNodes.length : -1; }
};`;

/* ------------------------------------------------------------ checks -- */
let failed = 0, passed = 0;
const measures = {};
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (ok) passed++; else failed++;
};
const J = (x) => JSON.stringify(x);
const near = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;
/* the world point under a page point, for the camera c and stage origin o */
const world = (c, o, p) => ({ x: (p.x - o.x - c.x) / c.k, y: (p.y - o.y - c.y) / c.k });

const b = await launch();
const { srv, base } = await serve();
const URL0 = base + '/tests/spine-fixture.html', URLE = base + '/tests/spine-error-fixture.html';
try {
  /* ----------------------------------------------------------- M: mouse -- */
  {
    const P = await open(b, URL0);
    const ids = await P.ev('H.nodes()');
    check('M0 the fixture renders every node with no error', ids.length > 0 && P.errors.length === 0 && (await P.ev('FX.errors.length')) === 0,
      J({ nodes: ids.length, errors: P.errors.concat(await P.ev('FX.errors')) }));
    const fit0 = await P.ev('H.cam()'); measures.fit_1280x800 = fit0;
    const spineId = ids.find((i) => /spine|S/i.test(i)) || ids[2];
    const c1 = await P.ev(`H.center(${J(ids[2])})`);
    await P.click(c1.x, c1.y);
    check('M1 a click on a node selects it and the inspector shows it', J(await P.ev('H.sel()')) === J([ids[2]]) && !!(await P.ev('H.inspectorName()')),
      J({ sel: await P.ev('H.sel()'), name: await P.ev('H.inspectorName()') }));
    const e1 = await P.ev('H.empty(0.5, 0.5)');
    let cam0 = await P.ev('H.cam()');
    await P.drag(e1.x, e1.y, e1.x + 120, e1.y + 60);
    let cam1 = await P.ev('H.cam()');
    check('M2 a mouse drag on empty canvas pans by exactly its distance, keeps the scale and the selection',
      near(cam1.x - cam0.x, 120) && near(cam1.y - cam0.y, 60) && cam1.k === cam0.k && J(await P.ev('H.sel()')) === J([ids[2]]),
      J({ dx: cam1.x - cam0.x, dy: cam1.y - cam0.y, k0: cam0.k, k1: cam1.k, sel: await P.ev('H.sel()') }));
    const c2 = await P.ev(`H.center(${J(ids[3])})`);
    cam0 = await P.ev('H.cam()');
    await P.drag(c2.x, c2.y, c2.x + 100, c2.y + 40);
    cam1 = await P.ev('H.cam()');
    check('M3 a mouse drag that starts on a node pans by its distance and neither selects that node nor clears the selection',
      near(cam1.x - cam0.x, 100) && near(cam1.y - cam0.y, 40) && J(await P.ev('H.sel()')) === J([ids[2]]),
      J({ dx: cam1.x - cam0.x, dy: cam1.y - cam0.y, sel: await P.ev('H.sel()') }));
    const e2 = await P.ev('H.empty(0.5, 0.5)');
    cam0 = await P.ev('H.cam()');
    await P.drag(e2.x, e2.y, e2.x + 2, e2.y + 1, 2);
    cam1 = await P.ev('H.cam()');
    check('M4 a 3px move, inside the 4px mouse tap slop, does not pan, and the release clears the selection as a click',
      cam1.x === cam0.x && cam1.y === cam0.y && (await P.ev('H.sel()')).length === 0,
      J({ dx: cam1.x - cam0.x, dy: cam1.y - cam0.y, sel: await P.ev('H.sel()') }));
    const c3 = await P.ev(`H.center(${J(ids[4] || ids[1])})`);
    await P.move(c3.x, c3.y);
    const hov = await P.ev('H.sel()');
    const e3 = await P.ev('H.empty(0.5, 0.5)');
    await P.move(e3.x, e3.y);
    check('M5 hover previews a node and leaving clears the preview (nothing locked)', hov.length === 1 && (await P.ev('H.sel()')).length === 0,
      J({ hover: hov, after: await P.ev('H.sel()') }));
    const o = await P.ev('H.origin()');
    cam0 = await P.ev('H.cam()');
    const wp = { x: e3.x, y: e3.y }, w0 = world(cam0, o, wp);
    await P.wheel(wp.x, wp.y, 0, -100);
    cam1 = await P.ev('H.cam()');
    const w1 = world(cam1, o, wp);
    check('M6 one wheel step zooms ×1.12 about the pointer', near(cam1.k / cam0.k, 1.12, 1e-6) && near(w1.x, w0.x) && near(w1.y, w0.y),
      J({ ratio: cam1.k / cam0.k, w0, w1 }));
    cam0 = await P.ev('H.cam()');
    await P.wheel(wp.x, wp.y, 120, 0);
    cam1 = await P.ev('H.cam()');
    check('M7 a horizontal scroll (deltaY 0) does not zoom', cam1.k === cam0.k && cam1.x === cam0.x && cam1.y === cam0.y, J({ k0: cam0.k, k1: cam1.k }));
    for (let i = 0; i < 40; i++) await P.wheel(wp.x, wp.y, 0, 100);
    cam1 = await P.ev('H.cam()');
    check('M8 the wheel zoom-out floor is the lower of 0.25 and the Fit scale', near(cam1.k, Math.min(0.25, fit0.k), 1e-9),
      J({ k: cam1.k, floor: Math.min(0.25, fit0.k), fit: fit0.k }));
    check('M9 no exception during the mouse group', P.errors.length === 0, J(P.errors));
    await P.close();
  }

  /* ----------------------------------------------------------- T: touch -- */
  {
    const P = await open(b, URL0, { width: 390, height: 844, touch: true });
    const ids = await P.ev('H.nodes()');
    const fit0 = await P.ev('H.cam()'); measures.fit_390x844 = fit0;
    check('T0 the stage carries touch-action: none; the inspector, legend and HUD keep native gestures',
      (await P.ev('H.touchAction("#stage")')) === 'none' && (await P.ev('H.touchAction("#inspector")')) !== 'none' &&
      (await P.ev('H.touchAction(".legend")')) !== 'none' && (await P.ev('H.touchAction(".hud")')) !== 'none',
      J({ stage: await P.ev('H.touchAction("#stage")'), inspector: await P.ev('H.touchAction("#inspector")'), legend: await P.ev('H.touchAction(".legend")') }));
    const vis = [];
    for (const id of ids) { const c = await P.ev(`H.center(${J(id)})`); const top = await P.ev(`(function(){const e=document.elementFromPoint(${c.x},${c.y});return e&&e.closest('.node')?e.closest('.node').getAttribute('data-id'):null})()`); if (top === id) vis.push(id); }
    const a = vis[0], bId = vis[1];
    let ca = await P.ev(`H.center(${J(a)})`);
    await P.tap(ca.x, ca.y);
    check('T1 a tap on a node selects it', J(await P.ev('H.sel()')) === J([a]), J({ tapped: a, sel: await P.ev('H.sel()') }));
    const e1 = await P.ev('H.empty(0.5, 0.6)');
    let cam0 = await P.ev('H.cam()');
    await P.swipe(e1.x, e1.y, e1.x + 80, e1.y + 60);
    let cam1 = await P.ev('H.cam()');
    check('T2 a one-finger swipe on empty canvas pans by its distance and keeps the selection',
      near(cam1.x - cam0.x, 80) && near(cam1.y - cam0.y, 60) && cam1.k === cam0.k && J(await P.ev('H.sel()')) === J([a]),
      J({ dx: cam1.x - cam0.x, dy: cam1.y - cam0.y, sel: await P.ev('H.sel()') }));
    const cb = await P.ev(`H.center(${J(bId)})`);
    cam0 = await P.ev('H.cam()');
    await P.swipe(cb.x, cb.y, cb.x - 50, cb.y + 70);
    cam1 = await P.ev('H.cam()');
    check('T3 a swipe that starts on a node pans and does not select it', near(cam1.x - cam0.x, -50) && near(cam1.y - cam0.y, 70) && J(await P.ev('H.sel()')) === J([a]),
      J({ dx: cam1.x - cam0.x, dy: cam1.y - cam0.y, sel: await P.ev('H.sel()') }));
    const o = await P.ev('H.origin()');
    const e2 = await P.ev('H.empty(0.5, 0.5)');
    cam0 = await P.ev('H.cam()');
    const w0 = world(cam0, o, e2);
    await P.pinch(e2.x, e2.y, 80, 200);
    cam1 = await P.ev('H.cam()');
    const w1 = world(cam1, o, e2);
    const want = Math.min(3, cam0.k * 2.5);
    check('T4 a pinch zooms about its centroid (×2.5 inside the range) and keeps the selection',
      near(cam1.k, want, 0.02 * want) && near(w1.x, w0.x) && near(w1.y, w0.y) && J(await P.ev('H.sel()')) === J([a]),
      J({ k0: cam0.k, k1: cam1.k, want, w0, w1, sel: await P.ev('H.sel()') }));
    for (let i = 0; i < 4; i++) { const e = await P.ev('H.empty(0.5, 0.5)'); await P.pinch(e.x, e.y, 240, 40); }
    cam1 = await P.ev('H.cam()');
    check('T5 pinching in stops at the same floor as the wheel: the lower of 0.25 and the Fit scale', near(cam1.k, Math.min(0.25, fit0.k), 1e-9),
      J({ k: cam1.k, floor: Math.min(0.25, fit0.k), fit: fit0.k }));
    const e3 = await P.ev('H.empty(0.5, 0.5)');
    const held = await P.ev('H.sel()');
    await P.tap(e3.x, e3.y);
    const left = await P.ev('H.sel()');
    check('T6 a tap on empty canvas clears the selection', held.length === 1 && left.length === 0, J({ before: held, after: left }));
    check('T7 no exception during the touch group', P.errors.length === 0, J(P.errors));
    await P.close();
  }

  /* ------------------------------------------------------------- F: Fit -- */
  {
    const P = await open(b, URL0, { width: 1280, height: 800 });
    const fit0 = await P.ev('H.cam()');
    const e = await P.ev('H.empty(0.5, 0.5)');
    await P.drag(e.x, e.y, e.x + 150, e.y - 70);
    await P.wheel(e.x, e.y, 0, -100); await P.wheel(e.x, e.y, 0, -100);
    const moved = await P.ev('H.cam()');
    await P.ev('document.getElementById("zoomFit").click()'); await P.frames();
    const back = await P.ev('H.cam()');
    check('F1 the Fit control restores the fresh-load view after a pan and a zoom',
      (moved.x !== fit0.x || moved.k !== fit0.k) && near(back.x, fit0.x, 1e-6) && near(back.y, fit0.y, 1e-6) && near(back.k, fit0.k, 1e-9),
      J({ fit0, moved, back }));
    await P.size(900, 600); await P.frames(); await new Promise((r) => setTimeout(r, 100)); await P.frames();
    const resized = await P.ev('H.cam()');
    const P2 = await open(b, URL0, { width: 900, height: 600 });
    const fresh = await P2.ev('H.cam()'); await P2.close();
    check('F2 a resize refits: the view equals a fresh load at the new size', near(resized.x, fresh.x, 1e-6) && near(resized.y, fresh.y, 1e-6) && near(resized.k, fresh.k, 1e-9),
      J({ resized, fresh }));
    await P.close();
    const P3 = await open(b, URL0, { width: 700, height: 420 });
    const f3 = await P3.ev('H.cam()');
    const e3 = await P3.ev('H.empty(0.5, 0.5)');
    if (e3) { for (let i = 0; i < 30; i++) await P3.wheel(e3.x, e3.y, 0, 100); }
    const floor = await P3.ev('H.cam()');
    measures.fit_700x420 = f3;
    check('F3 on a constrained canvas the floor is the Fit scale when the Fit lands below 0.25',
      !!e3 && (f3.k < 0.25 ? near(floor.k, f3.k, 1e-9) : near(floor.k, 0.25, 1e-9)), J({ at: e3, wheelSteps: e3 ? 30 : 0, fit: f3.k, floor: floor.k }));
    await P3.close();
  }

  /* ------------------------------------------------------- L: lifecycle -- */
  {
    const P = await open(b, URL0);
    await P.ev('IA_SPINE.render(window.IA_STATE_SPINE)'); await P.frames();
    const pd = (await P.listeners('document.getElementById("stage")')).filter((l) => l.type === 'pointerdown').length;
    const wh = (await P.listeners('document.getElementById("stage")')).filter((l) => l.type === 'wheel').length;
    const pm = (await P.listeners('window')).filter((l) => l.type === 'pointermove').length;
    check('L1 after a second render the stage carries one pointer controller (one pointerdown, one wheel, one window pointermove listener)',
      pd === 1 && wh === 1 && pm === 1, J({ pointerdown: pd, wheel: wh, pointermove: pm }));
    const e = await P.ev('H.empty(0.5, 0.5)');
    const c0 = await P.ev('H.cam()');
    await P.drag(e.x, e.y, e.x + 100, e.y);
    const c1 = await P.ev('H.cam()');
    check('L2 after a second render a drag pans once, not twice', near(c1.x - c0.x, 100) && near(c1.y - c0.y, 0), J({ dx: c1.x - c0.x }));
    const c2 = await P.ev('H.cam()');
    await P.wheel(e.x, e.y, 0, -100);
    const c3 = await P.ev('H.cam()');
    check('L3 after a second render one wheel event zooms one step', near(c3.k / c2.k, 1.12, 1e-6), J({ ratio: c3.k / c2.k }));
    /* a render in the middle of a drag: the stage drops the gesture's panning class, and the next
       drag pans by its distance */
    const f = await P.ev('H.empty(0.5, 0.5)');
    const md = (type, x, y, extra) => P.call('Input.dispatchMouseEvent', Object.assign({ type, x, y, button: 'none' }, extra || {}));
    await md('mouseMoved', f.x, f.y);
    await md('mousePressed', f.x, f.y, { button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 4; i++) await md('mouseMoved', f.x + 8 * i, f.y, { button: 'left', buttons: 1 });
    const mid = await P.ev('document.getElementById("stage").classList.contains("panning")');
    await P.ev('IA_SPINE.render(window.IA_STATE_SPINE)'); await P.frames();
    const after = await P.ev('document.getElementById("stage").classList.contains("panning")');
    await md('mouseReleased', f.x + 32, f.y, { button: 'left', buttons: 0, clickCount: 1 }); await P.frames();
    const g = await P.ev('H.empty(0.5, 0.5)'); const c4 = await P.ev('H.cam()');
    await P.drag(g.x, g.y, g.x + 60, g.y + 20);
    const c5 = await P.ev('H.cam()');
    check('L4 a render during a drag leaves no gesture state: the stage drops its panning class, and the next drag pans by its distance',
      mid === true && after === false && near(c5.x - c4.x, 60) && near(c5.y - c4.y, 20), J({ mid, after, dx: c5.x - c4.x, dy: c5.y - c4.y }));
    check('L5 no exception during the lifecycle group', P.errors.length === 0, J(P.errors));
    await P.close();
  }

  /* ---------------------------------------------------- E: error paths -- */
  {
    const P = await open(b, URLE + '?omit=pointer');
    const errs = await P.ev('FX.errors');
    check('E1 without diagrams-pointer.js the engine fails closed with its named error and draws nothing',
      errs.some((s) => /Diagram pointer support is missing/.test(s)) && (await P.ev('H.svgChildren()')) === 0, J({ errors: errs, svg: await P.ev('H.svgChildren()') }));
    await P.close();
    const Q = await open(b, URLE + '?omit=fit');
    const errs2 = await Q.ev('FX.errors');
    check('E2 without diagrams-fit.js the engine fails closed with its named error and draws nothing',
      errs2.some((s) => /Diagram fit support is missing/.test(s)) && (await Q.ev('H.svgChildren()')) === 0, J({ errors: errs2 }));
    await Q.close();
  }
} finally {
  srv.close();
  await stop(b);
}
console.log(`\n${passed} passed, ${failed} failed`);
if (JSON_OUT) console.log(JSON.stringify({ passed, failed, measures }, null, 1));
process.exit(failed ? 1 : 0);
