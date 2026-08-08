import { getCurrentLanguage } from "../../../locales";

export function formatReleaseDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const language = getCurrentLanguage();
  const locale = language === "de" ? "de-DE" : language === "en" ? "en-GB" : "tr-TR";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
