import { getLocalDb } from "@/lib/db/tbct-local-db";
import type { ClinicianHandoffRecord, HumanInterventionRecord, RuntimeClinician, SafetyEvent, SafetyFollowUpTask, SafetyNotification, SafetyReport, SafetyStatusTransition, SafetyTriageRecord, SafetyTriggerSuppression, SessionResumeRequest } from "@/types/safety-operations";

export async function listSafetyEvents() {
  return getLocalDb().safetyEvents.orderBy("createdAt").reverse().toArray();
}

export async function getSafetyEvent(eventId: string) {
  return getLocalDb().safetyEvents.get(eventId);
}

export async function saveSafetyEvent(event: SafetyEvent) {
  await getLocalDb().safetyEvents.put(event);
  return event;
}

export async function updateSafetyEvent(eventId: string, patch: Partial<SafetyEvent>) {
  const db = getLocalDb();
  const current = await db.safetyEvents.get(eventId);
  if (!current) throw new Error("Safety event not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.safetyEvents.put(next);
  return next;
}

export async function saveSafetyTransition(transition: SafetyStatusTransition) {
  await getLocalDb().safetyStatusTransitions.put(transition);
  return transition;
}

export async function listSafetyTransitions(safetyEventId: string) {
  return getLocalDb().safetyStatusTransitions.where("safetyEventId").equals(safetyEventId).sortBy("createdAt");
}

export async function saveSafetyTriageRecord(record: SafetyTriageRecord) {
  await getLocalDb().safetyTriageRecords.put(record);
  return record;
}

export async function listSafetyTriageRecords(safetyEventId: string) {
  return getLocalDb().safetyTriageRecords.where("safetyEventId").equals(safetyEventId).sortBy("createdAt");
}

export async function saveInterventionRecord(record: HumanInterventionRecord) {
  await getLocalDb().humanInterventionRecords.put(record);
  return record;
}

export async function updateInterventionRecord(interventionId: string, patch: Partial<HumanInterventionRecord>) {
  const db = getLocalDb();
  const current = await db.humanInterventionRecords.get(interventionId);
  if (!current) throw new Error("Intervention record not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.humanInterventionRecords.put(next);
  return next;
}

export async function listInterventionRecords(safetyEventId: string) {
  return getLocalDb().humanInterventionRecords.where("safetyEventId").equals(safetyEventId).sortBy("createdAt");
}

export async function saveFollowUpTask(task: SafetyFollowUpTask) {
  await getLocalDb().safetyFollowUpTasks.put(task);
  return task;
}

export async function updateFollowUpTask(taskId: string, patch: Partial<SafetyFollowUpTask>) {
  const db = getLocalDb();
  const current = await db.safetyFollowUpTasks.get(taskId);
  if (!current) throw new Error("Follow-up task not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.safetyFollowUpTasks.put(next);
  return next;
}

export async function listFollowUpTasks() {
  return getLocalDb().safetyFollowUpTasks.orderBy("updatedAt").reverse().toArray();
}

export async function listClinicians() {
  return getLocalDb().runtimeClinicians.toArray();
}

export async function getClinician(clinicianId: string) {
  return getLocalDb().runtimeClinicians.get(clinicianId);
}

export async function updateClinician(clinicianId: string, patch: Partial<RuntimeClinician>) {
  const db = getLocalDb();
  const current = await db.runtimeClinicians.get(clinicianId);
  if (!current) throw new Error("Clinician not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.runtimeClinicians.put(next);
  return next;
}

export async function saveNotification(notification: SafetyNotification) {
  await getLocalDb().safetyNotifications.put(notification);
  return notification;
}

export async function updateNotification(notificationId: string, patch: Partial<SafetyNotification>) {
  const db = getLocalDb();
  const current = await db.safetyNotifications.get(notificationId);
  if (!current) throw new Error("Notification not found");
  const next = { ...current, ...patch };
  await db.safetyNotifications.put(next);
  return next;
}

export async function listNotifications() {
  return getLocalDb().safetyNotifications.orderBy("createdAt").reverse().toArray();
}

export async function saveSafetyReport(report: SafetyReport) {
  await getLocalDb().safetyReports.put(report);
  return report;
}

export async function getSafetyReport(reportId: string) {
  return getLocalDb().safetyReports.get(reportId);
}

export async function listSafetyReports() {
  return getLocalDb().safetyReports.orderBy("createdAt").reverse().toArray();
}

export async function saveClinicianHandoff(record: ClinicianHandoffRecord) {
  await getLocalDb().clinicianHandoffRecords.put(record);
  return record;
}

export async function updateClinicianHandoff(recordId: string, patch: Partial<ClinicianHandoffRecord>) {
  const db = getLocalDb();
  const current = await db.clinicianHandoffRecords.get(recordId);
  if (!current) throw new Error("Handoff not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.clinicianHandoffRecords.put(next);
  return next;
}

export async function listClinicianHandoffs(safetyEventId: string) {
  return getLocalDb().clinicianHandoffRecords.where("safetyEventId").equals(safetyEventId).sortBy("createdAt");
}

export async function listPendingClinicianHandoffs(clinicianId: string) {
  return getLocalDb().clinicianHandoffRecords.where("toClinicianId").equals(clinicianId).filter((item) => item.status === "pending").toArray();
}

export async function saveResumeRequest(request: SessionResumeRequest) {
  await getLocalDb().sessionResumeRequests.put(request);
  return request;
}

export async function updateResumeRequest(requestId: string, patch: Partial<SessionResumeRequest>) {
  const db = getLocalDb();
  const current = await db.sessionResumeRequests.get(requestId);
  if (!current) throw new Error("Resume request not found");
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.sessionResumeRequests.put(next);
  return next;
}

export async function listResumeRequests(safetyEventId: string) {
  return getLocalDb().sessionResumeRequests.where("safetyEventId").equals(safetyEventId).sortBy("createdAt");
}

export async function getPendingResumeRequest(safetyEventId: string) {
  return getLocalDb().sessionResumeRequests.where("safetyEventId").equals(safetyEventId).filter((item) => item.status === "pending").first();
}

export async function saveTriggerSuppression(record: SafetyTriggerSuppression) {
  await getLocalDb().safetyTriggerSuppressions.put(record);
  return record;
}

export async function findActiveTriggerSuppression(input: { runtimeSessionId: string; sourceNodeId?: string; safetyRuleId?: string; inputFingerprint?: string }) {
  const now = Date.now();
  return (
    (await getLocalDb().safetyTriggerSuppressions
      .where("runtimeSessionId")
      .equals(input.runtimeSessionId)
      .filter((item) => item.sourceNodeId === input.sourceNodeId && item.safetyRuleId === input.safetyRuleId && item.inputFingerprint === input.inputFingerprint && new Date(item.expiresAt).getTime() > now)
      .first()) ?? null
  );
}

export async function updateTriggerSuppression(recordId: string, patch: Partial<SafetyTriggerSuppression>) {
  const db = getLocalDb();
  const current = await db.safetyTriggerSuppressions.get(recordId);
  if (!current) throw new Error("Safety trigger suppression not found");
  const next = { ...current, ...patch };
  await db.safetyTriggerSuppressions.put(next);
  return next;
}

export async function cleanupExpiredTriggerSuppressions(referenceTime = new Date().toISOString()) {
  const db = getLocalDb();
  const expired = await db.safetyTriggerSuppressions.filter((item) => item.expiresAt < referenceTime).toArray();
  if (expired.length) {
    await db.safetyTriggerSuppressions.bulkDelete(expired.map((item) => item.id));
  }
  return expired.length;
}
