# TBCT Full Source-Fidelity Rebuild Checklist

## Controlling Baseline

- Source: `artifacts/tbct-source-text.txt`
- Manifest: `artifacts/tbct-source-ingestion.json`
- Audit baseline: `TBCT_SOURCE_FIDELITY_AUDIT.txt`
- Source line count: `1651`
- Whole-source SHA-256: `ce4a6cdd4a2a83870782dd979b5e78c8125c71ee6e91a016b9da7f26e0e215a3`
- Canonical protocol ID: `tbct-br-001`
- Canonical source version: `source-ce4a6cdd4a2a`

This mapping is implementation input, not a clinical rewrite. The source text
remains the only clinical authority. `verbatimText` must be extracted exactly
from participant-facing source wording. Facilitator-only text maps to
`aiInstruction`, restrictions, validation, activation conditions, completion
effects, node branches, or session-wide rules.

## Data-Field Contract

| Source material | Canonical target field |
|---|---|
| Session title, technique, role, purpose, language rules | `SessionDefinition` and `SessionCommonRules` |
| A clinically meaningful ordered step | `ClinicalStageNode` |
| Direct participant-facing prompt, quoted wording, or exact readback | `PromptItem.verbatimText` and initially identical `editableText` |
| Facilitator direction, pacing, role rule, forbidden wording | `PromptItem.aiInstruction`, `restrictions`, `SessionDefinition.sessionWideRestrictions`, or runtime guard |
| Conditional wording such as crisis, factual-thought, pathway, readiness, residual shame | `activationCondition`, node `branchRules`, graph edge condition, and runtime guard |
| Required participant response / worksheet column / protocol state | `outputFields` and node `requiredFields` |
| Numeric score range, item count, total, or order rule | `validation` and deterministic runtime calculation |
| Step completion and next-step requirement | `completionEffect`, `completionRule`, canonical graph edge |
| Source section and exact range | `SourceTrace` with `sourceLineStart`, `sourceLineEnd`, and session source hash |

## Session Source Mapping

