#!/usr/bin/env node
/* check-custom-properties.mjs
   Fails when a `var(--name)` with no fallback cannot resolve.

     node tools/check-custom-properties.mjs --check
         every vendorable stylesheet against its DEPENDENCIES row, and every
         page in this repository against its own load graph
     node tools/check-custom-properties.mjs --self-test
         in-memory controls on this file's own logic
     node tools/check-custom-properties.mjs --root <dir> --page <path> [--page <path>]...
                                            [--dep <page>=<path>]...
         the named pages of another repository, each against its own load
         graph; --dep adds the definitions of a file a build inlines into that
         page (definitions only — its references are that file's own concern)

   Prints a JSON report. Exit 0 pass · 1 finding · 2 usage.

   WHAT COUNTS
   - A definition is `--name:` in a stylesheet, a <style> block or a style=""
     attribute, or `setProperty('--name'` in a script, in any quote form.
   - A reference is `var(--name)` with no fallback, wherever it stands outside
     a comment, a page's attributes included. A comma after the name is a
     fallback, and that reference is skipped.
   - Comments are removed first, keeping line positions: block comments in
     stylesheets and <style>; `<!-- -->` in HTML; line and block comments in
     scripts, outside string, template and regular-expression literals.

   HOW A NAME RESOLVES
   - A vendorable stylesheet resolves only against its DEPENDENCIES row: the
     files a consumer loads with it. A stylesheet that leans on a definition
     its row does not name fails here, before a consumer vendors it without
     that definition.
   - A page resolves against its own load graph: its own definitions, the
     stylesheets and scripts it links, its inline scripts, and any --dep. The
     references of everything it loads are checked in that context.
   - A stylesheet, or a script carrying a reference, that is neither in
     DEPENDENCIES nor loaded by a page fails: nothing else would check it.

   LIMITS — a pass establishes no more than this
   - Static existence is not scope. A definition anywhere in the resolving set
     counts, even on a selector that never matches the element reading it.
   - A value built at runtime (`'var(--' + role + ')'`) is not resolved.
   - A name defined only on a modifier class passes here, but it is undefined
     on a bare base-class element.
   - The comment scan is lexical, not a parser.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ONE EXPLICIT TABLE, NO AUTO-DISCOVERY. Each row names what a vendorable
   stylesheet may resolve against: a repository path, or SELF for the
   carrier's own definitions. A script dependency contributes its setProperty
   definitions. A new vendorable stylesheet adds its row in the same reviewed
   change that adds the file; a row naming a missing file fails. */
const SELF = 'SELF';
const FOUNDATION = 'colors_and_type.css';
const DEPENDENCIES = {
  'colors_and_type.css':                                               [SELF],
  'surface-action.css':                                                [FOUNDATION],
  'surface-panel.css':                                                 [FOUNDATION],
  'surface-text-link.css':                                             [FOUNDATION, SELF],
  'surface-document.css':                                              [FOUNDATION],
  'three-functions.css':                                               [FOUNDATION, SELF],
  'spectral-state.css':                                                [FOUNDATION, SELF],
  'evidence-state.css':                                                [FOUNDATION, 'spectral-state.css', SELF],
  'patterns/surface-shell/surface-shell.css':                          [FOUNDATION, SELF],
  'patterns/diagram-interactive-spine/diagrams-interactive-spine.css': [FOUNDATION, 'spectral-state.css',
                                                                        'patterns/diagram-interactive-spine/diagrams-interactive-spine-engine.js'],
  'patterns/diagram-static-H/diagrams.css':                            [FOUNDATION, SELF],
  'patterns/diagram-static-V/diagrams.css':                            [FOUNDATION, SELF],
  'patterns/diagram-static-SEQ/diagrams.css':                          [FOUNDATION, SELF],
  'patterns/diagram-static-FLOW/diagrams.css':                         [FOUNDATION, SELF],
};

/* Link mapping for templates written from a consumer's layout. A link that
   resolves where it points always wins; only a link that does not is mapped.
   `_dsa-tokens/` is a consumer's token and font mirror, which is this
   repository's root. A bare sibling that a template loads as a root module is
   declared here, as tools/gen-pattern-previews.mjs declares it in rootRefs. */
