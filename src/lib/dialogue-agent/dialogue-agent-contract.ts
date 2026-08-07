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
  // Brief (1-2 sentence) "why this step matters" text, carried from
  // ClinicalStageNode.participantRationale when the node has one. Grounds
  // explain_rationale / handling "why are you asking this?" without Claude
  // inventing clinical justification of its own (Part 8).
  participantRationale: z.string().optional(),
  targetField: z.string().optional(),
  expectedConstruct: z.string().optional(),
  expectedInputType: expectedInputTypeSchema,
  choiceOptions: z.array(z.string()).optional(),
  participantOwned: z.boolean(),
  assistantMustNotSupply: z.boolean(),
  // True only when this session has a worksheet-edit affordance (currently
  // tbct-s03) -- lets Claude answer "can I change an earlier answer?"
  // honestly: point to the real edit path where one exists, or say plainly
  // that it isn't automated yet rather than promising a branch/fork the
  // runtime doesn't implement (branching/revision is explicitly deferred,
  // see dialogue-agent-orchestrator.ts).
  worksheetEditAvailable: z.boolean(),
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
  // Answers "why are you asking this?" / abstract-task confusion using
  // contract.participantRationale, then returns to the same unresolved task
  // -- distinct from explain_term (a construct definition) and clarify (a
  // repair of a misunderstood answer).
  "explain_rationale",
  // Reminds the participant of something they already confirmed earlier in
  // THIS node/session (e.g. "you said the thought was X") without re-asking
  // it -- the "restore_context" allowed-action already existed in
  // dialogue-contract-compiler.ts; this gives it a matching decision value.
  "restore_context",
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
  // Participant wants to correct an earlier answer ("I answered that
  // wrong", "can I go back?"). The branching/fork system Part 16 describes
  // is explicitly deferred -- this state exists so Claude can recognize and
  // respond to the request honestly (point to the real worksheet-edit path
  // when contract.worksheetEditAvailable, otherwise say plainly it isn't
  // automated yet) rather than silently mis-clarifying it as off_topic.
  "revision_request",
  "declines",
  "pause_request",
  "off_topic",
]);

export const visualActionSchema = z.enum(["none", "focus_field", "show_options", "restore_worksheet", "show_scale"]);

// Claude's own read of how much explanation this turn needed -- logged for
// QA (Part 26), and named explicitly in the system prompt so "never default
// to expanded" is something the model can self-report against, not just an
// unverifiable instruction. Does not gate anything deterministically; it is
// descriptive, not authoritative.
export const explanationDepthSchema = z.enum(["minimal", "standard", "expanded"]);

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
  explanationDepth: explanationDepthSchema.optional(),
  candidateFieldMention: z.object({ field: z.string(), value: z.unknown() }).optional(),
});
export type DialogueDecision = z.infer<typeof dialogueDecisionSchema>;

export type DialogueAgentResult =
  | { decision: DialogueDecision; provider: string; model?: string; latencyMs: number; failed: false }
  | { decision: DialogueDecision; provider: "none"; failed: true; failureReason: string };
