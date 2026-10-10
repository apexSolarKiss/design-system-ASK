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
        locators; compact sheet and exclusivity; the Fit edges by state (the collapsed pill top
        with the right as its option, the open sheet an overlay reserving nothing, the wide panel
        right); refits only at the Fit; text, never markup; malformed sections; a record arrival;
        a resize into compact keeping a reader's record open and folding an idle panel; the sheet
        opened and closed with a record and a filter through a portrait / landscape turn, at the
        Fit and away from it; the two public expressions framed at the Fit (clear, as large as the
        best reservation of the inspector, and where the panels fold as large as with it folded)
        on a touch page and a desktop page; on each, the same turn with a record and a filter; the
        inspector folded with the panels on a desktop window, and its dynamic states there;
        selections at the narrowest window where the panels stand leaving no drawn mark under the
        wide panel; a search result and an arrival landing clear of the open sheet; the sheet
        yielding to the open drawer; a phone turned with the reading sheet open, however it was
        opened, keeping the selected node on the canvas and beside the sheet; a camera the reader
        moved kept through a turn and a resize; an arrived node left clear of the sheet as the
        layout settles; the sheet's opening closing the drawer that folded the panels returning the
        wide panel to the wide Fit; on a desktop page narrowed, a centered node kept in view and a
        framed group framed again; and the chrome and the inspector settling in one step where they
        meet
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
/* hold: a script URL fragment held at the network until every font face the page declares has loaded, so the
   page's map mounts with its fonts settled; P.held then reports the faces loaded at the release */
