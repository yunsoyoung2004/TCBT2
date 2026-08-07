import type { DialogueAgentResult, DialogueContract, DialogueDecision } from "@/lib/dialogue-agent/dialogue-agent-contract";

// Deterministic stand-in for the real Anthropic dialogue agent
// (anthropic-dialogue-agent.ts) -- tests need a REALISTIC classifier (not
// just the constant "provider unavailable" fallback every call would hit in
// a jsdom test environment with no live network), so this applies simple
// keyword heuristics against the participant's message. It exists purely to
// verify the WIRING (runtime correctly logs/uses whatever comes back,
// deterministic engine ignores keepCurrentNode/participantResponseState for
// actual state decisions) -- it is not a substitute for judging real
// dialogue quality, which needs the live model (see the manual S03 QA pass).
export function fakeDialogueDecision(contract: DialogueContract): DialogueDecision {
  const message = (contract.lastParticipantMessage ?? "").trim();
  const lower = message.toLowerCase();

  if (!message) {
    return { responseType: "reflect_and_ask", patientFacingMessage: contract.currentTaskText, keepCurrentNode: true, participantResponseState: "valid_answer" };
  }
  if (/\b(what does .* mean|what do you mean|i don'?t understand|무슨 뜻|이해가 안)\b/i.test(lower)) {
    return {
      responseType: "clarify",
      patientFacingMessage: contract.expectedConstruct ? `By ${contract.targetField ?? "that"}, I mean ${contract.expectedConstruct} ${contract.currentTaskText}` : contract.currentTaskText,
      keepCurrentNode: true,
      participantResponseState: "question_not_understood",
      clarificationReason: "participant_asked_for_definition",
    };
  }
  if (/\b(where'?s the list|i don'?t see the (?:list|options)|missing|목록이 안|안 보여)\b/i.test(lower)) {
    return {
      responseType: "show_required_visual",
      patientFacingMessage: "You're right — let me show that again.",
      keepCurrentNode: true,
      participantResponseState: "missing_visual",
      visualAction: "restore_worksheet",
    };
  }
  if (/\bwhy (?:are you|do you) ask|why does this matter|왜 물어/i.test(lower)) {
    return {
      responseType: "repair",
      patientFacingMessage: `This helps us ${contract.therapeuticObjective.toLowerCase()} ${contract.currentTaskText}`,
      keepCurrentNode: true,
      participantResponseState: "participant_question",
    };
  }
  if (/\bpercent|score|number|scale\?/i.test(lower) && contract.scaleExplanation) {
    return {
      responseType: "explain_scale",
      patientFacingMessage: `${contract.scaleExplanation} ${contract.currentTaskText}`,
      keepCurrentNode: true,
      participantResponseState: "question_not_understood",
    };
  }
  if (/\bpause|stop for now|i need a break|잠깐만/i.test(lower)) {
    return { responseType: "acknowledge_pause", patientFacingMessage: "Of course — we can pause here.", keepCurrentNode: true, participantResponseState: "pause_request" };
  }
  return {
    responseType: "reflect_and_ask",
    patientFacingMessage: contract.currentTaskText,
    keepCurrentNode: true,
    participantResponseState: "valid_answer",
    candidateFieldMention: contract.targetField ? { field: contract.targetField, value: message } : undefined,
  };
}

export function dispatchFakeDialogueAgent(contract: DialogueContract): DialogueAgentResult {
  return { decision: fakeDialogueDecision(contract), provider: "mock", model: "dialogue-agent-fake", latencyMs: 0, failed: false };
}
