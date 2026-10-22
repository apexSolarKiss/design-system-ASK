#!/usr/bin/env node
/* export-peer.mjs — the standalone files of the static peer-relation pattern.

   design-system-ASK Class A static scaffold `diagram-static-peer`. DS-owned: re-vendor byte-identical.
   Node 18 or later, no dependency. Run it beside the vendored bundle:

     node export-peer.mjs --out <dir>              every spec: art plate and keyed, light and dark, SVG
     node export-peer.mjs --out <dir> --png        the same, plus a PNG of each SVG

     --tokens <file>        the foundation token file colors and type resolve from
                            (default: _dsa-tokens/colors_and_type.css beside this script)
     --source <file>        the relation sources (default: diagram-static-peer.source.js beside it)
     --spec <id>            export only this spec; repeat for more
     --arrowheads <where>   target (default, the canonical presentation) | midpoint
     --png                  rasterize each SVG with headless Chrome or Chromium
     --chrome <path>        the browser to use (else $CHROME, else the platform's usual paths)
     --scale <n>            PNG pixels per SVG unit, 1 to 4 (default 1)

   Each SVG is named <spec>_<plate|keyed>-<light|dark>.svg, and its element ids take a prefix of its
   own, so files exported together can be inlined on one page. Its colors, font family and weights are
   the values of --bg-from, --bg-to, --fg-1, --font-sans, --fw-extralight and --fw-regular in the token
   file, for each theme, resolved now: the file records the token file's sha256 and freezes them. It
   embeds the Inter subset from diagrams-static-peer-font.js and carries Inter's copyright and the SIL
   Open Font License text in <metadata>. Every spec it exports is validated before any file is written,
   and a spec id given twice is an error, as are two ids that differ only in letter case, whose files a
   file system that ignores case would store as one. In one runtime the SVG is a pure function of the
   spec, the options, the token file and the carriers: two runs write the same bytes. A PNG is the
   browser's rendering of that SVG at its own size times --scale.

   Prints a JSON report. Exit 0 written · 1 failure · 2 usage. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

const USAGE = `usage: export-peer.mjs --out <dir> [--tokens <file>] [--source <file>] [--spec <id>]...
                      [--arrowheads target|midpoint] [--png] [--chrome <path>] [--scale <n>]`;
function usage(message) { console.error(`${message}\n${USAGE}`); process.exit(2); }

function parseArgs(args) {
  const o = { out: null, tokens: path.join(here, '_dsa-tokens', 'colors_and_type.css'),
    source: path.join(here, 'diagram-static-peer.source.js'), specs: [], arrowheads: 'target',
    png: false, chrome: null, scale: 1 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const value = () => { const v = args[++i]; if (v === undefined || v.startsWith('--')) usage(`${a} needs a value`); return v; };
    if (a === '--out') o.out = value();
    else if (a === '--tokens') o.tokens = value();
    else if (a === '--source') o.source = value();
    else if (a === '--spec') o.specs.push(value());
    else if (a === '--arrowheads') o.arrowheads = value();
    else if (a === '--png') o.png = true;
    else if (a === '--chrome') o.chrome = value();
    else if (a === '--scale') o.scale = Number(value());
    else usage(`unknown argument: ${a}`);
  }
  if (!o.out) usage('--out is required');
  if (o.arrowheads !== 'target' && o.arrowheads !== 'midpoint') usage('--arrowheads is target or midpoint');
  if (!(Number.isInteger(o.scale) && o.scale >= 1 && o.scale <= 4)) usage('--scale is a whole number from 1 to 4');
  return o;
}

/* ---------------------------------------------------------------- token resolution

   The token file declares the light values on the rule whose selector is :root, and the dark overrides
   on the rule whose selector list includes :root[data-theme="dark"]; the prefers-color-scheme block
   repeats the dark values for a page that sets no theme, so rules inside an at-rule are not read. The
   dark rule must itself declare the field and the ink: a dark file never borrows a light value. Every
   needed name must resolve, through var() references, to a value with no var() left in it. Unbalanced
   braces, an unclosed comment, a missing name or a cycle is an error, never a guess. */
const NEEDED = ['--bg-from', '--bg-to', '--fg-1', '--font-sans', '--fw-extralight', '--fw-regular'];
const DARK_DECLARES = ['--bg-from', '--bg-to', '--fg-1'];
const DARK_SELECTOR = ':root[data-theme="dark"]';

