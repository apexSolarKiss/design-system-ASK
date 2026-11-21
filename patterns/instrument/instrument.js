/* =========================================================================
   instrument.js // view, frame and export machinery for a canvas instrument

   ARTWORK-AGNOSTIC. This file knows nothing about any product's artwork. A
   product gives it a stage, a canvas and one function, and it owns what must
   behave the same in every instrument:

     frame    the shape of the picture: `free` follows the space it is given;
              `square`, `4:3` and `widescreen` are fixed. The canvas is fitted
              into the stage without distortion.
     view     docked beside the controls, full window, or browser fullscreen
              where the browser offers it. Full window is the base; fullscreen
              is the same layout with the browser's own chrome hidden.
     export   Save PNG re-draws the current work into an off-screen canvas at
              the frame's exact pixel size and hands the browser a file. The
              size of the screen never limits the size of the file.

   THE RENDER CONTRACT. The product supplies

       render(ctx, width, height, info)

   and must keep to these rules, because the same function draws the live
   canvas and every export:

     - it paints the WHOLE rectangle 0..width by 0..height, ground included;
     - it is synchronous, and the same work at the same size gives the same
       pixels: it draws no random numbers and starts nothing;
     - it works out all placement from `width` and `height` inside the call.
       It reads no window size, no device pixel ratio, no theme. Layout kept
       from an earlier call or an earlier event is not safe to reuse;
     - it reads the work and never changes it;
     - the context arrives in its default state every time.

   `info` is { purpose: 'view' | 'export', frame, aspect, pixelRatio }. For an
   export, `frame` is the frame being saved, which can differ from the one
   on screen.

   The contract in one line: a view change, a resize, a theme change or an
   export never asks the product for a new work. It only asks it to draw the
   one it has. The module holds no reference to anything that could make one.

   design-system-ASK surface pattern `instrument`; the contract is
   patterns/instrument/README.md. Classic script, no build, no dependency;
   runs from a file:// page.
   ========================================================================= */
