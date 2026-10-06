#!/usr/bin/env node
/* spine-behavior.mjs — the browser behavior harness of the interactive spine pattern.

     node tests/spine-behavior.mjs           run every group; exit 1 on any failure
     node tests/spine-behavior.mjs --json    the same, with the measurements as JSON at the end

   It serves this repository read-only on 127.0.0.1, opens tests/spine-fixture.html in headless
   Chrome (no npm dependency; Node 22+, Chrome found at $CHROME or the default locations), and drives
   the owner files with real input: mouse, wheel and touch arrive through the Chrome DevTools Protocol
   as trusted events. The camera is read from #vp's transform, the selection from .node.sel and the
   inspector. tests/spine-fixture.html is the canonical shell's canvas structure and stylesheets
   without the exporter; the C group opens the canonical shell itself, through the consumer mirrors
   _dsa-tokens/ and _dsa-surface/ mapped onto this repository's root; tests/spine-error-fixture.html
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
     C  composition: the canonical shell itself, exporter and font carrier included, at desktop,
        tablet, phone and short-landscape sizes in both themes: the settled first view is the Fit;
        no panel or control overlaps another; the drawing runs under no chrome, takes the largest
        clear overview the reference arrangements find and keeps at least 80% of what the canvas
        could give it with only the HUD reserved; compact triggers open one bounded, scrolling
        panel at a time, as the engine reports it entered the Fit, and a tapped node stays in view
        above its inspector; a camera the reader moved stays put through panels and late chrome;
        a resize arrives where a fresh load does; both exports read the same panels in every
        arrangement and run to their download
     E  error paths: without diagrams-pointer.js, or without diagrams-fit.js, the engine fails closed
        with its named error and draws nothing

   CONTROLS. Run against a tree without the shared pointer (the spine before it consumed the
   carrier), M3, M4, M7, T0-T6, L1, L4 and E1 fail for their stated reason (T6 because no tap
   selected anything to clear), and E2, L2 and L3 pass (the fit guard predates the pointer; a stale
   handler acts on its own detached view). Run against the spine with the pointer but before its
   responsive chrome, the C group fails for the reasons tests/README.md records. Headless touch
   emulation is not iPhone or Safari evidence. */
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
    /* `_dsa-tokens/` and `_dsa-surface/` are a consumer's token and surface-module mirrors: this
       repository's root, as tools/gen-pattern-previews.mjs and tools/check-custom-properties.mjs
       declare. The C group serves the canonical shell itself through them. */
    const rel0 = decodeURIComponent(new URL(req.url, 'http://x').pathname), mirror = /\/_dsa-(?:tokens|surface)\/(.*)$/.exec(rel0);
    const rel = mirror ? '/' + mirror[1] : rel0, f = path.join(ROOT, rel);
    if (req.method !== 'GET' || !f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}
