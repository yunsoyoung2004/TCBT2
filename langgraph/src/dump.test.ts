import { describe, it } from "vitest";
import { Command, isInterrupted, INTERRUPT } from "@langchain/langgraph";
import { compileTrialGraph } from "./compile";
import { emptyRuntimeContext } from "./state";

function answer(promptId: string, seen: Map<string, number>): string {
  const n = (seen.get(promptId) ?? 0) + 1; seen.set(promptId, n);
  if (/rating|ratings/.test(promptId)) return "70";
  if (/participant-verdict/.test(promptId)) return "무죄";
  if (/review-four/.test(promptId)) return `${n}번째 블록을 검토했습니다.`;
  if (/evidence|rebut|surrebut|therefore/.test(promptId)) return n >= 5 ? "없어요" : `${n}번째 증거입니다.`;
  if (/ready|role|chair|materials|orientation|announce|understood/.test(promptId)) return "준비됐어요";
  return `${n}번째 답변입니다.`;
}

describe("필드 값 덤프", () => {
  it("세션 종료 후 모든 필드의 실제 값을 출력", async () => {
    const graph = compileTrialGraph({ sessionId: "tbct-s08" });
    const cfg = { configurable: { thread_id: `dump-${Date.now()}` }, recursionLimit: 600 };
    const seen = new Map<string, number>();
    let input: any = { ctx: emptyRuntimeContext("ko-KR") };
    let final: any = null;
    for (let i = 0; i < 400; i += 1) {
      const out: any = await graph.invoke(input, cfg);
      if (!isInterrupted(out)) { final = out; break; }
      const pl = out[INTERRUPT][0].value as { promptId: string };
      input = new Command({ resume: answer(pl.promptId, seen) });
    }
    const f = final?.ctx?.fields ?? {};
    console.log(`\n=== 필드 ${Object.keys(f).length}개 ===`);
    for (const k of Object.keys(f).sort()) {
      const v = f[k];
      const t = Array.isArray(v) ? `array(${v.length})` : typeof v;
      const s = Array.isArray(v) ? JSON.stringify(v).slice(0, 60) : String(v).slice(0, 55);
      console.log(`  ${k.padEnd(42)} ${t.padEnd(12)} ${s}`);
    }
  }, 90_000);
});
