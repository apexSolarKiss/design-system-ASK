# `diagram-interactive-radial`

A context-agnostic interactive radial diagram for a **live surface**. The data describes a containment hierarchy; the pattern lays it out radially and makes it navigable. The root sits at the center, containers take wedges inside their parent's wedge, and items fan out in rows beyond their container. Relations are separate from containment and are drawn by declared plane. Undrawn records are separate from placement.

It is a **surface pattern**, not an artifact scaffold: a consumer takes it as pinned, byte-identical local copies of the owner files, supplies its own data, adapter and page, and re-syncs when the owner contract changes. Nothing is generated, sealed or frozen. The owner never knows a consumer's identifiers, field names, vocabulary or how many tiers its subject should have.

**Its primary example is real research content.** The pattern has three public expressions, each with a gallery preview. The first is a reference specimen: the public content of the Consciousness + Free Will research map, captured on 2026-10-02, drawn through these generic modules (§Reference specimen). The second is a synthetic parks composition with nothing in common with it, which runs the same modules on its own data and adapter; it also serves development and tests. The third, Vellmark parks // visitor facilities, is that synthetic composition under Criterion Assessment instead of Spectral State: every place and position unchanged, each place assessed on its generated visitor facilities.

**Geometry claim bound.** Radial distance grows with containment depth along each lineage. A wedge's width is its unit's weight. Angle and adjacency encode nothing. Relations are encoded only through declared planes, drawn by line style. One further encoding is stated, and holds only in the record context: while a record opened with no origin is open, a frame marks each shown placed node it links to through a plane the adapter names (Inspector, The record context). Level of detail hides names and never changes membership.

**Paint and emphasis.** Color encodes the instance's one declared semantic system only: Spectral State by default, or Criterion Assessment where the data declares it (Data contract, Semantic system). A mark that asserts a role, whether a state or an assessment, is filled at 100% of its color through the surface treatments' fill paint ([`surface-treatments.css`](../../surface-treatments.css), FILL PAINT), its boundary in the same color and a ring's inner chip cut out as a hole: a state from `--state-<role>`, an assessment from `--assessment-<role>`. A mark that asserts none, the root included, is structure: it keeps the pattern's neutral wash, the theme foreground at 15% inside its own line, so the sparse role colors stay the salient layer. Under Criterion Assessment every container and every unassessed leaf is such a mark, washed from `--fg-1` rather than any `--state-*` token, and an unassessed leaf has no word, no key row and no facet option. Emphasis never steps a fill. One neutral frame outside the mark, which follows its shape, shows it: 1px on hover, a preview included; 1px at half strength on a node related to the selection, full when hovered; 2px on the locked selection, which keeps it when hovered; 1px at full strength, in the record context, on a node the open record links to through a plane the adapter names, where nothing dims and hover adds no frame. Leaves outside the selection's relations dim, except the one under the pointer, which shows in full while hovered. A directed relation into a filled mark ends just past the mark's furthest painted reach, its mitered corners included, cut wherever along its curve that falls, so its tip clears the mark on every bearing; into a washed mark it keeps its full curve, the head showing through the wash. Where filled marks overlap, a head can have no visible place: the source's center inside the target's reach, or the tip within the outline's half-width of a filled source or neighbor. Such a head stays under the fill, and `report().obscuredHeads` names its relation, as drawn at mount. The keyboard focus ring stands 3px clear outside the frame, so focus and selection read apart at every zoom. The legend, the chooser, the facets and the inspector's dot draw a role's swatch as its fill and no asserted role as the wash; under Criterion Assessment the legend and the facets give unassessed no row or option, and the inspector gives it no state row.

## Files and load order

```text
diagrams-radial.css             the stylesheet; after colors_and_type.css, surface-panel.css,
                                surface-treatments.css and spectral-state.css (the treatments paint the role
                                marks, supply the inks Spectral State binds, and the chrome module uses them).
                                An instance that declares Criterion Assessment also loads criterion-assessment.css
                                after spectral-state.css, for its role values.
                                Re-sync them with the pattern's own files from one design-system commit: a
                                newer engine against older treatments draws its role marks black
diagrams-radial-contract.js     validation and assembly                         DOM-free
diagrams-radial-layout.js       the layout grammar                              DOM-free
diagrams-radial-labels.js       label placement, level of detail, the Fit's population   DOM-free
diagrams-pointer.js             pan, pinch, tap and wheel; a generated mirror of patterns/_diagram-shared/
diagrams-fit.js                 the shared Fit helper, byte-identical to the owner's
diagrams-radial-engine.js       mount, rendering, camera, Fit, selection, keyboard, events, teardown
diagrams-radial-legend.js       optional module: the legend
diagrams-radial-chrome.js       optional module: the responsive chrome around the map
diagrams-radial-inspector.js    optional module: the inspector, a text report of a node or record
diagrams-radial-facets.js       optional module: search, facets and the membership they set
diagrams-radial-export.js       optional module: the PNG page and diagram plates
diagrams-radial-theme.js        optional module: the reader's theme control, for the instance that owns it
```

Load the scripts in that order, each as a classic script, then mount. The engine checks its script dependencies at mount and fails closed with `MODULE_MISSING <name>` when one is absent. It does not check stylesheets, with one exception: under Criterion Assessment it fails closed with `TOKENS` when a role token or `--fg-1` does not resolve in the host (Mounting). Otherwise the foundation files are prerequisites the page loads, from the same owner commit as the scripts, and without `surface-treatments.css` a role mark draws black rather than failing. Foundation files the core takes, besides `colors_and_type.css` and `spectral-state.css`: `surface-panel.css` then `surface-treatments.css`, whose fill paint paints every role mark (the chrome's and the inspector's disclosure triggers use them too). An instance that declares Criterion Assessment also takes `criterion-assessment.css`, in that profile's own order: `colors_and_type.css`, `surface-panel.css`, `surface-treatments.css`, `spectral-state.css`, then `criterion-assessment.css`. Foundation files the modules take: with the inspector, `surface-text-link.css` (its source links); with the facets or the export, `surface-action.css` (their controls in the bar); with the facets, also `surface-input.css` (the drawer's search, which adopts `surface-action.css`'s attention edge; without it the search falls back to the browser's own input rather than failing); with the export and its default font route, `fonts-embedded.js` before the module.

**Modules.** The contract names six optional modules, and this package ships all six: `inspector`, `facets` (with search), `legend`, `chrome`, `export` and `theme`. An instance lists the ones it uses; listing one whose file is not loaded fails closed with `MODULE_MISSING <name>`. An instance that declares Criterion Assessment lists `legend`, else it fails `KEY_REQUIRED` (Mounting).

**The package's other files are example content**, never machinery, and a consumer replaces them:

```text
diagram-interactive-radial.html                  the reference shell: the reference preview's page
reference/cfw/atlas-data.public.js               the reference content, as captured (unchanged)
reference/cfw/cfw-reference.adapter.js           its adapter: projection, words, fields, facets
diagram-interactive-radial.neutral.html          the synthetic shell: the synthetic preview's page
diagram-interactive-radial.source.js             synthetic data and its words (tools/gen-radial-specimen.mjs)
diagram-interactive-radial.neutral.adapter.js    its full-stack adapter, for any hierarchy shape and either system
diagram-interactive-radial.facilities.html       the visitor-facilities shell: the visitor-facilities preview's page
diagram-interactive-radial.facilities.source.js  the synthetic data under Criterion Assessment, and its words (the same generator)
```

The modules load, read and name none of them; `tools/check-radial-neutrality.mjs` checks that.

## Mounting

```js
const map = DIAGRAM_RADIAL.mount({ host, data, adapter, modules: ['legend', 'chrome'] });
```

Everything is validated before anything is drawn. Any failure throws a named error and leaves the host untouched.

**A keyed instance.** An instance whose data declares Criterion Assessment is drawn keyed only: its key and its five declarations are part of reading its color. Before anything is drawn, its mount must list the `legend` module, else it fails `radial mount KEY_REQUIRED: a Criterion Assessment instance is drawn keyed only: list the legend module`, and the system's three role tokens, `--assessment-favorable`, `--assessment-caution` and `--assessment-adverse`, and `--fg-1` must resolve in the host's computed style, else it fails `radial mount TOKENS: <token> does not resolve in the host; load the Criterion Assessment stylesheet`. A Spectral State instance is not keyed, and its mount is unchanged.

