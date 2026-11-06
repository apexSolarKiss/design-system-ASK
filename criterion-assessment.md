# Criterion Assessment

A semantic state-color **profile** under the Spectral State family. It answers one question: **how does this characteristic serve the stated criterion?** Defined in [`criterion-assessment.css`](criterion-assessment.css); rendered visual key and worked table in [`criterion-assessment.html`](criterion-assessment.html). Its table application is drawn by the document register's comparison table, in [`surface-document.css`](surface-document.css).

It is a **sanctioned profile, not a separate palette and not a change to Spectral State.** Spectral State's eight-role vocabulary is unchanged. This profile **reuses three Spectral State values by reference** and adds no value of its own.

> **Status: v0.1.** Authorized by ASK source-of-intent (2026-11-05) as a shared capability, with colored rails selected for its table application. The role list may firm up as the profile sees more use.

## The four roles

| Assessment meaning | Visual implementation | Relationship |
| --- | --- | --- |
| `favorable` | value of `--state-earned` | visual-role mapping |
| `caution` | value of `--state-structural` | visual-role mapping |
| `adverse` | value of `--state-deflated` | visual-role mapping |
| `unassessed` | no color | no assessment asserted |

- **Favorable:** the characteristic supports the declared criterion.
- **Caution:** it is conditional, mixed or intermediate against that criterion. It is not a claim of danger.
- **Adverse:** it works against that criterion.
- **Unassessed:** no criterion-based judgment is asserted. It is not a neutral rating, a warning or a gray badge: nothing is drawn.

**Each rail takes its color's shared paint.** How a color is painted as a rail belongs to the surface treatments' **rail paint** ([`surface-treatments.css`](surface-treatments.css), RAIL PAINT), not to this profile: the same color drawn as a rail in the same theme takes the same paint, whichever meaning draws it. This profile binds each role to its color's paint and sets no dose of its own. Favorable and adverse keep the plain 2px stroke, as a review range's green and red rails do. Caution's yellow, Spectral State's recorded brightness watch-point on the light field, all but disappears as a bare 2px rail on the light lavender ground, so in light its paint adds a same-color ring. The ring is paint rather than layout, and no text moves. Its color is unchanged, and every rail in dark keeps the plain stroke.

**Labels stay assessment labels.** A consuming surface keeps **Favorable**, **Caution** and **Adverse**. It never relabels them `earned`, `structural` or `deflated` because a color value is shared: the reused values are visual-role mappings, not semantic aliases.

## What it is not

The ASK semantic profiles answer different questions, and a shared color never makes their meanings interchangeable:

| Profile | The question it answers |
| --- | --- |
| [Spectral State](spectral-state.md) | What is the state of an architectural element? |
| [Evidence State](evidence-state.md) | What does current evidence show about an assumption? |
| [Review Semantics](review-semantics.md) (Review State) | What review decision was recorded at this scope? |
| **Criterion Assessment** | How does this characteristic serve the stated criterion? |

- **Favorable is not accepted.** An accepted item records a decision; a favorable one serves a criterion.
- **Favorable is not supported.** A supported disadvantage is still adverse.
- **An assessment is not an endorsement.** A favorable result on one criterion says nothing about another, or about the option as a whole.

## The criterion is the author's

This profile owns each role's meaning and its presentation, binding each role to a color and to that color's shared rail paint. The consuming author owns the **criterion** each row is judged against and every **assignment**, and records them where the surface keeps its decisions. A color token supplies no judgment.

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
| Placement | Inside the cell, in the lane each body cell outside the first column reserves from its column's content edge, where that column's header begins: a 2px stroke beginning on that edge, 12px clear of the text. Never in the gutter before the column. In a legend-led table a rated figure may instead sit in a value field (below): its rail sits 12px before the field, nearer the figure, and never begins before the content edge. In light, caution's stroke takes its color's 1px ring, painted 1px beyond the stroke on every side. |
| Height | The wrapper's own height, wrapped lines included; caution's light ring adds 1px at each end. Never the row's, never through the detail below. In a legend-led table the word takes no line, so the rail is as tall as the summary or figure alone, except under forced colors. |
| Ends | Straight and plain: no cap, dot, arrow or glow. |
| Surface and type | The ordinary table surface, rules and text foreground. No fill, tint, backplate or colored cell border. |
| Alignment | Assessed and unassessed cells keep the same lane, so a rail never moves text. In a numeric cell the rail begins on the column's content edge, like the column's other rails, and the figures keep the end. In a value field the figures keep the end too, and each column's rails in the group share one line, set by the group's template rather than by each figure's width. |
| Unassessed | No wrapper, no rail, no word. |
| Words | The word that names the assessment sits inside the wrapper in an ordinary text role, the metadata role in the specimen, marked `.doc-compare-word`. By default it is shown beside the rail, so the meaning never depends on color. In a legend-led table the key names each rail's color once, and the words stay in their cells as text for assistive technology, drawing nothing: a sighted reader then reads each assessment from its rail's color against the key, and favorable and adverse differ mainly in hue. Where a reader may not tell the hues apart, or the table may print in monochrome, keep the words. Under forced colors, where every rail takes one system color, a legend-led table falls back to showing its words, its figures' rails on the content edge. Never hover alone. |
| Several judgments | One wrapper per judgment, each labeled. Never one rail over contradictory judgments. |
| Scroll | The rail, the summary and the detail move together inside the table's box. |
| Print | The stroke is a border, which browsers print by default; caution's light ring is a shadow, which a print without background graphics drops. A shown word carries the meaning where color does not print; a legend-led table's words do not print. Print is not yet rendered in the owner's checks. |

