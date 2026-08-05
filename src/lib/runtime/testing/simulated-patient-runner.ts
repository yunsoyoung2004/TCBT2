import { createCanonicalTestRuntimeSession, getRuntimeSession } from "@/lib/api/runtime-session-api";
import { startRuntimeSession, submitPatientInput } from "@/lib/api/runtime-execution-api";
import { syntheticPatientInput } from "@/lib/runtime/testing/session-fidelity-fixtures";
import type { TurnFidelityResult } from "@/types/runtime-session";

export type SessionFidelityAudit = {
  sessionId: string;
  runtimeSessionId: string;
  releaseId: string;
  patientTurns: number;
  programTurns: number;
  promptItemsExecuted: string[];
  promptItemsSkipped: string[];
  fallbackCount: number;
  repairCount: number;
  providerErrorCount: number;
  clarificationCount: number;
  safetyOverrideCount: number;
  expectedFields: string[];
  capturedFields: string[];
  missingFields: string[];
  finalState: string;
  fidelity: TurnFidelityResult[];
  result: "pass" | "partial" | "fail";
  reasons: string[];
};

export async function runSimulatedPatientSession(sessionDefinitionId: string, maxTurns = 400): Promise<SessionFidelityAudit> {
  const previousProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "mock";
  try {
    const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId, patientAlias: `Synthetic ${sessionDefinitionId}`, locale: "en-US" });
    await startRuntimeSession(session.id);
    let patientTurns = 0;
    const executed = new Set<string>();
    while (patientTurns < maxTurns) {
      const view = await getRuntimeSession(session.id);
      if (!view) throw new Error(`Session ${session.id} disappeared during audit.`);
      if (view.session.status === "completed") break;
      if (view.session.status !== "waiting_for_input") throw new Error(`Unexpected session status ${view.session.status}.`);
      const prompt = view.currentPromptItem;
      if (!prompt) throw new Error("Waiting session has no active PromptItem.");
      executed.add(prompt.id);
      let result;
      try {
        result = await submitPatientInput(session.id, syntheticPatientInput(prompt), {
          clientTurnId: `${sessionDefinitionId}-turn-${patientTurns + 1}`,
          expectedSessionVersion: view.session.version ?? 0,
        });
      } catch (error) {
        throw new Error(`${sessionDefinitionId}/${prompt.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
      patientTurns += 1;
      if (result.turnOutcome === "clarification" || result.turnOutcome === "fallback" || result.turnOutcome === "safety_override" || result.turnOutcome === "rejected_duplicate") {
        throw new Error(`${prompt.id} produced ${result.turnOutcome}.`);
      }
    }
    const finalView = await getRuntimeSession(session.id);
    if (!finalView) throw new Error("Completed session could not be reloaded.");
    const traces = await (await import("@/lib/db/tbct-local-db")).getLocalDb().runtimeExecutionTraces.where("runtimeSessionId").equals(session.id).toArray();
    const providerEvents = finalView.providerEvents;
    const assistantMessages = finalView.messages.filter((message) => message.role === "assistant");
    const normalPrompts = finalView.promptItems.filter((prompt) => prompt.sessionId === finalView.session.sessionDefinitionId && !prompt.nodeId.endsWith("safety-pause"));
    const expectedFields = [...new Set(normalPrompts.flatMap((prompt) => prompt.outputFields))];
    const capturedFields = Object.keys(finalView.session.runtimeContext.fields);
    const missingFields = expectedFields.filter((field) => !capturedFields.includes(field) && normalPrompts.some((prompt) => executed.has(prompt.id) && prompt.outputFields.includes(field)));
    const fallbackCount = traces.filter((trace) => trace.fallbackUsed).length;
    const providerErrorCount = providerEvents.filter((event) => Boolean(event.error)).length;
    const clarificationCount = assistantMessages.filter((message) => message.metadata?.turnOutcome === "clarification").length;
    const safetyOverrideCount = assistantMessages.filter((message) => message.metadata?.turnOutcome === "safety_override").length;
    const fidelity = traces.map((trace) => trace.fidelity);
    const reasons: string[] = [];
    if (finalView.session.status !== "completed") reasons.push(`Final status is ${finalView.session.status}.`);
    if (fallbackCount) reasons.push(`${fallbackCount} fallback turn(s) were used.`);
    if (providerErrorCount) reasons.push(`${providerErrorCount} provider error(s) occurred.`);
    if (missingFields.length) reasons.push(`Missing fields: ${missingFields.join(", ")}.`);
    if (fidelity.some((item) => item.safetyFidelity === "critical_fail" || item.activePromptFidelity === "fail" || item.sequenceFidelity === "fail" || item.roleFidelity === "fail" || item.languageFidelity === "fail" || item.transitionFidelity === "fail")) reasons.push("One or more deterministic fidelity dimensions failed.");
    const result = reasons.length === 0 ? "pass" : finalView.session.status === "completed" ? "partial" : "fail";
    return {
      sessionId: sessionDefinitionId, runtimeSessionId: session.id, releaseId: finalView.release.id, patientTurns,
      programTurns: assistantMessages.length, promptItemsExecuted: [...executed], promptItemsSkipped: finalView.session.skippedPromptItemIds ?? [],
      fallbackCount, repairCount: 0, providerErrorCount, clarificationCount, safetyOverrideCount, expectedFields, capturedFields, missingFields,
      finalState: finalView.session.status, fidelity, result, reasons,
    };
  } finally {
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
  }
}

export async function runSessions01To08Audit() {
  const reports: SessionFidelityAudit[] = [];
  for (let number = 1; number <= 8; number += 1) reports.push(await runSimulatedPatientSession(`tbct-s${String(number).padStart(2, "0")}`));
  return reports;
}