**The host** is an element holding these slots, by `data-radial-slot`:

| slot | role | required |
|---|---|---|
| `stage` | receives the figure; the engine makes it focusable and gives it pointer and keyboard handling | yes |
| `canvas` | the box the Fit measures chrome against; defaults to the stage's parent | no |
| `live` | the live region; created and removed by the engine when absent | no |
| `hud` | holds `[data-radial-control="zoom-in" \| "zoom-out" \| "fit"]` buttons and `[data-radial-readout="zoom" \| "tier" \| "selection"]` readouts | no |
| `legend` | where the legend module renders; with the chrome module, the slot is itself the legend's panel | with `legend`; listing the module without it fails `SLOT` |
| `caption` | a panel of the page's own words about the map | with `chrome`, when `adapter.chrome.panels` declares it; a declared panel the host lacks fails `SLOT` |
| `mark-light`, `mark-dark` | the page's mark in each theme; the stylesheet shows one | no; with `export.mark: 'required'`, the page plate needs the one shown |
| `inspector` | the inspector's panel: the slot element itself, carrying `.radial-inspector` and `.radial-glass` (its placement and surface) | with `inspector` |
| `actions` | the bar's control group: the facets trigger, the export controls (unless an `export` slot is given) and the theme control, in mount order | with `facets` or `theme` |
| `export` | where the export controls render instead of `actions` | no |

The HUD may also hold `[data-radial-readout="filter"]`, which the facets module fills with the filter state.

**Reserved chrome declares its edge.** An element inside the canvas that the Fit must keep the figure clear of carries `data-diagram-fit-edge="top" | "bottom" | "left" | "right"`. On a compact viewport (`max-width: 767px`, or `max-height: 520px` on a coarse pointer) the right lane is reserved below instead, and the larger placement that clears wins. An element in a corner may also declare the other edge of that corner as an option, `data-radial-fit-option`: every Fit then also reserves each such element at its optional edge, and at no other, and keeps whichever placement is larger and has its drawing clear; a tie keeps the declared edges. The choice is made again at every Fit, from the chrome as it stands, so an option suits only an element whose box keeps its size until the next Fit. `diagrams-fit.js` is unchanged; the engine passes it the selectors. A canvas carrying `data-radial-short` (a short landscape arrangement a page's chrome declares) adds one rule to the Fit's population: a kept callout must not add a new overlap between callouts.

## Responsive chrome

The `chrome` module coordinates the caption and legend with the HUD. Default panels collapse before they collide with one another or the controls. In compact mode, a panel the reader opens may overlay the drawing; it remains bounded above the controls. A panel is the slot element itself, carrying `.radial-panel`; `adapter.chrome.panels` names which panels it coordinates and the word each one's trigger shows.

**Two arrangements, chosen by measurement.** WIDE shows every panel in its corner: the legend at the right, the caption laid into the slot between the HUD and the legend. It holds only while that layout fits:
- the caption's slot is at least 240px wide, beginning past the HUD at its widest (its selection readout at the most its stylesheet allows, and its tier readout at the widest word it has shown). The selection allowance prevents a newly shown selection from folding the panels. A newly encountered wider tier word can change a placement decision; the recorded width does not shrink on returning to shorter words;
- the caption laid into that slot takes at most a third of the canvas height;
- the legend's box leaves at least 72px of it to read, or all of it if shorter.

Otherwise the arrangement is COMPACT: the panels close behind triggers in the shared disclosure grammar (`surface-treatments.css`), which join the HUD in one control area, beside it when the row fits and directly above it when it does not. No single width decides it: a wide but short canvas is compact too.

**One panel at a time, and who changed it.** In compact, at most one panel is open. It opens upward from the control area, inside the room between the canvas top and that area, scrolls there, and never covers the HUD or the triggers.
- Entering compact closes every panel: a panel open only because the wide arrangement shows it is not a reader's choice. Entering wide shows them all again.
- While a compact panel remains open, a resize keeps its scroll position within the available scroll range. A panel set aside for insufficient room reopens at the top.
- When the room above the control area falls below 72px, no panel can be read there:
  - the triggers are not offered: they leave the display and the tab order, and focus moves to the HUD's Fit control;
  - an open panel is set aside.
  When the room returns, the triggers return and the set-aside panel reopens by itself.
- **A keyed instance keeps its legend offered.** Under Criterion Assessment the legend is part of reading the map's color, so its trigger stays offered wherever the room from the canvas top to the control area is at least 72px, even where an obstacle (Other modules' panels, below) leaves the panels' own room below 72px and the other triggers withdraw. Opened there, the legend takes the room from the canvas top, over the obstacle. Where that room too is below 72px, every trigger withdraws, the legend's included, as above. A Spectral State instance is unchanged.
- A reader action forgets a set-aside panel, so nothing reopens behind the reader's back. That action is Escape anywhere in the map, which still peels its own layer, or a selection. A resize is never counted as a reader action.
- Each trigger's `aria-expanded` and its panel's `hidden` attribute change together.

**Fit and Escape.**
- **Fit edges.** In wide, the panels keep the edges the page declares, so the Fit reserves them. In compact, the trigger row declares the bottom edge and every panel `none`.
- **Open panels.** An open compact panel is a registered overlay. The Fit report lists it in `covered` when it covers the drawing or its names. An explicit Fit dismisses an obstructing panel through the module before it fits again; a non-obstructing panel may remain open.
- **Refits.** A change to the reserved chrome, or to which panel is open, refits only at the Fit, and the refit carries its cause (resize, font, reader). At the Fit, a resize can therefore fit twice in one frame: once as the engine sees the new size, then again once the chrome is arranged for it. Both fits carry the cause `resize`. A reader's own pan and zoom, and the selection, are left alone.
- **Escape.** Escape closes the open panel, after the chooser and before the selection. Focus inside the panel returns to its trigger.
- **Focus** moves only when its target would disappear:
  - into the panel, from a trigger the wide arrangement hides;
  - to the trigger, from a panel compact closes;
  - to the HUD's Fit control, when neither is shown.

Without the module, each panel keeps its own corner and nothing coordinates them.

**Other modules' panels.** The inspector and the facets drawer are panels too, and the chrome takes them into account without knowing them. Each marks itself an obstacle (`data-radial-obstacle`): in wide, a corner panel that would meet one sends the arrangement to compact; in compact, the room above the control area ends below one that reaches into the panels' lane. A compact panel the reader opens is an exclusive overlay, and so are the facets drawer and the inspector's compact sheet: opening any one closes the others (`claim`). A panel kept open by anything but the reader's opening of it, as the inspector's sheet is through a resize, yields instead where another is open: it asks the engine (`othersOpen`) and folds rather than claiming. An obstacle that an opening panel would close (marked `yields`) takes no room. A module announces a change of its panel with the `obstacle` event, and the chrome re-measures. A panel that folds with the compact arrangement, as the inspector does, is measured in its wide form: while the chrome judges the wide arrangement it announces a `probe` event (`{ arrangement: 'wide' }` before, `{ arrangement: null }` after), and such a panel shows itself as it would stand in wide between the two. The arrangement therefore never depends on that panel's own folding, and the two settle in one step.

**The page.** The stylesheet styles the component only. A full-viewport page declares `<body class="radial-page">` for the page rules (no margin, the ground, no page scroll); a page that mounts the map inside its own layout leaves that class off and keeps its own body.

## Inspector

The `inspector` module reports in text what the map draws: the selected node, the previewed one while nothing is selected, or an undrawn record. **The owner draws the grammar and the adapter supplies every word.** The adapter answers two questions about a target, its header and its sections; a section is one of a closed set the owner renders.

