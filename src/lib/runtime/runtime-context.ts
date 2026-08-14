import type { PatientInput, RuntimeContext, StateExtractionResult } from "@/types/runtime-session";
import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import { assessRuntimePatientInput, requiresSemanticInputAssessment } from "@/lib/runtime/runtime-input-assessment";
import { matchEnumChoice, parseDeterministicPromptInput } from "@/lib/runtime/runtime-deterministic-input";

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isNoMoreEvidence(text: string) {
  const normalized = normalizeText(text);
  return [
    "없어요",
    "없습니다",
    "더 생각나는 건 없습니다",
    "i cannot think of another one",
    "nao consigo pensar em mais nenhum",
    "não consigo pensar em mais nenhum",
    "more none",
    "none",
    "nothing else",
    "no more",
    // A prosecutor/defense who cannot answer a specific point is ending that
    // loop the same way "no more evidence" ends collection -- the unanswered
    // item is then captured by S08's unrebutted-defense-note reflection.
    "cannot rebut",
    "can't rebut",
    "반박할 수 없어요",
    "반박 못 하겠어요",
    "반박 못하겠어요",
  ].some((phrase) => normalized === phrase || normalized.includes(phrase));
}

/**
 * Fields whose prompt is reused turn after turn to rate one list item at a
 * time (one problem, one goal, ...). The catalog's `validation.kind` for
 * these is "rating", which by default overwrites the field on every turn;
 * without this list they would silently discard every rating but the last,
 * so totals such as `problemRatings` summed later are wrong.
 */
const CUMULATIVE_RATING_FIELDS: Record<string, string> = {
  problemRatings: "currentProblemScore",
  goalRatings: "currentGoalScore",
  symptomItemScores: "currentSymptomScore",
};

/** Validation kinds whose two output fields must sum to (approximately) 100. */
const SUM_TO_100_PAIR_KINDS = new Set(["consensus_weights"]);

/** validation.kind values that represent a growing, deduplicated list the
 * patient builds one entry at a time (problems, goals, contributors,
 * symptom items, evidence, disadvantages/advantages, appeal evidence, ...). */
const LIST_BUILDING_VALIDATION_KINDS = new Set(["array", "min_items"]);

function isDuplicateListEntry(existing: unknown, candidate: string) {
  if (!Array.isArray(existing)) return false;
  const normalizedCandidate = normalizeText(candidate);
  return existing.some((item) => typeof item === "string" && normalizeText(item) === normalizedCandidate);
}

/**
 * Pairs a growing list (problems, goals, symptom items) with the rating
 * field that scores it one item at a time. The catalog only declares a
 * single generic rating prompt per list — nothing else tracks which item is
 * "next" or whether every item has been rated — so this table drives three
 * derived fields: `<pointerField>` (the current item's own text, for
 * substituting into the "[problem]"-style bracket in the source script) and
 * `all<X>Rated` (a completion-gate flag a repeat_until prompt can check).
 */
const LIST_RATING_PAIRS: Array<{ listField: string; ratingsField: string; pointerField: string; sufficiencyField: string }> = [
  { listField: "problems", ratingsField: "problemRatings", pointerField: "currentProblemText", sufficiencyField: "allProblemsRated" },
  { listField: "goals", ratingsField: "goalRatings", pointerField: "currentGoalText", sufficiencyField: "allGoalsRated" },
  { listField: "symptomItems", ratingsField: "symptomItemScores", pointerField: "currentSymptomItemText", sufficiencyField: "allSymptomItemsRated" },
];

/** After either the source list or the ratings array changes, point
 * `pointerField` at the next unrated item and flag whether every item in
 * the list now has a rating. */
function refreshListRatingPointers(nextFields: Record<string, unknown>) {
  for (const pair of LIST_RATING_PAIRS) {
    const list = Array.isArray(nextFields[pair.listField]) ? (nextFields[pair.listField] as string[]) : undefined;
    if (!list) continue;
    const ratings = Array.isArray(nextFields[pair.ratingsField]) ? (nextFields[pair.ratingsField] as unknown[]) : [];
    nextFields[pair.pointerField] = list[ratings.length];
    nextFields[pair.sufficiencyField] = list.length > 0 && ratings.length >= list.length;
  }
}

/** Per-field completion rule for a growing list a repeat_until prompt keeps
 * collecting. The list is "sufficient" (its `<field>Sufficient` flag goes
 * true, releasing the loop's completionCondition) when it reaches `target`
 * entries, or when the patient says there is nothing more AND at least
 * `minBeforeNoMore` entries exist.
 *
 * The old rule was a flat "count >= 2 || noMore", which ended every
 * collection the instant the 2nd item landed -- the source explicitly allows
 * 3 (exceptionally 4) pieces of trial evidence and treats S07 Step 3's
 * "several exchanges" as a floor, so stopping at 2 cut both short. `target`
 * is the source's own upper bound (the loop stops INVITING there; it never
 * demands that many), and `minBeforeNoMore` is the floor below which a
 * premature "nothing more" earns one more gentle invitation instead of
 * closing the step. */
const LIST_SUFFICIENCY_RULES: Record<string, { sufficiencyField: string; target: number; minBeforeNoMore: number }> = {
  prosecutionEvidence: { sufficiencyField: "prosecutionEvidenceSufficient", target: 4, minBeforeNoMore: 2 },
  defenseEvidence: { sufficiencyField: "defenseEvidenceSufficient", target: 4, minBeforeNoMore: 2 },
  appealEvidence: { sufficiencyField: "appealEvidenceSufficient", target: 3, minBeforeNoMore: 2 },
  emotionReasonDialogue: { sufficiencyField: "emotionReasonDialogueSufficient", target: 6, minBeforeNoMore: 3 },
  disadvantages: { sufficiencyField: "disadvantagesSufficient", target: 7, minBeforeNoMore: 1 },
  advantages: { sufficiencyField: "advantagesSufficient", target: 7, minBeforeNoMore: 1 },
  consensusLearning: { sufficiencyField: "consensusLearningSufficient", target: 2, minBeforeNoMore: 1 },
};

