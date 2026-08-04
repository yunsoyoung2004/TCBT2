import type { LanguageProvider } from "@/lib/runtime/providers/language-provider";
import type { LanguageGenerationInput } from "@/types/runtime-session";

function patientFacingFallback(input: LanguageGenerationInput) {
  const instruction = input.promptItem.aiInstruction.trim();
  const isUsableInstruction = instruction.length > 8
    && instruction.length <= 240
    && !/^(#{1,6}\s|role and purpose|purpose|instructions?)/i.test(instruction);
  if (isUsableInstruction) return instruction;
  if (input.locale.toLowerCase().startsWith("ko")) return "지금 가장 어렵거나 피하고 싶은 상황은 무엇인가요?";
  if (input.locale.toLowerCase().startsWith("pt")) return "O que está mais difícil ou que você tem evitado neste momento?";
  return "What feels most difficult or most avoided for you right now?";
}

export class DeterministicLanguageProvider implements LanguageProvider {
  async generate(input: LanguageGenerationInput) {
    const startedAt = performance.now();
    const promptText = patientFacingFallback(input);
    return {
      text: input.safetyResult.fixedResponse ?? promptText,
      provider: "deterministic",
      model: "local-template-v1",
      latencyMs: Math.round(performance.now() - startedAt),
      metadata: { locale: input.locale, promptItemId: input.promptItem.id },
    };
  }
}
