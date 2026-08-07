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
    responseType: { type: "string", enum: ["acknowledge", "reflect_and_ask", "clarify", "repair", "request_missing_field", "explain_term", "explain_scale", "show_required_visual", "acknowledge_pause"] },
    patientFacingMessage: { type: "string", minLength: 1, maxLength: 700 },
    keepCurrentNode: { type: "boolean", enum: [true] },
    targetField: { type: "string" },
    participantResponseState: { type: "string", enum: ["valid_answer", "partial_answer", "wrong_construct", "question_not_understood", "missing_visual", "missing_context", "participant_question", "duplicate_answer", "declines", "pause_request", "off_topic"] },
    visualAction: { type: "string", enum: ["none", "focus_field", "show_options", "restore_worksheet", "show_scale"] },
    clarificationReason: { type: "string" },
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
    contract.expectedConstruct ? `Expected construct for ${contract.targetField}: ${contract.expectedConstruct}` : "",
    contract.scaleExplanation ? `Scale meaning if asked: ${contract.scaleExplanation}` : "",
    contract.participantOwned ? "This field's value must come from the participant, in their own words." : "",
    contract.assistantMustNotSupply ? "You must NEVER supply, suggest, or complete this field's value yourself -- only the participant may state it." : "",
    `Allowed actions: ${contract.allowedActions.join(", ")}.`,
    `Forbidden actions: ${contract.forbiddenActions.join(", ")}.`,
    "Never diagnose, never give treatment advice outside this protocol, never mention runtime/node/session internals, never claim you are an AI.",
    "keepCurrentNode must always be true -- you never decide the step is complete; the deterministic engine does that from the participant's actual answer.",
    "candidateFieldMention is your own read of what the participant seems to be saying, for logging only -- it is never treated as the authoritative extracted value.",
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
