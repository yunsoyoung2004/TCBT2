import type { PatientInput, RuntimeContext, StateExtractionResult } from "@/types/runtime-session";
import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import { assessRuntimePatientInput, requiresSemanticInputAssessment } from "@/lib/runtime/runtime-input-assessment";
import { parseDeterministicPromptInput } from "@/lib/runtime/runtime-deterministic-input";

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isNoMoreEvidence(text: string) {
  const normalized = normalizeText(text);
  return [
    "없어요",
    "더 생각나는 건 없습니다",
    "i cannot think of another one",
    "nao consigo pensar em mais nenhum",
    "não consigo pensar em mais nenhum",
    "more none",
    "none",
    "nothing else",
    "no more",
  ].some((phrase) => normalized === phrase || normalized.includes(phrase));
}

const NON_ANSWER_TEXT = new Set([
  "hi", "hello", "hey", "yo", "test", "testing", "ok", "okay", "sure", "yes", "no", "true", "false", "idk", "i don't know", "i do not know",
  "\uC548\uB155", "\uC548\uB155\uD558\uC138\uC694", "\uD558\uC774", "\uD14C\uC2A4\uD2B8", "\uD14C\uC2A4\uD2B8\uC785\uB2C8\uB2E4", "\uB124", "\uC608", "\uC751", "\uADF8\uB798", "\uC88B\uC544\uC694", "\uBAB0\uB77C", "\uBAA8\uB974\uACA0\uC5B4\uC694", "\uC798 \uBAA8\uB974\uACA0\uC5B4\uC694", "\uC74C",
  "oi", "ol\u00E1", "ola", "teste", "sim", "n\u00E3o", "nao", "n\u00E3o sei", "nao sei",
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

export function isExplicitPatientRefusal(text: string) {
  return /\b(?:i\s+(?:do\s+not|don['’]?t)\s+want\s+(?:counsel(?:ing)?|therapy|to\s+continue)|stop\s+(?:the\s+)?session|leave\s+me\s+alone)\b/i.test(text.trim());
}

function compactText(value: string) {
  return normalizeText(value).replace(/[\s.,!?\u2026'"`~\u00B7\-_/\\()[\]{}]+/g, "");
}

function isMeaningfulTextResponse(input: {
  patientInput: PatientInput;
  promptItem?: PromptItem;
  field: string;
}) {
  if (input.patientInput.kind !== "text" || typeof input.patientInput.value !== "string") return true;
  const rawText = input.patientInput.value;
  if ((input.field === "evidenceFor" || input.field === "evidenceAgainst") && isNoMoreEvidence(rawText)) return true;

  const validation = input.promptItem?.validation as { kind?: string; values?: unknown } | null | undefined;
  const normalized = normalizeText(rawText);
  const activeQuestion = normalizeText(input.promptItem?.fallbackPatientText || input.promptItem?.verbatimText || "");
  const normalizedWithoutUiNoise = normalized.replace(/\b(?:read|read aloud)\b\s*$/i, "").trim();
  if (activeQuestion && activeQuestion.length >= 12 && (normalizedWithoutUiNoise === activeQuestion || normalizedWithoutUiNoise.includes(activeQuestion))) return false;
  const compact = compactText(rawText);
  if (!compact || NON_ANSWER_TEXT.has(normalized) || NON_ANSWER_TEXT.has(compact)) return false;

  if (validation?.kind === "boolean") {
    return ["yes", "no", "true", "false", "\uB124", "\uC608", "\uC751", "\uC544\uB2C8", "\uC544\uB2C8\uC694", "sim", "n\u00E3o", "nao"].includes(normalized);
  }
  if (validation?.kind === "enum" && Array.isArray(validation.values)) {
    return validation.values.some((value) => normalizeText(String(value)) === normalized);
  }

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
  const numericLike = kind === "rating" || /intensity|percent|rating|score|weight/i.test(field);
  const validPercent = typeof percent === "number" && percent >= 0 && percent <= 100;
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
  if (!riskSignals.length && input.currentPromptItem && requiresSemanticInputAssessment({ patientInput: input.patientInput, promptItem: input.currentPromptItem, field })) {
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
    for (const [allowedField, value] of Object.entries(assessment.extractedFields ?? {})) {
      if (expectedFields.includes(allowedField)) nextFields[allowedField] = value;
    }
  }

  if (numericLike && (directlyEnteredFields.length > 1 || derivedBooleanFields.length > 0)) {
    directlyEnteredFields.forEach((expectedField, index) => { nextFields[expectedField] = numericValues[index]; });
    derivedBooleanFields.forEach((expectedField) => { nextFields[expectedField] = true; });
  } else if (field === "initialATBeliefPercent" || field === "conclusionBeliefPercent" || field === "revisedATBeliefPercent" || field === "initialEmotionIntensityPercent" || field === "newEmotionIntensities") {
    nextFields[field] = validPercent ? percent : input.patientInput.value;
  } else if (field === "evidenceFor" || field === "evidenceAgainst") {
    const current = Array.isArray(input.currentContext.fields[field]) ? (input.currentContext.fields[field] as string[]) : [];
    if (isNoMoreEvidence(rawText)) {
      nextFields[`${field}NoMore`] = true;
    } else {
      nextFields[field] = [...current, rawText].filter(Boolean);
      nextFields[`${field}NoMore`] = false;
    }
  } else if (field === "automaticThought") {
    nextFields.automaticThought = rawText;
  } else if (field === "underlyingBelief") {
    nextFields.underlyingBelief = rawText;
    nextFields.workingAutomaticThought = rawText;
  } else if (field === "workingAutomaticThought") {
    nextFields.workingAutomaticThought = rawText;
  } else if (expectedFields.length) {
    nextFields[field] = deterministic.handled && deterministic.valid ? deterministic.value : input.patientInput.value;
  }

  // Multi-concept text prompts must not copy one value into clinically distinct
  // fields. Accept explicit `field: value` segments; otherwise keep the first
  // field and request the missing concepts on the same PromptItem.
  if (!numericLike && expectedFields.length > 1) {
    for (const expectedField of expectedFields) {
      const escaped = expectedField.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = rawText.match(new RegExp(`(?:^|[,;\\n])\\s*${escaped}\\s*:\\s*([^,;\\n]+)`, "i"));
      if (match?.[1]?.trim()) nextFields[expectedField] = match[1].trim();
    }
  }
  const missingExpectedFields = expectedFields.filter((expectedField) => nextFields[expectedField] === undefined || nextFields[expectedField] === "");

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