function topLevelRules(css) {
  if (/\/\*(?![\s\S]*?\*\/)/.test(css)) throw new Error('the token file has an unclosed comment');
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let depth = 0, start = 0, open = 0, selector = null;
  for (let k = 0; k < text.length; k++) {
    if (text[k] === '{') {
      if (depth === 0) { selector = text.slice(start, k).trim(); open = k + 1; }
      depth++;
    } else if (text[k] === '}') {
      depth--;
      if (depth < 0) throw new Error('the token file closes a block it never opened');
      if (depth === 0) { rules.push({ selector, body: text.slice(open, k) }); start = k + 1; }
    }
  }
  if (depth !== 0) throw new Error('the token file leaves a block unclosed');
  return rules;
}

function declarations(body, into) {
  for (const part of body.split(';')) {
    const m = part.match(/^\s*(--[A-Za-z0-9_-]+)\s*:\s*([\s\S]*?)\s*$/);
    if (m) into[m[1]] = m[2];
  }
}

export function readThemes(css) {
  const light = Object.create(null), dark = Object.create(null);
  for (const r of topLevelRules(css)) {
    if (r.selector.startsWith('@')) continue;
    const list = r.selector.split(',').map((x) => x.trim());
    if (r.selector === ':root') declarations(r.body, light);
    else if (list.includes(DARK_SELECTOR)) declarations(r.body, dark);
  }
  for (const n of DARK_DECLARES) if (!(n in dark)) throw new Error(`the dark theme does not declare ${n} on ${DARK_SELECTOR}`);
  const resolve = (name, scope, seen = new Set()) => {
    if (seen.has(name)) throw new Error(`token cycle at ${name}`);
    seen.add(name);
    const raw = name in scope ? scope[name] : light[name];
    if (raw === undefined || raw === '') throw new Error(`token ${name} is not declared`);
    return raw.replace(/var\((--[A-Za-z0-9_-]+)\)/g, (m, ref) => resolve(ref, scope, new Set(seen)));
  };
  const theme = (name, scope) => {
    const v = Object.fromEntries(NEEDED.map((n) => [n, resolve(n, scope)]));
    for (const [n, value] of Object.entries(v)) if (/var\(/.test(value)) throw new Error(`token ${n} keeps an unresolved reference: ${value}`);
    return {
      name, fieldFrom: v['--bg-from'], fieldTo: v['--bg-to'], ink: v['--fg-1'], fontFamily: v['--font-sans'],
      labelWeight: Number(v['--fw-extralight']), keyWeight: Number(v['--fw-regular']),
    };
  };
  return { light: theme('light', light), dark: theme('dark', Object.assign(Object.create(null), light, dark)) };
}

/* ---------------------------------------------------------------- the browser for --png */

function findChrome(explicit) {
  const tried = [];
  const candidates = [];
  if (explicit) candidates.push(explicit);
  else {
    if (process.env.CHROME) candidates.push(process.env.CHROME);
    if (process.platform === 'darwin') {
      candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium');
    } else if (process.platform === 'win32') {
      for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean)) {
        candidates.push(path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(base, 'Chromium', 'Application', 'chrome.exe'));
      }
    } else {
      for (const dir of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
        for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) candidates.push(path.join(dir, name));
      }
    }
  }
  for (const c of candidates) {
    tried.push(c);
    try { if (fs.statSync(c).isFile()) return c; } catch (e) { /* not here */ }
  }
  throw new Error(`--png needs Chrome or Chromium: pass --chrome <path> or set $CHROME (tried: ${tried.join(', ') || 'nothing'})`);
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(12) !== 0x49484452) throw new Error(`${file} is not a PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/* ---------------------------------------------------------------- export */

function main() {
  const o = parseArgs(process.argv.slice(2));
  const ENGINE = require(path.join(here, 'diagrams-static-peer-engine.js'));
  const GLYPHS = require(path.join(here, 'diagrams-static-peer-glyphs.js'));
  const FONT = require(path.join(here, 'diagrams-static-peer-font.js'));
  const specs = require(path.resolve(o.source));
  if (!Array.isArray(specs)) throw new Error(`${o.source} does not export an array of specs`);
  const tokenBytes = fs.readFileSync(o.tokens);
  const themes = readThemes(tokenBytes.toString('utf8'));
  const chosen = o.specs.length ? o.specs.map((id) => {
    const s = specs.find((x) => x && x.id === id);
    if (!s) throw new Error(`no spec "${id}" in ${o.source}`);
    return s;
  }) : specs;

  // Every spec is validated, a repeated id refused, and the planned file names compared with letter case
  // ignored, before anything is written: each failure writes nothing. A later failure (no browser for
  // --png, a full disk) leaves the files already written.
  const problems = [];
  const seen = new Set();
  chosen.forEach((spec, i) => {
    const v = ENGINE.validate(spec, GLYPHS);
    const name = spec && typeof spec.id === 'string' ? spec.id : `#${i}`;
    if (!v.ok) problems.push(`${name}: ${v.errors.map((e) => `${e.code} ${e.path}`).join(', ')}`);
    else if (seen.has(spec.id)) problems.push(`${name}: the spec id is given twice`);
    seen.add(spec && spec.id);
  });
  if (problems.length) throw new Error(`nothing written; ${problems.join('; ')}`);

  const jobs = [];
  for (const spec of chosen) {
    for (const keyed of [false, true]) {
      for (const name of ['light', 'dark']) {
        const kind = keyed ? 'keyed' : 'plate';
        const metadata = `design-system-ASK diagram-static-peer // ${spec.id} // ${kind} // ${name} // arrowheads at ${o.arrowheads}. `
          + `Colors and type resolved from ${path.basename(o.tokens)} (sha256 ${sha256(tokenBytes)}). `
          + `Letters and key set in ${FONT.family}, embedded as a subset of ${FONT.source.path} (subset sha256 ${FONT.subset.sha256}) `
          + `under the SIL Open Font License 1.1; the license follows.\n\n${FONT.license}`;
        const svg = ENGINE.render(spec, {
          glyphs: GLYPHS, theme: themes[name], keyed, arrowheads: o.arrowheads,
          idPrefix: ENGINE.idPrefixFor(`${spec.id}.${kind}.${name}`), fontFaceCSS: FONT.css, metadata,
        });
        jobs.push({ id: spec.id, file: path.join(o.out, `${spec.id}_${kind}-${name}.svg`), keyed,
          bytes: Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n' + svg + '\n', 'utf8') });
      }
    }
  }
  // A file system that ignores letter case, as macOS's and Windows' do by default, stores two names that
  // differ only in case as one file: the later write would replace the earlier while the report listed
  // both. Spec ids are ASCII, so lower-casing is the whole comparison; each PNG takes its SVG's name with
  // .png, so the SVG names stand for every name the run writes.
  const firstByName = new Map(), clashes = new Map();
  for (const j of jobs) {
    const base = path.basename(j.file), key = base.toLowerCase(), first = firstByName.get(key);
    if (!first) firstByName.set(key, { id: j.id, base });
    else if (!clashes.has(`${first.id}\n${j.id}`)) {
      clashes.set(`${first.id}\n${j.id}`, `${first.id} and ${j.id} differ only in letter case, and a file system `
        + `that ignores case would store their files as one (${first.base}, ${base})`);
    }
  }
  if (clashes.size) throw new Error(`nothing written; ${[...clashes.values()].join('; ')}`);
  fs.mkdirSync(o.out, { recursive: true });
  const written = jobs.map((j) => { fs.writeFileSync(j.file, j.bytes); return { file: j.file, keyed: j.keyed, bytes: j.bytes.length, sha256: sha256(j.bytes) }; });

  const pngs = [];
  if (o.png) {
    const chrome = findChrome(o.chrome);
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'export-peer-'));
    try {
      for (const w of written) {
        const out = w.file.replace(/\.svg$/, '.png');
        fs.rmSync(out, { force: true });
        const height = ENGINE.GEOMETRY.size + (w.keyed ? ENGINE.GEOMETRY.keyBand : 0);
        execFileSync(chrome, [
          '--headless=new', `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--disable-gpu',
          '--hide-scrollbars', '--force-color-profile=srgb', `--force-device-scale-factor=${o.scale}`,
          `--window-size=${ENGINE.GEOMETRY.size},${height}`, '--virtual-time-budget=2000',
          `--screenshot=${out}`, pathToFileURL(w.file).href,
        ], { stdio: 'ignore' });
        const size = pngSize(out);
        if (size.width !== ENGINE.GEOMETRY.size * o.scale || size.height !== height * o.scale) {
          throw new Error(`${out} is ${size.width} × ${size.height}, expected ${ENGINE.GEOMETRY.size * o.scale} × ${height * o.scale}`);
        }
        pngs.push({ file: out, ...size });
      }
    } finally {
      fs.rmSync(profile, { recursive: true, force: true });
    }
  }
  console.log(JSON.stringify({ tokens: { file: o.tokens, sha256: sha256(tokenBytes) }, themes, svg: written.map(({ keyed, ...w }) => w), png: pngs }, null, 2));
}

// Run when invoked as a script, by whatever path: a symlinked directory still names this file.
const invoked = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch (e) { return false; } })();
if (invoked) {
  try { main(); } catch (e) { console.error(`export-peer: ${e.message}`); process.exit(1); }
}
