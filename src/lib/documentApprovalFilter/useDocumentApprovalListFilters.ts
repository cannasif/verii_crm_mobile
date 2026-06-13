import { useCallback, useState } from "react";
import {
  DOCUMENT_APPROVAL_STATUS_FILTER_ALL,
  type DocumentApprovalStatusFilterValue,
  isDocumentApprovalStatusFilterValue,
} from "./approvalStatus";

export function useDocumentApprovalListFilters(): {
  approvalStatusFilter: DocumentApprovalStatusFilterValue;
  setApprovalStatusFilter: (value: DocumentApprovalStatusFilterValue) => void;
  isApprovalStatusFiltered: boolean;
} {
  const [approvalStatusFilter, setApprovalStatusFilterState] =
    useState<DocumentApprovalStatusFilterValue>(DOCUMENT_APPROVAL_STATUS_FILTER_ALL);

  const setApprovalStatusFilter = useCallback((value: DocumentApprovalStatusFilterValue) => {
    setApprovalStatusFilterState((current) => (current === value ? current : value));
  }, []);

  return {
    approvalStatusFilter,
    setApprovalStatusFilter,
    isApprovalStatusFiltered: approvalStatusFilter !== DOCUMENT_APPROVAL_STATUS_FILTER_ALL,
  };
}

export function parseDocumentApprovalStatusFilterValue(
  value: string
): DocumentApprovalStatusFilterValue {
  return isDocumentApprovalStatusFilterValue(value)
    ? value
    : DOCUMENT_APPROVAL_STATUS_FILTER_ALL;
}
