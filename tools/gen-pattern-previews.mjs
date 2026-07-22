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

// FLOW previews declare all four chrome rectangles available (panels overlay instead of shrinking
// the figure); a shared constant so the static + interactive FLOW previews get an IDENTICAL camera.
const FLOW_PREVIEW_FIT = { dropSelectors: ['topSelector', 'bottomSelector', 'leftSelector', 'rightSelector'] };

// canonical shell → { dir, out preview filename, previewFit?, flowMode? }
const SHELLS = [
  { src: 'diagram-static-H/diagram-static-H.html',                 dir: 'diagram-static-H',           out: 'diagram-static-H.html' },
  { src: 'diagram-static-V/diagram-static-V.html',                 dir: 'diagram-static-V',           out: 'diagram-static-V.html' },
  { src: 'diagram-static-SEQ/diagram-static-SEQ.html',             dir: 'diagram-static-SEQ',         out: 'diagram-static-SEQ.html' },
  // Both FLOW previews render the SAME full-chrome shell (diagram-static-FLOW.interactive.html) so the
  // gallery's static + interactive cards share identical chrome, camera, and live-theme behaviour; the
  // generator forces FLOW_MODE='static' for the static output. The canonical chrome-free export shell
  // (diagram-static-FLOW.html) is intentionally NOT previewed — it owns the export/article role and
  // hard-codes a light theme, so it is not the gallery's illustration of static mode.
  { src: 'diagram-static-FLOW/diagram-static-FLOW.interactive.html', dir: 'diagram-static-FLOW',      out: 'diagram-static-FLOW-static.html',      previewFit: FLOW_PREVIEW_FIT, flowMode: 'static' },
  { src: 'diagram-static-FLOW/diagram-static-FLOW.interactive.html', dir: 'diagram-static-FLOW',      out: 'diagram-static-FLOW-interactive.html', previewFit: FLOW_PREVIEW_FIT },
  { src: 'diagram-interactive-spine/diagram-interactive-spine.html', dir: 'diagram-interactive-spine', out: 'diagram-interactive-spine.html', previewFit: { scaleMult: 1.3 } },
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

// theme-from-hash init (owner-preview-only augmentation; the gallery opens a preview in a
// chosen theme via #light / #dark or ?theme=…; data-theme wins over prefers-color-scheme per
// the token CSS). It never touches the canonical template.
const THEME_INIT = `<script>(function(){try{var t=(location.hash||'').replace('#','')||new URLSearchParams(location.search).get('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>`;

// OWNER-PREVIEW-ONLY initial-view tuning (emitted only when a shell declares `previewFit`).
// Both diagram engines route EVERY fit through the shared global window.DIAGRAM_FIT.compute
// (diagrams-fit.js). This wraps THAT global for a single preview — so the illustrative gallery
// sets its own initial camera + reserved space WITHOUT editing any canonical engine, CSS, or
// diagrams-fit.js, and without hand-editing the generated shell. The preview is acting as a
// first-party DS-repo-level "consumer": the canonical default fit stays conservative; this
// preview declares a looser, illustrative composition. Injected right after the diagrams-fit.js
// tag, so it patches the contract before the engine's render() runs its first fit.
//   scaleMult      multiply the fitted scale, holding the fitted content-centre fixed (initial camera)
//   dropSelectors  panel selector keys THIS preview treats as available (no reservation), letting
//                  those panels overlay the figure instead of shrinking + off-centring it
const PREVIEW_FIT = (cfg) => `<script>
/* OWNER-PREVIEW-ONLY fit tuning — generated by tools/gen-pattern-previews.mjs. Wraps the shared
   DS fit contract for THIS illustrative preview only; the canonical engine, CSS, and
   diagrams-fit.js are untouched. Regenerate — do not hand-edit. */
(function () {
  var CFG = ${JSON.stringify(cfg)};
  var FIT = window.DIAGRAM_FIT;
  if (!FIT || typeof FIT.compute !== 'function') return;
  var base = FIT.compute;
  function num(v, d) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : d; }
  FIT.compute = function (opts) {
    opts = opts || {};
    if (CFG.dropSelectors) {
      opts = Object.assign({}, opts);
      CFG.dropSelectors.forEach(function (k) { opts[k] = null; });
    }
    var r = base(opts);
    if (CFG.scaleMult && r && isFinite(r.scale)) {
      // Scale about the fitted content-centre so the illustrative view grows in place rather
      // than drifting: screen(content-centre) is held fixed as scale -> scale * k.
      var b = opts.bounds || {};
      var cx = (num(b.minX, 0) + num(b.maxX, 0)) / 2;
      var cy = (num(b.minY, 0) + num(b.maxY, 0)) / 2;
      var k = CFG.scaleMult;
      r = Object.assign({}, r, {
        scale: r.scale * k,
        tx: r.tx - (k - 1) * cx * r.scale,
        ty: r.ty - (k - 1) * cy * r.scale
      });
    }
    return r;
  };
})();
</script>`;

// Inert panel hint for the forced-static FLOW preview. In static mode the engine installs no node
// hit layer, so the interactive shell's "hover a node …" copy would be inaccurate; the panel keeps
// its box + footprint and states the honest static affordance.
const STATIC_FLOW_HINT = 'Static view — topology only. Open the interactive preview for node definitions.';

// Fail-closed single replacement: throw unless the pattern matches EXACTLY once, so a changed
// canonical shell can never silently emit the wrong artifact — e.g. an interactive page under the
// static filename because the FLOW_MODE assignment moved. `--check` alone would otherwise accept
// whatever the generator produced as its new expected output; this makes the transform assert its
// own preconditions, consistent with the generated-set parity gate below.
function replaceOnce(html, re, replacement, what, out) {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const n = (html.match(g) || []).length;
  if (n !== 1) throw new Error(`gen-pattern-previews: expected exactly one ${what} in ${out}, found ${n} — canonical shell changed; refusing to emit.`);
  return html.replace(re, replacement);
}

// Deterministic transform: canonical shell -> preview HTML. Pure (no I/O side effects beyond
// reading the canonical source), so `--check` can compute the expected set in memory.
function render(s) {
  let html = fs.readFileSync(path.join(PATTERNS, s.src), 'utf8');
  html = html.replace(/\b(href|src)="([^"]*)"/g, (m, attr, val) => `${attr}="${rewriteRef(val, s.dir)}"`);
  html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${MARKER(s.out, s.dir)}\n<meta name="dsa-owner-preview" content="do-not-vendor; generated from patterns/${s.dir}/">\n${THEME_INIT}`);
  // Preview-only initial-view tuning: inject right after the shared fit contract loads, before
  // the engine's render()/fit() runs. Owner-preview-only; changes no canonical file.
  if (s.previewFit) {
    html = html.replace(/(<script src="[^"]*diagrams-fit\.js"><\/script>)/i, (m) => `${m}\n${PREVIEW_FIT(s.previewFit)}`);
  }
  // FLOW static preview: drive the shared full-chrome shell into static mode (same chrome + camera as
  // the interactive preview, no node interaction) and correct the interactive-only panel hint. The
  // FLOW_MODE replacement rewrites the WHOLE statement line — assignment AND its trailing comment —
  // because the inherited comment describes the interactive canonical shell and would be false in this
  // generated static artifact; matching the full line also strengthens the fail-closed precondition.
  if (s.flowMode) {
    const modeComment = s.flowMode === 'static'
      ? 'owner-preview static mode; full chrome retained, node inspection disabled'
      : `owner-preview ${s.flowMode} mode`;
    html = replaceOnce(html, /window\.FLOW_MODE\s*=\s*'[^']*';[^\n]*/, `window.FLOW_MODE = '${s.flowMode}';  // ${modeComment}`, "FLOW_MODE statement line", s.out);
    if (s.flowMode === 'static') {
      html = replaceOnce(html, /(<div class="fp-hint">)[\s\S]*?(<\/div>)/, `$1${STATIC_FLOW_HINT}$2`, "flow-panel hint", s.out);
    }
  }
  return html;
}

