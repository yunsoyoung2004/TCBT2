import type { RuntimeRelease, RuntimeTransitionRule } from "@/types/protocol-runtime";
import type { RuntimeSessionState } from "@/types/runtime-session";
import { evaluateRuntimeCondition, resolveNextRuntimePrompt, type RuntimeActiveStep } from "@/lib/runtime/runtime-step-resolver";

export type RuntimeStateReduction = {
  state: RuntimeSessionState;
  transitionDecision: "waiting_for_input" | "next_prompt" | "next_node" | "complete_session";
  nextNodeId?: string;
  nextPromptItemId?: string;
  skippedPromptItemIds: string[];
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function cloneState(state: RuntimeSessionState): RuntimeSessionState {
  return {
    ...state,
    completedNodeIds: [...state.completedNodeIds],
    completedPromptItemIds: [...state.completedPromptItemIds],
    fields: { ...state.fields },
  };
}

export function reduceRuntimeState(input: {
  release: RuntimeRelease;
  currentState: RuntimeSessionState;
  activeStep: RuntimeActiveStep;
  event: "assistant_delivered" | "patient_input_accepted";
  confirmedFields?: Record<string, unknown>;
}): RuntimeStateReduction {
  const state = cloneState(input.currentState);
  if (input.confirmedFields) state.fields = { ...state.fields, ...input.confirmedFields };
  state.turnCount += 1;
  state.activeNodeId = input.activeStep.node.id;
  state.activePromptItemId = input.activeStep.promptItem.id;
  state.activePromptIndex = input.activeStep.promptIndex;

  const completionFlags = input.event === "patient_input_accepted"
    ? { "turn.patient_input_validated": true }
    : { "turn.assistant_message_delivered": true };
  if (input.event === "patient_input_accepted" && input.activeStep.promptItem.executionMode === "repeat_until") {
    state.nodeIterationCount += 1;
  }
  const completionConditionMet = evaluateRuntimeCondition(input.activeStep.promptItem.completionCondition, state, completionFlags);
  const repeatLimitReached = input.activeStep.promptItem.executionMode === "repeat_until"
    && state.nodeIterationCount >= (input.activeStep.promptItem.maxIterations ?? 1);
  const promptComplete = completionConditionMet && (input.event === "patient_input_accepted" || !input.activeStep.promptItem.requiresPatientInput)
    || repeatLimitReached;
  if (!promptComplete) {
    return {
      state,
      transitionDecision: "waiting_for_input",
      nextPromptItemId: input.activeStep.promptItem.id,
      skippedPromptItemIds: input.activeStep.skippedPromptItemIds,
    };
  }

  state.completedPromptItemIds = unique([...state.completedPromptItemIds, input.activeStep.promptItem.id, ...input.activeStep.skippedPromptItemIds]);
  const nextPrompt = resolveNextRuntimePrompt({
    release: input.release,
    node: input.activeStep.node,
    state,
    startIndex: input.activeStep.promptIndex + 1,
  });
  state.completedPromptItemIds = unique([...state.completedPromptItemIds, ...nextPrompt.skippedPromptItemIds]);
  if (nextPrompt.promptItem) {
    state.activePromptItemId = nextPrompt.promptItem.id;
    state.activePromptIndex = nextPrompt.promptIndex;
    return {
      state,
      transitionDecision: "next_prompt",
      nextPromptItemId: nextPrompt.promptItem.id,
      skippedPromptItemIds: unique([...input.activeStep.skippedPromptItemIds, ...nextPrompt.skippedPromptItemIds]),
    };
  }

  state.completedNodeIds = unique([...state.completedNodeIds, input.activeStep.node.id]);
  if (!evaluateRuntimeCondition(input.activeStep.node.completionCondition, state, { "node.all_prompt_items_completed": true })) {
    state.activePromptItemId = undefined;
    return { state, transitionDecision: "complete_session", skippedPromptItemIds: input.activeStep.skippedPromptItemIds };
  }
  const transitions = [...input.activeStep.node.transitionRules].sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  const matchingTransitions = transitions.filter((transition) => evaluateRuntimeCondition(transition.condition, state));
  let selectedTransition: RuntimeTransitionRule | undefined = matchingTransitions[0] ?? transitions.find((transition) => transition.isFallback);
  if (selectedTransition?.targetNodeId === input.activeStep.node.id && state.nodeIterationCount + 1 > input.activeStep.node.maxNodeIterations) {
    selectedTransition = matchingTransitions.find((transition) => transition.targetNodeId !== input.activeStep.node.id)
      ?? transitions.find((transition) => transition.isFallback && transition.targetNodeId !== input.activeStep.node.id);
  }
  if (!selectedTransition) {
    state.activePromptItemId = undefined;
    return { state, transitionDecision: "complete_session", skippedPromptItemIds: input.activeStep.skippedPromptItemIds };
  }

  const nextNode = input.release.nodes.find((node) => node.id === selectedTransition.targetNodeId);
  if (!nextNode) {
    state.activePromptItemId = undefined;
    return { state, transitionDecision: "complete_session", skippedPromptItemIds: input.activeStep.skippedPromptItemIds };
  }
  state.activeNodeId = nextNode.id;
  state.activePromptItemId = nextNode.promptSequence[0];
  state.activePromptIndex = 0;
  state.nodeIterationCount = nextNode.id === input.activeStep.node.id ? state.nodeIterationCount + 1 : 0;
  return {
    state,
    transitionDecision: "next_node",
    nextNodeId: nextNode.id,
    nextPromptItemId: state.activePromptItemId,
    skippedPromptItemIds: input.activeStep.skippedPromptItemIds,
  };
}
