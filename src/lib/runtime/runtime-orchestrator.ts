import { clinicalProviderResponseSchema, type ClinicalProviderRequest, type ClinicalProviderResponse } from "@/lib/clinical-language/clinical-language-contract";
import { makeId } from "@/lib/id";
import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import { compileRuntimePrompt } from "@/lib/runtime/runtime-prompt-compiler";
import { validateRuntimeStructuredOutput } from "@/lib/runtime/runtime-output-validator";
import { reduceRuntimeState, type RuntimeStateReduction } from "@/lib/runtime/runtime-state-reducer";
import type { RuntimeActiveStep } from "@/lib/runtime/runtime-step-resolver";
import type { CompiledPromptContract, RuntimeRelease } from "@/types/protocol-runtime";
import type { OutputValidationResult, PatientProfile, RuntimeMessage, RuntimeSession, RuntimeSessionState, SessionMemory } from "@/types/runtime-session";

type ClinicalLanguageCallResult = { response?: ClinicalProviderResponse; error?: string };

async function callClinicalLanguageServer(input: ClinicalProviderRequest): Promise<ClinicalLanguageCallResult> {
  try {
    if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
      const { respondClinicalLanguage } = await import("@/lib/clinical-language/clinical-language-server");
      const result = await respondClinicalLanguage(input);
      if ("error" in result) return { error: result.error.message };
      return { response: result };
    }
    const response = await fetch("/api/clinical-language/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) return { error: typeof payload?.error?.message === "string" ? payload.error.message : "Clinical language request failed" };
    const parsed = clinicalProviderResponseSchema.safeParse(payload.data);
    return parsed.success ? { response: parsed.data } : { error: "Malformed clinical language response" };
  } catch {
    return { error: "Clinical language request failed" };
  }
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

function toClinicalRequest(input: {
  requestId: string;
  session: RuntimeSession;
  sourceNode: ClinicalStageNode;
  sourcePromptItem: PromptItem;
  activeStep: RuntimeActiveStep;
  contract: CompiledPromptContract;
  state: RuntimeSessionState;
  recentMessages: RuntimeMessage[];
}): ClinicalProviderRequest {
  const sessionNumber = Number(input.session.sessionDefinitionId.match(/\d+$/)?.[0] ?? 0);
  return {
    requestId: input.requestId,
    idempotencyKey: `${input.session.id}:${input.contract.contractId}`,
    protocolId: input.session.protocolId,
    protocolVersion: input.session.protocolVersion,
    sessionPlanEntryId: `${input.session.sessionDefinitionId}-entry`,
    sessionId: input.session.id,
    sessionNumber,
    nodeId: input.activeStep.node.id,
    nodeTitle: input.sourceNode.title,
    clinicalPurpose: input.sourceNode.clinicalPurpose ?? input.activeStep.node.objective,
    promptItemId: input.activeStep.promptItem.id,
    promptItemType: input.sourcePromptItem.type,
    editableText: input.contract.fallbackPatientText,
    aiInstruction: "",
    compiledPrompt: input.contract,
    activationCondition: input.activeStep.promptItem.activationCondition ?? null,
    outputFields: input.activeStep.promptItem.requiredFields,
    validation: null,
    completionEffect: null,
    participantMessage: input.session.runtimeContext.lastPatientMessage ?? "",
    detectedLanguage: input.session.locale,
    relevantFields: input.state.fields,
    recentMessages: input.recentMessages
      .filter((message) => message.role === "patient" || message.role === "assistant")
      .slice(-8)
      .map((message) => ({ role: message.role === "patient" ? "participant" as const : "assistant" as const, content: message.content })),
    safetyContext: {
      activeSafetyRuleIds: input.activeStep.node.safetyRuleIds,
      currentSafetyStatus: input.session.status,
    },
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
  const requestId = makeId("CLREQ");
  const clinicalResult = await callClinicalLanguageServer(toClinicalRequest({ ...input, requestId, contract }));
  const response = clinicalResult.response ?? fallbackResponse({ requestId, contract, activeStep: input.activeStep, locale: input.session.locale });
  const rawValidation = validateRuntimeStructuredOutput(response, input.session.locale, {
    roleId: input.activeStep.role.id,
    allowedActions: input.activeStep.promptItem.allowedActions,
    forbiddenActions: input.activeStep.promptItem.forbiddenActions,
    requiredFields: input.activeStep.promptItem.requiredFields,
    forbiddenPatientContent: input.release.policies.forbiddenPatientContent,
  });
  const fallbackUsed = Boolean(clinicalResult.error) || !rawValidation.accepted;
  const validator: OutputValidationResult = rawValidation.accepted
    ? rawValidation
    : {
        ...rawValidation,
        accepted: true,
        corrected: true,
        rejected: false,
        finalText: contract.fallbackPatientText,
        fallbackRequired: false,
        issues: [...rawValidation.issues, "A patient-safe fallback was used."],
      };
  const finalText = validator.finalText ?? contract.fallbackPatientText;
  const stateReduction = reduceRuntimeState({
    release: input.release,
    currentState: input.state,
    activeStep: input.activeStep,
    event: "assistant_delivered",
  });
  const providerResult = clinicalResult.response
    ? {
        provider: clinicalResult.response.providerMetadata.provider,
        model: clinicalResult.response.providerMetadata.model,
        latencyMs: clinicalResult.response.providerMetadata.latencyMs,
        text: clinicalResult.response.patientMessage,
      }
    : { provider: "deterministic", model: "runtime-fallback", text: finalText, error: clinicalResult.error ?? "Clinical language request failed" };

  return {
    contract,
    response,
    providerResult,
    validator,
    fallbackUsed,
    stateReduction,
    generatedMessage: {
      id: makeId("RMSG"),
      runtimeSessionId: input.session.id,
      role: "assistant",
      content: finalText,
      status: fallbackUsed ? "replaced_by_fallback" : "validated",
      nodeId: input.activeStep.node.id,
      promptItemId: input.activeStep.promptItem.id,
      sourceEvidenceIds: [],
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      metadata: {
        fallbackUsed,
        contractHash: contract.contractHash,
        sourcePromptItemId: input.sourcePromptItem.id,
        sourceTextHash: input.sourcePromptItem.sourceTrace.sourceTextHash,
      },
    },
  };
}