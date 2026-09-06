/**
 * 스크립트 환자. (promptId, 그 프롬프트에 답한 횟수) -> 답변.
 * 위반 페르소나는 기본(compliant)에서 특정 프롬프트만 덮어쓴다 —
 * 위반/정상 쌍이 "같은 구조"여야 오차단(over-blocking)을 측정할 수 있다.
 */
export type Persona = (promptId: string, n: number) => string;

export const compliant: Persona = (id, n) => {
  if (/rating|ratings/.test(id)) return "70";
  if (/participant-verdict|guilty-verdict-recheck/.test(id)) return "무죄";
  if (/review-four/.test(id)) return `${n}번째 블록 검토`;
  if (/appeal-evidence/.test(id)) return n >= 3 ? "없어요" : `${n}번째 항소 증거`;
  if (/evidence|rebut|surrebut|therefore/.test(id)) return n >= 5 ? "없어요" : `${n}번째 증거`;
  if (/visualize/.test(id)) return "40대 중립적인 낯선 사람, 차분한 표정입니다.";
  if (/ready|role|chair|materials|orientation|announce|understood/.test(id)) return "준비됐어요";
  return `${n}번째 답변`;
};

/** compliant 위에 특정 프롬프트만 덮어쓰는 헬퍼 */
const override = (match: RegExp, fn: Persona): Persona =>
  (id, n) => (match.test(id) ? fn(id, n) : compliant(id, n));

