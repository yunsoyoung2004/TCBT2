# TBCT S01~S03 상담 UX·프로토콜 정합성 고도화 통합 기획안 **v3**

> **v2 대비 성격 변화**
> v2는 "기획안 간 대조"였다. v3는 **기획안 ↔ TBCT 원문 ↔ 실제 6개 코드**를 3자 대조한 결과다.
> 그 결과 v2에서 **원문과 충돌하는 지시 6건**을 교체했고, **기획안이 놓친 코드 결함 15건**을 신규 편입했다.
> 판단 기준은 사용자가 선택한 대로 **원문 우선(Source-first)** 이며, 충돌 시 v2 지시를 폐기했다.

---

## 0. 문서 목적과 검토 방법

### 0.1 목적

Phase 1(6개 product file) 개발 착수 가능한 **단일 기준안**을 확정한다.

### 0.2 근거 문서 (직접 대조함)

| 문서 | 역할 | 본 문서에서의 위상 |
| --- | --- | --- |
| `Trial-Based Cognitive Therapy: Distinctive Features` (de Oliveira) — Ch. "Case formulation: level 1" | three-person example **원저 축어록** | **최상위 근거**. S01 구조 판정 기준 |
| `TBCT_Session_01_Manual.docx` | 참가자용 사전 안내 + 인지왜곡 목록(Annex) | S01 참가자 기대·목록 접근 경로 |
| `TBCT_Session_02_Manual.docx` | 참가자용 사전 안내 + CCPH/CCGH 카드(Annex) | **S02 척도 anchor의 verbatim 원본** |
| `TBCT_Session_03_Manual.docx` | 참가자용 사전 안내 + 14문항 워크시트 | S03 문항 순서·표현 |
| `SESSION 03 (1).docx` | S03 **system prompt v4** | S03 동작 규범(가장 구체적) |
| `Protocol_V9 (4).docx` | 임상시험 프로토콜 | 안전·arm 구조·AI 경계 |
| 6개 product code | 현재 구현 | 결함 판정 대상 |

### 0.3 판정 등급

- **[교체]** — v2 지시가 원문과 충돌. v2 폐기, 원문 기준 채택.
- **[신규]** — v2가 다루지 않은 코드 결함.
- **[유지]** — v2 판단이 원문과 일치. 그대로 승계.
- **[종결]** — v2가 `[충돌/확인 필요]`로 남긴 항목을 근거로 확정.

---

## 1. 요약 — v3에서 달라진 것

### 1.1 v2 지시 중 원문과 충돌하여 **교체**한 6건

| # | v2 지시 | 원문 근거 | v3 결정 |
| --- | --- | --- | --- |
| C-1 | S01 Candidate 2/3 recheck에서 "이 후보자는 무엇을 느낄 것 같나요?"라고 **감정을 다시 묻는다** | 원저: 가이드가 감정을 **제시**하고 참가자는 *가능성 수용 → 사고 발굴* | **[교체]** recheck는 emotion 재질문이 아니라 **possibility 재확인** |
| C-2 | S01 distortion은 "사용자 판단으로 유지" (개념만) | 원저: "read two or three of these" = **읽기** 2~3개, 선택은 보통 1개 | **[교체]** 코드가 선택 2~3개를 **강제**하고 있음 → validation 교체 |
| C-3 | S03 Q5 앞에 "잠깐의 relief/protection/avoidance" **설명 문장 추가** | 원문 Q5 문장 자체가 rationale 포함 | **[교체]** 창작 금지, **원문 전체 문장 복원** |
| C-4 | S03 Q8/Q9 "2~3개 목표" (요구만 기술) | system prompt: 1회 재요청 후 없으면 **수용하고 진행** | **[교체]** 현재 `minItems:2`가 이 요구와 **모순** → 진행 불가 |
| C-5 | S03 safety는 "세션 시작 mandatory check" 중심 | system prompt: **"at any point during the session"** | **[교체]** 시작 체크만으론 불충분. **전역 crisis edge** 필요 |
| C-6 | S03 Q4b summary의 behavior 포함 여부 = **[충돌/확인 필요]** | verbatim quote 4요소 + 직후 cycle note가 behavior 커버 | **[종결]** A안(원문 4요소) 확정. **미결 0건** |

### 1.2 신규 편입한 P0 결함 4건

- **N-1** Locale parity 붕괴 — 한/영 혼용의 *실제* 구조적 원인 (v2 진단은 증상만 봄)
- **N-2** 동일 outputField에 복수 prompt → **참가자 응답 소실**
- **N-3** S02 **CCGH anchor 문구가 코드에 0개** (validation과 모순 + baseline 데이터 오염)
- **N-4** S02 재방문 시 opening **이중 발화**

---

## 2. Scope (v2 승계, 일부 명확화)

### 2.1 수정 대상 (6개)

```text
protocol/sessions/s01.ts
protocol/sessions/s02.ts
protocol/sessions/s03.ts
runtime/static-messages/s01.ts
runtime/static-messages/s02.ts
runtime/static-messages/s03.ts
```

### 2.2 수정 금지

```text
runtime-execution-api.ts / runtime-state-reducer.ts / runtime-orchestrator.ts
dialogue-agent-orchestrator.ts / runtime-static-message.ts
patient-input-controls.tsx / worksheet-renderers/* / worksheet-bindings/*
source-fidelity-types.ts
tbct-source-text.generated.ts   ← 읽기 전용(verbatim 판정 기준)
```

### 2.3 Phase 2 이관 (v2 대비 위상 변경)

**S03 Worksheet → Runtime → Dialogue 동기화**

v2는 이를 "동기화 버그"로 다뤘다. v3는 **원문 미준수 상태**로 격상 기록한다.

> S03 system prompt, STRUCTURAL AND TECHNICAL RULES:
> *"Track and display a running summary of the Intra-TR fields as the session progresses (Situation / AT / Belief % / … / Global evaluation)."*

즉 running summary는 선택적 UX가 아니라 **명시된 요구사항**이다. Phase 2 이관은 유지하되, 미해결 상태는 "개선 대기"가 아니라 **"프로토콜 미충족"** 으로 이슈에 기록한다.

### 2.4 Phase 1 신규 산출물 (코드 외)

- `locale-parity.test.ts` — §7.1의 키 집합 동등성 검증 (6개 파일만 읽는 테스트이므로 scope 내)

---

## 3. 공통 원칙 (v2 승계 + 신규 3항)

### 3.1 유지

- deterministic progression, TBCT 세션 순서
- 사용자 실제 답변 우선 반영
- 결론·distortion은 **사용자가 판단**
- S02 보호 field: `problems` / `problemRatings` / `goals` / `goalRatings`
- S02 X/Y/Z, S03 14문항 순서, 기존 safety escalation 구조

### 3.2 제거 (v2 승계)

미치환 placeholder 출력, 값 없는 상태의 `negative` 간주, 사용자가 말하지 않은 emotion·thought·conclusion 생성, 목적 없는 generic fallback 반복, 사실인 사건에 대한 반박, 미완성 conclusion 평가, 14문항 skip/순서 변경.

### 3.3 **[신규]** patientText 작성 원칙

> **원칙 P — 복원 우선, 창작 예외**
> `patientText`는 **원문 문장의 복원**을 기본으로 한다.
> marker 추출이 문장을 자르는 경우 → **원문 전체 문장을 그대로** patientText에 넣는다.
> 원문에 대응 문장이 없을 때만 창작하며, 이때 코드 주석에 *"원문 무대응 — 창작 근거"* 를 남긴다.

이 원칙은 v2의 여러 "설명 추가" 지시를 무효화한다(C-3 참조). generic fallback을 피하려다 **비원문 임상 문구를 늘리는 것**이 더 큰 fidelity 위험이다.

### 3.4 **[신규]** 필드 쓰기 정책

> **원칙 F — 스칼라 1:1, 배열만 append**
> 스칼라 필드는 **하나의 prompt만** 산출한다.
> 여러 prompt가 같은 스칼라 필드를 쓰면 **마지막 값만 남고 앞선 응답은 소실**된다.
> 복수 수집이 필요하면 배열 필드 + append 시맨틱을 명시한다.

### 3.5 **[신규]** Arm-중립 표현

Protocol V9 **Arm 3 (AI-Only)** 참가자는 담당 therapist 세션이 없다.

> *"Participants in this arm do not have scheduled therapist sessions but have access to enhanced safety monitoring."*

따라서 `"your therapist"` 를 **전제**하는 문구는 Arm 3에서 사실과 다르다.
참가자 매뉴얼의 distress 문구는 이미 arm-중립이다 — *"reach out to your study clinician or your local emergency services"*.

→ Phase 1에서 사용자 노출 문구는 **`study clinician`(연구 임상의) 기준으로 중립화**한다. (§8.7)

---

# 4. S01 수정 기획

## 4.1 Opening — 짧은 rapport 후 즉시 프로토콜 진입 **[유지]**

v2 §3.1 판단은 매뉴얼과 일치한다.

> S01 매뉴얼: *"The AI guides mostly by asking, not explaining."* / *"It stays focused on this one topic."*

현재 코드의 `warm-acknowledgement` 중립 문구 교체(주석에 근거 기재됨)는 **적절**하며 그대로 유지한다.

**Acceptance**: opening이 장문 psychoeducation으로 확장되지 않음 / 개인 문제에 대한 별도 상담 flow 미생성 / 수 turn 내 Step 1 진입.
**우선순위: P1**

---

## 4.2 Generic Fallback 제거 **[유지 + 원칙 P 적용]**

marker에만 의존하는 핵심 prompt에 explicit `patientText`를 부여한다. 단 §3.3 원칙 P에 따라 **원문 문장 복원**으로 한정한다.

우선 대상:

```text
telegraphic-situation          candidate-two-same-situation
candidate-one-emotion          candidate-three-same-situation
candidate-one-thought          personal-returning-arrows (4개 prompt)
candidate-one-behavior         participant-summary
candidate-two-thought          confirm-list
candidate-three-thought        identify-distortion
```

**Acceptance**: 서로 다른 prompt에서 동일 generic 질문 연속 출력 0회 / 질문 하나만 읽어도 무엇을 답할지 판단 가능.
**우선순위: P0**

---

## 4.3 **[교체 C-1]** Three-Person Example — 감정은 *가이드가 제시*한다

### 4.3.1 v2가 놓친 구조

v2는 "세 후보가 같은 compliment를 듣는다"까지는 정확히 잡았다. 그러나 **각 candidate에서 참가자가 수행하는 과제가 다르다**는 점을 놓쳤고, 그 결과 제안한 수정 문안이 **새로운 프로토콜 위반**을 만든다.

원저 축어록(Distinctive Features, "The three-person example"):

**Candidate 1 — 가이드가 situation 제시, 참가자가 emotion부터 발굴**

> Therapist: *"Let's imagine that over in that chair is another person and that I told that person: 'I like your work. You are an intelligent person!'. How would that person feel?"*
> Patient: *"He or she would feel great! Happy!"*
> → 이후 AT → behavior → returning arrows

**Candidate 2 — 가이드가 emotion(sad)까지 제시, 참가자는 *가능성 수용* 후 AT 발굴**

> Therapist: *"And what if we put a second person in this chair, and told her exactly the same thing ('I like your work. You're an intelligent person!'), **can you see her becoming sad?**"*
> Patient: *"I don't see why."*
> Therapist: *"**But you can imagine this possibility, can't you? Can you suppose her becoming sad in this situation?**"*
> Patient: *"Yes."*
> Therapist: *"Why do you think the feeling was different? One was happy, the other was sad."*

