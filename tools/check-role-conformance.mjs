#!/usr/bin/env node
/* check-role-conformance.mjs
   Runs tools/role-conformance.js on rendered pages in headless Chrome, drives
   the link interaction states (C9) with real pointer and keyboard input, and
   prints a JSON report. No npm dependency: it drives Chrome over the DevTools
   protocol with Node's built-in WebSocket (Node 22+).

     node tools/check-role-conformance.mjs --url URL [--url URL ...]
          [--scheme dark|light|both] [--width 1440] [--height 900] [--mobile]
          [--scope SELECTOR] [--profiles FILE.json] [--allow-vacuous]
     node tools/check-role-conformance.mjs --fixture URL [--scheme ...]
          load tests/role-conformance-fixture.html from a served repo root and
          judge every case: its static reason codes from the page, its
          interaction reason codes from this runner

   --profiles names a JSON file holding an array of profile declarations, the
   consumer's own named roles (a count numeral, say):
     [{ "name": "...", "selector": "...", "owner": "...", "reason": "...",
        "expected_count": 6 }]
   role-conformance.js validates each one (C10) before it exempts anything.

   THE INTERACTION PASS. After the resting check, every closed <details> in
   scope is opened (an exclusive group's name is set aside until the pass
   ends, so all its members open together), and each governed link carrying
   surface-text-link that renders a box is read at rest, under a real pointer
   placed on it, and after the pointer moves to a point over nothing
   interactive. The page is then walked with real Tab presses, and each
   governed link reads its state when it takes keyboard focus. A governed link
   carrying surface-text-link that still renders no box fails C9.unrendered;
   one without it that no resting check saw — a script added it — fails
   C9.class. The page runs under an emulated reduced-motion preference and
   running transitions are finished before each read, so the pass proves each
   settled state, not how long it takes to arrive.

   Exit 0 pass · 1 finding, vacuous page, page error, failed navigation or
   fixture failure · 2 usage or browser error. A page with no governed element
   is VACUOUS and fails unless --allow-vacuous is given: silence proves nothing.

   Serve the pages first, for example from the repo root:
     python3 -m http.server 8080
   Chrome is found at $CHROME, else the default macOS and Linux locations. It
   runs with a throwaway profile in the system temp directory on a port Chrome
   chooses itself; only the process this script started is stopped, and the
   profile is removed after that process has exited.
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECKER = fs.readFileSync(path.join(HERE, 'role-conformance.js'), 'utf8');
const LOAD_TIMEOUT_MS = 30000;
const USAGE = 'usage: check-role-conformance.mjs --url URL [...] [--scheme dark|light|both] [--width N] [--height N] [--mobile] [--scope SEL] [--profiles FILE.json] [--allow-vacuous]\n       check-role-conformance.mjs --fixture URL [--scheme ...] [--width N] [--height N] [--mobile]';

function usage(msg) { console.error(msg ? `${msg}\n${USAGE}` : USAGE); process.exit(2); }
function parseArgs(argv) {
  const o = { urls: [], scheme: 'both', width: 1440, height: 900, mobile: false, scope: null, profiles: [], profilesFile: null, allowVacuous: false, fixture: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { if (i + 1 >= argv.length) usage(`${a} needs a value`); return argv[++i]; };
    if (a === '--url') o.urls.push(next());
    else if (a === '--fixture') o.fixture = next();
    else if (a === '--scheme') o.scheme = next();
    else if (a === '--width') o.width = Number(next());
    else if (a === '--height') o.height = Number(next());
    else if (a === '--mobile') o.mobile = true;
    else if (a === '--scope') o.scope = next();
    else if (a === '--profiles') o.profilesFile = next();
    else if (a === '--allow-vacuous') o.allowVacuous = true;
    else usage(`unknown argument ${a}`);
  }
  if (!o.urls.length && !o.fixture) usage();
  if (o.urls.length && o.fixture) usage('--fixture and --url are separate runs');
  if (o.fixture && o.profilesFile) usage('the fixture declares its own profiles');
  if (!['dark', 'light', 'both'].includes(o.scheme)) usage('--scheme is dark, light or both');
  if (!(o.width > 0 && o.height > 0)) usage('--width and --height are positive numbers');
  if (o.profilesFile) {
    let d;
    try { d = JSON.parse(fs.readFileSync(o.profilesFile, 'utf8')); } catch (e) { usage(`--profiles: cannot read ${o.profilesFile}: ${e.message}`); }
    if (!Array.isArray(d)) usage('--profiles: the file must hold a JSON array of profile declarations');
    o.profiles = d;
  }
  return o;
}

function chromePath() {
  const candidates = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) { console.error('Chrome not found; set $CHROME'); process.exit(2); }
  return found;
}

async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'role-conformance-'));
  const child = spawn(chromePath(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const exited = new Promise((r) => child.once('exit', r));
  const b = { child, profile, exited, port: null };
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    try {
      const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
      if (port && (await fetch(`http://127.0.0.1:${port}/json/version`)).ok) { b.port = port; return b; }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  await stop(b);
  throw new Error('Chrome did not start');
}
async function stop(b) {
  try { b.child.kill(); } catch { /* already gone */ }
  await Promise.race([b.exited, new Promise((r) => setTimeout(r, 5000))]);
  for (let i = 0; i < 5; i++) {
    try { fs.rmSync(b.profile, { recursive: true, force: true }); break; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
}

async function page(b, { url, width, height, mobile, scheme }) {
  const tgt = await (await fetch(`http://127.0.0.1:${b.port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  const errors = [];
  let loaded;
  const onLoad = new Promise((r) => { loaded = r; });
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
    if (m.method === 'Page.loadEventFired') loaded();
    if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
  });
  const call = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const close = async () => { try { ws.close(); } catch { /* closed */ } await fetch(`http://127.0.0.1:${b.port}/json/close/${tgt.id}`).catch(() => {}); };
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
  const nav = await call('Page.navigate', { url });
  if (nav.errorText) { await close(); throw new Error(`navigation failed: ${url}: ${nav.errorText}`); }
  const timedOut = await Promise.race([onLoad.then(() => false), new Promise((r) => setTimeout(() => r(true), LOAD_TIMEOUT_MS))]);
  if (timedOut) { await close(); throw new Error(`page did not load within ${LOAD_TIMEOUT_MS} ms: ${url}`); }
  const evaluate = async (expression) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const frames = () => evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
  const mouse = async (pt) => { await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y, button: 'none' }); await frames(); };
  const tab = async () => {
    await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await frames();
  };
  await evaluate('document.fonts ? document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 300))) : null');
  return { evaluate, errors, close, frames, mouse, tab };
}

/* The C9 pass over one page: returns its findings and what it covered. */
async function interactionPass(p, scope) {
  const I = 'ASKRoleConformance.interaction';
  const arg = JSON.stringify({ scope });
  const opened = await p.evaluate(`${I}.prepare(${arg})`);
  await p.frames();
  const targets = await p.evaluate(`${I}.targets(${arg})`);
  const untested = await p.evaluate(`${I}.untested()`);
  const testable = targets.filter((t) => t.testable && t.rendered);
  const records = new Map();
  for (const t of testable) {
    await p.evaluate(`${I}.blur()`);
    await p.evaluate(`${I}.scroll(${JSON.stringify(t.id)})`);
    await p.mouse(await p.evaluate(`${I}.neutral()`));
    const rec = { id: t.id, container: t.container, rest: await p.evaluate(`${I}.read(${JSON.stringify(t.id)})`) };
    rec.point = await p.evaluate(`${I}.point(${JSON.stringify(t.id)})`);
    if (rec.point) {
      await p.mouse(rec.point);
      rec.hover = await p.evaluate(`${I}.read(${JSON.stringify(t.id)})`);
      await p.mouse(await p.evaluate(`${I}.neutral()`));
      rec.leave = await p.evaluate(`${I}.read(${JSON.stringify(t.id)})`);
    }
    records.set(t.id, rec);
  }
  /* keyboard: walk the page with Tab from its start */
  await p.evaluate(`${I}.blur()`);
  await p.evaluate('window.scrollTo(0, 0)');
  await p.mouse(await p.evaluate(`${I}.neutral()`));
  const focusable = await p.evaluate("document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]').length");
  const cap = Math.min(4 * focusable + 20, 4000);
  const want = new Set(testable.map((t) => t.id));
  let first = null, presses = 0;
  for (; presses < cap && want.size; presses++) {
    await p.tab();
    const a = await p.evaluate(`${I}.active()`);
    if (a !== '#body' && a !== '#other') {
      if (first === null) first = a; else if (a === first) break;
      if (want.has(a)) { records.get(a).focus = await p.evaluate(`${I}.read(${JSON.stringify(a)})`); want.delete(a); }
    } else if (a === '#other' && first === null) first = '#other-start';
  }
  const findings = [...untested, ...await p.evaluate(`${I}.judge(${JSON.stringify([...records.values()])})`)];
  await p.evaluate(`${I}.cleanup()`);
  return {
    findings,
    summary: {
      governed_links: targets.length, tested: testable.length, opened_details: opened, tab_presses: presses,
      hovered: [...records.values()].filter((r) => r.hover).length, focused: [...records.values()].filter((r) => r.focus).length,
      not_rendered: targets.filter((t) => t.testable && !t.rendered).map((t) => t.element),
      not_tested_lacks_class: targets.filter((t) => !t.testable).map((t) => t.element),
    },
    records: [...records.values()].map((r) => ({ element: (targets.find((t) => t.id === r.id) || {}).element, container: r.container,
      rest: r.rest && [r.rest.line, r.rest.thickness, r.rest.color, r.rest.opacity].join(' | '),
      hover: r.hover && [r.hover.hover ? ':hover' : 'NOT :hover', r.hover.line, r.hover.thickness, r.hover.color, r.hover.opacity].join(' | '),
      leave: r.leave && [r.leave.hover ? 'STILL :hover' : 'left', r.leave.line, r.leave.thickness, r.leave.color, r.leave.opacity].join(' | '),
      focus: r.focus && [r.focus.focusVisible ? ':focus-visible' : 'NOT :focus-visible', r.focus.line, r.focus.thickness, r.focus.color].join(' | ') })),
  };
}

const o = parseArgs(process.argv.slice(2));
const schemes = o.scheme === 'both' ? ['dark', 'light'] : [o.scheme];
let b;
try { b = await launch(); } catch (e) { console.error(String(e)); process.exit(2); }
const report = { tool: 'check-role-conformance', viewport: `${o.width}x${o.height}${o.mobile ? ' mobile' : ''}`, profiles: o.profiles, runs: [] };
let ok = true;
try {
  if (o.fixture) {
    for (const scheme of schemes) {
      const p = await page(b, { url: o.fixture, width: o.width, height: o.height, mobile: o.mobile, scheme });
      const f = await p.evaluate('window.__roleFixture || null');
      if (!f) { report.runs.push({ fixture: o.fixture, scheme, result: null, page_errors: p.errors }); ok = false; await p.close(); continue; }
      const ip = await interactionPass(p, null);
      const byCase = new Map();
      for (const x of ip.findings) { const k = x.container || '(outside every case)'; if (!byCase.has(k)) byCase.set(k, new Set()); byCase.get(k).add(x.reason); }
      const cases = f.cases.map((c) => {
        const got = [...new Set([...(c.staticGot ? c.staticGot.split(' ').filter(Boolean) : []), ...(byCase.get(c.case) || [])])].sort().join(' ');
        const pass = got === c.expected && c.detailPass !== false;
        return { case: c.case, pass, expected: c.expected, got, detail: c.detail };
      });
      const stray = [...byCase.keys()].filter((k) => !f.cases.some((c) => c.case === k));
      const failed = cases.filter((c) => !c.pass).length + stray.length;
      const result = failed ? 'FAIL' : 'PASS';
      report.runs.push({ fixture: o.fixture, scheme, result, passed: cases.length - cases.filter((c) => !c.pass).length, failed, cases, stray_interaction_findings: stray,
        interaction: ip.summary, interaction_records: ip.records, page_errors: p.errors });
      if (result !== 'PASS' || p.errors.length) ok = false;
      await p.close();
    }
  } else {
    for (const url of o.urls) for (const scheme of schemes) {
      const p = await page(b, { url, width: o.width, height: o.height, mobile: o.mobile, scheme });
      await p.evaluate(CHECKER);
      const r = await p.evaluate(`ASKRoleConformance.check(${JSON.stringify({ scope: o.scope, profiles: o.profiles })})`);
      const ip = await interactionPass(p, o.scope);
      const findings = [...r.findings, ...ip.findings];
      let status = findings.length ? 'fail' : r.governed === 0 ? 'vacuous' : 'pass';
      if (status === 'vacuous' && o.allowVacuous) status = 'vacuous-allowed';
      if (p.errors.length && status !== 'fail') status = 'page-error';
      report.runs.push({ url, scheme, status, governed: r.governed, counts: r.counts, tokens: r.tokens, findings,
        interaction: ip.summary, interaction_records: ip.records, profiles: r.profiles, unmapped: r.unmapped, page_errors: p.errors });
      if (!(status === 'pass' || status === 'vacuous-allowed')) ok = false;
      await p.close();
    }
  }
} catch (e) {
  await stop(b);
  console.error(String(e && e.stack || e));
  process.exit(2);
}
await stop(b);
report.pass = ok;
/* Exit only once the report is written: a pipe on macOS is asynchronous, and
   exiting straight after console.log would cut a large report short. */
process.stdout.write(JSON.stringify(report, null, 1) + '\n', () => process.exit(ok ? 0 : 1));
