import type { PromptItem } from "@/lib/protocol/source-fidelity-types";

const APPROVED_TEXT: Record<string, string> = {
  "tbct-s07-n01-p01-crp-offer": "I’d like to propose that today we work through a decision that feels important but difficult using Consensual Role-Play. You will not be pressured to take the feared action; what matters is what you learn. Would you like to try it?",
  "tbct-s07-n01-p02-crp-consent": "Would you like to continue with Consensual Role-Play, knowing that ‘not ready’ is also a valid outcome?",
  // The protocol's default is to DETECT the language from the participant's
  // own first substantive message and lock to it silently -- asking is only
  // a fallback for genuinely ambiguous input (tbct-source-text.generated.ts:
  // 1319-1322). sessionLanguage/languageLocked are now captured from the
  // crp-consent reply one step earlier (runtime-context.ts), so this step
  // just states the lock instead of re-asking a question nothing waits for.
  "tbct-s07-n02-p01-language-lock": "I'll continue in the language you've been using, and I'll keep the names of the technique and chair roles consistent throughout.",
  "tbct-s07-n02-p02-both-parts-healthy": "Both parts are healthy functions of the same self. Emotion protects, and Reason evaluates. Neither is superior, and the goal is not for one to defeat the other.",
  "tbct-s07-n03-p01-ambivalence-normalization": "It is normal for one part of you to want an action while another part wants to avoid it. We will listen to both without forcing a decision.",
  "tbct-s07-n05-p01-emotion-weight": "From the Emotion chair, what percentage of the weight goes to the disadvantages? The remainder goes to the advantages.",
  "tbct-s07-n05-p02-reason-weight": "From the Reason chair, what percentage of the weight goes to the advantages? The remainder goes to the disadvantages.",
  "tbct-s07-n08-p01-consensus-weights": "From the Consensus chair, what final percentage would you give the advantages and disadvantages after hearing both parts?",
  "tbct-s07-n09-p01-readiness-decision": "After hearing both parts, what is your decision right now: ready, not ready, or undecided? Any of these is acceptable.",
  "tbct-s07-n10-p01-proposed-actions": "What small action, if any, would fit the decision you reached?",
  "tbct-s07-n10-p02-possible-obstacles": "What obstacle might make that action difficult?",
  "tbct-s07-n10-p03-obstacle-solutions": "What could help you respond to that obstacle?",
  "tbct-s07-n10-p04-implementation-plan": "When and where would you try this action?",
  "tbct-s07-n10-p05-support-people": "Who could support you without pressuring you?",
  "tbct-s07-n10-p06-follow-up": "How and when would you like to review what you learned?",
  "tbct-s07-n11-p01-plan-summary": "Please summarize the plan you chose, including the action, possible obstacle, response, support, and follow-up. The decision remains yours.",
};

export function resolveStaticText(promptItem: PromptItem): string | undefined {
  // Every session's own "SAFETY PROTOCOL (MANDATORY)" section gives the same
  // clinical instruction (pause immediately, acknowledge with compassion,
  // direct to the therapist/a crisis line, don't resume until safety is
  // confirmed) with only the exercise name changing -- see s03's static
  // message file for the full rationale.
  if (promptItem.id === "tbct-s07-n12-p01-stop-crp") {
    return "Let's pause the role-play here for a moment. If you're feeling distressed or unsafe right now, please reach out to your therapist or a crisis line right away -- that matters more than continuing this exercise. We can pick this back up together once you're safe.";
  }
  return APPROVED_TEXT[promptItem.id];
}

export const koreanText: Record<string, string> = {
  "tbct-s07-n01-p01-crp-offer": "오늘은 중요하지만 어려운 결정을 합의적 역할극(Consensual Role-Play)을 통해 함께 다뤄보고 싶어요. 두려운 행동을 강요받지 않을 거예요; 중요한 건 무엇을 배우는가예요. 한번 해보시겠어요?",
  "tbct-s07-n01-p02-crp-consent": "'아직 준비가 안 됐다'는 것도 충분히 괜찮은 결과라는 걸 알고, 합의적 역할극을 계속 진행해 보시겠어요?",
  "tbct-s07-n02-p01-language-lock": "지금까지 사용하신 언어로 계속 진행할게요. 그리고 기법과 의자 역할의 이름은 계속 일관되게 사용할게요.",
  "tbct-s07-n02-p02-both-parts-healthy": "두 부분 모두 같은 자아의 건강한 기능이에요. 감정(Emotion)은 보호하고, 이유(Reason)는 판단해요. 둘 중 하나가 더 우월한 게 아니고, 목표는 한쪽이 다른 쪽을 이기는 게 아니에요.",
  "tbct-s07-n03-p01-ambivalence-normalization": "한쪽은 어떤 행동을 원하고 다른 한쪽은 피하고 싶어하는 건 자연스러운 일이에요. 결정을 강요하지 않고 양쪽 모두의 이야기를 들어볼게요.",
  "tbct-s07-n05-p01-emotion-weight": "감정(Emotion) 의자에서, 단점 쪽에 몇 퍼센트의 무게를 두시겠어요? 남은 퍼센트는 장점 쪽으로 갈게요.",
  "tbct-s07-n05-p02-reason-weight": "이유(Reason) 의자에서, 장점 쪽에 몇 퍼센트의 무게를 두시겠어요? 남은 퍼센트는 단점 쪽으로 갈게요.",
  "tbct-s07-n08-p01-consensus-weights": "합의(Consensus) 의자에서, 양쪽 이야기를 다 들은 후 장점과 단점에 최종적으로 몇 퍼센트씩 부여하시겠어요?",
  "tbct-s07-n09-p01-readiness-decision": "양쪽 이야기를 들은 후, 지금 이 순간의 결정은 무엇인가요: 준비됨, 아직 준비 안 됨, 아니면 아직 결정 못함? 어떤 것이든 괜찮아요.",
  "tbct-s07-n10-p01-proposed-actions": "그 결정에 맞는 작은 행동이 있다면 무엇일까요?",
  "tbct-s07-n10-p02-possible-obstacles": "그 행동을 어렵게 만들 수 있는 장애물은 무엇일까요?",
  "tbct-s07-n10-p03-obstacle-solutions": "그 장애물에 대응하는 데 도움이 될 만한 것은 무엇일까요?",
  "tbct-s07-n10-p04-implementation-plan": "언제, 어디서 이 행동을 시도해 보시겠어요?",
  "tbct-s07-n10-p05-support-people": "압박하지 않고 지지해 줄 수 있는 사람이 있을까요?",
  "tbct-s07-n10-p06-follow-up": "배운 것을 언제, 어떻게 다시 돌아보고 싶으신가요?",
  "tbct-s07-n11-p01-plan-summary": "선택하신 계획을 요약해 주세요 — 행동, 예상되는 장애물, 대응 방법, 지지, 그리고 다시 돌아볼 방법까지요. 결정은 여전히 본인의 것이에요.",
  "tbct-s07-n12-p01-stop-crp": "지금 잠시 역할극을 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 치료사나 위기상담 전화에 바로 연락하는 게 더 중요해요. 안전해지시면 우리 함께 다시 이어갈 수 있어요.",
};