**Candidate 3 — 동일 구조, emotion(irritated/angry) 제시**

> Therapist: *"…it's the same situation, the same room, the same chair, and I'll tell her the same thing… **Can you imagine her getting irritated and mad at me?**"*
> Patient: *"There would be no reason to this."*
> Therapist: *"**Can you imagine or see her feeling irritated and even getting angry?**"*
> Patient: *"I think it is possible, but I can't really imagine it right off."*
> Therapist: *"Let's see: if a person gets angry, or irritated here, with what I said, **what do you think was the thought** that went through her head?"*

원저의 마무리:

> *"Three different people thought differently, felt differently, reacted differently…"*

### 4.3.2 판정

| 요소 | Candidate 1 | Candidate 2 | Candidate 3 |
| --- | --- | --- | --- |
| Situation | 가이드 제시 (**동일**) | 가이드 제시 (**동일, verbatim 반복**) | 가이드 제시 (**동일, verbatim 반복**) |
| Emotion | **참가자 발굴** | **가이드 제시** (sad) | **가이드 제시** (irritated/angry) |
| Automatic Thought | 참가자 발굴 | **참가자 발굴 (핵심 과제)** | **참가자 발굴 (핵심 과제)** |
| Behavior | 참가자 발굴 | 참가자 발굴 | 참가자 발굴 |
| 참가자 저항 시 대응 | — | **possibility 질문** | **possibility 질문** |

즉 Candidate 2/3에서 emotion은 **교육 설계상 고정된 독립변수**다.
참가자에게 "무엇을 느낄 것 같나요?"라고 되묻는 것은 — v2 §3.3의 제안 문안 —
**고정되어야 할 변수를 참가자에게 넘기는 것**이며, "같은 상황·같은 말 → 다른 사고"라는 CCD Level 1 대비 구조를 무너뜨린다.

### 4.3.3 현재 코드의 실제 결함

```ts
// candidate-two-emotion-recheck (현재)
patientText: "That's one possibility. This second candidate is being told they seem
  'sad or discouraged' rather than confident and capable — quite different wording
  than the first candidate heard. Given that, what do you think this candidate might feel?"
```

두 개의 오류가 겹쳐 있다.

1. **`sad or discouraged`를 면접관 발화로 서술** — v2가 정확히 지적한 오류. (*"being told they seem…"*, *"quite different wording than the first candidate heard"*)
2. **emotion을 되묻는다** (*"what do you think this candidate might feel?"*) — v2가 **제안한** 수정 방향과 동일한 오류. 즉 v2의 처방은 오류 2를 그대로 남긴다.

또한 코드에는 이미 원문과 일치하는 `candidate-two-possibility` prompt(marker: *"I'm talking about possibility"*)가 **별도로 존재**한다. recheck와 possibility가 **같은 임상 동작을 중복 구현**하고 있다.

### 4.3.4 수정 지시

**(a) recheck를 possibility 재확인으로 교체.**

| prompt | 조치 |
| --- | --- |
| `candidate-two-emotion-recheck` | patientText 전면 교체 (§부록 A-1). `activationCondition` = `candidateTwoEmotionRepeatsSibling` 유지 |
| `candidate-two-possibility` | recheck와 **상호배타 게이팅**. recheck 발화 시 중복 발화 금지 |
| `candidate-three-emotion-recheck` | 동일 (§부록 A-2) |

**(b) same-situation prompt에 compliment verbatim 복원.**
`candidate-two-same-situation` / `candidate-three-same-situation`은 현재 `patientText`가 없어 fallback 시 **compliment 문장 자체가 소실**될 수 있다. 원저는 *"I'll tell her the same thing"* 을 명시하므로 두 prompt 모두 compliment를 **동일 문장으로 재제시**한다. (§부록 A-3)

**(c) 변경 금지**: `marker`, `source`, `requiredFields`, `outputFields`, 필드명. (validation kind는 (d) 참조)

**(d) validation 의미 정정**: `candidate-two-emotion` / `candidate-three-emotion`의 `{kind:"text", siblingField:"candidateOneEmotion"}`은 "candidate 1과 다른 감정을 말했는가"를 검사한다. 실제 임상 과제는 **제시된 감정의 가능성 수용**이므로, siblingField 검사는 *recheck 트리거 판정용*으로만 사용하고 **감정 자유생성을 요구하는 의미로 해석하지 않는다**. 이 해석을 코드 주석으로 고정한다.

### 4.3.5 Acceptance Criteria

- 세 candidate의 외부 situation·compliment 문장이 **완전히 동일**
- `sad` / `discouraged` / `irritated` / `hostile` 이 **면접관 발화로 출력되지 않음**
- Candidate 2/3에서 **참가자에게 감정을 새로 지정하도록 요구하지 않음**
- 참가자가 "그럴 리 없다"고 답할 때 → **possibility 질문**으로 대응하고, 그 다음 **thought**를 묻는다
- recheck와 possibility가 연속 중복 발화되지 않음

**우선순위: P0**

---

## 4.4 Candidate Reaction → Cycle 정합성 **[유지 + 구현 지점 명확화]**

### 4.4.1 현재 결함 (v2 진단 정확)

```ts
const reaction = fields.candidateTwoReaction === "positive" ? "positively" : "negatively";
```

`undefined` / `null` / 오타 → 모두 `negatively`로 확정된다.

### 4.4.2 v2가 명시하지 않은 것: **어느 파일에서 막을 것인가**

static message resolver는 **흐름을 바꿀 수 없다**. 여기서 `undefined`를 반환하면 generic fallback으로 떨어져 §4.2가 없애려는 문제를 다시 만든다.
따라서 **두 파일 협업**이 필요하다.

| 파일 | 역할 |
| --- | --- |
| `protocol/sessions/s01.ts` | `candidate-two-cycle` / `candidate-three-cycle`에 **`activationCondition`** 추가 → reaction이 유효값일 때만 활성. 유효하지 않을 때 활성화되는 **recheck prompt 신규 추가** |
| `runtime/static-messages/s01.ts` | 유효값 전제 하에 valence 치환만 수행. 유효하지 않으면 **cycle 문장을 생성하지 않음** |

### 4.4.3 프로토콜과 반대되는 reaction 처리

원저에서 Candidate 2/3의 면접관 반응이 부정적인 이유는 **후보의 위축·냉담한 행동 때문**이다(감정 자체가 아님).

> *"While she isolated herself a little, became cold or distant, what happened to me, who said this?"* → *"You'd withdraw yourself a little."*

참가자가 여기서 "positive"라고 답하면, 원저의 대응 방식은 **덮어쓰기도 강행도 아닌 재확인**이다(§4.3의 possibility 패턴과 동일).

```text
unexpected reaction → clarification/recheck → 유효한 임상적 관계 확인 → cycle closure
```

### 4.4.4 Acceptance Criteria

- missing/invalid reaction을 `negative`로 간주하지 않음
- 사용자가 positive라 답했는데 즉시 "you said negative"로 출력하지 않음
- 사용자 답변을 근거로 TBCT cycle 자체를 임의 재정의하지 않음
- cycle closure 시점에 reaction 값이 **반드시 존재**

**우선순위: P0**

---

## 4.5 Example Preview **[유지 + 원문 문안 확보]**

v2 §3.5의 요구(예시 직전 1문장 rationale)는 타당하며, **매뉴얼에 그대로 쓸 문장이 있다** — 창작할 필요가 없다.

> S01 매뉴얼: *"**Why start with strangers, not you?** It's much easier to see the pattern clearly on a neutral example first. Once you've seen how it works with the three candidates, looking at your own situation becomes far simpler — and less overwhelming."*

`preview-candidates` prompt의 patientText로 **이 문장을 축약 복원**한다. (§부록 A-4)

**금지**: 장문 psychoeducation / example 전 다단계 신규 상담 flow / rationale 다중 turn 반복.
**우선순위: P1**

---

## 4.6 **[신규 N-2]** Returning Arrows — 응답 소실 버그

### 문제

```ts
{ slug: "candidate-one-thought-arrow",   ..., outputFields: ["candidateOneReturningArrows"] },
{ slug: "candidate-one-emotion-arrow",   ..., outputFields: ["candidateOneReturningArrows"] },
{ slug: "candidate-one-behavior-arrow",  ..., outputFields: ["candidateOneReturningArrows"] },
```

세 개의 **서로 다른 arrow**가 단일 필드에 기록된다. 스칼라라면 마지막 값만 남고 앞선 두 응답은 사라진다.

원저의 세 arrow는 각각 다른 관계다.

| arrow | 원저 질문 | 관계 |
| --- | --- | --- |
| emotion → thought | *"the moment she feels happy, what do you think she keeps on thinking?"* | 감정이 사고를 강화 |
| behavior → 상대 | *"the fact that she smiled… what would happen to me?"* | 행동이 환경을 변화 |
| 상대 반응 → thought | *"By continuing a positive conversation… how do you think she would receive it?"* → *"It would confirm her thought"* | 확증 편향 완결 |

**동일 결함이 다음에도 존재한다.**

- `three-person-observation` / `situation-thought-emotion-link` → 둘 다 `threePersonModelInsight`
- `read-distortions` / `identify-distortion` → 둘 다 `participantSelectedDistortions` (§4.8과 결합)

### 수정

`candidateOneReturningArrows` 등은 **배열 필드 + append 시맨틱**으로 명시하거나, 3개 하위 필드로 분리한다.
필드명 변경이 runtime 영향 범위를 넘어서면 **배열 append 명시**를 선택한다(필드명 보존).
`threePersonModelInsight`도 동일 처리.

**Acceptance**: Candidate 1 사이클 완료 후 세 arrow 응답이 **모두 상태에 남아 있음**.
**우선순위: P0**

---

## 4.7 **[신규 B-8]** telegraphic-situation의 대상은 '지금 여기'

### 원문

> Therapist: *"Would you say that **here and now** we are experiencing a situation? And how would you describe it, quite telegraphically?"*
> Patient: *"I'd say that I can see, maybe the first step towards my recovery."*
> Therapist: *"This is very interesting… but **is this the situation or a thought?**"*

즉 `telegraphic-situation` → `situation-or-thought`는 **현재 상담 장면**을 재료로 한 Socratic 학습 쌍이다. 참가자의 **개인 문제 situation을 수집하는 질문이 아니다.**

개인 사례는 매뉴얼상 **three-person example 이후**에 온다.

> S01 매뉴얼: *"**After the three-person example**, the AI will come back to a situation from your own life."*

### 현재 코드의 상태

`situation-or-thought`가 워크시트 "My situation"을 덮어쓰는 문제는 코드 주석에 이미 기록돼 있다. 그러나 **더 근본적으로는 `telegraphic-situation`의 산출값도 개인 situation이 아니다.**

### 수정

- `situationThoughtDistinction`은 **학습 확인용 필드**로만 사용한다는 것을 s01.ts 주석으로 고정
- 개인 situation을 이 필드에 바인딩하지 않는다
- 워크시트 바인딩 정정은 Phase 2(`worksheet-bindings/tbct-s01.ts`)로 이관하되, **바인딩 대상 필드가 잘못되었다는 판정은 Phase 1에서 확정 기록**
- `mandatory-opening` 노드와 `situation-thought-distinction` 노드가 `situationThoughtDistinction`을 **중복 게이트**하는 구조도 함께 정리

**우선순위: P1** (워크시트 실제 수정은 Phase 2)

---

## 4.8 **[교체 C-2]** Cognitive Distortion — 목록 접근 + **선택 개수 강제 해제**