```text
inspector  { header(target) -> { title, kind? },           kind is the line above the title; it defaults, for an
             sections(target, ctx) -> [section],             item, to its kind's id and label
             name?, idle?, back?, backMax?, more?, closed?, linkPlanes?: [plane id],
             controls?: { collapse?, expand? }, announce?(target, ctx) }
target     { type: root | container | item | record, id, node (the declared object, its data included), depth,
             count, shown (members under a filter), parent, kind, state, origin (a record's way back) }
ctx        relations(id) -> [{ edge, plane, direction: out | in, other, outside }]   every plane, never-drawn included
           links(id) -> [{ edge, direction, other }]   a placed node's links to records, or a record's links
           node(id), visible(id), filtered()
section    { type: 'state' }                                  the target's state: swatch, label, meaning; under
                                                              Criterion Assessment the owner word and the criterion
           { type: 'fields', title?, fields: [field] }        a field is { label, value, mono?, format?, tone?,
                                                              labelLinked? }; format text | list | structured | locator
           { type: 'relations', title?, planes?, tags?, show?, never?, outside? }
                                                              the node's relations, every plane, never-drawn included
           { type: 'references', title?, items: [{ id, button?, text?, detail? }], head?, more? }
           { type: 'note', text }
```

- **Fields.** A field with no value is left out, and a fields section with none is left out with its heading. `list` joins an array with ` · `; `structured` draws a string, an array (one value per item) or an object (one field per key, `_` read as a space), in a block a `tone` (a role of the declared system, or `muted`) edges, and under Criterion Assessment a tone is `muted` only: any other throws `radial inspector SECTION: …: under Criterion Assessment a field tone is muted only` when it is rendered; `locator` links only standalone `http(s)` addresses with a real dotted host and no elision, keeps trailing punctuation outside the link, and shows `labelLinked` as its label when it made one.
- **Relations** show their direction: `→` out of the node, `←` into it, `—` on an undirected plane. A never-drawn plane's row carries the `never` flag; under a filter, a row to a filtered-out node carries `outside`.
- **References** are buttons. One to a placed node selects and centers it. A node a membership hides is revealed first by clearing the membership: through the facets module when it is listed (its controls stay true), else through the engine, so the inspector needs no other module. The camera moves only once the node is shown and selected; a node hidden by policy is not reached, and nothing moves. One to a record opens the record's view, which keeps the node it was opened from and offers the way back (`back`, its label capped at `backMax`); a way back to a node a filter has since hidden closes the record view instead. `head` shows that many, then a `more` button; the head returns for another target.
- **A record's origin.** A record keeps, as its origin, the node it was opened from: the node whose reference was followed, or, from another record's view, that record's own origin. A record opened by a search result, by an arrival, or by the page's `openRecord(id)` or `openRecord(id, null)` has none; `openRecord(id, from)` names `from` as its origin and does not select it. Opening a record clears a locked node other than its origin, before the record's view is drawn or the panel opens: a node the record was not opened from is no longer drawn as selected, and opening the record never moves the camera toward it. A later change of size makes the map's own view again (Interaction, Fit), as it does after any clearing. Whether the record happens to link to that node does not matter: the origin decides. The clearing is the module's, a `select` event with cause `module` that arrives by `inspector`, so the record stays open. The clearing moves no focus and announces nothing itself; the record is then announced. As any selection a module makes does, it closes an open chooser (the page's own `select()` leaves the chooser open): focus inside that chooser goes to the stage, which announces a keyboard focus there, usually on the node being cleared, before the record. A `select` listener that destroys the map, or opens another view, during the clearing ends this opening: `openRecord` returns `false`, and the opening draws, writes and announces nothing more. `state().inspector.origin` is the origin's identifier, or `null`.
- **The record context.** While a record opened with no origin is open, the inspector holds the engine's record context, whether or not anything it links to is shown. Entering it ends a hover preview, unless the chooser is open (below), with a `preview` event of cause `module`, as the record's view is drawn. A `preview` listener that destroys the map, or opens another view, on that event ends the opening, as a `select` listener does during the clearing (A record's origin): `openRecord` returns `false`, and the opening opens no panel, announces nothing and emits no `inspector` event of its own.
  - **The linked frame.** Each placed node the record links to through a plane named in `linkPlanes` takes a 1px frame at full strength, in its own class, while it is shown; nothing dims and nothing is selected. A link on another plane, or to another record, frames nothing, and with no `linkPlanes` (the default) no link does: a frame states a recorded link only where the adapter says it does. A record with no such link, or one whose links a filter hides, leaves the map neutral and keeps the context, so `ctx.visible(id)` and `ctx.filtered()` let the adapter's sections tell links not shown from links not recorded. A frame means only that the data records a link; it implies no direction, support, endorsement or ruling.
  - **Hover** previews nothing on the map and adds no frame; a hovered mark keeps only a frame it already has, and the pointer cursor stays. A click, a tap, Enter or a chooser's choice selects as ever, which shows that node's view and ends the context. The keyboard focus moves, is announced and draws its ring 3px outside any frame, with the linked frames kept.
  - **The chooser** is the one exception. While it is open, its preview shows the mark it would select, in place of the linked frames and with the selection's dimming. It lasts only while the chooser is open: closing it without a choice restores the frames, and choosing a mark selects it and ends the context.
  - **A record opened from a node** (one with an origin) holds no context and frames none of its links. Its origin keeps the way back, and while it is selected, the selection's treatment.
  - **While the record is open.** The context holds as long as the record view is open, the panel collapsed by its own toggle included, and ends when another view replaces it.
  - **The way back to a record.** A placed node reached by one of the references in such a record's view offers `back`, labeled with the record's name, and it reopens that record with no origin, its frames included. It is one step back, not a history: the camera stays where following the reference put it, and a node reached any other way, a click on a framed mark included, offers none.
  - **The camera.** Starting or ending the context never moves the camera by itself; a reference followed or a search result chosen still centers its node. A plate strips the linked class with the other live-state classes (Export).
- **Closing a record.** A click or tap on empty canvas with nothing selected closes an open record view, whatever its origin, a record whose origin a filter has since cleared included; on a compact canvas it folds the sheet. A drag pans and leaves the record open. With a node selected, the tap clears the selection and the record view together, as the reader's clearing does. With the chooser open, the tap closes the chooser and the record view together. Escape peels the chooser first and keeps the record, then an open chrome panel and the search text, then the record, then the selection. Closing a record by Escape or on empty canvas, with nothing selected, announces `closed` (default `{name} closed`; an empty string announces nothing); closing back to a selected node announces that node. With nothing selected, a listener that destroys the map, or opens another view, while the record closes or the sheet folds ends the close there: it folds no sheet of that view, returns no camera to the Fit and announces nothing.
- **Views.** The idle view shows the panel's name and the `idle` text. In the panel, hover previews a mark while nothing is selected and no record is open; on the map, while nothing is selected and no record context holds. Escape closes a record view before the selection is cleared. A clearing of the selection that the page or a module makes (`select(null)`, a filter that hides the selected node, the clearing above) leaves an open record view, and the sheet, as they are; the reader's own clearing of a selected node closes the record view with it. An arrival naming an undrawn record opens its view. The panel is tinted by an item's state, neutral for a container, untinted for a record. Under Criterion Assessment an assessed item tints it in its role, `var(--assessment-<role>)`; an unassessed item, a container and the root tint it neutral, `var(--fg-1)`; a record leaves it untinted.
- **The state section under Criterion Assessment.** An assessed item's `state` section shows its role's swatch, its owner word (Favorable, Caution or Adverse) and the declared criterion as its second line. An unassessed item, a container and a record have no state, so the section draws nothing for them.
- **Announcements.** Without the adapter's `announce`, a target is announced by its header's title; under Criterion Assessment, an assessed item's owner word follows it (`<title>, Caution`). An adapter's own message is announced as it is.
- **Placement.** A corner panel on a wide canvas; on a compact one a sheet across the top, collapsed to a pill until a selection, a record or its own toggle opens it, and an exclusive overlay. The canvas is compact on a narrow window, or a short one under a coarse pointer, and also, where the chrome module is listed, whenever its measured arrangement is compact: the inspector folds with the panels around the map, so a window whose caption and legend have folded gives the drawing the room a standing corner panel would take. The wide panel declares the right edge and keeps that lane at every size, because it grows with a selection with no refit. The collapsed pill declares the top edge with the right as its option, so the Fit reserves it above the drawing or beside it, whichever leaves the larger clear placement: in a tall window usually above, on a short landscape screen usually beside. The open sheet is an overlay and reserves nothing (Fit edge `none`); the live `report().covered` lists it while it lies over the drawing or its names, and an explicit Fit dismisses it there.
- **Opening and closing.** Entering compact folds a panel that is open only by default. A reader's inspection (a selection, a record, or the panel opened with its own toggle) stays open, as the sheet, unless another exclusive panel such as the facets drawer is open: a resize is not a reader opening the sheet, so it yields to that panel, as it does when that panel opens, and keeps the record and the selection. From the Fit the view takes the new arrangement's Fit and leaves it with the selected node beside the sheet; where the window turns the canvas compact before the chrome settles, the sheet takes the settled Fit again while it is as the resize left it. A size change that keeps the canvas compact, a phone turned, keeps the reading state the same way: a view the map made, from the Fit or around a node it centered (an arrival, a search result, a reference followed), is made again for the new size with the selected node beside the sheet, and a record with no placed mark keeps its view over the new size's Fit. A camera the reader has moved stays put, even where the sheet now covers the selected node. Opening the sheet never refits and never shrinks the drawing: the view leaves the Fit and the selected node is brought into the room beside the sheet, and so it is again whenever what the open sheet shows changes (another selection, a record, a reference followed, more rows) and when a search result or an arrival is centered on. A record has no placed mark of its own to bring in. Closing the sheet, or the arrangement turning back to the wide panel, returns to the Fit when the sheet was opened there and the camera is as it left it; otherwise the camera stays, unless that comes with a change of size, which makes a view the map made again (see Interaction, Fit). That includes the sheet's opening closing the panel that had folded the others (the facets drawer, on a short wide window): the arrangement turns wide and the wide panel returns to the Fit. Hover never opens it. On a wide canvas the reader's own toggle refits only at the Fit. The reader's own clearing of the selection collapses the sheet. Whenever the body is hidden, by the reader or by a resize, focus inside it first moves to the panel's disclosure, or stays on the panel where the view it showed is replaced first (the reader's Escape clearing the selection); focus anywhere else is left alone, and the view, selection and record stay.
- It offers the `inspector` service (`show(id)`, `openRecord(id, from?)`, `state()`), reports `state().inspector` (`view`, `target`, `origin`, `expanded`, `arrangement`) and emits `inspector`. A malformed section throws `radial inspector SECTION` when it is rendered.

