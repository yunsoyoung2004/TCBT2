import { getLocalDb } from "@/lib/db/tbct-local-db";
import { createMemoryAuditEntry } from "@/lib/memory/memory-helpers";
import { retrieveSelectiveMemory } from "@/lib/memory/memory-retrieval-engine";
import {
  getLongitudinalMemory,
  getMemoryCandidate,
  listAllMemoryUsageLogs,
  listGoalTrackingRecords,
  listHomeworkTrackingRecords,
  listLongitudinalMemories,
  listMemoryCandidates,
  listMemoryRetrievalRuns,
  listMemoryUsageLogs,
  saveLongitudinalMemory,
  updateLongitudinalMemory,
} from "@/lib/repositories/longitudinal-memory-repository";
import { getParticipant } from "@/lib/repositories/participant-repository";
import type { LongitudinalMemory, MemoryRetrievalRequest } from "@/types/longitudinal-memory";

export async function getParticipantMemories(participantId: string) {
  return listLongitudinalMemories(participantId);
}

export async function getPendingMemoryCandidates(participantId?: string) {
  const candidates = await listMemoryCandidates(participantId);
  return candidates.filter((candidate) => ["candidate", "pending_review"].includes(candidate.status));
}

export async function approveMemoryCandidate(candidateId: string, approvedBy = "Clinician") {
  const candidate = await getMemoryCandidate(candidateId);
  if (!candidate) throw new Error("Memory candidate not found");
  const approved: LongitudinalMemory = {
    ...candidate,
    status: "approved",
    approvedBy,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveLongitudinalMemory(approved);
  await getLocalDb().memoryCandidates.delete(candidateId);
  await getLocalDb().auditEntries.put(
    createMemoryAuditEntry({
      action: "Memory approved",
      resource: `Memory ${candidateId}`,
      version: "stage3",
      previousValue: JSON.stringify(candidate),
      newValue: JSON.stringify(approved),
      reason: "Approved for longitudinal use",
    }),
  );
  return approved;
}

export async function rejectMemoryCandidate(candidateId: string, reason: string) {
  const candidate = await getMemoryCandidate(candidateId);
  if (!candidate) throw new Error("Memory candidate not found");
  await getLocalDb().memoryCandidates.put({ ...candidate, status: "rejected", rejectionReason: reason, updatedAt: new Date().toISOString() });
  await getLocalDb().auditEntries.put(
    createMemoryAuditEntry({
      action: "Memory rejected",
      resource: `Memory ${candidateId}`,
      version: "stage3",
      previousValue: JSON.stringify(candidate),
      newValue: JSON.stringify({ status: "rejected", reason }),
      reason,
    }),
  );
}

export async function supersedeMemory(memoryId: string, replacementMemoryId: string, reason: string) {
  const [current, replacement] = await Promise.all([getLongitudinalMemory(memoryId), getLongitudinalMemory(replacementMemoryId)]);
  if (!current || !replacement) throw new Error("Memory not found");
  await updateLongitudinalMemory(memoryId, { status: "superseded", supersededByMemoryId: replacementMemoryId });
  await updateLongitudinalMemory(replacementMemoryId, { supersedesMemoryId: memoryId });
  await getLocalDb().auditEntries.put(
    createMemoryAuditEntry({
      action: "Memory superseded",
      resource: `Memory ${memoryId}`,
      version: "stage3",
      previousValue: JSON.stringify(current),
      newValue: JSON.stringify(replacement),
      reason,
    }),
  );
}

export async function expireEligibleMemories() {
  const all = await getLocalDb().longitudinalMemories.toArray();
  const now = Date.now();
  const expired = all.filter((memory) => memory.validUntil && new Date(memory.validUntil).getTime() < now && memory.status === "approved");
  for (const memory of expired) {
    await updateLongitudinalMemory(memory.id, { status: "expired" });
  }
  return expired.length;
}

export async function revokeMemory(memoryId: string, reason: string) {
  return updateLongitudinalMemory(memoryId, { status: "revoked", rejectionReason: reason });
}

export async function deleteMemory(memoryId: string, reason: string) {
  return updateLongitudinalMemory(memoryId, { status: "deleted", rejectionReason: reason });
}

export async function runMemoryRetrieval(request: MemoryRetrievalRequest) {
  const participant = await getParticipant(request.participantId);
  if (!participant) throw new Error("Participant not found");
  if (!participant.consent.crossSessionUseAllowed) throw new Error("Cross-session retrieval is disabled for this participant");
  return retrieveSelectiveMemory(request);
}

export async function getRuntimeMemoryRuns(runtimeSessionId: string) {
  return listMemoryRetrievalRuns(runtimeSessionId);
}

export async function getRuntimeMemoryUsage(runtimeSessionId: string) {
  return listMemoryUsageLogs(runtimeSessionId);
}

export async function getParticipantLongitudinalDashboard(participantId: string) {
  const [participant, memories, homework, goals, usage] = await Promise.all([
    getParticipant(participantId),
    listLongitudinalMemories(participantId),
    listHomeworkTrackingRecords(participantId),
    listGoalTrackingRecords(participantId),
    listAllMemoryUsageLogs(participantId),
  ]);
  if (!participant) throw new Error("Participant not found");
  return { participant, memories, homework, goals, usage };
}
