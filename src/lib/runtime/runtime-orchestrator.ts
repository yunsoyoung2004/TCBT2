import type { ClinicalProviderResponse } from "@/lib/clinical-language/clinical-language-contract";
import { makeId } from "@/lib/id";
import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import { compileRuntimePrompt } from "@/lib/runtime/runtime-prompt-compiler";
import { reduceRuntimeState, type RuntimeStateReduction } from "@/lib/runtime/runtime-state-reducer";
import type { RuntimeActiveStep } from "@/lib/runtime/runtime-step-resolver";
import type { CompiledPromptContract, RuntimeRelease } from "@/types/protocol-runtime";
import type { OutputValidationResult, PatientProfile, RuntimeMessage, RuntimeSession, RuntimeSessionState, SessionMemory } from "@/types/runtime-session";
import { resolveStaticPatientMessage } from "@/lib/runtime/runtime-static-message";
import { recordModelUsage } from "@/lib/assessment/model-observability";
import type { PatientRendererRequest } from "@/lib/patient-renderer/patient-renderer-contract";

async function callPatientRenderer(request: PatientRendererRequest, context: { sessionId: string; turnId: string }) {
  if (typeof window === "undefined") { const { renderPatientReflection } = await import("@/lib/patient-renderer/anthropic-patient-renderer"); return renderPatientReflection(request, context); }
  const response = await fetch("/api/patient-reflection", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request, context }) });
  const payload = await response.json().catch(() => null); if (!response.ok || !payload?.ok) return { reflection: "Thank you for sharing that.", provider: "none", failed: true };
  return payload.data as { reflection: string; patientMessage?: string; provider: string; failed: boolean; failureReason?: string };
}

function activeActionType(activeStep: RuntimeActiveStep) {
  return activeStep.promptItem.allowedActions[0] ?? "ask";
}

function fallbackResponse(input: { requestId: string; contract: CompiledPromptContract; activeStep: RuntimeActiveStep; locale: string }): ClinicalProviderResponse {
  return {
    requestId: input.requestId,
    patientMessage: input.contract.fallbackPatientText,
    actionType: activeActionType(input.activeStep),
    proposedFields: {},
    completionEvidence: [],
    detectedLanguage: input.locale,
    completionStatus: "incomplete",
    extractedFields: {},
    safetySignals: [],
    recommendedTransition: "stay",
    nextActionRecommendation: "stay",
    providerMetadata: { provider: "mock", model: "runtime-fallback" },
  };
}

export type RuntimeOrchestratorInput = {
  session: RuntimeSession;
  release: RuntimeRelease;
  state: RuntimeSessionState;
  activeStep: RuntimeActiveStep;
  sourceNode: ClinicalStageNode;
  sourcePromptItem: PromptItem;
  recentMessages: RuntimeMessage[];
  patientProfile?: PatientProfile;
  sessionMemory?: SessionMemory;
};

export type RuntimeOrchestratorResult = {
  contract: CompiledPromptContract;
  response: ClinicalProviderResponse;
  providerResult: { provider: string; model?: string; latencyMs?: number; text?: string; error?: string };
  validator: OutputValidationResult;
  fallbackUsed: boolean;
  repairUsed: boolean;
  generatedMessage: RuntimeMessage;
  stateReduction: RuntimeStateReduction;
};

