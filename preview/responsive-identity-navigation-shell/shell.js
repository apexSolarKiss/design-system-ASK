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
  var mobTrigger  = root.querySelector('.rin-trigger');
  var deskTrigger = root.querySelector('.rin-mark-desk');
  var panel       = root.querySelector('.rin-panel');
  var scrim       = root.querySelector('.rin-scrim');
  var probe       = root.querySelector('.rin-probe');

  var MOBILE = function () { return window.matchMedia('(max-width: 767px)').matches; };
  var REDUCED = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  /* the trigger that is actually operable at this breakpoint */
  function activeTrigger() { return MOBILE() ? mobTrigger : deskTrigger; }
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
    var short = MOBILE() && shortPage();
    root.classList.toggle('is-shortpage', short);

    var p = MOBILE() ? (short ? 0 : handoffProgress()) : 0;
    /* Reduced motion: the SAME progress value, snapped. Discrete states, never
       an interpolated slide and never both marks visible at once. */
    if (REDUCED()) p = p >= 1 ? 1 : 0;
    root.style.setProperty('--rin-p', p.toFixed(4));

    /* desktop settle, from the same scroll the mark responds to — snapped under
       reduced motion rather than continuing to travel while claiming it does not */
    if (!MOBILE()) {
      var s = Math.min(SETTLE_TO, Math.max(0, window.scrollY / SETTLE_RANGE * SETTLE_TO));
      if (REDUCED()) s = s >= SETTLE_TO ? SETTLE_TO : 0;
      root.style.setProperty('--rin-settle', s.toFixed(2) + 'px');
    } else {
      root.style.setProperty('--rin-settle', '0px');
    }

    /* Exactly one persistent trigger is operable, and its operability always
       matches what is on screen — a visible-but-inert mark is the defect this
       replaces. */
    if (mobTrigger) {
      var seated = MOBILE() && !short && p > 0.999;
      mobTrigger.setAttribute('tabindex', seated ? '0' : '-1');
      mobTrigger.setAttribute('aria-hidden', seated ? 'false' : 'true');
      mobTrigger.disabled = !seated;
    }
    if (deskTrigger) {
      deskTrigger.setAttribute('tabindex', MOBILE() ? '-1' : '0');
      deskTrigger.setAttribute('aria-hidden', MOBILE() ? 'true' : 'false');
      deskTrigger.disabled = MOBILE();
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
        '\nreduced   ' + REDUCED() +
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
    var at = activeTrigger(); if (at) at.setAttribute('aria-expanded', 'true');
    var f = focusables(); if (f.length) f[0].focus();
    document.addEventListener('keydown', onKeydown, true);
    frame();
  }
  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.classList.remove('is-open');
    var at = activeTrigger(); if (at) at.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown, true);

    /* Complete on the transform's own transitionend, so the exit is never cut
       short. The previous 220ms timer was shorter than the declared --dur-3
       (420ms), so the panel vanished mid-slide. The fallback is derived from the
       computed duration rather than hard-coded, so it cannot drift out of step
       with the stylesheet again. */
    var done = function () {
      if (panel.hidden) return;
      panel.removeEventListener('transitionend', onEnd);
      panel.hidden = true; if (scrim) scrim.hidden = true; frame();
    };
    function onEnd(e) { if (e.target === panel && e.propertyName === 'transform') done(); }

    if (REDUCED()) { done(); }
    else {
      panel.addEventListener('transitionend', onEnd);
      var cs = getComputedStyle(panel);
      var secs = (cs.transitionDuration || '0s').split(',').map(function (v) { return parseFloat(v) || 0; });
      var delays = (cs.transitionDelay || '0s').split(',').map(function (v) { return parseFloat(v) || 0; });
      var longest = 0;
      for (var i = 0; i < secs.length; i++) longest = Math.max(longest, secs[i] + (delays[i] || 0));
      setTimeout(done, Math.round(longest * 1000) + 60);   /* defensive only */
    }
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

  [mobTrigger, deskTrigger].forEach(function (t) {
    if (!t) return;
    t.addEventListener('click', function () {
      panel && panel.hidden ? openPanel(t) : closePanel();
    });
  });
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
