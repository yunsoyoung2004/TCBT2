import { dialogueContractSchema, dialogueDecisionSchema, type DialogueAgentResult, type DialogueContract } from "@/lib/dialogue-agent/dialogue-agent-contract";
import { redactDirectIdentifiers } from "@/lib/assessment/privacy-redaction";
import { recordModelUsage } from "@/lib/assessment/model-observability";

const DEFAULT_MODEL = "claude-sonnet-5";

function localeInstruction(locale: string) {
  const lower = locale.toLowerCase();
  if (lower.startsWith("ko")) return "Write patientFacingMessage in Korean (Hangul). Do not respond in English.";
  if (lower.startsWith("pt")) return "Write patientFacingMessage in Portuguese.";
  if (lower.startsWith("fr")) return "Write patientFacingMessage in French.";
  if (lower.startsWith("ja")) return "Write patientFacingMessage in Japanese.";
  return "Write patientFacingMessage in English.";
}

function deterministicFallbackDecision(contract: DialogueContract): import("@/lib/dialogue-agent/dialogue-agent-contract").DialogueDecision {
  return {
    responseType: "reflect_and_ask",
    patientFacingMessage: contract.currentTaskText,
    keepCurrentNode: true,
    participantResponseState: "valid_answer",
  };
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["responseType", "patientFacingMessage", "keepCurrentNode", "participantResponseState"],
  properties: {
    responseType: { type: "string", enum: ["acknowledge", "reflect_and_ask", "clarify", "repair", "request_missing_field", "explain_term", "explain_scale", "explain_rationale", "restore_context", "show_required_visual", "acknowledge_pause"] },
    patientFacingMessage: { type: "string", minLength: 1, maxLength: 700 },
    keepCurrentNode: { type: "boolean", enum: [true] },
    targetField: { type: "string" },
    participantResponseState: { type: "string", enum: ["valid_answer", "partial_answer", "wrong_construct", "question_not_understood", "missing_visual", "missing_context", "participant_question", "duplicate_answer", "revision_request", "declines", "pause_request", "off_topic"] },
    visualAction: { type: "string", enum: ["none", "focus_field", "show_options", "restore_worksheet", "show_scale"] },
    clarificationReason: { type: "string" },
    explanationDepth: { type: "string", enum: ["minimal", "standard", "expanded"] },
    candidateFieldMention: { type: "object", additionalProperties: false, required: ["field", "value"], properties: { field: { type: "string" }, value: {} } },
  },
} as const;

function systemPrompt(contract: DialogueContract) {
  const lines = [
    "You are the conversational voice of a TBCT (Trial-Based Cognitive Therapy) protocol-bounded dialogue agent.",
    "You do not replace a human therapist and you do not decide clinical state.",
    "A separate deterministic engine owns: session/node progression, field completion, safety decisions, and DB persistence. You cannot change any of those -- you only decide how to phrase this one turn.",
    localeInstruction(contract.locale),
    `Therapeutic objective for this step: ${contract.therapeuticObjective}`,
    `The approved current task (use as your grounding, may paraphrase naturally but must not change its clinical meaning): ${contract.currentTaskText}`,
    contract.participantRationale ? `Why this step matters, if the participant asks or seems confused (use explain_rationale, 1-2 sentences, do not lecture): ${contract.participantRationale}` : "",
    contract.expectedConstruct ? `Expected construct for ${contract.targetField}: ${contract.expectedConstruct}` : "",
    contract.scaleExplanation ? `Scale meaning if asked: ${contract.scaleExplanation}` : "",
    contract.participantOwned ? "This field's value must come from the participant, in their own words." : "",
    contract.assistantMustNotSupply ? "You must NEVER supply, suggest, or complete this field's value yourself -- only the participant may state it." : "",
    contract.isFirstPromptOfSession
      ? "This is the very first message the participant will see in this whole session. Before the current task, add one short, warm welcome sentence naming (in plain, everyday language, not clinical jargon) what today's session will focus on -- ground it in the therapeutic objective above, do not invent detail beyond it. Then move naturally into the current task."
      : contract.isFirstPromptOfNode
        ? contract.isRoleTransitionPrompt
          ? "The participant is moving into a step that involves switching roles or speaking from a different perspective (e.g. voicing another person's likely thoughts, or moving between two internal 'parts'/chairs). Before the current task, add one short sentence that plainly names this switch -- e.g. what role/perspective they're about to speak from or move into -- grounded in the therapeutic objective above, so they aren't caught off guard. Then give the current task."
          : "The participant is moving into a new part of the session (they've already been through earlier parts). Before the current task, add one short sentence letting them know you're moving into the next part and, grounded in the therapeutic objective above, briefly what it involves. Then give the current task."
        : "",
    (contract.isFirstPromptOfSession || contract.isFirstPromptOfNode)
      ? "This transition framing is NOT a separate question -- do not end your message on a standalone yes/no readiness check by itself. Always end with the actual current task, so the participant's next reply answers that task, not a rhetorical 'ready?' checkpoint."
      : "",
    `Confirmed state so far (use to make transitions natural -- e.g. reference a value the participant already gave -- but do not recite all of it): ${JSON.stringify(contract.confirmedState)}`,
    `Allowed actions: ${contract.allowedActions.join(", ")}.`,
    `Forbidden actions: ${contract.forbiddenActions.join(", ")}.`,
    "Never diagnose, never give treatment advice outside this protocol, never mention runtime/node/session internals, never claim you are an AI.",
    "keepCurrentNode must always be true -- you never decide the step is complete; the deterministic engine does that from the participant's actual answer.",
    "candidateFieldMention is your own read of what the participant seems to be saying, for logging only -- it is never treated as the authoritative extracted value.",
    "",
    "How to read the participant's last message before responding:",
    "- If they answered a different construct than expected (e.g. named an emotion when a thought was asked for), do not say 'that's wrong' and do not restart the question sequence. Name what they gave in one clause, distinguish it from what's being asked, and ask again in the same breath. Example: 'Anxiety sounds like the emotion you noticed. Here I'm looking for the thought that went through your mind -- what did you find yourself thinking?' Use responseType 'repair', participantResponseState 'wrong_construct'.",
    "- If they gave part of what's needed (e.g. named the feeling but not its intensity), do not re-ask the whole thing. Ask only for the missing piece. Use responseType 'request_missing_field', participantResponseState 'partial_answer'.",
    "- If they answered with words instead of the expected number (e.g. 'pretty scared' when 0-100 was expected), acknowledge what they said in a few words, then ask for the number using the scale meaning above. Do not just repeat the original question verbatim.",
    "- If they ask a process question ('why are you asking this', 'what does this mean', 'what am I supposed to write') answer briefly using the objective/rationale/construct above, then return to the exact same unresolved task. Do not treat the process question as having answered the task.",
    "- If they say they can't see a list, options, or the worksheet, do not advance -- use responseType 'show_required_visual' with the matching visualAction so the UI restores it.",
    "- If they say they answered something earlier incorrectly or want to change a past answer, respond naturally and honestly: point them to the worksheet edit control if worksheetEditAvailable is true (their edit becomes canonical automatically), or say plainly that changing an earlier answer isn't automated in this conversation yet if it is false. Never promise a branch/redo the runtime doesn't support. Use participantResponseState 'revision_request'.",
    "- If they gave a clearly sufficient, on-construct answer, keep your response brief: a short transition (optionally one clause referencing what they just said) and the current task -- no example, no extra explanation. Use explanationDepth 'minimal'.",
    "- Only escalate to explanationDepth 'expanded' (a short definition, and at most one neutral example) when they are explicitly confused, ask what something means, or this is a genuinely unfamiliar/abstract task and no rationale has been given yet in this exchange. Never default to 'expanded'. Prefer 'standard' (one concise clarifying sentence, then the task) over 'expanded' when in doubt.",
    "- Do not open with stock filler like 'Thank you for sharing', 'That's a great example', or 'I appreciate your honesty' on every turn -- use at most one short acknowledgement clause, and only when it aids continuity, followed by the current task.",
    "Return your decision using the submit_dialogue_decision tool only.",
  ].filter(Boolean);
  return lines.join("\n");
}

