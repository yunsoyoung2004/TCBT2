import {
  assets,
  auditEntries,
  protocolEdges,
  protocolSteps,
  safetyRules,
  transcript,
  validationIssues,
  versions,
} from "@/mocks/data";
import { getLocalAuditEntries } from "@/lib/repositories/clinical-assets-repository";
import type {
  AuditEntry,
  ClinicalAsset,
  ProtocolEdge,
  ProtocolStep,
  ProtocolVersion,
  SafetyRule,
  TranscriptSegment,
  ValidationIssue,
} from "@/types";

const delay = (ms = 220) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface DashboardMetric {
  label: string;
  value: string;
  helper: string;
  tone: "primary" | "violet" | "warning" | "critical" | "success" | "neutral";
  href: string;
}

export interface ReadinessStage {
  id: string;
  order: number;
  label: string;
  completed: number;
  total: number;
  status: "approved" | "review";
  href: string;
}

export interface ReviewQueueItem {
  id: string;
  priority: "critical" | "warning" | "primary";
  title: string;
  type: string;
  session: string;
  assetType: string;
  owner: string;
  status: "draft" | "review";
  updatedAt: string;
  href: string;
}

export interface RecentActivityItem {
  id: string;
  initials: string;
  action: string;
  resource: string;
  reason: string;
  timestamp: string;
  status: "primary" | "success" | "warning";
}

export interface DashboardSummary {
  projectName: string;
  locale: string;
  country: string;
  version: string;
  status: string;
  lastUpdated: string;
  runtimeReadiness: number;
  currentBottleneck: {
    label: string;
    progress: number;
    completed: number;
    total: number;
    pendingReviews: number;
    priorityReviews: number;
    nextAction: string;
    href: string;
  };
  criticalIssues: number;
  pendingReviews: number;
  metrics: DashboardMetric[];
}

export async function getAssets(): Promise<ClinicalAsset[]> {
  await delay();
  return structuredClone(assets);
}

export async function uploadAsset(
  input: Pick<ClinicalAsset, "title" | "type" | "language" | "country" | "version" | "session">,
): Promise<ClinicalAsset> {
  await delay(680);
  return {
    id: `AST-${String(assets.length + 1).padStart(3, "0")}`,
    ...input,
    extractionStatus: "draft",
    reviewStatus: "draft",
    author: "Kim Jieun",
    updatedAt: "2026.07.29 09:18",
    blocks: 0,
    linkedSteps: [],
    sourceKind: "pdf",
    summary: "This is a newly registered clinical asset. After metadata linking, it will be included for structured draft generation.",
  };
}

export async function getExtraction(): Promise<{ transcript: TranscriptSegment[]; step: ProtocolStep }> {
  await delay();
  return { transcript: structuredClone(transcript), step: structuredClone(protocolSteps[2]) };
}

export async function approveExtraction(stepId: string): Promise<{ stepId: string; status: "approved" }> {
  await delay(300);
  return { stepId, status: "approved" };
}

export async function rejectExtraction(stepId: string): Promise<{ stepId: string; status: "review" }> {
  await delay(280);
  return { stepId, status: "review" };
}

export async function getProtocol(): Promise<{ steps: ProtocolStep[]; edges: ProtocolEdge[] }> {
  await delay();
  return { steps: structuredClone(protocolSteps), edges: structuredClone(protocolEdges) };
}

export async function updateProtocolStep(step: ProtocolStep): Promise<ProtocolStep> {
  await delay(260);
  return structuredClone(step);
}

export async function getSafetyRules(): Promise<SafetyRule[]> {
  await delay();
  return structuredClone(safetyRules);
}

export async function validateProtocol(): Promise<{ score: number; issues: ValidationIssue[] }> {
  await delay(420);
  return { score: 86, issues: structuredClone(validationIssues) };
}

export async function getVersions(): Promise<ProtocolVersion[]> {
  await delay();
  return structuredClone(versions);
}

export async function publishProtocol(version: string, target: "staging" | "production") {
  await delay(540);
  return {
    releaseId: "REL-2026-0729-001",
    checksum: "tbct-8c0f9f27b9f6e9a3",
    version,
    target,
    publishedAt: "2026.07.29 09:52",
  };
}

