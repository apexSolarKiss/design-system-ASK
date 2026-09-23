#!/usr/bin/env node
/* check-type-roles.mjs
   Fails when typography in the governed set leaves the role system.

     node tools/check-type-roles.mjs --check
         every governed stylesheet and page
     node tools/check-type-roles.mjs --self-test
         in-memory controls on this file's own logic

   Prints a JSON report. Exit 0 pass · 1 finding · 2 usage.

   GOVERNED SET — one explicit list, no auto-discovery (GOVERNED below): the
   foundation, the live-surface and document modules, the surface-shell
   stylesheet, the three primitive keys, the document-register key, the style
   guide and the two public indexes. A governed file that is missing fails.
   Outside the set by declared disposition, because they own pattern-local
   metrics or are fixtures: the diagram scaffolds, the interactive spine, the
   message archive, the output artifact, and tests/. Any other file is not
   read, so a pass says nothing about it.

   WHAT IS READ
   - Declarations in a stylesheet, in a page's <style> blocks, and in style=""
     attributes. Comments are removed first: block comments in stylesheets and
     <style>, `<!-- -->` in pages. Script bodies are not read.
   - A rule's selector list is split; each selector is checked on its own.
     @media, @supports, @container and @layer blocks are descended; @keyframes
     steps are read as rules; @font-face and other descriptor blocks are not
     properties and are skipped.
   - A style="" attribute is a rule whose subject is its own element.

   RULES
   R1  font-size is var(--fs-<step>) naming a step the foundation defines,
       inherit, or a registered literal. The font shorthand is allowed only as
       `font: inherit`.
   R2  letter-spacing is var(--tracking-<name>) naming a token the foundation
       defines, 0, normal, inherit, or a registered literal.
   R3  A rule whose subject is h1–h6 or [role="heading"] never sets the Caption
       size or uppercase: a heading is never a small uppercase label.
   R4  An h1–h6 or role="heading" element never carries a label or control
       class (LABEL_CLASSES).
   R5  Mono set in uppercase appears only on a registered selector
       (MONO_UPPERCASE): uppercase mono is an operative label, never prose.
   R6  Uppercase with letter-spacing takes its register's token: mono
       var(--tracking-wide), Inter var(--tracking-caption). A departure passes
       only as a registered exception carrying its reason
       (TRACKING_EXCEPTIONS).
   R7  The document-register lock (ROLE_MATRIX). In surface-document.css each
       role is declared by exactly one rule that sets its size, and every rule
       on that exact selector declares only its matrix family, size, weight,
       leading, tracking and foreground. Independently of the matrix: document
       body, lede and quotation text sit on --fs-body; no heading role is
       declared smaller than document body; no other rule that targets a
       quotation sets a type metric; each passage rail is declared by exactly
       one rule, which sets the rail only through border-left and
       padding-left (and its accent), and no other rule on a
       quotation or block sets a rail — a rule that names one only inside
       :is(), :where(), :not() or :has() may remove a rail, never draw or
       recolor one; .surface-emphasis-rail keeps its registered magenta accent
       (EMPHASIS_RAIL_ACCENT); both passage rails take its GEOMETRY (width,
       style, inset) and its border in the same words, the block rail also its
       magenta accent, and the quotation rail the registered violet accent
       (QUOTE_RAIL_ACCENT), which .surface-emphasis--violet binds in the same
       words, and which tools/role-conformance.js pins for rendered pages, as
       it pins an emphasis rail on document text — the authorial callout — to
       EMPHASIS_RAIL_ACCENT alone and any other emphasis rail to the three
       sanctioned accents — each role's color is pinned, and no role is
       required to share another's; .doc-hierarchy is declared by exactly one
       rail rule, the registered 1px neutral hierarchy rail (HIERARCHY_RAIL),
       and no other rule on it sets a rail; the matrix
       tools/role-conformance.js checks rendered pages against equals this
       one; and its link-state matrix (LINK_STATES) equals the rest, hover and
       focus-visible declarations of surface-text-link.css.
       The rendered half — which elements carry which role, and how each link
       behaves under a real pointer and real keyboard focus — is
       tools/role-conformance.js with tools/check-role-conformance.mjs.
   A registration that matches no rule in a governed file that exists fails
   as stale, so a registration cannot outlive the rule it excuses.

   HOW A RULE'S FAMILY IS CLASSIFIED (R5, R6)
   - The rule's own font-family; else the font-family of a rule with the
     identical selector in the same source (one stylesheet, or all of one
     page's <style> blocks); else Inter, the family the foundation sets on
     html and body. A mono role declares its family.
   - Mono is var(--font-mono) or a stack naming a monospace family; anything
     else is Inter.

   LIMITS — a pass establishes no more than this
   - Static and per rule: no cascade, no specificity, no inheritance. A rule
     that sets no family but inherits mono from an ancestor rule is classified
     Inter; uppercase that arrives by inheritance is not seen.
   - The subject of a selector is its last compound; a heading reached only
     through :is() or :where() is not recognized.
   - Typography set by a script, and SVG presentation attributes, are not read.
   - Text that is uppercase in its source characters carries no
     text-transform and is not a subject of R5 or R6.
   - The comment scan is lexical, not a parser.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOUNDATION = 'colors_and_type.css';

const GOVERNED = [
  FOUNDATION,
  'surface-panel.css',
  'surface-action.css',
  'surface-text-link.css',
  'surface-document.css',
  'surface-treatments.css',
  'patterns/surface-shell/surface-shell.css',
  'three-functions.html',
  'spectral-state.html',
  'evidence-state.html',
  'surface-document.html',
  'preview/styleguide.html',
  'index.html',
  'patterns/index.html',
];

/* R1 and R2: literals that stand for a role rather than departing from one.
   Each is registered to the exact file and selector that carries it. */
const REGISTERED_SIZE = [
  ...['code', 'kbd', 'pre', 'samp', '.mono', '[data-mono]'].map((selector) => (
    { file: FOUNDATION, selector, value: '0.9em', reason: 'code and technical text are 0.9x their host' })),
  { file: 'surface-document.css', selector: '.doc-code', value: '0.9em', reason: 'code is 0.9x the document role that hosts it' },
];
const REGISTERED_TRACKING = [];

/* R4 */
const LABEL_CLASSES = ['caption', 'doc-label', 'doc-meta', 'surface-badge', 'surface-action', 'surface-emphasis-chip'];

/* R5: every selector allowed to set mono in uppercase, with its role. The key
   pages' .sub and .arc-label are page-local names. */
const MONO_UPPERCASE = [
  { file: 'patterns/surface-shell/surface-shell.css', selector: '.surface-badge', reason: 'status badge' },
  { file: 'surface-document.css', selector: '.doc-label', reason: 'operative label' },
  { file: 'surface-document.css', selector: '.doc-pre[data-overflow]::after', reason: 'overflow cue' },
  { file: 'surface-treatments.css', selector: '.surface-disclosure > summary', reason: 'disclosure trigger' },
  { file: 'surface-treatments.css', selector: '.surface-emphasis-chip', reason: 'emphasis chip' },
  { file: 'preview/styleguide.html', selector: '.role .lbl', reason: 'token label in the style guide (page-local)' },
  ...['three-functions.html', 'spectral-state.html', 'evidence-state.html'].flatMap((file) => [
    { file, selector: '.sub', reason: 'version and scope label of a primitive key (page-local)' },
    { file, selector: '.arc-label', reason: 'group label of a primitive key (page-local)' },
  ]),
];

/* R6: departures from a register's tracking token, each with its reason. */
const TRACKING_EXCEPTIONS = [
  {
    file: 'preview/styleguide.html', selector: '.badge', value: 'var(--tracking-wide)',
    reason: 'The style guide\'s .badge component specimen is Inter, uppercase, at --tracking-wide. It is neither the Caption role nor a mono operative label, and it is not a precedent for either register.',
  },
];

/* R7: the document-register lock. One row per role; values are the exact
   declarations surface-document.css must carry. tools/role-conformance.js holds
   the same matrix in token names for rendered pages. */