const TOKEN_MIRROR = ['./_dsa-tokens/', '_dsa-tokens/'];
const ROOT_REFS = {
  'patterns/surface-shell/surface-shell.template.html': ['surface-action.css'],
};

/* The embedded-font payload carries @font-face data only. */
const EXCLUDED = new Set(['fonts-embedded.js']);

/* ------------------------------------------------------------ arguments -- */

const USAGE = `usage: check-custom-properties.mjs --check
       check-custom-properties.mjs --self-test
       check-custom-properties.mjs [--check] [--root <dir>] --page <path> [--page <path>]... [--dep <page>=<path>]...`;

function usage(message) {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

/* Reject unknown flags, as tools/sync-diagram-shared.mjs does: a mistyped
   flag must never fall through to a run that checks less and still passes. */
function parseArgs(args) {
  const opts = { check: false, selfTest: false, root: null, pages: [], deps: [] };
  const unknown = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--check') opts.check = true;
    else if (a === '--self-test') opts.selfTest = true;
    else if (a === '--root' || a === '--page' || a === '--dep') {
      const v = args[i + 1];
      if (v === undefined || v.startsWith('--')) usage(`${a} needs a value`);
      i++;
      if (a === '--root') {
        if (opts.root !== null) usage('--root given twice');
        opts.root = v;
      } else if (a === '--page') opts.pages.push(v);
      else {
        const eq = v.indexOf('=');
        if (eq <= 0 || eq === v.length - 1) usage(`--dep needs <page>=<path>, got: ${v}`);
        opts.deps.push({ page: v.slice(0, eq), file: v.slice(eq + 1) });
      }
    } else unknown.push(a);
  }
  if (unknown.length) usage(`unknown argument(s): ${unknown.join(' ')}`);
  if (opts.selfTest && (opts.check || opts.root !== null || opts.pages.length || opts.deps.length)) {
    usage('--self-test takes no other argument');
  }
  if (!opts.selfTest && !opts.check && !opts.pages.length) usage('nothing to check: give --check, --page or --self-test');
  return opts;
}

/* ------------------------------------------------------------- reading --- */

/* Every read goes through a context, so the self-test can lay in-memory
   bytes over the repository without writing anything. */
function makeContext(root, overlay = {}) {
  const memory = new Map(Object.entries(overlay).map(([rel, text]) => [path.join(root, ...rel.split('/')), text]));
  return {
    root,
    abs: (rel) => (path.isAbsolute(rel) ? path.normalize(rel) : path.join(root, ...rel.split('/'))),
    rel: (abs) => {
      const r = path.relative(root, abs).split(path.sep).join('/');
      return r.startsWith('..') || path.isAbsolute(r) ? abs : r;
    },
    isFile: (abs) => memory.has(abs) || (fs.existsSync(abs) && fs.statSync(abs).isFile()),
    read: (abs) => (memory.has(abs) ? memory.get(abs) : fs.readFileSync(abs, 'utf8')),
    cache: new Map(),
    reached: new Set(),
  };
}

/* root *.css|html|js; preview/** and patterns/** (including _preview/);
   tests/*.html. tools/, fonts/ and assets/ are not scanned. */
function ownerFiles(root) {
  const wanted = /\.(css|html|js)$/;
  const out = [];
  const entries = (rel) => {
    const dir = path.join(root, rel);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  };
  const walk = (rel) => {
    for (const e of entries(rel)) {
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else if (e.isFile() && wanted.test(e.name) && !EXCLUDED.has(e.name)) out.push(child);
    }
  };
  for (const e of entries('')) if (e.isFile() && wanted.test(e.name) && !EXCLUDED.has(e.name)) out.push(e.name);
  walk('preview');
  walk('patterns');
  for (const e of entries('tests')) if (e.isFile() && /\.html$/.test(e.name)) out.push(`tests/${e.name}`);
  return out;
}

/* ------------------------------------------------------------ scanning --- */

