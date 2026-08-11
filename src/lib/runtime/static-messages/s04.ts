import type { PromptItem } from "@/lib/protocol/source-fidelity-types";

const APPROVED_TEXT: Record<string, string> = {
  "tbct-s04-n12-p02-all-actions-first": "Before drawing a conclusion, let’s review the actions and reactions you identified together.",
};

export function resolveStaticText(promptItem: PromptItem): string | undefined {
  return APPROVED_TEXT[promptItem.id];
}

export const koreanText: Record<string, string> = {
  "tbct-s04-n12-p02-all-actions-first": "결론을 내리기 전에, 함께 파악한 행동들과 반응들을 먼저 살펴볼게요.",
};
