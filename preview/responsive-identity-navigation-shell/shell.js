/* PROTOTYPE ONLY // responsive identity-navigation shell driver.
   Scoped to this preview route. No canonical behavior is defined here.

   ONE progress value drives the whole mobile handoff, and it is derived from the
   OPENING mark's ACTUAL viewport exit — never from document scroll percentage.
   That distinction is load-bearing: the mobile terminal reserve changes the
   page's total scroll height, so a percentage-driven handoff would retime itself
   whenever the footer reserve, the content length or the browser chrome changed. */
(function () {
  var root = document.querySelector('[data-rin]');
  if (!root) return;

  var openingMark = root.querySelector('.rin-mark-slot');
  var trigger     = root.querySelector('.rin-trigger');
  var panel       = root.querySelector('.rin-panel');
  var scrim       = root.querySelector('.rin-scrim');
  var probe       = root.querySelector('.rin-probe');
  var desktopMark = root.querySelector('.rin-mark-slot');

  var MOBILE = function () { return window.matchMedia('(max-width: 767px)').matches; };
  var SETTLE_RANGE = 24, SETTLE_TO = 24;   /* 64 -> 40 over the first 24px */

  var lastInvoker = null, ticking = false;

  /* progress 0 -> 1 as the opening mark travels from its RESTING position to
     fully clipped above the top edge.

       p = 0   the page is at rest and the mark is entirely present
       p = 1   the mark's bottom has reached the top edge — completely eclipsed

     The span is the mark's own exit distance: the document-space offset of its
     bottom edge, which is a fact about where the mark sits in the layout, not a
     fraction of the document. It is captured from the element and re-measured on
     resize, so content length, the terminal reserve and browser-chrome collapse
     cannot retime the handoff. Using the mark's HEIGHT as the span instead would
     compress the whole transition into the last ~52px of its travel, which reads
     as a snap rather than a handoff. */
  var exitSpan = 0;
  function measureExitSpan() {
    if (!openingMark) { exitSpan = 0; return; }
    var r = openingMark.getBoundingClientRect();
    exitSpan = r.bottom + window.scrollY;        /* constant: the mark is in flow */
  }
  function handoffProgress() {
    if (!exitSpan) return 0;
    return Math.min(1, Math.max(0, window.scrollY / exitSpan));
  }

  /* A page is SHORT when its own content fits the viewport — measured to the
     FOOTER's bottom, not to the document's. The terminal reserve sits below the
     footer, so measuring scrollHeight would let the reserve manufacture the very
     scrolling that summons the unit the reserve exists to clear: the guard would
     defeat itself on exactly the pages it protects. Everything below the footer
     is reserve, so the footer's document-space bottom is the honest content
     height. */
  function shortPage() {
    var foot = root.querySelector('.surface-footer');
    if (!foot) return false;
    var contentBottom = foot.getBoundingClientRect().bottom + window.scrollY;
    return contentBottom <= window.innerHeight;
  }

  function frame() {
    ticking = false;
    var p = MOBILE() ? (shortPage() ? 0 : handoffProgress()) : 0;
    root.style.setProperty('--rin-p', p.toFixed(4));

    /* desktop settle, same source: the opening mark is the same element */
    if (!MOBILE()) {
      var s = Math.min(SETTLE_TO, Math.max(0, window.scrollY / SETTLE_RANGE * SETTLE_TO));
      root.style.setProperty('--rin-settle', s.toFixed(2) + 'px');
    } else {
      root.style.setProperty('--rin-settle', '0px');
    }

    /* only ONE persistent trigger is ever in the tab order */
    if (trigger) {
      var seated = MOBILE() ? p > 0.999 : true;
      trigger.setAttribute('tabindex', seated ? '0' : '-1');
      trigger.setAttribute('aria-hidden', seated ? 'false' : 'true');
    }
    if (probe) {
      var r = openingMark ? openingMark.getBoundingClientRect() : {top:0,bottom:0,height:0};
      probe.textContent =
        'mode      ' + (MOBILE() ? 'mobile' : 'desktop') +
        '\nprogress  ' + p.toFixed(4) +
        '\nmark      ' + r.top.toFixed(1) + ' -> ' + r.bottom.toFixed(1) +
        '\nscrollY   ' + Math.round(window.scrollY) +
        '\nsettle    ' + getComputedStyle(root).getPropertyValue('--rin-settle').trim() +
        '\nseated    ' + (MOBILE() ? (p > 0.999) : 'n/a') +
        '\nexitSpan  ' + exitSpan.toFixed(1) +
        '\nshortPage ' + shortPage() +
        '\npanel     ' + (panel && !panel.hidden ? 'open' : 'closed');
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  /* ---------- panel disclosure ---------- */
  function focusables() {
    return panel ? [].slice.call(panel.querySelectorAll('a[href], button:not([disabled])')) : [];
  }
  function openPanel(invoker) {
    if (!panel || !panel.hidden) return;
    lastInvoker = invoker || document.activeElement;
    panel.hidden = false; if (scrim) scrim.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    trigger.setAttribute('aria-expanded', 'true');
    var f = focusables(); if (f.length) f[0].focus();
    document.addEventListener('keydown', onKeydown, true);
    frame();
  }
  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown, true);
    var done = function () { panel.hidden = true; if (scrim) scrim.hidden = true; frame(); };
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) done(); else setTimeout(done, 220);
    if (lastInvoker && lastInvoker.isConnected) lastInvoker.focus();
    lastInvoker = null;
  }
  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePanel(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  if (trigger) {
    trigger.addEventListener('click', function () {
      panel && panel.hidden ? openPanel(trigger) : closePanel();
    });
  }
  if (scrim) scrim.addEventListener('click', closePanel);

  function remeasure() { measureExitSpan(); frame(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('orientationchange', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  remeasure();

  /* short-page toggle, prototype only */
  var toggle = root.querySelector('[data-rin-shortpage]');
  if (toggle) {
    toggle.addEventListener('click', function () {
      root.classList.toggle('is-short');
      var short = root.classList.contains('is-short');
      var tail = root.querySelector('.rin-tail');
      var body = root.querySelector('.rin-body');
      if (tail) tail.hidden = short;
      /* leave one paragraph so the page is a real surface, not an empty shell */
      if (body) [].slice.call(body.children).forEach(function (el, i) { el.hidden = short && i > 0; });
      remeasure();
    });
  }
  window.__rin = { progress: handoffProgress, frame: frame, open: openPanel, close: closePanel,
                   shortPage: shortPage, remeasure: remeasure,
                   exitSpan: function () { return exitSpan; } };
})();