function blank(chars, from, to) {
  for (let k = from; k < to; k++) if (chars[k] !== '\n') chars[k] = ' ';
}

/* index just past a quoted string starting at i; an unterminated string ends
   at its line */
function endOfQuoted(src, i) {
  const q = src[i];
  let k = i + 1;
  while (k < src.length) {
    const ch = src[k];
    if (ch === '\\') { k += 2; continue; }
    if (ch === q) return k + 1;
    if (ch === '\n') return k;
    k++;
  }
  return k;
}

function stripCss(src) {
  const chars = src.split('');
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      const stop = e < 0 ? src.length : e + 2;
      blank(chars, i, stop);
      i = stop;
    } else if (ch === '"' || ch === "'") i = endOfQuoted(src, i);
    else i++;
  }
  return chars.join('');
}

/* A `/` starts a regular expression, not a division, after an operator, an
   opening bracket, a separator, the start of input, or one of these words. */
const REGEX_AFTER = new Set('(,=:[!&|?{};+-*%<>~^'.split(''));
const REGEX_WORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

function regexAllowed(chars, i) {
  let k = i - 1;
  while (k >= 0 && /\s/.test(chars[k])) k--;
  if (k < 0) return true;
  if (REGEX_AFTER.has(chars[k])) return true;
  if (!/[\w$]/.test(chars[k])) return false;
  let s = k;
  while (s > 0 && /[\w$]/.test(chars[s - 1])) s--;
  return REGEX_WORDS.has(chars.slice(s, k + 1).join(''));
}

function endOfRegex(src, i) {
  let k = i + 1;
  let inClass = false;
  while (k < src.length) {
    const ch = src[k];
    if (ch === '\\') { k += 2; continue; }
    if (ch === '\n') return i + 1;
    if (inClass) { if (ch === ']') inClass = false; }
    else if (ch === '[') inClass = true;
    else if (ch === '/') {
      k++;
      while (k < src.length && /[a-z]/i.test(src[k])) k++;
      return k;
    }
    k++;
  }
  return i + 1;
}

function stripJs(src) {
  const chars = src.split('');
  const braces = [];            /* one depth counter per open template `${` */
  let template = false;
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (template) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === '`') { template = false; i++; continue; }
      if (ch === '$' && next === '{') { braces.push(0); template = false; i += 2; continue; }
      i++;
      continue;
    }
    if (ch === '/' && next === '/') {
      const e = src.indexOf('\n', i);
      const stop = e < 0 ? src.length : e;
      blank(chars, i, stop);
      i = stop;
      continue;
    }
    if (ch === '/' && next === '*') {
      const e = src.indexOf('*/', i + 2);
      const stop = e < 0 ? src.length : e + 2;
      blank(chars, i, stop);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'") { i = endOfQuoted(src, i); continue; }
    if (ch === '`') { template = true; i++; continue; }
    if (ch === '/' && regexAllowed(chars, i)) { i = endOfRegex(src, i); continue; }
    if (braces.length) {
      if (ch === '{') braces[braces.length - 1]++;
      else if (ch === '}') {
        if (braces[braces.length - 1] === 0) { braces.pop(); template = true; i++; continue; }
        braces[braces.length - 1]--;
      }
    }
    i++;
  }
  return chars.join('');
}

/* the attributes of the tag whose name ends at `from`, and the index past it */
function readTag(src, from) {
  const attrs = new Map();
  const n = src.length;
  let k = from;
  while (k < n) {
    while (k < n && /[\s/]/.test(src[k])) k++;
    if (k >= n) break;
    if (src[k] === '>') return { attrs, end: k + 1 };
    const s = k;
    while (k < n && !/[\s/>=]/.test(src[k])) k++;
    const name = src.slice(s, k).toLowerCase();
    while (k < n && /\s/.test(src[k])) k++;
    let value = '';
    let offset = k;
    if (src[k] === '=') {
      k++;
      while (k < n && /\s/.test(src[k])) k++;
      const q = src[k];
      if (q === '"' || q === "'") {
        const e = src.indexOf(q, k + 1);
        const stop = e < 0 ? n : e;
        value = src.slice(k + 1, stop);
        offset = k + 1;
        k = stop + 1;
      } else {
        offset = k;
        while (k < n && !/[\s>]/.test(src[k])) k++;
        value = src.slice(offset, k);
      }
    }
    if (name && !attrs.has(name)) attrs.set(name, { value, offset });
  }
  return { attrs, end: n };
}

