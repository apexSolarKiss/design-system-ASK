# Review Semantics

An opt-in composition for documents that are reviewed. It keeps five questions apart, so that answering one never answers another, and it has two facets: **Review State**, a sanctioned profile under the Spectral State family, and **Annotation**, the inert marks that attach review, evidence, state and basis to the exact content they concern. Defined in [`review-semantics.css`](review-semantics.css); rendered visual key in [`review-semantics.html`](review-semantics.html).

Review State is **a sanctioned profile, not a separate palette and not a change to Spectral State or Evidence State.** It reuses existing values by reference, keeps its own labels and meanings, and mints no value. Spectral State's eight roles and Evidence State's five are unchanged.

> **Status: v0.1 // first version.** Opt-in. A consumer takes it through its own gates; no existing document is recolored by its arrival.

## Five questions, five owners

| Question | Answer | Owner | Channel in this composition |
| --- | --- | --- | --- |
| What is this passage doing? | Document role | the document register (`surface-document.css`) | its rail, panel or text role, unchanged |
| Where did it come from? | Basis | no color owner | a `Basis` key (`.doc-label`) and its value (`.doc-meta`) |
| What does the evidence support? | Evidence State | [`evidence-state.md`](evidence-state.md) | a filled dot; for not yet testable, a hollow dashed dot and a dashed rail |
| What judgment is asked or made, about what, by whom, at which scope? | Review State | this module | the shared bordered label's outline |
| What condition is this architectural element in? | Spectral State | [`spectral-state.md`](spectral-state.md) | a filled square |

The channels follow [`three-functions.md`](three-functions.md) §Coexistence: state takes the separate state marker, evidence the evidence marker, and review the outline. They are this composition's channels, **not compulsory replacements** for other presentations. An Evidence State or Spectral State presentation authored outside this composition, such as a diagram's node fill or a consumer's own evidence assignment, stays governed by its owner.

## Review State // the five roles

| Review meaning | Words | Visual implementation | Relationship |
| --- | --- | --- | --- |
| `proposed` | Proposed, or Correction requested | value of `--ask-emphasis-magenta` | a candidate, not yet decided; Spectral `proposed`'s hue, not its value |
| `open` | Open question | value of `--state-held` | correspondence: a named open question. Evidence `unresolved` shares the value |
| `accepted` | Accepted | value of `--state-earned` | a recorded decision to adopt or permit, at its scope |
| `declined` | Declined | value of `--state-deflated` | a recorded decision not to adopt or permit, at its scope |
| `none` | No decision recorded | value of `--fg-3` | no decision recorded |

**Accepted is green and Declined red; No decision recorded stays the faintest neutral.** An affirmative, a negative and an absent record differ at a glance, and the words still name each. Pending judgments, Proposed and Open question, keep their own hues.

**A shared value is not a shared meaning.** Accepted takes the value of Spectral `earned` and Evidence `supported`, and Declined that of `deflated`. A green outline says *accepted at this scope*; a green evidence dot says *supported by this evidence*. The outline, the key and the words say which question each mark answers. An accepted narrow scope is still a whole decision, a decline does not disprove a statement, and green never authorizes production.

**Labels stay review labels.** A surface keeps Proposed, Correction requested, Open question, Accepted, Declined and No decision recorded. It never relabels a review role by a Spectral or Evidence name because a value is shared, and never relabels an Evidence or Spectral role by a review name.

**Proposed and Correction requested share paint, not event identity.** A candidate submitted and a correction requested are different events, kept apart by their words and by who made the request. Correction requested is used only when someone has asked for existing words to change. Proposed alone never implies a defect.

**Proposed takes the emphasis magenta; Open question keeps a Spectral value.** Proposed is `#FF00FF` in both themes, the value a document's other magenta labels and rails already use, so a proposal never sits beside a near-identical second pink. A proposal and a thesis are told apart by their words, their place and their key, never by a difference in pink. Spectral's `proposed` keeps its own theme-calibrated magenta: the two Proposed roles share a word and a hue, not a value, and where both apply to one item the keyed list carries them, one key each. Open question stays `--state-held`, which is tealer than the emphasis cyan (`#00BEFF`).

## Annotation // the composition