### 4.8.1 v2가 맞은 부분: list access 게이팅

> S01 매뉴얼: *"**The cognitive distortions list.** You'll need it for Part 2. It's included at the end of this guide (see the Annex)… **The AI will check that you have it before that part begins.**"*
> *"**The AI won't tell you which distortion you have.** It will ask whether any on the list seem to fit — the recognition is yours to make."*

v2 §3.7의 "list 없으면 자유서술로 진행" fallback 삭제는 **정당**하다. 그대로 승계한다.

또한 매뉴얼이 목록 위치를 명시하므로 **안내 문구가 구체적일 수 있다** — "사전 안내문 맨 뒤 Annex".

### 4.8.2 v2가 놓친 것: 코드가 distortion **2~3개 선택을 강제**하고 있다

```ts
{ slug: "read-distortions", ..., outputFields: ["participantSelectedDistortions"],
  validation: { kind: "min_items", minItems: 2, maxItems: 3 } },
```

원저에서 "2~3개"는 **선택 개수가 아니라 읽기 개수**다.

> Therapist: *"**Can you read two or three of these?**"*
> [The patient reads two or three cognitive distortions from the sheet]
> Therapist: *"Can you find any distortions that fit the situation you have just described to me?"*
> Patient: *"Yes, dichotomous thinking."*  ← **1개**

S03 system prompt도 같은 방향이다: *"A thought may correspond to more than one distortion, but **one is usually sufficient**."*

현재 validation은 참가자가 1개만 인식했을 때 **추가 distortion을 만들어내도록 압박**한다. 이는 v2가 §2.2에서 스스로 금지한 *"사용자에게 없는 cognitive distortion을 AI가 대신 선택"* 과 같은 범주의 위반을, **코드가 구조적으로 강제**하는 형태다.

### 4.8.3 수정

| prompt | 현재 | 수정 |
| --- | --- | --- |
| `read-distortions` | `outputFields: ["participantSelectedDistortions"]`, `min_items 2~3` | 산출을 **읽기 확인**으로 분리. `participantSelectedDistortions`를 쓰지 않음. validation은 "2~3개를 읽었는가" 확인 |
| `identify-distortion` | `outputFields: ["participantSelectedDistortions"]` | **유일한 산출 prompt**. 개수 하한 제거(0 허용), 상한 강제 없음 |
| `confirm-list` | `validation: boolean` | `false`일 때 **다음 prompt 비활성** + Annex 접근 안내 prompt 활성 (신규) |

### 4.8.4 Acceptance Criteria

- distortion 단계 시작 전 list access 확인
- list access 실패 시 단계 **강행하지 않음**, Annex 위치 안내
- 참가자가 1개만 지목해도 **정상 진행**
- AI가 distortion을 지정하거나 개수를 채우도록 요구하지 않음
- `read-distortions`가 `participantSelectedDistortions`를 오염시키지 않음

**우선순위: P0**

---

## 4.9 Participant Summary **[유지]**

generic fallback("예를 하나 들어주세요") 대신 **Situation / Thought / Emotion / Behavior 관계를 참가자 자신의 말로** 요약하게 한다. AI가 선제 요약을 제공하지 않는다.

**우선순위: P1**

---

# 5. S02 수정 기획

## 5.1 `[problem]` / `[goal]` Placeholder 제거 **[유지]**

### 현재 상태

`reflect-problem-score`의 marker는 `"Thank you. So [problem / X / Y / Z] is a [score]"`, `reflect-goal-score`는 `"So pursuing [goal]"`.
patientText는 `runtime-static-message.ts`의 `reflectThenAskForNextRating`이 동적으로 공급하도록 되어 있으나, **이 경로가 실패하면 marker의 대괄호 템플릿이 그대로 노출**된다.

### 수정

- 실제 대상명 치환은 `static-messages/s02.ts` 안에서 처리 (공용 `runtime-static-message.ts` 수정 금지)
- **현재 평가 대상이 없을 때는 static message를 생성하지 않는다** (대괄호 문자열 출력 금지)
- X/Y/Z는 그 라벨 자체를 대상명으로 사용

**Acceptance**: `[problem]` 0회 / `[goal]` 0회 / 각 rating turn에서 현재 평가 대상 식별 가능.
**우선순위: P0**

---

## 5.2 **[신규 N-3]** CCGH anchor 문구 부재 — **P0로 승격**

### 문제

```ts
"tbct-s02-n08-p02-six-anchor-goal-scale":
  "Use the same 0–5 color scale for each goal: 0 Light blue, 1 Dark blue,
   2 Light green, 3 Dark green, 4 Yellow, and 5 Red.
   Please rate how difficult each goal feels right now."
```

세 가지가 동시에 잘못됐다.

1. **anchor 의미가 0개.** 그런데 이 prompt의 validation은 `{kind:"exact_scale_anchors", min:0, max:5}` 다 — **validation과 텍스트가 정면 모순**
2. **"the same 0–5 color scale"** — CCPH와 CCGH는 색상만 같고 **anchor 의미가 다르다**. 같다고 안내하는 것은 오정보
3. **한국어판도 동일** (색상만 나열)

대조: **CCPH 쪽은 이미 anchor가 정확히 들어가 있다.** 즉 goal 쪽만 누락된 비대칭 결함이며, v2 §4.4/§4.5가 두 척도를 나란히 "의미 보존" 과제로 묶어 서술하면서 **"goal 쪽엔 아예 문구가 없다"는 사실을 놓쳤다.**

### 왜 P1이 아니라 P0인가

CCGH 점수는 Protocol V9의 **결과 측정 baseline**이다. 참가자가 "problem 척도와 같은 의미"라고 안내받고 평가하면 baseline 자체가 오염되며, 이후 전 세션의 변화 추적이 무효가 된다. placeholder 노출보다 **데이터 영향이 크다**.

### 원문 (S02 매뉴얼 Annex, verbatim)

| SCORE | CCGH |
| --- | --- |
| 0 Light blue | This goal/aspiration is **easy and comfortable** to achieve (or I have already achieved it) |
| 1 Dark blue | This goal/aspiration is **not so easy or comfortable** to achieve |
| 2 Light green | This goal/aspiration is **difficult or uncomfortable** to achieve |
| 3 Dark green | This goal/aspiration is **very difficult or uncomfortable** to achieve |
| 4 Yellow | Achieving this goal/aspiration is **distressing and/or really hard** to achieve |
| 5 Red | Achieving this goal/aspiration is **so distressing that I cannot imagine myself trying** |

확정 문안은 **§부록 A-5 (영/한)** 참조.

### 부수 수정

`reflect-goal-score`의 `askVerb`가 `"Using the same 0 to 5 color scale, how would you rate"` 로 되어 있다 — 동일한 "same scale" 오정보. **"지금 이 목표를 추구하는 것이 얼마나 어렵거나 힘들게 느껴지는지"** 의미로 교체한다.

### Acceptance Criteria

- goal 척도 안내에 **6개 anchor 의미가 모두 포함**
- "problem과 같은 척도"라는 서술 없음
- 4(distressing and/or really hard)와 5(cannot imagine myself trying)의 **임상적 차이 유지**
- 높은 goal score를 목표의 가치·좋고 나쁨으로 해석하지 않고 **현재 pursuit difficulty/distress**로 설명
- 한국어판 동일

**우선순위: P0** *(v2에서 P1 → 승격)*

---

## 5.3 CCPH anchor 의미 보존 **[유지 — regression 확인만]**

현재 `six-anchor-problem-scale` 영/한 텍스트는 매뉴얼 Annex와 **일치**한다. 0~3 discomfort / 4~5 distress 구분도 `discomfort-distress-distinction`에 정확히 구현돼 있다.

→ **신규 수정 불필요.** v2 §4.4는 이미 충족된 상태이므로 **regression 확인 항목으로만** 유지한다.

| Score | CCPH |
| --- | --- |
| 0 | 문제가 작고 해결이 쉽거나 더 이상 문제가 아님 |
| 1 | 불편감이 있으나 해결이 비교적 쉬움 |
| 2 | 명확한 불편감 및/또는 해결이 어려움 |
| 3 | 상당한 불편감 및/또는 해결이 매우 어려움 |
| 4 | 괴로움(distress)이 있고 해결이 매우 어려움 |
| 5 | 괴로움이 매우 커 해결책이 보이지 않음 |

**우선순위: P2 (regression)**

---

## 5.4 Total / Baseline 의미 + 완전성 Guard **[유지 + 구현 구체화]**

### 현재 결함

```ts
const ratings = ratingNumbers(fields.problemRatings);
const total = ratings.reduce((sum, value) => sum + value, 0);
```

**완전성 검사가 없다.** 3개 문제 중 1개만 평가된 상태에서도 총점을 확정 발화한다.

### Guard

```text
item count > 0  AND  item count === rating count   → 총점 확정
그 외                                              → 총점 문장 생성하지 않음
```

`problems.length` ↔ `problemRatings.length`, `goals.length` ↔ `goalRatings.length` 대조로 구현한다.

### baseline 의미 설명 (매뉴얼 근거)

> *"There's no 'good' or 'bad' total. **A high score isn't a failure; it's simply the starting point you'll measure your progress from.**"*
> *"the yellow and red items aren't the ones to avoid. They're usually **exactly where therapy does its most valuable work**."*

현재 `problem-total` 문구는 *"These are priority areas for therapy."* 로 끝난다 — 방향은 맞으나 **baseline 의미가 빠져 있다.** 총점을 성적처럼 읽지 않도록 baseline 문장을 추가한다. (§부록 A-6)

### 부수 수정

`acknowledge-manageable`의 *"That's good to hear"* (score 0~1 활성)는 낮은 점수를 '좋음'으로 평가하는 뉘앙스다. 매뉴얼의 "no good/bad" 원칙과 어긋나므로 **중립 acknowledgement**로 교체.

**Acceptance**: 불완전 rating 상태의 총점 확정 0회 / 총점을 진단·성적으로 표현하지 않음 / baseline 의미 설명 포함.
**우선순위: P1**

---

## 5.5 **[신규 N-4]** 재방문 시 Opening 이중 발화

```ts
{ slug: "first-session-opening", ...,  /* activationCondition 없음 */ outputFields: ["openingMode"] },
{ slug: "returning-opening",     ..., activationCondition: { field:"returningParticipant", operator:"equals", value:true } },
```

`first-session-opening`에 조건이 없어 **재방문 참가자에게도 첫 세션 인사가 후보로 남는다.** 두 prompt가 같은 `openingMode`를 산출하므로 상태 오염도 발생한다.

**수정**: `first-session-opening`에 `{ field:"returningParticipant", operator:"equals", value:false }` 추가.

**우선순위: P0**

---

## 5.6 Private Problem X/Y/Z **[유지 + deadlock guard 신규]**

### 정책 (매뉴얼 근거)

> *"you can still give it a place on your list, simply called **X, Y, or Z**. **You never have to explain what it is, and the guide will never ask.**"*
> *"it will never ask what your X, Y, or Z stands for."*

현재 `offer-private-placeholders` 영/한 문구는 이 정책과 **일치**한다. 유지.

### **[신규 B-10]** deadlock 위험

```ts
{ slug: "hidden-problems", ..., requiredFields: ["privateProblemPlaceholders"] }
```

참가자가 "없어요"라고 답하면 필드가 채워지지 않아 노드 완료가 막힐 수 있다.
**수정**: `continue-without-placeholder`의 `completionEffect`로 **명시적 빈 배열**을 기록한다.

### Acceptance

