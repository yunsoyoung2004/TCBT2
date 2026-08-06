import { claimRuntimePatientTurn, commitRuntimeAssistantTurn, saveRuntimeEscalation, saveRuntimeLog, updateRuntimeSessionRecord } from "@/lib/repositories/runtime-session-repository";
import { cleanupExpiredTriggerSuppressions, findActiveTriggerSuppression, updateTriggerSuppression } from "@/lib/repositories/safety-event-repository";
import { createRuntimeCheckpoint, getRuntimeSession, setRuntimeSessionStatus } from "@/lib/api/runtime-session-api";
import { runMemoryRetrieval } from "@/lib/api/longitudinal-memory-api";
import { extractMemoryCandidates, generateSessionSummary } from "@/lib/api/session-summary-api";
import { createSafetyEvent, findOpenSafetyEventByTriggerKey, patchSafetyEvent, placeSessionOnSafetyHold } from "@/lib/api/safety-operations-api";
import { mergeExtractedRuntimeContext, extractRuntimeState, isExplicitPatientRefusal } from "@/lib/runtime/runtime-context";
import { executeRuntimeNodeMessage } from "@/lib/runtime/runtime-node-executor";
import { runSafetyOrchestrator } from "@/lib/runtime/runtime-safety-orchestrator";
import { createRuntimeExecutionTrace } from "@/lib/runtime/runtime-execution-tracer";
import { isPatientFacingLocaleConsistent } from "@/lib/runtime/runtime-output-validator";
import { injectLongitudinalMemory } from "@/lib/memory/memory-context-injector";
import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import { loadRuntimeRelease, normalizeRuntimeSessionState } from "@/lib/runtime/runtime-release-loader";
import { resolvePromptLocaleText } from "@/lib/runtime/runtime-release-normalizer";
import { reduceRuntimeState } from "@/lib/runtime/runtime-state-reducer";
import { assertRuntimeTransition } from "@/lib/runtime/runtime-state-machine";
import { evaluateRuntimeCondition, resolveActiveRuntimeStep } from "@/lib/runtime/runtime-step-resolver";
import type { ProtocolReleaseVersion } from "@/types/protocol-runtime";
import type { PatientInput, RuntimeCycleResult, RuntimeMessage, RuntimeSession, RuntimeSessionStatus, SessionExecutionLog } from "@/types/runtime-session";
import type { SafetyTriggerSuppression } from "@/types/safety-operations";

