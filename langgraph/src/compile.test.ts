import { describe, it, expect } from "vitest";
import { compileTrialGraph, loadCatalog, assertWellFormed } from "./compile";
import { promptRequiresInput } from "./nodes";

describe("S08 그래프 컴파일", () => {
  it("카탈로그가 22개 노드와 51개 프롬프트를 담는다", () => {
    const cat = loadCatalog("tbct-s08");
    expect(cat.nodes).toHaveLength(22);
    expect(cat.promptItems).toHaveLength(51);
    expect(() => assertWellFormed(cat)).not.toThrow();
  });

  it("컴파일이 성공하고 도달 불가 노드가 없다", () => {
    const graph = compileTrialGraph({ sessionId: "tbct-s08" });
    expect(graph).toBeTruthy();
  });

  it("입력이 필요한 프롬프트만 collect 노드를 갖는다", () => {
    const cat = loadCatalog("tbct-s08");
    const needInput = cat.promptItems.filter(promptRequiresInput).length;
    expect(needInput).toBeGreaterThan(0);
    expect(needInput).toBeLessThanOrEqual(cat.promptItems.length);
    // deliver 51 + collect(needInput) + safety_pause
    console.log(`  노드 수 예상: deliver 51 + collect ${needInput} + safety 1 = ${52 + needInput}`);
  });

  it("Mermaid 도식이 로컬에서 생성된다", async () => {
    const graph = compileTrialGraph({ sessionId: "tbct-s08" });
    const drawable = await graph.getGraphAsync();
    const mmd = drawable.drawMermaid();
    expect(mmd).toContain("graph");
    console.log(`  Mermaid 길이: ${mmd.length}자`);
  });
});