A **key** (`ul.doc-compare-key`) lists the assessments a table uses, each item a wrapper holding its word, so the key draws the cells' rail. The rail itself is decorative to assistive technology: it is generated content with no text.

**Two presentations of the words.** A table shows its words beside its rails unless it declares `table.doc-compare-table.doc-compare-legend-led`. Then its key, directly after the table's box, names the assessments, and each `.doc-compare-word` stays in its cell as text that takes no line and draws nothing. The word is its wrapper's last child and holds no link or control; one that does stays shown, and a browser without `:has()` shows every word. Under forced colors the table falls back to showing its words. A legend-led table without its key is a defect.

**A value field, for rated figures.** In a legend-led table a rated figure's wrapper may take `data-value-field`, a template of the widest value its group shows, such as `"0.00"` or `"-00.0%"`. The wrapper then sits at the column's end, as wide as that template on the column's tabular figures, or as its own figure where that is wider, and its rail sits 12px before it. Every wrapper in the group carries the same template, so their fields share one width and each column's rails share one line. The figure takes the cell's type; a template narrower than its figure is an authoring defect, since that field widens and its rail leaves the line. The field never reaches past the column's content edge: in a column too narrow for it, it fills the column and the rail begins on that edge. In an auto-sized table the template also sets the column's least width, so that happens only where a fixed layout or a declared width makes the column narrower. In a table that shows its words, and under forced colors, the template is ignored and the rail keeps the content edge.

**It is not the labeled range.** The labeled range's scope rail sits in the outer margin and admits only neutral and review colors. A comparison rail sits inside its cell and admits only this profile's. Where the two draw the same color, green or red, they take the same paint, in different places. A cell that also carries a review or evidence mark keeps that mark whole: its own box or marker, its own color and its own scope.

## Tiers

- **Tier 1 (identity-free):** the `--assessment-*` role names and the `data-assessment` vocabulary.
- **Tier 2 (ASK design language):** the three values, inherited from [Spectral State](spectral-state.md)'s Tier 2 by reference.
- **No Tier 3.** This profile carries no instance identity.

## How to use it

1. Load `colors_and_type.css`, then `spectral-state.css`, then `criterion-assessment.css`. For the table application, also load `surface-panel.css`, `surface-document.css` and `surface-treatments.css`, in that order, ahead of this file, all from one design-system commit: the document register draws the rails' geometry and the treatments their paint.
2. Declare the comparison: `table.doc-table.doc-compare-table` directly inside a named `.doc-table-scroll` box.
3. Wrap each assessed summary and its word in `.doc-compare-assessed` with one `data-assessment` value, the word marked `.doc-compare-word`. Leave unassessed summaries unwrapped.
4. Give the table a key. Keep the words beside the rails, or declare `doc-compare-legend-led` on the table to let the key name them; there, a group of rated figures may share a value field, each wrapper carrying the same `data-value-field` template.
5. Record each row's criterion and each assignment's basis in the consumer's own decision record.

## What is upstream vs consumer-local

- **Upstream (this repo):** the four roles, their meanings and labels, the reuse-by-reference mapping, the table application's binding of each role to its color and that color's rail paint, the comparison table's geometry in the document register, and the rail paint in the surface treatments.
- **Consumer-local:** the criteria, every assignment and its basis, the table's content and columns, and where the table sits in its page.