const expected = new Map(SHELLS.map(s => [s.out, render(s)]));           // filename -> content
const CHECK = process.argv.includes('--check');

// The parity gate must catch BOTH content drift and SET drift (a retired/renamed canonical
// shell leaving a stale orphan preview behind). So we always account for the full on-disk
// *.html set, never just the expected files.
const onDisk = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter(f => f.endsWith('.html')) : [];

if (CHECK) {
  const missing = [], differing = [], unexpected = [];
  for (const [name, content] of expected) {
    const p = path.join(OUT, name);
    if (!fs.existsSync(p)) missing.push(name);
    else if (fs.readFileSync(p, 'utf8') !== content) differing.push(name);
  }
  for (const f of onDisk) if (!expected.has(f)) unexpected.push(f);   // orphan / stale preview
  const clean = !missing.length && !differing.length && !unexpected.length;
  console.log(JSON.stringify({ check: true, clean, expectedCount: expected.size, onDiskCount: onDisk.length, missing, differing, unexpected }, null, 2));
  process.exit(clean ? 0 : 1);
}

// write mode: remove EVERY existing generated *.html first (so a retired shell cannot leave an
// orphan), then write the expected set. `git diff --exit-code patterns/_preview/` then shows
// content-drift; the orphan removal shows set-drift as a deletion in the same diff.
fs.mkdirSync(OUT, { recursive: true });
for (const f of onDisk) fs.rmSync(path.join(OUT, f));
const results = [];
for (const s of SHELLS) { fs.writeFileSync(path.join(OUT, s.out), expected.get(s.out)); results.push({ out: s.out, from: s.src, bytes: expected.get(s.out).length }); }
console.log(JSON.stringify({ generated: results.length, removedBeforeWrite: onDisk.length, files: results }, null, 2));
