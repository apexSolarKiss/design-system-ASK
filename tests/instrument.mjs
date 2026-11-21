#!/usr/bin/env node
/* instrument.mjs — the rendered check of the instrument surface pattern, on its specimen
   (patterns/_preview/instrument.html: the canonical template, instrument.css, instrument.js and the
   example product).

     node tests/instrument.mjs           run every group; exit 1 on any failure
     node tests/instrument.mjs --shots DIR   also write the focus-ring screenshots to DIR

   It serves this repository read-only on 127.0.0.1 and opens the specimen in headless Chrome
   (Node 22+, Chrome at $CHROME or the default locations). No npm, no stub. Clicks and keys arrive
   through the DevTools protocol as trusted input.

   GROUPS
     F  frames: each frame's canvas keeps its aspect inside the stage; `free` takes the stage
     V  views: full window and back by Escape; the fullscreen control, reported as what the browser
        did (native fullscreen, or the full-window fallback) and never more
     E  saved sizes: each frame saves its exact size; `free` 2160 on its short side, and on a stage
        wide enough that this would pass 3840, 3840 on its long side;
        an export draws for the frame it saves, not the one on screen; the live canvas is untouched;
        the filename carries the name, a date stamp, the product's suffix and the saved size
     T  touch: on a coarse pointer an action and the disclosure trigger reach 44 px of hit height,
        measured from their boxes and margins (not by hit-testing), and selector segments are at
        least 44 px tall
     R  the canvas focus ring, by keyboard, on light, dark and plum artwork (plum close to the outer
        band's own color), docked in both chrome schemes (plum in light chrome only) and in full
        window in light chrome: an outer 2 px band of #6A637F and an inner 2 px band of #FFFFFF, at
        least one band well apart from the artwork beside it
     X  controls: a planted fault fails the check written for it

   LIMITS — a pass establishes no more than this. Headless Chrome only: Safari, Firefox, a
   physical device, a device's save or share flow, and native fullscreen where this browser
   declines it are not exercised, nor is a page opened from disk: the check serves the repository
   over HTTP. A frame that refuses fullscreen (the gallery host) is not tested here; the standalone
   specimen is the page for that. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPECIMEN = '/patterns/_preview/instrument.html';
const argv = process.argv.slice(2);
let SHOTS = null;
if (argv.length === 2 && argv[0] === '--shots') SHOTS = path.resolve(argv[1]);
else if (argv.length) { console.error('usage: instrument.mjs [--shots DIR]'); process.exit(2); }

/* ----------------------------------------------------------- browser -- */
function chromePath() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!c) { console.error('Chrome not found; set $CHROME'); process.exit(2); }
  return c;
}
async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'instrument-'));
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
function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
                  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(ROOT, rel);
    if (req.method !== 'GET' || !f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}
const KEYS = { Tab: 9, Escape: 27 };
async function open(b, url, { width = 1280, height = 800, touch = false, scheme = 'light', css = null } = {}) {
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
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
  if (touch) await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
  await call('Page.navigate', { url });
  await Promise.race([onLoad, new Promise((r) => setTimeout(r, 15000))]);
  const ev = async (expression) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  for (let i = 0; i < 100 && !(await ev('document.documentElement.dataset.ready === "1"')); i++) await new Promise((r) => setTimeout(r, 50));
  await ev('document.fonts ? document.fonts.ready.then(() => true) : true');
  if (css) await ev(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s); return true; })()`);
  const frames = () => ev('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
  const P = {
    ev, frames, errors, call,
    async click(selector) {
      const r = await ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
      if (!r) throw new Error('no element ' + selector);
      for (const type of ['mousePressed', 'mouseReleased']) await call('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
      await frames();
    },
    async key(k) {
      const code = KEYS[k];
      const base = { key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
      await call('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown' }, base));
      await call('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
      await frames();
    },
    async shot(clip) {
      const r = await call('Page.captureScreenshot', { format: 'png', clip: Object.assign({ scale: 1 }, clip), captureBeyondViewport: false });
      return r.data;
    },
    async close() { try { ws.close(); } catch { /* closed */ } await fetch(`http://127.0.0.1:${b.port}/json/close/${tgt.id}`).catch(() => {}); }
  };
  return P;
}

/* ------------------------------------------------------------ checks -- */
let failed = 0, passed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (ok) passed++; else failed++;
};
const J = (x) => JSON.stringify(x);
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const rgbNear = (px, hex, tol = 6) => {
  const v = parseInt(hex.slice(1), 16), want = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  return want.every((c, i) => Math.abs(c - px[i]) <= tol);
};

