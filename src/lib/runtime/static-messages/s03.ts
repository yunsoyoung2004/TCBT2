import type { PromptItem } from "@/lib/protocol/source-fidelity-types";

// Every session's own "SAFETY PROTOCOL (MANDATORY)" section gives the same
// clinical instruction (pause immediately, acknowledge with compassion,
// direct to the therapist/a crisis line, don't resume until safety is
// confirmed) with only the exercise name changing -- see e.g.
// tbct-source-text.generated.ts:465-471 for this session's wording, mirrored
// in every other session that has a safety-pause node. Previously this node
// had no authored text at all, so the runtime-release-normalizer's generic
// fallback produced a slug-derived placeholder ("Let's continue with pause
// and escalate, one step at a time") on exactly the node reached during a
// real safety pause.
export function resolveStaticText(promptItem: PromptItem): string | undefined {
  if (promptItem.id === "tbct-s03-n15-p01-pause-and-escalate") {
    return "Let's pause the Intra-TR here for a moment. If you're feeling distressed or unsafe right now, please reach out to your therapist or a crisis line right away -- that matters more than continuing this exercise. We can pick this back up together once you're safe.";
  }
  return undefined;
}

export const koreanText: Record<string, string> = {
  "tbct-s03-n15-p01-pause-and-escalate": "지금 잠시 Intra-TR을 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 치료사나 위기상담 전화에 바로 연락하는 게 더 중요해요. 안전해지시면 우리 함께 다시 이어갈 수 있어요.",
};
