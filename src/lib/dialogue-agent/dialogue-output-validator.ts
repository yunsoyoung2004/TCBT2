import type { DialogueContract, DialogueDecision } from "@/lib/dialogue-agent/dialogue-agent-contract";
import { hasUnresolvedTemplateVariable } from "@/lib/dialogue-agent/unresolved-template-detector";

export type DialogueValidationResult = { accepted: true } | { accepted: false; reason: string };

const DIAGNOSIS_PATTERN = /\b(?:you have|this (?:is|sounds like|indicates)) (?:a |an )?(?:diagnos|disorder|clinical depression|generalized anxiety disorder|bipolar|PTSD|OCD)\b/i;
const TREATMENT_ADVICE_PATTERN = /\b(?:you should (?:take|try)|i recommend (?:medication|therapy|seeing a)|consider (?:medication|antidepressants))\b/i;
const PROTOCOL_STATE_PATTERN = /\b(?:node[-_ ]?id|prompt ?item|runtime state|completion status|advance the protocol|next node|session state)\b/i;
const AI_SELF_REFERENCE_PATTERN = /\b(?:as an ai|i am an ai language model|as a language model)\b/i;

/**
 * Section 15's pre-display gate: everything here is a REFUSAL check, not a
 * rewrite -- if patientFacingMessage fails any of these, the caller falls
 * back to deterministic source-faithful text (dialogue-agent-orchestrator.ts)
 * rather than trying to patch Claude's output. This keeps the guarantee
 * simple: whatever reaches the participant either passed every check here
 * verbatim, or it's the known-safe fallback.
 */
export function validateDialogueDecision(decision: DialogueDecision, contract: DialogueContract): DialogueValidationResult {
  const text = decision.patientFacingMessage;

  if (hasUnresolvedTemplateVariable(text)) return { accepted: false, reason: "unresolved_template_variable" };
  if (!text.trim()) return { accepted: false, reason: "empty_message" };
  if (text.length > 700) return { accepted: false, reason: "message_too_long" };
  if (DIAGNOSIS_PATTERN.test(text)) return { accepted: false, reason: "diagnosis_language" };
  if (TREATMENT_ADVICE_PATTERN.test(text)) return { accepted: false, reason: "unsolicited_treatment_advice" };
  if (PROTOCOL_STATE_PATTERN.test(text)) return { accepted: false, reason: "protocol_state_language" };
  if (AI_SELF_REFERENCE_PATTERN.test(text)) return { accepted: false, reason: "ai_self_reference" };

  // "assistantMustNotSupply" fields: Claude may report what the participant
  // themselves said (candidateFieldMention is documented as non-authoritative
  // logging only -- it never reaches extractRuntimeState, which remains the
  // sole writer of this field), but must never hand them an INVENTED value
  // for a field they're supposed to generate themselves (e.g.
  // participantSummary in S03). Distinguish the two by checking the mention
  // actually echoes something the participant said this turn, rather than
  // flagging every mention outright -- that flagged even an honest "the
  // participant just said: ..." log entry as a violation.
  const candidateFieldMention = decision.candidateFieldMention;
  if (contract.assistantMustNotSupply && candidateFieldMention && candidateFieldMention.field === contract.targetField) {
    const mentionedValue = String(candidateFieldMention.value ?? "").trim().toLowerCase();
    const participantSaid = (contract.lastParticipantMessage ?? "").trim().toLowerCase();
    const isHonestEcho = mentionedValue.length > 0 && participantSaid.length > 0 && (participantSaid.includes(mentionedValue) || mentionedValue.includes(participantSaid));
    if (!isHonestEcho) return { accepted: false, reason: "assistant_supplied_participant_owned_content" };
  }

  // keepCurrentNode is a type-level guarantee (z.literal(true)) that this
  // schema can never express "advance" -- checked again here defensively in
  // case a future schema change loosens that.
  if (decision.keepCurrentNode !== true) return { accepted: false, reason: "attempted_node_advance" };

  return { accepted: true };
}
