import { describe, expect, it } from "vitest";
import {
  CANONICAL_PROMPT_ITEMS,
  CANONICAL_SOURCE_EDGES,
  CANONICAL_SOURCE_SEEDS,
  CANONICAL_STAGE_NODES,
  CANONICAL_SESSION_PLAN,
  CANONICAL_SESSION_COMMON_RULES,
  CANONICAL_PROTOCOL_ID,
  getCanonicalSourceFidelityIssues,
  resolveCanonicalSessionId,
} from "@/lib/protocol/source-fidelity-catalog";
import { TBCT_SOURCE_TEXT_HASH } from "@/lib/protocol/tbct-source-text.generated";

describe("canonical TBCT source-fidelity catalog", () => {
  it("creates all eight sessions from the verified source baseline", () => {
    expect(CANONICAL_SOURCE_SEEDS).toHaveLength(8);
    expect(CANONICAL_SESSION_PLAN.orderedEntries).toHaveLength(8);
    expect(CANONICAL_SESSION_PLAN.protocolId).toBe(CANONICAL_PROTOCOL_ID);
    expect(CANONICAL_SESSION_PLAN.orderedEntries.map((entry) => entry.sessionId)).toEqual([
      "tbct-s01",
      "tbct-s02",
      "tbct-s03",
      "tbct-s04",
      "tbct-s05",
      "tbct-s06",
      "tbct-s07",
      "tbct-s08",
    ]);
    expect(getCanonicalSourceFidelityIssues()).toEqual([]);
  });

  it("keeps every active prompt tied to an exact source trace and a canonical node", () => {
    expect(CANONICAL_PROMPT_ITEMS.length).toBeGreaterThan(100);
    for (const promptItem of CANONICAL_PROMPT_ITEMS) {
      expect(promptItem.origin).toBe("source_imported");
      expect(promptItem.sourceHash).toBe(TBCT_SOURCE_TEXT_HASH);
      expect(promptItem.verbatimText.trim()).not.toBe("");
      expect(promptItem.sourceTrace.sourceLineStart).toBeGreaterThan(0);
      expect(promptItem.sourceTrace.sourceLineEnd).toBeGreaterThanOrEqual(promptItem.sourceTrace.sourceLineStart);
      expect(CANONICAL_STAGE_NODES.some((node) => node.id === promptItem.nodeId)).toBe(true);
    }

    for (const node of CANONICAL_STAGE_NODES) {
      expect(node.promptItemIds.length).toBeGreaterThan(0);
      for (const promptItemId of node.promptItemIds) {
        expect(CANONICAL_PROMPT_ITEMS.some((promptItem) => promptItem.id === promptItemId)).toBe(true);
      }
    }
  });

  it("keeps source corruption visible for Sessions 06 and 07 rather than repairing it", () => {
    const session06Rules = CANONICAL_SESSION_COMMON_RULES["tbct-s06"];
    const session07Rules = CANONICAL_SESSION_COMMON_RULES["tbct-s07"];

    expect(session06Rules.sourceFidelityStatus).toBe("review_required");
    expect(session07Rules.sourceFidelityStatus).toBe("review_required");
    expect(session06Rules.sourceTrace.rawSourceExcerpt?.trim()).not.toBe("");
    expect(session07Rules.sourceTrace.rawSourceExcerpt?.trim()).not.toBe("");
    expect(session06Rules.sourceTrace.reviewWarnings?.length).toBeGreaterThan(0);
    expect(session07Rules.sourceTrace.reviewWarnings?.length).toBeGreaterThan(0);
  });

  it("encodes the critical source controls rather than leaving them as display text", () => {
    const session05Rerating = CANONICAL_PROMPT_ITEMS.find((item) => item.id.endsWith("guilt-belief-final"));
    const session06Homework = CANONICAL_PROMPT_ITEMS.find((item) => item.id.endsWith("choose-green-items"));
    const session07Readiness = CANONICAL_PROMPT_ITEMS.find((item) => item.id.endsWith("readiness-decision"));
    const session08Verdict = CANONICAL_PROMPT_ITEMS.find((item) => item.id.endsWith("participant-verdict"));
    const session08PositiveBelief = CANONICAL_PROMPT_ITEMS.find((item) => item.id.endsWith("participant-positive-belief"));

    expect(session05Rerating?.validation).toMatchObject({ register: "cognitive_belief" });
    expect(session06Homework?.validation).toMatchObject({ allowedScores: [2, 3], minItems: 2, maxItems: 3 });
    expect(session07Readiness?.validation).toMatchObject({ values: ["ready", "not_ready"], notReadyIsValid: true });
    expect(session08Verdict?.validation).toMatchObject({ participantGenerated: true, assistantMustNotSupply: true });
    expect(session08PositiveBelief?.validation).toMatchObject({ participantGenerated: true, assistantMustNotSupply: true });
    expect(CANONICAL_SOURCE_EDGES.some((edge) => edge.label === "Yellow or red item proposed for independent homework")).toBe(true);
  });

  it("resolves legacy identifiers only as aliases to source-derived IDs", () => {
    expect(resolveCanonicalSessionId("tbct-session-03")).toBe("tbct-s03");
    expect(resolveCanonicalSessionId("SESSION-08")).toBe("tbct-s08");
    expect(resolveCanonicalSessionId("tbct-br-001-session-05")).toBe("tbct-s05");
  });
});