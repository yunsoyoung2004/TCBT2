import { getProtocolRelease, getProtocolReleases } from "@/lib/repositories/protocol-repository";
import {
  CANONICAL_PROTOCOL_ID,
  CANONICAL_PROMPT_ITEMS,
  CANONICAL_SESSION_COMMON_RULES,
  CANONICAL_SESSION_DEFINITIONS,
  CANONICAL_SESSION_PLAN,
  CANONICAL_SOURCE_EDGES,
  CANONICAL_SOURCE_VERSION,
  CANONICAL_STAGE_NODES,
  resolveCanonicalSessionId,
} from "@/lib/protocol/source-fidelity-catalog";
import { TBCT_SOURCE_TEXT_HASH } from "@/lib/protocol/tbct-source-text.generated";
import { isCanonicalProtocolId } from "@/lib/protocol/source-fidelity-protocol-adapter";
import { resolveCurrentReleasePrompt } from "@/lib/runtime/source-fidelity-prompt-progression";
import {
  createRuntimeSessionRecord,
  getLatestRuntimeCheckpoint,
  getRuntimeSessionRecord,
  listRuntimeCheckpoints,
  listRuntimeEscalationsBySession,
  listRuntimeLogs,
  listRuntimeMessages,
  listRuntimeProviderEvents,
  listRuntimeSessionRecords,
  listRuntimeValidationEvents,
  saveRuntimeCheckpoint,
  updateRuntimeSessionRecord,
} from "@/lib/repositories/runtime-session-repository";
import { attachSessionToParticipant, getOrCreateDemoParticipant, getRuntimeParticipant } from "@/lib/api/participant-api";
import { listMemoryRetrievalRuns, listMemoryUsageLogs } from "@/lib/repositories/longitudinal-memory-repository";
import { getPilotParticipantByRuntimeParticipantId, getPilotStudyArm, listProtocolAssignments } from "@/lib/repositories/pilot-repository";
import { assertRuntimeTransition } from "@/lib/runtime/runtime-state-machine";
import type { RuntimeCheckpoint, RuntimeContext, RuntimeSession, RuntimeSessionView } from "@/types/runtime-session";
import type { ProtocolGraphEdge, ProtocolGraphNode, ProtocolReleaseVersion } from "@/types/protocol-runtime";

