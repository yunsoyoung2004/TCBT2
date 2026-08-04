import type { SourceFidelityEdge } from "@/lib/protocol/source-fidelity-types";
import type { RuntimeContext } from "@/types/runtime-session";

function resolveField(field: string, context: RuntimeContext) {
  if (field in context.fields) return context.fields[field];
  if (field === "responseCategory") return context.responseCategory;
  if (field === "riskLevel") return context.riskLevel;
  if (field === "activityCompletion") return context.activityCompletion;
  if (field === "homeworkStatus") return context.homeworkStatus;
  if (field.startsWith("iterationCounts.")) return context.iterationCounts[field.replace("iterationCounts.", "")];
  return undefined;
}

function evaluateCondition(edge: SourceFidelityEdge, context: RuntimeContext) {
  const condition = edge.condition;
  if (!condition) return edge.edgeType === "default" || edge.isFallback;
  const actual = resolveField(condition.field, context);
  switch (condition.operator) {
    case "equals":
      return actual === condition.value;
    case "not_equals":
      return actual !== condition.value;
    case "contains":
      return typeof actual === "string" && typeof condition.value === "string" ? actual.includes(condition.value) : Array.isArray(actual) ? actual.includes(condition.value as never) : false;
    case "greater_than":
      return typeof actual === "number" && typeof condition.value === "number" ? actual > condition.value : false;
    case "less_than":
      return typeof actual === "number" && typeof condition.value === "number" ? actual < condition.value : false;
    case "exists":
      return actual !== undefined && actual !== null && actual !== "";
    case "in":
      return Array.isArray(condition.value) ? condition.value.includes(actual as never) : false;
    default:
      return false;
  }
}

export function selectNextRuntimeEdge(edges: SourceFidelityEdge[], context: RuntimeContext) {
  const ordered = [...edges].sort((a, b) => a.priority - b.priority);
  const conditional = ordered.filter((edge) => edge.edgeType === "conditional");
  const matchedConditional = conditional.find((edge) => evaluateCondition(edge, context));
  if (matchedConditional) return matchedConditional;
  const fallback = ordered.find((edge) => edge.isFallback || edge.edgeType === "fallback");
  if (fallback) return fallback;
  return ordered.find((edge) => edge.edgeType === "default" || edge.edgeType === "completion" || edge.edgeType === "safety");
}