- X/Y/Z 등록 가능 / 내용 공개 요구 **0회** / X/Y/Z도 일반 problem과 동일하게 rating
- 거절 시에도 정상 진행 (deadlock 없음)

**우선순위: P1**

---

## 5.7 Problem / Goal 개수 **[유지 — 이미 충족]**

```ts
validation: { kind: "array", minItems: 1, maxItems: 5 }
```

매뉴얼(*"up to five, though fewer is completely fine"*)과 **일치**. 신규 수정 불필요, regression 확인만.

**우선순위: P2 (regression)**

---

## 5.8 Previous Score Anchoring 방지 **[유지 — Phase 1 범위 제한]**

> *"**Why you won't see your old scores:** When you re-rate, the guide keeps your earlier numbers hidden so today's rating stays fresh and honest — old scores can quietly pull new ones toward them. Once you've finished, the full journey is revealed."*

6개 파일 안에는 과거 점수 필드가 없다. 따라서 Phase 1에서 할 수 있는 일은:

- s02.ts에 **restriction 명시**: 재평가 완료 전 과거 점수를 발화에 포함하지 않음
- 신규 구현이 필요하면 **범위를 임의 확장하지 않고 별도 이슈 등록**

**우선순위: regression P1 / 신규 구현은 별도 Scope**

---

## 5.9 **[신규 B-11]** 먼 꿈에 대한 small-step 질문 누락

> 매뉴얼: *"For a distant dream, the question simply becomes: **what's one small thing you could do now to start moving toward it?**"*

코드에 `goal-dream` prompt는 있으나 이 후속 질문이 없다. `goal-dream` 활성 시 이어지는 follow-up prompt를 추가한다.

**우선순위: P1**

---

## 5.10 Validation ↔ Input UI 정합성 **[유지]**

주관식 prompt가 protocol 설정 때문에 선택형 UI로 강제되지 않는지 확인한다.
`validation.kind` 문제 → `s02.ts` 수정 / renderer 문제 → Phase 1 밖.

**우선순위: P2**

---

# 6. S03 수정 기획

## 6.1 **[교체 C-5]** Safety — 시작 체크만으로는 불충분

### 6.1.1 v2의 진단 오류

v2 §5.1은 "session-start mandatory safety check 누락"을 P0로 신규 편입했다.
**그러나 코드에는 이미 존재한다.**

```ts
{ slug: "safety-check", type: "session_start", ...,
  marker: "Before we start, how are you doing today",
  validation: { kind: "safety_check" },
  completionEffect: { type: "evaluate_safety" } }
```

marker는 system prompt와 일치한다. `safety-pause` 노드와 crisis edge도 존재한다.
따라서 v2 §5.1의 P0 항목 8번("session-start mandatory safety check")은 **이미 충족**이며 regression 항목이다.

### 6.1.2 실제 결함: crisis edge가 **한 곳에서만** 나간다

```ts
extraEdges: [
  { sourceSlug: "safety-check", targetSlug: "safety-pause",
    condition: { field: "crisisSignal", operator: "equals", value: true }, priority: 1 },
  ...
]
```

system prompt는 명확하다.

> *"If the patient expresses suicidal ideation, self-harm urges, or any crisis-level content **at any point during the session**: 1. **Pause the Intra-TR immediately.**"*

현재 구조에서는 Q7이나 Q9에서 crisis가 발생해도 **`safety-pause`로 갈 경로가 없다.**
즉 v2 §5.1의 acceptance *"crisis 상태에서 Q1~Q14를 계속 진행하지 않음"* 은 **현재 구조로 만족 불가**다.

### 6.1.3 수정

`s03.ts`의 `extraEdges`에 **모든 노드 → `safety-pause`** crisis edge를 추가한다(우선순위 최상).

```text
safety-check / intra-tr-introduction / q1-situation / q2-automatic-thought /
factual-thought-meaning / q2b-at-belief / q3-emotion / q4-behavior-body-summary /
q5-q7-behavior-and-distortion / q8-q9-evidence / q10-conclusion /
q11-new-emotions / q12-q14-final-evaluation / closing
        → safety-pause   (condition: crisisSignal === true, priority 1)
```

runtime이 전역 safety 규칙을 이미 지원한다면 그 경로를 우선하되, **6개 파일 범위 내 해결책은 edge 전수 추가**다.

### 6.1.4 safety-pause의 `terminal: true` — **의도된 설계로 확정**

`safety-pause`는 `terminal: true`다. 반면 system prompt는 *"Do NOT continue the structured exercise **until the patient confirms safety**"* 로, 문면상 재개 가능성을 배제하지 않는다.

**Protocol V9이 이 모호성을 해소한다.**

> *"On detection: crisis resources displayed, **therapeutic interaction restricted until human review**, on-call clinician notified within 15 minutes. Clinical responsibility hierarchy: AI detection → automated alert → **on-call clinician assessment** → site PI escalation."*

즉 **안전 확인 주체는 AI가 아니라 사람**이다. AI가 참가자의 "괜찮아요" 한마디로 자율 재개하는 것은 Protocol V9 위반이다.
→ **`terminal: true` 유지**. "safety confirmation 후 재개"는 **human review를 거친 신규 세션**으로만 발생한다. 이 판단 근거를 s03.ts 주석에 고정한다.

### 6.1.5 Acceptance Criteria

- S03 시작 시 mandatory safety check 존재 **(regression)**
- **어느 문항에서든** crisis 신호 시 `safety-pause`로 라우팅
- crisis 상태에서 Q1~Q14 진행 0회
- AI 자율 재개 0회 (terminal 유지)
- crisis를 cognitive restructuring 문제로 처리하지 않음

**우선순위: P0**

---

## 6.2 14문항 Strict Sequence **[유지]**

```text
Q1 → Q2a → Q2b → Q3a → Q3b → Q4a → Q4b → [Summary checkpoint] →
Q5 → Q6 → Q7 → Q8 → Q9 → Q10a → Q10b → Q11a → Q11b → Q12a → Q12b → Q13 → Q14
```

> *"Guide the patient through each question in **strict sequence**… **Do not skip questions. Do not rush.**"*

각 응답 뒤 **짧은 validation/reflection → 다음 질문**.
금지: 임의 skip / 선행 수행 / AI 대필 / 결론·emotion·thought 제안.

**우선순위: P0**

---

## 6.3 **[신규 B-12]** Redirection Contracting 누락 (system prompt v4)

system prompt STRUCTURAL RULES에 명시된 세션 시작 계약이 코드에 없다.

> *"**Contract at the start of the session:** 'I may redirect you sometimes to keep us on track — not because what you're saying isn't valuable, but to make sure we complete all fourteen questions together. Is that okay?'"*

`intra-tr-introduction` 노드에 `redirection-contract` prompt를 신규 추가한다. 문안은 **원문 verbatim**(§부록 A-7).

**우선순위: P1**

---

## 6.4 Q1 Specific Situation **[유지]**

추상적 응답 시 specific moment / place / time / actual event 방향으로 **1회** 구체화.
`describe-situation`의 patientText에 *"Try to describe it as if it were happening right now"* 절을 **복원**한다(현재 marker가 이 절을 자름).

**우선순위: P1**

---

## 6.5 Factually True AT **[유지 + Q2b 확장]**

### 원문

> *"Sometimes the patient will identify a thought that is not a cognitive distortion but a factual reality (e.g., 'my dog is going to die,' 'I will lose my job,' 'this illness is serious'). In these cases, **do NOT attempt to dispute the thought as though it were a distortion.**"*
> *"Guide the patient toward the underlying belief that IS amenable to examination — often something like 'I won't be able to cope'… **That underlying belief becomes the working AT for the rest of the Intra-TR.**"*
> 확인: *"So the thought we'll be working with is not just that [factual event] will happen, but that [underlying belief]. Does that feel right?"*

코드에는 `factual-thought-meaning` 노드와 `automaticThoughtIsFactual` edge가 **이미 구현**돼 있다. 구조는 정확하다.

### **[신규 B-5]** v2가 놓친 것: Q2b가 어떤 thought를 평가하는지 불명확

`q2b-at-belief`의 marker는 *"How much do you believe that thought"* 뿐이다. factual 경로를 거쳐 working AT가 생성된 경우 **어떤 thought에 대한 %인지 참가자가 알 수 없다.**

v2는 Q13(§5.13)만 다뤘으나, **AT readback이 필요한 지점은 Q2b·Q11 맥락·Q13 세 곳**이다.

### 필드 우선순위 (전 지점 공통)

```text
workingAutomaticThought  →  없으면  →  automaticThought
```

### **[신규]** Q2b 시점 선택 clarification 누락

> *"If the patient says they believed it more at the time than now, clarify: 'We can work with either — the belief at the time, or what you believe right now. **Which feels more alive and important to examine?**' Record the percentage that corresponds to the version they choose."*

대응 prompt가 코드에 없다. `q2b-at-belief` 노드에 clarification prompt를 추가한다.

### Acceptance Criteria

- 사실인 사건을 오류라고 반박하지 않음
- underlying belief를 **사용자 확인 없이 확정하지 않음**
- working AT 확정 후 **Q2b~Q13 전 구간에서 동일 working AT 기준 유지**
- Q2b에서 평가 대상 thought가 명시적으로 readback됨

**우선순위: P0**

---

## 6.6 **[종결 C-6]** Q4b 이후 Participant Summary — behavior 제외로 확정

### v2의 미결 사항

v2 §12는 이를 유일한 `[충돌/확인 필요]`로 남겼다. v3에서 **종결**한다.

### 원문

> *"After Q4b, before moving on, ask the patient to summarize what they have understood so far. **Do NOT summarize yourself.** Instead, ask:*
> *'Before we continue, could you summarize in your own words what we've covered so far — **the situation, the thought, the emotion, and what happens in your body**?'"*
>
> 직후: *"You can see how this pattern tends to maintain itself — the thought feeds the emotion, **the emotion drives the behavior, and the behavior reinforces the thought.**"*

### 판정 근거

1. 체크포인트 질문은 **verbatim quote**이며 4요소를 명시적으로 열거한다
2. **behavior는 바로 다음 cycle note가 다룬다** — 원문 내부에서 역할 분담이 되어 있다. 구조적 불일치가 아니라 **의도된 분업**으로 읽는 것이 자연스럽다
3. *"Do NOT summarize yourself"* 는 가이드 주도의 내용 확장을 금지한다. 요약 **범위를 넓히는 것**도 가이드 주도 확장에 해당한다

→ **A안(원문 4요소) 확정.** behavior는 `cycle-note`에서 커버한다.

### 코드 조치

`participant-summary` marker(*"Before we continue, could you summarize"*)는 이미 원문과 일치한다. **patientText만 verbatim 복원**하면 된다(§부록 A-8).

> **v3 미결 항목: 0건**

**우선순위: P1**

---

## 6.7 **[교체 C-3]** Q5 / Q6 — 창작 금지, 원문 문장 복원

### v2의 지시와 그 문제

v2 §5.6은 Q5 앞에 다음 취지의 설명 추가를 요구했다.

> "어떤 행동은 장기적으로 도움이 되지 않아도 잠깐의 relief/protection/avoidance를 주기 때문에 반복될 수 있음"

**그러나 원문 Q5 질문 자체가 이 rationale을 이미 담고 있다.**

> *"Are there any advantages or benefits to behaving that way — **even temporarily? Even a small sense of relief counts.**"*

현재 코드의 marker는 `"Are there any advantages or benefits"` 로, **rationale이 들어 있는 뒷부분을 잘라낸다.** 즉 문제는 "설명이 부족"한 것이 아니라 **"원문 문장이 잘린" 것**이다.