const DOCUMENT = 'surface-document.css';
const TREATMENTS = 'surface-treatments.css';
const SANS = 'var(--font-sans)';
const MONO = 'var(--font-mono)';
const ROLE_MATRIX = [
  { selector: '.doc-title',            family: SANS, size: 'var(--fs-h1)',      weight: 'var(--fw-regular)',    lh: 'var(--lh-heading)', tracking: 'var(--tracking-tight)',  color: 'var(--fg-1)', heading: true },
  { selector: '.doc-section-title',    family: SANS, size: 'var(--fs-h2)',      weight: 'var(--fw-regular)',    lh: 'var(--lh-heading)', tracking: 'var(--tracking-tight)',  color: 'var(--fg-1)', heading: true },
  { selector: '.doc-subsection-title', family: SANS, size: 'var(--fs-h3)',      weight: 'var(--fw-light)',      lh: 'var(--lh-heading)', tracking: 'var(--tracking-tight)',  color: 'var(--fg-1)', heading: true },
  { selector: '.doc-deep-title',       family: SANS, size: 'var(--fs-body)',    weight: 'var(--fw-medium)',     lh: 'var(--lh-heading)', tracking: 'var(--tracking-normal)', color: 'var(--fg-1)', heading: true },
  { selector: '.doc-body',             family: SANS, size: 'var(--fs-body)',    weight: 'var(--fw-extralight)', lh: 'var(--lh-body)',    tracking: 'var(--tracking-normal)', color: 'var(--fg-1)', body: true },
  { selector: '.doc-lede',             family: SANS, size: 'var(--fs-body)',    weight: 'var(--fw-extralight)', lh: 'var(--lh-body)',    tracking: 'var(--tracking-normal)', color: 'var(--fg-1)', body: true },
  { selector: '.doc-entry-title',      family: SANS, size: 'var(--fs-body)',    weight: 'var(--fw-light)',      lh: 'var(--lh-body)',    tracking: 'var(--tracking-normal)', color: 'var(--fg-1)' },
  { selector: '.doc-quote > p',        family: SANS, size: 'var(--fs-body)',    weight: 'var(--fw-extralight)', lh: 'var(--lh-body)',    tracking: 'var(--tracking-normal)', color: 'var(--fg-1)', body: true },
  { selector: '.doc-quote > footer',   family: MONO, size: 'var(--fs-caption)', weight: 'var(--fw-light)',      lh: '1.4',               tracking: 'var(--tracking-wide)',   color: 'var(--fg-3)' },
  { selector: '.doc-label',            family: MONO, size: 'var(--fs-caption)', weight: 'var(--fw-light)',      lh: 'var(--lh-tight)',   tracking: 'var(--tracking-wide)',   color: 'var(--fg-3)' },
  { selector: '.doc-meta',             family: MONO, size: 'var(--fs-caption)', weight: 'var(--fw-light)',      lh: '1.4',               tracking: 'var(--tracking-wide)',   color: 'var(--fg-3)' },
  { selector: '.doc-pre',              family: MONO, size: 'var(--fs-small)',   weight: 'var(--fw-light)',      lh: 'var(--lh-body)',    tracking: 'var(--tracking-normal)', color: 'var(--fg-1)' },
  { selector: '.doc-toc-link',         family: MONO, size: 'var(--fs-small)',   weight: 'var(--fw-light)',      lh: 'var(--lh-tight)',   tracking: 'var(--tracking-tight)',  color: 'var(--fg-1)' },
  { selector: '.doc-table-cell',       family: MONO, size: 'var(--fs-small)',   weight: 'var(--fw-light)',      lh: 'var(--lh-body)',    tracking: 'var(--tracking-normal)', color: 'var(--fg-1)' },
];
const ROLE_PROPS = { family: 'font-family', size: 'font-size', weight: 'font-weight', lh: 'line-height', tracking: 'letter-spacing', color: 'color' };
const PASSAGE_SELECTORS = ['.doc-quote', '.doc-pre'];
const RAIL_PROPS = /^(border-left(-width|-style|-color)?|border|border-width|border-style|border-color|padding-left|padding|--surface-emphasis-accent)$/;
/* The quotation rail's accent: the emphasis violet, represented voice,
   registered here so a change to it is a reviewed change to this checker. The
   neutral quotation rail (--line-1) is retired: too faint to read as a
   boundary. */
const QUOTE_RAIL_ACCENT = 'var(--ask-emphasis-violet)';
/* The emphasis rail's registered accent is magenta. On document text it is the
   authorial callout and stays magenta; on any other emphasis rail an accent
   modifier may name violet or cyan (TREATMENT_RAIL_ACCENTS). */
const EMPHASIS_RAIL_ACCENT = 'var(--ask-emphasis-magenta)';
const TREATMENT_RAIL_ACCENTS = ['var(--ask-emphasis-magenta)', 'var(--ask-emphasis-violet)', 'var(--ask-emphasis-cyan)'];
/* The hierarchy rail: one level beneath a line, neutral and thinner than a
   passage rail. */
const HIERARCHY = '.doc-hierarchy';
const HIERARCHY_RAIL = { border: '1px solid var(--line-2)', inset: 'var(--space-4)' };
const RENDERED_MATRIX = 'tools/role-conformance.js';
const TEXT_LINK = 'surface-text-link.css';
/* A class token in a selector outside :is() / :where() / :not() / :has(). */
const outsidePseudo = (selector) => { let t = selector; for (let k = 0; k < 4; k++) t = t.replace(/:(is|where|not|has)\([^()]*\)/g, ''); return t; };
const hasClass = (selector, cls) => new RegExp('\\.' + cls + '(?![\\w-])').test(outsidePseudo(selector));

const HEADING_TAG = /^h[1-6]$/;

/* ------------------------------------------------------------ arguments -- */

const USAGE = `usage: check-type-roles.mjs --check
       check-type-roles.mjs --self-test`;

function usage(message) {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

function parseArgs(args) {
  const opts = { check: false, selfTest: false };
  const unknown = [];
  for (const a of args) {
    if (a === '--check') opts.check = true;
    else if (a === '--self-test') opts.selfTest = true;
    else unknown.push(a);
  }
  if (unknown.length) usage(`unknown argument(s): ${unknown.join(' ')}`);
  if (opts.check && opts.selfTest) usage('give --check or --self-test, not both');
  if (!opts.check && !opts.selfTest) usage('nothing to do: give --check or --self-test');
  return opts;
}

/* ------------------------------------------------------------- reading --- */

/* Every read goes through a context, so the self-test can lay in-memory
   bytes over the repository without writing anything. A null overlay entry
   removes a file. */
function makeContext(root, overlay = {}) {
  const memory = new Map(Object.entries(overlay));
  return {
    exists: (rel) => (memory.has(rel) ? memory.get(rel) !== null : fs.existsSync(path.join(root, ...rel.split('/')))),
    read: (rel) => (memory.has(rel) ? memory.get(rel) : fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8')),
  };
}

function blank(chars, from, to) {
  for (let k = from; k < to; k++) if (chars[k] !== '\n') chars[k] = ' ';
}

/* index just past a quoted string starting at i */
function endOfQuoted(src, i) {
  const q = src[i];
  let k = i + 1;
  while (k < src.length) {
    if (src[k] === '\\') { k += 2; continue; }
    if (src[k] === q) return k + 1;
    k++;
  }
  return k;
}

function stripCss(src) {
  const chars = src.split('');
  let i = 0;
  while (i < src.length) {
    if (src[i] === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      const stop = e < 0 ? src.length : e + 2;
      blank(chars, i, stop);
      i = stop;
    } else if (src[i] === '"' || src[i] === "'") i = endOfQuoted(src, i);
    else i++;
  }
  return chars.join('');
}

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

/* index of the first `stop` character at depth 0, outside strings */
function scanTo(text, i, stops) {
  let depth = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") { i = endOfQuoted(text, i); continue; }
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0 && stops.includes(ch)) return i;
    i++;
  }
  return text.length;
}

