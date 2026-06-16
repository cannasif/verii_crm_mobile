export function resolveDocumentStatus(record: {
  status?: unknown;
  Status?: unknown;
}): number | null {
  const raw = record.status ?? record.Status;
  if (raw == null || raw === "") return null;
  const numeric = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 7) return null;
  return numeric;
}

export function resolveDocumentCancellationReason(record: unknown): string | null {
  if (record == null || typeof record !== "object") return null;
  const source = record as {
    cancellationReason?: unknown;
    CancellationReason?: unknown;
  };
  const raw = source.cancellationReason ?? source.CancellationReason;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