§3.3 원칙 P에 따라 **신규 psychoeducation 문장을 창작하지 않고 원문 전체 문장을 복원**한다.

### Q5 재확인 (원문)

> *"Patients often say 'none.' Gently challenge this: '**We tend to do things for a reason, even if it doesn't serve us well in the long run. Is there any momentary comfort or relief in it?**'"*

코드의 `behavior-pros-follow-up`(marker: *"We tend to do things for a reason"*, activation: `behaviorProsDenied`)이 정확히 대응한다. patientText만 원문 전체로 복원.

### Q6

> *"And what are the disadvantages or costs of behaving that way?"*

### Acceptance Criteria

- pros 질문이 해당 행동을 **권장하는 의미로 읽히지 않음**
- Q5/Q6 목적을 별도 추론 없이 이해 가능
- **원문에 없는 임상 설명 문장을 추가하지 않음**

**우선순위: P1**

---

## 6.8 Q7 Cognitive Distortion **[유지 + requiredFields 결함 신규]**

### 정책 (S01과 다름 — 정확)

> *"If the patient has **not yet received** a cognitive distortions list, briefly offer examples (all-or-nothing thinking, catastrophizing, mind-reading, labeling, emotional reasoning, overgeneralization, etc.) and ask which fits best."*

S01은 목록 접근 확인 후 진행(§4.8), S03은 예시 fallback 허용. **두 정책의 차이는 원문대로이며 의도적**이다.

### **[신규 B-6]** requiredFields가 distortion 존재를 강제한다

```ts
{ slug: "q5-q7-behavior-and-distortion", ...,
  requiredFields: ["behaviorPros", "behaviorCons", "cognitiveDistortion"] }
```

`cognitiveDistortion`이 필수이므로 참가자가 "해당 없음/모르겠음"이라 답하면 **노드 완료가 막힌다.**
이는 v2 §5.7이 스스로 금지한 *"반드시 하나 이상의 distortion이 있다고 가정"* 과 코드가 모순되는 지점이다.

**수정**: `none` / `unsure` 를 허용값으로 정의하고 validation에서 수용. requiredFields는 유지(응답 자체는 필요).

### Acceptance Criteria

- 목록 있으면 실제 목록 활용 / 없으면 최소 예시 기반 진행
- **최종 판단은 사용자**
- "해당 없음" 응답으로도 **정상 진행**
- 복수 distortion 강제 없음 (*"one is usually sufficient"*)

**우선순위: P1** *(fallback 자체는 P2, requiredFields 결함은 P1)*

---

## 6.9 **[교체 C-4]** Q8 / Q9 — validation이 원문 요구와 모순

### 원문

> *"**Do not accept a single piece of evidence without at least one prompt for more.** Aim for two to three pieces. **If the patient genuinely cannot find more after one prompt, accept that and move on.**"*

두 요구가 쌍으로 존재한다: **(a) 최소 1회 재요청**, **(b) 그래도 없으면 수용하고 진행**.

### 현재 코드

```ts
validation: { kind: "array", minItems: 2, maxItems: 3, promptOnceIfSingle: true }
```

`minItems: 2`가 (b)를 **차단**한다. 참가자가 재요청 후에도 1개뿐이면 노드 완료 조건을 만족하지 못하고, `evidence-for-more`(activation: `evidenceForCount < 2`)가 **계속 활성 상태로 남는다.**

이는 v2가 §2.2에서 금지한 *"동일한 목적 없는 generic fallback의 연속 반복"* 과 §5.8이 명시한 *"무한 반복해서 evidence를 만들어내도록 압박하지 않는다"* 를 **코드가 정면으로 위반**하는 구조다.
v2 §5.8은 요구사항을 정확히 서술했지만 **현재 validation이 그 요구와 모순된다는 사실을 잡지 못했다.**

### 수정

```ts
validation: {
  kind: "array",
  minItems: 1,            // ← 2에서 완화. 재요청 후 수용 가능하게
  targetItems: 2,         // 목표치는 별도 표현
  maxItems: 3,
  promptOnceIfSingle: true
}
```

follow-up prompt의 activationCondition에 **재요청 1회 소진 플래그**를 추가한다.

```ts
activationCondition: {
  all: [
    { field: "evidenceForCount", operator: "less_than", value: 2 },
    { field: "additionalEvidenceRequestedForAT", operator: "equals", value: false }
  ]
}
```

Q9도 동일 (`evidenceAgainstCount` / `additionalEvidenceRequestedAgainstAT`).

### Q9 방향 제시 (원문)

> *"Use helpful directions such as: **general health, recent behaviors, past experiences of coping, feedback from others, or objective facts.**"*

`evidence-against-direction`의 patientText로 복원.

### Acceptance Criteria

- 첫 evidence 1개만 받고 즉시 다음 문항으로 넘어가지 않음
- **최소 1회 추가 질문**
- 추가 evidence 없음이 확인된 후 **재요청 반복 0회**, 정상 진행
- evidence count와 실제 저장 state 일치

**우선순위: P0** *(v2에서 P1 → 승격: 진행 차단 위험)*

---

## 6.10 Q10 — Balanced Conclusion + Therefore **[유지 + 구현 지점 정정]**

### 원문

> *"Before asking for the belief rating, **read the patient's full conclusion back to them as a single, complete statement, including the word 'therefore.'**"*
> *"So your conclusion is: '[initial conclusion], therefore [extended conclusion].' How much do you believe **that entire conclusion**, from 0 to 100%?"*

### v2가 놓친 것: **s03.ts는 이미 올바르게 게이팅돼 있다**

```ts
{ slug: "conclusion-belief", ...,
  validation: { kind: "rating", min: 0, max: 100, requiresField: "conclusionReadBackComplete" } }
```

`full-conclusion-readback` 완료 전에는 Q10b가 활성화되지 않는다. **구조는 정확하다.**

### 실제 결함: **static message가 없다**

`static-messages/s03.ts`에는 `pause-and-escalate` 항목 **하나뿐**이다.
`full-conclusion-readback`은 marker(*"So your conclusion is"*)만 있고 대응 static text가 없으므로 → **generic fallback → `[initial conclusion]` 계열 문자열 노출 위험**.

즉 v2 §5.9가 "Q10b 진입 금지"를 요구한 것은 **이미 충족**이고, 진짜 할 일은 **readback 문안 구현**이다.

### 수정

`static-messages/s03.ts`에 `full-conclusion-readback` resolver 추가.

```text
balancedConclusion 없음                     → 문장 생성하지 않음 (Q10a로)
balancedConclusion 있음 / therefore 없음    → 문장 생성하지 않음 (therefore-extension으로)
둘 다 있음                                  → 실제 두 field 결합 readback
```

문안: **§부록 A-9 (영/한)**

### Acceptance Criteria

- `[initial conclusion]` 0회 / `[extended conclusion]` 0회
- extension 없이 Q10b 진입 0회 **(regression)**
- 전체 conclusion을 대상으로 0~100 belief rating

**우선순위: P0**

---

## 6.11 Q11 — Positive 먼저, Negative는 Q3a 원본만 **[유지 + 문안 구현]**

### 원문

> *"Ask about **positive emotions first**: 'Now that you have reached this conclusion, what positive emotions do you feel — if any?'"*
> *"After the patient responds, then ask about negative emotions **by referring specifically to the emotion named at Q3a**: 'And what about [emotion named at Q3a]? Has that changed? Is it still present, and if so, has it decreased?'"*
> *"**Do not introduce new negative emotions that the patient did not name at Q3a.**"*

### 현재 코드의 결함

```ts
{ slug: "original-negative-emotion", ...,
  marker: "And what about [emotion named at Q3a]",   // ← 리터럴 placeholder가 marker에 포함
  validation: { kind: "same_field_reference", field: "primaryEmotion" } }
```

marker에 대괄호 placeholder가 그대로 들어 있고, **대응 static message가 없다** → 그대로 노출될 수 있다.

**수정**: `static-messages/s03.ts`에 `primaryEmotion` 실제 값을 치환하는 resolver 추가(§부록 A-10). `primaryEmotion`이 비어 있으면 문장을 생성하지 않는다.

### Acceptance Criteria

- `[emotion named at Q3a]` 0회
- positive emotion을 **먼저** 질문
- Q3a original emotion **실제 값** 사용
- 신규 negative emotion 임의 생성 0회

**우선순위: P0**

---

## 6.12 Q11b Emotion Intensities **[유지 + 문안 신규]**

### 현재 코드

```ts
{ slug: "emotion-intensities", type: "rating", source: [635, 658],
  outputFields: ["newEmotionIntensities"],
  validation: { kind:"rating", min:0, max:100,
                allowedEmotionSources: ["positiveEmotions", "primaryEmotion"] } }
```

`marker`도 `patientText`도 **없다** → generic fallback 확정 발생 지점이다.
`allowedEmotionSources` 제한은 원문과 일치하므로 유지.

> *"Ask for intensity ratings only for: The positive emotion(s) the patient just named. The original negative emotion from Q3a (if still present). **Do not ask about emotions not previously named by the patient.**"*

**수정**: 어떤 감정을 평가하는지 명시하는 patientText 추가(§부록 A-11). 대상 감정 목록은 `positiveEmotions` + `primaryEmotion`(잔존 시)에서 동적 생성.

**금지**: *"0에서 100 사이의 숫자 하나로 답해 주세요."* 단독 출력.

**우선순위: P0**

---

## 6.13 Q12 **[유지 + 조건 결함 신규]**

### Q12a

> *"What do you intend to do now, given this new conclusion? What concrete actions come to mind?"*
> *"**If the patient describes specific intentions**, note them and say: 'Those sound like the beginning of an action plan…'"*

### **[신규 B-13]** activationCondition이 무의미

```ts
{ slug: "action-plan-bridge", ...,
  activationCondition: { field: "intendedActions", operator: "exists" } }
```

`intendedActions`는 노드 requiredFields이므로 Q12a 완료 후 **항상 존재**한다 → 조건이 상수 참. 원문은 *"if the patient describes **specific** intentions"* 이므로 **구체성 판정 필드**로 교체한다(`intendedActionsAreSpecific`).

**금지**: AI가 action을 제안하지 않음. 사용자가 말한 intention에만 근거.

### Q12b

> *"What do you notice in your body now, compared to before?"*

**우선순위: P1** *(activationCondition 결함은 P2)*

---

## 6.14 Q13 — 실제 AT readback **[유지]**

> *"How much do you now believe the original automatic thought — '[repeat the patient's exact AT]' — from 0 to 100%?"*

```ts
validation: { kind:"rating", min:0, max:100, repeatExactField: "automaticThought" }
```

**수정**: `repeatExactField`를 **`workingAutomaticThought ?? automaticThought`** 우선순위로 해석하도록 정정하고, static message에서 실제 값을 치환한다(§부록 A-12).

**금지**: `[repeat patient's exact AT]` 리터럴 노출.

**Acceptance**: 실제 AT 표시 / 0~100 재평가 / factual 경로를 거쳤다면 **working AT 기준**.
**우선순위: P0**

---

## 6.15 Q14 **[유지 — 이미 충족]**

```ts
validation: { kind: "enum", values: ["same", "a little better", "much better"] }
```

원문(*"the same / a little better / much better"*) 및 매뉴얼 Annex와 **일치**. regression 확인만.

**우선순위: P2 (regression)**

---

## 6.16 **[신규]** 짧은 응답에 대한 elaboration 정책

