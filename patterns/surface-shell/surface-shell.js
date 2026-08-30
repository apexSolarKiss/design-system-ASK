/* =========================================================================
   surface-shell.js — OPTIONAL responsive-navigation runtime
   =========================================================================
   Part of the surface-shell pattern, and vendored only by surfaces that adopt
   navigation. It is a CARRIER TYPE, not an artifact class: the core shell is
   surface-shell.css plus the template, and this file is an addition a consuming
   surface opts into. A page that declines navigation ships no copy of it, and a
   repo with at least one adopting page may vendor one shared copy.

   ENABLEMENT IS AUTHORED, NOT INFERRED. The runtime does nothing at all unless
   the surface carries <template class="surface-nav-source">. Loading the script
   on a page without that source is inert — no panel, no trigger, no geometry,
   no state attribute — so the stylesheet's navigation-only declarations never
   engage either.

   WHAT IT BUILDS
     one panel      a native <dialog>, one content tree, two entrances
     one hierarchy  derived from the single authored breadcrumb, plus the
                    configured root and the optional authored local list
     two placements one authored mark, upgraded in place, plus a derived seated
                    instance for the mobile handoff

   WHAT IT NEVER DOES
     author a second mark tree · author a second breadcrumb · synchronize
     browser-edge metadata (the foundation owns the edge through --bg-edge and
     the root color-scheme property) · leave two triggers operable at once
   ========================================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var surface = doc.querySelector('.surface');
  if (!surface) return;

  var source = doc.querySelector('template.surface-nav-source');
  if (!source) return;                       /* this surface declines navigation */

  var mark = surface.querySelector('.surface-mark');
  if (!mark) return;                         /* the mark IS the disclosure */

  var PANEL_ID = 'surface-nav-panel';
  var cfg = source.dataset || {};
  var TRIGGER_LABEL = cfg.navTriggerLabel || 'Open navigation';
  var PANEL_LABEL   = cfg.navPanelLabel   || 'Navigation';
  var CLOSE_LABEL   = cfg.navCloseLabel   || 'close';

  var mqMobile  = window.matchMedia('(max-width: 767px)');
  var mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function MOBILE()  { return mqMobile.matches; }
  function REDUCED() { return mqReduced.matches; }

  var SETTLE_RANGE = 24, SETTLE_TO = 24;     /* 64px -> 40px over the first 24px */

  /* ---------------------------------------------------------------- crumb --
     The visible header breadcrumb is the ONE authored source for the current
     path, so the panel derives its vertical path from it rather than restating
     it. Segments are delimited by the decorative `//` separators; a segment may
     be an anchor, a span, or a bare text node, and its destination is whatever
     the author gave it — the panel invents none. */
  function readCrumb(titleEl) {
    if (!titleEl) return [];
    var out = [], cur = { label: '', href: null, current: false };
    Array.prototype.forEach.call(titleEl.childNodes, function (n) {
      if (n.nodeType === 1 && n.classList && n.classList.contains('sep')) {
        if (cur.label.trim()) out.push(cur);
        cur = { label: '', href: null, current: false };
        return;
      }
      if (n.nodeType === 3) { cur.label += n.textContent; return; }
      if (n.nodeType !== 1) return;
      cur.label += n.textContent;
      if (n.tagName === 'A' && n.getAttribute('href')) cur.href = n.getAttribute('href');
      if (n.getAttribute('aria-current') === 'page') cur.current = true;
      var inner = n.querySelector && n.querySelector('a[href]');
      if (!cur.href && inner) cur.href = inner.getAttribute('href');
    });
    if (cur.label.trim()) out.push(cur);
    out.forEach(function (s) { s.label = s.label.replace(/\s+/g, ' ').trim(); });
    return out;
  }

  var titleEl = surface.querySelector('.surface-breadcrumb .surface-title')
             || surface.querySelector('.surface-title');
  var crumb = readCrumb(titleEl);
  if (crumb.length && !crumb.some(function (s) { return s.current; })) {
    crumb[crumb.length - 1].current = true;  /* a root title's last segment IS the surface */
  }

  /* ------------------------------------------------------------- building --
     Rows are list items in a nested list. Tier is carried by nesting and by the
     branch guide the stylesheet draws, not by a uniform pill — a stack of
     identical controls would flatten the structure the panel exists to show. */
  function row(seg) {
    var el;
    if (seg.href && !seg.current) {
      el = doc.createElement('a');
      el.setAttribute('href', seg.href);
    } else {
      el = doc.createElement('span');
    }
    el.className = 'surface-nav-row';
    el.textContent = seg.label;
    if (seg.current) el.setAttribute('aria-current', 'page');
    return el;
  }

  function level() {
    var ol = doc.createElement('ol');
    ol.className = 'surface-nav-level';
    return ol;
  }

  /* Optional local destinations, authored once in the panel-nav source. A
     breadcrumb cannot supply siblings it does not contain, so these are a
     SECOND authored source rather than a second copy of the first. */
  var localItems = [];
  var localList = source.content.querySelector('.surface-nav-local');
  if (localList) {
    Array.prototype.forEach.call(localList.querySelectorAll('a[href]'), function (a) {
      localItems.push({
        label: (a.textContent || '').replace(/\s+/g, ' ').trim(),
        href: a.getAttribute('href'),
        current: a.getAttribute('aria-current') === 'page'
      });
    });
  }

  function buildTree() {
    var nav = doc.createElement('nav');
    nav.className = 'surface-nav-tree';
    nav.setAttribute('aria-label', PANEL_LABEL);

    var chain = [];
    if (cfg.navRootLabel) {
      chain.push({ label: cfg.navRootLabel, href: cfg.navRootHref || null, current: false });
    }
    var currentSeg = null;
    crumb.forEach(function (s) { if (s.current) currentSeg = s; else chain.push(s); });

    var top = level(), host = top;
    chain.forEach(function (seg) {
      var li = doc.createElement('li');
      li.appendChild(row(seg));
      host.appendChild(li);
      var next = level();
      li.appendChild(next);
      host = next;
    });

    if (localItems.length) {
      var covered = false;
      localItems.forEach(function (it) {
        var li = doc.createElement('li');
        li.appendChild(row(it));
        host.appendChild(li);
        if (it.current) covered = true;
      });
      /* Never lose the current page: if the authored local list does not mark
         it, the crumb's own leaf is appended rather than silently dropped. */
      if (!covered && currentSeg) {
        var li2 = doc.createElement('li');
        li2.appendChild(row(currentSeg));
        host.appendChild(li2);
      }
    } else if (currentSeg) {
      var li3 = doc.createElement('li');
      li3.appendChild(row(currentSeg));
      host.appendChild(li3);
    }

    nav.appendChild(top);
    /* the deepest chain link always allocates a child level; an empty one would
       render as a stray branch guide under the last row */
    Array.prototype.forEach.call(nav.querySelectorAll('.surface-nav-level'), function (ol) {
      if (!ol.children.length) ol.parentNode.removeChild(ol);
    });
    return nav;
  }

  var panel = doc.createElement('dialog');
  panel.className = 'surface-nav-panel';
  panel.id = PANEL_ID;
  panel.setAttribute('aria-label', PANEL_LABEL);

  var inner = doc.createElement('div');
  inner.className = 'surface-nav-panel-inner';

  var head = doc.createElement('div');
  head.className = 'surface-nav-head';
  head.appendChild(buildTree());

  /* An EXPLICIT close control, always. Outside dismissal and Escape are
     conveniences; neither is discoverable, and neither exists for every input. */
  var closeBtn = doc.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'surface-action surface-action--secondary surface-nav-close';
  closeBtn.textContent = CLOSE_LABEL;
  head.appendChild(closeBtn);
  inner.appendChild(head);

  var utilSrc = source.content.querySelector('.surface-nav-utilities');
  if (utilSrc) inner.appendChild(doc.importNode(utilSrc, true));

  panel.appendChild(inner);
  surface.appendChild(panel);

  /* --------------------------------------------------------------- marks --
     ONE authored payload. The anchor is upgraded IN PLACE into a button, and
     the seated instance is cloned from the result — so there is no second
     authored mark tree, and the two placements cannot drift apart. The home
     destination is retained as data for reference; a button has none, which is
     precisely why the unenhanced page keeps the anchor. */
  var trigger = doc.createElement('button');
  trigger.type = 'button';
  trigger.className = mark.className || 'surface-mark';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', PANEL_ID);
  trigger.setAttribute('aria-label', TRIGGER_LABEL);
  if (mark.tagName === 'A' && mark.getAttribute('href')) {
    trigger.setAttribute('data-surface-mark-home', mark.getAttribute('href'));
  }
  while (mark.firstChild) trigger.appendChild(mark.firstChild);
  mark.parentNode.replaceChild(trigger, mark);

  var seat = doc.createElement('div');
  seat.className = 'surface-nav-seat';
  var fade = doc.createElement('div'); fade.className = 'surface-nav-fade';
  var shield = doc.createElement('div'); shield.className = 'surface-nav-shield';
  var seatBtn = trigger.cloneNode(true);
  seatBtn.classList.add('surface-nav-trigger');
  seatBtn.removeAttribute('data-surface-mark-home');
  seat.appendChild(fade); seat.appendChild(shield); seat.appendChild(seatBtn);
  doc.body.appendChild(seat);

  root.setAttribute('data-surface-nav', 'ready');
  surface.setAttribute('data-surface-nav', 'ready');

  /* ------------------------------------------------------------ geometry --
     Progress comes from the OPENING mark's own viewport exit, never from a
     percentage of the document: the terminal reserve changes the document's
     height, so a percentage-driven handoff would retime itself whenever the
     footer, the content length or the browser chrome moved. */
  var exitSpan = 0, markBlock = 0, isShort = false, isOpen = false;
  var scheduled = false, lastInvoker = null;

  function writeVar(name, value) {            /* only on material change */
    if (root.style.getPropertyValue(name) === value) return;
    root.style.setProperty(name, value);
  }

  function measure() {
    var r = trigger.getBoundingClientRect();
    var block = r.height;
    if (block && Math.abs(block - markBlock) >= 0.5) {
      markBlock = block;
      writeVar('--surface-nav-mark-block', markBlock.toFixed(2) + 'px');
    }
    /* the mark is in flow on mobile, so its document-space bottom is constant */
    exitSpan = MOBILE() ? (r.bottom + window.scrollY) : 0;
  }

  /* SHORT is measured to the FOOTER's bottom, never to the document's: the
     terminal reserve sits below the footer, so measuring scrollHeight would let
     the reserve manufacture the scrolling that summons the very unit the
     reserve exists to clear — the guard would defeat itself on exactly the
     pages it protects. */
  function shortPage() {
    var foot = surface.querySelector('.surface-footer');
    if (!foot) return false;
    return (foot.getBoundingClientRect().bottom + window.scrollY) <= window.innerHeight;
  }

  function progress() {
    if (!exitSpan) return 0;
    return Math.min(1, Math.max(0, window.scrollY / exitSpan));
  }

  function setOperable(el, on) {
    /* Never leave focus inside an element about to be hidden from the tree. */
    if (!on && el.contains(doc.activeElement)) {
      var other = (el === trigger) ? seatBtn : trigger;
      if (other && !other.disabled) other.focus();
      else el.blur();
    }
    el.disabled = !on;
    el.setAttribute('tabindex', on ? '0' : '-1');
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  function visibleTrigger() {
    if (!MOBILE()) return trigger;
    return (!isShort && progress() > 0.999) ? seatBtn : trigger;
  }

  function frame() {
    scheduled = false;
    isShort = MOBILE() && shortPage();
    root.toggleAttribute('data-surface-nav-short', isShort);
    surface.toggleAttribute('data-surface-nav-short', isShort);

    var p = MOBILE() ? (isShort ? 0 : progress()) : 0;
    /* Reduced motion takes the SAME value, snapped — discrete states, never an
       interpolated slide and never two marks visible at once. */
    if (REDUCED()) p = p >= 1 ? 1 : 0;
    writeVar('--surface-nav-p', p.toFixed(4));

    if (!MOBILE()) {
      var s = Math.min(SETTLE_TO, Math.max(0, window.scrollY / SETTLE_RANGE * SETTLE_TO));
      if (REDUCED()) s = s >= SETTLE_TO ? SETTLE_TO : 0;
      writeVar('--surface-nav-settle', s.toFixed(2) + 'px');
    } else {
      writeVar('--surface-nav-settle', '0px');
    }

    /* exactly one operable trigger, and its operability always matches what is
       on screen — a visible-but-inert mark is the defect this replaces */
    var seated = MOBILE() && !isShort && p > 0.999;
    setOperable(seatBtn, seated);
    setOperable(trigger, !seated);
  }

  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(frame); } }
  function remeasure() { measure(); frame(); }

  /* ----------------------------------------------------------- disclosure */
  function setExpanded(on) {
    trigger.setAttribute('aria-expanded', on ? 'true' : 'false');
    seatBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
  }

  /* The durable contract is that the background's scroll position stays
     INVARIANT while the panel is open; the mechanism is not the contract. The
     stylesheet's overflow lock is the first limb. This is the second: where a
     UA lets the page scroll beneath a modal anyway, the recorded position is
     restored. Deliberately not `position: fixed` on the body — that would make
     the body a containing block for fixed descendants and tear the seated mark
     off the viewport. */
  var lockedY = 0, locked = false, onLockScroll = null;
  function lockPageScroll() {
    if (locked) return;
    lockedY = window.scrollY || 0;
    root.setAttribute('data-surface-nav-locked', '');
    onLockScroll = function () {
      if (Math.abs((window.scrollY || 0) - lockedY) > 1) window.scrollTo(0, lockedY);
    };
    window.addEventListener('scroll', onLockScroll, { passive: true });
    locked = true;
  }
  function unlockPageScroll() {
    if (!locked) return;
    window.removeEventListener('scroll', onLockScroll);
    onLockScroll = null;
    root.removeAttribute('data-surface-nav-locked');
    window.scrollTo(0, lockedY);
    locked = false;
  }

  function restoreFocus() {
    var target = (lastInvoker && lastInvoker.isConnected && !lastInvoker.disabled)
      ? lastInvoker : visibleTrigger();
    lastInvoker = null;
    if (target && !target.disabled) target.focus();
  }

  function openPanel(invoker) {
    if (isOpen) return;
    isOpen = true;
    lastInvoker = invoker || visibleTrigger();
    lockPageScroll();
    if (typeof panel.showModal === 'function') panel.showModal();
    else panel.setAttribute('open', '');
    setExpanded(true);
    var first = panel.querySelector('a[href], button:not([disabled])');
    if (first) first.focus();
    /* two frames: the first commits the closed transform, the second animates */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { panel.classList.add('is-open'); });
    });
  }

  var closeTimer = null;
  function closePanel() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');
    setExpanded(false);

    /* The dialog stays OPEN and in the top layer for the whole exit, and
       close() is called on completion. The fallback duration is READ from the
       computed style rather than hard-coded, so it cannot drift out of step
       with the stylesheet; it is defensive only, and the motion — not an
       overlay transition — is what the correctness depends on. */
    function finish() {
      if (!panel.open && !panel.hasAttribute('open')) return;
      panel.removeEventListener('transitionend', onEnd);
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      if (typeof panel.close === 'function' && panel.open) panel.close();
      else panel.removeAttribute('open');
      unlockPageScroll();
      restoreFocus();
      schedule();
    }
    function onEnd(e) { if (e.target === panel && e.propertyName === 'transform') finish(); }

    if (REDUCED()) { finish(); return; }
    panel.addEventListener('transitionend', onEnd);
    var cs = getComputedStyle(panel);
    var durs = (cs.transitionDuration || '0s').split(',').map(parseFloat);
    var dels = (cs.transitionDelay || '0s').split(',').map(parseFloat);
    var longest = 0;
    for (var i = 0; i < durs.length; i++) {
      longest = Math.max(longest, (durs[i] || 0) + (dels[i] || 0));
    }
    closeTimer = setTimeout(finish, Math.round(longest * 1000) + 60);
  }

  function toggle(e) { isOpen ? closePanel() : openPanel(e.currentTarget); }
  trigger.addEventListener('click', toggle);
  seatBtn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', closePanel);

  /* Escape routes through the motion-completing path rather than the UA's
     immediate close. */
  panel.addEventListener('cancel', function (e) { e.preventDefault(); closePanel(); });

  /* Outside dismissal needs POINTER COORDINATES outside the panel rect.
     `event.target === panel` alone is insufficient: a tap on the panel's own
     padding also targets the panel, so that test would dismiss on a press
     inside the panel. Keyboard activation reports no useful coordinates and is
     excluded outright. */
  panel.addEventListener('click', function (e) {
    if (e.detail === 0) return;
    var r = panel.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right ||
        e.clientY < r.top  || e.clientY > r.bottom) closePanel();
  });

  /* A mode change while the panel is open commits a different placement and a
     different entrance, so the panel closes first and focus returns to whichever
     trigger is visible and operable afterwards. */
  function onModeChange() {
    if (isOpen) closePanel();
    remeasure();
    var t = visibleTrigger();
    if (t && doc.activeElement && (doc.activeElement === trigger || doc.activeElement === seatBtn)
        && t !== doc.activeElement && !t.disabled) t.focus();
  }
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', onModeChange);
  else if (mqMobile.addListener) mqMobile.addListener(onModeChange);
  if (mqReduced.addEventListener) mqReduced.addEventListener('change', schedule);
  else if (mqReduced.addListener) mqReduced.addListener(schedule);

  /* Observe the boxes whose SIZE changes. A footer pushed DOWN by content above
     it never resizes, so observing the footer alone would miss the case the
     reserve exists for; the header, the payload and the mark are what actually
     move it. .surface itself is not observed — its bottom padding is part of
     what these measurements feed. All of it batches into one scheduled frame. */
  if (typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(function () { measure(); schedule(); });
    [surface.querySelector('.surface-head'),
     surface.querySelector('.surface-payload'),
     surface.querySelector('.surface-footer'),
     trigger, seatBtn].forEach(function (el) { if (el) ro.observe(el); });
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('orientationchange', remeasure);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(remeasure);
  remeasure();
})();
