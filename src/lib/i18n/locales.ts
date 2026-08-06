export type UiLocale = "ko" | "en";

export const DEFAULT_LOCALE: UiLocale = "ko";

export const SUPPORTED_LOCALES: UiLocale[] = ["ko", "en"];

export function isUiLocale(value: string | null | undefined): value is UiLocale {
  return value === "ko" || value === "en";
}
