import { describe, it } from "vitest";
import { createCanonicalTestRuntimeSession, getRuntimeSession } from "@/lib/api/runtime-session-api";
import { startRuntimeSession, submitPatientInput } from "@/lib/api/runtime-execution-api";
import { syntheticPatientInput } from "@/lib/runtime/testing/session-fidelity-fixtures";

describe("debug s07", () => {
  it("prints every turn", async () => {
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "mock";
    const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId: "tbct-s07", patientAlias: "Debug", locale: "en-US" });
    await startRuntimeSession(session.id);
    for (let i = 0; i < 40; i += 1) {
      const view = await getRuntimeSession(session.id);
      if (!view) throw new Error("gone");
      if (view.session.status === "completed") { console.log("COMPLETED"); break; }
      if (view.session.status !== "waiting_for_input") { console.log(`STATUS=${view.session.status} node=${view.session.currentNodeId} prompt=${view.session.currentPromptItemId}`); break; }
      const prompt = view.currentPromptItem;
      if (!prompt) { console.log("no prompt"); break; }
      const input = syntheticPatientInput(prompt);
      console.log(`>>> before #${i}: status=${view.session.status} version=${view.session.version} pendingTurnId=${(view.session as any).pendingTurnId} lastCompletedTurnId=${(view.session as any).lastCompletedTurnId}`);
      const result = await submitPatientInput(session.id, input, { clientTurnId: `dbg-${i}`, expectedSessionVersion: view.session.version ?? 0 });
      console.log(`#${i} prompt=${prompt.id} input=${JSON.stringify(input.value)} outcome=${result.turnOutcome} status=${result.sessionStatus} fields.emotionReasonDialogue=${JSON.stringify(result.stateExtraction?.fields?.emotionReasonDialogue)} count=${result.stateExtraction?.fields?.emotionReasonDialogueCount} sufficient=${result.stateExtraction?.fields?.emotionReasonDialogueSufficient}`);
      if (result.turnOutcome === "rejected_duplicate" || result.turnOutcome === "clarification") break;
    }
    if (previousProvider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previousProvider;
  });
});
