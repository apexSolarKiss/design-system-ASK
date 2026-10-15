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
| `open` | Open question | value of `--ask-emphasis-cyan` | a named open question: the matter Spectral `held` and Evidence `unresolved` also name, their meaning, not their value |
| `accepted` | Accepted | value of `--state-earned` | a recorded decision to adopt or permit, at its scope |
| `declined` | Declined | value of `--state-deflated` | a recorded decision not to adopt or permit, at its scope |
| `none` | No decision recorded | value of `--fg-3` | no decision recorded |

**Accepted is green and Declined red; No decision recorded stays the faintest neutral.** An affirmative, a negative and an absent record differ at a glance, and the words still name each. Pending judgments, Proposed and Open question, keep their own hues.

**A shared value is not a shared meaning.** Accepted takes the value of Spectral `earned` and Evidence `supported`, and Declined that of `deflated`. A green outline says *accepted at this scope*; a green evidence dot says *supported by this evidence*. The outline, the key and the words say which question each mark answers. An accepted narrow scope is still a whole decision, a decline does not disprove a statement, and green never authorizes production.

**Labels stay review labels.** A surface keeps Proposed, Correction requested, Open question, Accepted, Declined and No decision recorded. It never relabels a review role by a Spectral or Evidence name because a value is shared, and never relabels an Evidence or Spectral role by a review name.

**Proposed and Correction requested share paint, not event identity.** A candidate submitted and a correction requested are different events, kept apart by their words and by who made the request. Correction requested is used only when someone has asked for existing words to change. Proposed alone never implies a defect.

**Proposed takes the emphasis magenta, and Open question the emphasis cyan.** Proposed is `#FF00FF` in both themes, the value a document's other magenta labels and rails already use, so a proposal never sits beside a near-identical second pink. A proposal and a thesis are told apart by their words, their place and their key, never by a difference in pink. Spectral's `proposed` keeps its own theme-calibrated magenta: the two Proposed roles share a word and a hue, not a value, and where both apply to one item the keyed list carries them, one key each. Open question is `#00BEFF` in both themes, by reference to `--ask-emphasis-cyan`: it reads bluer than Spectral `held`, which is tealer, and apart from Accepted's green. Spectral `held` and Evidence `unresolved` keep their own values; an open question shares their meaning, a matter not yet settled, not their value.

## Annotation // the composition

- **Mark** // an inert annotation word: one review, evidence or state role, stated literally. `span.doc-mark.doc-label` with exactly one of `data-review`, `data-evidence` or `data-state`. Its words are the register's label role, which this module never restyles; its color sits only on its geometry. A review mark also carries `.surface-bordered-label`: its box and edge are the shared bordered label's, from `surface-treatments.css` — the same box as the emphasis chip and a neutral label — and this module supplies its color only. Evidence draws a 10px round dot and state a 10px square, with no outline, and neither carries `.surface-bordered-label`. A mark carries one role; a second fact takes a second mark.
- **Item** // one fact and its qualifier, kept together: a mark and the metadata that qualifies it (`.doc-meta`), or a basis key (`.doc-label`) and its value (`.doc-meta`). `.doc-annotation-item`, inside a row or a table cell. It wraps as a unit.
- **Annotation row** // the items that apply to one scope: the range it opens, a whole list item that is itself the range included, the target its record names as an explicit-target prompt immediately before the range that holds that content, the table cell it sits in, the note it heads, or the whole document, as the review record set under its title that names the document. A row that holds no review item may instead apply to the section after its heading or the block it follows. `.doc-annotations`, its items in one fixed order: state, basis, evidence, review. A row that opens a range or stands as a prompt leads with its review item, and its state, basis and evidence items follow in that order; the row that opens a range sits beside the top of the scope rail. A review item on whole blocks never trails them: it opens a range over them, a whole list item it judges included, or, as a separate question about a range's content, stands as an explicit-target prompt before that range (rule 2). Each item opens on its own mark or key, so items need no separator.
- **Annotation list** // one item answering several questions at once, one keyed line per question, in the row's order. `dl.doc-annotation-list`, with `dt.doc-label` keys and `dd` values. Its review lines judge the item the list itself names, in a keyed line of its own, at the scope each line states, never the blocks beside the list; a review judgment on blocks in the flow opens a range instead.
- **Annotation range** // the exact blocks one review judgment covers, shown so a reader sees where its scope begins and ends: one paragraph or several, a list with the lead-in that introduces it, a quotation with the sentence that reads it, a panel, a table, or one of several statements in a table cell. `.doc-annotation-range` with `.surface-labeled-range` (and usually `.doc-group`, for the run's flow). Its first child is the annotation row naming its one review judgment, which leads that row; the blocks it covers follow. One whole list item that no range holds is itself the range, the shared labeled range's item host: the `li` takes both classes, its row comes first, and its words follow in a body block of their own, since a range takes no content role. Its scope rail is the shared labeled range's, from `surface-treatments.css`: one straight 2px stroke in the outer margin, outside the content edge, beginning beside the row and ending just past the last block it covers; an item host's rail sits in the same lane, outside the list's markers, and ends just inside the item, so judged items in a row keep the list's own spacing. This module supplies its color only, the review value of the judgment its row names. One judgment per range: a range holds no second review mark, so blocks judged otherwise are a sibling range of their own. Words inside a range judged on their own take a passage mark, a narrower record of their own, and its note follows the range; inside its list only another item may follow an item host, so that note follows the list. A range is never nested, and never sits inside a list item, a railed passage, a separate surface or panel, a hierarchy level or an annotation note. The row's state, basis and evidence items apply to the range but never color its scope rail, and evidence and state never open a range.
- **Passage mark** // the exact words inside a block that one review judgment concerns, pending or decided: Proposed or Correction requested, Open question, Accepted or Declined. `mark.doc-passage-mark.surface-scope-underline` with `data-review`, in body text, naming its note among its `aria-describedby` ids. Its line is the shared scope underline, from `surface-treatments.css`: one solid 2px line 0.36em below the baseline, through descenders, in the full review value, under words that keep their own color. This module supplies its color only. A decided outcome keeps its passage mark: the line shows which words the decision concerns, not that it holds more widely. No decision recorded marks no words.
- **Annotation note** // the record of a judgment on exact words inside a block, set after the block, or after the range that holds it, and in a list item that is neither a range nor held by one, after the item's text; it quotes enough of the words to name them once in it. `.doc-annotation-note` on a `.doc-hierarchy` group. A passage mark underlines the words and names the note, whether the judgment is pending or decided. After a block or a range in the flow, the note takes the gap of the group it sits in, 12px in a `.doc-group`; directly inside a block list item, where no gap precedes it, it takes the same 12px (`--space-3`) as its own top margin, which collapses with a larger margin above it rather than adding to it, so the line under the item's last words clears the note's label. A list item that is itself a register composition, such as `li.doc-group` or `li.doc-labeled`, keeps that composition's gap, and the note takes no margin there. An evidence note whose role is not yet testable draws that role's dashed rail instead of the hierarchy rail.

