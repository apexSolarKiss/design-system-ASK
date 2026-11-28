# Criterion Assessment

A semantic state-color **profile** under the Spectral State family. It answers one question: **how does this characteristic serve the stated criterion?** Defined in [`criterion-assessment.css`](criterion-assessment.css); rendered visual key and worked table in [`criterion-assessment.html`](criterion-assessment.html). Its table application is drawn by the document register's comparison table, in [`surface-document.css`](surface-document.css), its filled-node application by the surface treatments' fill paint, and its keyed label and bounded assessed range by their bordered label and labeled range, in [`surface-treatments.css`](surface-treatments.css).

It is a **sanctioned profile, not a separate palette and not a change to Spectral State.** This profile **binds three of the foundation's physical values directly**, green, yellow and red, the same physical colors Spectral State and the other profiles bind, and adds no value of its own.

> **Status: v0.3 // the keyed label and the bounded assessed range (ASK, 2026-11-25).** Each role binds its physical value directly from the foundation, `favorable` green, `caution` yellow and `adverse` red, so `caution` no longer reads Spectral State's `structural`, which is now violet. Outside a table and a multi-axis review annotation, an assessment may be named on a keyed bordered label, `.assessment-label` with `data-assessment`, whose words are exactly `Assessment // <Role>`, and a labeled range may be one assessment of one contiguous passage under one criterion, opened by an **assessment record** that names the criterion, its direction, the scope assessed and the basis (An assessment in words and A bounded assessed range, below). This admits what v0.2 excluded: a labeled range may now take an assessment, through its record. The table application and the filled node are unchanged. Re-sync this file with [`surface-treatments.css`](surface-treatments.css) and [`colors_and_type.css`](colors_and_type.css) from the same owner commit.
>
> **v0.2 // the filled-node application.** A node in an assessment-bearing figure the consumer composes may be filled in its role through [`surface-treatments.css`](surface-treatments.css)'s FILL PAINT: each role names its ink, `--assessment-<role>-ink`, favorable on green, caution on yellow and adverse on red. Each filled node shows its word, or the figure has a key, and an unassessed node takes no assessment fill (The filled-node application, below). The table application stays rail-only, and its rails bind the rail paint by color, green, yellow and red, with no change to what they draw. A labeled range takes neutral, a review value or a keyed state or evidence value, never an assessment. The role values are unchanged. Re-sync this file with `surface-treatments.css` from the same owner commit.
>
> **v0.1.** Authorized by ASK source-of-intent (2026-11-05) as a shared capability, with colored rails selected for its table application. The role list may firm up as the profile sees more use.

## The four roles

| Assessment meaning | Physical value | Shared family |
| --- | --- | --- |
| `favorable` | green, `--ask-state-value-green` | affirmative |
| `caution` | yellow, `--ask-state-value-yellow` | qualified |
| `adverse` | red, `--ask-state-value-red` | negative |
| `unassessed` | no color | no assessment asserted |

- **Favorable:** the characteristic supports the declared criterion.
- **Caution:** it is conditional, mixed or intermediate against that criterion. It is not a claim of danger.
- **Adverse:** it works against that criterion. Adverse under one criterion does not reject the whole option.
- **Unassessed:** no criterion-based judgment is asserted. It is not a neutral rating, a warning or a gray badge: no assessment is drawn.

**Each rail takes its color's shared paint.** How a color is painted as a rail belongs to the surface treatments' **rail paint** ([`surface-treatments.css`](surface-treatments.css), RAIL PAINT), not to this profile: the same color drawn as a rail on the same field takes the same paint, whichever meaning draws it. This profile binds each role to its color's paint and sets no dose of its own. Every role keeps the plain 2px stroke, as a review range's green and red rails do, and a bounded assessed range takes the same paint in the outer margin. Until Spectral State v1.2, caution's deeper light yellow all but disappeared as a bare rail on the light lavender, and its paint added a same-color ring there; with one value per color in both themes the brighter yellow reads as a plain stroke on both fields, and the ring is retired.

**Labels stay assessment labels.** A consuming surface keeps **Favorable**, **Caution** and **Adverse**. It never relabels them `earned`, `partial` or `deflated`, or by an evidence or review word, because a color value is shared: the shared physical values are a shared family — green affirmative, yellow qualified, red negative, each within the question its own system asks — never a shared meaning.

