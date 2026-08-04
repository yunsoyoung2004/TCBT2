import { beforeEach, describe, expect, it } from "vitest";
import { getRuntimeSession, createRuntimeSession } from "@/lib/api/runtime-session-api";
import { startRuntimeSession } from "@/lib/api/runtime-execution-api";
import { publishProtocolRelease, runProtocolValidation } from "@/lib/api/protocol-api";
import { getLocalDb } from "@/lib/db/tbct-local-db";
import { promptRequiresPatientInput } from "@/lib/runtime/source-fidelity-prompt-progression";

describe("canonical source-fidelity runtime", () => {
  beforeEach(async () => {
    const db = getLocalDb();
    await db.transaction("rw", db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });
  });

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
    expect(initial?.session.sessionDefinitionId).toBe("tbct-s01");
    expect(initial?.session.sourceTextHash).toBe(published.release.immutableSnapshot.sourceFidelity?.sourceTextHash);
    expect(initial?.currentPromptItem?.id).toBe(initial?.session.currentPromptItemId);

    await startRuntimeSession(session.id);
    const active = await getRuntimeSession(session.id);
    const promptItem = active?.currentPromptItem;

    expect(active?.session.status).toBe("waiting_for_input");
    expect(promptItem).toBeDefined();
    expect(promptItem && promptRequiresPatientInput(promptItem)).toBe(true);
    expect(active?.messages.filter((message) => message.role === "assistant").every((message) => message.promptItemId !== undefined)).toBe(true);
    expect(active?.messages.at(-1)?.promptItemId).toBe(promptItem?.id);
    expect(active?.promptItems.some((item) => item.id === promptItem?.id)).toBe(true);
    expect(active?.release.immutableSnapshot.nodes.some((node) => node.id.startsWith("RT-NODE-"))).toBe(false);
    expect(active?.providerEvents.every((event) => event.provider === "deterministic")).toBe(true);
    } finally {
      if (previousProvider === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previousProvider;
    }
  });
});