> STRUCTURAL RULES: *"If a patient gives a very brief answer, invite elaboration **once**: 'Can you tell me a little more about that?' **Accept whatever they offer next without further pressing.**"*

세션 레벨 restriction으로 s03.ts에 명시한다. §6.9(evidence)와 동일한 "1회 재요청 후 수용" 패턴이며, 이 패턴이 **S03 전반의 일반 규칙**임을 코드에 기록해 둔다.

**우선순위: P1**

---

# 7. Cross-Session 이슈

## 7.1 **[신규 N-1]** Locale Parity — 한/영 혼용의 실제 원인

### v2의 진단과 그 한계

v2 §6.2는 *"session-specific `patientText`와 static message 누락을 우선 수정"* 이라 했다. 이는 **증상 처방**이며 원인을 짚지 못했다.

### 실제 구조

사용자 노출 텍스트가 **두 경로**로 나온다.

| 경로 | 위치 | 한국어 대응 |
| --- | --- | --- |
| ① static message | `static-messages/sXX.ts` `APPROVED_TEXT` / `resolveStaticText` | `koreanText` 맵 **있음** |
| ② spec 인라인 | `protocol/sessions/sXX.ts`의 `patientText` | **없음 — 구조적으로 불가** |

**경로 ②는 locale-blind다.** s01.ts에만 인라인 `patientText`가 6개 있다.

```text
set-up-candidates / candidate-one-reaction / candidate-two-behavior /
candidate-two-emotion-recheck / candidate-three-emotion-recheck /
daily-observation-practice
```

이들은 한국어 세션에서도 **영어로 출력된다.** 반면 fallback은 한국어로 나온다 → QA가 관찰한 `English → 한국어 fallback → English` 패턴의 **직접적 원인**이다.

### 경로 ①의 결손

| 파일 | 영어 노출 키 | `koreanText` 키 | 상태 |
| --- | --- | --- | --- |
| `static-messages/s01.ts` | 3 (approved 1 + 동적 2) | 1 | **-2** |
| `static-messages/s02.ts` | 11 | 8 | **-3** (동적 3종 미대응) |
| `static-messages/s03.ts` | 1 | 1 | 균형 (신규 추가분 전부 대응 필요) |

### 수정

1. **경로 ② 제거 원칙** — 인라인 `patientText`는 **영어 캐논**으로만 두고, 사용자 노출은 static message 경로를 경유하도록 대응 키를 `static-messages/sXX.ts`에 **전수 추가**한다. (공용 resolver 수정 없이 세션별 파일에서 처리)
2. **동적 생성 문장**(cycle valence, rating reflection, total, conclusion readback, emotion readback)도 **한국어 생성 분기**를 갖는다.
3. **검증 테스트 신규**

```text
locale-parity.test.ts
  for each session in [s01, s02, s03]:
    assert  keys(사용자 노출 영어 텍스트)  ===  keys(koreanText)
```

### Acceptance Criteria

- **키 집합 diff 0건** ← "한국어 fallback 0회"보다 자동 검증 가능한 기준
- 영어 S01~S03 full simulation에서 한국어 generic fallback **0회**
- 한국어 S01~S03 full simulation에서 영어 문장 **0회**

**우선순위: P0**

---

## 7.2 Generic Fallback 저감 **[유지]**

Phase 1에서 공용 fallback engine은 수정하지 않는다.

```text
핵심 prompt에 explicit patientText (§3.3 원칙 P 준수)
+ static message의 정확한 field substitution
```

로 진입 빈도를 낮춘다. 각 prompt가 실제로 무엇을 사용했는지(`patientText` / marker extraction / static message / generated dialogue / generic fallback) **로그로 판별 가능**하게 한다.

**우선순위: P0**

---

## 7.3 **[신규 B-7]** Arm-중립 문구

Protocol V9 Arm 3(AI-Only)에는 담당 therapist 세션이 없다(§3.5). 현재 다음 문구가 therapist 존재를 전제한다.

| 위치 | 현재 문구 | 조치 |
| --- | --- | --- |
| `s03` safety pause | *"please reach out to **your therapist** or a crisis line"* | **P0** — 안전 경로. `study clinician` 중립화 |
| `s01` daily-observation-practice | *"**your therapist** will introduce the Intrapersonal Thought Record"* | P1 |
| `s03` closing-review (신규 문안 예정) | *"share it with **your therapist**"* | P1 |

참가자 매뉴얼의 distress 문구가 이미 중립이므로 **그 표현을 기준**으로 삼는다.

> *"please pause and reach out to your **study clinician** or your local emergency services right away."*

**우선순위: safety 문구 P0 / 나머지 P1**

---

# 8. 파일별 개발 반영표

| 파일 | 주요 변경 | 관련 절 |
| --- | --- | --- |
| `protocol/sessions/s01.ts` | possibility recheck 교체 · compliment verbatim 복원 · cycle activationCondition + recheck 신규 · returning arrows 필드 정책 · distortion 개수 강제 해제 + list access 게이팅 · telegraphic-situation 의미 주석 고정 · 핵심 patientText | 4.2~4.9 |
| `runtime/static-messages/s01.ts` | reaction valence guard(유효값 전제) · preview rationale · **koreanText 전수 보강** | 4.4, 4.5, 7.1 |
| `protocol/sessions/s02.ts` | first-session-opening activationCondition · hidden-problems deadlock guard · goal small-step follow-up · re-rating anchoring restriction · subjective validation 점검 | 5.5, 5.6, 5.9, 5.8, 5.10 |
| `runtime/static-messages/s02.ts` | **CCGH 6-anchor 전면 교체(영/한)** · problem/goal 실제 명칭 치환 · total 완전성 guard · baseline 의미 · 중립 acknowledgement · koreanText 동적 분기 | 5.1~5.4, 7.1 |
| `protocol/sessions/s03.ts` | **전역 crisis edge** · terminal 근거 주석 · redirection contract · Q2b readback + 시점 clarification · Q5/Q6/Q9 원문 복원 · **Q8/Q9 validation 완화** · Q7 none/unsure 허용 · Q12 activationCondition · Q13 working AT 우선 · elaboration 정책 | 6.1~6.16 |
| `runtime/static-messages/s03.ts` | **full-conclusion readback** · Q11 original emotion 치환 · Q11b intensity 문안 · Q13 AT readback · safety pause arm-중립화 · **koreanText 전수** | 6.10~6.14, 7.1, 7.3 |
| `locale-parity.test.ts` *(신규)* | 세션별 영/한 키 집합 동등성 | 7.1 |
| `tbct-source-text.generated.ts` | **읽기 전용 / 수정 금지** | — |

---

# 9. 최종 우선순위

## P0 — 반드시 수정

### S01

1. 반복 generic fallback 제거 (§4.2)
2. **Candidate 2/3 possibility 구조 교체** — emotion 재질문 금지 (§4.3) **[교체]**
3. compliment verbatim 3회 동일 (§4.3)
4. Candidate 1~3 reaction → cycle 정합성, missing/invalid의 negative 간주 제거 (§4.4)
5. **returning arrows 응답 소실 해소** (§4.6) **[신규]**
6. **distortion 2~3개 선택 강제 해제** (§4.8) **[교체]**
7. distortion list access 확인 후 진행 (§4.8)

### S02

8. `[problem]` / `[goal]` 0회 (§5.1)
9. **CCGH 6-anchor 문구 전면 추가** (§5.2) **[신규 / P1→P0 승격]**
10. **재방문 opening 이중 발화 제거** (§5.5) **[신규]**

### S03

11. **전역 crisis edge** — 어느 문항에서든 pause (§6.1) **[교체]**
12. factually true AT → working AT, **Q2b readback 포함** (§6.5)
13. 14문항 순서 유지 (§6.2)
14. **Q8/Q9 validation 완화** — 재요청 1회 후 수용 (§6.9) **[교체 / P1→P0 승격]**
15. `[initial conclusion]` / `[extended conclusion]` 0회 — **readback 문안 구현** (§6.10)
16. `[emotion named at Q3a]` 0회 (§6.11)
17. Q11 emotion source 제한 + Q11b 문안 신규 (§6.11~6.12)
18. Q13 실제 working/original AT readback (§6.14)
19. safety pause 문구 **arm-중립화** (§7.3)

### 공통

20. **Locale parity — 키 집합 diff 0건** (§7.1) **[신규 진단]**

---

## P1 — 중요 개선

S01 opening 간결화(§4.1) · example rationale 원문 복원(§4.5) · telegraphic-situation 의미 정정(§4.7) · participant summary(§4.9)
S02 total 완전성 guard + baseline 의미(§5.4) · X/Y/Z deadlock guard(§5.6) · previous score anchoring regression(§5.8) · goal small-step(§5.9)
S03 redirection contract(§6.3) · Q1 specific situation(§6.4) · Q4b summary verbatim(§6.6) · Q5/Q6 원문 복원(§6.7) · Q7 none/unsure 허용(§6.8) · Q12(§6.13) · elaboration 정책(§6.16)
공통 arm-중립 문구(therapist 언급)(§7.3)

---

## P2 — 품질 개선 / Regression 확인

CCPH anchor(§5.3, 이미 충족) · problem/goal 최대 5개(§5.7, 이미 충족) · Q14 enum(§6.15, 이미 충족) · S02 subjective validation 전수(§5.10) · S03 Q7 예시 fallback(§6.8) · Q12 activationCondition 구체성(§6.13) · 비핵심 marker-only prompt patientText 보강

> **v2 대비 변화**: v2가 P0로 올린 "S03 session-start safety check"(§6.1.1)와 P1로 둔 CCPH anchor·최대 5개 규칙은 **이미 코드에 충족**되어 있어 regression으로 강등했다. 대신 **CCGH anchor 부재**와 **Q8/Q9 진행 차단**을 P0로 승격했다.

---

# 10. QA / Acceptance Criteria Matrix