- **Mark** // an inert annotation word: one review, evidence or state role, stated literally. `span.doc-mark.doc-label` with exactly one of `data-review`, `data-evidence` or `data-state`. Its words are the register's label role, which this module never restyles; its color sits only on its geometry. A review mark also carries `.surface-bordered-label`: its box and edge are the shared bordered label's, from `surface-treatments.css` — the same box as the emphasis chip and a neutral label — and this module supplies its color only. Evidence draws a 10px round dot and state a 10px square, with no outline, and neither carries `.surface-bordered-label`. A mark carries one role; a second fact takes a second mark.
- **Item** // one fact and its qualifier, kept together: a mark and the metadata that qualifies it (`.doc-meta`), or a basis key (`.doc-label`) and its value (`.doc-meta`). `.doc-annotation-item`, inside a row or a table cell. It wraps as a unit.
- **Annotation row** // the items that apply to one scope: the section after its heading, the block it follows, the range it opens, or the table cell it sits in. `.doc-annotations`, its items in one fixed order: state, basis, evidence, review. The row that opens a range leads with its review item, beside the top of the scope rail, and its state, basis and evidence items follow in that order. Each item opens on its own mark or key, so items need no separator.
- **Annotation list** // one item answering several questions at once, one keyed line per question, in the row's order. `dl.doc-annotation-list`, with `dt.doc-label` keys and `dd` values.
- **Annotation range** // the exact blocks one review judgment covers, where placement alone would leave its extent unclear: several blocks, a list, a quotation with the sentence that reads it, a panel, or one of several statements in a table cell. `.doc-annotation-range` with `.surface-labeled-range` (and usually `.doc-group`, for the run's flow). Its first child is the annotation row naming its one review judgment, which leads that row; the blocks it covers follow. Its scope rail is the shared labeled range's, from `surface-treatments.css`: one straight 2px stroke in the outer margin, outside the content edge, beginning beside the row and ending just past the last block it covers. This module supplies its color only, the review value of the judgment its row names. One judgment per range: a range holds no second review mark, so blocks judged otherwise are a sibling range of their own. Words inside a range whose judgment is pending take a passage mark, a narrower record of their own, and its note follows the range. A range is never nested, and never sits inside a list item, a railed passage, a separate surface or panel, a hierarchy level or an annotation note. The row's state, basis and evidence items apply to the range but never color its scope rail, and evidence and state never open a range.
- **Passage mark** // the exact words inside a block whose judgment is pending, proposed or open. `mark.doc-passage-mark` with `data-review`, in body text, naming its note among its `aria-describedby` ids. It is a tint of the review value at the passage dose: 18% in light, 26% in dark. A decided outcome takes no passage mark.
- **Annotation note** // the record a passage mark points to, set after the block and its row; it quotes the words it concerns. `.doc-annotation-note` on a `.doc-hierarchy` group. An evidence note whose role is not yet testable draws that role's dashed rail instead of the hierarchy rail.

## Composition rules

1. **A passage keeps its document role.** Accepting a synthesis leaves it a synthesis; challenging a quotation leaves it a quotation; a callout's rail does not change with its review state, and a framing panel's perimeter never changes color.
2. **Scope with the least structure that bounds it.** A row after a heading or block, an item in a cell, a list for one item answering several questions, a passage mark and a note for words inside a block. Where a judgment covers more than placement can bound, a range: several blocks, a list, a quotation with the sentence that reads it, a panel, or one of several statements in a cell. No rail or panel is added on the content to make scope, and typography, boldness or capitals never set it. Not every block needs a range: a single block whose row follows it needs none, and a whole document takes none.
3. **One edge, one meaning.** Within this composition, review and evidence never draw a rail on the content passage. A range's scope rail sits in the outer margin, outside the content edge where every passage rail sits, and answers only one question: which content a review judgment covers. Evidence and state never draw a range. The composition's one annotation rail is Evidence State's mandatory not-yet-testable dashed rail, drawn on an annotation note or a mark.
4. **The passage scope cue is the tint.** Beside the document's link underline, colored words that go nowhere can read as a link, so this composition marks words with a tint, never an underline, a text color or a rail. This is the composition's choice, not a general rule about underlines in documents.
5. **Panels take no inner note.** A framing, synthesis or emphasis panel keeps its whole contract; its note follows the panel.
6. **Not yet testable keeps its whole contract** in this composition: lavender-gray, a dashed rail, a hollow marker and the visible label. Inside a not-yet-testable note, the note's rail is the one rail.
7. **An ordinary question is a section, not a panel:** a heading plus an Open question mark. A proposed answer sits beside it, because a proposed answer is not an unanswered question.
8. **A mark is not a chip and not a control.** It never takes `.surface-emphasis-chip`, which names why a unit is emphasized and heads a panel, nor the compact action's classes or any interactive behavior. A review mark and the chip share one box, the bordered label, and differ in meaning, words and place: a chip heads a panel inside its perimeter, and a mark follows the content it concerns or opens a range outside it. The bordered label's small corner keeps an inert mark from looking like a control beside a compact action.
9. **Checks are neutral.** A named check and its result are plain metadata under a `Check` key, never a dot or an outline. A passed check approves nothing.

## The decision record

A shown decision is a whole record. It names what it concerns (object or version), who decided (actor or role) and its scope, and any condition where it is material. Consumers supply those values; the display reports an authority relation and never creates one. Color alone confers no evidence and no authority.

- **Origin survives adoption.** An accepted synthesis keeps *Basis: analyst synthesis*.
- **Faithful relocation does not reset a decision.** A statement carried unchanged into a later version keeps its acceptance; adoption changes neither its origin nor the evidence supporting it.
- **A missing record is no decision.** No decision recorded is shown only where the absence matters. It is not a refusal or an acceptance, and not a hold: a hold is an open question.
- **Scopes stay distinct.** A recorded acceptance for production may report that authorization. It is not permission to show a packet, and it is not adoption for a bounded trial; each is its own record, with its own mark.

