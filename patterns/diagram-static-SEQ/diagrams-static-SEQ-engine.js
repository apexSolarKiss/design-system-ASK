/* diagrams-static-SEQ-engine.js — static "sequence diagram" Class A pattern.
   Sequence engine for ASK-family diagrams: an ORDERED top→down sequence of
   steps, as distinct from a tree (no hierarchy implied — succession is the
   relation, drawn with arrows).

   Derived from diagrams-static-V-engine.js (2026-06-11). Same public contract
   (window.DIAGRAMS.render(TREE)), same data grammar, same diagrams.css classes,
   same PNG export. The engine FLATTENS the node tree depth-first into a linear
   run, so the same .source.js renders in the V engine (as a spine) or in this
   engine (as a sequence). Geometry differences:

     1. the ROOT box stands alone — no connector to the first step;
     2. steps are joined by vertical ARROWS (sequence, not tree relationship);
     3. everything is LEFT-ALIGNED: boxes share a left edge, text inside boxes
        is left-aligned, and the connector runs at a small indent from the
        left edge rather than down a horizontal center.

   Expects a linear chain (each node at most one child). A branching tree fed
   to this engine renders in depth-first order with a documented warning —
   use the V or H engine for trees.

   Arrowheads are explicit <path class="edge-arrowhead"> triangles (not SVG
   markers) so theme vars + the PNG exporter's computed-style inlining apply
   reliably. Style rule lives in the shared diagrams.css:
   .edge-arrowhead { fill: var(--diagram-line); stroke: none; }

   Graduated from the asset-pipeline-ASK reference implementation (handoff
   2026-06-11). This design-system-ASK copy is canonical; consumers vendor it
   by reference, never fork.
*/
(function () {
  /* FAIL-CLOSED on a partial re-vendor. diagrams-fit.js is a DS-owned support file that
     must be copied alongside this engine and loaded immediately BEFORE it. A silent
     legacy fallback is deliberately NOT provided: a consumer that vendored the engine
     without the helper would then look current while keeping the old panel-collision
     geometry. Fail visibly instead. */
  if (!window.DIAGRAM_FIT || typeof window.DIAGRAM_FIT.compute !== 'function') {
    throw new Error('Diagram fit support is missing. Load diagrams-fit.js before the diagram engine.');
  }
  /* FAIL-CLOSED on the text-layout carrier, on the same terms as the fit carrier.
     The INTERFACE is checked, not merely the global: a stale mirror that predates a
     method would pass a truthiness test and then fail deep inside layout, where the
     error names nothing useful. The check covers the WHOLE published interface,
     including members this engine never calls itself — `measure` is the contract's
     measurement primitive, and SEQ gates `rendersTag` although it renders no tags.
     A mirror missing any of them is incomplete, and an incomplete mirror should fail
     here rather than in whichever consumer does use the missing member. */
  if (!window.DIAGRAM_TEXT_LAYOUT
      || typeof window.DIAGRAM_TEXT_LAYOUT.measure !== 'function'
      || typeof window.DIAGRAM_TEXT_LAYOUT.layoutRole !== 'function'
      || typeof window.DIAGRAM_TEXT_LAYOUT.roleFor !== 'function'
      || typeof window.DIAGRAM_TEXT_LAYOUT.rendersNote !== 'function'
      || typeof window.DIAGRAM_TEXT_LAYOUT.rendersTag !== 'function'
      || typeof window.DIAGRAM_TEXT_LAYOUT.hasRenderedSecondary !== 'function'
      || typeof window.DIAGRAM_TEXT_LAYOUT.emit !== 'function') {
    throw new Error('Diagram text-layout support is missing or incomplete. Load diagrams-text-layout.js before the diagram engine.');
  }
  /* The helper DECLARES which patterns it serves. Check membership rather than
     trusting the filename: a mirror can be complete, load cleanly, and still be
     the wrong member — vendored from a sibling plane, or from a future version
     that dropped this pattern. That case passes an interface check and fails
     nowhere, so it is the one the metadata exists to catch. */
  if (!Array.isArray(window.DIAGRAM_TEXT_LAYOUT.TARGETS)
      || window.DIAGRAM_TEXT_LAYOUT.TARGETS.indexOf('diagram-static-SEQ') === -1) {
    throw new Error('Diagram text-layout support does not declare diagram-static-SEQ as a target'
      + ' (declared: ' + JSON.stringify(window.DIAGRAM_TEXT_LAYOUT.TARGETS) + ').'
      + ' Re-vendor diagrams-text-layout.js from patterns/_diagram-shared/.');
  }
  const TL = window.DIAGRAM_TEXT_LAYOUT;
  /* This engine's identity in the shared contract. Role caps, line heights and
     the rendered-secondary predicate are RESOLVED BY THE HELPER against it —
     this file deliberately keeps no copy of any of them. */
  const TARGET = 'diagram-static-SEQ';

  /* Role caps and line heights are NOT defined here. They live in
     diagrams-text-layout.js and are requested by role, because three engines
     each holding their own copy is precisely the divergence the shared contract
     exists to remove. */
  /* ---------- layout constants ---------- */
  const LEFT_PAD      = 80;   // page left padding = shared left edge of all boxes
  const PAGE_PAD_Y    = 56;
  const PAGE_PAD_R    = 80;
  const ROOT_GAP      = 64;   // gap below the standalone root (visibly larger; no line)
  const STEP_GAP      = 46;   // vertical gap between sequence steps (room for the arrow)
  const EDGE_INDENT   = 26;   // connector x = left edge + this indent
  const ARROW_W       = 9;    // arrowhead width
  const ARROW_H       = 8;    // arrowhead height
  const LOOP_GAP      = 80;   // base right-gutter offset past the widest box (secondary edges)
  const GUTTER_STEP   = 44;   // stagger between nested secondary-edge gutter columns
  const BOX_PAD_X     = 14;
  const BOX_H         = 26;
  const BOX_H_NOTE    = 44;
  const ROOT_BOX_H    = 50;
  const ROOT_PAD_X    = 22;

  const FONT_LABEL       = '400 13px "Inter", system-ui, sans-serif';
  const FONT_LABEL_LIGHT = '300 13px "Inter", system-ui, sans-serif';
  const FONT_LABEL_ROOT  = '500 14px "Inter", system-ui, sans-serif';
  const FONT_NOTE        = '300 10px "JetBrains Mono", monospace';
  const LS_NOTE = 0.2;  // letter-spacing(em)×size — mirrors diagrams.css .node-note

  /* Text measurement lives ENTIRELY in diagrams-text-layout.js. This engine
     keeps no local canvas context and no local measure(): a second
     measurement path is exactly how a shared contract silently forks, and a
     dead one is worse than none because it reads as available. */

  /* ADDED height of a wrapped run — 0 when it did not wrap.

     boxH already carries this growth, so a run anchored to the box CENTRE or
     BOTTOM must subtract its own growth: anchoring the FIRST baseline to a
     grown edge deposits the new height as dead space on one side and pushes
     the run's remaining lines out the other. A label/note PAIR is centred as
     one block, so each is offset by half the pair's combined growth and the
     gap between them is preserved exactly. */
  const gLabel = (n) => (n.lay && n.lay.label ? n.lay.label.addedHeight : 0);
  const gNote  = (n) => (n.lay && n.lay.note  ? n.lay.note.addedHeight  : 0);
  const gPair  = (n) => (gLabel(n) + gNote(n)) / 2;

  function fontFor(node) {
    const status = node.status || 'earned';
    const kind = node.kind || 'node';
    if (kind === 'root') return FONT_LABEL_ROOT;
    if (status === 'held' || status === 'legacy') return FONT_LABEL_LIGHT;
    return FONT_LABEL;
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  function el(name, attrs = {}, children = []) {
    const e = document.createElementNS(svgNS, name);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== null && v !== undefined) e.setAttribute(k, v);
    }
    for (const c of children) {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  }

  function render(TREE) {
    /* ---------- flatten the tree depth-first into a linear run ---------- */
    const seq = [];
    let branched = false;
    (function walk(node) {
      seq.push(node);
      const kids = node.children || [];
      if (kids.length > 1) branched = true;
      for (const c of kids) walk(c);
    })(TREE);
    if (branched) {
      console.warn('[SEQ engine] input branches; rendering depth-first order. Use the V/H engine for trees.');
    }

    /* ---------- measure boxes ---------- */
    const nodes = seq.map((node) => {
      const kind = node.kind || 'node';
      const status = node.status || 'earned';
      /* Resolved by the helper. SEQ declares no section branch, so a
         `kind: 'section'` record here is an ordinary node that DOES render its
         note — the helper knows that from this engine's target id rather than
         from a local convention. */
      const hasNote = TL.hasRenderedSecondary(TARGET, node);
      const padX = kind === 'root' ? ROOT_PAD_X : BOX_PAD_X;
      /* Measured through the shared helper. This engine keeps its OWN contract:
         a linear stacked run, not a sibling tree, so wrapped width feeds boxW and
         the gutter calculation while wrapped height feeds the stack. It imports no
         anchor solver — there is no same-depth adjacency here to solve. */
      const labelLay = TL.layoutRole({ target: TARGET, role: TL.roleFor(TARGET, node),
        text: node.label, font: fontFor(node) });
      const labelW = labelLay.width;
      let noteW = 0, noteLay = null;
      if (TL.rendersNote(TARGET, node)) {
        noteLay = TL.layoutRole({ target: TARGET, role: 'note',
          text: node.note, font: FONT_NOTE, letterSpacing: LS_NOTE });
        noteW = noteLay.width;
      }
      const lay = { label: labelLay, note: noteLay };
      const boxW = Math.max(labelW, noteW) + padX * 2;
      const boxH = (kind === 'root' ? ROOT_BOX_H : (hasNote ? BOX_H_NOTE : BOX_H))
                 + labelLay.addedHeight + (noteLay ? noteLay.addedHeight : 0);
      return { ...node, kind, status, hasNote, padX, boxW, boxH, lay, top: 0 };
    });

    /* ---------- vertical placement: stacked, left-aligned ---------- */
    let y = PAGE_PAD_Y;
    nodes.forEach((n, i) => {
      n.top = y;
      y += n.boxH + (i === 0 ? ROOT_GAP : STEP_GAP);
    });
    const height = y - (nodes.length ? STEP_GAP : 0) + PAGE_PAD_Y;
    const maxBoxW = Math.max(...nodes.map((n) => n.boxW), 0);

    /* ---------- secondary edges (dashed, gutter-routed) ----------
       Optional skip edges / return loops drawn as an orthogonal dashed path out
       into a right gutter — the primary linear connectors below are untouched.
       Source grammar (SEQ only):
         secondaryEdges: [{ from, to, style?, route?, label?,
                            gutterMode?, gutter? / gutterOffset? }]
       `from`/`to` match a node LABEL (string) or a STEP index (number: nodes[0]
       is the root, so index n = step n). `style:'solid'` drops the dashes.

       Gutter routing:
         `gutterMode:'span'` (DEFAULT) — the riser clears only the widest box
           within the edge's own from…to span, so a short forward skip (e.g. 2→4)
           routes just past the boxes it actually spans, NOT past the globally
           widest box elsewhere in the diagram.
         `gutterMode:'global'` — the riser clears the whole diagram's widest box
           (the pre-span behavior). Return loops use this; set it per-edge, or
           `TREE.gutterMode:'global'` for a diagram-wide default.
         `gutter` / `gutterOffset` (px) — offset of the riser past its reference
           box (default `LOOP_GAP`); per-edge lever for exact tuning.

       `loop:true` is sugar for last-step → first-step (the prior unmerged
       return-loop behavior); it routes `global` and honors `loopGutter`. `route`
       is reserved ('right-gutter' is the only routing today). Diagrams with no
       secondary edges keep the exact original width — render-neutral. */
    function resolveNode(ref) {
      if (ref == null) return null;
      if (typeof ref === 'number') return nodes[ref] || null;   // nodes[0]=root, nodes[n]=step n
      return nodes.find((n) => n.label === ref) || null;
    }
    // Widest box within an edge's own vertical span (from…to, inclusive) — what a
    // 'span'-mode riser must clear, vs the global maxBoxW a 'global' riser clears.
    function spanMaxBoxW(a, b) {
      const i = nodes.indexOf(a), j = nodes.indexOf(b);
      const lo = Math.min(i, j), hi = Math.max(i, j);
      let w = 0;
      for (let k = lo; k <= hi; k++) w = Math.max(w, nodes[k].boxW);
      return w;
    }
    const secEdges = [];
    (TREE.secondaryEdges || []).forEach((e) => {
      const from = resolveNode(e.from), to = resolveNode(e.to);
      if (!from || !to || from === to) {
        console.warn('[SEQ engine] secondaryEdge skipped — unresolved/degenerate from/to:', e);
        return;
      }
      const gutter = e.gutter != null ? e.gutter
                   : e.gutterOffset != null ? e.gutterOffset : LOOP_GAP;
      const mode = e.gutterMode || TREE.gutterMode || 'span';
      secEdges.push({ from, to, dashed: e.style !== 'solid', label: e.label || null, mode, gutter });
    });
    if (TREE.loop && nodes.length > 2) {
      // return-loop sugar clears the whole diagram → 'global', honoring loopGutter.
      secEdges.push({
        from: nodes[nodes.length - 1], to: nodes[1], dashed: true, label: null,
        mode: 'global', gutter: TREE.loopGutter != null ? TREE.loopGutter : LOOP_GAP,
      });
    }
    // Base gutter column: past this edge's reference box (its own span, or global).
    secEdges.forEach((e) => {
      const refW = e.mode === 'global' ? maxBoxW : spanMaxBoxW(e.from, e.to);
      e.gxBase = LEFT_PAD + refW + e.gutter;
    });
    // Nest overlapping edges: shorter spans take inner columns, longer spans wrap
    // outside. Edges whose vertical spans don't overlap may share a column — no
    // forced stagger, so a single skip edge stays tight against its own span.
    secEdges.sort((a, b) =>
      Math.abs(a.to.top - a.from.top) - Math.abs(b.to.top - b.from.top));
    const yRange = (e) => [
      Math.min(e.from.top, e.to.top),
      Math.max(e.from.top + e.from.boxH, e.to.top + e.to.boxH),
    ];
    const placed = [];
    secEdges.forEach((e) => {
      const [eTop, eBot] = yRange(e);
      let gx = e.gxBase, changed = true;
      while (changed) {
        changed = false;
        for (const p of placed) {
          const [pTop, pBot] = yRange(p);
          const overlap = eTop < pBot && pTop < eBot;
          if (overlap && Math.abs(gx - p.gx) < GUTTER_STEP - 0.5) {
            gx = p.gx + GUTTER_STEP;
            changed = true;
          }
        }
      }
      e.gx = gx;
      placed.push(e);
    });

    const width = secEdges.length
      ? Math.max(LEFT_PAD + maxBoxW + PAGE_PAD_R,
                 Math.max(...secEdges.map((e) => e.gx)) + 40)
      : LEFT_PAD + maxBoxW + PAGE_PAD_R;

    /* ---------- render ---------- */
    const svg = document.getElementById('svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const edgeLayer = el('g', { class: 'edges' });
    const nodeLayer = el('g', { class: 'nodes' });
    svg.appendChild(edgeLayer);
    svg.appendChild(nodeLayer);

    /* Arrowed connectors between consecutive STEPS only (the root stands
       alone — sequence starts at nodes[1]). The connector runs at a small
       indent from the shared left edge; the arrowhead lands on the next
       step's top edge. */
    const edgeX = LEFT_PAD + EDGE_INDENT;
    for (let i = 1; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const y1 = a.top + a.boxH;
      const y2 = b.top;
      const cls = b.status === 'held' ? 'edge held'
                : b.status === 'legacy' ? 'edge legacy'
                : 'edge';
      edgeLayer.appendChild(el('path', {
        d: `M ${edgeX} ${y1} L ${edgeX} ${y2 - ARROW_H}`, class: cls,
      }));
      edgeLayer.appendChild(el('path', {
        d: `M ${edgeX - ARROW_W / 2} ${y2 - ARROW_H} L ${edgeX + ARROW_W / 2} ${y2 - ARROW_H} L ${edgeX} ${y2} Z`,
        class: 'edge-arrowhead',
      }));
    }

    /* secondary edges: dashed orthogonal path from `from`'s right edge → its
       gutter column → `to`'s y → into `to`'s right edge with a left-pointing
       arrowhead. Drawn in the edge layer (behind the nodes) and part of the
       diagram, so it renders in the chrome-free PNG-diagram export too. Same
       geometry for a forward skip (2→4) or a return loop (last→first) — only the
       y values flip. `fill:none` keeps the 4-point path a stroke, not a shape. */
    for (const e of secEdges) {
      const fromRight = LEFT_PAD + e.from.boxW;
      const toRight = LEFT_PAD + e.to.boxW;
      const yFrom = e.from.top + e.from.boxH / 2;
      const yTo = e.to.top + e.to.boxH / 2;
      edgeLayer.appendChild(el('path', {
        d: `M ${fromRight} ${yFrom} L ${e.gx} ${yFrom} L ${e.gx} ${yTo} L ${toRight + ARROW_H} ${yTo}`,
        class: 'edge', fill: 'none',
        'stroke-dasharray': e.dashed ? '3 5' : null,
      }));
      edgeLayer.appendChild(el('path', {
        d: `M ${toRight + ARROW_H} ${yTo - ARROW_W / 2} L ${toRight + ARROW_H} ${yTo + ARROW_W / 2} L ${toRight} ${yTo} Z`,
        class: 'edge-arrowhead',
      }));
      /* NOT governed text. This is an EDGE annotation, not a node role, so it is
         never measured, capped, wrapped, or counted toward gutter width — the
         one `el('text')` in this engine that does not go through the helper.
         It carries `class: 'node-note'` for VISUAL consistency only; the shared
         class is why it looks governed, and it is not. Pre-existing behaviour,
         unchanged here. Bringing edge labels into the contract would be a
         separate decision about a different text class. */
      if (e.label) {
        edgeLayer.appendChild(el('text', {
          x: e.gx + 11, y: (yFrom + yTo) / 2,
          transform: `rotate(90 ${e.gx + 11} ${(yFrom + yTo) / 2})`,
          'text-anchor': 'middle', class: 'node-note',
        }, [e.label]));
      }
    }

    for (const n of nodes) {
      const left = LEFT_PAD;
      const textX = left + n.padX;

      if (n.kind === 'root') {
        nodeLayer.appendChild(el('rect', {
          x: left, y: n.top, width: n.boxW, height: n.boxH,
          rx: 4, ry: 4, class: 'node-box root',
        }));
        nodeLayer.appendChild(TL.emit(el('text', {
          x: textX, y: n.hasNote ? n.top + n.boxH / 2 - 8 - gPair(n) : n.top + n.boxH / 2 - gLabel(n) / 2,
          'text-anchor': 'start', class: 'node-label root',
        }), n.lay.label.lines, { x: textX, lineHeight: n.lay.label.lineHeight }));
        if (TL.rendersNote(TARGET, n)) {
          nodeLayer.appendChild(TL.emit(el('text', {
            x: textX, y: n.top + n.boxH / 2 + 12 + gLabel(n) - gPair(n),
            'text-anchor': 'start', class: 'node-note',
          }), n.lay.note.lines, { x: textX, lineHeight: n.lay.note.lineHeight }));
        }
        continue;
      }

      const boxClass   = 'node-box'   + (n.status === 'held' ? ' held' : n.status === 'legacy' ? ' legacy' : '');
      const labelClass = 'node-label' + (n.status === 'held' ? ' held' : n.status === 'legacy' ? ' legacy' : '');
      nodeLayer.appendChild(el('rect', {
        x: left, y: n.top, width: n.boxW, height: n.boxH,
        rx: 4, ry: 4, class: boxClass,
      }));
      nodeLayer.appendChild(TL.emit(el('text', {
        x: textX, y: n.hasNote ? n.top + n.boxH / 2 - 7 - gPair(n) : n.top + n.boxH / 2 - gLabel(n) / 2,
        'text-anchor': 'start', class: labelClass,
      }), n.lay.label.lines, { x: textX, lineHeight: n.lay.label.lineHeight }));
      if (TL.rendersNote(TARGET, n)) {
        const noteClass = 'node-note' + (n.status === 'legacy' ? ' legacy' : '');
        nodeLayer.appendChild(TL.emit(el('text', {
          x: textX, y: n.top + n.boxH / 2 + 9 + gLabel(n) - gPair(n),
          'text-anchor': 'start', class: noteClass,
        }), n.lay.note.lines, { x: textX, lineHeight: n.lay.note.lineHeight }));
      }
    }

    /* ---------- pan / zoom (identical to the V engine) ---------- */
    const canvasWrap = document.getElementById('canvasWrap');
    const stage = document.getElementById('stage');
    const zoomPct = document.getElementById('zoomPct');
    let tx = 0, ty = 0, scale = 1;

    /* Interaction floor. The ordinary zoom-out floor is this pattern's historical
       BASE_MIN_SCALE. But the panel-aware fit can legitimately land BELOW it on a
       constrained viewport (a tall diagram that collides with the chrome fits smaller
       than it used to), and a fixed floor above the fitted scale makes "zoom out"
       INCREASE the scale — the control reverses direction. So the live floor is the
       lower of the base floor and the most recent Fit. Fit itself is never clamped:
       clamping it would restore the panel collision this engine exists to avoid. */
    const BASE_MIN_SCALE = 0.15;
    let fittedMinScale = BASE_MIN_SCALE;
    function apply() {
      stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      zoomPct.textContent = Math.round(scale * 100) + '%';
    }
    function fit() {
      /* Shared DS fit contract (diagrams-fit.js): reserves the measured caption/legend
         and HUD bands, then centres in the remainder. With no visible panels both bands
         are 0 and this is arithmetically identical to the previous formula. clearance is
         TOTAL (the value formerly subtracted from the viewport), not per-side padding. */
      const f = window.DIAGRAM_FIT.compute({
        wrap: canvasWrap,
        bounds: { minX: 0, minY: 0, maxX: width, maxY: height },
        clearanceX: 80, clearanceY: 80, maxScale: 1.2, gutter: 26
      });
      fittedMinScale = Math.min(BASE_MIN_SCALE, f.scale);
      scale = f.scale; tx = f.tx; ty = f.ty;
      apply();
    }
    fit();
    window.addEventListener('resize', fit);

    document.getElementById('zoomIn').onclick  = () => { scale = Math.min(scale * 1.2, 4); apply(); };
    document.getElementById('zoomOut').onclick = () => { scale = Math.max(scale / 1.2, fittedMinScale); apply(); };
    document.getElementById('zoomFit').onclick = fit;

    let dragging = false, sx0, sy0, tx0, ty0;
    canvasWrap.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('.hud, .legend, .caption')) return;
      dragging = true;
      canvasWrap.classList.add('dragging');
      canvasWrap.setPointerCapture(ev.pointerId);
      sx0 = ev.clientX; sy0 = ev.clientY; tx0 = tx; ty0 = ty;
    });
    canvasWrap.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      tx = tx0 + (ev.clientX - sx0);
      ty = ty0 + (ev.clientY - sy0);
      apply();
    });
    canvasWrap.addEventListener('pointerup', () => {
      dragging = false;
      canvasWrap.classList.remove('dragging');
    });
    canvasWrap.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const rect = canvasWrap.getBoundingClientRect();
      const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
      const factor = ev.deltaY > 0 ? 1 / 1.1 : 1.1;
      const newScale = Math.max(fittedMinScale, Math.min(4, scale * factor));
      const k = newScale / scale;
      tx = mx - (mx - tx) * k;
      ty = my - (my - ty) * k;
      scale = newScale;
      apply();
    }, { passive: false });
  }

  /* Public entry — same font-load gate as the sibling engines. */
  function renderWhenFontsReady(TREE) {
    const fonts = (typeof document !== 'undefined') && document.fonts;
    if (!fonts || typeof fonts.load !== 'function') { render(TREE); return; }
    const needed = [
      '400 13px "Inter"', '300 13px "Inter"', '500 14px "Inter"',
      '300 10px "JetBrains Mono"', '500 10px "JetBrains Mono"',
    ];
    Promise.all(needed.map((f) => fonts.load(f).catch(() => null)))
      .then(() => render(TREE))
      .catch(() => render(TREE));
  }

  window.DIAGRAMS = { render: renderWhenFontsReady };
})();
