export interface SalesDocumentPaymentTypeSource {
  paymentTypeId?: number | null;
  paymentTypeName?: string | null;
}

export function resolveSalesDocumentPaymentTypeLabel(
  source: SalesDocumentPaymentTypeSource,
  paymentTypesById: ReadonlyMap<number, string>,
  fallback = "-"
): string {
  const directName = source.paymentTypeName?.trim();
  if (directName) return directName;

  const paymentTypeId = source.paymentTypeId;
  if (paymentTypeId != null && paymentTypeId > 0) {
    const fromLookup = paymentTypesById.get(paymentTypeId)?.trim();
    if (fromLookup) return fromLookup;
  }

  return fallback;
}
