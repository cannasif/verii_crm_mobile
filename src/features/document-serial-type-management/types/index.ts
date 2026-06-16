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
