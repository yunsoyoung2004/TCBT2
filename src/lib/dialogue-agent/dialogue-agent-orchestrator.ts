import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { RuntimePromptItem } from "@/types/protocol-runtime";
import type { RuntimeMessage, RuntimeSession } from "@/types/runtime-session";
import { compileDialogueContract } from "@/lib/dialogue-agent/dialogue-contract-compiler";
import { callDialogueAgent } from "@/lib/dialogue-agent/dialogue-agent-client";
import { validateDialogueDecision } from "@/lib/dialogue-agent/dialogue-output-validator";
import type { DialogueDecision } from "@/lib/dialogue-agent/dialogue-agent-contract";

// Pilot scope (feedback v2's dialogue-agent spec): S03 only, confirmed with
// the user before implementation. Add a session here only after it's been
// through the same verification pass this one got.
const DIALOGUE_AGENT_ENABLED_SESSIONS = new Set(["tbct-s03"]);

export function isDialogueAgentEnabled(sessionDefinitionId: string) {
  return DIALOGUE_AGENT_ENABLED_SESSIONS.has(sessionDefinitionId);
}

export type DialogueAgentTurnResult = {
  patientMessage: string;
  decision: DialogueDecision | null;
  usedFallback: boolean;
  fallbackReason?: string;
  provider: string;
  model?: string;
  latencyMs?: number;
};

/**
 * The single integration point both the "normal next question" path
 * (runtime-orchestrator.ts) and the "clarification" path
 * (runtime-execution-api.ts) call through, so the compile -> call ->
 * validate -> fall back sequence (and its ONE-call-per-turn guarantee)
 * lives in exactly one place. deterministicFallbackText is ALWAYS what
 * ships if anything here fails or fails validation -- this function can
 * only ever replace the wording of a turn, never its clinical content, and
 * never the runtime's own decision about what happens next.
 */
export async function resolveDialogueAgentMessage(input: {
  session: RuntimeSession;
  node: ClinicalStageNode;
  sourcePromptItem: PromptItem;
  runtimePromptItem: RuntimePromptItem;
  lastParticipantMessage?: string;
  recentMessages: RuntimeMessage[];
  clarificationAttemptCount: number;
  turnId: string;
  deterministicFallbackText: string;
}): Promise<DialogueAgentTurnResult> {
  const contract = compileDialogueContract({
    session: input.session,
    node: input.node,
    sourcePromptItem: input.sourcePromptItem,
    runtimePromptItem: input.runtimePromptItem,
    lastParticipantMessage: input.lastParticipantMessage,
    recentMessages: input.recentMessages,
    clarificationAttemptCount: input.clarificationAttemptCount,
  });

  const result = await callDialogueAgent(contract, { sessionId: input.session.id, turnId: input.turnId });
  if (result.failed) {
    return { patientMessage: input.deterministicFallbackText, decision: result.decision, usedFallback: true, fallbackReason: result.failureReason, provider: result.provider };
  }
  const validation = validateDialogueDecision(result.decision, contract);
  if (!validation.accepted) {
    return { patientMessage: input.deterministicFallbackText, decision: result.decision, usedFallback: true, fallbackReason: validation.reason, provider: result.provider, model: result.model, latencyMs: result.latencyMs };
  }
  return { patientMessage: result.decision.patientFacingMessage, decision: result.decision, usedFallback: false, provider: result.provider, model: result.model, latencyMs: result.latencyMs };
}
