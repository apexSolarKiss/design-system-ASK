#!/usr/bin/env node
/* check-radial-neutrality.mjs — the neutrality check of the interactive radial pattern's
   reusable machinery.

     node tools/check-radial-neutrality.mjs                    the owner allowlist
     node tools/check-radial-neutrality.mjs --deny FILE        and a consumer denylist
     node tools/check-radial-neutrality.mjs --self-test        planted controls on this file's own logic

   Prints a JSON report. Exit 0 pass · 1 finding · 2 usage.

   THE TARGET SET is the reusable machinery, declared below by path: the pattern's JavaScript
   modules, its stylesheet, and the shared pointer member. Example content is excluded BY
   DECLARED PATH, because a specimen is meant to carry its own subject's words: the specimen
   source, the shell that mounts it, the specimen generator and the README.

   COVERAGE. Every file in the pattern directory is a target or excluded by declared path; a file
   that is neither is a finding, so a new machinery file cannot fall outside the check unseen.

   TWO CHECKS
   - Allowlist (a diagnostic). Every word in a string literal of a target file is a word of the
     owner's lexicon: its control labels, default announcements, error messages and the DOM and
     CSS vocabulary it speaks. A new word fails until it is added to LEXICON in a reviewed change,
     which is the point: a consumer's noun cannot enter the machinery's strings unnoticed.
   - Denylist. A consumer's own tokens, one per line in a file supplied from OUTSIDE the owner
     tree (a line /like this/i is a regular expression), must not occur anywhere in a target file:
     code, strings or comments. The owner holds no consumer's vocabulary, so it holds no denylist.

   LIMITS — a pass establishes no more than this
   - The allowlist reads string literals only; the denylist reads whole files. Neither proves the
     machinery abstract: the behavioral tests do (renaming everything leaves the geometry
     unchanged; one layout runs every hierarchy shape).
   - The literal scan is lexical, not a parser: comments and strings are recognized; a regular-
     expression literal is read as code. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = 'patterns/diagram-interactive-radial/';
const TARGETS = [
  P + 'diagrams-radial-contract.js', P + 'diagrams-radial-layout.js', P + 'diagrams-radial-labels.js',
  P + 'diagrams-radial-engine.js', P + 'diagrams-radial-legend.js', P + 'diagrams-radial.css',
  'patterns/_diagram-shared/diagrams-pointer.js',
];
/* excluded by declared path, each for its stated reason */
const EXCLUDED = [
  P + 'diagram-interactive-radial.source.js',   // the specimen's data and adapter: example content
  P + 'diagram-interactive-radial.html',        // the specimen shell: example content
  P + 'README.md',                              // the contract's prose, which names its example
  P + 'diagrams-fit.js',                        // the shared Fit helper, byte-identical to its owner copy
  P + 'diagrams-pointer.js',                    // a generated mirror of the scanned canonical
  'tools/gen-radial-specimen.mjs',              // the specimen generator: example content
];

/* the owner's lexicon: every word its machinery strings may use */
const LEXICON = new Set(`
a above adapter all allocation already always an anchor and announce api aria array arrival arrow arrowdown
arrowleft arrowright arrowup at attach auto band be before between blur boolean bottom bound button by
canvas capacity carries census center children chip choose chooser chrome circle clampk class clear cleared
clears click close coarse complete conflict container containers contains contract contracterror control
controls count crowding cycle d dark data declared declares deeper defer deflated defs depth destroy
diagram diagrams dialog diamond dim directed div draw drawn duplicate earned edge edges element empty
emptycontainers end endpoint ends engine enter equal escape every explicit export external facets false
field filenamebase filtered finite first fit float focus focusout font frame framed from function g
gesturestart getview glyph got group h halo has hash hashchange header headings height held here hex hg
hidden hide hole hook host http hud id identifiers idle ids in index inside inspector instance is item
itemmax items its js json k keep key keyboard keydown keys kind kinds l label labelerror labels layout
layouterror lbl leader leaf leaves left legend light limit line listed live load loadingdone loop m map
maps mark marker marks max meaning middle minleaves missing module modules more mount mounted mounterror
mouse move must n name names near needs neutral never no node nodes nomatch non none not note nothing nouns
number object of on one only option options or org out over overview own owner owns pan panels panning
parent partial path pill pinch placed plain plane planes pointer pointercancel pointerdown pointerenter
pointerleave pointermove pointerup polite polygon present preview previous probe profiles proposed px q r
radial raise reachable reader readout record records rect repeated required resize reverse right ring role
roledescription root rotate row scale search section sections select selected selection selects self
setting settings setview shape short show side slot span spectral spine square sr st stage start starts
state states strict string strings structural sub svg sw tab tabindex takes template tested text the theme
this tier tiers title to top total touch transform translate tri true twice txt type undefined undrawn
unknown url use var viewbox visible w weighted wheel when whole width world www x y yield z zoom zoomat
`.split(/\s+/).filter(Boolean));

