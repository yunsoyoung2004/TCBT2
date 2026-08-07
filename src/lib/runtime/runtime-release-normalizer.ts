import type { ClinicalStageNode, ConditionExpression, PromptItem, SourceFidelityEdge, ValidationRule } from "@/lib/protocol/source-fidelity-types";
import type { PolicyBundle, RuntimeNode, RuntimePromptItem, RuntimeRelease, RuntimeRoleDefinition, RuntimeSpeakerRoleId, RuntimeTransitionRule, SourceFidelityReleaseSnapshot } from "@/types/protocol-runtime";

const DEFAULT_OUTPUT_SCHEMA_VERSION = "clinical-language/v2";

const DEFAULT_RUNTIME_ROLES: RuntimeRoleDefinition[] = [
  {
    id: "tbct_guide",
    name: "TBCT guide",
    kind: "speaker",
    systemGuidance: "Guide one focused TBCT step in supportive, patient-facing language.",
    allowedActions: ["ask", "reflect", "validate", "summarize"],
    forbiddenActions: ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
  },
  {
    id: "therapist",
    name: "Therapist",
    kind: "speaker",
    systemGuidance: "Use a collaborative clinical stance and stay within the active protocol step.",
    allowedActions: ["ask", "reflect", "validate", "summarize"],
    forbiddenActions: ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
  },
  {
    id: "psychoeducation_guide",
    name: "Psychoeducation guide",
    kind: "speaker",
    systemGuidance: "Explain the active TBCT concept briefly, then invite one focused response when appropriate.",
    allowedActions: ["educate", "ask", "summarize"],
    forbiddenActions: ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
  },
  {
    id: "closing_guide",
    name: "Closing guide",
    kind: "speaker",
    systemGuidance: "Close or bridge the active step without changing session state.",
    allowedActions: ["close", "summarize", "validate"],
    forbiddenActions: ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
  },
  {
    id: "session_manager",
    name: "Session manager",
    kind: "controller",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "transition_controller",
    name: "Transition controller",
    kind: "controller",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "memory_manager",
    name: "Memory manager",
    kind: "controller",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "protocol_validator",
    name: "Protocol validator",
    kind: "evaluator",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "safety_evaluator",
    name: "Safety evaluator",
    kind: "evaluator",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "style_evaluator",
    name: "Style evaluator",
    kind: "evaluator",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
];

// "use" was deliberately removed from this list: it's meant to catch
// clinician/authoring instructions ("Use the enclosed rubric to score..."),
// but several already-approved patient-facing scale explanations are
// legitimately imperative sentences that start with "Use" ("Use this 0-5
// scale for each problem: ..." -- see APPROVED_PATIENT_TEXT in
// runtime-static-message.ts). Keeping "use" here silently discarded those
// and replaced them with the generic locale fallback on every S02 CCPH/CCGH
// scale presentation. No catalog `marker` currently starts with "use", so
// isUsableMarkerLeadIn loses no coverage by dropping it.
const INTERNAL_GUIDANCE_PATTERN = /^(collect|prompt|identify|elicit|capture|explore|help|support|confirm|introduce|run|present|close|start|continue|rate|re-?rate|offer|invite|explain|keep|surface|anchor|set up|formulate|map|convert|prepare|begin|get|deepen|choose|score|establish|reflect|validate)\b/i;

/** A `marker` excerpt is usable as a patient-facing lead-in only if it doesn't
 * itself read like a therapist/authoring instruction (e.g. "identify at
 * least two", "confirm the working thought"). */
function isUsableMarkerLeadIn(text: string) {
  return !INTERNAL_GUIDANCE_PATTERN.test(text) && !/^Step\s+\d+\s*:/i.test(text) && !/\b(?:ask|invite|guide|instruct) the participant\b/i.test(text);
}

// "role_transition" is deliberately absent: every role_transition prompt in
// the catalog carries outputFields expecting a genuine patient answer (a
// ready confirmation, a pre/post rating, a verdict). Treating the type as
// passive made those steps complete as soon as the assistant delivered the
// instruction, before the patient ever confirmed readiness or supplied the
// rating -- exactly the "role transitions never wait for ready" and "missing
// intermediate ratings" defects flagged for S07/S08. Falling through to the
// generic outputFields.length > 0 check below fixes this without special-casing.
export const PASSIVE_PROMPT_TYPES = new Set<PromptItem["type"]>([
  "instruction",
  "explanation",
  "transition",
  "worksheet_instruction",
  "closing",
]);

export function defaultFallbackPatientText(locale: string) {
  if (locale.toLowerCase().startsWith("ko")) return "천천히 생각해 보셔도 괜찮습니다. 지금 가장 중요하게 느껴지는 점을 말씀해 주세요.";
  if (locale.toLowerCase().startsWith("pt")) return "Podemos ir com calma. O que parece mais importante para você neste momento?";
  return "We can take this one step at a time. What feels most important to share right now?";
}

function isLocaleConsistentFallbackText(value: string, locale: string) {
  if (!locale.toLowerCase().startsWith("ko")) return true;
  return /[\uAC00-\uD7A3]/.test(value);
}

// Korean translations for the curated/approved static texts in
// runtime-static-message.ts's APPROVED_PATIENT_TEXT (plus the 5 safety-pause
// messages) -- the highest-traffic, most clinically load-bearing moments in
// each session (scale explanations, safety pauses, CRP/Trial chair prompts).
// This does NOT cover the ~200 remaining prompts whose patient-facing text
// is extracted verbatim from the English-only source corpus
// (tbct-source-text.generated.ts) or generated by the English-only fallback
// generator above -- translating those needs either a parallel Korean
// source corpus or per-prompt hand translation, a separate, larger effort
// from this pass.
const REVIEWED_KOREAN_PROMPT_TEXT: Record<string, string> = {
  "tbct-s01-n01-p01-warm-acknowledgement": "많은 것을 감당해 오신 것 같아요. 여기 와 주셔서 감사합니다. 이 모든 일을 함께 더 분명하게 살펴보는 데 도움이 되는 것부터 시작하겠습니다.",
  "tbct-s02-n03-p01-offer-private-placeholders": "문제를 평가하기 전에, 어떤 분들은 자세히 이야기하고 싶지 않은 개인적인 문제가 있을 수 있어요. 그런 경우라면 자세히 설명하지 않아도 괜찮아요 — 그냥 X, Y, Z라고 부르셔도 되고, 그래도 함께 평가할 수 있어요. 그런 문제를 추가하시고 싶으신가요?",
  "tbct-s02-n04-p02-six-anchor-problem-scale": "각 문제에 대해 이 0~5 척도를 사용해 주세요: 0 연한 파란색—작거나 더 이상 문제가 아님; 1 진한 파란색—불편하지만 비교적 쉽게 해결 가능; 2 연한 초록색—명확한 불편감이 있고/있거나 해결이 어려움; 3 진한 초록색—상당한 불편감이 있고/있거나 해결이 매우 어려움; 4 노란색—괴로움을 느끼고 해결이 매우 어려움; 5 빨간색—해결책이 보이지 않을 만큼 괴로움.",
  "tbct-s02-n04-p03-discomfort-distress-distinction": "0~3점은 아직 감당할 수 있는 불편감을 의미해요. 4~5점은 감당하기 힘든 괴로움을 의미하고, 치료에서 우선적으로 다뤄야 할 부분이에요. 이 구분이 이해되시나요?",
  "tbct-s02-n08-p02-six-anchor-goal-scale": "각 목표에도 같은 0~5 색상 척도를 사용해 주세요: 0 연한 파란색, 1 진한 파란색, 2 연한 초록색, 3 진한 초록색, 4 노란색, 5 빨간색. 지금 각 목표가 얼마나 어려운지 평가해 주세요.",
  "tbct-s02-n10-p01-goal-total": "목표 점수들을 모두 합산해서 몇 개가 노란색이나 빨간색 범위에 있는지 확인해 드릴게요.",
  "tbct-s02-n11-p01-thanks": "오늘 함께 문제와 목표를 정리해 주셔서 감사해요.",
  "tbct-s02-n11-p02-recorded-summary": "문제와 목표 점수가 기록되었으니, 앞으로 변화를 비교해 볼 수 있어요.",
  "tbct-s02-n11-p03-final-score-summary": "이 점수들은 무엇이 가장 중요한지 파악하고 시간에 따른 변화를 추적할 수 있는 시작점이 되어줄 거예요.",
  "tbct-s04-n12-p02-all-actions-first": "결론을 내리기 전에, 함께 파악한 행동들과 반응들을 먼저 살펴볼게요.",
  "tbct-s05-n05-p02-new-contributor-next-round": "다음 라운드에서, 이 일에 관련된 다른 사람이나 상황, 요인이 더 있을까요?",
  "tbct-s05-n10-p01-participant-summary-table": "함께 만든 참여도 그리드(Participation Grid)를 살펴볼게요. 각 기여자와 부여하신 값들을 함께 확인해요.",
  "tbct-s05-n11-p01-pause-grid": "지금 잠시 참여도 그리드(Participation Grid)를 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 치료사나 위기상담 전화에 바로 연락하는 게 더 중요해요. 안전해지시면 우리 함께 다시 이어갈 수 있어요.",
  "tbct-s06-n01-p01-warm-opening": "환영합니다. 준비가 되시면, 최근에 힘들었던 일에 대해 편하게 말씀해 주세요 — 말씀하시는 대로 따라갈게요.",
  "tbct-s06-n04-p01-six-anchor-symptom-scale": "각 증상에 대해 이 0~5 색상 척도를 사용해 주세요: 0 연한 파란색, 1 진한 파란색, 2 연한 초록색, 3 진한 초록색, 4 노란색, 5 빨간색. 점수가 높을수록 괴로움이나 어려움이 크다는 뜻이에요.",
  "tbct-s06-n04-p02-calibration-anchor": "자신의 항목들을 평가하기 전에, 척도를 먼저 조정해 볼게요. 같은 0~5 척도에서, 지금 이 순간처럼 아주 가벼운 상황 — 예를 들어 저와 이렇게 대화하는 것 — 은 몇 점 정도일까요?",
  "tbct-s06-n04-p03-color-zone-rules": "파란색과 초록색 점수는 감당할 수 있는 불편감을 나타내고, 노란색과 빨간색 점수는 더 많은 주의가 필요한 괴로움을 나타내요.",
  "tbct-s06-n06-p03-participant-capsule-summary": "한두 문장으로, 불편감을 느끼는 상황과 괴로움을 느끼는 상황을 어떻게 정리해 볼 수 있을까요?",
  "tbct-s06-n08-p01-intensity": "연습을 계획할 때 강도를 고려해 보세요: 도전이 되지만 여전히 안전하고 감당할 수 있으려면 불편감이 얼마나 강해야 할까요?",
  "tbct-s06-n08-p02-duration": "이번엔 지속 시간을 생각해 볼게요: 도망치거나 안전행동을 사용하지 않고 그 안전한 상황에 얼마나 머물 수 있을까요?",
  "tbct-s06-n08-p03-frequency": "그리고 빈도를 생각해 볼게요: 새로운 학습이 일어나려면 이 연습을 얼마나 자주 반복할 수 있을까요?",
  "tbct-s06-n09-p03-overcoming-curve": "안전한 상황에 머물며 반복해서 연습하는 목표는 즉각적인 안도감이 아니라, 그 불편감을 견디고 극복할 수 있다는 것을 배우는 거예요.",
  "tbct-s06-n10-p01-introduce-safety-behaviors": "때때로 우리는 안전행동을 통해 불안을 줄이려고 해요. 이런 행동은 잠깐 도움이 되지만, 그 상황이 감당할 수 있다는 것을 배우지 못하게 막을 수도 있어요. 어떤 안전행동을 알아차리셨나요?",
  "tbct-s06-n10-p03-render-circuit-two": "회로 2는 두려운 상황, 불안한 예측, 불편한 감정, 그리고 안전행동이 반복되는 순환이에요. 직접 경험한 예시로 그 순환을 함께 그려볼게요.",
  "tbct-s06-n10-p05-circuit-two-summary": "회로 2의 순환을 자신의 말로 어떻게 정리해 보시겠어요?",
  "tbct-s06-n11-p01-session-worksheet": "증상 계층과 회로 2 노트는 치료사와 함께 검토할 워크시트로 보관하실 수 있어요.",
  "tbct-s06-n13-p01-pause-hierarchy": "지금 잠시 증상 계층 작업을 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 치료사나 위기상담 전화에 바로 연락하는 게 더 중요해요. 안전해지시면 우리 함께 다시 이어갈 수 있어요.",
  "tbct-s07-n01-p01-crp-offer": "오늘은 중요하지만 어려운 결정을 합의적 역할극(Consensual Role-Play)을 통해 함께 다뤄보고 싶어요. 두려운 행동을 강요받지 않을 거예요; 중요한 건 무엇을 배우는가예요. 한번 해보시겠어요?",
  "tbct-s07-n01-p02-crp-consent": "'아직 준비가 안 됐다'는 것도 충분히 괜찮은 결과라는 걸 알고, 합의적 역할극을 계속 진행해 보시겠어요?",
  "tbct-s07-n02-p01-language-lock": "지금까지 사용하신 언어로 계속 진행할게요. 그리고 기법과 의자 역할의 이름은 계속 일관되게 사용할게요.",
  "tbct-s07-n02-p02-both-parts-healthy": "두 부분 모두 같은 자아의 건강한 기능이에요. 감정(Emotion)은 보호하고, 이유(Reason)는 판단해요. 둘 중 하나가 더 우월한 게 아니고, 목표는 한쪽이 다른 쪽을 이기는 게 아니에요.",
  "tbct-s07-n03-p01-ambivalence-normalization": "한쪽은 어떤 행동을 원하고 다른 한쪽은 피하고 싶어하는 건 자연스러운 일이에요. 결정을 강요하지 않고 양쪽 모두의 이야기를 들어볼게요.",
  "tbct-s07-n05-p01-emotion-weight": "감정(Emotion) 의자에서, 단점 쪽에 몇 퍼센트의 무게를 두시겠어요? 남은 퍼센트는 장점 쪽으로 갈게요.",
  "tbct-s07-n05-p02-reason-weight": "이유(Reason) 의자에서, 장점 쪽에 몇 퍼센트의 무게를 두시겠어요? 남은 퍼센트는 단점 쪽으로 갈게요.",
  "tbct-s07-n08-p01-consensus-weights": "합의(Consensus) 의자에서, 양쪽 이야기를 다 들은 후 장점과 단점에 최종적으로 몇 퍼센트씩 부여하시겠어요?",
  "tbct-s07-n09-p01-readiness-decision": "양쪽 이야기를 들은 후, 지금 이 순간의 결정은 무엇인가요: 준비됨, 아직 준비 안 됨, 아니면 아직 결정 못함? 어떤 것이든 괜찮아요.",
  "tbct-s07-n10-p01-proposed-actions": "그 결정에 맞는 작은 행동이 있다면 무엇일까요?",
  "tbct-s07-n10-p02-possible-obstacles": "그 행동을 어렵게 만들 수 있는 장애물은 무엇일까요?",
  "tbct-s07-n10-p03-obstacle-solutions": "그 장애물에 대응하는 데 도움이 될 만한 것은 무엇일까요?",
  "tbct-s07-n10-p04-implementation-plan": "언제, 어디서 이 행동을 시도해 보시겠어요?",
  "tbct-s07-n10-p05-support-people": "압박하지 않고 지지해 줄 수 있는 사람이 있을까요?",
  "tbct-s07-n10-p06-follow-up": "배운 것을 언제, 어떻게 다시 돌아보고 싶으신가요?",
  "tbct-s07-n11-p01-plan-summary": "선택하신 계획을 요약해 주세요 — 행동, 예상되는 장애물, 대응 방법, 지지, 그리고 다시 돌아볼 방법까지요. 결정은 여전히 본인의 것이에요.",
  "tbct-s07-n12-p01-stop-crp": "지금 잠시 역할극을 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 치료사나 위기상담 전화에 바로 연락하는 게 더 중요해요. 안전해지시면 우리 함께 다시 이어갈 수 있어요.",
  "tbct-s08-n14-p03-review-four-blocks": "판결 전에, 검사측 증거, 변호측 증거, 검사측 반박, 그리고 변호측 재반박을 함께 검토할게요.",
  "tbct-s08-n14-p04-participant-verdict": "네 가지를 모두 고려한 후, 배심원의 판결은 무엇인가요: 유죄 또는 무죄? 판결은 본인이 내리는 거예요.",
  "tbct-s08-n19-p02-daily-appeal-homework": "매일의 항소(appeal) 연습을 위해, 더 균형 잡히거나 긍정적인 믿음을 지지하는 증거를 하루에 하나씩 기록해 주세요.",
  "tbct-s08-n22-p01-stop-trial": "지금 잠시 재판을 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 치료사나 위기상담 전화에 바로 연락하는 게 더 중요해요. 안전해지시면 우리 함께 다시 이어갈 수 있어요.",
  "tbct-s03-n15-p01-pause-and-escalate": "지금 잠시 Intra-TR을 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 치료사나 위기상담 전화에 바로 연락하는 게 더 중요해요. 안전해지시면 우리 함께 다시 이어갈 수 있어요.",
};

export function resolvePromptLocaleText(promptItemId: string, value: string | undefined, locale: string) {
  if (locale.toLowerCase().startsWith("ko") && REVIEWED_KOREAN_PROMPT_TEXT[promptItemId]) return REVIEWED_KOREAN_PROMPT_TEXT[promptItemId];
  return resolveLocaleFallbackPatientText(value, locale);
}

function localizedSourcePromptText(promptItem: PromptItem, locale: string, fallbackCandidate: string | undefined) {
  if (locale.toLowerCase().startsWith("ko") && REVIEWED_KOREAN_PROMPT_TEXT[promptItem.id]) return REVIEWED_KOREAN_PROMPT_TEXT[promptItem.id];
  return fallbackCandidate;
}

export function resolveLocaleFallbackPatientText(value: string | undefined, locale: string) {
  // A source-specific prompt is safer than a generic question that changes the
  // clinical task. Locale mismatch remains visible to validation/audit and must
  // never silently turn into a generic protocol substitute.
  return isPatientSafeFallbackText(value) ? value!.trim() : defaultFallbackPatientText(locale);
}

export function isPatientSafeFallbackText(value: string | undefined) {
  const text = value?.trim() ?? "";
  if (!text || text.length > 600) return false;
  if (/^(?:---\s*)?(?:#{1,6}\s*)?(?:interaction style|role and purpose|safety and clinical guardrails|important guidelines)\b/i.test(text)) return false;
  if (/^(?:```|[-*]\s+(?:use|do not|never|always|close by|from reason|from emotion)\b)/i.test(text)) return false;
  if (INTERNAL_GUIDANCE_PATTERN.test(text) || /^Step\s+\d+\s*:/i.test(text) || /\b(?:ask|invite|guide|instruct) the participant\b/i.test(text)) return false;
  return !/(?:\bai\b|model|prompt|instruction|system message|node[-_ ]?id|role id|runtime state)/i.test(text);
}

function humanizeField(field: string) {
  // The word-boundary split below already inserts a space before "Percent"
  // (e.g. "...Belief" + " " + "Percent"), so replacing just "Percent$" added
  // a second leading space from " percentage" itself -- "belief  percentage"
  // (double space), verbatim in every S08 paired-rating question. \s* eats
  // that pre-existing space before substituting the single-spaced form.
  return field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/\s*Percent$/i, " percentage").toLowerCase();
}

/** Third-person clinical fields describe a hypothetical or other person, not the patient themselves. */
function pronounSetForField(field: string) {
  if (/^candidate|^otherPerson/i.test(field)) return { subject: "they", possessive: "their", object: "them", copulaHave: "would" };
  return { subject: "you", possessive: "your", object: "you", copulaHave: "do" };
}

function fieldCompletionClause(field: string) {
  const p = pronounSetForField(field);
  if (/emotion/i.test(field)) return `what emotion comes up for ${p.object}`;
  if (/thought/i.test(field)) return `what thought goes through ${p.possessive} mind`;
  if (/behavior/i.test(field)) return `what ${p.subject} ${p.subject === "they" ? "would do" : "do"}`;
  if (/reaction/i.test(field)) return `how ${p.subject} ${p.subject === "they" ? "would respond" : "respond"}`;
  if (/belief/i.test(field)) return `how much ${p.subject} ${p.subject === "they" ? "would believe" : "believe"} that`;
  if (/weight/i.test(field)) return "what percentage feels right to you";
  if (/intensity|percent/i.test(field)) return "how strong that feels";
  if (/summary/i.test(field)) return "how you would summarize that in your own words";
  if (/insight|meaning/i.test(field)) return "what that means to you";
  return `what comes to mind for ${p.object}`;
}

/** Turns an authoring `marker` fragment (a real clinical-script excerpt) into a
 * natural patient-facing question. Prefer the marker verbatim when it already
 * reads as a question; otherwise complete it with a clause built from the
 * output field so the result still asks something concrete instead of an
 * instruction like "Please describe your X for this step." */
function naturalMarkerQuestion(marker: string | undefined, field: string) {
  const cleaned = marker?.trim().replace(/\s+/g, " ").replace(/^(?:and|so|now|then)\s+/i, "");
  if (!cleaned || !isUsableMarkerLeadIn(cleaned)) return undefined;
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  const looksLikeQuestion = /[?]$/.test(capitalized) || /^(?:what|how|why|when|where|who|which|is|are|do|does|did|can|could|would|should|will)\b/i.test(capitalized);
  if (looksLikeQuestion) return /[?]$/.test(capitalized) ? capitalized : `${capitalized}?`;
  if (!field) return `${capitalized}?`;
  return `${capitalized}, ${fieldCompletionClause(field)}?`;
}

/** Formats the actual configured rating range instead of assuming 0-100%. */
function scaleRangeText(validation: { min?: unknown; max?: unknown } | null | undefined) {
  const min = Number(validation?.min ?? 0);
  const max = Number(validation?.max ?? 100);
  return max <= 5 ? `On a scale from ${min} to ${max}` : `From ${min} to ${max}%`;
}

function returningArrowQuestion(promptItem: PromptItem) {
  if (/thought-arrow$/.test(promptItem.id)) return naturalMarkerQuestion(promptItem.markerHint, "") ? `${naturalMarkerQuestion(promptItem.markerHint, "")!.replace(/\?$/, "")}, does the original thought get stronger, weaker, or stay the same?` : undefined;
  if (/emotion-arrow$/.test(promptItem.id)) return naturalMarkerQuestion(promptItem.markerHint, "") ? `${naturalMarkerQuestion(promptItem.markerHint, "")!.replace(/\?$/, "")}, what happens to the emotion?` : undefined;
  if (/behavior-arrow$/.test(promptItem.id)) return naturalMarkerQuestion(promptItem.markerHint, "") ? `${naturalMarkerQuestion(promptItem.markerHint, "")!.replace(/\?$/, "")}, what happens to the behavior?` : undefined;
  return undefined;
}

function sourceSpecificRuntimeFallback(promptItem: PromptItem) {
  const fields = promptItem.outputFields;
  const subject = fields[0] ? humanizeField(fields[0]) : "this step";
  const sourceStepSubject = promptItem.id.replace(/^.*-p\d+-/, "").replace(/-/g, " ") || subject;
  const validation = (promptItem.validation as { kind?: unknown; min?: unknown; max?: unknown } | null) ?? null;
  const validationKind = String(validation?.kind ?? "");
  const arrowQuestion = returningArrowQuestion(promptItem);
  if (arrowQuestion) return arrowQuestion;
  if (/^paired_ratings/.test(validationKind) && fields.length >= 2) {
    return `${scaleRangeText(validation)}, how would you rate both ${humanizeField(fields[0])} and ${humanizeField(fields[1])} right now?`;
  }
  if (promptItem.type === "rating" && fields[0]) {
    const lead = naturalMarkerQuestion(promptItem.markerHint, fields[0]);
    return lead ?? `${scaleRangeText(validation)}, how would you rate your ${humanizeField(fields[0])} right now?`;
  }
  if (promptItem.type === "role_transition") {
    const marker = promptItem.markerHint?.trim();
    if (marker && /^(?:please|take a moment)/i.test(marker)) return marker.endsWith(".") ? marker : `${marker}.`;
    return "Let's move into that role now. Take a moment to settle there before we continue.";
  }
  if (fields[0] && /evidence/i.test(fields[0])) {
    const marker = promptItem.markerHint?.trim();
    const usableMarker = marker && isUsableMarkerLeadIn(marker) ? marker : undefined;
    return usableMarker ? `${usableMarker.replace(/\.$/, "")} — what is one specific example that comes to mind?` : `What is one specific example of ${humanizeField(fields[0])}?`;
  }
  if (fields[0] && ["question", "clarification", "follow_up", "confirmation", "reflection"].includes(promptItem.type)) {
    return naturalMarkerQuestion(promptItem.markerHint, fields[0]) ?? `What would you say about ${humanizeField(fields[0])} right now?`;
  }
  if (promptItem.type === "reflection") return "Thank you for sharing that. We will keep it in view as we continue.";
  if (["instruction", "explanation", "transition", "worksheet_instruction"].includes(promptItem.type)) {
    return naturalMarkerQuestion(promptItem.markerHint, "") ?? `Let's continue with ${sourceStepSubject}, one step at a time.`;
  }
  return naturalMarkerQuestion(promptItem.markerHint, subject) ?? `What would you say about ${subject} right now?`;
}

function toConditionExpression(value: Record<string, unknown> | ConditionExpression | null | undefined) {
  if (!value || typeof value !== "object") return undefined;
  if (value.kind === "always") return { kind: "always" } satisfies ConditionExpression;
  if (typeof value.field !== "string" || typeof value.operator !== "string") return undefined;
  return {
    kind: "field",
    field: value.field,
    operator: value.operator as ConditionExpression["operator"],
    value: value.value as ConditionExpression["value"],
  } satisfies ConditionExpression;
}

/** validation.kind values that occur on a PASSIVE_PROMPT_TYPES-typed prompt
 * (instruction/explanation/transition/worksheet_instruction/closing) but
 * genuinely check something the PATIENT must supply this turn, verified
 * against each one's own source text/context rather than assumed from the
 * name alone (see the fix commit for the read-distortions/participation
 * cases this was written against). Kept as a narrow allowlist rather than
 * "any validation present" because most passive-typed validations
 * (exact_scale_anchors, courtroom_roles_understood, ccsh_summary, ...)
 * check the ASSISTANT's own delivered content, not a patient answer --
 * treating those as input-requiring would recreate the exact class of
 * deadlock this fix is for, just on different prompts. */
const PASSIVE_TYPE_REAL_ANSWER_VALIDATION_KINDS = new Set([
  "min_items",
  "exact_circuit_structure",
  "reject_non_green_homework",
  "defer_new_contributor_to_next_round",
  "boolean",
]);

/** completionEffect kinds that resolve on assistant delivery by design --
 * a safety pause and a session-completing summary must never wait for a
 * patient answer, even if their prompt happens to declare outputFields. */
const IMMEDIATE_COMPLETION_EFFECTS = new Set(["pause_session", "complete_session"]);

function promptRequiresPatientInput(promptItem: PromptItem) {
  const validationKind = String((promptItem.validation as { kind?: unknown } | null)?.kind ?? "");
  if (["calculated_problem_totals", "calculated_goal_totals"].includes(validationKind) || promptItem.id === "tbct-s02-n11-p02-recorded-summary") return false;
  if (["question", "clarification", "follow_up", "confirmation", "reflection", "rating"].includes(promptItem.type)) return true;
  if (PASSIVE_PROMPT_TYPES.has(promptItem.type)) {
    const completionEffectType = (promptItem as { completionEffect?: { type?: unknown } | null }).completionEffect?.type;
    if (typeof completionEffectType === "string" && IMMEDIATE_COMPLETION_EFFECTS.has(completionEffectType)) return false;
    return promptItem.outputFields.length > 0 && PASSIVE_TYPE_REAL_ANSWER_VALIDATION_KINDS.has(validationKind);
  }
  return promptItem.outputFields.length > 0;
}

function defaultCompletionCondition(promptItem: PromptItem): ConditionExpression {
  return promptRequiresPatientInput(promptItem)
    ? { kind: "field", field: "turn.patient_input_validated", operator: "equals", value: true }
    : { kind: "field", field: "turn.assistant_message_delivered", operator: "equals", value: true };
}

function defaultRoleId(promptItem: PromptItem, node: ClinicalStageNode): RuntimeSpeakerRoleId {
  if (node.speakerRoleId === "therapist" || node.speakerRoleId === "psychoeducation_guide" || node.speakerRoleId === "closing_guide" || node.speakerRoleId === "tbct_guide") return node.speakerRoleId;
  if (promptItem.type === "closing") return "closing_guide";
  if (["explanation", "instruction", "worksheet_instruction"].includes(promptItem.type)) return "psychoeducation_guide";
  return "tbct_guide";
}

function defaultAllowedActions(promptItem: PromptItem) {
  if (promptItem.type === "closing") return ["close", "summarize", "validate"];
  if (["explanation", "instruction", "worksheet_instruction"].includes(promptItem.type)) return ["educate", "ask"];
  if (["reflection", "summary"].includes(promptItem.type)) return ["reflect", "summarize"];
  return ["ask"];
}

function normalizeValidationRules(promptItem: PromptItem): ValidationRule[] {
  if (promptItem.validationRules?.length) return promptItem.validationRules.map((rule) => ({ ...rule }));
  if (promptItem.validation && typeof promptItem.validation.kind === "string") {
    return [{ id: `${promptItem.id}-validation`, kind: promptItem.validation.kind, ...promptItem.validation }];
  }
  return [];
}

export function normalizeRuntimePromptItem(input: {
  promptItem: PromptItem;
  node: ClinicalStageNode;
  locale: string;
  sequenceIndex?: number;
}): RuntimePromptItem {
  const { promptItem, node, locale } = input;
  const activationCondition = toConditionExpression(promptItem.activationCondition);
  const sourceCandidate = promptItem.fallbackPatientText ?? promptItem.verbatimText;
  const fallbackCandidate = localizedSourcePromptText(promptItem, locale, isPatientSafeFallbackText(sourceCandidate) ? sourceCandidate : sourceSpecificRuntimeFallback(promptItem));

  return {
    id: promptItem.id,
    sessionId: promptItem.sessionId,
    nodeId: promptItem.nodeId,
    roleId: promptItem.roleId ?? defaultRoleId(promptItem, node),
    scope: promptItem.scope ?? "step",
    sequenceIndex: promptItem.sequenceIndex ?? input.sequenceIndex ?? promptItem.order,
    executionMode: promptItem.executionMode ?? (activationCondition ? "conditional" : "serial"),
    modelGuidance: promptItem.modelGuidance?.trim() || promptItem.aiInstruction.trim(),
    requiredPatientFacingContent: [fallbackCandidate?.trim() || promptItem.verbatimText.trim()].filter(Boolean),
    fallbackPatientText: resolvePromptLocaleText(promptItem.id, fallbackCandidate, locale),
    clarificationPatientText: resolvePromptLocaleText(promptItem.id, promptItem.verbatimText || fallbackCandidate, locale),
    activationCondition,
    completionCondition: promptItem.completionCondition ?? defaultCompletionCondition(promptItem),
    allowedActions: promptItem.allowedActions?.length ? [...promptItem.allowedActions] : defaultAllowedActions(promptItem),
    forbiddenActions: promptItem.forbiddenActions?.length ? [...promptItem.forbiddenActions] : ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
    requiredFields: promptItem.requiredFields?.length ? [...promptItem.requiredFields] : [...promptItem.outputFields],
    validationRules: normalizeValidationRules(promptItem),
    maxAttempts: Math.max(1, promptItem.maxAttempts ?? 1),
    maxClarificationAttempts: 3,
    maxIterations: promptItem.maxIterations,
    requiresPatientInput: promptRequiresPatientInput(promptItem),
    outputSchemaVersion: promptItem.outputSchemaVersion ?? DEFAULT_OUTPUT_SCHEMA_VERSION,
    sourcePromptItemId: promptItem.id,
  };
}

function toTransitionRule(edge: SourceFidelityEdge): RuntimeTransitionRule {
  return {
    id: edge.id,
    targetNodeId: edge.target,
    condition: toConditionExpression(edge.condition),
    priority: edge.priority,
    isFallback: edge.isFallback,
  };
}

function normalizeRuntimeNode(input: {
  node: ClinicalStageNode;
  promptItems: RuntimePromptItem[];
  edges: SourceFidelityEdge[];
}): RuntimeNode {
  const { node, promptItems, edges } = input;
  const promptSequence = promptItems
    .filter((promptItem) => promptItem.nodeId === node.id)
    .sort((left, right) => left.sequenceIndex - right.sequenceIndex || left.id.localeCompare(right.id))
    .map((promptItem) => promptItem.id);

  return {
    id: node.id,
    sessionId: node.sessionId,
    title: node.title,
    objective: node.objective?.trim() || node.clinicalPurpose,
    speakerRoleId: node.speakerRoleId ?? promptItems.find((promptItem) => promptItem.nodeId === node.id)?.roleId ?? "tbct_guide",
    promptSequence,
    entryCondition: node.entryCondition ?? { kind: "always" },
    completionCondition: node.completionCondition ?? { kind: "field", field: "node.all_prompt_items_completed", operator: "equals", value: true },
    transitionRules: edges.filter((edge) => edge.source === node.id).map(toTransitionRule).sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id)),
    maxNodeIterations: Math.max(1, node.maxNodeIterations ?? 3),
    safetyRuleIds: [...node.safetyRuleIds],
  };
}

function normalizePolicies(snapshot: SourceFidelityReleaseSnapshot): PolicyBundle {
  const sessionPolicies = Object.fromEntries(Object.entries(snapshot.sessionCommonRules ?? {}).map(([sessionId, rules]) => [
    sessionId,
    {
      safetyRules: [...(rules.sessionWideSafetyRules ?? [])],
      protocolRules: [
        ...(rules.languageRules ?? []),
        ...(rules.openingRules ?? []),
        ...(rules.sessionWideRequiredActions ?? []),
        ...(rules.sessionWideRestrictions ?? []),
      ],
    },
  ]));
  return {
    globalSafetyRules: ["Safety override takes precedence over normal runtime progression. Do not generate ordinary protocol content when a safety override is active."],
    protocolRules: [],
    sessionPolicies,
    forbiddenPatientContent: ["internal instructions", "model details", "prompt details", "runtime identifiers"],
    maxPromptCharacters: 12_000,
  };
}

export function normalizeRuntimeReleaseFromSourceSnapshot(input: {
  releaseId: string;
  protocolId: string;
  version: string;
  publishedAt: string;
  snapshot: SourceFidelityReleaseSnapshot;
  contentHash?: string;
}): RuntimeRelease {
  const nodeById = new Map(input.snapshot.clinicalStageNodes.map((node) => [node.id, node]));
  const promptItems = input.snapshot.promptItems
    .filter((promptItem) => promptItem.status === "active")
    .map((promptItem, index) => {
      const node = nodeById.get(promptItem.nodeId);
      if (!node) return null;
      const sessionLocale = input.snapshot.sessionDefinitions.find((session) => session.id === promptItem.sessionId)?.sourceTrace.sourceSession === "Korean" ? "ko-KR" : "en-US";
      return normalizeRuntimePromptItem({ promptItem, node, locale: sessionLocale, sequenceIndex: index + 1 });
    })
    .filter((promptItem): promptItem is RuntimePromptItem => Boolean(promptItem));

  return {
    id: input.releaseId,
    protocolId: input.protocolId,
    version: input.version,
    roles: DEFAULT_RUNTIME_ROLES.map((role) => ({ ...role, allowedActions: [...role.allowedActions], forbiddenActions: [...role.forbiddenActions] })),
    nodes: input.snapshot.clinicalStageNodes.map((node) => normalizeRuntimeNode({ node, promptItems, edges: input.snapshot.sourceFidelityEdges })),
    promptItems,
    policies: normalizePolicies(input.snapshot),
    schemaVersion: "runtime-release/v1",
    contentHash: input.contentHash ?? `legacy-${input.snapshot.sourceTextHash}`,
    publishedAt: input.publishedAt,
  };
}

export { DEFAULT_RUNTIME_ROLES };