## Facets and search

The `facets` module puts search and filters in a drawer behind a trigger in the bar.

```text
facets     { declared: [facet], search, name?, title?, close?, note?, reset?, families?: { items?, relations? },
             notOffered?: [{ title?, tag?, reason? }], announce?: { results?, group?, outside?, reset?, cleared? } }
facet      { id, title, family: items | relations, value(x) -> value | [values] | undefined, label?(value), note?,
             order?: 'count' | 'value' | [values] | comparator, swatch?, locked?: [values] }
             x is the declared node (items) or the assembled relation { key, from, to, plane, directed, id?, type?, note? }
search     { label?, placeholder?, text?(entry) -> string, prefix?: RegExp, tag?(entry), sub?(entry), limit? (40), labelMax? (88) }
             entry is { type: item | container | record, key, label, node (the declared object), depth?, count? }
```

**Search** covers every placed container, every placed item and every record. A query is normalized (lower case, compatibility decomposition, combining marks removed) and ranked: the exact identifier; an identifier prefix, for identifiers `prefix` names; the exact name; a name prefix; a word in the name; anywhere in the name; anywhere in the adapter's search `text`. Ties go to items, then containers by depth, then records; then the shorter name; then the identifier. Choosing a result opens a record's view (with the inspector module; without it, the record's name is announced), frames and selects a container, or selects and centers an item; a node a filter hides resets the filter first, and a node still hidden moves nothing. The input is a combobox: Down to the first result, Up from it back to the input, Enter chooses the first.

**Facets** are the adapter's dimensions over one of two families: `items` (which items are members) or `relations` (which relations between members are drawn). Values are OR'd within a facet and AND'd across facets; a facet with nothing chosen is inactive. Every option shows its count over the whole data; a `locked` value is listed and cannot be chosen; a note's `{present}` and `{total}` are the items that carry the facet and all items.

**A swatch facet under Criterion Assessment is strict.** Its values are the system's roles and its option labels are the owner words, Favorable, Caution and Adverse; an `unassessed` value is dropped, so it offers no option and counts toward no option. A `label` on such a facet fails `radial mount HOOK_MISSING: facets.declared[<i>]: a swatch facet under Criterion Assessment takes the owner words, not a label`, and a value that is not one of the system's four roles fails `radial mount HOOK_MISSING: facets.declared[<i>]: "<value>" is not a Criterion Assessment role`, both at mount. A facet without a swatch, and every facet of a Spectral State instance, is unchanged.

**Membership.** A filter never moves a mark and never changes the tier. Non-members, their limbs and the relations that lose an end are hidden (`is-out`); a container is a member while any member item lies under it, and the root always is. A container's count line reads its members of its total (`labels.countFiltered`), and a tier's `minLeaves` counts its members, so a container a filter thins below that minimum is not named at that tier. A selection the filter hides is cleared; an open record view stays. A change of filter refits to the members, and a Fit with no member item frames the whole layout, never the root alone. The census (in the drawer, `text.census`), the HUD readout (`text.filtered`) and the trigger report it; `text.noMatch` takes `{items}`, `{records}`, `{objects}`, `{entries}` and `{depth1}`, `{depth2}`, ….

**The drawer** opens focused on the search and closes with focus on its trigger. Its search field is the shared text input (`surface-input.css`) at the compact density in the query role, with the shared attention edge; the pattern sets its width and nothing else. While open it reserves the left edge for the Fit and is bounded above the control area; opening or closing it refits only at the Fit. Escape peels, with the engine's layers: the search text, then (the record view, the selection), then the filters, then the drawer.

It offers the `facets` service (`reset`, `search`, `set(id, values)`, `census`, `open`, `query`, `activate`), reports `state().facets` and emits `facets`. Without the module, `setMembership(leaves, relations)` on the instance sets a membership directly.

## Export

The `export` module draws two plates of the map as PNG: a **page plate** (the figure with a header, a legend column, the caption and up to four plate lines) and a **diagram plate** (the figure alone, at the natural aspect of the layout bounds, with no chrome). A plate is an SVG built from the drawn world in its neutral state (no selection, no record context and no linked frame, every member, drawn-always relations on, drawn-on-selection relations off), the plate's own Fit, and the label solver at a fixed tier; it is then rasterized. A plate never reads or changes the reader's view, selection, preview, focus, membership, open panels or label deferral, and the same page state gives the same SVG, byte for byte.

**A Criterion Assessment instance exports the page plate only, with its key.** Its key is part of reading its color, so at mount a `diagram` profile fails `radial mount HOOK_MISSING: export.profiles.diagram is refused: a Criterion Assessment instance exports the page plate with its key`, and a page profile with `legend: false` fails `radial mount HOOK_MISSING: export.profiles.page.legend cannot be off: a Criterion Assessment instance exports its key`. At the click, a page plate whose legend model carries no declarations is refused with the reason `key missing`. The plate's tokens are the five base tokens (`--fg-1`, `--fg-2`, `--fg-3`, `--bg-from`, `--bg-to`) and the three `--assessment-*` role tokens; no `--state-*` token appears in it. Its legend column draws the three owner words, then the heading `Criterion Assessment` and each declaration's label above its value.

```text
export     { filenameBase: [a-z0-9-]+, profiles: { page?, diagram? }, plateLines?, mark?, fonts?, header?, shapeKey? }
profile    true | { size? [w, h] (page; 3840 x 2880) | longEdge? (diagram; 3840), scale? (2), detail? (a tier index; 1),
                    legend?, caption?, lines? (page; each true) }
plateLines function (counts) returning at most four strings; counts { items, records, containers: { depth: n },
           relations: { plane: n }, tier }
mark       'none' (the default) | 'required': the theme-visible mark slot's image or text; required and absent fails
fonts      'carrier' (the default: window.DSA_EMBEDDED_FONTS) | { sans: url, mono: url }
header     { title? (the root's label), subtitle?, stamp?, canonical? }
shapeKey   [[shape, name], ...]: the page plate's shape group, in place of one row per declared kind
```

**Controls and API.** One button per declared profile, `PNG page` and `PNG diagram`, renders into `[data-radial-slot="export"]`, else `[data-radial-slot="actions"]`, else nowhere; a Criterion Assessment instance has the `PNG page` button only. The module offers `run(profile, { download })` as the `export` service; it resolves `{ ok, profile, theme, width, height, filename, svg, bytes, labels, blob }` and rejects with an error whose `reason` is brief. `state().export` is `{ busy, last, failure }`, and each run emits `export` with its cause. Filenames are `<base>-page-<w>x<h>-<theme>.png` and `<base>-diagram-<theme>.png`; the theme is resolved at the click.

**Styles are read, not restated.** The plate's one `<style>` carries the faces under export-only family names (after a positive control: each must measure unlike a family that does not exist), the theme tokens resolved at the click, and one rule per element signature the plate draws, written from the computed style of a probe of that signature in the live drawing. **Everything a plate takes from the page is one snapshot read at the click**, before the first wait (the tokens, the drawn world, the names, every computed style, the mark, the legend model, the caption, the plate lines), so a theme change while the fonts load reaches neither the plate nor its filename, and the page keeps the reader's new theme. The legend column draws the legend's own model, a plane's or kind's note under its label.

**Fails closed.** A missing font carrier, a font fetch that fails, a font that does not apply, a theme token that does not resolve, plate lines that are not strings, a required mark not displayed, a mark image that cannot be read or lies outside the plate, a chrome text outside the plate, overlapping chrome blocks, a name outside its label area, an element whose style was not read at the click, or a raster that fails aborts the export with a brief reason. The clicked control reads `export failed` for five seconds, with the reason in its title and accessible name. Registered faces and offscreen nodes never outlive a run.

## Theme

The `theme` module gives the reader a control over the document theme, for the one instance whose adapter declares `theme: 'own'` (a second is `THEME_OWNER_CONFLICT`). The control, in the `actions` slot, cycles auto, light and dark: auto removes `data-theme` from the document root, so the tokens follow the operating system; light and dark set it. Nothing is stored. The control names the state in force, and a change is announced. Its words (theme, auto, light, dark) are the owner's. Destroying the instance restores the attribute the document had. An instance that lists the module without owning the theme renders nothing.

## Data contract

JSON-compatible data, validated at mount. Every key set is closed: an unknown key is `UNKNOWN_FIELD`, except inside `data`, which is the consumer's opaque record.

```text
root      { id, label }
nodes     [ { id, label, parent?, container?, kind?, state?, data? } ]   placed; no parent = under the root
records   [ { id, label, kind?, state?, data? } ]                        undrawn
planes    [ { id, label, drawn, directed } ]       drawn: always | selection | never
states    [ { role, label, meaning } ]             role: one of the seven Spectral State roles
kinds     [ { id, label, shape } ]                 shape: circle · square · diamond · hex · tri · ring
edges     [ { id?, from, to, plane, type?, note? } ]
options   { emptyContainers? }                     show (default) | hide
semantic  { system } | { system, criterion, direction, scope, basis, rule }
                                                   the one declared semantic system: spectral-state, the same as
                                                   absent | criterion-assessment, with all five (Semantic system)
```

Under Criterion Assessment the key sets change: the top level takes no `states`, a node takes `assessment` where a Spectral State node takes `state`, and a record takes neither:

```text
nodes     [ { id, label, parent?, container?, kind?, assessment?, data? } ]   assessment: on every leaf, on no container
records   [ { id, label, kind?, data? } ]                                     undrawn; never assessed
```

**States.** A declared role is one of Spectral State's seven: `earned`, `partial`, `held`, `deflated`, `structural`, `proposed` and `neutral` (no asserted state, drawn as the wash). Spectral State v2.0 retired `external`: owned elsewhere is provenance, not a state, so a declared role or a node's state that names it fails `STATE_ROLE` or `NODE_STATE` with a message that says so, before anything is drawn. There is no alias. A consumer migrates each use by what it meant before it mounts: an outside-owned element takes the state it asserts, or `neutral`, and keeps its provenance in its `data` and the inspector; a proposal takes `proposed`; an admitted but unclassified record takes `neutral` and keeps its classification as data, as the reference specimen does. Never take structural from the violet the retired role used to paint. A facet that shows a value other than a state takes no swatch.

**Semantic system.** An instance declares one semantic system, in the top-level `semantic` key, and its color encodes that system only; nothing falls back from one system to the other. Absent, or `{ system: 'spectral-state' }` with no other key, the instance is Spectral State, read from `states` and each node's and record's `state` as above. `{ system: 'criterion-assessment', criterion, direction, scope, basis, rule }` declares Criterion Assessment ([`criterion-assessment.md`](../../criterion-assessment.md)): the criterion judged against, the direction that serves it, the scope assessed, the basis of the assignments and the rule that assigns them, each a non-empty string, which the key and the page plate draw. Under it, every leaf declares `assessment`, one of `favorable`, `caution`, `adverse` and `unassessed`; a container, one with children or declared `container: true`, takes none, and neither does an undrawn record; `states`, a node's or record's `state` and the root's `assessment` are `UNKNOWN_FIELD`. Nothing is inferred or aggregated: a container's color never summarizes its leaves. Explicit assignment on every leaf, `unassessed` included, and on leaves only, is this pattern's product choice, as is a strict swatch facet that offers no unassessed option (Facets and search); neither is deduced from the profile's own contract, which leaves to the consuming author which nodes a figure assesses. The criterion, its declarations and every assignment are the consumer's. The messages, each after `radial contract <CODE>: `, show an identifier or any other string in JSON quotes, shortened past 40 characters:

```text
SEMANTIC_SYSTEM        semantic must be a plain object when present, got <value>
                       semantic.system must be one of spectral-state, criterion-assessment, got <value>
UNKNOWN_FIELD          semantic: <key>, for a key outside the declared system's set; under Criterion Assessment
                       also contract: states, nodes[<i>]: state, records[<i>]: state and root: assessment
SEMANTIC_DECLARATION   semantic.<field> must be a non-empty string, got <value>
NODE_ASSIGNMENT        <id>: every leaf declares its assessment, one of favorable, caution, adverse, unassessed
                       <id>: assessment <value> is not one of favorable, caution, adverse, unassessed
ASSIGNMENT_SCOPE       <id> is a container: only a leaf takes an assessment
                       <id> is an undrawn record: only a leaf takes an assessment
```

**Types, and absence.** `id`, `label`, `meaning` and the ends of an edge are non-empty strings. `container` and `directed` are booleans. `type` and `note` are strings when present, and, as free text, may be empty. Lists are arrays without holes (`NOT_AN_ARRAY`), objects are plain objects (`NOT_AN_OBJECT`). An optional field is absent only when its key is missing or its value is `undefined`. `null`, `false` or an object is never read as "use the default", and neither is an empty string in a field that must be non-empty: each is a named error. `data` must be a JSON value (plain objects, arrays, strings, finite numbers, booleans, `null`, no cycle), and it is checked (`DATA_NOT_JSON`).

**Containment.** A node's `parent` names another placed node, or the root when absent. A node with children is a container; `container: true` declares a container that may be empty, and `container: false` with children is `CONTAINER_CONFLICT`. Depth may differ between branches; a container may hold containers and leaves together, and the root may hold leaves directly. A declared empty container is shown under `show`, and hidden and reported under `hide`.

**Identity.** Identifiers are opaque strings in one namespace across the root, nodes and records, held in Maps, so any string is valid, `__proto__` included. Declaring one twice is `DUPLICATE_ID`; two edges with one declared id is `DUPLICATE_EDGE_ID`. The owner derives no identifier from another.

**Relations and records.** An edge between placed nodes is a relation, drawn by its plane's policy: with nothing selected or previewed, every `always` relation shows and no `selection` relation does; while one node is shown, its relations of both drawn planes show and every other relation is hidden; a `never` relation is not drawn. The node shown is the selected one, except that a hovered or focused chooser item is shown in place of any selection while the chooser is open; a hovered mark is previewed only while nothing is selected and no record context holds (Inspector), and only when it is the one mark under the pointer. Relations are created in the nothing-selected state, so it holds in the first rendered frame; on a deep-link arrival the arriving node is then selected, and with motion not reduced the other relations fade out over the motion duration. An edge touching an undrawn record is a link in both views, the placed node's and the record's, which hold the same edge object (identity, plane, direction, type, note). An edge between two records is kept for both records' views and never drawn.

**References are reported, not dropped.** Each report keeps the edge's own reference information (`index`, `id`, `from`, `to`, `plane`, `type`):

```text
unresolved    an endpoint is not a declared identifier                     + missing (and
                                                                           unsupportedEnds when
                                                                           the other is the root)
unsupported   an endpoint is the framing root, or the edge is a self-loop  + reason, ends
hiddenRefs    an endpoint is a container hidden by policy                  + hidden
```

The framing root is a known identifier but not a supported relation endpoint in this version, so an edge to it is `unsupported`, never `unresolved`.

**Tested limits.** Depth 6 below the root and 2,500 placed nodes. One step past either fails closed with `DEPTH_LIMIT` or `CAPACITY_LIMIT`. These are enforced input bounds, the extent the owner tests exercise. They are not a capacity or legibility guarantee.

## Layout grammar

**Invariants**, not configurable: the root at the center and the first unit at 12 o'clock, proceeding clockwise; every node's bearing inside its parent's wedge and sibling wedges disjoint; radius growing with containment depth; a container's leaves fanned in rows beyond it, as one unit placed where the first leaf stands among its siblings. Sibling order is the order of declaration.

**Defaults**, fixed values: ring radii 250 · 610 · 800, then +190 per tier; a 96 stagger between alternate containers below depth 1; the root shares its circle by the square root of each unit's leaf count; a container below the root that holds containers shares its wedge after a 6% inset on each side; a container holding only leaves fans them across 90% of its own wedge with no inset, and a leaf unit inside a mixed container across 90% of its share; fan rows of max(3, ⌈√(1.9 n)⌉), 34 apart; mark radii 44 root · 76 depth-1 container · 15 deeper container · 5.2 leaf.

**Settings**, `adapter.layout`, a closed set (`LAYOUT_OPTION` on an unknown key or a bad value):

```text
allocation  weighted   a container below the root shares its wedge by the square root of each
                       unit's leaf count (the default)
            equal      equal shares, for a consumer whose accepted geometry was built that way
itemMax     a positive-integer character cap on leaf names; it never splits a surrogate pair
```

Weighted sharing relieves the crowding equal sharing builds in deep, dense subtrees; it makes no difference to shallow or flat data. A consumer whose accepted geometry uses equal shares declares `allocation: 'equal'`.

## Labels and level of detail

Names live in screen space, outside the zoom transform, constant in size. The root's and containers' names are upright callouts, separated from one another, pulled off the reserved side lanes and ellipsized to the room that is left. Leaf names read along their own radius; they are not pulled off chrome, and the Fit's checks cover callouts only.

**Tiers** (`adapter.labels.tiers`), each `{ k, name, containers, leaves, ids, minLeaves?, defer? }`. From zoom `k` up, a tier names containers to depth `containers` (or `'all'`), leaves when `leaves`, identifiers when `ids`. A container at a depth listed in `minLeaves` is named only with at least that many leaves. The defaults:

```text
k 0     overview      containers to depth 2; a depth-2 container only with 16 or more leaves
k 0.58  containers    every container
k 1.05  items         every container and leaf
k 2.30  identifiers   every container and leaf, with leaf identifiers
```

**Count lines** (`adapter.labels.count`) map a depth, or `'*'`, to a template with a `{count}` slot; the default is `'{count}'` at every depth. While a membership is in force, `adapter.labels.countFiltered` gives them instead, with `{count}` the members and `{total}` the whole; a depth it leaves out reads `'{count} / {total}'`.

**Crowding away from the Fit** (`adapter.labels.crowding`):

```text
yield   (the default) a name yields while its mark is off the canvas; a callout below depth 1
        yields where it would overprint one already kept (shallower first, then larger); a leaf
        name yields where it would cross a kept callout or an inner leaf name on its own ray.
        The root's and the depth-1 names never yield this way. A yielded name returns as zoom
        or panning separates it
keep    every name the tier calls for is placed and clamped into the canvas; names are thinned
        only by the Fit's population. It is for a consumer whose accepted presentation was built
        that way
```

**The Fit's population.** At a whole-map Fit, where names would sit under reserved chrome, outside the canvas or over one another, the Fit leaves some to the next tier: count lines before names; the depth-1 names and the root's name only as whole tiers, never one of several; deeper names kept largest first only while every kept name still stands clear. The deferral holds through pan and zoom, rests at other tiers, and ends at the next Fit. A tier with `defer: false` is never thinned this way. Level of detail never removes a node.

**One solver, any target.** `DIAGRAM_RADIAL.labels.solve` is pure: the screen calls it with the reader's view, tier and deferral, and another target can call it at its own size and tier without touching the reader's state. A target that draws frames around its marks passes `clearance(node)`, each leaf's frame reach plus half its line, in screen pixels from the node's center, and the leaf's name starts 2px past it; the engine and the export plates both do. Without it the solver clears the mark's reach and a fixed 12px, which keeps a name off its mark but does not follow a frame drawn at the target's zoom.

## Interaction

**Pointer and touch** (`diagrams-pointer.js`): one pointer pans past a tap slop (4px for a mouse, 12px for a finger or pen); two pinch about their centroid; a moved gesture swallows the click that follows it, so a pan never selects; the wheel zooms one step about the pointer, and a horizontal scroll does not zoom. The zoom range runs from the whole-map Fit's scale (or 0.24, whichever is smaller) up to 14.

**Overlapping marks.** Marks are drawn in world space and scale with the camera, so two marks that overlap overlap at every zoom, and deferring their names fixes nothing. The engine therefore resolves every click by its own hit test over every visible mark:

```text
one mark under the point            selects it
several marks under the point,      a chooser lists them, nearest first; each item names the
or several near it and none under     mark and its parent
one mark near the point             selects it
nothing there                       clears the selection; with nothing selected, emits empty,
                                    on which the inspector closes an open record view
```

Under means inside the mark's drawn shape (circle, ring, rounded square, pill, diamond, hexagon, triangle); near is within 4px of it for a mouse and 10px for touch. The chooser always lists every mark under the point, because zoom cannot separate marks that overlap; it adds near marks up to 8 entries in all, and offers "zoom in here" for the rest, which do separate with zoom. Under Criterion Assessment an assessed item's line under its name reads its parent and its owner word, `<parent> · Caution`, beside its role's swatch; an unassessed item's names its parent only. It is operable by pointer and by keys (Up and Down move, Enter chooses, Escape closes); hovering or focusing an item previews its mark. It closes when focus leaves it, and on a pan, zoom, pinch, resize or keyboard move, since its list belongs to the point it was opened at. A press on one of its buttons keeps focus where it is, so the chooser stays open for the click or tap that chooses; where a pressed button takes no focus, as in WebKit, the press would otherwise move focus out of the chooser and close it first. A selected or focused mark is drawn again above its neighbors, and the keyboard focus is a ring drawn at screen size, so a small or overlapped mark is still found.

**The core keyboard path**, owned by the engine and independent of any search module:

```text
Tab          reaches the figure; the focus resumes where it was, else at the selection or the root
Left, Right  the previous or next sibling in the order the layout places them, wrapping:
             clockwise unit by unit, and a multi-row fan row by row
Down, Up     the first child; the parent
Enter, Space selects the focused node; on a selected container, frames it
Escape       peels one layer: the chooser, then the selection
```

Every move is announced in the live region from the announcement templates (the owner's defaults, or the adapter's overrides), with the node's position among its siblings. Under Criterion Assessment the owner appends an assessed node's word after the template, whichever template is in force: a selection reads `<label> selected, Caution` with the default template, a focus its position and `, Caution`, and the message on reaching the figure adds the focused node's word, where it has one, and then, as a sentence of its own, `Color is Criterion Assessment: <criterion>.` An unassessed node, a container and the root add no word.

**Fit.** The HUD's Fit, or `fit('explicit')`, fits the whole map, dismisses any open overlay that covers the drawing or its names, and fits again with cause `explicit`. A resize refits at the Fit. Away from the Fit, the view keeps what made it. A camera the reader or the page has moved (a pan, a pinch, the wheel, a zoom control or `zoom()`, a keyboard move or `focus()` that pans) stays where it is, and on a touch screen a change of height alone holds its center. A view the map made itself (the Fit with a panel open over it, a framed group, or a node centered by an arrival, a search result or a reference followed) is made again for the new size once every module has arranged its chrome for it: the Fit or the frame again, or the node brought back into view at its zoom, the selection taking its place. The engine then emits `placed`, and a module with a panel open over the drawing puts the selection beside it. A size change is measured against the size the last placement was made for: a layout that settles to the size a view was just made for moves nothing, and one that settles to another size makes a view the map made again rather than shifting it. A completed webfont load re-measures every name and refits at the Fit.

**Deep-link arrival** (`adapter.arrival: { hash: true }`): `#node=<encodeURIComponent(id)>` selects and centers that node on load and on every later hash change. An unknown identifier is ignored and reported. At most one instance per document owns arrival (`ARRIVAL_OWNER_CONFLICT`).

## Adapter

```text
layout     { allocation?, itemMax? }                        closed (Layout grammar)
labels     { tiers?, count?, countFiltered?, crowding? }    closed (Labels)
text       { controls?, announce?, idle?, census?, filtered?, noMatch? }   domain words; overrides of the owner's defaults
legend     { headings: { state, line, shape }, bound?, notes?: { planes?, kinds? }, shapes? }
                                                            with the legend module: a note under a plane or a kind (by
                                                            id), and `shapes`, one line of text in place of the kind rows
                                                            (and their notes) in the live legend; the plate draws kinds
arrival    { hash: boolean }
theme      'host' (default) | 'own'                         'own' needs the theme module
chrome     { panels: [{ slot: caption | legend, trigger }] }  with the chrome module: the panels it
                                                            coordinates, in trigger order, and each trigger's word
inspector · facets · export                                 with their modules (Inspector, Facets and search, Export)
```

**Text.** The owner ships default control labels (`zoomIn`, `zoomOut`, `fit`, `close`, `choose`, `zoomHere`, `more`) and announcement templates (`focus`, `focusRoot`, `select`, `clear`, `frame`, `choose`, `leaf`, `top`, `start`); `text.controls` and `text.announce` override any of them. Templates take `{label}`, `{index}`, `{total}`, `{parent}`, `{depth}` and `{count}`. `text.idle` is the selection readout's text when nothing is selected. Every string is rendered as text, never as markup.

**The legend.** The legend module draws the declared system's key rows under `headings.state`, then the planes under `headings.line` and the kinds under `headings.shape`, and offers its model as the `legend` service, which the page plate draws. Under Criterion Assessment the key rows are the three owner words, Favorable, Caution and Adverse, with no meaning line and no row for unassessed; a heading `Criterion Assessment`, the owner's, follows them, then one row per declaration (`.radial-legend-row.radial-legend-decl`), its label (`Criterion`, `Direction`, `Scope`, `Basis`, `Rule`) above its value. Its model then also carries `system`, the system's title, and `declarations`, `[{ field, label, value }]`. A Spectral State instance's legend and model are unchanged.

**A section for a module the instance does not list** is reported (`report().ignoredAdapterSections`) and ignored.

## Instance API

```text
on(type, fn) -> off       select · preview · focus · fit · placed · arrival · arrangement · membership · inspector ·
                          facets · export · theme · obstacle · empty · destroy; empty is a click or tap on empty
                          canvas with nothing selected; each event carries
                          its cause (load, resize, font, reader, explicit, frame for a framed
                          container's fit, module; system for a theme the operating system changed) and,
                          for a selection, how it arrived (pointer, keyboard, chooser, api, arrival,
                          inspector, search); an arrival's cause is load, or reader for a later hash change;
                          placed, a view the map made again for a new size, carries its basis (fit, frame,
                          node) and the node it keeps in view
select(id | null)         focus(id)          frame(id)          fit(cause?)          zoom(factor)
view()                    { k, x, y, atFit, fitCause, manual }; manual: the camera was last moved by the
                          reader or the page (a pan, a pinch, the wheel, a zoom control or zoom(), a keyboard
                          move or focus() that pans) rather than placed by the map
state()                   { view, selection: { locked, preview, focus }, recordContext: null | { linked: [shown ids] },
                          lod: { tier, deferred }, overlays, membership },
                          and each listed module's state under its name: chrome { arrangement, open, offered,
                          setAside }, inspector, facets, export, theme
service(name)             what a module offers the page: inspector, facets, export, legend; null after destroy
setMembership(leaves, relations)   a membership without the facets module: a Set of item ids and a Set of relation
                          keys (a relation's key is its index in the data's edges, model.relations[i].key), or null
report()                  { fit, covered, unresolved, unsupported, hiddenRefs, hidden, undrawnRelations,
                            obscuredHeads, ignoredAdapterSections, arrival, modules }; obscuredHeads lists
                            { key, from, to, plane } for each directed relation into a filled mark whose
                            head has no visible place, as drawn at mount
labels()                  the current label placement
model                     the assembled model; model.system is the declared semantic system (below)
project(id) · hits(x, y) · tap(x, y)    stage coordinates; tap() is the click's own resolution:
                          { action: select, id } · { action: choose, ids, shown } · { action: clear }
destroy()                 removes every listener, observer and element the instance made and
                          restores every attribute and text it changed; the host is left as it was
```

**The Fit report** (`report().fit`) is instance-owned: the helper's drawing clearance and, on top of it, the names under reserved chrome (`labelsUnder`), outside the canvas (`labelsOutside`), overprinting another (`overprinted`), the count lines whose letters meet a name (`obscured`), the open overlays covering the drawing (`covered`), what the population deferred and what yielded (`deferred`: `root`, `top`, `deeper`, `counts`, `offscreen`, `yielded`), the tier, the cause, whether the Fit reserved the declared optional edges (`option`), and `clear` when all of them are clear. It is the Fit as it was made: `report().covered` lists, live, the open overlays that lie over the drawing or its names now, so an overlay opened after the Fit (the inspector's sheet, a compact panel) is reported where the last Fit could not have seen it.

