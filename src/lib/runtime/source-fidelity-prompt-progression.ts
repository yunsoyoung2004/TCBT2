import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { ProtocolReleaseVersion, SourceFidelityReleaseSnapshot } from "@/types/protocol-runtime";
import type { RuntimeContext } from "@/types/runtime-session";

type PromptCondition = {
  field?: string;
  operator?: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "exists" | "in";
  value?: string | number | boolean | string[];
};

export type PromptResolution = {
  promptItem: PromptItem | null;
  skippedPromptItemIds: string[];
};

const PASSIVE_PROMPT_TYPES = new Set<PromptItem["type"]>([
  "instruction",
  "explanation",
  "transition",
  "role_transition",
  "worksheet_instruction",
  "closing",
]);

function sourceFidelitySnapshot(release: ProtocolReleaseVersion): SourceFidelityReleaseSnapshot {
  const snapshot = release.immutableSnapshot.sourceFidelity;
  if (!snapshot) throw new Error("Runtime release is missing the canonical source-fidelity snapshot");
  return snapshot;
}

function resolveContextField(field: string, runtimeContext: RuntimeContext) {
  if (field in runtimeContext.fields) return runtimeContext.fields[field];
  if (field === "responseCategory") return runtimeContext.responseCategory;
  if (field === "riskLevel") return runtimeContext.riskLevel;
  if (field === "activityCompletion") return runtimeContext.activityCompletion;
  if (field === "homeworkStatus") return runtimeContext.homeworkStatus;
  if (field.startsWith("iterationCounts.")) return runtimeContext.iterationCounts[field.replace("iterationCounts.", "")];
  return undefined;
}

function isPromptCondition(value: Record<string, unknown>): value is PromptCondition {
  return typeof value.field === "string" && typeof value.operator === "string";
}

export function isPromptActivationSatisfied(promptItem: PromptItem, runtimeContext: RuntimeContext) {
  if (!promptItem.activationCondition) return true;
  if (!isPromptCondition(promptItem.activationCondition)) return false;
  const actual = resolveContextField(promptItem.activationCondition.field ?? "", runtimeContext);
  const expected = promptItem.activationCondition.value;
  switch (promptItem.activationCondition.operator) {
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "contains":
      return typeof actual === "string" && typeof expected === "string" ? actual.includes(expected) : Array.isArray(actual) ? actual.includes(expected as never) : false;
    case "greater_than":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "less_than":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "exists":
      return actual !== undefined && actual !== null && actual !== "";
    case "in":
      return Array.isArray(expected) && expected.includes(actual as never);
    default:
      return false;
  }
}

export function getReleasePromptItems(release: ProtocolReleaseVersion, nodeId: string) {
  const snapshot = sourceFidelitySnapshot(release);
  const node = snapshot.clinicalStageNodes?.find((item) => item.id === nodeId);
  if (!node) throw new Error(`Canonical release is missing node ${nodeId}`);
  const promptItemsById = new Map(snapshot.promptItems?.map((promptItem) => [promptItem.id, promptItem]) ?? []);
  return node.promptItemIds.map((promptItemId) => {
    const promptItem = promptItemsById.get(promptItemId);
    if (!promptItem) throw new Error(`Canonical release node ${nodeId} refers to missing PromptItem ${promptItemId}`);
    return promptItem;
  });
}

export function resolveCurrentReleasePrompt(input: {
  release: ProtocolReleaseVersion;
  nodeId: string;
  currentPromptItemId?: string;
  completedPromptItemIds?: string[];
  skippedPromptItemIds?: string[];
  runtimeContext: RuntimeContext;
}): PromptResolution {
  const promptItems = getReleasePromptItems(input.release, input.nodeId);
  const completedPromptItemIds = new Set(input.completedPromptItemIds ?? []);
  const skippedPromptItemIds = new Set(input.skippedPromptItemIds ?? []);
  const inactivePromptItemIds: string[] = [];

  if (input.currentPromptItemId) {
    const currentPromptItem = promptItems.find((promptItem) => promptItem.id === input.currentPromptItemId);
    if (currentPromptItem && !completedPromptItemIds.has(currentPromptItem.id) && !skippedPromptItemIds.has(currentPromptItem.id) && currentPromptItem.status === "active" && isPromptActivationSatisfied(currentPromptItem, input.runtimeContext)) {
      return { promptItem: currentPromptItem, skippedPromptItemIds: [] };
    }
  }

  for (const promptItem of promptItems) {
    if (completedPromptItemIds.has(promptItem.id) || skippedPromptItemIds.has(promptItem.id)) continue;
    if (promptItem.status !== "active" || !isPromptActivationSatisfied(promptItem, input.runtimeContext)) {
      inactivePromptItemIds.push(promptItem.id);
      continue;
    }
    return { promptItem, skippedPromptItemIds: inactivePromptItemIds };
  }

  return { promptItem: null, skippedPromptItemIds: inactivePromptItemIds };
}

export function promptRequiresPatientInput(promptItem: PromptItem) {
  if (promptItem.type === "rating" || promptItem.type === "question" || promptItem.type === "clarification" || promptItem.type === "follow_up" || promptItem.type === "confirmation" || promptItem.type === "reflection") return true;
  if (PASSIVE_PROMPT_TYPES.has(promptItem.type)) return false;
  return promptItem.outputFields.length > 0;
}