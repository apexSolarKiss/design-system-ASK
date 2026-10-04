#!/usr/bin/env node
/* radial-stack.mjs — the full-stack harness of the interactive radial pattern: the inspector,
   facets (search, filters, membership), export and theme modules with the legend and chrome, on
   the synthetic composition in every hierarchy shape and on the reference specimen.

     node tests/radial-stack.mjs           run every group; exit 1 on any failure
     node tests/radial-stack.mjs --json    the same, with the measurements as JSON at the end

   It serves this repository read-only on 127.0.0.1 and opens tests/radial-stack-fixture.html in
   headless Chrome (Node 22+, Chrome at $CHROME or the default locations). Owner files, the
   synthetic generator and its full-stack adapter only, except group R, which loads the reference
   specimen on request. No stub. Keys that peel layers arrive through the DevTools protocol as
   trusted events; the rest of the checks drive the modules' own controls in the page.

   GROUPS
     U  the inspector: idle, item, container, root and record views; preview; references, the way
        back and Escape; show-all; a reference to a filtered-out node; relation direction and flags;
        locators; compact sheet and exclusivity; the Fit edge by state (the collapsed pill right,
        the open sheet top, wide right); refits only at the Fit; text, never markup; malformed
        sections; a record arrival; expand, collapse and a portrait / landscape turn with a record
        and a filter, at the Fit and away from it; the two public expressions standing clear at the
        Fit on short landscape touch screens, and in portrait and wide
     Q  facets and search: the index; ranking and ties; what a result opens; OR within and AND
        across facets, counts, census and readout; relations; refit, and none for an empty result;
        a filter clearing a hidden selection but not a record; the Escape order; the drawer's
        bound, edge and refit; exclusivity on a compact canvas; the result keyboard; no match; is-out
     W  export: page and diagram plates in both themes, sizes, determinism, the reader's state
        untouched, both font routes, failure surfaced on the control, teardown
     H  theme: the cycle, one owner per document, an inert non-owner, teardown
     N  the synthetic composition, complete: every hierarchy shape, two instances, destroy and
        remount, missing modules and slots, the minimum composition's membership, and no
        reference content loaded
     R  the reference specimen mounts the complete stack on its captured content
     X  controls: a planted fault in a copy of a module fails the check written for it, or, for a
        public expression, in a copy loaded into that page and remounted */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
if (process.argv.slice(2).some((a) => a !== '--json')) { console.error('usage: radial-stack.mjs [--json]'); process.exit(2); }

/* ----------------------------------------------------------- browser -- */
function chromePath() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!c) { console.error('Chrome not found; set $CHROME'); process.exit(2); }
  return c;
}
async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'radial-stack-'));
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
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
                  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(ROOT, rel);
    if (req.method !== 'GET' || !f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}
const KEYS = { Tab: 9, Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
async function open(b, url, { width = 1280, height = 800, touch = false, scheme = 'light' } = {}) {
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
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
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
  const mouse = (type, x, y, extra = {}) => call('Input.dispatchMouseEvent', Object.assign({ type, x, y, button: 'none' }, extra));
  const P = {
    ev, frames, errors, size, call,
    async move(x, y) { await mouse('mouseMoved', x, y); await frames(); },
    async key(k) {
      const code = KEYS[k];
      const base = { key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
      if (k === 'Enter') await call('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown', text: '\r' }, base));
      else await call('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown' }, base));
      await call('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
      await frames();
    },
    async type(text) { await call('Input.insertText', { text }); await frames(); },
    async close() { try { ws.close(); } catch { /* closed */ } await fetch(`http://127.0.0.1:${b.port}/json/close/${tgt.id}`).catch(() => {}); }
  };
  await ev(CHECKS);
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

/* In-page checks. Each mounts what it needs on host D (or E), acts through the modules' own
   controls, and returns { ok, d } (d: what it measured). The same functions run against planted
   faults in group X, so a check is shown to fail for the reason it names. */
