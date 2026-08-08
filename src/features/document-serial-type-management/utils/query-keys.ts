import type { CustomerDocumentSerialDocumentKindValue } from "../types/document-serial-type-types";

export const documentSerialTypeQueryKeys = {
  all: () => ["documentSerialType"] as const,
  available: (
    customerTypeId: number | null | undefined,
    salesRepId: number | undefined,
    ruleType: number
  ) => [...documentSerialTypeQueryKeys.all(), "available", customerTypeId, salesRepId, ruleType] as const,
  customerSuggestion: (
    customerId: number | null | undefined,
    documentKind: CustomerDocumentSerialDocumentKindValue | null | undefined,
    branchCode: string | null | undefined
  ) => [
    "document-serial-type-customer-suggestion",
    customerId ?? 0,
    documentKind ?? 0,
    branchCode ?? "",
  ] as const,
};