async function open(b, url, { width = 1280, height = 800, touch = false, ready = true, dark = false } = {}) {
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
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' },
                                                         { name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
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
};
/* composition helpers (the C group): boxes in canvas coordinates */
window.HC = {
  CHROME: [['inspector', '#inspector'], ['legend', '.canvas-wrap > .legend'], ['caption', '.canvas-wrap > .caption'],
           ['hud', '.canvas-wrap > .hud'], ['triggers', '.canvas-wrap > .spine-triggers']],
  wrap() { return document.getElementById('canvasWrap'); },
  box(e) { const w = HC.wrap().getBoundingClientRect(), r = e.getBoundingClientRect(); return { l: r.left - w.left, t: r.top - w.top, r: r.right - w.left, b: r.bottom - w.top }; },
  shown(e) {
    if (!e) return false;
    for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; }
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  },
  chrome() { const out = {}; for (const [k, s] of HC.CHROME) { const e = document.querySelector(s); if (HC.shown(e)) out[k] = HC.box(e); } return out; },
  /* the drawn nodes' union box (the engine's content bounds, on screen) */
  drawing() {
    let u = null;
    document.querySelectorAll('#nodes .node .box').forEach((x) => { const r = HC.box(x); u = u ? { l: Math.min(u.l, r.l), t: Math.min(u.t, r.t), r: Math.max(u.r, r.r), b: Math.max(u.b, r.b) } : r; });
    return u;
  },
  hit(a, b, tol = 0.5) { return a.l < b.r - tol && a.r > b.l + tol && a.t < b.b - tol && a.b > b.t + tol; },
  /* panel against panel, and every panel inside the canvas */
  collisions() {
    const c = HC.chrome(), k = Object.keys(c), W = HC.wrap().clientWidth, H = HC.wrap().clientHeight, out = [];
    for (let i = 0; i < k.length; i++) {
      const a = c[k[i]];
      if (a.l < -0.5 || a.t < -0.5 || a.r > W + 0.5 || a.b > H + 0.5) out.push(k[i] + ' leaves the canvas');
      for (let j = i + 1; j < k.length; j++) if (HC.hit(a, c[k[j]])) out.push(k[i] + ' x ' + k[j]);
    }
    return out;
  },
  /* the chrome the drawing runs under */
  covered() { const d = HC.drawing(), c = HC.chrome(); return Object.keys(c).filter((k) => HC.hit(d, c[k])); },
  /* every visible control is the topmost element at its center: nothing lies over it */
  buried() {
    const bad = [];
    document.querySelectorAll('.canvas-wrap > .hud button, .canvas-wrap > .spine-triggers button').forEach((x) => {
      if (!HC.shown(x)) return;
      const r = x.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!e || !(e === x || x.contains(e))) bad.push(x.id || x.textContent.trim());
    });
    return bad;
  },
  report() { return window.IA_SPINE && IA_SPINE.report ? IA_SPINE.report() : null; },
  /* BOUND. The largest scale the canvas could give the drawing with only the HUD reserved, the
     engine's own content margin (60) and largest scale (1.4) kept: independent of every
     arrangement the engine might choose. */
  bound() {
    const w = HC.wrap(), hud = document.querySelector('.canvas-wrap > .hud'), boxes = Array.from(document.querySelectorAll('#nodes .node .box'));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    boxes.forEach((r) => { const x = +r.getAttribute('x'), y = +r.getAttribute('y'); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + +r.getAttribute('width')); y1 = Math.max(y1, y + +r.getAttribute('height')); });
    const band = HC.shown(hud) ? w.clientHeight - HC.box(hud).t + 26 : 0;
    return Math.min(w.clientWidth / (x1 - x0 + 120), (w.clientHeight - band) / (y1 - y0 + 120), 1.4);
  },
  inCanvas(d) { const w = HC.wrap(); return d.l >= -0.5 && d.t >= -0.5 && d.r <= w.clientWidth + 0.5 && d.b <= w.clientHeight + 0.5; },
  mode() { const r = HC.report(); return r && r.chrome ? r.chrome.mode : null; },
  /* the center of the i-th trigger, or null where there is none */
  tpoint(i) { const t = document.querySelectorAll('.canvas-wrap > .spine-triggers > button')[i]; if (!t || !HC.shown(t)) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
  word(t) { const l = t && t.querySelector && t.querySelector('.surface-disclosure-label'); return l ? l.textContent.trim() : null; },
  triggers() { return Array.from(document.querySelectorAll('.canvas-wrap > .spine-triggers > button')).filter(HC.shown).map(HC.word); },
  openPanels() { return ['#inspector', '.canvas-wrap > .legend', '.canvas-wrap > .caption'].filter((q) => HC.shown(document.querySelector(q))); },
  /* REFERENCE. The best clear placement this test can find for the same content, margins and
     visible chrome through the shared helper, independent of the engine's own choice: wide,
     the inspector in its lane and the caption at the bottom, the HUD and the legend each on
     either edge they occupy; compact, one bottom band. Clear is judged against the visible
     chrome inflated by the gutter, less 0.5px for the helper's float rounding. */
  reference() {
    const w = HC.wrap(), boxes = Array.from(document.querySelectorAll('#nodes .node .box'));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    boxes.forEach((r) => { const x = +r.getAttribute('x'), y = +r.getAttribute('y'), ww = +r.getAttribute('width'), hh = +r.getAttribute('height'); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + ww); y1 = Math.max(y1, y + hh); });
    const bounds = { minX: x0 - 60, minY: y0 - 60, maxX: x1 + 60, maxY: y1 + 60 };
    const base = { wrap: w, viewport: { width: w.clientWidth, height: w.clientHeight }, bounds, clearanceX: 0, clearanceY: 0, maxScale: 1.4, gutter: 26 };
    const I = '#inspector', L = '.canvas-wrap > .legend', C = '.canvas-wrap > .caption', U = '.canvas-wrap > .hud', T = '.canvas-wrap > .spine-triggers';
    const compact = w.getAttribute('data-spine-chrome') === 'compact';
    const sets = compact ? [{ top: null, left: null, right: null, bottom: [U, T, I, L, C].join(', ') }]
      : [[U, L], [U, null], [null, L], [null, null]].map(([bottomHud, rightLeg]) => ({ top: null,
          left: bottomHud ? null : U, right: rightLeg ? I + ', ' + L : I,
          bottom: [bottomHud, C, rightLeg ? null : L].filter(Boolean).join(', ') }));
    let best = null;
    for (const e of sets) {
      const r = window.DIAGRAM_FIT.compute(Object.assign({}, base, { topSelector: e.top, bottomSelector: e.bottom, leftSelector: e.left, rightSelector: e.right }));
      const d = { l: bounds.minX * r.scale + r.tx, t: bounds.minY * r.scale + r.ty, r: bounds.maxX * r.scale + r.tx, b: bounds.maxY * r.scale + r.ty };
      const g = 25.5, sel = [e.top, e.bottom, e.left, e.right].filter(Boolean).join(', ');
      const clear = Array.from(w.querySelectorAll(sel)).filter(HC.shown).map(HC.box).every((p) => !(d.l < p.r + g && d.r > p.l - g && d.t < p.b + g && d.b > p.t - g));
      if (clear && (!best || r.scale > best)) best = r.scale;
    }
    return best;
  },
  /* the page and diagram exports' SVG, captured where the exporter hands it to an image; the
     download it would trigger is swallowed */
  hookExport() {
    if (window.__exports) return;
    window.__exports = []; window.__alerts = [];
    window.alert = (m) => { window.__alerts.push(String(m)); };
    const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', { configurable: true, get() { return d.get.call(this); },
      set(v) { if (typeof v === 'string' && v.indexOf('data:image/svg+xml') === 0) window.__exports.push(decodeURIComponent(v.slice(v.indexOf(',') + 1))); d.set.call(this, v); } });
    HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download')) { window.__downloads = (window.__downloads || []).concat(this.download); return; } };
  },
  async exportSvg(id) {
    HC.hookExport();
    const n = window.__exports.length;
    document.getElementById(id).click();
    for (let i = 0; i < 200 && window.__exports.length === n; i++) await new Promise((r) => setTimeout(r, 25));
    for (let i = 0; i < 200 && document.getElementById(id).disabled; i++) await new Promise((r) => setTimeout(r, 25));
    return window.__exports[n] || null;
  }
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

  /* ---------------------------------------- C: composition, the complete shell -- */
  /* The canonical shell itself — its exporter, font carrier and surface modules included — served
     through the consumer mirrors. Its HUD therefore settles late, as a consumer's does: the
     exporter adds PNG page and PNG diagram after the first render, and the webfonts land after
     that. Each view is read once it has settled. */
  const URLS = base + '/patterns/diagram-interactive-spine/diagram-interactive-spine.html';
  const VIEWS = [
    { n: 'tall desktop 1280x1400', width: 1280, height: 1400 },
    { n: 'landscape desktop 1440x900', width: 1440, height: 900 },
    { n: 'phone portrait 390x844', width: 390, height: 844, touch: true },
    { n: 'phone portrait 390x664', width: 390, height: 664, touch: true },
    { n: 'short landscape 844x390', width: 844, height: 390, touch: true },
    { n: 'tablet portrait 768x1024', width: 768, height: 1024, touch: true },
    { n: 'half-screen desktop 960x1050', width: 960, height: 1050 },
  ];
  const settled = async (P) => {
    for (let i = 0; i < 200 && !(await P.ev('!!document.getElementById("exportPngDiagram") && !!document.getElementById("nodes")')); i++) await new Promise((r) => setTimeout(r, 25));
    await P.ev('document.fonts.ready'); await P.frames(); await new Promise((r) => setTimeout(r, 150)); await P.frames();
  };
  const openShell = async (v, extra = {}) => { const P = await open(b, URLS, Object.assign({ ready: false }, v, extra)); await settled(P); return P; };
  const fitClick = async (P) => { await P.ev('document.getElementById("zoomFit").click()'); await P.frames(); };
  const same = (a, c) => !!a && !!c && near(a.x, c.x, 1e-6) && near(a.y, c.y, 1e-6) && near(a.k, c.k, 1e-9);
  measures.composition = {};
  for (const v of VIEWS) for (const dark of [false, true]) {
    const tag = `${v.n} ${dark ? 'dark' : 'light'}`;
    const P = await openShell(v, { dark });
    const hud = await P.ev('Array.from(document.querySelectorAll(".canvas-wrap > .hud button")).map((x) => x.id || x.textContent.trim())');
    const first = await P.ev('H.cam()');
    const at = { chrome: await P.ev('HC.chrome()'), collisions: await P.ev('HC.collisions()'), covered: await P.ev('HC.covered()'), buried: await P.ev('HC.buried()'),
                 report: await P.ev('HC.report()'), reference: await P.ev('HC.reference()'), bound: await P.ev('HC.bound()') };
    await fitClick(P); const fit1 = await P.ev('H.cam()');
    await fitClick(P); const fit2 = await P.ev('H.cam()');
    const W = v.width, Hh = await P.ev('HC.wrap().clientHeight'), d = await P.ev('HC.drawing()');
    const area = ((d.r - d.l) * (d.b - d.t)) / (W * Hh);
    if (!dark) measures.composition[v.n] = { cam: first, area: +area.toFixed(3), mode: at.report && at.report.chrome && at.report.chrome.mode, arrangement: at.report && at.report.fit && at.report.fit.arrangement, chrome: at.chrome };
    check(`C1 ${tag}: with the complete HUD (${hud.length} controls), the settled first view, an explicit Fit and a second Fit are the same view`,
      hud.includes('exportPng') && hud.includes('exportPngDiagram') && same(first, fit1) && same(fit1, fit2), J({ hud, first, fit1, fit2 }));
    check(`C2 ${tag}: no panel or control lies on another, every panel stays inside the canvas, and nothing covers a control`,
      at.collisions.length === 0 && at.buried.length === 0, J({ collisions: at.collisions, buried: at.buried, chrome: at.chrome }));
    check(`C3 ${tag}: the fitted drawing runs under no visible chrome`, at.covered.length === 0 && !!(at.report && at.report.fit && at.report.fit.clear),
      J({ covered: at.covered, fit: at.report && at.report.fit }));
    /* Two measures: the reference arrangements (the engine's own kinds, through the shared helper)
       guard the choice among them; the bound, which knows no arrangement, guards against a lane
       that wastes the canvas. */
    check(`C4 ${tag}: the Fit is the largest clear overview the reference arrangements find (within 0.1%), and keeps at least 80% of the scale the canvas could give the drawing with only the HUD reserved`,
      at.reference != null && fit1.k >= at.reference * 0.999 && fit1.k >= 0.8 * at.bound, J({ k: fit1.k, reference: at.reference, bound: at.bound, ofBound: +(fit1.k / at.bound).toFixed(3), area: +area.toFixed(3) }));
    check(`C5 ${tag}: no exception`, P.errors.length === 0, J(P.errors));
    await P.close();
  }

  /* Compact: every panel is reachable from a visible trigger, one at a time, inside the room
     between the canvas top and the band, scrolling where its content is taller than that room. */
  for (const v of [VIEWS[2], VIEWS[3], VIEWS[4], Object.assign({}, VIEWS[2], { n: VIEWS[2].n + ' dark', dark: true })]) {
    const P = await openShell(v);
    const words = await P.ev('HC.triggers()');
    check(`C6 ${v.n}: compact; About, Legend and Inspector triggers are offered and every panel starts closed`,
      J(words) === J(['About', 'Legend', 'Inspector']) && (await P.ev('HC.openPanels()')).length === 0, J({ words, open: await P.ev('HC.openPanels()') }));
    for (const [i, q] of [[0, '.canvas-wrap > .caption'], [1, '.canvas-wrap > .legend'], [2, '#inspector']]) {
      const cam0 = await P.ev('H.cam()');
      const t = await P.ev(`HC.tpoint(${i})`);
      if (!t) { check(`C7 ${v.n}: panel ${i + 1} opens from a visible trigger`, false, 'no trigger'); continue; }
      await P.tap(t.x, t.y);
      const st = await P.ev(`(() => { const p = document.querySelector(${J(q)}), t = document.querySelectorAll('.canvas-wrap > .spine-triggers > button')[${i}];
        return { expanded: t.getAttribute('aria-expanded'), open: HC.openPanels(), scroll: p.scrollHeight > p.clientHeight + 1, overflow: getComputedStyle(p).overflowY,
                 text: p.textContent.replace(/\\s+/g, ' ').trim().slice(0, 60) }; })()`);
      const coll = await P.ev('HC.collisions()'), buried = await P.ev('HC.buried()'), cam1 = await P.ev('H.cam()'), covered = await P.ev('HC.covered()'),
            how = await P.ev('(HC.report() && HC.report().fit) ? HC.report().fit.panel : null'), inside = await P.ev('HC.inCanvas(HC.drawing())');
      let scrolled = true;
      if (st.scroll) scrolled = await P.ev(`(() => { const p = document.querySelector(${J(q)}); const a = p.scrollTop; p.scrollTop = a + 40; return p.scrollTop > a; })()`);
      /* An open panel moves the drawing only where the drawing keeps its size clear of it (the
         static engines' rule): the engine reports which, and the camera must agree with it. */
      const moved = !same(cam0, cam1);
      const policy = how === 'reserved' ? (cam1.k === cam0.k && covered.length === 0 && inside) : how === 'overlay' ? !moved : false;
      check(`C7 ${v.n}: ${words[i]} opens its panel alone, inside the canvas and clear of the band; the drawing keeps its scale and either moves clear of the panel (reserved) or stays under it (overlay), as the engine reports` + (st.scroll ? '; its content scrolls' : ''),
        st.expanded === 'true' && st.open.length === 1 && coll.length === 0 && buried.length === 0 && policy &&
        (!st.scroll || ((st.overflow === 'auto' || st.overflow === 'scroll') && scrolled)), J({ st, coll, buried, how, moved, covered, inside, scrolled }));
    }
    await P.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await P.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await P.frames();
    const esc = await P.ev('({ open: HC.openPanels(), focus: HC.word(document.activeElement) })');
    check(`C8 ${v.n}: Escape closes the open panel and leaves focus on its trigger`, esc.open.length === 0 && esc.focus === 'Inspector', J(esc));
    /* a tap on a node opens its inspector, and the node stays in view above the sheet */
    const ids = await P.ev('H.nodes()');
    let tapped = null;
    for (const id of ids.slice().reverse()) { const c = await P.ev(`H.center(${J(id)})`); const top = await P.ev(`(function(){const e=document.elementFromPoint(${c.x},${c.y});return e&&e.closest('.node')?e.closest('.node').getAttribute('data-id'):null})()`); if (top === id) { tapped = id; await P.tap(c.x, c.y); break; } }
    const after = tapped == null ? { tapped: null } : await P.ev(`(() => { const sheet = document.getElementById('inspector'), node = document.querySelector('#nodes .node[data-id=' + JSON.stringify(${J(tapped)}) + '] .box');
      const n = HC.box(node), s = HC.box(sheet), over = sheet.scrollHeight > sheet.clientHeight + 1;
      let scrolls = true; if (over) { const a = sheet.scrollTop; sheet.scrollTop = a + 40; scrolls = sheet.scrollTop > a && getComputedStyle(sheet).overflowY === 'auto'; sheet.scrollTop = a; }
      return { open: HC.openPanels(), name: H.inspectorName(), sel: H.sel(), nodeAbove: n.b <= s.t + 0.5 && n.t >= -0.5, over, scrolls }; })()`);
    check(`C9 ${v.n}: a tap on the lowest node opens its inspector, the node stays in view above the sheet, and a record taller than the sheet scrolls`,
      tapped != null && J(after.open) === J(['#inspector']) && J(after.sel) === J([tapped]) && !!after.name && after.nodeAbove && after.scrolls && (await P.ev('HC.collisions()')).length === 0, J(after));
    const lt = await P.ev('HC.tpoint(1)');
    if (lt) await P.tap(lt.x, lt.y);
    const leg = await P.ev('({ open: HC.openPanels(), sel: H.sel() })');
    const it = await P.ev('HC.tpoint(2)');
    if (it) await P.tap(it.x, it.y);
    const back = await P.ev('({ open: HC.openPanels(), sel: H.sel(), name: H.inspectorName() })');
    check(`C10 ${v.n}: opening Legend closes the inspector and keeps the selection; Inspector brings the same record back`,
      J(leg.open) === J(['.canvas-wrap > .legend']) && J(leg.sel) === J([tapped]) && J(back.open) === J(['#inspector']) && back.name === after.name,
      J({ leg, back }));
    /* a camera the reader moved stays where the reader left it when a panel opens or closes */
    const lt2 = await P.ev('HC.tpoint(1)');
    if (lt2) { const o = await P.ev('HC.openPanels()'); if (o.length) { const x = await P.ev('HC.tpoint(' + (o[0] === '#inspector' ? 2 : o[0].includes('legend') ? 1 : 0) + ')'); await P.tap(x.x, x.y); } }
    const e7 = await P.ev('H.empty(0.5, 0.35)');
    if (e7) await P.swipe(e7.x, e7.y, e7.x + 30, e7.y + 20);
    const m0 = await P.ev('H.cam()');
    if (lt2) { await P.tap(lt2.x, lt2.y); }
    const m1 = await P.ev('H.cam()');
    if (lt2) { await P.tap(lt2.x, lt2.y); }
    const m2 = await P.ev('H.cam()');
    check(`C7b ${v.n}: after the reader pans, opening and closing Legend leaves the camera where the reader left it`,
      !!lt2 && !!e7 && same(m0, m1) && same(m1, m2) && (await P.ev('HC.report().atFit')) === false, J({ m0, m1, m2 }));
    check(`C11 ${v.n}: no exception`, P.errors.length === 0, J(P.errors));
    await P.close();
  }

  /* Wide: a populated inspector stays in its corner, above the legend, scrolling if it must; the
     drawing does not run under it. */
  for (const v of [VIEWS[1], { n: 'laptop 1280x720', width: 1280, height: 720 }, { n: 'short desktop 1280x600', width: 1280, height: 600 }]) {
    const P = await openShell(v);
    const ids = await P.ev('H.nodes()');
    /* the record with the most to say: the one whose inspector is tallest */
    let tallest = null;
    for (const id of ids) {
      const c = await P.ev(`H.center(${J(id)})`); await P.click(c.x, c.y);
      const h = await P.ev('document.getElementById("inspector").scrollHeight');
      if (!tallest || h > tallest.h) tallest = { id, h };
    }
    const c = await P.ev(`H.center(${J(tallest.id)})`); await P.click(c.x, c.y);
    const st = await P.ev(`({ mode: HC.mode(), name: H.inspectorName(), collisions: HC.collisions(), covered: HC.covered(),
      over: (() => { const p = document.getElementById('inspector'); const over = p.scrollHeight > p.clientHeight + 1, a = p.scrollTop; p.scrollTop = a + 40; const moved = p.scrollTop > a; p.scrollTop = a;
        return { scroll: over, moved, overflow: getComputedStyle(p).overflowY, tabindex: p.getAttribute('tabindex') }; })() })`);
    check(`C12 ${v.n}: the tallest record fills the inspector in its corner without touching the legend, caption or HUD; the drawing stays clear of it; an inspector taller than its room scrolls and is in the tab order`,
      st.mode === 'wide' && !!st.name && st.collisions.length === 0 && st.covered.length === 0 && st.over.tabindex === '0' && (!st.over.scroll || (st.over.overflow === 'auto' && st.over.moved)), J(st));
    await P.close();
  }

  /* A window resized down to a phone and back up arrives at the views a fresh load gives at each size. */
  {
    const P = await openShell({ width: 1440, height: 900 });
    const steps = [];
    const arrive = async (w, h, extra = {}) => {
      await P.size(w, h); await P.frames(); await new Promise((r) => setTimeout(r, 150)); await P.frames();
      const got = { cam: await P.ev('H.cam()'), mode: await P.ev('HC.mode()'), collisions: await P.ev('HC.collisions()'), open: await P.ev('HC.openPanels()') };
      const F = await openShell({ width: w, height: h });
      const fresh = { cam: await F.ev('H.cam()'), mode: await F.ev('HC.mode()'), open: await F.ev('HC.openPanels()') };
      await F.close();
      steps.push(Object.assign({ w, h, got, fresh }, extra));
    };
    await arrive(390, 844); await arrive(844, 390); await arrive(768, 1024); await arrive(1440, 900);
    /* the reader moved the camera: a window resize still refits it (the pattern's resize policy) */
    const e = await P.ev('H.empty(0.5, 0.5)'); if (e) await P.drag(e.x, e.y, e.x + 80, e.y + 40);
    await arrive(1280, 800, { afterReaderMove: true });
    /* a panel open across a change of arrangement: wide shows every panel; entering compact closes them */
    await arrive(390, 844);
    const lt = await P.ev('HC.tpoint(1)'); if (lt) await P.click(lt.x, lt.y);
    const withLegend = await P.ev('HC.openPanels()');
    await arrive(1440, 900, { fromLegendOpen: withLegend });
    await arrive(390, 844, { backToCompact: true });
    check('C13 resized 1440x900 > 390x844 > 844x390 > 768x1024 > 1440x900, then 1280x800 after a reader pan, then across the arrangement change with a panel open: each arrival equals a fresh load (camera, arrangement, open panels), with nothing overlapping',
      J(withLegend) === J(['.canvas-wrap > .legend']) &&
      steps.every((x) => same(x.got.cam, x.fresh.cam) && !!x.got.mode && x.got.mode === x.fresh.mode && J(x.got.open) === J(x.fresh.open) && x.got.collisions.length === 0), J(steps));
    await P.close();
  }

  /* Chrome that settles late never moves a camera the reader moved: webfonts, a HUD that changes
     size, the page load. The Fit control then brings back the fresh-load view. */
  {
    const P = await openShell({ width: 1440, height: 900 });
    const first = await P.ev('H.cam()');
    await P.ev('document.getElementById("zoomIn").click()'); await P.frames();
    const moved = await P.ev('H.cam()');
    await P.ev('document.fonts.dispatchEvent(new Event("loadingdone"))'); await P.frames();
    await P.ev('(() => { const s = document.createElement("span"); s.id = "probeGrow"; s.style.cssText = "display:inline-block;width:120px;height:60px"; document.querySelector(".hud").appendChild(s); })()');
    await P.frames(); await new Promise((r) => setTimeout(r, 120)); await P.frames();
    await P.ev('document.getElementById("probeGrow").remove()'); await P.frames(); await new Promise((r) => setTimeout(r, 120)); await P.frames();
    await P.ev('window.dispatchEvent(new Event("load"))'); await P.frames();
    const after = await P.ev('H.cam()');
    await fitClick(P); const back = await P.ev('H.cam()');
    check('C16 a camera the reader zoomed stays where it is through a webfont load, a HUD that grows and shrinks and the page load; Fit then returns to the fresh-load view',
      !same(first, moved) && same(moved, after) && same(back, first) && P.errors.length === 0, J({ first, moved, after, back }));
    await P.close();
  }

  /* The exports read the same authored panels in every arrangement: folded behind a trigger, the
     legend and caption still reach PNG page, no trigger word does, and PNG diagram stays
     chrome-free. Each export runs through to its download (swallowed here) without an alert. */
  for (const dark of [false, true]) {
    const theme = dark ? 'dark' : 'light', out = {};
    for (const v of [VIEWS[1], VIEWS[2]]) {
      const P = await openShell(v, { dark });
      out[v.n] = { page: await P.ev('HC.exportSvg("exportPng")'), diagram: await P.ev('HC.exportSvg("exportPngDiagram")'), mode: await P.ev('HC.mode()'),
                   labels: await P.ev('IA_STATE_SPINE.states.map((s) => s.label)'), caption: await P.ev('document.querySelector(".caption").textContent.replace(/\\s+/g, " ").trim()'),
                   title: await P.ev('document.querySelector(".bar .title-block .t").textContent.trim()'),
                   alerts: await P.ev('window.__alerts || []'), downloads: await P.ev('window.__downloads || []'), errors: P.errors };
      await P.close();
    }
    const wide = out[VIEWS[1].n], compact = out[VIEWS[2].n];
    const text = (svg) => (svg || '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
    const count = (t, w) => (t.match(new RegExp('(^|[^A-Za-z])' + w + '([^A-Za-z]|$)', 'g')) || []).length;
    const pt = text(compact.page), dt = text(compact.diagram);
    /* a legend label may also name a node's group; the page carries one more of each than the drawing */
    const short = compact.labels.filter((l) => count(pt, l) <= count(dt, l));
    const clean = (o) => o.alerts.length === 0 && o.downloads.length === 2 && o.errors.length === 0;
    check(`C14 ${theme}: PNG page from the compact arrangement carries every legend row and the caption, and no trigger word; it equals the wide arrangement's; both exports run to their download`,
      compact.mode === 'compact' && wide.mode === 'wide' && short.length === 0 && pt.includes(compact.caption.replace(/&/g, '&')) &&
      !/\b(About|Legend|Inspector)\b/.test(pt) && compact.page === wide.page && clean(compact) && clean(wide),
      J({ modes: [compact.mode, wide.mode], short, equal: compact.page === wide.page, downloads: [compact.downloads, wide.downloads], alerts: [compact.alerts, wide.alerts] }));
    check(`C15 ${theme}: PNG diagram carries no chrome (no title, caption, legend title or trigger word) and does not depend on the arrangement`,
      !!compact.diagram && !dt.includes(compact.title) && !dt.includes('source truth') && !/\b(STATE|About|Inspector|Legend)\b/.test(dt) && compact.diagram === wide.diagram,
      J({ equal: compact.diagram === wide.diagram, bytes: compact.diagram && compact.diagram.length }));
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