## Applicability

Every rule here applies to elements carrying this module's classes: `.doc-mark`, `mark.doc-passage-mark`, `.doc-annotation-note`, `.doc-annotation-item`, `.doc-annotations`, `.doc-annotation-list` and `.doc-annotation-range`. A `data-review`, `data-evidence` or `data-state` attribute alone opts nothing in and paints nothing. Those attribute names already exist outside this composition: Evidence State's own consumer example paints `.node[data-evidence]`, and the `message-archive` pattern uses `data-state` with a vocabulary of its own.

## Checking

`tools/role-conformance.js` rule **C12** checks this composition where its classes appear: syntax (classes, attributes, vocabulary, a review mark's bordered label, a range's opening row, the one judgment that leads it and its shared class) and computed presentation (the outline's and the scope rail's color, the marker, rail and tint). Rule **C13** checks a review mark's box and edge as it checks every bordered label, and rule **C14** a range's scope rail, lane, host and clearance as it checks every labeled range. Neither judges semantic assignment, that is, whether an item's role is the right one; that stays with the author and the reviewer.

C12 compares a mark with its resolved role token. It does not independently establish that a local token rebinding is authorized. Adopted role bindings remain governed by this contract; a local exception requires the applicable explicit authorization.

## Tiers

- **Tier 1 (identity-free):** the five `--review-*` role names, the review vocabulary and the composition's class names. A stable vocabulary other ASK-family surfaces can reuse.
- **Tier 2 (ASK design language):** the reuse-by-reference mapping and the passage dose. Every color value is inherited from Spectral State or the foundation by reference; the dose is this module's own.
- **No Tier 3.** This profile carries no instance identity.

## How to use it

1. Load the foundation and the four register modules, then the state modules, then this file. The order is part of the contract, and `surface-treatments.css` is required: it draws a review mark's box and a range's scope rail:

   ```text
   colors_and_type.css → surface-panel.css → surface-text-link.css →
   surface-document.css → surface-treatments.css → spectral-state.css →
   evidence-state.css → review-semantics.css
   ```

2. Mark content after it, at its scope:

   ```html
   <p class="doc-body">The frame keeps two props or fewer.</p>
   <div class="doc-annotations">
     <span class="doc-annotation-item"><span class="doc-label">Basis</span><span class="doc-meta">owner-stated</span></span>
     <span class="doc-annotation-item"><span class="doc-mark doc-label surface-bordered-label" data-review="accepted">Accepted</span><span class="doc-meta">v3 · owner · this copy</span></span>
   </div>
   ```

3. For words inside a block, pair a passage mark with its note:

   ```html
   <div class="doc-group">
     <p class="doc-body">The frame keeps <mark class="doc-passage-mark" data-review="proposed" aria-describedby="n1">two props or fewer</mark>.</p>
     <div class="doc-hierarchy doc-group doc-annotation-note" id="n1">
       <div class="doc-annotations">
         <span class="doc-annotation-item"><span class="doc-mark doc-label surface-bordered-label" data-review="proposed">Correction requested</span><span class="doc-meta">on “two props or fewer”</span></span>
       </div>
     </div>
   </div>
   ```

4. Where one judgment covers several blocks, open a range with its row:

   ```html
   <div class="doc-group doc-annotation-range surface-labeled-range">
     <div class="doc-annotations">
       <span class="doc-annotation-item"><span class="doc-mark doc-label surface-bordered-label" data-review="proposed">Proposed</span><span class="doc-meta">rev 3 · editor · both paragraphs</span></span>
       <span class="doc-annotation-item"><span class="doc-label">Basis</span><span class="doc-meta">editor draft</span></span>
     </div>
     <p class="doc-body">The first paragraph it proposes.</p>
     <p class="doc-body">The second.</p>
   </div>
   ```

   The host keeps at least 14px of unclipped space left of the content edge for the scope rail; 24px of side padding is recommended at the narrowest page width. In a document table a range hangs into the gutter of the column before it; a table with a range in its first or only column takes `.doc-table-scroll--range-lane` on its box, which keeps the lane there without moving a column. The range's row leads with its review item, and the row's other items follow it. A list inside a range keeps its markers inside its own padding.

5. Keep the labels visible, keep every shown decision's what, who and scope, and do not relabel a role by another axis's name.

## What is upstream vs consumer-local

- **Upstream (this repo):** the review role names, their meanings and values, the composition and its rules, and the decision-record display obligation. Consumers inherit by reference and do not mint a divergent palette.
- **Consumer-local:** which content carries which mark and why; the record values (what, who, scope); who may decide; the workflows; and any explicitly authorized local exception. This module is no workflow, database, approval interface or event schema, and it confers no authority.
