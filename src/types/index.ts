export type ReviewStatus = "draft" | "review" | "approved" | "error" | "published";
export type Severity = "critical" | "warning" | "info" | "passed";

export interface ClinicalAsset {
  id: string;
  title: string;
  type: "Session Transcript" | "Therapist Manual" | "Prompt Library" | "Patient Worksheet" | "Safety Guidance";
  language: "Korean" | "English";
  country: "Korea" | "United States" | "Global";
  version: string;
  session: string;
  extractionStatus: ReviewStatus;
  reviewStatus: ReviewStatus;
  author: string;
  updatedAt: string;
  blocks: number;
  linkedSteps: string[];
  sourceKind: "pdf" | "docx" | "transcript";
  summary: string;
}

export interface SourceReference {
  id: string;
  document: string;
  page: number;
  paragraph: string;
  timestamp?: string;
  quote: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: "Therapist" | "Participant";
  timestamp: string;
  text: string;
  highlighted?: boolean;
  sourceReferenceId?: string;
}

export interface ProtocolStep {
  id: string;
  type: string;
  title: string;
  required: boolean;
  status: ReviewStatus;
  intent: string;
  prompt: string;
  guide: string;
  expectedResponse: string;
  branching: string;
  homework: string;
  completion: string;
  safetyNotes: string;
  confidence: number;
  sourceCount: number;
  branchCount: number;
  position: { x: number; y: number };
  aiGeneratedSections: string[];
  clinicianEditedSections: string[];
}

export interface ProtocolEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface SafetyRule {
  id: string;
  title: string;
  riskType: string;
  severity: "Low" | "Medium" | "High";
  countries: string[];
  sessions: string[];
  status: ReviewStatus;
  latestVersion: string;
  updatedAt: string;
  trigger: string;
  evidence: string;
  severityMapping: string;
  systemAction: string;
  fixedResponse: string;
  escalation: string;
  sessionSuspension: string;
  resumeCondition: string;
  active: boolean;
}

export interface ValidationIssue {
  id: string;
  severity: Severity;
  category: string;
  location: string;
  title: string;
  description: string;
  stepId?: string;
  session: string;
  source: string;
  status: "open" | "resolved" | "ignored";
  assignee: string;
  suggestedFix: string;
}

export interface ProtocolVersion {
  id: string;
  version: string;
  status: "Draft" | "Clinical Review" | "Published" | "Archived";
  author: string;
  approvedBy?: string;
  date: string;
  nodes: number;
  safetyRulesChanged: number;
  runtimeCompatibility: "Ready" | "Review" | "Blocked";
  changes: {
    added: number;
    modified: number;
    removed: number;
    edges: number;
  };
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  initials: string;
  role: string;
  action: string;
  resource: string;
  previousValue: string;
  newValue: string;
  reason: string;
  result: "Success" | "Pending" | "Blocked";
  version: string;
}