const CHECKS = String.raw`
window.C = (function () {
  const q = (s, r) => (r || document).querySelector(s), qa = (s, r) => Array.from((r || document).querySelectorAll(s));
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const esc = (h) => FX.host(h || 'D').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const insp = (h) => q('#' + (h || 'D') + ' .radial-insp-body');
  const text = (h) => insp(h).textContent;
  const J = JSON.stringify;
  const st = (h) => FX.inst[h || 'D'].state();
  const fresh = (name, o) => { if (FX.inst.D) { try { FX.inst.D.destroy(); } catch (e) {} } FX.mode('one'); return FX.mount('D', name || 'specimen', o || {}); };
  const leafOf = (inst, pred) => inst.layout.nodes.find((n) => n.kind === 'leaf' && (!pred || pred(n)));
  const facet = (id, v) => q('#D input[data-radial-facet="' + id + '"][value="' + v + '"]');
  const choose = async (id, v, on) => { const cb = facet(id, v); cb.checked = on !== false; cb.dispatchEvent(new Event('change', { bubbles: true })); await frames(); };
  const relRow = (h) => qa('#' + (h || 'D') + ' .radial-insp-relrow').map((r) => r.textContent.replace(/\s+/g, ' ').trim());
  const C = {};

  /* ---- U: the inspector ---- */
  C.idle = async () => { const m = fresh(); await frames();
    const t = text(), tone = FX.host('D').querySelector('[data-radial-slot="inspector"]').style.getPropertyValue('--st');
    return { ok: t.indexOf('details') === 0 && t.indexOf('Select a place') > 0 && tone === '', d: { t: t.slice(0, 60), tone } }; };
  C.item = async () => { const m = fresh(); const n = leafOf(m, (n) => n.kindId && n.state !== 'neutral'); m.select(n.id); await frames();
    const k = m.model.kinds.get(n.kindId), s = m.model.states.get(n.state), raw = m.model.byId.get(n.id);
    const kind = q('#D .radial-insp-kind').textContent, title = q('#D .radial-insp-title').textContent, sn = q('#D .radial-insp-state-name').textContent;
    const tone = FX.host('D').querySelector('[data-radial-slot="inspector"]').style.getPropertyValue('--st');
    return { ok: kind === k.id + ' — ' + k.label && title === raw.label && sn === s.label && tone === 'var(--state-' + n.state + ')' && st().inspector.view === 'item',
             d: { kind, title, sn, tone } }; };
  C.preview = async () => { const m = fresh(); await frames();
    const sr = q('#D [data-radial-slot="stage"]').getBoundingClientRect();
    const single = m.layout.nodes.filter((n) => n.kind === 'leaf').find((n) => { const p = m.project(n.id); return p.x > 40 && p.y > 40 && p.x < sr.width - 360 && p.y < sr.height - 80 && m.hits(p.x, p.y, 0).inside.length === 1 && m.hits(p.x, p.y, 0).inside[0] === n.id; });
    return { ok: !!single, d: { id: single && single.id, at: single && FX.at('D', single.id) } }; };
  C.container = async () => { const m = fresh(); const c = m.layout.nodes.find((n) => n.kind === 'container' && n.depth === 1); m.select(c.id); await frames();
    const a = { kind: q('#D .radial-insp-kind').textContent, title: q('#D .radial-insp-title').textContent, view: st().inspector.view, t: text() };
    m.select(m.model.root.id); await frames();
    const b = { kind: q('#D .radial-insp-kind').textContent, view: st().inspector.view, count: /places under it\s*(\d+)/i.exec(text()) };
    return { ok: a.kind === 'group, depth 1' && a.title === m.model.byId.get(c.id).label && a.view === 'container' && /places under it/i.test(a.t) &&
                 b.view === 'root' && b.count && +b.count[1] === m.model.leafCount.get(m.model.root.id), d: { a: { kind: a.kind, view: a.view }, b: { kind: b.kind, view: b.view, count: b.count && b.count[1] } } }; };
  /* a leaf linked to a record; opening it from the inspector; the way back */
  C.record = async () => { const m = fresh(); const leaf = 'VM-HG-243'; m.select(leaf); await frames();
    const ref = qa('#D .radial-insp-refrow .radial-insp-ref').find((b) => m.model.kindOf(b.getAttribute('data-radial-ref')) === 'record');
    if (!ref) return { ok: false, d: 'no record reference' };
    ref.click(); await frames();
    const s1 = st().inspector, back = q('#D .radial-insp-back'), title = q('#D .radial-insp-title').textContent;
    const backText = back && back.textContent;
    back.click(); await frames();
    const s2 = st();
    return { ok: s1.view === 'record' && s1.origin === leaf && backText === '← back to ' + m.model.byId.get(leaf).label && title === m.model.byId.get(s1.target).label &&
                 s2.inspector.view === 'item' && s2.inspector.target === leaf && s2.selection.locked === leaf, d: { s1, backText, s2: s2.inspector } }; };
  C.escapeOrder = async (useKeys) => { const m = fresh(); const leaf = 'VM-HG-243'; m.select(leaf); await frames();
    m.service('inspector').openRecord('OFFICE-N', leaf); await frames();
    const a = st(); esc(); await frames(); const b = st(); esc(); await frames(); const c = st();
    return { ok: a.inspector.view === 'record' && b.inspector.view === 'item' && b.selection.locked === leaf && c.selection.locked === null && c.inspector.view === 'idle',
             d: { a: a.inspector.view, b: [b.inspector.view, b.selection.locked], c: [c.inspector.view, c.selection.locked] } }; };
  C.showAll = async () => { const d = FX.DATA.specimen(); const leaf = d.nodes.find((n) => n.id === 'VM-KQ-002');
    for (let i = 1; i <= 5; i++) { d.records.push({ id: 'REC-' + i, label: 'record ' + i }); d.edges.push({ from: 'REC-' + i, to: leaf.id, plane: 'crew', type: 'files' }); }
    const m = fresh(d); m.select(leaf.id); await frames();
    const sec = () => qa('#D .radial-insp-refrow .radial-insp-ref').filter((b) => /^REC-|^OFFICE/.test(b.getAttribute('data-radial-ref'))).length;
    const a = sec(), more = q('#D .radial-insp-more'), mt = more && more.textContent; more && more.click(); await frames();
    const b = sec(); m.select('VM-KQ-001'); await frames(); m.select(leaf.id); await frames(); const c = sec();
    return { ok: a === 3 && mt === 'show all 5' && b === 5 && c === 3, d: { a, mt, b, c } }; };
  /* relation rows: direction, never-drawn and outside flags */
  C.relations = async () => { const m = fresh(); const R = m.model.relations;
    const dir = R.find((e) => m.model.planes.get(e.plane).directed && m.model.planes.get(e.plane).drawn === 'always');
    const und = R.find((e) => !m.model.planes.get(e.plane).directed && m.model.planes.get(e.plane).drawn === 'selection');
    const nev = R.find((e) => m.model.planes.get(e.plane).drawn === 'never');
    const rowFor = async (from, other) => { m.select(from); await frames(); return relRow().find((t) => t.indexOf(m.model.byId.get(other).label) >= 0) || ''; };
    const out = await rowFor(dir.from, dir.to), inn = await rowFor(dir.to, dir.from), un = await rowFor(und.from, und.to), nv = await rowFor(nev.from, nev.to);
    return { ok: / → /.test(out) && / ← /.test(inn) && / — /.test(un) && /declared, never drawn/.test(nv), d: { out, inn, un, nv } }; };
  C.outside = async () => { const m = fresh(); const e = m.model.relations.find((x) => m.model.planes.get(x.plane).drawn !== 'never' && m.model.byId.get(x.from).state !== m.model.byId.get(x.to).state);
    m.select(e.from); await frames();
    await choose('status', m.model.byId.get(e.from).state); m.select(e.from); await frames();
    const row = relRow().find((t) => t.indexOf(m.model.byId.get(e.to).label) >= 0) || '';
    const btn = qa('#D .radial-insp-relrow .radial-insp-ref').find((b) => b.getAttribute('data-radial-ref') === e.to);
    btn.click(); await frames();
    const s = st(), stillChecked = facet('status', m.model.byId.get(e.from).state).checked;
    return { ok: /filtered out/.test(row) && !s.membership.active && s.selection.locked === e.to && !stillChecked && !/filtering/.test(q('#D .radial-drawer-trigger').className),
             d: { row, active: s.membership.active, sel: s.selection.locked, stillChecked } }; };
  C.locator = async () => { const a = FX.adapterFor('specimen'); const sec = a.inspector.sections;
    a.inspector.sections = (t, ctx) => sec(t, ctx).concat([{ type: 'fields', title: 'loc', fields: [
      { label: 'citation', labelLinked: 'source link', value: 'see https://example.org/a. and https://exa…mple/b and http://nohost/x', format: 'locator' },
      { label: 'citation', labelLinked: 'source link', value: 'a print reference, p. 4', format: 'locator' }] }]);
    const m = fresh('specimen', { adapter: a }); m.select('VM-KQ-002'); await frames();
    const blocks = qa('#D .radial-insp-field').filter((f) => /citation|source link/i.test(f.querySelector('.radial-insp-lbl') ? f.querySelector('.radial-insp-lbl').textContent : ''));
    const links = blocks.map((f) => qa('a', f).map((x) => x.getAttribute('href')));
    const labels = blocks.map((f) => f.querySelector('.radial-insp-lbl').textContent);
    const tail = blocks[0] && blocks[0].querySelector('.radial-insp-mono').textContent;
    return { ok: J(links) === J([['https://example.org/a'], []]) && J(labels) === J(['source link', 'citation']) && /a\. and/.test(tail),
             d: { links, labels } }; };
  C.markup = async () => { const m = fresh(); m.select('VM-HG-245'); await frames();
    const t = q('#D .radial-insp-title'); return { ok: t.textContent === m.model.byId.get('VM-HG-245').label && !q('#D .radial-insp-body corner'), d: t.textContent }; };
  C.section = async () => { const a = FX.adapterFor('specimen'); a.inspector.sections = () => [{ type: 'bogus' }];
    const m = fresh('specimen', { adapter: a }); let err = null; try { m.select('VM-KQ-002'); } catch (e) { err = e; }
    const b = FX.adapterFor('specimen'); delete b.inspector.header; let err2 = null; try { fresh('specimen', { adapter: b }); } catch (e) { err2 = e; }
    return { ok: !!err && err.code === 'SECTION' && !!err2 && err2.code === 'HOOK_MISSING' && /inspector.header/.test(err2.message), d: [err && err.message, err2 && err2.message] }; };
  C.arrivalRecord = async () => { location.hash = '#node=' + encodeURIComponent('OFFICE-N'); const m = fresh('specimen', { arrival: true }); await frames();
    const s = st(), rep = m.report().arrival; history.replaceState(null, '', location.pathname); m.destroy(); FX.inst.D = null;
    return { ok: s.inspector.view === 'record' && s.inspector.target === 'OFFICE-N' && rep && rep.resolved === false, d: { insp: s.inspector, rep } }; };
  /* wide: toggling refits at the Fit only */
  C.toggleRefit = async () => { const m = fresh(); await frames(); const fits = []; m.on('fit', (e) => fits.push(e.cause));
    q('#D .radial-insp-toggle').click(); await frames(); const a = st(); q('#D .radial-insp-toggle').click(); await frames();
    m.zoom(1.6); await frames(); const v = m.view(); const n = fits.length; q('#D .radial-insp-toggle').click(); await frames(); const v2 = m.view();
    return { ok: !a.inspector.expanded && fits.length >= 2 && fits.slice(0, 2).every((c) => c === 'reader') && fits.length === n && v.k === v2.k && v.x === v2.x,
             d: { fits, expandedAfter1: a.inspector.expanded, kept: v.k === v2.k } }; };
  /* compact: collapsed at start, opened by a selection, exclusive with the chrome panels. The Fit
     edge follows the state: the collapsed pill declares the right, the open sheet the top */
  C.compact = async () => { const m = fresh(); await frames(); const slot = q('#D [data-radial-slot="inspector"]');
    const edge = () => slot.getAttribute('data-diagram-fit-edge');
    const a = { s: st().inspector, edge: edge(), obs: slot.getAttribute('data-radial-obstacle') };
    m.select('VM-KQ-002'); await frames();
    const b = { s: st().inspector, edge: edge(), obs: slot.getAttribute('data-radial-obstacle') };
    const trig = qa('#D .radial-chrome-trigger').find((t) => t.getAttribute('aria-controls') === q('#D [data-radial-slot="legend"]').id);
    trig.click(); await frames();
    const c = { s: st().inspector, edge: edge(), chrome: st().chrome.open };
    q('#D .radial-insp-toggle').click(); await frames();
    const d = { s: st().inspector, edge: edge(), chrome: st().chrome.open };
    esc(); await frames(); esc(); await frames();
    const e = { s: st().inspector, edge: edge(), sel: st().selection.locked };
    return { ok: a.s.arrangement === 'compact' && !a.s.expanded && a.edge === 'right' && a.obs === '' && b.s.expanded && b.edge === 'top' && b.obs === 'yields' &&
                 !c.s.expanded && c.edge === 'right' && c.chrome === 'legend' && d.s.expanded && d.edge === 'top' && d.chrome === null &&
                 e.sel === null && !e.s.expanded && e.edge === 'right',
             d: { a, b: [b.s.expanded, b.edge], c, d, e } }; };
  /* wide: the corner panel declares the right edge, open or collapsed */
  C.wideEdge = async () => { const m = fresh(); await frames(); const slot = q('#D [data-radial-slot="inspector"]'), edge = () => slot.getAttribute('data-diagram-fit-edge');
    const a = { arr: st().inspector.arrangement, exp: st().inspector.expanded, edge: edge() };
    q('#D .radial-insp-toggle').click(); await frames();
    const b = { exp: st().inspector.expanded, edge: edge() };
    q('#D .radial-insp-toggle').click(); await frames();
    return { ok: a.arr === 'wide' && a.exp && a.edge === 'right' && !b.exp && b.edge === 'right', d: { a, b } }; };

  /* compact: a selection opens the sheet without refitting, and the node lands beside the sheet */
  C.compactReveal = async () => { const m = fresh(); await frames(); const k0 = m.view().k, fits = []; m.on('fit', (e) => fits.push(e.cause));
    const sr = q('#D [data-radial-slot="stage"]').getBoundingClientRect();
    /* the leaf nearest the top of the stage: under the sheet once it opens */
    const leaf = m.layout.nodes.filter((n) => n.kind === 'leaf').sort((a, b) => m.project(a.id).y - m.project(b.id).y)[0];
    m.select(leaf.id); await frames();
    const sheet = q('#D [data-radial-slot="inspector"]').getBoundingClientRect(), p = m.project(leaf.id);
    const px = sr.left + p.x, py = sr.top + p.y, under = px >= sheet.left && px <= sheet.right && py >= sheet.top && py <= sheet.bottom;
    return { ok: st().inspector.expanded && Math.abs(m.view().k - k0) < 1e-9 && !under && fits.length === 0 && !m.view().atFit,
             d: { k0, k: m.view().k, under, fits, atFit: m.view().atFit } }; };

  /* compact: a selection that opens the sheet while a chrome panel is open, at the Fit: the panel
     closes and nothing refits */
  C.compactClaimNoFit = async () => { const m = fresh(); await frames(); const fits = []; m.on('fit', (e) => fits.push(e.cause));
    const trig = qa('#D .radial-chrome-trigger').find((t) => t.getAttribute('aria-controls') === q('#D [data-radial-slot="legend"]').id);
    trig.click(); await frames(); fits.length = 0; const atFit = m.view().atFit;
    m.select('VM-KQ-002'); await frames(); await new Promise((r) => setTimeout(r, 200)); await frames();
    return { ok: atFit && st().chrome.open === null && st().inspector.expanded && fits.length === 0, d: { atFit, fits, open: st().chrome.open } }; };
  /* wide: an open drawer that would meet a corner panel sends the arrangement to compact */
  C.drawerMeets = async () => { const R = (e) => e.getBoundingClientRect(), meet = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const m = RADIAL_MAP; const before = m.state().chrome.arrangement;
    m.service('facets').open(true); await frames(); await new Promise((r) => setTimeout(r, 150)); await frames();
    const dr = R(document.querySelector('.radial-drawer')), panels = Array.from(document.querySelectorAll('.radial-panel')).filter((p) => !p.hidden && p.getClientRects().length).map(R);
    const hit = panels.some((p) => meet(dr, p)), after = m.state().chrome.arrangement;
    m.service('facets').open(false); await frames(); await new Promise((r) => setTimeout(r, 150)); await frames();
    const back = m.state().chrome.arrangement;
    return { ok: before === 'wide' && !hit && after === 'compact' && back === 'wide', d: { before, after, back, hit } }; };

  /* ---- Q: facets and search ---- */
  C.index = async () => { const m = fresh(); const L = m.layout.nodes; let recs = 0; m.model.byId.forEach((x, id) => { if (m.model.kindOf(id) === 'record') recs++; });
    const want = L.filter((n) => n.kind !== 'root' && !m.model.hidden.has(n.id)).length + recs;
    return { ok: st().facets.entries === want, d: { entries: st().facets.entries, want } }; };
  C.rank = async () => { const S = DIAGRAM_RADIAL.modules.facets.search, N = DIAGRAM_RADIAL.modules.facets.norm;
    const idx = [{ key: 'b', label: 'Alpha', rank: 0 }, { key: 'a', label: 'Alpha', rank: 1 }, { key: 'c', label: 'Alpha beta', rank: 0 },
                 { key: 'x-alp', label: 'Zed', rank: 2 }, { key: 'alpha', label: 'Zz', rank: 3 }, { key: 'd', label: 'Beta alpha', rank: 0 },
                 { key: 'e', label: 'Gamma', rank: 0, hay: 'alpha' }].map((e) => Object.assign({ nkey: N(e.key), nlabel: N(e.label), hay: '' }, e, { hay: N(e.hay || '') }));
    const r1 = S(idx, 'alpha', 40).map((e) => e.key), r2 = S(idx, 'x-al', 40, /^x-/).map((e) => e.key), r3 = S(idx, 'x-al', 40).map((e) => e.key);
    const r4 = S(idx, 'Álpha', 40).map((e) => e.key);
    return { ok: J(r1) === J(['alpha', 'b', 'a', 'c', 'd', 'e']) && J(r2) === J(['x-alp']) && J(r3) === J([]) && J(r4) === J(r1), d: { r1, r2, r3, r4 } }; };
  C.activate = async () => { const m = fresh(); const f = m.service('facets'), fits = []; m.on('fit', (e) => fits.push(e.cause));
    f.open(true); f.query('OFFICE-N'); f.activate(0); await frames(); const a = st().inspector;
    const c = m.layout.nodes.find((n) => n.kind === 'container' && n.depth === 1);
    f.query(c.id); f.activate(0); await frames(); const b = { sel: st().selection.locked, framed: fits.indexOf('frame') >= 0, atFit: m.view().atFit };
    const leaf = leafOf(m); f.query(leaf.id); f.activate(0); await frames(); const v = m.view(), s = st();
    return { ok: a.view === 'record' && a.target === 'OFFICE-N' && b.sel === c.id && b.framed && !b.atFit && s.selection.locked === leaf.id && v.k >= 1.35 - 1e-9,
             d: { a: a.view, b, k: v.k } }; };
  C.counts = async () => { const m = fresh(); const leaves = m.layout.nodes.filter((n) => n.kind === 'leaf');
    const by = (k, v) => leaves.filter((n) => n[k] === v).length;
    const opts = st().facets.options.find((o) => o.id === 'status').options;
    const countsOk = opts.every((o) => o.count === by('state', o.value));
    await choose('status', 'earned'); await choose('status', 'partial');
    const or = st().membership.visibleItems, wantOr = by('state', 'earned') + by('state', 'partial');
    await choose('surface', 'lawn');
    const and = st().membership.visibleItems, wantAnd = leaves.filter((n) => (n.state === 'earned' || n.state === 'partial') && n.kindId === 'lawn').length;
    const census = st().facets.census, ro = q('#D [data-radial-readout="filter"]').textContent, dot = q('#D .radial-drawer-trigger').classList.contains('is-filtering');
    return { ok: countsOk && or === wantOr && and === wantAnd && census === and + ' of ' + leaves.length + ' places · ' + st().membership.visibleRelations + ' links · 2 filters' &&
                 ro === and + ' of ' + leaves.length && dot, d: { or, wantOr, and, wantAnd, census, ro, dot } }; };
  C.relationFacet = async () => { const m = fresh(); const pl = m.model.planes;
    const always = Array.from(pl.values()).find((p) => p.drawn === 'always').id, sel = Array.from(pl.values()).find((p) => p.drawn === 'selection').id;
    const never = Array.from(pl.values()).find((p) => p.drawn === 'never').id;
    await choose('link', always);
    const edges = qa('#D .radial-edge'), on = edges.filter((e) => !e.classList.contains('is-out'));
    const allAlways = on.every((e) => e.classList.contains('radial-edge--always')) && on.length === m.model.relations.filter((e) => e.plane === always).length;
    const locked = facet('link', never).disabled;
    return { ok: allAlways && locked && st().membership.visibleItems === st().membership.totalItems, d: { on: on.length, locked } }; };
  C.refit = async () => { const m = fresh(); await frames(); const fits = []; m.on('fit', (e) => fits.push(e.cause));
    const leaves = m.layout.nodes.filter((n) => n.kind === 'leaf'), opts = (id) => st().facets.options.find((o) => o.id === id).options.map((o) => o.value);
    /* two facets' values that each have members but share none */
    const val = { status: (n) => n.state, surface: (n) => n.kindId, group: (n) => { let x = m.model.byId.get(n.id); while (x && x.parent !== undefined && m.model.byId.get(x.parent) && m.model.byId.get(x.parent).parent !== undefined) x = m.model.byId.get(x.parent); return x && x.parent; } };
    let pair = null;
    [['status', 'surface'], ['status', 'group'], ['surface', 'group']].forEach(([f1, f2]) => opts(f1).forEach((v1) => opts(f2).forEach((v2) => {
      if (!pair && !leaves.some((n) => val[f1](n) === v1 && val[f2](n) === v2)) pair = [f1, v1, f2, v2]; })));
    if (!pair) return { ok: false, d: 'no empty pair in the data' };
    const k0 = m.view().k; await choose(pair[0], pair[1]); const a = { k: m.view().k, atFit: m.view().atFit, n: st().membership.visibleItems };
    const k1 = m.view().k; await choose(pair[2], pair[3]); const b = { k: m.view().k, n: st().membership.visibleItems };
    return { ok: a.k !== k0 && a.atFit && fits.indexOf('reader') >= 0 && b.n === 0 && Math.abs(b.k - k0) / k0 < 0.1, d: { k0, a, b, pair } }; };
  C.filterClears = async () => { const m = fresh(); const leaf = leafOf(m, (n) => n.state === 'earned'); m.select(leaf.id); await frames();
    await choose('status', 'deflated'); const a = st();
    m.service('facets').reset('module'); m.service('inspector').openRecord('OFFICE-N', null); await frames();
    await choose('status', 'deflated'); const b = st();
    return { ok: a.selection.locked === null && a.inspector.view === 'idle' && b.inspector.view === 'record', d: { a: [a.selection.locked, a.inspector.view], b: b.inspector.view } }; };
  C.drawer = async () => { const m = fresh(); await frames(); const fits = []; m.on('fit', (e) => fits.push(e.cause));
    q('#D .radial-drawer-trigger').click(); await frames();
    const dr = q('#D .radial-drawer'), hud = q('#D [data-radial-slot="hud"]');
    qa('#D .radial-drawer details').forEach((x) => { x.open = true; }); await frames();      /* taller than the room */
    const a = { open: !dr.hidden, focus: document.activeElement === q('#D .radial-drawer-q'), edge: dr.getAttribute('data-diagram-fit-edge'),
                bottom: dr.getBoundingClientRect().bottom, hudTop: hud.getBoundingClientRect().top, fits: fits.slice() };
    q('#D .radial-drawer-close').click(); await frames();
    const b = { open: !dr.hidden, focus: document.activeElement === q('#D .radial-drawer-trigger'), edge: dr.getAttribute('data-diagram-fit-edge') };
    m.zoom(1.5); await frames(); const v = m.view(), n = fits.length; q('#D .radial-drawer-trigger').click(); await frames(); const v2 = m.view();
    return { ok: a.open && a.focus && a.edge === 'left' && a.bottom <= a.hudTop - 8 + 0.5 && a.fits.indexOf('reader') >= 0 && !b.open && b.focus && b.edge === null &&
                 fits.length === n && v.k === v2.k, d: { a, b, kept: v.k === v2.k } }; };
  C.exclusive = async () => { const m = fresh(); await frames();
    const trig = qa('#D .radial-chrome-trigger').find((t) => t.getAttribute('aria-controls') === q('#D [data-radial-slot="legend"]').id);
    trig.click(); await frames(); const a = st().chrome.open;
    q('#D .radial-drawer-trigger').click(); await frames(); const b = { chrome: st().chrome.open, drawer: st().facets.open };
    m.select('VM-KQ-002'); await frames(); const c = { drawer: st().facets.open, insp: st().inspector.expanded };
    q('#D .radial-drawer-trigger').click(); await frames(); const d = { drawer: st().facets.open, insp: st().inspector.expanded };
    trig.click(); await frames(); const e = { drawer: st().facets.open, chrome: st().chrome.open };
    return { ok: a === 'legend' && b.chrome === null && b.drawer && !c.drawer && c.insp && d.drawer && !d.insp && !e.drawer && e.chrome === 'legend', d: { a, b, c, d, e } }; };
  C.noMatch = async () => { const m = fresh(); const r = m.service('facets').query('zzqqxx'); await frames();
    const t = q('#D .radial-drawer-none'); return { ok: r.length === 0 && !!t && /nothing matches among \d+ places, \d+ records and \d+ entries/.test(t.textContent), d: t && t.textContent }; };
  C.isOut = async () => { const m = fresh(); await choose('status', 'deflated');
    const hidden = m.layout.nodes.filter((n) => n.kind === 'leaf' && n.state !== 'deflated');
    const g = hidden.map((n) => q('#D .radial-node[data-radial-id="' + CSS.escape(n.id) + '"]'));
    const shown = m.labels().filter((l) => hidden.some((n) => n.id === l.id) && l.show);
    return { ok: g.every((x) => getComputedStyle(x).display === 'none') && shown.length === 0, d: { hidden: hidden.length, shownLabels: shown.length } }; };

  /* the live legend: a plane's and a kind's note under its label; a shapes line in place of the kind rows */
  C.legendNotes = async () => { const a = FX.adapterFor('specimen'); a.legend.notes = { planes: { greenway: 'a plane note' }, kinds: { water: 'a kind note' } };
    fresh('specimen', { adapter: a }); await frames();
    const subs = () => qa('#D [data-radial-slot="legend"] .radial-legend-sub').map((x) => x.textContent), glyphs = () => qa('#D [data-radial-slot="legend"] .radial-legend-shape').length;
    const one = { subs: subs(), glyphs: glyphs() };
    const b2 = FX.adapterFor('specimen'); b2.legend.notes = { kinds: { water: 'a kind note' } }; b2.legend.shapes = 'a line of shapes';
    fresh('specimen', { adapter: b2 }); await frames();
    const two = { subs: subs(), glyphs: glyphs() };
    const kinds = FX.inst.D.model.kinds.size;
    return { ok: one.subs.includes('a plane note') && one.subs.includes('a kind note') && one.glyphs === kinds &&
                 two.subs.includes('a line of shapes') && !two.subs.includes('a kind note') && two.glyphs === 0, d: { one, two } }; };

  /* B2: the inspector without the facets module reveals a target a membership hides, through the
     engine, then selects it and only then moves the camera */
  C.followNoFacets = async () => { const m = fresh('specimen', { modules: ['inspector'], theme: 'host' }); await frames();
    const e = m.model.relations.find((x) => m.model.planes.get(x.plane).drawn !== 'never' && m.model.kindOf(x.from) === 'node' && !m.model.isContainer(m.model.byId.get(x.from)) && !m.model.isContainer(m.model.byId.get(x.to)));
    m.setMembership(new Set([e.from]), null); m.select(e.from); await frames();
    const before = { k: m.view().k, active: m.state().membership.active, vis: m.state().membership.visibleItems };
    const btn = qa('#D .radial-insp-relrow .radial-insp-ref').find((b) => b.getAttribute('data-radial-ref') === e.to);
    btn.click(); await frames();
    const s = m.state();
    return { ok: before.active && !s.membership.active && s.selection.locked === e.to && s.inspector.target === e.to && s.view.k >= 1.35 - 1e-9,
             d: { before, after: { active: s.membership.active, sel: s.selection.locked, insp: s.inspector.target, k: s.view.k } } }; };
  /* B2 control: a node hidden by policy is not reached; nothing is selected and the camera stays */
  C.followPolicyHidden = async () => { const data = FX.G.ragged(FX.G.parks(), 'hide');
    const a = FX.adapterFor(data, { theme: 'host' }); const sec = a.inspector.sections;
    let hiddenId = null;
    a.inspector.sections = (t, ctx) => sec(t, ctx).concat(hiddenId ? [{ type: 'references', title: 'to a hidden node', items: [{ id: hiddenId }] }] : []);
    const m = fresh(data, { modules: ['inspector'], adapter: a }); hiddenId = Array.from(m.model.hidden)[0];
    const leaf = leafOf(m); m.select(leaf.id); await frames();
    const v0 = m.view(), btn = qa('#D .radial-insp-refrow .radial-insp-ref').find((b) => b.getAttribute('data-radial-ref') === hiddenId);
    if (!btn) return { ok: false, d: 'no reference rendered to ' + hiddenId };
    btn.click(); await frames();
    const v1 = m.view(), s = m.state();
    return { ok: !!hiddenId && s.selection.locked === leaf.id && v1.k === v0.k && v1.x === v0.x && v1.y === v0.y && s.inspector.target === leaf.id,
             d: { hiddenId, sel: s.selection.locked, moved: v1.k !== v0.k || v1.x !== v0.x || v1.y !== v0.y } }; };
  /* the way back from a record to a node a filter has since hidden closes the record view: the
     filter, the selection and the camera stay as they are (v1's behavior, kept) */
  C.backHidden = async () => { const m = fresh(); const leaf = 'VM-HG-243', st0 = m.model.byId.get(leaf).state; m.select(leaf); await frames();
    m.service('inspector').openRecord('OFFICE-N', leaf); await frames();
    const other = Array.from(m.model.states.keys()).find((r) => r !== st0 && m.layout.nodes.some((n) => n.kind === 'leaf' && n.state === r));
    await choose('status', other); const mid = { sel: st().selection.locked, view: st().inspector.view }, v0 = m.view();
    q('#D .radial-insp-back').click(); await frames();
    const s = st(), v1 = m.view();
    return { ok: mid.view === 'record' && mid.sel === null && s.membership.active && s.selection.locked === null && s.inspector.view === 'idle' &&
                 facet('status', other).checked && v1.k === v0.k && v1.x === v0.x && v1.y === v0.y,
             d: { mid, after: { active: s.membership.active, sel: s.selection.locked, view: s.inspector.view, moved: v1.k !== v0.k || v1.x !== v0.x } } }; };

  /* ---- H: theme ---- */
  C.theme = async () => { document.documentElement.removeAttribute('data-theme'); const m = fresh(); const b = q('#D .radial-theme-control');
    const seq = []; for (let i = 0; i < 4; i++) { seq.push([document.documentElement.getAttribute('data-theme'), b.querySelector('.radial-theme-label').textContent]); b.click(); }
    return { ok: J(seq) === J([[null, 'auto'], ['light', 'light'], ['dark', 'dark'], [null, 'auto']]), d: seq }; };
  const noChrome = () => FX.ALL.filter((x) => x !== 'chrome');
  C.themeOwner = async () => { const m = fresh(); FX.mode('two'); let err = null;
    try { FX.mount('E', 'base', { modules: noChrome() }); } catch (e) { err = e; }
    const n = FX.mount('E', 'base', { theme: 'host', modules: noChrome() }); const ctrl = qa('#E .radial-theme-control').length;
    n.destroy(); FX.mode('one');
    return { ok: !!err && err.code === 'THEME_OWNER_CONFLICT' && ctrl === 0, d: { err: err && err.message, ctrl } }; };
  C.themeRestore = async () => { if (FX.inst.D) FX.inst.D.destroy(); FX.inst.D = null; document.documentElement.setAttribute('data-theme', 'dark');
    const m = FX.mount('D', 'specimen'); q('#D .radial-theme-control').click(); const mid = document.documentElement.getAttribute('data-theme');
    m.destroy(); FX.inst.D = null; const after = document.documentElement.getAttribute('data-theme'); document.documentElement.removeAttribute('data-theme');
    return { ok: mid === null && after === 'dark', d: { mid, after } }; };

  /* ---- N: the synthetic composition ---- */
  C.shape = async (name) => { const m = fresh(name); await frames(); const f = m.service('facets');
    const leaf = leafOf(m); const r = f.query(leaf.id); f.activate(0); await frames();
    const sel = st().selection.locked, view = st().inspector.view;
    const opt = st().facets.options.find((o) => o.id === 'status').options[0].value; await choose('status', opt);
    const mem = st().membership;
    return { ok: r[0] && r[0].key === leaf.id && sel === leaf.id && view === 'item' && mem.active && mem.visibleItems > 0 && mem.visibleItems < mem.totalItems,
             d: { first: r[0] && r[0].key, sel, view, items: mem.visibleItems + '/' + mem.totalItems } }; };
  C.twoInstances = async () => { if (FX.inst.D) FX.inst.D.destroy(); FX.mode('two'); const a = FX.mount('D', 'specimen'), b = FX.mount('E', 'base', { theme: 'host', modules: noChrome() });
    await frames(); a.select('VM-KQ-002'); await choose('status', 'deflated');
    const sa = a.state(), sb = b.state(); const rb = b.service('facets').query('VM-KQ-001');
    const ok = sa.membership.active && !sb.membership.active && sb.selection.locked === null && sb.inspector.view === 'idle' && rb[0] && rb[0].key === 'VM-KQ-001' &&
               a.service('facets') !== b.service('facets');
    b.destroy(); a.destroy(); FX.inst.D = FX.inst.E = null; FX.mode('one');
    return { ok, d: { a: sa.membership.visibleItems, b: sb.membership.visibleItems } }; };
  C.destroy = async () => { if (FX.inst.D) { FX.inst.D.destroy(); FX.inst.D = null; } const host = FX.host('D'); const before = host.outerHTML, th = document.documentElement.getAttribute('data-theme');
    const m = FX.mount('D', 'specimen'); await frames(); m.select('VM-KQ-002'); m.service('facets').open(true); await choose('status', 'earned');
    m.service('inspector').openRecord('OFFICE-N'); q('#D .radial-theme-control').click();
    m.destroy(); FX.inst.D = null; await frames();
    const after = host.outerHTML, th2 = document.documentElement.getAttribute('data-theme');
    const m2 = FX.mount('D', 'specimen'); await frames(); const k = m2.view().k; m2.destroy(); const m3 = FX.mount('D', 'specimen'); await frames(); const k2 = m3.view().k;
    return { ok: before === after && th === th2 && Math.abs(k - k2) < 1e-9, d: { same: before === after, len: [before.length, after.length], th: [th, th2] } }; };
  C.missing = async () => { if (FX.inst.D) { FX.inst.D.destroy(); FX.inst.D = null; } const R = DIAGRAM_RADIAL, out = {};
    const keep = R.modules.inspector; delete R.modules.inspector;
    try { FX.mount('D', 'specimen'); } catch (e) { out.module = e.code + ' ' + e.message; } R.modules.inspector = keep;
    const slot = q('#D [data-radial-slot="inspector"]'), par = slot.parentNode, next = slot.nextSibling; par.removeChild(slot);
    try { FX.mount('D', 'specimen'); } catch (e) { out.slot = e.code + ' ' + e.message; } par.insertBefore(slot, next);
    const act = q('#D [data-radial-slot="actions"]'); act.removeAttribute('data-radial-slot');
    try { FX.mount('D', 'specimen', { modules: ['facets'] }); } catch (e) { out.actions = e.code + ' ' + e.message; } act.setAttribute('data-radial-slot', 'actions');
    const clean = !FX.host('D').__radial;
    return { ok: /^MODULE_MISSING .*inspector/.test(out.module || '') && /^SLOT .*inspector/.test(out.slot || '') && /^SLOT .*actions/.test(out.actions || '') && clean, d: out }; };
  C.minimum = async () => { if (FX.inst.D) { FX.inst.D.destroy(); FX.inst.D = null; } const m = FX.mount('D', 'specimen', { modules: [], adapter: {} });
    const leaf = leafOf(m); const s = m.setMembership(new Set([leaf.id])); await frames();
    const out = s.visibleItems === 1 && m.state().membership.active && !q('#D .radial-drawer') && !q('#D .radial-insp-body');
    m.setMembership(null, null); const back = m.state().membership.visibleItems === m.state().membership.totalItems; m.destroy(); FX.inst.D = null;
    return { ok: out && back, d: { s } }; };
  C.noReference = async () => { const res = performance.getEntriesByType('resource').map((e) => e.name);
    return { ok: !res.some((u) => /\/reference\//.test(u)) && typeof window.CFW_ATLAS === 'undefined' && typeof window.RADIAL_REFERENCE === 'undefined', d: { loaded: res.length } }; };

  /* ---- R: the reference specimen ---- */
  C.reference = async () => { if (FX.inst.D) { FX.inst.D.destroy(); FX.inst.D = null; } const ref = await FX.reference();
    const host = FX.host('D'); const m = DIAGRAM_RADIAL.mount({ host, data: ref.data, adapter: ref.adapter, modules: ref.modules }); FX.inst.D = m; await frames();
    const s = m.state(), rep = m.report(); let recs = 0; m.model.byId.forEach((x, id) => { if (m.model.kindOf(id) === 'record') recs++; });
    m.select('CFW-Q-001'); await frames(); const t1 = text(), tone = !!q('#D .radial-insp-block.has-tone');
    m.service('inspector').openRecord('CFW-S-479', null); await frames(); const t2 = q('#D .radial-insp-title').textContent;
    const d = { nodes: m.layout.nodes.length, rel: m.model.relations.length, recs, entries: s.facets.entries, unresolved: rep.unresolved.length, unsupported: rep.unsupported.length, census: s.facets.census, t2 };
    m.destroy(); FX.inst.D = null;
    return { ok: d.nodes === 590 && d.rel === 217 && recs === 479 && d.entries === 1068 && !d.unresolved && !d.unsupported && /authority/i.test(t1) && tone && t2 === 'Seeding RSI Toward ASI' &&
                 d.census === '548 / 548 objects — complete map, no filter', d }; };

  /* ---- a public expression at the Fit (the preview pages, RADIAL_MAP) ---- */
  /* compact on a narrow or a short touch screen, where the collapsed pill declares the right edge;
     otherwise wide, where the corner panel does. Either way the whole-map Fit stands clear */
  C.exprFit = async (scheme) => { const m = RADIAL_MAP; await frames();
    const s = m.state(), v = m.view(), f = m.report().fit, slot = q('[data-radial-slot="inspector"]'), html = document.documentElement;
    const compact = matchMedia('(max-width: 767px), (max-height: 520px) and (pointer: coarse)').matches;
    const d = { size: innerWidth + 'x' + innerHeight, theme: html.getAttribute('data-theme') || getComputedStyle(html).colorScheme,
                arr: s.inspector.arrangement, exp: s.inspector.expanded, edge: slot.getAttribute('data-diagram-fit-edge'),
                k: +v.k.toFixed(4), atFit: v.atFit, clear: f.clear, drawing: f.drawingClear, under: f.labelsUnder, outside: f.labelsOutside,
                covered: f.covered.length, cause: f.cause };
    return { ok: d.arr === (compact ? 'compact' : 'wide') && (!compact || !d.exp) && d.edge === 'right' && d.atFit && d.clear === true &&
                 (!scheme || d.theme === scheme), d }; };

  /* ---- X: a planted fault in a copy of a module, then the check written for it ---- */
  C.plant = async (file, from, to) => {
    const src = await (await fetch('/patterns/diagram-interactive-radial/' + file)).text();
    if (src.split(from).length !== 2) return { planted: false };
    (0, eval)(src.replace(from, to));
    return { planted: true };
  };
  return C;
})();
`;