**The semantic system** (`model.system`, also on `DIAGRAM_RADIAL.contract.assemble(data).system`) is the one resolver every module reads a role's paint, word, key rows and export tokens through, so no module builds a token name of its own. It is frozen. Its members, for Spectral State · for Criterion Assessment:

```text
name, title      spectral-state, Spectral State · criterion-assessment, Criterion Assessment
roles            the declared states' roles, in order · favorable, caution, adverse, unassessed
keyed            false · true: drawn and exported with its key and declarations
declarations     null · five { field, label, value }: criterion, direction, scope, basis, rule
none             neutral · unassessed: the role that asserts nothing
rows             the key's rows { role, label, meaning }: each declared state · the three owner words, meaning null
tokenNames       --state-neutral, then each declared role's --state-<role> · the three --assessment-* tokens
roleOf(x)        a node's or record's role: its state, else neutral · its assessment, else unassessed
asserts(role)    any role but neutral · favorable, caution or adverse
paint(role)      var(--state-<role>), and var(--state-neutral) for neutral or none · var(--assessment-<role>) for an
                 assessed role, and var(--fg-1) for anything else
word(role)       the declared state's label, or null · Favorable, Caution or Adverse, or null
stateOf(x)       its declared state's row, or null · { role, label: the word, meaning: the criterion }, or null
```

