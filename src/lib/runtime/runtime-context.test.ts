import { describe, expect, it } from "vitest";
import { extractRuntimeState, isExplicitPatientRefusal } from "@/lib/runtime/runtime-context";
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

function makePrompt(field: string, validation?: Record<string, unknown>): PromptItem {
  return {
    id: `prompt-${field}`,
    protocolId: "tbct-br-001",
    sessionId: "tbct-s01",
    nodeId: `node-${field}`,
    order: 1,
    type: "question",
    verbatimText: "How would you describe what is happening right now, quite telegraphically?",
    editableText: "Ask for a simple, neutral description of what is happening. A situation is different from an interpretation or opinion.",
    aiInstruction: "Ask for a simple, neutral situation description.",
    activationCondition: null,
    outputFields: [field],
    validation: validation ?? null,
    completionEffect: null,
    restrictions: [],
    safetyRuleIds: [],
    sourceTrace: { sourceDocument: "TBCT pasted source text", sourceSession: "Session 01", sourceSection: field, sourceLineStart: 66, sourceLineEnd: 74, sourceTextHash: "test", importedVersion: "test" },
    sourceFidelityStatus: "structured_from_source",
    origin: "source_imported",
    sourceHash: "test",
    status: "active",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    updatedBy: "test",
  };
}

