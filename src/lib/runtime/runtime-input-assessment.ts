import { clinicalInputAssessmentRequestSchema, clinicalInputAssessmentResponseSchema, type ClinicalInputAssessmentRequest, type ClinicalInputAssessmentResponse } from "@/lib/clinical-language/clinical-language-contract";
import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { PatientInput } from "@/types/runtime-session";

type InputAssessmentResult = ClinicalInputAssessmentResponse | { accepted: false; reason: "needs_clarification"; error: string };

function makeId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return `CIAS-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  return `CIAS-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function requiresSemanticInputAssessment(input: { patientInput: PatientInput; promptItem?: PromptItem; field: string }) {
  if (input.patientInput.kind !== "text" || typeof input.patientInput.value !== "string" || !input.promptItem) return false;
  if ((input.field === "evidenceFor" || input.field === "evidenceAgainst") && /^(?:none|nothing else|no more|more none|\uC5C6\uC5B4\uC694)$/i.test(input.patientInput.value.trim())) return false;
  const validationKind = typeof (input.promptItem.validation as { kind?: unknown } | null)?.kind === "string"
    ? String((input.promptItem.validation as { kind: string }).kind)
    : "";
  return !["boolean", "enum", "rating"].includes(validationKind);
}

function requestFrom(input: { patientInput: PatientInput; promptItem: PromptItem; locale: string }): ClinicalInputAssessmentRequest {
  const requestId = makeId();
  const validationKind = typeof (input.promptItem.validation as { kind?: unknown } | null)?.kind === "string"
    ? String((input.promptItem.validation as { kind: string }).kind)
    : undefined;
  return clinicalInputAssessmentRequestSchema.parse({
    requestId,
    idempotencyKey: `${input.promptItem.id}:${requestId}`,
    locale: input.locale,
    patientMessage: String(input.patientInput.value),
    prompt: {
      type: input.promptItem.type,
      validationKind,
      guidance: input.promptItem.editableText || input.promptItem.verbatimText || input.promptItem.aiInstruction,
      requiredFields: input.promptItem.requiredFields?.length ? input.promptItem.requiredFields : input.promptItem.outputFields,
    },
  });
}

export async function assessRuntimePatientInput(input: { patientInput: PatientInput; promptItem: PromptItem; locale?: string }): Promise<InputAssessmentResult> {
  const request = requestFrom({ ...input, locale: input.locale ?? "en-US" });
  try {
    if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
      const { assessClinicalInput } = await import("@/lib/clinical-language/clinical-language-server");
      const result = await assessClinicalInput(request);
      return "error" in result ? { accepted: false, reason: "needs_clarification", error: result.error.message } : result;
    }
    const response = await fetch("/api/clinical-language/assess-input", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) return { accepted: false, reason: "needs_clarification", error: typeof payload?.error?.message === "string" ? payload.error.message : "Input assessment failed" };
    const parsed = clinicalInputAssessmentResponseSchema.safeParse(payload.data);
    return parsed.success ? parsed.data : { accepted: false, reason: "needs_clarification", error: "Malformed input assessment" };
  } catch {
    return { accepted: false, reason: "needs_clarification", error: "Input assessment failed" };
  }
}