/* =========================================================================
   styleguide-theme-control.js — the style guide's forced-mode selector.

   STYLE-GUIDE ONLY // DO NOT VENDOR. This is not part of the surface-shell
   pattern and is not a foundation. It exists because the style guide is an
   inspection surface: a reviewer needs to hold a mode fixed to check a token
   pairing. Ordinary public surfaces follow the operating system and load
   nothing. No other surface in this repo loads this file.

   Three states, auto first:

     auto    no data-theme attribute — colors_and_type.css follows the OS via
             @media (prefers-color-scheme) under its :not([data-theme]) guard
     light   data-theme="light"
     dark    data-theme="dark"

   Auto is the default. Selecting light or dark is an explicit review
   override, not a new default.

   Dispatches a `themechange` CustomEvent on document whenever the RESOLVED
   mode changes — including when the OS flips while auto is active. The style
   guide renders live computed token values, so it listens and repaints;
   without that, its labels go stale with no click having occurred.
   ========================================================================= */
(function () {
  var STATES = ['auto', 'light', 'dark'];
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var state = 'auto';

  function resolved() {
    return state === 'auto' ? (mq.matches ? 'dark' : 'light') : state;
  }

  function apply(next, announce) {
    state = next;
    if (state === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state);

    var labels = document.querySelectorAll('[data-theme-label]');
    for (var i = 0; i < labels.length; i++) labels[i].textContent = state;

    if (announce) {
      document.dispatchEvent(new CustomEvent('themechange', {
        detail: { state: state, resolved: resolved() }
      }));
    }
  }

  function init() {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        apply(STATES[(STATES.indexOf(state) + 1) % STATES.length], true);
      });
    }
    // An OS flip changes the resolved mode without a click while auto is active.
    var onSystemChange = function () { if (state === 'auto') apply('auto', true); };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);

    apply('auto', false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