const USAGE = `usage: check-radial-neutrality.mjs [--deny FILE] | --self-test`;

/* ------------------------------------------------------------ the scan -- */
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
/* words of a literal: unicode escapes and markup-free letters only */
function words(s) { return (s.replace(/\\u[0-9a-fA-F]{4}/g, ' ').replace(/\\./g, ' ').match(/[A-Za-z]+/g) || []).map((w) => w.toLowerCase()); }

/* every file of the pattern directory is a target or declared excluded */
function coverage(names) {
  const known = new Set([...TARGETS, ...EXCLUDED]);
  return names.filter((n) => !known.has(n)).map((file) => ({ rule: 'unclassified', file }));
}
function patternFiles() { return fs.readdirSync(path.join(ROOT, P)).filter((f) => !f.startsWith('.')).map((f) => P + f); }
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

/* ------------------------------------------------------------ run -- */
const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  if (args.length !== 1) { console.error(USAGE); process.exit(2); }
  const files = load(), results = [];
  const base = scan(files, null);
  results.push({ control: 'the owner targets pass the allowlist unplanted', ok: base.length === 0, findings: base.length });
  const planted = files.map(([f, s], i) => [f, i === 1 ? s + "\nvar stray = 'parkland district';\n" : s]);
  const a = scan(planted, null);
  results.push({ control: 'a stray literal planted in a copy of the layout module fails the allowlist', ok: a.some((x) => x.rule === 'allowlist' && x.word === 'parkland') });
  const inComment = files.map(([f, s], i) => [f, i === 1 ? s + '\n/* parkland */\n' : s]);
  results.push({ control: 'a word in a comment is not a string literal', ok: !scan(inComment, null).some((x) => x.word === 'parkland') });
  const deny = [/parkland/i];
  results.push({ control: 'a planted token, comment or code, fails a supplied denylist', ok: scan(inComment, deny).some((x) => x.rule === 'denylist') });
  results.push({ control: 'the unplanted targets pass the same denylist', ok: !scan(files, deny).some((x) => x.rule === 'denylist') });
  results.push({ control: 'the pattern directory is fully classified', ok: coverage(patternFiles()).length === 0 });
  results.push({ control: 'an unclassified file in the pattern directory is a finding',
                 ok: coverage(patternFiles().concat([P + 'diagrams-radial-extra.js'])).some((x) => x.rule === 'unclassified') });
  const css = files.map(([f, s]) => [f, f.endsWith('.css') ? s + '\n.x::after { content: "parkland"; }\n' : s]);
  results.push({ control: 'a stray string planted in the stylesheet fails the allowlist', ok: scan(css, null).some((x) => x.file.endsWith('.css')) });
  const ok = results.every((r) => r.ok);
  console.log(JSON.stringify({ selfTest: true, ok, results }, null, 1));
  process.exit(ok ? 0 : 1);
}
let deny = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--deny' && args[i + 1]) { deny = readDeny(args[++i]); continue; }
  console.error(USAGE); process.exit(2);
}
const findings = coverage(patternFiles()).concat(scan(load(), deny));
console.log(JSON.stringify({ targets: TARGETS, excludedByDeclaredPath: EXCLUDED, denylist: deny ? deny.length + ' tokens' : 'not supplied',
  clean: findings.length === 0, findings }, null, 1));
process.exit(findings.length ? 1 : 0);
