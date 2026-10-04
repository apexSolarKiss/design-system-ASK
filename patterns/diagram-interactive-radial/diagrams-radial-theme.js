/* diagrams-radial-theme.js — the theme module of the interactive radial pattern: a reader's
   control over the document theme, for the one instance that owns it.

   design-system-ASK surface pattern `diagram-interactive-radial`. DS-owned: re-vendor
   byte-identical, never hand-edit in a consumer. Optional for an instance: list it as
   mount({ …, modules: ['theme', …] }) with adapter.theme 'own', and give the host an
   [data-radial-slot="actions"] slot. Load it after the engine.

   OWNERSHIP. The document theme has one writer: the instance whose adapter declares
   theme 'own' (the engine refuses a second, THEME_OWNER_CONFLICT). Any other instance that
   lists this module renders nothing and changes nothing: the host page keeps the theme.

   THE CONTROL cycles auto, light, dark. Auto removes data-theme from the document root, so the
   token stylesheet follows the operating system; light and dark set it. Nothing is stored:
   a new page starts at auto. The control reports the state it is in, and the state is
   announced when the reader changes it. Destroying the instance restores the attribute the
   document had before. */
(function (root) {
  'use strict';

  var R = root.DIAGRAM_RADIAL = root.DIAGRAM_RADIAL || {};
  R.modules = R.modules || {};
  var STATES = ['auto', 'light', 'dark'];

  function mount(api, cfg) {
    var doc = document.documentElement;
    if (cfg !== 'own') return { state: function () { return { owner: false }; }, destroy: function () {} };
    var actions = api.slot('actions');
    var had = doc.hasAttribute('data-theme'), old = doc.getAttribute('data-theme');
    var state = had && (old === 'light' || old === 'dark') ? old : 'auto';
    var mq = root.matchMedia ? root.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
    function resolved() { return state === 'auto' ? (mq.matches ? 'dark' : 'light') : state; }

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'radial-theme-control';
    var g = document.createElement('span'); g.className = 'radial-theme-glyph'; g.setAttribute('aria-hidden', 'true'); g.textContent = '\u25D0';
    var sr = document.createElement('span'); sr.className = 'radial-sr-only'; sr.textContent = 'theme ';
    var lbl = document.createElement('span'); lbl.className = 'radial-theme-label';
    b.appendChild(g); b.appendChild(sr); b.appendChild(lbl);
    actions.appendChild(b);

    function apply(next, cause) {
      state = next;
      if (state === 'auto') doc.removeAttribute('data-theme'); else doc.setAttribute('data-theme', state);
      lbl.textContent = state;
      b.setAttribute('data-radial-theme', state);
      api.emit('theme', { cause: cause, state: state, resolved: resolved() });
    }
    b.addEventListener('click', function (ev) {
      ev.stopPropagation();
      apply(STATES[(STATES.indexOf(state) + 1) % STATES.length], 'reader');
      api.announce('theme ' + state);
    }, { signal: api.signal });
    /* an operating-system change while auto changes the resolved theme without a click */
    if (mq.addEventListener) mq.addEventListener('change', function () { if (state === 'auto') api.emit('theme', { cause: 'system', state: state, resolved: resolved() }); }, { signal: api.signal });
    apply(state, 'load');

    return {
      state: function () { return { owner: true, state: state, resolved: resolved() }; },
      set: function (s) { if (STATES.indexOf(s) >= 0) apply(s, 'module'); },
      destroy: function () {
        if (b.parentNode) b.parentNode.removeChild(b);
        if (had) doc.setAttribute('data-theme', old); else doc.removeAttribute('data-theme');
      }
    };
  }

  R.modules.theme = {
    requires: [],
    hooks: [],
    slots: ['actions'],
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
