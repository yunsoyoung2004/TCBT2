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

function systemInstruction() { return `You are a classification and data-extraction API for a real-time patient conversation. Analyze only the supplied de-identified patient input.

JUDGE SUFFICIENCY, NOT PERFECTION
- The question is never "is this a complete, well-formed answer" -- it is "does this plausibly move the conversation to the next therapeutic step." Real patients answer briefly, colloquially, and in whatever language they speak; none of that makes an answer invalid.
- A short or informal reply that is clearly on-topic for the active question is relevant and, once every requested field it can support is extracted, complete for those fields.
- Never penalize brevity, casual phrasing, or a non-English language on their own. "I can't concentrate" and "집중이 잘 안돼" are exactly as valid as a longer, more formal sentence with the same meaning.
- When you are genuinely unsure whether an answer qualifies, prefer relevant/complete over unclear/needs_clarification -- a false rejection costs the patient a repeated question; a false acceptance costs nothing the rest of the pipeline can't still catch.

FIELD EXTRACTION
- Evaluate every allowed field independently.
- Extract a field when the patient's input plausibly supports it, even stated briefly or indirectly -- do not require an explicit, textbook-clean statement.
- Never copy one phrase into two clinically different fields.
- A situation is an observable event or circumstance (what happened, where, when, or with whom).
- A thought or belief is the meaning, prediction, judgment, or words that went through the person's mind.
- If only a thought is present, extract the thought and leave the situation absent. If only a situation is present, do the reverse.
- Do not invent, diagnose, or fabricate content the patient never said -- but do connect an answer to the field it's clearly about, even if the wording isn't a direct quote.
- Use only allowed field names. Content that plausibly relates to an allowed field should never produce an empty extractedFields object -- reserve that for input with no discernible connection to any of them.

COMPLETION CONSISTENCY
- complete: every requested concept needed by the node goal is plausibly supported, even briefly.
- incomplete: at least one useful requested field is supported but another is genuinely absent -- prefer this over needs_clarification whenever ANY part of the input is usable.
- needs_clarification: reserve this for input that is truly unrelated to the active question, a non-answer (greeting, "idk", copied prompt text), or gibberish -- not for an answer that is merely short, informal, or imperfectly phrased.
- inputValid=false only for greetings, copied questions, gibberish, or content with no plausible connection to the active task.

Examples:
Input: "I had too much work, and I thought I was failing." Allowed: distressingSituation, automaticThought
Output fields: {"distressingSituation":"having too much work","automaticThought":"I was failing"}; completionStatus=complete.
Input: "I keep thinking that I am not good enough." Same allowed fields.
Output fields: {"automaticThought":"I am not good enough"}; completionStatus=incomplete.
Input (Korean): "선생님과 발표를 했었던 상황이었어" (it was a situation where I gave a presentation with the teacher). Allowed: distressingSituation, automaticThought.
Output fields: {"distressingSituation":"gave a presentation with the teacher"}; completionStatus=incomplete -- this is a clear, sufficient situation even though it's brief and in Korean; do not mark needs_clarification just because the thought hasn't been given yet.
Input (Korean): "공부를 해야 하는데 집중이 잘 안돼" (I need to study but I can't concentrate). Allowed: distressingSituation, automaticThought.
Output fields: {"distressingSituation":"needing to study", "automaticThought":"can't concentrate"}; completionStatus=complete -- brief and colloquial, but it plausibly supports both fields.

SAFETY
Detect explicit or indirect suicidal ideation, passive death wishes, self-harm, plans, preparation, means, and immediate danger. Indirect signals include wanting to disappear forever, not wake up, end everything, say goodbye, or believing others are better off without the speaker. Do not flag ordinary uses such as stop feeling anxious, a weekend plan, dying of embarrassment, discussion about another person, or quoted program text. Use moderate when indirect death-related meaning is plausible but unclear; high or critical only when current risk is supported.

Return JSON matching the schema. Do not write patient-visible text, diagnose, recommend treatment, or use unauthorized fields or transitions.`; }
function safeRequest(request: AssessmentRequest) { return { ...request, patientInput: redactDirectIdentifiers(request.patientInput) }; }

