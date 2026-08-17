import { describe, expect, it } from "vitest";
import { resolveStaticPatientMessage } from "@/lib/runtime/runtime-static-message";
import type { PromptItem } from "@/lib/protocol/source-fidelity-types";

// Regression test for a real leak a Korean patient hit in production: a
// PromptItem whose fallbackPatientText is English-only source text, with no
// curated Korean translation (REVIEWED_KOREAN_PROMPT_TEXT in
// runtime-release-normalizer.ts), used to ship that raw English straight to
// a ko-KR session. resolveStaticPatientMessage's second branch had its own
// copy of the "is this locale-safe" decision that specifically reverted to
// the raw English fallback whenever the correct, already-localized generic
// line would have been used instead -- see the fix in
// runtime-static-message.ts for the full story.
function makePromptWithFallback(id: string, fallbackPatientText: string): PromptItem {
  return {
    id,
    protocolId: "tbct-br-001",
    sessionId: "tbct-s01",
    nodeId: "node-x",
    order: 1,
    type: "instruction",
    verbatimText: fallbackPatientText,
    editableText: fallbackPatientText,
    aiInstruction: "Present this teaching example.",
    fallbackPatientText,
    activationCondition: null,
    outputFields: [],
    validation: null,
    completionEffect: null,
    restrictions: [],
    safetyRuleIds: [],
    sourceTrace: { sourceDocument: "TBCT pasted source text", sourceSession: "Session 01", sourceSection: "test", sourceLineStart: 1, sourceLineEnd: 1, sourceTextHash: "test", importedVersion: "test" },
    sourceFidelityStatus: "structured_from_source",
    origin: "source_imported",
    sourceHash: "test",
    status: "active",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    updatedBy: "test",
  };
}

describe("resolveStaticPatientMessage: S02 CCPH/CCGH six-anchor scale text stays under the 600-char safety cap", () => {
  // Regression test for a real bug: static-messages/s02.ts's computed
  // six-anchor-problem-scale/six-anchor-goal-scale branches were verbose
  // enough in English (~660-800 chars) to fail isPatientSafeFallbackText's
  // 600-char cap in runtime-release-normalizer.ts, silently substituting the
  // content-free generic locale line (defaultFallbackPatientText) on every
  // English CCPH/CCGH turn -- so an English-speaking participant never saw
  // the six colored rating anchors at all, while Korean's denser phrasing
  // (~446-485 chars) always passed. Found via a real deterministic-fallback
  // session run (no ANTHROPIC_API_KEY), this repo's actual default.
  for (const [promptItemId, mustContain] of [
    ["tbct-s02-n04-p02-six-anchor-problem-scale", ["light blue", "dark blue", "light green", "dark green", "yellow", "red"]],
    ["tbct-s02-n08-p02-six-anchor-goal-scale", ["light blue", "dark blue", "light green", "dark green", "yellow", "red"]],
  ] as const) {
    it.each([
      [{ problemScaleCardAvailable: true, goalScaleCardAvailable: true }, "card available"],
      [{ problemScaleCardAvailable: false, goalScaleCardAvailable: false }, "no card"],
    ])(`${promptItemId} (%s) delivers the real six-anchor scale text in English, not the generic fallback`, (fields) => {
      const prompt = makePromptWithFallback(promptItemId, "");
      const result = resolveStaticPatientMessage(prompt, "en-US", { fields, riskSignals: [], iterationCounts: {}, riskLevel: "low" });
      expect(result).not.toBeNull();
      expect(result!.patientMessage).not.toBe("We can take this one step at a time. What feels most important to share right now?");
      for (const anchor of mustContain) expect(result!.patientMessage).toContain(anchor);
      expect(result!.patientMessage.length).toBeLessThanOrEqual(600);
    });
  }
});

describe("resolveStaticPatientMessage", () => {
  it("never ships raw English fallbackPatientText to a Korean session, even for a PromptItem with no curated translation", () => {
    const englishOnlyPrompt = makePromptWithFallback(
      "tbct-s01-not-in-reviewed-korean-map",
      "Let's pretend that I am not a therapist but a businessperson. I have a job opening, and I will give the same compliment to three candidates.",
    );

    const result = resolveStaticPatientMessage(englishOnlyPrompt, "ko-KR");

    expect(result).not.toBeNull();
    // Must contain Hangul -- either the curated translation (none exists
    // here) or the safe generic Korean line, but never the untranslated
    // English source text verbatim.
    expect(result!.patientMessage).toMatch(/[가-힣]/);
    expect(result!.patientMessage).not.toContain("businessperson");
  });

  it("still returns the English text as-is for an English-locale session", () => {
    const englishOnlyPrompt = makePromptWithFallback(
      "tbct-s01-not-in-reviewed-korean-map-2",
      "Let's pretend that I am not a therapist but a businessperson.",
    );

    const result = resolveStaticPatientMessage(englishOnlyPrompt, "en-US");

    expect(result?.patientMessage).toBe("Let's pretend that I am not a therapist but a businessperson.");
  });
});