/* checks driven with trusted keys, each a function of a page so a control can rerun it */
const KEYED = {
  /* B1: a resize that collapses the inspector hands focus inside it to its disclosure; Escape then
     still closes the record. `to` is the compacting size; a touch page compacts by its height */
  async resizeFocus(P, from, to, outside) {
    await P.size(from[0], from[1]); await P.frames();
    const setup = await P.ev(`(() => { if (FX.inst.D) FX.inst.D.destroy(); const m = FX.mount('D', 'specimen'); m.select('VM-HG-243');
      m.service('inspector').openRecord('OFFICE-N', 'VM-HG-243');
      const t = ${outside ? `document.querySelector('#D .radial-drawer-trigger')` : `document.querySelector('#D .radial-insp-back')`}; t.focus();
      return { focus: document.activeElement.className, expanded: m.state().inspector.expanded, coarse: matchMedia('(pointer: coarse)').matches }; })()`);
    await P.size(to[0], to[1]); await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames();
    const a = await P.ev(`(() => { const s = FX.inst.D.state(); return { expanded: s.inspector.expanded, arrangement: s.inspector.arrangement, view: s.inspector.view,
      sel: s.selection.locked, focus: document.activeElement.className, inHost: FX.host('D').contains(document.activeElement) }; })()`);
    let b = null;
    if (!outside) { await P.key('Escape'); b = await P.ev(`(() => { const s = FX.inst.D.state(); return { view: s.inspector.view, sel: s.selection.locked }; })()`); }
    await P.size(1280, 800); await P.frames();
    const ok = setup.expanded && !a.expanded && a.arrangement === 'compact' && a.view === 'record' && a.sel === 'VM-HG-243' &&
      (outside ? /radial-drawer-trigger/.test(a.focus) : /radial-insp-toggle/.test(a.focus) && a.inHost && b.view === 'item' && b.sel === 'VM-HG-243');
    return { ok, d: { setup, a, b } };
  },
  u20(P) { return KEYED.resizeFocus(P, [1200, 900], [390, 844], false); },
  /* on a touch page, with a record open from a selection and a filter set: collapse, expand and a
     portrait / landscape turn, first at the Fit, then away from it */
  async u27(P) {
    const settle = async () => { await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames(); };
    await P.size(390, 844); await settle();
    const n0 = await P.ev(`(() => { if (FX.inst.D) FX.inst.D.destroy(); FX.mode('one'); const m = FX.mount('D', 'specimen'); m.select('VM-HG-243');
      m.service('inspector').openRecord('OFFICE-N', 'VM-HG-243'); m.service('facets').set('status', [m.model.byId.get('VM-HG-243').state]);
      return m.state().membership.visibleItems; })()`);
    await settle(); await P.ev('FX.inst.D.fit("explicit")'); await settle();
    const snap = (tag) => P.ev(`(() => { const m = FX.inst.D, s = m.state(), v = m.view(), f = m.report().fit;
      return { tag: ${J(tag)}, exp: s.inspector.expanded, arr: s.inspector.arrangement,
        edge: document.querySelector('#D [data-radial-slot="inspector"]').getAttribute('data-diagram-fit-edge'),
        k: v.k, x: v.x, y: v.y, atFit: v.atFit, cause: f.cause, clear: f.clear,
        kept: s.inspector.view === 'record' && s.inspector.target === 'OFFICE-N' && s.selection.locked === 'VM-HG-243' &&
          s.membership.active && s.membership.visibleItems === ${n0} && s.facets.active.length === 1 }; })()`);
    const toggle = async (tag) => { await P.ev(`document.querySelector('#D .radial-insp-toggle').click()`); await settle(); return snap(tag); };
    const turn = async (w, h, tag) => { await P.size(w, h); await settle(); return snap(tag); };
    const run = async () => [await toggle('collapse'), await toggle('expand'), await turn(844, 390, 'landscape'),
      await toggle('L collapse'), await toggle('L expand'), await turn(390, 844, 'portrait')];
    const fit = [await snap('fit')].concat(await run());
    await P.ev('FX.inst.D.zoom(1.6)'); await settle();
    const away = [await snap('zoomed')].concat(await run());
    const same = (a, b) => Math.abs(a.k - b.k) < 1e-9 && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
    const states = (r) => J(r.map((x) => x.exp)) === J([true, false, true, true, false, true, true]);
    const all = fit.concat(away);
    const ok = n0 > 0 && all.every((r) => r.kept && r.arr === 'compact' && r.edge === (r.exp ? 'top' : 'right')) && states(fit) && states(away) &&
      fit.every((r) => r.atFit) && [1, 2, 4, 5].every((i) => fit[i].cause === 'reader') && [3, 6].every((i) => fit[i].cause === 'resize') &&
      fit[1].clear && fit[4].clear && same(fit[2], fit[0]) && same(fit[5], fit[3]) && same(fit[6], fit[0]) &&
      away.every((r) => !r.atFit && same(r, away[0]));
    return { ok, d: all.map((r) => [r.tag, r.exp ? 'open' : 'pill', r.edge, +r.k.toFixed(4), r.atFit, r.cause, r.clear, r.kept]) };
  },
  /* a keyboard reader follows a reference to a record and comes back */
  async u17(P) {
    await P.ev(`(() => { if (FX.inst.D) FX.inst.D.destroy(); const m = FX.mount('D', 'specimen'); m.select('VM-HG-243');
      const b = Array.from(document.querySelectorAll('#D .radial-insp-refrow .radial-insp-ref')).find((x) => m.model.kindOf(x.getAttribute('data-radial-ref')) === 'record');
      b.focus(); return true; })()`);
    await P.key('Enter');
    const a = await P.ev(`(() => ({ view: FX.inst.D.state().inspector.view, focus: document.activeElement.className, inHost: FX.host('D').contains(document.activeElement) }))()`);
    await P.key('Escape');
    const b = await P.ev(`(() => ({ view: FX.inst.D.state().inspector.view, sel: FX.inst.D.state().selection.locked, inHost: FX.host('D').contains(document.activeElement) }))()`);
    return { ok: a.view === 'record' && a.inHost && /radial-insp-back/.test(a.focus) && b.view === 'item' && b.sel === 'VM-HG-243' && b.inHost, d: { a, b } };
  },
  /* a search result chosen with the keyboard on a compact canvas */
  async q15(P) {
    await P.ev(`(() => { if (FX.inst.D) FX.inst.D.destroy(); FX.mount('D', 'specimen'); document.querySelector('#D .radial-drawer-trigger').click(); return true; })()`);
    await P.ev(`document.querySelector('#D .radial-drawer-q').focus()`);
    await P.type('VM-KQ-002');
    await P.key('Enter');
    const a = await P.ev(`(() => ({ sel: FX.inst.D.state().selection.locked, open: FX.inst.D.state().facets.open, focus: document.activeElement.className }))()`);
    await P.key('Escape');
    const b = await P.ev(`FX.inst.D.state().selection.locked`);
    return { ok: a.sel === 'VM-KQ-002' && !a.open && /radial-drawer-trigger/.test(a.focus) && b === null, d: { a, b } };
  }
};

