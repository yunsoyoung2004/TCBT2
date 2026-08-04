import { getLocalDb } from "@/lib/db/tbct-local-db";
import type { RuntimeParticipant, ParticipantConsentEvent, LongitudinalRecord } from "@/types/longitudinal-memory";

export async function listParticipants() {
  return getLocalDb().runtimeParticipants.orderBy("updatedAt").reverse().toArray();
}

export async function getParticipant(participantId: string) {
  return getLocalDb().runtimeParticipants.get(participantId);
}

export async function saveParticipant(participant: RuntimeParticipant) {
  await getLocalDb().runtimeParticipants.put(participant);
  return participant;
}

export async function updateParticipant(participantId: string, patch: Partial<RuntimeParticipant>) {
  const db = getLocalDb();
  const current = await db.runtimeParticipants.get(participantId);
  if (!current) throw new Error("Participant not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.runtimeParticipants.put(next);
  return next;
}

export async function appendParticipantSession(participantId: string, runtimeSessionId: string) {
  const participant = await getParticipant(participantId);
  if (!participant) throw new Error("Participant not found");
  return updateParticipant(participantId, {
    runtimeSessionIds: [...new Set([...participant.runtimeSessionIds, runtimeSessionId])],
  });
}

export async function getLongitudinalRecord(participantId: string) {
  return getLocalDb().longitudinalRecords.where("participantId").equals(participantId).first();
}

export async function saveLongitudinalRecord(record: LongitudinalRecord) {
  await getLocalDb().longitudinalRecords.put(record);
  return record;
}

export async function saveParticipantConsentEvent(event: ParticipantConsentEvent) {
  await getLocalDb().participantConsentEvents.put(event);
  return event;
}

export async function listParticipantConsentEvents(participantId: string) {
  return getLocalDb().participantConsentEvents.where("participantId").equals(participantId).sortBy("effectiveAt");
}