function makeId(prefix: string) {
  const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (typeof webCrypto?.randomUUID === "function") {
    return `${prefix}-${webCrypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyContext(): RuntimeContext {
  return { fields: {}, riskSignals: [], iterationCounts: {}, activityCompletion: "not_started", homeworkStatus: "not_assigned", riskLevel: "low" };
}

function createCanonicalDemoRelease(): ProtocolReleaseVersion {
  const now = new Date().toISOString();
  return {
    id: "demo-release",
    protocolId: CANONICAL_PROTOCOL_ID,
    version: CANONICAL_SOURCE_VERSION,
    releasePackageId: "demo-release-package",
    publishedAt: now,
    publishedBy: "TBCT demo",
    changeSummary: "Canonical TBCT runtime release",
    immutableSnapshot: {
      // The legacy snapshot fields remain for editor compatibility. Runtime uses
      // the fully typed source-fidelity arrays below.
      nodes: CANONICAL_STAGE_NODES as unknown as ProtocolGraphNode[],
      edges: CANONICAL_SOURCE_EDGES as unknown as ProtocolGraphEdge[],
      sourceFidelity: {
        canonicalProtocolId: CANONICAL_PROTOCOL_ID,
        sourceVersion: CANONICAL_SOURCE_VERSION,
        sourceTextHash: TBCT_SOURCE_TEXT_HASH,
        sessionDefinitions: CANONICAL_SESSION_DEFINITIONS,
        sessionPlan: CANONICAL_SESSION_PLAN,
        sessionCommonRules: CANONICAL_SESSION_COMMON_RULES,
        clinicalStageNodes: CANONICAL_STAGE_NODES,
        promptItems: CANONICAL_PROMPT_ITEMS,
        sourceFidelityEdges: CANONICAL_SOURCE_EDGES,
      },
    },
  };
}

function hasCanonicalRuntimeSnapshot(release?: ProtocolReleaseVersion | null) {
  const snapshot = release?.immutableSnapshot.sourceFidelity;
  return snapshot?.canonicalProtocolId === CANONICAL_PROTOCOL_ID
    && Array.isArray(snapshot.clinicalStageNodes)
    && Array.isArray(snapshot.promptItems)
    && Array.isArray(snapshot.sourceFidelityEdges);
}

export async function createRuntimeSession(input: {
  projectId: string;
  protocolId: string;
  releaseId: string;
  sessionDefinitionId: string;
  participantId?: string;
  patientAlias: string;
  locale: string;
}): Promise<RuntimeSession> {
  const now = new Date().toISOString();
  const sessionId = makeId("RTS");
  const definition = CANONICAL_SESSION_DEFINITIONS.find((item) => item.id === input.sessionDefinitionId) ?? CANONICAL_SESSION_DEFINITIONS[0];
  const entryNode = CANONICAL_STAGE_NODES.find((node) => node.id === definition?.startNodeId)
    ?? CANONICAL_STAGE_NODES.find((node) => node.sessionId === definition?.id && node.type === "session_start")
    ?? CANONICAL_STAGE_NODES.find((node) => node.sessionId === definition?.id);
  const firstPrompt = CANONICAL_PROMPT_ITEMS.find((promptItem) => promptItem.nodeId === entryNode?.id);

  const session: RuntimeSession = {
    id: sessionId,
    projectId: input.projectId,
    protocolId: CANONICAL_PROTOCOL_ID,
    protocolVersion: CANONICAL_SOURCE_VERSION,
    releaseId: "demo-release",
    sessionDefinitionId: definition?.id ?? "tbct-s01",
    participantId: input.participantId ?? "demo-participant",
    status: "created",
    currentSessionId: definition?.id ?? "tbct-s01",
    currentNodeId: entryNode?.id,
    currentPromptItemId: firstPrompt?.id,
    completedPromptItemIds: [],
    skippedPromptItemIds: [],
    promptProgressionReason: "session_started",
    sourceVersion: CANONICAL_SOURCE_VERSION,
    sourceTextHash: TBCT_SOURCE_TEXT_HASH,
    patientAlias: input.patientAlias,
    locale: input.locale,
    runtimeContext: emptyContext(),
    messageIds: [],
    executionLogIds: [],
    escalationIds: [],
    createdAt: now,
    updatedAt: now,
  };
  
  // Store in memory/DB without validation
  try {
    await createRuntimeSessionRecord(session);
  } catch (e) {
    console.warn("Failed to store session, continuing anyway", e);
  }
  
  return session;
}

export async function getRuntimeSession(sessionId: string): Promise<RuntimeSessionView | null> {
  const session = await getRuntimeSessionRecord(sessionId);
  if (!session) return null;
  const storedRelease = await getProtocolRelease(session.releaseId);
  const release: ProtocolReleaseVersion = hasCanonicalRuntimeSnapshot(storedRelease) && storedRelease
    ? storedRelease
    : createCanonicalDemoRelease();
  
  const [messages, logs, checkpoints, escalations, providerEvents, validationEvents, participant, memoryRetrievalRuns, memoryUsageLogs] = await Promise.all([
    listRuntimeMessages(sessionId),
    listRuntimeLogs(sessionId),
    listRuntimeCheckpoints(sessionId),
    listRuntimeEscalationsBySession(sessionId),
    listRuntimeProviderEvents(sessionId),
    listRuntimeValidationEvents(sessionId),
    getRuntimeParticipant(session.participantId).catch(() => null),
    listMemoryRetrievalRuns(sessionId).catch(() => []),
    listMemoryUsageLogs(sessionId).catch(() => []),
  ]);
  const sourceFidelity = release.immutableSnapshot.sourceFidelity!;
  
  return {
    session,
    release,
    participant: participant ?? undefined,
    nodes: sourceFidelity.clinicalStageNodes,
    edges: sourceFidelity.sourceFidelityEdges,
    promptItems: sourceFidelity.promptItems,
    currentPromptItem: sourceFidelity.promptItems.find((promptItem) => promptItem.id === session.currentPromptItemId),
    messages,
    logs,
    checkpoints,
    escalations,
    providerEvents,
    validationEvents,
    memoryRetrievalRuns,
    memoryUsageLogs,
  } satisfies RuntimeSessionView;
}

export async function listRuntimeSessions() {
  return listRuntimeSessionRecords();
}

export async function setRuntimeSessionStatus(sessionId: string, nextStatus: RuntimeSession["status"], patch: Partial<RuntimeSession> = {}) {
  const session = await getRuntimeSessionRecord(sessionId);
  if (!session) throw new Error("Runtime session not found");
  assertRuntimeTransition(session.status, nextStatus);
  return updateRuntimeSessionRecord(sessionId, { ...patch, status: nextStatus });
}

export async function createRuntimeCheckpoint(sessionId: string) {
  const session = await getRuntimeSessionRecord(sessionId);
  if (!session) throw new Error("Runtime session not found");
  const previous = await getLatestRuntimeCheckpoint(sessionId);
  const checkpoint: RuntimeCheckpoint = {
    id: makeId("RCP"),
    runtimeSessionId: sessionId,
    sequence: (previous?.sequence ?? 0) + 1,
    currentNodeId: session.currentNodeId,
    currentPromptItemId: session.currentPromptItemId,
    completedPromptItemIds: [...(session.completedPromptItemIds ?? [])],
    skippedPromptItemIds: [...(session.skippedPromptItemIds ?? [])],
    sourceVersion: session.sourceVersion,
    sourceTextHash: session.sourceTextHash,
    sessionStatus: session.status,
    runtimeContext: session.runtimeContext,
    messageIds: session.messageIds,
    executionLogIds: session.executionLogIds,
    createdAt: new Date().toISOString(),
  };
  await saveRuntimeCheckpoint(checkpoint);
  return checkpoint;
}

export async function restoreRuntimeSession(sessionId: string) {
  const session = await getRuntimeSessionRecord(sessionId);
  const checkpoint = await getLatestRuntimeCheckpoint(sessionId);
  if (!session || !checkpoint) throw new Error("Runtime checkpoint not found");
  const nextStatus = session.status === "processing" ? "paused" : checkpoint.sessionStatus;
  return updateRuntimeSessionRecord(sessionId, {
    currentNodeId: checkpoint.currentNodeId,
    currentPromptItemId: checkpoint.currentPromptItemId,
    completedPromptItemIds: checkpoint.completedPromptItemIds,
    skippedPromptItemIds: checkpoint.skippedPromptItemIds,
    sourceVersion: checkpoint.sourceVersion,
    sourceTextHash: checkpoint.sourceTextHash,
    runtimeContext: checkpoint.runtimeContext,
    messageIds: checkpoint.messageIds,
    executionLogIds: checkpoint.executionLogIds,
    status: nextStatus,
  });
}

export async function getDefaultPublishedRelease(protocolId = "TBCT-BR-001") {
  const activeProtocolId = isCanonicalProtocolId(protocolId) ? CANONICAL_PROTOCOL_ID : protocolId;
  const releases = await getProtocolReleases(activeProtocolId);
  return releases.find((release) => release.immutableSnapshot.sourceFidelity?.canonicalProtocolId === CANONICAL_PROTOCOL_ID) ?? null;
}
