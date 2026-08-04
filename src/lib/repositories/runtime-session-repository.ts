import { getLocalDb } from "@/lib/db/tbct-local-db";
import type {
  ClinicianEscalationEvent,
  RuntimeCheckpoint,
  RuntimeMessage,
  RuntimeProviderEvent,
  RuntimeSession,
  RuntimeValidationEvent,
  SessionExecutionLog,
} from "@/types/runtime-session";

export async function createRuntimeSessionRecord(session: RuntimeSession) {
  await getLocalDb().runtimeSessions.put(session);
  return session;
}

export async function updateRuntimeSessionRecord(sessionId: string, patch: Partial<RuntimeSession>) {
  const db = getLocalDb();
  const current = await db.runtimeSessions.get(sessionId);
  if (!current) throw new Error("Runtime session not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.runtimeSessions.put(next);
  return next;
}

export async function getRuntimeSessionRecord(sessionId: string) {
  return getLocalDb().runtimeSessions.get(sessionId);
}

export async function listRuntimeSessionRecords() {
  return getLocalDb().runtimeSessions.orderBy("updatedAt").reverse().toArray();
}

export async function saveRuntimeMessage(message: RuntimeMessage) {
  const db = getLocalDb();
  await db.runtimeMessages.put(message);
  const session = await db.runtimeSessions.get(message.runtimeSessionId);
  if (session) {
    await db.runtimeSessions.put({
      ...session,
      messageIds: [...new Set([...session.messageIds, message.id])],
      updatedAt: new Date().toISOString(),
      runtimeContext: {
        ...session.runtimeContext,
        lastPatientMessage: message.role === "patient" ? message.content : session.runtimeContext.lastPatientMessage,
        lastAssistantMessage: message.role === "assistant" ? message.content : session.runtimeContext.lastAssistantMessage,
      },
    });
  }
  return message;
}

export async function listRuntimeMessages(runtimeSessionId: string) {
  return getLocalDb().runtimeMessages.where("runtimeSessionId").equals(runtimeSessionId).sortBy("createdAt");
}

export async function saveRuntimeLog(log: SessionExecutionLog) {
  const db = getLocalDb();
  await db.runtimeSessionLogs.put(log);
  const session = await db.runtimeSessions.get(log.runtimeSessionId);
  if (session) {
    await db.runtimeSessions.put({ ...session, executionLogIds: [...new Set([...session.executionLogIds, log.id])], updatedAt: new Date().toISOString() });
  }
  return log;
}

export async function listRuntimeLogs(runtimeSessionId: string) {
  return getLocalDb().runtimeSessionLogs.where("runtimeSessionId").equals(runtimeSessionId).sortBy("timestamp");
}

export async function saveRuntimeCheckpoint(checkpoint: RuntimeCheckpoint) {
  await getLocalDb().runtimeCheckpoints.put(checkpoint);
  return checkpoint;
}

export async function getLatestRuntimeCheckpoint(runtimeSessionId: string) {
  return getLocalDb().runtimeCheckpoints.where("runtimeSessionId").equals(runtimeSessionId).last();
}

export async function listRuntimeCheckpoints(runtimeSessionId: string) {
  return getLocalDb().runtimeCheckpoints.where("runtimeSessionId").equals(runtimeSessionId).sortBy("sequence");
}

export async function saveRuntimeEscalation(event: ClinicianEscalationEvent) {
  const db = getLocalDb();
  await db.runtimeEscalations.put(event);
  const session = await db.runtimeSessions.get(event.runtimeSessionId);
  if (session) {
    await db.runtimeSessions.put({ ...session, escalationIds: [...new Set([...session.escalationIds, event.id])], updatedAt: new Date().toISOString() });
  }
  return event;
}

export async function updateRuntimeEscalation(escalationId: string, patch: Partial<ClinicianEscalationEvent>) {
  const db = getLocalDb();
  const current = await db.runtimeEscalations.get(escalationId);
  if (!current) throw new Error("Escalation event not found");
  const next = { ...current, ...patch };
  await db.runtimeEscalations.put(next);
  return next;
}

export async function listRuntimeEscalations() {
  return getLocalDb().runtimeEscalations.orderBy("createdAt").reverse().toArray();
}

export async function listRuntimeEscalationsBySession(runtimeSessionId: string) {
  return getLocalDb().runtimeEscalations.where("runtimeSessionId").equals(runtimeSessionId).sortBy("createdAt");
}

export async function saveRuntimeProviderEvent(event: RuntimeProviderEvent) {
  await getLocalDb().runtimeProviderEvents.put(event);
}

export async function listRuntimeProviderEvents(runtimeSessionId: string) {
  return getLocalDb().runtimeProviderEvents.where("runtimeSessionId").equals(runtimeSessionId).sortBy("createdAt");
}

export async function saveRuntimeValidationEvent(event: RuntimeValidationEvent) {
  await getLocalDb().runtimeValidationEvents.put(event);
}

export async function listRuntimeValidationEvents(runtimeSessionId: string) {
  return getLocalDb().runtimeValidationEvents.where("runtimeSessionId").equals(runtimeSessionId).sortBy("createdAt");
}
