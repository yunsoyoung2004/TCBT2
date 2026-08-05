import { patientRendererRequestSchema, patientRendererResultSchema, type PatientRendererRequest } from "@/lib/patient-renderer/patient-renderer-contract";
import { redactDirectIdentifiers } from "@/lib/assessment/privacy-redaction";
import { recordModelUsage } from "@/lib/assessment/model-observability";

export async function renderPatientReflection(raw: PatientRendererRequest, context: { sessionId: string; turnId: string }) {
  const request = patientRendererRequestSchema.parse(raw); const apiKey = process.env.ANTHROPIC_API_KEY ?? ""; const model = process.env.ANTHROPIC_MODEL ?? "";
  if (!apiKey || !model) return { reflection: "Thank you for sharing that.", provider: "none", failed: true };
  let failure = "render failed";
  // The patient-turn invariant is stricter than the generic retry allowance:
  // never issue more than one Claude request for a single patient turn.
  for (let attempt = 0; attempt < 1; attempt += 1) {
    const started = performance.now();
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 100, system: `Write one respectful patient-visible reflection of at most ${request.maxWords} words. Do not ask questions, diagnose, recommend treatment, mention protocol state, or rewrite any next question. Return JSON only: {\"reflection\":\"...\"}.`, messages: [{ role: "user", content: JSON.stringify({ locale: request.locale, patientInputExcerpt: redactDirectIdentifiers(request.patientInputExcerpt), reflectionGoal: request.reflectionGoal }) }] }) });
      if (!response.ok) throw new Error(`Anthropic renderer failed (${response.status})`); const json = await response.json() as { content?: Array<{ text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } }; const text = json.content?.map((part) => part.text ?? "").join("").replace(/```(?:json)?/g, "").trim() ?? ""; const parsed = patientRendererResultSchema.parse(JSON.parse(text)); const words = parsed.reflection.trim().split(/\s+/); if (words.length > request.maxWords) throw new Error("Reflection exceeded maxWords");
      recordModelUsage({ sessionId: context.sessionId, turnId: context.turnId, provider: "anthropic", model, purpose: attempt ? "repair" : "patient_reflection", llmCalled: true, inputTokens: json.usage?.input_tokens ?? null, outputTokens: json.usage?.output_tokens ?? null, totalTokens: json.usage?.input_tokens !== undefined && json.usage.output_tokens !== undefined ? json.usage.input_tokens + json.usage.output_tokens : null, latencyMs: Math.round(performance.now() - started), retryCount: attempt, cacheStatus: "none", estimatedCost: null, success: true });
      return { reflection: parsed.reflection, patientMessage: request.approvedNextQuestion ? `${parsed.reflection}\n\n${request.approvedNextQuestion}` : parsed.reflection, provider: "anthropic", failed: false };
    } catch (error) { failure = error instanceof Error ? error.message : "render failed"; recordModelUsage({ sessionId: context.sessionId, turnId: context.turnId, provider: "anthropic", model, purpose: attempt ? "repair" : "patient_reflection", llmCalled: true, inputTokens: null, outputTokens: null, totalTokens: null, latencyMs: Math.round(performance.now() - started), retryCount: attempt, cacheStatus: "none", estimatedCost: null, success: false, failureReason: failure }); }
  }
  const reflection = "Thank you for sharing that."; return { reflection, patientMessage: request.approvedNextQuestion ? `${reflection}\n\n${request.approvedNextQuestion}` : reflection, provider: "none", failed: true, failureReason: failure };
}