const S = 'window.instrumentSpecimen';
const canvasBox = (P) => P.ev(`(() => { const r = document.getElementById('canvas').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; })()`);

/* Sample the screenshot of a canvas box at the middle of each edge, 1 px and 3 px in. The box's
   edges are taken at whole pixels, as the browser paints them, and the clip stays inside the
   viewport, so a canvas at the window's edge (full window) is sampled where it is drawn. */
async function ringBands(P, box, file) {
  const pad = 2;
  const vp = await P.ev('({ w: innerWidth, h: innerHeight })');
  const L = Math.round(box.x), T = Math.round(box.y), R = Math.round(box.x + box.width), B = Math.round(box.y + box.height);
  const clip = { x: Math.max(0, L - pad), y: Math.max(0, T - pad) };
  clip.width = Math.min(vp.w, R + pad) - clip.x; clip.height = Math.min(vp.h, B + pad) - clip.y;
  const data = await P.shot(clip);
  if (SHOTS && file) fs.writeFileSync(path.join(SHOTS, file), Buffer.from(data, 'base64'));
  box = { width: R - L, height: B - T };
  const ox = L - clip.x, oy = T - clip.y;
  return P.ev(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${data}'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const at = (px, py) => Array.from(x.getImageData(Math.floor(px), Math.floor(py), 1, 1).data).slice(0, 3);
    const w = ${box.width}, h = ${box.height}, ox = ${ox}, oy = ${oy};
    const edges = {
      left:   (d) => at(ox + d, oy + h / 2),
      right:  (d) => at(ox + w - 1 - d, oy + h / 2),
      top:    (d) => at(ox + w / 2 + 3, oy + d),
      bottom: (d) => at(ox + w / 2 + 3, oy + h - 1 - d)
    };
    const out = {};
    for (const k in edges) out[k] = { outer: edges[k](1), inner: edges[k](3), art: edges[k](9) };
    return out;
  })()`);
}
const ringOk = (bands) => Object.values(bands).every((e) => rgbNear(e.outer, '#6A637F') && rgbNear(e.inner, '#FFFFFF'));
/* A band is apart from the artwork when some channel differs by more than 64. */
const apart = (a, b) => a.some((c, i) => Math.abs(c - b[i]) > 64);
const ringSeen = (bands) => Object.values(bands).every((e) => apart(e.outer, e.art) || apart(e.inner, e.art));

async function focusCanvas(P) {
  await P.ev('document.activeElement && document.activeElement.blur(), true');
  for (let i = 0; i < 12; i++) {
    await P.key('Tab');
    if (await P.ev(`document.activeElement === document.getElementById('canvas')`)) return true;
  }
  return false;
}

/* -------------------------------------------------------------- run -- */
const b = await launch();
const { srv, base } = await serve();
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
try {
  /* ---- F, V, E: a desktop page ---- */
  {
    const P = await open(b, base + SPECIMEN);
    check('F0 the specimen mounts without a page error', P.errors.length === 0, J(P.errors));
    check('F0 the pattern reports its contract version', (await P.ev('INSTRUMENT.VERSION')) === 1);

    const stage = await P.ev(`(() => { const r = document.getElementById('fit').getBoundingClientRect(); return { width: r.width, height: r.height }; })()`);
    for (const f of [['free', null], ['square', 1], ['four-three', 4 / 3], ['wide', 16 / 9]]) {
      await P.click(`#frame input[value="${f[0]}"]`);
      await P.frames();
      const box = await canvasBox(P);
      const attr = await P.ev(`document.getElementById('inst').dataset.frame`);
      const fits = box.width <= stage.width + 0.5 && box.height <= stage.height + 0.5;
      const aspectOk = f[1] === null ? near(box.width, stage.width, 1) && near(box.height, stage.height, 1) : near(box.width / box.height, f[1], 0.01);
      const fills = f[1] === null || near(box.width, stage.width, 1) || near(box.height, stage.height, 1);
      check(`F1 frame ${f[0]}: the canvas keeps its shape inside the stage and meets it on one side`, attr === f[0] && fits && aspectOk && fills, J({ attr, box, stage }));
    }

    await P.click('#frame input[value="free"]');
    await P.click('#view-window');
    const win = await P.ev(`(() => { const h = document.getElementById('inst'); return { view: h.dataset.view, expanded: h.dataset.expanded, head: getComputedStyle(document.querySelector('.inst-head')).display, exit: !document.getElementById('view-exit').hidden }; })()`);
    check('V1 full window: expanded, the head hidden, exit offered', win.view === 'window' && win.expanded === 'true' && win.head === 'none' && win.exit, J(win));
    await P.key('Escape');
    const back = await P.ev(`document.getElementById('inst').dataset.view`);
    check('V2 Escape leaves full window', back === 'docked', back);

    await P.click('#view-fullscreen');
    await new Promise((r) => setTimeout(r, 400)); await P.frames();
    const fs1 = await P.ev(`(() => { const h = document.getElementById('inst'); return { view: h.dataset.view, expanded: h.dataset.expanded, native: document.fullscreenElement === h }; })()`);
    check('V3 the fullscreen control expands the instrument (native fullscreen or the full-window fallback)',
      fs1.expanded === 'true' && (fs1.view === 'fullscreen' ? fs1.native : fs1.view === 'window'), J(fs1));
    console.log(`      V3 reported: ${fs1.native ? 'this headless browser granted native fullscreen' : 'this headless browser declined native fullscreen; the fallback ran'} — no claim about other browsers`);
    await P.click('#view-exit');
    await new Promise((r) => setTimeout(r, 300)); await P.frames();
    check('V4 exit returns to the docked view', (await P.ev(`document.getElementById('inst').dataset.view`)) === 'docked');

    const want = { square: [2160, 2160], 'four-three': [2880, 2160], wide: [3840, 2160] };
    for (const id of Object.keys(want)) {
      const r = await P.ev(`${S}.instrument.exportPNG({ frame: '${id}', download: false }).then((x) => ({ w: x.width, h: x.height, frame: x.frame, name: x.filename, size: x.blob.size, info: ${S}.lastInfo.export }))`);
      check(`E1 frame ${id} saves ${want[id].join(' × ')} and draws for that frame`,
        r.w === want[id][0] && r.h === want[id][1] && r.frame === id && r.info.frame === id && r.info.width === r.w && r.info.height === r.h && r.size > 0, J(r));
    }
    const free = await P.ev(`(() => { const m = ${S}.instrument.metrics; return ${S}.instrument.exportPNG({ frame: 'free', download: false }).then((x) => ({ w: x.width, h: x.height, aspect: m.width / m.height })); })()`);
    const short = Math.min(free.w, free.h), long = Math.max(free.w, free.h);
    check('E2 free saves 2160 on its short side, in the shape on screen, when that stays within 3840',
      Math.round(2160 * Math.max(free.aspect, 1 / free.aspect)) <= 3840 && short === 2160 && near(free.w / free.h, free.aspect, 0.01), J(free));

    await P.click('#frame input[value="square"]');
    const before = await P.ev(`document.getElementById('canvas').toDataURL()`);
    const cross = await P.ev(`${S}.instrument.exportPNG({ frame: 'wide', download: false }).then((x) => ({ frame: x.frame, w: x.width, info: ${S}.lastInfo.export, live: ${S}.instrument.frame.id, name: x.filename }))`);
    const after = await P.ev(`document.getElementById('canvas').toDataURL()`);
    check('E3 saving widescreen while square is on screen draws for widescreen and leaves the screen on square',
      cross.frame === 'wide' && cross.info.frame === 'wide' && cross.w === 3840 && cross.live === 'square', J(cross));
    check('E4 an export leaves the live canvas untouched', before === after);
    check('E5 the filename carries the name, a date stamp, the product suffix and the saved size',
      /^instrument-specimen-\d{4}-\d{2}-\d{2}-\d{6}-light-3840x2160\.png$/.test(cross.name), cross.name);
    check('E6 no page error through frames, views and saves', P.errors.length === 0, J(P.errors));
    await P.close();
  }
  {
    /* A stage wider than 16:9 by far: free would pass 3840 at 2160 tall, so the long side caps. */
    const P = await open(b, base + SPECIMEN, { width: 2400, height: 700 });
    const cap = await P.ev(`(() => { const m = ${S}.instrument.metrics; return ${S}.instrument.exportPNG({ frame: 'free', download: false }).then((x) => ({ w: x.width, h: x.height, aspect: m.width / m.height })); })()`);
    check('E7 on a wide stage free caps its long side at 3840 and keeps the shape on screen',
      cap.aspect > 3840 / 2160 && cap.w === 3840 && near(cap.h, 3840 / cap.aspect, 1), J(cap));
    await P.close();
  }

  /* ---- T: a touch page ---- */
  {
    const P = await open(b, base + SPECIMEN, { width: 390, height: 844, touch: true });
    const t = await P.ev(`(() => {
      const coarse = matchMedia('(pointer: coarse)').matches;
      const save = document.getElementById('save');
      const after = getComputedStyle(save, '::after');
      const seg = Array.from(document.querySelectorAll('.inst-seg span')).map((s) => s.getBoundingClientRect().height);
      return { coarse, save: save.getBoundingClientRect().height, saveTop: after.top, saveBottom: after.bottom, seg: Math.min(...seg) };
    })()`);
    const hit = t.save + Math.abs(parseFloat(t.saveTop)) + Math.abs(parseFloat(t.saveBottom));
    check('T1 on a coarse pointer an action reaches 44 px of hit height', t.coarse && hit >= 44, J(Object.assign({ hit }, t)));
    check('T2 selector segments are at least 44 px tall', t.seg >= 44 - 0.5, J(t));
    await P.click('#view-window');
    const d = await P.ev(`(() => { const e = document.getElementById('panel-toggle'); const a = getComputedStyle(e, '::after'); return { h: e.getBoundingClientRect().height, top: a.top, bottom: a.bottom, shown: !e.hidden }; })()`);
    const dh = d.h + Math.abs(parseFloat(d.top)) + Math.abs(parseFloat(d.bottom));
    check('T3 the disclosure trigger reaches 44 px of hit height in full window', d.shown && dh >= 44, J(Object.assign({ hit: dh }, d)));
    check('T4 no page error on the touch page', P.errors.length === 0, J(P.errors));
    await P.close();
  }

  /* ---- R: the focus ring ---- */
  for (const ground of ['light', 'dark', 'plum']) {
    for (const scheme of ground === 'plum' ? ['light'] : ['light', 'dark']) {
      const P = await open(b, `${base}${SPECIMEN}?ground=${ground}`, { scheme });
      const focused = await focusCanvas(P);
      const fv = await P.ev(`document.getElementById('canvas').matches(':focus-visible')`);
      const box = await canvasBox(P);
      const overlay = await P.ev(`(() => { const a = getComputedStyle(document.getElementById('fit'), '::after'); return { content: a.content, width: parseFloat(a.width), height: parseFloat(a.height) }; })()`);
      check(`R1 ${ground} artwork, ${scheme} chrome: keyboard focus reaches the canvas and the overlay matches its box`,
        focused && fv && overlay.content !== 'none' && near(overlay.width, box.width, 0.5) && near(overlay.height, box.height, 0.5), J({ focused, fv, overlay, box }));
      const bands = await ringBands(P, box, `ring-docked-${ground}-art-${scheme}-chrome.png`);
      check(`R2 ${ground} artwork, ${scheme} chrome, docked: outer band #6A637F, inner band #FFFFFF on every edge, one band apart from the artwork`, ringOk(bands) && ringSeen(bands), J(bands));
      if (scheme === 'light') {
        await P.click('#view-window');
        await P.ev(`document.getElementById('canvas').blur(), true`);
        const again = await focusCanvas(P);
        const wbox = await canvasBox(P);
        const wb = await ringBands(P, wbox, `ring-window-${ground}-art.png`);
        check(`R3 ${ground} artwork, light chrome, full window: the same two bands on every edge`, again && ringOk(wb) && ringSeen(wb), J(wb));
      }
      await P.ev(`document.getElementById('canvas').blur(), true`); await P.frames();
      const off = await P.ev(`getComputedStyle(document.getElementById('fit'), '::after').content`);
      check(`R4 ${ground} artwork, ${scheme} chrome: no ring without focus`, off === 'none', off);
      await P.close();
    }
  }

  /* ---- X: planted faults ---- */
  {
    const P = await open(b, `${base}${SPECIMEN}?ground=plum`, { css: '.inst-fit::after { display: none !important; }' });
    const focused = await focusCanvas(P);
    const bands = await ringBands(P, await canvasBox(P), null);
    const outerHeld = Object.values(bands).every((e) => rgbNear(e.outer, '#6A637F'));
    const innerGone = Object.values(bands).every((e) => !rgbNear(e.inner, '#FFFFFF'));
    check('X1 a copy without the overlay, focused, keeps the outline but loses the inner band, and fails R2',
      focused && outerHeld && innerGone && !ringOk(bands) && !ringSeen(bands), J({ focused, bands }));
    await P.close();
  }
  {
    const P = await open(b, base + SPECIMEN, { width: 390, height: 844, touch: true, css: '.inst .surface-action::after { inset: 0 !important; }' });
    const t = await P.ev(`(() => { const s = document.getElementById('save'); const a = getComputedStyle(s, '::after'); return s.getBoundingClientRect().height + Math.abs(parseFloat(a.top)) + Math.abs(parseFloat(a.bottom)); })()`);
    check('X2 a copy without the touch margin fails T1', !(t >= 44), String(t));
    await P.close();
  }
} finally {
  srv.close();
  await stop(b);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