export async function orchestrateRuntimeAssistantTurn(input: RuntimeOrchestratorInput): Promise<RuntimeOrchestratorResult> {
  const contract = await compileRuntimePrompt({
    release: input.release,
    state: input.state,
    activeStep: input.activeStep,
    locale: input.session.locale,
    patientProfile: input.patientProfile,
    sessionMemory: input.sessionMemory,
    recentMessages: input.recentMessages,
    safetyContext: { activeSafetyRuleIds: input.activeStep.node.safetyRuleIds, currentSafetyStatus: input.session.status },
  });
  const staticMessage = resolveStaticPatientMessage(input.sourcePromptItem, input.session.locale, input.session.runtimeContext);
  if (staticMessage) {
    const requestId = makeId("STATIC");
    const response = fallbackResponse({ requestId, contract, activeStep: input.activeStep, locale: input.session.locale });
    response.patientMessage = staticMessage.patientMessage;
    response.providerMetadata = { provider: "mock", model: "approved-static" };
    const validator: OutputValidationResult = { accepted: true, corrected: false, rejected: false, issues: [], finalText: staticMessage.patientMessage, fallbackRequired: false };
    const stateReduction = reduceRuntimeState({ release: input.release, currentState: input.state, activeStep: input.activeStep, event: "assistant_delivered" });
    recordModelUsage({ sessionId: input.session.id, turnId: requestId, provider: "none", model: undefined, purpose: "approved_static", llmCalled: false, inputTokens: 0, outputTokens: 0, totalTokens: 0, latencyMs: 0, retryCount: 0, cacheStatus: "hit", estimatedCost: 0, success: true });
    return { contract, response, providerResult: { provider: "deterministic", model: "approved-static", latencyMs: 0, text: staticMessage.patientMessage }, validator, fallbackUsed: false, repairUsed: false, stateReduction, generatedMessage: {
      id: makeId("RMSG"), runtimeSessionId: input.session.id, role: "assistant", content: staticMessage.patientMessage, status: "validated", nodeId: input.activeStep.node.id, promptItemId: input.activeStep.promptItem.id, sourceEvidenceIds: [], createdAt: new Date().toISOString(), deliveredAt: new Date().toISOString(), metadata: { fallbackUsed: false, llmCalled: false, messageSource: "approved_static", contractHash: contract.contractHash, sourcePromptItemId: input.sourcePromptItem.id, sourceTextHash: input.sourcePromptItem.sourceTrace.sourceTextHash },
    } };
  }
  const dynamicRequestId = makeId("REFLECT");
  const personalized = Boolean((input.sourcePromptItem as PromptItem & { requiresPersonalizedResponse?: boolean }).requiresPersonalizedResponse);
  const rendered = personalized
    ? await callPatientRenderer({ locale: input.session.locale, patientInputExcerpt: input.session.runtimeContext.lastPatientMessage?.slice(0, 500) ?? "", reflectionGoal: input.sourceNode.clinicalPurpose || "Acknowledge the patient's answer respectfully", maxWords: input.session.locale.toLowerCase().startsWith("ko") ? 20 : 35 }, { sessionId: input.session.id, turnId: dynamicRequestId })
    : { reflection: contract.fallbackPatientText, patientMessage: contract.fallbackPatientText, provider: "none", failed: false };
  const dynamicText = rendered.patientMessage ?? rendered.reflection;
  const dynamicResponse = fallbackResponse({ requestId: dynamicRequestId, contract, activeStep: input.activeStep, locale: input.session.locale });
  dynamicResponse.patientMessage = dynamicText;
  dynamicResponse.providerMetadata = { provider: "mock", model: personalized && rendered.provider === "anthropic" ? "patient-reflection" : "deterministic-neutral" };
  const dynamicValidator: OutputValidationResult = { accepted: true, corrected: false, rejected: false, issues: [], finalText: dynamicText, fallbackRequired: false };
  const dynamicReduction = reduceRuntimeState({ release: input.release, currentState: input.state, activeStep: input.activeStep, event: "assistant_delivered" });
  return { contract, response: dynamicResponse, providerResult: { provider: rendered.provider === "anthropic" ? "anthropic" : "deterministic", model: dynamicResponse.providerMetadata.model, text: dynamicText }, validator: dynamicValidator, fallbackUsed: Boolean(rendered.failed), repairUsed: false, stateReduction: dynamicReduction, generatedMessage: { id: makeId("RMSG"), runtimeSessionId: input.session.id, role: "assistant", content: dynamicText, status: rendered.failed ? "replaced_by_fallback" : "validated", nodeId: input.activeStep.node.id, promptItemId: input.activeStep.promptItem.id, sourceEvidenceIds: [], createdAt: new Date().toISOString(), deliveredAt: new Date().toISOString(), metadata: { llmCalled: rendered.provider === "anthropic", messageSource: personalized ? "personalized_reflection" : "deterministic_neutral", contractHash: contract.contractHash, sourcePromptItemId: input.sourcePromptItem.id } } };

}
