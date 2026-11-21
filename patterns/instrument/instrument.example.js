/* =========================================================================
   instrument.example.js // the specimen's example product

   EXAMPLE CONTENT, not part of the pattern. It stands where a product's own
   script would: it holds a tiny work, draws it through the render contract
   and wires the specimen's controls. A consumer replaces this file with its
   own; it never vendors it.

   The work is a calibration chart: a ground, a grid, a circle and corner
   marks, all placed from `width` and `height` inside the call, so every
   frame, view and saved size shows how the machinery fits and saves a
   picture. `ground=dark` draws it on a dark ground, and `ground=plum` on a
   mid plum ground close to the ring's outer color: where the keyboard-focus
   ring has to hold. Plum is reached by the address only.
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);

  function clampInt(value, low, high, fallback) {
    var n = parseInt(value, 10);
    return isFinite(n) ? Math.min(high, Math.max(low, n)) : fallback;
  }

  /* Artwork colors, chosen by the example; a product chooses its own. */
  var GROUNDS = {
    light: { from: '#D4C6E1', to: '#E2D3F0', ink: '#6A637F' },
    dark:  { from: '#201D26', to: '#0A090C', ink: '#D4C6E1' },
    plum:  { from: '#725583', to: '#6A637F', ink: '#E2D3F0' }
  };

  var work = {
    ground: Object.prototype.hasOwnProperty.call(GROUNDS, params.get('ground')) ? params.get('ground') : 'light',
    grid: clampInt(params.get('grid'), 2, 24, 8)
  };

  /* The render contract: paint the whole rectangle from the work alone. */
  function render(ctx, width, height) {
    var g = GROUNDS[work.ground];
    var short = Math.min(width, height);
    var cx = width / 2, cy = height / 2;
    var ground = ctx.createLinearGradient(0, height, width, 0);
    ground.addColorStop(0, g.from);
    ground.addColorStop(1, g.to);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = g.ink;
    ctx.lineWidth = Math.max(1, Math.round(short / 720));
    ctx.globalAlpha = 0.45;
    var step = short / work.grid;
    var i, x, y;
    ctx.beginPath();
    for (i = 0; cx + i * step <= width; i++) {
      x = Math.round(cx + i * step) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, height);
      if (i) { x = Math.round(cx - i * step) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    }
    for (i = 0; cy + i * step <= height; i++) {
      y = Math.round(cy + i * step) + 0.5; ctx.moveTo(0, y); ctx.lineTo(width, y);
      if (i) { y = Math.round(cy - i * step) + 0.5; ctx.moveTo(0, y); ctx.lineTo(width, y); }
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1, Math.round(short / 360));
    ctx.beginPath();
    ctx.arc(cx, cy, short * 0.36, 0, Math.PI * 2);
    ctx.stroke();

    var inset = short * 0.04, arm = short * 0.08;
    ctx.beginPath();
    ctx.moveTo(inset, inset + arm); ctx.lineTo(inset, inset); ctx.lineTo(inset + arm, inset);
    ctx.moveTo(width - inset - arm, inset); ctx.lineTo(width - inset, inset); ctx.lineTo(width - inset, inset + arm);
    ctx.moveTo(width - inset, height - inset - arm); ctx.lineTo(width - inset, height - inset); ctx.lineTo(width - inset - arm, height - inset);
    ctx.moveTo(inset + arm, height - inset); ctx.lineTo(inset, height - inset); ctx.lineTo(inset, height - inset - arm);
    ctx.stroke();
  }

  /* What each kind of draw was last asked for, read by the owner's checks. */
  var lastInfo = {};

  var instrument = INSTRUMENT.create({
    root: $('inst'),
    stage: $('fit'),
    canvas: $('canvas'),
    pin: $('pin'),
    name: 'instrument-specimen',
    frame: params.get('frame') || undefined,
    render: function (ctx, width, height, info) {
      lastInfo[info.purpose] = { frame: info.frame, width: width, height: height, aspect: info.aspect };
      render(ctx, width, height);
    },
    fileSuffix: function () { return work.ground; }
  });

  instrument.bind({
    frame: $('frame'),
    size: $('save-size'),
    save: $('save'),
    fullWindow: $('view-window'),
    fullscreen: [$('view-fullscreen'), $('view-fullscreen-bar')],
    exit: $('view-exit'),
    panelToggle: $('panel-toggle')
  });

  var status = $('status');
  var announce = $('announce');
  function say(text) { announce.textContent = text; }
  function showStatus() {
    var s = instrument.state();
    status.textContent = s.frame + ' // ' + s.view + ' // ' + work.ground;
  }
  instrument.on('change', showStatus);
  instrument.on('export', function (result) { say('Saved ' + result.filename); });
  instrument.on('error', function (error) { say('Save failed: ' + (error && error.message ? error.message : error)); });

  var grounds = $('ground').querySelectorAll('input[type="radio"]');
  for (var i = 0; i < grounds.length; i++) {
    grounds[i].checked = grounds[i].value === work.ground;
    grounds[i].addEventListener('change', function (event) {
      if (!event.target.checked) return;
      work.ground = event.target.value;
      instrument.requestRedraw();
      showStatus();
    });
  }

  var grid = $('grid');
  var gridValue = $('grid-value');
  grid.value = String(work.grid);
  gridValue.textContent = String(work.grid);
  grid.addEventListener('input', function () {
    work.grid = clampInt(grid.value, 2, 24, 8);
    gridValue.textContent = String(work.grid);
    instrument.requestRedraw();
  });

  showStatus();
  /* For the owner's checks: the mounted instance and its work. */
  window.instrumentSpecimen = { instrument: instrument, work: work, lastInfo: lastInfo };
  document.documentElement.dataset.ready = '1';
})();
