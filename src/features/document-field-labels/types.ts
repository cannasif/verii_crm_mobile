export type DocumentFieldLabelDocumentType = "Demand" | "Quotation" | "Order";
export type DocumentFieldLabelScope = "HeaderNote" | "LineDescription";
export type DocumentContextKey = "demand" | "quotation" | "order";

export interface DocumentFieldLabelDto {
  id: number;
  documentType: DocumentFieldLabelDocumentType;
  scope: DocumentFieldLabelScope;
  fieldKey: string;
  defaultLabel: string;
  customLabel?: string | null;
  effectiveLabel: string;
  helpText?: string | null;
  placeholder?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const DOCUMENT_CONTEXT_TO_TYPE: Record<DocumentContextKey, DocumentFieldLabelDocumentType> = {
  demand: "Demand",
  quotation: "Quotation",
  order: "Order",
};
