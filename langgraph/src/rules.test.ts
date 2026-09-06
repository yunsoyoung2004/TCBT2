import { describe, it, expect } from "vitest";
import { Command, isInterrupted, INTERRUPT } from "@langchain/langgraph";
import { compileTrialGraph } from "./compile";
import { emptyRuntimeContext, type Observation } from "./state";
import { RULES, observeFinalRules } from "./observe";

function answer(promptId: string, seen: Map<string, number>): string {
  const n = (seen.get(promptId) ?? 0) + 1; seen.set(promptId, n);
  if (/rating|ratings/.test(promptId)) return "70";
  if (/participant-verdict|guilty-verdict-recheck/.test(promptId)) return "무죄";
  if (/review-four/.test(promptId)) return `${n}번째 블록 검토`;
  if (/appeal-evidence/.test(promptId)) return n >= 3 ? "없어요" : `${n}번째 항소 증거`;
  if (/evidence|rebut|surrebut|therefore/.test(promptId)) return n >= 5 ? "없어요" : `${n}번째 증거`;
  if (/visualize/.test(promptId)) return "40대 중립적인 낯선 사람, 차분한 표정입니다.";
  if (/ready|role|chair|materials|orientation|announce|understood/.test(promptId)) return "준비됐어요";
  return `${n}번째 답변`;
}

async function run() {
  const graph = compileTrialGraph({ sessionId: "tbct-s08" });
  const cfg = { configurable: { thread_id: `rules-${Date.now()}` }, recursionLimit: 600 };
  const seen = new Map<string, number>();
  let input: any = { ctx: emptyRuntimeContext("ko-KR") };
  for (let i = 0; i < 400; i += 1) {
    const out: any = await graph.invoke(input, cfg);
    if (!isInterrupted(out)) return out;
    const pl = out[INTERRUPT][0].value as { promptId: string };
    input = new Command({ resume: answer(pl.promptId, seen) });
  }
  throw new Error("완주 실패");
}

describe("규칙 35개 관찰", () => {
  it("정상 진행 세션에서 각 규칙의 관찰 결과", async () => {
    const final = await run();
    const obs: Observation[] = [
      ...(final.observations ?? []),
      ...observeFinalRules(final.ctx, 999),   // 세션 종료 시점 규칙
    ];
    const byRule = new Map<string, Observation[]>();
    for (const o of obs) {
      if (!byRule.has(o.ruleId)) byRule.set(o.ruleId, []);
      byRule.get(o.ruleId)!.push(o);
    }

    const fams = [...new Set(RULES.map((r) => r.family))];
    let observed = 0, ok = 0, dev = 0, never = 0;
    console.log(`\n${"ID".padEnd(7)}${"규칙군".padEnd(16)}${"관찰".padEnd(6)}${"판정".padEnd(8)}값`);
    console.log("─".repeat(96));
    for (const fam of fams) {
      for (const r of RULES.filter((x) => x.family === fam)) {
        const os = byRule.get(r.id) ?? [];
        const last = os[os.length - 1];
        if (os.length === 0) { never += 1;
          console.log(`${r.id.padEnd(7)}${fam.padEnd(16)}${"—".padEnd(6)}${"미관찰".padEnd(8)}(프롬프트 미도달)`);
          continue; }
        observed += 1;
        const d = os.some((o) => o.verdict === "deviation");
        if (d) dev += 1; else ok += 1;
        const val = Array.isArray(last.observed) || typeof last.observed === "object"
          ? JSON.stringify(last.observed) : String(last.observed);
        console.log(`${r.id.padEnd(7)}${fam.padEnd(16)}${String(os.length).padEnd(6)}${(d ? "이탈" : "준수").padEnd(8)}${val.slice(0, 44)}`);
      }
    }
    console.log("─".repeat(96));
    console.log(`규칙 ${RULES.length}개 / 관찰됨 ${observed} (준수 ${ok}, 이탈 ${dev}) / 미관찰 ${never}`);
    console.log(`총 관찰 기록 ${obs.length}건`);
    expect(RULES.length).toBeGreaterThan(40);
  }, 90_000);
});