abstract class BaseAssessmentModel implements AssessmentModel {
  abstract healthCheck(): Promise<AssessmentProviderHealth>;
  abstract getProviderMetadata(): AssessmentProviderMetadata;
  protected abstract invoke(request: AssessmentRequest): Promise<{ data: unknown; usage?: Usage; latencyMs: number }>;
  async assessInput(request: AssessmentRequest): Promise<AssessmentResult> {
    const meta = this.getProviderMetadata(); let lastError = "assessment failed";
    // A patient is waiting on this request. Retrying a slow provider here used
    // to turn one provider timeout into two consecutive waits (up to roughly a
    // minute with the old deployment settings). The deterministic runtime
    // fallback is safer and much faster than retrying in the foreground.
    for (let attempt = 0; attempt < 1; attempt += 1) {
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
  // Set once healthCheck() has confirmed a usable model on this instance --
  // getAssessmentModel() below already caches ONE instance per warm
  // serverless invocation, but invoke() used to call healthCheck() (a real
  // network round-trip to list available models) on every single call
  // regardless, roughly doubling this provider's per-turn latency for no
  // reason once the model was already confirmed good once. A later
  // genuine outage/misconfiguration still surfaces -- just at the real
  // completion request below instead of pre-emptively here -- which
  // assessRuntimePatientInput's caller already treats as a normal
  // "needs_clarification" fallback either way, so this trades an
  // early-and-clean error for a slightly-later one, not a silent failure.
  private healthConfirmed = false;
  constructor(private readonly provider: "groq" | "ollama", private readonly baseUrl: string, private readonly apiKey: string, private model: string) { super(); }
  getProviderMetadata(): AssessmentProviderMetadata { return { provider: this.provider, model: this.model || undefined, privacyBoundary: this.provider === "ollama" ? "local" : "cloud" }; }
  async healthCheck(signal?: AbortSignal) {
    try {
      const response = await fetch(`${this.baseUrl}/models`, { signal, headers: this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : undefined });
      if (!response.ok) return { ok: false, provider: this.provider, model: this.model || undefined, message: `Model-list request failed (${response.status})` } as AssessmentProviderHealth;
      const payload = await response.json() as { data?: Array<{ id?: string }>; models?: Array<{ name?: string }> };
      const ids = [...(payload.data ?? []).map((item) => item.id), ...(payload.models ?? []).map((item) => item.name)].filter((id): id is string => Boolean(id));
      if (!this.model && this.provider === "groq") this.model = ids[0] ?? "";
      if (!this.model) return { ok: false, provider: this.provider, message: `${this.provider === "ollama" ? "OLLAMA" : "GROQ"}_MODEL is required because no available model was discovered.` } as AssessmentProviderHealth;
      return ids.includes(this.model) ? { ok: true, provider: this.provider, model: this.model } : { ok: false, provider: this.provider, model: this.model, message: `Configured model is unavailable: ${this.model}` };
    } catch { return { ok: false, provider: this.provider, model: this.model || undefined, message: `${this.provider} is unavailable` }; }
  }
  protected async invoke(request: AssessmentRequest) {
    const timeoutMs = Math.min(5000, Math.max(500, Number(process.env.ASSESSMENT_TIMEOUT_MS ?? 3000)));
    const signal = AbortSignal.timeout(timeoutMs);
    if (!this.healthConfirmed) {
      const health = await this.healthCheck(signal);
      if (!health.ok) throw new Error(health.message);
      this.healthConfirmed = true;
    }
    const started = performance.now(); const cloud = this.provider === "groq"; const config = getAssessmentConfig();
    if (cloud && !config.allowCloudPatientAssessment) throw new Error("Cloud patient assessment is disabled; select Ollama or deterministic processing.");
    const payloadRequest = cloud && config.redactCloudInput ? safeRequest(request) : request;
    const responseFormat = this.provider === "groq"
      ? { type: "json_object" }
      : { type: "json_schema", json_schema: { name: "assessment", schema } };
    const response = await fetch(`${this.baseUrl}/chat/completions`, { method: "POST", signal, headers: { "content-type": "application/json", ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) }, body: JSON.stringify({ model: this.model, temperature: 0, messages: [{ role: "system", content: `${systemInstruction()} Required JSON schema: ${JSON.stringify(schema)}` }, { role: "user", content: JSON.stringify(payloadRequest) }], response_format: responseFormat }) });
    if (!response.ok) throw new Error(`${this.provider} assessment failed (${response.status})`);
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: Usage };
    const content = json.choices?.[0]?.message?.content; if (!content) throw new Error("Assessment provider returned no JSON content");
    return { data: assessmentResultSchema.parse(JSON.parse(content)), usage: json.usage, latencyMs: Math.round(performance.now() - started) };
  }
}

