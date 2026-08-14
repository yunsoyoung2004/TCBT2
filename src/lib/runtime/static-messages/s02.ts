import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import { ratingNumbers, reflectThenAskForNextRating } from "@/lib/runtime/static-messages/field-helpers";

const APPROVED_TEXT: Record<string, string> = {
  "tbct-s02-n03-p01-offer-private-placeholders": "Before we rate your problems, some people have something private they'd rather not describe in detail. If that's true for you, you don't have to explain it — you can just call it X, Y, or Z instead, and we'll still rate it. Would you like to add a problem like that?",
  "tbct-s02-n04-p02-six-anchor-problem-scale": "Use this 0–5 scale for each problem: 0 Light blue—small or no longer a problem; 1 Dark blue—uncomfortable but relatively easy to solve; 2 Light green—clear discomfort and/or difficult to solve; 3 Dark green—much discomfort and/or very difficult to solve; 4 Yellow—distressing and very difficult to solve; 5 Red—so distressing that you cannot see a solution.",
  "tbct-s02-n04-p03-discomfort-distress-distinction": "Scores 0–3 describe discomfort that you can still manage. Scores 4–5 describe distress that feels overwhelming and deserves priority in therapy. Does that distinction make sense?",
  "tbct-s02-n08-p02-six-anchor-goal-scale": "Use the same 0–5 color scale for each goal: 0 Light blue, 1 Dark blue, 2 Light green, 3 Dark green, 4 Yellow, and 5 Red. Please rate how difficult each goal feels right now.",
  "tbct-s02-n10-p01-goal-total": "I will total your goal ratings and identify how many are currently in the yellow or red range.",
  "tbct-s02-n11-p01-thanks": "Thank you for mapping these problems and goals with me today.",
  "tbct-s02-n11-p02-recorded-summary": "Your problem and goal ratings have been recorded so they can be compared over time.",
  "tbct-s02-n11-p03-final-score-summary": "These ratings give you and your therapist a starting point for focusing on what matters most and tracking change over time.",
};

export function resolveStaticText(promptItem: PromptItem, fields: Record<string, unknown>): string | undefined {
  if (promptItem.id === "tbct-s02-n06-p01-problem-total") {
    const ratings = ratingNumbers(fields.problemRatings);
    const total = ratings.reduce((sum, value) => sum + value, 0);
    const priority = ratings.filter((value) => value >= 4).length;
    return `Your total problem score today is ${total}. You have ${priority} problem${priority === 1 ? "" : "s"} in the yellow or red range. These are priority areas for therapy.`;
  }
  if (promptItem.id === "tbct-s02-n10-p01-goal-total") {
    const ratings = ratingNumbers(fields.goalRatings);
    const total = ratings.reduce((sum, value) => sum + value, 0);
    const priority = ratings.filter((value) => value >= 4).length;
    return `Your total goals score today is ${total}. You have ${priority} goal${priority === 1 ? "" : "s"} in the yellow or red range.`;
  }
  if (promptItem.id === "tbct-s02-n11-p02-recorded-summary") {
    const problemRatings = ratingNumbers(fields.problemRatings);
    const goalRatings = ratingNumbers(fields.goalRatings);
    const problemTotal = problemRatings.reduce((sum, value) => sum + value, 0);
    const goalTotal = goalRatings.reduce((sum, value) => sum + value, 0);
    return `Your ratings have been recorded. Your total problem score is ${problemTotal}, and your total goals score is ${goalTotal}. These can be compared with future ratings to track change.`;
  }
  if (promptItem.id === "tbct-s02-n05-p01-reflect-problem-score") {
    return reflectThenAskForNextRating({ listField: fields.problems, ratingsField: fields.problemRatings, askVerb: "Using the same 0 to 5 color scale, how would you rate" });
  }
  if (promptItem.id === "tbct-s02-n09-p01-reflect-goal-score") {
    return reflectThenAskForNextRating({ listField: fields.goals, ratingsField: fields.goalRatings, askVerb: "Using the same 0 to 5 color scale, how would you rate" });
  }
  return APPROVED_TEXT[promptItem.id];
}

export const koreanText: Record<string, string> = {
  "tbct-s02-n03-p01-offer-private-placeholders": "문제를 평가하기 전에, 어떤 분들은 자세히 이야기하고 싶지 않은 개인적인 문제가 있을 수 있어요. 그런 경우라면 자세히 설명하지 않아도 괜찮아요 — 그냥 X, Y, Z라고 부르셔도 되고, 그래도 함께 평가할 수 있어요. 그런 문제를 추가하시고 싶으신가요?",
  "tbct-s02-n04-p02-six-anchor-problem-scale": "각 문제에 대해 이 0~5 척도를 사용해 주세요: 0 연한 파란색—작거나 더 이상 문제가 아님; 1 진한 파란색—불편하지만 비교적 쉽게 해결 가능; 2 연한 초록색—명확한 불편감이 있고/있거나 해결이 어려움; 3 진한 초록색—상당한 불편감이 있고/있거나 해결이 매우 어려움; 4 노란색—괴로움을 느끼고 해결이 매우 어려움; 5 빨간색—해결책이 보이지 않을 만큼 괴로움.",
  "tbct-s02-n04-p03-discomfort-distress-distinction": "0~3점은 아직 감당할 수 있는 불편감을 의미해요. 4~5점은 감당하기 힘든 괴로움을 의미하고, 치료에서 우선적으로 다뤄야 할 부분이에요. 이 구분이 이해되시나요?",
  "tbct-s02-n08-p02-six-anchor-goal-scale": "각 목표에도 같은 0~5 색상 척도를 사용해 주세요: 0 연한 파란색, 1 진한 파란색, 2 연한 초록색, 3 진한 초록색, 4 노란색, 5 빨간색. 지금 각 목표가 얼마나 어려운지 평가해 주세요.",
  "tbct-s02-n10-p01-goal-total": "목표 점수들을 모두 합산해서 몇 개가 노란색이나 빨간색 범위에 있는지 확인해 드릴게요.",
  "tbct-s02-n11-p01-thanks": "오늘 함께 문제와 목표를 정리해 주셔서 감사해요.",
  "tbct-s02-n11-p02-recorded-summary": "문제와 목표 점수가 기록되었으니, 앞으로 변화를 비교해 볼 수 있어요.",
  "tbct-s02-n11-p03-final-score-summary": "이 점수들은 무엇이 가장 중요한지 파악하고 시간에 따른 변화를 추적할 수 있는 시작점이 되어줄 거예요.",
};
