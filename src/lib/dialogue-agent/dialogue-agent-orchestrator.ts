import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { RuntimePromptItem } from "@/types/protocol-runtime";
import type { RuntimeMessage, RuntimeSession } from "@/types/runtime-session";
import { compileDialogueContract } from "@/lib/dialogue-agent/dialogue-contract-compiler";
import { callDialogueAgent } from "@/lib/dialogue-agent/dialogue-agent-client";
import { validateDialogueDecision } from "@/lib/dialogue-agent/dialogue-output-validator";
import type { DialogueDecision } from "@/lib/dialogue-agent/dialogue-agent-contract";

// Expanded from the S01-S03 rollout to all eight sessions. The
// branching/revision system is still intentionally NOT built -- see
// revision_request handling in dialogue-contract-compiler.ts /
// anthropic-dialogue-agent.ts, which stays session-agnostic (honest,
// worksheetEditAvailable-gated response) regardless of this set's size.
const DIALOGUE_AGENT_ENABLED_SESSIONS = new Set(["tbct-s01", "tbct-s02", "tbct-s03", "tbct-s04", "tbct-s05", "tbct-s06", "tbct-s07", "tbct-s08"]);

export function isDialogueAgentEnabled(sessionDefinitionId: string) {
  return DIALOGUE_AGENT_ENABLED_SESSIONS.has(sessionDefinitionId);
}

/** Safety-critical turns never go through Claude, in either direction: not
 * the question ("how are you doing today") and not the crisis-pause
 * instruction. Risk disposition and its wording stay fully deterministic
 * regardless of session enablement -- this is checked independently of
 * isDialogueAgentEnabled so it also protects S04-S08 if those are ever
 * added to the set above without someone re-deriving this rule. */
function isSafetyCriticalPrompt(promptItem: PromptItem) {
  if ((promptItem.safetyRuleIds?.length ?? 0) > 0) return true;
  const validation = promptItem.validation as { kind?: unknown } | null;
  return validation?.kind === "safety_check";
}

export type DialogueAgentTurnResult = {
  patientMessage: string;
  decision: DialogueDecision | null;
  // True only when Claude was actually consulted and its output had to be
  // discarded (transport failure or failed validation) -- NOT true for
  // excludedBySafety, where the deterministic text is the correct, intended
  // output by design, not a degraded substitute. Callers that count
  // "fallback turns" as a quality signal (e.g. the simulated-patient audit)
  // depend on this distinction: an always-deterministic safety turn is not
  // a quality regression.
  usedFallback: boolean;
  excludedBySafety?: boolean;
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
  currentTaskTextOverride?: string;
}): Promise<DialogueAgentTurnResult> {
  if (isSafetyCriticalPrompt(input.sourcePromptItem)) {
    return { patientMessage: input.deterministicFallbackText, decision: null, usedFallback: false, excludedBySafety: true, fallbackReason: "safety_critical_prompt_excluded", provider: "deterministic" };
  }
  const contract = compileDialogueContract({
    session: input.session,
    node: input.node,
    sourcePromptItem: input.sourcePromptItem,
    runtimePromptItem: input.runtimePromptItem,
    lastParticipantMessage: input.lastParticipantMessage,
    recentMessages: input.recentMessages,
    clarificationAttemptCount: input.clarificationAttemptCount,
    currentTaskTextOverride: input.currentTaskTextOverride,
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
