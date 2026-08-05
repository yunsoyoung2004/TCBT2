import { assessmentResultSchema, sanitizeAssessmentResult, type AssessmentModel, type AssessmentProviderHealth, type AssessmentProviderMetadata, type AssessmentRequest, type AssessmentResult } from "@/lib/assessment/assessment-contract";
import { getAssessmentConfig } from "@/lib/assessment/assessment-config";
import { redactDirectIdentifiers } from "@/lib/assessment/privacy-redaction";
import { recordModelUsage } from "@/lib/assessment/model-observability";

type Usage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
const schema = { type: "object", additionalProperties: false, required: ["inputValid", "relevance", "intent", "extractedFields", "completionStatus", "safetyLevel", "safetySignals", "recommendedTransition", "internalSummary"], properties: {
  inputValid: { type: "boolean" }, relevance: { type: "string", enum: ["relevant", "partially_relevant", "irrelevant", "unclear"] },
  intent: { type: "string", enum: ["answer", "clarification_request", "refusal", "topic_shift", "distress_disclosure", "other"] }, extractedFields: { type: "object", additionalProperties: true },
  completionStatus: { type: "string", enum: ["complete", "incomplete", "needs_clarification"] }, safetyLevel: { type: "string", enum: ["none", "low", "moderate", "high", "critical"] },
  safetySignals: { type: "array", items: { type: "string" } }, recommendedTransition: { type: ["string", "null"] }, internalSummary: { type: ["string", "null"] },
} } as const;

function systemInstruction() { return "Classify only the supplied de-identified patient input. Detect explicit or indirect suicidal ideation, passive death wishes, self-harm, plans, preparation, means, and immediate danger. Indirect signals include wanting to disappear forever, not wake up, end everything, say goodbye, or believing others are better off without the speaker. Do not flag ordinary uses such as stop feeling anxious, a weekend plan, dying of embarrassment, discussion about another person, or quoted program text. Use moderate when indirect death-related meaning is plausible but unclear; high or critical only when current risk is supported. Return JSON matching the schema. Do not diagnose, recommend treatment, or write patient-visible text. Use only allowed fields and transitions."; }
function safeRequest(request: AssessmentRequest) { return { ...request, patientInput: redactDirectIdentifiers(request.patientInput) }; }

abstract class BaseAssessmentModel implements AssessmentModel {
  abstract healthCheck(): Promise<AssessmentProviderHealth>;
  abstract getProviderMetadata(): AssessmentProviderMetadata;
  protected abstract invoke(request: AssessmentRequest): Promise<{ data: unknown; usage?: Usage; latencyMs: number }>;
  async assessInput(request: AssessmentRequest): Promise<AssessmentResult> {
    const meta = this.getProviderMetadata(); let lastError = "assessment failed";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const started = performance.now();
      try {
        const result = await this.invoke(request); const sanitized = sanitizeAssessmentResult(result.data, request); const usage = result.usage;
        recordModelUsage({ sessionId: "unbound", turnId: "unbound", provider: meta.provider, model: meta.model, purpose: attempt ? "repair" : "input_assessment", llmCalled: true, inputTokens: usage?.prompt_tokens ?? null, outputTokens: usage?.completion_tokens ?? null, totalTokens: usage?.total_tokens ?? null, latencyMs: result.latencyMs, retryCount: attempt, cacheStatus: "none", estimatedCost: null, success: true });
        return sanitized;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "assessment failed";
        recordModelUsage({ sessionId: "unbound", turnId: "unbound", provider: meta.provider, model: meta.model, purpose: attempt ? "repair" : "input_assessment", llmCalled: true, inputTokens: null, outputTokens: null, totalTokens: null, latencyMs: Math.round(performance.now() - started), retryCount: attempt, cacheStatus: "none", estimatedCost: null, success: false, failureReason: lastError });
      }
    }
    throw new Error(lastError);
  }
}