| QA ID | 대상 | 시나리오 | 기대 동작 | 절 |
| --- | --- | --- | --- | --- |
| QA-01 | S01 | 세션 시작 | 짧은 acknowledgement 후 Step 1 진입 | 4.1 |
| QA-02 | S01 | marker-only 질문 | 목적에 맞는 patientText 출력 | 4.2 |
| QA-03 | S01 | Candidate 1~3 | 세 명 모두 **동일 compliment 문장** | 4.3 |
| QA-04 | S01 | Candidate 2 recheck | *"무엇을 느낄 것 같나요"* 재질문 **없음**, possibility 질문 | 4.3 |
| QA-05 | S01 | Candidate 3 recheck | 동일 | 4.3 |
| QA-06 | S01 | recheck + possibility | 두 prompt 연속 중복 발화 없음 | 4.3 |
| QA-07 | S01 | sad/discouraged/irritated/hostile | interviewer statement로 출력 0회 | 4.3 |
| QA-08 | S01 | reaction missing | negative로 임의 확정하지 않음 | 4.4 |
| QA-09 | S01 | unexpected reaction | clarification 없이 cycle closure 안 함 | 4.4 |
| QA-10 | S01 | Candidate 1 arrows 3개 | **세 응답 모두 상태에 잔존** | 4.6 |
| QA-11 | S01 | distortion list 없음 | 단계 강행 안 함 + Annex 안내 | 4.8 |
| QA-12 | S01 | 참가자가 distortion 1개만 지목 | **정상 진행** (2개 강요 없음) | 4.8 |
| QA-13 | S01 | read-distortions | `participantSelectedDistortions` 오염 없음 | 4.8 |
| QA-14 | S02 | problem/goal rating | 실제 항목명 표시 | 5.1 |
| QA-15 | S02 | target 없음 | literal placeholder 미출력 | 5.1 |
| QA-16 | S02 | goal scale 안내 | **6개 anchor 의미 모두 포함** | 5.2 |
| QA-17 | S02 | goal score 4 vs 5 | *distressing/really hard* ↔ *cannot imagine trying* 구분 유지 | 5.2 |
| QA-18 | S02 | goal scale 서술 | "problem과 같은 척도" 표현 **0회** | 5.2 |
| QA-19 | S02 | problem score 4 / 5 | CCPH 의미 유지 (regression) | 5.3 |
| QA-20 | S02 | incomplete ratings | 총점 확정하지 않음 | 5.4 |
| QA-21 | S02 | complete ratings | baseline 의미 설명 포함, grade 표현 없음 | 5.4 |
| QA-22 | S02 | 재방문 참가자 | opening **1회만** 발화 | 5.5 |
| QA-23 | S02 | X/Y/Z | 내용 설명 요구 0회 | 5.6 |
| QA-24 | S02 | X/Y/Z 거절 | deadlock 없이 진행 | 5.6 |
| QA-25 | S02 | 3개 문제만 제시 | 5개 강제 없이 진행 (regression) | 5.7 |
| QA-26 | S03 | 세션 시작 | safety check 존재 (regression) | 6.1 |
| QA-27 | S03 | **Q7 시점 crisis 발언** | 즉시 `safety-pause` 라우팅 | 6.1 |
| QA-28 | S03 | **Q10 시점 crisis 발언** | 즉시 `safety-pause` 라우팅 | 6.1 |
| QA-29 | S03 | safety pause 후 | AI 자율 재개 0회 | 6.1 |
| QA-30 | S03 | safety pause 문구 | therapist 존재 전제 없음 | 7.3 |
| QA-31 | S03 | Q1~Q14 | strict sequence 유지 | 6.2 |
| QA-32 | S03 | 세션 도입 | redirection contract 발화 | 6.3 |
| QA-33 | S03 | factual AT | 사실 자체 반박 0회, underlying belief 확인 후 working AT | 6.5 |
| QA-34 | S03 | factual 경로 후 Q2b | **working AT readback** 후 rating | 6.5 |
| QA-35 | S03 | Q4b 후 summary | 원문 4요소 질문, 가이드 선제 요약 0회 | 6.6 |
| QA-36 | S03 | Q5 | *"even temporarily… even a small sense of relief counts"* 포함 | 6.7 |
| QA-37 | S03 | Q5 "none" 응답 | 원문 재확인 1회 | 6.7 |
| QA-38 | S03 | Q7 "해당 없음" | 정상 진행 (완료 차단 없음) | 6.8 |
| QA-39 | S03 | evidence 1개 | 최소 1회 추가 요청 | 6.9 |
| QA-40 | S03 | **추가 후에도 1개** | 수용하고 다음 단계 진행, 재요청 반복 0회 | 6.9 |
| QA-41 | S03 | conclusion만 있음 | Q10b 미진입, therefore 요청 | 6.10 |
| QA-42 | S03 | full conclusion | 두 field 실제 값 결합 readback | 6.10 |
| QA-43 | S03 | Q11 순서 | positive 먼저 | 6.11 |
| QA-44 | S03 | Q11 negative | Q3a emotion **실제 값**만 재확인 | 6.11 |
| QA-45 | S03 | Q11b | 어떤 감정을 rating하는지 식별 가능, 허용 source 외 추가 0회 | 6.12 |
| QA-46 | S03 | Q13 | 실제 working/original AT 출력 | 6.14 |
| QA-47 | S03 | Q14 | same / a little better / much better (regression) | 6.15 |
| QA-48 | 전체 | placeholder scan | 사용자 화면 미치환 `[variable]` **0건** | — |
| QA-49 | 전체 | **locale key parity** | 세션별 영/한 키 집합 **diff 0건** | 7.1 |
| QA-50 | 전체 | 영어 세션 | 한국어 generic fallback 0건 | 7.1 |
| QA-51 | 전체 | 한국어 세션 | 영어 문장 0건 | 7.1 |
| QA-52 | 전체 | 스칼라 필드 | 1 prompt = 1 스칼라 필드 (응답 소실 0) | 3.4 |
| QA-53 | 전체 | Regression | 기존 deterministic flow 손상 없음 | 11 |
| QA-54 | Scope | Git diff | 허용 6개 product file + 신규 테스트 외 수정 없음 | 2 |

---

# 11. Regression 실행 절차

## 11.1 수정 전 baseline

S01 → S02 → S03 순으로 **각각 full-session 완주** 후 저장.

```text
S01: Opening → Situation/Thought → Candidate 1 → 2 → 3 → Personal Cycle → Distortions → Closing
S02: Opening → Problems → X/Y/Z → Problem Scale → Rate → Total → Goals → Goal Scale → Rate → Total → Closing
S03: Safety → Intro → Q1 … Q14 → Closing
```

각 이상 발화를 **실제 prompt ID와 연결**한다.

## 11.2 필수 분기 시나리오 (신규)

baseline은 정상 경로만으로는 불충분하다. 다음 분기를 **반드시 별도 완주**한다.

| # | 세션 | 분기 |
| --- | --- | --- |
| R-1 | S01 | Candidate 2에서 candidate 1과 **같은 감정** 응답 → recheck 경로 |
| R-2 | S01 | Candidate 2 reaction에 **"positive"** 응답 → clarification 경로 |
| R-3 | S01 | Candidate 2 reaction **무응답/비정형** → cycle 미생성 확인 |
| R-4 | S01 | distortion list **"없다"** 응답 → 게이팅 경로 |
| R-5 | S01 | distortion **1개만** 지목 → 진행 확인 |
| R-6 | S02 | **재방문** 참가자 → opening 1회 |
| R-7 | S02 | problem 3개만 제시 후 **1개만 rating** → 총점 미확정 |
| R-8 | S02 | X/Y/Z **거절** → deadlock 없음 |
| R-9 | S03 | **Q7 / Q10 시점** crisis 발언 → pause |
| R-10 | S03 | **factual AT** ("I will lose my job") → working AT 경로 → Q2b/Q13 readback |
| R-11 | S03 | evidence 1개 + 재요청 후에도 1개 → 수용·진행 |
| R-12 | S03 | Q10a만 답하고 therefore 회피 → Q10b 미진입 |
| R-13 | S03 | Q7 **"해당 없음"** → 진행 |
| R-14 | 전체 | **한국어 로케일** full-session ×3 |

## 11.3 비교 대상

```text
prompt ID · output field · 실제 상담사 문장 · fallback 여부 ·
static message 여부 · state transition · 다음 prompt · locale
```

---

# 12. Requirement Traceability

| 원본 Requirement | v3 위치 | 상태 |
| --- | --- | --- |
| v2 A-01~03 Candidate reaction safety | 4.4 | 유지 |
| v2 A-04~07 Candidate 2/3 source 정합성 | **4.3** | **교체 — possibility 구조** |
| v2 A-08~10 baseline / prompt mapping | 11 | 확장 (분기 시나리오 14종) |
| v2 A-11~13 generic fallback | 4.2, 7.2 | 유지 + 원칙 P |
| v2 B-06~18 S01 | 4 | 유지 + 신규 3건 |
| v2 B-19~36 S02 | 5 | 유지 + 신규 3건 |
| v2 B-37~57 S03 | 6 | 유지 + 신규 5건 |
| v2 C-30~31 worksheet sync | 2.3 | Phase 2 (**원문 미준수로 격상**) |
| v2 C-32~33 locale | **7.1** | **원인 재진단** |
| 원저 — three-person example 축어록 | **4.3** | **신규 최상위 근거** |
| 원저 — "read two or three" | **4.8** | **신규 근거, v2 교체** |
| 원저 — telegraphic = here and now | **4.7** | **신규** |
| S01 매뉴얼 — same compliment | 4.3 | 유지 |
| S01 매뉴얼 — Annex 목록 위치 | 4.8 | 보강 |
| S01 매뉴얼 — example rationale 문안 | 4.5 | 보강 (원문 복원) |
| S02 매뉴얼 — CCPH anchors | 5.3 | **이미 충족 → regression** |
| S02 매뉴얼 — **CCGH anchors** | **5.2** | **신규 P0** |
| S02 매뉴얼 — max 5 | 5.7 | **이미 충족 → regression** |
| S02 매뉴얼 — private X/Y/Z | 5.6 | 유지 + deadlock guard |
| S02 매뉴얼 — no good/bad total | 5.4 | 보강 |
| S02 매뉴얼 — previous-score hiding | 5.8 | regression |
| S02 매뉴얼 — distant dream small step | **5.9** | **신규** |
| S03 prompt — mandatory safety | 6.1 | **이미 충족 → regression** |
| S03 prompt — **"at any point"** | **6.1** | **신규 P0 (전역 edge)** |
| S03 prompt — factual AT | 6.5 | 유지 + Q2b 확장 |
| S03 prompt — Q2b 시점 선택 | **6.5** | **신규** |
| S03 prompt — patient summary checkpoint | **6.6** | **종결 (A안 확정)** |
| S03 prompt — Q5 원문 문장 | **6.7** | **교체 (창작 금지)** |
| S03 prompt — multiple evidence | **6.9** | **교체 (validation 모순)** |
| S03 prompt — full conclusion | 6.10 | 유지 + 문안 구현 |
| S03 prompt — Q11 constraints | 6.11~6.12 | 유지 + 문안 구현 |
| S03 prompt — strict order | 6.2 | 유지 |
| S03 prompt — **redirection contract (v4)** | **6.3** | **신규** |
| S03 prompt — **running summary** | **2.3** | **Phase 2, 미준수로 기록** |
| S03 prompt — elaboration once | **6.16** | **신규** |
| Protocol V9 — TBCT boundary/safety | 3, 6.1 | 상위 원칙 |
| Protocol V9 — **human review 우선** | **6.1.4** | **신규 (terminal 근거)** |
| Protocol V9 — **Arm 3 therapist 부재** | **7.3** | **신규** |

---

# 13. 최종 완료 조건

1. 수정 product file은 지정된 6개 + `locale-parity.test.ts`에 한정
2. S01 세 후보가 **동일 compliment 문장**을 verbatim 공유
3. Candidate 2/3에서 **감정을 참가자에게 되묻지 않고** possibility로 처리
4. Candidate emotion을 interviewer statement로 출력 0회
5. reaction missing/invalid를 임의 해석하지 않음
6. Candidate 1 returning arrows 3개 응답이 **모두 보존**
7. distortion 선택 개수 강제 0건, list access 확인 후 진행
8. `[problem]` / `[goal]` 0회
9. **CCGH 6-anchor 의미가 영/한 모두 포함**, "problem과 같은 척도" 서술 0회
10. S02 재방문 시 opening 1회
11. 불완전 rating 상태의 총점 확정 0회
12. **어느 문항에서든** crisis 신호 시 Intra-TR 중단, AI 자율 재개 0회
13. factually true AT를 distortion으로 반박하지 않고, working AT가 **Q2b·Q13에서 readback**
14. Q8/Q9 재요청 1회 후 **수용·진행** (진행 차단 0건)
15. Therefore 확보 전 Q10b 진입 0회, 두 field 실제 값 결합 readback
16. `[initial conclusion]` / `[extended conclusion]` / `[emotion named at Q3a]` / `[repeat patient's exact AT]` **0회**
17. Q11 positive → original negative 순서, 허용 emotion source 외 rating 0건
18. **locale 키 집합 diff 0건**, 영/한 세션 각각 이종 언어 출력 0건
19. 사용자 노출 문구에 therapist 존재 전제 0건 (safety 경로 필수)
20. S01~S03 full-session regression + **분기 시나리오 R-1~R-14 전부 통과**
21. 기존 deterministic progression 유지
22. worksheet-runtime sync는 Phase 1 workaround로 숨기지 않고 **원문 미준수 이슈로 유지**

