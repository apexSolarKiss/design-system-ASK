#!/usr/bin/env node
/* check-radial-neutrality.mjs — the neutrality check of the interactive radial pattern's
   reusable machinery.

     node tools/check-radial-neutrality.mjs                    the owner allowlist
     node tools/check-radial-neutrality.mjs --deny FILE        and a consumer denylist
     node tools/check-radial-neutrality.mjs --self-test        planted controls on this file's own logic

   Prints a JSON report. Exit 0 pass · 1 finding · 2 usage.

   THE TARGET SET is the reusable machinery, declared below by path: the pattern's JavaScript
   modules, its stylesheet, and the shared pointer member. Example content is excluded BY
   DECLARED PATH, because a specimen is meant to carry its own subject's words: the synthetic
   source and its full-stack adapter, the shells that mount them, the specimen generator and the
   README. The reference specimen's files (reference/) are classified separately, each by role:
   captured research data, its adapter.

   COVERAGE. Every file in the pattern directory, and every file under reference/, is a target,
   excluded or classified by declared path; a file that is none of these is a finding, so a new
   machinery file cannot fall outside the check unseen.

   THREE CHECKS
   - Allowlist (a diagnostic). Every word in a string literal of a target file is a word of the
     owner's lexicon: its control labels, default announcements, error messages and the DOM and
     CSS vocabulary it speaks. A new word fails until it is added to LEXICON in a reviewed change,
     which is the point: a consumer's noun cannot enter the machinery's strings unnoticed.
   - Denylist. A consumer's own tokens, one per line in a file supplied from OUTSIDE the owner
     tree (a line /like this/i is a regular expression), must not occur anywhere in a target file:
     code, strings or comments. The owner holds no consumer's vocabulary, so it holds no denylist.
   - No dependence. The machinery names nothing the example content defines: no file of it (by
     its name) and no global it assigns (read from the example scripts themselves). A target that
     loads, requires or reads example content fails, without the owner holding its vocabulary.

   LIMITS — a pass establishes no more than this
   - The allowlist reads string literals only; the denylist reads whole files. Neither proves the
     machinery abstract: the behavioral tests do (renaming everything leaves the geometry
     unchanged; one layout runs every hierarchy shape).
   - The literal scan is lexical, not a parser: comments and strings are recognized; a regular-
     expression literal is read as code.
   - The dependence check reads the globals example scripts assign as window.X, root.X or
     globalThis.X, and matches names as plain text: a global made another way (a var at the top
     level, a computed name) or a path built at run time would pass it. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = 'patterns/diagram-interactive-radial/';
const TARGETS = [
  P + 'diagrams-radial-contract.js', P + 'diagrams-radial-layout.js', P + 'diagrams-radial-labels.js',
  P + 'diagrams-radial-engine.js', P + 'diagrams-radial-legend.js', P + 'diagrams-radial-chrome.js',
  P + 'diagrams-radial-inspector.js', P + 'diagrams-radial-facets.js', P + 'diagrams-radial-export.js', P + 'diagrams-radial-theme.js',
  P + 'diagrams-radial.css',
  'patterns/_diagram-shared/diagrams-pointer.js',
];
/* excluded by declared path, each for its stated reason */
const EXCLUDED = [
  P + 'diagram-interactive-radial.source.js',   // the specimen's data and adapter: example content
  P + 'diagram-interactive-radial.html',        // the reference shell: example content
  P + 'diagram-interactive-radial.neutral.html',        // the synthetic composition's shell: example content
  P + 'diagram-interactive-radial.neutral.adapter.js',  // the synthetic composition's full-stack adapter: example content
  P + 'README.md',                              // the contract's prose, which names its example
  P + 'diagrams-fit.js',                        // the shared Fit helper, byte-identical to its owner copy
  P + 'diagrams-pointer.js',                    // a generated mirror of the scanned canonical
  'tools/gen-radial-specimen.mjs',              // the specimen generator: example content
];