**Version.** `DIAGRAM_RADIAL.VERSION` is `2`: the version that admits a declared semantic system.

**Instances.** Each mount has its own id prefix, markers, event bus, observers and listeners, all attached under one abort signal; no selection, focus, id or event crosses instances, and Escape acts inside its own host. After `destroy()`, the handle's actions do nothing. A failure while a mount is completing (a module that throws) tears down what it made, so the host is left as it was.

## Fails closed

| condition | error |
|---|---|
| a structural contract error | `radial contract <CODE>` |
| a `semantic` key that is not a plain object, or that names no admitted system | `radial contract SEMANTIC_SYSTEM` |
| a Criterion Assessment declaration missing, empty or not a string | `radial contract SEMANTIC_DECLARATION` |
| a key outside the declared system's set: in `semantic`, or, under Criterion Assessment, `states`, a node's or record's `state`, or the root's `assessment` | `radial contract UNKNOWN_FIELD` |
| under Criterion Assessment, a leaf with no assessment, or one outside favorable, caution, adverse and unassessed | `radial contract NODE_ASSIGNMENT` |
| under Criterion Assessment, an assessment on a container or an undrawn record | `radial contract ASSIGNMENT_SCOPE` |
| a Criterion Assessment instance, which is keyed, that does not list the legend module | `radial mount KEY_REQUIRED` |
| a Criterion Assessment role token, or `--fg-1`, that does not resolve in the host | `radial mount TOKENS` |
| an unknown layout setting or a bad value | `radial layout LAYOUT_OPTION` |
| a malformed label setting: a tier, a count template, the crowding value | `radial labels LABELS` · `TIERS` · `TIER` · `COUNT` · `CROWDING` |
| `diagrams-fit.js`, the pointer carrier, or an owner module missing; a listed module not loaded | `radial mount MODULE_MISSING <name>` |
| a listed module's required hook missing or malformed | `radial mount HOOK_MISSING <module.hook>` |
| a malformed chrome section: no panels, an unknown slot, a slot declared twice, an empty trigger word | `radial mount HOOK_MISSING` |
| a second URL-arrival owner in one document | `radial mount ARRIVAL_OWNER_CONFLICT` |
| a second instance declaring `theme: 'own'` in one document | `radial mount THEME_OWNER_CONFLICT` |
| a malformed inspector, facets or export section, or an export profile that leaves no figure area | `radial mount HOOK_MISSING` |
| under Criterion Assessment, a swatch facet with a `label` or a value outside the system's roles, a `diagram` export profile, or a page profile with `legend: false` | `radial mount HOOK_MISSING` |
| an inspector section the adapter returns malformed; under Criterion Assessment, a structured field's tone other than `muted` | `radial inspector SECTION`, when it is rendered |
| an export plate check fails; under Criterion Assessment, a page plate whose legend model carries no declarations | the export is refused with a brief `reason` (`key missing` for the key); nothing is downloaded |
| no stage slot, or a listed module's slot missing | `radial mount SLOT` |
| a host already carrying an instance | `radial mount HOST` |
| an unknown adapter section, text key, control or announcement name | `radial mount ADAPTER` |
| a malformed mount call; a module listed twice | `radial mount MOUNT` |
| an unresolved, unsupported or hidden reference | reported, not drawn |
| an unknown deep-link identifier | ignored, reported |