| Session | Source section | Source lines | Current status | Required implementation |
|---|---|---:|---|---|
| 01 | Title, language, context, role, phases | 18-50 | Contradicts source | Session definition; language rule; role and stance; source-derived common rules; scope restrictions. |
| 01 | Mandatory opening | 51-65 | Missing executable rule | Opening node; one-to-two-sentence acknowledgment guard; immediate Step 1 routing; forbid personal exploration before Step 3. |
| 01 | Step 1: situation versus thought | 66-74 | Partially represented | Exact opening and clarification prompts; fields for neutral situation and thought distinction; completion only after participant articulates distinction; redirect node for personal example. |
| 01 | Step 2: Three-Person Example | 75-129 | Missing / contradicted order | Mandatory stage with preview, three candidates, first full returning-arrow cycle, second and third streamlined cycles, binary interviewer-reaction wording, and participant conclusion. |
| 01 | Step 3: personal cycle | 130-140 | Partially represented | Source-ordered participant cycle fields; feared-outcome gap conditional prompt; only available after Three-Person Example completion. |
| 01 | Step 4: participant summary | 141-144 | Partial | Mandatory participant-owned summary prompt and completion field. |
| 01 | Step 5: cognitive distortions | 145-155 | Partial | List-availability gate; participant-selected two-to-three distortion fields; prohibition against naming a distortion for participant. |
| 01 | Step 6, restrictions, style, glossary | 156-222 | Missing runtime constraints | Exact daily-observation and future Intra-TR preview prompts; no Intra-TR execution edge; session-wide technique, tone, and scope restrictions. |
| 02 | Title, role, clinical context | 223-249 | Contradicts source | Session definition for CCPH / CCGH; returning participant and source-wide one-question, previous-score, graph-visibility rules. |
| 02 | Opening | 250-261 | Partial | Separate first-session and returning-participant activation branches; between-session check; early-stop and crisis branches. |
| 02 | CCPH Step 1: named problems | 262-279 | Partial | Participant problem array, max-five rule, change/influence framing, non-forced reframe, source prompts. |
| 02 | CCPH Step 1b: X/Y/Z | 280-293 | Partial | X/Y/Z activation after named list and before scale; non-probing runtime restriction; source-specific X/Y/Z fields. |
| 02 | CCPH Step 2: material and scale | 294-310 | Contradicts source | Rating-card gate; all six exact score/color anchors; discomfort versus distress instruction. |
| 02 | CCPH Step 3: problem ratings | 311-318 | Partial | Per-item 0-5 validation, color reflection, X/Y/Z non-probing, `problemRatings` collection. |
| 02 | CCPH Step 4 and Step 5 | 319-332 | Missing calculations | Deterministic total, yellow/red count, visual-present/absent branch, source summary and transition. |
| 02 | CCGH Steps 6-9 | 333-379 | Contradicts source | Separate goal elicitation, exact six-anchor goal scale, per-item ratings, deterministic total and yellow/red count. |
| 02 | Closing and guidelines | 380-429 | Missing runtime rules | Conditional visual/full-list output, last-observation-carried-backward marker, source safety response, one-question and early-stop enforcement. |
| 03 | Role, safety, context, introduction | 430-500 | Shortened / missing | Mandatory safety node, crisis stop, source introduction and CCD connection, source-wide guide restrictions. |
| 03 | Q1 Situation | 501-510 | Partial | Exact Q1 and concrete-event clarification PromptItems; situation fields. |
| 03 | Q2a and factual-thought pathway | 511-536 | Partial / heuristic conflict | AT field; factual-meaning branch based on participant confirmation, underlying-belief capture, working-AT confirmation; remove English phrase heuristic. |
| 03 | Q2b and Q3 | 537-550 | Partial | Initial AT belief, primary emotion, emotion intensity; all 0-100 validations. |
| 03 | Q4 and summary checkpoint | 551-572 | Missing checkpoint content | Behavior/body fields; participant-owned complete summary before cycle statement; strict transition gate. |
| 03 | Q5-Q7 | 573-596 | Partial | Pros including temporary relief, cons, cognitive-distortion list availability and participant identification. |
| 03 | Q8-Q9 evidence | 597-616 | Missing loop rules | Evidence-for and evidence-against arrays; one additional-evidence prompt; target two-to-three, accept no-more after one extra prompt; source directions. |
| 03 | Q10 conclusion | 617-634 | Missing readback | Balanced conclusion, mandatory Therefore extension, exact full-conclusion readback, 0-100 belief in complete conclusion. |
| 03 | Q11 emotions | 635-658 | Contradicts source | Positive emotion first; original Q3a emotion only for negative follow-up; no invented negative emotion; same-emotion ratings only. |
| 03 | Q12-Q14 | 659-686 | Partial / missing AT repeat | Intended action, new body comparison, exact stored working-AT readback for revised belief, global evaluation. |
| 03 | Closing, structural rules, verbose management | 687-745 | Missing | Exact closing; 14-question progression guard; one-question redirection rules; source-only participant content; contract and redirection PromptItems. |
| 04 | Protocol notice, objective, context | 746-762 | Misplaced | Session definition; no generic opening safety node; session objective, source-wide crisis suspension, no-number speaking rule. |
| 04 | Pathway determination and core sequence | 763-769 | Missing branches | Standard Conflict default, Social Anxiety / Feared-Evaluation conditional path, Q1-Q7 participant and other-person fields. |
| 04 | Feedback Loop and Locus of Control | 770-777 | Partial | Required discovery nodes after Q7; plausible-other rule; cycle and own-behavior leverage completion fields. |
| 04 | Action Plan and final check-in | 778-786 | Missing | All-actions-first collection, obstacle-by-obstacle review, solutions, implementation timing, final belief and global check-in. |
| 04 | Clinical guidelines and prior context | 787-803 | Missing executable restrictions | Crisis suspension, non-mind-reading guard, social-anxiety behavioral-test framing, source-specific runtime restrictions. |
| 05 | Purpose and cognitive/emotional register distinction | 804-827 | Misplaced / missing | Session definition and common rules; discrete guilt-belief and shame-intensity field types; never-conflate validation. |
| 05 | Step 1 baseline | 828-831 | Partial | Exact baseline guilt belief and mandatory shame intensity prompts; source condition for later shame re-rating. |
| 05 | Step 2 language substitution | 832-834 | Partial | Exact participation/contribution wording; prohibit guilt/blame/fault in grid work. |
| 05 | Step 3 contributors | 835-838 | Missing | Full list before exploration; contributor types; participant last; no suggested contributor names. |
| 05 | Step 4 first rating | 839-843 | Missing | Participant-entered percentages only, deterministic remaining share, exactly-100 validation, disputed-remainder branch, new-contributor carry-forward. |
| 05 | Step 5 Socratic deepening | 844-847 | Partial | Source question-bank selection; no percentages permitted during deepening. |
| 05 | Step 6 rating rounds | 848-851 | Missing | Second-through-fifth evaluation loop, prior-rating recall only on request, stabilization logic. |
| 05 | Step 7 guilt/shame rerating | 852-859 | Partial | Exact separate cognitive/emotional re-rating; shame only if recorded at baseline. |
| 05 | Steps 8-10 output | 860-880 | Missing | Values closing, conditional residual-shame downward arrow, mandatory source-derived summary table. |
| 05 | Emotion framing, question bank, language, safety | 881-931 | Missing restrictions | No responsibility wording at closing; non-fabrication; abusive/harmful-act appropriateness and destabilization branches. |
| 06 | Role and default/simulated mode | 932-960 | Missing | Clinician/trainee role-play default node; explicit-request-only Julia branch; demonstration crisis suspension. |
| 06 | Language lock and glossary | 961-989 | Missing | First-substantive-message language lock, source acronym selection, glossary metadata, visible-corruption review warning. |
| 06 | Human Presence | 990-1017 | Missing | Runtime interaction restrictions: no reflexive mirroring, safety behavior in room detection, stop-and-attend branch, source review flags. |
| 06 | Rationale and color scale | 1018-1057 | Contradicts source | Exact six anchors and color handling; discomfort/distress fields; no compressed scale; green/yellow/red constraint rules. |
| 06 | Step 1 symptom list | 1058-1104 | Missing | Observable item list, modifiers, inverted safety behaviors, distinct feared outcomes, no-category-collapse validation, modifier checklist, stable rows. |
| 06 | Step 2 scoring | 1105-1124 | Contradicts source | Scale-before-calibration gate, exact talking-with-me calibration, per-item rating, rescore-versus-new-item rule, totals and yellow/red count. |
| 06 | Step 3 difference | 1125-1138 | Missing | Participant capsule summary, color-zone turn separation, green-item decomposition branch. |
| 06 | Step 4 commitments | 1139-1151 | Missing | Two-to-three green-only homework validation, accountability partner, Plan B, no independent yellow/red assignment. |
| 06 | Step 5 exposure | 1152-1171 | Partial | Intensity/duration/frequency source prompts and checks; no cognitive-restructuring branch; homework-reluctance rescore/decompose branch. |
| 06 | Step 6 curves | 1172-1183 | Missing | Participant-derived relief versus overcoming curve output; visual/worksheet representation requirement. |
| 06 | Step 7 Circuit 2 | 1184-1206 | Missing | Formal safety-behavior term timing, exact Circuit 2 chain, participant-generated Level 2 UA, diagram placement fields. |
| 06 | Interaction, output, opening, failure modes | 1207-1275 | Missing runtime constraints | Human interaction restrictions, worksheet fields, source opening, all failure-mode prohibitions and source-corruption review flag. |
| 07 | Identity, scope, language, glossary | 1276-1347 | Missing | Session definition, demonstration scope, language lock, glossary, one-decision-per-cycle constraint. |
| 07 | Core principles | 1348-1369 | Missing | No-pressure/autonomy, both-parts-healthy, no-compliance inference, prediction/evidence distinction, live avoidance detection. |
| 07 | Step 0 and Step 1 | 1370-1385 | Missing | Consent opening; ambivalence orientation; desired action; disadvantages first then advantages; participant-owned content. |
| 07 | Step 2 weights | 1386-1396 | Partial | Emotion/Reason orientation and complementary percentage validation. |
| 07 | Step 3 chair dialogue | 1397-1415 | Missing | Chair arrangement, explicit role transitions, Emotion first, direct Reason/Emotion dialogue, facilitator-silence restriction, dialogue-loop completion. |
| 07 | Step 4 and Step 5 | 1416-1427 | Missing | Consensus chair, multiple participant-generated learnings, consensus re-weight, no facilitator-added learning. |
| 07 | Step 6 and Step 7 | 1428-1445 | Missing | Ready / Not ready valid branch, conditional readiness, six-field participant-owned Action Plan and accountability. |
| 07 | CRP form and style | 1446-1495 | Missing | Structured fields for all form columns and action-plan fields; role-dialogue interaction restrictions. |
| 07 | Safety, opening, known failure modes | 1496-1536 | Missing | Crisis/unsafe-action stop, autonomy rule, source opening, compliance/avoidance guards, raw source corruption review flag. |
| 08 | Context, role, orientation | 1537-1548 | Contradicts source | Session definition, Trial-Based Thought Record technique, four roles, therapist-role restrictions. |
| 08 | Key operating principles | 1549-1574 | Missing | One-step execution, explicit confirmed role transitions, role language guard, imagery-before-role, rating-scale guard, evidence limits, session pause support. |
| 08 | Steps 1-3 | 1575-1581 | Missing / wrong order | Situation/facts/AT, downward arrow, core charge, initial belief/emotion/intensity, court orientation and roles. |
| 08 | Steps 4-6 | 1582-1590 | Contradicts source | Defendant transition/re-ratings, prosecutor imagery and neutral-identity guard, prosecutor role transition, one-item-at-a-time participant prosecution evidence. |
| 08 | Steps 7-8 | 1591-1599 | Missing | Defendant re-assessment, defense imagery/neutral identity, defense role transition, concrete factual defense evidence, replacement handling. |
| 08 | Steps 9-13 | 1600-1608 | Contradicts source | Defendant re-assessments, prosecutor rebuttal with separate BUT per evidence, defense surrebuttal meaning and separate participant Therefore per pair, full defense readback. |
| 08 | Steps 14-16 | 1609-1619 | Missing | Private jury room, all four evidence blocks, participant distortion/factual review, prosecutor-removal intervention, participant verdict, court officer, judge re-assessment. |
| 08 | Steps 17-21 and core principles | 1620-1651 | Missing | Exact debrief questions, participant-generated positive belief, Appeal Preparation evidence, positive-belief rating, final charge/emotion ratings and closing restrictions. |

