import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { RuntimePromptItem } from "@/types/protocol-runtime";
import type { RuntimeMessage, RuntimeSession } from "@/types/runtime-session";
import { getWorksheetBindings } from "@/lib/worksheet/worksheet-binding-registry";
import { resolvePromptLocaleText } from "@/lib/runtime/runtime-release-normalizer";
import { resolveBracketPlaceholders } from "@/lib/runtime/runtime-static-message";
import type { DialogueContract, ExpectedInputType } from "@/lib/dialogue-agent/dialogue-agent-contract";
import { dialogueContractSchema } from "@/lib/dialogue-agent/dialogue-agent-contract";
import type { WorksheetValueType } from "@/types/worksheet";

// Per-field plain-language grounding for the S03 pilot -- gives the dialogue
// agent something concrete to explain a term/scale WITH, rather than
// inventing an explanation. Sourced from the same clinical intent already
// encoded in TBCT_S03_BINDINGS' labels/sourceSection, not new content.
const S03_FIELD_TERMINOLOGY: Record<string, { term: string; meaning: string }> = {
  automaticThought: { term: "automatic thought", meaning: "the thought, interpretation, prediction, judgment, or meaning that went through your mind — not the feeling itself, and not a description of what happened." },
  primaryEmotion: { term: "emotion", meaning: "the feeling that came with the thought (e.g. anxious, sad, angry, ashamed) — not the thought and not what you did." },
  behavior: { term: "behavior", meaning: "what you actually did, or felt the urge to do, in response." },
  cognitiveDistortion: { term: "cognitive distortion", meaning: "the pattern this automatic thought seems to follow (e.g. mind-reading, catastrophizing, all-or-nothing thinking)." },
  evidenceFor: { term: "evidence for", meaning: "concrete facts that would support the automatic thought being true." },
  evidenceAgainst: { term: "evidence against", meaning: "concrete facts that don't fit, or contradict, the automatic thought." },
  balancedConclusion: { term: "balanced conclusion", meaning: "what the evidence on both sides actually adds up to, in your own words." },
  globalEvaluation: { term: "how am I now", meaning: "your own read on whether things feel the same, a little better, or much better after working through this." },
};

const PERCENT_SCALE_EXPLANATION = "0 means you don't believe or feel it at all, and 100 means you're completely certain or feeling it as strongly as possible.";

function expectedInputTypeFor(valueType: WorksheetValueType): ExpectedInputType {
  if (valueType === "percentage") return "percentage_0_100";
  if (valueType === "rating_0_5") return "integer_0_5";
  if (valueType === "boolean") return "yes_no";
  if (valueType === "choice") return "single_choice";
  if (valueType === "text_list" || valueType === "structured_list") return "ordered_list";
  return "free_text";
}

/** Reads canonical RuntimeContext.fields directly -- never chat text, never a
 * cached/stale copy -- so a worksheet edit is reflected in the very next
 * dialogue turn. The one-directional projection contract in
 * worksheet-projection.ts guarantees edits land here before anything else
 * runs, so this alone is sufficient (see that file's header for why). Only a
 * small, node-relevant slice is included, per the "compact contract" design. */
function confirmedStateFor(session: RuntimeSession, node: ClinicalStageNode, targetField: string | undefined) {
  const fields = session.runtimeContext.fields;
  const relevantKeys = new Set<string>([...node.requiredFields, "situation", "automaticThought", "primaryEmotion", "behavior"]);
  if (targetField) relevantKeys.add(targetField);
  const state: Record<string, unknown> = {};
  for (const key of relevantKeys) {
    if (fields[key] !== undefined && fields[key] !== "") state[key] = fields[key];
  }
  return state;
}

function choiceOptionsFor(promptItem: PromptItem) {
  const validation = promptItem.validation as { values?: unknown } | null | undefined;
  return Array.isArray(validation?.values) ? validation.values.map(String) : undefined;
}

export function compileDialogueContract(input: {
  session: RuntimeSession;
  node: ClinicalStageNode;
  sourcePromptItem: PromptItem;
  runtimePromptItem: RuntimePromptItem;
  lastParticipantMessage?: string;
  recentMessages: RuntimeMessage[];
  clarificationAttemptCount: number;
}): DialogueContract {
  const { session, node, sourcePromptItem, runtimePromptItem } = input;
  const targetField = sourcePromptItem.outputFields[0];
  const binding = getWorksheetBindings(session.sessionDefinitionId).find((item) => item.canonicalFieldKey === targetField);
  const terminology = targetField ? S03_FIELD_TERMINOLOGY[targetField] : undefined;
  const expectedInputType = binding ? expectedInputTypeFor(binding.valueType) : "free_text";

  const contract: DialogueContract = {
    sessionId: node.sessionId,
    nodeId: node.id,
    promptItemId: sourcePromptItem.id,
    roleId: runtimePromptItem.roleId,
    therapeuticObjective: node.objective || node.clinicalPurpose,
    // Bracket-resolved so Claude's grounding text (and a naive echo of it,
    // like the test fake's default reply) is never itself the source of an
    // unresolved-template rejection -- see the matching fix in
    // runtime-prompt-compiler.ts for why this class of bug is real, not
    // hypothetical (feedback v2 #5).
    currentTaskText: resolveBracketPlaceholders(resolvePromptLocaleText(runtimePromptItem.id, runtimePromptItem.fallbackPatientText, session.locale), session.runtimeContext),
    targetField,
    expectedConstruct: terminology?.meaning,
    expectedInputType,
    choiceOptions: expectedInputType === "single_choice" ? choiceOptionsFor(sourcePromptItem) : undefined,
    participantOwned: binding?.participantOwned ?? true,
    assistantMustNotSupply: binding?.assistantMustNotSupply ?? false,
    confirmedState: confirmedStateFor(session, node, targetField),
    allowedActions: [
      "brief_reflection",
      "ask_current_task",
      "clarify_current_task",
      "repair_misunderstanding",
      "restore_context",
      "explain_term",
      "explain_scale",
      "request_missing_field",
    ],
    forbiddenActions: [
      "advance_protocol",
      "supply_participant_answer",
      "diagnose",
      "give_new_treatment_advice",
      "introduce_new_exercise",
    ],
    relevantTerminology: terminology ? [terminology] : undefined,
    scaleExplanation: expectedInputType === "percentage_0_100" ? PERCENT_SCALE_EXPLANATION : undefined,
    lastParticipantMessage: input.lastParticipantMessage,
    recentContext: input.recentMessages
      .filter((message): message is RuntimeMessage & { role: "patient" | "assistant" } => message.role === "patient" || message.role === "assistant")
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content.slice(0, 400) })),
    safetyStatus: session.status,
    locale: session.locale,
    clarificationAttemptCount: input.clarificationAttemptCount,
  };

  return dialogueContractSchema.parse(contract);
}
