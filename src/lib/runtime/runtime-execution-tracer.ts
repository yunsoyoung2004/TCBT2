import { makeId } from "@/lib/id";
import type { OutputValidationResult, RuntimeExecutionTrace } from "@/types/runtime-session";

export function createRuntimeExecutionTrace(input: {
  runtimeSessionId: string;
  releaseId: string;
  nodeId: string;
  promptItemId: string;
  roleId: string;
  provider: string;
  model?: string;
  contractHash: string;
  validation: OutputValidationResult;
  fallbackUsed: boolean;
  transitionDecision: string;
  stateChanges: Record<string, unknown>;
}): RuntimeExecutionTrace {
  return {
    id: makeId("RTX"),
    runtimeSessionId: input.runtimeSessionId,
    releaseId: input.releaseId,
    nodeId: input.nodeId,
    promptItemId: input.promptItemId,
    roleId: input.roleId,
    provider: input.provider,
    model: input.model,
    contractHash: input.contractHash,
    validation: input.validation,
    fallbackUsed: input.fallbackUsed,
    transitionDecision: input.transitionDecision,
    stateChanges: input.stateChanges,
    timestamp: new Date().toISOString(),
  };
}