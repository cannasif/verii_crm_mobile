export function isExportOfferType(offerType?: string | null): boolean {
  const normalized = String(offerType ?? '').trim().toUpperCase();
  return normalized === 'YURTDISI' || normalized === 'EXPORT';
}

function isExportRegisteredDelivery(deliveryMethodName?: string | null): boolean {
  const normalized = String(deliveryMethodName ?? '').toLocaleLowerCase('tr-TR');
  return (
    normalized.includes('ıhr. kayı') ||
    normalized.includes('ihr. kayı') ||
    normalized.includes('ihraç kayıtlı')
  );
}

export function getDefaultDocumentVatRate(
  offerType?: string | null,
  deliveryMethodName?: string | null,
  fallback = 20,
): number {
  if (isExportOfferType(offerType)) {
    return isExportRegisteredDelivery(deliveryMethodName) ? 20 : 0;
  }
  return fallback;
}

export function resolveDocumentVatRate(
  vatRate: number | null | undefined,
  offerType?: string | null,
  deliveryMethodName?: string | null,
  fallback = 20,
): number {
  return vatRate ?? getDefaultDocumentVatRate(offerType, deliveryMethodName, fallback);
}

export function applyDocumentVatDefaultOnLine<T extends { vatRate?: number | null }>(
  line: T,
  offerType?: string | null,
  deliveryMethodName?: string | null,
  fallback = 20,
): T {
  if (line.vatRate != null) return line;

  return {
    ...line,
    vatRate: getDefaultDocumentVatRate(offerType, deliveryMethodName, fallback),
  };
}

export function enforceExportVatOnLine<T extends { vatRate?: number | null; vatAmount?: number | null }>(
  line: T,
  offerType?: string | null,
  deliveryMethodName?: string | null,
): T {
  return applyDocumentVatDefaultOnLine(line, offerType, deliveryMethodName);
}