/** Detects a language from the patient's own first substantive message
 * instead of asking a meta-question ("Which language would you like?"),
 * per the source protocol's "language lock from first substantive message"
 * instruction. This is a script/character-set detection, not an inference
 * about the patient's meaning, so it is safe to compute deterministically. */
function detectScriptLocale(text: string) {
  if (/[가-힣]/.test(text)) return "ko-KR";
  if (/[぀-ヿ一-鿿]/.test(text)) return "ja-JP";
  if (/[àâçéèêëîïôûùüÿñæœ]/i.test(text)) return "fr-FR";
  if (/[ãáàâêéíóôõúüç]/i.test(text)) return "pt-BR";
  return "en-US";
}

const NON_ANSWER_TEXT = new Set([
  "hi", "hello", "hey", "yo", "test", "testing", "ok", "okay", "sure", "yes", "no", "true", "false", "idk", "i don't know", "i dont know", "i do not know",
  "\uC548\uB155", "\uC548\uB155\uD558\uC138\uC694", "\uD558\uC774", "\uD14C\uC2A4\uD2B8", "\uD14C\uC2A4\uD2B8\uC785\uB2C8\uB2E4", "\uB124", "\uC608", "\uC751", "\uADF8\uB798", "\uC88B\uC544\uC694", "\uBAB0\uB77C", "\uBAA8\uB974\uACA0\uC5B4\uC694", "\uC798 \uBAA8\uB974\uACA0\uC5B4\uC694", "\uC74C",
  "oi", "ol\u00E1", "ola", "teste", "sim", "n\u00E3o", "nao", "n\u00E3o sei", "nao sei",
]);

/** The complete set of answers a yes/no prompt accepts -- also the set the
 * Yes/No buttons submit once typed rather than clicked. */
const BOOLEAN_ANSWER_TEXT = new Set(["yes", "no", "true", "false", "네", "예", "응", "아니", "아니요", "sim", "não", "nao"]);

/** Short answers that are filler for an ordinary clinical question but are the
 * literal, complete answer to a consent question. */
const CONSENT_ANSWER_TEXT = new Set([
  "yes", "no", "ok", "okay", "sure", "yes please", "i'd like to", "id like to", "i would like to", "not now", "no thanks", "no thank you",
  "네", "예", "응", "그래", "좋아요", "좋습니다", "해볼게요", "해보겠어요", "아니", "아니요", "아니요 괜찮아요", "지금은 아니요",
  "sim", "não", "nao", "claro", "oui", "non", "はい", "いいえ",
]);

