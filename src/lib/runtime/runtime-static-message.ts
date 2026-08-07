import { resolvePromptLocaleText } from "@/lib/runtime/runtime-release-normalizer";
import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { RuntimeContext } from "@/types/runtime-session";

export type StaticMessageResult = { patientMessage: string; source: "approved_static"; llmCalled: false };

const APPROVED_PATIENT_TEXT: Record<string, string> = {
  "tbct-s02-n03-p01-offer-private-placeholders": "Before we rate your problems, some people have something private they'd rather not describe in detail. If that's true for you, you don't have to explain it — you can just call it X, Y, or Z instead, and we'll still rate it. Would you like to add a problem like that?",
  "tbct-s02-n04-p02-six-anchor-problem-scale": "Use this 0–5 scale for each problem: 0 Light blue—small or no longer a problem; 1 Dark blue—uncomfortable but relatively easy to solve; 2 Light green—clear discomfort and/or difficult to solve; 3 Dark green—much discomfort and/or very difficult to solve; 4 Yellow—distressing and very difficult to solve; 5 Red—so distressing that you cannot see a solution.",
  "tbct-s02-n04-p03-discomfort-distress-distinction": "Scores 0–3 describe discomfort that you can still manage. Scores 4–5 describe distress that feels overwhelming and deserves priority in therapy. Does that distinction make sense?",
  "tbct-s02-n08-p02-six-anchor-goal-scale": "Use the same 0–5 color scale for each goal: 0 Light blue, 1 Dark blue, 2 Light green, 3 Dark green, 4 Yellow, and 5 Red. Please rate how difficult each goal feels right now.",
  "tbct-s02-n10-p01-goal-total": "I will total your goal ratings and identify how many are currently in the yellow or red range.",
  "tbct-s02-n11-p01-thanks": "Thank you for mapping these problems and goals with me today.",
  "tbct-s02-n11-p02-recorded-summary": "Your problem and goal ratings have been recorded so they can be compared over time.",
  "tbct-s02-n11-p03-final-score-summary": "These ratings give you and your therapist a starting point for focusing on what matters most and tracking change over time.",
  "tbct-s04-n12-p02-all-actions-first": "Before drawing a conclusion, let’s review the actions and reactions you identified together.",
  "tbct-s05-n05-p02-new-contributor-next-round": "For the next round, is there another person, circumstance, or factor that contributed to what happened?",
  // Language Rules (tbct-source-text.generated.ts:922): "Never use the words
  // 'responsibility' or 'responsible' in the closing step -- use 'values'
  // instead." The technique's own name is also Participation Grid, not
  // "responsibility grid".
  "tbct-s05-n10-p01-participant-summary-table": "Let’s review the Participation Grid you created, including each contributor and the values you assigned.",
  "tbct-s06-n01-p01-warm-opening": "Welcome. Whenever you're ready, tell me a bit about what's been difficult for you lately — I'll follow your lead.",
  "tbct-s06-n04-p01-six-anchor-symptom-scale": "For each symptom, use this 0–5 color scale: 0 Light blue, 1 Dark blue, 2 Light green, 3 Dark green, 4 Yellow, and 5 Red. Higher scores mean greater distress or difficulty.",
  "tbct-s06-n04-p02-calibration-anchor": "Before we score your own items, let's calibrate the scale. On this same 0–5 scale, how would you rate a very mild, everyday moment right now — for example, simply talking with me during this session?",
  "tbct-s06-n04-p03-color-zone-rules": "Blue and green scores describe manageable discomfort; yellow and red scores identify distress that needs more attention.",
  "tbct-s06-n06-p03-participant-capsule-summary": "In one or two sentences, how would you summarize the situations that bring up discomfort and the situations that bring up distress?",
  "tbct-s06-n08-p01-intensity": "When planning practice, consider intensity: how strong should the discomfort be so that it is challenging but still safe and manageable?",
  "tbct-s06-n08-p02-duration": "Now consider duration: how long could you remain in that safe situation without escaping or using a safety behavior?",
  "tbct-s06-n08-p03-frequency": "And frequency: how often could you repeat the practice so that new learning has a chance to develop?",
  "tbct-s06-n09-p03-overcoming-curve": "As you stay in a safe situation and practice repeatedly, the goal is not immediate relief but learning that you can tolerate and overcome the discomfort.",
  "tbct-s06-n10-p01-introduce-safety-behaviors": "Sometimes we reduce anxiety through safety behaviors. They help briefly, but can prevent us from learning that the situation is manageable. What safety behavior do you notice?",
  "tbct-s06-n10-p03-render-circuit-two": "Circuit 2 is the repeating loop between a feared situation, anxious predictions, uncomfortable feelings, and safety behaviors. Let’s map your loop using your own example.",
  "tbct-s06-n10-p05-circuit-two-summary": "How would you summarize your Circuit 2 loop in your own words?",
  "tbct-s06-n11-p01-session-worksheet": "Your symptom hierarchy and Circuit 2 notes can be kept as a worksheet for review with your therapist.",
  "tbct-s07-n01-p01-crp-offer": "I’d like to propose that today we work through a decision that feels important but difficult using Consensual Role-Play. You will not be pressured to take the feared action; what matters is what you learn. Would you like to try it?",
  "tbct-s07-n01-p02-crp-consent": "Would you like to continue with Consensual Role-Play, knowing that ‘not ready’ is also a valid outcome?",
  // The protocol's default is to DETECT the language from the participant's
  // own first substantive message and lock to it silently -- asking is only
  // a fallback for genuinely ambiguous input (tbct-source-text.generated.ts:
  // 1319-1322). sessionLanguage/languageLocked are now captured from the
  // crp-consent reply one step earlier (runtime-context.ts), so this step
  // just states the lock instead of re-asking a question nothing waits for.
  "tbct-s07-n02-p01-language-lock": "I'll continue in the language you've been using, and I'll keep the names of the technique and chair roles consistent throughout.",
  "tbct-s07-n02-p02-both-parts-healthy": "Both parts are healthy functions of the same self. Emotion protects, and Reason evaluates. Neither is superior, and the goal is not for one to defeat the other.",
  "tbct-s07-n03-p01-ambivalence-normalization": "It is normal for one part of you to want an action while another part wants to avoid it. We will listen to both without forcing a decision.",
  "tbct-s07-n05-p01-emotion-weight": "From the Emotion chair, what percentage of the weight goes to the disadvantages? The remainder goes to the advantages.",
  "tbct-s07-n05-p02-reason-weight": "From the Reason chair, what percentage of the weight goes to the advantages? The remainder goes to the disadvantages.",
  "tbct-s07-n08-p01-consensus-weights": "From the Consensus chair, what final percentage would you give the advantages and disadvantages after hearing both parts?",
  "tbct-s07-n09-p01-readiness-decision": "After hearing both parts, what is your decision right now: ready, not ready, or undecided? Any of these is acceptable.",
  "tbct-s07-n10-p01-proposed-actions": "What small action, if any, would fit the decision you reached?",
  "tbct-s07-n10-p02-possible-obstacles": "What obstacle might make that action difficult?",
  "tbct-s07-n10-p03-obstacle-solutions": "What could help you respond to that obstacle?",
  "tbct-s07-n10-p04-implementation-plan": "When and where would you try this action?",
  "tbct-s07-n10-p05-support-people": "Who could support you without pressuring you?",
  "tbct-s07-n10-p06-follow-up": "How and when would you like to review what you learned?",
  "tbct-s07-n11-p01-plan-summary": "Please summarize the plan you chose, including the action, possible obstacle, response, support, and follow-up. The decision remains yours.",
  "tbct-s08-n14-p03-review-four-blocks": "Before the verdict, review the prosecution evidence, the defense evidence, the prosecution’s rebuttals, and the defense’s responses.",
  "tbct-s08-n14-p04-participant-verdict": "After considering all four blocks, what verdict does the jury reach: guilty or not guilty? The verdict is yours to state.",
  "tbct-s08-n19-p02-daily-appeal-homework": "For daily appeal practice, record one piece of evidence each day that supports the more balanced or positive belief.",
};