class DeterministicAssessmentModel implements AssessmentModel {
  getProviderMetadata(): AssessmentProviderMetadata { return { provider: "deterministic", privacyBoundary: "none" }; }
  async healthCheck() { return { ok: true, provider: "deterministic" as const }; }
  async assessInput(request: AssessmentRequest): Promise<AssessmentResult> {
    const raw = request.patientInput.trim();
    const normalized = raw.toLowerCase();
    const words = normalized.match(/[a-z\u00c0-\u00ff]+/gi) ?? [];
    const hangul = (normalized.match(/[\uac00-\ud7a3]/g) ?? []).length;
    const nonAnswer = ["hi", "hello", "hey", "test", "testing", "ok", "okay", "yes", "no", "idk", "fuiissiidojfosid"].includes(normalized);
    const distinction = /distinction/i.test(`${request.inputType} ${request.expectedAnswerDescription ?? ""}`);
    const valid = !nonAnswer && normalized.length > 1 && (!distinction || words.length >= 2 || hangul >= 4);
    const directRisk = /\b(?:want to die|wanna die|kill myself|suicid|suisid)\b/i.test(normalized);
    const indirectRisk = /\b(?:disappear(?: forever)?|not wake up|better off without me|better off dead|no reason to live|everything to end|can't go on|cannot go on)\b/i.test(normalized);
    const extractedFields: Record<string, unknown> = {};
    if (request.allowedFields.includes("distressingSituation") && request.allowedFields.includes("automaticThought")) {
      const split = raw.match(/^(.*?)(?:,?\s+(?:and\s+)?(?:i\s+)?(?:thought|keep thinking|was thinking)\s+(?:that\s+)?)(.+)$/i);
      if (split?.[1]?.trim()) extractedFields.distressingSituation = split[1].trim();
      if (split?.[2]?.trim()) extractedFields.automaticThought = split[2].trim();
      if (!split && /\b(?:i am|i'm|i was|i'm not|i am not)\b/i.test(raw)) extractedFields.automaticThought = raw;
    }
    const extractedCount = Object.keys(extractedFields).length;
    const completionStatus = request.allowedFields.length > 1
      ? extractedCount === request.allowedFields.length ? "complete" : extractedCount > 0 ? "incomplete" : "needs_clarification"
      : valid ? "complete" : "needs_clarification";
    return { inputValid: valid, relevance: valid ? "relevant" : "unclear", intent: directRisk || indirectRisk ? "distress_disclosure" : valid ? "answer" : "other", extractedFields, completionStatus, safetyLevel: directRisk ? "high" : indirectRisk ? "moderate" : "none", safetySignals: directRisk ? ["direct_suicidal_language"] : indirectRisk ? ["indirect_safety_language"] : [], recommendedTransition: null, internalSummary: null };
  }
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
