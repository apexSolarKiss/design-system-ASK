/* role-conformance.js — the rendered half of the document-register lock.

   A browser-side check with no dependencies. Load it into a rendered page
   (tools/check-role-conformance.mjs injects it; tests/role-conformance-
   fixture.html and tests/review-semantics-fixture.html load it with a
   <script> tag) and call

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
   unmapped, collapsed }. Each finding carries a rule (C0–C12) and a reason
   code, such as C1.size or C4.underline, so a fixture can require the exact
   reason.

   check() reads the page at rest. The interaction states (C9) need real
   pointer and keyboard input, which a page cannot give itself: the headless
   runner drives them through ASKRoleConformance.interaction and adds its C9
   findings to the same report. The runner also opens every disclosure in
   scope and, after its link-state pass, judges there what each collapsed C12
   element presents (see C12).

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
                        rail at the --space-4 inset; that of a collapsed C12
                        element is judged open (see C12)
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
     C11 peer groups    a declared peer group, .doc-pre-group, is a direct
                        child of a .doc-pre--structured block that holds
                        nothing else at its top level, text included; it opens
                        on its label, a .doc-pre-part that shows text, keeps its
                        text in parts and holds no group (C11.shape). Its rhythm
                        is measured on the rendered text lines, one line pitch
                        being the block's computed line height: inside a group
                        each visible line sits one pitch below the line before
                        it (C11.tight); the label of a group sits two pitches
                        below the last line of the group before — its own line
                        and the one line between — so a missing and a doubled
                        separator both fail (C11.gap). Space made by margin,
                        padding, leading, a line break or a line holding no
                        visible character counts alike. Only declared groups
                        are judged: counts reports structured blocks that
                        declare none, and nothing here infers a group from
                        blank lines, capitals or spacing

     C12 annotations    (Review Semantics) applies only where the
                        annotation composition's classes appear: .doc-mark,
                        mark.doc-passage-mark, .doc-annotation-note,
                        .doc-annotation-item, .doc-annotations and
                        .doc-annotation-list. A data-review, data-evidence or
                        data-state attribute alone opts nothing in, and an
                        Evidence State or Spectral State presentation authored
                        outside the composition is its owner's, not C12's. Each
                        finding names its basis: syntax (classes, attributes,
                        vocabulary) or computed (what the page computes for
                        borders, background, the ::before marker and the
                        mark's box). C12 never judges whether an item's role is
                        the right one. A transparent role token is a finding;
                        see LIMITS for what the token comparison does not
                        establish.
                        Syntax: every .doc-mark carries the operative label
                        role, so C1 holds its words (C12.role); it carries
                        exactly one of data-review, data-evidence or data-state
                        (C12.facet), a value in that facet's vocabulary
                        (C12.vocab) and rendered words (C12.label). A facet
                        attribute sits on a mark, a passage mark or a
                        not-yet-testable note, never on the composition's rows,
                        items, lists or other notes, and no composition class
                        combines with a content role, a rail, a panel, a
                        compact action or an emphasis chip (C12.attach).
                        Computed: a mark is a rendered inline-flex box; a review
                        mark draws a 1px solid outline on all four sides with
                        all four corners at --radius-sm; an evidence or state
                        mark draws no outline and no rail, and its ::before
                        marker is generated, displayed as a box, visible and
                        10px square, every corner round (at least 5px) for
                        evidence and square (at most the registered 2px) for
                        state, a percentage corner resolved against the box
                        (C12.geometry); each is drawn in its role's token as
                        it resolves at the mark, never transparent
                        (C12.color). A not-yet-testable mark keeps its hollow
                        2px dashed marker and, outside a not-yet-testable note,
                        its 2px dashed rail, in that role's value (C12.nyt). A
                        passage mark names a pending judgment, proposed or open
                        (C12.vocab), sits in body text, keeps the text's color,
                        draws no underline and no border, shows its tint (the
                        role's value at the passage dose, the registered 18%
                        or 26%) and names, among its aria-describedby ids, the
                        .doc-annotation-note that records it (C12.passage). A
                        not-yet-testable note draws that role's 2px dashed rail
                        and never takes .doc-hierarchy; any other note composes
                        the hierarchy rail; no note sits inside a framing,
                        synthesis or emphasis panel (C12.note). A row, item or
                        list draws no rail, border or wash (C12.rail).
                        An element of the composition, a list's keys and
                        values included, that a closed disclosure keeps from
                        being seen, anywhere but in its summary, is collapsed.
                        At rest C12 still checks its syntax, vocabulary and
                        relationships, including a mark's having words
                        (C12.label), a passage mark's host and note, and a
                        note's classes; it counts the element and lists it
                        under collapsed. Once the runner has opened every
                        disclosure in scope, it judges what the element
                        presents, with the same reason codes: a mark's words
                        as rendered, its box and its outline or marker; a
                        passage mark's color, borders and tint; a note's rail;
                        a row, item or list drawing no rail, border or wash;
                        and the element's hierarchy rail, if it has one
                        (C3.hierarchy). An element the page shows although its
                        disclosure is closed is judged at rest.
                        Not checked here: rails or underlines outside the
                        composition, a content passage's own rail included,
                        and paint that computed borders, background and the
                        marker's box do not show (border-image, outline,
                        box-shadow, background-image, transforms, clip-path)

   STATUS
     pass       no finding, and at least one governed element was checked
     fail       one or more findings
     vacuous    no governed element in scope: nothing was proven. A page that
                has not adopted the register is not a passing page.
     incomplete no finding, but C12 elements collapsed in closed disclosures
                (listed under collapsed) await the runner's open-state
                judgment, so nothing yet proves what they present.
   Neither vacuous nor incomplete is a pass.

   UNMAPPED (informational). Text-bearing elements in scope that carry no
   governed role and sit inside no element that does, with their computed
   metrics. It is the population list a consumer mapping starts from; it is
   not a finding. The cells of an unmarked table appear here.

   LIMITS
   - check() alone proves the resting state. The C9 states are proven only
     when the runner drives them.
   - C3 compares each rail to its role's color token as the page resolves it;
     C0 is what holds those tokens to the owner's values.
   - check() alone does not judge what a collapsed C12 element presents: it
     lists the element under collapsed and never reports pass. The runner
     judges every element held this way, once it has opened every disclosure
     in scope and judged the link states; each ends in a judgment or a
     finding. One still collapsed then, because the runner did not open its
     disclosure or the page closed it again, fails its own reason marked
     state "collapsed": C12.label for a mark, C12.passage for a passage mark,
     C12.note for a note, and C12.rail for a row, an item, a list or a list's
     key or value. One that left the page as its disclosure opened fails it
     marked "removed", since what it presents cannot be proven. A page that
     changes a disclosure's content after that judgment is outside this
     check, like any content a script inserts after the resting check.
   - The runner opens a disclosure by setting open, so a summary's click
     handler is not run, and it opens only the disclosures in scope: a run
     scoped inside a closed disclosure leaves that disclosure closed, and
     every element held there fails marked "collapsed". Only a <details> is
     a disclosure here. Content hidden another way (hidden="until-found",
     content-visibility outside a <details>, a shadow-DOM or slotted
     disclosure), and content the page shows by checkVisibility's test
     although a closed <details> clips it to nothing, keep their verdict at
     rest.
   - The open-state judgment covers what the C12 composition presents, the
     hierarchy rail of its elements included. Every other rule judges content
     in a closed disclosure at rest, the role metrics of a mark's or a list
     key's words (C1, C8) among them: a page that restyles such content only
     once a disclosure opens is not exercised there, one that restyles it
     only while a disclosure is closed is judged on that styling, and an
     element the page shows at rest and restyles later is judged as it
     rests.
   - C12 compares a mark with its role token as it resolves at the mark. It
     does not independently establish that a local rebinding of that token is
     authorized: adopted role bindings stay governed by review-semantics.md,
     and a local exception requires the applicable explicit authorization.
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
   - C11 measures rendered text lines, to within 0.5px, by the center of each
     line that shows a visible character. A group none of whose lines renders
     is not measured; counts reports measured and unmeasured groups, and
     structured blocks that declare no groups, apart, so neither is read as a
     passing group. A pass covers the declared groups only.
   - C8 compares family, size and weight only. It never compares letter
     case, leading, tracking or color; C1 compares case only for the roles
     whose matrix entry declares a transform, four of the fourteen.
   - A valid profile exempts its members' own text from C8: check()
     reports each member with its computed metrics under `profiles` but
     compares it against no role, so a profile narrows what a pass proves.
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

  /* A character that shows: neither space nor a format or separator character. */
  const VISIBLE = /[^\s\p{Cf}\p{Z}]/u;
  /* Whether the page shows an element: a box, outside skipped content, visible and not transparent. */
  const seen = (el) => typeof el.checkVisibility !== 'function' || el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  /* A C12 element is collapsed when a closed disclosure keeps it from being seen: it
     sits in a closed <details>, anywhere but in that disclosure's summary, at any
     depth of nesting, and the page does not show it there. */
  function collapsed(el) {
    let inside = false;
    for (let d = el.closest('details'); d && !inside; d = d.parentElement && d.parentElement.closest('details')) {
      const summary = [...d.children].find((k) => k.localName === 'summary');
      inside = !d.open && !(summary && summary.contains(el));
    }
    return inside && !seen(el);
  }
  /* The collapsed C12 elements resting checks held, each with its case container, its
     kind and the judgments of what it presents, which interaction.collapsed() runs once
     every disclosure in scope is open. */
  const held = new Map();
  /* The composition's elements, a list's keys and values included; per kind, its noun and the
     reason and basis it fails with when it cannot be judged open. */
  const COMPOSITION = '.doc-mark, mark.doc-passage-mark, .doc-annotation-note, .doc-annotation-item, .doc-annotations, .doc-annotation-list';
  const HELD_SEL = COMPOSITION + ', .doc-annotation-list > dt, .doc-annotation-list > dd';
  const HELD_KIND = { 'doc-mark': ['a mark', 'label', 'syntax'], 'doc-passage-mark': ['a passage mark', 'passage', 'computed'],
    'doc-annotation-note': ['a note', 'note', 'computed'], 'doc-annotations': ['an annotation row', 'rail', 'computed'],
    'doc-annotation-item': ['an item', 'rail', 'computed'], 'doc-annotation-list': ['an annotation list', 'rail', 'computed'],
    'doc-annotation-list dt': ['a list key', 'rail', 'computed'], 'doc-annotation-list dd': ['a list value', 'rail', 'computed'] };
  const kindOf = (el) => Object.keys(HELD_KIND).find((k) => !k.includes(' ') && el.classList.contains(k)) || 'doc-annotation-list ' + el.localName;

  function check(opts) {
    const o = opts || {};
    const scope = resolveScope(o.scope);
    const all = (sel) => [...(scope.matches && scope.matches(sel) ? [scope] : []), ...scope.querySelectorAll(sel)];
    const findings = [];
    const counts = {};
    let governed = 0;
    const add = (rule, reason, el, detail) => findings.push({ rule, reason: rule + '.' + reason, element: path(el), text: text(el), ...detail });
    const roleSel = MATRIX.map((m) => m.sel).join(', ');
    /* C12 elements a closed disclosure keeps from being seen: their syntax is checked here,
       and what they present is held, with its reason codes, for the open state. */
    const collapsedHere = [];
    const heldHere = new Map();
    const hold = (el, judge) => {
      if (!heldHere.has(el)) {
        const control = el.closest('[data-control]');
        const kind = kindOf(el);
        heldHere.set(el, { container: control ? control.dataset.control : (el.closest('#conforming') ? 'conforming specimen' : null), kind, judges: [] });
        counts[kind + ' collapsed'] = (counts[kind + ' collapsed'] || 0) + 1;
        collapsedHere.push({ element: path(el), text: text(el), kind });
      }
      heldHere.get(el).judges.push(judge);
    };

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
      const judge = (add) => {
        const own = hierarchyRailOf(el);
        if (own !== 'rail') add('C3', 'hierarchy', el, { message: own === 'none' ? 'a hierarchy level draws no rail'
          : `the hierarchy rail is not 1px solid ${HIERARCHY_RAIL.color} at the ${HIERARCHY_RAIL.inset} inset (its ${own} differs)` });
      };
      /* The hierarchy rail of a C12 element, a note's in particular, is part of what the
         composition presents: collapsed, it is judged open. */
      if (el.matches(HELD_SEL) && collapsed(el)) hold(el, judge);
      else judge(add);
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

    /* C11 peer groups: declared structure, then the rhythm of the rendered lines */
    const GROUP_TOL = 0.5;
    const shows = (node) => VISIBLE.test(node.textContent);
    const looseText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && shows(n));
    /* The group's rendered text lines, in order: the vertical center of each line that shows a visible character. */
    const linesOf = (g) => {
      const lines = [];
      const walk = document.createTreeWalker(g, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        let from = 0;
        for (const seg of n.data.split('\n')) {
          if (VISIBLE.test(seg)) {
            const r = document.createRange();
            r.setStart(n, from);
            r.setEnd(n, from + seg.length);
            for (const box of r.getClientRects()) {
              if (!box.height) continue;
              const c = (box.top + box.bottom) / 2;
              if (!lines.length || Math.abs(c - lines[lines.length - 1].c) > GROUP_TOL) lines.push({ c, el: n.parentElement });
            }
          }
          from += seg.length + 1;
        }
      }
      return lines;
    };
    const groupBlocks = new Set();
    for (const g of all('.doc-pre-group')) {
      const block = g.parentElement;
      if (!block || !block.matches('.doc-pre--structured')) {
        add('C11', 'shape', g, { message: 'a peer group outside a structured block: a .doc-pre-group is a direct child of .doc-pre--structured' });
        continue;
      }
      groupBlocks.add(block);
      const label = g.firstElementChild;
      if (!label || !label.matches('.doc-pre-part') || !shows(label)) {
        add('C11', 'shape', g, { message: 'a peer group that does not open on its label, a .doc-pre-part that shows text' });
      }
      if (looseText(g)) add('C11', 'shape', g, { message: 'text in a peer group outside its parts' });
      if (g.querySelector('.doc-pre-group')) add('C11', 'shape', g, { message: 'a peer group holding another peer group' });
    }
    for (const block of all('.doc-pre--structured')) {
      if (!groupBlocks.has(block)) counts['doc-pre--structured undeclared'] = (counts['doc-pre--structured undeclared'] || 0) + 1;
    }
    for (const block of groupBlocks) {
      if ([...block.children].some((k) => !k.matches('.doc-pre-group')) || looseText(block)) {
        add('C11', 'shape', block, { message: 'a structured block that declares peer groups also holds a line outside them' });
      }
      const pitch = parseFloat(getComputedStyle(block).lineHeight);
      let before = null;
      for (const g of [...block.children].filter((k) => k.matches('.doc-pre-group'))) {
        const lines = linesOf(g);
        if (!lines.length) { counts['doc-pre-group unmeasured'] = (counts['doc-pre-group unmeasured'] || 0) + 1; before = null; continue; }
        counts['doc-pre-group'] = (counts['doc-pre-group'] || 0) + 1;
        for (let i = 1; i < lines.length; i++) {
          const step = lines[i].c - lines[i - 1].c;
          if (!(Math.abs(step - pitch) <= GROUP_TOL)) {
            add('C11', 'tight', lines[i].el, { message: 'space inside a peer group: each line sits one line below the line before it', step: +step.toFixed(2), line: +pitch.toFixed(2) });
          }
        }
        if (before) {
          const step = lines[0].c - before.c;
          if (!(Math.abs(step - 2 * pitch) <= GROUP_TOL)) {
            add('C11', 'gap', lines[0].el, { message: 'successive peer groups sit exactly one line apart', step: +step.toFixed(2), expected: +(2 * pitch).toFixed(2) });
          }
        }
        before = lines[lines.length - 1];
      }
    }

    /* C12 annotations (Review Semantics): applies where the annotation composition's
       classes appear. Syntax and computed findings are named as such. */
    const VOCAB = { review: ['proposed', 'open', 'accepted', 'declined', 'none'],
      evidence: ['supported', 'partially-supported', 'unresolved', 'weakened', 'not-yet-testable'],
      state: ['earned', 'structural', 'partial', 'deflated', 'held', 'external', 'proposed', 'neutral'] };
    const FACETS = Object.keys(VOCAB);
    const NOTE_NYT = '.doc-annotation-note[data-evidence="not-yet-testable"]';
    const clear = (color) => /^transparent$|rgba\(\s*[\d.]+,\s*[\d.]+,\s*[\d.]+,\s*0\s*\)|\/\s*0(\.0+)?\s*\)$/.test(color);
    const drawn = (c, side) => c['border' + side + 'Style'] !== 'none' && c['border' + side + 'Style'] !== 'hidden' && px(c['border' + side + 'Width']) > 0 && !clear(c['border' + side + 'Color']);
    const CORNERS = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'];
    const corners = (c) => CORNERS.map((k) => c['border' + k + 'Radius']);
    /* A corner in px; a percentage resolves against the box's shorter side. */
    const radius = (r, w, h) => { const v = String(r).trim().split(/\s+/)[0]; return v.endsWith('%') ? parseFloat(v) / 100 * Math.min(w, h) : px(v); };
    const shown = (c) => c.display !== 'none' && c.visibility === 'visible' && parseFloat(c.opacity) > 0;
    /* A mark draws its outline and its marker only as a rendered flex box: an
       inline ::before is not blockified and draws nothing at any width. */
    const boxed = (el, c) => el.getClientRects().length > 0 && /^(inline-)?flex$/.test(c.display);
    const PANEL = '.surface-separate.surface-material-panel, .surface-emphasis';
    const syn = (rule, reason, el, detail) => add(rule, reason, el, { basis: 'syntax', ...detail });
    const cmp = (rule, reason, el, detail) => add(rule, reason, el, { basis: 'computed', ...detail });
    for (const m of all('.doc-mark')) {
      counts['doc-mark'] = (counts['doc-mark'] || 0) + 1;
      if (!m.classList.contains('doc-label')) syn('C12', 'role', m, { message: 'a mark\'s words are the operative label: .doc-mark carries .doc-label' });
      const facets = FACETS.filter((f) => m.hasAttribute('data-' + f));
      if (facets.length !== 1) { syn('C12', 'facet', m, { message: 'a mark carries exactly one of data-review, data-evidence or data-state', facets }); continue; }
      const f = facets[0];
      const v = m.getAttribute('data-' + f);
      if (!VOCAB[f].includes(v)) { syn('C12', 'vocab', m, { message: 'a ' + f + ' mark names a role outside its vocabulary', value: v }); continue; }
      if (collapsed(m)) {
        /* A closed disclosure keeps the mark from being seen: its words must exist now, and what it
           presents is judged once the runner has opened the disclosure. */
        const words = VISIBLE.test(m.textContent);
        if (!words) syn('C12', 'label', m, { message: 'a mark states its role in words; color never carries it alone' });
        hold(m, (sink) => present(m, f, v, sink, words, true));
        continue;
      }
      present(m, f, v, add, true, false);
    }
    /* What a mark presents: its words as rendered (and, open, in a rendered box), its box, and its
       outline or marker in its role's token. Judged at rest, or for a collapsed mark in its open
       presentation, where a mark that renders no box would otherwise read its words from its text. */
    function present(m, f, v, add, judgeWords, open) {
      const syn = (rule, reason, el, detail) => add(rule, reason, el, { basis: 'syntax', ...detail });
      const cmp = (rule, reason, el, detail) => add(rule, reason, el, { basis: 'computed', ...detail });
      const words = typeof m.innerText === 'string' ? m.innerText : m.textContent;
      if (judgeWords && (!VISIBLE.test(words) || (open && !rendered(m)))) syn('C12', 'label', m, { message: 'a mark states its role in rendered words; color never carries it alone' });
      const c = getComputedStyle(m);
      const b = getComputedStyle(m, '::before');
      const want = probe(m, `border-left:1px solid var(--${f}-${v})`).border;
      if (!boxed(m, c)) { cmp('C12', 'geometry', m, { message: 'a mark is a rendered inline-flex box: its outline and its marker draw only there', display: c.display }); return; }
      const box = m.getBoundingClientRect();
      if (f === 'review') {
        const sm = px(tokenAt(document.documentElement, '--radius-sm') || '0');
        const outline = ['Top', 'Right', 'Bottom', 'Left'].every((s) => c['border' + s + 'Style'] === 'solid' && Math.abs(px(c['border' + s + 'Width']) - 1) <= TOL);
        if (!outline) cmp('C12', 'geometry', m, { message: 'a review mark draws a 1px solid outline on all four sides' });
        else if (corners(c).some((r) => Math.abs(radius(r, box.width, box.height) - sm) > TOL)) cmp('C12', 'geometry', m, { message: 'a review mark takes --radius-sm on all four corners, this composition\'s choice', got: corners(c) });
        else if (['Top', 'Right', 'Bottom', 'Left'].some((s) => c['border' + s + 'Color'] !== want || clear(c['border' + s + 'Color']))) cmp('C12', 'color', m, { message: 'a review mark\'s outline is its role token, and not transparent', expected: want, got: c.borderTopColor });
      } else {
        const nyt = f === 'evidence' && v === 'not-yet-testable';
        if (drawn(c, 'Top') || drawn(c, 'Right') || drawn(c, 'Bottom') || (!nyt && drawn(c, 'Left'))) cmp('C12', 'geometry', m, { message: 'an ' + f + ' mark draws no outline and no rail: its geometry is its marker' });
        const generated = b.content !== 'none' && b.content !== 'normal';
        const r = corners(b).map((x) => radius(x, 10, 10));
        if (!generated || !shown(b) || b.display === 'inline' || Math.abs(px(b.width) - 10) > TOL || Math.abs(px(b.height) - 10) > TOL) {
          cmp('C12', 'geometry', m, { message: 'an ' + f + ' mark draws its 10px marker', content: b.content, display: b.display, visibility: b.visibility, opacity: b.opacity, width: b.width, height: b.height });
        } else if (f === 'evidence' ? !r.every((x) => x >= 5 - TOL) : !r.every((x) => x <= 2 + TOL)) {
          cmp('C12', 'geometry', m, { message: f === 'evidence' ? 'an evidence marker is round: every corner at least half its 10px side' : 'a state marker is square: every corner at most the registered 2px', got: corners(b) });
        } else if (nyt) {
          const ring = ['Top', 'Right', 'Bottom', 'Left'].every((s) => b['border' + s + 'Style'] === 'dashed' && Math.abs(px(b['border' + s + 'Width']) - 2) <= TOL && b['border' + s + 'Color'] === want && !clear(want));
          if (!ring || !clear(b.backgroundColor)) cmp('C12', 'nyt', m, { message: 'not yet testable keeps its hollow 2px dashed marker in its own value' });
        } else if (b.backgroundColor !== want || clear(b.backgroundColor)) cmp('C12', 'color', m, { message: 'an ' + f + ' mark\'s marker is its role token, and not transparent', expected: want, got: b.backgroundColor });
        if (nyt && !m.closest(NOTE_NYT) && !(c.borderLeftStyle === 'dashed' && Math.abs(px(c.borderLeftWidth) - 2) <= TOL && c.borderLeftColor === want && !clear(want))) {
          cmp('C12', 'nyt', m, { message: 'not yet testable keeps its 2px dashed rail outside a not-yet-testable note', style: c.borderLeftStyle, width: c.borderLeftWidth });
        }
      }
    }
    for (const el of all('[data-review], [data-evidence], [data-state]')) {
      if (!el.matches(COMPOSITION) || el.matches('.doc-mark, mark.doc-passage-mark') || el.matches(NOTE_NYT)) continue;
      syn('C12', 'attach', el, { message: 'a facet attribute sits on a mark, a passage mark or a not-yet-testable note, not on a row, item, list or other note' });
    }
    const CONTENT_ROLES = ROLE_CLASSES.filter((r) => r !== 'doc-label').map((r) => '.' + r).join(', ');
    for (const el of all(COMPOSITION)) {
      if (el.matches(RAILED + ', ' + PANEL + ', .surface-separate, .surface-action, .surface-emphasis-chip, ' + CONTENT_ROLES)) syn('C12', 'attach', el, { message: 'an annotation class never combines with a content role, a rail, a panel, a compact action or an emphasis chip' });
    }
    for (const pm of all('mark.doc-passage-mark')) {
      counts['doc-passage-mark'] = (counts['doc-passage-mark'] || 0) + 1;
      const v = pm.getAttribute('data-review');
      if (!['proposed', 'open'].includes(v || '')) { syn('C12', 'vocab', pm, { message: 'a passage mark names a pending judgment: proposed or open', value: v }); continue; }
      const host = pm.parentElement && pm.parentElement.closest(BODY_ROLES + ', .doc-quote > p, .doc-table-cell');
      const ids = (pm.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      const note = ids.map((id) => document.getElementById(id)).find((n) => n && n.classList.contains('doc-annotation-note'));
      if (!host) syn('C12', 'passage', pm, { message: 'a passage mark sits inside body text' });
      /* What the passage mark presents: its words in the text's color, no underline or border, and its tint. */
      const judge = (add) => {
        const cmp = (rule, reason, el, detail) => add(rule, reason, el, { basis: 'computed', ...detail });
        const dose = tokenAt(pm, '--review-passage-dose');
        const c = getComputedStyle(pm);
        const tint = probe(pm, `border-left:1px solid color-mix(in srgb, var(--review-${v}) var(--review-passage-dose, 0%), transparent)`).border;
        if (host && c.color !== getComputedStyle(host).color) cmp('C12', 'passage', pm, { message: 'a passage mark keeps the text\'s color', expected: getComputedStyle(host).color, got: c.color });
        if (c.textDecorationLine !== 'none') cmp('C12', 'passage', pm, { message: 'a passage mark draws no underline: in this composition the scope cue is the tint' });
        if (drawn(c, 'Left') || drawn(c, 'Right') || drawn(c, 'Top') || drawn(c, 'Bottom')) cmp('C12', 'passage', pm, { message: 'a passage mark draws no rail or border' });
        if (clear(c.backgroundColor) || c.backgroundColor !== tint) cmp('C12', 'passage', pm, { message: 'a passage mark shows its tint: its role\'s value at the passage dose', expected: tint, got: c.backgroundColor });
        else if (!['18%', '26%'].includes(dose)) cmp('C12', 'passage', pm, { message: 'the passage dose is the registered 18% light or 26% dark', got: dose });
      };
      if (collapsed(pm)) hold(pm, judge);
      else judge(add);
      if (!note) syn('C12', 'passage', pm, { message: 'a passage mark names its .doc-annotation-note through aria-describedby' });
    }
    for (const n of all('.doc-annotation-note')) {
      counts['doc-annotation-note'] = (counts['doc-annotation-note'] || 0) + 1;
      if (n.matches(NOTE_NYT)) {
        /* Not yet testable's rail is checked first: the hierarchy rail never stands in for it. */
        if (n.matches('.doc-hierarchy')) syn('C12', 'note', n, { message: 'a not-yet-testable note takes that role\'s dashed rail, never the hierarchy rail' });
        const judge = (add) => {
          const c = getComputedStyle(n);
          const nytValue = probe(n, 'border-left:2px dashed var(--evidence-not-yet-testable, transparent)').border;
          if (!(c.borderLeftStyle === 'dashed' && Math.abs(px(c.borderLeftWidth) - 2) <= TOL && c.borderLeftColor === nytValue && !clear(nytValue))) add('C12', 'note', n, { basis: 'computed', message: 'a not-yet-testable note draws that role\'s 2px dashed rail', style: c.borderLeftStyle, width: c.borderLeftWidth });
        };
        if (collapsed(n)) hold(n, judge);
        else judge(add);
      } else if (!n.matches('.doc-hierarchy')) cmp('C12', 'note', n, { message: 'a note composes the hierarchy rail, or is a not-yet-testable evidence note on that role\'s 2px dashed rail' });
      if (n.parentElement && n.parentElement.closest(PANEL)) syn('C12', 'note', n, { message: 'a note never sits inside a panel: it follows the panel' });
    }
    const inRows = '.doc-annotations, .doc-annotation-item, .doc-annotation-list, .doc-annotation-list > dt, .doc-annotation-list > dd';
    for (const el of all(inRows)) {
      const judge = (add) => {
        const c = getComputedStyle(el);
        if (['Top', 'Right', 'Bottom', 'Left'].some((s) => drawn(c, s)) || !clear(c.backgroundColor)) add('C12', 'rail', el, { basis: 'computed', message: 'a row, item or list draws no rail, border or wash: the composition\'s one rail is not yet testable\'s, on a note or a mark', border: c.borderLeftStyle + ' ' + c.borderLeftWidth, background: c.backgroundColor });
      };
      if (collapsed(el)) hold(el, judge);
      else judge(add);
    }

    for (const [el, h] of heldHere) held.set(el, h);
    const status = findings.length ? 'fail' : governed === 0 ? 'vacuous' : collapsedHere.length ? 'incomplete' : 'pass';
    return { status, pass: status === 'pass', governed, counts, tokens, findings, profiles: profileReport, unmapped, collapsed: collapsedHere };
  }

  /* ---- The interaction half, driven by the runner ------------------------
     The runner calls prepare(), which opens every disclosure in scope. For
     C9 it then calls targets(), then for each testable link: point() and
     neutral() to place a real pointer, read() at rest, under the pointer and
     after it leaves; then walks the page with real Tab presses, calling
     read() on each governed link that takes focus; then judge(records).
     Last, it calls collapsed(), which judges the C12 elements a resting
     check held. */
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
    /* With every disclosure in scope open, judge what each C12 element a resting check held
       presents, wherever it now sits, once the animations on it, inside it and on its ancestors
       have finished: its findings carry state "open". An element still collapsed fails its held
       reason marked "collapsed"; one no longer on the page fails it marked "removed". */
    collapsed() {
      for (const el of held.keys()) {
        if (!el.isConnected) continue;
        const anims = el.getAnimations({ subtree: true });
        for (let a = el.parentElement; a; a = a.parentElement) anims.push(...a.getAnimations());
        for (const x of anims) { try { x.finish(); } catch (e) { /* an infinite animation cannot finish */ } }
      }
      const findings = [];
      let judged = 0;
      for (const [el, h] of [...held]) {
        held.delete(el);
        judged++;
        const sink = (state) => (rule, reason, e, detail) => findings.push({ rule, reason: rule + '.' + reason, element: path(e),
          text: text(e), container: h.container, state, ...detail });
        const [noun, reason, basis] = HELD_KIND[h.kind];
        if (!el.isConnected) sink('removed')('C12', reason, el, { basis, message: noun + ' held for its open presentation left the page as its disclosure opened, so what it presents cannot be proven' });
        else if (collapsed(el)) sink('collapsed')('C12', reason, el, { basis, message: noun + ' whose disclosure is closed when it is judged is not seen, so what it presents cannot be proven: the runner did not open that disclosure, or the page closed it again' });
        else for (const judge of h.judges) judge(sink('open'));
      }
      return { judged, findings };
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
