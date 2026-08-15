import { getAssessmentModel } from "@/lib/assessment/assessment-providers";
import { assessmentResultSchema, type AssessmentRequest } from "@/lib/assessment/assessment-contract";
import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { PatientInput } from "@/types/runtime-session";
import { runtimeFetch } from "@/lib/runtime/resolve-store-url";

type InputAssessmentResult = { accepted: boolean; confidence: number; reason: "meaningful_response" | "needs_clarification"; extractedFields?: Record<string, unknown>; safetyLevel?: "none" | "low" | "moderate" | "high" | "critical"; safetySignals?: string[]; intent?: "answer" | "clarification_request" | "refusal" | "topic_shift" | "distress_disclosure" | "other"; error?: string };

/**
 * validation.kind values whose whole clinical point is "did the patient
 * articulate a specific realization in their own words" rather than "did
 * they answer something" -- e.g. distinguishing a situation from a thought,
 * recognizing an interpersonal feedback loop, naming their own leverage
 * point, or summarizing a step back accurately. The catalog already tags
 * these prompts this way; before this, the single-field shortcut below
 * skipped semantic assessment for every one of them, so a generic non-answer
 * ("one clear example from this week") could satisfy a completion gate that
 * was specifically meant to check for a real insight.
 */
const INSIGHT_VALIDATION_KINDS = new Set([
  "participant_articulated_distinction",
  "recognition_required",
  "own_behavior_leverage_required",
  "participant_summary_required",
  "participant_generated_core_belief",
  "participant_owned_text",
]);

export function requiresSemanticInputAssessment(input: { patientInput: PatientInput; promptItem?: PromptItem; field: string }) {
  if (input.patientInput.kind !== "text" || typeof input.patientInput.value !== "string" || !input.promptItem) return false;
  if ((input.field === "evidenceFor" || input.field === "evidenceAgainst") && /^(?:none|nothing else|no more|more none|\uC5C6\uC5B4\uC694)$/i.test(input.patientInput.value.trim())) return false;
  if (/\b(?:disappear(?: forever)?|everything to end|all of this to end|not wake up|better off without me|better off dead|no reason to live|say(?:ing)? goodbye|can(?:not|'t) go on|cannot cope|hopeless|desperate)\b/i.test(input.patientInput.value)) return true;
  const validationKind = typeof (input.promptItem.validation as { kind?: unknown } | null)?.kind === "string"
    ? String((input.promptItem.validation as { kind: string }).kind)
    : "";
  // Ordinary single-field free-text questions are recorded verbatim after the
  // local meaningful-text check. They do not need a cloud model to decide that
  // "I'm doing well" is a valid candidate thought -- except the insight-style
  // checkpoints above, where "did they answer something" isn't the same
  // question as "did they reach the specific realization this step exists for".
  if (input.promptItem.outputFields.length <= 1) return INSIGHT_VALIDATION_KINDS.has(validationKind);
  return !["boolean", "enum", "rating"].includes(validationKind);
}

export async function assessRuntimePatientInput(input: { patientInput: PatientInput; promptItem: PromptItem; locale?: string }): Promise<InputAssessmentResult> {
  try {
    const allowedFields = input.promptItem.requiredFields?.length ? input.promptItem.requiredFields : input.promptItem.outputFields;
    const request: AssessmentRequest = { locale: input.locale ?? "en-US", inputType: input.promptItem.type, patientInput: String(input.patientInput.value), nodeGoal: input.promptItem.editableText || input.promptItem.verbatimText || "Assess relevance to the active question", expectedAnswerDescription: input.promptItem.modelGuidance || input.promptItem.aiInstruction || undefined, allowedFields, allowedTransitions: [], safetyCategories: input.promptItem.safetyRuleIds };
    const result = typeof window === "undefined" || process.env.NODE_ENV === "test"
      ? await getAssessmentModel().assessInput(request)
      : await (async () => { const response = await runtimeFetch("/api/assessment/input", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) }); const payload = await response.json().catch(() => null); if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Assessment failed"); return assessmentResultSchema.parse(payload.data); })();
    // A partially complete answer can still contain valid clinical fields. Keep
    // those fields and let runtime-context identify exactly what remains missing.
    // Previously, needs_clarification discarded every extracted field and caused
    // the same generic prompt to be repeated.
    const accepted = result.inputValid && result.relevance !== "irrelevant";
    // Surface the model's classified intent (this is what already lets it
    // recognize "the patient wants to stop" or "the patient is disclosing
    // distress" in whatever language the session runs in, via the same
    // locale-aware assessment used for every other field) -- previously this
    // was computed by the model but discarded here, so callers had no way to
    // act on a refusal/distress-disclosure intent that wasn't also caught by
    // the English-only isExplicitPatientRefusal keyword check.
    return { accepted, confidence: result.relevance === "relevant" ? 0.9 : 0.6, reason: accepted ? "meaningful_response" : "needs_clarification", extractedFields: result.extractedFields, safetyLevel: result.safetyLevel, safetySignals: result.safetySignals, intent: result.intent };
  } catch (error) {
    return { accepted: false, confidence: 0, reason: "needs_clarification", error: error instanceof Error ? error.message : "Input assessment failed" };
  }
}
