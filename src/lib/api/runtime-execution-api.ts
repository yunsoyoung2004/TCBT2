import { commitRuntimeAssistantTurn, saveRuntimeEscalation, saveRuntimeLog, saveRuntimeMessage, updateRuntimeSessionRecord } from "@/lib/repositories/runtime-session-repository";
import { cleanupExpiredTriggerSuppressions, findActiveTriggerSuppression, updateTriggerSuppression } from "@/lib/repositories/safety-event-repository";
import { createRuntimeCheckpoint, getRuntimeSession, setRuntimeSessionStatus } from "@/lib/api/runtime-session-api";
import { runMemoryRetrieval } from "@/lib/api/longitudinal-memory-api";
import { extractMemoryCandidates, generateSessionSummary } from "@/lib/api/session-summary-api";
import { createSafetyEvent, findOpenSafetyEventByTriggerKey, patchSafetyEvent, placeSessionOnSafetyHold } from "@/lib/api/safety-operations-api";
import { mergeExtractedRuntimeContext, extractRuntimeState } from "@/lib/runtime/runtime-context";
import { executeRuntimeNodeMessage } from "@/lib/runtime/runtime-node-executor";
import { runSafetyOrchestrator } from "@/lib/runtime/runtime-safety-orchestrator";
import { createRuntimeExecutionTrace } from "@/lib/runtime/runtime-execution-tracer";
import { injectLongitudinalMemory } from "@/lib/memory/memory-context-injector";
import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import { loadRuntimeRelease, normalizeRuntimeSessionState } from "@/lib/runtime/runtime-release-loader";
import { reduceRuntimeState } from "@/lib/runtime/runtime-state-reducer";
import { resolveActiveRuntimeStep } from "@/lib/runtime/runtime-step-resolver";
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
  const effect = promptItem.completionEffect;
  if (effect?.type === "set_field" && typeof effect.field === "string") {
    return { ...runtimeContext, fields: { ...runtimeContext.fields, [effect.field]: effect.value } };
  }
  if (effect?.type === "redirect_to_three_person_example") {
    return { ...runtimeContext, fields: { ...runtimeContext.fields, redirectToThreePersonExample: true } };
  }
  return runtimeContext;
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
  await commitRuntimeAssistantTurn({
    sessionId: input.session.id,
    assistantMessage: delivered.generatedMessage,
    providerEvent: {
      id: makeId("RPE"),
      runtimeSessionId: input.session.id,
      provider: delivered.providerResult.provider,
      model: delivered.providerResult.model ?? "unknown",
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      latencyMs: delivered.providerResult.latencyMs,
      inputSummary: delivered.contract.contractHash,
      outputText: delivered.generatedMessage.content,
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
      finalText: delivered.generatedMessage.content,
      fallbackRequired: delivered.validator.fallbackRequired,
      createdAt: new Date().toISOString(),
    },
    trace: createRuntimeExecutionTrace({
      runtimeSessionId: input.session.id,
      releaseId: input.release.id,
      nodeId: input.node.id,
      promptItemId: input.promptItem.id,
      roleId: delivered.contract.roleId,
      provider: delivered.providerResult.provider,
      model: delivered.providerResult.model,
      contractHash: delivered.contract.contractHash,
      validation: delivered.validator,
      fallbackUsed: delivered.fallbackUsed,
      transitionDecision: reduction.transitionDecision,
      stateChanges: {
        activeNodeId: reduction.state.activeNodeId,
        activePromptItemId: reduction.state.activePromptItemId,
        completedPromptItemIds: reduction.state.completedPromptItemIds,
      },
    }),
    sessionPatch: {
      runtimeContext: input.session.runtimeContext,
      currentNodeId: reduction.state.activeNodeId,
      currentPromptItemId: reduction.state.activePromptItemId,
      completedPromptItemIds: reduction.state.completedPromptItemIds,
      skippedPromptItemIds: mergePromptItemIds(input.session.skippedPromptItemIds, reduction.skippedPromptItemIds),
      runtimeState: reduction.state,
      promptProgressionReason: reduction.transitionDecision === "next_node" ? "node_completed" : reduction.transitionDecision === "next_prompt" ? "prompt_completed" : "prompt_delivered",
      status: reduction.transitionDecision === "waiting_for_input" ? "waiting_for_input" : "active",
    },
  });
  return delivered;
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
  const nextStatus: RuntimeSessionStatus = view.session.status === "safety_paused" || view.session.status === "escalated" ? "terminated" : "terminated";
  await updateRuntimeSessionRecord(sessionId, { status: nextStatus, terminatedAt: new Date().toISOString() });
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
      const alreadyDelivered = view.messages.some((message) => message.promptItemId === promptItem.id && message.role === "assistant");
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