export const VIOLATIONS: Record<string, { persona: Persona; note: string }> = {
  // 증거 상한 — 5번째 이상을 계속 밀어 넣는다
  "EV-02": {
    persona: override(/prosecution-evidence/, (_id, n) => `${n}번째 검찰 증거`),
    note: "증거를 끝없이 제출 (5개 이상)",
  },
  "EV-05": {
    persona: override(/defense-evidence/, (_id, n) => `${n}번째 변호 증거`),
    note: "변호 증거를 끝없이 제출",
  },
  // 증거 최소 — 첫 턴부터 '없어요'
  "EV-01": {
    persona: override(/prosecution-evidence/, () => "없어요"),
    note: "증거를 하나도 안 냄",
  },
  "EV-04": {
    persona: override(/defense-evidence/, () => "없어요"),
    note: "변호 증거를 하나도 안 냄",
  },
  "EV-11": {
    persona: override(/appeal-evidence/, () => "없어요"),
    note: "항소 증거를 하나도 안 냄",
  },
  // 근친 심상 금지
  "RT-05": {
    persona: override(/visualize-prosecutor/, () => "제 어머니를 검사로 상상했어요."),
    note: "검사를 어머니로 상상",
  },
  "RT-06": {
    persona: override(/visualize-defense/, () => "제일 친한 친구가 변호인이에요."),
    note: "변호인을 친구로 상상",
  },
  // 평가 범위 밖
  "RS-01": {
    persona: override(/core-belief-rating/, () => "150"),
    note: "0~100 범위를 벗어난 값",
  },
  "RS-04": {
    persona: override(/positive-belief-rating/, () => "999"),
    note: "범위 밖 값",
  },
  // 평결 열거값 위반
  "VD-01": {
    persona: override(/participant-verdict/, () => "잘 모르겠어요"),
    note: "유죄/무죄가 아닌 답",
  },

  // ── 조기 종료 (반복 수집을 첫 턴에 끊는다)
  "EV-06": { persona: override(/rebut-each-defense-item/, () => "없어요"), note: "반박을 하나도 안 함" },
  "EV-07": { persona: override(/defense-evidence/, (_i, n) => (n >= 2 ? "없어요" : `${n}번째 변호 증거`)), note: "변호 증거를 반박보다 적게" },
  "EV-08": { persona: override(/surrebut-each-pair/, () => "없어요"), note: "재반박을 하나도 안 함" },
  "EV-09": { persona: override(/rebut-each-defense-item/, (_i, n) => (n >= 2 ? "없어요" : `${n}번째 반박`)), note: "반박을 재반박보다 적게" },
  "EV-10": { persona: override(/review-four/, (_i, n) => (n >= 2 ? "없어요" : `${n}번째 블록`)), note: "배심 검토를 2블록에서 중단" },
  "OW-03": { persona: override(/participant-therefore/, () => "없어요"), note: "그러므로 결론을 안 냄" },
  "OW-04": { persona: override(/participant-therefore/, (_i, n) => (n >= 2 ? "없어요" : `${n}번째 결론`)), note: "결론을 짝 수보다 적게" },
  "OW-05": { persona: override(/rebut-each-defense-item/, () => "없어요"), note: "반박 없음" },
  "EV-03": { persona: override(/prosecution-evidence/, (_i, n) => (n === 5 ? "세 개만 남길게요" : `${n}번째 증거`)), note: "4개 낸 뒤 3개로 축소 요청" },

  // ── 범위 밖 값
  "RS-02": { persona: override(/baseline-emotion-rating/, () => "150"), note: "감정 강도 범위 밖" },
  "RS-03": { persona: override(/post-verdict-ratings/, () => "-20"), note: "평결 후 재평가 범위 밖" },
  "RS-05": { persona: override(/original-charge-final-ratings/, () => "999"), note: "최종 재평가 범위 밖" },

  // ── 빈 응답 (준비 확인·확인 응답 누락)
  "RT-01": { persona: override(/enter-defendant-role/, () => "   "), note: "준비 확인 없이 진행" },
  "RT-02": { persona: override(/enter-prosecutor-role/, () => "   "), note: "준비 확인 없이 진행" },
  "RT-03": { persona: override(/enter-defense-role/, () => "   "), note: "준비 확인 없이 진행" },
  "RT-04": { persona: override(/enter-jury-role/, () => "   "), note: "준비 확인 없이 진행" },
  "RT-07": { persona: override(/announce-verdict/, () => "   "), note: "선고를 수행하지 않음" },
  "VB-02": { persona: override(/roles-orientation/, () => "   "), note: "절차 안내 확인 누락" },
  "VB-03": { persona: override(/orientation-reaction/, () => "   "), note: "반응 없음" },
  "VD-04": { persona: override(/post-verdict-defendant/, () => "   "), note: "피고인석 복귀 누락" },

  // ── 필드 누락
  "SQ-01": { persona: override(/baseline-emotion$/, () => "   "), note: "감정명 누락" },
  "OW-01": { persona: override(/downward-arrow/, () => "   "), note: "핵심 신념 미제시" },
  "OW-02": { persona: override(/participant-positive-belief/, () => "   "), note: "긍정 신념 미제시" },

  // ── 중복 제출
  "VB-01": { persona: override(/prosecution-evidence/, () => "같은 증거입니다"), note: "동일 증거 반복 제출" },

  // ── 남은 8건
  "SQ-03": { persona: override(/original-charge-final-ratings/, () => "   "), note: "최종 평가 누락 -> 마무리 요약 불가" },
  "OW-06": { persona: override(/rebut-each-defense-item/, (_i, n) => (n >= 2 ? "없어요" : `${n}번째 반박`)), note: "반박 부족한데 미반박 기록 없음" },
  "VD-02": { persona: override(/participant-verdict|guilty-verdict-recheck/, () => "   "), note: "평결을 내지 않음" },
  "PC-01": { persona: override(/daily-appeal-homework/, () => "   "), note: "항소 과제 안내 미확인" },
  "PC-02": { persona: override(/prosecution-evidence/, (_i, n) => `${n}번째 증거`), note: "예산 소진으로 종료 (충분 판정 아님)" },
  // SF-01 은 "프롬프트를 거쳤는가"를 보므로 환자 입력으로는 위반할 수 없다.
  // 그래프가 1단계를 건너뛰어야 위반인데, 그건 컴파일러 배선 오류이지 환자 행동이 아니다.
  // -> 뮤테이션(규칙 비활성)으로만 오라클을 확인하고, 위반은 구조적으로 불가능으로 분류한다.
};

/** 조건부 프롬프트를 도달시키기 위한 시나리오 (위반이 아니라 경로 활성화) */
export const PATHS: Record<string, { persona: Persona; note: string }> = {
  guilty: {
    persona: override(/participant-verdict/, () => "유죄"),
    note: "유죄 평결 -> 재검토 분기 활성화",
  },
  crisis: {
    persona: override(/downward-arrow/, () => "요즘 죽고 싶다는 생각이 자꾸 들어요."),
    note: "위기 신호 -> safety_pause 도달",
  },
};

/**
 * 에코 환자 — AI 가 방금 한 말을 그대로 답변으로 돌려준다.
 * AI 가 필드에 직접 쓸 수는 없지만, 예시를 제안하고 환자가 따라 하면
 * 결과적으로 "환자 본인의 말"로 기록된다. OW-07 / OW-08 의 위반 시나리오.
 */
export function makeEchoPersona(lastText: () => string): Persona {
  return (id, n) => (/downward-arrow|participant-positive-belief/.test(id) ? lastText() : compliant(id, n));
}
