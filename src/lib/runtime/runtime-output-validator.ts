import type { OutputValidationResult } from "@/types/runtime-session";

export type RuntimeStructuredOutput = {
  patientMessage: string;
  actionType: string;
  proposedFields: Record<string, unknown>;
  completionEvidence: string[];
  safetySignals: Array<{ type: string; immediacy?: string }>;
  recommendedTransition: "stay" | "advance" | "clarify" | "safety";
};

export type RuntimeOutputValidationContext = {
  roleId?: string;
  allowedActions?: string[];
  forbiddenActions?: string[];
  requiredFields?: string[];
  forbiddenPatientContent?: string[];
};

function containsInternalInstruction(text: string) {
  return /(?:\bsystem prompt\b|\binternal instructions?\b|\bmodel details?\b|\bprovider\b|\bruntime (?:state|identifier)\b|\bnode[-_ ]?[a-z0-9]+\b|\bedge[-_ ]?[a-z0-9]+\b)/i.test(text);
}

export function validateRuntimeStructuredOutput(output: RuntimeStructuredOutput, locale: string, context: RuntimeOutputValidationContext = {}): OutputValidationResult {
  const issues: string[] = [];
  const text = output.patientMessage.trim();
  if (!text) issues.push("Empty response");
  if (text.length > 600) issues.push("Response too long");
  if (containsInternalInstruction(text)) issues.push("Internal instruction detail exposed");
  if (locale.startsWith("ko") && /provider|prompt|model/i.test(text)) issues.push("Internal provider detail exposed");
  if (!output.actionType.trim()) issues.push("Missing action type");
  if (context.allowedActions?.length && !context.allowedActions.includes(output.actionType)) issues.push("Action is not allowed for the active PromptItem");
  if (context.forbiddenActions?.includes(output.actionType)) issues.push("Forbidden action requested");
  const usesRoleScopedControls = context.allowedActions !== undefined || context.forbiddenActions !== undefined || context.requiredFields !== undefined;
  if (usesRoleScopedControls && !context.roleId?.trim()) issues.push("Missing active speaker role");
  if (context.forbiddenPatientContent?.some((value) => value && text.toLowerCase().includes(value.toLowerCase()))) {
    issues.push("Forbidden patient content exposed");
  }
  if (output.recommendedTransition === "advance" && context.requiredFields?.some((field) => !(field in output.proposedFields))) {
    issues.push("Advance recommendation is missing required field evidence");
  }
  if (output.safetySignals.some((signal) => signal.immediacy === "immediate") && output.recommendedTransition !== "safety") {
    issues.push("Immediate safety signal lacks a safety recommendation");
  }
  const accepted = issues.length === 0;
  return {
    accepted,
    corrected: false,
    rejected: !accepted,
    issues,
    finalText: accepted ? text : undefined,
    fallbackRequired: !accepted,
  };
}

export function validateRuntimeOutput(text: string, locale: string): OutputValidationResult {
  return validateRuntimeStructuredOutput({
    patientMessage: text,
    actionType: "send_message",
    proposedFields: {},
    completionEvidence: [],
    safetySignals: [],
    recommendedTransition: "stay",
  }, locale);
}
