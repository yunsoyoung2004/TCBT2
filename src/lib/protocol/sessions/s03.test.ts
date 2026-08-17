import { beforeEach, describe, expect, it } from "vitest";
import { createCanonicalTestRuntimeSession, getRuntimeSession } from "@/lib/api/runtime-session-api";
import { startRuntimeSession, submitPatientInput } from "@/lib/api/runtime-execution-api";
import { getLocalDb } from "@/lib/db/tbct-local-db";

// TBCT S01-S03 정상 발화 오인 수정 (2026-08-17 fidelity pass), S03 section.
// Regression coverage for P0-3 (orientation no longer forces/rejects patient
// input), P0-6 (negated/historical/third-party safety mentions get a
// clarifying question instead of the immediate crisis route, while a genuine
// current disclosure still does), and P1-2 (situation/thought/emotion stay
// in their own fields, never bleeding into each other).

async function current(sessionId: string) {
  const view = await getRuntimeSession(sessionId);
  if (!view) throw new Error(`Session ${sessionId} not found.`);
  return view;
}

async function passOrientation(sessionId: string) {
  await submitPatientInput(sessionId, { kind: "text", value: "괜찮아요, 특별히 급한 건 없어요" }); // safety-check (introduction auto-advances)
  await submitPatientInput(sessionId, { kind: "text", value: "네" }); // redirection-contract (boolean)
}

describe("S03 Intra-TR -- 정상 발화 오인 수정", () => {
  beforeEach(async () => {
    const db = getLocalDb();
    await db.transaction("rw", db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });
  });

  it("P0-3: the 14-question introduction never forces/rejects a patient answer -- the flow reaches redirection-contract without any answer to the introduction itself", async () => {
    const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId: "tbct-s03", locale: "ko-KR" });
    await startRuntimeSession(session.id);
    // Before the fix, fourteen-question-introduction's outputFields:
    // ["intraTrIntroductionComplete"] with no validation.kind made it wait
    // for a patient answer with nothing able to satisfy it, so the safety
    // check's answer would land here needing a further "네" that then got
    // rejected as filler. Now the introduction (and the already-passive
    // ccd-connection after it) both auto-deliver and auto-advance in the
    // same turn as the safety-check answer, landing directly on the first
    // real yes/no question (redirection-contract).
    const afterSafetyCheck = await submitPatientInput(session.id, { kind: "text", value: "괜찮아요, 특별히 급한 건 없어요" });
    expect(afterSafetyCheck.turnOutcome).toBe("normal");
    const view = await current(session.id);
    expect(view.currentPromptItem?.id).toBe("tbct-s03-n02-p03-redirection-contract");

    const result = await submitPatientInput(session.id, { kind: "text", value: "네" });
    expect(result.turnOutcome).toBe("normal");
    const after = await current(session.id);
    expect(after.currentPromptItem?.id).toBe("tbct-s03-n03-p01-describe-situation");
  }, 15_000);

  it("P1-2: situation, automatic thought, and emotion are recorded in their own fields, never bleeding into each other", async () => {
    const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId: "tbct-s03", locale: "ko-KR" });
    await startRuntimeSession(session.id);
    await passOrientation(session.id);

    const situationResult = await submitPatientInput(session.id, { kind: "text", value: "상사가 회의에서 보고서 수정이 필요하다고 말했어요" });
    expect(situationResult.turnOutcome).toBe("normal");
    let view = await current(session.id);
    expect(view.session.runtimeContext.fields.situation).toBe("상사가 회의에서 보고서 수정이 필요하다고 말했어요");
    expect(view.currentPromptItem?.id).toBe("tbct-s03-n04-p01-automatic-thought");

    const thoughtResult = await submitPatientInput(session.id, { kind: "text", value: "상사가 저를 무능하다고 생각하는 것 같았어요" });
    expect(thoughtResult.turnOutcome).toBe("normal");
    view = await current(session.id);
    expect(view.session.runtimeContext.fields.automaticThought).toBe("상사가 저를 무능하다고 생각하는 것 같았어요");
    // The situation field is untouched by the thought answer.
    expect(view.session.runtimeContext.fields.situation).toBe("상사가 회의에서 보고서 수정이 필요하다고 말했어요");
  }, 15_000);

  it("P0-6: a negated safety mention gets a clarifying question, not the immediate crisis route", async () => {
    const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId: "tbct-s03", locale: "ko-KR" });
    await startRuntimeSession(session.id);
    await passOrientation(session.id);
    await submitPatientInput(session.id, { kind: "text", value: "상사가 회의에서 보고서 수정이 필요하다고 말했어요" });
    await submitPatientInput(session.id, { kind: "text", value: "상사가 저를 무능하다고 생각하는 것 같았어요" });

    const result = await submitPatientInput(session.id, { kind: "text", value: "죽고 싶은 건 아니에요. 그냥 너무 지쳤어요." });
    expect(result.safetyResult.triggered).toBe(false);
    expect(result.stateExtraction?.riskLevel).toBe("low");
    expect(result.stateExtraction?.riskSignals).toContain("ambiguous_safety_language");
    expect(result.sessionStatus).toBe("waiting_for_input");
    expect(result.generatedMessage?.content).toMatch(/확인|이해/);
  }, 15_000);

  it("regression: a genuine, unqualified current-risk disclosure still takes the immediate safety route", async () => {
    const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId: "tbct-s03", locale: "ko-KR" });
    await startRuntimeSession(session.id);
    await passOrientation(session.id);
    await submitPatientInput(session.id, { kind: "text", value: "상사가 회의에서 보고서 수정이 필요하다고 말했어요" });

    const result = await submitPatientInput(session.id, { kind: "text", value: "지금 너무 힘들어서 죽고 싶어요" });
    expect(result.safetyResult.triggered).toBe(true);
    expect(result.stateExtraction?.riskLevel).toBe("high");
    // High-severity signals escalate to clinician review rather than merely
    // pausing -- see runtime-safety-orchestrator.ts's severity === "high"
    // branch (action: "escalate_clinician").
    expect(result.sessionStatus).toBe("escalated");
  }, 15_000);
});
