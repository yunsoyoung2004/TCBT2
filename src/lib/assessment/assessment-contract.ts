import { z } from "zod";

export const assessmentProviderNames = ["groq", "ollama", "gemini", "deterministic"] as const;
export type AssessmentProviderName = typeof assessmentProviderNames[number];

export const assessmentRequestSchema = z.object({
  locale: z.string().min(1), inputType: z.string().min(1), patientInput: z.string(), nodeGoal: z.string().min(1),
  expectedAnswerDescription: z.string().optional(), allowedFields: z.array(z.string()), allowedTransitions: z.array(z.string()), safetyCategories: z.array(z.string()),
});
export const assessmentResultSchema = z.object({
  inputValid: z.boolean(), relevance: z.enum(["relevant", "partially_relevant", "irrelevant", "unclear"]),
  intent: z.enum(["answer", "clarification_request", "refusal", "topic_shift", "distress_disclosure", "other"]),
  extractedFields: z.record(z.unknown()), completionStatus: z.enum(["complete", "incomplete", "needs_clarification"]),
  safetyLevel: z.enum(["none", "low", "moderate", "high", "critical"]), safetySignals: z.array(z.string()),
  recommendedTransition: z.string().nullable(), internalSummary: z.string().nullable(),
}).strict();
export type AssessmentRequest = z.infer<typeof assessmentRequestSchema>;
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;
export type AssessmentProviderHealth = { ok: boolean; provider: AssessmentProviderName; model?: string; message?: string };
export type AssessmentProviderMetadata = { provider: AssessmentProviderName; model?: string; privacyBoundary: "local" | "cloud" | "none" };
export interface AssessmentModel {
  assessInput(request: AssessmentRequest): Promise<AssessmentResult>;
  healthCheck(): Promise<AssessmentProviderHealth>;
  getProviderMetadata(): AssessmentProviderMetadata;
}

export function sanitizeAssessmentResult(raw: unknown, request: AssessmentRequest): AssessmentResult {
  const parsed = assessmentResultSchema.parse(raw);
  const allowed = new Set(request.allowedFields);
  const extractedFields = Object.fromEntries(Object.entries(parsed.extractedFields).filter(([field]) => allowed.has(field)));
  const recommendedTransition = parsed.recommendedTransition && request.allowedTransitions.includes(parsed.recommendedTransition) ? parsed.recommendedTransition : null;
  return { ...parsed, extractedFields, recommendedTransition };
}
