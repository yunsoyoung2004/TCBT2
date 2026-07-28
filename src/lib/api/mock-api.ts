import {
  assets, auditEntries, protocolEdges, protocolSteps, safetyRules,
  transcript, validationIssues, versions
} from "@/mocks/data";
import type {
  ClinicalAsset, ProtocolEdge, ProtocolStep, ProtocolVersion,
  SafetyRule, TranscriptSegment, ValidationIssue
} from "@/types";

const delay = (ms = 420) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function getAssets(): Promise<ClinicalAsset[]> {
  await delay();
  return structuredClone(assets);
}

export async function uploadAsset(input: Pick<ClinicalAsset, "title" | "type" | "language" | "country" | "version" | "session">): Promise<ClinicalAsset> {
  await delay(850);
  return {
    id:`AST-${String(assets.length + 1).padStart(3,"0")}`, ...input,
    extractionStatus:"draft", reviewStatus:"draft", author:"김지윤",
    updatedAt:"방금 전", blocks:0
  };
}

export async function getExtraction(): Promise<{ transcript: TranscriptSegment[]; step: ProtocolStep }> {
  await delay();
  return { transcript:structuredClone(transcript), step:structuredClone(protocolSteps[2]) };
}

export async function approveExtraction(stepId: string): Promise<{ stepId: string; status: "approved" }> {
  await delay(550);
  return { stepId, status:"approved" };
}

export async function getProtocol(): Promise<{ steps: ProtocolStep[]; edges: ProtocolEdge[] }> {
  await delay();
  return { steps:structuredClone(protocolSteps), edges:structuredClone(protocolEdges) };
}

export async function updateProtocolStep(step: ProtocolStep): Promise<ProtocolStep> {
  await delay(500);
  return structuredClone(step);
}

export async function validateProtocol(): Promise<{ score: number; issues: ValidationIssue[] }> {
  await delay(900);
  return { score:86, issues:structuredClone(validationIssues) };
}

export async function getSafetyRules(): Promise<SafetyRule[]> {
  await delay();
  return structuredClone(safetyRules);
}

export async function getVersions(): Promise<ProtocolVersion[]> {
  await delay();
  return structuredClone(versions);
}

export async function publishProtocol(version: string, target: string): Promise<{ releaseId: string; checksum: string; version: string; target: string; publishedAt: string }> {
  await delay(1200);
  return {
    releaseId:"REL-2026-0728-003",
    checksum:"sha256:8f2c…9a41",
    version, target,
    publishedAt:"2026.07.28 14:32 KST"
  };
}

export async function getAuditEntries() {
  await delay();
  return structuredClone(auditEntries);
}