## What downstream supplies, and must not edit

A consumer supplies its data, its adapter (the domain words a reader sees, its tiers, its count lines, its legend headings, its inspector sections, its facets and search text, its plate words, and any override of the owner's generic control and announcement defaults), its page, and its mark in each theme. It vendors the owner files above byte-identical (and the foundation files its modules take), never hand-edited, and re-syncs them as one set. Generic machinery stays owner-side: a consumer keeps no second implementation of geometry, pointer or wheel input, Fit, label placement, selection, panel coordination, the inspector's rendering, search ranking, membership or plate export, and calls the documented API instead.

## Reference specimen

The preview's content is the public data of the **Consciousness + Free Will** research map ([`apexSolarKiss/ASK`](https://github.com/apexSolarKiss/ASK), `apex-solar-kiss/consciousness-free-will/atlas-data.public.js` at commit `04ad61051428a4153979ba5a8eb388f2eb8f743e`, 810,551 bytes, SHA-256 `19bda6eb0f59881ceb72dc007d611bca2d0ce208e670853e743201fd4fb215b9`), captured on 2026-10-02 and kept here byte for byte. The live research is a separate page the shell links to; the specimen loads nothing from it, and it does not follow it: the input is frozen, and the owner implementation is not.

**What is the research's, and what is the owner's.** The captured file is the input. `cfw-reference.adapter.js` is consumer code: it restates the research map's own projection (its region partition, its branch ladder, how a status reads as a recorded classification and which classifications assert a governed state, which relations sit on which plane) and declares every word, field, facet and plate line the reader sees. Its ordered classifier is kept whole: unclassified objects (admitted, untyped) and recorded ones assert no governed state and keep the wash, the condition legend gives them one entry, no asserted state, and the **recorded classification** facet, without swatches, still filters unclassified and recorded apart. Up to Spectral State v2.0, unclassified objects were painted in the retired external role; nothing about them is owned elsewhere, so the migration gives them no provenance, and the classifier's order still reads an object recorded as both unclassified and contested as unclassified. The shell is the page around it. Everything else is the generic modules, unchanged and loaded the same way by the two synthetic compositions. The modules do not load, read or name the reference files; the checks name them only to classify them, and two harnesses load the reference shell on purpose.

**The synthetic composition** (`diagram-interactive-radial.neutral.html`) runs the complete stack on a generated city park system, with other identifiers, fields, words and hierarchy, and its adapter serves every hierarchy shape the tests use. It is the pattern's second public expression, labeled synthetic, and it also serves development and tests; it is not a second application, engine or production use case, and it adds no second pattern contract.

**The visitor-facilities composition** (`diagram-interactive-radial.facilities.html`) runs the same stack, through the same adapter function, on the same synthetic park system under Criterion Assessment instead of Spectral State. Every place, position and relation is unchanged, so its geometry is the parks composition's. Its data declares the criterion, basic visitor facilities: a toilet and a drinking-water fountain, with its direction, scope, basis and rule, and each place's assessment is derived from the facilities list the generator already makes, with no new draw: favorable with both, caution with exactly one, adverse with neither, and a proposed place unassessed. The facilities lists are synthetic and declared exhaustive for the exercise, so a facility a place does not list is absent rather than unrecorded. Of its 220 places, 26 are favorable, 103 caution, 70 adverse and 21 unassessed; its 28 containers and 2 records take no assessment. Its adapter turns the status facet into the assessment facet, which takes the owner's words, and its export offers the page plate only, named `radial-facilities`. Its stylesheets load in Criterion Assessment's own order. It is the pattern's third public expression, labeled synthetic; like the second, it is not a second application, engine or production use case, and it adds no second pattern contract. Its criterion and every assignment are the composition's, not the owner's.

## Checks

```bash
node tests/radial-contract.test.mjs                 # contract, layout and label-solver controls
node tests/radial-behavior.mjs                      # the browser behavior harness (headless Chrome)
node tests/radial-stack.mjs                         # the complete stack: inspector, facets, export, theme, the three compositions
node tests/radial-export.mjs                        # the export plates in depth
node tests/fill-paint-engines.mjs                   # the fill paint, frames, focus and arrowheads in both engines
node tools/check-radial-neutrality.mjs --self-test  # the neutrality check's own controls
node tools/check-radial-neutrality.mjs              # the owner allowlist; add --deny FILE for a consumer's tokens
node tools/gen-radial-specimen.mjs --check          # the two specimen sources are current
node tools/sync-diagram-shared.mjs --check          # the pointer mirror equals its canonical
```

The neutrality check reads the reusable machinery only; example content (the three shells, the two synthetic sources and their adapter, the specimen generator) is excluded by declared path, and the reference files are classified by role, because example content carries its own subject's words. The machinery must name nothing the example content defines: no file of it and no global it assigns. Abstraction is shown by behavior: renaming every identifier, label, kind and plane leaves the geometry unchanged, and the same layout runs shallow, ragged, deeper, flat and capacity hierarchies.

**Not claimed.** The pattern makes no legibility claim at its tested limits, and no accessibility or compliance conformance claim ([`README.md` §Accessibility and compliance scope](../../README.md#accessibility-and-compliance-scope)). The keyboard path, the live region, the skip link and the chooser are functional behavior, tested as behavior.
