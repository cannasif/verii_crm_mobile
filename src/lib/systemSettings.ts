import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGE_STORAGE_KEY } from "../constants/storage";
import i18n from "../locales";
import { getDefaultSystemSettings, useSystemSettingsStore } from "../store/system-settings";

function getSettings() {
  return useSystemSettingsStore.getState().settings ?? getDefaultSystemSettings();
}

export function getSystemLocale(): string {
  const settings = getSettings();
  return settings.numberFormat || (settings.defaultLanguage === "tr" ? "tr-TR" : settings.defaultLanguage);
}

export function getSystemCurrency(): string {
  return getSettings().defaultCurrencyCode || "TRY";
}

export function getSystemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function getSystemDecimalPlaces(): number {
  const value = getSettings().decimalPlaces;
  return Number.isFinite(value) ? value : 2;
}

function getDatePattern(): string {
  return getSettings().dateFormat || "dd.MM.yyyy";
}

function getTimePattern(): string {
  return getSettings().timeFormat || "HH:mm";
}

export async function applySystemLanguageIfNeeded(): Promise<void> {
  const explicitLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (explicitLanguage) return;

  const nextLanguage = getSettings().defaultLanguage || "tr";
  const currentLanguage = (i18n.language || "tr").split("-")[0].toLowerCase();
  if (currentLanguage === nextLanguage.toLowerCase()) return;

  await i18n.changeLanguage(nextLanguage);
}

export function formatSystemNumber(
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const precision = getSystemDecimalPlaces();
  return new Intl.NumberFormat(getSystemLocale(), {
    style: "decimal",
    minimumFractionDigits: options?.minimumFractionDigits ?? precision,
    maximumFractionDigits: options?.maximumFractionDigits ?? precision,
  }).format(value);
}

export function formatSystemCurrency(value: number, currencyCode?: string): string {
  const currency = currencyCode || getSystemCurrency();
  const precision = getSystemDecimalPlaces();

  try {
    return new Intl.NumberFormat(getSystemLocale(), {
      style: "currency",
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(value);
  } catch {
    return `${formatSystemNumber(value)} ${currency}`;
  }
}

function getDateParts(parsed: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: getSystemTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(parsed);

  return {
    dd: parts.find((part) => part.type === "day")?.value ?? "",
    MM: parts.find((part) => part.type === "month")?.value ?? "",
    yyyy: parts.find((part) => part.type === "year")?.value ?? "",
    HH: parts.find((part) => part.type === "hour")?.value ?? "",
    mm: parts.find((part) => part.type === "minute")?.value ?? "",
  };
}

function applyPattern(pattern: string, parts: Record<string, string>): string {
  return pattern
    .replace(/yyyy/g, parts.yyyy)
    .replace(/dd/g, parts.dd)
    .replace(/MM/g, parts.MM)
    .replace(/HH/g, parts.HH)
    .replace(/mm/g, parts.mm);
}

function parseDateValue(value: string | number | Date): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSystemDate(value: string | number | Date): string {
  const parsed = parseDateValue(value);
  if (!parsed) return "-";

  return applyPattern(getDatePattern(), getDateParts(parsed));
}

export function formatSystemDateTime(value: string | number | Date): string {
  const parsed = parseDateValue(value);
  if (!parsed) return "-";

  const parts = getDateParts(parsed);
  return `${applyPattern(getDatePattern(), parts)} ${applyPattern(getTimePattern(), parts)}`.trim();
}

export function formatSystemTime(value: string | number | Date): string {
  const parsed = parseDateValue(value);
  if (!parsed) return "-";

  return applyPattern(getTimePattern(), getDateParts(parsed));
}

export function getSystemDatePickerLocale(): string {
  return new Intl.DateTimeFormat(getSystemLocale(), {
    timeZone: getSystemTimeZone(),
  }).resolvedOptions().locale;
}