function makeId(prefix: string) {
  const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (typeof webCrypto?.randomUUID === "function") {
    return `${prefix}-${webCrypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeLog(runtimeSessionId: string, stage: SessionExecutionLog["stage"], status: SessionExecutionLog["status"], summary: string, extra: Partial<SessionExecutionLog> = {}): SessionExecutionLog {
  return {
    id: makeId("RLOG"),
    runtimeSessionId,
    timestamp: new Date().toISOString(),
    stage,
    status,
    summary,
    ...extra,
  };
}

function mergePromptItemIds(...collections: Array<string[] | undefined>) {
  return [...new Set(collections.flatMap((collection) => collection ?? []))];
}

function getPromptCompletionEffectType(promptItem: PromptItem) {
  return typeof promptItem.completionEffect?.type === "string" ? promptItem.completionEffect.type : "advance_prompt";
}

function applyPromptCompletionEffect(runtimeContext: RuntimeSession["runtimeContext"], promptItem: PromptItem): RuntimeSession["runtimeContext"] {
  const validationKind = String((promptItem.validation as { kind?: unknown } | null)?.kind ?? "");
  const ratingValues = (value: unknown): number[] => {
    if (Array.isArray(value)) return value.flatMap(ratingValues);
    if (typeof value === "number" && Number.isFinite(value)) return [value];
    if (typeof value === "string") return [...value.matchAll(/\b[0-5]\b/g)].map((match) => Number(match[0]));
    return [];
  };
  if (validationKind === "calculated_problem_totals") {
    const ratings = ratingValues(runtimeContext.fields.problemRatings);
    return { ...runtimeContext, fields: { ...runtimeContext.fields, totalProblemScore: ratings.reduce((sum, value) => sum + value, 0), yellowRedProblemsCount: ratings.filter((value) => value >= 4).length } };
  }
  if (validationKind === "calculated_goal_totals") {
    const ratings = ratingValues(runtimeContext.fields.goalRatings);
    return { ...runtimeContext, fields: { ...runtimeContext.fields, totalGoalsScore: ratings.reduce((sum, value) => sum + value, 0), yellowRedGoalsCount: ratings.filter((value) => value >= 4).length } };
  }
  const effect = promptItem.completionEffect;
  if (effect?.type === "set_field" && typeof effect.field === "string") {
    return { ...runtimeContext, fields: { ...runtimeContext.fields, [effect.field]: effect.value } };
  }
  if (effect?.type === "redirect_to_three_person_example") {
    return { ...runtimeContext, fields: { ...runtimeContext.fields, redirectToThreePersonExample: true } };
  }
  return runtimeContext;
}

function deterministicValidation(finalText: string) {
  return {
    accepted: true,
    corrected: false,
    rejected: false,
    issues: [],
    finalText,
    fallbackRequired: false,
  };
}

const MAX_CLARIFICATION_ATTEMPTS = 3;

async function deliverClarificationTurn(input: {
  session: RuntimeSession;
  node: ClinicalStageNode;
  promptItem: PromptItem;
  runtimePromptItem: import("@/types/protocol-runtime").RuntimePromptItem;
  release: ProtocolReleaseVersion;
  runtimeState: NonNullable<RuntimeSession["runtimeState"]>;
  patientMessage: RuntimeMessage;
  reason: string;
  missingFields?: string[];
  recentAssistantMessages?: string[];
}) {
  const clarificationAttemptCount = (input.session.runtimeContext.clarificationAttemptCount ?? 0) + 1;
  const missing = new Set(input.missingFields ?? []);
  const sourceSpecificClarification = input.promptItem.id === "tbct-s08-n01-p01-distressing-situation"
    ? missing.has("distressingSituation") && !missing.has("automaticThought")
      ? "Please describe a specific distressing situation and the important facts of what actually happened."
      : missing.has("automaticThought") && !missing.has("distressingSituation")
        ? "What automatic thought did that situation trigger?"
        : "Please identify a specific distressing situation and the automatic thought it triggered. What actually happened, and what went through your mind?"
    : undefined;
  const proposedContent = input.reason === "patient_refusal"
    ? "I understand. We can pause here, and you do not need to continue. You can end the session or resume later only if you choose."
    : input.reason === "safety_clarification"
      ? "I want to make sure I understand you correctly. Are you saying that you may be thinking about dying or harming yourself, or do you mean that things feel overwhelming right now?"
    : sourceSpecificClarification ?? resolvePromptLocaleText(input.runtimePromptItem.id, input.runtimePromptItem.clarificationPatientText ?? input.runtimePromptItem.fallbackPatientText, input.session.locale);
  const normalizeMessage = (value: string) => value.toLowerCase().replace(/[^a-z0-9\uac00-\ud7a3]+/g, " ").trim();
  const duplicatesRecentQuestion = (input.recentAssistantMessages ?? []).slice(-3).some((message) => normalizeMessage(message) === normalizeMessage(proposedContent));
  const outputField = input.promptItem.outputFields[0] ?? "";
  const validation = input.promptItem.validation as { kind?: unknown; values?: unknown; min?: unknown; max?: unknown } | null;
  const enumValues = Array.isArray(validation?.values) ? validation.values.map(String) : [];
  const adaptiveClarification = enumValues.length
    ? `Please choose one of these options: ${enumValues.join(" or ")}.`
    : validation?.kind === "rating" || /Percent|Rating|Intensity/i.test(outputField)
      ? `Please enter one number from ${Number(validation?.min ?? 0)} to ${Number(validation?.max ?? 100)}.`
      : /Situation/i.test(outputField)
        ? clarificationAttemptCount === 1
          ? "Could you describe one specific event: where you were, who was involved, and what happened?"
          : "Please give one brief, concrete moment rather than a general feeling or thought."
        : /Thought|Belief/i.test(outputField)
          ? clarificationAttemptCount === 1
            ? "What exact words went through your mind at that moment?"
            : "If you put the thought into one short sentence, what would it say?"
          : /Emotion/i.test(outputField)
            ? "Could you name one specific emotion you felt, such as anxiety, sadness, anger, shame, or relief?"
            : /Behavior/i.test(outputField)
              ? "What did you actually do, or what would the person visibly do next?"
              : /Reaction/i.test(outputField)
                ? "Would the other person's reaction be positive or negative?"
                : /Body|Sensation/i.test(outputField)
                  ? "What specific physical sensation did you notice in your body?"
                  : "Could you answer with one brief, specific example that directly addresses the question?";
  const content = input.reason === "patient_refusal" || input.reason === "safety_clarification" ? proposedContent : (duplicatesRecentQuestion || input.reason === "insufficient_input" ? adaptiveClarification : proposedContent);
  const sessionStatus: RuntimeSessionStatus = input.reason === "patient_refusal" || clarificationAttemptCount >= MAX_CLARIFICATION_ATTEMPTS ? "paused" : "waiting_for_input";
  const assistantMessage: RuntimeMessage = {
    id: makeId("RMSG"),
    runtimeSessionId: input.session.id,
    role: "assistant",
    content,
    status: "validated",
    nodeId: input.node.id,
    promptItemId: input.promptItem.id,
    sourceEvidenceIds: [],
    createdAt: new Date().toISOString(),
    deliveredAt: new Date().toISOString(),
    metadata: { turnId: makeId("TURN"), turnOutcome: "clarification", clarificationReason: input.reason },
  };
  const outputValidation = deterministicValidation(content);
  await commitRuntimeAssistantTurn({
    sessionId: input.session.id,
    assistantMessage,
    providerEvent: {
      id: makeId("RPE"),
      runtimeSessionId: input.session.id,
      provider: "deterministic",
      model: "runtime-clarification",
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      inputSummary: `clarification:${input.reason}`,
      outputText: content,
      createdAt: new Date().toISOString(),
    },
    validationEvent: {
      id: makeId("RVE"),
      runtimeSessionId: input.session.id,
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      ...outputValidation,
      createdAt: new Date().toISOString(),
    },
    trace: createRuntimeExecutionTrace({
      runtimeSessionId: input.session.id,
      releaseId: input.release.id,
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      roleId: input.runtimePromptItem.roleId,
      provider: "deterministic",
      model: "runtime-clarification",
      contractHash: `clarification:${input.session.id}:${input.promptItem.id}`,
      validation: outputValidation,
      fallbackUsed: false,
      transitionDecision: "clarification",
      stateChanges: { activeNodeId: input.node.id, activePromptItemId: input.promptItem.id, clarificationReason: input.reason },
      fidelityEvidence: {
        locale: input.session.locale,
        patientFacingText: content,
        activePromptMatches: true,
        patientInputPresent: true,
      },
    }),
    sessionPatch: {
      runtimeContext: {
        ...input.session.runtimeContext,
        lastPatientMessage: input.patientMessage.content,
        clarificationAttemptCount,
        lastClarificationReason: sessionStatus === "paused" ? "maximum_clarification_attempts" : input.reason,
      },
      currentNodeId: input.node.id,
      currentPromptItemId: input.promptItem.id,
      runtimeState: input.runtimeState,
      promptProgressionReason: "clarification_sent",
      status: sessionStatus,
    },
  });
  return { assistantMessage, sessionStatus };
}

async function deliverSafetyOverrideTurn(input: {
  session: RuntimeSession;
  node: ClinicalStageNode;
  promptItem: PromptItem;
  runtimePromptItem: import("@/types/protocol-runtime").RuntimePromptItem;
  release: ProtocolReleaseVersion;
  runtimeState: NonNullable<RuntimeSession["runtimeState"]>;
  patientMessage: RuntimeMessage;
  safetyContext: RuntimeSession["runtimeContext"];
  safetyResult: import("@/types/runtime-session").SafetyOrchestrationResult;
}) {
  const content = input.safetyResult.fixedResponse;
  if (!content) throw new Error("Safety override requires an approved fixed response.");
  const nextStatus = input.safetyResult.escalationRequired ? "escalated" : "safety_paused";
  const assistantMessage: RuntimeMessage = {
    id: makeId("RMSG"),
    runtimeSessionId: input.session.id,
    role: "assistant",
    content,
    status: "delivered",
    nodeId: input.node.id,
    promptItemId: input.promptItem.id,
    sourceEvidenceIds: [],
    createdAt: new Date().toISOString(),
    deliveredAt: new Date().toISOString(),
    metadata: { turnId: makeId("TURN"), turnOutcome: "safety_override", patientVisible: true, approvedSafetyRuleId: input.safetyResult.ruleIds[0] },
  };
  const validation = deterministicValidation(content);
  await commitRuntimeAssistantTurn({
    sessionId: input.session.id,
    assistantMessage,
    providerEvent: {
      id: makeId("RPE"),
      runtimeSessionId: input.session.id,
      provider: "deterministic",
      model: "approved-safety-response",
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      inputSummary: `safety:${input.safetyResult.ruleIds.join(",")}`,
      outputText: content,
      createdAt: new Date().toISOString(),
    },
    validationEvent: {
      id: makeId("RVE"),
      runtimeSessionId: input.session.id,
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      ...validation,
      createdAt: new Date().toISOString(),
    },
    trace: createRuntimeExecutionTrace({
      runtimeSessionId: input.session.id,
      releaseId: input.release.id,
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      roleId: input.runtimePromptItem.roleId,
      provider: "deterministic",
      model: "approved-safety-response",
      contractHash: `safety:${input.session.id}:${input.promptItem.id}`,
      validation,
      fallbackUsed: false,
      transitionDecision: "safety_override",
      stateChanges: {
        activeNodeId: input.node.id,
        activePromptItemId: input.promptItem.id,
        suspendedPromptItemId: input.promptItem.id,
        safetyRuleIds: input.safetyResult.ruleIds,
      },
      fidelityEvidence: {
        locale: input.session.locale,
        patientFacingText: content,
        activePromptMatches: true,
        patientInputPresent: true,
        safetyOverrideExpected: true,
        approvedSafetyLocaleException: !isPatientFacingLocaleConsistent(content, input.session.locale),
      },
    }),
    sessionPatch: {
      runtimeContext: {
        ...input.safetyContext,
        lastPatientMessage: input.patientMessage.content,
        riskLevel: input.safetyResult.severity === "high" ? "high" : "medium",
      },
      currentNodeId: input.node.id,
      currentPromptItemId: input.promptItem.id,
      runtimeState: input.runtimeState,
      promptProgressionReason: "safety_paused",
      status: nextStatus,
    },
  });
  return assistantMessage;
}

async function deliverRuntimePrompt(input: {
  session: RuntimeSession;
  node: ClinicalStageNode;
  promptItem: PromptItem;
  release: ProtocolReleaseVersion;
  recentMessages: RuntimeMessage[];
}) {
  const delivered = await executeRuntimeNodeMessage(input.session, input.node, input.promptItem, {
    release: input.release,
    recentMessages: input.recentMessages,
  });
  const reduction = delivered.stateReduction;
  const traceId = makeId("RTX");
  const clientTurnId = input.session.pendingTurnId;
  const patientMessage = clientTurnId
    ? [...input.recentMessages].reverse().find((message) => message.role === "patient" && message.metadata?.clientTurnId === clientTurnId)
    : undefined;
  const turnKind = patientMessage ? "patient_assistant" as const : "assistant_only" as const;
  const sessionVersionBefore = input.session.version ?? 0;
  const sessionVersionAfter = sessionVersionBefore + 1;
  const generatedMessage: RuntimeMessage = {
    ...delivered.generatedMessage,
    metadata: {
      ...delivered.generatedMessage.metadata,
      clientTurnId,
      patientMessageId: patientMessage?.id,
      assistantMessageId: delivered.generatedMessage.id,
      executionTraceId: traceId,
      sessionVersionBefore,
      sessionVersionAfter,
      turnOutcome: turnKind,
    },
  };
  const promptExecutionStatuses = {
    ...(input.session.promptExecutionStatuses ?? {}),
    ...Object.fromEntries(reduction.skippedPromptItemIds.map((id) => [id, "inactive_condition" as const])),
    [input.promptItem.id]: "executed" as const,
  };
  await commitRuntimeAssistantTurn({
    sessionId: input.session.id,
    assistantMessage: generatedMessage,
    providerEvent: {
      id: makeId("RPE"),
      runtimeSessionId: input.session.id,
      provider: delivered.providerResult.provider,
      model: delivered.providerResult.model ?? "unknown",
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      latencyMs: delivered.providerResult.latencyMs,
      inputSummary: delivered.contract.contractHash,
      outputText: generatedMessage.content,
      error: delivered.providerResult.error,
      createdAt: new Date().toISOString(),
    },
    validationEvent: {
      id: makeId("RVE"),
      runtimeSessionId: input.session.id,
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      accepted: delivered.validator.accepted,
      corrected: delivered.validator.corrected,
      rejected: delivered.validator.rejected,
      issues: delivered.validator.issues,
      finalText: generatedMessage.content,
      fallbackRequired: delivered.validator.fallbackRequired,
      createdAt: new Date().toISOString(),
    },
    trace: createRuntimeExecutionTrace({
      id: traceId,
      runtimeSessionId: input.session.id,
      releaseId: input.release.id,
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      roleId: delivered.contract.roleId,
      sessionId: delivered.contract.sessionId,
      sequenceIndex: delivered.contract.sequenceIndex,
      provider: delivered.providerResult.provider,
      model: delivered.providerResult.model,
      contractHash: delivered.contract.contractHash,
      validation: delivered.validator,
      fallbackUsed: delivered.fallbackUsed,
      transitionDecision: reduction.transitionDecision,
      modelRecommendedTransition: delivered.response.recommendedTransition,
      deterministicTransitionEvaluation: reduction.transitionDecision,
      committedTransition: reduction.transitionDecision,
      committedNextNodeId: reduction.state.activeNodeId,
      committedNextPromptItemId: reduction.state.activePromptItemId,
      turnAssociation: {
        kind: turnKind,
        clientTurnId,
        patientMessageId: patientMessage?.id,
        assistantMessageId: generatedMessage.id,
        executionTraceId: traceId,
        sessionVersionBefore,
        sessionVersionAfter,
      },
      promptExecutionStatuses,
      stateChanges: {
        activeNodeId: reduction.state.activeNodeId,
        activePromptItemId: reduction.state.activePromptItemId,
        completedPromptItemIds: reduction.state.completedPromptItemIds,
      },
      fidelityEvidence: {
        locale: input.session.locale,
        patientFacingText: generatedMessage.content,
        activePromptMatches: delivered.contract.nodeId === input.node.id && delivered.contract.promptItemId === input.promptItem.id,
        patientInputPresent: Boolean(patientMessage),
        turnKind,
        safetyOverrideExpected: input.session.runtimeContext.riskLevel !== "low" && input.session.runtimeContext.riskSignals.length > 0,
      },
    }),
    sessionPatch: {
      runtimeContext: input.session.runtimeContext,
      currentNodeId: reduction.state.activeNodeId,
      currentPromptItemId: reduction.state.activePromptItemId,
      completedPromptItemIds: reduction.state.completedPromptItemIds,
      skippedPromptItemIds: mergePromptItemIds(input.session.skippedPromptItemIds, reduction.skippedPromptItemIds),
      promptExecutionStatuses,
      runtimeState: reduction.state,
      promptProgressionReason: reduction.transitionDecision === "next_node" ? "node_completed" : reduction.transitionDecision === "next_prompt" ? "prompt_completed" : "prompt_delivered",
      status: reduction.transitionDecision === "waiting_for_input" ? "waiting_for_input" : "active",
    },
  });
  return { ...delivered, generatedMessage };
}

function normalizeInputValue(patientInput: PatientInput) {
  if (Array.isArray(patientInput.value)) {
    return patientInput.value.map((value) => String(value).trim().toLowerCase()).join("|");
  }
  return String(patientInput.value).trim().toLowerCase().replace(/\s+/g, " ");
}

function stableHash(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `fp-${(hash >>> 0).toString(16)}`;
}

export function createSafetyInputFingerprint(input: {
  runtimeSessionId: string;
  sourceNodeId: string;
  safetyRuleId?: string;
  patientInput: PatientInput;
}) {
  const normalized = normalizeInputValue(input.patientInput);
  const raw = [input.patientInput.kind, normalized.length > 120 ? stableHash(normalized) : normalized, input.runtimeSessionId, input.sourceNodeId, input.safetyRuleId ?? "no-rule"].join("::");
  return stableHash(raw);
}

function createRiskSignalSignature(riskSignals: string[] | undefined) {
  return stableHash((riskSignals ?? []).map((item) => item.trim().toLowerCase()).sort().join("|"));
}

async function getActiveSafetyTriggerSuppressions(input: {
  runtimeSessionId: string;
  sourceNodeId: string;
  safetyRuleId?: string;
  inputFingerprint: string;
}) {
  await cleanupExpiredTriggerSuppressions();
  const match = await findActiveTriggerSuppression(input);
  return match ? [match] : [];
}

function evaluateSafetyTriggerSuppression(input: {
  suppression?: SafetyTriggerSuppression | null;
  executionSequence: number;
  safetyResult: Awaited<ReturnType<typeof runSafetyOrchestrator>>;
  riskSignalSignature: string;
  inputFingerprint: string;
}) {
  const suppression = input.suppression;
  if (!suppression) {
    return { suppressed: false, reason: "not_applicable" as const };
  }
  if (new Date(suppression.expiresAt).getTime() <= Date.now()) {
    return { suppressed: false, reason: "expired" as const };
  }
  if (suppression.inputFingerprint !== input.inputFingerprint) {
    return { suppressed: false, reason: "different_input" as const };
  }
  if ((suppression.safetyRuleId ?? undefined) !== (input.safetyResult.ruleIds[0] ?? undefined)) {
    return { suppressed: false, reason: "different_rule" as const };
  }
  if (suppression.executionSequence !== undefined && suppression.executionSequence !== input.executionSequence) {
    return { suppressed: false, reason: "not_applicable" as const };
  }
  if ((suppression.riskLevel ?? "low") !== (input.safetyResult.severity ?? "low")) {
    return { suppressed: false, reason: "new_risk_signal" as const };
  }
  if ((suppression.riskSignalSignature ?? "") !== input.riskSignalSignature) {
    return { suppressed: false, reason: "new_risk_signal" as const };
  }
  return { suppressed: true, suppressionId: suppression.id, reason: "exact_recent_trigger" as const };
}

async function consumeOrRecordSuppressionUse(suppression: SafetyTriggerSuppression) {
  await updateTriggerSuppression(suppression.id, {
    usageCount: (suppression.usageCount ?? 0) + 1,
    lastUsedAt: new Date().toISOString(),
  });
}

async function ensureSafetyOperationsRecord(input: {
  sessionId: string;
  session: RuntimeSession;
  currentNodeId: string;
  executionSequence: number;
  safetyResult: import("@/types/runtime-session").SafetyOrchestrationResult;
  patientMessageId: string;
  fixedResponseMessageId?: string;
}) {
  const open = await findOpenSafetyEventByTriggerKey({
    runtimeSessionId: input.sessionId,
    sourceNodeId: input.currentNodeId,
    safetyRuleId: input.safetyResult.ruleIds[0],
    executionSequence: input.executionSequence,
  });
  if (open) return open;
  return createSafetyEvent({
    projectId: input.session.projectId,
    participantId: input.session.participantId,
    runtimeSessionId: input.sessionId,
    protocolId: input.session.protocolId,
    protocolVersion: input.session.protocolVersion,
    sessionDefinitionId: input.session.sessionDefinitionId,
    source: "runtime_rule",
    sourceNodeId: input.currentNodeId,
    sourceMessageIds: [input.patientMessageId, ...(input.fixedResponseMessageId ? [input.fixedResponseMessageId] : [])],
    sourceExecutionLogIds: [],
    safetyRuleIds: input.safetyResult.ruleIds,
    executionSequence: input.executionSequence,
    linkedSafetyMemoryIds: [],
    severity: input.safetyResult.severity === "high" ? "high" : input.safetyResult.severity === "medium" ? "medium" : "low",
    urgency: input.safetyResult.severity === "high" ? "urgent" : "priority",
    triggerSummary: input.safetyResult.reason ?? "Safety trigger",
    patientFacingStatus: input.safetyResult.severity === "high" ? "waiting_for_review" : "session_paused",
    sessionHoldRequired: input.safetyResult.action !== "continue",
    sessionResumeAuthorized: false,
    followUpRequired: input.safetyResult.severity !== "low",
    followUpTaskIds: [],
  });
}

export async function startRuntimeSession(sessionId: string) {
  const view = await getRuntimeSession(sessionId);
  if (!view) throw new Error("Runtime session not found");
  await setRuntimeSessionStatus(sessionId, "preparing", { startedAt: new Date().toISOString() });
  const runtimeRelease = loadRuntimeRelease(view.release);
  const runtimeState = normalizeRuntimeSessionState(view.session, runtimeRelease);
  const entryNode = view.nodes.find((node) => node.id === runtimeState.activeNodeId);
  if (!entryNode) throw new Error("Runtime session entry node is missing");
  await updateRuntimeSessionRecord(sessionId, {
    currentNodeId: runtimeState.activeNodeId,
    currentPromptItemId: runtimeState.activePromptItemId,
    runtimeState,
    status: "active",
  });
  await saveRuntimeLog(makeLog(sessionId, "session", "completed", "Session started", { nodeId: runtimeState.activeNodeId }));
  await createRuntimeCheckpoint(sessionId);
  return executeCurrentNode(sessionId);
}

export async function pauseRuntimeSession(sessionId: string, reason: string) {
  const view = await getRuntimeSession(sessionId);
  if (!view) throw new Error("Runtime session not found");
  if (!["active", "waiting_for_input"].includes(view.session.status)) throw new Error("Pause is not allowed in the current state");
  await setRuntimeSessionStatus(sessionId, "paused", { pausedAt: new Date().toISOString() });
  await saveRuntimeLog(makeLog(sessionId, "session", "completed", `Session paused: ${reason}`));
  return createRuntimeCheckpoint(sessionId);
}

export async function resumeRuntimeSession(sessionId: string) {
  const view = await getRuntimeSession(sessionId);
  if (!view) throw new Error("Runtime session not found");
  if (view.session.status !== "paused") throw new Error("Resume is not allowed in the current state");
  await setRuntimeSessionStatus(sessionId, "active", { resumedAt: new Date().toISOString() });
  await saveRuntimeLog(makeLog(sessionId, "session", "completed", "Session resumed"));
  return executeCurrentNode(sessionId);
}

export async function terminateRuntimeSession(sessionId: string, reason: string) {
  const view = await getRuntimeSession(sessionId);
  if (!view) throw new Error("Runtime session not found");
  if (["completed", "terminated"].includes(view.session.status)) throw new Error("Session cannot be terminated");
  assertRuntimeTransition(view.session.status, "terminated");
  await updateRuntimeSessionRecord(sessionId, { status: "terminated", terminatedAt: new Date().toISOString() });
  await saveRuntimeLog(makeLog(sessionId, "session", "completed", `Session terminated: ${reason}`));
  return createRuntimeCheckpoint(sessionId);
}

export async function completeRuntimeSession(sessionId: string) {
  await updateRuntimeSessionRecord(sessionId, { status: "completed", completedAt: new Date().toISOString() });
  await saveRuntimeLog(makeLog(sessionId, "completion", "completed", "Session completed"));
  const checkpoint = await createRuntimeCheckpoint(sessionId);
  const summary = await generateSessionSummary(sessionId);
  await extractMemoryCandidates(summary.id);
  return checkpoint;
}

export async function executeCurrentNode(sessionId: string): Promise<RuntimeCycleResult> {
  const view = await getRuntimeSession(sessionId);
  if (!view) throw new Error("Runtime session not found");
  const session = view.session;
  const runtimeRelease = loadRuntimeRelease(view.release);
  const runtimeState = normalizeRuntimeSessionState(session, runtimeRelease);
  const activeStep = resolveActiveRuntimeStep(runtimeRelease, runtimeState);
  if (!activeStep) {
    const terminalNode = view.nodes.find((item) => item.id === runtimeState.activeNodeId);
    if (terminalNode?.type === "session_complete") {
      await completeRuntimeSession(sessionId);
      return {
        sessionId,
        previousNodeId: session.previousNodeId,
        currentNodeId: terminalNode.id,
        safetyResult: { triggered: false, ruleIds: [], action: "continue", escalationRequired: false },
        fallbackUsed: false,
        sessionStatus: "completed",
        logIds: [],
      };
    }
    const runtimeNode = runtimeRelease.nodes.find((item) => item.id === runtimeState.activeNodeId);
    const transition = runtimeNode?.transitionRules
      .slice()
      .sort((left, right) => left.priority - right.priority)
      .find((rule) => evaluateRuntimeCondition(rule.condition, runtimeState));
    const nextNode = transition && runtimeRelease.nodes.find((item) => item.id === transition.targetNodeId);
    if (runtimeNode && nextNode) {
      const skippedPromptItemIds = mergePromptItemIds(session.skippedPromptItemIds, runtimeNode.promptSequence);
      const nextState = {
        ...runtimeState,
        activeNodeId: nextNode.id,
        activePromptItemId: nextNode.promptSequence[0],
        activePromptIndex: 0,
        completedNodeIds: mergePromptItemIds(runtimeState.completedNodeIds, [runtimeNode.id]),
        completedPromptItemIds: mergePromptItemIds(runtimeState.completedPromptItemIds, runtimeNode.promptSequence),
      };
      await updateRuntimeSessionRecord(sessionId, { currentNodeId: nextNode.id, currentPromptItemId: nextState.activePromptItemId, skippedPromptItemIds, runtimeState: nextState, promptProgressionReason: "prompt_skipped", status: "active" });
      return executeCurrentNode(sessionId);
    }
    await updateRuntimeSessionRecord(sessionId, { status: "failed" });
    throw new Error("Runtime session has no active deterministic step.");
  }
  const node = view.nodes.find((item) => item.id === activeStep.node.id);
  if (!node) throw new Error("Current node is missing");
  const activePromptItem = view.promptItems.find((item) => item.id === activeStep.promptItem.sourcePromptItemId);
  if (!activePromptItem) throw new Error("Current source PromptItem is missing");
  const retrieval = await runMemoryRetrieval({
    participantId: session.participantId,
    runtimeSessionId: session.id,
    protocolId: session.protocolId,
    protocolVersion: session.protocolVersion,
    sessionDefinitionId: session.sessionDefinitionId,
    currentNodeId: node.id,
    currentNodeType: node.type as import("@/types/protocol-runtime").ProtocolNodeType,
    currentClinicalIntent: node.clinicalPurpose ?? node.title,
    maxItems: 5,
  }).catch(() => null);
  const runtimeContext = retrieval ? injectLongitudinalMemory(session.runtimeContext, retrieval.selected) : session.runtimeContext;
  const skippedPromptItemIds = mergePromptItemIds(session.skippedPromptItemIds, activeStep.skippedPromptItemIds);
  const activeSession = { ...session, runtimeContext, skippedPromptItemIds };
  await saveRuntimeLog(makeLog(sessionId, "node_resolution", "completed", `Current node resolved: ${node.title}`, { nodeId: node.id }));
  const promptItem = activePromptItem;
  if (promptItem) {
    if (activeStep.promptItem.requiresPatientInput) {
      // A repeat_until prompt (e.g. "rate the next item", "collect one more
      // piece of evidence") is meant to be delivered again on every
      // iteration. Without this exemption, "already has one assistant
      // message on file" would skip re-delivery on the second+ iteration,
      // which also skips the commit path that clears the turn claim --
      // leaving the session unable to accept the patient's next answer.
      const alreadyDelivered = activeStep.promptItem.executionMode !== "repeat_until"
        && view.messages.some((message) => message.promptItemId === promptItem.id && message.role === "assistant");
      const delivered = !alreadyDelivered
        ? await deliverRuntimePrompt({ session: activeSession, node, promptItem, release: view.release, recentMessages: view.messages })
        : undefined;
      if (!alreadyDelivered && !delivered) {
        throw new Error("Assistant delivery did not create a runtime message.");
      }
      await updateRuntimeSessionRecord(sessionId, {
        runtimeContext,
        currentNodeId: node.id,
        currentPromptItemId: promptItem.id,
        skippedPromptItemIds,
        runtimeState: delivered?.stateReduction.state ?? session.runtimeState,
        promptProgressionReason: activeStep.skippedPromptItemIds.length ? "prompt_skipped" : "prompt_delivered",
        status: "waiting_for_input",
      });
      await createRuntimeCheckpoint(sessionId);
      return {
        sessionId,
        currentNodeId: node.id,
        currentPromptItemId: promptItem.id,
        safetyResult: { triggered: false, ruleIds: [], action: "continue", escalationRequired: false },
        fallbackUsed: false,
        sessionStatus: "waiting_for_input",
        logIds: [],
      };
    }

    const delivered = view.messages.some((message) => message.promptItemId === promptItem.id && message.role === "assistant")
      ? undefined
      : await deliverRuntimePrompt({ session: activeSession, node, promptItem, release: view.release, recentMessages: view.messages });
    const nextRuntimeState = delivered?.stateReduction.state ?? runtimeState;
    const completedPromptItemIds = nextRuntimeState.completedPromptItemIds;
    const nextContext = applyPromptCompletionEffect(runtimeContext, promptItem);
    const completionEffectType = getPromptCompletionEffectType(promptItem);
    if (completionEffectType === "pause_session") {
      await updateRuntimeSessionRecord(sessionId, {
        runtimeContext: nextContext,
        currentNodeId: nextRuntimeState.activeNodeId,
        currentPromptItemId: nextRuntimeState.activePromptItemId,
        completedPromptItemIds,
        skippedPromptItemIds,
        runtimeState: nextRuntimeState,
        promptProgressionReason: "prompt_completed",
        status: "paused",
      });
      await createRuntimeCheckpoint(sessionId);
      return {
        sessionId,
        currentNodeId: node.id,
        currentPromptItemId: promptItem.id,
        safetyResult: { triggered: false, ruleIds: [], action: "pause_session", escalationRequired: false },
        generatedMessage: delivered?.generatedMessage,
        outputValidation: delivered?.validator,
        fallbackUsed: delivered?.fallbackUsed ?? false,
        sessionStatus: "paused",
        logIds: [],
      };
    }
    if (delivered?.stateReduction.transitionDecision === "complete_session") {
      await updateRuntimeSessionRecord(sessionId, {
        runtimeContext: nextContext,
        currentNodeId: nextRuntimeState.activeNodeId,
        currentPromptItemId: nextRuntimeState.activePromptItemId,
        completedPromptItemIds,
        skippedPromptItemIds,
        runtimeState: nextRuntimeState,
        promptProgressionReason: "node_completed",
        status: "active",
      });
      await completeRuntimeSession(sessionId);
      return {
        sessionId,
        currentNodeId: node.id,
        currentPromptItemId: promptItem.id,
        safetyResult: { triggered: false, ruleIds: [], action: "continue", escalationRequired: false },
        generatedMessage: delivered?.generatedMessage,
        outputValidation: delivered?.validator,
        fallbackUsed: delivered?.fallbackUsed ?? false,
        sessionStatus: "completed",
        logIds: [],
      };
    }
    await updateRuntimeSessionRecord(sessionId, {
      runtimeContext: nextContext,
      currentNodeId: nextRuntimeState.activeNodeId,
      currentPromptItemId: nextRuntimeState.activePromptItemId,
      completedPromptItemIds,
      skippedPromptItemIds,
      runtimeState: nextRuntimeState,
      promptProgressionReason: delivered?.stateReduction.transitionDecision === "next_node" ? "node_completed" : "prompt_completed",
      status: "active",
    });
    if (completionEffectType === "complete_session") {
      await completeRuntimeSession(sessionId);
      return {
        sessionId,
        currentNodeId: node.id,
        currentPromptItemId: promptItem.id,
        safetyResult: { triggered: false, ruleIds: [], action: "continue", escalationRequired: false },
        generatedMessage: delivered?.generatedMessage,
        outputValidation: delivered?.validator,
        fallbackUsed: delivered?.fallbackUsed ?? false,
        sessionStatus: "completed",
        logIds: [],
      };
    }
    await createRuntimeCheckpoint(sessionId);
    return executeCurrentNode(sessionId);
  }

  throw new Error("Runtime session resolved no active source PromptItem.");
}

export async function submitPatientInput(sessionId: string, patientInput: PatientInput, options: { clientTurnId?: string; expectedSessionVersion?: number } = {}): Promise<RuntimeCycleResult> {
  await cleanupExpiredTriggerSuppressions();
  const initialView = await getRuntimeSession(sessionId);
  if (!initialView) throw new Error("Runtime session not found");
  const initialSession = initialView.session;
  if (initialSession.status === "completed") throw new Error("Completed session does not accept input");
  if (initialSession.status === "processing") {
    return {
      sessionId,
      previousNodeId: initialSession.previousNodeId,
      currentNodeId: initialSession.currentNodeId ?? "unknown",
      currentPromptItemId: initialSession.currentPromptItemId,
      safetyResult: { triggered: false, ruleIds: [], action: "continue", escalationRequired: false },
      turnOutcome: "rejected_duplicate",
      fallbackUsed: false,
      sessionStatus: initialSession.status,
      logIds: [],
    };
  }
  if (initialSession.status !== "waiting_for_input") throw new Error("Session is not waiting for input");
  const runtimeRelease = loadRuntimeRelease(initialView.release);
  const runtimeState = normalizeRuntimeSessionState(initialSession, runtimeRelease);
  const activeStep = resolveActiveRuntimeStep(runtimeRelease, runtimeState);
  if (!activeStep) throw new Error("Runtime session has no active deterministic step.");
  const currentNode = initialView.nodes.find((node) => node.id === activeStep.node.id);
  if (!currentNode) throw new Error("Current node is missing");
  const currentPromptItem = initialView.promptItems.find((promptItem) => promptItem.id === activeStep.promptItem.sourcePromptItemId);
  if (!currentPromptItem) throw new Error("Current source PromptItem is missing");
  if (!activeStep.promptItem.requiresPatientInput) throw new Error("Current PromptItem does not accept patient input");
  const clientTurnId = options.clientTurnId ?? makeId("TURN");
  const patientMessage: RuntimeMessage = {
    id: makeId("RMSG"),
    runtimeSessionId: sessionId,
    role: "patient",
    content: Array.isArray(patientInput.value) ? patientInput.value.join(", ") : String(patientInput.value),
    status: "delivered",
    nodeId: currentNode.id,
    promptItemId: currentPromptItem.id,
    createdAt: new Date().toISOString(),
    deliveredAt: new Date().toISOString(),
    metadata: { inputKind: patientInput.kind, promptItemId: currentPromptItem.id, clientTurnId },
  };
  const extracted = await extractRuntimeState({ patientInput, currentNode, currentPromptItem, currentContext: initialSession.runtimeContext, locale: initialSession.locale });
  const safetyContext = {
    ...initialSession.runtimeContext,
    riskLevel: extracted.riskLevel,
    riskSignals: extracted.riskSignals,
    lastPatientMessage: patientMessage.content,
  };
  const safetyResult = await runSafetyOrchestrator({ currentNode, extractedState: extracted, runtimeContext: safetyContext });
  const claim = await claimRuntimePatientTurn({
    sessionId,
    clientTurnId,
    expectedSessionVersion: options.expectedSessionVersion ?? initialSession.version ?? 0,
    patientMessage,
  });
  if (!claim.claimed) {
    return {
      sessionId,
      previousNodeId: claim.session.previousNodeId,
      currentNodeId: claim.session.currentNodeId ?? "unknown",
      currentPromptItemId: claim.session.currentPromptItemId,
      safetyResult: { triggered: false, ruleIds: [], action: "continue", escalationRequired: false },
      turnOutcome: "rejected_duplicate",
      fallbackUsed: false,
      sessionStatus: claim.session.status,
      logIds: [],
    };
  }
  const view = initialView;
  const session = claim.session;
  if (claim.session.pendingTurnId !== clientTurnId) throw new Error("Patient turn claim was not retained");
  const skippedPromptItemIds = mergePromptItemIds(session.skippedPromptItemIds, activeStep.skippedPromptItemIds);
  await updateRuntimeSessionRecord(sessionId, { status: "processing", currentPromptItemId: currentPromptItem.id, skippedPromptItemIds });
  const executionSequence = session.executionLogIds.length + 1;
  await saveRuntimeLog(makeLog(sessionId, "input", "completed", "Patient input received", { nodeId: currentNode.id, input: { kind: patientInput.kind } }));
  await saveRuntimeLog(makeLog(sessionId, "state_extraction", "completed", "State extracted", { nodeId: currentNode.id, output: extracted as unknown as Record<string, unknown> }));
  await saveRuntimeLog(makeLog(sessionId, "safety_check", "completed", safetyResult.triggered ? `Safety triggered: ${safetyResult.action}` : "Safety check passed", { nodeId: currentNode.id, output: safetyResult as unknown as Record<string, unknown> }));
  if (extracted.riskSignals.includes("ambiguous_safety_language") && !safetyResult.triggered) {
    const clarification = await deliverClarificationTurn({ session, node: currentNode, promptItem: currentPromptItem, runtimePromptItem: activeStep.promptItem, release: view.release, runtimeState, patientMessage, reason: "safety_clarification", missingFields: extracted.missingFields, recentAssistantMessages: view.messages.filter((message) => message.role === "assistant").map((message) => message.content) });
    await saveRuntimeLog(makeLog(sessionId, "safety_check", "completed", "Ambiguous safety language requires neutral clarification", { nodeId: currentNode.id, output: { signals: extracted.riskSignals } }));
    await createRuntimeCheckpoint(sessionId);
    return { sessionId, previousNodeId: session.previousNodeId, currentNodeId: currentNode.id, currentPromptItemId: currentPromptItem.id, stateExtraction: extracted, safetyResult, generatedMessage: clarification.assistantMessage, turnOutcome: "clarification", fallbackUsed: false, sessionStatus: clarification.sessionStatus, logIds: [] };
  }
  const isSemanticRefusal = extracted.riskSignals.includes("patient_refusal_semantic");
  if ((isExplicitPatientRefusal(patientMessage.content) || isSemanticRefusal) && !safetyResult.triggered) {
    const refusal = await deliverClarificationTurn({
      session,
      node: currentNode,
      promptItem: currentPromptItem,
      runtimePromptItem: activeStep.promptItem,
      release: view.release,
      runtimeState,
      patientMessage,
      reason: "patient_refusal",
      recentAssistantMessages: view.messages.filter((message) => message.role === "assistant").map((message) => message.content),
    });
    await saveRuntimeLog(makeLog(sessionId, "input", "completed", "Patient declined to continue; session paused without protocol progression", { nodeId: currentNode.id }));
    await createRuntimeCheckpoint(sessionId);
    return { sessionId, previousNodeId: session.previousNodeId, currentNodeId: currentNode.id, currentPromptItemId: currentPromptItem.id, stateExtraction: extracted, safetyResult, generatedMessage: refusal.assistantMessage, turnOutcome: "clarification", fallbackUsed: false, sessionStatus: refusal.sessionStatus, logIds: [] };
  }
  if (extracted.missingFields.length && !safetyResult.triggered) {
    const clarification = await deliverClarificationTurn({
      session,
      node: currentNode,
      promptItem: currentPromptItem,
      runtimePromptItem: activeStep.promptItem,
      release: view.release,
      runtimeState,
      patientMessage,
      reason: "insufficient_input",
      missingFields: extracted.missingFields,
      recentAssistantMessages: view.messages.filter((message) => message.role === "assistant").map((message) => message.content),
    });
    await saveRuntimeLog(makeLog(sessionId, "error", "skipped", "Input validation failed", { nodeId: currentNode.id, output: { missingFields: extracted.missingFields } }));
    await createRuntimeCheckpoint(sessionId);
    return {
      sessionId,
      previousNodeId: session.previousNodeId,
      currentNodeId: currentNode.id,
      currentPromptItemId: currentPromptItem.id,
      stateExtraction: extracted,
      safetyResult,
      generatedMessage: clarification.assistantMessage,
      turnOutcome: "clarification",
      fallbackUsed: false,
      sessionStatus: clarification.sessionStatus,
      logIds: [],
    };
  }
  if (safetyResult.triggered) {
    const inputFingerprint = createSafetyInputFingerprint({
      runtimeSessionId: sessionId,
      sourceNodeId: currentNode.id,
      safetyRuleId: safetyResult.ruleIds[0],
      patientInput,
    });
    const riskSignalSignature = createRiskSignalSignature(safetyResult.ruleIds);
    const [activeSuppression] = await getActiveSafetyTriggerSuppressions({
      runtimeSessionId: sessionId,
      sourceNodeId: currentNode.id,
      safetyRuleId: safetyResult.ruleIds[0],
      inputFingerprint,
    });
    const suppressionDecision = evaluateSafetyTriggerSuppression({
      suppression: activeSuppression,
      executionSequence,
      safetyResult,
      riskSignalSignature,
      inputFingerprint,
    });
    const safetyMessage = await deliverSafetyOverrideTurn({
      session,
      node: currentNode,
      promptItem: currentPromptItem,
      runtimePromptItem: activeStep.promptItem,
      release: view.release,
      runtimeState,
      patientMessage,
      safetyContext,
      safetyResult,
    });
    const safetyEvent = suppressionDecision.suppressed && activeSuppression
      ? await findOpenSafetyEventByTriggerKey({
        runtimeSessionId: sessionId,
        sourceNodeId: currentNode.id,
        safetyRuleId: safetyResult.ruleIds[0],
        executionSequence: activeSuppression.executionSequence ?? executionSequence,
      })
      : await ensureSafetyOperationsRecord({
        sessionId,
        session,
        currentNodeId: currentNode.id,
        executionSequence,
        safetyResult,
        patientMessageId: patientMessage.id,
        fixedResponseMessageId: safetyMessage.id,
      });
    if (suppressionDecision.suppressed && activeSuppression) {
      await consumeOrRecordSuppressionUse(activeSuppression);
      await saveRuntimeLog(makeLog(sessionId, "safety_check", "completed", "Safety trigger suppression reused existing event", {
        nodeId: currentNode.id,
        output: {
          suppressionId: activeSuppression.id,
          reason: suppressionDecision.reason,
          reusedSafetyEventId: safetyEvent?.id,
        },
      }));
    }
    if (!safetyEvent) {
      throw new Error("Suppressed safety trigger could not resolve an existing safety event");
    }
    if (safetyResult.escalationRequired) {
      const escalation = await saveRuntimeEscalation({
        id: makeId("ESC"),
        runtimeSessionId: sessionId,
        protocolId: session.protocolId,
        protocolVersion: session.protocolVersion,
        sessionDefinitionId: session.sessionDefinitionId,
        nodeId: currentNode.id,
        safetyRuleId: safetyResult.ruleIds[0],
        linkedSafetyEventId: safetyEvent.id,
        executionSequence,
        severity: safetyResult.severity === "high" ? "high" : "medium",
        triggerSummary: safetyResult.reason ?? "Safety escalation triggered",
        status: "created",
        createdAt: new Date().toISOString(),
      });
      await updateRuntimeSessionRecord(sessionId, { status: "escalated", escalationIds: [...session.escalationIds, escalation.id] });
      await patchSafetyEvent(safetyEvent.id, { linkedEscalationId: escalation.id }, "Linked escalation to safety event");
      await saveRuntimeLog(makeLog(sessionId, "escalation", "completed", "Clinician escalation created", { nodeId: currentNode.id }));
      await createRuntimeCheckpoint(sessionId);
      return {
        sessionId,
        previousNodeId: session.previousNodeId,
        currentNodeId: currentNode.id,
        stateExtraction: extracted,
        safetyResult,
        safetyTriggerSuppressed: suppressionDecision.suppressed,
        suppressionId: suppressionDecision.suppressionId,
        suppressionReason: suppressionDecision.reason,
        reusedSafetyEventId: suppressionDecision.suppressed ? safetyEvent.id : undefined,
        generatedMessage: safetyMessage,
        turnOutcome: "safety_override",
        fallbackUsed: false,
        sessionStatus: "escalated",
        logIds: [],
      };
    }
    await placeSessionOnSafetyHold(sessionId, safetyEvent.id, "Runtime safety trigger requested hold");
    await createRuntimeCheckpoint(sessionId);
    return {
      sessionId,
      previousNodeId: session.previousNodeId,
      currentNodeId: currentNode.id,
      stateExtraction: extracted,
      safetyResult,
      safetyTriggerSuppressed: suppressionDecision.suppressed,
      suppressionId: suppressionDecision.suppressionId,
      suppressionReason: suppressionDecision.reason,
      reusedSafetyEventId: suppressionDecision.suppressed ? safetyEvent.id : undefined,
      generatedMessage: safetyMessage,
      turnOutcome: "safety_override",
      fallbackUsed: false,
      sessionStatus: "safety_paused",
      logIds: [],
    };
  }
  const nextContext = { ...mergeExtractedRuntimeContext(session.runtimeContext, extracted), lastPatientMessage: patientMessage.content, clarificationAttemptCount: 0, lastClarificationReason: undefined };
  await updateRuntimeSessionRecord(sessionId, { runtimeContext: nextContext });
  const reduction = reduceRuntimeState({
    release: runtimeRelease,
    currentState: runtimeState,
    activeStep,
    event: "patient_input_accepted",
    confirmedFields: extracted.fields,
  });
  const completedPromptItemIds = reduction.state.completedPromptItemIds;
  const reducedSkippedPromptItemIds = mergePromptItemIds(skippedPromptItemIds, reduction.skippedPromptItemIds);
  const contextAfterCompletion = applyPromptCompletionEffect(nextContext, currentPromptItem);
  const completionEffectType = getPromptCompletionEffectType(currentPromptItem);
  if (completionEffectType === "pause_session") {
    await updateRuntimeSessionRecord(sessionId, {
      runtimeContext: contextAfterCompletion,
      currentNodeId: reduction.state.activeNodeId,
      currentPromptItemId: reduction.state.activePromptItemId,
      completedPromptItemIds,
      skippedPromptItemIds: reducedSkippedPromptItemIds,
      runtimeState: reduction.state,
      promptProgressionReason: "prompt_completed",
      status: "paused",
    });
    await createRuntimeCheckpoint(sessionId);
    return {
      sessionId,
      previousNodeId: session.previousNodeId,
      currentNodeId: currentNode.id,
      currentPromptItemId: currentPromptItem.id,
      stateExtraction: extracted,
      safetyResult,
      fallbackUsed: false,
      sessionStatus: "paused",
      logIds: [],
    };
  }
  await updateRuntimeSessionRecord(sessionId, {
    runtimeContext: contextAfterCompletion,
    currentNodeId: reduction.state.activeNodeId,
    currentPromptItemId: reduction.state.activePromptItemId,
    completedPromptItemIds,
    skippedPromptItemIds: reducedSkippedPromptItemIds,
    runtimeState: reduction.state,
    promptProgressionReason: reduction.transitionDecision === "next_node" ? "node_completed" : "prompt_completed",
    status: "active",
  });
  if (completionEffectType === "complete_session") {
    await completeRuntimeSession(sessionId);
    return {
      sessionId,
      previousNodeId: session.previousNodeId,
      currentNodeId: currentNode.id,
      currentPromptItemId: currentPromptItem.id,
      stateExtraction: extracted,
      safetyResult,
      fallbackUsed: false,
      sessionStatus: "completed",
      logIds: [],
    };
  }
  if (reduction.transitionDecision === "complete_session") {
    await completeRuntimeSession(sessionId);
    return {
      sessionId,
      previousNodeId: session.previousNodeId,
      currentNodeId: currentNode.id,
      currentPromptItemId: currentPromptItem.id,
      stateExtraction: extracted,
      safetyResult,
      fallbackUsed: false,
      sessionStatus: "completed",
      logIds: [],
    };
  }
  await createRuntimeCheckpoint(sessionId);
  const cycle = await executeCurrentNode(sessionId);
  return {
    ...cycle,
    previousNodeId: currentNode.id,
    currentPromptItemId: currentPromptItem.id,
    nextPromptItemId: cycle.currentPromptItemId,
    stateExtraction: extracted,
    safetyResult,
    turnOutcome: cycle.fallbackUsed ? "fallback" : "normal",
  };
}
