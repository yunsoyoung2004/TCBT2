import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { PatientInput } from "@/types/runtime-session";

function validationOf(prompt: PromptItem) {
  return (prompt.validation ?? {}) as { kind?: string; values?: Array<string | number>; min?: number; max?: number };
}

export function syntheticPatientInput(prompt: PromptItem): PatientInput {
  const validation = validationOf(prompt);
  const fields = prompt.outputFields;
  if (validation.kind === "boolean") return { kind: "boolean", value: true };
  if (validation.kind === "enum" && validation.values?.length) return { kind: "single_choice", value: String(validation.values[0]) };
  if (validation.kind === "rating" || validation.kind === "paired_ratings" || fields.some((field) => /percent|rating|score|weight|intensit/i.test(field))) {
    const max = validation.max ?? 100;
    const value = Math.max(validation.min ?? 0, Math.min(max, max >= 10 ? 55 : max));
    return { kind: "rating", value: fields.map((_, index) => String(Math.max(validation.min ?? 0, value - index))).join(", ") || String(value) };
  }
  if (fields.length > 1) {
    return { kind: "text", value: fields.map((field, index) => `${field}: synthetic detail ${index + 1}`).join("; ") };
  }
  const field = fields[0] ?? "response";
  return { kind: "text", value: `A specific synthetic patient response for ${field}.` };
}

export const insufficientPatientInputs: PatientInput[] = [
  { kind: "text", value: "몰라" },
  { kind: "text", value: "그냥" },
  { kind: "text", value: "싫어요" },
  { kind: "text", value: "잘 모르겠어요" },
];