## Audit P0 / P1 / P2 Mapping

| Priority | Audit finding | Rebuild control |
|---|---|---|
| P0 | S01 personal-cycle prompts occurred before the Three-Person Example | `s01-n03-three-person-example` must complete before any personal-cycle node can activate. |
| P0 | S02 scales were compressed | Exact six-anchor PromptItems and 0-5 validation per CCPH/CCGH scale. |
| P0 | S04 initial content was mislabeled as safety | Q1 begins the source sequence; crisis is an interrupting safety branch only. |
| P0 | S06 scale was compressed | Exact six-anchor scale node blocks calibration/rating until completed. |
| P0 | S08 reversed role order and misplaced constructs | Twenty-one source steps become deterministic ordered stages with role guards. |
| P0 | Legacy Dexie release delivered generic text | Canonical source-derived release snapshot replaces default selection; old release is backed up and retired. |
| P0 | Runtime PromptItem lookup mismatched release node IDs | Canonical stage node IDs are identical in catalog, graph, release, and runtime. |
| P0 | Three incompatible S03 identities | Alias map resolves legacy IDs to `tbct-session-03`; only canonical IDs are active. |
| P1 | Session-wide source constraints were metadata only | Rules are copied into PromptItem restrictions, node rules, graph edges, and runtime validation. |
| P1 | S03 omitted required source controls | Q1-Q14 source map and all conditional/loop/readback rules replace shortened graph. |
| P1 | S05 omitted grid mechanics | Exactly-100, participant-last, rounds, residual-shame, and table are deterministic. |
| P1 | S06 omitted language, worksheet, and Circuit 2 | Session rules, structured worksheet fields, and required Circuit 2 node are active. |
| P1 | S07 omitted Step 0, dialogue rules, and plan fields | Step 0, chair constraints, Ready/Not ready, six-field plan become executable. |
| P1 | S08 omitted role/jury/appeal controls | Role transitions, evidence review, verdict ownership, appeal record, and final ratings are active. |
| P2 | Common Rules existed only for S03 | All eight sessions receive complete source-derived common rules. |
| P2 | Source traces lacked ranges and hashes | Every definition, node, and PromptItem receives exact source ranges and session hash. |
| P2 | Prompt counts were stale | Counts are derived from active canonical PromptItems, never hard-coded. |
| P2 | Tests asserted labels only | Source-fidelity, migration, graph-release, and runtime-sequence tests block regressions. |

