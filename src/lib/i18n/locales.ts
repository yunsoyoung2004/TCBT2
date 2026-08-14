export type UiLocale = "ko" | "en";

export const DEFAULT_LOCALE: UiLocale = "ko";

export const SUPPORTED_LOCALES: UiLocale[] = ["ko", "en"];

export function isUiLocale(value: string | null | undefined): value is UiLocale {
  return value === "ko" || value === "en";
}

/** Best-effort mapping from a freeform locale string (participant.locale,
 * e.g. "en-US", "ko-KR" -- see RuntimeParticipant in
 * types/longitudinal-memory.ts) to this app's own UI chrome language.
 * That field's real job is picking the actual therapy session content's
 * language (see runtime-execution-api.ts / session.locale), a distinct,
 * clinically-significant setting -- this exists only so a patient whose
 * record already carries a clear language signal doesn't land on a portal
 * in the wrong chrome language with no obvious way to know why. Returns
 * undefined for anything that doesn't clearly map to a supported locale
 * (region-only codes, unrelated strings), so callers can leave the
 * existing default/stored preference alone instead of guessing. */
export function mapToUiLocale(value: string | null | undefined): UiLocale | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("en")) return "en";
  return undefined;
}
