import { resolveDocumentApprovalStatus } from "./resolveDocumentApprovalStatus";

export function filterDocumentsByApprovalStatus<T extends { status?: unknown; Status?: unknown }>(
  records: readonly T[],
  approvalStatusFilter: string
): T[] {
  if (approvalStatusFilter === "all") return [...records];
  const targetStatus = Number(approvalStatusFilter);
  if (Number.isNaN(targetStatus)) return [...records];
  return records.filter((record) => resolveDocumentApprovalStatus(record) === targetStatus);
}
