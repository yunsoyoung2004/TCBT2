import type {
  ClinicalStageNode,
  PromptItem as SourceFidelityPromptItem,
  SessionCommonRules,
  SessionDefinition,
  SessionPlan,
  SourceFidelityEdge,
  SourceFidelityStatus,
  SourceTrace,
} from "@/lib/protocol/source-fidelity-types";

export type ProtocolNodeType =
  | "session_start"
  | "orientation"
  | "dialogue"
  | "question"
  | "assessment"
  | "condition"
  | "activity"
  | "visualization"
  | "homework"
  | "safety_check"
  | "clinician_escalation"
  | "session_complete";

export type ProtocolNodeStatus = "draft" | "needs_review" | "approved" | "validation_error" | "published";

export interface ProtocolCondition {
  id: string;
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "exists" | "in" | "custom";
  value?: string | number | boolean | string[];
  expression?: string;
}

export interface RuntimeAction {
  actionType:
    | "send_message"
    | "ask_question"
    | "collect_field"
    | "start_activity"
    | "assign_homework"
    | "show_visualization"
    | "run_safety_check"
    | "escalate_clinician"
    | "complete_session";
  payload: Record<string, unknown>;
}

export interface ProtocolGraphNodeData {
  protocolNodeId: string;
  protocolId: string;
  sessionId: string;
  nodeType: ProtocolNodeType;
  title: string;
  clinicalIntent?: string;
  content?: string;
  required: boolean;
  status: ProtocolNodeStatus;
  sourceStructuredItemIds: string[];
  sourceEvidenceIds: string[];
  safetyRuleIds: string[];
  completionConditionIds: string[];
  canonicalNodeId?: string;
  promptItemIds?: string[];
  sourceTrace?: SourceTrace;
  sourceFidelityStatus?: SourceFidelityStatus;
  runtimeAction?: RuntimeAction;
  metadata: {
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
    reviewStatus?: string;
    importedFromCandidateId?: string;
    importedFromSourceDraftId?: string;
  };
}

export interface ProtocolGraphNode {
  id: string;
  protocolId: string;
  sessionId: string;
  type: ProtocolNodeType;
  position: { x: number; y: number };
  data: ProtocolGraphNodeData;
}

export type ProtocolEdgeType = "default" | "conditional" | "fallback" | "safety" | "completion";

export interface ProtocolGraphEdge {
  id: string;
  protocolId: string;
  sessionId: string;
  source: string;
  target: string;
  edgeType: ProtocolEdgeType;
  label?: string;
  condition?: ProtocolCondition;
  priority: number;
  isFallback: boolean;
  sourceStructuredItemId?: string;
  sourceEvidenceIds: string[];
  sourceTrace?: SourceTrace;
  sourceFidelityStatus?: SourceFidelityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolSession {
  id: string;
  protocolId: string;
  title: string;
  order: number;
  goals: string[];
  entryNodeId?: string;
  completionNodeIds: string[];
  nodeIds: string[];
  edgeIds: string[];
  status: ProtocolNodeStatus;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolDefinition {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  locale: string;
  country: string;
  currentVersion: string;
  status: "draft" | "clinical_review" | "validated" | "published" | "archived";
  sessionIds: string[];
  globalSafetyRuleIds: string[];
  runtimeSchemaVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolImportWarning {
  id: string;
  severity: "critical" | "warning" | "information";
  structuredItemId?: string;
  message: string;
  suggestedAction?: string;
}

export interface ProtocolImportResult {
  candidateId: string;
  protocolId: string;
  sessionId: string;
  createdNodeIds: string[];
  createdEdgeIds: string[];
  skippedItemIds: string[];
  conflictIds: string[];
  warnings: ProtocolImportWarning[];
}

export interface ProtocolValidationIssue {
  id: string;
  protocolId: string;
  sessionId?: string;
  nodeId?: string;
  edgeId?: string;
  severity: "critical" | "warning" | "information";
  category: string;
  message: string;
  suggestedAction?: string;
}

export interface ProtocolValidationRun {
  id: string;
  protocolId: string;
  executedAt: string;
  summary: {
    critical: number;
    warning: number;
    information: number;
    passedChecks: number;
    sourceCoverage: number;
    runtimeCompatibility: "ready" | "review" | "blocked";
  };
  issues: ProtocolValidationIssue[];
}

export interface RuntimeExecutionLog {
  id: string;
  protocolId: string;
  sessionId: string;
  startedAt: string;
  steps: Array<{
    nodeId: string;
    actionType?: string;
    selectedEdgeId?: string;
    nextNodeId?: string;
    conditionSummary: string[];
  }>;
}

export interface ProtocolReleasePackage {
  id: string;
  protocolId: string;
  protocolVersion: string;
  targetEnvironment: "development" | "staging" | "pilot";
  packageChecksum: string;
  files: Record<string, string>;
  generatedAt: string;
  generatedBy: string;
}

export interface SourceFidelityReleaseSnapshot {
  canonicalProtocolId: string;
  sourceVersion: string;
  sourceTextHash: string;
  sessionPlan: SessionPlan;
  sessionDefinitions: SessionDefinition[];
  sessionCommonRules: Record<string, SessionCommonRules>;
  clinicalStageNodes: ClinicalStageNode[];
  promptItems: SourceFidelityPromptItem[];
  sourceFidelityEdges: SourceFidelityEdge[];
}

export interface ProtocolReleaseVersion {
  id: string;
  protocolId: string;
  version: string;
  releasePackageId: string;
  publishedAt: string;
  publishedBy: string;
  changeSummary: string;
  immutableSnapshot: {
    nodes: ProtocolGraphNode[];
    edges: ProtocolGraphEdge[];
    sourceFidelity?: SourceFidelityReleaseSnapshot;
  };
}