---

# 14. 미결 항목

**0건.**

v2의 유일한 `[충돌/확인 필요]`였던 S03 Q4b summary의 behavior 포함 여부는 §6.6에서 **A안(원문 4요소)으로 종결**했다.

다만 다음 두 건은 **결정이 아니라 확인**이 필요하다 — 코드 판정이 아니라 런타임 능력 확인이므로 개발 착수 전 1회 확인으로 해소된다.

| # | 확인 대상 | 확인 방법 | 결과에 따른 분기 |
| --- | --- | --- | --- |
| V-1 | runtime이 **전역 safety 규칙**을 이미 지원하는가 | `runtime-orchestrator.ts` 읽기(수정 아님) | 지원 → 규칙 등록만 / 미지원 → §6.1.3 edge 전수 추가 |
| V-2 | 배열 필드 `append` 시맨틱 지원 여부 | `runtime-state-reducer.ts` 읽기(수정 아님) | 지원 → §4.6 배열화 / 미지원 → 하위 필드 분리 |

---

# 부록 A. 확정 문안

> 아래는 **원문 복원**이 원칙이며, 창작 부분은 표시했다.
> `tbct-source-text.generated.ts`의 verbatim과 1글자라도 다르면 **generated 파일 쪽이 기준**이다.

## A-1. `candidate-two-emotion-recheck` — possibility 재확인

**EN**
> "That's one possibility — and it's exactly the same words the first candidate heard. But can you imagine it being possible? Can you suppose this second candidate hearing that and feeling sad or discouraged instead?"

**KO**
> "그것도 하나의 가능성이에요 — 그리고 이 후보자가 들은 말은 첫 번째 후보자가 들은 말과 완전히 같습니다. 그런데 이런 가능성도 상상해 보실 수 있을까요? 두 번째 후보자가 같은 말을 듣고 오히려 슬프거나 낙담한 기분이 드는 것을요."

*근거: 원저 — "But you can imagine this possibility, can't you? Can you suppose her becoming sad in this situation?"*

---

## A-2. `candidate-three-emotion-recheck`

**EN**
> "It's the same situation, the same room, the same words. Can you imagine or see this third candidate feeling irritated, and even getting angry?"

**KO**
> "같은 상황, 같은 자리, 같은 말입니다. 이 세 번째 후보자가 짜증이 나고, 심지어 화가 나는 것을 상상해 보실 수 있을까요?"

*근거: 원저 — "it's the same situation, the same room, the same chair, and I'll tell her the same thing… Can you imagine or see her feeling irritated and even getting angry?"*

---

## A-3. `candidate-two-same-situation` / `candidate-three-same-situation` — compliment verbatim 재제시

**EN (2인)**
> "Now I'd like to put a second person in that chair, and I tell them **exactly the same thing**: 'I read your résumé, and from what I could see, you seem to be a capable and competent person.'"

**EN (3인)**
> "And here's the third and last one. Same situation, same room, same chair — and I say **the same thing**: 'I read your résumé, and from what I could see, you seem to be a capable and competent person.'"

**KO (2인)**
> "이제 그 자리에 두 번째 사람을 앉혀 보겠습니다. 그리고 **똑같은 말**을 합니다. '이력서를 읽어봤는데, 제가 본 바로는 유능하고 역량 있는 분 같습니다.'"

**KO (3인)**
> "이제 세 번째이자 마지막 후보자입니다. 같은 상황, 같은 방, 같은 자리에서 **같은 말**을 합니다. '이력서를 읽어봤는데, 제가 본 바로는 유능하고 역량 있는 분 같습니다.'"

> ⚠️ compliment 문장은 `tbct-source-text.generated.ts` [82,85]의 verbatim과 **완전 일치**시킨다. 현재 코드(`set-up-candidates`)와 v2 인용문에 미세한 차이가 있으므로 generated 기준으로 3곳을 통일한다.

---

## A-4. `preview-candidates` — example rationale

**EN**
> "Before we look at your own situation, I'd like to walk you through three different people in the same interview. It's much easier to see the pattern clearly on a neutral example first — and then your own situation becomes far simpler, and less overwhelming."

**KO**
> "본인의 상황을 보기 전에, 같은 면접 상황에 있는 세 사람을 먼저 살펴보려고 해요. 중립적인 예시에서 패턴을 보는 게 훨씬 명확하고, 그다음에 본인의 상황을 보면 한결 수월하고 부담도 덜하거든요."

*근거: S01 매뉴얼 — "It's much easier to see the pattern clearly on a neutral example first. Once you've seen how it works with the three candidates, looking at your own situation becomes far simpler — and less overwhelming."*

---

## A-5. `six-anchor-goal-scale` — **CCGH 전면 교체**

**EN**
> "Now let's rate how difficult or distressing each goal feels to pursue **right now**. This scale uses the same colors as before, but the meanings are different: 0 Light blue — easy and comfortable to achieve, or already achieved; 1 Dark blue — not so easy or comfortable to achieve; 2 Light green — difficult or uncomfortable to achieve; 3 Dark green — very difficult or uncomfortable to achieve; 4 Yellow — achieving it is distressing and/or really hard; 5 Red — achieving it is so distressing that you cannot imagine yourself trying."

**KO**
> "이제 각 목표를 **지금** 추구하는 것이 얼마나 어렵거나 힘들게 느껴지는지 평가해 볼게요. 색상은 앞서와 같지만 **의미는 다릅니다**. 0 연한 파란색 — 쉽고 편안하게 달성할 수 있거나 이미 달성함; 1 진한 파란색 — 그리 쉽거나 편안하지는 않음; 2 연한 초록색 — 달성이 어렵거나 불편함; 3 진한 초록색 — 달성이 매우 어렵거나 불편함; 4 노란색 — 달성하는 것이 괴롭고/괴롭거나 정말 힘듦; 5 빨간색 — 너무 괴로워서 시도하는 자신을 상상하기 어려움."

*근거: S02 매뉴얼 Annex, CCGH 표 verbatim*

**부수**: `reflect-goal-score`의 `askVerb` →
EN: `"Right now, how difficult or distressing does it feel to pursue"` / KO: `"지금 이 목표를 추구하는 것이 얼마나 어렵거나 힘들게 느껴지시나요"`

---

## A-6. `problem-total` / `goal-total` — baseline 의미 추가

**EN (완전성 충족 시에만 생성)**
> "Your total problem score today is {total}. {n} of them are in the yellow or red range — those are where therapy usually does its most valuable work. This number isn't a grade, and there's no good or bad total. It's a snapshot of where things stand today, and the starting point you'll measure your progress from."

**KO**
> "오늘 문제 총점은 {total}점이에요. 그중 {n}개가 노란색이나 빨간색 범위에 있고, 보통 치료가 가장 의미 있게 작용하는 부분이 바로 거기예요. 이 숫자는 성적이 아니고, 좋은 총점이나 나쁜 총점이라는 것도 없어요. 오늘의 상태를 담은 스냅샷이자, 앞으로 변화를 재어 볼 출발점입니다."

*근거: S02 매뉴얼 — "There's no 'good' or 'bad' total. A high score isn't a failure; it's simply the starting point you'll measure your progress from." / "the yellow and red items… are usually exactly where therapy does its most valuable work."*

**생성 조건**: `problems.length > 0 && problems.length === problemRatings.length` (goal 동일)

---

## A-7. `redirection-contract` (신규)

**EN (원문 verbatim)**
> "I may redirect you sometimes to keep us on track — not because what you're saying isn't valuable, but to make sure we complete all fourteen questions together. Is that okay?"

**KO**
> "진행 중에 제가 가끔 방향을 돌릴 수 있어요 — 말씀하시는 내용이 중요하지 않아서가 아니라, 열네 개 질문을 함께 끝까지 마치기 위해서예요. 괜찮으실까요?"

---

## A-8. `participant-summary` (S03 Q4b 이후) — 원문 verbatim

**EN**
> "Before we continue, could you summarize in your own words what we've covered so far — the situation, the thought, the emotion, and what happens in your body?"

**KO**
> "계속하기 전에, 지금까지 다룬 내용을 본인의 말로 정리해 주실 수 있을까요? 상황, 그때의 생각, 감정, 그리고 몸에서 일어나는 반응까지요."

---

## A-9. `full-conclusion-readback`

**EN**
> "So your conclusion is: '{balancedConclusion}, therefore {conclusionTherefore}.' How much do you believe that entire conclusion, from 0 to 100%?"

**KO**
> "그러면 결론은 이렇게 되네요. '{balancedConclusion}, 따라서 {conclusionTherefore}.' 이 전체 결론을 지금 0에서 100% 중 어느 정도로 믿으시나요?"

**생성 조건**: `balancedConclusion && conclusionTherefore` 둘 다 존재. 하나라도 없으면 **문장을 생성하지 않는다.**

---

## A-10. `original-negative-emotion` (Q11a Step 2)

**EN**
> "And what about {primaryEmotion}? Has that changed? Is it still present, and if so, has it decreased?"

**KO**
> "그러면 {primaryEmotion}은 어떠신가요? 달라졌을까요? 아직 남아 있다면, 조금 줄어들었나요?"

**생성 조건**: `primaryEmotion` 존재. 없으면 생성하지 않는다. **새 negative emotion을 제안하지 않는다.**

---

## A-11. `emotion-intensities` (Q11b)

**EN**
> "Now let's rate how strong each of those feels right now — {emotionList} — from 0 to 100%, where 0 is not at all and 100 is the strongest you can imagine."

**KO**
> "이제 방금 말씀하신 감정들이 지금 얼마나 강한지 평가해 볼게요 — {emotionList} — 0에서 100% 사이로요. 0은 전혀 없음, 100은 상상할 수 있는 가장 강한 정도입니다."

**`{emotionList}`** = `positiveEmotions` + (잔존 시) `primaryEmotion`. **그 외 감정은 포함하지 않는다.**

---

## A-12. `repeat-exact-at` (Q13)

**EN**
> "How much do you now believe the original automatic thought — '{workingAutomaticThought ?? automaticThought}' — from 0 to 100%?"

**KO**
> "이제 처음의 자동적 사고 — '{workingAutomaticThought ?? automaticThought}' — 를 0에서 100% 중 어느 정도로 믿으시나요?"

---

## A-13. `pause-and-escalate` — arm-중립화

**EN**
> "Let's pause the Intra-TR here for a moment. If you're feeling distressed or unsafe right now, please reach out to your study clinician or your local emergency services right away — that matters more than continuing this exercise."

**KO**
> "지금 잠시 Intra-TR을 멈출게요. 지금 괴롭거나 안전하지 않다고 느끼신다면, 이 활동을 계속하는 것보다 연구 임상의나 지역 응급 서비스에 바로 연락하시는 것이 훨씬 중요해요."

*변경점: `your therapist` → `your study clinician`(Protocol V9 Arm 3 대응), 그리고 AI 자율 재개를 암시하는 문장 제거(§6.1.4).*

---

*본 문서는 TBCT 원저 및 매뉴얼(Irismar Reis de Oliveira, MD, PhD · trial-basedcognitivetherapy.com)을 근거로 작성되었다.*