/* the owner's lexicon: every word its machinery strings may use */
/* the reference specimen: captured research content and its adapter, classified by role */
const REFERENCE_DIR = P + 'reference';
const REFERENCE = {
  [P + 'reference/cfw/atlas-data.public.js']: 'captured research data (unchanged input)',
  [P + 'reference/cfw/cfw-reference.adapter.js']: 'the reference adapter: projection, words, fields, facets',
};

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
alone arrangement beside caption compact disclosure expanded indicator panel style surface trigger triggers wide
captured
action actions active applied area autocomplete b back backmax bar base baseline bg blank block blocks body
br busy canonical carrier change charset checkbox claim closed collapse color combobox comparator
countfiltered dasharray dashoffset declare decoration detail details display displayed document dominant dot
drawer effect ellipse en error events everything expand face facet failed families family fetch fg fields
figure fill filter filtering filters fixed flag fonts for format glass ground hanging head heading image img
initial input insp inspectorerror integer kerning labelmax letter ligatures lineargradient linecap linejoin
lines link list listbox locator locked longedge match mean membership miterlimit mono muted nfkd noopener
noreferrer normal notes notoffered null numeric obstacle off offtag opacity opentype opt order otf otto
outside overlap p page paint pairs pixels placeholder plate platelines png polyline position positive prefers
prefix profile radialexport radialexportnotafamily raster ready reason ref reference references refrow regexp
region relations relrow reltype reset result results return rgb rk rl rs rule s sans scheme set shapekey
shapes showing size spacing src stamp status stop stopped stretch stroke strong structured subtitle such
summary swatch system tag toggle tokens tone truetype tspan ttf unavailable unexpected unique utf val value
values variant vector weight with wof woff word xml yields
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

/* every file of the pattern directory, and under reference/, is a target, excluded or classified */
function coverage(names) {
  const known = new Set([...TARGETS, ...EXCLUDED, ...Object.keys(REFERENCE), REFERENCE_DIR]);
  return names.filter((n) => !known.has(n)).map((file) => ({ rule: 'unclassified', file }));
}
function walk(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => !f.startsWith('.')).flatMap((f) => {
    const r = rel + '/' + f;
    return fs.statSync(path.join(ROOT, r)).isDirectory() ? walk(r) : [r];
  });
}
function patternFiles() { return fs.readdirSync(path.join(ROOT, P)).filter((f) => !f.startsWith('.')).map((f) => P + f).concat(walk(REFERENCE_DIR)); }

/* what the example content defines: its file names and the globals its scripts assign */
function exampleNames() {
  const files = EXCLUDED.filter((f) => f.startsWith(P) && !f.endsWith('diagrams-fit.js') && !f.endsWith('diagrams-pointer.js') && !f.endsWith('README.md'))
    .concat(Object.keys(REFERENCE)).filter((f) => fs.existsSync(path.join(ROOT, f)));
  const names = new Set();
  for (const f of files) {
    names.add(path.basename(f));
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of src.matchAll(/\b(?:window|root|globalThis)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) names.add(m[1]);
  }
  names.add('reference/');
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
  const names = exampleNames();
  results.push({ control: 'the example content defines globals the check can read', ok: names.length > 3, names: names.length });
  results.push({ control: 'the owner targets name nothing the example content defines', ok: dependence(files, names).length === 0 });
  const g = names.find((n) => /^[A-Z_]+$/.test(n));
  const reading = files.map(([f, s], i) => [f, i === 3 ? s + '\nvar x = window.' + g + ';\n' : s]);
  results.push({ control: 'a planted read of an example global in a copy of the engine is a dependence', ok: dependence(reading, names).some((x) => x.name === g) });
  const loading = files.map(([f, s], i) => [f, i === 3 ? s + "\nvar u = 'reference/x.js';\n" : s]);
  results.push({ control: 'a planted path into reference/ is a dependence', ok: dependence(loading, names).some((x) => x.name === 'reference/') });
  results.push({ control: 'a file planted under reference/ without a declared role is unclassified',
                 ok: coverage(patternFiles().concat([P + 'reference/cfw/extra.js'])).some((x) => x.rule === 'unclassified') });
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
console.log(JSON.stringify({ targets: TARGETS, excludedByDeclaredPath: EXCLUDED, reference: REFERENCE, exampleNames: names,
  denylist: deny ? deny.length + ' tokens' : 'not supplied', clean: findings.length === 0, findings }, null, 1));
process.exit(findings.length ? 1 : 0);
