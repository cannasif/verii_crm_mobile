export function resolveDocumentApprovalStatus(record: {
  status?: unknown;
  Status?: unknown;
}): number | null {
  const raw = record.status ?? record.Status;
  if (raw == null || raw === "") return null;
  const numeric = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 5) return null;
  return numeric;
}