class OpenAICompatibleAssessmentModel extends BaseAssessmentModel {
  constructor(private readonly provider: "groq" | "ollama", private readonly baseUrl: string, private readonly apiKey: string, private model: string) { super(); }
  getProviderMetadata(): AssessmentProviderMetadata { return { provider: this.provider, model: this.model || undefined, privacyBoundary: this.provider === "ollama" ? "local" : "cloud" }; }
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, { headers: this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : undefined });
      if (!response.ok) return { ok: false, provider: this.provider, model: this.model || undefined, message: `Model-list request failed (${response.status})` } as AssessmentProviderHealth;
      const payload = await response.json() as { data?: Array<{ id?: string }>; models?: Array<{ name?: string }> };
      const ids = [...(payload.data ?? []).map((item) => item.id), ...(payload.models ?? []).map((item) => item.name)].filter((id): id is string => Boolean(id));
      if (!this.model && this.provider === "groq") this.model = ids[0] ?? "";
      if (!this.model) return { ok: false, provider: this.provider, message: `${this.provider === "ollama" ? "OLLAMA" : "GROQ"}_MODEL is required because no available model was discovered.` } as AssessmentProviderHealth;
      return ids.includes(this.model) ? { ok: true, provider: this.provider, model: this.model } : { ok: false, provider: this.provider, model: this.model, message: `Configured model is unavailable: ${this.model}` };
    } catch { return { ok: false, provider: this.provider, model: this.model || undefined, message: `${this.provider} is unavailable` }; }
  }
  protected async invoke(request: AssessmentRequest) {
    const health = await this.healthCheck(); if (!health.ok) throw new Error(health.message);
    const started = performance.now(); const cloud = this.provider === "groq"; const config = getAssessmentConfig();
    if (cloud && !config.allowCloudPatientAssessment) throw new Error("Cloud patient assessment is disabled; select Ollama or deterministic processing.");
    const payloadRequest = cloud && config.redactCloudInput ? safeRequest(request) : request;
    const responseFormat = this.provider === "groq"
      ? { type: "json_object" }
      : { type: "json_schema", json_schema: { name: "assessment", schema } };
    const response = await fetch(`${this.baseUrl}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) }, body: JSON.stringify({ model: this.model, temperature: 0, messages: [{ role: "system", content: `${systemInstruction()} Required JSON schema: ${JSON.stringify(schema)}` }, { role: "user", content: JSON.stringify(payloadRequest) }], response_format: responseFormat }) });
    if (!response.ok) throw new Error(`${this.provider} assessment failed (${response.status})`);
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: Usage };
    const content = json.choices?.[0]?.message?.content; if (!content) throw new Error("Assessment provider returned no JSON content");
    return { data: assessmentResultSchema.parse(JSON.parse(content)), usage: json.usage, latencyMs: Math.round(performance.now() - started) };
  }
}

class DeterministicAssessmentModel implements AssessmentModel {
  getProviderMetadata(): AssessmentProviderMetadata { return { provider: "deterministic", privacyBoundary: "none" }; }
  async healthCheck() { return { ok: true, provider: "deterministic" as const }; }
  async assessInput(request: AssessmentRequest): Promise<AssessmentResult> { const normalized = request.patientInput.trim().toLowerCase(); const words = normalized.match(/[a-z\u00c0-\u00ff]+/gi) ?? []; const hangul = (normalized.match(/[\uac00-\ud7a3]/g) ?? []).length; const nonAnswer = ["hi", "hello", "hey", "test", "testing", "ok", "okay", "yes", "no", "idk", "fuiissiidojfosid"].includes(normalized); const distinction = /distinction/i.test(`${request.inputType} ${request.expectedAnswerDescription ?? ""}`); const valid = !nonAnswer && normalized.length > 1 && (!distinction || words.length >= 2 || hangul >= 4); const directRisk = /\b(?:want to die|wanna die|kill myself|suicid|suisid)\b/i.test(normalized); const indirectRisk = /\b(?:disappear(?: forever)?|not wake up|better off without me|better off dead|no reason to live|everything to end|can't go on|cannot go on)\b/i.test(normalized); return { inputValid: valid, relevance: valid ? "relevant" : "unclear", intent: directRisk || indirectRisk ? "distress_disclosure" : valid ? "answer" : "other", extractedFields: {}, completionStatus: valid ? "complete" : "needs_clarification", safetyLevel: directRisk ? "high" : indirectRisk ? "moderate" : "none", safetySignals: directRisk ? ["direct_suicidal_language"] : indirectRisk ? ["indirect_safety_language"] : [], recommendedTransition: null, internalSummary: null }; }
}

class GeminiAssessmentModel extends BaseAssessmentModel {
  constructor(private readonly apiKey: string, private readonly model: string) { super(); }
  getProviderMetadata(): AssessmentProviderMetadata { return { provider: "gemini", model: this.model || undefined, privacyBoundary: "cloud" }; }
  async healthCheck() { if (!this.apiKey || !this.model) return { ok: false, provider: "gemini" as const, model: this.model || undefined, message: "GEMINI_API_KEY and GEMINI_MODEL are required" }; try { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}?key=${this.apiKey}`); return { ok: r.ok, provider: "gemini" as const, model: this.model, message: r.ok ? undefined : `Configured model is unavailable (${r.status})` }; } catch { return { ok: false, provider: "gemini" as const, model: this.model, message: "Gemini is unavailable" }; } }
  protected async invoke(request: AssessmentRequest) { const config = getAssessmentConfig(); if (!config.allowCloudPatientAssessment) throw new Error("Cloud patient assessment is disabled; select Ollama or deterministic processing."); const health = await this.healthCheck(); if (!health.ok) throw new Error(health.message); const started = performance.now(); const body = { systemInstruction: { parts: [{ text: systemInstruction() }] }, contents: [{ role: "user", parts: [{ text: JSON.stringify(config.redactCloudInput ? safeRequest(request) : request) }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", responseJsonSchema: schema } }; const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`Gemini assessment failed (${r.status})`); const json = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }; const text = json.candidates?.[0]?.content?.parts?.[0]?.text; if (!text) throw new Error("Gemini returned no JSON content"); return { data: JSON.parse(text), usage: { prompt_tokens: json.usageMetadata?.promptTokenCount, completion_tokens: json.usageMetadata?.candidatesTokenCount, total_tokens: json.usageMetadata?.totalTokenCount }, latencyMs: Math.round(performance.now() - started) }; }
}

let cached: AssessmentModel | undefined;
export function getAssessmentModel(): AssessmentModel {
  if (cached) return cached; const config = getAssessmentConfig();
  if (config.provider === "groq") cached = new OpenAICompatibleAssessmentModel("groq", "https://api.groq.com/openai/v1", config.groq.apiKey, config.groq.model);
  else if (config.provider === "ollama") cached = new OpenAICompatibleAssessmentModel("ollama", `${config.ollama.baseUrl.replace(/\/$/, "")}/v1`, "", config.ollama.model);
  else if (config.provider === "gemini") cached = new GeminiAssessmentModel(config.gemini.apiKey, config.gemini.model);
  else cached = new DeterministicAssessmentModel();
  return cached;
}
export function resetAssessmentModelForTests() { cached = undefined; }
