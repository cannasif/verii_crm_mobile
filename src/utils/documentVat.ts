export function isExportOfferType(offerType?: string | null): boolean {
  const normalized = String(offerType ?? '').trim().toUpperCase();
  return normalized === 'YURTDISI' || normalized === 'EXPORT';
}

export function getDefaultDocumentVatRate(offerType?: string | null, fallback = 20): number {
  return isExportOfferType(offerType) ? 0 : fallback;
}

export function resolveDocumentVatRate(
  vatRate: number | null | undefined,
  offerType?: string | null,
  fallback = 20,
): number {
  return vatRate ?? getDefaultDocumentVatRate(offerType, fallback);
}

export function applyDocumentVatDefaultOnLine<T extends { vatRate?: number | null }>(
  line: T,
  offerType?: string | null,
  fallback = 20,
): T {
  if (line.vatRate != null) return line;

  return {
    ...line,
    vatRate: getDefaultDocumentVatRate(offerType, fallback),
  };
}

export function enforceExportVatOnLine<T extends { vatRate?: number | null; vatAmount?: number | null }>(
  line: T,
  offerType?: string | null,
): T {
  return applyDocumentVatDefaultOnLine(line, offerType);
}
