import type { QuotationGetDto } from "../types";
import {
  formatNumberBySettings,
  getCurrencyDisplayLabel,
  stripCurrencySuffixFromDisplay,
} from "../../../lib/currencyDisplay";

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

export function resolveQuotationRowCurrencyLabel(quotation: QuotationGetDto): string {
  const fromDisplay = quotation.currencyDisplay?.trim();
  if (fromDisplay) {
    const cleaned = fromDisplay
      .replace(/\s*\(\d+\)\s*/g, "")
      .replace(/\s*Döviz\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) return cleaned;
  }
  return getCurrencyDisplayLabel(quotation.currencyCode ?? quotation.currency);
}

export function resolveQuotationRowAmountText(quotation: QuotationGetDto): string {
  const currencyLabel = resolveQuotationRowCurrencyLabel(quotation);
  const numericTotal = parseAmount(quotation.grandTotal);
  if (numericTotal !== null) {
    return formatAmountOnly(numericTotal);
  }
  const display = quotation.grandTotalDisplay?.trim();
  if (display) {
    return stripCurrencySuffixFromDisplay(display, currencyLabel);
  }
  return "-";
}
