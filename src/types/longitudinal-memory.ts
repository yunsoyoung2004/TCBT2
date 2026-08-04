import type { ProtocolNodeType } from "@/types/protocol-runtime";
import type { RuntimeSessionStatus } from "@/types/runtime-session";

export type MemoryType =
  | "session_goal"
  | "treatment_goal"
  | "patient_preference"
  | "communication_preference"
  | "reported_context"
  | "activity_history"
  | "homework_assignment"
  | "homework_outcome"
  | "barrier"
  | "coping_strategy"
  | "progress_marker"
  | "clinician_note"
  | "safety_relevant"
  | "temporary_session_fact";

export type MemoryStatus =
  | "candidate"
  | "pending_review"
  | "approved"
  | "rejected"
  | "superseded"
  | "expired"
  | "revoked"
  | "deleted";

export type MemorySensitivity = "standard" | "sensitive" | "highly_sensitive" | "safety_restricted";

export type MemorySourceType =
  | "patient_statement"
  | "structured_input"
  | "runtime_context"
  | "session_summary"
  | "clinician_entry"
  | "system_derived";

export interface RuntimeParticipant {
  id: string;
  projectId: string;
  alias: string;
  locale: string;
  country?: string;
  status: "active" | "paused" | "withdrawn" | "completed" | "archived";
  runtimeSessionIds: string[];
  longitudinalRecordId: string;
  consent: {
    memoryStorageAllowed: boolean;
    crossSessionUseAllowed: boolean;
    sensitiveMemoryAllowed: boolean;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LongitudinalRecord {
  id: string;
  participantId: string;
  projectId: string;
  activeMemoryIds: string[];
  latestSummaryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LongitudinalMemory {
  id: string;
  participantId: string;
  projectId: string;
  memoryType: MemoryType;
  title: string;
  content: string;
  structuredValue?: Record<string, unknown>;
  status: MemoryStatus;
  sensitivity: MemorySensitivity;
  sourceType: MemorySourceType;
  sourceSessionId: string;
  sourceMessageIds: string[];
  sourceNodeIds: string[];
  sourceExecutionLogIds: string[];
  isDirectlyReported: boolean;
  isSystemDerived: boolean;
  confidence?: number;
  validFrom: string;
  validUntil?: string;
  retentionPolicyId: string;
  supersedesMemoryId?: string;
  supersededByMemoryId?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RuntimeSessionSummary {
  id: string;
  runtimeSessionId: string;
  participantId: string;
  protocolId: string;
  protocolVersion: string;
  sessionDefinitionId: string;
  sessionStatus: RuntimeSessionStatus;
  startedAt?: string;
  completedAt?: string;
  summaryStatus: "draft" | "pending_review" | "approved" | "rejected";
  goalsAddressed: string[];
  activitiesCompleted: string[];
  homeworkAssigned: string[];
  homeworkOutcomes: string[];
  patientReportedBarriers: string[];
  copingStrategies: string[];
  progressMarkers: string[];
  unresolvedItems: string[];
  safetyEvents: string[];
  nextSessionConsiderations: string[];
  memoryCandidateIds: string[];
  sourceMessageIds: string[];
  sourceExecutionLogIds: string[];
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface MemoryCandidate extends LongitudinalMemory {
  reviewNote?: string;
}

export interface MemoryReviewDecision {
  id: string;
  memoryId: string;
  participantId: string;
  action: "approve" | "reject" | "revise" | "revoke" | "delete" | "supersede";
  reason: string;
  previousValue?: string;
  newValue?: string;
  createdAt: string;
  createdBy: string;
}

export interface MemoryRetentionPolicy {
  id: string;
  name: string;
  memoryTypes: MemoryType[];
  defaultDurationDays?: number;
  requiresReview: boolean;
  autoExpire: boolean;
  allowPatientView: boolean;
  allowPatientEdit: boolean;
  allowRuntimeInjection: boolean;
  allowedNodeTypes?: ProtocolNodeType[];
  sensitivityLimit: MemorySensitivity[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryRetrievalRequest {
  participantId: string;
  runtimeSessionId: string;
  protocolId: string;
  protocolVersion: string;
  sessionDefinitionId: string;
  currentNodeId: string;
  currentNodeType: ProtocolNodeType;
  currentClinicalIntent?: string;
  requestedMemoryTypes?: MemoryType[];
  maxItems: number;
}

export interface MemoryRetrievalResult {
  id: string;
  participantId: string;
  runtimeSessionId: string;
  currentNodeId: string;
  candidatesEvaluated: number;
  selectedMemoryIds: string[];
  excluded: Array<{ memoryId: string; reason: string }>;
  createdAt: string;
}

export interface MemoryUsageLog {
  id: string;
  memoryId: string;
  participantId: string;
  runtimeSessionId: string;
  nodeId: string;
  usageType: "retrieved" | "injected" | "used_for_prompt" | "used_for_branch" | "used_for_safety" | "displayed_to_clinician";
  reason: string;
  retrievalScore?: number;
  createdAt: string;
}

export interface ParticipantConsentEvent {
  id: string;
  participantId: string;
  memoryStorageAllowed: boolean;
  crossSessionUseAllowed: boolean;
  sensitiveMemoryAllowed: boolean;
  effectiveAt: string;
  reason?: string;
}

export interface GoalTrackingRecord {
  id: string;
  participantId: string;
  sourceSessionId: string;
  sourceNodeId?: string;
  title: string;
  description?: string;
  status: "active" | "paused" | "achieved" | "discontinued";
  progressNote?: string;
  createdAt: string;
  updatedAt: string;
  achievedAt?: string;
  memoryId?: string;
}

export interface HomeworkTrackingRecord {
  id: string;
  participantId: string;
  assignedSessionId: string;
  sourceNodeId: string;
  title: string;
  description: string;
  assignedAt: string;
  dueBeforeSessionDefinitionId?: string;
  status: "assigned" | "in_progress" | "completed" | "not_completed" | "cancelled";
  completedAt?: string;
  patientNote?: string;
  reviewedSessionId?: string;
  memoryId?: string;
}