## What it is not

The ASK semantic profiles answer different questions, and a shared color never makes their meanings interchangeable:

| Profile | The question it answers |
| --- | --- |
| [Spectral State](spectral-state.md) | What is the state of an architectural element? |
| [Evidence State](evidence-state.md) | What does the available evidence support about a scoped claim? |
| [Review Semantics](review-semantics.md) (Review State) | What review decision was recorded at this scope? |
| **Criterion Assessment** | How does this characteristic serve the stated criterion? |

- **Favorable is not accepted.** An accepted item records a decision; a favorable one serves a criterion.
- **Favorable is not supported.** A supported disadvantage is still adverse.
- **An assessment is not an endorsement.** A favorable result on one criterion says nothing about another, or about the option as a whole.

## The criterion is the author's

This profile owns each role's meaning and its presentation, binding each role to a color, to that color's shared rail paint and to its fill ink. The consuming author owns the **criterion** each row, node or passage is judged against and every **assignment**, and records them where the surface keeps its decisions. An assessment is authored under its declared criterion: a color generates no judgment, and the words in a cell, such as "fast" or "limited", generate no color.

Every assessed row declares, at least in the consumer's own record (where the ratings are a source author's own, the criterion and its direction are the author's, as the source labels the row, and the record says the ratings are carried):
- **its criterion and direction:** what is favorable here, such as less set-up time and cost;
- **its comparison scope:** the options and the source the row compares;
- **its basis:** where each assignment comes from.

The assignment rules generalize:
- **"High", "full" and "low" are not lookup keys.** Full access may serve one criterion; full liability may work against another.
- **Missing information stays unassessed.** Caution is a stated tradeoff or an intermediate result, not an unknown.
- **An author's own ratings are carried as they are.** Where a source records its author's assessment of each cell — in its words, a legend, or the color of the cell — the translation carries each one into its role and does not recompute it from the supporting text. It carries those cells only: an author's rating of one value sets no threshold for another.
- **Thresholds are declared, not inferred.** A numeric cell is assessed only where its author rated it, or under a rule its author supplies. Neither the best value in view nor a color whose author is unknown sets a rating, and an author's rating of some cells sets no threshold for others.
- **Compound criteria need a source summary or a declared combination rule.** Hidden sub-scores are never averaged.

## The table application

