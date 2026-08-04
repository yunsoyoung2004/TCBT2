export type StudyStatus = "draft" | "setup" | "recruiting" | "active" | "paused" | "completed" | "archived";
export type StudyCountryCode = "BR" | "FR" | "KR";
export type StudyArmCode = "CLINICIAN_ONLY" | "AI_CLINICIAN" | "AI_LED_OVERSIGHT";
export type RuntimeMode = "clinician_delivered" | "ai_assisted_clinician" | "ai_led_with_oversight";

export interface PilotStudy {
  id: string;
  projectId: string;
  code: string;
  title: string;
  description: string;
  status: StudyStatus;
  targetSampleSize: number;
  targetPerArm: number;
  countries: StudyCountryCode[];
  armIds: string[];
  siteIds: string[];
  protocolFamilyId: string;
  protocolReleaseIds: string[];
  screeningFormVersion: string;
  consentFormVersion: string;
  outcomeScheduleVersion: string;
  feasibilityObjectives: string[];
  safetyObjectives: string[];
  acceptabilityObjectives: string[];
  operationalObjectives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PilotStudyArm {
  id: string;
  studyId: string;
  code: StudyArmCode;
  name: string;
  shortLabel: string;
  description: string;
  targetSampleSize: number;
  clinicianRequired: boolean;
  aiRuntimeEnabled: boolean;
  aiLeadMode: boolean;
  humanSafetyOversightRequired: boolean;
  protocolReleaseIdsByCountry: Partial<Record<StudyCountryCode, string>>;
  allowedRuntimeModes: RuntimeMode[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PilotSite {
  id: string;
  studyId: string;
  countryCode: StudyCountryCode;
  name: string;
  locale: string;
  timezone: string;
  status: "setup" | "ready" | "recruiting" | "paused" | "closed";
  supportedProtocolReleaseIds: string[];
  supportedConsentVersions: string[];
  supportedAssessmentLanguages: string[];
  siteCoordinatorIds: string[];
  clinicianIds: string[];
  safetyReviewerIds: string[];
  recruitmentTarget: number;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
}

export type StudyParticipantStatus =
  | "candidate"
  | "screening"
  | "screen_failed"
  | "eligible"
  | "consent_pending"
  | "consented"
  | "enrolled"
  | "allocated"
  | "active"
  | "temporarily_paused"
  | "completed"
  | "withdrawn"
  | "lost_to_follow_up"
  | "terminated"
  | "archived";

export interface PilotStudyParticipant {
  id: string;
  studyId: string;
  runtimeParticipantId: string;
  siteId: string;
  countryCode: StudyCountryCode;
  studyParticipantCode: string;
  alias: string;
  status: StudyParticipantStatus;
  screeningRecordId?: string;
  eligibilityDecisionId?: string;
  consentRecordIds: string[];
  currentConsentRecordId?: string;
  enrollmentId?: string;
  allocationId?: string;
  studyArmId?: string;
  assignedClinicianIds: string[];
  assignedSafetyReviewerIds: string[];
  expectedSessionCount: number;
  completedSessionCount: number;
  sessionScheduleIds: string[];
  assessmentInstanceIds: string[];
  deviationIds: string[];
  enrolledAt?: string;
  allocatedAt?: string;
  completedAt?: string;
  withdrawnAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningCriterionResult {
  criterionId: string;
  label: string;
  category: "inclusion" | "exclusion" | "operational";
  result: "met" | "not_met" | "unknown" | "not_applicable";
  note?: string;
}

export interface ParticipantScreeningRecord {
  id: string;
  studyId: string;
  studyParticipantId: string;
  screeningVersion: string;
  results: ScreeningCriterionResult[];
  status: "draft" | "complete" | "review_required" | "invalidated";
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EligibilityDecision {
  id: string;
  studyParticipantId: string;
  screeningRecordId: string;
  decision: "eligible" | "not_eligible" | "pending_review";
  reasonCodes: string[];
  note?: string;
  decidedBy: string;
  decidedAt: string;
  overridden: boolean;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
}

export interface EligibilityOverrideRecord {
  id: string;
  studyParticipantId: string;
  eligibilityDecisionId: string;
  previousDecision: "eligible" | "not_eligible" | "pending_review";
  newDecision: "eligible" | "not_eligible" | "pending_review";
  reason: string;
  actorId: string;
  actorRole: "research_coordinator" | "clinician" | "supervisor" | "safety_reviewer" | "research_analyst";
  impactReviewRequired: boolean;
  linkedDeviationId?: string;
  linkedDataQualityIssueIds: string[];
  createdAt: string;
}

export type ConsentStatus = "draft" | "presented" | "accepted" | "declined" | "withdrawn" | "superseded" | "expired";

export interface StudyConsentRecord {
  id: string;
  studyId: string;
  studyParticipantId: string;
  consentVersion: string;
  locale: string;
  status: ConsentStatus;
  studyParticipationAllowed: boolean;
  treatmentDataCollectionAllowed: boolean;
  researchDataUseAllowed: boolean;
  crossSessionMemoryAllowed: boolean;
  sensitiveMemoryAllowed: boolean;
  deidentifiedExportAllowed: boolean;
  presentedAt?: string;
  respondedAt?: string;
  withdrawnAt?: string;
  recordedBy?: string;
  withdrawalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentWithdrawalRecord {
  id: string;
  studyParticipantId: string;
  consentRecordId: string;
  effectiveAt: string;
  reason?: string;
  stopNewSessions: boolean;
  stopCrossSessionMemoryUse: boolean;
  stopNewResearchExport: boolean;
  dataDisposition: "retain_existing_deidentified" | "exclude_from_future_analysis" | "review_required";
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface StudyEnrollment {
  id: string;
  studyId: string;
  studyParticipantId: string;
  siteId: string;
  eligibilityDecisionId: string;
  consentRecordId: string;
  status: "pending" | "enrolled" | "cancelled";
  enrolledBy?: string;
  enrolledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyArmAllocation {
  id: string;
  studyId: string;
  studyParticipantId: string;
  siteId: string;
  countryCode: StudyCountryCode;
  studyArmId: string;
  method: "demo_blocked_allocation" | "manual_override";
  blockKey?: string;
  allocationSequence?: number;
  status: "assigned" | "overridden" | "cancelled";
  allocatedBy: string;
  allocatedAt: string;
  overrideReason?: string;
  supersededAllocationId?: string;
}

export interface AllocationOverrideRecord {
  id: string;
  studyParticipantId: string;
  previousAllocationId: string;
  previousStudyArmId: string;
  newAllocationId: string;
  newStudyArmId: string;
  reason: string;
  actorId: string;
  actorRole: "research_coordinator" | "clinician" | "supervisor" | "safety_reviewer" | "research_analyst";
  linkedDeviationId?: string;
  createdAt: string;
}

export interface ParticipantProtocolAssignment {
  id: string;
  studyParticipantId: string;
  studyArmId: string;
  protocolReleaseId: string;
  countryCode: StudyCountryCode;
  runtimeMode: RuntimeMode;
  assignedBy: string;
  assignedAt: string;
  active?: boolean;
  supersededById?: string;
  supersedesAssignmentId?: string;
}

export interface ProtocolAssignmentOverrideRecord {
  id: string;
  studyParticipantId: string;
  previousAssignmentId: string;
  newAssignmentId: string;
  previousProtocolReleaseId: string;
  newProtocolReleaseId: string;
  reason: string;
  actorId: string;
  actorRole: "research_coordinator" | "clinician" | "supervisor" | "safety_reviewer" | "research_analyst";
  createdAt: string;
}

export interface StudySessionSchedule {
  id: string;
  studyParticipantId: string;
  runtimeParticipantId: string;
  sessionDefinitionId: string;
  title: string;
  plannedAt: string;
  locale: string;
  status: "not_scheduled" | "scheduled" | "available" | "started" | "completed" | "completed_pending_review" | "missed" | "cancelled" | "blocked";
  runtimeSessionId?: string;
  clinicianId?: string;
  blockedReason?: string;
  previousPlannedAt?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClinicianDeliveredSession {
  id: string;
  studyParticipantId: string;
  sessionScheduleId: string;
  clinicianId: string;
  protocolReleaseId: string;
  checklistCompleted: boolean;
  completedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicianSessionReview {
  id: string;
  studyParticipantId: string;
  runtimeSessionId: string;
  studyArmId: string;
  assignedClinicianId: string;
  status: "pending" | "in_review" | "approved" | "changes_requested" | "waived";
  reviewedItems: {
    category: string;
    approved: boolean;
    note?: string;
  }[];
  summaryNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantAdherenceRecord {
  id: string;
  studyParticipantId: string;
  completedSessions: number;
  expectedSessions: number;
  completionRate: number;
  missedSessions: number;
  updatedAt: string;
}

export interface ProtocolDeviation {
  id: string;
  studyParticipantId: string;
  category: "allocation" | "session" | "safety" | "assessment" | "export";
  title: string;
  description: string;
  status: "open" | "assigned" | "in_review" | "resolved" | "closed";
  assignedTo?: string;
  correctiveAction?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutcomeAssessmentDefinition {
  id: string;
  studyId: string;
  code: string;
  title: string;
  scheduleWindow: "baseline" | "post_session" | "follow_up";
  locale: string;
  required: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OutcomeAssessmentSchedule {
  id: string;
  studyParticipantId: string;
  definitionId: string;
  label: string;
  dueAt: string;
  status: "pending" | "completed" | "missed" | "waived";
  linkedInstanceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutcomeAssessmentInstance {
  id: string;
  studyParticipantId: string;
  scheduleLabel: string;
  locale: string;
  status: "pending" | "completed" | "missed" | "waived";
  dueAt: string;
  completedAt?: string;
  summary?: string;
}

export interface ResearchDataQualityIssue {
  id: string;
  studyParticipantId?: string;
  category: "consent" | "allocation" | "session" | "assessment" | "export";
  severity: "critical" | "warning" | "info";
  title: string;
  status: "open" | "resolved";
  createdAt: string;
  updatedAt: string;
}

export interface ResearchSnapshotValidationRun {
  id: string;
  snapshotId: string;
  studyId: string;
  status: "passed" | "failed";
  criticalIssueCount: number;
  warningIssueCount: number;
  validatedBy: string;
  validatedAt: string;
  notes?: string;
}

export interface ResearchDataSnapshot {
  id: string;
  studyId: string;
  status: "draft" | "validated" | "locked";
  participantCount: number;
  includedParticipantIds?: string[];
  excludedParticipantIds?: string[];
  validationRunId?: string;
  lockedAt?: string;
  lockedBy?: string;
  datasetChecksum?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchExport {
  id: string;
  studyId: string;
  snapshotId: string;
  status: "ready" | "exported";
  format: "json" | "zip";
  manifestChecksum: string;
  packageChecksum?: string;
  filename?: string;
  includedParticipantCount?: number;
  excludedParticipantCount?: number;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface ResearchExportFile {
  id: string;
  exportId: string;
  filename: string;
  mediaType: "text/csv" | "application/json";
  rowCount?: number;
  byteLength: number;
  checksum: string;
  description: string;
  createdAt: string;
}

export interface PilotReport {
  id: string;
  studyId: string;
  title: string;
  reportType: "operations_summary" | "recruitment_enrollment" | "session_delivery" | "safety_operations" | "data_completeness" | "protocol_deviations" | "country_comparison" | "arm_comparison" | "export_readiness";
  status?: "draft" | "generated";
  generatedBy?: string;
  generatedAt?: string;
  snapshotId?: string;
  limitations?: string[];
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface SessionAvailabilityResult {
  allowed: boolean;
  blockers: {
    code: string;
    message: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    resolutionRoute?: string;
  }[];
  warnings: {
    code: string;
    message: string;
  }[];
  runtimeMode?: RuntimeMode;
  protocolAssignmentId?: string;
}
