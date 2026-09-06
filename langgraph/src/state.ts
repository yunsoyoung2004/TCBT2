import { Annotation } from "@langchain/langgraph";
import type { RuntimeContext } from "@/types/runtime-session";

/**
 * 규칙 관찰 기록. 이 그래프는 규칙을 차단하지 않고 관찰만 한다.
 * 준수 판정은 세션이 끝난 뒤 이 배열을 읽어서 한다(verify/ 참조).
 */
export type Observation = {
  turn: number;
  promptId: string;
  ruleId: string;
  /** 실제로 관찰된 값 (예: 증거 배열 길이 5) */
  observed: unknown;
  /** 규칙이 기대하는 것 (예: "<=4") — 사람이 읽는 표기 */
  expected: string;
  verdict: "ok" | "deviation";
};

export type TraceEvent =
  | { kind: "deliver"; turn: number; promptId: string; llmCalled: boolean }
  | { kind: "collect"; turn: number; promptId: string; disposition: string }
  | { kind: "crisis"; turn: number; promptId: string }
  | { kind: "effect"; turn: number; promptId: string; effect: string };

export function emptyRuntimeContext(locale = "ko-KR"): RuntimeContext & { locale?: string } {
  return { fields: {}, riskSignals: [], iterationCounts: {}, locale } as RuntimeContext & { locale?: string };
}

/**
 * RuntimeContext를 쪼개지 않고 통째로 한 채널에 둔다.
 * extractRuntimeState / resolveStaticPatientMessage 가 이 타입을 그대로 요구하므로,
 * 필드별 채널로 분해하면 호출할 때마다 왕복 변환이 필요해진다.
 *
 * 리듀서는 절대 throw 하지 않는다. LangGraph는 대기 쓰기를 리듀서 실행 *전에*
 * 영속화하므로, throw 하면 그 thread_id 는 재개할 때마다 같은 예외를 재생해
 * 영구히 복구 불가가 된다 (환자가 세션 중간에 있는 상황에서 최악의 실패).
 */
export const TrialState = Annotation.Root({
  ctx: Annotation<RuntimeContext>({
    reducer: (left, right) => ({
      ...left,
      ...right,
      fields: { ...left.fields, ...right.fields },
      riskSignals: right.riskSignals ?? left.riskSignals,
      iterationCounts: { ...left.iterationCounts, ...right.iterationCounts },
    }),
    default: () => emptyRuntimeContext(),
  }),

  /** 현재 전달 대기 중인 환자 대면 문구 (deliver 가 쓰고 collect 가 읽는다) */
  pendingPrompt: Annotation<string>({ reducer: (_l, r) => r, default: () => "" }),
  currentPromptId: Annotation<string>({ reducer: (_l, r) => r, default: () => "" }),

  /** 위기 신호. 라우터가 최우선으로 읽는다. */
  crisisSignal: Annotation<boolean>({ reducer: (_l, r) => r, default: () => false }),

  /** 프롬프트별 반복 예산. 정정 턴(state_corrected)에는 증가시키지 않는다. */
  iterations: Annotation<Record<string, number>>({
    reducer: (left, right) => {
      const out = { ...left };
      for (const [k, v] of Object.entries(right)) out[k] = (out[k] ?? 0) + v;
      return out;
    },
    default: () => ({}),
  }),

  turn: Annotation<number>({ reducer: (left, right) => left + right, default: () => 0 }),

  /** 검증의 원료 */
  observations: Annotation<Observation[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  trace: Annotation<TraceEvent[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
});

export type TrialStateType = typeof TrialState.State;
export type TrialUpdate = typeof TrialState.Update;