In a comparison table (the register's **COMPARISON TABLE** composition, `table.doc-compare-table` in a document table), each assessed summary sits in a wrapper that draws **one thin rail in the cell's lane**:

```html
<td class="doc-compare-cell">
  <div class="doc-compare-assessed" data-assessment="caution">
    <p class="doc-compare-summary">moderate</p>
    <p class="doc-meta doc-compare-word">caution</p>
  </div>
  <ul class="doc-compare-facts">
    <li>steps: a repository, a deployment and a domain</li>
    <li>cost: a hosting plan</li>
  </ul>
</td>
```

| Concern | Rule |
| --- | --- |
| Scope | The rail marks the wrapper: the assessed summary or figure, and its word. Never a row, a column or a table. |
| Placement | Inside the cell, in the lane each body cell outside the first column reserves from its column's content edge, where that column's header begins: a 2px stroke beginning on that edge, 12px clear of the text. Never in the gutter before the column. In a legend-led table a rated figure may instead sit in a value field (below): its rail sits 12px before the field, nearer the figure, and never begins before the content edge. |
| Height | The wrapper's own height, wrapped lines included. Never the row's, never through the detail below. In a legend-led table the word takes no line, so the rail is as tall as the summary or figure alone, except under forced colors. |
| Ends | Straight and plain: no cap, dot, arrow or glow. |
| Surface and type | The ordinary table surface, rules and text foreground. No fill, tint, backplate or colored cell border. |
| Alignment | Assessed and unassessed cells keep the same lane, so a rail never moves text. In a numeric cell the rail begins on the column's content edge, like the column's other rails, and the figures keep the end. In a value field the figures keep the end too, and each column's rails in the group share one line, set by the group's template rather than by each figure's width. |
| Unassessed | No wrapper, no rail, no word. |
| Words | The word that names the assessment sits inside the wrapper in an ordinary text role, the metadata role in the specimen, marked `.doc-compare-word`. By default it is shown beside the rail, so the meaning never depends on color. In a legend-led table the key names each rail's color once, and the words stay in their cells as text for assistive technology, drawing nothing: a sighted reader then reads each assessment from its rail's color against the key, and favorable and adverse differ mainly in hue. Where a reader may not tell the hues apart, or the table may print in monochrome, keep the words. Under forced colors, where every rail takes one system color, a legend-led table falls back to showing its words, its figures' rails on the content edge. Never hover alone. |
| Several judgments | One wrapper per judgment, each labeled. Never one rail over contradictory judgments. |
| Scroll | The rail, the summary and the detail move together inside the table's box. |
| Print | The stroke is a border, which browsers print by default. A shown word carries the meaning where color does not print; a legend-led table's words do not print. Print is not yet rendered in the owner's checks. |

A **key** (`ul.doc-compare-key`) lists the assessments a table uses, each item a wrapper holding its word, so the key draws the cells' rail. The rail itself is decorative to assistive technology: it is generated content with no text.

**Two presentations of the words.** A table shows its words beside its rails unless it declares `table.doc-compare-table.doc-compare-legend-led`. Then its key, directly after the table's box, names the assessments, and each `.doc-compare-word` stays in its cell as text that takes no line and draws nothing. The word is its wrapper's last child and holds no link or control; one that does stays shown, and a browser without `:has()` shows every word. Under forced colors the table falls back to showing its words. A legend-led table without its key is a defect.

**A value field, for rated figures.** In a legend-led table a rated figure's wrapper may take `data-value-field`, a template of the widest value its group shows, such as `"0.00"` or `"-00.0%"`. The wrapper then sits at the column's end, as wide as that template on the column's tabular figures, or as its own figure where that is wider, and its rail sits 12px before it. Every wrapper in the group carries the same template, so their fields share one width and each column's rails share one line. The figure takes the cell's type; a template narrower than its figure is an authoring defect, since that field widens and its rail leaves the line. The field never reaches past the column's content edge: in a column too narrow for it, it fills the column and the rail begins on that edge. In an auto-sized table the template also sets the column's least width, so that happens only where a fixed layout or a declared width makes the column narrower. In a table that shows its words, and under forced colors, the template is ignored and the rail keeps the content edge.

**It is not the bounded assessed range.** A comparison rail sits inside its cell, in its lane, and marks one summary or figure; it takes no assessment record. A bounded assessed range (below) sits in the outer margin beside a passage, outside a table. Where a comparison rail and a labeled range draw the same color, green, yellow or red, they take the same paint, in different places. A cell that also carries a review or evidence mark keeps that mark whole: its own box or marker, its own color and its own scope.

## An assessment in words

Outside a table and a multi-axis review annotation, an assessment may be named in words on the surface treatments' **bordered label** ([`surface-treatments.css`](surface-treatments.css), BORDERED LABEL): `.assessment-label` on a `.surface-bordered-label`, `.doc-label` in a document, with `data-assessment`. Its words are exactly the axis and the role's word, `Assessment // Caution`, so a green edge never reads as an earned state, supported evidence or an accepted review. Its edge takes the role's value.

- **Words, not a control.** The label is inert and unfilled: no ink, hover, press or focus, and never a status chip, a button or a link.
- **Never alone.** The label heads an assessment record, below, which keeps the criterion in view.
- **Unassessed takes no keyed label.** It asserts no judgment.
- **Not inside Review Semantics.** The annotation composition admits review, evidence and state marks; a keyed assessment label never sits in its rows, items, lists or notes.
- **The class, the attribute and the words together.** `data-assessment` without `.assessment-label` keys no label, and a label whose words do not name its axis and role is not an assessment label.

## A bounded assessed range

One assessment, under one criterion, of one contiguous passage. The range is the surface treatments' **labeled range**, `.surface-labeled-range` (LABELED RANGE), whose first child is the **assessment record**, `.assessment-record`. The record's first child is the keyed label, and four fields follow it, each a `.assessment-field` with `.doc-meta` and `data-field`, its words led by its name:

| Field | `data-field` | Its words begin | What it names |
| --- | --- | --- | --- |
| criterion | `criterion` | `criterion // ` | the criterion judged against |
| direction | `direction` | `direction // ` | which way serves it, e.g. lower is better |
| scope | `scope` | `scope // ` | the target or passage assessed |
| basis | `basis` | `basis // ` | what the judgment rests on |

The range's scope rail takes the role's value and its color's rail paint (RAIL PAINT), green, yellow or red, and ends after the range's last block, before the text that follows. The record lays out on one wrapping line, and its fields keep the document's metadata role.

```html
<!-- example — illustrative: one assessment of one passage, under one criterion -->
<div class="doc-group surface-labeled-range">
  <div class="assessment-record">
    <span class="doc-label surface-bordered-label assessment-label" data-assessment="caution">Assessment // Caution</span>
    <span class="assessment-field doc-meta" data-field="criterion">criterion // set-up work before a reader can open it</span>
    <span class="assessment-field doc-meta" data-field="direction">direction // less work is better</span>
    <span class="assessment-field doc-meta" data-field="scope">scope // the hosted-site option, as described here</span>
    <span class="assessment-field doc-meta" data-field="basis">basis // the steps below, as the author counts them</span>
  </div>
  <p class="doc-body">A hosted site needs a repository, a deployment and a domain before anyone can read it.</p>
</div>
```

| Concern | Rule |
| --- | --- |
| One judgment | One range carries one assessment under one criterion over one contiguous passage. |
| Several criteria | Separate records and separate ranges, never one record naming two criteria. |
| Nesting | Ranges never nest or overlap. |
| The record | Always first, the keyed label first inside it, then criterion, direction, scope and basis, each in words. A record that omits a field is not an assessment record. |
| The rail | Beside the passage only, ending at the range's boundary. Never through the text that follows. |
| Unassessed | No record, no label and no range. |
| Where it applies | A passage in a document or report, outside a table and a multi-axis review annotation. A comparison table keeps its own cell-local rails and takes no record. |
| Authorship | The author assigns the role under the declared criterion and records the basis; the color supplies no judgment, and the record is how a reader checks it. |

`tools/role-conformance.js` checks the record's anatomy and the range's rail (C13 and C14).

## The filled-node application

In an **assessment-bearing figure** the consuming surface composes, a node judged against the figure's criterion is filled in its role, through the surface treatments' **fill paint** ([`surface-treatments.css`](surface-treatments.css), FILL PAINT): the node carries `.surface-fill` with the role's value and its ink, `--assessment-<role>-ink`, and any text on it carries `.surface-fill-ink`. Each ink is FILL PAINT's for the role's color, keyed by that color: favorable on green, caution on yellow, adverse on red. This profile binds each role to its color's ink and defines no ink value; it ships no node selector, so the figure, its geometry and its layout are the consumer's.

```css
/* example — consuming surface; each assessed node also carries .surface-fill */
.node[data-assessment="favorable"] { --surface-fill-color: var(--assessment-favorable); --surface-fill-ink: var(--assessment-favorable-ink); }
.node[data-assessment="caution"]   { --surface-fill-color: var(--assessment-caution);   --surface-fill-ink: var(--assessment-caution-ink); }
.node[data-assessment="adverse"]   { --surface-fill-color: var(--assessment-adverse);   --surface-fill-ink: var(--assessment-adverse-ink); }
```

| Concern | Rule |
| --- | --- |
| Words | Each filled node shows its word, on the node or beside it, or the figure carries a key that names each fill. The assessment never depends on color alone. |
| Unassessed | No assessment fill and no word. The node keeps the figure's own node for one that asserts nothing: FILL PAINT's neutral shape (`.surface-fill--neutral`) where every node of the figure is a filled shape, or the figure's own unfilled node where its nodes are outlines, as the peer pattern's ring is, or the figure's own structural wash where a mark that asserts nothing is washed, as the interactive radial's is; never a gray or a fourth color standing for a rating. |
| One judgment | One node takes one assessment, against the figure's declared criterion. |
| Where it applies | A figure the consumer composes, a declared Criterion Assessment example of `diagram-static-peer`, whose engine draws it, and the leaves of a `diagram-interactive-radial` instance that declares Criterion Assessment, whose modules draw them. Never a table cell, which stays rail-only, and never the structural diagram scaffolds (`diagram-static-H`, `-V`, `-SEQ` and `-FLOW`), which FILL PAINT excludes. |

**In the peer pattern.** A declared Criterion Assessment example of [`diagram-static-peer`](patterns/diagram-static-peer/README.md#declared-semantic-examples) applies this application through its engine, which draws FILL PAINT's recipe itself in rules scoped to the plate rather than carrying `.surface-fill`. Each assessed node's ring is filled in its role's value, with its boundary in the same value and its letter in the role's ink. Its figure and word sit beside it in the plate's ink. The example's criterion, direction, scope, basis and threshold rule are drawn in a band under the key, and the plate is drawn keyed only. An unassessed node keeps the neutral ring and shows only a figure it gives, as plain text. On a page the engine reads `--assessment-<role>` and `--assessment-<role>-ink`, and its exporter resolves the same tokens for a standalone file. The example's criterion and every assignment are its author's.

**In the radial pattern.** A [`diagram-interactive-radial`](patterns/diagram-interactive-radial/README.md#data-contract) instance that declares Criterion Assessment, with its criterion, direction, scope, basis and rule, in its data's `semantic` key, applies this application through its modules, which read every role through one resolver and take FILL PAINT through `.surface-fill`. Each assessed leaf's mark is filled in its role's value, with its boundary in the same value; it carries no text, so it takes no ink. The same value paints every channel that names the role: the legend's row beside its word, the chooser's swatch beside its word, a swatch facet's option with the owner word, the inspector's dot, beside its word and the criterion, and the inspector panel's tint. The instance is drawn keyed only: its mount requires the legend, which draws the three words, then the system's name and the five declarations, and its export draws the page plate only, with that key, and refuses the figure-only plate. Only a leaf takes an assessment, and none is inferred for a container. An unassessed leaf, a container and the root keep the pattern's structural wash, with no word, no key row and no facet option. On a page the modules read `--assessment-<role>`, and the mount fails closed where one does not resolve. The instance's criterion and every assignment are its author's.

## Tiers

- **Tier 1 (identity-free):** the `--assessment-*` role names, the `data-assessment` vocabulary, the `.assessment-label` class and the assessment record's `.assessment-record`, `.assessment-field` and `data-field` names.
- **Tier 2 (ASK design language):** the three values, the foundation's green, yellow and red, bound directly.
- **No Tier 3.** This profile carries no instance identity.

## How to use it

1. Load `colors_and_type.css`, then `surface-panel.css` and `surface-treatments.css` (whose FILL PAINT supplies the inks this profile binds, and whose bordered label and labeled range draw the keyed label and the bounded assessed range), then `spectral-state.css`, then `criterion-assessment.css`, all from one design-system commit, in the order the stylesheet's contract gives. For the table application, also load `surface-document.css`, after `surface-panel.css` and ahead of `surface-treatments.css`: the document register draws the rails' geometry and the treatments their paint.
2. Declare the comparison: `table.doc-table.doc-compare-table` directly inside a named `.doc-table-scroll` box.
3. Wrap each assessed summary and its word in `.doc-compare-assessed` with one `data-assessment` value, the word marked `.doc-compare-word`. Leave unassessed summaries unwrapped.
4. Give the table a key. Keep the words beside the rails, or declare `doc-compare-legend-led` on the table to let the key name them; there, a group of rated figures may share a value field, each wrapper carrying the same `data-value-field` template.
5. For a figure, fill each assessed node with `.surface-fill`, `--assessment-<role>` and `--assessment-<role>-ink`, and show each node's word or give the figure a key. Leave an unassessed node without an assessment fill or word.
6. For a passage outside a table, open a `.surface-labeled-range` with an `.assessment-record`: the keyed label `Assessment // <Role>` first, then the criterion, direction, scope and basis fields. One record per criterion; ranges never nest or overlap.
7. Record each row's, node's or passage's criterion and each assignment's basis in the consumer's own decision record.

## What is upstream vs consumer-local

- **Upstream (this repo):** the four roles, their meanings and labels, each role's binding to a physical value, the table application's binding of each role to its color and that color's rail paint, the filled-node application's binding of each role to its color and that color's fill ink, the keyed label's and the bounded assessed range's bindings and the assessment record's anatomy, the comparison table's geometry in the document register, and the rail paint in the surface treatments.
- **Consumer-local:** the criteria, every assignment and its basis, the table's content and columns, each assessed passage and its record's words, and where they sit in the page.
