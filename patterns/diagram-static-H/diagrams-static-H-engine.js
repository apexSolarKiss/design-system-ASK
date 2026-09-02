/* diagrams-static-H-engine.js
   Shared diagram engine for ASK-family system / architecture diagrams
   (architecture trees, topology maps, source-of-truth maps, and similar).
   Layout is horizontal, top-aligned cascade. Pan + zoom on the canvas.

   Usage from page:
     window.DIAGRAMS.render(TREE);
   The page is expected to expose `.canvas-wrap`, `.stage > svg#svg`,
   and `.hud` with #zoomIn, #zoomOut, #zoomPct, #zoomFit. Style comes
   from diagrams.css (theme-aware via [data-theme]).

   render() is font-aware: it waits for the Inter / JetBrains Mono specs it
   measures with to load before computing column widths, so text never bleeds
   between columns on first paint. See renderWhenFontsReady at the bottom.
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
  /* FAIL-CLOSED on the text-layout carrier, for the same reason and on the same terms.
     diagrams-text-layout.js is a generated mirror of patterns/_diagram-shared/ and must be
     copied alongside this engine and loaded immediately BEFORE it. The interface is checked,
     not merely the global: a stale mirror that predates a method would otherwise pass a
     truthiness test and then fail deep inside layout, where the error names nothing useful. */
  if (!window.DIAGRAM_TEXT_LAYOUT
      || typeof window.DIAGRAM_TEXT_LAYOUT.measure !== 'function'
      || typeof window.DIAGRAM_TEXT_LAYOUT.layout !== 'function'
      || typeof window.DIAGRAM_TEXT_LAYOUT.emit !== 'function') {
    throw new Error('Diagram text-layout support is missing or incomplete. Load diagrams-text-layout.js before the diagram engine.');
  }
  /* The helper DECLARES which patterns it serves. Check membership rather than
     trusting the filename: a mirror can be complete, load cleanly, and still be
     the wrong member — vendored from a sibling plane, or from a future version
     that dropped this pattern. That case passes an interface check and fails
     nowhere, so it is the one the metadata exists to catch. */
  if (!Array.isArray(window.DIAGRAM_TEXT_LAYOUT.TARGETS)
      || window.DIAGRAM_TEXT_LAYOUT.TARGETS.indexOf('diagram-static-H') === -1) {
    throw new Error('Diagram text-layout support does not declare diagram-static-H as a target'
      + ' (declared: ' + JSON.stringify(window.DIAGRAM_TEXT_LAYOUT.TARGETS) + ').'
      + ' Re-vendor diagrams-text-layout.js from patterns/_diagram-shared/.');
  }
  const TL = window.DIAGRAM_TEXT_LAYOUT;
  /* ---------- layout constants ---------- */
  const GAP_WITHIN  = 6;    // vertical gap between sibling boxes of the SAME parent (within a group)
  const GAP_BETWEEN = 18;   // vertical gap at a group / section boundary (parent change) — keeps groups distinct
  const GAP_COL = 36;
  const BOX_PAD_X = 14;
  const BOX_H = 26;
  const BOX_H_NOTE = 44;
  const ROOT_BOX_H = 50;
  const ROOT_PAD_X = 22;
  const PAGE_PAD_X = 64;
  const PAGE_PAD_Y = 48;

  const FONT_LABEL       = '400 13px "Inter", system-ui, sans-serif';
  const FONT_LABEL_LIGHT = '300 13px "Inter", system-ui, sans-serif';
  const FONT_LABEL_ROOT  = '500 14px "Inter", system-ui, sans-serif';
  const FONT_NOTE        = '300 10px "JetBrains Mono", monospace';
  const FONT_SECTION     = '500 10px "JetBrains Mono", monospace';
  const FONT_TAG         = '300 9px "JetBrains Mono", monospace';

  // CSS letter-spacing (em) the SVG text carries but canvas.measureText drops.
  // Each constant = letter-spacing(em) × the font-size it is measured at, and MUST
  // mirror diagrams.css. Change one there → change it here.
  const LS_SECTION = 1.8;   // .node-label.section  letter-spacing:0.18em × font-size:10px  (FONT_SECTION)
  const LS_TAG     = 1.44;  // .section-tag         letter-spacing:0.16em × font-size:9px   (FONT_TAG)
  const LS_NOTE    = 0.2;   // .node-note           letter-spacing:0.02em × font-size:10px  (FONT_NOTE)

  /* ROLE CAPS — maximum rendered text width in px, per role, before wrapping.
     Selected on REAL RENDERS in U6 against both excess emptiness and fitted
     readability, not chosen to minimize canvas area: a narrower page that needs
     more zoom to read is not an improvement. Infinity disables wrapping for a
     role, which is also the value that makes the no-wrap identity trivially
     reachable for any role U6 leaves uncapped. */
  const CAP = {
    root:        420,   // fleet max 264px — no current root wraps; the bound governs FUTURE content
    section:     400,   // fleet p90 312px
    sectionTag:  400,   // fleet p90 759px, max 1626px
    label:       700,   // fleet max 660px — no current label wraps; a future-content guard.
                        // A tighter 420 was measured and REJECTED: it added 18 wrapped runs and
                        // regressed fitted zoom on two pages, because these diagrams are
                        // height-constrained when fitted, so trading width for height loses.
    note:        720,   // the emptiness driver: fleet median 421px, max 3487px
  };
  /* Line advance per role when a string wraps. Each mirrors the rendered
     font-size in diagrams.css; a wrapped line must not collide with the next. */
  const LINE_H = { root: 17, section: 13, sectionTag: 12, label: 16, note: 12 };

  /* Text measurement lives ENTIRELY in diagrams-text-layout.js. This engine
     keeps no local canvas context and no local measure(): a second
     measurement path is exactly how a shared contract silently forks, and a
     dead one is worse than none because it reads as available. */

  /* ADDED height of a wrapped run — 0 when it did not wrap.

     boxH already carries this growth, so a run anchored to the box BOTTOM or
     CENTRE must subtract its own growth: anchoring the FIRST baseline to a
     grown edge deposits the new height as dead space on one side and pushes
     the run's remaining lines out the other. A run anchored to the box TOP
     needs no correction, because it grows in the direction the box grew. */
  const gLabel = (n) => (n.lay && n.lay.label ? n.lay.label.height : 0);
  const gNote  = (n) => (n.lay && n.lay.note  ? n.lay.note.height  : 0);
  const gTag   = (n) => (n.lay && n.lay.tag   ? n.lay.tag.height   : 0);

  function fontFor(node) {
    const status = node.status || 'earned';
    const kind = node.kind || 'node';
    if (kind === 'root') return FONT_LABEL_ROOT;
    if (kind === 'section') return FONT_SECTION;
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
    /* ---------- pre-measure per-depth widths ---------- */
    const colMaxW = {};
    const LAY = new Map();          // source node -> resolved line layouts
    let anyWrapped = false;         // true once any governed string breaks
    function preMeasure(node, depth) {
      const kind = node.kind || 'node';
      const padX = kind === 'root' ? ROOT_PAD_X : BOX_PAD_X;
      const displayLabel = kind === 'section' ? '/ ' + node.label.toUpperCase() : node.label;
      /* Measured through the helper so a non-wrapping string returns EXACTLY what
         the local measure() returned before this file consumed the plane — that
         parity is the first no-wrap gate. The width a column needs is the widest
         RESULTING line, never the cap and never the unwrapped width. */
      const labelRole = kind === 'root' ? 'root' : kind === 'section' ? 'section' : 'label';
      const labelLay = TL.layout({ text: displayLabel, font: fontFor(node),
        ls: kind === 'section' ? LS_SECTION : 0, maxWidth: CAP[labelRole],
        lineHeight: LINE_H[labelRole] });
      const labelW = labelLay.width;
      // Only measure notes for kinds that actually render them. The section branch
      // renders label + tag + rule but NOT the note, so a section note must not affect
      // column width — otherwise an invisible note stretches the column and its connector
      // spans (see the regression case in diagram-static-H.source.js). Section tags ARE
      // rendered, so they are still measured just below.
      let noteW = 0, noteLay = null, tagLay = null;
      if (node.note && kind !== 'section') {
        noteLay = TL.layout({ text: node.note, font: FONT_NOTE, ls: LS_NOTE,
          maxWidth: CAP.note, lineHeight: LINE_H.note });
        noteW = noteLay.width;
      }
      if (kind === 'section' && node.tag) {
        tagLay = TL.layout({ text: '// ' + node.tag, font: FONT_TAG, ls: LS_TAG,
          maxWidth: CAP.sectionTag, lineHeight: LINE_H.sectionTag });
        noteW = Math.max(noteW, tagLay.width);
      }
      /* Cache the resolved lines on the SOURCE node so place() and render() reuse
         the identical break decision. Re-running the break later would risk a
         different result if anything about the context changed, and the whole
         contract rests on one deterministic answer per string. */
      LAY.set(node, { label: labelLay, note: noteLay, tag: tagLay });
      const contentW = Math.max(labelW, noteW);
      const totalW = contentW + padX * 2;
      colMaxW[depth] = Math.max(colMaxW[depth] || 0, totalW);
      if (labelLay.wrapped || (noteLay && noteLay.wrapped) || (tagLay && tagLay.wrapped)) anyWrapped = true;
      for (const c of (node.children || [])) preMeasure(c, depth + 1);
    }
    preMeasure(TREE, 0);

    const maxDepth = Math.max(...Object.keys(colMaxW).map(Number));
    const colX = {};
    let xCursor = PAGE_PAD_X;
    for (let d = 0; d <= maxDepth; d++) {
      colX[d] = xCursor;
      xCursor += colMaxW[d] + GAP_COL;
    }
    const width  = xCursor + PAGE_PAD_X - GAP_COL;

    /* ---------- place nodes (top-aligned cascade) ----------
       Vertical positions come from a LEAF CURSOR, not a uniform row pitch: each
       leaf advances the cursor by its own height plus a gap, and that gap is
       GAP_WITHIN between siblings of the same parent but GAP_BETWEEN whenever the
       parent changes (a group / section boundary). So clustered siblings sit
       tight while groups open up — the groups read as distinct. Internal nodes
       stay top-aligned to their first child. */
    const nodes = [];
    const edges = [];
    let yCursor = PAGE_PAD_Y;
    let prevLeafParent;            // parent idx of the previously placed leaf (undefined before the first)
    function place(node, depth, parent) {
      const kind = node.kind || 'node';
      const status = node.status || 'earned';
      // True when this kind actually RENDERS a second line under its label — the same
      // predicate preMeasure uses for width, so measured and rendered content stay in
      // step on both axes. The section branch draws label + tag + rule but never the
      // note, so a section note earns neither width nor height; a section tag earns
      // both. Every other kind renders its note.
      const hasNote = !!(
        (kind !== 'section' && node.note) ||
        (kind === 'section' && node.tag)
      );
      /* TWO HEIGHTS, deliberately. baseH is what the CURRENT renderer produces and
         is what the legacy anchors L are measured from; boxH additionally carries
         wrapped growth. At no wrap they are equal, which is why the solver below
         resolves to L exactly rather than approximately. */
      const baseH = kind === 'root' ? ROOT_BOX_H : (hasNote ? BOX_H_NOTE : BOX_H);
      const lay = LAY.get(node) || {};
      const grow = (lay.label ? lay.label.height : 0)
                 + (lay.note ? lay.note.height : 0)
                 + (lay.tag ? lay.tag.height : 0);
      const boxH = baseH + grow;
      const boxW = colMaxW[depth];
      const x = colX[depth];

      const idx = nodes.length;
      const rec = {
        ...node, depth, x, boxW, boxH, baseH, hasNote, lay,
        status, kind, childIndices: [], centerY: 0, y: 0, L: 0,
      };
      nodes.push(rec);
      if (parent !== null && parent !== undefined) {
        edges.push({ from: parent, to: idx });
        nodes[parent].childIndices.push(idx);
      }

      if (!node.children || node.children.length === 0) {
        // leaf — advance the cursor; tight within a group, wider across a boundary
        if (prevLeafParent !== undefined) {
          yCursor += (parent === prevLeafParent) ? GAP_WITHIN : GAP_BETWEEN;
        }
        rec.y = yCursor;
        rec.L = yCursor + baseH / 2;          // the EXACT legacy anchor
        rec.centerY = rec.L;
        yCursor += baseH;
        prevLeafParent = parent;
      } else {
        for (const c of node.children) place(c, depth + 1, idx);
        rec.L = nodes[rec.childIndices[0]].L;              // top-aligned to first child
        rec.centerY = rec.L;
        rec.y = rec.centerY - boxH / 2;
      }
      return idx;
    }
    place(TREE, 0, null);

    /* ---------- legacy envelope, recorded from the CURRENT renderer ---------- */
    const legacyHeight = yCursor + PAGE_PAD_Y;
    let legacyTop = Infinity, legacyBottom = -Infinity;
    for (const n of nodes) {
      legacyTop = Math.min(legacyTop, n.L - n.baseH / 2);
      legacyBottom = Math.max(legacyBottom, n.L + n.baseH / 2);
    }

    let height;
    if (!anyWrapped) {
      /* NO WRAP TAKES THE LEGACY PATH ITSELF, not a path that agrees with it.
         boxH === baseH here, so A === L, topShift === 0 and finalHeight ===
         legacyHeight are facts about which code ran, not claims to be checked
         afterwards. That is the whole reason the two heights are tracked apart. */
      for (const n of nodes) { n.centerY = n.L; n.y = n.centerY - n.boxH / 2; }
      height = legacyHeight;
    } else {
      /* ---------- PASS 3 // solve anchors under the legacy separations ----------
         The pass numbering runs across the whole layout, not this block: PASS 1
         is the per-depth pre-measure above, PASS 2 the provisional wrapped
         skeleton A0 it produces. Only the two passes that a wrap makes
         non-trivial are called out by name.
         constraint   A[b] - A[a] >= legacySep(a,b) + ( boxH[a] + boxH[b] ) / 2
         legacySep    ( L[b] - baseH[b]/2 ) - ( L[a] + baseH[a]/2 )      SIGNED

         The sign is kept. An existing overlap is NOT clamped to zero inside a
         max(): that would repair legacy geometry anonymously, under cover of a
         wrapping change nobody asked to change spacing. The U5-entry census
         measured every governed pair on the 16 H pages that render — of 17 that
         load this engine; tests/legend-export-fixture.html renders nothing,
         on main as well as here, because it never loads diagrams-fit.js — and
         found none negative. No pair therefore carries a repair override, and
         none is implemented — there is deliberately no repair set in this file
         to grep for. The bound is the censused set, not a claim about
         trees this engine has never been given. */

      /* Anchor equality is a CONSTRAINT, not a post-step: an internal node is
         top-aligned to its first child, so the two anchors are one unknown.
         Contracting equality classes first is what keeps the constraint graph
         acyclic — solving over the raw node graph would have to reconcile a
         two-way relation with a longest-path walk that assumes one direction. */
      const uf = nodes.map((_, i) => i);
      const find = (i) => { while (uf[i] !== i) { uf[i] = uf[uf[i]]; i = uf[i]; } return i; };
      const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) uf[rb] = ra; };
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].childIndices.length) union(i, nodes[i].childIndices[0]);
      }

      const byDepth = new Map();
      nodes.forEach((n, i) => {
        if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
        byDepth.get(n.depth).push(i);
      });

      const edges3 = [];
      for (const [, idxs] of byDepth) {
        const col = idxs.slice().sort((p, q) =>
          (nodes[p].L - nodes[q].L) || (p - q));
        for (let k = 0; k + 1 < col.length; k++) {
          const a = nodes[col[k]], b = nodes[col[k + 1]];
          const legacySep = (b.L - b.baseH / 2) - (a.L + a.baseH / 2);
          edges3.push({
            from: find(col[k]), to: find(col[k + 1]),
            w: legacySep + (a.boxH + b.boxH) / 2,
          });
        }
      }

      /* Pointwise-minimal solution by relaxation in topological order, seeded at
         the legacy anchor of each class. Seeding at L rather than at zero is what
         makes an unconstrained class stay exactly where it was. */
      const A = new Map();
      for (let i = 0; i < nodes.length; i++) {
        const r = find(i);
        if (!A.has(r) || nodes[i].L < A.get(r)) A.set(r, nodes[i].L);
      }
      const outs = new Map(), indeg = new Map();
      for (const c of A.keys()) { outs.set(c, []); indeg.set(c, 0); }
      for (const e of edges3) {
        if (e.from === e.to) continue;               // equal anchors, no ordering
        outs.get(e.from).push(e);
        indeg.set(e.to, indeg.get(e.to) + 1);
      }
      const queue = [...A.keys()].filter((c) => indeg.get(c) === 0);
      const order = [];
      while (queue.length) {
        const c = queue.shift();
        order.push(c);
        for (const e of outs.get(c)) {
          if (A.get(e.to) < A.get(c) + e.w) A.set(e.to, A.get(c) + e.w);
          indeg.set(e.to, indeg.get(e.to) - 1);
          if (indeg.get(e.to) === 0) queue.push(e.to);
        }
      }
      /* FAIL CLOSED on a cycle rather than iterate to a fixed point. A cycle means
         the equality classes and the same-depth ordering disagree about direction,
         which is a structural fault in the source — silently relaxing it would
         move geometry for a reason no one could later reconstruct. */
      if (order.length !== A.size) {
        throw new Error('Diagram H layout: cyclic anchor constraints after equality contraction.');
      }

      /* ---------- PASS 4 // final envelope ----------
         PASS 3 fixes relative positions and says nothing about containment. The
         legacy height came from the leaf cursor, which PASS 3 has just
         invalidated, and nothing yet stopped a grown box crossing the top edge. */
      let preliminaryTop = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        preliminaryTop = Math.min(preliminaryTop, A.get(find(i)) - nodes[i].boxH / 2);
      }
      const topShift = Math.max(0, legacyTop - preliminaryTop);
      let finalBottom = -Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.centerY = A.get(find(i)) + topShift;
        n.y = n.centerY - n.boxH / 2;
        finalBottom = Math.max(finalBottom, n.centerY + n.boxH / 2);
      }
      /* The bottom margin is CARRIED, not recomputed, so an existing margin —
         including an unusual one — survives instead of being normalized. */
      height = legacyHeight + Math.max(0, finalBottom - legacyBottom);
    }

    /* ---------- render ---------- */
    const svg = document.getElementById('svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const edgeLayer = el('g', { class: 'edges' });
    const nodeLayer = el('g', { class: 'nodes' });
    svg.appendChild(edgeLayer);
    svg.appendChild(nodeLayer);

    for (const e of edges) {
      const p = nodes[e.from];
      const c = nodes[e.to];
      const pX = p.x + p.boxW;
      const pY = p.centerY;
      const cX = c.x;
      const cY = c.centerY;
      const midX = (pX + cX) / 2;
      const cls = c.status === 'held' ? 'edge held'
                : c.status === 'legacy' ? 'edge legacy'
                : 'edge';
      edgeLayer.appendChild(el('path', {
        d: `M ${pX} ${pY} L ${midX} ${pY} L ${midX} ${cY} L ${cX} ${cY}`,
        class: cls,
      }));
    }

    for (const n of nodes) {
      if (n.kind === 'section') {
        const secText = el('text', {
          x: n.x + BOX_PAD_X,
          y: n.hasNote ? n.y + 14 : n.centerY - (gLabel(n) + gTag(n)) / 2,
          class: 'node-label section',
        });
        TL.emit(secText, n.lay.label.lines, { x: n.x + BOX_PAD_X, lineHeight: LINE_H.section });
        nodeLayer.appendChild(secText);
        if (n.tag) {
          const tagText = el('text', {
            x: n.x + BOX_PAD_X,
            y: n.y + n.boxH - 12 - gTag(n),
            class: 'section-tag',
          });
          TL.emit(tagText, n.lay.tag.lines, { x: n.x + BOX_PAD_X, lineHeight: LINE_H.sectionTag });
          nodeLayer.appendChild(tagText);
        }
        nodeLayer.appendChild(el('line', {
          x1: n.x, y1: n.y + n.boxH,
          x2: n.x + n.boxW, y2: n.y + n.boxH,
          class: 'section-rule',
          'stroke-opacity': 0.4,
        }));
        continue;
      }

      if (n.kind === 'root') {
        nodeLayer.appendChild(el('rect', {
          x: n.x, y: n.y,
          width: n.boxW, height: n.boxH,
          rx: 4, ry: 4,
          class: 'node-box root',
        }));
        const rootText = el('text', {
          x: n.x + ROOT_PAD_X,
          y: n.hasNote ? n.y + 19 : n.centerY - gLabel(n) / 2,
          class: 'node-label root',
        });
        TL.emit(rootText, n.lay.label.lines, { x: n.x + ROOT_PAD_X, lineHeight: LINE_H.root });
        nodeLayer.appendChild(rootText);
        if (n.note) {
          const rootNote = el('text', {
            x: n.x + ROOT_PAD_X,
            y: n.y + n.boxH - 12 - gNote(n),
            class: 'node-note',
          });
          TL.emit(rootNote, n.lay.note.lines, { x: n.x + ROOT_PAD_X, lineHeight: LINE_H.note });
          nodeLayer.appendChild(rootNote);
        }
        continue;
      }

      if (n.kind === 'group') {
        nodeLayer.appendChild(el('rect', {
          x: n.x, y: n.y,
          width: n.boxW, height: n.boxH,
          rx: 4, ry: 4,
          class: 'node-box',
          'fill-opacity': 0.5,
        }));
        const grpText = el('text', {
          x: n.x + BOX_PAD_X,
          y: n.hasNote ? n.y + 16 : n.centerY - gLabel(n) / 2,
          class: 'node-label',
        });
        TL.emit(grpText, n.lay.label.lines, { x: n.x + BOX_PAD_X, lineHeight: LINE_H.label });
        nodeLayer.appendChild(grpText);
        if (n.note) {
          const grpNote = el('text', {
            x: n.x + BOX_PAD_X,
            y: n.y + n.boxH - 10 - gNote(n),
            class: 'node-note',
          });
          TL.emit(grpNote, n.lay.note.lines, { x: n.x + BOX_PAD_X, lineHeight: LINE_H.note });
          nodeLayer.appendChild(grpNote);
        }
        continue;
      }

      const boxClass   = 'node-box'   + (n.status === 'held' ? ' held' : n.status === 'legacy' ? ' legacy' : '');
      const labelClass = 'node-label' + (n.status === 'held' ? ' held' : n.status === 'legacy' ? ' legacy' : '');
      nodeLayer.appendChild(el('rect', {
        x: n.x, y: n.y,
        width: n.boxW, height: n.boxH,
        rx: 4, ry: 4,
        class: boxClass,
      }));
      const nodeText = el('text', {
        x: n.x + BOX_PAD_X,
        y: n.hasNote ? n.y + 16 : n.centerY - gLabel(n) / 2,
        class: labelClass,
      });
      TL.emit(nodeText, n.lay.label.lines, { x: n.x + BOX_PAD_X, lineHeight: LINE_H.label });
      nodeLayer.appendChild(nodeText);
      if (n.note) {
        const noteClass = 'node-note' + (n.status === 'legacy' ? ' legacy' : '');
        const nodeNote = el('text', {
          x: n.x + BOX_PAD_X,
          y: n.y + n.boxH - 10 - gNote(n),
          class: noteClass,
        });
        TL.emit(nodeNote, n.lay.note.lines, { x: n.x + BOX_PAD_X, lineHeight: LINE_H.note });
        nodeLayer.appendChild(nodeNote);
      }
    }

    /* ---------- pan / zoom ---------- */
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

  /* Public entry. Gate the first measure/layout on web-font load so per-column
     widths are computed against the ACTUAL fonts, not the fallback. Measuring
     before the fonts load underestimates text width, which lets long first-level
     (section) labels bleed into the next column. The specific font specs the
     engine measures with are loaded explicitly, then render proceeds — with a
     safe fallback if the Font Loading API is unavailable. */
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
