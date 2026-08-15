import type { PromptItem } from "@/lib/protocol/source-fidelity-types";

// Source (tbct-source-text.generated.ts:57-69) gives a single worked
// "Example:" of this mandatory opening move -- a hypothetical participant
// who opens with anxiety/couples-therapy/nursing content, acknowledged
// with "That sounds like a lot to be carrying." The marker-extraction in
// source-fidelity-catalog previously pulled that example's therapist line
// out verbatim as this prompt's fallback text, so every participant's
// session opened with a fabricated acknowledgment of content they never
// said. This runtime has no captured field for whatever a participant
// volunteers before Step 1 (unlike S08's charge, which reuses the
// already-collected coreBelief), so there's nothing patient-specific to
// substitute in -- a warm, content-neutral opening that doesn't claim
// anything false is the safe reading of "acknowledge warmly... then
// redirect immediately to the Step 1 opening question."
const APPROVED_TEXT: Record<string, string> = {
  "tbct-s01-n01-p01-warm-acknowledgement": "Thank you for being here. I'd like us to start with something that will help us look at everything more clearly together.",
};

export function resolveStaticText(promptItem: PromptItem, fields: Record<string, unknown>, locale?: string): string | undefined {
  const isKorean = (locale ?? "").toLowerCase().startsWith("ko");
  // Both "cycle" confirmations narrate whatever the participant actually
  // answered for candidateTwo/ThreeReaction. This used to hardcode
  // "reacts negatively" regardless of a real "positive" answer -- that bug
  // is now structurally impossible upstream (s01.ts's candidate-two/three
  // -reaction prompts have a completionCondition requiring a genuinely
  // valid "positive"/"negative" value before this prompt is even reachable,
  // see §4.4), so this substitution is always narrating a real, validated
  // answer, never guessing one.
  if (promptItem.id === "tbct-s01-n05-p08-candidate-two-cycle") {
    const reaction = fields.candidateTwoReaction === "positive" ? (isKorean ? "긍정적으로" : "positively") : (isKorean ? "부정적으로" : "negatively");
    return isKorean
      ? `그리고 면접관이 ${reaction} 반응할 때 — 그것이 원래의 생각을 다시 강화하면서, 이 순환 전체를 계속 이어가는 걸 보실 수 있나요?`
      : `And when the interviewer reacts ${reaction} — can you see how that would feed back and reinforce the original thought, keeping the whole cycle going?`;
  }
  if (promptItem.id === "tbct-s01-n06-p07-candidate-three-cycle") {
    const reaction = fields.candidateThreeReaction === "positive" ? (isKorean ? "긍정적으로" : "positively") : (isKorean ? "부정적으로" : "negatively");
    return isKorean
      ? `그리고 면접관이 ${reaction} 반응할 때 — 그것이 원래의 생각을 확인시켜 주면서, 이 순환 전체가 스스로를 계속 먹여 살리는 걸 보실 수 있나요?`
      : `And when the interviewer reacts ${reaction} — can you see how that confirms the original thought and keeps the whole cycle feeding itself?`;
  }
  return APPROVED_TEXT[promptItem.id];
}

