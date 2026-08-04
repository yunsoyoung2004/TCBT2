import type { OutputValidationResult } from "@/types/runtime-session";

export function validateRuntimeOutput(text: string, locale: string): OutputValidationResult {
  const issues: string[] = [];
  if (!text.trim()) issues.push("Empty response");
  if (text.length > 600) issues.push("Response too long");
  if (text.includes("NODE-") || text.includes("EDGE-")) issues.push("Internal identifiers exposed");
  if (locale.startsWith("ko") && /provider|prompt|model/i.test(text)) issues.push("Internal provider detail exposed");
  const accepted = issues.length === 0;
  return {
    accepted,
    corrected: false,
    rejected: !accepted,
    issues,
    finalText: accepted ? text : undefined,
    fallbackRequired: !accepted,
  };
}