const RISK_SIGNAL_PATTERNS: Array<{ signal: string; pattern: RegExp }> = [
  { signal: "danger", pattern: /\b(?:i am|i'm|we are|we're)\s+(?:in\s+)?immediate danger\b/i },
  { signal: "harm", pattern: /\b(?:self[ -]?harm|hurt myself|harm myself)\b/i },
  { signal: "suicide", pattern: /\b(?:suicide|suicidal|suiside|suicde|ending my life|(?:want|going) to die|wanna die|don'?t want to (?:live|be alive)|kill myself|end my life)\b/i },
  { signal: "unsafe", pattern: /\b(?:i am|i'm|feel|feeling)\s+unsafe\b/i },
  { signal: "suicidal_ideation_ko", pattern: /(?:\uC8FD\uACE0\s*\uC2F6|\uC0B4\uACE0\s*\uC2F6\uC9C0\s*\uC54A|\uC790\uC0B4)/ },
  { signal: "self_harm_ko", pattern: /(?:\uC790\uD574|\uB0B4\s*\uBAB8\uC744\s*\uD574\uCE58)/ },
  { signal: "suicidal_ideation_pt", pattern: /(?:quero\s+morrer|n[aã]o\s+quero\s+mais\s+viver|suic[ií]d)/i },
  { signal: "self_harm_pt", pattern: /(?:me\s+machucar|me\s+ferir|autoagress)/i },
  { signal: "suicidal_ideation_fr", pattern: /(?:je\s+veux\s+mourir|je\s+ne\s+veux\s+plus\s+vivre|suicid)/i },
  { signal: "self_harm_fr", pattern: /(?:me\s+faire\s+du\s+mal|automutil)/i },
  { signal: "suicidal_ideation_ja", pattern: /(?:\u6B7B\u306B\u305F\u3044|\u3082\u3046\s*\u751F\u304D\u305F\u304F\u306A\u3044|\u81EA\u6BBA)/ },
  { signal: "self_harm_ja", pattern: /(?:\u81EA\u50B7|\u81EA\u5206\u3092\s*\u50B7\u3064\u3051)/ },
  { signal: "suicidal_ideation_ko", pattern: /(?:죽고\s*싶|죽고싶|자살(?:하고)?\s*싶|자살하고싶|목숨을\s*끊)/ },
  { signal: "self_harm_ko", pattern: /(?:자해(?:하고)?\s*싶|나를\s*해치|내\s*몸을\s*해치)/ },
];

export function detectRuntimeRiskSignals(text: string) {
  return RISK_SIGNAL_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ signal }) => signal);
}

// Explicit refusal / decline-to-continue detection, one pattern per locale
// this app runs patient sessions in (mirrors the language coverage of
// RISK_SIGNAL_PATTERNS above). This is distinct from the safety_check stage,
// which looks for crisis/self-harm content -- a patient can decline to
// continue without any risk signal present, and previously that case fell
// through to normal state extraction/node resolution because only English
// phrasing was recognized here, silently ignoring e.g. a Korean-speaking
// patient saying "세션을 진행하고 싶지 않아요" (I don't want to continue the session).
const REFUSAL_PATTERNS: RegExp[] = [
  // English
  /\b(?:i\s+(?:do\s+not|don['’]?t)\s+want\s+(?:counsel(?:ing)?|therapy|to\s+continue)|stop\s+(?:the\s+)?session|leave\s+me\s+alone)\b/i,
  // Korean: "~하고 싶지 않아요/않습니다", "그만(하고 싶어요/할래요/하고 싶다)", "안 할래요/하기 싫어요"
  /(?:세션|치료|상담|진행)(?:을|를)?\s*(?:진행\s*)?(?:하고\s*싶지\s*않|하기\s*싫)/,
  /그만(?:\s*하고\s*싶|하고\s*싶|할래|두고\s*싶|진행)/,
  /(?:세션|치료|상담)\s*(?:그만|안\s*할래|받고\s*싶지\s*않)/,
  /나\s*좀\s*내버려\s*(?:둬|두세요|주세요)/,
  // Portuguese
  /(?:n[aã]o\s+quero\s+(?:continuar|mais\s+terapia|mais\s+aconselhamento)|pare\s+(?:a\s+)?sess[aã]o|me\s+deixe?\s+em\s+paz)/i,
  // French
  /(?:je\s+ne\s+veux\s+(?:pas\s+continuer|plus\s+de\s+th[ée]rapie)|arr[êe]tez?\s+(?:la\s+)?session|laissez[- ]moi\s+tranquille)/i,
  // Japanese
  /(?:続けたくない|セッションをやめたい|もうやめたい|一人にして)/,
];

export function isExplicitPatientRefusal(text: string) {
  const trimmed = text.trim();
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

// A body-sensation prompt asks what the patient notices physically (racing
// heart, shaky hands, tight chest); an emotion word ("좌절감을 느낀다" / "I feel
// frustrated") answers a different question and must not be accepted as-is,
// or it silently overwrites a clinically distinct field with the wrong content.
const EMOTION_WORD_PATTERN = /(좌절|슬픔|슬프|우울|불안|초조|화가\s*나|화남|분노|짜증|억울|창피|부끄|죄책감|수치심|외로움|무섭|두려움|절망|허탈|허무)|\b(?:frustrat\w*|sad(?:ness)?|anxious|anxiety|angry|anger|ashamed|shame|guilt\w*|lonely|afraid|fear\w*|hopeless)\b/i;
const BODY_SENSATION_WORD_PATTERN = /(심장|가슴|손이?\s*떨|떨림|두근|긴장|땀|호흡|숨이|어지럽|메스꺼|두통|근육|목이?\s*조|배가?|저림)|\b(?:heart\s*rac\w*|shak\w*|trembl\w*|sweat\w*|breath\w*|dizzy|nausea\w*|headache|tight\w*|muscle|tension)\b/i;

export function looksLikeFeelingNotBodySensation(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return EMOTION_WORD_PATTERN.test(trimmed) && !BODY_SENSATION_WORD_PATTERN.test(trimmed);
}

// An automatic thought is a prediction/judgment/meaning ("발표를 망칠 것 같다");
// a feeling statement ("좌절감을 느낀다") or an urge/avoidance-desire statement
// ("이 상황을 회피하고 싶어") answer a different question and should be redirected
// with a follow-up, not stored as the thought itself.
const URGE_OR_DESIRE_PATTERN = /(하고\s*싶|피하고\s*싶|회피하고\s*싶|도망치고\s*싶|그만두고\s*싶)|\b(?:want\s+to\s+(?:avoid|leave|escape|quit|stop)|feel\s+like\s+(?:avoiding|leaving|escaping))\b/i;

export function looksLikeFeelingOrUrgeNotThought(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return EMOTION_WORD_PATTERN.test(trimmed) || URGE_OR_DESIRE_PATTERN.test(trimmed);
}

function compactText(value: string) {
  return normalizeText(value).replace(/[\s.,!?\u2026'"`~\u00B7\-_/\\()[\]{}]+/g, "");
}

/**
 * S08's courtroom roles (prosecutor, defense, juror) are only meaningful if
 * the participant speaks about the defendant in the third person, not as
 * themselves in the first person -- that dissociation is the whole point of
 * putting the charge on trial. This is a coarse heuristic (first-person
 * pronouns present, no third-person referent to the defendant), not a full
 * grammatical parse, so it only fires when the text reads unambiguously as
 * "I did X" with nothing else.
 *
 * Exported for runtime-execution-api.ts, which uses the same check to phrase
 * the source-mandated gentle correction ("I noticed you said 'I' -- right
 * now you are the prosecutor...") instead of a generic clarification.
 */
export function violatesThirdPersonRequirement(text: string) {
  const normalized = ` ${normalizeText(text)} `;
  const firstPerson = /\s(?:i|i'm|i am|i've|i have|i'd|i would|me|my|mine|myself)\s/.test(normalized)
    || /(?:^|\s)(?:저는|제가|저를|저의|나는|내가|나를|난)\s/.test(normalized);
  const thirdPerson = /\s(?:he|she|they|him|her|his|hers|their|them|the defendant)\s/.test(normalized)
    || /(?:피고인|그\s*사람|그녀|그가|그는|그를|그의|이\s*사람)/.test(normalized);
  return firstPerson && !thirdPerson;
}

function isMeaningfulTextResponse(input: {
  patientInput: PatientInput;
  promptItem?: PromptItem;
  field: string;
}) {
  if (input.patientInput.kind !== "text" || typeof input.patientInput.value !== "string") return true;
  const rawText = input.patientInput.value;
  if ((input.field === "evidenceFor" || input.field === "evidenceAgainst") && isNoMoreEvidence(rawText)) return true;

  const validation = input.promptItem?.validation as { kind?: string; values?: unknown; aliases?: Record<string, unknown> } | null | undefined;
  const normalized = normalizeText(rawText);
  const normalizedLexical = normalized.replace(/[.,!?…'"`~·\-_/\\()[\]{}]+/g, "").replace(/\s+/g, " ").trim();
  const activeQuestion = normalizeText(input.promptItem?.fallbackPatientText || input.promptItem?.verbatimText || "");
  const normalizedWithoutUiNoise = normalized.replace(/\b(?:read|read aloud)\b\s*$/i, "").trim();
  if (activeQuestion && activeQuestion.length >= 12 && (normalizedWithoutUiNoise === activeQuestion || normalizedWithoutUiNoise.includes(activeQuestion))) return false;
  const compact = compactText(rawText);

  // Closed-answer prompts are decided FIRST, before the generic filler-word
  // rejection below. A yes/no question, a consent question and a two-option
  // decision are all answered with exactly the words NON_ANSWER_TEXT treats
  // as filler ("yes", "네", "sure"), so running that check first rejected a
  // participant who answered precisely what was asked -- three times over,
  // and then paused the session. For these prompts the validation IS the
  // completeness test, so deciding here loses nothing.
  if (validation?.kind === "boolean") {
    return BOOLEAN_ANSWER_TEXT.has(normalized) || BOOLEAN_ANSWER_TEXT.has(normalizedLexical);
  }
  // Same matcher the deterministic parser uses, so "is this a real answer?"
  // and "what value does it mean?" can never disagree -- a text answer this
  // accepts is guaranteed to resolve to a canonical value below.
  if (validation?.kind === "enum" && Array.isArray(validation.values)) {
    return matchEnumChoice(rawText, validation.values, validation.aliases) !== null;
  }
  if (validation?.kind === "informed_consent" && (CONSENT_ANSWER_TEXT.has(normalizedLexical) || CONSENT_ANSWER_TEXT.has(normalized))) return true;

  if (!compact || NON_ANSWER_TEXT.has(normalized) || NON_ANSWER_TEXT.has(normalizedLexical) || NON_ANSWER_TEXT.has(compact) || /^(?:hm+|uh+|um+)$/i.test(normalizedLexical)) return false;
  if (/^(?:could|can|would) you (?:say|ask|explain|repeat|rephrase|put)\b.*(?:simply|again|differently|mean)?\??$/i.test(normalized)) return false;
  // A long, unbroken keyboard-like token is not a usable clinical answer. Keep
  // ordinary one-word emotions ("anxious", "sad") valid while rejecting the
  // common paste/test gibberish shape before any model call.
  if (!/\s/.test(normalized) && compact.length >= 14 && !/[\uAC00-\uD7A3\u3040-\u30FF\u4E00-\u9FFF]/.test(compact)) return false;

  return compact.length >= 2 && /[A-Za-z0-9\uAC00-\uD7A3\u00C0-\u00FF]/.test(compact);
}

function parsePercent(value: string | string[] | number | boolean) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  return Number(match[0]);
}

export async function extractRuntimeState(input: {
  patientInput: PatientInput;
  currentNode: ClinicalStageNode;
  currentPromptItem?: PromptItem;
  currentContext: RuntimeContext;
  locale?: string;
}): Promise<StateExtractionResult> {
  const nextFields = { ...input.currentContext.fields };
  const rawText = Array.isArray(input.patientInput.value) ? input.patientInput.value.join(" ") : String(input.patientInput.value);
  const lowered = normalizeText(rawText);
  const payload: Record<string, unknown> = {};
  // S07's language-lock node (n02) is meant to lock onto the language of the
  // patient's first substantive message in THIS session, per the protocol's
  // "detect, don't ask" instruction -- but by the time that node runs, the
  // first substantive message was already this session's opening reply (n01).
  // Capture it here rather than asking a fresh meta-question later.
  //
  // crp-consent is a boolean, which the UI renders as Yes/No buttons, so its
  // rawText is literally "true"/"false" -- script detection on that always
  // returned en-US and locked every session, including Korean ones, to
  // English. Detect from real text when there is real text (crp-offer, the
  // free-text opening, now runs first), and otherwise fall back to the
  // locale the session was actually created with.
  const localeCaptureIds = new Set(["tbct-s07-n01-p01-crp-offer", "tbct-s07-n01-p02-crp-consent"]);
  if (input.currentPromptItem && localeCaptureIds.has(input.currentPromptItem.id) && !nextFields.sessionLanguage) {
    const hasFreeText = input.patientInput.kind === "text" && typeof input.patientInput.value === "string" && input.patientInput.value.trim().length > 0;
    nextFields.sessionLanguage = hasFreeText ? detectScriptLocale(rawText) : (input.locale ?? "en-US");
    nextFields.languageLocked = true;
  }
  const validation = input.currentPromptItem?.validation as { kind?: string } | null | undefined;
  const expectedFields = input.currentPromptItem
    ? input.currentPromptItem.outputFields
    : [String(payload.field ?? payload.responseField ?? input.currentNode.requiredFields[0] ?? input.currentNode.id)];
  const field = String(expectedFields[0] ?? "internalTurnEvidence");
  if (input.currentContext.lastClarificationReason === "safety_clarification") {
    if (/^(?:yes|yes,|i do|that is what i mean|\uB124|\uC608|\uADF8\uB7F0 \uB73B)/i.test(lowered)) {
      return { fields: { ...nextFields, crisisSignal: true }, responseCategory: "affirmative", riskLevel: "high", riskSignals: ["patient_confirmed_safety_concern"], confidence: 1, missingFields: [] };
    }
    if (/^(?:no|no,|not that|i mean|\uC544\uB2C8|\uC544\uB2C8\uC694)/i.test(lowered)) {
      return { fields: nextFields, responseCategory: "negative", riskLevel: "low", riskSignals: [], confidence: 1, missingFields: expectedFields };
    }
    return { fields: nextFields, responseCategory: "text", riskLevel: "low", riskSignals: ["ambiguous_safety_language"], confidence: 0.4, missingFields: expectedFields };
  }
  const kind = String(validation?.kind ?? payload.kind ?? input.patientInput.kind);
  const derivedBooleanFields = kind === "rating_or_absent" ? expectedFields.filter((item) => /Recorded$/i.test(item)) : [];
  const directlyEnteredFields = expectedFields.filter((item) => !derivedBooleanFields.includes(item));
  const deterministic = /ratings$/i.test(field)
    ? { handled: false as const }
    : parseDeterministicPromptInput(input.patientInput, input.currentPromptItem?.validation);
  const percent = parsePercent(input.patientInput.value);
  // participationRatingStable is a free-text reflection field ("How does
  // that feel to you now?") that happens to contain "Rating" in its name --
  // excluded explicitly so a natural-language answer with no digits in it
  // isn't rejected as numeric input missing a number.
  const numericLike = kind === "rating" || (field !== "participationRatingStable" && /intensity|percent|rating|score|weight/i.test(field));
  // Respect the prompt's own configured range (e.g. a 0-5 color-coded scale)
  // instead of always assuming a 0-100% belief/intensity rating.
  const ratingRange = input.currentPromptItem?.validation as { min?: unknown; max?: unknown } | null | undefined;
  const effectiveRatingMin = Number(ratingRange?.min ?? 0);
  const effectiveRatingMax = Number(ratingRange?.max ?? 100);
  const validPercent = typeof percent === "number" && percent >= effectiveRatingMin && percent <= effectiveRatingMax;
  const riskSignals = detectRuntimeRiskSignals(lowered);
  const riskLevel = riskSignals.length > 0 ? "high" : input.currentContext.riskLevel ?? "low";
  if (riskSignals.length > 0) nextFields.crisisSignal = true;
  const numericValues = [...rawText.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0])).filter((value) => value >= 0 && value <= 100);
  if (deterministic.handled && !deterministic.valid && !riskSignals.length) {
    return { fields: input.currentContext.fields, responseCategory: "text", riskLevel, riskSignals, confidence: 1, missingFields: expectedFields };
  }
  if (numericLike && (numericValues.length < directlyEnteredFields.length || !validPercent) && !riskSignals.length) {
    return {
      fields: input.currentContext.fields,
      responseCategory: "text",
      riskLevel,
      riskSignals,
      confidence: 0.25,
      missingFields: directlyEnteredFields.slice(numericValues.length),
    };
  }
  // A pair of ratings such as the Consensus chair's advantage/disadvantage
  // weights must total 100; otherwise treat the turn as incomplete and ask
  // the patient to restate it rather than silently recording an inconsistent
  // pair. See SUM_TO_100_PAIR_KINDS for which validation kinds this applies to.
  if (kind && SUM_TO_100_PAIR_KINDS.has(kind) && directlyEnteredFields.length === 2 && numericValues.length >= 2 && !riskSignals.length && Math.abs(numericValues[0] + numericValues[1] - 100) > 1) {
    return { fields: input.currentContext.fields, responseCategory: "text", riskLevel, riskSignals, confidence: 0.3, missingFields: directlyEnteredFields };
  }
  // The source's third-person rule for courtroom roles (S08 KP3): when the
  // participant argues a role in the first person, the therapist gently
  // corrects ONCE ("I noticed you said 'I' -- right now you are the
  // prosecutor...") and then proceeds. Rejecting here routes the turn into
  // the clarification path, where runtime-execution-api.ts phrases that exact
  // correction; the clarificationAttemptCount gate makes it one-time -- a
  // participant who keeps their phrasing after the reminder is accepted
  // rather than looped toward a max-attempts pause. "No more"-style answers
  // are exempt: they end a collection loop, they don't argue the role.
  const requiresThirdPerson = Boolean((input.currentPromptItem?.validation as { requiresThirdPerson?: boolean } | null)?.requiresThirdPerson);
  if (
    !riskSignals.length
    && requiresThirdPerson
    && input.patientInput.kind === "text"
    && typeof input.patientInput.value === "string"
    && !isNoMoreEvidence(rawText)
    && (input.currentContext.clarificationAttemptCount ?? 0) === 0
    && violatesThirdPersonRequirement(rawText)
  ) {
    return {
      fields: input.currentContext.fields,
      responseCategory: "text",
      riskLevel,
      riskSignals,
      confidence: 0.3,
      missingFields: expectedFields.length ? [field] : [],
    };
  }
  if (!riskSignals.length && !isMeaningfulTextResponse({ patientInput: input.patientInput, promptItem: input.currentPromptItem, field })) {
    return {
      fields: input.currentContext.fields,
      responseCategory: "text",
      riskLevel,
      riskSignals,
      confidence: 0.2,
      missingFields: expectedFields.length ? [field] : [],
    };
  }
  const explicitlyProvidedFields = new Set<string>();
  if (!numericLike && expectedFields.length > 1) {
    for (const expectedField of expectedFields) {
      const escaped = expectedField.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = rawText.match(new RegExp(`(?:^|[,;\\n])\\s*${escaped}\\s*:\\s*([^,;\\n]+)`, "i"));
      if (match?.[1]?.trim()) {
        nextFields[expectedField] = match[1].trim();
        explicitlyProvidedFields.add(expectedField);
      }
    }
  }
  const allExpectedFieldsProvided = expectedFields.length > 0 && expectedFields.every((expectedField) => explicitlyProvidedFields.has(expectedField));
  if (!riskSignals.length && !allExpectedFieldsProvided && input.currentPromptItem && requiresSemanticInputAssessment({ patientInput: input.patientInput, promptItem: input.currentPromptItem, field })) {
    const assessment = await assessRuntimePatientInput({ patientInput: input.patientInput, promptItem: input.currentPromptItem, locale: input.locale });
    if (assessment.error && /\b(?:disappear|not wake up|better off without me|better off dead|no reason to live|cannot go on|can't go on|hopeless|desperate)\b/i.test(rawText)) {
      return { fields: input.currentContext.fields, responseCategory: "text", riskLevel: "low", riskSignals: ["ambiguous_safety_language", "assessment_failure_conservative_clarification"], confidence: 0, missingFields: expectedFields };
    }
    if (assessment.safetyLevel === "high" || assessment.safetyLevel === "critical") {
      return { fields: input.currentContext.fields, responseCategory: "text", riskLevel: "high", riskSignals: assessment.safetySignals?.length ? assessment.safetySignals : ["assessment_high_risk"], confidence: assessment.confidence, missingFields: [] };
    }
    if (assessment.safetyLevel === "moderate") {
      return { fields: input.currentContext.fields, responseCategory: "text", riskLevel: "low", riskSignals: ["ambiguous_safety_language", ...(assessment.safetySignals ?? [])], confidence: assessment.confidence, missingFields: expectedFields };
    }
    // Model-classified refusal, in whatever language the session runs in --
    // catches phrasing the static isExplicitPatientRefusal keyword list
    // (English-only fast path, checked unconditionally by the caller) will
    // never cover. Reported as a risk signal so runtime-execution-api.ts can
    // route it into the same "patient declined to continue" pause branch.
    if (assessment.intent === "refusal") {
      return { fields: input.currentContext.fields, responseCategory: "text", riskLevel, riskSignals: [...riskSignals, "patient_refusal_semantic"], confidence: assessment.confidence, missingFields: expectedFields.length ? [field] : [] };
    }
    if (!assessment.accepted) {
      return {
        fields: input.currentContext.fields,
        responseCategory: "text",
        riskLevel,
        riskSignals,
        confidence: "confidence" in assessment ? assessment.confidence : 0,
        missingFields: expectedFields.length ? [field] : [],
      };
    }
    // For a single-field prompt there is nothing to split, so the patient's
    // own wording is always what gets stored -- the assessment above only
    // decided accept/reject. Merging its extractedFields here would let the
    // model's own phrasing silently replace the patient's, which is exactly
    // the "AI supplies the answer" failure this system is meant to prevent.
    // Only a genuinely multi-field prompt (e.g. splitting one message into
    // distressingSituation + automaticThought) needs the model's help
    // separating clinically distinct concepts.
    if (expectedFields.length > 1) {
      for (const [allowedField, value] of Object.entries(assessment.extractedFields ?? {})) {
        if (expectedFields.includes(allowedField)) nextFields[allowedField] = value;
      }
    }
  }

  const currentFieldValue = input.currentContext.fields[field];
  if (Array.isArray(currentFieldValue) && !LIST_BUILDING_VALIDATION_KINDS.has(kind) && field !== "evidenceFor" && field !== "evidenceAgainst" && kind !== "participation_percentages" && !numericLike) {
    // A follow-up/confirmation prompt sharing a list-typed field (e.g. one of
    // several "problems" elicitation questions) must not silently overwrite
    // the list already built by an earlier prompt just because it has no
    // validation.kind of its own. Treat it as one more entry in the same
    // list instead of destroying everything collected so far.
    const current = currentFieldValue as string[];
    if (isNoMoreEvidence(rawText)) {
      nextFields[`${field}NoMore`] = true;
    } else if (!isDuplicateListEntry(current, rawText)) {
      nextFields[field] = [...current, rawText].filter(Boolean);
    }
  } else if (kind === "language_lock_from_first_substantive_message") {
    // The protocol locks the session language from the patient's own first
    // substantive reply rather than asking a meta-question about it.
    nextFields.sessionLanguage = detectScriptLocale(rawText);
    nextFields.languageLocked = true;
  } else if (CUMULATIVE_RATING_FIELDS[field] && numericLike) {
    // These prompts are reused turn after turn to rate one list item at a
    // time; accumulate instead of overwriting so later totals are correct.
    const current = Array.isArray(input.currentContext.fields[field]) ? (input.currentContext.fields[field] as number[]) : [];
    const value = validPercent ? percent : deterministic.handled && deterministic.valid ? Number(deterministic.value) : null;
    if (typeof value === "number" && Number.isFinite(value)) {
      nextFields[field] = [...current, value];
      nextFields[CUMULATIVE_RATING_FIELDS[field]] = value;
    }
  } else if (numericLike && (directlyEnteredFields.length > 1 || derivedBooleanFields.length > 0)) {
    directlyEnteredFields.forEach((expectedField, index) => { nextFields[expectedField] = numericValues[index]; });
    derivedBooleanFields.forEach((expectedField) => { nextFields[expectedField] = true; });
  } else if (field === "initialATBeliefPercent" || field === "conclusionBeliefPercent" || field === "revisedATBeliefPercent" || field === "initialEmotionIntensityPercent" || field === "newEmotionIntensities") {
    nextFields[field] = validPercent ? percent : input.patientInput.value;
  } else if (kind === "computed_remainder") {
    // The patient (not the assistant) states their own remaining share; the
    // runtime only checks it against the mathematical remainder of the
    // other contributors already recorded, so a mismatch can be explored
    // via the existing "participantRejectsRemainder" branch instead of the
    // assistant silently supplying or overwriting the number.
    const otherRounds = (nextFields.participationRatingsRound1 ?? nextFields.participationRatingRounds) as Array<{ percent: number }> | undefined;
    const sumOthers = Array.isArray(otherRounds) ? otherRounds.reduce((sum, item) => sum + (Number(item?.percent) || 0), 0) : 0;
    const expectedRemainder = Math.max(0, 100 - sumOthers);
    nextFields[field] = validPercent ? percent : input.patientInput.value;
    nextFields.expectedParticipationRemainder = expectedRemainder;
    nextFields.participantRejectsRemainder = typeof percent === "number" && Math.abs(percent - expectedRemainder) > 1;
  } else if (kind === "participation_percentages" && field === "participationRatingRounds") {
    // Step 6 (re-rating, bounded to rounds 2-3 -- see the maxIterations
    // comment on updated-percentage in source-fidelity-catalog.ts for why
    // this stops at a fixed round count rather than a dynamic stability
    // loop). Unlike the flat participationRatingsRound1 list below, this
    // field is an array OF ROUNDS -- each round itself an array of
    // {contributor, percent} entries -- since the same prompt is answered
    // once per contributor, across two full passes. A new round starts
    // exactly when the previous one (or none yet) already covers every
    // contributor.
    const contributors = Array.isArray(nextFields.contributors) ? (nextFields.contributors as string[]) : [];
    const rounds = Array.isArray(nextFields.participationRatingRounds) ? (nextFields.participationRatingRounds as Array<Array<{ contributor: string; percent: number }>>) : [];
    const percentMatch = rawText.match(/-?\d+(?:\.\d+)?/);
    if (percentMatch && contributors.length > 0) {
      const contributorPercent = Number(percentMatch[0]);
      const lastRound = rounds[rounds.length - 1];
      const startNewRound = !lastRound || lastRound.length >= contributors.length;
      const roundInProgress = startNewRound ? [] : lastRound;
      const contributorName = contributors[roundInProgress.length] ?? `Contributor ${roundInProgress.length + 1}`;
      const updatedRound = [...roundInProgress, { contributor: contributorName, percent: contributorPercent }];
      const updatedRounds = startNewRound ? [...rounds, updatedRound] : [...rounds.slice(0, -1), updatedRound];
      nextFields.participationRatingRounds = updatedRounds;
      const roundComplete = updatedRound.length >= contributors.length;
      nextFields.allContributorsRatedThisRound = roundComplete;
      nextFields.currentParticipationContributorText = contributors[updatedRound.length];
      nextFields.participationReratingComplete = roundComplete && updatedRounds.length >= 2;
    }
  } else if (LIST_BUILDING_VALIDATION_KINDS.has(kind) || field === "evidenceFor" || field === "evidenceAgainst") {
    // A growing list the patient builds one entry at a time (problems,
    // goals, contributors, symptom items, evidence, disadvantages, ...).
    // Skip an exact repeat of an existing entry instead of registering it
    // as a second, distinct item.
    const current = Array.isArray(input.currentContext.fields[field]) ? (input.currentContext.fields[field] as string[]) : [];
    if (isNoMoreEvidence(rawText)) {
      nextFields[`${field}NoMore`] = true;
    } else if (isDuplicateListEntry(current, rawText)) {
      nextFields[`${field}Duplicate`] = true;
    } else {
      nextFields[field] = [...current, rawText].filter(Boolean);
      nextFields[`${field}NoMore`] = false;
      nextFields[`${field}Duplicate`] = false;
      // S07's empty chair stores both sides' turns in one flat list, so the
      // worksheet had to guess who was speaking from array-index parity --
      // labels that silently shift if an entry is added, edited or removed.
      // Record the speaker at capture time instead. Emotion always speaks
      // first (the Step 3 prompt is "Emotion, speak directly to Reason"),
      // and the chairs alternate from there.
      if (field === "emotionReasonDialogue") {
        const speakers = Array.isArray(nextFields.emotionReasonSpeakers) ? (nextFields.emotionReasonSpeakers as string[]) : [];
        nextFields.emotionReasonSpeakers = [...speakers, speakers[speakers.length - 1] === "emotion" ? "reason" : "emotion"];
      }
      // The S06 modifier-decomposition follow-up ("Is [core situation]
      // harder when...") refers back to the first item the participant
      // named, before the list branches into specific variants.
      if (field === "symptomItems") nextFields.symptomCoreSituation = (nextFields[field] as string[])[0];
    }
  } else if (field === "automaticThought") {
    // Leave the field unset (rather than storing a feeling/urge verbatim as
    // "the thought") so it comes back through missingFields and the patient
    // is asked what specifically went through their mind.
    nextFields.automaticThoughtReportedAsFeeling = looksLikeFeelingOrUrgeNotThought(rawText);
    if (!nextFields.automaticThoughtReportedAsFeeling) nextFields.automaticThought = rawText;
  } else if (field === "underlyingBelief") {
    nextFields.underlyingBelief = rawText;
    nextFields.workingAutomaticThought = rawText;
  } else if (field === "workingAutomaticThought") {
    nextFields.workingAutomaticThought = rawText;
  } else if (/BodySensations$/i.test(field) && looksLikeFeelingNotBodySensation(rawText)) {
    // Same idea for body-sensation prompts: an emotion word ("좌절감을 느낀다")
    // isn't a physical sensation, so leave the field unset and let the
    // missing-field clarification ask for one (racing heart, shaky hands, ...).
    nextFields[`${field}ReportedAsFeeling`] = true;
  } else if (expectedFields.length === 1) {
    nextFields[field] = deterministic.handled && deterministic.valid ? deterministic.value : input.patientInput.value;
  }

  // Some prompts (e.g. the second/third TBCT candidate examples) are meant to
  // surface a *different* reaction than an earlier sibling field. If the
  // patient's answer just repeats the sibling verbatim, flag it so a
  // catalog-authored clarification prompt can gently invite them to consider
  // how this situation might differ, instead of silently accepting the copy.
  const siblingField = (input.currentPromptItem?.validation as { siblingField?: unknown } | null)?.siblingField;
  if (typeof siblingField === "string" && typeof nextFields[field] === "string" && typeof nextFields[siblingField] === "string") {
    nextFields[`${field}RepeatsSibling`] = normalizeText(nextFields[field] as string) === normalizeText(nextFields[siblingField] as string);
  }

  // Multi-concept text prompts must not copy one value into clinically distinct
  // fields. Accept explicit `field: value` segments; otherwise keep the first
  // field and request the missing concepts on the same PromptItem.
  if (!numericLike && expectedFields.length > 1 && explicitlyProvidedFields.size === 0) {
    for (const expectedField of expectedFields) {
      const escaped = expectedField.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = rawText.match(new RegExp(`(?:^|[,;\\n])\\s*${escaped}\\s*:\\s*([^,;\\n]+)`, "i"));
      if (match?.[1]?.trim()) nextFields[expectedField] = match[1].trim();
    }
  }
  const missingExpectedFields = expectedFields.filter((expectedField) => nextFields[expectedField] === undefined || nextFields[expectedField] === "");

  // Derive a `<field>Count` for every list-shaped field so branch conditions
  // already authored in the catalog (e.g. "evidenceForCount < 2") have a
  // real value to read instead of always evaluating against `undefined`.
  for (const [key, value] of Object.entries(nextFields)) {
    if (Array.isArray(value)) nextFields[`${key}Count`] = value.length;
  }
  refreshListRatingPointers(nextFields);
  for (const [listField, rule] of Object.entries(LIST_SUFFICIENCY_RULES)) {
    const count = Number(nextFields[`${listField}Count`] ?? 0);
    nextFields[rule.sufficiencyField] = count >= rule.target
      || (nextFields[`${listField}NoMore`] === true && count >= rule.minBeforeNoMore);
  }
  // S08 Steps 10/12 pair each loop's entries 1:1 with the previous loop's
  // (one rebuttal per defense item, one surrebuttal per rebuttal, one
  // "Therefore..." per surrebutted pair). Their repeat_until prompts complete
  // on these derived flags, so the loop keeps inviting the NEXT item until
  // every pair is covered -- or the participant says they cannot answer one,
  // which S08's unrebutted-defense-note then records explicitly.
  const pairCompletion: Array<{ listField: string; pairedField: string; completeField: string }> = [
    { listField: "prosecutionRebuttals", pairedField: "defenseEvidence", completeField: "prosecutionRebuttalsComplete" },
    { listField: "defenseSurrebuttals", pairedField: "prosecutionRebuttals", completeField: "defenseSurrebuttalsComplete" },
    { listField: "thereforeConclusions", pairedField: "defenseSurrebuttals", completeField: "thereforeConclusionsComplete" },
  ];
  for (const { listField, pairedField, completeField } of pairCompletion) {
    const count = Number(nextFields[`${listField}Count`] ?? 0);
    const pairedCount = Number(nextFields[`${pairedField}Count`] ?? 0);
    nextFields[completeField] = pairedCount > 0 && (count >= pairedCount || nextFields[`${listField}NoMore`] === true);
  }

  return {
    fields: nextFields,
    responseCategory: typeof input.patientInput.value === "boolean" ? (input.patientInput.value ? "affirmative" : "negative") : Array.isArray(input.patientInput.value) ? "selection" : "text",
    emotionalState: lowered.includes("anxious") || lowered.includes("anxiety") ? "anxious" : lowered.includes("relief") ? "relieved" : lowered.includes("good") ? "stable" : undefined,
    activityCompletion: input.patientInput.kind === "activity_completion" ? (String(input.patientInput.value) as StateExtractionResult["activityCompletion"]) : input.currentContext.activityCompletion,
    homeworkStatus: input.patientInput.kind === "homework_status" ? (String(input.patientInput.value) as StateExtractionResult["homeworkStatus"]) : input.currentContext.homeworkStatus,
    riskLevel,
    riskSignals,
    confidence: 0.92,
    missingFields: riskSignals.length ? [] : missingExpectedFields,
  };
}

export function mergeExtractedRuntimeContext(context: RuntimeContext, extracted: StateExtractionResult): RuntimeContext {
  return {
    ...context,
    fields: extracted.fields,
    responseCategory: extracted.responseCategory,
    emotionalState: extracted.emotionalState,
    activityCompletion: extracted.activityCompletion ?? context.activityCompletion,
    homeworkStatus: extracted.homeworkStatus ?? context.homeworkStatus,
    riskLevel: extracted.riskLevel,
    riskSignals: extracted.riskSignals,
  };
}
