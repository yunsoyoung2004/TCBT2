import type { PatientInput, RuntimeContext, StateExtractionResult } from "@/types/runtime-session";
import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";

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
}): Promise<StateExtractionResult> {
  const nextFields = { ...input.currentContext.fields };
  const rawText = Array.isArray(input.patientInput.value) ? input.patientInput.value.join(" ") : String(input.patientInput.value);
  const lowered = normalizeText(rawText);
  const payload: Record<string, unknown> = {};
  const validation = input.currentPromptItem?.validation as { kind?: string } | null | undefined;
  const field = String(input.currentPromptItem?.outputFields[0] ?? payload.field ?? payload.responseField ?? input.currentNode.requiredFields[0] ?? input.currentNode.id);
  const kind = String(validation?.kind ?? payload.kind ?? input.patientInput.kind);
  const percent = parsePercent(input.patientInput.value);
  const numericLike = kind === "rating" || /belief|intensity|percent/i.test(field);
  const validPercent = typeof percent === "number" && percent >= 0 && percent <= 100;
  if (numericLike && !validPercent) {
    return {
      fields: input.currentContext.fields,
      responseCategory: "text",
      riskLevel: input.currentContext.riskLevel ?? "low",
      riskSignals: [],
      confidence: 0.25,
      missingFields: [field],
    };
  }

  if (field === "initialATBeliefPercent" || field === "conclusionBeliefPercent" || field === "revisedATBeliefPercent" || field === "initialEmotionIntensityPercent" || field === "newEmotionIntensities") {
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
  } else {
    nextFields[field] = input.patientInput.value;
  }

  const riskSignals = ["danger", "harm", "stop", "suicide", "unsafe", "ending my life", "plan"].filter((keyword) => lowered.includes(keyword));
  const riskLevel = riskSignals.length > 0 ? "high" : input.currentContext.riskLevel ?? "low";
  return {
    fields: nextFields,
    responseCategory: typeof input.patientInput.value === "boolean" ? (input.patientInput.value ? "affirmative" : "negative") : Array.isArray(input.patientInput.value) ? "selection" : "text",
    emotionalState: lowered.includes("anxious") || lowered.includes("anxiety") ? "anxious" : lowered.includes("relief") ? "relieved" : lowered.includes("good") ? "stable" : undefined,
    activityCompletion: input.patientInput.kind === "activity_completion" ? (String(input.patientInput.value) as StateExtractionResult["activityCompletion"]) : input.currentContext.activityCompletion,
    homeworkStatus: input.patientInput.kind === "homework_status" ? (String(input.patientInput.value) as StateExtractionResult["homeworkStatus"]) : input.currentContext.homeworkStatus,
    riskLevel,
    riskSignals,
    confidence: 0.92,
    missingFields: numericLike && !validPercent ? [field] : [],
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
