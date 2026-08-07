import type { ClinicalStageNode, PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { RuntimePromptItem } from "@/types/protocol-runtime";
import type { RuntimeMessage, RuntimeSession } from "@/types/runtime-session";
import { getWorksheetBindings, hasWorksheetBindings } from "@/lib/worksheet/worksheet-binding-registry";
import { resolvePromptLocaleText } from "@/lib/runtime/runtime-release-normalizer";
import { resolveBracketPlaceholders } from "@/lib/runtime/runtime-static-message";
import type { DialogueContract, ExpectedInputType } from "@/lib/dialogue-agent/dialogue-agent-contract";
import { dialogueContractSchema } from "@/lib/dialogue-agent/dialogue-agent-contract";
import type { WorksheetValueType } from "@/types/worksheet";

// Pattern-based, session-agnostic construct terminology. Keyed by field-NAME
// shape rather than an exact per-session map, because the same construct
// (thought/emotion/behavior/distortion) recurs under different field names
// in different sessions -- S03's "automaticThought" vs S01's
// "candidateOneThought"/"personalThoughtEmotionLink". Order matters: more
// specific patterns (EvidenceFor/EvidenceAgainst/Conclusion/Distortion) are
// checked before the generic Thought/Emotion/Behavior ones so e.g.
// "balancedConclusion" doesn't fall through to nothing. Content is a
// paraphrase of clinical intent already present elsewhere in the catalog
// (S03_FIELD_TERMINOLOGY's prior wording, kept), not new clinical claims.
const CONSTRUCT_TERMINOLOGY_PATTERNS: Array<{ pattern: RegExp; term: string; meaning: string }> = [
  { pattern: /EvidenceFor/i, term: "evidence for", meaning: "concrete facts that would support the thought being true." },
  { pattern: /EvidenceAgainst/i, term: "evidence against", meaning: "concrete facts that don't fit, or contradict, the thought." },
  { pattern: /BalancedConclusion|Conclusion/i, term: "balanced conclusion", meaning: "what the evidence on both sides actually adds up to, in your own words." },
  { pattern: /GlobalEvaluation/i, term: "how am I now", meaning: "your own read on whether things feel the same, a little better, or much better after working through this." },
  { pattern: /Distortion/i, term: "cognitive distortion", meaning: "the pattern an automatic thought seems to follow (e.g. mind-reading, catastrophizing, all-or-nothing thinking)." },
  { pattern: /Thought/i, term: "automatic thought", meaning: "the thought, interpretation, prediction, judgment, or meaning that went through someone's mind — not the feeling itself, and not a description of what happened." },
  { pattern: /Emotion/i, term: "emotion", meaning: "the feeling that came with the thought (e.g. anxious, sad, angry, ashamed) — not the thought and not what someone did." },
  { pattern: /Behavior/i, term: "behavior", meaning: "what someone actually did, or felt the urge to do, in response." },
  { pattern: /BodySensations/i, term: "body sensations", meaning: "physical feelings noticed in the body at the time, like a racing heart or tight chest." },
  { pattern: /^problems?$/i, term: "problem", meaning: "something currently going on that's causing distress or getting in the way." },
  { pattern: /^goals?$/i, term: "goal", meaning: "something you'd like to be different or achieve going forward." },
  { pattern: /Summary/i, term: "summary", meaning: "a short restatement, in your own words, of what's been covered so far." },
];

const PERCENT_SCALE_EXPLANATION = "0 means you don't believe or feel it at all, and 100 means you're completely certain or feeling it as strongly as possible.";
const FIVE_POINT_SCALE_EXPLANATION = "0 means it barely bothers you or barely matters, and 5 means it's as intense or as important as it gets.";

// Field names ending in one of these are internal delivery-tracking flags
// ("did we finish showing this passage", "is the card available"), not
// clinical content a participant authors -- see the file-level note on why
// every OTHER field defaults to participantOwned + assistantMustNotSupply
// (conservative: never let Claude invent clinical content unless a field is
// clearly just a logistics gate).
const ADMINISTRATIVE_FIELD_PATTERN = /(?:Acknowledged|Complete|Available|Presented|Mode)$/;

function ownershipFor(targetField: string | undefined): { participantOwned: boolean; assistantMustNotSupply: boolean } {
  if (targetField && ADMINISTRATIVE_FIELD_PATTERN.test(targetField)) return { participantOwned: false, assistantMustNotSupply: false };
  return { participantOwned: true, assistantMustNotSupply: true };
}

function expectedInputTypeFromValueType(valueType: WorksheetValueType): ExpectedInputType {
  if (valueType === "percentage") return "percentage_0_100";
  if (valueType === "rating_0_5") return "integer_0_5";
  if (valueType === "boolean") return "yes_no";
  if (valueType === "choice") return "single_choice";
  if (valueType === "text_list" || valueType === "structured_list") return "ordered_list";
  return "free_text";
}

/** Generic fallback used for any session without a reviewed worksheet
 * binding registry entry for this field (today: everything except tbct-s03)
 * -- derives the expected control from the PromptItem's own validation spec,
 * the same source runtime-context.ts's deterministic extraction already
 * reads, so this never invents a control shape the runtime doesn't also
 * expect. */
function expectedInputTypeFromValidation(validation: Record<string, unknown> | null | undefined): ExpectedInputType {
  const kind = typeof validation?.kind === "string" ? validation.kind : undefined;
  const max = typeof validation?.max === "number" ? validation.max : undefined;
  if (kind === "boolean" || kind === "safety_check") return "yes_no";
  if (kind === "enum") return "single_choice";
  if (kind === "rating") return max === 100 ? "percentage_0_100" : "integer_0_5";
  if (kind === "array" || kind === "min_items" || kind === "private_placeholder_labels") return "ordered_list";
  return "free_text";
}

/** Reads canonical RuntimeContext.fields directly -- never chat text, never a
 * cached/stale copy -- so a worksheet edit is reflected in the very next
 * dialogue turn. Always includes the current node's own requiredFields and
 * the active targetField; additionally includes every worksheet-bound field
 * (when this session has a worksheet registry, currently tbct-s03) because
 * those are precisely the fields an edit can make stale for a LATER node
 * that didn't itself capture them -- this generalizes what used to be a
 * hardcoded 4-field S03 list to whatever the reviewed binding registry
 * actually covers, for any session that has one. */
function confirmedStateFor(session: RuntimeSession, node: ClinicalStageNode, targetField: string | undefined) {
  const fields = session.runtimeContext.fields;
  const relevantKeys = new Set<string>(node.requiredFields);
  if (targetField) relevantKeys.add(targetField);
  if (hasWorksheetBindings(session.sessionDefinitionId)) {
    for (const binding of getWorksheetBindings(session.sessionDefinitionId)) relevantKeys.add(binding.canonicalFieldKey);
  }
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

function terminologyFor(targetField: string | undefined, expectedInputType: ExpectedInputType) {
  if (!targetField || expectedInputType === "yes_no" || expectedInputType === "integer_0_5" || expectedInputType === "percentage_0_100") return undefined;
  return CONSTRUCT_TERMINOLOGY_PATTERNS.find((entry) => entry.pattern.test(targetField));
}

function scaleExplanationFor(expectedInputType: ExpectedInputType) {
  if (expectedInputType === "percentage_0_100") return PERCENT_SCALE_EXPLANATION;
  if (expectedInputType === "integer_0_5") return FIVE_POINT_SCALE_EXPLANATION;
  return undefined;
}

export function compileDialogueContract(input: {
  session: RuntimeSession;
  node: ClinicalStageNode;
  sourcePromptItem: PromptItem;
  runtimePromptItem: RuntimePromptItem;
  lastParticipantMessage?: string;
  recentMessages: RuntimeMessage[];
  clarificationAttemptCount: number;
  /** Overrides the default fallbackPatientText-derived grounding text with
   * whatever the deterministic layer actually resolved for THIS turn
   * (resolveStaticPatientMessage's contextual/branch-specific approved
   * text when the caller is the normal "ask" path) -- see
   * runtime-orchestrator.ts. Omitted callers (the clarification path) keep
   * the previous fallbackPatientText-only computation, which is already
   * correct there since a clarification's grounding is still "the original
   * question," not the clarification wording itself. */
  currentTaskTextOverride?: string;
}): DialogueContract {
  const { session, node, sourcePromptItem, runtimePromptItem } = input;
  const targetField = sourcePromptItem.outputFields[0];
  const binding = getWorksheetBindings(session.sessionDefinitionId).find((item) => item.canonicalFieldKey === targetField);
  const expectedInputType = binding ? expectedInputTypeFromValueType(binding.valueType) : expectedInputTypeFromValidation(sourcePromptItem.validation);
  const ownership = binding ? { participantOwned: binding.participantOwned, assistantMustNotSupply: binding.assistantMustNotSupply } : ownershipFor(targetField);
  const terminology = terminologyFor(targetField, expectedInputType);

  const contract: DialogueContract = {
    sessionId: node.sessionId,
    nodeId: node.id,
    promptItemId: sourcePromptItem.id,
    roleId: runtimePromptItem.roleId,
    therapeuticObjective: node.objective || node.clinicalPurpose,
    participantRationale: node.participantRationale,
    // Bracket-resolved so Claude's grounding text (and a naive echo of it,
    // like the test fake's default reply) is never itself the source of an
    // unresolved-template rejection -- see the matching fix in
    // runtime-prompt-compiler.ts for why this class of bug is real, not
    // hypothetical (feedback v2 #5).
    currentTaskText: resolveBracketPlaceholders(
      input.currentTaskTextOverride ?? resolvePromptLocaleText(runtimePromptItem.id, runtimePromptItem.fallbackPatientText, session.locale),
      session.runtimeContext,
    ),
    targetField,
    expectedConstruct: terminology?.meaning,
    expectedInputType,
    choiceOptions: expectedInputType === "single_choice" ? choiceOptionsFor(sourcePromptItem) : undefined,
    participantOwned: ownership.participantOwned,
    assistantMustNotSupply: ownership.assistantMustNotSupply,
    worksheetEditAvailable: hasWorksheetBindings(session.sessionDefinitionId),
    confirmedState: confirmedStateFor(session, node, targetField),
    allowedActions: [
      "brief_reflection",
      "ask_current_task",
      "clarify_current_task",
      "repair_misunderstanding",
      "restore_context",
      "explain_term",
      "explain_scale",
      "explain_rationale",
      "request_missing_field",
    ],
    forbiddenActions: [
      "advance_protocol",
      "supply_participant_answer",
      "diagnose",
      "give_new_treatment_advice",
      "introduce_new_exercise",
      "fork_or_edit_history",
    ],
    relevantTerminology: terminology ? [terminology] : undefined,
    scaleExplanation: scaleExplanationFor(expectedInputType),
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
