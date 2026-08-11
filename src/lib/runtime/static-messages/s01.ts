import type { PromptItem } from "@/lib/protocol/source-fidelity-types";

// Source (tbct-source-text.generated.ts:57-69) gives a single worked
// "Example:" of this mandatory opening move -- a hypothetical participant
// who opens with anxiety/couples-therapy/nursing content, acknowledged
// with "That sounds like a lot to be carrying." The marker-extraction in
// source-fidelity-catalog previously pulled that example's therapist line
// out verbatim as this prompt's fallback text, so every participant's
// session opened with a fabricated acknowledgment of content they never
// said. This runtime has no captured field for whatever a participant
// volunteers before Step 1 (unlike S08's charge, which reuses the
// already-collected coreBelief), so there's nothing patient-specific to
// substitute in -- a warm, content-neutral opening that doesn't claim
// anything false is the safe reading of "acknowledge warmly... then
// redirect immediately to the Step 1 opening question."
const APPROVED_TEXT: Record<string, string> = {
  "tbct-s01-n01-p01-warm-acknowledgement": "Thank you for being here. I'd like us to start with something that will help us look at everything more clearly together.",
};

export function resolveStaticText(promptItem: PromptItem, fields: Record<string, unknown>): string | undefined {
  // Both "cycle" confirmations hardcoded "reacts negatively" regardless of
  // what the participant actually answered for candidateTwo/ThreeReaction
  // -- a real "positive" answer was accepted, then directly contradicted by
  // the next sentence. The source only writes out the negative-reaction
  // version for candidates 2/3 (tbct-source-text.generated.ts:112,124), but
  // candidate 1's own text (line 98) confirms the identical sentence
  // structure already applies to a positive reaction, so this substitutes
  // the participant's actual valence into that same verbatim structure
  // rather than inventing new clinical wording.
  if (promptItem.id === "tbct-s01-n05-p08-candidate-two-cycle") {
    const reaction = fields.candidateTwoReaction === "positive" ? "positively" : "negatively";
    return `And when the interviewer reacts ${reaction} — can you see how that would feed back and reinforce the original thought, keeping the whole cycle going?`;
  }
  if (promptItem.id === "tbct-s01-n06-p07-candidate-three-cycle") {
    const reaction = fields.candidateThreeReaction === "positive" ? "positively" : "negatively";
    return `And when the interviewer reacts ${reaction} — can you see how that confirms the original thought and keeps the whole cycle feeding itself?`;
  }
  return APPROVED_TEXT[promptItem.id];
}

export const koreanText: Record<string, string> = {
  // "많은 것을 감당해 오신 것 같아요" (mirroring the English fallback fix
  // above) used to open every Korean session by claiming a burden the
  // participant never described -- the source manual's "That sounds like a
  // lot to be carrying" is one worked example's acknowledgment, not
  // universal script text.
  "tbct-s01-n01-p01-warm-acknowledgement": "여기 와 주셔서 감사합니다. 이 모든 일을 함께 더 분명하게 살펴보는 데 도움이 되는 것부터 시작하겠습니다.",
};
