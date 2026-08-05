import { beforeEach, describe, expect, it } from "vitest";
import { createCanonicalTestRuntimeSession, createRuntimeSession, getPatientRuntimeSession, getRuntimeSession, listCanonicalTestSessions, listPatientAvailableRuntimeReleases } from "@/lib/api/runtime-session-api";
import { startRuntimeSession, submitPatientInput } from "@/lib/api/runtime-execution-api";
import { publishProtocolRelease, runProtocolValidation } from "@/lib/api/protocol-api";
import { getLocalDb } from "@/lib/db/tbct-local-db";
import { saveRuntimeMessage } from "@/lib/repositories/runtime-session-repository";
import { promptRequiresPatientInput } from "@/lib/runtime/source-fidelity-prompt-progression";

describe("canonical source-fidelity runtime", () => {
  beforeEach(async () => {
    const db = getLocalDb();
    await db.transaction("rw", db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });
  });

  it("starts an explicit canonical test session without a published release", async () => {
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "mock";
    try {
      const session = await createCanonicalTestRuntimeSession();
      await startRuntimeSession(session.id);
      const active = await getRuntimeSession(session.id);

      expect(session.releaseId).toBe("demo-release");
      expect(active?.session.status).toBe("waiting_for_input");
      expect(active?.session.runtimeState?.releaseId).toBe("demo-release");
      expect(active?.currentPromptItem).toBeDefined();
      expect(active?.messages.find((message) => message.role === "assistant")?.content).toMatch(/[\uAC00-\uD7A3]/);
    } finally {
      if (previousProvider === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previousProvider;
    }
  }, 15_000);

  it("makes every canonical session available to the publish-free test flow", async () => {
    const sessions = await listCanonicalTestSessions();
    const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId: "tbct-s08" });

    expect(sessions.map((item) => item.id)).toEqual(["tbct-s01", "tbct-s02", "tbct-s03", "tbct-s04", "tbct-s05", "tbct-s06", "tbct-s07", "tbct-s08"]);
    expect(session.releaseId).toBe("demo-release");
    expect(session.sessionDefinitionId).toBe("tbct-s08");
  });

  it("keeps the active PromptItem and sends a clarification when a patient sends a greeting or gibberish", async () => {
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "mock";
    try {
      const session = await createCanonicalTestRuntimeSession();
      await startRuntimeSession(session.id);
      const before = await getRuntimeSession(session.id);
      const activePromptItemId = before?.session.currentPromptItemId;

      await submitPatientInput(session.id, { kind: "text", value: "hi" });
      await submitPatientInput(session.id, { kind: "text", value: "fuiissiidojfosid" });
      const after = await getRuntimeSession(session.id);

      expect(activePromptItemId).toBeDefined();
      expect(after?.session.status).toBe("waiting_for_input");
      expect(after?.session.currentPromptItemId).toBe(activePromptItemId);
      expect(after?.session.completedPromptItemIds).not.toContain(activePromptItemId);
      const clarificationMessages = after?.messages.filter((message) => message.role === "assistant" && message.metadata?.turnOutcome === "clarification") ?? [];
      expect(clarificationMessages).toHaveLength(2);
      expect(clarificationMessages.at(-1)?.promptItemId).toBe(activePromptItemId);
      expect(clarificationMessages.at(-1)?.content).toBeTruthy();
    } finally {
      if (previousProvider === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previousProvider;
    }
  }, 15_000);

  it("preempts Session 03 progression for a direct Korean suicide disclosure", async () => {
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "mock";
    try {
      const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId: "tbct-s03", locale: "ko-KR" });
      await startRuntimeSession(session.id);
      const before = await getRuntimeSession(session.id);
      const suspendedPromptItemId = before?.session.currentPromptItemId;

      const result = await submitPatientInput(session.id, { kind: "text", value: "죽고싶다" });
      const after = await getRuntimeSession(session.id);
      const safetyMessages = after?.messages.filter((message) => message.role === "assistant" && message.metadata?.turnOutcome === "safety_override") ?? [];
      const safetyTrace = (await getLocalDb().runtimeExecutionTraces.where("runtimeSessionId").equals(session.id).toArray())
        .find((trace) => trace.transitionDecision === "safety_override");

      expect(result.turnOutcome).toBe("safety_override");
      expect(after?.session.status).toBe("escalated");
      expect(after?.session.currentPromptItemId).toBe(suspendedPromptItemId);
      expect(after?.session.completedPromptItemIds).not.toContain(suspendedPromptItemId);
      expect(safetyMessages).toHaveLength(1);
      expect(safetyMessages[0]?.content).toBe("Your immediate safety is the highest priority. We will switch to clinician escalation now.");
      expect(after?.messages.some((message) => message.role === "assistant" && /Intrapersonal Thought Record/i.test(message.content))).toBe(false);
      expect(safetyTrace?.fidelity.safetyFidelity).toBe("pass");
    } finally {
      if (previousProvider === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previousProvider;
    }
  }, 15_000);

  it("rejects a rapid duplicate submission for the same session version", async () => {
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "mock";
    try {
      const session = await createCanonicalTestRuntimeSession();
      await startRuntimeSession(session.id);
      const before = await getRuntimeSession(session.id);
      const expectedSessionVersion = before?.session.version ?? 0;

      const outcomes = await Promise.all([
        submitPatientInput(session.id, { kind: "text", value: "hi" }, { clientTurnId: "duplicate-turn", expectedSessionVersion }),
        submitPatientInput(session.id, { kind: "text", value: "hi" }, { clientTurnId: "duplicate-turn", expectedSessionVersion }),
      ]);
      const after = await getRuntimeSession(session.id);

      expect(outcomes.map((outcome) => outcome.turnOutcome).sort()).toEqual(["clarification", "rejected_duplicate"]);
      expect(after?.messages.filter((message) => message.role === "patient" && message.content === "hi")).toHaveLength(1);
      expect(after?.messages.filter((message) => message.role === "assistant" && message.metadata?.turnOutcome === "clarification")).toHaveLength(1);
      expect(after?.session.version).toBe(expectedSessionVersion + 1);
      expect(after?.session.pendingTurnId).toBeUndefined();
      expect(after?.session.lastCompletedTurnId).toBe("duplicate-turn");
    } finally {
      if (previousProvider === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previousProvider;
    }
  }, 15_000);

  it("pauses an unchanged PromptItem after the maximum clarification attempts", async () => {
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "mock";
    try {
      const session = await createCanonicalTestRuntimeSession();
      await startRuntimeSession(session.id);
      const before = await getRuntimeSession(session.id);
      const activePromptItemId = before?.session.currentPromptItemId;

      await submitPatientInput(session.id, { kind: "text", value: "hi" });
      await submitPatientInput(session.id, { kind: "text", value: "hi" });
      const finalResult = await submitPatientInput(session.id, { kind: "text", value: "hi" });
      const after = await getRuntimeSession(session.id);

      expect(finalResult.turnOutcome).toBe("fallback");
      expect(after?.session.status).toBe("paused");
      expect(after?.session.currentPromptItemId).toBe(activePromptItemId);
      expect(after?.session.runtimeContext.clarificationAttemptCount).toBe(3);
      expect(after?.session.runtimeContext.lastClarificationReason).toBe("maximum_clarification_attempts");
    } finally {
      if (previousProvider === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previousProvider;
    }
  }, 15_000);

  it("starts from a canonical release and waits on exactly one immutable PromptItem", async () => {
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "anthropic";
    try {
    await runProtocolValidation("TBCT-BR-001", "tbct-s01");
    const published = await publishProtocolRelease("TBCT-BR-001", {
      version: `runtime-source-fidelity-${Date.now()}`,
      targetEnvironment: "development",
      changeSummary: "Runtime source-fidelity test release",
    });
    const patientReleases = await listPatientAvailableRuntimeReleases("TBCT-BR-001");
    const patientRelease = patientReleases.find((release) => release.id === published.release.id);
    const session = await createRuntimeSession({
      projectId: "TBCT-BR-001",
      protocolId: "TBCT-BR-001",
      releaseId: published.release.id,
      sessionDefinitionId: "tbct-session-01",
      patientAlias: "TBCT-DEMO-001",
      locale: "pt-BR",
    });

    const initial = await getRuntimeSession(session.id);
    expect(initial?.session.protocolId).toBe("tbct-br-001");
    expect(initial?.session.releaseId).toBe(published.release.id);
    expect(initial?.session.runtimeState?.releaseId).toBe(published.release.id);
    expect(initial?.session.sessionDefinitionId).toBe("tbct-s01");
    expect(initial?.session.sourceTextHash).toBe(published.release.immutableSnapshot.sourceFidelity?.sourceTextHash);
    expect(initial?.currentPromptItem?.id).toBe(initial?.session.currentPromptItemId);

    await startRuntimeSession(session.id);
    await saveRuntimeMessage({
      id: "internal-system-message",
      runtimeSessionId: session.id,
      role: "system",
      content: "Internal runtime detail",
      status: "delivered",
      createdAt: new Date().toISOString(),
    });
    await saveRuntimeMessage({
      id: "approved-system-message",
      runtimeSessionId: session.id,
      role: "system",
      content: "A safety review is in progress.",
      status: "delivered",
      createdAt: new Date().toISOString(),
      metadata: { patientVisible: true },
    });
    const active = await getRuntimeSession(session.id);
    const patientView = await getPatientRuntimeSession(session.id);
    const promptItem = active?.currentPromptItem;

    expect(active?.session.status).toBe("waiting_for_input");
    expect(promptItem).toBeDefined();
    expect(promptItem && promptRequiresPatientInput(promptItem)).toBe(true);
    expect(active?.session.runtimeState?.activeNodeId).toBe(active?.session.currentNodeId);
    expect(active?.session.runtimeState?.activePromptItemId).toBe(active?.session.currentPromptItemId);
    expect(active?.messages.filter((message) => message.role === "assistant").every((message) => message.promptItemId !== undefined)).toBe(true);
    expect([...active?.messages ?? []].reverse().find((message) => message.role === "assistant")?.promptItemId).toBe(promptItem?.id);
    expect(active?.promptItems.some((item) => item.id === promptItem?.id)).toBe(true);
    expect(active?.release.immutableSnapshot.nodes.some((node) => node.id.startsWith("RT-NODE-"))).toBe(false);
    expect(active?.providerEvents.every((event) => event.provider === "deterministic")).toBe(true);
    expect("release" in (patientView ?? {})).toBe(false);
    expect(patientView?.currentPromptInput && "aiInstruction" in patientView.currentPromptInput).toBe(false);
    expect(patientView?.messages.some((message) => message.id === "internal-system-message")).toBe(false);
    expect(patientView?.messages.some((message) => message.id === "approved-system-message")).toBe(true);
    expect("immutableSnapshot" in (patientRelease ?? {})).toBe(false);
    expect(patientRelease?.sessions.length).toBeGreaterThan(0);
    expect(patientRelease?.sessions[0] && "sessionObjective" in patientRelease.sessions[0]).toBe(false);
    } finally {
      if (previousProvider === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previousProvider;
    }
  }, 15_000);

  it("keeps release-pinned runtime state aligned after a validated patient answer", async () => {
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "mock";
    try {
      await runProtocolValidation("TBCT-BR-001", "tbct-s01");
      const published = await publishProtocolRelease("TBCT-BR-001", {
        version: `runtime-progress-${Date.now()}`,
        targetEnvironment: "development",
        changeSummary: "Runtime progression test release",
      });
      const session = await createRuntimeSession({
        projectId: "TBCT-BR-001",
        protocolId: "TBCT-BR-001",
        releaseId: published.release.id,
        sessionDefinitionId: "tbct-session-01",
        patientAlias: "TBCT-DEMO-002",
        locale: "en-US",
      });

      await startRuntimeSession(session.id);
      const before = await getRuntimeSession(session.id);
      const answeredPromptId = before?.session.currentPromptItemId;
      const assistantMessageCountBefore = before?.messages.filter((message) => message.role === "assistant").length ?? 0;
      expect(answeredPromptId).toBeDefined();

      const result = await submitPatientInput(session.id, { kind: "text", value: "This is a current situation, not only an interpretation." });
      const after = await getRuntimeSession(session.id);
      const traces = await getLocalDb().runtimeExecutionTraces.where("runtimeSessionId").equals(session.id).toArray();
      const assistantMessages = after?.messages.filter((message) => message.role === "assistant") ?? [];
      const latestAssistantMessage = assistantMessages.at(-1);

      expect(after?.session.releaseId).toBe(published.release.id);
      expect(after?.session.completedPromptItemIds).toContain(answeredPromptId);
      expect(after?.session.runtimeState?.activeNodeId).toBe(after?.session.currentNodeId);
      expect(after?.session.runtimeState?.activePromptItemId).toBe(after?.session.currentPromptItemId);
      expect(result.turnOutcome).toBe("normal");
      expect(assistantMessages).toHaveLength(assistantMessageCountBefore + 1);
      expect(latestAssistantMessage?.nodeId).toBe(after?.session.currentNodeId);
      expect(latestAssistantMessage?.promptItemId).toBe(after?.session.currentPromptItemId);
      expect(traces.length).toBeGreaterThan(0);
      expect(traces.every((trace) => trace.releaseId === published.release.id && Boolean(trace.contractHash))).toBe(true);
    } finally {
      if (previousProvider === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previousProvider;
    }
  }, 15_000);
});