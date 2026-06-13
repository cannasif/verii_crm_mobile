import type { QuotationGetDto } from "../types";

export function resolveQuotationPaymentTypeLabel(
  quotation: Pick<QuotationGetDto, "paymentTypeId" | "paymentTypeName">,
  paymentTypesById: ReadonlyMap<number, string>,
  fallback = "-"
): string {
  const directName = quotation.paymentTypeName?.trim();
  if (directName) return directName;

  const paymentTypeId = quotation.paymentTypeId;
  if (paymentTypeId != null && paymentTypeId > 0) {
    const fromLookup = paymentTypesById.get(paymentTypeId)?.trim();
    if (fromLookup) return fromLookup;
  }

  return fallback;
}