/* A page, cleaned: the same length and lines as the source, with <!-- -->
   comments blanked, comments stripped inside <style>, style="" and inline
   scripts, and the unexecuted body of a script that has a src blanked. Also
   the cleaned stylesheet and script fragments, for definitions, and the
   linked stylesheets and scripts. */
function scanHtml(src) {
  const chars = src.split('');
  const put = (offset, text) => { for (let k = 0; k < text.length; k++) chars[offset + k] = text[k]; };
  const styles = [];
  const scripts = [];
  const links = [];
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;
    if (src.startsWith('<!--', lt)) {
      const e = src.indexOf('-->', lt + 4);
      i = e < 0 ? src.length : e + 3;
      blank(chars, lt, i);
      continue;
    }
    const m = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(src.slice(lt, lt + 64));
    if (!m) { i = lt + 1; continue; }
    const tag = m[1].toLowerCase();
    const { attrs, end } = readTag(src, lt + m[0].length);
    if (attrs.has('style')) {
      const { value, offset } = attrs.get('style');
      const clean = stripCss(value);
      put(offset, clean);
      styles.push(clean);
    }
    if (tag === 'style' || tag === 'script') {
      const close = new RegExp(`</${tag}[\\s/>]`, 'gi');
      close.lastIndex = end;
      const c = close.exec(src);
      const stop = c ? c.index : src.length;
      const body = src.slice(end, stop);
      if (tag === 'style') {
        const clean = stripCss(body);
        put(end, clean);
        styles.push(clean);
      } else if (attrs.has('src')) {
        links.push({ href: attrs.get('src').value, offset: lt });
        blank(chars, end, stop);
      } else {
        const clean = stripJs(body);
        put(end, clean);
        scripts.push(clean);
      }
      i = stop;
      if (c) i = src.indexOf('>', stop) + 1 || src.length;
      continue;
    }
    if (tag === 'link' && attrs.has('href') && /(^|\s)stylesheet(\s|$)/i.test(attrs.get('rel')?.value ?? '')) {
      links.push({ href: attrs.get('href').value, offset: lt });
    }
    i = end;
  }
  return { text: chars.join(''), styles, scripts, links };
}

const NAME = '--[A-Za-z0-9_\\u00A0-\\uFFFF-]+';
const CSS_DEFINITION = new RegExp(`(?<![A-Za-z0-9_-])(${NAME})\\s*:`, 'g');
const JS_DEFINITION = new RegExp(`\\bsetProperty\\(\\s*(['"\`])(${NAME})\\1`, 'g');
const REFERENCE = new RegExp(`(?<![A-Za-z0-9_-])var\\(\\s*(${NAME})\\s*([,)]?)`, 'gi');

function lineStarts(src) {
  const starts = [0];
  for (let k = 0; k < src.length; k++) if (src[k] === '\n') starts.push(k + 1);
  return starts;
}