The audit did not label any finding P3. All findings in the current audit are
covered by the P0-P2 rows above and the session mapping table.

## Current Synthetic / Invalid Content To Retire

| Invalid source | Treatment |
|---|---|
| `Prompt N for ...` fallbacks in S05-S08 | Preserve only in migration backup; mark deprecated; exclude from active catalog, graph, release, and runtime. |
| Generic `Session initialized.` and `Session completed.` S03 records | Preserve in backup; replace with source-derived opening/closing PromptItems. |
| Legacy S03 outline and short graph copies | Preserve in migration backup; exclude from canonical seed. |
| Session 02 prompt embedded in S05 contributor node | Preserve in migration backup; replace with source-derived S05 contributor prompts. |
| `RT-NODE-*` generic release nodes | Preserve old release snapshot in backup; retire from default-release lookup and new runtime creation. |
| `TBCT-BR-001` / `SESSION-03` / `tbct-br-001-session-03` divergent identifiers | Keep as aliases only; source-derived IDs are canonical. |

## Source-Corruption Review Flags

- Session 06: Preserve visible raw mojibake and flag all affected excerpts as
  `review_required`. Do not silently correct an uncertain source string.
- Session 07: Preserve visible raw mojibake and flag all affected excerpts as
  `review_required`. Do not silently correct an uncertain source string.
- No source-derived item may use a corrected translation or a generic CBT
  substitute without a separately reviewed source replacement.

## Completion Gates

- Eight canonical Sessions exist in SessionPlan order 01 through 08.
- Every active node and PromptItem maps to a source range and source hash.
- No active `Prompt N for ...`, generic demo prompt, or legacy `RT-NODE-*`
  content remains.
- Builder, graph, release snapshot, and runtime resolve the same node and
  PromptItem IDs.
- Common Rules are populated for all eight Sessions and are not display-only.
- A critical source contradiction blocks release creation.