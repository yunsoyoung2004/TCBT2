import { z } from "zod";

// The node-scoped contract sent TO the dialogue agent every turn. Compact by
// design (see compileDialogueContract) -- never the whole protocol, never
// every prompt in the session, just what's needed to phrase THIS turn well.
// This is data for Claude to read, never instructions Claude can act on to
// change runtime state: everything the deterministic engine owns (session,
// node, transitions, completion, safety, persistence) stays outside this
// contract's write surface entirely -- Claude only ever returns a
// DialogueDecision (below), which the runtime treats as a communication
// suggestion, not a state change.
export const expectedInputTypeSchema = z.enum([
  "free_text",
  "integer_0_5",
  "percentage_0_100",
  "yes_no",
  "single_choice",
  "multi_choice",
  "ordered_list",
]);
export type ExpectedInputType = z.infer<typeof expectedInputTypeSchema>;

export const dialogueContractSchema = z.object({
  sessionId: z.string(),
  nodeId: z.string(),
  promptItemId: z.string(),
  roleId: z.string(),
  therapeuticObjective: z.string(),
  currentTaskText: z.string(),
  targetField: z.string().optional(),
  expectedConstruct: z.string().optional(),
  expectedInputType: expectedInputTypeSchema,
  choiceOptions: z.array(z.string()).optional(),
  participantOwned: z.boolean(),
  assistantMustNotSupply: z.boolean(),
  confirmedState: z.record(z.unknown()),
  allowedActions: z.array(z.string()),
  forbiddenActions: z.array(z.string()),
  relevantTerminology: z.array(z.object({ term: z.string(), meaning: z.string() })).optional(),
  scaleExplanation: z.string().optional(),
  lastParticipantMessage: z.string().optional(),
  recentContext: z.array(z.object({ role: z.enum(["patient", "assistant"]), content: z.string() })),
  safetyStatus: z.string(),
  locale: z.string(),
  clarificationAttemptCount: z.number().int().min(0),
});
export type DialogueContract = z.infer<typeof dialogueContractSchema>;

export const dialogueResponseTypeSchema = z.enum([
  "acknowledge",
  "reflect_and_ask",
  "clarify",
  "repair",
  "request_missing_field",
  "explain_term",
  "explain_scale",
  "show_required_visual",
  "acknowledge_pause",
]);

export const participantResponseStateSchema = z.enum([
  "valid_answer",
  "partial_answer",
  "wrong_construct",
  "question_not_understood",
  "missing_visual",
  "missing_context",
  "participant_question",
  "duplicate_answer",
  "declines",
  "pause_request",
  "off_topic",
]);

export const visualActionSchema = z.enum(["none", "focus_field", "show_options", "restore_worksheet", "show_scale"]);

// candidateFieldMention is explicitly NOT authoritative clinical extraction --
// extractRuntimeState (runtime-context.ts) remains the only writer of
// RuntimeContext.fields. This is here so Claude's own read of "what did the
// participant seem to say" can be logged and compared against the real
// extraction for QA, never substituted for it.
export const dialogueDecisionSchema = z.object({
  responseType: dialogueResponseTypeSchema,
  patientFacingMessage: z.string().min(1).max(700),
  keepCurrentNode: z.literal(true),
  targetField: z.string().optional(),
  participantResponseState: participantResponseStateSchema,
  visualAction: visualActionSchema.optional(),
  clarificationReason: z.string().optional(),
  candidateFieldMention: z.object({ field: z.string(), value: z.unknown() }).optional(),
});
export type DialogueDecision = z.infer<typeof dialogueDecisionSchema>;

export type DialogueAgentResult =
  | { decision: DialogueDecision; provider: string; model?: string; latencyMs: number; failed: false }
  | { decision: DialogueDecision; provider: "none"; failed: true; failureReason: string };