export async function getAuditEntries(): Promise<AuditEntry[]> {
  await delay();
  const localEntries = await getLocalAuditEntries().catch(() => []);
  return [...structuredClone(auditEntries), ...localEntries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  await delay();
  return {
    projectName: "Brazil TBCT Pilot Protocol",
    locale: "pt-BR",
    country: "Brazil",
    version: "v0.3.0",
    status: "Clinical review candidate",
    lastUpdated: "2026.07.29 09:14",
    runtimeReadiness: 78,
    currentBottleneck: {
      label: "Clinical Review",
      progress: 69,
      completed: 11,
      total: 16,
      pendingReviews: 14,
      priorityReviews: 5,
      nextAction: "Start clinical review",
      href: "/projects/demo/extraction",
    },
    criticalIssues: 2,
    pendingReviews: 14,
    metrics: [
      { label: "Registered Clinical Assets", value: "18", helper: "Session 03 transcript and manual updated", tone: "primary", href: "/projects/demo/assets" },
      { label: "Structured Sessions", value: "6 / 12", helper: "Six key sessions are draft-ready", tone: "violet", href: "/projects/demo/extraction" },
      { label: "Pending Review", value: "14", helper: "14 items require clinical review", tone: "warning", href: "/projects/demo/extraction" },
      { label: "Critical Validation", value: "2", helper: "2 release-blocking issues remain", tone: "critical", href: "/projects/demo/protocols/tbct-br-001/validation" },
      { label: "Current Version", value: "v0.3.0", helper: "Clinical review candidate", tone: "neutral", href: "/projects/demo/protocols/tbct-br-001/versions" },
      { label: "Runtime Readiness", value: "78%", helper: "Expected pilot-ready after safety rule linkage updates", tone: "success", href: "/projects/demo/protocols/tbct-br-001/validation" },
    ],
  };
}

export async function getProtocolReadiness(): Promise<ReadinessStage[]> {
  await delay();
  return [
    { id: "readiness-assets", order: 1, label: "Clinical Assets", completed: 18, total: 20, status: "approved", href: "/projects/demo/assets" },
    { id: "readiness-extraction", order: 2, label: "Extraction", completed: 24, total: 32, status: "review", href: "/projects/demo/extraction" },
    { id: "readiness-review", order: 3, label: "Clinical Review", completed: 11, total: 16, status: "review", href: "/projects/demo/extraction?filter=clinical-review" },
    { id: "readiness-safety", order: 4, label: "Safety Validation", completed: 12, total: 14, status: "approved", href: "/projects/demo/protocols/tbct-br-001/safety" },
    { id: "readiness-runtime", order: 5, label: "Runtime Compatibility", completed: 9, total: 11, status: "review", href: "/projects/demo/protocols/tbct-br-001/validation?category=runtime" },
  ];
}

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  await delay();
  return [
    {
      id: "RQ-001",
      priority: "critical",
      title: "STEP-07 clinician escalation link required",
      type: "Safety Review",
      session: "Session 03",
      assetType: "Safety Guidance",
      owner: "Park Seojun",
      status: "review",
      updatedAt: "09:14",
      href: "/projects/demo/extraction?item=STEP-07",
    },
    {
      id: "RQ-002",
      priority: "warning",
      title: "Apply clinical wording updates to homework review",
      type: "Clinical Review",
      session: "Session 03",
      assetType: "Session Transcript",
      owner: "Kim Jieun",
      status: "review",
      updatedAt: "08:42",
      href: "/projects/demo/extraction?item=STEP-03",
    },
    {
      id: "RQ-003",
      priority: "primary",
      title: "Strengthen STEP-04 source references",
      type: "Traceability",
      session: "Session 02",
      assetType: "Therapist Manual",
      owner: "Emily Han",
      status: "draft",
      updatedAt: "07:58",
      href: "/projects/demo/protocols/tbct-br-001/validation",
    },
    {
      id: "RQ-004",
      priority: "warning",
      title: "Review English safety phrase pack",
      type: "Translation Review",
      session: "Global Safety",
      assetType: "Safety Guidance",
      owner: "Emily Han",
      status: "review",
      updatedAt: "Yesterday",
      href: "/projects/demo/protocols/tbct-br-001/safety",
    },
    {
      id: "RQ-005",
      priority: "primary",
      title: "Review runtime action type replacement",
      type: "Runtime Review",
      session: "Session 01",
      assetType: "Prompt Library",
      owner: "Julia Park",
      status: "draft",
      updatedAt: "Yesterday",
      href: "/projects/demo/protocols/tbct-br-001/validation?category=runtime",
    },
  ];
}

export async function getCriticalIssues(): Promise<ValidationIssue[]> {
  await delay();
  return structuredClone(validationIssues.filter((item) => item.severity === "critical"));
}

export async function getRecentActivities(): Promise<RecentActivityItem[]> {
  await delay();
  return [
    { id: "ACT-001", initials: "KJ", action: "Updated", resource: "Session 03 transcript", reason: "Updated latest utterance blocks and source references", timestamp: "09:14", status: "primary" },
    { id: "ACT-002", initials: "PS", action: "Registered", resource: "Manual v1.2", reason: "Applied latest clinical question guide", timestamp: "08:56", status: "primary" },
    { id: "ACT-003", initials: "KJ", action: "Edited", resource: "STEP-03 prompt wording", reason: "Adjusted review questions to be more clinically friendly", timestamp: "08:42", status: "warning" },
    { id: "ACT-004", initials: "PS", action: "Approved", resource: "GLOBAL-RISK-01", reason: "Confirmed escalation phrasing and linkage policy", timestamp: "07:55", status: "success" },
    { id: "ACT-005", initials: "AI", action: "Completed", resource: "Validation run", reason: "Confirmed 2 critical, 2 warning, and 1 info issues", timestamp: "Yesterday", status: "warning" },
    { id: "ACT-006", initials: "EH", action: "Created", resource: "v0.3.0 clinical review candidate", reason: "Created release comparison snapshot", timestamp: "Yesterday", status: "primary" },
  ];
}

export async function getNextReviewItem(): Promise<ReviewQueueItem | null> {
  await delay(120);
  const queue = await getReviewQueue();
  return queue[0] ?? null;
}

export async function runValidation(): Promise<{ score: number; issues: ValidationIssue[]; completedAt: string }> {
  await delay(720);
  return {
    score: 86,
    issues: structuredClone(validationIssues),
    completedAt: "2026.07.29 09:32",
  };
}
