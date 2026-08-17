import { describe, expect, it } from "vitest";
import { S01_COGNITIVE_DISTORTIONS, S01_DISTORTION_IDS } from "@/lib/protocol/sessions/s01-cognitive-distortions";
import { composeDistortionCandidateText, sanitizeCandidates, selectDistortionCandidatesDeterministically } from "@/lib/protocol/sessions/s01-distortion-candidates";

describe("S01_COGNITIVE_DISTORTIONS registry", () => {
  it("has exactly 15 approved distortions, each fully populated with a unique id", () => {
    expect(S01_COGNITIVE_DISTORTIONS).toHaveLength(15);
    const ids = new Set<string>();
    for (const distortion of S01_COGNITIVE_DISTORTIONS) {
      expect(distortion.id).toBeTruthy();
      expect(ids.has(distortion.id)).toBe(false);
      ids.add(distortion.id);
      expect(distortion.nameKo.length).toBeGreaterThan(0);
      expect(distortion.nameEn.length).toBeGreaterThan(0);
      expect(distortion.descriptionKo.length).toBeGreaterThan(0);
      expect(distortion.exampleKo.length).toBeGreaterThan(0);
    }
    expect(S01_DISTORTION_IDS.size).toBe(15);
  });
});

describe("selectDistortionCandidatesDeterministically", () => {
  it("surfaces 'what-if' and 'fortune-telling-catastrophizing' for a repeated future-worry automatic thought", () => {
    const candidates = selectDistortionCandidatesDeterministically({
      situation: "다음 주에 큰 시험이 있다.",
      automaticThought: "공부할 양이 너무 많아서 다 할 수 있을까? 다 못하면 어떻게 하지?",
    });
    const ids = candidates.map((c) => c.id);
    expect(ids).toContain("what-if");
    expect(ids).toContain("fortune-telling-catastrophizing");
  });

  it("surfaces 'dichotomous-thinking' when the thought explicitly frames not-finishing as total failure", () => {
    const candidates = selectDistortionCandidatesDeterministically({
      situation: "다음 주에 큰 시험이 있다.",
      automaticThought: "전부 완벽하게 해내야 해. 다 못하면 실패야.",
    });
    expect(candidates.map((c) => c.id)).toContain("dichotomous-thinking");
  });

  it("never returns a candidate id outside the approved registry, for varied inputs", () => {
    const inputs = [
      { situation: "친구를 만났다.", automaticThought: "그냥 아무 생각도 안 들었다." },
      { situation: "발표를 했다.", automaticThought: "다들 나를 무시하는 것 같았다." },
      { situation: "", automaticThought: "" },
    ];
    for (const input of inputs) {
      const candidates = selectDistortionCandidatesDeterministically(input);
      for (const candidate of candidates) expect(S01_DISTORTION_IDS.has(candidate.id)).toBe(true);
    }
  });

  it("returns approximately 4-5 candidates, never fewer than 4 and never more than 5", () => {
    const candidates = selectDistortionCandidatesDeterministically({ situation: "평범한 하루였다.", automaticThought: "별생각 없었다." });
    expect(candidates.length).toBeGreaterThanOrEqual(4);
    expect(candidates.length).toBeLessThanOrEqual(5);
  });

  it("every candidate carries a non-empty relevanceReason", () => {
    const candidates = selectDistortionCandidatesDeterministically({ situation: "회의에 늦었다.", automaticThought: "다들 나를 무능하다고 생각할 거야." });
    for (const candidate of candidates) expect(candidate.relevanceReason.trim().length).toBeGreaterThan(0);
  });
});

describe("sanitizeCandidates: the registry-id validation gate", () => {
  it("drops any candidate whose id is not in the approved registry, regardless of source", () => {
    const raw = [
      { id: "what-if", relevanceReason: "매우 관련 있어 보입니다." },
      { id: "made-up-distortion-claude-invented", relevanceReason: "이건 존재하지 않는 왜곡입니다." },
      { id: "fortune-telling-catastrophizing", relevanceReason: "이것도 관련 있어 보입니다." },
    ];
    const sanitized = sanitizeCandidates(raw);
    expect(sanitized.map((c) => c.id)).toEqual(["what-if", "fortune-telling-catastrophizing"]);
    expect(sanitized.some((c) => c.id === "made-up-distortion-claude-invented")).toBe(false);
  });

  it("drops a candidate with no relevanceReason", () => {
    const sanitized = sanitizeCandidates([{ id: "what-if", relevanceReason: "" }]);
    expect(sanitized).toHaveLength(0);
  });

  it("caps at 5 candidates even if more are returned", () => {
    const raw = S01_COGNITIVE_DISTORTIONS.map((d) => ({ id: d.id, relevanceReason: "관련 있어 보입니다." }));
    expect(sanitizeCandidates(raw)).toHaveLength(5);
  });
});

describe("composeDistortionCandidateText", () => {
  it("renders each candidate using the REGISTRY's own name, never the raw id or model text as the name", () => {
    const candidates = [
      { id: "what-if", relevanceReason: "앞일을 반복해서 걱정하는 것과 닮아 있어요." },
      { id: "fortune-telling-catastrophizing", relevanceReason: "아직 정해지지 않은 결과를 부정적으로 예상하고 있어요." },
    ];
    const text = composeDistortionCandidateText(candidates, "ko-KR");
    expect(text).toContain("'만약에?' 사고");
    expect(text).toContain("미래예측 / 파국화");
    expect(text).not.toContain("what-if");
    expect(text).not.toContain("fortune-telling-catastrophizing");
  });

  it("silently skips a candidate whose id has no registry match, as a defensive second gate", () => {
    const text = composeDistortionCandidateText([{ id: "not-a-real-id", relevanceReason: "x" }], "en-US");
    expect(text).not.toContain("not-a-real-id");
  });

  it("never asserts a diagnosis -- the composed text always frames candidates as options, not conclusions", () => {
    const candidates = [{ id: "what-if", relevanceReason: "관련 있어 보입니다." }];
    const text = composeDistortionCandidateText(candidates, "ko-KR");
    expect(text).not.toMatch(/당신의\s*인지왜곡은|이것이\s*정답입니다|확정/);
  });
});
