export interface DocumentSerialTypeDto {
  id: number;
  serialPrefix?: string | null;
  name?: string | null;
  documentType?: number;
  customerTypeId?: number;
  salesRepId?: number;
  serialCurrent?: number | null;
  serialStart?: number | null;
  serialLength?: number | null;
  serialIncrement?: number | null;
}

export const DocumentSerialRuleType = {
  Demand: 1,
  Quotation: 2,
  Order: 3,
} as const;

export type DocumentSerialRuleTypeValue =
  (typeof DocumentSerialRuleType)[keyof typeof DocumentSerialRuleType];

export const CustomerDocumentSerialDocumentKind = {
  Quotation: 1,
  Order: 2,
  Demand: 3,
} as const;

export type CustomerDocumentSerialDocumentKindValue =
  (typeof CustomerDocumentSerialDocumentKind)[keyof typeof CustomerDocumentSerialDocumentKind];

export interface CustomerDocumentSerialSuggestionDto {
  customerId: number;
  documentKind: CustomerDocumentSerialDocumentKindValue;
  documentSerialTypeId: number;
  serialPrefix?: string | null;
  serialPrefixSnapshot?: string | null;
  usageCount: number;
  lastUsedAt?: string | null;
  lastDocumentId?: number | null;
  lastDocumentNo?: string | null;
  requestBranchCode?: string | null;
}
