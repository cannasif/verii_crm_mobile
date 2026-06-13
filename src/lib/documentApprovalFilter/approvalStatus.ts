export const ApprovalStatus = {
  NotRequired: 0,
  Waiting: 1,
  Approved: 2,
  Rejected: 3,
  Closed: 4,
  CustomerCancelled: 5,
} as const;

export type ApprovalStatusValue = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const DOCUMENT_APPROVAL_STATUS_FILTER_ALL = "all" as const;

export type DocumentApprovalStatusFilterValue =
  | typeof DOCUMENT_APPROVAL_STATUS_FILTER_ALL
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5";

export const DOCUMENT_APPROVAL_STATUS_FILTER_OPTIONS: readonly DocumentApprovalStatusFilterValue[] =
  ["all", "0", "1", "2", "3", "4", "5"] as const;

export function isDocumentApprovalStatusFilterValue(
  value: string
): value is DocumentApprovalStatusFilterValue {
  return (DOCUMENT_APPROVAL_STATUS_FILTER_OPTIONS as readonly string[]).includes(value);
}