export const koreanText: Record<string, string> = {
  // "많은 것을 감당해 오신 것 같아요" (mirroring the English fallback fix
  // above) used to open every Korean session by claiming a burden the
  // participant never described -- the source manual's "That sounds like a
  // lot to be carrying" is one worked example's acknowledgment, not
  // universal script text.
  "tbct-s01-n01-p01-warm-acknowledgement": "여기 와 주셔서 감사합니다. 이 모든 일을 함께 더 분명하게 살펴보는 데 도움이 되는 것부터 시작하겠습니다.",

  // §7.1 locale parity: the entries below give every inline patientText in
  // protocol/sessions/s01.ts a Korean counterpart, so Korean sessions route
  // through real translated text instead of falling through to the generic
  // neutral fallback (resolvePromptLocaleText only trusts English fallback
  // text for a Korean session when it actually contains Hangul).
  "tbct-s01-n03-p01-preview-candidates": "본인의 상황을 보기 전에, 같은 면접 상황에 있는 세 사람을 먼저 살펴보려고 해요. 중립적인 예시에서 패턴을 보는 게 훨씬 명확하고, 그다음에 본인의 상황을 보면 한결 수월하고 부담도 덜하거든요.",
  "tbct-s01-n03-p02-set-up-candidates": "제가 상담사가 아니라 사업가라고 가정해 볼게요. 채용 공고를 냈고, 세 명의 후보자에게 같은 칭찬을 하려고 합니다: ‘이력서를 읽어봤는데, 제가 본 바로는 유능하고 역량 있는 분 같습니다.’",
  "tbct-s01-n04-p04-candidate-one-reaction": "그 행동에 대한 면접관의 반응이 긍정적일 것 같나요, 부정적일 것 같나요?",
  "tbct-s01-n05-p01-candidate-two-same-situation": "이제 그 자리에 두 번째 사람을 앉혀 보겠습니다. 그리고 똑같은 말을 합니다: ‘이력서를 읽어봤는데, 제가 본 바로는 유능하고 역량 있는 분 같습니다.’",
  "tbct-s01-n05-p04-candidate-two-emotion-recheck": "그것도 하나의 가능성이에요 — 그리고 이 후보자가 들은 말은 첫 번째 후보자가 들은 말과 완전히 같습니다. 그런데 이런 가능성도 상상해 보실 수 있을까요? 두 번째 후보자가 같은 말을 듣고 오히려 슬프거나 낙담한 기분이 드는 것을요.",
  "tbct-s01-n05-p06-candidate-two-behavior": "그런 생각과 그런 슬픔을 가지고, 이 후보자에게서 어떤 행동을 예상하시나요?",
  "tbct-s01-n06-p01-candidate-three-same-situation": "이제 세 번째이자 마지막 후보자입니다. 같은 상황, 같은 방, 같은 자리에서 같은 말을 합니다: ‘이력서를 읽어봤는데, 제가 본 바로는 유능하고 역량 있는 분 같습니다.’",
  "tbct-s01-n06-p03-candidate-three-emotion-recheck": "같은 상황, 같은 자리, 같은 말입니다. 이 세 번째 후보자가 짜증이 나고, 심지어 화가 나는 것을 상상해 보실 수 있을까요?",
  "tbct-s01-n10-p01-confirm-list": "인지 왜곡 목록을 가지고 계신가요? 사전 안내문 맨 뒤 부록(Annex)에 있어요 — 가지러 가셔야 한다면 괜찮으니, 손에 들고 계시면 알려주세요.",
  "tbct-s01-n11-p01-daily-observation-practice": "다음 세션 전까지, 인지 왜곡 목록의 개인 예시 칸을 활용해서 매일 자동적 사고를 알아차리는 연습을 해보세요. 앞으로의 세션에서 이 생각들을 더 깊이 다루기 위해 Intrapersonal Thought Record를 소개해 드릴게요. 오늘 함께해 주셔서 감사합니다.",

  // §4.2 (v3 P0, 이번에 마저 반영): 핵심 prompt 12개 — 원문(tbct-source-text.
  // generated.ts) 복원 patientText의 한국어 대응.
  "tbct-s01-n01-p02-telegraphic-situation": "지금 무슨 일이 일어나고 있는지, 아주 간단하게(전보처럼) 표현해 보신다면 어떻게 말씀하시겠어요?",
  "tbct-s01-n04-p01-candidate-one-emotion": "이 칭찬을 들었을 때, 이 첫 번째 후보자는 어떤 감정을 느낄 것 같나요?",
  "tbct-s01-n04-p02-candidate-one-thought": "그런 감정을 느끼려면, 그 사람 머릿속에 어떤 생각이 스쳐 지나갔을까요 — 자동적 사고가 무엇이었을까요?",
  "tbct-s01-n04-p03-candidate-one-behavior": "그런 생각과 감정을 가지고, 이 후보자는 어떤 행동을 보일 것 같나요?",
  "tbct-s01-n05-p05-candidate-two-thought": "이런 상황에서 슬프거나 낙담한 기분을 느끼려면, 그 사람 머릿속에 어떤 생각이 스쳐 지나갔을까요?",
  "tbct-s01-n06-p04-candidate-three-thought": "이런 상황에서 짜증이 나거나 적대적인 기분을 느끼려면, 그 사람 머릿속에 어떤 생각이 스쳐 지나갔을까요?",
  "tbct-s01-n08-p01-thought-to-emotion": "그 생각이 더 강해지면, 감정에는 어떤 변화가 생기나요?",
  "tbct-s01-n08-p02-emotion-to-behavior": "그 감정이 커지면, 행동에는 어떤 변화가 생기나요?",
  "tbct-s01-n08-p03-behavior-to-situation": "그렇게 행동했을 때, 상황에는 어떤 변화가 있었나요?",
  "tbct-s01-n08-p04-situation-to-thought": "그리고 그 상황이 달라지지 않았을 때, 어떤 생각이 스쳐 지나갔나요?",
  "tbct-s01-n09-p01-participant-summary": "다음으로 넘어가기 전에 여쭤보고 싶은 게 있어요. 그 상황에서 생각, 감정, 행동이 어떻게 연결되는지, 스스로 알아차리거나 이해하신 걸 본인의 말로 표현해 주시겠어요?",
  "tbct-s01-n10-p03-identify-distortion": "그 상황에서 머릿속에 스쳐 지나간 생각을 살펴볼 때 — 이 목록 중에 해당하는 왜곡이 있나요?",

  // 세션로그 §9-1/§9-5 잔여 커버리지 (17건): 위 §4.2 배치 이후 patientText가
  // 새로 추가된 항목들의 한국어 대응.
  "tbct-s01-n02-p01-situation-or-thought": "흥미롭네요 — 그게 상황인가요, 아니면 생각일 수도 있을까요?",
  "tbct-s01-n02-p02-personal-example-redirect": "정말 좋은 예시네요 — 잠시 그대로 기억해 둘게요. 잠시 후에 본인의 예시로 다시 돌아오겠습니다. 하지만 그 전에, 더 명확하게 볼 수 있도록 도와드릴 만한 걸 먼저 보여드리고 싶어요. 괜찮으실까요? 잠깐 시간 내주실 수 있나요?",
  "tbct-s01-n04-p05-candidate-one-thought-arrow": "그리고 면접관이 긍정적으로 반응했을 때, 이 후보자의 원래 생각에는 어떤 변화가 생기나요 — 더 강해지나요, 약해지나요, 그대로인가요?",
  "tbct-s01-n04-p06-candidate-one-emotion-arrow": "그리고 그 생각이 더 강해지면, 감정에는 어떤 변화가 생기나요?",
  "tbct-s01-n04-p07-candidate-one-behavior-arrow": "그리고 그 감정이 커지면, 행동에는 어떤 변화가 생기나요?",
  "tbct-s01-n05-p02-candidate-two-emotion": "이 말을 들었을 때, 이 두 번째 후보자가 슬프거나 낙담한 기분을 느낄 수도 있다고 생각하시나요?",
  "tbct-s01-n05-p03-candidate-two-possibility": "확률이 아니라 가능성을 말씀드리는 거예요 — 그게 가능하다고 상상해 보실 수 있을까요?",
  "tbct-s01-n05-p07-candidate-two-reaction": "그 행동에 대한 면접관의 반응이 긍정적일 것 같나요, 부정적일 것 같나요?",
  "tbct-s01-n06-p02-candidate-three-emotion": "이 세 번째 후보자가 짜증이 나거나, 어느 정도 적대감을 — 겉으로 드러나지 않더라도 — 느낄 수도 있다고 생각하시나요?",
  "tbct-s01-n06-p05-candidate-three-behavior": "그런 생각과 그런 짜증을 가지고, 어떤 행동을 예상하시나요?",
  "tbct-s01-n06-p06-candidate-three-reaction": "그 행동에 대한 면접관의 반응이 긍정적일 것 같나요, 부정적일 것 같나요?",
  "tbct-s01-n07-p01-three-person-observation": "세 사람이 정확히 같은 칭찬을 들었습니다. 이들이 각각 어떻게 생각하고, 느끼고, 행동했는지에서 무엇을 알아차리셨나요?",
  "tbct-s01-n07-p02-situation-thought-emotion-link": "그것이 상황, 생각, 감정 사이의 관계에 대해 무엇을 말해주나요?",
  "tbct-s01-n07-p03-return-to-personal-example": "이제 앞서 말씀하신 [their situation]으로 다시 돌아가 볼게요. 방금 살펴본 내용을 바탕으로, 본인의 경험에서도 이와 같은 패턴이 어떻게 나타나는지 함께 살펴보겠습니다.",
  "tbct-s01-n08-p05-outcome-gap": "그러면 두려워하셨던 일이 실제로는 일어나지 않았다는 것이, 어떤 의미가 있을까요?",
  "tbct-s01-n10-p02-read-distortions": "지금까지 살펴본 이런 부정적인 자동적 사고들 — 인지치료에서는 이를 부르는 이름이 있습니다. 바로 인지 왜곡(cognitive distortion)이라고 해요. 모든 자동적 사고가 왜곡인 것은 아니지만, 그중 일부는 살펴볼 만한 사고의 오류나 과장인 경우가 있습니다. 목록을 살펴보시고 그중 두세 가지를 읽어봐 주시겠어요?",
  "tbct-s01-n10-p04-meaning-of-distortion": "만약 이 생각이 인지 왜곡 — 일종의 사고의 오류 — 일 수도 있다는 걸 알게 되신다면, 어떤 차이가 있을까요?",
};
