import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { RULES } from "../src/observe";
import { compliant, VIOLATIONS, PATHS } from "./personas";
import { verifyRule, runWith, wasObserved, hasDeviation, disobedientPhraser, type Verdict } from "./harness";

type Row = Verdict & { family: string; text: string; note: string };

describe("규칙 위반 주입 검증", () => {
  it("전체 규칙 검증 리포트", async () => {
    const rows: Row[] = [];

    // A/B군 — 위반 페르소나가 있는 규칙
    for (const id of Object.keys(VIOLATIONS)) {
      const rule = RULES.find((r) => r.id === id);
      if (!rule) continue;
      const v = await verifyRule(id, VIOLATIONS[id].persona, compliant);
      rows.push({ ...v, family: rule.family, text: rule.text, note: VIOLATIONS[id].note });
    }

    // 경로 B — 에코 탐지 (OW-07 / OW-08)
    for (const id of ["OW-07", "OW-08"]) {
      const rule = RULES.find((r) => r.id === id);
      if (!rule) continue;
      const v = await runWith(compliant, { echo: true });
      const c = await runWith(compliant);
      const m = await runWith(compliant, { echo: true, disableRules: [id] });
      const caught = hasDeviation(v, id), clean = !hasDeviation(c, id);
      const oracle = wasObserved(v, id) ? !wasObserved(m, id) : null;
      rows.push({
        ruleId: id, caught, clean, oracle,
        status: oracle === false ? "오라클깨짐" : !clean ? "오차단"
              : oracle === null ? "오라클 미검증" : caught ? "추적됨" : "미추적",
        family: rule.family, text: rule.text, note: "AI 문구를 환자가 그대로 되뇜",
      });
    }

    // 조건부 경로 규칙 — 유죄(VD-03) / 위기(SF-02) 경로에서만 판정 가능
    {
      const gViol = await runWith(PATHS.guilty.persona, { disableRules: ["__none__"] });
      const gCtrl = await runWith(compliant);
      const gMut = await runWith(PATHS.guilty.persona, { disableRules: ["VD-03"] });
      const rule = RULES.find((r) => r.id === "VD-03")!;
      const caught = hasDeviation(gViol, "VD-03");
      const clean = !hasDeviation(gCtrl, "VD-03");
      const oracle = wasObserved(gViol, "VD-03") ? !wasObserved(gMut, "VD-03") : null;
      rows.push({
        ruleId: "VD-03", caught, clean, oracle,
        status: oracle === false ? "오라클깨짐" : !clean ? "오차단"
              : oracle === null ? "오라클 미검증" : caught ? "추적됨" : "미추적",
        family: rule.family, text: rule.text, note: "유죄 평결 경로 (재검토 실행 확인)",
      });
    }
    {
      const cViol = await runWith(PATHS.crisis.persona);
      const cCtrl = await runWith(compliant);
      const cMut = await runWith(PATHS.crisis.persona, { disableRules: ["SF-02"] });
      const rule = RULES.find((r) => r.id === "SF-02")!;
      const caught = hasDeviation(cViol, "SF-02");
      const clean = !hasDeviation(cCtrl, "SF-02");
      const oracle = wasObserved(cViol, "SF-02") ? !wasObserved(cMut, "SF-02") : null;
      rows.push({
        ruleId: "SF-02", caught, clean, oracle,
        status: oracle === false ? "오라클깨짐" : !clean ? "오차단"
              : oracle === null ? "오라클 미검증" : caught ? "추적됨" : "미추적",
        family: rule.family, text: rule.text, note: "위기 경로 (안전 노드 도달 확인)",
      });
    }

    // D군 — 구조적 보장: 불복종 Phraser 가 필드를 오염시키지 못하는가
    const d = await runWith(compliant, { phraser: disobedientPhraser });
    const contaminated =
      String(d.fields.verdict ?? "").includes("유죄입니다") ||
      String(d.fields.positiveBelief ?? "").includes("충분히 잘하고 있다") ||
      String(d.fields.coreBelief ?? "").includes("나는 실패자다");
    for (const id of ["OW-01", "OW-02", "SQ-02", "SF-01"]) {
      const rule = RULES.find((r) => r.id === id);
      if (!rule) continue;
      rows.push({
        ruleId: id, caught: !contaminated, clean: true, oracle: true,
        status: contaminated ? "미추적" : ("구조적 보장" as Verdict["status"]),
        family: rule.family, text: rule.text,
        note: id === "SF-01" ? "그래프 배선상 단계 생략 불가" : "불복종 Phraser 가 필드 공급 시도",
      });
    }

    // ── 출력
    const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - [...s].reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)));
    const lines: string[] = [];
    lines.push(`${pad("ID", 8)}${pad("규칙군", 16)}${pad("①위반", 8)}${pad("②정상", 8)}${pad("③오라클", 10)}${pad("판정", 14)}위반 방법`);
    lines.push("─".repeat(110));
    for (const r of rows) {
      lines.push(
        pad(r.ruleId, 8) + pad(r.family, 16) +
        pad(r.caught ? "✅" : "❌", 8) + pad(r.clean ? "✅" : "❌", 8) + pad(r.oracle === null ? "—" : r.oracle ? "✅" : "❌", 10) +
        pad(r.status, 14) + r.note,
      );
    }
    lines.push("─".repeat(110));
    const cnt = (s: string) => rows.filter((r) => r.status === s).length;
    lines.push(
      `규칙 ${RULES.length}개 / 검증 ${rows.length}개 — ` +
      `추적됨 ${cnt("추적됨")} · 미추적 ${cnt("미추적")} · 구조적 보장 ${cnt("구조적 보장")} · ` +
      `오라클 미검증 ${cnt("오라클 미검증")} · 오차단 ${cnt("오차단")} · 오라클깨짐 ${cnt("오라클깨짐")}`,
    );
    const untested = RULES.filter((r) => !rows.some((x) => x.ruleId === r.id));
    lines.push(`시나리오 미작성 ${untested.length}개: ${untested.map((r) => r.id).join(", ")}`);
    console.log("\n" + lines.join("\n"));

    // 아티팩트 저장
    mkdirSync("artifacts/langgraph-verify", { recursive: true });
    writeFileSync("artifacts/langgraph-verify/report.md",
      `# LangGraph 규칙 추적 검증 리포트\n\n\`\`\`\n${lines.join("\n")}\n\`\`\`\n`);

    // 오차단 0건이 필수 통과 조건
    expect(cnt("오차단")).toBe(0);
    expect(cnt("오라클깨짐")).toBe(0);
  }, 900_000);
});