/* split at top-level commas */
function splitList(text) {
  const parts = [];
  let i = 0;
  while (i <= text.length) {
    const j = scanTo(text, i, [',']);
    parts.push(text.slice(i, j));
    i = j + 1;
  }
  return parts;
}

const normSelector = (s) => s.replace(/\s*([>+~])\s*/g, ' $1 ').replace(/\s+/g, ' ').trim();
const normValue = (v) => v.replace(/!\s*important\s*$/i, '').replace(/\s+/g, ' ').trim();

/* declarations of one block body; offsets relative to `base` */
function parseDeclarations(body, base) {
  const decls = [];
  let i = 0;
  while (i < body.length) {
    const j = scanTo(body, i, [';']);
    const raw = body.slice(i, j);
    const colon = raw.indexOf(':');
    if (colon > 0) {
      const lead = raw.length - raw.trimStart().length;
      decls.push({
        property: raw.slice(0, colon).trim().toLowerCase(),
        value: normValue(raw.slice(colon + 1)),
        offset: base + i + lead,
      });
    }
    i = j + 1;
  }
  return decls;
}

const NESTING_AT = /^@(media|supports|container|layer|document)\b/i;

/* rules of a cleaned stylesheet fragment; offsets relative to `base` */
function parseCss(text, base) {
  const rules = [];
  const walk = (start, end, inKeyframes) => {
    let i = start;
    while (i < end) {
      while (i < end && /[\s;}]/.test(text[i])) i++;
      if (i >= end) break;
      const brace = scanTo(text, i, ['{', ';']);
      if (brace >= end || text[brace] === ';') { i = brace + 1; continue; }
      const prelude = text.slice(i, brace).trim();
      const preludeOffset = base + i;
      const close = matchBrace(text, brace);
      const innerEnd = Math.min(close, end);
      if (prelude.startsWith('@')) {
        if (NESTING_AT.test(prelude)) walk(brace + 1, innerEnd, false);
        else if (/^@(-webkit-)?keyframes\b/i.test(prelude)) walk(brace + 1, innerEnd, true);
        /* @font-face, @page, @property … carry descriptors, not properties */
      } else {
        rules.push({
          selectors: splitList(prelude).map(normSelector).filter(Boolean),
          keyframes: inKeyframes,
          offset: preludeOffset,
          decls: parseDeclarations(text.slice(brace + 1, innerEnd), base + brace + 1),
        });
      }
      i = close + 1;
    }
  };
  walk(0, text.length, false);
  return rules;
}

function matchBrace(text, open) {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") { i = endOfQuoted(text, i); continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  return text.length;
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

/* a page's rules (from <style> and style=""), and its elements */
function scanHtml(src) {
  const rules = [];
  const elements = [];
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;
    if (src.startsWith('<!--', lt)) {
      const e = src.indexOf('-->', lt + 4);
      i = e < 0 ? src.length : e + 3;
      continue;
    }
    const m = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(src.slice(lt, lt + 64));
    if (!m) { i = lt + 1; continue; }
    const tag = m[1].toLowerCase();
    const { attrs, end } = readTag(src, lt + m[0].length);
    const classes = (attrs.get('class')?.value ?? '').split(/\s+/).filter(Boolean);
    const role = (attrs.get('role')?.value ?? '').trim().toLowerCase();
    const element = { tag, classes, role, offset: lt };
    elements.push(element);
    if (attrs.has('style')) {
      const { value, offset } = attrs.get('style');
      const label = `<${tag}${classes.length ? ` class="${classes.join(' ')}"` : ''}${role ? ` role="${role}"` : ''}> style=""`;
      rules.push({ selectors: [label], element, keyframes: false, offset: lt,
        decls: parseDeclarations(stripCss(value), offset) });
    }
    if (tag === 'style' || tag === 'script') {
      const close = new RegExp(`</${tag}[\\s/>]`, 'gi');
      close.lastIndex = end;
      const c = close.exec(src);
      const stop = c ? c.index : src.length;
      if (tag === 'style') rules.push(...parseCss(stripCss(src.slice(end, stop)), end));
      i = c ? src.indexOf('>', stop) + 1 || src.length : src.length;
      continue;
    }
    i = end;
  }
  return { rules, elements };
}

/* ----------------------------------------------------------- the rules --- */

/* the last compound of a selector, and whether it is a heading */
function subjectOf(selector) {
  let depth = 0;
  let cut = 0;
  for (let k = 0; k < selector.length; k++) {
    const ch = selector[k];
    if (ch === '"' || ch === "'") { k = endOfQuoted(selector, k) - 1; continue; }
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0 && /[\s>+~]/.test(ch)) cut = k + 1;
  }
  return selector.slice(cut);
}

