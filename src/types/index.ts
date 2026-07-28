export type Status = "draft" | "review" | "approved" | "error" | "published";
export type Severity = "critical" | "warning" | "info" | "passed";

export interface ClinicalAsset {
  id: string;
  title: string;
  type: string;
  language: string;
  country: string;
  version: string;
  session: string;
  extractionStatus: Status;
  reviewStatus: Status;
  author: string;
  updatedAt: string;
  blocks: number;
}

export interface SourceReference {
  document: string;
  page: number;
  paragraph: string;
  timestamp?: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: "치료자" | "환자";
  timestamp: string;
  text: string;
  highlighted?: boolean;
}

export interface ProtocolStep {
  id: string;
  type: string;
  title: string;
  required: boolean;
  status: Status;
  intent: string;
  prompt: string;
  guide: string;
  branchCount: number;
  sourceCount: number;
  position: { x: number; y: number };
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
  trigger: string;
  action: string;
  escalation: "Low" | "Medium" | "High";
  active: boolean;
  status: Status;
  sessions: string[];
  updatedAt: string;
}

export interface ValidationIssue {
  id: string;
  severity: Severity;
  category: string;
  location: string;
  title: string;
  description: string;
  stepId?: string;
}

export interface ProtocolVersion {
  id: string;
  version: string;
  status: "Draft" | "Clinical Review" | "Published" | "Archived";
  author: string;
  date: string;
  nodes: number;
  changes: { added: number; modified: number; removed: number; edges: number };
}

export interface ReviewDecision {
  id: string;
  stepId: string;
  reviewer: string;
  decision: "approved" | "rejected" | "pending";
  comment: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  initials: string;
  action: string;
  resource: string;
  previousValue: string;
  newValue: string;
  reason: string;
  version: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: "online" | "offline";
}
