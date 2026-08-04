export type SafetyEventStatus =
  | "detected"
  | "queued"
  | "acknowledged"
  | "triaging"
  | "assigned"
  | "in_review"
  | "intervention_required"
  | "intervention_in_progress"
  | "monitoring"
  | "resolved"
  | "closed"
  | "false_positive"
  | "cancelled";

export type SafetySeverity = "low" | "medium" | "high";
export type SafetyUrgency = "routine" | "priority" | "urgent" | "immediate";
export type SafetyEventSource = "runtime_rule" | "patient_input" | "state_extractor" | "clinician_report" | "system_integrity" | "memory_follow_up";
export type PatientFacingSafetyStatus = "not_shown" | "session_check" | "session_paused" | "waiting_for_review" | "review_completed" | "session_terminated";

export interface SafetyEvent {
  id: string;
  projectId: string;
  participantId: string;
  runtimeSessionId: string;
  protocolId: string;
  protocolVersion: string;
  sessionDefinitionId: string;
  source: SafetyEventSource;
  sourceNodeId?: string;
  sourceMessageIds: string[];
  sourceExecutionLogIds: string[];
  safetyRuleIds: string[];
  linkedEscalationId?: string;
  executionSequence?: number;
  linkedSafetyMemoryIds: string[];
  severity: SafetySeverity;
  urgency: SafetyUrgency;
  status: SafetyEventStatus;
  triggerSummary: string;
  patientFacingStatus: PatientFacingSafetyStatus;
  sessionHoldRequired: boolean;
  sessionResumeAuthorized: boolean;
  assignedClinicianId?: string;
  assignedSupervisorId?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  triagedBy?: string;
  triagedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionCode?: string;
  resolutionSummary?: string;
  falsePositiveReason?: string;
  falsePositiveReviewedBy?: string;
  falsePositiveReviewedAt?: string;
  falsePositiveEvidenceReviewed?: boolean;
  falsePositiveRuleReviewRequired?: boolean;
  falsePositiveResumeRecommended?: boolean;
  followUpRequired: boolean;
  followUpTaskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type SafetyActionType =
  | "continue_with_monitoring"
  | "show_fixed_response"
  | "maintain_session_hold"
  | "assign_clinician"
  | "contact_participant_placeholder"
  | "review_session"
  | "request_supervisor_review"
  | "authorize_resume"
  | "terminate_session"
  | "create_follow_up"
  | "resolve_event"
  | "close_event";

export interface SafetyTriageRecord {
  id: string;
  safetyEventId: string;
  clinicianId: string;
  previousSeverity: SafetySeverity;
  selectedSeverity: SafetySeverity;
  previousUrgency: SafetyUrgency;
  selectedUrgency: SafetyUrgency;
  immediateActionRequired: boolean;
  sessionHoldRequired: boolean;
  participantContactRecommended: boolean;
  supervisorReviewRequired: boolean;
  additionalReviewRecommended: boolean;
  recommendedActions: SafetyActionType[];
  rationale: string;
  createdAt: string;
}

export type InterventionStatus = "planned" | "in_progress" | "completed" | "cancelled" | "failed";
export type InterventionChannel = "in_app" | "phone_placeholder" | "video_placeholder" | "secure_message_placeholder" | "internal_review";

export interface HumanInterventionRecord {
  id: string;
  safetyEventId: string;
  participantId: string;
  runtimeSessionId: string;
  clinicianId: string;
  status: InterventionStatus;
  channel: InterventionChannel;
  actionType: SafetyActionType;
  internalNote: string;
  patientFacingMessage?: string;
  startedAt?: string;
  completedAt?: string;
  outcomeCode?: string;
  outcomeSummary?: string;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
}

export type SafetyFollowUpStatus = "open" | "assigned" | "in_progress" | "completed" | "cancelled" | "overdue";

export interface SafetyFollowUpTask {
  id: string;
  safetyEventId: string;
  participantId: string;
  runtimeSessionId?: string;
  title: string;
  description: string;
  priority: SafetyUrgency;
  assignedClinicianId?: string;
  dueAt?: string;
  status: SafetyFollowUpStatus;
  completionNote?: string;
  linkedMemoryIds: string[];
  linkedGoalIds: string[];
  linkedHomeworkIds: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ClinicianHandoffRecord {
  id: string;
  safetyEventId: string;
  fromClinicianId?: string;
  toClinicianId: string;
  summary: string;
  pendingActions: string[];
  applyAssignmentOnAcknowledge: boolean;
  status: "pending" | "acknowledged" | "cancelled";
  acknowledgedByRecipient: boolean;
  acknowledgedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResumeRequest {
  id: string;
  safetyEventId: string;
  runtimeSessionId: string;
  requestedBy: string;
  reason: string;
  proposedResumeNodeId?: string;
  patientFacingMessage?: string;
  status: "pending" | "authorized" | "rejected" | "cancelled";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  authorizationReason?: string;
  authorizedBy?: string;
  authorizedAt?: string;
  conditionsVerified?: string[];
}

export interface SafetyTriggerSuppression {
  id: string;
  runtimeSessionId: string;
  safetyEventId: string;
  sourceNodeId?: string;
  safetyRuleId?: string;
  inputFingerprint?: string;
  executionSequence?: number;
  riskLevel?: SafetySeverity;
  riskSignalSignature?: string;
  usageCount?: number;
  lastUsedAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface RuntimeClinician {
  id: string;
  name: string;
  initials: string;
  role: "clinician" | "supervisor" | "safety_reviewer" | "research_coordinator";
  locale: string;
  country?: string;
  active: boolean;
  available: boolean;
  assignedSafetyEventIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SafetyStatusTransition {
  id: string;
  safetyEventId: string;
  actorId: string;
  actorRole: RuntimeClinician["role"] | "system";
  previousStatus?: SafetyEventStatus;
  nextStatus: SafetyEventStatus;
  reason: string;
  createdAt: string;
}

export interface SafetyNotification {
  id: string;
  clinicianId?: string;
  type: "new_immediate_event" | "urgent_unacknowledged" | "assignment_received" | "handoff_received" | "follow_up_overdue" | "resume_requested" | "termination_review" | "stale_safety_rule" | "event_reopened";
  title: string;
  body: string;
  linkedEventId?: string;
  linkedSessionId?: string;
  readAt?: string;
  clearedAt?: string;
  createdAt: string;
}

export interface SafetyReport {
  id: string;
  safetyEventId: string;
  participantId: string;
  createdAt: string;
  generatedBy: string;
  reportType?: "interim" | "final";
  eventStatusAtGeneration?: SafetyEventStatus;
  payload: Record<string, unknown>;
}