function isHeadingSubject(rule, selector) {
  if (rule.element) return HEADING_TAG.test(rule.element.tag) || rule.element.role === 'heading';
  const subject = subjectOf(selector);
  return /^h[1-6](?![\w-])/i.test(subject) || /\[\s*role\s*=\s*(["']?)heading\1\s*\]/i.test(subject);
}

const isMono = (family) => /var\(\s*--font-mono\s*\)|mono|courier|menlo|consolas/i.test(family);

function foundationTokens(ctx) {
  const tokens = { fs: new Set(), tracking: new Set() };
  if (!ctx.exists(FOUNDATION)) return tokens;
  for (const m of stripCss(ctx.read(FOUNDATION)).matchAll(/(?<![\w-])--(fs|tracking)-([A-Za-z0-9-]+)\s*:/g)) {
    tokens[m[1]].add(`--${m[1]}-${m[2]}`);
  }
  return tokens;
}

function tokenValue(value, prefix, known) {
  const m = /^var\(\s*(--[A-Za-z0-9-]+)\s*\)$/.exec(value);
  return Boolean(m && m[1].startsWith(prefix) && known.has(m[1]));
}

const registered = (list, file, selector, value) =>
  list.find((r) => r.file === file && normSelector(r.selector) === selector && (value === undefined || r.value === value));

function sizeSteps(ctx) {
  const px = new Map();
  if (!ctx.exists(FOUNDATION)) return px;
  for (const m of stripCss(ctx.read(FOUNDATION)).matchAll(/(?<![\w-])(--fs-[A-Za-z0-9-]+)\s*:\s*([\d.]+)px/g)) px.set(m[1], Number(m[2]));
  return px;
}

function roleMatrix(ctx) {
  const findings = [];
  if (!ctx.exists(DOCUMENT)) return findings;
  const src = ctx.read(DOCUMENT);
  const starts = lineStarts(src);
  const rules = parseCss(stripCss(src), 0);
  const steps = sizeSteps(ctx);
  const stepPx = (v) => { const m = /^var\(\s*(--fs-[A-Za-z0-9-]+)\s*\)$/.exec(v || ''); return m ? steps.get(m[1]) : undefined; };
  const declared = new Map();
  for (const row of ROLE_MATRIX) {
    const owning = rules.filter((r) => r.selectors.includes(row.selector) && r.decls.some((d) => d.property === 'font-size'));
    if (owning.length !== 1) {
      findings.push({ rule: 'R7', file: DOCUMENT, selector: row.selector, value: String(owning.length),
        message: `a role must be declared by exactly one rule that sets its size; found ${owning.length}` });
      continue;
    }
    const r = owning[0];
    const got = {};
    for (const [k, prop] of Object.entries(ROLE_PROPS)) {
      const d = r.decls.filter((x) => x.property === prop).pop();
      got[k] = d ? d.value : undefined;
      if (got[k] !== row[k]) findings.push({ rule: 'R7', file: DOCUMENT, line: lineAt(starts, d ? d.offset : r.offset), selector: row.selector,
        property: prop, value: got[k] ?? '(not declared)', expected: row[k], message: 'a role declares a value other than its matrix value' });
    }
    for (const other of rules.filter((x) => x !== r && x.selectors.includes(row.selector))) {
      for (const d of other.decls) {
        const k = Object.keys(ROLE_PROPS).find((key) => ROLE_PROPS[key] === d.property);
        if (k && d.value !== row[k]) findings.push({ rule: 'R7', file: DOCUMENT, line: lineAt(starts, d.offset), selector: row.selector,
          property: d.property, value: d.value, expected: row[k], message: 'a later rule on a role selector sets a value other than its matrix value' });
      }
    }
    declared.set(row.selector, { ...got, row });
  }
  /* invariants, from the declared values rather than the matrix */
  const body = declared.get('.doc-body');
  const bodyPx = body && stepPx(body.size);
  for (const [selector, got] of declared) {
    if (got.row.body && got.size !== 'var(--fs-body)') findings.push({ rule: 'R7', file: DOCUMENT, selector, value: got.size,
      message: 'reading text is not declared on the Body step' });
    const own = stepPx(got.size);
    if (got.row.heading && bodyPx !== undefined && own !== undefined && own < bodyPx) findings.push({ rule: 'R7', file: DOCUMENT, selector,
      value: got.size, message: 'a heading role is declared smaller than document body' });
  }
  /* no other rule that targets a quotation sets a type metric */
  const metricProps = [...Object.values(ROLE_PROPS), 'font'];
  for (const r of rules) for (const selector of r.selectors) {
    if (selector === '.doc-quote > p' || selector === '.doc-quote > footer') continue;
    if (!/\.doc-quote(--[\w-]+)?(?![\w-])/.test(outsidePseudo(selector))) continue;
    for (const d of r.decls) if (metricProps.includes(d.property)) findings.push({ rule: 'R7', file: DOCUMENT,
      line: lineAt(starts, d.offset), selector, property: d.property, value: d.value, message: 'a rule targeting a quotation changes the quotation metric' });
  }
  /* passage rails: one owning rule each; the emphasis rail's geometry; the
     block also its accent; the quotation its registered violet accent */
  const railRules = new Map(PASSAGE_SELECTORS.map((p) => [p, rules.filter((r) => r.selectors.includes(p) && r.decls.some((d) => d.property === 'border-left'))]));
  const owningRails = new Set([...railRules.values()].flat());
  const hierarchyRules = rules.filter((r) => r.selectors.includes(HIERARCHY) && r.decls.some((d) => d.property === 'border-left'));
  const isReset = (d) => (/^(border-left|border)$/.test(d.property) && /^(none|0|0px)$/.test(d.value.trim())) ||
    (/^(padding-left|border-left-width|border-width)$/.test(d.property) && /^(0|0px)$/.test(d.value.trim())) ||
    (/^(border-left-style|border-style)$/.test(d.property) && d.value.trim() === 'none');
  const namesPassage = /\.doc-(quote|pre)(?![\w-])/;
  for (const r of rules) {
    if (owningRails.has(r)) {
      const own = r.selectors.find((s) => PASSAGE_SELECTORS.includes(s));
      for (const d of r.decls) if (RAIL_PROPS.test(d.property) && !['border-left', 'padding-left', '--surface-emphasis-accent'].includes(d.property))
        findings.push({ rule: 'R7', file: DOCUMENT, line: lineAt(starts, d.offset),
        selector: own, property: d.property, value: d.value, message: 'a passage rail rule sets its rail through a property other than border-left and padding-left' });
      continue;
    }
    for (const selector of r.selectors) {
      if (hasClass(selector, 'doc-quote') || hasClass(selector, 'doc-pre')) {
        for (const d of r.decls) if (RAIL_PROPS.test(d.property)) findings.push({ rule: 'R7', file: DOCUMENT, line: lineAt(starts, d.offset),
          selector, property: d.property, value: d.value, message: 'a rule other than the passage rail sets a rail on a quotation or block' });
      } else if (namesPassage.test(selector)) {
        for (const d of r.decls) if (RAIL_PROPS.test(d.property) && !isReset(d)) findings.push({ rule: 'R7', file: DOCUMENT, line: lineAt(starts, d.offset),
          selector, property: d.property, value: d.value, message: 'a rule that names a quotation or block inside a pseudo-class may remove a rail, never draw or recolor one' });
      }
      if (!hierarchyRules.includes(r) && hasClass(selector, 'doc-hierarchy')) {
        for (const d of r.decls) if (RAIL_PROPS.test(d.property) && d.property !== 'padding-left' && d.property !== 'padding') findings.push({ rule: 'R7', file: DOCUMENT,
          line: lineAt(starts, d.offset), selector, property: d.property, value: d.value, message: 'a rule other than the hierarchy rail sets a rail on a hierarchy level' });
      }
    }
  }
  if (hierarchyRules.length !== 1) {
    findings.push({ rule: 'R7', file: DOCUMENT, selector: HIERARCHY, value: String(hierarchyRules.length), message: 'the hierarchy rail must be declared by exactly one rule' });
  } else {
    const h = hierarchyRules[0];
    const hb = (h.decls.filter((d) => d.property === 'border-left').pop() || {}).value;
    const hi = (h.decls.filter((d) => d.property === 'padding-left').pop() || {}).value;
    if ((hb || '').replace(/\s+/g, ' ').trim() !== HIERARCHY_RAIL.border || hi !== HIERARCHY_RAIL.inset) findings.push({ rule: 'R7', file: DOCUMENT,
      line: lineAt(starts, h.offset), selector: HIERARCHY, value: `${hb} · ${hi}`, expected: `${HIERARCHY_RAIL.border} · ${HIERARCHY_RAIL.inset}`,
      message: 'the hierarchy rail is not the registered 1px neutral rail' });
  }
  const tsrc = ctx.exists(TREATMENTS) ? ctx.read(TREATMENTS) : '';
  const trule = parseCss(stripCss(tsrc), 0).filter((r) => r.selectors.includes('.surface-emphasis-rail') && r.decls.some((d) => d.property === 'border-left'));
  const last = (r, prop) => (r.decls.filter((d) => d.property === prop).pop() || {}).value;
  const geometry = (v) => (v || '').trim().split(/\s+/).slice(0, 2).join(' ');
  const railColor = (v) => (v || '').trim().split(/\s+/).slice(2).join(' ');
  if (trule.length !== 1) {
    findings.push({ rule: 'R7', file: TREATMENTS, selector: '.surface-emphasis-rail', value: String(trule.length),
      message: '.surface-emphasis-rail must be declared by exactly one rule' });
  } else if (last(trule[0], '--surface-emphasis-accent') !== EMPHASIS_RAIL_ACCENT || railColor(last(trule[0], 'border-left')) !== 'var(--surface-emphasis-accent)') {
    findings.push({ rule: 'R7', file: TREATMENTS, selector: '.surface-emphasis-rail', value: `${last(trule[0], '--surface-emphasis-accent')} · ${last(trule[0], 'border-left')}`,
      expected: `${EMPHASIS_RAIL_ACCENT} · 2px solid var(--surface-emphasis-accent)`, message: 'the emphasis rail no longer draws its registered magenta accent' });
  }
  for (const [p, owning] of railRules) {
    if (owning.length !== 1) {
      findings.push({ rule: 'R7', file: DOCUMENT, selector: p, value: String(owning.length),
        message: 'a passage rail must be declared by exactly one rule' });
      continue;
    }
    if (trule.length !== 1) continue;
    const r = owning[0], t = trule[0];
    const got = { border: last(r, 'border-left'), inset: last(r, 'padding-left'), accent: last(r, '--surface-emphasis-accent') };
    const want = { border: last(t, 'border-left'), inset: last(t, 'padding-left'), accent: last(t, '--surface-emphasis-accent') };
    const bad = [];
    if (geometry(got.border) !== geometry(want.border)) bad.push(`width/style ${geometry(got.border)} (emphasis rail: ${geometry(want.border)})`);
    if (got.inset !== want.inset) bad.push(`inset ${got.inset} (emphasis rail: ${want.inset})`);
    if (p === '.doc-pre') {
      if (got.border !== want.border || got.accent !== want.accent) bad.push(`accent ${got.accent} · ${got.border} (emphasis rail: ${want.accent} · ${want.border})`);
    } else if (got.border !== want.border || got.accent !== QUOTE_RAIL_ACCENT) {
      bad.push(`accent ${got.accent} · ${got.border} (registered: ${QUOTE_RAIL_ACCENT} · ${want.border})`);
    }
    if (bad.length) findings.push({ rule: 'R7', file: DOCUMENT, line: lineAt(starts, r.offset), selector: p, value: bad.join('; '),
      message: p === '.doc-pre' ? 'the block rail differs from .surface-emphasis-rail' : 'the quotation rail leaves the shared geometry or its registered violet accent' });
  }
  /* the rendered checker pins the same quotation color */
  if (ctx.exists(RENDERED_MATRIX)) {
    const m = /quotation:\s*\{\s*sel:\s*'\.doc-quote',\s*colors:\s*\[([^\]]*)\]/.exec(ctx.read(RENDERED_MATRIX));
    const colors = m ? m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : [];
    if (colors.length !== 1 || colors[0] !== QUOTE_RAIL_ACCENT) findings.push({ rule: 'R7', file: RENDERED_MATRIX, selector: 'RAIL_COLOR.quotation',
      value: colors.join(' | ') || '(none)', expected: QUOTE_RAIL_ACCENT, message: 'the rendered checker pins a different quotation rail color' });
  }
  /* the rendered checker pins the callout to the emphasis rail's own magenta, alone, and
     admits exactly the three sanctioned accents on any other emphasis rail */
  if (ctx.exists(RENDERED_MATRIX)) {
    const read = (key) => {
      const m = new RegExp(key + ":\\s*\\{\\s*sel:\\s*'\\.surface-emphasis-rail',\\s*colors:\\s*\\[([^\\]]*)\\]").exec(ctx.read(RENDERED_MATRIX));
      return m ? m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : [];
    };
    const callout = read('callout'), treatment = read('emphasis');
    if (callout.length !== 1 || callout[0] !== EMPHASIS_RAIL_ACCENT) findings.push({ rule: 'R7', file: RENDERED_MATRIX, selector: 'RAIL_COLOR.callout',
      value: callout.join(' | ') || '(none)', expected: EMPHASIS_RAIL_ACCENT, message: 'the rendered checker lets an authorial callout take another color than magenta' });
    if (treatment.join('|') !== TREATMENT_RAIL_ACCENTS.join('|')) findings.push({ rule: 'R7', file: RENDERED_MATRIX, selector: 'RAIL_COLOR.emphasis',
      value: treatment.join(' | ') || '(none)', expected: TREATMENT_RAIL_ACCENTS.join(' | '), message: 'the rendered checker no longer admits exactly the three sanctioned accents on an emphasis rail off document text' });
  }
  /* the quotation's violet is the one the accent modifier binds, in the same words */
  const violetRules = parseCss(stripCss(tsrc), 0).filter((r) => r.selectors.includes('.surface-emphasis--violet'));
  if (violetRules.length !== 1 || last(violetRules[0], '--surface-emphasis-accent') !== QUOTE_RAIL_ACCENT) {
    findings.push({ rule: 'R7', file: TREATMENTS, selector: '.surface-emphasis--violet',
      value: violetRules.map((r) => last(r, '--surface-emphasis-accent')).join(' · ') || '(no rule)', expected: QUOTE_RAIL_ACCENT,
      message: 'the violet accent modifier no longer binds the quotation rail\'s registered violet' });
  }
  /* the rendered link-state matrix equals surface-text-link.css */
  if (ctx.exists(RENDERED_MATRIX) && ctx.exists(TEXT_LINK)) {
    const js = ctx.read(RENDERED_MATRIX);
    const states = {};
    for (const m of js.matchAll(/^\s*(rest|hover|focus):\s*\{\s*line:\s*'([^']+)',\s*thickness:\s*'([^']+)',\s*color:\s*'([^']+)'(?:,\s*opacity:\s*'([^']+)')?\s*\},?\s*$/gm)) {
      states[m[1]] = { line: m[2], thickness: m[3], color: m[4], opacity: m[5] };
    }
    const lrules = parseCss(stripCss(ctx.read(TEXT_LINK)), 0);
    const ldecl = (selector, prop) => { const rs = lrules.filter((r) => r.selectors.includes(selector)); let v; for (const r of rs) for (const d of r.decls) if (d.property === prop) v = d.value; return v; };
    const norm = (v) => (v === undefined ? undefined : v.replace(/\s+/g, ' ').trim());
    const base = (prop) => norm(ldecl('.surface-text-link', prop));
    const colorOf = (v) => { const m = /^var\(\s*(--surface-text-link-underline)\s*\)$/.exec(v || ''); return m ? base(m[1]) : v; };
    const css = {
      rest: { line: base('text-decoration-line'), thickness: base('text-decoration-thickness'), color: colorOf(base('text-decoration-color')), opacity: base('opacity') ?? '1' },
      hover: { line: norm(ldecl('.surface-text-link:hover', 'text-decoration-line')) ?? base('text-decoration-line'),
        thickness: norm(ldecl('.surface-text-link:hover', 'text-decoration-thickness')) ?? base('text-decoration-thickness'),
        color: colorOf(norm(ldecl('.surface-text-link:hover', 'text-decoration-color'))), opacity: norm(ldecl('.surface-text-link:hover', 'opacity')) ?? '1' },
      focus: { line: norm(ldecl('.surface-text-link:focus-visible', 'text-decoration-line')) ?? base('text-decoration-line'),
        thickness: norm(ldecl('.surface-text-link:focus-visible', 'text-decoration-thickness')) ?? base('text-decoration-thickness'),
        color: colorOf(norm(ldecl('.surface-text-link:focus-visible', 'text-decoration-color'))) },
    };
    for (const state of ['rest', 'hover', 'focus']) {
      const g = states[state];
      const drift = !g ? ['(absent)'] : Object.keys(css[state]).filter((k) => norm(g[k]) !== css[state][k]);
      if (drift.length) findings.push({ rule: 'R7', file: RENDERED_MATRIX, selector: `LINK_STATES.${state}`, value: drift.join(','),
        expected: JSON.stringify(css[state]), message: `the rendered link-state matrix differs from ${TEXT_LINK}` });
    }
  }
  /* the rendered matrix equals this one */
  if (!ctx.exists(RENDERED_MATRIX)) {
    findings.push({ rule: 'R7', file: RENDERED_MATRIX, message: 'the rendered-page matrix is missing' });
  } else {
    const js = ctx.read(RENDERED_MATRIX);
    const tok = (v) => (v === 'SANS' ? SANS : v === 'MONO' ? MONO : /^[\d.]+$/.test(v) ? v : `var(${v})`);
    const seen = new Map();
    for (const m of js.matchAll(/\{\s*role:\s*'[^']+',\s*sel:\s*'([^']+)',\s*family:\s*(SANS|MONO),\s*size:\s*'([^']+)',\s*weight:\s*'([^']+)',\s*lh:\s*('([^']+)'|[\d.]+),\s*tracking:\s*'([^']+)',\s*color:\s*'([^']+)'/g)) {
      seen.set(m[1], { family: tok(m[2]), size: tok(m[3]), weight: tok(m[4]), lh: m[6] ? tok(m[6]) : m[5], tracking: tok(m[7]), color: tok(m[8]) });
    }
    for (const row of ROLE_MATRIX) {
      const g = seen.get(row.selector);
      const drift = !g ? ['(absent)'] : Object.keys(ROLE_PROPS).filter((k) => g[k] !== row[k]);
      if (drift.length) findings.push({ rule: 'R7', file: RENDERED_MATRIX, selector: row.selector, value: drift.join(','),
        message: 'the rendered-page matrix differs from ROLE_MATRIX' });
    }
    for (const sel of seen.keys()) if (!ROLE_MATRIX.some((r) => r.selector === sel)) findings.push({ rule: 'R7', file: RENDERED_MATRIX,
      selector: sel, message: 'the rendered-page matrix has a role ROLE_MATRIX lacks' });
  }
  return findings;
}

function run(ctx) {
  const findings = [];
  const tokens = foundationTokens(ctx);
  const used = new Set();
  const counts = { files: 0, rules: 0, declarations: 0, elements: 0 };
  const perFile = [];

  for (const file of GOVERNED) {
    if (!ctx.exists(file)) {
      findings.push({ rule: 'missing', file, message: 'a governed file is missing' });
      continue;
    }
    counts.files++;
    const src = ctx.read(file);
    const starts = lineStarts(src);
    const line = (offset) => lineAt(starts, offset);
    const { rules, elements } = file.endsWith('.css')
      ? { rules: parseCss(stripCss(src), 0), elements: [] }
      : scanHtml(src);
    counts.rules += rules.length;
    counts.elements += elements.length;
    let declarations = 0;

    /* the family a selector declares anywhere in this source */
    const familyBySelector = new Map();
    for (const r of rules) {
      if (r.element) continue;
      const f = r.decls.filter((d) => d.property === 'font-family').pop();
      if (f) for (const s of r.selectors) familyBySelector.set(s, f.value);
    }

    for (const r of rules) {
      declarations += r.decls.length;
      const last = (property) => r.decls.filter((d) => d.property === property).pop();
      for (const selector of r.selectors) {
        const at = (d) => ({ file, line: line(d ? d.offset : r.offset), selector });
        for (const d of r.decls) {
          if (d.property === 'font-size') {
            const ok = tokenValue(d.value, '--fs-', tokens.fs) || d.value === 'inherit';
            const reg = !ok && registered(REGISTERED_SIZE, file, selector, d.value);
            if (reg) used.add(reg);
            if (!ok && !reg) findings.push({ rule: 'R1', ...at(d), property: d.property, value: d.value,
              message: 'font-size is not a defined --fs-* step, inherit, or a registered literal' });
          } else if (d.property === 'font') {
            if (d.value !== 'inherit') findings.push({ rule: 'R1', ...at(d), property: d.property, value: d.value,
              message: 'the font shorthand is allowed only as font: inherit' });
          } else if (d.property === 'letter-spacing') {
            const ok = tokenValue(d.value, '--tracking-', tokens.tracking) || ['0', 'normal', 'inherit'].includes(d.value);
            const reg = !ok && registered(REGISTERED_TRACKING, file, selector, d.value);
            if (reg) used.add(reg);
            if (!ok && !reg) findings.push({ rule: 'R2', ...at(d), property: d.property, value: d.value,
              message: 'letter-spacing is not a defined --tracking-* token, 0, normal, inherit, or a registered literal' });
          }
        }
        if (r.keyframes) continue;

        const size = last('font-size');
        const transform = last('text-transform');
        const uppercase = transform && transform.value.toLowerCase() === 'uppercase';
        if (isHeadingSubject(r, selector)) {
          if (size && size.value === 'var(--fs-caption)') findings.push({ rule: 'R3', ...at(size), property: 'font-size', value: size.value,
            message: 'a heading is set at the Caption size' });
          if (uppercase) findings.push({ rule: 'R3', ...at(transform), property: 'text-transform', value: transform.value,
            message: 'a heading is set in uppercase' });
        }
        if (!uppercase) continue;

        const own = last('font-family');
        const family = own ? own.value : (!r.element && familyBySelector.get(selector)) || 'inherited: Inter';
        const mono = isMono(family);
        if (mono) {
          const reg = !r.element && registered(MONO_UPPERCASE, file, selector);
          if (reg) used.add(reg);
          else findings.push({ rule: 'R5', ...at(transform), family,
            message: 'mono in uppercase on a selector that is not registered' });
        }
        const spacing = last('letter-spacing');
        if (spacing) {
          const want = mono ? 'var(--tracking-wide)' : 'var(--tracking-caption)';
          if (spacing.value !== want) {
            const reg = !r.element && registered(TRACKING_EXCEPTIONS, file, selector, spacing.value);
            if (reg) used.add(reg);
            else findings.push({ rule: 'R6', ...at(spacing), family, value: spacing.value, expected: want,
              message: `uppercase ${mono ? 'mono' : 'Inter'} takes ${want}` });
          }
        }
      }
    }

    for (const el of elements) {
      if (!(HEADING_TAG.test(el.tag) || el.role === 'heading')) continue;
      const bad = el.classes.filter((c) => LABEL_CLASSES.includes(c));
      if (bad.length) findings.push({ rule: 'R4', file, line: line(el.offset), element: el.tag, role: el.role || undefined,
        classes: bad, message: 'a heading carries a label or control class' });
    }
    counts.declarations += declarations;
    perFile.push({ file, rules: rules.length, declarations, elements: elements.length });
  }

  findings.push(...roleMatrix(ctx));

  for (const [name, list] of Object.entries({ REGISTERED_SIZE, REGISTERED_TRACKING, MONO_UPPERCASE, TRACKING_EXCEPTIONS })) {
    for (const reg of list) {
      if (used.has(reg) || !ctx.exists(reg.file)) continue;
      findings.push({ rule: 'stale', file: reg.file, selector: reg.selector, list: name,
        message: 'a registration matches no rule' });
    }
  }

  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
  return {
    mode: 'check',
    governed: GOVERNED.length,
    ...counts,
    clean: findings.length === 0,
    findings_by_rule: byRule,
    findings,
    role_matrix: ROLE_MATRIX.length,
    registered: {
      size: REGISTERED_SIZE.length,
      tracking: REGISTERED_TRACKING.length,
      mono_uppercase: MONO_UPPERCASE.length,
      tracking_exceptions: TRACKING_EXCEPTIONS.map(({ file, selector, value, reason }) => ({ file, selector, value, reason })),
    },
    file_report: perFile,
  };
}

/* ----------------------------------------------------------- self-test --- */

function selfTest(root) {
  const cases = [];
  const record = (name, pass, expected, got) => cases.push({ case: name, pass, expected, got });
  const key = (f) => `${f.rule} ${f.file}:${f.line ?? ''} ${f.selector ?? f.element ?? ''} ${f.value ?? ''}`.trim();
  const baseline = run(makeContext(root)).findings.map(key);
  const added = (overlay) => run(makeContext(root, overlay)).findings.map(key).filter((k) => !baseline.includes(k));
  const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8');
  const append = (rel, text) => ({ [rel]: `${read(rel)}\n${text}\n` });
  const inPage = (rel, text) => ({ [rel]: read(rel).replace('</style>', `${text}\n</style>`) });
  const one = (got, rule) => got.length === 1 && got[0].startsWith(`${rule} `);

  {
    const size = added(append('surface-panel.css', 'h3 { font-size: var(--fs-caption); }'));
    const control = added(append('surface-panel.css', 'h3 { font-size: var(--fs-small); }'));
    record('a size-only Caption heading fails R3', one(size, 'R3') && control.length === 0,
      'one R3; the same heading at --fs-small: none', { size, control });
  }
  {
    const upper = added(append('surface-panel.css', '.x > h2 { text-transform: uppercase; }'));
    const role = added(append('surface-panel.css', '[role="heading"] { text-transform: uppercase; font-family: var(--font-sans); letter-spacing: var(--tracking-caption); }'));
    record('an uppercase heading subject fails R3, by type and by role', one(upper, 'R3') && one(role, 'R3'),
      'one R3 each', { upper, role });
  }
  {
    const px = added(append('surface-panel.css', '.x { font-size: 13px; }'));
    const unknown = added(append('surface-panel.css', '.x { font-size: var(--fs-huge); }'));
    const shorthand = added(append('surface-panel.css', '.x { font: 300 14px/1.2 var(--font-mono); }'));
    const inherit = added(append('surface-panel.css', '.x { font-size: inherit; font: inherit; }'));
    record('13px, an undefined step and a font shorthand fail R1; inherit passes',
      one(px, 'R1') && one(unknown, 'R1') && one(shorthand, 'R1') && inherit.length === 0,
      'one R1 each; inherit: none', { px, unknown, shorthand, inherit });
  }
  {
    const em = added(append('surface-panel.css', '.x { letter-spacing: 0.1em; }'));
    const zero = added(append('surface-panel.css', '.x { letter-spacing: 0; }'));
    const elsewhere = added(append('surface-panel.css', '.doc-code { font-size: 0.9em; }'));
    record('0.1em fails R2; 0 passes; a registered literal fails outside its file',
      one(em, 'R2') && zero.length === 0 && one(elsewhere, 'R1'),
      'one R2; none; one R1 for the 0.9em size literal registered only in surface-document.css', { em, zero, elsewhere });
  }
  {
    const commented = added(append('surface-panel.css', '/* .x { font-size: 13px; } */'));
    const html = added({ 'index.html': read('index.html').replace('</body>', '<!-- <p style="font-size: 13px">x</p> -->\n</body>') });
    record('a commented declaration is not read', commented.length === 0 && html.length === 0,
      'none in a stylesheet comment or a page comment', { commented, html });
  }
  {
    const attr = added({ 'index.html': read('index.html').replace('</body>', '<p style="font-size: 13px; letter-spacing: .1em">x</p>\n</body>') });
    record('a style="" attribute is read (R1, R2)',
      attr.length === 2 && attr.some((k) => k.startsWith('R1 ')) && attr.some((k) => k.startsWith('R2 ')),
      'one R1 and one R2', attr);
  }
  {
    const label = added({ 'index.html': read('index.html').replace('</body>', '<h2 class="doc-label">x</h2>\n</body>') });
    const control = added({ 'index.html': read('index.html').replace('</body>', '<h2 class="doc-section-title">x</h2>\n</body>') });
    const role = added({ 'index.html': read('index.html').replace('</body>', '<p role="heading" aria-level="7" class="caption">x</p>\n</body>') });
    record('a heading carrying a label class fails R4', one(label, 'R4') && control.length === 0 && one(role, 'R4'),
      'h2.doc-label: one R4; h2.doc-section-title: none; p[role=heading].caption: one R4', { label, control, role });
  }
  {
    const unregistered = added(append('surface-panel.css', '.x { font-family: var(--font-mono); text-transform: uppercase; letter-spacing: var(--tracking-wide); }'));
    const split = added(append('surface-panel.css', '.y { font-family: var(--font-mono); }\n.y { text-transform: uppercase; letter-spacing: var(--tracking-wide); }'));
    record('an unregistered mono uppercase selector fails R5, also when its family is set by another rule for the same selector',
      one(unregistered, 'R5') && one(split, 'R5'), 'one R5 each', { unregistered, split });
  }
  {
    const inter = added(append('surface-panel.css', '.x { font-family: var(--font-sans); text-transform: uppercase; letter-spacing: var(--tracking-wide); }'));
    const noFamily = added(append('surface-panel.css', '.x { text-transform: uppercase; letter-spacing: var(--tracking-wide); }'));
    const caption = added(append('surface-panel.css', '.x { text-transform: uppercase; letter-spacing: var(--tracking-caption); }'));
    const mono = added(append('patterns/surface-shell/surface-shell.css', '.surface-badge { font-family: var(--font-mono); text-transform: uppercase; letter-spacing: var(--tracking-caption); }'));
    record('Inter uppercase at --tracking-wide fails R6 (a rule with no family is Inter); mono uppercase at --tracking-caption fails R6',
      one(inter, 'R6') && one(noFamily, 'R6') && caption.length === 0 && mono.length === 1 && mono[0].startsWith('R6 '),
      'one R6; one R6; none at --tracking-caption; one R6 on a registered mono selector', { inter, noFamily, caption, mono });
  }
  {
    const page = 'preview/styleguide.html';
    const exception = added(inPage(page, '  .badge { text-transform: uppercase; letter-spacing: var(--tracking-wide); }'));
    const other = added(inPage(page, '  .badge-like { text-transform: uppercase; letter-spacing: var(--tracking-wide); }'));
    record('the registered .badge exception holds only for its own selector', exception.length === 0 && one(other, 'R6'),
      '.badge: none; .badge-like: one R6', { exception, other });
  }
  {
    const page = 'preview/styleguide.html';
    const removed = added({ [page]: read(page).replace(/\n\s*\.badge \{[^}]*\}/, '\n') });
    const missing = added({ 'surface-treatments.css': null });
    record('a registration that matches no rule is stale; a missing governed file fails',
      removed.length === 1 && removed[0].startsWith('stale ') && missing.some((k) => k.startsWith('missing ')),
      'one stale for .badge; a missing finding for surface-treatments.css', { removed, missing });
  }
  {
    const media = added(append('surface-panel.css', '@media (max-width: 500px) { .x { font-size: 13px; } }'));
    const fontFace = added(append('surface-panel.css', '@font-face { font-family: "X"; font-size: 13px; }'));
    record('an @media block is descended; an @font-face block is not read as properties',
      one(media, 'R1') && fontFace.length === 0, 'one R1; none', { media, fontFace });
  }

  {
    const doc = read('surface-document.css');
    const inRule = (selector, from, to) => {
      const i = doc.indexOf(`\n${selector} {`);
      const j = doc.indexOf('}', i);
      if (i < 0 || !doc.slice(i, j).includes(from)) throw new Error(`self-test anchor missing: ${selector} ${from}`);
      return { 'surface-document.css': doc.slice(0, i) + doc.slice(i, j).replace(from, to) + doc.slice(j) };
    };
    const allR7 = (got) => got.length > 0 && got.every((k) => k.startsWith('R7 '));
    const body = added(inRule('.doc-body', 'font-size: var(--fs-body)', 'font-size: var(--fs-small)'));
    const deep = added(inRule('.doc-deep-title', 'font-size: var(--fs-body)', 'font-size: var(--fs-small)'));
    const display = added(append('surface-document.css', '.doc-quote--display > p { font-size: var(--fs-body); line-height: var(--lh-heading); }'));
    const toc = added(inRule('.doc-toc-link', 'font-family: var(--font-mono)', 'font-family: var(--font-sans)'));
    const railSrc = read('surface-treatments.css');
    const rail = added({ 'surface-treatments.css': railSrc.replace(/(\.surface-emphasis-rail \{[^}]*padding-left: )var\(--space-4\)/, '$1var(--space-3)') });
    const later = added(append('surface-document.css', '.doc-body { color: var(--fg-3); }'));
    const descendant = added(append('surface-document.css', '.doc-quote p { font-size: var(--fs-small); }'));
    const neutral = added(append('surface-document.css', '.doc-quote { border-left: 1px solid var(--line-2); }'));
    const jsDrift = added({ 'tools/role-conformance.js': read('tools/role-conformance.js').replace("sel: '.doc-body',             family: SANS, size: '--fs-body'", "sel: '.doc-body',             family: SANS, size: '--fs-small'") });
    record('R7: body at Small, a deep heading at Small, a display-quote size, a sans contents link, a drifted emphasis-rail inset (breaking both passages), a later role rule, a descendant quotation size, a second rail rule and a drifted rendered matrix each fail',
      allR7(body) && body.length === 2 && allR7(deep) && deep.length === 2 && allR7(display) && display.length === 2 &&
      allR7(toc) && toc.length === 1 && allR7(rail) && rail.length === 2 && allR7(later) && later.length === 1 &&
      allR7(descendant) && descendant.length === 1 && allR7(neutral) && neutral.length === 1 && allR7(jsDrift) && jsDrift.length === 1,
      'body: matrix + Body invariant (2); deep: matrix + smaller-than-body (2); display: one per metric (2); toc: matrix (1); rail: quotation geometry + block parity (2); later rule (1); descendant (1); second rail rule (1); rendered matrix (1)',
      { body, deep, display, toc, rail, later, descendant, neutral, jsDrift });

    const entryFamily = added(inRule('.doc-entry-title', 'font-family: var(--font-sans)', 'font-family: var(--font-mono)'));
    const entryWeight = added(inRule('.doc-entry-title', 'font-weight: var(--fw-light)', 'font-weight: var(--fw-extralight)'));
    const entryLeading = added(inRule('.doc-entry-title', 'line-height: var(--lh-body)', 'line-height: var(--lh-heading)'));
    const entryTracking = added(inRule('.doc-entry-title', 'letter-spacing: var(--tracking-normal)', 'letter-spacing: var(--tracking-tight)'));
    record('R7 entry title: a mono family, the body weight (200), the panel label\'s heading leading and its tight tracking each fail once',
      allR7(entryFamily) && entryFamily.length === 1 && allR7(entryWeight) && entryWeight.length === 1 &&
      allR7(entryLeading) && entryLeading.length === 1 && allR7(entryTracking) && entryTracking.length === 1,
      'one R7 each', { entryFamily, entryWeight, entryLeading, entryTracking });

    const quoteMagenta = added(inRule('.doc-quote', '--surface-emphasis-accent: var(--ask-emphasis-violet)', '--surface-emphasis-accent: var(--ask-emphasis-magenta)'));
    const quoteNeutral = added(inRule('.doc-quote', 'border-left: 2px solid var(--surface-emphasis-accent)', 'border-left: 2px solid var(--line-1)'));
    const quoteThin = added(inRule('.doc-quote', 'border-left: 2px solid var(--surface-emphasis-accent)', 'border-left: 1px solid var(--surface-emphasis-accent)'));
    const preNeutral = added(inRule('.doc-pre', 'border-left: 2px solid var(--surface-emphasis-accent)', 'border-left: 2px solid var(--line-1)'));
    const preViolet = added(inRule('.doc-pre', '--surface-emphasis-accent: var(--ask-emphasis-magenta)', '--surface-emphasis-accent: var(--ask-emphasis-violet)'));
    const violetDrift = added({ 'surface-treatments.css': read('surface-treatments.css').replace('.surface-emphasis--violet  { --surface-emphasis-accent: var(--ask-emphasis-violet); }', '.surface-emphasis--violet  { --surface-emphasis-accent: var(--ask-emphasis-cyan); }') });
    const quoteColorDrift = added({ 'tools/role-conformance.js': read('tools/role-conformance.js').replace("quotation:    { sel: '.doc-quote',             colors: ['var(--ask-emphasis-violet)'] }", "quotation:    { sel: '.doc-quote',             colors: ['var(--line-1)'] }") });
    const calloutColorDrift = added({ 'tools/role-conformance.js': read('tools/role-conformance.js').replace("callout:      { sel: '.surface-emphasis-rail', colors: ['var(--ask-emphasis-magenta)'] }", "callout:      { sel: '.surface-emphasis-rail', colors: ['var(--ask-emphasis-magenta)', 'var(--ask-emphasis-violet)'] }") });
    const treatmentDrift = added({ 'tools/role-conformance.js': read('tools/role-conformance.js').replace("emphasis:     { sel: '.surface-emphasis-rail', colors: ['var(--ask-emphasis-magenta)', 'var(--ask-emphasis-violet)', 'var(--ask-emphasis-cyan)'] }", "emphasis:     { sel: '.surface-emphasis-rail', colors: ['var(--ask-emphasis-magenta)'] }") });
    record('R7 rails: a magenta quotation rail, the retired neutral quotation rail, a 1px quotation rail, a neutral block rail, a violet block rail, a violet modifier that drifts from the quotation, a rendered checker that still pins the neutral quotation, a rendered checker that lets a callout take violet and one that stops admitting the sanctioned accents off document text each fail once',
      allR7(quoteMagenta) && quoteMagenta.length === 1 && allR7(quoteNeutral) && quoteNeutral.length === 1 && allR7(quoteThin) && quoteThin.length === 1 &&
      allR7(preNeutral) && preNeutral.length === 1 && allR7(preViolet) && preViolet.length === 1 && allR7(violetDrift) && violetDrift.length === 1 &&
      allR7(quoteColorDrift) && quoteColorDrift.length === 1 && allR7(calloutColorDrift) && calloutColorDrift.length === 1 &&
      allR7(treatmentDrift) && treatmentDrift.length === 1,
      'one R7 each', { quoteMagenta, quoteNeutral, quoteThin, preNeutral, preViolet, violetDrift, quoteColorDrift, calloutColorDrift, treatmentDrift });

    const tsrc = read('surface-treatments.css');
    const emphasisNeutral = added({ 'surface-treatments.css': tsrc.replace(/(\.surface-emphasis-rail \{\s*--surface-emphasis-accent: )var\(--ask-emphasis-magenta\)/, '$1var(--line-1)') });
    const hierarchyMagenta = added(inRule('.doc-hierarchy', 'border-left: 1px solid var(--line-2)', 'border-left: 2px solid var(--ask-emphasis-magenta)'));
    const hierarchyLater = added(append('surface-document.css', '.doc-section > .doc-hierarchy { border-left-color: var(--ask-emphasis-magenta); }'));
    const quoteLonghand = added(inRule('.doc-quote', 'padding-left: var(--space-4)', 'padding-left: var(--space-4);\n  border-left-color: var(--ask-emphasis-magenta)'));
    const whereRecolor = added(append('surface-document.css', ':where(.doc-quote) { border-left-color: var(--ask-emphasis-magenta); }'));
    record('R7 rails beyond the passages: a neutral emphasis accent (which also breaks the block parity), a magenta hierarchy rail, a second hierarchy rail rule, a longhand inside the quotation rail rule and a recolor wrapped in :where() each fail',
      allR7(emphasisNeutral) && emphasisNeutral.length === 2 && allR7(hierarchyMagenta) && hierarchyMagenta.length === 1 &&
      allR7(hierarchyLater) && hierarchyLater.length === 1 && allR7(quoteLonghand) && quoteLonghand.length === 1 && allR7(whereRecolor) && whereRecolor.length === 1,
      'emphasis: registered accent + block parity (2); hierarchy (1); second hierarchy rule (1); longhand (1); :where() recolor (1)',
      { emphasisNeutral, hierarchyMagenta, hierarchyLater, quoteLonghand, whereRecolor });

    const linkSrc = read('surface-text-link.css');
    const hoverLost = added({ 'surface-text-link.css': linkSrc.replace('.surface-text-link:hover  { opacity: 1;    text-decoration-color: var(--ask-emphasis-magenta); }', '.surface-text-link:hover  { opacity: 1;    text-decoration-color: var(--fg-1); }') });
    const focusThin = added({ 'surface-text-link.css': linkSrc.replace(/(\.surface-text-link:focus-visible \{[^}]*text-decoration-thickness: )2px/, '$11px') });
    const statesDrift = added({ 'tools/role-conformance.js': read('tools/role-conformance.js').replace("hover: { line: 'underline', thickness: '1px', color: 'var(--ask-emphasis-magenta)'", "hover: { line: 'underline', thickness: '1px', color: 'var(--fg-1)'") });
    const statesGone = added({ 'tools/role-conformance.js': read('tools/role-conformance.js').replace(/^\s*focus:\s*\{[^\n]*\n/m, '') });
    record('R7 link states: a hover that loses its magenta, a 1px focus underline, a drifted rendered hover state and a missing rendered focus state each fail once',
      allR7(hoverLost) && hoverLost.length === 1 && allR7(focusThin) && focusThin.length === 1 &&
      allR7(statesDrift) && statesDrift.length === 1 && allR7(statesGone) && statesGone.length === 1,
      'one R7 each (LINK_STATES.hover; .focus; .hover; .focus absent)', { hoverLost, focusThin, statesDrift, statesGone });
  }

  const failed = cases.filter((c) => !c.pass).length;
  console.log(JSON.stringify({ self_test: true, baseline_findings: baseline.length, cases, passed: cases.length - failed, failed }, null, 1));
  if (failed) process.exit(1);
}

/* ---------------------------------------------------------------- main --- */

const opts = parseArgs(process.argv.slice(2));
if (opts.selfTest) {
  selfTest(ROOT);
} else {
  const result = run(makeContext(ROOT));
  console.log(JSON.stringify(result, null, 1));
  if (!result.clean) process.exit(1);
}
