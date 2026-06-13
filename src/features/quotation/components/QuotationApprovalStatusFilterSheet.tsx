import React from "react";
import { DocumentApprovalStatusFilterSheet as SharedDocumentApprovalStatusFilterSheet } from "../../../components/paged";
import type { DocumentApprovalStatusFilterValue } from "../../../lib/documentApprovalFilter";

interface QuotationApprovalStatusFilterSheetProps {
  visible: boolean;
  selectedValue: DocumentApprovalStatusFilterValue;
  onClose: () => void;
  onSelect: (value: DocumentApprovalStatusFilterValue) => void;
}

export function QuotationApprovalStatusFilterSheet(
  props: QuotationApprovalStatusFilterSheetProps
): React.ReactElement {
  return <SharedDocumentApprovalStatusFilterSheet {...props} module="quotation" />;
}

