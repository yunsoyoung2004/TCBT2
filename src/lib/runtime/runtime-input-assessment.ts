import { getAssessmentModel } from "@/lib/assessment/assessment-providers";
import { assessmentResultSchema, type AssessmentRequest } from "@/lib/assessment/assessment-contract";
import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { PatientInput } from "@/types/runtime-session";

type InputAssessmentResult = { accepted: boolean; confidence: number; reason: "meaningful_response" | "needs_clarification"; extractedFields?: Record<string, unknown>; safetyLevel?: "none" | "low" | "moderate" | "high" | "critical"; safetySignals?: string[]; error?: string };

export function requiresSemanticInputAssessment(input: { patientInput: PatientInput; promptItem?: PromptItem; field: string }) {
  if (input.patientInput.kind !== "text" || typeof input.patientInput.value !== "string" || !input.promptItem) return false;
  if ((input.field === "evidenceFor" || input.field === "evidenceAgainst") && /^(?:none|nothing else|no more|more none|\uC5C6\uC5B4\uC694)$/i.test(input.patientInput.value.trim())) return false;
  const validationKind = typeof (input.promptItem.validation as { kind?: unknown } | null)?.kind === "string"
    ? String((input.promptItem.validation as { kind: string }).kind)
    : "";
  if (/\b(?:disappear(?: forever)?|everything to end|all of this to end|not wake up|better off without me|better off dead|no reason to live|say(?:ing)? goodbye|can(?:not|'t) go on|cannot cope|hopeless|desperate)\b/i.test(input.patientInput.value)) return true;
  // Ordinary single-field free-text questions are recorded verbatim after the
  // local meaningful-text check. They do not need a cloud model to decide that
  // "I'm doing well" is a valid candidate thought.
  if (!validationKind && input.promptItem.outputFields.length <= 1) return false;
  return !["boolean", "enum", "rating"].includes(validationKind);
}

export async function assessRuntimePatientInput(input: { patientInput: PatientInput; promptItem: PromptItem; locale?: string }): Promise<InputAssessmentResult> {
  try {
    const allowedFields = input.promptItem.requiredFields?.length ? input.promptItem.requiredFields : input.promptItem.outputFields;
    const request: AssessmentRequest = { locale: input.locale ?? "en-US", inputType: input.promptItem.type, patientInput: String(input.patientInput.value), nodeGoal: input.promptItem.editableText || input.promptItem.verbatimText || "Assess relevance to the active question", expectedAnswerDescription: input.promptItem.modelGuidance || input.promptItem.aiInstruction || undefined, allowedFields, allowedTransitions: [], safetyCategories: input.promptItem.safetyRuleIds };
    const result = typeof window === "undefined" || process.env.NODE_ENV === "test"
      ? await getAssessmentModel().assessInput(request)
      : await (async () => { const response = await fetch("/api/assessment/input", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) }); const payload = await response.json().catch(() => null); if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Assessment failed"); return assessmentResultSchema.parse(payload.data); })();
    // A partially complete answer can still contain valid clinical fields. Keep
    // those fields and let runtime-context identify exactly what remains missing.
    // Previously, needs_clarification discarded every extracted field and caused
    // the same generic prompt to be repeated.
    const accepted = result.inputValid && result.relevance !== "irrelevant";
    return { accepted, confidence: result.relevance === "relevant" ? 0.9 : 0.6, reason: accepted ? "meaningful_response" : "needs_clarification", extractedFields: result.extractedFields, safetyLevel: result.safetyLevel, safetySignals: result.safetySignals };
  } catch (error) {
    return { accepted: false, confidence: 0, reason: "needs_clarification", error: error instanceof Error ? error.message : "Input assessment failed" };
  }
}
