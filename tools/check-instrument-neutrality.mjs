#!/usr/bin/env node
/* check-instrument-neutrality.mjs — the neutrality check of the instrument pattern's reusable
   machinery, after tools/check-radial-neutrality.mjs.

     node tools/check-instrument-neutrality.mjs                the owner allowlist
     node tools/check-instrument-neutrality.mjs --deny FILE    and a consumer denylist
     node tools/check-instrument-neutrality.mjs --self-test    planted controls on this file's own logic

   Prints a JSON report. Exit 0 pass · 1 finding · 2 usage.

   THE TARGET SET is the machinery a consumer vendors: instrument.js and instrument.css. The
   specimen's markup, its example product and the README are excluded BY DECLARED PATH, because a
   specimen is meant to carry its own subject's words.

   COVERAGE. Every file in the pattern directory is a target or excluded by declared path; a file
   that is neither is a finding, so a new machinery file cannot fall outside the check unseen.

   THREE CHECKS
   - Allowlist. Every word in a string literal of a target is a word of the owner's lexicon: its
     frame labels, default text, error messages and the DOM and CSS vocabulary it speaks. A new word
     fails until it is added to LEXICON in a reviewed change.
   - Denylist. A consumer's own tokens, one per line in a file supplied from OUTSIDE the owner tree
     (a line /like this/i is a regular expression), must not occur anywhere in a target: code,
     strings or comments. The owner holds no consumer's vocabulary, so it holds no denylist.
   - No dependence. The machinery names nothing the example defines: no file of it by name and no
     global it assigns (read from the example script).

   LIMITS — a pass establishes no more than this. The allowlist reads string literals only; the
   denylist reads whole files. The literal scan is lexical, not a parser. The dependence check
   reads globals assigned as window.X, root.X or globalThis.X and matches names as plain text. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = 'patterns/instrument/';
const TARGETS = [P + 'instrument.js', P + 'instrument.css'];
/* excluded by declared path, each for its stated reason */
const EXCLUDED = [
  P + 'instrument.template.html',   // the specimen's markup and copy: example content
  P + 'instrument.example.js',      // the example product: example content
  P + 'README.md',                  // the contract's prose, which names its example
];
const EXAMPLE = [P + 'instrument.template.html', P + 'instrument.example.js'];

/* the owner's lexicon: every word its machinery strings may use */
const LEXICON = new Set(`
a aria bar browser busy canvas change click closed could d data did docked dppx encode encoding error escape expanded
export false finish four frame free fullscreen fullscreenchange head height image input inst instrument keydown lock
make none noopener not null open over panel pin png px radio refused resize resolution rgba saves source square stage
strict string the three true type undefined use view webkitfullscreenchange wide widescreen width window x
`.split(/\s+/).filter(Boolean));

const USAGE = 'usage: check-instrument-neutrality.mjs [--deny FILE] | --self-test';

