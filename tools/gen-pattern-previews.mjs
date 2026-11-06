// gen-pattern-previews.mjs — OWNER-ONLY pattern preview generator.
//
// Produces patterns/_preview/*.html from the CANONICAL pattern templates by a
// deterministic path rewrite, so a maintainer can double-click a preview from a
// clean design-system-ASK clone and see each pattern render with no server and
// no local `_dsa-tokens/` mirror. The previews consume the canonical pattern
// files BY REFERENCE (`../<pattern-dir>/…`) and the DS-repo-root tokens/fonts
// (`../../…`); they never copy them. This generator IS the parity mechanism:
// `--check` compares both generated sets with what it would write — any drift
// means a canonical template or the host markup below changed and the set must
// be regenerated; after regenerating, `git diff --exit-code patterns/_preview/
// patterns/view/` shows what changed.
//
// It changes NO canonical consumer template and adds NO downstream obligation.
//
// It also writes one HOST page per preview, patterns/view/<name>.html: the site's surface-shell chrome
// (mark, breadcrumb, navigation, footer) around a frame that loads the specimen above, unchanged. The
// gallery's pattern cards link the hosts; a host links its specimen as its standalone action. The host
// chrome is authored HERE, in renderHost: it consumes surface-shell for the host's own chrome, so a
// shell contract change is made in renderHost, regenerated, checked and verified like the gallery page.
// HOST_SPECS below declares, per preview, why it needs a frame of its own and how the frame is sized:
// 'viewport' for a specimen that owns its window (a fixed-viewport diagram, a sticky-header document,
// the self-chromed shell specimen), 'flow' for a document that scrolls with the page, which the host
// grows to the document's height when the frame is same-origin.
//
// Usage: node tools/gen-pattern-previews.mjs [--check]   (run from the repo root)

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PATTERNS = path.join(ROOT, 'patterns');
const OUT = path.join(PATTERNS, '_preview');
const VIEW = path.join(PATTERNS, 'view');

// No shell declares preview fit tuning. The FLOW previews once declared every panel available, so
// panels overlaid the figure instead of shrinking it; the canonical FLOW Fit now tests the panels
// against the marks actually drawn, so both FLOW previews show what a consumer receives.

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
  { src: 'diagram-static-FLOW/diagram-static-FLOW.interactive.html', dir: 'diagram-static-FLOW',      out: 'diagram-static-FLOW-static.html',      flowMode: 'static' },
  { src: 'diagram-static-FLOW/diagram-static-FLOW.interactive.html', dir: 'diagram-static-FLOW',      out: 'diagram-static-FLOW-interactive.html' },
  // The peer specimen draws its plates from the canonical source and engine, and follows the system
  // theme; its register modules resolve through the `_dsa-surface/` branch like the other shells'.
  { src: 'diagram-static-peer/diagram-static-peer.html',           dir: 'diagram-static-peer',        out: 'diagram-static-peer.html' },
  // The spine preview takes the canonical Fit unchanged: it shows what a consumer receives.
  { src: 'diagram-interactive-spine/diagram-interactive-spine.html', dir: 'diagram-interactive-spine', out: 'diagram-interactive-spine.html' },
  // The radial surface pattern has two shells. Its primary shell is the REFERENCE specimen: captured
  // research content under reference/ (a pattern-local subdirectory, declared in localDirs), drawn
  // through the complete module stack. The neutral shell runs the same stack on the generated synthetic
  // source, for development inspection. Both take the engine's own Fit, so the previews add no fit tuning.
  { src: 'diagram-interactive-radial/diagram-interactive-radial.html', dir: 'diagram-interactive-radial', out: 'diagram-interactive-radial.html',
    localDirs: ['reference/'] },
  { src: 'diagram-interactive-radial/diagram-interactive-radial.neutral.html', dir: 'diagram-interactive-radial', out: 'diagram-interactive-radial.neutral.html' },
  // The output artifact is a document-register consumer: it loads the register's four root modules,
  // and the two profile modules an assessed comparison needs, by bare filename, as a consumer vendors
  // them beside its template, so they are declared in rootRefs rather than routed through
  // `_dsa-tokens/`, the token and font mirror.
  { src: 'output-artifact/static-output-artifact.html',            dir: 'output-artifact',            out: 'output-artifact.html',
    rootRefs: ['surface-panel.css', 'surface-text-link.css', 'surface-document.css', 'surface-treatments.css', 'spectral-state.css', 'criterion-assessment.css'] },
  // The message-archive preview renders the canonical template as it stands, in its one flavor,
  // default-ASK. The retired AA-compliant preview is no longer generated; write mode removes it.
  { src: 'message-archive/message-archive.template.html',          dir: 'message-archive',            out: 'message-archive-default-ASK.html' },
  // The surface-shell specimen. It carries no diagram engine and no data — the canonical markup IS the
  // pattern — but it is no longer script-free: the OPTIONAL navigation runtime rides along with it, and
  // `surface-shell.js` resolves through the ordinary bare pattern-local branch because it lives in the
  // pattern directory. What does NOT is `surface-action.css`, which lives at the design-system ROOT; it
  // is declared in rootRefs below rather than routed through `_dsa-tokens/`, because that folder means
  // the token and font mirror and a visual module does not belong in it.
  // The gallery page CONSUMES this same pattern for its own chrome; previewing it here is the separate
  // catalog relationship, not that consumption. See CONSUMERS.md.
  { src: 'surface-shell/surface-shell.template.html',              dir: 'surface-shell',              out: 'surface-shell.html',
    rootRefs: ['surface-action.css'] },
];

