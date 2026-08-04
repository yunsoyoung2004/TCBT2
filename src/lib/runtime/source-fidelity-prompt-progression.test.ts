import { describe, expect, it } from "vitest";
import { createCanonicalProtocolReleaseSnapshot } from "@/lib/protocol/source-fidelity-protocol-adapter";
import {
  getReleasePromptItems,
  promptRequiresPatientInput,
  resolveCurrentReleasePrompt,
} from "@/lib/runtime/source-fidelity-prompt-progression";
import type { ProtocolReleaseVersion } from "@/types/protocol-runtime";
import type { RuntimeContext } from "@/types/runtime-session";

const context: RuntimeContext = {
  fields: {},
  riskSignals: [],
  iterationCounts: {},
  activityCompletion: "not_started",
  homeworkStatus: "not_assigned",
  riskLevel: "low",
};

function releaseWithSnapshot(): ProtocolReleaseVersion {
  return {
    id: "REL-SOURCE-TEST",
    protocolId: "tbct-br-001",
    version: "source-test",
    releasePackageId: "PKG-SOURCE-TEST",
    publishedAt: "2025-01-01T00:00:00.000Z",
    publishedBy: "test",
    changeSummary: "test",
    immutableSnapshot: createCanonicalProtocolReleaseSnapshot(),
  };
}

describe("source-fidelity PromptItem progression", () => {
  it("resolves a current prompt in canonical node order rather than a mutable catalog order", () => {
    const release = releaseWithSnapshot();
    const nodeId = "tbct-s08-n01-investigation-and-core-belief";
    const promptItems = getReleasePromptItems(release, nodeId);
    const first = resolveCurrentReleasePrompt({ release, nodeId, runtimeContext: context });
    const second = resolveCurrentReleasePrompt({
      release,
      nodeId,
      runtimeContext: context,
      completedPromptItemIds: [first.promptItem?.id ?? ""],
    });

    expect(promptItems.map((promptItem) => promptItem.id)).toEqual([
      "tbct-s08-n01-p01-distressing-situation",
      "tbct-s08-n01-p02-downward-arrow",
    ]);
    expect(first.promptItem?.id).toBe(promptItems[0]?.id);
    expect(second.promptItem?.id).toBe(promptItems[1]?.id);
    expect(promptRequiresPatientInput(first.promptItem!)).toBe(true);
  });

  it("skips source-defined inactive PromptItems and keeps the skip list explicit", () => {
    const release = releaseWithSnapshot();
    const nodeId = "tbct-s02-n01-opening";
    const promptItems = getReleasePromptItems(release, nodeId);
    const resolution = resolveCurrentReleasePrompt({
      release,
      nodeId,
      runtimeContext: context,
      completedPromptItemIds: [promptItems[0]?.id ?? ""],
    });

    expect(resolution.promptItem).toBeNull();
    expect(resolution.skippedPromptItemIds).toEqual(promptItems.slice(1).map((promptItem) => promptItem.id));
  });

  it("rejects releases that do not contain immutable source-fidelity content", () => {
    const release = releaseWithSnapshot();
    delete release.immutableSnapshot.sourceFidelity;

    expect(() => getReleasePromptItems(release, "tbct-s01-n01-mandatory-opening")).toThrow("source-fidelity snapshot");
  });
});