/* the string literals of a script, lexically: comments are skipped, escapes kept as written */
function literals(src) {
  const out = []; let i = 0, line = 1;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') { s += src[j] + src[j + 1]; j += 2; continue; } if (src[j] === '\n') line++; s += src[j]; j++; }
      out.push({ text: s, line }); i = j + 1; continue;
    }
    i++;
  }
  return out;
}
function cssStrings(src) {
  const out = [], clean = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const re = /(["'])((?:\\.|(?!\1).)*)\1/g; let m;
  while ((m = re.exec(clean))) out.push({ text: m[2], line: clean.slice(0, m.index).split('\n').length });
  return out;
}
function words(s) { return (s.replace(/\\u[0-9a-fA-F]{4}/g, ' ').replace(/\\./g, ' ').match(/[A-Za-z]+/g) || []).map((w) => w.toLowerCase()); }

function coverage(names) {
  const known = new Set([...TARGETS, ...EXCLUDED]);
  return names.filter((n) => !known.has(n)).map((file) => ({ rule: 'unclassified', file }));
}
function patternFiles() { return fs.readdirSync(path.join(ROOT, P)).filter((f) => !f.startsWith('.')).map((f) => P + f); }
function exampleNames() {
  const names = new Set();
  for (const f of EXAMPLE) {
    names.add(path.basename(f));
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of src.matchAll(/\b(?:window|root|globalThis)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) names.add(m[1]);
  }
  return [...names];
}
function dependence(files, names) {
  const out = [];
  for (const [file, src] of files) src.split('\n').forEach((text, i) => {
    for (const nm of names) if (text.includes(nm)) out.push({ rule: 'dependence', file, line: i + 1, name: nm });
  });
  return out;
}
function scan(files, deny) {
  const findings = [];
  for (const [file, src] of files) {
    const lits = file.endsWith('.css') ? cssStrings(src) : literals(src);
    for (const l of lits) for (const w of words(l.text))
      if (!LEXICON.has(w)) findings.push({ rule: 'allowlist', file, line: l.line, word: w, literal: l.text.slice(0, 60) });
    if (deny) src.split('\n').forEach((text, i) => {
      for (const t of deny) if (t.test(text)) findings.push({ rule: 'denylist', file, line: i + 1, token: String(t) });
    });
  }
  return findings;
}
function readDeny(file) {
  return fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const m = /^\/(.+)\/([a-z]*)$/.exec(l);
    return m ? new RegExp(m[1], m[2]) : new RegExp(l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  });
}
function load() {
  return TARGETS.map((f) => {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) { console.error(`target missing: ${f}`); process.exit(2); }
    return [f, fs.readFileSync(p, 'utf8')];
  });
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  if (args.length !== 1) { console.error(USAGE); process.exit(2); }
  const files = load(), results = [];
  results.push({ control: 'the owner targets pass the allowlist unplanted', ok: scan(files, null).length === 0 });
  const planted = files.map(([f, s], i) => [f, i === 0 ? s + "\nvar stray = 'harbor lighthouse';\n" : s]);
  results.push({ control: 'a stray literal planted in a copy of the script fails the allowlist', ok: scan(planted, null).some((x) => x.rule === 'allowlist' && x.word === 'harbor') });
  const inComment = files.map(([f, s], i) => [f, i === 0 ? s + '\n/* harbor */\n' : s]);
  results.push({ control: 'a word in a comment is not a string literal', ok: !scan(inComment, null).some((x) => x.word === 'harbor') });
  const deny = [/harbor/i];
  results.push({ control: 'a planted token, comment or code, fails a supplied denylist', ok: scan(inComment, deny).some((x) => x.rule === 'denylist') });
  results.push({ control: 'the unplanted targets pass the same denylist', ok: !scan(files, deny).some((x) => x.rule === 'denylist') });
  const css = files.map(([f, s]) => [f, f.endsWith('.css') ? s + '\n.x::after { content: "harbor"; }\n' : s]);
  results.push({ control: 'a stray string planted in the stylesheet fails the allowlist', ok: scan(css, null).some((x) => x.file.endsWith('.css')) });
  results.push({ control: 'the pattern directory is fully classified', ok: coverage(patternFiles()).length === 0 });
  results.push({ control: 'an unclassified file in the pattern directory is a finding', ok: coverage(patternFiles().concat([P + 'instrument-extra.js'])).some((x) => x.rule === 'unclassified') });
  const names = exampleNames();
  results.push({ control: 'the example defines a global the check can read', ok: names.includes('instrumentSpecimen'), names });
  results.push({ control: 'the owner targets name nothing the example defines', ok: dependence(files, names).length === 0 });
  const reading = files.map(([f, s], i) => [f, i === 0 ? s + '\nvar x = window.instrumentSpecimen;\n' : s]);
  results.push({ control: 'a planted read of the example global in a copy of the script is a dependence', ok: dependence(reading, names).some((x) => x.name === 'instrumentSpecimen') });
  const ok = results.every((r) => r.ok);
  console.log(JSON.stringify({ selfTest: true, ok, results }, null, 1));
  process.exit(ok ? 0 : 1);
}
let deny = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--deny' && args[i + 1]) { deny = readDeny(args[++i]); continue; }
  console.error(USAGE); process.exit(2);
}
const loaded = load(), names = exampleNames();
const findings = coverage(patternFiles()).concat(scan(loaded, deny)).concat(dependence(loaded, names));
console.log(JSON.stringify({ targets: TARGETS, excludedByDeclaredPath: EXCLUDED, exampleNames: names,
  denylist: deny ? deny.length + ' tokens' : 'not supplied', clean: findings.length === 0, findings }, null, 1));
process.exit(findings.length ? 1 : 0);