/* ------------------------------------------------------------- run -- */
async function run() {
  const b = await launch();
  const { srv, base } = await serve();
  const url = base + '/tests/radial-stack-fixture.html';
  try {
    const at = async (P, fn, ...a) => P.ev(`C.${fn}(${a.map((x) => J(x)).join(',')})`);
    /* U, Q, H, N, R on one wide page */
    let P = await open(b, url);
    const W = async (name, fn, ...a) => { const r = await at(P, fn, ...a); check(name, r.ok, J(r.d).slice(0, 400)); return r; };

    console.log('# U  the inspector');
    await W('U1 idle: the panel names itself and shows the adapter\'s idle text, untinted', 'idle');
    await W('U2 an item: the default kind line, its title, its state row, tinted by its state', 'item');
    const pv = await at(P, 'preview');
    if (pv.ok) {
      await P.move(pv.d.at.x, pv.d.at.y);
      const a = await P.ev('FX.inst.D.state().inspector');
      await P.move(5, 120);
      const b2 = await P.ev('FX.inst.D.state().inspector');
      await P.ev('FX.inst.D.select("VM-HG-243")');
      await P.move(pv.d.at.x, pv.d.at.y);
      const c = await P.ev('FX.inst.D.state().inspector');
      check('U3 hover previews a mark while nothing is locked, returns to idle off it, and never replaces a locked selection',
        a.target === pv.d.id && a.view === 'item' && b2.view === 'idle' && c.target === 'VM-HG-243', J({ a: a.target, b: b2.view, c: c.target }));
    } else check('U3 hover previews a mark (a single-mark point was found)', false, J(pv.d));
    await W('U4 a container and the root: their views and member counts', 'container');
    await W('U5 a reference opens a record, which names the way back; back returns to the item and its selection', 'record');
    await W('U6 Escape closes the record first, keeping the selection, then clears the selection', 'escapeOrder');
    await W('U7 show-all: the head, then all, and the head again for another target', 'showAll');
    await W('U8 relation rows show direction (out, in, undirected) and flag a never-drawn plane', 'relations');
    await W('U9 under a filter, a row to a filtered-out node is flagged; following it resets the filter (the facets controls too) and selects it', 'outside');
    await W('U10 a locator links only standalone http(s) addresses with a real host, keeps trailing punctuation outside, and relabels', 'locator');
    await W('U11 every string is text: a label with markup characters renders literally', 'markup');
    await W('U12 a malformed section is a named error; a missing header hook fails the mount', 'section');
    await W('U13 an arrival naming an undrawn record opens its view', 'arrivalRecord');
    await W('U14 wide: collapsing and expanding refit at the Fit with the reader\'s cause, and away from it keep the view', 'toggleRefit');

    console.log('# Q  facets and search');
    await W('Q1 the index holds every placed container and item and every record', 'index');
    await W('Q2 ranking: exact identifier, identifier prefix only where declared, name, prefix, word, substring, search text; ties by kind, length, identifier; marks folded', 'rank');
    await W('Q3 a result opens a record, frames and selects a container, or selects and centers an item', 'activate');
    await W('Q4 OR within a facet, AND across facets; counts over the whole data; census, readout and trigger state', 'counts');
    await W('Q5 a relations facet draws only its member relations; a never-drawn value is locked', 'relationFacet');
    await W('Q6 a filter change refits to the members; with no member item the Fit frames the whole layout, never the root alone', 'refit');
    await W('Q7 a filter clears a selection it hides, and leaves an open record view', 'filterClears');
    await W('Q8 the drawer: focus to search, the left edge, bounded above the HUD, a refit at the Fit only, focus back to its trigger', 'drawer');
    await W('Q9 no match reports the searchable population', 'noMatch');
    await W('Q10 a filtered-out mark is not drawn and its name is not placed', 'isOut');
    /* the Escape order and the result keyboard, with trusted keys */
    {
      await P.ev(`(async () => { const m = (FX.inst.D && FX.inst.D.destroy(), FX.mount('D', 'specimen')); m.select('VM-HG-243');
        m.service('facets').open(true); const cb = document.querySelector('#D input[data-radial-facet="surface"][value="lawn"]'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
        m.select('VM-HG-243'); m.service('inspector').openRecord('OFFICE-N'); document.querySelector('#D .radial-drawer-q').focus(); })()`);
      await P.type('kestrel');
      const s = () => P.ev(`(() => { const s = FX.inst.D.state(); return { q: s.facets.query, insp: s.inspector.view, sel: s.selection.locked, active: s.facets.active.length, open: s.facets.open,
        focus: document.activeElement && document.activeElement.className }; })()`);
      const seq = [await s()];
      for (let i = 0; i < 5; i++) { await P.key('Escape'); seq.push(await s()); }
      const ok = seq[0].q === 'kestrel' && seq[1].q === '' && seq[1].insp === 'record' && seq[2].insp === 'item' && seq[2].sel === 'VM-HG-243' &&
        seq[3].sel === null && seq[3].active === 1 && seq[4].active === 0 && seq[4].open && !seq[5].open && /radial-drawer-trigger/.test(seq[5].focus);
      check('Q11 Escape peels, with trusted keys: the search text, the record, the selection, the filters, then the drawer (focus to its trigger)', ok,
        J(seq.map((x) => [x.q, x.insp, x.sel, x.active, x.open])));
      await P.ev(`document.querySelector('#D .radial-drawer-trigger').click()`);
      await P.ev(`document.querySelector('#D .radial-drawer-q').focus()`);
      await P.type('VM-KQ-00');
      await P.key('ArrowDown');
      const a = await P.ev(`(() => { const f = document.activeElement; return { cls: f.className, sel: f.getAttribute('aria-selected'), exp: document.querySelector('#D .radial-drawer-q').getAttribute('aria-expanded') }; })()`);
      await P.key('ArrowUp');
      const b2 = await P.ev(`document.activeElement.className`);
      await P.key('Enter');
      const c = await P.ev(`FX.inst.D.state().selection.locked`);
      check('Q12 the result keyboard: Down to the first result, Up back to the search, Enter chooses the first', /radial-drawer-r/.test(a.cls) && a.sel === 'true' && a.exp === 'true' &&
        /radial-drawer-q/.test(b2) && /^VM-KQ-00/.test(c || ''), J({ a, b: b2, c }));
    }

    { const r = await KEYED.u20(P); check('U20 a resize to a narrow canvas collapses the inspector with focus handed from the record to its disclosure; the record and selection stay, and Escape still closes the record', r.ok, J(r.d)); }
    { const r = await KEYED.resizeFocus(P, [1200, 900], [390, 844], true); check('U21 control: focus on an unrelated visible control stays there when the inspector collapses', r.ok, J(r.d)); }
    { const r = await KEYED.u17(P); check('U17 with the keyboard: a record opened from a reference keeps focus in the panel (on the way back), and Escape then closes the record', r.ok, J(r.d)); }

    await W('U19 the live legend draws plane and kind notes under their labels, and a shapes line in place of the kind rows and their notes', 'legendNotes');
    await W('U23 without the facets module, a reference to a node a membership hides clears the membership through the engine, selects the node, then moves the camera', 'followNoFacets');
    await W('U24 a reference to a node hidden by policy is not reached: the selection and the camera stay', 'followPolicyHidden');
    await W('U25 the way back to a node a filter hid since the record opened closes the record; the filter, the selection and the camera stay', 'backHidden');

    console.log('# H  theme');
    await W('H1 the control cycles auto, light, dark and back, and names the state in force', 'theme');
    await W('H2 one theme owner per document; a non-owner listing the module renders nothing', 'themeOwner');
    await W('H3 destroy restores the document theme the page had', 'themeRestore');

    console.log('# N  the synthetic composition, complete');
    for (const sh of ['base', 'shallow', 'ragged', 'deeper', 'flat']) await W(`N1 ${sh}: the complete stack mounts; search finds an item by identifier and selects it; a filter bounds it`, 'shape', sh);
    await W('N2 two complete instances share no selection, membership, search or service', 'twoInstances');
    await W('N3 destroy after search, filter, record, drawer and theme leaves the host and the document as they were; a remount reproduces the view', 'destroy');
    await W('N4 a listed module not loaded, a module\'s slot missing: named errors, nothing mounted', 'missing');
    await W('N5 the minimum composition takes a membership through the instance and gives it back', 'minimum');
    await W('N6 the synthetic run loaded no reference content', 'noReference');
    check('N7 no uncaught error on the wide page', P.errors.length === 0, J(P.errors.slice(0, 3)));

    console.log('# R  the reference specimen');
    await W('R1 the complete stack on the captured content: 590 placed nodes, 217 relations, 479 records, 1,068 search entries, nothing unresolved', 'reference');
    await P.close();

    /* compact */
    P = await open(b, url, { width: 390, height: 844, touch: true });
    console.log('# U, Q on a compact canvas');
    { const r = await KEYED.resizeFocus(P, [1200, 900], [1200, 500], false);
      check('U22 a coarse pointer: a height that makes the canvas compact collapses the inspector with focus handed to its disclosure; Escape still closes the record',
        r.ok && r.d.setup.coarse, J(r.d)); }
    await P.size(390, 844); await P.frames();
    { const a = await at(P, 'compact');
      await P.size(1280, 800); await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames();
      const w = await at(P, 'wideEdge');
      await P.size(390, 844); await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames();
      measures.u15 = { compact: a.d, wide: w.d };
      check('U15 compact: collapsed until a selection opens it; the collapsed pill declares the right edge and the open sheet the top, and wide keeps the right, open or collapsed; exclusive with an opened chrome panel both ways; Escape collapses it',
        a.ok && w.ok, J({ wide: w.d, compact: [a.d.a.edge, a.d.b, a.d.c.edge, a.d.d.edge, a.d.e.edge] })); }
    await W('Q13 compact: the drawer, the chrome panels and the inspector sheet are exclusive', 'exclusive');
    await W('U16 compact: a selection opens the sheet with no refit, and the selected node lands beside the sheet, not under it', 'compactReveal');
    await W('U18 compact: a selection opening the sheet over an open chrome panel at the Fit closes the panel and refits nothing', 'compactClaimNoFit');
    { const r = await KEYED.u27(P); measures.u27 = r.d; check('U27 compact, with a record and a filter: collapsing, expanding and a portrait / landscape turn and back keep the record, selection and filter, with the Fit edge following the state; at the Fit each change refits and the turn back restores the same Fit; away from it the camera stays', r.ok, J(r.d).slice(0, 400)); }
    { const r = await KEYED.q15(P); check('Q15 compact, with the keyboard: choosing a result closes the drawer with focus on its trigger, and Escape then clears the selection', r.ok, J(r.d)); }
    check('Q14 no uncaught error on the compact page', P.errors.length === 0, J(P.errors.slice(0, 3)));
    await P.close();

    {
      const Rp = await open(b, url.replace('/tests/radial-stack-fixture.html', '/patterns/_preview/diagram-interactive-radial.html'), { width: 1100, height: 760 });
      await Rp.ev(CHECKS);
      const r = await Rp.ev('C.drawerMeets()');
      check('Q16 wide: the reference shell at 1100x760 sends the arrangement to compact while its open drawer would meet a corner panel, and back to wide when it closes', r.ok, J(r.d));
      await Rp.close();
      /* its control: the chrome planted to ignore a yielding obstacle in wide too */
      const Xp = await open(b, url.replace('/tests/radial-stack-fixture.html', '/patterns/_preview/diagram-interactive-radial.html'), { width: 1100, height: 760 });
      await Xp.ev(CHECKS);
      const pl = await Xp.ev(`C.plant('diagrams-radial-chrome.js', 'var obs = obstacles(true);', 'var obs = obstacles();')`);
      let x = { ok: true, d: 'not planted' };
      if (pl.planted) {
        await Xp.ev(`(() => { const R = window.RADIAL_REFERENCE; RADIAL_MAP.destroy(); window.RADIAL_MAP = DIAGRAM_RADIAL.mount({ host: document.querySelector('[data-radial]'), data: R.data, adapter: R.adapter, modules: R.modules }); return true; })()`);
        await Xp.ev('new Promise((r) => setTimeout(r, 300))');
        x = await Xp.ev('C.drawerMeets()');
      }
      check('X11 a chrome planted to ignore a yielding obstacle in wide fails Q16', pl.planted && !x.ok, J(x.d));
      await Xp.close();
    }

    /* the two public expressions at the whole-map Fit, on a touch page turned through the short
       landscape sizes, then portrait and wide, in each theme */
    console.log('# U  the public expressions at the Fit');
    {
      const EXPR = { 'the CFW reference': '/patterns/_preview/diagram-interactive-radial.html', 'the Vellmark parks composition': '/patterns/_preview/diagram-interactive-radial.neutral.html' };
      const SIZES = [[844, 390], [812, 375], [740, 340], [667, 375], [568, 320], [390, 844], [1280, 800]];
      measures.exprFit = [];
      for (const [name, page] of Object.entries(EXPR)) for (const scheme of ['light', 'dark']) {
        const E = await open(b, base + page, { width: SIZES[0][0], height: SIZES[0][1], touch: true, scheme });
        const rows = [];
        for (const [i, [w, h]] of SIZES.entries()) {
          if (i) { await E.size(w, h); await E.frames(); await E.ev('new Promise((r) => setTimeout(r, 250))'); await E.frames(); }
          rows.push(await E.ev(`C.exprFit(${J(scheme)})`));
        }
        measures.exprFit.push({ name, scheme, rows: rows.map((r) => r.d) });
        const bad = rows.filter((r) => !r.ok).map((r) => [r.d.size, r.d.theme, r.d.edge, r.d.exp ? 'open' : 'pill', 'clear ' + r.d.clear, 'drawing ' + r.d.drawing]);
        check(`U26 ${name}, ${scheme}: on a short landscape touch screen (844x390 to 568x320) and in portrait (390x844) the collapsed pill declares the right edge, and in wide (1280x800) the corner panel does; the whole-map Fit stands clear at each`,
          !bad.length && E.errors.length === 0, J(bad.length ? bad : rows.map((r) => [r.d.size, r.d.k])).slice(0, 400));
        await E.close();
      }
      /* its control: the pill planted to reserve a band across the top again, on the CFW reference at 568x320 */
      const Xc = await open(b, base + EXPR['the CFW reference'], { width: 568, height: 320, touch: true });
      const pl = await Xc.ev(`C.plant('diagrams-radial-inspector.js', ${J("set(slot, 'data-diagram-fit-edge', compact && expanded ? 'top' : 'right');")}, ${J("set(slot, 'data-diagram-fit-edge', compact ? 'top' : 'right');")})`);
      let x = { ok: true, d: 'not planted' };
      if (pl.planted) {
        await Xc.ev(`(() => { const R = window.RADIAL_REFERENCE; RADIAL_MAP.destroy(); window.RADIAL_MAP = DIAGRAM_RADIAL.mount({ host: document.querySelector('[data-radial]'), data: R.data, adapter: R.adapter, modules: R.modules }); return true; })()`);
        await Xc.ev('new Promise((r) => setTimeout(r, 300))'); await Xc.frames();
        x = await Xc.ev('C.exprFit()');
      }
      check('X16 a collapsed pill planted to reserve a band across the top again fails U26\'s check on the CFW reference at 568x320: the whole-map Fit no longer stands clear, the drawing under the controls',
        pl.planted && !x.ok && x.d.clear === false && x.d.drawing === false, J(x.d));
      await Xc.close();
    }

    console.log('# W  export');
    await groupW(b, url);

    console.log('# X  controls: a planted fault fails the check written for it');
    const plants = [
      ['X1 OR within a facet planted as AND fails Q4', 'diagrams-radial-facets.js', 'return vs.some(function (v) { return f.chosen.has(v); });',
       'return Array.from(f.chosen).every(function (v) { return vs.indexOf(v) >= 0; });', 'counts', {}],
      ['X2 the record view\'s Escape layer planted below the selection\'s fails U6', 'diagrams-radial-inspector.js', "name: 'record', priority: 11", "name: 'record', priority: 9", 'escapeOrder', {}],
      ['X3 relation rows planted without direction fail U8', 'diagrams-radial-inspector.js', "r.direction === 'out' ? '\\u2192' : '\\u2190'", "'\\u2192'", 'relations', {}],
      ['X4 a drawer planted without its bound fails Q8', 'diagrams-radial-facets.js', '      if (!open) return;\n      var cr = canvas', '      return;\n      var cr = canvas', 'drawer', {}],
      ['X5 a chrome panel planted without its claim fails Q13', 'diagrams-radial-chrome.js', '      if (on) api.claim(p.slot);', '', 'exclusive', { width: 390, height: 844, touch: true }],
      ['X6 a locator planted to link any token fails U10', 'diagrams-radial-inspector.js', "if (!h || !HOST_RE.test(h[1])) return null;", '', 'locator', {}],
      ['X7 a Fit planted to frame the root alone when no item is a member fails Q6', 'diagrams-radial-engine.js', 'return vis.length > 1 ? R.layout.boundsOf(vis) || L.bounds : L.bounds;', 'return R.layout.boundsOf(vis) || L.bounds;', 'refit', {}],
      ['X8 a membership planted to keep a hidden selection fails Q7', 'diagrams-radial-engine.js', "if (locked && !visible(locked)) select(null, 'api', cause || 'module');", '', 'filterClears', {}],
      ['X9 a selection planted to refit the opened sheet, without revealing, fails U16', 'diagrams-radial-inspector.js',
       "if (!expanded) expand(true, ev.cause === 'load' ? 'load' : 'reader', false, ev.id);",
       "if (!expanded) expand(true, ev.cause === 'load' ? 'load' : 'reader');", 'compactReveal', { width: 390, height: 844, touch: true }],
      ['X10 the sheet planted to claim before it leaves the Fit fails U18', 'diagrams-radial-inspector.js',
       "      expanded = on;\n      place();", "      expanded = on;\n      if (on && compact) api.claim('inspector');\n      place();", 'compactClaimNoFit', { width: 390, height: 844, touch: true }]
    ];
    plants.push(
      ['X12 a panel planted to drop focus when its view is replaced fails U17', 'diagrams-radial-inspector.js', '      if (focused) {', '      if (false) {', KEYED.u17, {}],
      ['X14 a resize planted to hide the body without the focus handoff fails U20', 'diagrams-radial-inspector.js',
       '      if (was && compact) handoff();', '', KEYED.u20, {}],
      ['X15 a reference planted to reveal only through the facets module fails U23', 'diagrams-radial-inspector.js',
       "if (f && f.reset) f.reset('reader'); else api.membership.reset('reader');", "if (f && f.reset) f.reset('reader');", 'followNoFacets', {}],
      ['X13 a drawer planted to keep focus when another panel closes it fails Q15', 'diagrams-radial-facets.js',
       "setOpen(false, cause === 'claim' ? 'reader' : cause || 'module'); } });", "setOpen(false, cause === 'claim' ? 'reader' : cause || 'module', cause !== 'claim'); } });",
       KEYED.q15, { width: 390, height: 844, touch: true }]);
    for (const [name, file, from, to, fn, opts] of plants) {
      const Q = await open(b, url, opts);
      const pl = await Q.ev(`C.plant(${J(file)}, ${J(from)}, ${J(to)})`);
      let r = { ok: true, d: 'not run' };
      if (pl.planted) { try { r = typeof fn === 'function' ? await fn(Q) : await at(Q, fn); } catch (e) { r = { ok: false, d: 'threw: ' + String(e).slice(0, 120) }; } }
      check(name, pl.planted && !r.ok, pl.planted ? J(r.d).slice(0, 200) : 'the fault could not be planted: the module text changed');
      await Q.close();
    }
  } finally {
    srv.close();
    await stop(b);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (JSON_OUT) console.log(JSON.stringify(measures, null, 1));
  process.exitCode = failed ? 1 : 0;
}

/* W: export with the whole stack, and on the reference content (the export's own harness,
   tests/radial-export.mjs, covers the module in depth) */
async function groupW(b, url) {
  const P = await open(b, url);
  const png = (expr) => P.ev(`(async () => { try { const r = await ${expr}; delete r.blob; const n = (r.svg.match(/<text /g) || []).length;
    const svg = r.svg; delete r.svg; return Object.assign(r, { texts: n, svgLength: svg.length, lines: (svg.match(/class="radial-plate-line"[^>]*>[^<]*</g) || []).map((x) => x.replace(/.*>/, '').slice(0, -1)),
      glyphs: (svg.match(/class="radial-plate-glyph"/g) || []).length, svgHash: Array.from(svg).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) }); }
    catch (e) { return { ok: false, reason: e.reason || String(e) }; } })()`);
  /* the whole stack busy on screen: a selection, a filter, the drawer, a record; the plate is the neutral one */
  await P.ev(`(() => { if (FX.inst.D) FX.inst.D.destroy(); const m = FX.mount('D', 'specimen'); window.__fresh = m; return true; })()`);
  const plain = await png(`FX.inst.D.service('export').run('page')`);
  await P.ev(`(() => { const m = FX.inst.D; m.select('VM-HG-243'); const f = m.service('facets'); f.open(true); f.set('status', ['earned']);
    m.service('inspector').openRecord('OFFICE-N'); return true; })()`);
  await P.ev('new Promise((r) => setTimeout(r, 400))'); await P.frames();          /* the chrome settles after the filter */
  const before = await P.ev(`(() => { const s = FX.inst.D.state(); return JSON.stringify([s.selection, s.membership, s.inspector, s.facets.open, s.view]); })()`);
  const busy = await png(`FX.inst.D.service('export').run('page')`);
  const after = await P.ev(`(() => { const s = FX.inst.D.state(); return JSON.stringify([s.selection, s.membership, s.inspector, s.facets.open, s.view]); })()`);
  check('W1 with the whole stack in use (selection, filter, drawer, record), a page plate is the neutral plate and the screen is unchanged',
    plain.ok && busy.ok && plain.svgHash === busy.svgHash && before === after && plain.width === 3840 && plain.height === 2880, J({ plain: plain.ok && plain.svgHash, busy: busy.ok && busy.svgHash, same: before === after }));
  const ctl = await P.ev(`Array.from(document.querySelectorAll('#D [data-radial-slot="actions"] > *')).map((x) => x.className.split(' ').filter((c) => /^radial-/.test(c)).join(' '))`);
  check('W2 the bar carries the drawer trigger, the two export controls and the theme control, in mount order', J(ctl) === J(['radial-drawer-trigger', 'radial-export-control', 'radial-export-control', 'radial-theme-control']), J(ctl));
  /* the reference content: its plates, its plate lines, its shape key */
  await P.ev(`(async () => { if (FX.inst.D) { FX.inst.D.destroy(); FX.inst.D = null; } const ref = await FX.reference();
    FX.inst.D = DIAGRAM_RADIAL.mount({ host: FX.host('D'), data: ref.data, adapter: ref.adapter, modules: ref.modules }); return true; })()`);
  const rp = await png(`FX.inst.D.service('export').run('page')`);
  const rd = await png(`FX.inst.D.service('export').run('diagram')`);
  await P.ev(`(document.documentElement.setAttribute('data-theme', 'dark'), true)`);
  const rk = await png(`FX.inst.D.service('export').run('page')`);
  await P.ev(`(document.documentElement.removeAttribute('data-theme'), FX.inst.D.destroy(), FX.inst.D = null, true)`);
  measures.referenceExport = { page: rp, diagram: rd, dark: rk };
  check('W3 the reference plates: page 3840x2880 light and dark, the diagram at its natural aspect on a 3840 long edge, the CFW filenames',
    rp.ok && rk.ok && rd.ok && rp.width === 3840 && rp.height === 2880 && Math.max(rd.width, rd.height) === 3840 &&
    rp.filename === 'cfw-mind-map-page-3840x2880-light.png' && rk.filename === 'cfw-mind-map-page-3840x2880-dark.png' && rd.filename === 'cfw-mind-map-diagram-light.png',
    J({ page: [rp.ok, rp.width, rp.height, rp.reason], diagram: [rd.ok, rd.width, rd.height, rd.reason], dark: [rk.ok, rk.theme] }));
  check('W4 the reference page plate states the census and draws its six-mark shape key',
    J(rp.lines) === J(['548 primary objects // 479 evidence owners', '5 regions // 36 branches',
      '8 registered drawn // 198 recorded retained, hidden at rest // 11 unedged, never drawn', 'level of detail: branches // full atlas, unfiltered, neutral state']) && rp.glyphs === 6,
    J({ lines: rp.lines, glyphs: rp.glyphs }));
  check('W5 no uncaught error on the export page', P.errors.length === 0, J(P.errors.slice(0, 3)));
  await P.close();
}

run().catch((e) => { console.error(e); process.exit(2); });