async function open(b, url, { width = 1280, height = 800, touch = false, scheme = 'light', hold = null } = {}) {
  const tgt = await (await fetch(`http://127.0.0.1:${b.port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(), errors = []; let loaded; const onLoad = new Promise((r) => { loaded = r; });
  let paused; const onPause = new Promise((r) => { paused = r; });
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
    if (m.method === 'Fetch.requestPaused') paused(m.params.requestId);
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
  if (hold) await call('Fetch.enable', { patterns: [{ urlPattern: '*' + hold + '*', requestStage: 'Request' }] });
  await call('Page.navigate', { url });
  let held = null;
  if (hold) {
    const rid = await Promise.race([onPause, new Promise((r) => setTimeout(() => r(null), 15000))]);
    const r = await call('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression:
      '(async () => { for (let i = 0; i < 400 && !(document.querySelector("[data-radial-slot=stage]") && document.fonts.size > 0); i++) { if (document.body) void document.body.offsetHeight; await new Promise((r) => setTimeout(r, 25)); }' +
      ' await Promise.all(Array.from(document.fonts).map((f) => f.load().catch(() => null)));' +
      ' return { faces: document.fonts.size, loaded: Array.from(document.fonts).filter((f) => f.status === "loaded").length, status: document.fonts.status }; })()' });
    held = Object.assign({ paused: !!rid }, r.result && r.result.value);
    if (rid) await call('Fetch.continueRequest', { requestId: rid });
    await call('Fetch.disable');
  }
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
    ev, frames, errors, size, call, held,
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
    return { ok: kind === k.id + ' // ' + k.label && title === raw.label && sn === s.label && tone === 'var(--state-' + n.state + ')' && st().inspector.view === 'item',
             d: { kind, title, sn, tone } }; };
  /* an adapter's own kind line is kept as given, its own punctuation included; an empty one draws no line */
  C.kindOverride = async () => { const own = 'own kind \u2014 as given', item = (kind) => { const a = FX.adapterFor('specimen'), h = a.inspector.header;
      a.inspector.header = (t) => t.type === 'item' ? Object.assign({}, h(t), { kind }) : h(t); return a; };
    let m = fresh('specimen', { adapter: item(own) }); m.select(leafOf(m, (n) => n.kindId).id); await frames();
    const one = qa('#D .radial-insp-kind').map((x) => x.textContent);
    m = fresh('specimen', { adapter: item('') }); m.select(leafOf(m, (n) => n.kindId).id); await frames();
    const two = qa('#D .radial-insp-kind').length, title = q('#D .radial-insp-title') && q('#D .radial-insp-title').textContent;
    return { ok: one.length === 1 && one[0] === own && two === 0 && !!title, d: { one, two, title } }; };
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
  /* wide: the panel collapsed at the Fit, then opened again by a selection, which reveals the node
     beside it and so leaves the Fit; the reader's toggle then collapses it with no refit */
  C.wideToggle = async () => { const m = fresh(); await frames(); const t = q('#D .radial-insp-toggle');
    t.click(); await frames(); const a = { exp: st().inspector.expanded, atFit: m.view().atFit };
    m.select('VM-KQ-002'); await frames(); const b = { exp: st().inspector.expanded, atFit: m.view().atFit, arr: st().inspector.arrangement };
    const fits = []; m.on('fit', (e) => fits.push(e.cause)); const v0 = m.view();
    t.click(); await frames(); const v = m.view();
    return { ok: !a.exp && a.atFit && b.exp && b.arr === 'wide' && !b.atFit && !st().inspector.expanded && fits.length === 0 && v.k === v0.k && v.x === v0.x && v.y === v0.y,
             d: { a, b, fits, kept: v.k === v0.k && v.x === v0.x && v.y === v0.y } }; };
  /* compact: collapsed at start, opened by a selection, exclusive with the chrome panels. The Fit
     edges follow the state: the collapsed pill declares the top with the right as its option, and
     the open sheet, an overlay, reserves nothing */
  C.compact = async () => { const m = fresh(); await frames(); const slot = q('#D [data-radial-slot="inspector"]');
    const edge = () => slot.getAttribute('data-diagram-fit-edge') + '/' + slot.getAttribute('data-radial-fit-option');
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
    return { ok: a.s.arrangement === 'compact' && !a.s.expanded && a.edge === 'top/right' && a.obs === '' && b.s.expanded && b.edge === 'none/null' && b.obs === 'yields' &&
                 !c.s.expanded && c.edge === 'top/right' && c.chrome === 'legend' && d.s.expanded && d.edge === 'none/null' && d.chrome === null &&
                 e.sel === null && !e.s.expanded && e.edge === 'top/right',
             d: { a, b: [b.s.expanded, b.edge], c, d, e } }; };
  /* wide: the corner panel declares the right edge alone, open or collapsed */
  C.wideEdge = async () => { const m = fresh(); await frames(); const slot = q('#D [data-radial-slot="inspector"]');
    const edge = () => slot.getAttribute('data-diagram-fit-edge') + '/' + slot.getAttribute('data-radial-fit-option');
    const a = { arr: st().inspector.arrangement, exp: st().inspector.expanded, edge: edge() };
    q('#D .radial-insp-toggle').click(); await frames();
    const b = { exp: st().inspector.expanded, edge: edge() };
    q('#D .radial-insp-toggle').click(); await frames();
    return { ok: a.arr === 'wide' && a.exp && a.edge === 'right/null' && !b.exp && b.edge === 'right/null', d: { a, b } }; };

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
  /* At the whole-map Fit the drawing stands clear (its names in the clearance check), and it is as
     large as the best reservation of the inspector that clears: measured here by declaring each
     edge it can hold (the collapsed pill top or right; the open compact sheet top; the wide panel,
     which grows with a selection, right) with no option, fitting, and restoring. On the amended
     tree that is a consistency check of the engine's choice; the controls and the earlier trees
     carry the discrimination. So is the fold comparison where the panel already stands folded (the
     overview against itself): it discriminates where the panel stands open, as on X18 and the
     earlier trees. An explicit Fit then gives the same view as the one under test */
  C.frame = async (scheme) => { const m = RADIAL_MAP; await frames();
    const slot = q('[data-radial-slot="inspector"]'), html = document.documentElement;
    const read = () => { const v = m.view(), f = m.report().fit; return { k: v.k, x: v.x, y: v.y, atFit: v.atFit, clear: f.clear, drawing: f.drawingClear, option: !!f.option }; };
    const s = m.state(), now = read(), E = slot.getAttribute('data-diagram-fit-edge'), A = slot.getAttribute('data-radial-fit-option');
    const edges = s.inspector.arrangement !== 'compact' ? ['right'] : s.inspector.expanded ? ['none'] : ['top', 'right'], one = {};
    for (const e of edges) { slot.setAttribute('data-diagram-fit-edge', e); slot.removeAttribute('data-radial-fit-option'); m.fit('explicit'); await frames(); one[e] = read(); }
    slot.setAttribute('data-diagram-fit-edge', E); if (A === null) slot.removeAttribute('data-radial-fit-option'); else slot.setAttribute('data-radial-fit-option', A);
    m.fit('explicit'); await frames();
    /* the chrome's compact arrangement with nothing inspected: the overview is the one the panel
       folded leaves, measured by folding it with its own toggle when it stands open */
    let fold = null;
    if (s.chrome && s.chrome.arrangement === 'compact' && s.inspector.view === 'idle' && !s.selection.locked) {
      if (s.inspector.expanded) {
        q('.radial-insp-toggle').click(); await frames(); m.fit('explicit'); await frames(); fold = read().k;
        q('.radial-insp-toggle').click(); await frames(); m.fit('explicit'); await frames();
      } else fold = now.k;
    }
    const again = read();
    const best = Math.max.apply(null, edges.map((e) => one[e].clear ? one[e].k : 0));
    const r4 = (x) => +x.toFixed(4);
    const d = { size: innerWidth + 'x' + innerHeight, theme: html.getAttribute('data-theme') || getComputedStyle(html).colorScheme,
                insp: s.inspector.arrangement + (s.inspector.expanded ? ' open' : ' collapsed'), edge: E + '/' + A, chrome: s.chrome && s.chrome.arrangement,
                k: r4(now.k), best: r4(best), top: one.top ? r4(one.top.k) + (one.top.clear ? '' : ' not clear') : null,
                right: one.right ? r4(one.right.k) + (one.right.clear ? '' : ' not clear') : null,
                fold: fold === null ? null : r4(fold), atFit: now.atFit, clear: now.clear, drawing: now.drawing, option: now.option };
    return { ok: now.atFit && now.clear === true && now.k >= best * 0.995 && (fold === null || now.k >= fold * 0.995) && Math.abs(again.k - now.k) < 1e-9 && Math.abs(again.x - now.x) < 1e-6 &&
                 Math.abs(again.y - now.y) < 1e-6 && (!scheme || d.theme === scheme), d }; };

  /* a wide desktop window at the Fit: a sample of selections grows the wide panel; no drawn mark may
     end up under it (the panel takes its right lane, and a selection neither refits nor moves) */
  C.cover = async () => { const m = RADIAL_MAP; await frames();
    const slot = q('[data-radial-slot="inspector"]'), sr = q('[data-radial-slot="stage"]').getBoundingClientRect(), s0 = m.state();
    const drawn = (id) => { const g = q('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
    const idle = slot.getBoundingClientRect().height, k = m.view().k;
    let n = 0, grown = 0, worst = 0, at = null;
    for (const node of m.layout.nodes.filter((x, i) => i % 7 === 0)) {
      m.select(node.id); await frames(); n++;
      const pr = slot.getBoundingClientRect(); grown = Math.max(grown, pr.height);
      let c = 0;
      for (const x of m.layout.nodes) { if (!drawn(x.id)) continue; const p = m.project(x.id), X = sr.left + p.x, Y = sr.top + p.y;
        if (X >= pr.left && X <= pr.right && Y >= pr.top && Y <= pr.bottom) c++; }
      if (c > worst) { worst = c; at = node.id; }
    }
    m.select(null); await frames();
    const d = { size: innerWidth + 'x' + innerHeight, insp: s0.inspector.arrangement + (s0.inspector.expanded ? ' open' : ' collapsed'),
                edge: slot.getAttribute('data-diagram-fit-edge') + '/' + slot.getAttribute('data-radial-fit-option'), k: +k.toFixed(4), option: !!m.report().fit.option,
                samples: n, idle: Math.round(idle), grown: Math.round(grown), worstUnder: worst, at, atFit: m.view().atFit, kept: m.view().k === k };
    return { ok: s0.inspector.arrangement === 'wide' && s0.inspector.expanded && n > 10 && grown > idle + 50 && worst === 0 && d.atFit && d.kept, d }; };
  /* a public expression: a filter, a drawn leaf selected under it and a record opened from it */
  C.exprSetup = () => { const m = RADIAL_MAP, f = m.service('facets');
    const drawn = (id) => { const g = q('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
    let rec = null; m.model.byId.forEach((x, id) => { if (!rec && m.model.kindOf(id) === 'record') rec = id; });
    for (const cb of qa('input[data-radial-facet]')) {
      f.set(cb.getAttribute('data-radial-facet'), [cb.value]);
      const leaf = m.layout.nodes.find((x) => x.kind === 'leaf' && drawn(x.id));
      if (leaf && rec) { m.select(leaf.id); m.service('inspector').openRecord(rec, leaf.id);
        return { facet: cb.getAttribute('data-radial-facet'), value: cb.value, leaf: leaf.id, rec, items: m.state().membership.visibleItems }; }
      f.reset('reader');
    }
    return null; };
  /* the inspector's wide panel placed (by a test style) over the legend's corner: the chrome's wide
     arrangement fails on it, the inspector folds with the compact arrangement, and the two must settle
     in one step: the chrome decides compact once, counted from before the mount, and nothing after */
  C.settle = async () => { if (FX.inst.D) { FX.inst.D.destroy(); FX.inst.D = null; } FX.mode('one');
    const st = document.createElement('style'); st.textContent = '#D [data-radial-inspector="wide"] { top: auto; bottom: 18px; }'; document.head.appendChild(st);
    /* every arrangement the chrome decides, from before the mount: its emit, wrapped for this mount */
    const arr = [], chrome = DIAGRAM_RADIAL.modules.chrome, mount0 = chrome.mount;
    chrome.mount = function (api, cfg) { const emit = api.emit;
      api.emit = function (t, e) { if (t === 'arrangement') arr.push(e && e.arrangement); return emit.apply(api, arguments); };
      return mount0.call(this, api, cfg); };
    let m = null, err = null, n = 0, d = null;
    try {
      try { m = FX.mount('D', 'specimen'); m.on('arrangement', () => n++); await new Promise((r) => setTimeout(r, 600)); await frames(); }
      catch (e) { err = String((e && e.message) || e).slice(0, 80); }
      const s = m ? m.state() : null;
      d = { err, n, decided: arr.slice(0, 12), chrome: s && s.chrome ? s.chrome.arrangement : null, insp: s ? s.inspector.arrangement + (s.inspector.expanded ? ' open' : ' folded') : null };
    } finally {
      chrome.mount = mount0;
      try { if (m) m.destroy(); } catch (e) { /* torn down */ }
      FX.inst.D = null; st.remove();
    }
    /* one step: the chrome decides compact once, during the mount, and nothing after */
    return { ok: !err && n === 0 && J(d.decided) === J(['compact']) && d.chrome === 'compact' && d.insp === 'compact folded', d }; };
  /* for the reading states: the first filter value that keeps a drawn leaf and a record offering a
     reference to a drawn node, and among those records the one with the most to show. Each record is
     opened from the leaf in turn, the overview restored, then the chosen record opened from the leaf */
  C.readingSetup = async () => { const m = RADIAL_MAP, f = m.service('facets'), insp = m.service('inspector');
    const drawn = (id) => { const g = q('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
    const recs = []; m.model.byId.forEach((x, id) => { if (m.model.kindOf(id) === 'record') recs.push(id); });
    const rest = async () => { insp.show(null); if (m.state().inspector.expanded) q('.radial-insp-toggle').click(); m.select(null); m.fit('explicit'); await frames(); };
    for (const cb of qa('input[data-radial-facet]')) {
      f.set(cb.getAttribute('data-radial-facet'), [cb.value]);
      const leaf = m.layout.nodes.find((x) => x.kind === 'leaf' && drawn(x.id));
      let best = null;
      if (leaf) {
        m.select(leaf.id); await frames();
        for (const rec of recs) {
          insp.openRecord(rec, leaf.id);
          const body = q('.radial-insp-body'), h = body ? body.scrollHeight : 0;
          const ref = qa('.radial-insp-body .radial-insp-ref').map((x) => x.getAttribute('data-radial-ref')).find((id) => id !== leaf.id && m.model.kindOf(id) !== 'record' && drawn(id));
          if (ref && (!best || h > best.h)) best = { rec, h, ref, bottom: q('[data-radial-slot="inspector"]').getBoundingClientRect().bottom };
        }
        await rest();
      }
      if (best) { m.select(leaf.id); insp.openRecord(best.rec, leaf.id);
        return { facet: cb.getAttribute('data-radial-facet'), value: cb.value, leaf: leaf.id, rec: best.rec, h: best.h, ref: best.ref, bottom: best.bottom,
                 items: m.state().membership.visibleItems }; }
      f.reset('reader');
    }
    return null; };
  /* at the overview, a drawn node (a group or a leaf) whose own short view leaves it beside the sheet,
     where the tallest record's sheet (its bottom edge at bottom) would cover it: opened by its selection */
  C.growNode = async (bottom) => { const m = RADIAL_MAP;
    const drawn = (id) => { const g = q('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
    const sr = q('[data-radial-slot="stage"]').getBoundingClientRect();
    const y = (id) => sr.top + m.project(id).y;
    const nodes = m.layout.nodes.filter((x) => x.kind !== 'root' && drawn(x.id) && y(x.id) < bottom - 16).sort((a, b) => y(b.id) - y(a.id));
    for (const n of nodes.slice(0, 40)) {
      const v0 = m.view(); m.select(n.id); await frames();
      const r = q('[data-radial-slot="inspector"]').getBoundingClientRect(), v = m.view();
      if (m.state().inspector.expanded && y(n.id) > r.bottom + 16 && y(n.id) < bottom - 16 && Math.abs(v.x - v0.x) < 1e-6 && Math.abs(v.y - v0.y) < 1e-6)
        return { node: n.id, kind: n.kind, y: Math.round(y(n.id)), sheet: Math.round(r.bottom), tall: Math.round(bottom) };
      if (m.state().inspector.expanded) q('.radial-insp-toggle').click(); m.select(null); m.fit('explicit'); await frames();
    }
    return null; };
  /* ---- X: a planted fault in a copy of a module, then the check written for it ---- */
  /* a preview page's map mounted again, after a plant: the CFW reference or the neutral composition */
  C.remount = () => { const host = q('[data-radial]'), R = window.RADIAL_REFERENCE, S = window.RADIAL_SPECIMEN, N = window.RADIAL_NEUTRAL;
    RADIAL_MAP.destroy();
    window.RADIAL_MAP = R ? DIAGRAM_RADIAL.mount({ host, data: R.data, adapter: R.adapter, modules: R.modules })
      : DIAGRAM_RADIAL.mount({ host, data: S.data, adapter: N.adapterFor(S.data, S.adapter), modules: N.modules });
    return true; };
  C.plant = async (file, from, to) => {
    let src = await (await fetch('/patterns/diagram-interactive-radial/' + file)).text();
    /* one replacement, or several given as two lists in order; each anchor must occur exactly once */
    const froms = [].concat(from), tos = [].concat(to);
    for (const [i, f] of froms.entries()) { if (src.split(f).length !== 2) return { planted: false }; src = src.replace(f, tos[i]); }
    (0, eval)(src);
    return { planted: true };
  };
  return C;
})();
`;

/* checks driven with trusted keys, each a function of a page so a control can rerun it */
const KEYED = {
  /* B1: a resize to a compact canvas. A reader's open record stays open, as the sheet, with focus in it,
     and Escape still closes the record first; a panel open only by default folds; focus on an unrelated
     control stays where it is either way. `to` is the compacting size; a touch page compacts by its height */
  async resizeFocus(P, from, to, outside, rec) {
    await P.size(from[0], from[1]); await P.frames();
    const setup = await P.ev(`(() => { if (FX.inst.D) FX.inst.D.destroy(); const m = FX.mount('D', 'specimen');
      ${outside && !rec ? '' : `m.select('VM-HG-243'); m.service('inspector').openRecord('OFFICE-N', 'VM-HG-243');`}
      const t = ${outside ? `document.querySelector('#D .radial-drawer-trigger')` : `document.querySelector('#D .radial-insp-back')`}; t.focus();
      return { focus: document.activeElement.className, expanded: m.state().inspector.expanded, coarse: matchMedia('(pointer: coarse)').matches }; })()`);
    await P.size(to[0], to[1]); await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames();
    const a = await P.ev(`(() => { const s = FX.inst.D.state(); return { expanded: s.inspector.expanded, arrangement: s.inspector.arrangement, view: s.inspector.view,
      sel: s.selection.locked, focus: document.activeElement.className, inHost: FX.host('D').contains(document.activeElement) }; })()`);
    let b = null;
    if (!outside) { await P.key('Escape'); b = await P.ev(`(() => { const s = FX.inst.D.state(); return { view: s.inspector.view, sel: s.selection.locked }; })()`); }
    await P.size(1280, 800); await P.frames();
    /* a reader's open record stays open, as the sheet, with focus in it; a panel open only by default folds */
    const ok = setup.expanded && a.arrangement === 'compact' && (outside
      ? (rec ? a.expanded && a.view === 'record' && a.sel === 'VM-HG-243' : !a.expanded && a.view === 'idle') && /radial-drawer-trigger/.test(a.focus)
      : a.expanded && a.view === 'record' && a.sel === 'VM-HG-243' && /radial-insp-back/.test(a.focus) && a.inHost && b.view === 'item' && b.sel === 'VM-HG-243');
    return { ok, d: { setup, a, b } };
  },
  u20(P) { return KEYED.resizeFocus(P, [1200, 900], [390, 844], false); },
  /* with a filter, a selected leaf and a record open from it: from the overview (the sheet folded, at the
     Fit), open and close the sheet, and turn tall portrait > short portrait > landscape > short portrait
     > tall portrait, first at the Fit and then away from it. Opening never refits or shrinks the drawing
     and keeps the leaf beside the sheet; closing returns to the Fit the sheet was opened from; a turn
     refits at the Fit and keeps the camera away from it */
  async walk(P, I, pre, want, scheme) {
    const settle = async () => { await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames(); };
    const snap = (tag) => P.ev(`(() => { const m = ${I}, s = m.state(), v = m.view(), f = m.report().fit, html = document.documentElement;
      const slot = document.querySelector('${pre}[data-radial-slot="inspector"]'), sr = document.querySelector('${pre}[data-radial-slot="stage"]').getBoundingClientRect();
      const r = slot.getBoundingClientRect(), p = m.project(${J(want.leaf)});
      const under = !!p && s.inspector.expanded && sr.left + p.x >= r.left && sr.left + p.x <= r.right && sr.top + p.y >= r.top && sr.top + p.y <= r.bottom;
      return { tag: ${J(tag)}, exp: s.inspector.expanded, arr: s.inspector.arrangement,
        edge: slot.getAttribute('data-diagram-fit-edge') + '/' + slot.getAttribute('data-radial-fit-option'),
        k: v.k, x: v.x, y: v.y, atFit: v.atFit, cause: f.cause, clear: f.clear, under, theme: html.getAttribute('data-theme') || getComputedStyle(html).colorScheme,
        kept: s.inspector.view === 'record' && s.inspector.target === ${J(want.rec)} && s.selection.locked === ${J(want.leaf)} && s.membership.active &&
          s.membership.visibleItems === ${want.items} && s.facets.active.length === 1 }; })()`);
    const toggle = async (tag) => { await P.ev(`document.querySelector('${pre}.radial-insp-toggle').click()`); await settle(); return snap(tag); };
    const turn = async (w, h, tag) => { await P.size(w, h); await settle(); return snap(tag); };
    if ((await snap('start')).exp) await toggle('fold');
    await P.ev(`${I}.fit('explicit')`); await settle();
    const run = async (first) => [await snap(first), await toggle('open'), await toggle('close'), await turn(393, 666, 'short'),
      await toggle('S open'), await toggle('S close'), await turn(844, 390, 'landscape'), await toggle('L open'), await toggle('L close'),
      await turn(393, 666, 'short again'), await turn(390, 844, 'tall again')];
    const fit = await run('fit');
    await P.ev(`${I}.zoom(1.6)`); await settle();
    const away = await run('zoomed');
    const same = (a, b) => Math.abs(a.k - b.k) < 1e-9 && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
    const open = [1, 4, 7], shut = [0, 2, 3, 5, 6, 8, 9, 10];
    const states = (r) => r.every((x, i) => x.exp === open.includes(i));
    const all = fit.concat(away);
    const ok = all.every((r) => r.kept && r.arr === 'compact' && r.edge === (r.exp ? 'none/null' : 'top/right') && (!scheme || r.theme === scheme)) &&
      states(fit) && states(away) &&
      shut.every((i) => fit[i].atFit && fit[i].clear) && open.every((i) => !fit[i].atFit && Math.abs(fit[i].k - fit[i - 1].k) < 1e-9 && !fit[i].under) &&
      [2, 5, 8].every((i) => fit[i].cause === 'reader') && [3, 6, 9, 10].every((i) => fit[i].cause === 'resize') &&
      same(fit[2], fit[0]) && same(fit[5], fit[3]) && same(fit[8], fit[6]) && same(fit[9], fit[3]) && same(fit[10], fit[0]) &&
      away.every((r) => !r.atFit) && open.every((i) => !away[i].under && Math.abs(away[i].k - away[i - 1].k) < 1e-9) &&
      [2, 5, 8, 3, 6, 9, 10].every((i) => same(away[i], away[i - 1]));
    return { ok, d: { want, rows: all.map((r) => [r.tag, r.exp ? 'open' : 'pill', r.edge, +r.k.toFixed(4), r.atFit, r.cause, r.clear, r.under, r.kept]) } };
  },
  /* a reader's inspection in the open wide panel, with focus on a button inside it, and the drawer open
     (by its service, so the focus stays): a resize to a compact canvas, where the sheet yields to the
     drawer, folds the panel and hands that focus to its disclosure. (A panel open only by default
     shows no control of its own to focus: a hover preview clears before the resize folds it) */
  async u33(P) {
    await P.size(1200, 900); await P.frames();
    const setup = await P.ev(`(() => { if (FX.inst.D) FX.inst.D.destroy(); const m = FX.mount('D', 'specimen'); m.select('VM-HG-243');
      const b = document.querySelector('#D .radial-insp-body button'); if (b) b.focus(); m.service('facets').open(true); const s = m.state();
      return { view: s.inspector.view, sel: s.selection.locked, expanded: s.inspector.expanded, arrangement: s.inspector.arrangement, drawer: s.facets.open,
        focused: !!b && document.activeElement === b }; })()`);
    await P.size(390, 844); await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames();
    const a = await P.ev(`(() => { const s = FX.inst.D.state(); return { expanded: s.inspector.expanded, arrangement: s.inspector.arrangement, view: s.inspector.view,
      sel: s.selection.locked, drawer: s.facets.open, focus: document.activeElement.className, inHost: FX.host('D').contains(document.activeElement) }; })()`);
    await P.size(1280, 800); await P.frames();
    return { ok: setup.view === 'item' && setup.sel === 'VM-HG-243' && setup.expanded && setup.arrangement === 'wide' && setup.drawer && setup.focused &&
      a.arrangement === 'compact' && !a.expanded && a.drawer && a.sel === 'VM-HG-243' && /radial-insp-toggle/.test(a.focus) && a.inHost, d: { setup, a } };
  },
  /* the CFW reference at 1100x760, where the open drawer alone folds the panels: with a node selected the
     drawer opens and the sheet yields to it, one arrangement reported; closing it returns the wide panel.
     A search result chosen there opens the sheet, which closes the drawer as on a phone: the panels
     return to wide, the node beside the panel. Then Vellmark at 1100x1150 narrowed to 940 with the drawer
     open over a selection: the sheet yields, the drawer and the focus in it stay */
  async u34(b, base, page2, plant) {
    const planted = async (X) => { if (!plant) return true; const pl = await X.ev(`C.plant(${J(plant.file)}, ${J(plant.from)}, ${J(plant.to)})`);
      if (pl.planted) { await X.ev('C.remount()'); await X.ev('new Promise((r) => setTimeout(r, 300))'); await X.frames(); } return pl.planted; };
    const E = await open(b, base + '/patterns/_preview/diagram-interactive-radial.html', { width: 1100, height: 760 });
    if (!(await planted(E))) { await E.close(); return { ok: true, planted: false, d: 'not planted' }; }
    const settle = async () => { await E.frames(); await E.ev('new Promise((r) => setTimeout(r, 300))'); await E.frames(); };
    const S = (x) => E.ev(`(() => { const m = RADIAL_MAP, s = m.state(), sel = s.selection.locked, p = sel ? m.project(sel) : null;
      const sr = document.querySelector('[data-radial-slot="stage"]').getBoundingClientRect(), r = document.querySelector('[data-radial-slot="inspector"]').getBoundingClientRect();
      return { drawer: s.facets.open, aria: document.querySelector('.radial-drawer-trigger').getAttribute('aria-expanded'), chrome: s.chrome.arrangement,
        insp: s.inspector.arrangement + (s.inspector.expanded ? ' open' : ' folded'), view: s.inspector.view, sel, focus: document.activeElement.className,
        under: !!p && s.inspector.expanded && sr.left + p.x >= r.left && sr.left + p.x <= r.right && sr.top + p.y >= r.top && sr.top + p.y <= r.bottom, events: window.__arr.slice() }; })()`);
    await E.ev(`(() => { const m = RADIAL_MAP; window.__arr = []; m.on('arrangement', (e) => window.__arr.push(e.arrangement));
      const drawn = (id) => { const g = document.querySelector('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
      m.select(m.layout.nodes.find((x) => x.kind === 'leaf' && drawn(x.id)).id); return true; })()`);
    await settle(); const a0 = await S();
    await E.ev(`document.querySelector('.radial-drawer-trigger').click()`); await settle(); const a1 = await S();
    await E.ev(`document.querySelector('.radial-drawer-trigger').click()`); await settle(); const a2 = await S();
    const q = await E.ev(`(() => { const m = RADIAL_MAP; m.select(null); m.fit('explicit'); window.__arr = [];
      const drawn = (id) => { const g = document.querySelector('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
      return m.layout.nodes.filter((x) => x.kind === 'leaf' && drawn(x.id))[3].id; })()`);
    await settle();
    await E.ev(`(() => { document.querySelector('.radial-drawer-trigger').click(); const i = document.querySelector('.radial-drawer-q'); i.value = ${J(q)}; i.dispatchEvent(new Event('input')); return true; })()`);
    await settle(); const a3 = await S();
    await E.ev(`(() => { const b = Array.from(document.querySelectorAll('.radial-drawer-r')).find((x) => x.textContent.indexOf(${J(q)}) >= 0); b.click(); return true; })()`);
    await settle(); const a4 = await S();
    const errs = E.errors.length; await E.close();
    const V = await open(b, base + page2, { width: 1100, height: 1150 });
    await planted(V);
    const vs = async () => V.ev(`(() => { const s = RADIAL_MAP.state(); return { drawer: s.facets.open, chrome: s.chrome.arrangement, insp: s.inspector.arrangement + (s.inspector.expanded ? ' open' : ' folded'),
      view: s.inspector.view, sel: s.selection.locked, focus: document.activeElement.className }; })()`);
    await V.ev(`(() => { const m = RADIAL_MAP; const drawn = (id) => { const g = document.querySelector('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
      m.select(m.layout.nodes.find((x) => x.kind === 'leaf' && drawn(x.id)).id); document.querySelector('.radial-drawer-trigger').click(); return true; })()`);
    await V.frames(); await V.ev('new Promise((r) => setTimeout(r, 300))'); const b0 = await vs();
    await V.size(940, 1150); await V.frames(); await V.ev('new Promise((r) => setTimeout(r, 300))'); await V.frames(); const b1 = await vs();
    const errs2 = V.errors.length; await V.close();
    const ok = errs === 0 && errs2 === 0 &&
      a0.insp === 'wide open' && a0.chrome === 'wide' && !!a0.sel &&
      a1.drawer && a1.aria === 'true' && /radial-drawer-q/.test(a1.focus) && a1.chrome === 'compact' && a1.insp === 'compact folded' && a1.sel === a0.sel && a1.view === a0.view && J(a1.events) === J(['compact']) &&
      !a2.drawer && a2.chrome === 'wide' && a2.insp === 'wide open' && a2.sel === a0.sel && J(a2.events) === J(['compact', 'wide']) &&
      a3.drawer && a3.chrome === 'compact' && a3.insp === 'compact folded' &&
      a4.sel === q && !a4.drawer && /radial-drawer-trigger/.test(a4.focus) && a4.chrome === 'wide' && a4.insp === 'wide open' && !a4.under && J(a4.events) === J(['compact', 'wide']) &&
      b0.drawer && b0.chrome === 'wide' && /radial-drawer-q/.test(b0.focus) && !!b0.sel &&
      b1.drawer && b1.chrome === 'compact' && b1.insp === 'compact folded' && b1.sel === b0.sel && /radial-drawer-q/.test(b1.focus);
    return { ok, planted: true, d: { a0, a1, a2, a3, a4, b0, b1 } };
  },
  /* a public expression on a landscape desktop window where the panels fold: a #node= arrival, and a search
     result, for each of the first leaves; the arrived or chosen node is clear of the open sheet by the
     reveal margin */
  async u35(b, base, page, size, scheme, n, plant) {
    const planted = async (X) => { if (!plant) return true; const pl = await X.ev(`C.plant(${J(plant.file)}, ${J(plant.from)}, ${J(plant.to)})`);
      if (pl.planted) { await X.ev('C.remount()'); await X.ev('new Promise((r) => setTimeout(r, 300))'); await X.frames(); } return pl.planted; };
    const P0 = await open(b, base + page, { width: size[0], height: size[1], scheme });
    if (!(await planted(P0))) { await P0.close(); return { ok: true, planted: false, d: 'not planted' }; }
    const ids = await P0.ev(`RADIAL_MAP.layout.nodes.filter((x) => x.kind === 'leaf').slice(0, ${n}).map((x) => x.id)`);
    const near = `(id) => { const m = RADIAL_MAP, s = m.state(), p = m.project(id), sr = document.querySelector('[data-radial-slot="stage"]').getBoundingClientRect(),
      r = document.querySelector('[data-radial-slot="inspector"]').getBoundingClientRect(), x = sr.left + p.x, y = sr.top + p.y, g = 12;
      return { id, sel: s.selection.locked, open: s.inspector.expanded && s.inspector.arrangement === 'compact', chrome: s.chrome.arrangement,
        under: s.inspector.expanded && x >= r.left - g && x <= r.right + g && y >= r.top - g && y <= r.bottom + g }; }`;
    const search = [];
    for (const id of ids) {
      search.push(await P0.ev(`(async () => { const m = RADIAL_MAP; m.select(null); m.fit('explicit'); await new Promise((r) => requestAnimationFrame(r));
        document.querySelector('.radial-drawer-trigger').click(); const i = document.querySelector('.radial-drawer-q'); i.value = ${J(id)}; i.dispatchEvent(new Event('input'));
        const b = Array.from(document.querySelectorAll('.radial-drawer-r')).find((x) => x.textContent.indexOf(${J(id)}) >= 0);
        if (!b) { document.querySelector('.radial-drawer-trigger').click(); return { id: ${J(id)}, missing: true }; }
        b.click(); await new Promise((r) => setTimeout(r, 120)); return (${near})(${J(id)}); })()`));
    }
    const errs = P0.errors.length; await P0.close();
    const arrival = [];
    for (const id of ids) {
      const A = await open(b, base + page + '#node=' + encodeURIComponent(id), { width: size[0], height: size[1], scheme });
      await A.ev('new Promise((r) => setTimeout(r, 300))'); await A.frames(); await planted(A);
      arrival.push(Object.assign(await A.ev(`(${near})(${J(id)})`), { resolved: await A.ev('!!(RADIAL_MAP.report().arrival && RADIAL_MAP.report().arrival.resolved)'), errors: A.errors.length }));
      await A.close();
    }
    const sOk = search.filter((x) => !x.missing), aOk = arrival.filter((x) => x.resolved);
    const ok = errs === 0 && sOk.length >= n - 2 && aOk.length >= n - 2 && arrival.every((x) => x.errors === 0) &&
      sOk.every((x) => x.sel === x.id && x.open && x.chrome === 'compact' && !x.under) && aOk.every((x) => x.sel === x.id && x.open && !x.under);
    return { ok, planted: true, d: { search: search.filter((x) => x.missing || x.under || !x.open).concat(sOk.length ? [] : ['none']), arrival: arrival.filter((x) => x.under || !x.open || !x.resolved),
      searched: sOk.length, arrived: aOk.length } };
  },
  /* on the fixture's touch page */
  async u27(P) {
    await P.size(390, 844); await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames();
    const n0 = await P.ev(`(() => { if (FX.inst.D) FX.inst.D.destroy(); FX.mode('one'); const m = FX.mount('D', 'specimen'); m.select('VM-HG-243');
      m.service('inspector').openRecord('OFFICE-N', 'VM-HG-243'); m.service('facets').set('status', [m.model.byId.get('VM-HG-243').state]);
      return m.state().membership.visibleItems; })()`);
    return KEYED.walk(P, 'FX.inst.D', '#D ', { leaf: 'VM-HG-243', rec: 'OFFICE-N', items: n0 });
  },
  /* on a public expression's touch page */
  async u29(P, scheme) {
    const want = await P.ev('C.exprSetup()');
    if (!want) return { ok: false, d: 'no filter value keeps a drawn leaf, or no record' };
    return KEYED.walk(P, 'RADIAL_MAP', '', want, scheme);
  },
  /* a public expression on a desktop window where the panels around the map fold: hover, a selection,
     a record, a reference followed and a node selected under the open sheet, closing, Fit, a reading
     state carried to a roomy window and back, then a manual camera through the transitions */
  async u31(P, scheme, size, roomy) {
    const settle = async () => { await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 300))'); await P.frames(); };
    const S = (tag) => P.ev(`(() => { const m = RADIAL_MAP, s = m.state(), v = m.view(), html = document.documentElement, q = (x) => document.querySelector(x);
      const meets = (a, c) => !!a && !!c && a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom;
      const sr = q('[data-radial-slot="stage"]').getBoundingClientRect(), r = q('[data-radial-slot="inspector"]').getBoundingClientRect();
      const drawing = q('[data-radial] .radial-world').getBoundingClientRect();   /* the drawn marks, as the engine measures them */
      const sel = s.selection.locked, p = sel ? m.project(sel) : null, open = s.inspector.expanded && s.inspector.arrangement === 'compact';
      /* the selected node under the open panel, sheet or corner panel */
      const row = q('.radial-chrome-triggers');
      return { tag: ${J(tag)}, exp: s.inspector.expanded, arr: s.inspector.arrangement, chrome: s.chrome.arrangement, view: s.inspector.view, target: s.inspector.target, sel,
        k: v.k, x: v.x, y: v.y, atFit: v.atFit, clear: m.report().fit.clear, covered: (m.report().covered || []).indexOf('inspector') >= 0,
        over: open && meets(r, drawing), under: !!p && s.inspector.expanded && sr.left + p.x >= r.left && sr.left + p.x <= r.right && sr.top + p.y >= r.top && sr.top + p.y <= r.bottom,
        preview: s.selection.preview, sheetH: Math.round(r.height),
        controls: open && (meets(r, q('[data-radial-slot="hud"]').getBoundingClientRect()) || (!!row && !row.hidden && meets(r, row.getBoundingClientRect()))),
        filter: s.facets.active.length, items: s.membership.visibleItems, focus: document.activeElement.className, inHost: !!q('[data-radial]').contains(document.activeElement),
        theme: html.getAttribute('data-theme') || getComputedStyle(html).colorScheme }; })()`);
    const ev = (x) => P.ev(x);
    const same = (a, b) => Math.abs(a.k - b.k) < 1e-9 && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
    const fails = [];
    const must = (cond, what, x) => { if (!cond) fails.push([what, x && x.tag, x && x.exp !== undefined ? { sel: x.sel, view: x.view, exp: x.exp, atFit: x.atFit, under: x.under, filter: x.filter, focus: x.focus, inHost: x.inHost } : undefined]); };
    const truthful = (x) => x.covered === x.over || (x.covered && !x.over);   /* an open sheet over the drawing is reported */
    await P.size(size[0], size[1]); await settle();
    const o0 = await S('overview');
    must(!o0.exp && o0.arr === 'compact' && o0.chrome === 'compact' && o0.atFit && o0.clear && !o0.covered && o0.theme === scheme, 'overview folded at the Fit', o0);
    /* hover is not a request to open: a leaf the pointer alone hits, clear of the panels, is previewed */
    const leaf0 = await ev(`(() => { const m = RADIAL_MAP, sr = document.querySelector('[data-radial-slot="stage"]').getBoundingClientRect();
      const n = m.layout.nodes.filter((x) => x.kind === 'leaf').find((x) => { const p = m.project(x.id), h = m.hits(p.x, p.y, 0).inside;
        return p.x > 60 && p.x < sr.width - 60 && p.y > 160 && p.y < sr.height - 160 && h.length === 1 && h[0] === x.id; });
      if (!n) return null; const p = m.project(n.id); return { id: n.id, x: sr.left + p.x, y: sr.top + p.y }; })()`);
    must(!!leaf0, 'a leaf the pointer alone hits');
    let h = o0;
    if (leaf0) { await P.move(leaf0.x, leaf0.y); h = await S('hover');
      must(h.preview === leaf0.id && h.view === 'item' && h.target === leaf0.id && !h.exp && !h.sel, 'hover previews the leaf and leaves the panel folded', h); await P.move(5, 5); }
    /* a selection over the whole map: the sheet opens over the drawing, and the report says so, while the
       last Fit's own record stays as it was; closing returns to that Fit */
    /* the leaf lowest on the screen, so that the sheet opens over the top of the drawing without a pan */
    await ev(`(() => { const m = RADIAL_MAP; const leaves = m.layout.nodes.filter((x) => x.kind === 'leaf'); leaves.sort((p, q) => m.project(q.id).y - m.project(p.id).y); m.select(leaves[0].id); return leaves[0].id; })()`);
    await settle(); const sa = await S('whole map selection');
    must(sa.exp && sa.over && sa.covered && !sa.under && !sa.controls && !sa.atFit && Math.abs(sa.k - o0.k) < 1e-9, 'over the whole map the open sheet is reported as covering it, the node beside it, no shrink', sa);
    /* a node under the open sheet, selected: brought beside it */
    const hid = await ev(`(() => { const m = RADIAL_MAP, r = document.querySelector('[data-radial-slot="inspector"]').getBoundingClientRect(), sr = document.querySelector('[data-radial-slot="stage"]').getBoundingClientRect();
      const drawn = (id) => { const g = document.querySelector('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
      const n = m.layout.nodes.find((x) => x.kind === 'leaf' && drawn(x.id) && (() => { const p = m.project(x.id); return sr.left + p.x > r.left + 4 && sr.left + p.x < r.right - 4 && sr.top + p.y > r.top + 4 && sr.top + p.y < r.bottom - 4; })());
      if (!n) return null; m.select(n.id); return n.id; })()`);
    await settle(); const s4 = await S('select under the sheet');
    must(!!hid && s4.sel === hid && s4.exp && !s4.under, 'a node selected under the open sheet is brought beside it', s4);
    await ev(`document.querySelector('.radial-insp-toggle').click()`); await settle(); const sb = await S('closed');
    must(!sb.exp && sb.atFit && same(sb, o0) && !sb.covered, 'closed: back at the same Fit, nothing covering', sb);
    await ev(`RADIAL_MAP.select(null)`); await settle();
    /* a filter, a leaf selected under it, and the record with the most to show that offers a reference to
       a drawn node, opened from it: the sheet opens as a bounded overlay */
    const want = await ev('C.readingSetup()'); await settle();
    must(!!want, 'a filter value keeps a drawn leaf and a record that offers a reference to a drawn node');
    if (!want) return { ok: false, d: { fails } };
    const pick = want;
    const s1 = await S('record open');
    must(s1.exp && s1.view === 'record' && s1.sel === want.leaf && !s1.atFit && !s1.under && !s1.controls && truthful(s1), 'the record opens the sheet, the leaf beside it, the controls clear, the coverage reported', s1);
    /* an explicit Fit dismisses a covering sheet and keeps the record, the selection and the filter */
    await ev(`RADIAL_MAP.fit('explicit')`); await settle(); const s2 = await S('fit');
    must(s2.atFit && s2.clear && s2.view === 'record' && s2.sel === want.leaf && s2.filter === 1 && (s2.exp ? !s2.over : true), 'Fit: overview, record, selection and filter kept', s2);
    /* opened with its toggle from the Fit: no refit, no shrink */
    if (!s2.exp) { await ev(`document.querySelector('.radial-insp-toggle').click()`); await settle(); }
    const s3 = await S('toggle open');
    must(s3.exp && !s3.atFit && Math.abs(s3.k - s2.k) < 1e-9 && !s3.under && !s3.controls && truthful(s3), 'opened from the Fit: the drawing keeps its scale, the leaf beside the sheet', s3);
    /* the record again, then a reference to a drawn placed node followed while the sheet is open */
    await ev(`RADIAL_MAP.service('inspector').openRecord(${J(want.rec)}, RADIAL_MAP.state().selection.locked)`); await settle();
    const s5 = await S('record again'); must(s5.view === 'record' && s5.exp && !s5.under, 'the record reopened, its node beside the sheet', s5);
    const ref = await ev(`(() => { const m = RADIAL_MAP; const drawn = (id) => { const g = document.querySelector('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
      const b = Array.from(document.querySelectorAll('.radial-insp-body .radial-insp-ref')).find((x) => { const id = x.getAttribute('data-radial-ref'); return id !== m.state().selection.locked && m.model.kindOf(id) !== 'record' && drawn(id); });
      if (!b) return null; const id = b.getAttribute('data-radial-ref'); b.click(); return id; })()`);
    await settle(); const s6 = await S('reference followed');
    must(!!ref && s6.sel === ref && s6.view !== 'record' && s6.exp && !s6.under && s6.filter === 1, 'a reference followed in the open sheet lands beside it, the filter kept', s6);
    /* the reader's Escape with focus inside: it clears the selection and folds the sheet; the view it
       showed is replaced first, which keeps focus on the panel, shown as its pill (the hand-off to the
       disclosure when a body hides with focus in it is U33's); the filter stays, and so does the camera
       the reference moved */
    const inside = await ev(`(() => { const x = document.querySelector('.radial-insp-body button'); if (x) x.focus(); return !!x && document.activeElement === x; })()`);
    must(inside, 'focus inside the open sheet', s6);
    await P.key('Escape'); await settle(); const s7 = await S('escape');
    must(s7.sel === null && s7.view === 'idle' && !s7.exp && /radial-insp-toggle|radial-inspector/.test(s7.focus) && s7.inHost && !s7.atFit && s7.filter === 1, 'Escape clears the selection and folds the sheet, focus kept on the panel, the filter and the camera kept', s7);
    await ev(`RADIAL_MAP.fit('explicit')`); await settle(); const s8 = await S('fit again');
    must(s8.atFit && s8.clear && s8.filter === 1, 'Fit restores the overview, the filter kept', s8);
    /* the sheet grows over its node: a node's own short view leaves it beside the sheet, then the tallest
       record grows the sheet past the node, and the node is brought beside it */
    const g = await ev(`C.growNode(${pick.bottom})`); await settle();
    must(!!g, 'a node a short view leaves beside the sheet and the tallest record would cover', { tag: J(pick) });
    let sg = null;
    if (g) { const s0 = await S('short view');
      await ev(`RADIAL_MAP.service('inspector').openRecord(${J(pick.rec)}, ${J(g.node)})`); await settle(); sg = await S('record grows');
      must(s0.exp && s0.sel === g.node && sg.view === 'record' && sg.exp && sg.sheetH > s0.sheetH + 40 && !sg.under && sg.sel === g.node, 'the record grows the sheet past its node, which is brought beside it', sg);
      await ev(`document.querySelector('.radial-insp-toggle').click()`); await settle(); await ev(`(RADIAL_MAP.select(null), RADIAL_MAP.fit('explicit'), true)`); await settle(); }
    /* a reading state at the Fit of a roomy window, carried to the cramped one and back: from the Fit the
       view leaves it with the node beside the sheet; once off the Fit, a resize keeps the camera */
    await P.size(roomy, size[1]); await settle(); await ev(`RADIAL_MAP.fit('explicit')`); await settle();
    await ev(`(() => { const m = RADIAL_MAP; m.select(${J(want.leaf)}); m.service('inspector').openRecord(${J(want.rec)}, ${J(want.leaf)}); return true; })()`); await settle();
    const s9 = await S('roomy reading');
    must(s9.arr === 'wide' && s9.exp && s9.view === 'record' && s9.atFit, 'roomy: the record in the open corner panel, at the Fit', s9);
    await P.size(size[0], size[1]); await settle(); const s10 = await S('cramped');
    must(s10.k >= s8.k * 0.995, 'cramped: the sheet takes the Fit of the new arrangement before it leaves it, at least the overview the pill leaves', s10);
    must(s10.arr === 'compact' && s10.exp && s10.view === 'record' && s10.sel === want.leaf && s10.filter === 1 && !s10.atFit && !s10.under && !s10.controls && truthful(s10), 'cramped: the record still open, as the sheet, the node beside it', s10);
    await P.size(roomy, size[1]); await settle(); const s11 = await S('roomy again');
    must(s11.arr === 'wide' && s11.exp && s11.view === 'record' && s11.sel === want.leaf && s11.filter === 1 && s11.atFit && same(s11, s9) && !s11.under,
      'roomy again: the panel open with the record, back at the Fit the sheet left', s11);
    await P.size(size[0], size[1]); await settle(); const s11b = await S('cramped again');
    must(s11b.k >= s8.k * 0.995, 'cramped: the sheet takes the Fit of the new arrangement before it leaves it, at least the overview the pill leaves', s11b);
    must(s11b.arr === 'compact' && s11b.exp && s11b.view === 'record' && s11b.sel === want.leaf && s11b.filter === 1 && !s11b.atFit && !s11b.under, 'cramped again: the sheet open from the Fit, the node beside it', s11b);
    /* the reader moves the camera: then a resize keeps it, both ways */
    await ev(`RADIAL_MAP.zoom(1.25)`); await settle(); const m0 = await S('moved');
    await P.size(roomy, size[1]); await settle(); const m1 = await S('roomy, moved');
    must(m1.arr === 'wide' && m1.exp && m1.view === 'record' && m1.sel === want.leaf && m1.filter === 1 && same(m1, m0), 'roomy: a camera the reader moved is kept', m1);
    await P.size(size[0], size[1]); await settle(); const m2 = await S('cramped, moved');
    must(m2.arr === 'compact' && m2.exp && m2.view === 'record' && m2.sel === want.leaf && m2.filter === 1 && same(m2, m1), 'cramped: a camera the reader moved is kept', m2);
    await ev(`document.querySelector('.radial-insp-toggle').click()`); await settle();
    await ev(`RADIAL_MAP.fit('explicit')`); await settle(); const s12 = await S('overview again');
    must(!s12.exp && s12.atFit && s12.clear, 'closed and fitted: the overview again', s12);
    /* stability: nothing more happens once the observers settle */
    const hush = () => ev(`(async () => { const m = RADIAL_MAP; let n = 0; ['arrangement', 'fit', 'obstacle'].forEach((t) => m.on(t, () => n++)); await new Promise((r) => setTimeout(r, 600)); return n; })()`);
    const quiet = await hush();
    must(quiet === 0, 'no event after the observers settle', { tag: 'quiet ' + quiet });
    /* a manual camera through the transitions: kept at every size, and quiet at the narrow one and at the end */
    await ev(`RADIAL_MAP.zoom(1.6)`); await settle(); const c0 = await S('zoomed');
    const cams = [], WS = [767, size[0], roomy, size[0]];
    for (const [i, w] of WS.entries()) { await P.size(w, size[1]); await settle(); cams.push(await S('camera at ' + w));
      if (w === 767 || i === WS.length - 1) { const n = await hush(); must(n === 0, 'no event after the observers settle', { tag: 'quiet at ' + w + ': ' + n }); } }
    cams.forEach((c) => must(!c.atFit && same(c, c0), 'the manual camera kept through the resize', c));
    return { ok: !fails.length, d: { fails, want, pick, grow: g, rows: [o0, h, sa, s4, sb, s1, s2, s3, s5, s6, s7, s8].concat(sg ? [sg] : []).concat([s9, s10, s11, s11b, m0, m1, m2, s12]).map((x) => [x.tag, x.arr, x.exp ? 'open' : 'folded', +x.k.toFixed(4), x.atFit, x.under, x.covered, x.over]) } };
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
  }  ,
  /* a phone turned with the reading sheet open: 390x844 to 844x390 and back, and the other way, the canvas compact
     throughout. The sheet is opened four ways: from the Fit, by a selection under a filter with an evidence record
     followed from the sheet; by a #node= arrival; by a search result; by a reference followed from the sheet. After
     each turn the selection, record and filter are kept, the sheet stays open and the selected node lies on the
     canvas and clear of the sheet by the reveal margin; a view made from the Fit is the new size's Fit, never smaller;
     closing the sheet after a turn leaves the node on the canvas (from the Fit, at the Fit), and Fit restores the
     overview. A record with no placed origin keeps its open view through the turn, at the new size's Fit. Once the
     observers settle, nothing more happens */
  async u36(b, base, page, scheme, plant) {
    const out = { rows: [], fails: [] };
    const S = `(() => { const m = RADIAL_MAP, s = m.state(), v = m.view(), sel = s.selection.locked, p = sel ? m.project(sel) : null;
      const sr = document.querySelector('[data-radial-slot="stage"]').getBoundingClientRect(), r = document.querySelector('[data-radial-slot="inspector"]').getBoundingClientRect();
      const open = s.inspector.expanded && s.inspector.arrangement === 'compact', g = 12, x = p ? sr.left + p.x : 0, y = p ? sr.top + p.y : 0;
      const f = m.report().fit;
      return { k: v.k, x: v.x, y: v.y, atFit: v.atFit, manual: v.manual, clear: f.clear, fitSeq: f.seq, fitCause: f.cause, fitScale: f.scale, sel, view: s.inspector.view, target: s.inspector.target, open,
        chrome: s.chrome.arrangement, filter: s.facets.active.length, size: Math.round(sr.width) + 'x' + Math.round(sr.height),
        onCanvas: !!p && p.x >= 0 && p.y >= 0 && p.x <= sr.width && p.y <= sr.height,
        under: !!p && open && x >= r.left - g && x <= r.right + g && y >= r.top - g && y <= r.bottom + g,
        active: document.activeElement === document.body ? 'body' : (document.activeElement.getAttribute('data-radial-slot') || document.activeElement.className) }; })()`;
    const click = async (E, sel) => { const c = await E.ev(`(() => { const e = ${sel}; if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!c) return false; for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await E.call('Input.dispatchMouseEvent', { type, x: c.x, y: c.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
      await E.frames(); return true; };
    const settle = async (E) => { await E.frames(); await E.ev('new Promise((r) => setTimeout(r, 300))'); await E.frames(); };
    const turn = async (E, w, h) => { await E.size(w, h); await settle(E); };
    const go = async (url, w, h) => { const E = await open(b, url, { width: w, height: h, touch: true, scheme });
      if (plant) { const pl = await E.ev(`C.plant(${J(plant.file)}, ${J(plant.from)}, ${J(plant.to)})`); if (!pl.planted) { await E.close(); return null; } await E.ev('C.remount()'); await settle(E); }
      return E; };
    const fail = (label, what, s) => out.fails.push([label + ': ' + what, s && { size: s.size, k: +(s.k || 0).toFixed(4), atFit: s.atFit, sel: s.sel, view: s.view, open: s.open, onCanvas: s.onCanvas, under: s.under, filter: s.filter }]);
    /* the leaves the cases use: the first drawn leaf under the filter with an evidence record to follow, and the first with a placed reference */
    const P0 = await go(base + page, 390, 844); if (!P0) return { ok: true, planted: false, d: 'not planted' };
    const pick = await P0.ev(`(() => { const m = RADIAL_MAP, f = m.service('facets'), items = m.state().facets.options.filter((x) => x.family === 'items');
      const o = items[0].options.filter((x) => !x.locked && x.count > 0).sort((a, c) => c.count - a.count)[0]; f.set(items[0].id, [o.value]);
      const drawn = (id) => { const g = document.querySelector('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
      const refs = () => Array.from(document.querySelectorAll('[data-radial-slot="inspector"] [data-radial-ref]')).map((x) => x.getAttribute('data-radial-ref'));
      let rec = null, ref = null;
      for (const n of m.layout.nodes.filter((x) => x.kind === 'leaf' && drawn(x.id))) { m.select(n.id);
        if (!rec) { const r = refs().find((x) => !m.project(x)); if (r) rec = { leaf: n.id, record: r }; }
        if (!ref) { const r = refs().find((x) => m.project(x) && x !== n.id); if (r) ref = { leaf: n.id, to: r }; }
        if (rec && ref) break; }
      m.select(null); f.reset('module', true);
      const recs = Array.from(m.model.byId.keys()).filter((id) => m.model.kindOf(id) === 'record');
      return { facet: items[0].id, value: o.value, rec, ref, record: recs[0] || null }; })()`);
    await P0.close();
    if (!pick.rec || !pick.ref) return { ok: false, planted: true, d: { pick, fails: [['no leaf with an evidence record and a placed reference', null]] } };
    for (const [w0, h0, w1, h1] of [[390, 844, 844, 390], [844, 390, 390, 844]]) {
      const tag = `${w0}x${h0}`;
      /* from the Fit, with a filter and an evidence record */
      { const E = await go(base + page, w0, h0), L = 'Fit-origin record, ' + tag;
        await E.ev(`(() => { const m = RADIAL_MAP; m.fit('explicit'); m.service('facets').set(${J(pick.facet)}, [${J(pick.value)}]); m.select(${J(pick.rec.leaf)}); return true; })()`); await settle(E);
        await click(E, `Array.from(document.querySelectorAll('[data-radial-slot="inspector"] [data-radial-ref]')).find((x) => x.getAttribute('data-radial-ref') === ${J(pick.rec.record)})`); await settle(E);
        const s0 = await E.ev(S); await turn(E, w1, h1); const s1 = await E.ev(S); await turn(E, w0, h0); const s2 = await E.ev(S); await turn(E, w1, h1); const s3 = await E.ev(S);
        await click(E, `document.querySelector('.radial-insp-toggle')`); await settle(E); const s4 = await E.ev(S);
        await click(E, `document.querySelector('[data-radial-control="fit"]')`); await settle(E); const s5 = await E.ev(S);
        out.rows.push([L, [s0, s1, s2, s3, s4, s5].map((s) => [s.size, +s.k.toFixed(4), s.atFit, s.view, s.onCanvas, s.under])]);
        const kept = (s) => s.sel === pick.rec.leaf && s.view === 'record' && s.target === pick.rec.record && s.filter === 1;
        if (!(s0.open && kept(s0) && !s0.under)) fail(L, 'the record opens over the filtered Fit, its leaf beside the sheet', s0);
        for (const [s, t] of [[s1, 'turned'], [s2, 'turned back'], [s3, 'turned again']])
          if (!(kept(s) && s.open && s.onCanvas && !s.under && !s.manual && !s.atFit)) fail(L, t + ': the record, selection and filter kept, the sheet open, the leaf on the canvas and clear of it', s);
        if (!(s4.atFit && s4.clear && kept(s4) && !s4.open && s4.onCanvas)) fail(L, 'closed after the turn: at the new size\'s Fit, the leaf on the canvas', s4);
        const fresh = (s, prev) => s.fitSeq > prev.fitSeq && s.fitCause === 'resize' && Math.abs(s.k - s.fitScale) < 1e-9;
        if (!(fresh(s1, s0) && fresh(s2, s1) && fresh(s3, s2))) fail(L, 'each turned view is a Fit made for the new size after the turn (its zoom the Fit\'s)', { ...s3, size: [s0, s1, s2, s3].map((x) => x.fitSeq + '/' + x.fitCause + '/' + (+x.fitScale).toFixed(4) + '/' + x.k.toFixed(4)).join(' ') });
        if (!(s3.k >= s4.k * 0.995)) fail(L, 'the turned view is never smaller than the new size\'s Fit', { ...s3, size: s3.size + ' vs Fit ' + s4.k.toFixed(4) });
        if (!(s5.atFit && s5.clear && kept(s5))) fail(L, 'Fit restores the overview with the record, selection and filter kept', s5);
        if (E.errors.length) fail(L, 'no uncaught error', { size: E.errors.slice(0, 2).join(' | ') });
        await E.close(); }
      /* a #node= arrival */
      { const E = await go(base + page + '#node=' + encodeURIComponent(pick.ref.leaf), w0, h0), L = 'link arrival, ' + tag;
        await settle(E); const s0 = await E.ev(S); await turn(E, w1, h1); const s1 = await E.ev(S); await turn(E, w0, h0); const s2 = await E.ev(S); await turn(E, w1, h1); const s3 = await E.ev(S);
        await click(E, `document.querySelector('.radial-insp-toggle')`); await settle(E); const s4 = await E.ev(S);
        await click(E, `document.querySelector('[data-radial-control="fit"]')`); await settle(E); const s5 = await E.ev(S);
        out.rows.push([L, [s0, s1, s2, s3, s4, s5].map((s) => [s.size, +s.k.toFixed(4), s.atFit, s.view, s.onCanvas, s.under])]);
        const kept = (s) => s.sel === pick.ref.leaf && s.view === 'item';
        if (!(kept(s0) && s0.open && s0.onCanvas && !s0.under)) fail(L, 'the arrival opens the sheet with its node beside it', s0);
        for (const [s, t] of [[s1, 'turned'], [s2, 'turned back'], [s3, 'turned again']])
          if (!(kept(s) && s.open && s.onCanvas && !s.under && !s.manual && Math.abs(s.k - s0.k) < 1e-9)) fail(L, t + ': the selection kept at the arrival\'s zoom, the sheet open, the node on the canvas and clear of it', s);
        if (!(kept(s4) && !s4.open && s4.onCanvas)) fail(L, 'closed after the turn: the node stays on the canvas', s4);
        if (!(s5.atFit && s5.clear && s5.sel === pick.ref.leaf)) fail(L, 'Fit restores the overview with the selection kept', s5);
        if (E.errors.length) fail(L, 'no uncaught error', { size: E.errors.slice(0, 2).join(' | ') });
        await E.close(); }
      /* a search result, and a reference followed from the sheet */
      for (const how of ['search result', 'followed reference']) {
        const E = await go(base + page, w0, h0), L = how + ', ' + tag; let want;
        if (how === 'search result') {
          want = pick.rec.leaf;
          await E.ev(`(() => { document.querySelector('.radial-drawer-trigger').click(); const i = document.querySelector('.radial-drawer-q'); i.value = ${J(want)}; i.dispatchEvent(new Event('input'));
            const b = Array.from(document.querySelectorAll('.radial-drawer-r')).find((x) => x.textContent.indexOf(${J(want)}) >= 0); if (b) b.click(); return !!b; })()`);
        } else {
          want = pick.ref.to;
          await E.ev(`(RADIAL_MAP.select(${J(pick.ref.leaf)}), true)`); await settle(E);
          await click(E, `Array.from(document.querySelectorAll('[data-radial-slot="inspector"] [data-radial-ref]')).find((x) => x.getAttribute('data-radial-ref') === ${J(want)})`);
        }
        await settle(E); const s0 = await E.ev(S); await turn(E, w1, h1); const s1 = await E.ev(S); await turn(E, w0, h0); const s2 = await E.ev(S);
        out.rows.push([L, [s0, s1, s2].map((s) => [s.size, +s.k.toFixed(4), s.atFit, s.view, s.onCanvas, s.under])]);
        if (!(s0.sel === want && s0.open && s0.onCanvas && !s0.under)) fail(L, 'the ' + how + ' opens the sheet with its node beside it', s0);
        for (const [s, t] of [[s1, 'turned'], [s2, 'turned back']])
          if (!(s.sel === want && s.open && s.onCanvas && !s.under && !s.manual && Math.abs(s.k - s0.k) < 1e-9)) fail(L, t + ': the selection kept at its zoom, the sheet open, the node on the canvas and clear of it', s);
        if (E.errors.length) fail(L, 'no uncaught error', { size: E.errors.slice(0, 2).join(' | ') });
        await E.close();
      }
    }
    /* an evidence record with no placed origin, opened by its arrival: its view and the focus stay through the turn, over a
       Fit made for the new size; no node is invented. There must be one to test */
    if (!pick.record) fail('record arrival', 'the composition declares an evidence record to arrive at', null);
    else for (const [w0, h0, w1, h1] of [[390, 844, 844, 390], [844, 390, 390, 844]]) {
      const E = await go(base + page + '#node=' + encodeURIComponent(pick.record), w0, h0), L = 'record arrival, ' + w0 + 'x' + h0;
      await settle(E); await E.ev(`(document.querySelector('[data-radial-slot="inspector"]').focus({ preventScroll: true }), true)`);
      const s0 = await E.ev(S); await turn(E, w1, h1); const s1 = await E.ev(S);
      await click(E, `document.querySelector('[data-radial-control="fit"]')`); await settle(E); const f1 = await E.ev(S);
      out.rows.push([L, [s0, s1, f1].map((s) => [s.size, +s.k.toFixed(4), s.atFit, s.view, s.target, s.active, s.fitSeq + '/' + s.fitCause])]);
      if (!(s0.view === 'record' && s0.target === pick.record && s0.open && s0.sel === null)) fail(L, 'the record arrival opens its view in the sheet, with nothing selected', s0);
      if (!(s1.view === 'record' && s1.target === pick.record && s1.open && s1.sel === null && s1.active === s0.active && !s1.manual))
        fail(L, 'turned: the record, the open sheet and the focus kept, nothing selected', { ...s1, size: s1.size + ' focus ' + s0.active + '>>' + s1.active });
      if (!(s1.fitSeq > s0.fitSeq && s1.fitCause === 'resize' && Math.abs(s1.k - s1.fitScale) < 1e-9 && s1.k >= f1.k * 0.995))
        fail(L, 'turned: the drawing is a Fit made for the new size, never smaller than its Fit', { ...s1, size: s1.size + ' ' + s0.fitSeq + '>>' + s1.fitSeq + ' ' + s1.fitCause + ' vs Fit ' + f1.k.toFixed(4) });
      if (E.errors.length) fail(L, 'no uncaught error', { size: E.errors.slice(0, 2).join(' | ') });
      await E.close();
    }
    /* nothing more happens once the observers settle after a turn */
    { const E = await go(base + page + '#node=' + encodeURIComponent(pick.ref.leaf), 390, 844), L = 'settled after a turn';
      await settle(E); await E.ev(`(() => { window.__q = []; ['fit', 'placed', 'arrangement', 'obstacle'].forEach((t) => RADIAL_MAP.on(t, () => window.__q.push(t))); return true; })()`);
      await turn(E, 844, 390); const n0 = await E.ev('window.__q.length');
      await E.ev('new Promise((r) => setTimeout(r, 800))'); const q = await E.ev('window.__q.slice()');
      out.rows.push([L, { during: n0, after: q.slice(n0) }]);
      if (q.length !== n0) fail(L, 'no event after the turn settles (no resize feedback loop)', { size: J(q.slice(n0)) });
      if (E.errors.length) fail(L, 'no uncaught error', { size: E.errors.slice(0, 2).join(' | ') });
      await E.close(); }
    return { ok: out.fails.length === 0, planted: true, d: { pick, rows: out.rows, fails: out.fails } };
  },
  /* the reader's own camera is never made again: a real touch pan and a real pinch with the sheet open, then a turn and
     the turn back keep k, x and y; a change of height alone on the touch screen holds the center (y moves by half the
     change); on a desktop page a real wheel zoom, the HUD's zoom control, and keyboard moves that pan away from a
     node an arrival centered, then a resize, keep k, x and y */
  async u37(b, base, page, scheme, plant) {
    const fails = [], rows = [];
    const V = `(() => { const v = RADIAL_MAP.view(); return { k: v.k, x: v.x, y: v.y, atFit: v.atFit, manual: v.manual, sel: RADIAL_MAP.state().selection.locked }; })()`;
    const settle = async (E) => { await E.frames(); await E.ev('new Promise((r) => setTimeout(r, 300))'); await E.frames(); };
    const same = (a, c) => Math.abs(a.k - c.k) < 1e-9 && Math.abs(a.x - c.x) < 1e-6 && Math.abs(a.y - c.y) < 1e-6;
    const go = async (w, h, touch, hash = '') => { const E = await open(b, base + page + hash, { width: w, height: h, touch, scheme });
      if (plant) { const pl = await E.ev(`C.plant(${J(plant.file)}, ${J(plant.from)}, ${J(plant.to)})`); if (!pl.planted) { await E.close(); return null; } await E.ev('C.remount()'); await settle(E); }
      return E; };
    const leaf = async (E) => E.ev(`(() => { const drawn = (id) => { const g = document.querySelector('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
      const n = RADIAL_MAP.layout.nodes.find((x) => x.kind === 'leaf' && drawn(x.id)); RADIAL_MAP.select(n.id); return n.id; })()`);
    const touch = (E, type, pts) => E.call('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i + 1 })) });
    for (const how of ['pan', 'pinch']) {
      const E = await go(390, 844, true); if (!E) return { ok: true, planted: false, d: 'not planted' };
      await leaf(E); await settle(E);
      const box = await E.ev(`(() => { const r = document.querySelector('[data-radial-slot="stage"]').getBoundingClientRect(), s = document.querySelector('[data-radial-slot="inspector"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: Math.round((s.bottom + r.bottom) / 2) }; })()`);
      if (how === 'pan') { await touch(E, 'touchStart', [[box.x, box.y]]); for (let i = 1; i <= 8; i++) await touch(E, 'touchMove', [[box.x + 5 * i, box.y - 7 * i]]); await touch(E, 'touchEnd', []); }
      else { await touch(E, 'touchStart', [[box.x - 30, box.y], [box.x + 30, box.y]]); for (let i = 1; i <= 8; i++) await touch(E, 'touchMove', [[box.x - 30 - 6 * i, box.y], [box.x + 30 + 6 * i, box.y]]); await touch(E, 'touchEnd', []); }
      await settle(E);
      const v0 = await E.ev(V); await E.size(844, 390); await settle(E); const v1 = await E.ev(V); await E.size(390, 844); await settle(E); const v2 = await E.ev(V);
      await E.size(390, 764); await settle(E); const v3 = await E.ev(V);
      rows.push([how, [v0, v1, v2, v3].map((v) => [+v.k.toFixed(4), Math.round(v.x), Math.round(v.y), v.manual])]);
      if (v0.atFit) fail('the real ' + how + ' moves the camera off the Fit', v0);
      if (!(same(v1, v0) && same(v2, v0) && v1.sel === v0.sel)) fail('a turn and the turn back keep the ' + (how === 'pan' ? 'panned' : 'pinched') + ' camera (k, x, y)', [v0, v1, v2]);
      if (!(Math.abs(v3.k - v2.k) < 1e-9 && Math.abs(v3.x - v2.x) < 1e-6 && Math.abs(v3.y - (v2.y - 40)) < 0.51)) fail('a change of height alone (-80px) holds the center: y moves by -40, k and x kept', [v2, v3]);
      if (E.errors.length) fail('no uncaught error', E.errors.slice(0, 2));
      await E.close();
    }
    for (const how of ['wheel', 'zoom control']) {
      const E = await go(1440, 900, false); if (!E) return { ok: true, planted: false, d: 'not planted' };
      await leaf(E); await settle(E);
      if (how === 'wheel') { await E.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 600, y: 450, button: 'none' }); await E.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 600, y: 450, deltaX: 0, deltaY: -240 }); }
      else { const c = await E.ev(`(() => { const r = document.querySelector('[data-radial-control="zoom-in"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await E.call('Input.dispatchMouseEvent', { type, x: c.x, y: c.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); }
      await settle(E);
      const v0 = await E.ev(V); await E.size(1280, 900); await settle(E); const v1 = await E.ev(V);
      rows.push([how, [v0, v1].map((v) => [+v.k.toFixed(4), Math.round(v.x), Math.round(v.y), v.manual])]);
      if (!(!v0.atFit && same(v1, v0))) fail('the ' + how + ' moves the camera, and a resize keeps it (k, x, y)', [v0, v1]);
      if (E.errors.length) fail('no uncaught error', E.errors.slice(0, 2));
      await E.close();
    }
    /* keyboard moves away from a node an arrival centered: the camera they pan is the reader's */
    { const id = await (async () => { const E0 = await open(b, base + page, { width: 1440, height: 900, scheme });
        const x = await E0.ev(`RADIAL_MAP.layout.nodes.filter((n) => n.kind === 'leaf')[0].id`); await E0.close(); return x; })();
      const E = await go(1440, 900, false, '#node=' + encodeURIComponent(id)); if (!E) return { ok: true, planted: false, d: 'not planted' };
      await settle(E); const a = await E.ev(V);
      await E.ev(`(document.querySelector('[data-radial-slot="stage"]').focus(), true)`);
      let v0 = a;
      for (const k of ['ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowRight']) { await E.key(k); await settle(E); v0 = await E.ev(V); if (!same(v0, a)) break; }
      await E.size(1280, 900); await settle(E); const v1 = await E.ev(V);
      rows.push(['keyboard', [a, v0, v1].map((v) => [+v.k.toFixed(4), Math.round(v.x), Math.round(v.y)])]);
      if (same(v0, a)) fail('keyboard moves pan the camera away from the arrival', [a, v0]);
      else if (!(!v0.atFit && same(v1, v0))) fail('the keyboard\'s camera is the reader\'s, and a resize keeps it (k, x, y)', [v0, v1]);
      if (E.errors.length) fail('no uncaught error', E.errors.slice(0, 2));
      await E.close(); }
    function fail(what, d) { fails.push([what, d]); }
    return { ok: fails.length === 0, planted: true, d: { rows, fails } };
  },
  /* on a desktop page, views the map made, on a resize: a node an arrival centered stays in view at its zoom, and a group
     the map framed is framed again for the new size */
  async u40(b, base, page, scheme) {
    const fails = [], rows = [];
    const settle = async (E) => { await E.frames(); await E.ev('new Promise((r) => setTimeout(r, 300))'); await E.frames(); };
    const S = `(() => { const m = RADIAL_MAP, v = m.view(), f = m.report().fit, sel = m.state().selection.locked, p = sel ? m.project(sel) : null,
      sr = document.querySelector('[data-radial-slot="stage"]').getBoundingClientRect();
      return { k: v.k, atFit: v.atFit, manual: v.manual, fitSeq: f.seq, fitCause: f.cause, sel, size: Math.round(sr.width) + 'x' + Math.round(sr.height),
        onCanvas: !!p && p.x >= 0 && p.y >= 0 && p.x <= sr.width && p.y <= sr.height }; })()`;
    const E0 = await open(b, base + page, { width: 1440, height: 900, scheme });
    const pick = await E0.ev(`(() => { const m = RADIAL_MAP; return { leaf: m.layout.nodes.filter((n) => n.kind === 'leaf')[0].id,
      group: m.layout.nodes.filter((n) => n.kind !== 'leaf' && n.kind !== 'root' && n.depth === 1)[0].id }; })()`); await E0.close();
    { const E = await open(b, base + page + '#node=' + encodeURIComponent(pick.leaf), { width: 1440, height: 900, scheme }); await settle(E);
      const a = await E.ev(S); await E.size(1100, 900); await settle(E); const c = await E.ev(S);
      rows.push(['arrival', [a, c].map((x) => [x.size, +x.k.toFixed(4), x.onCanvas, x.manual])]);
      if (!(a.sel === pick.leaf && Math.abs(a.k - 1.35) < 1e-9 && c.sel === pick.leaf && c.onCanvas && Math.abs(c.k - a.k) < 1e-9 && !c.atFit))
        fail('an arrival-centered node stays on the canvas at its zoom through the resize', [a, c]);
      if (E.errors.length) fail('no uncaught error', E.errors.slice(0, 2));
      await E.close(); }
    { const E = await open(b, base + page, { width: 1440, height: 900, scheme }); await settle(E);
      await E.ev(`(RADIAL_MAP.frame(${J(pick.group)}), true)`); await settle(E);
      const a = await E.ev(S); await E.size(1100, 900); await settle(E); const c = await E.ev(S);
      rows.push(['framed group', [a, c].map((x) => [x.size, +x.k.toFixed(4), x.fitSeq + '/' + x.fitCause])]);
      if (!(a.fitCause === 'frame' && !a.atFit && c.fitCause === 'frame' && c.fitSeq > a.fitSeq && !c.atFit))
        fail('a framed group is framed again for the new size', [a, c]);
      if (E.errors.length) fail('no uncaught error', E.errors.slice(0, 2));
      await E.close(); }
    function fail(what, d) { fails.push([what, d]); }
    return { ok: fails.length === 0, d: { pick, rows, fails } };
  },
  /* the first leaves each arrived at by a #node= link on a fresh 390x844 touch page, and once more with the engine held
     at the network until every font face the page declares has loaded, so the map mounts with its fonts settled: once
     the layout settles, the arrived node lies on the canvas and clear of the open sheet by the reveal margin, at the
     arrival's zoom; the observers' first deliveries move nothing */
  async u38(b, base, page, scheme, n, plant) {
    const P0 = await open(b, base + page, { width: 390, height: 844, touch: true, scheme });
    const ids = await P0.ev(`RADIAL_MAP.layout.nodes.filter((x) => x.kind === 'leaf').slice(0, ${n}).map((x) => x.id)`); await P0.close();
    const near = `(() => { const m = RADIAL_MAP, s = m.state(), id = s.selection.locked, p = id ? m.project(id) : null, sr = document.querySelector('[data-radial-slot="stage"]').getBoundingClientRect(),
      r = document.querySelector('[data-radial-slot="inspector"]').getBoundingClientRect(), x = p ? sr.left + p.x : 0, y = p ? sr.top + p.y : 0, g = 12;
      return { id, k: m.view().k, y: p ? Math.round(p.y) : null, sheet: Math.round(r.bottom - sr.top), open: s.inspector.expanded, onCanvas: !!p && p.y >= 0 && p.y <= sr.height,
        under: !!p && s.inspector.expanded && x >= r.left - g && x <= r.right + g && y >= r.top - g && y <= r.bottom + g, fonts: document.fonts.status }; })()`;
    const rows = [];
    for (const id of ids) for (const settled of [false, true]) {
      const A = await open(b, base + page + '#node=' + encodeURIComponent(id), { width: 390, height: 844, touch: true, scheme, hold: settled && !plant ? 'diagrams-radial-engine.js' : null });
      if (plant) { const pl = await A.ev(`C.plant(${J(plant.file)}, ${J(plant.from)}, ${J(plant.to)})`); if (!pl.planted) { await A.close(); return { ok: true, planted: false, d: 'not planted' }; }
        await A.ev('C.remount()'); }
      await A.ev('new Promise((r) => setTimeout(r, 600))'); await A.frames();
      const s = await A.ev(near), resolved = await A.ev('!!(RADIAL_MAP.report().arrival && RADIAL_MAP.report().arrival.resolved)');
      rows.push(Object.assign(s, { want: id, settled, fontsAtMount: A.held, resolved, errors: A.errors.length }));
      await A.close();
      if (plant) break;
    }
    const ok = rows.filter((x) => x.resolved);
    const bad = ok.filter((x) => !(x.id === x.want && x.open && x.onCanvas && !x.under && Math.abs(x.k - 1.35) < 1e-9) || x.errors);
    /* the settled rows are a control only where every declared face had loaded when the map mounted */
    const unsettled = rows.filter((x) => x.settled && !(x.fontsAtMount && x.fontsAtMount.paused && x.fontsAtMount.faces > 0 && x.fontsAtMount.loaded === x.fontsAtMount.faces));
    if (unsettled.length) return { ok: false, planted: true, d: { unsettled: unsettled.map((x) => [x.want, x.fontsAtMount]) } };
    return { ok: ok.length >= rows.length - 2 && bad.length === 0, planted: true, d: { arrived: ok.length, of: rows.length, bad, sample: rows.slice(0, 2) } };
  },
  /* on a short wide desktop window where the open drawer alone folds the panels (the CFW reference at 1100x760): at the
     Fit, with nothing selected and then with a node selected, the drawer opens and the panels fold; the sheet opened
     there by its own toggle closes the drawer, the arrangement turns wide with no change of size, and the wide panel
     returns to the wide Fit the view had before the drawer opened */
  async u39(P) {
    const fails = [], rows = [];
    const S = `(() => { const m = RADIAL_MAP, s = m.state(), v = m.view(); return { k: v.k, atFit: v.atFit, sel: s.selection.locked,
      insp: s.inspector.arrangement + (s.inspector.expanded ? ' open' : ' folded'), chrome: s.chrome.arrangement, drawer: s.facets.open }; })()`;
    const settle = async () => { await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 300))'); await P.frames(); };
    for (const pick of [false, true]) {
      await P.ev(`(() => { const m = RADIAL_MAP; m.select(null); m.fit('explicit'); if (${pick}) { const drawn = (id) => { const g = document.querySelector('[data-radial-id="' + CSS.escape(id) + '"]'); return !!g && !g.classList.contains('is-out'); };
        m.select(m.layout.nodes.find((x) => x.kind === 'leaf' && drawn(x.id)).id); } return true; })()`); await settle();
      const s0 = await P.ev(S);
      await P.ev(`document.querySelector('.radial-drawer-trigger').click()`); await settle(); const s1 = await P.ev(S);
      await P.ev(`document.querySelector('.radial-insp-toggle').click()`); await settle(); const s2 = await P.ev(S);
      rows.push([pick ? 'a node selected' : 'nothing selected', [s0, s1, s2].map((x) => [+x.k.toFixed(4), x.atFit, x.insp, x.chrome, x.drawer])]);
      if (!(s0.atFit && s0.chrome === 'wide' && s1.drawer && s1.chrome === 'compact' && s1.atFit)) fail((pick ? 'selected' : 'idle') + ': the drawer opened at the Fit folds the panels', [s0, s1]);
      if (!(!s2.drawer && s2.chrome === 'wide' && s2.insp === 'wide open' && s2.atFit && Math.abs(s2.k - s0.k) <= s0.k * 0.005 && s2.sel === s0.sel))
        fail((pick ? 'selected' : 'idle') + ': the sheet\'s toggle closes the drawer, the arrangement turns wide and the wide panel returns to the wide Fit', [s0, s2]);
    }
    if (P.errors.length) fail('no uncaught error', P.errors.slice(0, 2));
    function fail(what, d) { fails.push([what, d]); }
    return { ok: fails.length === 0, d: { rows, fails } };
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
    await W('U2b an adapter\'s own kind line is kept as given, its punctuation included, and an empty one draws no line', 'kindOverride');
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
    await W('U14b wide: the panel collapsed at the Fit and opened again by a selection, which leaves the Fit to reveal the node: the reader\'s toggle then collapses it with no refit', 'wideToggle');

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

    { const r = await KEYED.u20(P); check('U20 a resize to a narrow canvas keeps a reader\'s open record, as the compact sheet: the record, the selection and the focus in the panel stay, and Escape still closes the record', r.ok, J(r.d)); }
    { const r = await KEYED.resizeFocus(P, [1200, 900], [390, 844], true); check('U21 control: a panel open only by default folds on the resize, and focus on an unrelated visible control stays there', r.ok, J(r.d)); }
    { const r = await KEYED.resizeFocus(P, [1200, 900], [390, 844], true, true); check('U21b with a record open and focus on an unrelated visible control: the resize keeps the record, open as the sheet, and the focus where it was', r.ok, J(r.d)); }
    { const r = await KEYED.u33(P); check('U33 a selection in the open wide panel with focus on a button inside it, and the drawer open: a resize to a compact canvas, where the sheet yields to the drawer, folds the panel, keeps the selection and the drawer, and hands that focus to its disclosure', r.ok, J(r.d)); }
    await W('U32 the inspector\'s wide panel placed over the legend\'s corner (a test style): the chrome\'s wide arrangement fails on it, the inspector folds with the compact one, and the two settle in one step: the chrome decides compact once, counted from before the mount, and nothing after', 'settle');
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
      check('U22 a coarse pointer: a height that makes the canvas compact keeps the open record, as the sheet, with focus in it; Escape still closes the record',
        r.ok && r.d.setup.coarse, J(r.d)); }
    await P.size(390, 844); await P.frames();
    { const a = await at(P, 'compact');
      await P.size(1280, 800); await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames();
      const w = await at(P, 'wideEdge');
      await P.size(390, 844); await P.frames(); await P.ev('new Promise((r) => setTimeout(r, 250))'); await P.frames();
      measures.u15 = { compact: a.d, wide: w.d };
      check('U15 compact: collapsed until a selection opens it; the collapsed pill declares the top edge with the right as its option and the open sheet, an overlay, reserves nothing, and wide declares the right alone, open or collapsed; exclusive with an opened chrome panel both ways; Escape collapses it',
        a.ok && w.ok, J({ wide: w.d, compact: [a.d.a.edge, a.d.b, a.d.c.edge, a.d.d.edge, a.d.e.edge] })); }
    await W('Q13 compact: the drawer, the chrome panels and the inspector sheet are exclusive', 'exclusive');
    await W('U16 compact: a selection opens the sheet with no refit, and the selected node lands beside the sheet, not under it', 'compactReveal');
    await W('U18 compact: a selection opening the sheet over an open chrome panel at the Fit closes the panel and refits nothing', 'compactClaimNoFit');
    { const r = await KEYED.u27(P); measures.u27 = r.d; check('U27 compact, with a record and a filter: collapsing, expanding and a portrait / landscape turn and back keep the record, selection and filter, with the Fit edges following the state; at the Fit, opening never refits or shrinks the drawing and keeps the leaf beside the sheet, closing returns to the same Fit, a turn refits and the turn back restores the same Fit; away from it the camera stays', r.ok, J(r.d).slice(0, 400)); }
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

    /* the two public expressions at the whole-map Fit: a touch page turned from tall portrait through
       short portrait and the short landscape sizes and back, then tablet and wide; a desktop page
       narrowed past the lower panels' and the inspector's transitions and widened again */
    console.log('# U  the public expressions at the Fit');
    const EXPR = { 'the CFW reference': '/patterns/_preview/diagram-interactive-radial.html', 'the Vellmark parks composition': '/patterns/_preview/diagram-interactive-radial.neutral.html' };
    {
      const TURN = [[390, 844], [393, 666], [390, 664], [844, 390], [812, 375], [740, 340], [667, 375], [568, 320], [393, 666], [390, 844], [820, 1180], [1280, 800]];
      const DESK = [1280, 1100, 940, 860, 820, 768, 767, 768, 820, 860, 940, 1100, 1280].map((w) => [w, 1150]);
      measures.frame = [];
      const walk = async (name, page, scheme, sizes, touch) => {
        const E = await open(b, base + page, { width: sizes[0][0], height: sizes[0][1], touch, scheme });
        const rows = [];
        for (const [i, [w, h]] of sizes.entries()) {
          if (i) { await E.size(w, h); await E.frames(); await E.ev('new Promise((r) => setTimeout(r, 250))'); await E.frames(); }
          rows.push(await E.ev(`C.frame(${J(scheme)})`));
        }
        measures.frame.push({ name, scheme, touch, rows: rows.map((r) => r.d) });
        await E.close();
        return { rows, errors: E.errors.length };
      };
      const row = (d) => [d.size, d.insp, d.edge, d.k, 'best ' + d.best, 'fold ' + d.fold, d.clear ? 'clear' : 'NOT clear', d.atFit ? 'at Fit' : 'off Fit'];
      /* each desktop size loaded fresh: the same Fit as the walk reaches there, within 0.5% */
      const fresh = async (page, scheme, walked) => { const out = [];
        for (const w of [...new Set(DESK.map((x) => x[0]))]) {
          const E = await open(b, base + page, { width: w, height: 1150, scheme });
          const r = await E.ev(`C.frame(${J(scheme)})`), ks = walked.rows.filter((x) => x.d.size === w + 'x1150').map((x) => x.d.k);
          out.push({ ok: r.ok && E.errors.length === 0 && ks.length > 0 && ks.every((k) => Math.abs(k - r.d.k) <= r.d.k * 0.005), d: r.d, walked: ks });
          await E.close();
        }
        return out; };
      for (const [name, page] of Object.entries(EXPR)) for (const scheme of ['light', 'dark']) {
        const t = await walk(name, page, scheme, TURN, true), bad = t.rows.filter((r) => !r.ok).map((r) => row(r.d));
        check(`U26 ${name}, ${scheme}, touch: tall portrait (390x844) to short portrait (393x666, 390x664), the short landscape sizes (844x390 to 568x320) and back, then tablet and wide: at each the whole-map Fit stands clear and is as large as the best single reservation of the inspector that clears (within 0.5%), and an explicit Fit gives the same view`,
          !bad.length && t.errors === 0, J(bad.length ? bad : t.rows.map((r) => [r.d.size, r.d.k])).slice(0, 500));
        { const E = await open(b, base + page, { width: 390, height: 844, touch: true, scheme });
          const r = await KEYED.u29(E, scheme); measures.state = (measures.state || []).concat([{ name, scheme, d: r.d }]);
          check(`U29 ${name}, ${scheme}, touch: with a filter, a selection and a record, collapsing, expanding and a turn from tall portrait to short portrait, landscape, short portrait and tall portrait keep all three, with the Fit edges following the state; at the Fit, opening never refits or shrinks the drawing and keeps the leaf beside the sheet, closing returns to the same Fit, a turn refits and each return restores the same Fit; away from it the camera stays`,
            r.ok && E.errors.length === 0, J(r.d.rows ? r.d.rows.filter((x, i) => i < 3) : r.d).slice(0, 400));
          await E.close(); }
        const d = await walk(name, page, scheme, DESK, false), badD = d.rows.filter((r) => !r.ok).map((r) => row(r.d));
        const f = await fresh(page, scheme, d), badF = f.filter((r) => !r.ok).map((r) => row(r.d).concat(['walked ' + r.walked.join(' ')]));
        measures.fresh = (measures.fresh || []).concat([{ name, scheme, rows: f.map((r) => [r.d.size, r.d.insp, r.d.k, r.walked]) }]);
        check(`U28 ${name}, ${scheme}, desktop: narrowed from 1280 to 767 and widened again at 1150 tall, past the lower panels' transition and both sides of the inspector's, and each size loaded fresh: at each the whole-map Fit stands clear and is as large as the best single reservation of the inspector that clears and, where the panels fold with nothing inspected, as the overview the panel leaves folded (within 0.5%); an explicit Fit gives the same view; and a fresh load reaches the same Fit as the walk`,
          !badD.length && !badF.length && d.errors === 0, J(badD.length || badF.length ? badD.concat(badF) : d.rows.map((r) => [r.d.size, r.d.k])).slice(0, 500));
      }
      measures.cover = [];
      for (const [name, page, w] of [['the CFW reference', EXPR['the CFW reference'], 940], ['the Vellmark parks composition', EXPR['the Vellmark parks composition'], 1100]])
        for (const scheme of ['light', 'dark']) {
          const E = await open(b, base + page, { width: w, height: 1150, scheme });
          const r = await E.ev('C.cover()'); measures.cover.push(r.d);
          check(`U30 ${name}, ${scheme}, at ${w}x1150, the narrowest desktop window where the panels around the map stand: selections at the Fit grow the open wide panel, and no drawn mark ends up under it; the view stays at the Fit`,
            r.ok && E.errors.length === 0, J(r.d));
          await E.close();
        }
      { const r = await KEYED.u34(b, base, EXPR['the Vellmark parks composition']); measures.yields = r.d;
        check('U34 the CFW reference at 1100x760, where the open drawer alone folds the panels: with a node selected the drawer opens, with focus in its search, and the sheet yields to it, one arrangement reported; closing the drawer returns the wide panel with the selection. A search result chosen there opens the sheet, which closes the drawer as on a phone, focus to its trigger: the panels return to wide, the node beside the panel, two arrangements in order. Vellmark at 1100x1150 narrowed to 940 with the drawer open over a selection: the sheet yields, and the drawer and the focus in its search stay',
          r.ok, J(r.d).slice(0, 600)); }
      measures.landing = [];
      for (const [name, page, size] of [['the CFW reference', EXPR['the CFW reference'], [880, 700]], ['the Vellmark parks composition', EXPR['the Vellmark parks composition'], [940, 700]]])
        for (const scheme of ['light', 'dark']) {
          const r = await KEYED.u35(b, base, page, size, scheme, 12); measures.landing.push({ name, scheme, d: r.d });
          check(`U35 ${name}, ${scheme}, landscape desktop at ${size[0]}x${size[1]}, where the panels fold: for the first 12 leaves (at least 10 resolved and found), a #node= arrival and a search result open the sheet with the node clear of it by the reveal margin`,
            r.ok, J(r.d).slice(0, 500));
        }
      measures.dynamic = [];
      for (const [name, page, size, roomy] of [['the CFW reference', EXPR['the CFW reference'], [860, 1150], 1100], ['the Vellmark parks composition', EXPR['the Vellmark parks composition'], [940, 1150], 1280]])
        for (const scheme of ['light', 'dark']) {
          const E = await open(b, base + page, { width: size[0], height: size[1], scheme });
          const r = await KEYED.u31(E, scheme, size, roomy); measures.dynamic.push({ name, scheme, d: r.d });
          check(`U31 ${name}, ${scheme}, desktop at ${size[0]}x${size[1]}, where the panels around the map fold: hover previews a leaf and leaves the inspector folded; over the whole map the open sheet is reported as covering it; a record, a node selected under the open sheet, a reference followed from the record with the most to show, and that record growing the sheet past its node each keep the selected node beside the sheet, with the coverage reported; opening from the Fit keeps the drawing's scale; the reader's Escape clears the selection and folds the sheet with focus kept on the panel; Fit restores the overview; a reading state at the Fit of a ${roomy} wide window is carried to the cramped one and back to the same Fit, and a camera the reader moves is kept both ways; nothing more happens once the observers settle; and a manual camera is kept through every resize`,
            r.ok && E.errors.length === 0, J(r.d.fails && r.d.fails.length ? r.d.fails : r.d.rows).slice(0, 500));
          await E.close();
        }
      /* a phone turned with the reading sheet open, the reader's own camera, and the first arrival's settle */
      measures.turn = []; measures.manual = []; measures.settle = [];
      for (const [name, page] of Object.entries(EXPR)) for (const scheme of ['light', 'dark']) {
        const r = await KEYED.u36(b, base, page, scheme); measures.turn.push({ name, scheme, d: r.d });
        check(`U36 ${name}, ${scheme}, touch: the reading sheet open while the phone turns, 390x844 to 844x390 and back and the other way, opened from the Fit under a filter with an evidence record followed, by a #node= arrival, by a search result and by a reference followed: after each turn the selection, the record and the filter are kept, the sheet stays open and the selected node lies on the canvas and clear of the sheet; from the Fit the turned view is the new size's Fit, never smaller, and closing the sheet returns to it; from a node the map centered its zoom is kept and closing leaves the node on the canvas; Fit restores the overview; a record with no placed origin keeps its view and the focus through the turn; and nothing more happens once the observers settle`,
          r.ok, J(r.d.fails && r.d.fails.length ? r.d.fails : r.d.rows).slice(0, 600));
      }
      for (const [name, page] of Object.entries(EXPR)) {
        const r = await KEYED.u37(b, base, page, 'light'); measures.manual.push({ name, d: r.d });
        check(`U37 ${name}: a camera the reader moved is kept: a real touch pan and a real pinch with the sheet open keep k, x and y through a turn and the turn back, and a change of height alone holds the center (y by half the change); a real wheel zoom, the HUD's zoom control and keyboard moves that pan away from an arrival keep k, x and y through a desktop resize`,
          r.ok, J(r.d.fails.length ? r.d.fails : r.d.rows).slice(0, 600));
      }
      for (const [name, page] of Object.entries(EXPR)) for (const scheme of ['light', 'dark']) {
        const r = await KEYED.u38(b, base, page, scheme, 6); measures.settle.push({ name, scheme, d: r.d });
        check(`U38 ${name}, ${scheme}, touch at 390x844: the first 6 leaves each arrived at by a #node= link on a fresh page, and again with every font face loaded before the map mounts: once the layout settles, the arrived node lies on the canvas and clear of the open sheet at the arrival's zoom; the bar filling in after the map mounts moves nothing`,
          r.ok, J(r.d).slice(0, 500));
      }
      for (const scheme of ['light', 'dark']) {
        const E = await open(b, base + EXPR['the CFW reference'], { width: 1100, height: 760, scheme });
        const r = await KEYED.u39(E); measures.back = (measures.back || []).concat([{ scheme, d: r.d }]);
        check(`U39 the CFW reference, ${scheme}, at 1100x760, where the open drawer alone folds the panels: at the Fit, idle and with a node selected, the sheet opened by its own toggle closes the drawer, the arrangement turns wide with no change of size, and the wide panel returns to the wide Fit`,
          r.ok, J(r.d.fails.length ? r.d.fails : r.d.rows).slice(0, 500));
        await E.close();
      }
      for (const [name, page] of Object.entries(EXPR)) {
        const r = await KEYED.u40(b, base, page, 'light'); measures.desktopMade = (measures.desktopMade || []).concat([{ name, d: r.d }]);
        check(`U40 ${name}, desktop 1440x900 narrowed to 1100x900: a node a #node= arrival centered stays on the canvas at its zoom, and a group the map framed is framed again for the new size`,
          r.ok, J(r.d.fails.length ? r.d.fails : r.d.rows).slice(0, 500));
      }
    }
    /* their controls: a planted inspector in a copy loaded into the CFW reference, remounted */
    {
      const ALT = "      set(slot, 'data-radial-fit-option', compact && !expanded ? 'right' : null);";
      const control = async (from, to, size, touch, fn, file) => {
        const X = await open(b, base + EXPR['the CFW reference'], { width: size[0], height: size[1], touch });
        const pl = await X.ev(`C.plant(${J(file || 'diagrams-radial-inspector.js')}, ${J(from)}, ${J(to)})`);
        let x = { ok: true, d: 'not planted' };
        if (pl.planted) {
          await X.ev(`(() => { const R = window.RADIAL_REFERENCE; RADIAL_MAP.destroy(); window.RADIAL_MAP = DIAGRAM_RADIAL.mount({ host: document.querySelector('[data-radial]'), data: R.data, adapter: R.adapter, modules: R.modules }); return true; })()`);
          await X.ev('new Promise((r) => setTimeout(r, 300))'); await X.frames();
          x = typeof fn === 'function' ? await fn(X) : await X.ev(fn || 'C.frame()');
        }
        await X.close();
        return { pl, x };
      };
      { const { pl, x } = await control(ALT, "      set(slot, 'data-radial-fit-option', null);", [568, 320], true);
        check('X16 the collapsed pill planted with no option, reserved across the top alone, fails U26 on the CFW reference at 568x320: the whole-map Fit no longer stands clear, the drawing under the controls',
          pl.planted && !x.ok && x.d.clear === false && x.d.drawing === false, J(x.d)); }
      { const { pl, x } = await control("      set(slot, 'data-diagram-fit-edge', compact ? (expanded ? 'none' : 'top') : 'right');",
          "      set(slot, 'data-diagram-fit-edge', compact ? (expanded ? 'none' : 'right') : 'right');", [393, 666], true);
        check('X17 the collapsed pill planted to the right alone fails U26 on the CFW reference at 393x666: the Fit stands clear but well under the best single reservation, the drawing squeezed beside the pill',
          pl.planted && !x.ok && x.d.clear === true && x.d.k < x.d.best * 0.995, J(x.d)); }
      { const { pl, x } = await control("      folded = ev.arrangement === 'compact';\n", "", [860, 1150], false);
        check('X18 an inspector planted to ignore the chrome\'s arrangement fails U28 on the CFW reference at 860x1150: the idle panel stays open beside a drawing far smaller than the one it leaves folded',
          pl.planted && !x.ok && x.d.fold !== null && x.d.k < x.d.fold * 0.995, J(x.d)); }
      { const { pl, x } = await control("covered: overlays.filter(function (o) { return o.isOpen() && covers(o.element); }).map(function (o) { return o.name; }),",
          "covered: lastFit ? lastFit.covered : [],", [860, 1150], false, (X) => KEYED.u31(X, 'light', [860, 1150], 1100), 'diagrams-radial-engine.js');
        check('X20 a report planted to say only what the last Fit covered fails U31 on the CFW reference at 860x1150: the open sheet lies over the drawing and is not reported',
          pl.planted && !x.ok && x.d.fails.some((f) => /reported as covering/.test(f[0])), J(x.d.fails || x.d)); }
      { const { pl, x } = await control("    function keepTarget() {\n", "    function keepTarget() { return;\n", [860, 1150], false, (X) => KEYED.u31(X, 'light', [860, 1150], 1100));
        check('X21 an inspector planted not to keep the selected node beside the open sheet fails U31 on the CFW reference at 860x1150: a node selected under the sheet stays under it, and so does a node the growing record covers',
          pl.planted && !x.ok && x.d.fails.some((f) => /under the open sheet/.test(f[0])) && x.d.fails.some((f) => /grows the sheet past its node/.test(f[0])), J(x.d.fails || x.d)); }
      { const { pl, x } = await control("        if (atFit) { api.fit('resize'); beside(api.selection().locked, true); }", "        if (atFit) beside(api.selection().locked, true);",
          [860, 1150], false, (X) => KEYED.u31(X, 'light', [860, 1150], 1100));
        check('X27 a resize planted to keep a reading state open without taking the new arrangement\'s Fit fails U31 on the CFW reference at 860x1150: the cramped sheet keeps the wide arrangement\'s Fit, a far smaller drawing',
          pl.planted && !x.ok && x.d.fails.some((f) => /takes the Fit of the new arrangement/.test(f[0])), J(x.d.fails || x.d)); }
      { const { pl, x } = await control("      if (api.view().atFit || back) api.fit('resize');", "      if (api.view().atFit) api.fit('resize');",
          [1100, 760], false, (X) => KEYED.u39(X));
        check('X28 the wide panel planted not to return to the Fit the sheet left fails U39 on the CFW reference at 1100x760: the sheet\'s opening closes the drawer and the arrangement turns wide with no change of size, and the view stays off the wide Fit',
          pl.planted && !x.ok && x.d.fails.some((f) => /returns to the wide Fit/.test(f[0])), J(x.d.fails || x.d)); }
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
       "      if (!on) { opened = false; sheetView = null; }\n      place();", "      if (!on) { opened = false; sheetView = null; }\n      if (on && compact) api.claim('inspector');\n      place();", 'compactClaimNoFit', { width: 390, height: 844, touch: true },
       (r) => r.d.fits.length > 0]
    ];
    plants.push(
      ['X12 a panel planted to drop focus when its view is replaced fails U17', 'diagrams-radial-inspector.js', '      if (focused) {', '      if (false) {', KEYED.u17, {}],
      ['X14 a resize planted to fold a reader\'s inspection fails U20: the sheet folds', 'diagrams-radial-inspector.js',
       "      var keep = compact && was && inspecting() && !api.othersOpen('inspector');", '      var keep = false;', KEYED.u20, {}, (r) => !!r.d.a && !r.d.a.expanded],
      ['X19 a chrome planted to measure the inspector as it stands, with no probe, fails U32: the two fold and unfold each other until the mount fails', 'diagrams-radial-chrome.js',
       "      api.emit('probe', { arrangement: 'wide' });\n", '', 'settle', {}, (r) => /call stack/i.test(r.d.err || '') && r.d.decided.length > 1],
      ['X29 the camera planted to be kept for the wide panel too fails U14b: its toggle refits away from the Fit', 'diagrams-radial-inspector.js',
       '      sheetView = compact ? { k: v.k, x: v.x, y: v.y, fit: !!fromFit } : null;', '      sheetView = { k: v.k, x: v.x, y: v.y, fit: !!fromFit };', 'wideToggle', {}, (r) => r.d.fits.length > 0],
      ['X23 a resize planted to hide the body without the hand-off fails U33: the focus is lost', 'diagrams-radial-inspector.js',
       '      if (compact && was && !keep) handoff();               /* the body hides */\n', '', KEYED.u33, {}, (r) => !r.d.a.expanded && !r.d.a.inHost],
      ['X15 a reference planted to reveal only through the facets module fails U23', 'diagrams-radial-inspector.js',
       "if (f && f.reset) f.reset('reader'); else api.membership.reset('reader');", "if (f && f.reset) f.reset('reader');", 'followNoFacets', {}],
      ['X13 a drawer planted to keep focus when another panel closes it fails Q15', 'diagrams-radial-facets.js',
       "setOpen(false, cause === 'claim' ? 'reader' : cause || 'module'); } });", "setOpen(false, cause === 'claim' ? 'reader' : cause || 'module', cause !== 'claim'); } });",
       KEYED.q15, { width: 390, height: 844, touch: true }],
      ['X35 the default kind line planted with the dash it replaced fails U2', 'diagrams-radial-inspector.js',
       "t.kind.id + ' // ' + t.kind.label", "t.kind.id + ' \\u2014 ' + t.kind.label", 'item', {}, (r) => / \u2014 /.test(r.d.kind)],
      ['X36 an adapter\'s kind line planted to be replaced by the default fails U2b', 'diagrams-radial-inspector.js',
       'var kindLine = h.kind !== undefined ? h.kind : (', 'var kindLine = (', 'kindOverride', {}, (r) => r.d.one[0] !== 'own kind \u2014 as given']);
    for (const [name, file, from, to, fn, opts, why] of plants) {
      const Q = await open(b, url, opts);
      const pl = await Q.ev(`C.plant(${J(file)}, ${J(from)}, ${J(to)})`);
      let r = { ok: true, d: 'not run' };
      if (pl.planted) { try { r = typeof fn === 'function' ? await fn(Q) : await at(Q, fn); } catch (e) { r = { ok: false, d: 'threw: ' + String(e).slice(0, 120) }; } }
      /* where a reason is named, the check fails for it */
      let because = true; if (why && pl.planted) { try { because = !!why(r); } catch (e) { because = false; } }
      check(name, pl.planted && !r.ok && because, pl.planted ? J(r.d).slice(0, 200) : 'the fault could not be planted: the module text changed');
      await Q.close();
    }
    /* the controls run on the public expressions: the sheet planted to stay open over the drawer, and the
       select handler planted without the deferred check */
    { const x = await KEYED.u34(b, base, EXPR['the Vellmark parks composition'], { file: 'diagrams-radial-inspector.js', from: "inspecting() && !api.othersOpen('inspector')", to: 'inspecting()' });
      check('X24 the sheet planted to stay open over another open exclusive panel when the arrangement folds fails U34: the drawer\'s opening folds the panels and the sheet and the drawer stand open at once', x.planted && !x.ok && x.d.a1.insp === 'compact open' && x.d.a1.drawer, J(x.d).slice(0, 300)); }
    { const from = '      Promise.resolve().then(function () { if (api.selection().locked === id) keepTarget(); });\n';
      const r = await KEYED.u35(b, base, EXPR['the CFW reference'], [880, 700], 'light', 12, { file: 'diagrams-radial-inspector.js', from, to: '' });
      check('X25 the select handler planted without its deferred check fails U35 on the CFW reference at 880x700: arrived nodes end under the open sheet', r.planted && !r.ok && r.d.arrival.some((x) => x.under), J(r.d).slice(0, 300)); }
    /* the reading-view controls, each planted on the public expression it names */
    { const r = await KEYED.u36(b, base, EXPR['the Vellmark parks composition'], 'light', { file: 'diagrams-radial-engine.js',
        from: "      if (!manual && made) reframe('resize'); else apply();\n", to: "      apply();\n" });
      check('X30 a size change planted to keep a view the map made fails U36 on Vellmark: a turned phone keeps the old view, the selected node off the canvas or under the sheet',
        r.planted && !r.ok && r.d.fails.some((f) => /turned/.test(f[0]) && f[1] && (f[1].onCanvas === false || f[1].under === true)), J(r.d.fails || r.d).slice(0, 300)); }
    { const r = await KEYED.u36(b, base, EXPR['the CFW reference'], 'light', { file: 'diagrams-radial-inspector.js', from: "      beside(api.selection().locked, ev.basis === 'fit');\n", to: '' });
      check('X33 an inspector planted not to place the selected node beside its sheet after a turn fails U36 on the CFW reference: the turned view is made again, and the node ends under the open sheet',
        r.planted && !r.ok && r.d.fails.some((f) => /turned/.test(f[0]) && f[1] && f[1].under === true), J(r.d.fails || r.d).slice(0, 300)); }
    { const r = await KEYED.u37(b, base, EXPR['the Vellmark parks composition'], 'light', { file: 'diagrams-radial-engine.js', from: 'view.y = v.y; atFit = false; manual = true; scheduleApply();', to: 'view.y = v.y; atFit = false; scheduleApply();' });
      check('X31 a pan planted not to count as the reader\'s fails U37 on Vellmark: the panned camera is made again by the turn',
        r.planted && !r.ok && r.d.fails.some((f) => /pan/.test(f[0])), J(r.d.fails || r.d).slice(0, 300)); }
    { const r = await KEYED.u37(b, base, EXPR['the CFW reference'], 'light', { file: 'diagrams-radial-engine.js', from: '      atFit = false; manual = true; apply();\n', to: '      atFit = false; apply();\n' });
      check('X34 a keyboard move planted not to count as the reader\'s fails U37 on the CFW reference: the resize makes the keyboard\'s camera again around the arrived node',
        r.planted && !r.ok && r.d.fails.some((f) => /keyboard/.test(f[0])), J(r.d.fails || r.d).slice(0, 300)); }
    { const r = await KEYED.u38(b, base, EXPR['the Vellmark parks composition'], 'light', 6, { file: 'diagrams-radial-engine.js',
        from: ['function remember() { sw = W(); sh = H(); }', 'if (manual || !made) {', "      if (!manual && made) reframe('resize'); else apply();\n"],
        to: ['function remember() { if (!sw) { sw = W(); sh = H(); } }', 'if (true) {', "      apply();\n"] });
      check('X32 the stage size planted to be remembered once, as the map mounts, with every view treated as the reader\'s, fails U38 on Vellmark: the bar filling in after the map mounts moves the arrived node under the open sheet',
        r.planted && !r.ok && r.d.bad.some((x) => x.under), J(r.d).slice(0, 300)); }
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
