import {
  formatNumberBySettings,
  getCurrencyDisplayLabel,
  stripCurrencySuffixFromDisplay,
} from "./currencyDisplay";

export interface SalesDocumentRowAmountSource {
  grandTotal?: number | null;
  grandTotalDisplay?: string | null;
  currencyCode?: string | number | null;
  currency?: string | number | null;
  currencyDisplay?: string | null;
}

function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatAmountOnly(amount: unknown): string {
  const n = parseAmount(amount);
  if (n === null) return "-";
  return formatNumberBySettings(n, 2, 2);
}

export function resolveSalesDocumentRowCurrencyLabel(
  source: SalesDocumentRowAmountSource
): string {
  const fromDisplay = source.currencyDisplay?.trim();
  if (fromDisplay) {
    const cleaned = fromDisplay
      .replace(/\s*\(\d+\)\s*/g, "")
      .replace(/\s*Döviz\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) return cleaned;
  }
  return getCurrencyDisplayLabel(source.currencyCode ?? source.currency);
}

export function resolveSalesDocumentRowAmountText(
  source: SalesDocumentRowAmountSource
): string {
  const currencyLabel = resolveSalesDocumentRowCurrencyLabel(source);
  const display = source.grandTotalDisplay?.trim();
  if (display) {
    return stripCurrencySuffixFromDisplay(display, currencyLabel);
  }
  return formatAmountOnly(source.grandTotal);
}