## Composition rules

1. **A passage keeps its document role.** Accepting a synthesis leaves it a synthesis; challenging a quotation leaves it a quotation; a callout's rail does not change with its review state, and a framing panel's perimeter never changes color.
2. **Make review scope visible.** Unless it stands as an explicit-target prompt, as below, a review judgment on one or more whole blocks in the document flow opens an annotation range: its row leads with the review item, and the scope rail bounds exactly the blocks it concerns. This holds for a single paragraph: a row placed after a block can be read as introducing what follows it, so neither the number of blocks nor a review label's nearness establishes its scope. One judgment on one whole list item that no range holds makes that item its range: its row sits first inside the item, review item first, the item keeps its marker and indentation, and its own scope rail bounds it in the outer lane; no other range opens inside a list item. In a list item that is neither a range nor held by one, a judgment on exact words stays an exact-word annotation, and a row with no review item still follows the item's text. Inside a range, a list item carries no review mark of its own: a note on words judged in it follows the range, a separate question about it is an explicit-target prompt before the range, and any other judgment on it is raised with this owner. A separate question about blocks a range holds is an explicit-target prompt: its own row, review item first, immediately before that range or before another prompt to it, outside the range and outside a preceding range or unrelated group, whose record names the content below as its target, the scope of its question and who decides. Which judgment the range carries and which stands as a prompt is set by the records, the prompt being the question its record marks as about the content below, never by which record was made first or would stand first; neither judgment, nor any answer to it, settles or is inherited by the other. The range keeps its one judgment, no second mark enters it, and the content is shown once; several prompts before one range read in order, with no precedence between their judgments. A bare label that names no target is no prompt. Other forms bound their own scope: an item alone in a table cell, judging that cell or its row where the table's structure makes the association unambiguous; a note that quotes the exact words it concerns, its words under a passage mark whether the judgment is pending or decided; an annotation list's lines on the item the list names; and a whole document's record, set under its title, which names the document and draws no rail. A key or legend sample that judges no content takes no range. A cell holding several separately judged statements takes a range for each, and a judgment on a whole table opens a range over the table, never an item in one of its cells. A row that holds only basis, evidence or state items opens no range and may follow the heading or block it qualifies; unmarked content takes nothing. Blocks judged otherwise are a sibling range; a separate question about the same blocks is a prompt, as above. A judgment no supported composition can show, such as one on some of the blocks inside a list item, on blocks inside a panel, a second judgment on one whole list item, or one on a whole table whose cells carry judgments of their own, is raised with this owner rather than drawn by a local rule. So is a further judgment on whole blocks a range holds that fits neither the range nor a prompt, and it is never placed after the range; a note on exact words inside a range still follows it. No rail or panel is added on the content to make scope, and typography, boldness or capitals never set it.
3. **One edge, one meaning.** Within this composition, review and evidence never draw a rail on the content passage. A range's scope rail sits in the outer margin, outside the content edge where every passage rail sits, and answers only one question: which content a review judgment covers. Evidence and state never draw a range. The composition's one annotation rail is Evidence State's mandatory not-yet-testable dashed rail, drawn on an annotation note or a mark.
4. **The passage scope cue is the scope underline.** A passage mark's words keep their color and take one solid line in the full review value, never a tint, a text color or a rail. Beside the document's link underline, colored words that go nowhere could read as a link, so the line stays apart from it in weight, place and continuity: 2px against the link's 1px, 0.36em below the baseline against its 0.22em, unbroken through descenders where the link's line breaks, and full strength at rest where the link's is half, with no hover or focus of its own. A link inside marked words keeps its own line and states above the scope line.
5. **Panels take no inner note.** A framing, synthesis or emphasis panel keeps its whole contract; its note follows the panel.
6. **Not yet testable keeps its whole contract** in this composition: lavender-gray, a dashed rail, a hollow marker and the visible label. Inside a not-yet-testable note, the note's rail is the one rail.
7. **An ordinary question is a section, not a panel:** an Open question range bounds the blocks that pose the question, a lead-in and the list it introduces included, and holds the section's heading only where the heading alone poses it. A proposed answer is its own judgment, a sibling range over the blocks that state it, because a proposed answer is not an unanswered question. A separate question about content another judgment's range holds is an explicit-target prompt before that range (rule 2).
8. **A mark is not a chip and not a control.** It never takes `.surface-emphasis-chip`, which names why a unit is emphasized and heads a panel, nor the compact action's classes or any interactive behavior. A review mark and the chip share one box, the bordered label, and differ in meaning, words and place: a chip heads a panel inside its perimeter, and a review mark leads its scope: the range it opens, a whole list item included, whose scope rail sits outside the content edge; or the row of an explicit-target prompt, before the range whose content it asks about. Otherwise it sits where its record bounds its scope: a table cell, a note, an annotation list or the document's own record. The bordered label's small corner keeps an inert mark from looking like a control beside a compact action.
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