// Rewrite a src/href value from the canonical shell's perspective (patterns/<dir>/)
// to the preview's perspective (patterns/_preview/).
//
// A canonical template is written from the CONSUMER's perspective: a vendored module sits beside the
// template, so it is referenced by bare filename. That is right downstream and wrong here, where the
// module is not beside the pattern but at the design-system root. Rather than teach the template about
// this repository's layout — or overload `_dsa-tokens/`, which means the token and font mirror — each
// spec DECLARES which of its bare references are root modules, and only the owner-preview transform
// learns where they live. rootRefs is checked before the bare pattern-local branch, so a pattern-local
// sibling and a root module can share the same reference shape in the template.
function rewriteRef(val, spec) {
  if (/^(https?:|data:|#|mailto:)/.test(val)) return val;         // external / anchor — leave
  if (val.startsWith('./_dsa-tokens/')) return '../../' + val.slice('./_dsa-tokens/'.length); // DS-root tokens/fonts
  if (val.startsWith('_dsa-tokens/'))   return '../../' + val.slice('_dsa-tokens/'.length);
  if (val.startsWith('./_dsa-surface/')) return '../../' + val.slice('./_dsa-surface/'.length); // DS-root surface modules
  if (val.startsWith('_dsa-surface/'))   return '../../' + val.slice('_dsa-surface/'.length);
  if (val.startsWith('./_dsa-assets/'))  return '../../assets/' + val.slice('./_dsa-assets/'.length); // DS-root brand assets
  if (val.startsWith('_dsa-assets/'))    return '../../assets/' + val.slice('_dsa-assets/'.length);
  if (val.startsWith('../') || val.startsWith('/')) return val;   // already relative-up / absolute — leave
  if (spec.rootRefs && spec.rootRefs.includes(val)) return `../../${val}`;  // declared DS-root module
  // bare pattern-local file (no slash) → reference the canonical pattern dir
  if (!val.includes('/')) return `../${spec.dir}/${val}`;
  // a file in a pattern-local subdirectory the spec declares → the same path in the canonical pattern dir
  if (spec.localDirs && spec.localDirs.some((d) => val.startsWith(d))) return `../${spec.dir}/${val}`;
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
const STATIC_FLOW_HINT = 'Static view // topology only. Open the interactive preview for node definitions.';

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

// Fail-closed root-module graph: a rootRefs declaration is also the shell's contract for which root
// modules it loads and in what order, so the transform asserts it before rewriting anything. Each
// declared ref must be unique, occur exactly once as an href or src value in the canonical shell, and
// occur in declared order. Without this, a shell that dropped, repeated or reordered a module would
// regenerate cleanly and `--check` would accept the broken result as the new expected output.
function assertRootRefs(html, s) {
  const refs = s.rootRefs;
  if (new Set(refs).size !== refs.length) throw new Error(`gen-pattern-previews: rootRefs for ${s.out} declares ${refs.join(', ')}, which repeats an entry — refusing to emit.`);
  const found = [...html.matchAll(/\b(?:href|src)="([^"]*)"/g)].map((m) => m[1]).filter((v) => refs.includes(v));
  for (const r of refs) {
    const n = found.filter((v) => v === r).length;
    if (n !== 1) throw new Error(`gen-pattern-previews: expected exactly one href or src "${r}" in ${s.src}, found ${n} — canonical shell changed; refusing to emit.`);
  }
  if (found.some((v, i) => v !== refs[i])) throw new Error(`gen-pattern-previews: root modules in ${s.src} occur as ${found.join(', ')}, declared ${refs.join(', ')} — canonical shell changed; refusing to emit.`);
}

// Deterministic transform: canonical shell -> preview HTML. Pure (no I/O side effects beyond
// reading the canonical source), so `--check` can compute the expected set in memory.
function render(s) {
  let html = fs.readFileSync(path.join(PATTERNS, s.src), 'utf8');
  if (s.rootRefs) assertRootRefs(html, s);
  html = html.replace(/\b(href|src)="([^"]*)"/g, (m, attr, val) => `${attr}="${rewriteRef(val, s)}"`);
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

// ---- Host pages (patterns/view/) -------------------------------------------------------------------
// A host is the ordinary site page a preview is inspected in. It composes the surface-shell pattern the
// way the gallery does — same mark, breadcrumb grammar, footer family and navigation runtime — and puts
// the specimen in a frame, so the specimen keeps its own document: its window, fixed layout, landmarks,
// theme hooks and global ids. The host writes nothing into that document; in a flow stage it touches only
// the specimen's address and scroll restoration, as the host script's notes below say. It reads a
// same-origin flow specimen's layout to size the frame, passes its own query and fragment through at load
// (#light, #dark, ?theme=, #node=, ?export=), so a host link opens the specimen the way a direct specimen
// link does, and sends a link that leaves the specimen's document to the whole tab, as it goes when the
// specimen stands alone. A flow specimen does not scroll inside its frame, so the host scrolls its own
// window to the element a fragment names, clear of the shell's band, as a document of its own would.

// Why each preview takes a frame rather than direct composition, and how the frame is sized. Every
// preview must be declared; the transform refuses to emit a host without a reason.
const FIXED_APP = 'a fixed-viewport application: its shell is position: fixed over a body that does not scroll, so it needs a window of its own';
const HOST_SPECS = {
  'diagram-static-H.html':                   { stage: 'viewport', why: FIXED_APP },
  'diagram-static-V.html':                   { stage: 'viewport', why: FIXED_APP },
  'diagram-static-SEQ.html':                 { stage: 'viewport', why: FIXED_APP },
  'diagram-static-FLOW-static.html':         { stage: 'viewport', why: FIXED_APP, note: 'static view' },
  'diagram-static-FLOW-interactive.html':    { stage: 'viewport', why: FIXED_APP, note: 'interactive view' },
  'diagram-static-peer.html':                { stage: 'flow', why: 'a complete document with its own main landmark, h1 and page script' },
  'diagram-interactive-spine.html':          { stage: 'viewport', why: FIXED_APP },
  'diagram-interactive-radial.html':         { stage: 'viewport', why: FIXED_APP, note: 'Consciousness + free will, the captured research reference' },
  'diagram-interactive-radial.neutral.html': { stage: 'viewport', why: FIXED_APP, note: 'Vellmark parks, the synthetic composition' },
  'output-artifact.html':                    { stage: 'flow', why: 'a sealed-use document scaffold with its own root theme rules, main landmark and h1' },
  'message-archive-default-ASK.html':        { stage: 'viewport', why: 'a document whose sticky search bar and day headings scroll inside its own window' },
  'surface-shell.html':                      { stage: 'viewport', why: 'the shell specimen itself: a second surface-shell whose runtime binds the first .surface in its own document' },
};

const HOST_MARKER = (out, why) => `<!-- ============================================================
     OWNER PREVIEW HOST — design-system-ASK/patterns/view/${out}
     GENERATED by tools/gen-pattern-previews.mjs. The site's surface-shell
     chrome around a frame that loads ../_preview/${out}, unchanged.
     Framed because the specimen is ${why}.
     OWNER PREVIEW ONLY — DO NOT VENDOR DOWNSTREAM. Do not hand-edit; regenerate
     and parity-check (node tools/gen-pattern-previews.mjs --check).
     ============================================================ -->`;

// The stage clears the shell's own furniture: in desktop mode the seated mark's band at the top, on a
// phone the seat's reserve at the bottom, so a stage scrolled to its edge fits the window. A flow stage
// starts at the same height and the script below grows it to the document once the frame is readable.
// The scroll padding is the reading pages' fragment clearance; the script places a flow specimen's
// fragment target at it, and the browser honors it when it carries the specimen's own fragment scroll
// up to the page. It applies only once the script has first placed a target or followed a link inside
// the specimen (.pv-clear), so it is absent while the browser restores a reloaded page's position.
const HOST_STYLE = `<style>
  body { min-height: 100vh; }
  :root.pv-clear[data-surface-nav-mode="desktop"] { scroll-padding-top: calc(var(--surface-nav-top-depth) + var(--space-5)); }
  .pv-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin: 0 0 var(--space-5); }
  .pv-stage { margin: 0; }
  .pv-stage .caption { margin: 0 0 var(--space-3); }
  .pv-frame { display: block; width: 100%; border: 1px solid var(--line-1); background: transparent; }
  .pv-frame { height: 82vh; height: 82dvh; min-height: 20rem; }
  :root[data-surface-nav-mode="desktop"] .pv-frame { height: calc(100dvh - var(--surface-nav-top-depth) - 2 * var(--space-5)); }
  :root[data-surface-nav-mode="mobile"] .pv-frame { height: calc(100dvh - var(--surface-nav-reserve) - var(--space-5)); }
</style>`;

// Runs straight after the frame, which has no src until this sets one, so the specimen loads once, at
// the host's own query and fragment, and the load listener is in place before it starts. A change to the
// host's fragment before the frame has loaded re-plans that load. After it, the frame is never navigated
// for the host's address: a flow host places the target a new host fragment names, a viewport host leaves
// its specimen as it is, and Back and Forward between host addresses are the browser's own restoration.
// The host tells a new host entry from a return to one by a marker it keeps in its own history.state.
// The two addresses are then independent: a later host fragment does not reach a viewport specimen (a
// radial #node= change, for one), and after a host-level edit a link inside the specimen adds history the
// way the specimen's own address, not the host's, dictates.
// The standalone action follows the host's address.
// Fragments in a flow stage. A fragment moves the page only when it names an element in the specimen, so
// the theme fragments and application state (#light, #dark, #node=) never do. Before load the host cannot
// see the specimen, so it holds back any fragment that is neither theme nor state: the frame loads at a
// placeholder that names nothing (so the specimen reads its theme exactly as it would at the real
// address) and takes the real fragment in place once it has grown and its fonts are ready, or after two
// seconds. The page then moves once, to the target, rather than first toward a frame still at its
// starting height. If the reader has scrolled or navigated meanwhile (a scroll inside the frame before
// it grew is carried into the page), the host does not move the page: it gives the frame's address the
// fragment without a navigation (history.replaceState), or drops it. A reload or a return through history keeps the page where the browser restores it, as a
// document of its own would, in the same way; if the browser brings the frame back at its last address,
// fragment included, the host first parks it at the placeholder, because navigating to a fragment makes
// the browser scroll the page to it, and keep doing so as the frame grows. The host places a target at
// its scroll padding, measuring the frame from layout offsets, because the frame's on-screen box can lag
// while the browser is still carrying the specimen's own fragment scroll up to the page. It leaves a
// landing within a pixel of its own alone, so the browser's fractional landing is not nudged. Leaving a place
// inside the specimen, by a link or by Back or Forward, records where the page was; returning to it
// restores that, as it would in a document of its own. For that the host takes over the specimen's
// scroll restoration, which a frame that never scrolls inside has no use for, and which would otherwise
// move the page after the host had. Positions are kept per specimen address for the life of the page.
// A file:// frame is not readable from its host: there a flow stage keeps its starting height and
// scrolls inside, so the specimen scrolls to its own fragment, and a link inside the specimen opens in
// the frame; the standalone action opens the specimen alone.
const HOST_SCRIPT = `<script>
(function () {
  var frame = document.currentScript.previousElementSibling;
  var base = frame.getAttribute('data-pv-src');
  var solo = document.querySelector('a[data-pv-standalone]');
  var flow = frame.getAttribute('data-pv-stage') === 'flow';
  var HOLD = '#pv-held';
  var held = '', loaded = false, touched = false, spots = {}, pending = null, y0 = window.pageYOffset;
  var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  var keep = !!nav && (nav.type === 'reload' || nav.type === 'back_forward');
  function stamp() {
    try {
      var st = history.state, o = {};
      if (st && typeof st === 'object') for (var k in st) o[k] = st[k];
      o.pvHost = 1;
      history.replaceState(o, '');
    } catch (e) {}
  }
  if (!(history.state && history.state.pvHost)) stamp();
  function touch(e) {
    if (e.type === 'keydown' && (e.metaKey || e.ctrlKey || e.altKey || !/^(PageUp|PageDown|Home|End|ArrowUp|ArrowDown| |Spacebar|Tab|Enter)$/.test(e.key))) return;
    touched = true;
  }
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { window.addEventListener(t, touch, { capture: true, passive: true }); });
  function plan() {
    var h = location.hash;
    if (solo) solo.href = base + location.search + h;
    held = flow && h.length > 1 && h !== '#light' && h !== '#dark' && h.indexOf('=') < 0 ? h : '';
    return base + location.search + (held ? HOLD : h);
  }
  function anchor(d, h) {
    var raw = (h || '').slice(1), id = raw;
    if (!raw || raw === 'light' || raw === 'dark') return null;
    try { id = decodeURIComponent(raw); } catch (e) {}
    var el = d.getElementById(raw) || d.getElementById(id);
    if (el) return el;
    var names = [raw, id];
    for (var j = 0; j < names.length; j++) {
      var named = d.getElementsByName(names[j]);
      for (var i = 0; i < named.length; i++) if (named[i].tagName === 'A') return named[i];
    }
    return null;
  }
  function clear() { document.documentElement.classList.add('pv-clear'); }
  function reveal(el) {
    clear();
    var w = frame.contentWindow, y = frame.clientTop;
    for (var n = frame; n; n = n.offsetParent) y += n.offsetTop;
    y += el.getBoundingClientRect().top + w.pageYOffset;
    y -= (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + (parseFloat(w.getComputedStyle(el).scrollMarginTop) || 0);
    y = Math.max(0, Math.round(y));
    if (Math.abs(window.pageYOffset - y) > 1) window.scrollTo(0, y);
  }
  function arrive(e) {
    var to = (e && e.newURL) || frame.contentWindow.location.href, pushed = pending === to;
    if (pushed) pending = null;
    if (!pushed) {
      if (e && e.oldURL) spots[e.oldURL] = window.pageYOffset;
      if (Object.prototype.hasOwnProperty.call(spots, to)) { window.scrollTo(0, spots[to]); return; }
    }
    var el = anchor(frame.contentDocument, to.indexOf('#') < 0 ? '' : to.slice(to.indexOf('#')));
    if (el) reveal(el);
  }
  function fit() {
    try {
      var d = frame.contentDocument, w = frame.contentWindow;
      if (!d || !d.body) return;
      var bottom = 0;
      Array.prototype.forEach.call(d.body.children, function (el) {
        if (/^(SCRIPT|TEMPLATE|STYLE)$/.test(el.tagName)) return;
        var r = el.getBoundingClientRect();
        bottom = Math.max(bottom, r.bottom + parseFloat(w.getComputedStyle(el).marginBottom || 0));
      });
      var h = Math.ceil(bottom + w.scrollY + parseFloat(w.getComputedStyle(d.body).paddingBottom || 0));
      if (h > 0 && Math.abs(h - frame.offsetHeight) > 1) frame.style.height = h + 'px';
    } catch (e) {}
  }
  function leaveWhole(d) {
    d.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.hasAttribute('download') || (a.getAttribute('target') && a.getAttribute('target') !== '_self')) return;
      var u, here;
      try { u = new URL(a.href); here = new URL(d.location.href); } catch (x) { return; }
      if (!/^(https?|file):$/.test(u.protocol)) return;
      if (u.origin === here.origin && u.pathname === here.pathname && u.search === here.search) {
        if (flow && u.href.indexOf('#') >= 0) {
          if (u.href === here.href) { var t = anchor(d, u.hash); if (t) setTimeout(function () { reveal(t); }, 0); }
          else { spots[here.href] = window.pageYOffset; pending = u.href; clear(); }
        }
        return;
      }
      var had = a.getAttribute('target');
      a.setAttribute('target', '_top');
      setTimeout(function () { if (had === null) a.removeAttribute('target'); else a.setAttribute('target', had); }, 0);
    }, true);
  }
  frame.addEventListener('load', function () {
    var d = null, w = frame.contentWindow;
    try { if (w.location.href === 'about:blank') return; } catch (e) {}
    loaded = true;
    try { d = frame.contentDocument; } catch (e) {}
    if (!d || !d.body) {
      var h0 = held; held = '';
      if (h0) try { w.location.replace(base + location.search + h0); } catch (e) {}
      return;
    }
    leaveWhole(d);
    if (!flow) return;
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { d.addEventListener(t, touch, { capture: true, passive: true }); });
    if (keep && anchor(d, w.location.hash)) {
      held = w.location.hash;
      pending = w.location.href.split('#')[0] + HOLD;
      w.location.replace(pending);
    }
    var inner = w.pageYOffset;
    fit();
    if (inner > 0) { touched = true; window.scrollTo(0, window.pageYOffset + inner); }
    try { new w.ResizeObserver(fit).observe(d.body); } catch (e) {}
    try { w.history.scrollRestoration = 'manual'; } catch (e) {}
    w.addEventListener('hashchange', arrive);
    var ready = d.fonts && d.fonts.ready ? Promise.race([d.fonts.ready, new Promise(function (r) { setTimeout(r, 2000); })]) : Promise.resolve();
    ready.then(function () {
      fit();
      var h = held; held = '';
      if (h) {
        if (w.location.hash !== HOLD) return;
        var to = w.location.href.split('#')[0] + h;
        if (keep || touched || window.pageYOffset !== y0) { try { w.history.replaceState(w.history.state, '', to); } catch (e) {} return; }
        pending = to;
        clear();
        w.location.replace(to);
        return;
      }
      var el = !keep && !touched && anchor(d, w.location.hash);
      if (el) reveal(el);
    });
  });
  window.addEventListener('hashchange', function () {
    if (!loaded) { if (!(history.state && history.state.pvHost)) stamp(); frame.src = plan(); return; }
    if (solo) solo.href = base + location.search + location.hash;
    held = '';
    var fresh = !(history.state && history.state.pvHost);
    if (fresh) stamp();
    if (!flow || !fresh) return;
    var d = null;
    try { d = frame.contentDocument; } catch (e) {}
    var el = d && anchor(d, location.hash);
    if (el) reveal(el);
  });
  frame.src = plan();
})();
</script>`;

const REPO_ACTION = '<a class="surface-action surface-action--secondary" href="https://github.com/apexSolarKiss/design-system-ASK" target="_blank" rel="noopener">repository</a>';
const DESIGN_ACTION = '<a class="surface-action surface-action--secondary" href="https://a-s-k.studio/apex-solar-kiss/design">design</a>';
const SEP = '<span class="sep" aria-hidden="true">//</span>';

function renderHost(s) {
  const name = s.out.replace(/\.html$/, '');
  const specimen = `../_preview/${s.out}`;
  const h = HOST_SPECS[s.out];
  if (!h || (h.stage !== 'viewport' && h.stage !== 'flow') || !h.why) throw new Error(`gen-pattern-previews: ${s.out} has no host declaration (a stage, 'viewport' or 'flow', and why it is framed) — refusing to emit.`);
  const what = `The ${s.dir} owner preview${h.note ? ', ' + h.note : ''}.`;
  const siblings = SHELLS.map((o) => o.out === s.out
    ? '      <li data-surface-nav-current></li>'
    : `      <li><a href="${o.out}">${o.out.replace(/\.html$/, '')}</a></li>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>design-system-ASK // pattern previews // ${name}</title>
<meta name="dsa-owner-preview" content="do-not-vendor; generated host for patterns/_preview/${s.out}">
<meta name="description" content="${what} Framed by the design-system-ASK site.">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${HOST_MARKER(s.out, h.why)}
${THEME_INIT}
<link rel="stylesheet" href="../../colors_and_type.css">
<link rel="stylesheet" href="../../surface-action.css">
<link rel="stylesheet" href="../surface-shell/surface-shell.css">
${HOST_STYLE}
</head>
<body>
<div class="surface">
  <header class="surface-head">
    <div class="surface-head-main">
      <a class="surface-mark" href="../../index.html" aria-label="design-system-ASK home">
        <img class="surface-mark-light" src="../../assets/logo-ASK-white.png" alt="" aria-hidden="true" width="2160" height="974">
        <img class="surface-mark-dark" src="../../assets/logo-ASK-lavender-ASK.png" alt="" aria-hidden="true" width="2160" height="974">
      </a>
      <nav class="surface-breadcrumb" aria-label="Breadcrumb">
        <h1 class="surface-title"><a class="org" href="https://a-s-k.studio/">ASK</a> ${SEP} <a href="https://a-s-k.studio/apex-solar-kiss">apex solar kiss</a> ${SEP} <a href="../../index.html">design-system-ASK</a> ${SEP} <a href="../index.html">pattern previews</a> ${SEP} <span class="page" aria-current="page">${name}</span></h1>
      </nav>
      <p class="surface-lede">${what} The frame below holds the generated specimen, unchanged.</p>
      <span class="surface-badge">owner preview &gt;&gt; do not vendor</span>
    </div>
  </header>

  <hr class="surface-rule">

  <main class="surface-payload">
    <p class="pv-actions"><a class="surface-action surface-action--secondary" href="${specimen}" data-pv-standalone>open standalone specimen</a></p>
    <figure class="pv-stage">
      <figcaption class="caption">specimen</figcaption>
      <iframe class="pv-frame" data-pv-src="${specimen}" data-pv-stage="${h.stage}" title="${name} specimen"></iframe>
${HOST_SCRIPT}
      <noscript><p class="caption">the frame needs JavaScript // open the standalone specimen above</p></noscript>
    </figure>
  </main>

  <footer class="surface-footer">
    <a class="surface-action surface-action--secondary" href="../../index.html">design-system-ASK</a>
    <a class="surface-action surface-action--secondary" href="../index.html">pattern previews</a>
    <a class="surface-action surface-action--secondary" href="../../preview/styleguide.html">style guide</a>
    ${REPO_ACTION}
  </footer>

  <!-- The breadcrumb names the path; the panel derives it. The local list is the
       previews themselves, this one marked current — no ancestor is repeated. -->
  <template class="surface-nav-source">
    <ul class="surface-nav-local">
${siblings}
    </ul>
    <p class="surface-nav-utilities">
      ${DESIGN_ACTION}
      ${REPO_ACTION}
    </p>
  </template>

</div>
<script src="../surface-shell/surface-shell.js"></script>
</body>
</html>
`;
}

const expected = new Map(SHELLS.map(s => [s.out, render(s)]));           // filename -> content
const expectedHosts = new Map(SHELLS.map(s => [s.out, renderHost(s)])); // host filename -> content
const CHECK = process.argv.includes('--check');

// The parity gate must catch BOTH content drift and SET drift (a retired/renamed canonical
// shell leaving a stale orphan preview behind). So we always account for the full on-disk
// *.html set, never just the expected files.
const onDisk = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter(f => f.endsWith('.html')) : [];
const onDiskHosts = fs.existsSync(VIEW) ? fs.readdirSync(VIEW).filter(f => f.endsWith('.html')) : [];

if (CHECK) {
  const missing = [], differing = [], unexpected = [];
  for (const [dir, rel, want, have] of [[OUT, '_preview/', expected, onDisk], [VIEW, 'view/', expectedHosts, onDiskHosts]]) {
    for (const [name, content] of want) {
      const p = path.join(dir, name);
      if (!fs.existsSync(p)) missing.push(rel + name);
      else if (fs.readFileSync(p, 'utf8') !== content) differing.push(rel + name);
    }
    for (const f of have) if (!want.has(f)) unexpected.push(rel + f);   // orphan / stale preview or host
  }
  const clean = !missing.length && !differing.length && !unexpected.length;
  console.log(JSON.stringify({ check: true, clean, expectedCount: expected.size + expectedHosts.size, onDiskCount: onDisk.length + onDiskHosts.length, missing, differing, unexpected }, null, 2));
  process.exit(clean ? 0 : 1);
}

// write mode: remove EVERY existing generated *.html in both sets first (so a retired shell cannot
// leave an orphan), then write the expected sets. `git diff --exit-code patterns/_preview/ patterns/view/`
// then shows content-drift; the orphan removal shows set-drift as a deletion in the same diff.
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(VIEW, { recursive: true });
for (const f of onDisk) fs.rmSync(path.join(OUT, f));
for (const f of onDiskHosts) fs.rmSync(path.join(VIEW, f));
const results = [];
for (const s of SHELLS) {
  fs.writeFileSync(path.join(OUT, s.out), expected.get(s.out));
  fs.writeFileSync(path.join(VIEW, s.out), expectedHosts.get(s.out));
  results.push({ out: s.out, from: s.src, bytes: expected.get(s.out).length, host: 'view/' + s.out, hostBytes: expectedHosts.get(s.out).length });
}
console.log(JSON.stringify({ generated: results.length * 2, removedBeforeWrite: onDisk.length + onDiskHosts.length, files: results }, null, 2));
