export type SourceFidelityStatus = "exact" | "structured_from_source" | "review_required" | "source_missing";

export type PromptItemType =
  | "instruction"
  | "opening"
  | "explanation"
  | "question"
  | "clarification"
  | "follow_up"
  | "confirmation"
  | "reflection"
  | "rating"
  | "summary"
  | "transition"
  | "closing"
  | "role_transition"
  | "worksheet_instruction";

export type SourceTrace = {
  sourceDocument: "TBCT pasted source text";
  sourceSession: string;
  sourceSection: string;
  sourceLineStart: number;
  sourceLineEnd: number;
  sourceTextHash: string;
  sourceSessionHash?: string;
  importedVersion: string;
  rawSourceExcerpt?: string;
  reviewWarnings?: string[];
};

export type SessionDefinitionStatus = "draft" | "reviewed" | "released";

export type SessionDefinition = {
  id: string;
  protocolId: string;
  number: number;
  title: string;
  techniqueName: string;
  acronym?: string;
  contextAndPurpose: string;
  roleAndStance: string;
  sessionObjective: string;
  languageRules: string[];
  openingRules: string[];
  sessionWideRequiredActions: string[];
  sessionWideRestrictions: string[];
  sessionWideSafetyRules: string[];
  startNodeId: string;
  completionNodeId: string;
  sourceTrace: SourceTrace;
  sourceFidelityStatus: SourceFidelityStatus;
  status: SessionDefinitionStatus;
  createdAt: string;
  updatedAt: string;
  // Display and legacy-query aliases. These always derive from the canonical
  // fields above and are not independent clinical content.
  technique: string;
  clinicalPurpose: string;
  roleInstruction: string;
  nodeCount: number;
  promptCount: number;
  validationStatus: "review" | "ready" | "blocked";
};

export type ClinicalStageNode = {
  id: string;
  protocolId: string;
  sessionId: string;
  title: string;
  type: string;
  clinicalPurpose: string;
  position: { x: number; y: number };
  promptItemIds: string[];
  requiredFields: string[];
  completionRule: Record<string, unknown>;
  branchRules: Array<Record<string, unknown>>;
  restrictions: string[];
  safetyRuleIds: string[];
  defaultNextNodeId?: string;
  fallbackNodeId?: string;
  sourceTrace: SourceTrace;
  sourceFidelityStatus: Exclude<SourceFidelityStatus, "source_missing">;
  status: "active" | "disabled" | "deprecated";
  createdAt: string;
  updatedAt: string;
};

export type PromptItem = {
  id: string;
  protocolId: string;
  sessionId: string;
  nodeId: string;
  order: number;
  type: PromptItemType;
  verbatimText: string;
  editableText: string;
  aiInstruction: string;
  activationCondition: Record<string, unknown> | null;
  outputFields: string[];
  validation: Record<string, unknown> | null;
  completionEffect: Record<string, unknown> | null;
  restrictions: string[];
  safetyRuleIds: string[];
  sourceTrace: SourceTrace;
  sourceFidelityStatus: Exclude<SourceFidelityStatus, "source_missing">;
  origin: "source_imported" | "custom";
  sourceHash: string;
  status: "active" | "disabled" | "deprecated";
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  sourceUpdateAvailable?: boolean;
  migrationHistory?: Array<{
    migrationVersion: string;
    previousId?: string;
    mapping: "exact" | "conflict" | "deprecated" | "source_changed";
    at: string;
  }>;
};

export type SessionPlanStatus = "draft" | "validated" | "released";

export type SessionPlanEntry = {
  entryId: string;
  sessionId: string;
  order: number;
  active: boolean;
  occurrence: number;
  label: string;
};

export type SessionPlan = {
  id: string;
  protocolId: string;
  orderedEntries: SessionPlanEntry[];
  startingEntryId: string;
  status: SessionPlanStatus;
  version: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionCommonRules = {
  sessionTitle: string;
  techniqueName: string;
  roleAndStance: string;
  sessionObjective: string;
  languageRules: string[];
  openingRules: string[];
  sessionWideRequiredActions: string[];
  sessionWideRestrictions: string[];
  sessionWideSafetyRules: string[];
  sourceTrace: SourceTrace;
  sourceFidelityStatus: SourceFidelityStatus;
  version: string;
  status: "incomplete" | "clinical_review" | "safety_review" | "validated" | "published";
  // Compatibility fields maintained as derived display values until the
  // existing Inspector is switched fully to the canonical names.
  clinicalContext: string;
  previousSessionContext: string;
  languageAndTerminologyRules: string;
  toneAndInteractionRules: string;
  safetyAndEscalationRules: string;
  defaultModalityRules: string[];
};

export type SourceFidelityEdge = {
  id: string;
  protocolId: string;
  sessionId: string;
  source: string;
  target: string;
  edgeType: "default" | "conditional" | "fallback" | "safety" | "completion";
  label?: string;
  condition?: {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "exists" | "in";
    value?: string | number | boolean | string[];
  };
  priority: number;
  isFallback: boolean;
  sourceTrace: SourceTrace;
};

export type SourceFidelitySessionSeed = {
  definition: SessionDefinition;
  commonRules: SessionCommonRules;
  nodes: ClinicalStageNode[];
  promptItems: PromptItem[];
  edges: SourceFidelityEdge[];
};

export type SourceFidelityBackup = {
  id: "pre-full-source-fidelity-rebuild";
  createdAt: string;
  migrationVersion: string;
  sessionDefinitions: unknown[];
  nodes: unknown[];
  edges: unknown[];
  promptItems: unknown[];
  sessionPlan: unknown | null;
  releases: unknown[];
  runtimeReferences: unknown[];
  sourceTraces: unknown[];
};