function lineAt(starts, offset) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/* definitions, references (with lines), runtime-built references, and links */
function analyze(ctx, abs) {
  if (ctx.cache.has(abs)) return ctx.cache.get(abs);
  const src = ctx.read(abs);
  const starts = lineStarts(src);
  const out = { defs: new Set(), refs: [], runtime: 0, links: [] };
  const definitions = (clean, pattern, group) => {
    for (const m of clean.matchAll(pattern)) out.defs.add(m[group]);
  };
  const references = (clean) => {
    for (const m of clean.matchAll(REFERENCE)) {
      if (m[2] === ')') out.refs.push({ name: m[1], line: lineAt(starts, m.index) });
      else if (m[2] !== ',') out.runtime++;
    }
  };
  const ext = path.extname(abs).toLowerCase();
  if (ext === '.css') {
    const clean = stripCss(src);
    definitions(clean, CSS_DEFINITION, 1);
    references(clean);
  } else if (ext === '.js' || ext === '.mjs') {
    const clean = stripJs(src);
    definitions(clean, JS_DEFINITION, 2);
    references(clean);
  } else if (ext === '.html' || ext === '.htm') {
    const h = scanHtml(src);
    for (const text of h.styles) definitions(text, CSS_DEFINITION, 1);
    for (const text of h.scripts) definitions(text, JS_DEFINITION, 2);
    references(h.text);
    out.links = h.links.map((l) => ({ href: l.href, line: lineAt(starts, l.offset) }));
  }
  ctx.cache.set(abs, out);
  return out;
}

/* ----------------------------------------------------------- resolution -- */