function firstText(value: unknown) {
  if (Array.isArray(value)) return value.map(String).find(Boolean);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function ratingNumbers(value: unknown): number[] {
  if (Array.isArray(value)) return value.flatMap(ratingNumbers);
  if (typeof value === "number" && Number.isFinite(value)) return [value];
  if (typeof value === "string") return [...value.matchAll(/\b[0-5]\b/g)].map((match) => Number(match[0]));
  return [];
}

// The manual's 0-5 color scale (tbct-source-text.generated.ts:305-310,
// 359-364) -- fixed number-to-color mapping, not a per-item field, so it's
// computed here rather than invented as a new tracked field.
const SCALE_COLORS = ["light blue", "dark blue", "light green", "dark green", "yellow", "red"];
function colorForScore(score: number) {
  return SCALE_COLORS[score] ?? "";
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Builds the "reflect the just-rated item, then ask for the next one" text
 * for a rate-one-list-item-at-a-time prompt (CCPH problems, CCGH goals) --
 * see runtime-context.ts's LIST_RATING_PAIRS, which this mirrors using the
 * same two arrays (the list and its parallel ratings) rather than a separate
 * pointer, since the just-rated item's own name isn't kept anywhere once the
 * pointer field advances to the next item.
 */
function reflectThenAskForNextRating(input: { listField: unknown; ratingsField: unknown; askVerb: string }) {
  const list = stringList(input.listField);
  const ratings = ratingNumbers(input.ratingsField);
  const parts: string[] = [];
  if (ratings.length > 0 && list[ratings.length - 1]) {
    const score = ratings[ratings.length - 1];
    parts.push(`Thank you. So ${list[ratings.length - 1]} is a ${score} — ${colorForScore(score)} — for you right now.`);
  }
  const next = list[ratings.length];
  if (next) parts.push(`${input.askVerb} ${next}?`);
  return parts.join(" ") || undefined;
}

// Every session's own "SAFETY PROTOCOL (MANDATORY)" section gives the same
// clinical instruction (pause immediately, acknowledge with compassion,
// direct to the therapist/a crisis line, don't resume until safety is
// confirmed) with only the exercise name changing -- see e.g.
// tbct-source-text.generated.ts:465-471 for S03's wording, mirrored in each
// other session. Previously these five nodes had no authored text at all,
// so the runtime-release-normalizer's generic fallback produced a
// slug-derived placeholder ("Let's continue with stop trial, one step at a
// time") on exactly the nodes reached during a real safety pause.
const SAFETY_PAUSE_EXERCISE_NAME: Record<string, string> = {
  "tbct-s03-n15-p01-pause-and-escalate": "the Intra-TR",
  "tbct-s05-n11-p01-pause-grid": "the Participation Grid",
  "tbct-s06-n13-p01-pause-hierarchy": "the symptom hierarchy",
  "tbct-s07-n12-p01-stop-crp": "the role-play",
  "tbct-s08-n22-p01-stop-trial": "the trial",
};

function contextualPatientText(promptItem: PromptItem, context?: RuntimeContext) {
  const fields = context?.fields ?? {};
  const safetyPauseExercise = SAFETY_PAUSE_EXERCISE_NAME[promptItem.id];
  if (safetyPauseExercise) {
    return `Let's pause ${safetyPauseExercise} here for a moment. If you're feeling distressed or unsafe right now, please reach out to your therapist or a crisis line right away -- that matters more than continuing this exercise. We can pick this back up together once you're safe.`;
  }
  if (promptItem.id === "tbct-s05-n06-p01-updated-percentage") {
    // "Return to each contributor in order and ask for an updated
    // percentage" (tbct-source-text.generated.ts:854) -- repeated once per
    // contributor per round via repeat_until; currentParticipationContributorText
    // is recomputed each turn in runtime-context.ts as the round fills in.
    const contributor = fields.currentParticipationContributorText;
    return typeof contributor === "string" && contributor
      ? `Now that we've talked it through, what would you say ${contributor}'s participation percentage is?`
      : undefined;
  }
  if (promptItem.id === "tbct-s02-n06-p01-problem-total") {
    const ratings = ratingNumbers(fields.problemRatings);
    const total = ratings.reduce((sum, value) => sum + value, 0);
    const priority = ratings.filter((value) => value >= 4).length;
    return `Your total problem score today is ${total}. You have ${priority} problem${priority === 1 ? "" : "s"} in the yellow or red range. These are priority areas for therapy.`;
  }
  if (promptItem.id === "tbct-s02-n10-p01-goal-total") {
    const ratings = ratingNumbers(fields.goalRatings);
    const total = ratings.reduce((sum, value) => sum + value, 0);
    const priority = ratings.filter((value) => value >= 4).length;
    return `Your total goals score today is ${total}. You have ${priority} goal${priority === 1 ? "" : "s"} in the yellow or red range.`;
  }
  if (promptItem.id === "tbct-s02-n11-p02-recorded-summary") {
    const problemRatings = ratingNumbers(fields.problemRatings);
    const goalRatings = ratingNumbers(fields.goalRatings);
    const problemTotal = problemRatings.reduce((sum, value) => sum + value, 0);
    const goalTotal = goalRatings.reduce((sum, value) => sum + value, 0);
    return `Your ratings have been recorded. Your total problem score is ${problemTotal}, and your total goals score is ${goalTotal}. These can be compared with future ratings to track change.`;
  }
  if (promptItem.id === "tbct-s02-n05-p01-reflect-problem-score") {
    return reflectThenAskForNextRating({ listField: fields.problems, ratingsField: fields.problemRatings, askVerb: "Using the same 0 to 5 color scale, how would you rate" });
  }
  if (promptItem.id === "tbct-s02-n09-p01-reflect-goal-score") {
    return reflectThenAskForNextRating({ listField: fields.goals, ratingsField: fields.goalRatings, askVerb: "Using the same 0 to 5 color scale, how would you rate" });
  }
  // Both "cycle" confirmations hardcoded "reacts negatively" regardless of
  // what the participant actually answered for candidateTwo/ThreeReaction
  // -- a real "positive" answer was accepted, then directly contradicted by
  // the next sentence. The source only writes out the negative-reaction
  // version for candidates 2/3 (tbct-source-text.generated.ts:112,124), but
  // candidate 1's own text (line 98) confirms the identical sentence
  // structure already applies to a positive reaction, so this substitutes
  // the participant's actual valence into that same verbatim structure
  // rather than inventing new clinical wording.
  if (promptItem.id === "tbct-s01-n05-p08-candidate-two-cycle") {
    const reaction = fields.candidateTwoReaction === "positive" ? "positively" : "negatively";
    return `And when the interviewer reacts ${reaction} — can you see how that would feed back and reinforce the original thought, keeping the whole cycle going?`;
  }
  if (promptItem.id === "tbct-s01-n06-p07-candidate-three-cycle") {
    const reaction = fields.candidateThreeReaction === "positive" ? "positively" : "negatively";
    return `And when the interviewer reacts ${reaction} — can you see how that confirms the original thought and keeps the whole cycle feeding itself?`;
  }
  if (promptItem.id === "tbct-s08-n10-p02-rebut-each-defense-item") {
    const evidence = firstText(fields.defenseEvidence ?? fields.evidenceAgainst) ?? "the defense evidence you gave";
    return `The defense said: “${evidence}” What would the prosecutor say in response?`;
  }
  if (promptItem.id === "tbct-s08-n12-p02-surrebut-each-pair") {
    const prosecution = firstText(fields.prosecutionEvidence ?? fields.evidenceFor) ?? "the prosecution evidence";
    const defense = firstText(fields.defenseEvidence ?? fields.evidenceAgainst) ?? "the defense evidence";
    return `The prosecution said: “${prosecution}” The defense said: “${defense}” From the defense role, what does that mean about the defendant?`;
  }
  if (promptItem.id === "tbct-s06-n10-p03-render-circuit-two") {
    const situation = firstText(fields.currentSymptomItemText) ?? firstText(fields.symptomCoreSituation) ?? "the situation you described";
    const assumption = firstText(fields.underlyingAssumption) ?? "your underlying assumption";
    const behavior = firstText(fields.safetyBehaviors) ?? "the safety behavior you noticed";
    return `Here is your Circuit 2 loop, in your own words: “${situation}” leads to the thought “${assumption}”, which brings on anxious feelings, which leads to “${behavior}”. That safety behavior briefly relieves the anxiety but prevents you from learning the feared outcome would not have happened anyway, so the loop repeats the next time you're in that situation. Does that match what happens for you?`;
  }
  if (promptItem.id === "tbct-s08-n14-p03-review-four-blocks") {
    const blocks = [
      { label: "the prosecution's evidence", detail: firstText(fields.prosecutionEvidence) },
      { label: "the defense's evidence", detail: firstText(fields.defenseEvidence) },
      { label: "the prosecution's rebuttals", detail: firstText(fields.prosecutionRebuttals) },
      { label: "the defense's responses (the surrebuttals)", detail: firstText(fields.defenseSurrebuttals) },
    ];
    const reviewed = Array.isArray(fields.juryReview) ? fields.juryReview.length : 0;
    const current = blocks[Math.min(reviewed, blocks.length - 1)];
    const detailHint = current.detail ? ` (“${current.detail}”)` : "";
    return `As jurors, review ${current.label}${detailHint} on its own. What stands out to you about it?`;
  }
  return APPROVED_PATIENT_TEXT[promptItem.id];
}

const BRACKET_PLACEHOLDER_SOURCES: Array<{ pattern: RegExp; fieldCandidates: string[]; naturalFallback: string }> = [
  { pattern: /\[event[^\]]*\]/gi, fieldCandidates: ["residualShameEvent", "precipitatingEvent", "situation", "interpersonalSituation", "distressingSituation"], naturalFallback: "that situation" },
  { pattern: /\[core situation[^\]]*\]/gi, fieldCandidates: ["symptomCoreSituation", "coreSituation"], naturalFallback: "that situation" },
  { pattern: /\[problem[^\]]*\]/gi, fieldCandidates: ["currentProblemText"], naturalFallback: "that problem" },
  { pattern: /\[goal[^\]]*\]/gi, fieldCandidates: ["currentGoalText"], naturalFallback: "that goal" },
  { pattern: /\[item[^\]]*\]/gi, fieldCandidates: ["currentSymptomItemText"], naturalFallback: "that item" },
  { pattern: /\[emotion named at q3a\]/gi, fieldCandidates: ["primaryEmotion"], naturalFallback: "the emotion you named earlier" },
  // The six below were found by exhaustively resolving every canonical
  // PromptItem's static text with empty runtime fields and checking for a
  // surviving "[...]" -- each is a genuine slot a human therapist fills
  // from session context (source-fidelity-catalog.ts's own S01/S02/S03
  // nodes name the field that holds it), not a decorative bracket.
  { pattern: /\[their situation[^\]]*\]/gi, fieldCandidates: ["situationThoughtDistinction"], naturalFallback: "that situation" },
  { pattern: /\[situation\]/gi, fieldCandidates: [], naturalFallback: "that situation" },
  { pattern: /\[description of lower score\]/gi, fieldCandidates: [], naturalFallback: "the lower rating" },
  { pattern: /\[description of higher score\]/gi, fieldCandidates: [], naturalFallback: "the higher rating" },
  { pattern: /\[factual event\]/gi, fieldCandidates: ["situation"], naturalFallback: "what actually happened" },
  { pattern: /\[underlying belief\]/gi, fieldCandidates: ["workingAutomaticThought"], naturalFallback: "what that means to you" },
  { pattern: /\[initial conclusion\]/gi, fieldCandidates: ["balancedConclusion"], naturalFallback: "the conclusion you reached" },
  { pattern: /\[extended conclusion\]/gi, fieldCandidates: ["conclusionTherefore"], naturalFallback: "what that leads you to" },
  { pattern: /\[repeat the patient'?s exact at\]/gi, fieldCandidates: ["automaticThought"], naturalFallback: "that original thought" },
];

/**
 * The pasted TBCT source text sometimes uses bracketed placeholders (e.g.
 * "[event]") that a human therapist fills in from session context before
 * speaking. Left unresolved these leak literally into the patient-facing
 * message. Substitute a captured field value when we have one, otherwise
 * fall back to natural unbracketed wording rather than reciting "[event]".
 */
function resolveBracketPlaceholders(text: string, context?: RuntimeContext) {
  const fields = context?.fields ?? {};
  return BRACKET_PLACEHOLDER_SOURCES.reduce((acc, { pattern, fieldCandidates, naturalFallback }) => {
    const resolvedValue = fieldCandidates.map((field) => fields[field]).find((value) => typeof value === "string" && value.trim());
    return acc.replace(pattern, typeof resolvedValue === "string" ? resolvedValue.trim() : naturalFallback);
  }, text);
}

export function resolveStaticPatientMessage(promptItem: PromptItem, locale: string, context?: RuntimeContext): StaticMessageResult | null {
  const approved = contextualPatientText(promptItem, context);
  if (approved) return { patientMessage: resolveBracketPlaceholders(resolvePromptLocaleText(promptItem.id, approved, locale), context), source: "approved_static", llmCalled: false };
  // fallbackPatientText on a canonical PromptItem is already reviewed patient
  // content by the time the release is built (see
  // runtime-release-normalizer.ts's sourceSpecificRuntimeFallback, which is
  // where instruction-shaped text gets caught and rewritten into a real
  // question). Re-running the full strict check here would also reject
  // already-approved wording that merely starts with an ordinary verb, so
  // this only blocks the narrow, unambiguous "this is a pasted internal
  // document" shapes -- headers, code fences, and instruction-style bullets.
  const fallback = promptItem.fallbackPatientText?.trim() ?? "";
  const obviousInternalDocument = /^(?:---\s*)?(?:#{1,6}\s*)?(?:interaction style|role and purpose|safety and clinical guardrails|important guidelines)\b/i.test(fallback)
    || /^(?:```|[-*]\s+(?:use|do not|never|always|close by)\b)/i.test(fallback);
  if (fallback && !obviousInternalDocument) {
    const localized = resolvePromptLocaleText(promptItem.id, fallback, locale);
    const patientMessage = localized.includes("천천히 생각해 보셔도 괜찮습니다")
      ? fallback
      : localized;
    return { patientMessage: resolveBracketPlaceholders(patientMessage, context), source: "approved_static", llmCalled: false };
  }
  return null;
}
