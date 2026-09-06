import { describe, it, expect } from "vitest";
import { Command, isInterrupted, INTERRUPT } from "@langchain/langgraph";
import { compileTrialGraph } from "./compile";
import { emptyRuntimeContext } from "./state";

type Turn = { promptId: string; text: string };

/** 스크립트 환자: 프롬프트 유형에 따라 그럴듯한 답을 돌려준다. */
function scriptedAnswer(promptId: string, seen: Map<string, number>): string {
  const n = (seen.get(promptId) ?? 0) + 1;
  seen.set(promptId, n);
  if (/rating|ratings/.test(promptId)) return "70";
  if (/verdict/.test(promptId)) return "무죄";
  if (/evidence|rebut|surrebut|therefore|review-four/.test(promptId)) {
    return n >= 4 ? "없어요" : `${n}번째 항목입니다.`;
  }
  if (/ready|role|chair|materials|orientation|announce/.test(promptId)) return "준비됐어요";
  return `${n}번째 답변입니다.`;
}

async function runSession(maxTurns = 400) {
  const graph = compileTrialGraph({ sessionId: "tbct-s08" });
  const cfg = { configurable: { thread_id: `run-${Date.now()}` } };
  const seen = new Map<string, number>();
  const turns: Turn[] = [];

  let input: any = { ctx: emptyRuntimeContext("ko-KR") };
  for (let i = 0; i < maxTurns; i += 1) {
    const out: any = await graph.invoke(input, { ...cfg, recursionLimit: 500 });
    if (!isInterrupted(out)) return { turns, final: out, completed: true };
    const payload = out[INTERRUPT][0].value as { promptId: string; text: string };
    turns.push({ promptId: payload.promptId, text: payload.text });
    input = new Command({ resume: scriptedAnswer(payload.promptId, seen) });
  }
  return { turns, final: null, completed: false };
}

describe("S08 전체 실행", () => {
  it("스크립트 환자가 세션을 진행한다", async () => {
    const { turns, completed, final } = await runSession();
    const nodes = [...new Set(turns.map((t) => t.promptId))];
    console.log(`  환자 턴 ${turns.length}회 / 서로 다른 프롬프트 ${nodes.length}개 / 완주 ${completed}`);
    console.log(`  첫 프롬프트: ${turns[0]?.promptId}`);
    console.log(`  마지막 프롬프트: ${turns[turns.length - 1]?.promptId}`);
    if (final) {
      console.log(`  관찰 기록: ${final.observations?.length ?? 0}건`);
      const dev = (final.observations ?? []).filter((o: any) => o.verdict === "deviation");
      console.log(`  이탈(deviation): ${dev.length}건`, dev.slice(0, 5).map((d: any) => `${d.ruleId}=${d.observed}`));
    }
    expect(turns.length).toBeGreaterThan(0);
  }, 60_000);
});