(function (root) {
  'use strict';

  /* The contract version. A change a product must adapt to raises it. */
  var VERSION = 1;

  /* The saved-size family for instruments. `output` is the
     exact saved size in pixels. `free` has no fixed size: it saves the shape
     on screen at FREE_SHORT pixels on its short side, so the file does not
     depend on the monitor, with its long side capped at FREE_LONG_MAX. */
  var FRAMES = [
    { id: 'free',       label: 'free',       aspect: null,   output: null },
    { id: 'square',     label: 'square',     aspect: 1,      output: [2160, 2160] },
    { id: 'four-three', label: '4:3',        aspect: 4 / 3,  output: [2880, 2160] },
    { id: 'wide',       label: 'widescreen', aspect: 16 / 9, output: [3840, 2160] }
  ];
  var FREE_SHORT = 2160;
  var FREE_LONG_MAX = 3840;
  var LIVE_PIXELS_MAX = 3840 * 2160;   // the live canvas never holds more than the largest export
  var SLOW_RENDER_MS = 24;             // a render slower than this is not repeated on every resize step
  var SETTLE_MS = 140;                 // quiet time before a deferred re-fit
  var EXPORT_TIMEOUT_MS = 30000;

  function pad(n, width) {
    var s = String(n);
    while (s.length < width) s = '0' + s;
    return s;
  }

  /* YYYY-MM-DD-HHMMSS, the date stamp in a saved file's name. */
  function stamp(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1, 2) + '-' + pad(date.getDate(), 2) +
      '-' + pad(date.getHours(), 2) + pad(date.getMinutes(), 2) + pad(date.getSeconds(), 2);
  }

  /* The largest box of this aspect that fits inside boxWidth x boxHeight.
     A null aspect takes the whole box. Pure; exported for products. */
  function contain(boxWidth, boxHeight, aspect) {
    if (!aspect) return { width: boxWidth, height: boxHeight };
    if (boxWidth / boxHeight > aspect) return { width: boxHeight * aspect, height: boxHeight };
    return { width: boxWidth, height: boxWidth / aspect };
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function create(options) {
    var host = options.root;
    var stage = options.stage;
    var canvas = options.canvas;
    var render = options.render;
    var pin = options.pin || null;        // optional: a block pinned over scrolling controls
    var frames = options.frames || FRAMES;
    var name = options.name || 'instrument';
    var maxRatio = options.maxPixelRatio || 2;
    var maxPixels = options.maxPixels || LIVE_PIXELS_MAX;
    var storageKey = options.storageKey || null;
    var listeners = [];
    var ctx = canvas.getContext('2d');
    var frame = frames[0];
    var view = 'docked';              // 'docked' | 'window'; fullscreen is read from the browser
    var panelOpen = false;            // only meaningful while expanded
    var metrics = { cssWidth: 0, cssHeight: 0, width: 0, height: 0, ratio: 1, aspect: 1, frame: frame.id };
    var fitFrame = 0;
    var fitTimer = 0;
    var redrawFrame = 0;
    var lastRenderMs = 0;
    var destroyed = false;
    var exporting = null;             // the export in flight, if any
    var scrollBefore = 0;

    function emit(type, detail) {
      var list = listeners.slice();
      for (var i = 0; i < list.length; i++) {
        if (list[i].type === type) list[i].fn(detail);
      }
    }

    function on(type, fn) {
      var entry = { type: type, fn: fn };
      listeners.push(entry);
      return function off() {
        var at = listeners.indexOf(entry);
        if (at >= 0) listeners.splice(at, 1);
      };
    }

    function frameById(id) {
      for (var i = 0; i < frames.length; i++) if (frames[i].id === id) return frames[i];
      return null;
    }

    function remember() {
      if (!storageKey) return;
      try { localStorage.setItem(storageKey, JSON.stringify({ frame: frame.id })); } catch (e) { /* storage is a convenience only */ }
    }

    function recall() {
      if (!storageKey) return;
      try {
        var saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (saved && typeof saved.frame === 'string' && frameById(saved.frame)) frame = frameById(saved.frame);
      } catch (e) { /* ignore */ }
    }

    /* ---- drawing -------------------------------------------------------- */

    /* Hand the product a context in its default state and time the call. */
    function paint(context, width, height, purpose, ratio, frameId) {
      if (context.reset) context.reset();
      else {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        context.shadowColor = 'rgba(0,0,0,0)';
        context.filter = 'none';
      }
      var started = root.performance ? root.performance.now() : 0;
      render(context, width, height, {
        purpose: purpose, frame: frameId || frame.id, aspect: width / height, pixelRatio: ratio
      });
      return root.performance ? root.performance.now() - started : 0;
    }

    function drawLive() {
      redrawFrame = 0;
      if (destroyed || canvas.width < 1 || canvas.height < 1) return;
      lastRenderMs = paint(ctx, canvas.width, canvas.height, 'view', metrics.ratio);
    }

    /* Draw the current work again, at most once per animation frame. */
    function requestRedraw() {
      if (redrawFrame || destroyed) return;
      redrawFrame = root.requestAnimationFrame(drawLive);
    }

    /* ---- fitting -------------------------------------------------------- */

    /* Size the canvas box inside the stage. A fixed frame is contained without
       distortion; `free` takes the whole stage. The backing store follows the
       device pixel ratio so the live view is sharp, and the box is snapped to
       whole device pixels so the browser never resamples it. Setting a canvas
       size clears it, so the product is asked to draw the current work again,
       in the same call, before the browser paints. `resize` is announced
       BEFORE that draw, so a product that keeps state per size is current. */
    function fit() {
      fitFrame = 0;
      root.clearTimeout(fitTimer);
      fitTimer = 0;
      if (destroyed) return;
      if (pin) host.style.setProperty('--inst-pin-height', pin.offsetHeight + 'px');
      var boxWidth = stage.clientWidth;
      var boxHeight = stage.clientHeight;
      if (boxWidth < 2 || boxHeight < 2) return;
      var box = contain(boxWidth, boxHeight, frame.aspect);
      var ratio = Math.min(root.devicePixelRatio || 1, maxRatio);
      if (box.width * box.height * ratio * ratio > maxPixels) ratio = Math.sqrt(maxPixels / (box.width * box.height));
      var width = Math.max(1, Math.floor(box.width * ratio + 1e-6));
      var height = Math.max(1, Math.floor(box.height * ratio + 1e-6));
      canvas.style.width = (width / ratio) + 'px';
      canvas.style.height = (height / ratio) + 'px';
      /* The canvas box, for the keyboard-focus ring the stylesheet draws over it. */
      stage.style.setProperty('--inst-canvas-width', (width / ratio) + 'px');
      stage.style.setProperty('--inst-canvas-height', (height / ratio) + 'px');
      var changed = width !== canvas.width || height !== canvas.height;
      metrics = {
        cssWidth: width / ratio, cssHeight: height / ratio, width: width, height: height, ratio: ratio,
        aspect: width / height, frame: frame.id
      };
      if (changed) {
        canvas.width = width;
        canvas.height = height;
        emit('resize', metrics);
        root.cancelAnimationFrame(redrawFrame);
        drawLive();
      }
    }

    /* A re-fit re-draws the whole work. While that is quick it follows the
       stage every frame; when it is slow the canvas is left alone until the
       size has settled, then drawn once. Nothing is stretched meanwhile. */
    function scheduleFit() {
      if (destroyed) return;
      if (lastRenderMs > SLOW_RENDER_MS) {
        root.clearTimeout(fitTimer);
        fitTimer = root.setTimeout(fit, SETTLE_MS);
      } else if (!fitFrame && !fitTimer) {
        fitFrame = root.requestAnimationFrame(fit);
      }
    }

    function fitNow() {
      root.cancelAnimationFrame(fitFrame);
      fit();
    }

    /* ---- frame ---------------------------------------------------------- */

    function setFrame(id) {
      var next = frameById(id);
      if (!next) return false;
      if (next === frame) return true;
      if (options.beforeFrameChange && options.beforeFrameChange(next, frame) === false) {
        emit('change', state('frame-refused'));
        return false;
      }
      frame = next;
      host.setAttribute('data-frame', frame.id);
      remember();
      var before = canvas.width + 'x' + canvas.height;
      fitNow();
      /* The pixel size can be unchanged while the frame differs (a stage that
         happens to be 16:9): announce and draw again regardless. */
      if (before === canvas.width + 'x' + canvas.height) {
        metrics.frame = frame.id;
        emit('resize', metrics);
        root.cancelAnimationFrame(redrawFrame);
        drawLive();
      }
      emit('change', state('frame'));
      return true;
    }

    /* ---- view ----------------------------------------------------------- */

    function fullscreenSupported() {
      return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
        !!(host.requestFullscreen || host.webkitRequestFullscreen);
    }

    function isFullscreen() { return fullscreenElement() === host; }

    function isExpanded() { return view === 'window' || isFullscreen(); }

    function applyView(reason) {
      var expanded = isExpanded();
      var was = host.getAttribute('data-expanded') === 'true';
      if (!expanded) panelOpen = false;
      if (expanded && !was) scrollBefore = root.scrollY || 0;
      host.setAttribute('data-view', isFullscreen() ? 'fullscreen' : view);
      host.setAttribute('data-expanded', expanded ? 'true' : 'false');
      host.setAttribute('data-panel', panelOpen ? 'open' : 'closed');
      document.documentElement.classList.toggle('inst-lock', expanded);
      /* Controls take their final shape first, so the stage is measured once. */
      emit('change', state(reason || 'view'));
      fitNow();
      if (!expanded && was && root.scrollTo) root.scrollTo(0, scrollBefore);
    }

    function setView(next) {
      if (next !== 'docked' && next !== 'window') return;
      view = next;
      if (isFullscreen()) exitFullscreen();     // applyView follows from fullscreenchange
      applyView('view');
    }

    function enterFullscreen() {
      if (!fullscreenSupported()) return Promise.resolve(false);
      var request = host.requestFullscreen || host.webkitRequestFullscreen;
      try {
        var result = request.call(host);
        if (result && result.then) return result.then(function () { return true; }, function () { return false; });
        return Promise.resolve(true);
      } catch (e) {
        return Promise.resolve(false);
      }
    }

    function exitFullscreen() {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit && fullscreenElement()) {
        try { var r = exit.call(document); if (r && r.catch) r.catch(function () {}); } catch (e) { /* ignore */ }
      }
    }

    /* Leave one level: fullscreen first, then full window. */
    function exitExpanded() {
      if (isFullscreen()) exitFullscreen();
      else if (view === 'window') setView('docked');
    }

    function setPanel(open) {
      panelOpen = !!open && isExpanded();
      host.setAttribute('data-panel', panelOpen ? 'open' : 'closed');
      emit('change', state('panel'));
      fitNow();
    }

    /* ---- export --------------------------------------------------------- */

    function exportSize(frameId) {
      var f = frameId ? frameById(frameId) : frame;
      if (!f) f = frame;
      if (f.output) return { width: f.output[0], height: f.output[1], frame: f.id };
      var aspect = metrics.aspect || 1;
      var width, height;
      if (aspect >= 1) {
        height = FREE_SHORT; width = Math.round(FREE_SHORT * aspect);
        if (width > FREE_LONG_MAX) { width = FREE_LONG_MAX; height = Math.round(FREE_LONG_MAX / aspect); }
      } else {
        width = FREE_SHORT; height = Math.round(FREE_SHORT / aspect);
        if (height > FREE_LONG_MAX) { height = FREE_LONG_MAX; width = Math.round(FREE_LONG_MAX * aspect); }
      }
      return { width: width, height: height, frame: f.id };
    }

    function sizeText(size) { return size.width + ' × ' + size.height; }

    /* Draw the current work at the frame's exact size, off screen, and save it.
       Nothing on screen changes and the work is not touched; a failure leaves
       the live canvas alone. One export runs at a time: a call made while one
       is in flight gets that one's promise. Options:
         frame      a frame id, default the current frame
         download   false to get the result without handing the browser a file
         defer      true to let the page paint its busy state first
       Resolves with { blob, width, height, frame, filename, downloaded }. */
    function exportPNG(opts) {
      opts = opts || {};
      if (exporting) return exporting;
      var size = exportSize(opts.frame);

      function run() {
        return new Promise(function (resolve, reject) {
          var off = document.createElement('canvas');
          off.width = size.width;
          off.height = size.height;
          var offCtx = off.getContext('2d');
          if (!offCtx || off.width !== size.width || off.height !== size.height) {
            reject(new Error('could not make a ' + sizeText(size) + ' canvas'));
            return;
          }
          var filename;
          try {
            paint(offCtx, size.width, size.height, 'export', 1, size.frame);
            var suffix = options.fileSuffix ? String(options.fileSuffix() || '') : '';
            filename = name + '-' + stamp(opts.date || new Date()) + (suffix ? '-' + suffix : '') +
              '-' + size.width + 'x' + size.height + '.png';
          } catch (e) {
            off.width = off.height = 0;
            reject(e);
            return;
          }
          var settled = false;
          var timer = root.setTimeout(function () {
            if (settled) return;
            settled = true;
            off.width = off.height = 0;
            reject(new Error('the browser did not finish encoding a ' + sizeText(size) + ' image'));
          }, EXPORT_TIMEOUT_MS);
          off.toBlob(function (blob) {
            if (settled) return;
            settled = true;
            root.clearTimeout(timer);
            off.width = off.height = 0;                    // release the pixels
            if (!blob) { reject(new Error('could not encode a ' + sizeText(size) + ' image')); return; }
            var result = { blob: blob, width: size.width, height: size.height, frame: size.frame, filename: filename, downloaded: opts.download !== false };
            if (opts.download !== false) {
              var url = URL.createObjectURL(blob);
              var link = document.createElement('a');
              link.href = url;
              link.download = filename;
              link.rel = 'noopener';
              link.hidden = true;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              root.setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
            }
            resolve(result);
          }, 'image/png');
        });
      }

      var started = !opts.defer ? run() : new Promise(function (resolve, reject) {
        /* Two frames: one for the busy state to be styled, one for it to paint. */
        root.requestAnimationFrame(function () {
          root.requestAnimationFrame(function () { run().then(resolve, reject); });
        });
      });

      exporting = started.then(function (result) {
        exporting = null;
        emit('change', state('export'));
        emit('export', result);
        return result;
      }, function (error) {
        exporting = null;
        emit('change', state('export'));
        emit('error', error);
        throw error;
      });
      emit('change', state('export'));
      return exporting;
    }

    /* ---- pointer -------------------------------------------------------- */

    /* A pointer position as fractions of the frame: 0..1 across, 0..1 down. */
    function pointFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var nx = rect.width ? (event.clientX - rect.left) / rect.width : 0;
      var ny = rect.height ? (event.clientY - rect.top) / rect.height : 0;
      return { nx: nx, ny: ny, inside: nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1 };
    }

    /* ---- state ---------------------------------------------------------- */

    function state(reason) {
      return {
        reason: reason || null,
        frame: frame.id,
        view: isFullscreen() ? 'fullscreen' : view,
        expanded: isExpanded(),
        fullscreen: isFullscreen(),
        fullscreenSupported: fullscreenSupported(),
        panelOpen: panelOpen,
        busy: !!exporting,
        exportSize: exportSize(),
        metrics: metrics
      };
    }

    /* ---- binding authored controls ---------------------------------------
       The page authors its own markup and copy. This wires the controls every
       instrument shares to the state above and keeps their attributes true.
       Every member is optional.

         frame        element containing radio inputs whose values are frame ids
         size         element whose text reports the size a save will produce
         save         button: save PNG
         fullWindow   button: enter the full-window view
         fullscreen   button, or a list of buttons: enter browser fullscreen
                      (hidden where the browser does not offer it)
         exit         button: leave fullscreen, then full window
         panelToggle  button: show or hide the controls while expanded

       When a control hides while it holds keyboard focus, focus moves to its
       counterpart instead of falling to the page.                          */
    function bind(el) {
      el = el || {};
      var radios = el.frame ? el.frame.querySelectorAll('input[type="radio"]') : [];
      var fullscreenButtons = !el.fullscreen ? [] : (el.fullscreen.length != null ? Array.prototype.slice.call(el.fullscreen) : [el.fullscreen]);
      var formatSize = options.formatSize || function (w, h) { return 'Saves ' + w + ' × ' + h + ' px'; };

      function shown(node) { return !!node && !node.hidden && node.getClientRects().length > 0; }

      function hide(node, hidden, fallbacks) {
        if (!node || node.hidden === hidden) return;
        var hadFocus = hidden && document.activeElement === node;
        node.hidden = hidden;
        if (hadFocus) {
          for (var i = 0; i < fallbacks.length; i++) {
            if (shown(fallbacks[i])) { fallbacks[i].focus(); return; }
          }
        }
      }

      function sync() {
        var s = state();
        var i;
        for (i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === s.frame;
        if (el.size) {
          var text = formatSize(s.exportSize.width, s.exportSize.height);
          if (el.size.textContent !== text) el.size.textContent = text;
        }
        /* Show first, hide second, so a fallback is visible when focus needs it.
           These lines only show; every hide below names where focus goes. */
        if (el.exit && s.expanded) el.exit.hidden = false;
        if (el.fullWindow && !s.expanded) el.fullWindow.hidden = false;
        if (el.panelToggle) {
          if (s.expanded) el.panelToggle.hidden = false;
          el.panelToggle.setAttribute('aria-expanded', s.panelOpen ? 'true' : 'false');
        }
        var canFull = s.fullscreenSupported && !s.fullscreen;
        for (i = 0; i < fullscreenButtons.length; i++) hide(fullscreenButtons[i], !canFull, [el.exit, el.fullWindow]);
        if (el.fullWindow) hide(el.fullWindow, s.expanded, [el.exit]);
        if (el.exit) hide(el.exit, !s.expanded, [el.fullWindow]);
        if (el.panelToggle) hide(el.panelToggle, !s.expanded, [el.fullWindow]);
        if (el.save) {
          if (s.busy) el.save.setAttribute('aria-busy', 'true'); else el.save.removeAttribute('aria-busy');
        }
      }

      for (var i = 0; i < radios.length; i++) {
        radios[i].addEventListener('change', function (event) {
          if (event.target.checked) setFrame(event.target.value);
          sync();
        });
      }
      if (el.fullWindow) el.fullWindow.addEventListener('click', function () { setView('window'); });
      for (var j = 0; j < fullscreenButtons.length; j++) {
        fullscreenButtons[j].addEventListener('click', function () {
          enterFullscreen().then(function (ok) { if (!ok) setView('window'); });
        });
      }
      if (el.exit) el.exit.addEventListener('click', exitExpanded);
      if (el.panelToggle) el.panelToggle.addEventListener('click', function () { setPanel(!panelOpen); });
      if (el.save) el.save.addEventListener('click', function () {
        if (exporting) return;
        exportPNG({ defer: true }).catch(function () { /* announced through the `error` event */ });
      });

      on('change', sync);
      on('resize', sync);       // the size a save will produce follows the canvas
      sync();
    }

    /* ---- wiring --------------------------------------------------------- */

    function onFullscreenChange() { applyView('fullscreen'); }

    function onKeyDown(event) {
      if (event.key === 'Escape' && view === 'window' && !isFullscreen() && !event.defaultPrevented) setView('docked');
    }

    var observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleFit);
      observer.observe(stage);
      if (pin) observer.observe(pin);
    }
    root.addEventListener('resize', scheduleFit);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown);

    /* A move to a display with another pixel ratio, or a browser zoom, changes
       devicePixelRatio without resizing the stage. */
    var ratioQuery = null;
    function watchRatio() {
      if (!root.matchMedia) return;
      if (ratioQuery && ratioQuery.removeEventListener) ratioQuery.removeEventListener('change', onRatioChange);
      ratioQuery = root.matchMedia('(resolution: ' + (root.devicePixelRatio || 1) + 'dppx)');
      if (ratioQuery.addEventListener) ratioQuery.addEventListener('change', onRatioChange);
    }
    function onRatioChange() { watchRatio(); scheduleFit(); }
    watchRatio();

    recall();
    if (options.frame && frameById(options.frame)) frame = frameById(options.frame);
    host.setAttribute('data-frame', frame.id);
    host.setAttribute('data-view', view);
    host.setAttribute('data-expanded', 'false');
    host.setAttribute('data-panel', 'closed');
    /* The first fit, and so the first render, happens here. Listeners added
       after create() see every later one; `metrics` holds this one's result. */
    fit();

    return {
      version: VERSION,
      frames: frames,
      get frame() { return frame; },
      get view() { return isFullscreen() ? 'fullscreen' : view; },
      get metrics() { return metrics; },
      get context() { return ctx; },
      get fullscreenSupported() { return fullscreenSupported(); },
      get lastRenderMs() { return lastRenderMs; },
      state: state,
      bind: bind,
      setFrame: setFrame,
      setView: setView,
      setPanel: setPanel,
      enterFullscreen: enterFullscreen,
      exitExpanded: exitExpanded,
      exportSize: exportSize,
      exportPNG: exportPNG,
      pointFromEvent: pointFromEvent,
      /* Draw the current work again now. */
      redraw: function () { root.cancelAnimationFrame(redrawFrame); drawLive(); },
      /* Draw it again on the next animation frame; repeated calls make one draw. */
      requestRedraw: requestRedraw,
      /* Re-measure now (tests, and after a layout change the observer cannot see). */
      refit: fitNow,
      on: on,
      destroy: function () {
        destroyed = true;
        if (observer) observer.disconnect();
        if (ratioQuery && ratioQuery.removeEventListener) ratioQuery.removeEventListener('change', onRatioChange);
        root.clearTimeout(fitTimer);
        root.cancelAnimationFrame(fitFrame);
        root.cancelAnimationFrame(redrawFrame);
        root.removeEventListener('resize', scheduleFit);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        document.removeEventListener('keydown', onKeyDown);
        document.documentElement.classList.remove('inst-lock');
        listeners.length = 0;
      }
    };
  }

  root.INSTRUMENT = { create: create, FRAMES: FRAMES, contain: contain, stamp: stamp, VERSION: VERSION };
})(typeof self !== 'undefined' ? self : this);
