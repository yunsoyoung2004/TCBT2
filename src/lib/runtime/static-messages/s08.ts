import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import { firstText } from "@/lib/runtime/runtime-static-message";

const APPROVED_TEXT: Record<string, string> = {
  // Shadowed by the dynamic review-four-blocks branch below (which always
  // returns a personalized string once this ID matches) -- kept here,
  // unreachable, only because it was already part of the reviewed content
  // before that branch existed.
  "tbct-s08-n14-p03-review-four-blocks": "Before the verdict, review the prosecution evidence, the defense evidence, the prosecution’s rebuttals, and the defense’s responses.",
  "tbct-s08-n14-p04-participant-verdict": "After considering all four blocks, what verdict does the jury reach: guilty or not guilty? The verdict is yours to state.",
  "tbct-s08-n19-p02-daily-appeal-homework": "For daily appeal practice, record one piece of evidence each day that supports the more balanced or positive belief.",
};

export function resolveStaticText(promptItem: PromptItem, fields: Record<string, unknown>, locale: string): string | undefined {
  // Step 3's own source line (tbct-source-text.generated.ts:1584) states the
  // charge with an illustrative example -- 'For example: "The charge is: I
  // am a failure."' -- and the marker-extraction in source-fidelity-catalog
  // captured that example quote verbatim as this prompt's fallback/verbatim
  // text, so every participant heard the textbook example instead of the
  // core belief they themselves gave two steps earlier (downward-arrow's
  // coreBelief). The "charge" field also had no writer anywhere -- nothing
  // ever copied coreBelief into it -- so the worksheet's Defendant box
  // stayed empty even after this line was delivered. Build the real charge
  // from the participant's own coreBelief instead; runtime-execution-api.ts's
  // "copy_field" completion effect persists the same value into the charge
  // field once this turn is delivered.
  if (promptItem.id === "tbct-s08-n03-p01-state-charge") {
    const charge = firstText(fields.coreBelief);
    if (!charge) return undefined;
    return locale.toLowerCase().startsWith("ko") ? `이 법정에서 다뤄질 혐의는 이것입니다 — "${charge}"` : `The charge is: "${charge}."`;
  }
  // Every session's own "SAFETY PROTOCOL (MANDATORY)" section gives the same
  // clinical instruction (pause immediately, acknowledge with compassion,
  // direct to the therapist/a crisis line, don't resume until safety is
  // confirmed) with only the exercise name changing -- see s03's static
  // message file for the full rationale.
  if (promptItem.id === "tbct-s08-n22-p01-stop-trial") {
    return "Let's pause the trial here for a moment. If you're feeling distressed or unsafe right now, please reach out to your therapist or a crisis line right away -- that matters more than continuing this exercise. We can pick this back up together once you're safe.";
  }
  if (promptItem.id === "tbct-s08-n10-p02-rebut-each-defense-item") {
    const evidence = firstText(fields.defenseEvidence ?? fields.evidenceAgainst) ?? "the defense evidence you gave";
    return `The defense said: “${evidence}” What would the prosecutor say in response?`;
  }
  if (promptItem.id === "tbct-s08-n12-p02-surrebut-each-pair") {
    const prosecution = firstText(fields.prosecutionEvidence ?? fields.evidenceFor) ?? "the prosecution evidence";
    const defense = firstText(fields.defenseEvidence ?? fields.evidenceAgainst) ?? "the defense evidence";
    return `The prosecution said: “${prosecution}” The defense said: “${defense}” From the defense role, what does that mean about the defendant?`;
  }
  if (promptItem.id === "tbct-s08-n14-p03-review-four-blocks") {
    const blocks = [
      { label: "the prosecution's evidence", detail: firstText(fields.prosecutionEvidence) },
      { label: "the defense's evidence", detail: firstText(fields.defenseEvidence) },
      { label: "the prosecution's rebuttals", detail: firstText(fields.prosecutionRebuttals) },
      { label: "the defense's responses (the surrebuttals)", detail: firstText(fields.defenseSurrebuttals) },
    ];
    const reviewed = Array.isArray(fields.juryReview) ? fields.juryReview.length : 0;
    const current = blocks[Math.min(reviewed, blocks.length - 1)];
    const detailHint = current.detail ? ` (“${current.detail}”)` : "";
    return `As jurors, review ${current.label}${detailHint} on its own. What stands out to you about it?`;
  }
  return APPROVED_TEXT[promptItem.id];
}

export const koreanText: Record<string, string> = {
  "tbct-s08-n14-p03-review-four-blocks": "판결 전에, 검사측 증거, 변호측 증거, 검사측 반박, 그리고 변호측 재반박을 함께 검토할게요.",
  "tbct-s08-n14-p04-participant-verdict": "네 가지를 모두 고려한 후, 배심원의 판결은 무엇인가요: 유죄 또는 무죄? 판결은 본인이 내리는 거예요.",
  "tbct-s08-n19-p02-daily-appeal-homework": "매일의 항소(appeal) 연습을 위해, 더 균형 잡히거나 긍정적인 믿음을 지지하는 증거를 하루에 하나씩 기록해 주세요.",
  "tbct-s08-n22-p01-stop-trial": "지금 잠시 재판을 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 치료사나 위기상담 전화에 바로 연락하는 게 더 중요해요. 안전해지시면 우리 함께 다시 이어갈 수 있어요.",
};