function resolveLink(ctx, pageAbs, href) {
  const bare = href.trim().split(/[?#]/)[0];
  if (!bare) return { state: 'ignored' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(bare) || bare.startsWith('//')) return { state: 'external' };
  let target = bare;
  try { target = decodeURI(bare); } catch { /* keep the raw form */ }
  const literal = target.startsWith('/') ? path.join(ctx.root, target) : path.resolve(path.dirname(pageAbs), target);
  if (ctx.isFile(literal)) return { state: 'ok', abs: literal };
  const mirror = TOKEN_MIRROR.find((p) => target.startsWith(p));
  if (mirror) {
    const mapped = path.join(ctx.root, target.slice(mirror.length));
    if (ctx.isFile(mapped)) return { state: 'ok', abs: mapped, mapped: true };
  }
  if ((ROOT_REFS[ctx.rel(pageAbs)] || []).includes(target)) {
    const mapped = path.join(ctx.root, target);
    if (ctx.isFile(mapped)) return { state: 'ok', abs: mapped, mapped: true };
  }
  return { state: 'unresolved' };
}

function checkCarrier(ctx, carrier, deps) {
  const findings = [];
  const abs = ctx.abs(carrier);
  if (!ctx.isFile(abs)) {
    findings.push({ kind: 'stale-row', carrier, missing: carrier });
    return { report: { carrier, resolves_against: deps, references: 0, misses: 0 }, findings };
  }
  const own = analyze(ctx, abs);
  const defs = new Set();
  for (const dep of deps) {
    if (dep === SELF) { own.defs.forEach((d) => defs.add(d)); continue; }
    const depAbs = ctx.abs(dep);
    if (!ctx.isFile(depAbs)) { findings.push({ kind: 'stale-row', carrier, missing: dep }); continue; }
    analyze(ctx, depAbs).defs.forEach((d) => defs.add(d));
  }
  for (const r of own.refs) {
    if (!defs.has(r.name)) findings.push({ kind: 'miss', context: carrier, file: carrier, line: r.line, name: r.name });
  }
  const misses = findings.filter((f) => f.kind === 'miss').length;
  return { report: { carrier, resolves_against: deps, references: own.refs.length, misses }, findings };
}

function checkPage(ctx, pageAbs, extraDeps) {
  const page = ctx.rel(pageAbs);
  const own = analyze(ctx, pageAbs);
  const defs = new Set(own.defs);
  const sources = [[pageAbs, own]];
  const seen = new Set([pageAbs]);
  const findings = [];
  const loads = [];
  const notLoaded = [];
  for (const link of own.links) {
    const r = resolveLink(ctx, pageAbs, link.href);
    if (r.state === 'ignored') continue;
    if (r.state === 'external') { notLoaded.push(`${link.href} (external)`); continue; }
    if (r.state === 'unresolved') {
      notLoaded.push(`${link.href} (unresolved)`);
      findings.push({ kind: 'unresolved-link', page, line: link.line, href: link.href });
      continue;
    }
    ctx.reached.add(r.abs);
    if (EXCLUDED.has(path.basename(r.abs))) { notLoaded.push(`${ctx.rel(r.abs)} (excluded)`); continue; }
    if (seen.has(r.abs)) continue;
    seen.add(r.abs);
    const a = analyze(ctx, r.abs);
    a.defs.forEach((d) => defs.add(d));
    sources.push([r.abs, a]);
    loads.push(r.mapped ? `${ctx.rel(r.abs)} (mapped from ${link.href})` : ctx.rel(r.abs));
  }
  for (const dep of extraDeps) {
    analyze(ctx, dep).defs.forEach((d) => defs.add(d));
    loads.push(`${ctx.rel(dep)} (--dep, definitions only)`);
  }
  let references = 0;
  for (const [abs, a] of sources) {
    for (const r of a.refs) {
      references++;
      if (!defs.has(r.name)) findings.push({ kind: 'miss', context: page, file: ctx.rel(abs), line: r.line, name: r.name });
    }
  }
  const misses = findings.filter((f) => f.kind === 'miss').length;
  const report = { page, loads, references, misses };
  if (notLoaded.length) report.not_loaded = notLoaded;
  return { report, findings };
}

/* pages: null for the owner set; deps: Map of page rel -> [abs] */
function run(ctx, pages, deps) {
  const findings = [];
  const carrierReports = [];
  let files = null;
  if (pages === null) {
    files = ownerFiles(ctx.root);
    pages = files.filter((f) => f.endsWith('.html'));
    for (const [carrier, row] of Object.entries(DEPENDENCIES)) {
      const r = checkCarrier(ctx, carrier, row);
      carrierReports.push(r.report);
      findings.push(...r.findings);
    }
  }
  const pageReports = pages.map((p) => {
    const r = checkPage(ctx, ctx.abs(p), deps.get(p) || []);
    findings.push(...r.findings);
    return r.report;
  });
  if (files) {
    for (const f of files) {
      if (f.endsWith('.html') || Object.hasOwn(DEPENDENCIES, f) || ctx.reached.has(ctx.abs(f))) continue;
      if (f.endsWith('.css') || analyze(ctx, ctx.abs(f)).refs.length) findings.push({ kind: 'undeclared-carrier', file: f });
    }
  }
  const count = (kind) => findings.filter((f) => f.kind === kind).length;
  const references = carrierReports.reduce((a, r) => a + r.references, 0) + pageReports.reduce((a, r) => a + r.references, 0);
  return {
    mode: files ? 'check' : 'pages',
    files: files ? files.length : undefined,
    carriers: carrierReports.length,
    pages: pageReports.length,
    references,
    misses: count('miss'),
    unresolved_links: count('unresolved-link'),
    undeclared_carriers: count('undeclared-carrier'),
    stale_rows: count('stale-row'),
    clean: findings.length === 0,
    findings,
    carrier_report: carrierReports,
    page_report: pageReports,
  };
}

/* ----------------------------------------------------------- self-test --- */

function selfTest(root) {
  const cases = [];
  const record = (name, pass, expected, got) => cases.push({ case: name, pass, expected, got });
  const missesOf = (r) => r.findings.filter((f) => f.kind === 'miss').map((f) => `${f.file}:${f.line} ${f.name}`);

  {
    const carrier = 'surface-panel.css';
    const ctx0 = makeContext(root);
    const before = missesOf(checkCarrier(ctx0, carrier, DEPENDENCIES[carrier]));
    const injected = `${ctx0.read(ctx0.abs(carrier))}\n.check-custom-properties-self-test { border-radius: var(--radius-2); }\n`;
    const after = missesOf(checkCarrier(makeContext(root, { [carrier]: injected }), carrier, DEPENDENCIES[carrier]));
    const added = after.filter((m) => !before.includes(m));
    record('injected var(--radius-2) is a miss', added.length === 1 && / --radius-2$/.test(added[0]),
      'one added miss: --radius-2', added);
  }
  {
    const f = 'self-test/comment.css';
    const commented = missesOf(checkCarrier(makeContext(root, { [f]: '.a { color: red; }\n/* .b { color: var(--nope); } */\n' }), f, []));
    const control = missesOf(checkCarrier(makeContext(root, { [f]: '.a { color: red; }\n.b { color: var(--nope); }\n' }), f, []));
    record('/* var(--nope) */ is not a reference', commented.length === 0 && control.length === 1,
      'commented: 0 misses; uncommented control: 1', { commented, control });
  }
  {
    const f = 'self-test/fallback.css';
    const withFallback = missesOf(checkCarrier(makeContext(root, { [f]: '.a { margin: var(--nope, 0); }\n' }), f, []));
    const control = missesOf(checkCarrier(makeContext(root, { [f]: '.a { margin: var(--nope); }\n' }), f, []));
    record('var(--nope, 0) is not a reference', withFallback.length === 0 && control.length === 1,
      'with fallback: 0 misses; no-fallback control: 1', { withFallback, control });
  }
  {
    const css = 'self-test/probe.css';
    const js = 'self-test/probe.js';
    const probe = '.a { width: var(--x); }\n';
    const commented = missesOf(checkCarrier(makeContext(root, {
      [css]: probe, [js]: "// el.style.setProperty('--x', '1');\n",
    }), css, [js]));
    const control = missesOf(checkCarrier(makeContext(root, {
      [css]: probe, [js]: "var u = 'https://example.invalid/'; el.style.setProperty('--x', '1');\n",
    }), css, [js]));
    record("JS // setProperty('--x' is not a definition", commented.length === 1 && control.length === 0,
      'commented: 1 miss; live control after a string holding //: 0', { commented, control });
  }
  {
    const carrier = 'evidence-state.css';
    const foundationOnly = missesOf(checkCarrier(makeContext(root), carrier, [FOUNDATION]));
    const declared = missesOf(checkCarrier(makeContext(root), carrier, DEPENDENCIES[carrier]));
    const want = ['evidence-state.css:59 --state-earned', 'evidence-state.css:60 --state-partial', 'evidence-state.css:61 --state-held'];
    record('evidence-state.css: 3 misses against the foundation only, 0 with its declared dependencies',
      JSON.stringify(foundationOnly) === JSON.stringify(want) && declared.length === 0,
      { foundationOnly: want, declared: [] }, { foundationOnly, declared });
  }

  const failed = cases.filter((c) => !c.pass).length;
  console.log(JSON.stringify({ self_test: true, cases, passed: cases.length - failed, failed }, null, 1));
  if (failed) process.exit(1);
}

/* ---------------------------------------------------------------- main --- */

const opts = parseArgs(process.argv.slice(2));
if (opts.selfTest) {
  selfTest(ROOT);
} else {
  const root = opts.root === null ? ROOT : path.resolve(opts.root);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) usage(`--root is not a directory: ${opts.root}`);
  const ctx = makeContext(root);
  const toRel = (p) => {
    const abs = path.isAbsolute(p) ? path.normalize(p) : path.join(root, p);
    return ctx.rel(abs);
  };
  let pages = null;
  let checked;
  if (opts.pages.length) {
    pages = [];
    for (const p of opts.pages) {
      const rel = toRel(p);
      if (path.isAbsolute(rel)) usage(`--page is outside --root: ${p}`);
      if (!/\.html?$/i.test(rel) || !ctx.isFile(ctx.abs(rel))) usage(`--page is not an HTML file under the root: ${p}`);
      if (!pages.includes(rel)) pages.push(rel);
    }
    checked = pages;
  } else {
    checked = ownerFiles(root).filter((f) => f.endsWith('.html'));
  }
  const deps = new Map();
  for (const d of opts.deps) {
    const page = toRel(d.page);
    if (!checked.includes(page)) usage(`--dep names a page this run does not check: ${d.page}`);
    const file = path.isAbsolute(d.file) ? path.normalize(d.file) : path.join(root, d.file);
    if (!ctx.isFile(file)) usage(`--dep file not found: ${d.file}`);
    deps.set(page, [...(deps.get(page) || []), file]);
  }
  const result = run(ctx, pages, deps);
  console.log(JSON.stringify(result, null, 1));
  if (!result.clean) process.exit(1);
}
