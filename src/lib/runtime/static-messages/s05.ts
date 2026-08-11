import type { PromptItem } from "@/lib/protocol/source-fidelity-types";

const APPROVED_TEXT: Record<string, string> = {
  "tbct-s05-n05-p02-new-contributor-next-round": "For the next round, is there another person, circumstance, or factor that contributed to what happened?",
  // Language Rules (tbct-source-text.generated.ts:922): "Never use the words
  // 'responsibility' or 'responsible' in the closing step -- use 'values'
  // instead." The technique's own name is also Participation Grid, not
  // "responsibility grid".
  "tbct-s05-n10-p01-participant-summary-table": "Let’s review the Participation Grid you created, including each contributor and the values you assigned.",
};

export function resolveStaticText(promptItem: PromptItem, fields: Record<string, unknown>): string | undefined {
  // Every session's own "SAFETY PROTOCOL (MANDATORY)" section gives the same
  // clinical instruction (pause immediately, acknowledge with compassion,
  // direct to the therapist/a crisis line, don't resume until safety is
  // confirmed) with only the exercise name changing -- see s03's static
  // message file for the full rationale.
  if (promptItem.id === "tbct-s05-n11-p01-pause-grid") {
    return "Let's pause the Participation Grid here for a moment. If you're feeling distressed or unsafe right now, please reach out to your therapist or a crisis line right away -- that matters more than continuing this exercise. We can pick this back up together once you're safe.";
  }
  if (promptItem.id === "tbct-s05-n06-p01-updated-percentage") {
    // "Return to each contributor in order and ask for an updated
    // percentage" (tbct-source-text.generated.ts:854) -- repeated once per
    // contributor per round via repeat_until; currentParticipationContributorText
    // is recomputed each turn in runtime-context.ts as the round fills in.
    const contributor = fields.currentParticipationContributorText;
    return typeof contributor === "string" && contributor
      ? `Now that we've talked it through, what would you say ${contributor}'s participation percentage is?`
      : undefined;
  }
  return APPROVED_TEXT[promptItem.id];
}

export const koreanText: Record<string, string> = {
  "tbct-s05-n05-p02-new-contributor-next-round": "다음 라운드에서, 이 일에 관련된 다른 사람이나 상황, 요인이 더 있을까요?",
  "tbct-s05-n10-p01-participant-summary-table": "함께 만든 참여도 그리드(Participation Grid)를 살펴볼게요. 각 기여자와 부여하신 값들을 함께 확인해요.",
  "tbct-s05-n11-p01-pause-grid": "지금 잠시 참여도 그리드(Participation Grid)를 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 치료사나 위기상담 전화에 바로 연락하는 게 더 중요해요. 안전해지시면 우리 함께 다시 이어갈 수 있어요.",
};
