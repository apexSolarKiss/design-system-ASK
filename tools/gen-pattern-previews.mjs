// gen-pattern-previews.mjs — OWNER-ONLY pattern preview generator.
//
// Produces patterns/_preview/*.html from the CANONICAL pattern templates by a
// deterministic path rewrite, so a maintainer can double-click a preview from a
// clean design-system-ASK clone and see each pattern render with no server and
// no local `_dsa-tokens/` mirror. The previews consume the canonical pattern
// files BY REFERENCE (`../<pattern-dir>/…`) and the DS-repo-root tokens/fonts
// (`../../…`); they never copy them. This generator IS the parity mechanism:
// re-run it and `git diff --exit-code patterns/_preview/` — any drift means a
// canonical template changed and the preview must be regenerated.
//
// It changes NO canonical consumer template and adds NO downstream obligation.
//
// Usage: node tools/gen-pattern-previews.mjs   (run from the repo root)

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PATTERNS = path.join(ROOT, 'patterns');
const OUT = path.join(PATTERNS, '_preview');

// canonical shell → { dir, out preview filename }
const SHELLS = [
  { src: 'diagram-static-H/diagram-static-H.html',                 dir: 'diagram-static-H',           out: 'diagram-static-H.html' },
  { src: 'diagram-static-V/diagram-static-V.html',                 dir: 'diagram-static-V',           out: 'diagram-static-V.html' },
  { src: 'diagram-static-SEQ/diagram-static-SEQ.html',             dir: 'diagram-static-SEQ',         out: 'diagram-static-SEQ.html' },
  { src: 'diagram-static-FLOW/diagram-static-FLOW.html',           dir: 'diagram-static-FLOW',        out: 'diagram-static-FLOW-static.html' },
  { src: 'diagram-static-FLOW/diagram-static-FLOW.interactive.html', dir: 'diagram-static-FLOW',      out: 'diagram-static-FLOW-interactive.html' },
  { src: 'diagram-interactive-spine/diagram-interactive-spine.html', dir: 'diagram-interactive-spine', out: 'diagram-interactive-spine.html' },
  { src: 'output-artifact/static-output-artifact.html',            dir: 'output-artifact',            out: 'output-artifact.html' },
];

// Rewrite a src/href value from the canonical shell's perspective (patterns/<dir>/)
// to the preview's perspective (patterns/_preview/).
function rewriteRef(val, dir) {
  if (/^(https?:|data:|#|mailto:)/.test(val)) return val;         // external / anchor — leave
  if (val.startsWith('./_dsa-tokens/')) return '../../' + val.slice('./_dsa-tokens/'.length); // DS-root tokens/fonts
  if (val.startsWith('_dsa-tokens/'))   return '../../' + val.slice('_dsa-tokens/'.length);
  if (val.startsWith('../') || val.startsWith('/')) return val;   // already relative-up / absolute — leave
  // bare pattern-local file (no slash) → reference the canonical pattern dir
  if (!val.includes('/')) return `../${dir}/${val}`;
  return val;
}

const MARKER = (rel, dir) => `<!-- ============================================================
     OWNER PREVIEW — design-system-ASK/patterns/_preview/${path.basename(rel)}
     GENERATED from patterns/${dir}/ by tools/gen-pattern-previews.mjs.
     Consumes the CANONICAL pattern files by reference (../${dir}/) + DS-root
     tokens/fonts (../../). Opens directly via file:// — no server, no mirror.
     OWNER PREVIEW ONLY — DO NOT VENDOR DOWNSTREAM. Do not hand-edit; regenerate
     and parity-check (git diff --exit-code patterns/_preview/).
     ============================================================ -->`;

fs.mkdirSync(OUT, { recursive: true });
const results = [];
for (const s of SHELLS) {
  const srcPath = path.join(PATTERNS, s.src);
  let html = fs.readFileSync(srcPath, 'utf8');
  // rewrite every href="…" / src="…"
  html = html.replace(/\b(href|src)="([^"]*)"/g, (m, attr, val) => `${attr}="${rewriteRef(val, s.dir)}"`);
  // inject the owner-preview marker + a non-visual meta + a theme-from-hash init
  // (so the gallery can open a preview in a chosen theme via #light / #dark or
  // ?theme=…; data-theme wins over prefers-color-scheme per the token CSS). This
  // is an owner-preview-only augmentation — it never touches the canonical template.
  const THEME_INIT = `<script>(function(){try{var t=(location.hash||'').replace('#','')||new URLSearchParams(location.search).get('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>`;
  html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${MARKER(s.out, s.dir)}\n<meta name="dsa-owner-preview" content="do-not-vendor; generated from patterns/${s.dir}/">\n${THEME_INIT}`);
  const outPath = path.join(OUT, s.out);
  fs.writeFileSync(outPath, html);
  results.push({ out: s.out, from: s.src, bytes: html.length });
}
console.log(JSON.stringify({ generated: results.length, files: results }, null, 2));
