/* diagrams-static-FLOW-engine.js — static "convergence-flow diagram" Class A pattern.

   Convergence-flow engine for ASK-family diagrams: a topology that the tree
   (H / V) and sequence (SEQ) scaffolds cannot express — several grouped source
   inputs that CONVERGE (many-to-one) into a resolved node, a process spine that
   may FAN OUT into parallel realized objects and RECONVERGE, a lateral relation
   RAIL by which a carrier participates across the whole source field, secondary
   cross-stage EVALUATION edges (a source operating a second time, evaluating a
   realized result — not feeding it back upstream), and an optional styled
   RETURN edge.

   Same public contract (window.DIAGRAMS.render(DATA)), same theme model, same
   font-load gate, same pan/zoom, and the same geometry-agnostic PNG export as
   the H / V / SEQ siblings. It reuses the shared diagrams.css vocabulary and
   the FLOW-only additions appended to that file (.flow-group, .flow-tag,
   .edge-rail[-cap], .edge-eval, .edge-return).

   It is a GENERIC scaffold for the convergence-flow topology class — not a
   project-specific diagram and not a general-purpose flowchart library.

   Data grammar (window.FLOW_DIAGRAM):
     {
       band?:   { tag?, items: [ '<label>', ... ] },          // top legend band
       carrier?:{ label, note?, railTag? },                   // left carrier + lateral rail
       field:   { tag?, nodes: [ { id?, label, note?, status? }, ... ] },
       converge:{ id?, label, note?, status? },               // many-to-one convergence node
       spine:   [ { id?, label, note?, status? }              // a single process node, OR
                  | { parallel: [ { id?, label, note?, status? }, ... ] } ],  // parallel fan-out/reconverge row
       evalEdges?:  [ { from: '<id>', to: '<id>' }, ... ],     // dashed cross-stage evaluation edges
       returnEdge?: { from: '<id>', tag? }                     // dotted return edge → carrier
     }
   status: 'earned' (default) | 'held' | 'legacy', honored on every box.
   ids default to field f0..fN, converge 'converge', spine s0..sN (branches s0b0..),
   carrier 'carrier'. evalEdges / returnEdge reference these ids.
*/
(function () {
  /* ---------- layout constants ---------- */
  const PAGE_PAD     = 72;
  const BOX_PAD_X    = 14;
  const BOX_H        = 26;
  const BOX_H_NOTE   = 44;
  const GROUP_PAD    = 18;   // padding inside the source-field frame
  const FIELD_GAP    = 14;   // vertical gap between source nodes in the field
  const CARRIER_GAP  = 72;   // gap between carrier right edge and field-group left edge
  const CONVERGE_GAP = 66;   // gap between field-group bottom and converge top
  const SPINE_GAP    = 48;   // vertical gap between spine rows (room for the arrow)
  const BRANCH_GAP_X = 40;   // horizontal gap between parallel branch boxes
  const BAND_GAP     = 54;   // gap below the top band
  const BAND_ITEM_GAP= 14;
  const GUTTER       = 58;   // eval-edge (right) / return-edge (left) gutter offset
  const ARROW_W      = 9;
  const ARROW_H      = 8;
  const CAP          = 4;    // rail end-cap diamond half-size

  const FONT_LABEL       = '400 13px "Inter", system-ui, sans-serif';
  const FONT_LABEL_LIGHT = '300 13px "Inter", system-ui, sans-serif';
  const FONT_NOTE        = '300 10px "JetBrains Mono", monospace';
  const FONT_TAG         = '300 9px "JetBrains Mono", monospace';
  const LS_NOTE = 0.2;   // letter-spacing(em)×size — mirrors diagrams.css .node-note
  const LS_TAG  = 0.16 * 9;

  const measureCtx = document.createElement('canvas').getContext('2d');
  function measure(text, font, ls = 0) {
    measureCtx.font = font;
    let w = measureCtx.measureText(text).width;
    if (ls) w += text.length * ls;
    return w;
  }
  function fontFor(node) {
    const status = node.status || 'earned';
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

  /* ---------- box model ---------- */
  function makeBox(node, id) {
    const hasNote = !!node.note;
    const labelW = measure(node.label, fontFor(node));
    const noteW = node.note ? measure(node.note, FONT_NOTE, LS_NOTE) : 0;
    const w = Math.max(labelW, noteW) + BOX_PAD_X * 2;
    const h = hasNote ? BOX_H_NOTE : BOX_H;
    return { id, label: node.label, note: node.note || null,
             status: node.status || 'earned', hasNote, w, h, x: 0, y: 0 };
  }
  function place(b, x, y) {
    b.x = x; b.y = y;
    b.cx = x + b.w / 2; b.cy = y + b.h / 2;
    b.left = x; b.right = x + b.w; b.top = y; b.bottom = y + b.h;
    return b;
  }
  function stClass(b) {
    return b.status === 'held' ? ' held' : b.status === 'legacy' ? ' legacy' : '';
  }
  function drawBox(layer, b) {
    const s = stClass(b);
    layer.appendChild(el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 4, ry: 4, class: 'node-box' + s }));
    layer.appendChild(el('text', {
      x: b.cx, y: b.hasNote ? b.cy - 7 : b.cy, 'text-anchor': 'middle', class: 'node-label' + s,
    }, [b.label]));
    if (b.note) {
      layer.appendChild(el('text', {
        x: b.cx, y: b.cy + 9, 'text-anchor': 'middle',
        class: 'node-note' + (b.status === 'legacy' ? ' legacy' : ''),
      }, [b.note]));
    }
  }
  function tag(layer, text, x, y, anchor = 'start') {
    layer.appendChild(el('text', { x, y, 'text-anchor': anchor, class: 'flow-tag' }, [text]));
  }

  /* arrow connector from (x1,y1) straight to a tip at (x2,y2); triangle points
     along the dominant axis. cls = edge class for the line. */
  function arrowDown(layer, x, y1, y2, cls) {
    layer.appendChild(el('path', { d: `M ${x} ${y1} L ${x} ${y2 - ARROW_H}`, class: cls }));
    layer.appendChild(el('path', {
      d: `M ${x - ARROW_W / 2} ${y2 - ARROW_H} L ${x + ARROW_W / 2} ${y2 - ARROW_H} L ${x} ${y2} Z`,
      class: 'edge-arrowhead',
    }));
  }
  function lineTo(layer, x1, y1, x2, y2, cls) {
    layer.appendChild(el('path', { d: `M ${x1} ${y1} L ${x2} ${y2}`, class: cls }));
  }
  function triLeft(layer, xTip, y) {  // arrowhead pointing left (into a box's right edge)
    layer.appendChild(el('path', { d: `M ${xTip + ARROW_H} ${y - ARROW_W / 2} L ${xTip + ARROW_H} ${y + ARROW_W / 2} L ${xTip} ${y} Z`, class: 'edge-arrowhead' }));
  }
  function triRight(layer, xTip, y) { // arrowhead pointing right (into a box's left edge)
    layer.appendChild(el('path', { d: `M ${xTip - ARROW_H} ${y - ARROW_W / 2} L ${xTip - ARROW_H} ${y + ARROW_W / 2} L ${xTip} ${y} Z`, class: 'edge-arrowhead' }));
  }

  function render(DATA) {
    const byId = {};
    const bb = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const grow = (x, y) => { if (x < bb.minX) bb.minX = x; if (y < bb.minY) bb.minY = y; if (x > bb.maxX) bb.maxX = x; if (y > bb.maxY) bb.maxY = y; };
    const growBox = (b) => { grow(b.left, b.top); grow(b.right, b.bottom); };

    /* ---------- measure field nodes, derive the central axis ---------- */
    const fieldNodes = (DATA.field && DATA.field.nodes || []).map((n, i) => makeBox(n, n.id || ('f' + i)));
    const converge = makeBox(DATA.converge || { label: 'resolved' }, (DATA.converge && DATA.converge.id) || 'converge');
    const spineRows = (DATA.spine || []).map((row, i) => {
      if (row.parallel) return { parallel: row.parallel.map((n, j) => makeBox(n, n.id || ('s' + i + 'b' + j))) };
      return { box: makeBox(row, row.id || ('s' + i)) };
    });

    const fieldInnerW = Math.max(0, ...fieldNodes.map((b) => b.w));
    const groupW = fieldInnerW + GROUP_PAD * 2;
    const spineMaxW = Math.max(
      converge.w,
      ...spineRows.map((r) => r.parallel
        ? r.parallel.reduce((s, b) => s + b.w, 0) + BRANCH_GAP_X * (r.parallel.length - 1)
        : r.box.w),
    );
    // central axis: enough room that the widest of {field group, spine row} centers cleanly
    const CX = PAGE_PAD + (DATA.carrier ? (measure((DATA.carrier.label || ''), FONT_LABEL) + BOX_PAD_X * 2 + CARRIER_GAP) : 0) + Math.max(groupW, spineMaxW) / 2;

    let y = PAGE_PAD;

    /* ---------- top band (optional) ---------- */
    if (DATA.band && DATA.band.items && DATA.band.items.length) {
      const items = DATA.band.items.map((t, i) => makeBox({ label: t }, 'band' + i));
      const totalW = items.reduce((s, b) => s + b.w, 0) + BAND_ITEM_GAP * (items.length - 1);
      let bx = CX - totalW / 2;
      const bandY = y;
      items.forEach((b) => { place(b, bx, bandY); bx += b.w + BAND_ITEM_GAP; growBox(b); });
      items._tagY = bandY - 8;
      DATA.band._items = items;
      DATA.band._tagX = CX - totalW / 2;
      y = bandY + (items[0] ? items[0].h : BOX_H) + BAND_GAP;
    }

    /* ---------- carrier + source field + rail ---------- */
    const groupX = CX - groupW / 2;
    const fieldTop = y;
    // place field nodes stacked, centered within the group
    let fy = fieldTop + GROUP_PAD;
    fieldNodes.forEach((b, i) => {
      place(b, CX - b.w / 2, fy);
      byId[b.id] = b;
      fy += b.h + (i < fieldNodes.length - 1 ? FIELD_GAP : 0);
    });
    const groupBottom = fy + GROUP_PAD;
    const groupH = groupBottom - fieldTop;
    const groupMidY = fieldTop + groupH / 2;

    let carrier = null;
    if (DATA.carrier) {
      carrier = makeBox(DATA.carrier, 'carrier');
      place(carrier, groupX - CARRIER_GAP - carrier.w, groupMidY - carrier.h / 2);
      byId['carrier'] = carrier;
    }

    y = groupBottom;

    /* ---------- convergence node ---------- */
    y += CONVERGE_GAP;
    place(converge, CX - converge.w / 2, y);
    byId[converge.id] = converge;
    y = converge.bottom;

    /* ---------- process spine (single rows + parallel fan-out/reconverge) ---------- */
    const rowsMeta = [];
    spineRows.forEach((r) => {
      y += SPINE_GAP;
      if (r.parallel) {
        const totalW = r.parallel.reduce((s, b) => s + b.w, 0) + BRANCH_GAP_X * (r.parallel.length - 1);
        let bx = CX - totalW / 2;
        const rowTop = y;
        let rowH = 0;
        r.parallel.forEach((b) => { place(b, bx, rowTop); byId[b.id] = b; bx += b.w + BRANCH_GAP_X; rowH = Math.max(rowH, b.h); });
        rowsMeta.push({ boxes: r.parallel, repTop: { x: CX, y: rowTop }, repBottom: { x: CX, y: rowTop + rowH } });
        y = rowTop + rowH;
      } else {
        place(r.box, CX - r.box.w / 2, y);
        byId[r.box.id] = r.box;
        rowsMeta.push({ boxes: [r.box], repTop: { x: r.box.cx, y: r.box.top }, repBottom: { x: r.box.cx, y: r.box.bottom } });
        y = r.box.bottom;
      }
    });

    /* ================= draw ================= */
    const svg = document.getElementById('svg');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const edgeLayer = el('g', { class: 'edges' });
    const frameLayer = el('g', { class: 'frames' });
    const nodeLayer = el('g', { class: 'nodes' });
    svg.appendChild(edgeLayer); svg.appendChild(frameLayer); svg.appendChild(nodeLayer);

    /* source-field frame + tag */
    frameLayer.appendChild(el('rect', { x: groupX, y: fieldTop, width: groupW, height: groupH, rx: 6, ry: 6, class: 'flow-group' }));
    growBox({ left: groupX, top: fieldTop, right: groupX + groupW, bottom: groupBottom });
    if (DATA.field && DATA.field.tag) tag(frameLayer, DATA.field.tag, groupX, fieldTop - 9, 'start');

    /* band boxes + tag */
    if (DATA.band && DATA.band._items) {
      if (DATA.band.tag) tag(nodeLayer, DATA.band.tag, DATA.band._tagX, DATA.band._items._tagY, 'start');
      DATA.band._items.forEach((b) => drawBox(nodeLayer, b));
    }

    /* carrier + lateral rail across the field */
    if (carrier) {
      drawBox(nodeLayer, carrier);
      const railY = groupMidY;
      const railX1 = carrier.right;
      const railX2 = groupX + groupW;             // rail spans the whole field
      lineTo(edgeLayer, railX1, railY, railX2, railY, 'edge-rail');
      [railX1, railX2].forEach((rx) => edgeLayer.appendChild(el('path', {
        d: `M ${rx} ${railY - CAP} L ${rx + CAP} ${railY} L ${rx} ${railY + CAP} L ${rx - CAP} ${railY} Z`, class: 'edge-rail-cap',
      })));
      if (DATA.carrier.railTag) tag(edgeLayer, DATA.carrier.railTag, (railX1 + railX2) / 2, railY - 8, 'middle');
      grow(railX1, railY); grow(railX2, railY);
    }

    /* convergence: many-to-one from each source node to the converge top */
    fieldNodes.forEach((b) => lineTo(edgeLayer, b.cx, b.bottom, converge.cx, converge.top, 'edge'));
    if (fieldNodes.length) {
      edgeLayer.appendChild(el('path', {
        d: `M ${converge.cx - ARROW_W / 2} ${converge.top - ARROW_H} L ${converge.cx + ARROW_W / 2} ${converge.top - ARROW_H} L ${converge.cx} ${converge.top} Z`,
        class: 'edge-arrowhead',
      }));
    }
    fieldNodes.forEach((b) => drawBox(nodeLayer, b));
    drawBox(nodeLayer, converge);

    /* spine connections: converge → row0 → row1 → … (fan-out / reconverge) */
    let prev = { boxes: [converge], repTop: { x: converge.cx, y: converge.top }, repBottom: { x: converge.cx, y: converge.bottom } };
    rowsMeta.forEach((cur) => {
      const curStatusCls = (b) => (b.status === 'held' ? 'edge held' : b.status === 'legacy' ? 'edge legacy' : 'edge');
      if (prev.boxes.length === 1 && cur.boxes.length === 1) {
        arrowDown(edgeLayer, cur.boxes[0].cx, prev.repBottom.y, cur.boxes[0].top, curStatusCls(cur.boxes[0]));
      } else if (prev.boxes.length === 1 && cur.boxes.length > 1) {
        cur.boxes.forEach((b) => { lineTo(edgeLayer, prev.repBottom.x, prev.repBottom.y, b.cx, b.top - ARROW_H, curStatusCls(b)); arrowDownTip(edgeLayer, b.cx, b.top); });
      } else if (prev.boxes.length > 1 && cur.boxes.length === 1) {
        prev.boxes.forEach((b) => lineTo(edgeLayer, b.cx, b.bottom, cur.boxes[0].cx, cur.boxes[0].top - ARROW_H, curStatusCls(cur.boxes[0])));
        arrowDownTip(edgeLayer, cur.boxes[0].cx, cur.boxes[0].top);
      } else {
        arrowDown(edgeLayer, cur.repTop.x, prev.repBottom.y, cur.repTop.y, 'edge');
      }
      cur.boxes.forEach((b) => drawBox(nodeLayer, b));
      prev = cur;
    });

    function arrowDownTip(layer, x, yTip) {
      layer.appendChild(el('path', {
        d: `M ${x - ARROW_W / 2} ${yTip - ARROW_H} L ${x + ARROW_W / 2} ${yTip - ARROW_H} L ${x} ${yTip} Z`, class: 'edge-arrowhead',
      }));
    }

    /* recompute content bbox over all placed boxes */
    Object.values(byId).forEach(growBox);

    /* ---------- secondary cross-stage evaluation edges (right gutter) ---------- */
    let gutterR = bb.maxX + GUTTER;
    (DATA.evalEdges || []).forEach((e, i) => {
      const from = byId[e.from], to = byId[e.to];
      if (!from || !to) { console.warn('[FLOW engine] evalEdge unresolved id', e); return; }
      const gx = gutterR + i * 10;
      const d = `M ${from.right} ${from.cy} L ${gx} ${from.cy} L ${gx} ${to.cy} L ${to.right + ARROW_H} ${to.cy}`;
      edgeLayer.appendChild(el('path', { d, class: 'edge-eval' }));
      triLeft(edgeLayer, to.right, to.cy);
      grow(gx, from.cy); grow(gx, to.cy);
    });

    /* ---------- optional return edge (left gutter) ---------- */
    if (DATA.returnEdge && byId[DATA.returnEdge.from] && carrier) {
      const from = byId[DATA.returnEdge.from];
      const gutterL = bb.minX - GUTTER;
      const d = `M ${from.left} ${from.cy} L ${gutterL} ${from.cy} L ${gutterL} ${carrier.cy} L ${carrier.left - ARROW_H} ${carrier.cy}`;
      edgeLayer.appendChild(el('path', { d, class: 'edge-return' }));
      triRight(edgeLayer, carrier.left, carrier.cy);
      if (DATA.returnEdge.tag) tag(edgeLayer, DATA.returnEdge.tag, gutterL + 6, (from.cy + carrier.cy) / 2, 'start');
      grow(gutterL, from.cy); grow(gutterL, carrier.cy);
    }

    /* ---------- finalize viewBox over the content bbox + pad ---------- */
    const minX = bb.minX - PAGE_PAD, minY = bb.minY - PAGE_PAD;
    const width = (bb.maxX + PAGE_PAD) - minX;
    const height = (bb.maxY + PAGE_PAD) - minY;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);

    /* ---------- pan / zoom (identical to the sibling engines) ---------- */
    const canvasWrap = document.getElementById('canvasWrap');
    const stage = document.getElementById('stage');
    const zoomPct = document.getElementById('zoomPct');
    let tx = 0, ty = 0, scale = 1;
    function apply() {
      stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      zoomPct.textContent = Math.round(scale * 100) + '%';
    }
    function fit() {
      const rect = canvasWrap.getBoundingClientRect();
      const padding = 80;
      const sx = (rect.width - padding) / width;
      const sy = (rect.height - padding) / height;
      scale = Math.min(sx, sy, 1.2);
      tx = (rect.width - width * scale) / 2;
      ty = (rect.height - height * scale) / 2;
      apply();
    }
    fit();
    window.addEventListener('resize', fit);
    document.getElementById('zoomIn').onclick  = () => { scale = Math.min(scale * 1.2, 4); apply(); };
    document.getElementById('zoomOut').onclick = () => { scale = Math.max(scale / 1.2, 0.15); apply(); };
    document.getElementById('zoomFit').onclick = fit;

    let dragging = false, sx0, sy0, tx0, ty0;
    canvasWrap.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('.hud, .legend, .caption')) return;
      dragging = true; canvasWrap.classList.add('dragging');
      canvasWrap.setPointerCapture(ev.pointerId);
      sx0 = ev.clientX; sy0 = ev.clientY; tx0 = tx; ty0 = ty;
    });
    canvasWrap.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      tx = tx0 + (ev.clientX - sx0); ty = ty0 + (ev.clientY - sy0); apply();
    });
    canvasWrap.addEventListener('pointerup', () => { dragging = false; canvasWrap.classList.remove('dragging'); });
    canvasWrap.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const rect = canvasWrap.getBoundingClientRect();
      const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
      const factor = ev.deltaY > 0 ? 1 / 1.1 : 1.1;
      const newScale = Math.max(0.15, Math.min(4, scale * factor));
      const k = newScale / scale;
      tx = mx - (mx - tx) * k; ty = my - (my - ty) * k; scale = newScale; apply();
    }, { passive: false });
  }

  /* Public entry — same font-load gate as the sibling engines. */
  function renderWhenFontsReady(DATA) {
    const fonts = (typeof document !== 'undefined') && document.fonts;
    if (!fonts || typeof fonts.load !== 'function') { render(DATA); return; }
    const needed = [
      '400 13px "Inter"', '300 13px "Inter"',
      '300 10px "JetBrains Mono"', '300 9px "JetBrains Mono"',
    ];
    Promise.all(needed.map((f) => fonts.load(f).catch(() => null)))
      .then(() => render(DATA))
      .catch(() => render(DATA));
  }

  window.DIAGRAMS = { render: renderWhenFontsReady };
})();