export async function generateDialogueDecision(contract: DialogueContract, context: { sessionId: string; turnId: string }): Promise<DialogueAgentResult> {
  const parsedContract = dialogueContractSchema.parse(contract);
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  if (!apiKey) {
    return { decision: deterministicFallbackDecision(parsedContract), provider: "none", failed: true, failureReason: "Missing ANTHROPIC_API_KEY" };
  }
  const maxTokens = Number(process.env.ANTHROPIC_DIALOGUE_MAX_TOKENS ?? 500);
  const timeoutMs = Number(process.env.ANTHROPIC_TIMEOUT_MS ?? 15000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  // The patient-turn invariant (section 12): never more than one dialogue
  // call per participant turn. A transport failure or invalid schema falls
  // straight to the deterministic fallback below -- it does NOT retry with
  // a second call for the same turn.
  try {
    const userPayload = {
      ...parsedContract,
      lastParticipantMessage: parsedContract.lastParticipantMessage ? redactDirectIdentifiers(parsedContract.lastParticipantMessage) : undefined,
      recentContext: parsedContract.recentContext.map((message) => ({ ...message, content: redactDirectIdentifiers(message.content) })),
    };
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt(parsedContract),
        messages: [{ role: "user", content: [{ type: "text", text: JSON.stringify(userPayload) }] }],
        tools: [{ name: "submit_dialogue_decision", description: "Submit the single structured dialogue decision for this turn.", input_schema: RESPONSE_SCHEMA }],
        tool_choice: { type: "tool", name: "submit_dialogue_decision", disable_parallel_tool_use: true },
      }),
    });
    if (!response.ok) throw new Error(`Anthropic dialogue agent failed (${response.status})`);
    const json = (await response.json()) as { content?: Array<{ type?: string; name?: string; input?: unknown }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const toolInput = json.content?.find((item) => item.type === "tool_use" && item.name === "submit_dialogue_decision")?.input;
    if (!toolInput) throw new Error("Anthropic omitted the structured dialogue decision");
    const decision = dialogueDecisionSchema.parse(toolInput);
    recordModelUsage({ sessionId: context.sessionId, turnId: context.turnId, provider: "anthropic", model, purpose: "dialogue_agent", llmCalled: true, inputTokens: json.usage?.input_tokens ?? null, outputTokens: json.usage?.output_tokens ?? null, totalTokens: json.usage?.input_tokens !== undefined && json.usage.output_tokens !== undefined ? json.usage.input_tokens + json.usage.output_tokens : null, latencyMs: Math.round(performance.now() - started), retryCount: 0, cacheStatus: "none", estimatedCost: null, success: true });
    return { decision, provider: "anthropic", model, latencyMs: Math.round(performance.now() - started), failed: false };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "dialogue agent failed";
    recordModelUsage({ sessionId: context.sessionId, turnId: context.turnId, provider: "anthropic", model, purpose: "dialogue_agent", llmCalled: true, inputTokens: null, outputTokens: null, totalTokens: null, latencyMs: Math.round(performance.now() - started), retryCount: 0, cacheStatus: "none", estimatedCost: null, success: false, failureReason });
    return { decision: deterministicFallbackDecision(parsedContract), provider: "none", failed: true, failureReason };
  } finally {
    clearTimeout(timeout);
  }
}
