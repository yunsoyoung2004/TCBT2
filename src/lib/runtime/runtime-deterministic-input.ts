import type { PatientInput } from "@/types/runtime-session";

export function parseEmptyOrWhitespaceInput(input: PatientInput) { const text = Array.isArray(input.value) ? input.value.join("") : String(input.value); return text.trim() ? null : { valid: false as const, reason: "empty_input" }; }
export function parseNumericInput(input: PatientInput) { const match = String(input.value).trim().match(/^-?\d+(?:\.\d+)?%?$/); if (!match) return null; const value = Number(match[0].replace("%", "")); return Number.isFinite(value) ? value : null; }
export function parseRatingInput(input: PatientInput, min = 0, max = 100) { const value = parseNumericInput(input); return value !== null && value >= min && value <= max ? value : null; }
export function parseBooleanInput(input: PatientInput) { if (typeof input.value === "boolean") return input.value; const normalized = String(input.value).trim().toLowerCase(); if (["yes", "y", "true", "1", "네", "예", "응", "sim"].includes(normalized)) return true; if (["no", "n", "false", "0", "아니", "아니요", "não", "nao"].includes(normalized)) return false; return null; }
export function parseMultipleChoiceInput(input: PatientInput, choices: unknown[]) { const normalized = String(input.value).trim().toLowerCase(); const match = choices.find((choice) => String(choice).trim().toLowerCase() === normalized); return match === undefined ? null : match; }

export function parseDeterministicPromptInput(input: PatientInput, validation: Record<string, unknown> | null | undefined) {
  const empty = parseEmptyOrWhitespaceInput(input); if (empty) return { handled: true as const, valid: false as const, reason: empty.reason };
  if (validation?.kind === "rating") { const value = parseRatingInput(input, Number(validation.min ?? 0), Number(validation.max ?? 100)); return { handled: true as const, valid: value !== null, value, reason: value === null ? "invalid_rating" : undefined }; }
  if (validation?.kind === "boolean") { const value = parseBooleanInput(input); return { handled: true as const, valid: value !== null, value, reason: value === null ? "invalid_boolean" : undefined }; }
  if (validation?.kind === "enum" && Array.isArray(validation.values)) { const value = parseMultipleChoiceInput(input, validation.values); return { handled: true as const, valid: value !== null, value, reason: value === null ? "invalid_choice" : undefined }; }
  if (validation?.kind === "numeric") { const value = parseNumericInput(input); return { handled: true as const, valid: value !== null, value, reason: value === null ? "invalid_number" : undefined }; }
  return { handled: false as const };
}
