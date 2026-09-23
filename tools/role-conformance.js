/* role-conformance.js — the rendered half of the document-register lock.

   A browser-side check with no dependencies. Load it into a rendered page
   (tools/check-role-conformance.mjs injects it; tests/role-conformance-
   fixture.html loads it with a <script> tag) and call

     ASKRoleConformance.check({ scope, profiles })
        scope     an element or a selector; the whole document when omitted
        profiles  PROFILE DECLARATIONS: the consumer's own named roles (for
                  example a count numeral). Each is an object
                    { name, selector, owner, reason, expected_count }
                  and is validated before it exempts anything (C10). A valid
                  profile's elements are reported under `profiles` with their
                  metrics instead of being checked as descendants (C8); an
                  invalid one exempts nothing.

   It returns { status, pass, governed, counts, tokens, findings, profiles,
   unmapped }. Each finding carries a rule (C0–C10) and a reason code, such
   as C1.size or C4.underline, so a fixture can require the exact reason.

   check() reads the page at rest. The interaction states (C9) need real
   pointer and keyboard input, which a page cannot give itself: the headless
   runner drives them through ASKRoleConformance.interaction and adds its C9
   findings to the same report.

   WHY IT EXISTS. check-type-roles.mjs reads stylesheets and proves that each
   role rule declares its matrix values. It cannot see what a consuming page
   does: which elements carry which role, whether a local rule overrides a
   metric or a state, whether an opt-in interaction class was omitted. This
   file checks the COMPUTED result on a real page. Its role matrix and its
   link-state matrix are the ones R7 holds, in token names, and
   check-type-roles.mjs fails if either drifts.

   RULES
     C0  foundation     the foundation tokens hold the owner's values where the
                        check is scoped and wherever a governed role, rail or
                        contents list renders, so neither a page nor a region
                        holding governed text passes by redefining a token the
                        matrix resolves through. Sizes, weights, leadings,
                        tracking, the rail inset, both families and the three
                        emphasis accents must equal colors_and_type.css; the
                        theme roles (--fg-1, --fg-3, --line-1, --line-2) must
                        equal its light or its dark value. Each drifted token is
                        reported once per distinct value, naming the token
     C1  role metric    every element carrying a governed role computes to its
                        matrix family, size, weight, leading, tracking,
                        foreground and case
     C2  body floor     document body, lede and quotation text compute to the
                        Body step; no heading role computes smaller
     C3  rails          every .doc-quote and .doc-pre is covered by exactly one
                        rail of the shared geometry (2px solid, --space-4
                        inset): its own, in its role's color — the emphasis
                        violet for a quotation, magenta for a preformatted
                        block — or the nearest railed passage around it, whose
                        role names the passage; never both. An emphasis rail
                        inside a railed passage is a second rail. A
                        .surface-emphasis-rail outside a railed passage draws the
                        same geometry. On document text — a rail that carries
                        document body or lede or a text composition
                        (.doc-group, .doc-prose, .doc-section, .doc-titled,
                        .doc-labeled), or holds any of those, a quotation or a
                        block — it is an authorial callout and must be magenta:
                        in a document the violet rail is the quotation's. Any
                        other emphasis rail may take magenta, violet or cyan, the
                        accents surface-treatments sanctions. Every
                        .doc-hierarchy draws the 1px solid --line-2 hierarchy
                        rail at the --space-4 inset
     C4  contents       every .doc-toc-link, wherever it sits, carries
                        surface-text-link and renders that module's resting
                        underline; every anchor anywhere in a .doc-toc-list,
                        however deeply wrapped, carries doc-toc-link; nothing
                        in a contents list carries doc-body or doc-lede
     C5  dense table    only a table.doc-dense-table is the dense population:
                        its td carry doc-table-cell and its th doc-label, and
                        no cell carries or contains doc-body or doc-lede;
                        doc-table-cell and the marker appear nowhere else. A
                        table without the marker is not checked here
     C6  retired        nothing carries .doc-quote--display
     C7  text link      an anchor inside document body, lede, quotation, dense
                        table cell, metadata, operative label, heading role or
                        contents list carries surface-text-link, unless it is a
                        shaped object that owns its own interaction or wraps
                        only an image
     C8  descendant     text inside a governed role keeps that role's family
                        and size, and its weight unless it is inline emphasis;
                        only a governed role, inline code or a valid declared
                        profile may change them. A profile exempts its members'
                        own text only: text nested inside a member keeps the
                        member's family, size and weight
     C9  link states    (driven by the runner) every governed link carrying
                        surface-text-link — each contents link and each C7 link
                        — shows surface-text-link's partial magenta underline
                        at rest, the full magenta underline under a real
                        pointer, its own keyboard-focus underline under real
                        keyboard focus, and its rest state again when the
                        pointer leaves. A rendered governed link that the
                        pointer cannot reach or Tab never focuses fails; so
                        does one that renders no box after every disclosure is
                        opened (its states cannot be proven), and one without
                        surface-text-link that appeared only after the resting
                        check, where C4 and C7 could not see it
     C10 profile        a profile declaration names its population exactly:
                        name, selector, owner, reason and a positive
                        expected_count are all present; the selector parses
                        and is one selector, with no list at its top level or
                        inside :is(), :where() or :matches(); the compound it
                        ends in names a class or an id outside every
                        functional pseudo-class and attribute test, so
                        span:not(.x), span[style] and .doc-body :not(.x) name
                        an element type and fail; it matches exactly
                        expected_count elements in scope; no match carries a
                        governed role or contains a governed role or passage

   STATUS
     pass      no finding, and at least one governed element was checked
     fail      one or more findings
     vacuous   no governed element in scope: nothing was proven. A page that
               has not adopted the register is not a passing page.

   UNMAPPED (informational). Text-bearing elements in scope that carry no
   governed role and sit inside no element that does, with their computed
   metrics. It is the population list a consumer mapping starts from; it is
   not a finding. The cells of an unmarked table appear here.

   LIMITS
   - check() alone proves the resting state. The C9 states are proven only
     when the runner drives them.
   - C3 compares each rail to its role's color token as the page resolves it;
     C0 is what holds those tokens to the owner's values.
   - C0 reads tokens at the scope root and at governed elements. A region that
     redefines a token but holds no governed text is outside this check at
     page scope; scope the check to it to test it.
   - An element hidden with display: none computes the same metrics and is
     checked like any other by C0-C8. Content a script inserts after the
     resting check is checked by C9 only (its link class and states), not by
     C0-C8.
   - C9 reads each state once its transitions have been finished, under an
     emulated reduced-motion preference: it proves the settled state, not how
     long the state takes to arrive.
*/
(function (global) {
  'use strict';

  const SANS = 'var(--font-sans)';
  const MONO = 'var(--font-mono)';
  const MATRIX = [
    { role: 'doc-title',            sel: '.doc-title',            family: SANS, size: '--fs-h1',      weight: '--fw-regular',    lh: '--lh-heading', tracking: '--tracking-tight',  color: '--fg-1', heading: true },
    { role: 'doc-section-title',    sel: '.doc-section-title',    family: SANS, size: '--fs-h2',      weight: '--fw-regular',    lh: '--lh-heading', tracking: '--tracking-tight',  color: '--fg-1', heading: true },
    { role: 'doc-subsection-title', sel: '.doc-subsection-title', family: SANS, size: '--fs-h3',      weight: '--fw-light',      lh: '--lh-heading', tracking: '--tracking-tight',  color: '--fg-1', heading: true },
    { role: 'doc-deep-title',       sel: '.doc-deep-title',       family: SANS, size: '--fs-body',    weight: '--fw-medium',     lh: '--lh-heading', tracking: '--tracking-normal', color: '--fg-1', heading: true },
    { role: 'doc-body',             sel: '.doc-body',             family: SANS, size: '--fs-body',    weight: '--fw-extralight', lh: '--lh-body',    tracking: '--tracking-normal', color: '--fg-1', body: true },
    { role: 'doc-lede',             sel: '.doc-lede',             family: SANS, size: '--fs-body',    weight: '--fw-extralight', lh: '--lh-body',    tracking: '--tracking-normal', color: '--fg-1', body: true },
    { role: 'doc-entry-title',      sel: '.doc-entry-title',      family: SANS, size: '--fs-body',    weight: '--fw-light',      lh: '--lh-body',    tracking: '--tracking-normal', color: '--fg-1', transform: 'none' },
    { role: 'quotation',            sel: '.doc-quote > p',        family: SANS, size: '--fs-body',    weight: '--fw-extralight', lh: '--lh-body',    tracking: '--tracking-normal', color: '--fg-1', body: true },
    { role: 'attribution',          sel: '.doc-quote > footer',   family: MONO, size: '--fs-caption', weight: '--fw-light',      lh: 1.4,            tracking: '--tracking-wide',   color: '--fg-3' },
    { role: 'doc-label',            sel: '.doc-label',            family: MONO, size: '--fs-caption', weight: '--fw-light',      lh: '--lh-tight',   tracking: '--tracking-wide',   color: '--fg-3', transform: 'uppercase' },
    { role: 'doc-meta',             sel: '.doc-meta',             family: MONO, size: '--fs-caption', weight: '--fw-light',      lh: 1.4,            tracking: '--tracking-wide',   color: '--fg-3', transform: 'none' },
    { role: 'doc-pre',              sel: '.doc-pre',              family: MONO, size: '--fs-small',   weight: '--fw-light',      lh: '--lh-body',    tracking: '--tracking-normal', color: '--fg-1' },
    { role: 'doc-toc-link',         sel: '.doc-toc-link',         family: MONO, size: '--fs-small',   weight: '--fw-light',      lh: '--lh-tight',   tracking: '--tracking-tight',  color: '--fg-1', transform: 'none' },
    { role: 'doc-table-cell',       sel: '.doc-table-cell',       family: MONO, size: '--fs-small',   weight: '--fw-light',      lh: '--lh-body',    tracking: '--tracking-normal', color: '--fg-1' },
  ];
  /* C0: the values colors_and_type.css gives the tokens the matrix, the rails
     and the link states resolve through. */
  const TOKENS = {
    '--fs-h1': '48px', '--fs-h2': '36px', '--fs-h3': '28px', '--fs-body': '24px', '--fs-small': '18px', '--fs-caption': '14px',
    '--fw-extralight': '200', '--fw-light': '300', '--fw-regular': '400', '--fw-medium': '500',
    '--lh-heading': '1.12', '--lh-body': '1.45', '--lh-tight': '1.2',
    '--tracking-tight': '-0.02em', '--tracking-normal': '0', '--tracking-wide': '0.08em',
    '--space-4': '16px', '--space-5': '24px',
    '--font-sans': "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    '--font-mono': "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    '--ask-emphasis-magenta': '#FF00FF', '--ask-emphasis-violet': '#AA40FF', '--ask-emphasis-cyan': '#00BEFF',
  };
  /* The theme roles take the owner's light or dark value, never a third. */
  const THEME_TOKENS = {
    '--fg-1': ['#6A637F', '#D4C6E1'],
    '--fg-3': ['rgba(130, 115, 153, 0.62)', 'rgba(212, 198, 225, 0.48)'],
    '--line-1': ['rgba(255, 255, 255, 0.45)', 'rgba(212, 198, 225, 0.22)'],
    '--line-2': ['rgba(255, 255, 255, 0.22)', 'rgba(212, 198, 225, 0.10)'],
  };
  /* C3: one geometry, one color per role. An emphasis rail on document text is an
     authorial callout and is always magenta; any other emphasis rail keeps the
     three accents surface-treatments sanctions. check-type-roles.mjs R7 pins the
     quotation, callout and treatment-rail colors here to the owner's rules. */
  const RAIL = { width: 2, style: 'solid', inset: '--space-4' };
  const HIERARCHY_RAIL = { width: 1, style: 'solid', color: 'var(--line-2)', inset: '--space-4' };
  const RAIL_COLOR = {
    quotation:    { sel: '.doc-quote',             colors: ['var(--ask-emphasis-violet)'] },
    preformatted: { sel: '.doc-pre',               colors: ['var(--ask-emphasis-magenta)'] },
    callout:      { sel: '.surface-emphasis-rail', colors: ['var(--ask-emphasis-magenta)'] },
    emphasis:     { sel: '.surface-emphasis-rail', colors: ['var(--ask-emphasis-magenta)', 'var(--ask-emphasis-violet)', 'var(--ask-emphasis-cyan)'] },
  };
  /* Document text: a rail carrying one of these, or holding one, is an authorial callout. A rail that is
     itself a quotation or a block is judged by that role first (railKind). */
  const DOCUMENT_TEXT = '.doc-body, .doc-lede, .doc-group, .doc-prose, .doc-section, .doc-titled, .doc-labeled, .doc-quote, .doc-pre';
  /* C9: the states surface-text-link.css declares, as the page must compute
     them. check-type-roles.mjs R7 holds this matrix equal to that file. */
  const LINK_STATES = {
    rest:  { line: 'underline', thickness: '1px', color: 'color-mix(in srgb, var(--ask-emphasis-magenta) 50%, transparent)', opacity: '1' },
    hover: { line: 'underline', thickness: '1px', color: 'var(--ask-emphasis-magenta)', opacity: '1' },
    focus: { line: 'underline', thickness: '2px', color: 'var(--fg-1)' },
  };
  const ROLE_CLASSES = ['doc-title', 'doc-section-title', 'doc-subsection-title', 'doc-deep-title', 'doc-body', 'doc-lede',
    'doc-label', 'doc-meta', 'doc-code', 'doc-quote', 'doc-pre', 'doc-pre-part', 'doc-toc-link', 'doc-table-cell', 'doc-entry-title'];
  /* Classes whose owners are not this register: their text is governed elsewhere. */
  const OTHER_OWNERS = ['surface-title', 'surface-lede', 'surface-nav-row', 'surface-badge', 'surface-action', 'surface-panel-title',
    'surface-panel-support', 'surface-emphasis-chip', 'surface-disclosure-label', 'surface-disclosure-indicator', 'caption'];
  /* Anchors that are shaped objects owning their own interaction (C7). */
  const SHAPED = ['surface-action', 'surface-panel', 'surface-nav-row'];
  const INLINE_EMPHASIS = ['STRONG', 'B', 'EM', 'I', 'SUB', 'SUP', 'MARK'];
  const PASSAGE = '.doc-quote, .doc-pre';
  const RAILED = '.doc-quote, .doc-pre, .surface-emphasis-rail';
  const TEXT_LINK_HOSTS = '.doc-body, .doc-lede, .doc-quote, .doc-table-cell, .doc-meta, .doc-label, ' +
    '.doc-title, .doc-section-title, .doc-subsection-title, .doc-deep-title, .doc-toc-list';
  const BODY_ROLES = '.doc-body, .doc-lede';
  const DENSE = 'table.doc-dense-table';
  const PROFILE_FIELDS = ['name', 'selector', 'owner', 'reason', 'expected_count'];
  const TOL = 0.05;

  function resolveScope(scope) {
    if (!scope) return document;
    if (typeof scope === 'string') {
      const el = document.querySelector(scope);
      if (!el) throw new Error('scope not found: ' + scope);
      return el;
    }
    return scope;
  }
  const px = (v) => (v === 'normal' ? 0 : parseFloat(v));
  const firstFamily = (f) => f.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
  const path = (el) => {
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && parts.length < 4; e = e.parentElement) {
      parts.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') +
        (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : ''));
    }
    return parts.join(' > ');
  };
  const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const hostOf = (scope) => (scope === document ? document.documentElement : scope);

  /* Probe in the element's own context: a hidden element is inserted beside it,
     read and removed, so a theme or accent scoped to an ancestor applies. */
  function probe(el, style, tag, cls) {
    const host = el.parentElement || document.body;
    const p = document.createElement(tag || 'span');
    if (cls) p.className = cls;
    if (p.tagName === 'A') p.setAttribute('href', '#');
    p.setAttribute('aria-hidden', 'true');
    p.textContent = 'x';
    p.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;transition:none;' + style;
    host.appendChild(p);
    const c = getComputedStyle(p);
    const out = { color: c.color, family: c.fontFamily, border: c.borderLeftColor, decoColor: c.textDecorationColor,
      decoLine: c.textDecorationLine, decoThick: c.textDecorationThickness };
    p.remove();
    return out;
  }
  function tokenAt(el, name) {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v === '' ? null : v;
  }
  const token = (name) => tokenAt(document.documentElement, name);
  const normToken = (v) => (v === null ? null : v.replace(/\s+/g, '').replace(/"/g, "'").toLowerCase());
  /* Governed links every resting check() has seen, so the runner can tell a
     link a script added later from one C4 or C7 already judged. */
  const seenLinks = new WeakSet();

  function expected(entry, el) {
    const size = token(entry.size);
    const weight = token(entry.weight);
    const lhRaw = typeof entry.lh === 'number' ? String(entry.lh) : token(entry.lh);
    const trRaw = token(entry.tracking);
    const missing = [[entry.size, size], [entry.weight, weight], [String(entry.lh), lhRaw], [entry.tracking, trRaw]]
      .filter(([, v]) => v === null).map(([n]) => n);
    if (missing.length) return { missing };
    const sizePx = parseFloat(size);
    const trackingPx = /em$/.test(trRaw) ? parseFloat(trRaw) * sizePx : parseFloat(trRaw) || 0;
    const pr = probe(el, `color:var(${entry.color});font-family:${entry.family}`);
    return { family: firstFamily(pr.family), size: sizePx, weight: parseFloat(weight),
      lineHeight: parseFloat(lhRaw) * sizePx, tracking: trackingPx, color: pr.color };
  }

  /* The rail an element draws, judged against its role's geometry and color:
     'rail' | 'none' | 'width' | 'color' | 'inset'. */
  function railKind(el) {
    if (el.matches(RAIL_COLOR.quotation.sel)) return 'quotation';
    if (el.matches(RAIL_COLOR.preformatted.sel)) return 'preformatted';
    return el.matches(DOCUMENT_TEXT) || el.querySelector(DOCUMENT_TEXT) ? 'callout' : 'emphasis';
  }
  function railOf(el) {
    const c = getComputedStyle(el);
    const w = px(c.borderLeftWidth);
    if (c.borderLeftStyle === 'none' || c.borderLeftStyle === 'hidden' || w === 0) return 'none';
    if (c.borderLeftStyle !== RAIL.style || Math.abs(w - RAIL.width) > TOL) return 'width';
    if (!RAIL_COLOR[railKind(el)].colors.some((v) => probe(el, `border-left:2px solid ${v}`).border === c.borderLeftColor)) return 'color';
    if (Math.abs(px(c.paddingLeft) - parseFloat(TOKENS[RAIL.inset])) > TOL) return 'inset';
    return 'rail';
  }

  /* Links whose interaction this register governs: every contents link, and
     every C7 link — an anchor in document text that is neither a shaped
     object nor an image wrapper. */
  function isGovernedLink(a) {
    if (a.classList.contains('doc-toc-link')) return true;
    if (!a.matches('a[href]')) return false;
    if (SHAPED.some((k) => a.classList.contains(k))) return false;
    if (!a.textContent.trim() && a.querySelector('img, svg, picture, video')) return false;
    return !!a.closest(TEXT_LINK_HOSTS);
  }

  /* The hierarchy rail: 'rail' | 'none' | 'width' | 'color' | 'inset'. */
  function hierarchyRailOf(el) {
    const c = getComputedStyle(el);
    const w = px(c.borderLeftWidth);
    if (c.borderLeftStyle === 'none' || c.borderLeftStyle === 'hidden' || w === 0) return 'none';
    if (c.borderLeftStyle !== HIERARCHY_RAIL.style || Math.abs(w - HIERARCHY_RAIL.width) > TOL) return 'width';
    if (probe(el, `border-left:1px solid ${HIERARCHY_RAIL.color}`).border !== c.borderLeftColor) return 'color';
    if (Math.abs(px(c.paddingLeft) - parseFloat(TOKENS[HIERARCHY_RAIL.inset])) > TOL) return 'inset';
    return 'rail';
  }

  /* One compound at the end of a selector: what the selector finally selects. */
  function lastCompound(sel) {
    let depth = 0, quote = null, cut = 0;
    for (let i = 0; i < sel.length; i++) {
      const ch = sel[i];
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      else if (depth === 0 && /[\s>+~]/.test(ch)) cut = i + 1;
    }
    return sel.slice(cut).trim();
  }
  function hasTopLevelComma(sel) {
    let depth = 0, quote = null;
    for (const ch of sel) {
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      else if (ch === ',' && depth === 0) return true;
    }
    return false;
  }
  /* A list, at the top level or inside :is() / :where() / :matches(). */
  function isList(sel) {
    if (hasTopLevelComma(sel)) return true;
    for (const m of sel.matchAll(/:(?:is|where|matches|-webkit-any)\(/gi)) {
      let depth = 1, quote = null;
      for (let i = m.index + m[0].length; i < sel.length && depth > 0; i++) {
        const ch = sel[i];
        if (quote) { if (ch === quote) quote = null; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        else if (ch === ',' && depth === 1) return true;
      }
    }
    return false;
  }
  /* What a compound names once every pseudo-class, pseudo-element and
     attribute test is removed: span:not(.x) names span, :not(.x) nothing. */
  function namedPart(compound) {
    let out = '', i = 0;
    while (i < compound.length) {
      const ch = compound[i];
      if (ch === '[' || ch === ':') {
        if (ch === ':') { i++; if (compound[i] === ':') i++; while (i < compound.length && /[\w-]/.test(compound[i])) i++; if (compound[i] !== '(') continue; }
        let depth = 0, quote = null;
        for (; i < compound.length; i++) {
          const c = compound[i];
          if (quote) { if (c === quote) quote = null; continue; }
          if (c === '"' || c === "'") { quote = c; continue; }
          if (c === '(' || c === '[') depth++;
          else if (c === ')' || c === ']') { depth--; if (depth === 0) { i++; break; } }
        }
        continue;
      }
      out += ch; i++;
    }
    return out;
  }

  function check(opts) {
    const o = opts || {};
    const scope = resolveScope(o.scope);
    const all = (sel) => [...(scope.matches && scope.matches(sel) ? [scope] : []), ...scope.querySelectorAll(sel)];
    const findings = [];
    const counts = {};
    let governed = 0;
    const add = (rule, reason, el, detail) => findings.push({ rule, reason: rule + '.' + reason, element: path(el), text: text(el), ...detail });
    const roleSel = MATRIX.map((m) => m.sel).join(', ');

    /* C0 foundation: at the scope root and wherever a governed role renders */
    const tokens = {};
    const tokenHost = hostOf(scope);
    for (const name of [...Object.keys(TOKENS), ...Object.keys(THEME_TOKENS)]) tokens[name] = tokenAt(tokenHost, name);
    const drift = new Map();
    const contexts = [tokenHost, ...all(roleSel + ', ' + RAILED + ', .doc-hierarchy, .doc-toc-list, .doc-toc-link, .doc-table-cell, .doc-dense-table')];
    const wanted = [...Object.entries(TOKENS).map(([n, v]) => [n, [v]]), ...Object.entries(THEME_TOKENS)];
    for (const el of contexts) {
      const cs = getComputedStyle(el);
      for (const [name, allowed] of wanted) {
        const v = cs.getPropertyValue(name).trim();
        const got = v === '' ? null : v;
        if (allowed.some((a) => normToken(a) === normToken(got))) continue;
        const want = allowed.join(' | ');
        const k = name + '|' + got;
        if (drift.has(k)) drift.get(k).n++;
        else drift.set(k, { el, name, want, got, n: 1 });
      }
    }
    for (const d of drift.values()) add('C0', 'token', d.el, { token: d.name, expected: d.want, got: d.got, elements: d.n });

    /* C10 profile declarations: validated before any is used */
    const profileReport = [];
    const exempt = new Set();
    for (const p of o.profiles || []) {
      const name = p && typeof p.name === 'string' && p.name.trim() ? p.name : '(unnamed profile)';
      const fail = [];
      const note = (reason, message, detail) => { fail.push(reason); add('C10', reason, tokenHost, { profile: name, selector: p && p.selector, message, ...detail }); };
      let els = [];
      if (!p || typeof p !== 'object' || Array.isArray(p)) {
        note('field', 'a profile declaration is not an object');
      } else {
        const missing = PROFILE_FIELDS.filter((k) => (k === 'expected_count' ? !(Number.isInteger(p[k]) && p[k] > 0) : !(typeof p[k] === 'string' && p[k].trim())));
        if (missing.length) note('field', 'a profile declaration lacks ' + missing.join(', '), { missing });
        if (typeof p.selector === 'string' && p.selector.trim()) {
          let parsed = true;
          try { document.createDocumentFragment().querySelector(p.selector); } catch (e) { parsed = false; }
          if (!parsed) note('selector', 'the profile selector does not parse');
          else if (isList(p.selector)) note('selector', 'a profile names one population: its selector may not be a list, at its top level or inside :is(), :where() or :matches()');
          else {
            if (!/[.#][\w\\-]/.test(namedPart(lastCompound(p.selector)))) note('broad', 'the compound the profile selector ends in names no class or id outside its pseudo-classes and attribute tests, so it names an element type rather than a population');
            els = all(p.selector);
            if (els.length === 0) note('zero', 'the profile matches nothing in scope');
            else if (Number.isInteger(p.expected_count) && els.length !== p.expected_count) note('count', 'the profile matches a different number of elements than it declares', { expected: p.expected_count, got: els.length });
            const roleHit = els.filter((el) => el.matches(roleSel) || ROLE_CLASSES.some((k) => el.classList.contains(k)));
            if (roleHit.length) note('role', 'the profile captures elements that carry a governed role', { examples: roleHit.slice(0, 3).map(path) });
            const container = els.filter((el) => el.querySelector(roleSel + ', ' + ROLE_CLASSES.map((k) => '.' + k).join(', ') + ', ' + RAILED));
            if (container.length) note('broad', 'the profile captures a container of governed roles or passages', { examples: container.slice(0, 3).map(path) });
          }
        }
      }
      const valid = fail.length === 0;
      if (valid) for (const el of els) exempt.add(el);
      const members = valid ? els.map((el) => { const c = getComputedStyle(el); return { element: path(el), text: text(el), family: firstFamily(c.fontFamily), size: c.fontSize, weight: c.fontWeight }; }) : [];
      profileReport.push({ name, selector: p && p.selector, owner: p && p.owner, reason: p && p.reason, expected_count: p && p.expected_count,
        matched: els.length, valid, failures: fail, members });
    }

    /* C1 role metric */
    for (const entry of MATRIX) {
      const els = all(entry.sel);
      counts[entry.role] = els.length;
      governed += els.length;
      for (const el of els) {
        const want = expected(entry, el);
        if (want.missing) { add('C1', 'token', el, { role: entry.role, message: 'token not defined on this page', tokens: want.missing }); continue; }
        const c = getComputedStyle(el);
        const got = { family: firstFamily(c.fontFamily), size: px(c.fontSize), weight: parseFloat(c.fontWeight),
          lineHeight: c.lineHeight === 'normal' ? NaN : px(c.lineHeight), tracking: px(c.letterSpacing), color: c.color, transform: c.textTransform };
        const bad = {};
        if (got.family !== want.family) bad.family = [want.family, got.family];
        if (Math.abs(got.size - want.size) > TOL) bad.size = [want.size + 'px', got.size + 'px'];
        if (got.weight !== want.weight) bad.weight = [want.weight, got.weight];
        if (!(Math.abs(got.lineHeight - want.lineHeight) <= TOL)) bad.lh = [want.lineHeight.toFixed(2) + 'px', c.lineHeight];
        if (Math.abs(got.tracking - want.tracking) > TOL) bad.tracking = [want.tracking.toFixed(2) + 'px', c.letterSpacing];
        if (got.color !== want.color) bad.color = [want.color, got.color];
        if (entry.transform && got.transform !== entry.transform) bad.case = [entry.transform, got.transform];
        for (const k of Object.keys(bad)) add('C1', k, el, { role: entry.role, message: `computed ${k} differs from the role`, expected: bad[k][0], got: bad[k][1] });
      }
    }

    /* C2 body floor */
    if (token('--fs-body') !== null) {
      const body = parseFloat(TOKENS['--fs-body']);
      for (const entry of MATRIX) {
        if (!entry.body && !entry.heading) continue;
        for (const el of all(entry.sel)) {
          const s = px(getComputedStyle(el).fontSize);
          if (entry.body && Math.abs(s - body) > TOL) add('C2', 'body', el, { role: entry.role, message: 'reading text is not the Body step', expected: body + 'px', got: s + 'px' });
          if (entry.heading && s < body - TOL) add('C2', 'heading', el, { role: entry.role, message: 'a heading is smaller than the body it governs', body: body + 'px', got: s + 'px' });
        }
      }
    }

    /* C3 rails: shared geometry, the role's color; the hierarchy rail */
    for (const el of all(RAILED)) {
      const own = railOf(el);
      let outer = null;
      for (let a = el.parentElement; a; a = a.parentElement) if (a.matches(RAILED) && railOf(a) !== 'none') { outer = a; break; }
      if (outer) {
        if (own !== 'none') add('C3', 'double', el, { message: 'a passage inside a railed passage draws a second rail', outer: path(outer) });
      } else if (own !== 'rail') {
        const kind = railKind(el);
        add('C3', own === 'none' ? 'missing' : own, el, { kind, message: own === 'none' ? `a set-apart ${kind} passage has no rail`
          : own === 'color' ? `the ${kind} rail is not its role's color (${RAIL_COLOR[kind].colors.join(' | ')})` : `the ${kind} rail has the wrong ${own}` });
      }
    }
    for (const el of all('.doc-hierarchy')) {
      const own = hierarchyRailOf(el);
      if (own !== 'rail') add('C3', 'hierarchy', el, { message: own === 'none' ? 'a hierarchy level draws no rail'
        : `the hierarchy rail is not 1px solid ${HIERARCHY_RAIL.color} at the ${HIERARCHY_RAIL.inset} inset (its ${own} differs)` });
    }

    /* C4 contents */
    for (const a of all('.doc-toc-link')) {
      if (!a.classList.contains('surface-text-link')) { add('C4', 'class', a, { message: 'a contents link lacks surface-text-link' }); continue; }
      const c = getComputedStyle(a);
      const ref = probe(a, '', 'a', 'surface-text-link');
      if (!/underline/.test(c.textDecorationLine) || !/underline/.test(ref.decoLine)) {
        add('C4', 'underline', a, { message: 'the contents link renders no underline: surface-text-link.css is not loaded or is overridden' });
      } else if (c.textDecorationColor !== ref.decoColor || c.textDecorationThickness !== ref.decoThick) {
        add('C4', 'underline-color', a, { message: "the contents link's resting underline differs from surface-text-link's", expected: ref.decoColor + ' ' + ref.decoThick, got: c.textDecorationColor + ' ' + c.textDecorationThickness });
      }
    }
    for (const list of all('.doc-toc-list')) {
      const own = (el) => el.closest('.doc-toc-list') === list;
      for (const el of list.querySelectorAll(BODY_ROLES)) if (own(el)) add('C4', 'body', el, { message: 'a contents list holds document body or lede text' });
      for (const a of list.querySelectorAll('a[href]')) if (own(a) && !a.classList.contains('doc-toc-link')) add('C4', 'entry', a, { message: 'a contents anchor lacks doc-toc-link' });
    }

    /* C5 dense table: the declared population only */
    for (const t of all(DENSE)) {
      for (const cell of t.querySelectorAll('td, th')) {
        if (cell.closest('table') !== t) continue;
        const prose = [cell, ...cell.querySelectorAll(BODY_ROLES)].filter((el) => el.matches(BODY_ROLES) && el.closest('table') === t);
        for (const el of prose) add('C5', 'body', el, { message: el === cell ? 'a dense table cell carries a document body role' : 'a dense table cell holds document body or lede text' });
        if (prose.length) continue;
        if (cell.tagName === 'TD' && !cell.classList.contains('doc-table-cell')) add('C5', 'cell', cell, { message: 'a dense table cell lacks doc-table-cell' });
        else if (cell.tagName === 'TH' && !cell.classList.contains('doc-label')) add('C5', 'head', cell, { message: 'a dense table header lacks doc-label' });
      }
    }
    for (const el of all('.doc-table-cell')) {
      const t = el.closest('table');
      if (!t || !t.matches(DENSE) || !el.matches('td, th')) add('C5', 'scope', el, { message: 'doc-table-cell outside a cell of a table.doc-dense-table: the dense role is declared by the table, never by the cell alone' });
    }
    for (const el of all('.doc-dense-table')) if (el.tagName !== 'TABLE') add('C5', 'scope', el, { message: 'the dense-table marker is on an element that is not a table' });

    /* C6 retired */
    for (const el of all('.doc-quote--display')) add('C6', 'display', el, { message: '.doc-quote--display is retired' });

    /* C7 text link */
    for (const a of all('a[href], .doc-toc-link')) if (isGovernedLink(a)) seenLinks.add(a);
    for (const a of all('a[href]')) {
      if (a.classList.contains('doc-toc-link') || !isGovernedLink(a)) continue;
      if (!a.classList.contains('surface-text-link')) add('C7', 'class', a, { message: 'a link in document text lacks surface-text-link' });
    }

    /* C8 descendant */
    const inProfile = (d, host) => { for (let e = d; e && e !== host; e = e.parentElement) if (exempt.has(e)) return e; return null; };
    for (const host of all(roleSel)) {
      const hc = getComputedStyle(host);
      for (const d of host.querySelectorAll('*')) {
        if (!ownText(d) || d.closest('svg')) continue;
        if (d.matches(roleSel) || d.classList.contains('doc-code') || d.classList.contains('doc-pre-part')) continue;
        let inner = d.parentElement;
        while (inner && inner !== host && !inner.matches(roleSel)) inner = inner.parentElement;
        if (inner !== host) continue;
        /* A profile exempts its member's own text; text nested inside the
           member is held to the member's metrics instead of the role's. */
        const member = inProfile(d, host);
        if (member === d) continue;
        const ref = member || host;
        const rc = member ? getComputedStyle(member) : hc;
        const dc = getComputedStyle(d);
        const drift = [];
        if (firstFamily(dc.fontFamily) !== firstFamily(rc.fontFamily)) drift.push('family');
        if (Math.abs(px(dc.fontSize) - px(rc.fontSize)) > TOL) drift.push('size');
        if (!INLINE_EMPHASIS.includes(d.tagName) && dc.fontWeight !== rc.fontWeight) drift.push('weight');
        for (const k of drift) add('C8', k, d, { message: member ? `text inside a declared profile member changes its ${k}` : `text inside a role changes its ${k} without a role`,
          host: path(ref), expected: k === 'size' ? rc.fontSize : k === 'family' ? firstFamily(rc.fontFamily) : rc.fontWeight,
          got: k === 'size' ? dc.fontSize : k === 'family' ? firstFamily(dc.fontFamily) : dc.fontWeight });
      }
    }

    /* Unmapped text-bearing elements (informational) */
    const unmapped = [];
    if (o.unmapped !== false) {
      const covered = (el) => {
        for (let e = el; e && e !== scope.parentElement; e = e.parentElement) {
          if (e.nodeType !== 1) continue;
          if ([...ROLE_CLASSES, ...OTHER_OWNERS].some((k) => e.classList.contains(k))) return true;
          if (e.matches && e.matches('.doc-quote > p, .doc-quote > footer')) return true;
        }
        return false;
      };
      const seen = new Map();
      for (const el of all('body *')) {
        if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(el.tagName) || el.closest('svg, template, script, style')) continue;
        if (!ownText(el) || covered(el)) continue;
        const c = getComputedStyle(el);
        const key = el.tagName.toLowerCase() + '.' + [...el.classList].join('.') + ' | ' + firstFamily(c.fontFamily) + ' ' + c.fontSize + ' ' + c.fontWeight;
        const row = seen.get(key) || { population: el.tagName.toLowerCase() + ([...el.classList].length ? '.' + [...el.classList].join('.') : ''),
          family: firstFamily(c.fontFamily), size: c.fontSize, weight: c.fontWeight, lineHeight: c.lineHeight, tracking: c.letterSpacing,
          color: c.color, transform: c.textTransform, n: 0, sample: text(el), path: path(el) };
        row.n++;
        seen.set(key, row);
      }
      unmapped.push(...seen.values());
    }

    const status = findings.length ? 'fail' : governed === 0 ? 'vacuous' : 'pass';
    return { status, pass: status === 'pass', governed, counts, tokens, findings, profiles: profileReport, unmapped };
  }

  /* ---- C9: the interaction half, driven by the runner --------------------
     The runner calls targets(), then for each testable link: point() and
     neutral() to place a real pointer, read() at rest, under the pointer and
     after it leaves; then walks the page with real Tab presses, calling
     read() on each governed link that takes focus; then judge(records). */
  const ATTR = 'data-ask-rc';
  const byId = (id) => document.querySelector(`[${ATTR}="${id}"]`);
  const rendered = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const interaction = {
    /* Open every closed disclosure in scope, so links inside it render. A
       member of an exclusive group (<details name>) would close the others as
       it opens, so the group name is set aside until cleanup(). */
    prepare(opts) {
      const scope = resolveScope((opts || {}).scope);
      let opened = 0;
      const ds = [...(scope.matches && scope.matches('details') ? [scope] : []), ...scope.querySelectorAll('details')];
      for (const d of ds) if (d.hasAttribute('name')) { d.setAttribute(ATTR + '-name', d.getAttribute('name')); d.removeAttribute('name'); }
      for (const d of ds) if (!d.open) { d.open = true; opened++; }
      return opened;
    },
    targets(opts) {
      const scope = resolveScope((opts || {}).scope);
      const els = [...(scope.matches && scope.matches('a, .doc-toc-link') ? [scope] : []), ...scope.querySelectorAll('a, .doc-toc-link')].filter(isGovernedLink);
      return els.map((el, i) => {
        el.setAttribute(ATTR, String(i));
        const control = el.closest('[data-control]');
        return { id: String(i), element: path(el), text: text(el), toc: el.classList.contains('doc-toc-link'),
          testable: el.classList.contains('surface-text-link'), rendered: rendered(el),
          container: control ? control.dataset.control : (el.closest('#conforming') ? 'conforming specimen' : null) };
      });
    },
    scroll(id) { const el = byId(id); el.scrollIntoView({ block: 'center', inline: 'nearest' }); return true; },
    /* A viewport point that lands on the link itself. */
    point(id) {
      const el = byId(id);
      for (const r of el.getClientRects()) {
        for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.1, 0.5]]) {
          const x = r.left + r.width * fx, y = r.top + r.height * fy;
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          const hit = document.elementFromPoint(x, y);
          if (hit && (hit === el || el.contains(hit))) return { x: Math.round(x), y: Math.round(y) };
        }
      }
      return null;
    },
    /* A viewport point over nothing interactive. */
    neutral() {
      const pts = [];
      for (const fy of [0.02, 0.5, 0.98, 0.25, 0.75]) for (const fx of [0.01, 0.99, 0.5, 0.2, 0.8]) pts.push([innerWidth * fx, innerHeight * fy]);
      for (const [x, y] of pts) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || !hit.closest('a, button, summary, label, input, select, textarea, [tabindex], [onmouseenter], [onmouseover]')) return { x: Math.round(x), y: Math.round(y) };
      }
      return { x: 0, y: 0 };
    },
    read(id) {
      const el = byId(id);
      getComputedStyle(el).textDecorationColor;               /* flush style, so a pending transition exists */
      for (const a of el.getAnimations()) { try { a.finish(); } catch (e) { /* an infinite animation cannot finish */ } }
      const c = getComputedStyle(el);
      return { hover: el.matches(':hover'), focusVisible: el.matches(':focus-visible'), line: c.textDecorationLine,
        thickness: c.textDecorationThickness, color: c.textDecorationColor, opacity: c.opacity };
    },
    active() { const a = document.activeElement; return a && a.hasAttribute && a.hasAttribute(ATTR) ? a.getAttribute(ATTR) : (a === document.body || !a ? '#body' : '#other'); },
    blur() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return true; },
    expected(id) {
      const el = byId(id);
      const out = {};
      for (const [state, want] of Object.entries(LINK_STATES)) out[state] = { ...want, color: probe(el, `text-decoration-color:${want.color}`).decoColor };
      return out;
    },
    /* Governed links whose states cannot be tested: one carrying
       surface-text-link that renders no box, and one without it that no
       resting check saw (a script added it), so neither C4 nor C7 judged it. */
    untested() {
      const findings = [];
      for (const el of document.querySelectorAll(`[${ATTR}]`)) {
        const control = el.closest('[data-control]');
        const container = control ? control.dataset.control : (el.closest('#conforming') ? 'conforming specimen' : null);
        const add = (reason, message) => findings.push({ rule: 'C9', reason: 'C9.' + reason, element: path(el), text: text(el), container, message });
        if (el.classList.contains('surface-text-link')) { if (!rendered(el)) add('unrendered', 'a governed link renders no box with every disclosure open, so its states cannot be proven'); }
        else if (!seenLinks.has(el)) add('class', 'a governed link that appeared after the resting check lacks surface-text-link');
      }
      return findings;
    },
    judge(records) {
      const findings = [];
      for (const r of records) {
        const el = byId(r.id);
        const add = (reason, message, detail) => findings.push({ rule: 'C9', reason: 'C9.' + reason, element: path(el), text: text(el), container: r.container, message, ...detail });
        const want = interaction.expected(r.id);
        const same = (got, w, keys) => keys.filter((k) => (k === 'line' ? !String(got[k]).includes(w[k]) : got[k] !== w[k]));
        const restBad = same(r.rest, want.rest, ['line', 'thickness', 'color', 'opacity']);
        if (restBad.length) add('rest', 'the resting underline is not surface-text-link\'s', { differs: restBad, expected: want.rest, got: r.rest });
        if (!r.point) add('unhittable', 'a rendered governed link that a pointer cannot reach at its own position');
        else {
          const hoverBad = r.hover.hover ? same(r.hover, want.hover, ['line', 'thickness', 'color', 'opacity']) : ['hover not applied'];
          if (hoverBad.length) add('hover', 'under a real pointer the link does not show the full magenta underline', { differs: hoverBad, expected: want.hover, got: r.hover });
          const leaveBad = r.leave.hover ? ['still hovered'] : same(r.leave, r.rest, ['line', 'thickness', 'color', 'opacity']);
          if (leaveBad.length) add('leave', 'after the pointer leaves, the link does not return to its rest state', { differs: leaveBad, rest: r.rest, got: r.leave });
        }
        if (!r.focus) add('unreached', 'keyboard Tab never focused this rendered governed link');
        else {
          const focusBad = r.focus.focusVisible ? same(r.focus, want.focus, ['line', 'thickness', 'color']) : ['focus-visible not applied'];
          if (focusBad.length) add('focus', "under keyboard focus the link does not show surface-text-link's focus underline", { differs: focusBad, expected: want.focus, got: r.focus });
        }
      }
      return findings;
    },
    cleanup() {
      for (const el of document.querySelectorAll(`[${ATTR}]`)) el.removeAttribute(ATTR);
      for (const d of document.querySelectorAll(`details[${ATTR}-name]`)) { d.setAttribute('name', d.getAttribute(ATTR + '-name')); d.removeAttribute(ATTR + '-name'); }
      return true;
    },
  };

  global.ASKRoleConformance = { check, interaction, MATRIX, TOKENS, THEME_TOKENS, LINK_STATES, RAIL, RAIL_COLOR, HIERARCHY_RAIL };
})(typeof window !== 'undefined' ? window : globalThis);
