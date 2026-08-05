import { resolvePromptLocaleText } from "@/lib/runtime/runtime-release-normalizer";
import type { PromptItem } from "@/lib/protocol/source-fidelity-types";

export type StaticMessageResult = { patientMessage: string; source: "approved_static"; llmCalled: false };
export function resolveStaticPatientMessage(promptItem: PromptItem, locale: string): StaticMessageResult | null {
  // fallbackPatientText on a canonical PromptItem is already reviewed patient
  // content. Never replace it with the generic locale fallback merely because
  // its first English verb resembles an internal instruction.
  if (promptItem.fallbackPatientText?.trim()) {
    const localized = resolvePromptLocaleText(promptItem.id, promptItem.fallbackPatientText, locale);
    const patientMessage = localized.includes("천천히 생각해 보셔도 괜찮습니다")
      ? promptItem.fallbackPatientText.trim()
      : localized;
    return { patientMessage, source: "approved_static", llmCalled: false };
  }
  return null;
}
