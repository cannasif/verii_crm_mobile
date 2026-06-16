import type { TFunction } from "i18next";

export interface ErpCleanupDocument {
  erpCleanupStatus?: number | null;
  originalDocumentNumber?: string | null;
  erpCleanupReason?: string | null;
}

export function resolveErpCleanupInfo(document: ErpCleanupDocument, t: TFunction): string | null {
  const status = Number(document.erpCleanupStatus ?? 0);
  if (status === 0) return null;
  const label =
    status === 2 ? t("common.erpCleanupFailed") : t("common.salespersonClosedForRevision");
  const originalNo = document.originalDocumentNumber?.trim();
  const reason = document.erpCleanupReason?.trim();
  return [
    label,
    originalNo ? t("common.erpOriginalDocumentNo", { no: originalNo }) : null,
    reason ? t("common.erpCleanupReason", { reason }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
