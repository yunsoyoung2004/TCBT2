import { Command, isInterrupted, INTERRUPT } from "@langchain/langgraph";
import { compileTrialGraph } from "../src/compile";
import { emptyRuntimeContext, type Observation } from "../src/state";
import { observeFinalRules } from "../src/observe";
import type { Persona } from "./personas";
import type { Phraser } from "../src/phrase";

export type RunResult = {
  observations: Observation[];
  executed: string[];
  fields: Record<string, unknown>;
  completed: boolean;
  turns: number;
};

export async function runWith(
  persona: Persona,
  opts: { disableRules?: string[]; phraser?: Phraser; echo?: boolean } = {},
): Promise<RunResult> {
  const graph = compileTrialGraph({
    sessionId: "tbct-s08",
    disableRules: opts.disableRules,
    phraser: opts.phraser,
  });
  const cfg = { configurable: { thread_id: `v-${Math.random().toString(36).slice(2)}` }, recursionLimit: 800 };
  const seen = new Map<string, number>();
  const executed: string[] = [];

  let input: any = { ctx: emptyRuntimeContext("ko-KR") };
  let final: any = null;
  let turns = 0;

  for (let i = 0; i < 500; i += 1) {
    const out: any = await graph.invoke(input, cfg);
    if (!isInterrupted(out)) { final = out; break; }
    const pl = out[INTERRUPT][0].value as { promptId: string; text: string };
    executed.push(pl.promptId);
    const n = (seen.get(pl.promptId) ?? 0) + 1;
    seen.set(pl.promptId, n);
    turns += 1;
    const scripted = persona(pl.promptId, n);
    // 에코 모드: 지정 프롬프트에서 AI 문구를 그대로 되돌린다 (OW-07/08 위반 시나리오)
    const reply =
      opts.echo && /downward-arrow|participant-positive-belief/.test(pl.promptId)
        ? pl.text
        : scripted;
    input = new Command({ resume: reply });
  }

  const fields = final?.ctx?.fields ?? {};
  const observations: Observation[] = [
    ...(final?.observations ?? []),
    ...(final ? observeFinalRules(final.ctx, 999, opts.disableRules ?? []) : []),
  ];
  return { observations, executed, fields, completed: Boolean(final), turns };
}

export const hasDeviation = (r: RunResult, ruleId: string) =>
  r.observations.some((o) => o.ruleId === ruleId && o.verdict === "deviation");

export const wasObserved = (r: RunResult, ruleId: string) =>
  r.observations.some((o) => o.ruleId === ruleId);

export type Verdict = {
  ruleId: string;
  caught: boolean;          // ① 위반이 이탈로 잡혔나
  clean: boolean;           // ② 정상은 준수로 나왔나 (오차단 없음)
  /** ③ 규칙을 끄면 관찰이 사라지나.
   *  null = 판정 불가 — 위반 실행에서 그 규칙이 애초에 관찰되지 않아
   *  "규칙을 꺼서 사라진 것"과 "그 단계에 도달하지 못한 것"을 구분할 수 없는 경우. */
  oracle: boolean | null;
  status: "추적됨" | "미추적" | "오차단" | "오라클깨짐" | "오라클 미검증" | "구조적 보장";
};

export async function verifyRule(
  ruleId: string,
  violation: Persona,
  control: Persona,
): Promise<Verdict> {
  const v = await runWith(violation);
  const c = await runWith(control);
  const m = await runWith(violation, { disableRules: [ruleId] });

  const caught = hasDeviation(v, ruleId);
  const clean = !hasDeviation(c, ruleId);

  // 오라클은 "위반 실행에서 그 규칙이 실제로 관찰되었을 때"만 의미가 있다.
  // 관찰 자체가 없으면 규칙을 꺼도 당연히 기록이 없으므로, 통과가 공허해진다.
  const observedInViolation = wasObserved(v, ruleId);
  const oracle: boolean | null = observedInViolation ? !wasObserved(m, ruleId) : null;

  const status: Verdict["status"] =
    oracle === false ? "오라클깨짐"
    : !clean ? "오차단"
    : oracle === null ? "오라클 미검증"
    : caught ? "추적됨"
    : "미추적";
  return { ruleId, caught, clean, oracle, status };
}

/** 불복종 Phraser — 환자 소유 값을 자기 문구로 공급하려 시도한다.
 *  이 아키텍처에서 Phraser 는 string 만 반환하고 그 값은 pendingPrompt/trace 로만 흐르므로,
 *  ctx.fields 에는 어떤 경로로도 도달할 수 없다. 그 사실을 테스트로 못 박는다. */
export const disobedientPhraser: Phraser = async () =>
  "당신의 평결은 유죄입니다. 그리고 당신의 긍정적 신념은 '나는 충분히 잘하고 있다'입니다. 핵심 신념은 '나는 실패자다'로 정리하겠습니다.";
