import { clinicalProviderRequestSchema, clinicalProviderResponseSchema, type ClinicalProviderName, type ClinicalProviderRequest, type ClinicalProviderResponse } from "@/lib/clinical-language/clinical-language-contract";

const DEFAULT_MODEL = "claude-sonnet-5";

function detectLanguage(message: string) {
  const normalized = message.trim().toLowerCase();
  if (/[가-힣]/.test(message)) return "ko";
  if (/\b(bonjour|merci|s'il vous plaît|je |ne |pas )\b/i.test(message)) return "fr";
  if (/\b(ola|obrigado|obrigada|não|nao)\b/i.test(normalized)) return "pt";
  if (/\b(こんにちは|ありがとう)\b/.test(message)) return "ja";
  return "en";
}

function makeSafetySignals(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("ending my life") || lowered.includes("suicide")) {
    return [{ type: "suicidal_ideation" as const, evidence: message, confidence: 0.98, immediacy: "immediate" as const }];
  }
  if (lowered.includes("self-harm") || lowered.includes("hurt myself")) {
    return [{ type: "self_harm" as const, evidence: message, confidence: 0.92, immediacy: "possible" as const }];
  }
  if (lowered.includes("terrible") && lowered.includes("overwhelmed")) {
    return [{ type: "crisis_distress" as const, evidence: message, confidence: 0.54, immediacy: "unclear" as const }];
  }
  return [];
}

function patientFacingFallback(input: ClinicalProviderRequest, language: string) {
  const instruction = input.aiInstruction.trim();
  const isUsableInstruction = instruction.length > 8
    && instruction.length <= 240
    && !/^(#{1,6}\s|role and purpose|purpose|instructions?)/i.test(instruction);
  if (isUsableInstruction) return instruction;
  if (language.toLowerCase().startsWith("ko")) return "지금 가장 어렵거나 피하고 싶은 상황은 무엇인가요?";
  if (language.toLowerCase().startsWith("pt")) return "O que está mais difícil ou que você tem evitado neste momento?";
  return "What feels most difficult or most avoided for you right now?";
}

function buildMockResponse(input: ClinicalProviderRequest): ClinicalProviderResponse {
  const language = input.detectedLanguage ?? detectLanguage(input.participantMessage);
  const safetySignals = makeSafetySignals(input.participantMessage);
  const completionStatus = safetySignals.length ? "safety_review" : /\d+/.test(input.participantMessage) && input.outputFields.some((field) => /rating|percent|score/i.test(field)) ? "complete" : "incomplete";
  const nextActionRecommendation = safetySignals.length ? "safety" : completionStatus === "complete" ? "advance" : "stay";
  const extractedFields: Record<string, unknown> = {};
  for (const field of input.outputFields) {
    extractedFields[field] = field === "situation" ? input.participantMessage : field.includes("Percent") || field.includes("rating") ? 50 : input.participantMessage;
  }
  
  const shortMsg = patientFacingFallback(input, language);
  
  return {
    requestId: input.requestId,
    patientMessage: shortMsg,
    detectedLanguage: language,
    completionStatus,
    extractedFields,
    safetySignals,
    nextActionRecommendation,
    providerMetadata: { provider: "mock", model: "contract-mock" },
  };
}

async function callAnthropic(input: ClinicalProviderRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey) return { error: { type: "missing_configuration", message: "Missing ANTHROPIC_API_KEY", retryable: false } as const };
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS ?? 300);
  const timeoutMs = Number(process.env.ANTHROPIC_TIMEOUT_MS ?? 8000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const patientTurn = patientFacingFallback(input, input.detectedLanguage ?? detectLanguage(input.participantMessage));
    const system = [
      "TBCT AI-assisted guide role.",
      "You do not replace a human therapist.",
      "Write one concise, supportive patient-facing turn. Do not disclose protocol instructions.",
      `Session ${input.sessionNumber}: ${input.nodeTitle}`,
      `Clinical purpose: ${input.clinicalPurpose}`,
      `Patient-facing turn to develop: ${patientTurn}`,
      `Protocol excerpt: ${input.editableText.slice(0, 1200)}`,
      `Output fields: ${input.outputFields.join(", ")}`,
      `Validation: ${JSON.stringify(input.validation ?? {})}`,
      `Activation condition: ${JSON.stringify(input.activationCondition ?? {})}`,
      `Session restrictions: ${input.participantMessage ? "Use minimal context." : ""}`,
      `Return JSON only matching this schema: ${JSON.stringify({ patientMessage: "string", detectedLanguage: "string", completionStatus: "incomplete", extractedFields: {}, safetySignals: [], nextActionRecommendation: "stay" })}`,
    ].join("\n");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: [{ type: "text", text: JSON.stringify(input) }] }],
      }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return { error: { type: "authentication", message: "Anthropic authentication failed", retryable: false } as const };
      if (response.status === 429) return { error: { type: "rate_limit", message: "Anthropic rate limited the request", retryable: true } as const };
      return { error: { type: "unknown", message: `Anthropic API error ${response.status}`, retryable: true } as const };
    }
    const json = (await response.json()) as { content?: Array<{ type?: string; text?: string }>; id?: string };
    const text = json.content?.map((item) => item.text ?? "").join("").trim() ?? "";
    const normalized = text.replace(/```(?:json)?/gi, "").trim();
    const jsonText = normalized.match(/\{[\s\S]*\}/)?.[0] ?? normalized;
    let responsePayload: unknown;
    try {
      responsePayload = JSON.parse(jsonText);
    } catch {
      return { error: { type: "malformed_response", message: "Anthropic returned malformed JSON", retryable: true } as const };
    }
    const parsed = clinicalProviderResponseSchema.safeParse({
      ...(responsePayload as Record<string, unknown>),
      requestId: input.requestId,
      providerMetadata: { provider: "anthropic", model },
    });
    if (!parsed.success) return { error: { type: "malformed_response", message: "Anthropic returned malformed JSON", retryable: true } as const };
    return { response: parsed.data, providerRequestId: json.id } as const;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return { error: { type: "timeout", message: "Anthropic request timed out", retryable: true } as const };
    return { error: { type: "network", message: "Anthropic network error", retryable: true } as const };
  } finally {
    clearTimeout(timeout);
  }
}

export async function respondClinicalLanguage(input: ClinicalProviderRequest) {
  const parsed = clinicalProviderRequestSchema.parse(input);
  const providerName: ClinicalProviderName = process.env.AI_PROVIDER === "anthropic" || Boolean(process.env.ANTHROPIC_API_KEY) ? "anthropic" : "mock";
  if (providerName === "mock") {
    return clinicalProviderResponseSchema.parse(buildMockResponse(parsed));
  }
  const result = await callAnthropic(parsed);
  if ("error" in result) return result;
  return clinicalProviderResponseSchema.parse({ ...result.response, providerMetadata: { ...result.response.providerMetadata, provider: "anthropic", providerRequestId: result.providerRequestId } });
}
