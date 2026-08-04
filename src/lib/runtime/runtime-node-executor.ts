import { DeterministicLanguageProvider } from "@/lib/runtime/providers/deterministic-language-provider";
import { validateRuntimeOutput } from "@/lib/runtime/runtime-output-validator";
import { makeId } from "@/lib/id";
import { clinicalProviderResponseSchema, type ClinicalProviderRequest, type ClinicalProviderResponse } from "@/lib/clinical-language/clinical-language-contract";
import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { RuntimeMessage, RuntimeSession } from "@/types/runtime-session";

const deterministicProvider = new DeterministicLanguageProvider();

type ClinicalLanguageCallResult = { response?: ClinicalProviderResponse; error?: string };

async function callClinicalLanguageServer(input: ClinicalProviderRequest): Promise<ClinicalLanguageCallResult> {
  try {
    if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
      const { respondClinicalLanguage } = await import("@/lib/clinical-language/clinical-language-server");
      const result = await respondClinicalLanguage(input);
      if ("error" in result) {
        const rawError = result.error;
        return { error: rawError && typeof rawError === "object" && "message" in rawError && typeof rawError.message === "string" ? rawError.message : "Clinical language request failed" };
      }
      return { response: result as ClinicalProviderResponse };
    }
    const response = await fetch("/api/clinical-language/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      return { error: typeof payload?.error?.message === "string" ? payload.error.message : "Clinical language request failed" };
    }
    const parsed = clinicalProviderResponseSchema.safeParse(payload.data);
    if (!parsed.success) return { error: "Malformed clinical language response" };
    return { response: parsed.data };
  } catch {
    return { error: "Clinical language request failed" };
  }
}

function patientFacingFallback(locale: string, promptItem: PromptItem) {
  const instruction = promptItem.aiInstruction.trim();
  const isUsableInstruction = instruction.length > 8
    && instruction.length <= 240
    && !/^(#{1,6}\s|role and purpose|purpose|instructions?)/i.test(instruction);
  if (isUsableInstruction) return instruction;
  if (locale.toLowerCase().startsWith("ko")) return "지금 가장 어렵거나 피하고 싶은 상황은 무엇인가요?";
  if (locale.toLowerCase().startsWith("pt")) return "O que está mais difícil ou que você tem evitado neste momento?";
  return "What feels most difficult or most avoided for you right now?";
}

export async function executeRuntimeNodeMessage(session: RuntimeSession, node: ClinicalStageNode, promptItem: PromptItem): Promise<{
  generatedMessage: RuntimeMessage;
  validator: ReturnType<typeof validateRuntimeOutput>;
  fallbackUsed: boolean;
  providerResult: { provider: string; model?: string; latencyMs?: number; text?: string; error?: string };
}> {
  const requestId = makeId("CLREQ");
  const sessionNumber = Number(session.sessionDefinitionId.match(/\d+$/)?.[0] ?? 0);
  const clinicalRequest = {
    requestId,
    idempotencyKey: `${session.id}:${node.id}:${promptItem.id}`,
    protocolId: session.protocolId,
    protocolVersion: session.protocolVersion,
    sessionPlanEntryId: `${session.sessionDefinitionId}-entry`,
    sessionId: session.id,
    sessionNumber,
    nodeId: node.id,
    nodeTitle: node.title,
    clinicalPurpose: node.clinicalPurpose ?? node.title,
    promptItemId: promptItem.id,
    promptItemType: promptItem.type,
    editableText: promptItem.editableText,
    aiInstruction: promptItem.aiInstruction,
    activationCondition: promptItem.activationCondition,
    outputFields: promptItem.outputFields,
    validation: promptItem.validation,
    completionEffect: promptItem.completionEffect,
    participantMessage: session.runtimeContext.lastPatientMessage ?? "",
    detectedLanguage: session.locale,
    relevantFields: session.runtimeContext.fields,
    recentMessages: [],
    safetyContext: { activeSafetyRuleIds: node.safetyRuleIds ?? [], currentSafetyStatus: session.status },
  } satisfies import("@/lib/clinical-language/clinical-language-contract").ClinicalProviderRequest;
  const clinicalResult = await callClinicalLanguageServer(clinicalRequest);
  let providerResult: { provider: string; model?: string; latencyMs?: number; text?: string; error?: string };
  if (clinicalResult.response) {
    providerResult = {
      provider: clinicalResult.response.providerMetadata.provider,
      model: clinicalResult.response.providerMetadata.model ?? "unknown",
      latencyMs: clinicalResult.response.providerMetadata.latencyMs,
      text: clinicalResult.response.patientMessage,
    };
  } else {
    const fallback = await deterministicProvider.generate({
      locale: session.locale,
      protocolNode: node,
      promptItem,
      runtimeContext: session.runtimeContext,
      lastPatientMessage: session.runtimeContext.lastPatientMessage,
      safetyResult: { triggered: false, ruleIds: [], action: "continue", escalationRequired: false },
    });
    providerResult = { ...fallback, error: clinicalResult.error ?? "Clinical language request failed" };
  }
  const generatedText = providerResult.text ?? "";
  const validationResult = validateRuntimeOutput(generatedText, session.locale);
  const fallbackText = patientFacingFallback(session.locale, promptItem);
  const validator = validationResult.accepted
    ? validationResult
    : {
        ...validationResult,
        accepted: true,
        corrected: true,
        rejected: false,
        finalText: fallbackText,
        fallbackRequired: false,
        issues: [...validationResult.issues, "A concise patient-facing fallback was used."],
      };
  const finalText = validator.finalText ?? generatedText;
  const fallbackUsed = Boolean(providerResult.error) || !validationResult.accepted;
  return {
    providerResult,
    validator,
    fallbackUsed,
    generatedMessage: {
      id: makeId("RMSG"),
      runtimeSessionId: session.id,
      role: "assistant",
      content: finalText,
      status: validator.accepted ? "validated" : "replaced_by_fallback",
      nodeId: node.id,
      promptItemId: promptItem.id,
      sourceEvidenceIds: [],
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      metadata: {
        fallbackUsed,
        promptItemId: promptItem.id,
        sourceTextHash: promptItem.sourceTrace.sourceTextHash,
        sourceLineStart: promptItem.sourceTrace.sourceLineStart,
        sourceLineEnd: promptItem.sourceTrace.sourceLineEnd,
      },
    },
  };
}