`tools/role-conformance.js` rule **C12** checks this composition where its classes appear: syntax (classes, attributes, vocabulary, a review mark's bordered label, a range's opening row, the one judgment that leads it and its shared class, a whole list item a review row leads being its range, and a passage mark's shared underline) and computed presentation (the outline's, the scope rail's and the passage line's color, the marker, the rail and a note's attachment in a list item). Rule **C13** checks a review mark's box and edge as it checks every bordered label, rule **C14** a range's scope rail, lane, host, clearance and buffer as it checks every labeled range, an item host's included, and rule **C15** a passage mark's line and unchanged words as it checks every scope underline. None judges semantic assignment, that is, whether an item's role is the right one, nor scope. A pass reports no finding in what the checker reads, within the limits `tools/role-conformance.js` states; it does not show that a range was opened wherever a judgment needed one, that a range holds the right blocks, or that a passage mark underlines the right words. A review row left trailing a block or a list item's text passes, and so do a prompt stranded after its target and a prompt row that does not open on its review item, and a note on a decided judgment whose words no passage mark underlines. Those stay with the author, a consumer's own renderer tests and the reviewer reading the result.

C12 compares a mark with its resolved role token. It does not independently establish that a local token rebinding is authorized. Adopted role bindings remain governed by this contract; a local exception requires the applicable explicit authorization.

## Tiers

- **Tier 1 (identity-free):** the five `--review-*` role names, the review vocabulary and the composition's class names. A stable vocabulary other ASK-family surfaces can reuse.
- **Tier 2 (ASK design language):** the reuse-by-reference mapping. Every color value is inherited from Spectral State or the foundation by reference.
- **No Tier 3.** This profile carries no instance identity.

## How to use it

1. Load the foundation and the four register modules, then the state modules, then this file. The order is part of the contract, and `surface-treatments.css` is required: it draws a review mark's box, a range's scope rail and a passage mark's line:

   ```text
   colors_and_type.css → surface-panel.css → surface-text-link.css →
   surface-document.css → surface-treatments.css → spectral-state.css →
   evidence-state.css → review-semantics.css
   ```

2. Record basis, evidence or state after the block it qualifies; a row with no review item opens no range:

   ```html
   <p class="doc-body">The frame keeps two props or fewer.</p>
   <div class="doc-annotations">
     <span class="doc-annotation-item"><span class="doc-label">Basis</span><span class="doc-meta">owner-stated</span></span>
     <span class="doc-annotation-item"><span class="doc-mark doc-label" data-evidence="supported">Supported</span><span class="doc-meta">9 of 14, counted</span></span>
   </div>
   ```

3. For words inside a block, pair a passage mark with its note, whether the judgment is pending or decided:

   ```html
   <div class="doc-group">
     <p class="doc-body">The frame keeps <mark class="doc-passage-mark surface-scope-underline" data-review="proposed" aria-describedby="n1">two props or fewer</mark>.</p>
     <div class="doc-hierarchy doc-group doc-annotation-note" id="n1">
       <div class="doc-annotations">
         <span class="doc-annotation-item"><span class="doc-mark doc-label surface-bordered-label" data-review="proposed">Correction requested</span><span class="doc-meta">on “two props or fewer”</span></span>
       </div>
     </div>
   </div>
   ```

   In a list item, the note follows the item's text and keeps its 12px attachment:

   ```html
   <li>
     <p class="doc-body">Proofs reach the studio <mark class="doc-passage-mark surface-scope-underline" data-review="accepted" aria-describedby="n2">before the end of each month</mark>.</p>
     <div class="doc-hierarchy doc-group doc-annotation-note" id="n2">
       <div class="doc-annotations"><span class="doc-annotation-item"><span class="doc-mark doc-label surface-bordered-label" data-review="accepted">Accepted</span><span class="doc-meta">on “before the end of each month” · owner, round 1</span></span></div>
     </div>
   </li>
   ```

4. Where a review judgment covers whole blocks, open a range with its row, a single paragraph included:

   ```html
   <div class="doc-group doc-annotation-range surface-labeled-range">
     <div class="doc-annotations">
       <span class="doc-annotation-item"><span class="doc-mark doc-label surface-bordered-label" data-review="accepted">Accepted</span><span class="doc-meta">v3 · owner · this copy</span></span>
       <span class="doc-annotation-item"><span class="doc-label">Basis</span><span class="doc-meta">owner-stated</span></span>
     </div>
     <p class="doc-body">The frame keeps two props or fewer.</p>
   </div>
   ```

   Several paragraphs, or a list with the lead-in that introduces it, sit in one range the same way, and blocks judged otherwise take a sibling range. The host keeps at least 14px of unclipped space left of the content edge for the scope rail; 24px of side padding is recommended at the narrowest page width. In a document table a range hangs into the gutter of the column before it; a table with a range in its first or only column takes `.doc-table-scroll--range-lane` on its box, which keeps the lane there without moving a column. The range's row leads with its review item, and the row's other items follow it. A list inside a range keeps its markers inside its own padding.

5. Where one judgment covers one whole list item that no range holds, make the item its range, its row first; where a separate question concerns content a range holds, set an explicit-target prompt just before that range:

   ```html
   <!-- one judgment on one whole list item: the item is the range, in a list indented 24px -->
   <ul style="padding-left: 24px">
     <li class="doc-annotation-range surface-labeled-range"><div class="doc-annotations"><span class="doc-annotation-item"><span class="doc-mark doc-label surface-bordered-label" data-review="proposed">Proposed</span><span class="doc-meta">editor, round 2 · this item</span></span></div><p class="doc-body">Reprints keep the original paper stock.</p></li>
   </ul>
   ```

   The item's rail reaches back across the list's indentation to the lane every range uses; a list indented otherwise than 24px sets `--surface-labeled-range-indent` to its indentation. Judged items in a row keep the list's own spacing, and a list that opens or closes on a judged item keeps the 24px buffer from a range or another such list beside it, directly or inside one wrapping block.

   ```html
   <!-- a separate question about a range's content, as a block of its own before the range -->
   <div class="doc-annotations">
     <span class="doc-annotation-item"><span class="doc-mark doc-label surface-bordered-label" data-review="open">Open question</span><span class="doc-meta">for each frame marked for reprint in the table below, may it be printed again? · owner</span></span>
   </div>
   <div class="doc-group doc-annotation-range surface-labeled-range">
     <div class="doc-annotations"><span class="doc-annotation-item"><span class="doc-mark doc-label surface-bordered-label" data-review="proposed">Proposed</span><span class="doc-meta">editor, round 2 · the print plan</span></span></div>
     <!-- the table, once -->
   </div>
   ```

6. Keep the labels visible, keep every shown decision's what, who and scope, and do not relabel a role by another axis's name.

## What is upstream vs consumer-local

- **Upstream (this repo):** the review role names, their meanings and values, the composition and its rules, and the decision-record display obligation. Consumers inherit by reference and do not mint a divergent palette.
- **Consumer-local:** which content carries which mark and why; the record values (what, who, scope); who may decide; the workflows; and any explicitly authorized local exception. This module is no workflow, database, approval interface or event schema, and it confers no authority.
