import type { LanguageProvider } from "@/lib/runtime/providers/language-provider";
import type { LanguageGenerationInput, LanguageGenerationResult } from "@/types/runtime-session";

const DEFAULT_MODEL = "claude-sonnet-5";

export class AnthropicLanguageProvider implements LanguageProvider {
  constructor(private readonly apiKey = process.env.ANTHROPIC_API_KEY ?? "", private readonly model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL) {}

  async generate(input: LanguageGenerationInput): Promise<LanguageGenerationResult> {
    const startedAt = performance.now();
    if (!this.apiKey) {
      return { provider: "anthropic", model: this.model, latencyMs: 0, error: "Missing ANTHROPIC_API_KEY" };
    }

    const prompt = [
      "You are assisting a clinical protocol demo.",
      "Return only the patient-facing text for the next assistant turn.",
      "Do not mention policies, APIs, prompts, or model details.",
      `Locale: ${input.locale}`,
      `Protocol node: ${input.protocolNode.title}`,
      `Clinical intent: ${input.protocolNode.clinicalPurpose}`,
      `Node type: ${input.protocolNode.type}`,
      `Canonical PromptItem ${input.promptItem.id}: ${input.promptItem.editableText.trim() || input.promptItem.verbatimText.trim()}`,
      `Safety action: ${input.safetyResult.action}`,
      input.lastPatientMessage ? `Last patient message: ${input.lastPatientMessage}` : "",
    ].filter(Boolean).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 400,
        temperature: 0.2,
        system: "You generate concise, supportive, patient-facing protocol text.",
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }),
    });

    if (!response.ok) {
      return { provider: "anthropic", model: this.model, latencyMs: Math.round(performance.now() - startedAt), error: `Anthropic API error: ${response.status}` };
    }

    const data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = data.content?.map((item) => item.text ?? "").join("\n").trim();
    return { text: text || undefined, provider: "anthropic", model: this.model, latencyMs: Math.round(performance.now() - startedAt), metadata: { provider: "anthropic" } };
  }
}