describe("runtime context extraction", () => {
  it("recognizes an explicit refusal without treating it as a safety disclosure", () => {
    expect(isExplicitPatientRefusal("I don’t want counsel")).toBe(true);
    expect(isExplicitPatientRefusal("I don't want to continue")).toBe(true);
  });
  it("recognizes an explicit refusal stated in Korean", () => {
    expect(isExplicitPatientRefusal("세션을 진행하고 싶지 않아요")).toBe(true);
    expect(isExplicitPatientRefusal("세션을 진행하고 싶지 않아요?")).toBe(true);
    expect(isExplicitPatientRefusal("세시 시험을 진행하고 싶지 않아요")).toBe(true);
    expect(isExplicitPatientRefusal("그만하고 싶어요")).toBe(true);
    expect(isExplicitPatientRefusal("치료받고 싶지 않아요")).toBe(true);
    expect(isExplicitPatientRefusal("나 좀 내버려 둬")).toBe(true);
    expect(isExplicitPatientRefusal("네, 그런 거 같습니다")).toBe(false);
  });
  it("preserves fields extracted from a partially complete multi-field answer", async () => {
    const promptItem = {
      ...makePrompt("distressingSituation"),
      id: "tbct-s08-n01-p01-distressing-situation",
      outputFields: ["distressingSituation", "automaticThought"],
      editableText: "Ask for a distressing situation and the automatic thought it triggered.",
    } satisfies PromptItem;
    const result = await extractRuntimeState({
      patientInput: { kind: "text", value: "During meetings I keep thinking that I'm not good enough and that I'm failing." },
      currentNode: { ...makeNode("distressingSituation"), requiredFields: ["distressingSituation", "automaticThought"] },
      currentPromptItem: promptItem,
      currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" },
      locale: "en-US",
    });

    expect(result.fields.distressingSituation).toBeDefined();
    expect(result.missingFields).not.toContain("distressingSituation");
  });
  it("derives the recorded flag from one rating_or_absent answer instead of requesting a second number", async () => {
    const result = await extractRuntimeState({
      patientInput: { kind: "rating", value: "32" },
      currentNode: { requiredFields: ["shameIntensityBaseline", "shameBaselineRecorded"] } as ClinicalStageNode,
      currentPromptItem: { outputFields: ["shameIntensityBaseline", "shameBaselineRecorded"], validation: { kind: "rating_or_absent", min: 0, max: 100 } } as unknown as PromptItem,
      currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" },
      locale: "en-US",
    });
    expect(result.fields.shameIntensityBaseline).toBe(32);
    expect(result.fields.shameBaselineRecorded).toBe(true);
    expect(result.missingFields).toEqual([]);
  });
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

  it.each(["I wanna die", "I want to die", "I don't want to live", "I will kill myself", "Suiside"])("detects direct or commonly misspelled suicide language: %s", async (value) => {
    const result = await extractRuntimeState({ patientInput: { kind: "text", value }, currentNode: makeNode("candidateOneReaction"), currentPromptItem: { ...makePrompt("candidateOneReaction", { kind: "enum", values: ["positive", "negative"] }) }, currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    expect(result.riskLevel).toBe("high");
    expect(result.riskSignals).toContain("suicide");
    expect(result.fields.crisisSignal).toBe(true);
  });

  it("routes indirect death-related language to neutral safety clarification", async () => {
    const result = await extractRuntimeState({ patientInput: { kind: "text", value: "Sometimes I wish I could disappear forever." }, currentNode: makeNode("candidateOneThought"), currentPromptItem: makePrompt("candidateOneThought"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    expect(result.riskLevel).toBe("low");
    expect(result.riskSignals).toContain("ambiguous_safety_language");
    expect(result.missingFields).toContain("candidateOneThought");
  });

  it("escalates an affirmative answer to a pending safety clarification", async () => {
    const result = await extractRuntimeState({ patientInput: { kind: "text", value: "Yes, that is what I mean." }, currentNode: makeNode("candidateOneThought"), currentPromptItem: makePrompt("candidateOneThought"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low", lastClarificationReason: "safety_clarification" } });
    expect(result.riskLevel).toBe("high");
    expect(result.riskSignals).toContain("patient_confirmed_safety_concern");
  });

  it("rejects a copied Program question as patient input", async () => {
    const prompt = makePrompt("situationThoughtDistinction", { kind: "participant_articulated_distinction" });
    const result = await extractRuntimeState({ patientInput: { kind: "text", value: `${prompt.verbatimText} Read` }, currentNode: makeNode("situationThoughtDistinction"), currentPromptItem: prompt, currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    expect(result.missingFields).toContain("situationThoughtDistinction");
  });

  it("does not treat ordinary goal-setting uses of stop as a safety crisis", async () => {
    const result = await extractRuntimeState({
      patientInput: { kind: "text", value: "I want to stop feeling anxious and stop believing that I am a failure." },
      currentNode: makeNode("therapyGoals"),
      currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" },
    });

    expect(result.riskLevel).toBe("low");
    expect(result.riskSignals).toEqual([]);
  });

  it("does not treat an ordinary plan as a safety crisis", async () => {
    const result = await extractRuntimeState({
      patientInput: { kind: "text", value: "I have a plan to manage my workload this week." },
      currentNode: makeNode("therapyGoals"),
      currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" },
    });

    expect(result.riskLevel).toBe("low");
    expect(result.riskSignals).toEqual([]);
  });

  it("detects a direct Korean suicide disclosure before ordinary prompt validation", async () => {
    const result = await extractRuntimeState({ patientInput: { kind: "text", value: "죽고싶다" }, currentNode: makeNode("situationThoughtDistinction"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });

    expect(result.riskLevel).toBe("high");
    expect(result.riskSignals).toContain("suicidal_ideation_ko");
    expect(result.missingFields).toHaveLength(0);
  });

  it.each([
    ["pt", "Eu quero morrer e não quero mais viver."],
    ["fr", "Je veux mourir. Je ne veux plus vivre."],
    ["ja", "死にたい。もう生きたくない。"],
  ])("detects a direct %s suicide disclosure", async (_locale, value) => {
    const result = await extractRuntimeState({ patientInput: { kind: "text", value }, currentNode: makeNode("therapyGoals"), currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });
    expect(result.riskLevel).toBe("high");
    expect(result.fields.crisisSignal).toBe(true);
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

  it("does not accept gibberish for the source-backed situation distinction", async () => {
    const promptItem = makePrompt("situationThoughtDistinction", { kind: "participant_articulated_distinction" });
    const result = await extractRuntimeState({ patientInput: { kind: "text", value: "fuiissiidojfosid" }, currentNode: makeNode("situationThoughtDistinction"), currentPromptItem: promptItem, currentContext: { fields: {}, riskSignals: [], iterationCounts: {}, riskLevel: "low" } });

    expect(result.missingFields).toContain("situationThoughtDistinction");
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
