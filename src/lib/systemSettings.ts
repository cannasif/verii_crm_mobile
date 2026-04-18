import i18n from "../locales";
import { getDefaultSystemSettings, useSystemSettingsStore } from "../store/system-settings";

function getSettings() {
  return useSystemSettingsStore.getState().settings ?? getDefaultSystemSettings();
}

function getActiveLanguage(): string {
  return (i18n.resolvedLanguage || i18n.language || "tr").split("-")[0].toLowerCase();
}

function getActiveLocale(): string {
  return i18n.resolvedLanguage || i18n.language || "tr";
}

export function getSystemLocale(): string {
  const settings = getSettings();
  return settings.numberFormat || (getActiveLanguage() === "tr" ? "tr-TR" : getActiveLocale());
}

export function getSystemCurrency(): string {
  return "TRY";
}

export function getSystemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function getSystemDecimalPlaces(): number {
  const value = getSettings().decimalPlaces;
  return Number.isFinite(value) ? value : 2;
}

export async function applySystemLanguageIfNeeded(): Promise<void> {
  return Promise.resolve();
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

function parseDateValue(value: string | number | Date): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateValue(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions
): string {
  const parsed = parseDateValue(value);
  if (!parsed) return "-";

  return new Intl.DateTimeFormat(getActiveLocale(), {
    timeZone: getSystemTimeZone(),
    ...options,
  }).format(parsed);
}

export function formatSystemDate(value: string | number | Date): string {
  return formatDateValue(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatSystemDateTime(value: string | number | Date): string {
  return formatDateValue(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSystemTime(value: string | number | Date): string {
  return formatDateValue(value, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getSystemDatePickerLocale(): string {
  return new Intl.DateTimeFormat(getActiveLocale(), {
    timeZone: getSystemTimeZone(),
  }).resolvedOptions().locale;
}
