import { getLocalDb } from "@/lib/db/tbct-local-db";
import type { GoalTrackingRecord, HomeworkTrackingRecord, LongitudinalMemory, MemoryCandidate, MemoryRetrievalResult, MemoryUsageLog } from "@/types/longitudinal-memory";

export async function listLongitudinalMemories(participantId: string) {
  return getLocalDb().longitudinalMemories.where("participantId").equals(participantId).sortBy("updatedAt");
}

export async function getLongitudinalMemory(memoryId: string) {
  return getLocalDb().longitudinalMemories.get(memoryId);
}

export async function saveLongitudinalMemory(memory: LongitudinalMemory) {
  await getLocalDb().longitudinalMemories.put(memory);
  return memory;
}

export async function updateLongitudinalMemory(memoryId: string, patch: Partial<LongitudinalMemory>) {
  const db = getLocalDb();
  const current = await db.longitudinalMemories.get(memoryId);
  if (!current) throw new Error("Memory not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.longitudinalMemories.put(next);
  return next;
}

export async function listMemoryCandidates(participantId?: string) {
  const table = getLocalDb().memoryCandidates;
  return participantId
    ? table.where("participantId").equals(participantId).sortBy("updatedAt")
    : table.orderBy("updatedAt").reverse().toArray();
}

export async function getMemoryCandidate(candidateId: string) {
  return getLocalDb().memoryCandidates.get(candidateId);
}

export async function saveMemoryCandidate(candidate: MemoryCandidate) {
  await getLocalDb().memoryCandidates.put(candidate);
  return candidate;
}

export async function updateMemoryCandidate(candidateId: string, patch: Partial<MemoryCandidate>) {
  const db = getLocalDb();
  const current = await db.memoryCandidates.get(candidateId);
  if (!current) throw new Error("Memory candidate not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.memoryCandidates.put(next);
  return next;
}

export async function saveMemoryRetrievalRun(run: MemoryRetrievalResult) {
  await getLocalDb().memoryRetrievalRuns.put(run);
  return run;
}

export async function listMemoryRetrievalRuns(runtimeSessionId: string) {
  return getLocalDb().memoryRetrievalRuns.where("runtimeSessionId").equals(runtimeSessionId).sortBy("createdAt");
}

export async function saveMemoryUsageLog(log: MemoryUsageLog) {
  await getLocalDb().memoryUsageLogs.put(log);
  return log;
}

export async function listMemoryUsageLogs(runtimeSessionId: string) {
  return getLocalDb().memoryUsageLogs.where("runtimeSessionId").equals(runtimeSessionId).sortBy("createdAt");
}

export async function listAllMemoryUsageLogs(participantId: string) {
  return getLocalDb().memoryUsageLogs.where("participantId").equals(participantId).sortBy("createdAt");
}

export async function listRetentionPolicies() {
  return getLocalDb().memoryRetentionPolicies.toArray();
}

export async function getRetentionPolicy(policyId: string) {
  return getLocalDb().memoryRetentionPolicies.get(policyId);
}

export async function listGoalTrackingRecords(participantId: string) {
  return getLocalDb().goalTrackingRecords.where("participantId").equals(participantId).sortBy("updatedAt");
}

export async function saveGoalTrackingRecord(record: GoalTrackingRecord) {
  await getLocalDb().goalTrackingRecords.put(record);
  return record;
}

export async function updateGoalTrackingRecord(recordId: string, patch: Partial<GoalTrackingRecord>) {
  const db = getLocalDb();
  const current = await db.goalTrackingRecords.get(recordId);
  if (!current) throw new Error("Goal tracking record not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.goalTrackingRecords.put(next);
  return next;
}

export async function listHomeworkTrackingRecords(participantId: string) {
  return getLocalDb().homeworkTrackingRecords.where("participantId").equals(participantId).sortBy("assignedAt");
}

export async function saveHomeworkTrackingRecord(record: HomeworkTrackingRecord) {
  await getLocalDb().homeworkTrackingRecords.put(record);
  return record;
}

export async function updateHomeworkTrackingRecord(recordId: string, patch: Partial<HomeworkTrackingRecord>) {
  const db = getLocalDb();
  const current = await db.homeworkTrackingRecords.get(recordId);
  if (!current) throw new Error("Homework tracking record not found");
  const next = { ...current, ...patch };
  await db.homeworkTrackingRecords.put(next);
  return next;
}
