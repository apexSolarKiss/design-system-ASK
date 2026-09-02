/* diagrams-text-layout.js
   CANONICAL. The single text-layout contract shared by the H, V and SEQ static
   diagram engines.

   TARGET SET, declared here rather than implied by this folder's name:

     HVS_TEXT_LAYOUT_TARGETS   diagram-static-H · diagram-static-V · diagram-static-SEQ
     EXPLICITLY EXCLUDED       diagram-static-FLOW · diagram-interactive-spine

   FLOW is the fourth Class A static sibling, not an omission. It carries a
   different grammar — window.FLOW_DIAGRAM against H/V/SEQ's
   window.DIAGRAMS.render(TREE) over {kind, label, note?, tag?, status?, children?}
   — so extending this helper to it would be a mandate nobody granted. The
   interactive spine takes no text-layout dependency at all. The
   `patterns/_diagram-shared/` plane keeps a generic name and confers no
   authority over every diagram pattern; each member declares its own targets.

   WHAT THIS OWNS
     exact measurement · role metrics · cap application · deterministic line
     breaking · wrapped height · tspan emission

   WHAT IT DOES NOT OWN
     source grammar · topology · placement · connector geometry · the final SVG
     envelope. Those stay with each engine, because H, V and SEQ have genuinely
     different geometry contracts and collapsing them would be a fourth engine
     wearing three names.

   MEASUREMENT PARITY IS THE FIRST GATE. measure() reproduces what each engine's
   preMeasure does today, letter-spacing compensation included, so a string that
   does not wrap measures byte-for-byte as it did before this file existed. That
   is what lets the no-wrap case prove A == L rather than merely look unchanged.
*/
(function () {
  'use strict';

  var VERSION = '1.0.0';

  /* One canvas context for the life of the page. Creating one per call is the
     obvious cost, but the real reason to share it is determinism: a context
     carries its font state, and measurement must not depend on which caller
     touched it last — so every entry point sets .font before reading. */
  var ctx = document.createElement('canvas').getContext('2d');

  /* canvas.measureText DROPS CSS letter-spacing, which the SVG text then
     applies. Each engine already compensates by adding length x spacing; the
     helper carries that same correction so a vendored engine and this file
     cannot drift apart on it. ls is px-per-character, i.e. em x font-size,
     computed by the caller from diagrams.css. */
  function measure(text, font, ls) {
    if (text === null || text === undefined) return 0;
    var s = String(text);
    ctx.font = font;
    var w = ctx.measureText(s).width;
    if (ls) w += s.length * ls;
    return w;
  }

  /* Deterministic greedy break on existing whitespace. Two rules make it
     deterministic rather than merely reasonable:

       1. a token is NEVER split. A single token wider than the cap occupies its
          own line and overflows it. Splitting mid-token would corrupt an
          identifier, a path or a repo slug — the exact strings these diagrams
          exist to name — and no cap is worth that. The engine's column width
          accounts for the overflow through the returned width.

       2. the cap is a MAXIMUM, never a target. Text is not padded toward it and
          lines are not balanced, so the same string with the same cap always
          produces the same lines regardless of what surrounds it.

     A falsy maxWidth disables wrapping entirely. Every role in every current
     consumer passes a finite cap, so that path is available rather than
     exercised — do not read it as a supported no-wrap mode.

     Returns the measured width of the WIDEST line, which is what a column
     needs — not the cap, and not the unwrapped width. */
  function breakLines(text, font, ls, maxWidth) {
    var s = String(text === null || text === undefined ? '' : text);
    if (!s) return { lines: [''], width: 0 };
    var full = measure(s, font, ls);
    if (!maxWidth || full <= maxWidth) return { lines: [s], width: full };

    var words = s.split(/(\s+)/).filter(function (t) { return t.length; });
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (/^\s+$/.test(w)) { if (cur) cur += w; continue; }
      var trial = cur ? cur + w : w;
      if (!cur || measure(trial.replace(/\s+$/, ''), font, ls) <= maxWidth) {
        cur = trial;
      } else {
        lines.push(cur.replace(/\s+$/, ''));
        cur = w;
      }
    }
    if (cur) lines.push(cur.replace(/\s+$/, ''));
    if (!lines.length) lines = [s];

    var widest = 0;
    for (var j = 0; j < lines.length; j++) {
      var lw = measure(lines[j], font, ls);
      if (lw > widest) widest = lw;
    }
    return { lines: lines, width: widest };
  }

  /* The one call an engine makes per string.

     spec = { text, font, ls, maxWidth, lineHeight }

     Returns { lines, count, width, height, wrapped }.

     height is the ADDED height beyond a single line, not the total: an engine
     already knows what one line costs inside its own box model, and returning a
     total would make the helper responsible for box geometry it does not own.
     At no wrap height is 0 and wrapped is false, which is what keeps the
     no-wrap path byte-identical. */
  function layout(spec) {
    var r = breakLines(spec.text, spec.font, spec.ls || 0, spec.maxWidth || 0);
    var count = r.lines.length;
    var lh = spec.lineHeight || 0;
    return {
      lines: r.lines,
      count: count,
      width: r.width,
      height: count > 1 ? (count - 1) * lh : 0,
      wrapped: count > 1
    };
  }

  /* tspan emission. A single line is written as plain text content so the
     no-wrap DOM is identical to what the engines produced before — an
     unconditional tspan would change every diagram's markup to buy nothing.
     Multi-line uses one tspan per line, x re-declared on each (SVG does not
     inherit x across dy shifts) and dy 0 on the first so the first baseline
     stays exactly where the engine put it. */
  function emit(textEl, lines, opts) {
    var x = opts.x;
    var lh = opts.lineHeight || 0;
    if (!lines || lines.length <= 1) {
      textEl.textContent = lines && lines.length ? lines[0] : '';
      return textEl;
    }
    while (textEl.firstChild) textEl.removeChild(textEl.firstChild);
    for (var i = 0; i < lines.length; i++) {
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      t.setAttribute('x', x);
      t.setAttribute('dy', i === 0 ? 0 : lh);
      t.textContent = lines[i];
      textEl.appendChild(t);
    }
    return textEl;
  }

  window.DIAGRAM_TEXT_LAYOUT = {
    VERSION: VERSION,
    TARGETS: ['diagram-static-H', 'diagram-static-V', 'diagram-static-SEQ'],
    EXCLUDED: ['diagram-static-FLOW', 'diagram-interactive-spine'],
    measure: measure,
    layout: layout,
    emit: emit
  };
})();
