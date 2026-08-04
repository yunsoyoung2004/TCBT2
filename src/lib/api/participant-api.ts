import { appendParticipantSession, getLongitudinalRecord, getParticipant, listParticipantConsentEvents, listParticipants, saveLongitudinalRecord, saveParticipant, saveParticipantConsentEvent, updateParticipant } from "@/lib/repositories/participant-repository";
import { createMemoryAuditEntry } from "@/lib/memory/memory-helpers";
import { getLocalDb } from "@/lib/db/tbct-local-db";
import type { ParticipantConsentEvent, RuntimeParticipant } from "@/types/longitudinal-memory";

function makeId(prefix: string) {
  const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (typeof webCrypto?.randomUUID === "function") {
    return `${prefix}-${webCrypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function listRuntimeParticipants() {
  return listParticipants();
}

export async function getRuntimeParticipant(participantId: string) {
  return getParticipant(participantId);
}

export async function getOrCreateDemoParticipant() {
  const existing = await getParticipant("PARTICIPANT-BR-01");
  if (existing) return existing;
  const now = new Date().toISOString();
  const participant: RuntimeParticipant = {
    id: "PARTICIPANT-BR-01",
    projectId: "TBCT-BR-001",
    alias: "TBCT-DEMO-001",
    locale: "pt-BR",
    country: "BR",
    status: "active",
    runtimeSessionIds: [],
    longitudinalRecordId: "LREC-DEMO-BR-001",
    consent: {
      memoryStorageAllowed: true,
      crossSessionUseAllowed: true,
      sensitiveMemoryAllowed: false,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
  await saveParticipant(participant);
  await saveLongitudinalRecord({
    id: "LREC-DEMO-BR-001",
    participantId: participant.id,
    projectId: participant.projectId,
    activeMemoryIds: [],
    createdAt: now,
    updatedAt: now,
  });
  return participant;
}

export async function attachSessionToParticipant(participantId: string, runtimeSessionId: string) {
  await appendParticipantSession(participantId, runtimeSessionId);
}

export async function updateParticipantConsent(
  participantId: string,
  patch: Pick<ParticipantConsentEvent, "memoryStorageAllowed" | "crossSessionUseAllowed" | "sensitiveMemoryAllowed"> & { reason?: string },
) {
  const participant = await getParticipant(participantId);
  if (!participant) throw new Error("Participant not found");
  const event: ParticipantConsentEvent = {
    id: makeId("CONS"),
    participantId,
    ...patch,
    effectiveAt: new Date().toISOString(),
  };
  const next = await updateParticipant(participantId, {
    consent: {
      memoryStorageAllowed: patch.memoryStorageAllowed,
      crossSessionUseAllowed: patch.crossSessionUseAllowed,
      sensitiveMemoryAllowed: patch.sensitiveMemoryAllowed,
      updatedAt: event.effectiveAt,
    },
  });
  await saveParticipantConsentEvent(event);
  await getLocalDb().auditEntries.put(
    createMemoryAuditEntry({
      action: "Participant consent updated",
      resource: `Participant ${participantId}`,
      version: "stage3",
      previousValue: JSON.stringify(participant.consent),
      newValue: JSON.stringify(next.consent),
      reason: patch.reason ?? "Consent changed",
    }),
  );
  return next;
}

export async function updateParticipantProfile(
  participantId: string,
  patch: Pick<RuntimeParticipant, "alias" | "locale" | "country" | "status">,
) {
  const participant = await getParticipant(participantId);
  if (!participant) throw new Error("Participant not found");
  const next = await updateParticipant(participantId, {
    alias: patch.alias,
    locale: patch.locale,
    country: patch.country,
    status: patch.status,
  });
  await getLocalDb().auditEntries.put(
    createMemoryAuditEntry({
      action: "Participant profile updated",
      resource: `Participant ${participantId}`,
      version: "stage3",
      previousValue: JSON.stringify({ alias: participant.alias, locale: participant.locale, country: participant.country, status: participant.status }),
      newValue: JSON.stringify({ alias: next.alias, locale: next.locale, country: next.country, status: next.status }),
      reason: "Patient profile fields updated",
    }),
  );
  return next;
}

export async function getParticipantConsentHistory(participantId: string) {
  return listParticipantConsentEvents(participantId);
}

export async function getParticipantRecord(participantId: string) {
  return getLongitudinalRecord(participantId);
}