export async function submitPatientInput(sessionId: string, patientInput: PatientInput): Promise<RuntimeCycleResult> {
  await cleanupExpiredTriggerSuppressions();
  const view = await getRuntimeSession(sessionId);
  if (!view) throw new Error("Runtime session not found");
  const session = view.session;
  if (session.status === "completed") throw new Error("Completed session does not accept input");
  if (session.status === "processing") throw new Error("Session is already processing input");
  if (session.status !== "waiting_for_input") throw new Error("Session is not waiting for input");
  const runtimeRelease = loadRuntimeRelease(view.release);
  const runtimeState = normalizeRuntimeSessionState(session, runtimeRelease);
  const activeStep = resolveActiveRuntimeStep(runtimeRelease, runtimeState);
  if (!activeStep) throw new Error("Runtime session has no active deterministic step.");
  const currentNode = view.nodes.find((node) => node.id === activeStep.node.id);
  if (!currentNode) throw new Error("Current node is missing");
  const currentPromptItem = view.promptItems.find((promptItem) => promptItem.id === activeStep.promptItem.sourcePromptItemId);
  if (!currentPromptItem) throw new Error("Current source PromptItem is missing");
  if (!activeStep.promptItem.requiresPatientInput) throw new Error("Current PromptItem does not accept patient input");
  const skippedPromptItemIds = mergePromptItemIds(session.skippedPromptItemIds, activeStep.skippedPromptItemIds);
  await updateRuntimeSessionRecord(sessionId, { status: "processing", currentPromptItemId: currentPromptItem.id, skippedPromptItemIds });
  const executionSequence = session.executionLogIds.length + 1;
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
    metadata: { inputKind: patientInput.kind, promptItemId: currentPromptItem.id },
  };
  await saveRuntimeMessage(patientMessage);
  await saveRuntimeLog(makeLog(sessionId, "input", "completed", "Patient input received", { nodeId: currentNode.id, input: { kind: patientInput.kind } }));
  const extracted = await extractRuntimeState({ patientInput, currentNode, currentPromptItem, currentContext: session.runtimeContext, locale: session.locale });
  await saveRuntimeLog(makeLog(sessionId, "state_extraction", "completed", "State extracted", { nodeId: currentNode.id, output: extracted as unknown as Record<string, unknown> }));
  if (extracted.missingFields.length) {
    await updateRuntimeSessionRecord(sessionId, { status: "waiting_for_input", currentPromptItemId: currentPromptItem.id, skippedPromptItemIds });
    await saveRuntimeLog(makeLog(sessionId, "error", "skipped", "Input validation failed", { nodeId: currentNode.id, output: { missingFields: extracted.missingFields } }));
    await createRuntimeCheckpoint(sessionId);
    return {
      sessionId,
      previousNodeId: session.previousNodeId,
      currentNodeId: currentNode.id,
      currentPromptItemId: currentPromptItem.id,
      stateExtraction: extracted,
      safetyResult: { triggered: false, ruleIds: [], action: "continue", escalationRequired: false },
      fallbackUsed: false,
      sessionStatus: "waiting_for_input",
      logIds: [],
    };
  }
  const nextContext = { ...mergeExtractedRuntimeContext(session.runtimeContext, extracted), lastPatientMessage: patientMessage.content };
  await updateRuntimeSessionRecord(sessionId, { runtimeContext: nextContext });
  const safetyResult = await runSafetyOrchestrator({ currentNode, extractedState: extracted, runtimeContext: nextContext });
  await saveRuntimeLog(makeLog(sessionId, "safety_check", "completed", safetyResult.triggered ? `Safety triggered: ${safetyResult.action}` : "Safety check passed", { nodeId: currentNode.id, output: safetyResult as unknown as Record<string, unknown> }));
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
    let fixedResponseMessageId: string | undefined;
    if (safetyResult.fixedResponse) {
      const fixedMessage = {
        id: makeId("RMSG"),
        runtimeSessionId: sessionId,
        role: "system",
        content: safetyResult.fixedResponse,
        status: "delivered",
        nodeId: currentNode.id,
        promptItemId: currentPromptItem.id,
        createdAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        metadata: { patientVisible: true },
      } satisfies RuntimeMessage;
      await saveRuntimeMessage(fixedMessage);
      fixedResponseMessageId = fixedMessage.id;
    }
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
        fixedResponseMessageId,
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
        fallbackUsed: false,
        sessionStatus: "escalated",
        logIds: [],
      };
    }
    await updateRuntimeSessionRecord(sessionId, { status: "safety_paused" });
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
      fallbackUsed: false,
      sessionStatus: "safety_paused",
      logIds: [],
    };
  }
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
  };
}
