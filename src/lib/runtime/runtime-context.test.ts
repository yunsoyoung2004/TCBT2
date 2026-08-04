import { describe, expect, it } from "vitest";
import { extractRuntimeState } from "@/lib/runtime/runtime-context";
import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";

function makeNode(field: string, kind: string = "text"): ClinicalStageNode {
  const now = new Date().toISOString();
  return {
    id: `node-${field}`,
    protocolId: "tbct-br-001",
    sessionId: "tbct-br-001-session-03",
    type: "question" as const,
    title: field,
    clinicalPurpose: kind,
    position: { x: 0, y: 0 },
    promptItemIds: [],
    requiredFields: [field],
    completionRule: {},
    branchRules: [],
    restrictions: [],
    safetyRuleIds: [],
    sourceTrace: { sourceDocument: "TBCT pasted source text", sourceSession: "Session 03", sourceSection: field, sourceLineStart: 1, sourceLineEnd: 1, sourceTextHash: "test", importedVersion: "test" },
    sourceFidelityStatus: "structured_from_source",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

describe("runtime context extraction", () => {
  it("accepts numeric inputs in range and rejects invalid values", async () => {
    const valid = await extractRuntimeState({ patientInput: { kind: "rating", value: "80%" }, currentNode: makeNode("initialATBeliefPercent", "rating"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    expect(valid.missingFields).toHaveLength(0);
    expect(valid.fields.initialATBeliefPercent).toBe(80);

    const invalid = await extractRuntimeState({ patientInput: { kind: "rating", value: "200" }, currentNode: makeNode("initialATBeliefPercent", "rating"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    expect(invalid.missingFields).toContain("initialATBeliefPercent");
  });

  it("does not hide a safety disclosure behind numeric prompt validation", async () => {
    const result = await extractRuntimeState({ patientInput: { kind: "rating", value: "I have a suicide plan." }, currentNode: makeNode("initialATBeliefPercent", "rating"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });

    expect(result.riskLevel).toBe("high");
    expect(result.riskSignals).toContain("suicide");
    expect(result.missingFields).toHaveLength(0);
  });

  it("detects no-more-evidence phrases", async () => {
    const result = await extractRuntimeState({ patientInput: { kind: "text", value: "Não consigo pensar em mais nenhum" }, currentNode: makeNode("evidenceFor"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    expect(result.fields.evidenceForNoMore).toBe(true);
  });

  it("rejects a greeting or bare confirmation but accepts a substantive open-ended response", async () => {
    const greeting = await extractRuntimeState({ patientInput: { kind: "text", value: "hi" }, currentNode: makeNode("situationThoughtDistinction"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    const bareConfirmation = await extractRuntimeState({ patientInput: { kind: "text", value: "yes" }, currentNode: makeNode("situationThoughtDistinction"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    const substantive = await extractRuntimeState({ patientInput: { kind: "text", value: "I avoid speaking during meetings because I expect to make a mistake." }, currentNode: makeNode("situationThoughtDistinction"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });

    expect(greeting.missingFields).toContain("situationThoughtDistinction");
    expect(bareConfirmation.missingFields).toContain("situationThoughtDistinction");
    expect(substantive.missingFields).toHaveLength(0);
    expect(substantive.fields.situationThoughtDistinction).toContain("avoid speaking");
  });

  it("does not infer a factual automatic thought from its wording", async () => {
    const result = await extractRuntimeState({ patientInput: { kind: "text", value: "I am going to lose this job." }, currentNode: makeNode("automaticThought"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    expect(result.fields.automaticThought).toBe("I am going to lose this job.");
    expect(result.fields.automaticThoughtIsFactual).toBeUndefined();
  });

  it("uses an explicit source-backed confirmation field for factual-thought routing", async () => {
    const promptItem = {
      id: "source-confirmation",
      protocolId: "tbct-br-001",
      sessionId: "tbct-s03",
      nodeId: "node-automaticThoughtIsFactual",
      order: 1,
      type: "confirmation",
      verbatimText: "Source confirmation",
      editableText: "Source confirmation",
      aiInstruction: "",
      activationCondition: null,
      outputFields: ["automaticThoughtIsFactual"],
      validation: { kind: "boolean" },
      completionEffect: null,
      restrictions: [],
      safetyRuleIds: [],
      sourceTrace: { sourceDocument: "TBCT pasted source text", sourceSession: "Session 03", sourceSection: "Factual thought", sourceLineStart: 511, sourceLineEnd: 528, sourceTextHash: "test", importedVersion: "test" },
      sourceFidelityStatus: "structured_from_source",
      origin: "source_imported",
      sourceHash: "test",
      status: "active",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      updatedBy: "test",
    } satisfies PromptItem;
    const result = await extractRuntimeState({ patientInput: { kind: "boolean", value: true }, currentNode: makeNode("automaticThought"), currentPromptItem: promptItem, currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });

    expect(result.fields.automaticThoughtIsFactual).toBe(true);
  });
});