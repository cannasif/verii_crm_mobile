import type { DocumentRuleTypeValue, PagedFilter } from "../types/quotation-types";

export interface QuotationListQueryKeyParams {
  filters?: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic?: "and" | "or";
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
  approvalStatusFilter: string;
}

export interface CurrencyQueryKeyParams {
  tarih?: string;
  fiyatTipi?: number;
}

export interface QuotationPriceRuleQueryKeyParams {
  customerCode?: string;
  salesmenId?: number;
  quotationDate?: string;
}

export const quotationQueryKeys = {
  all: () => ["quotation"] as const,
  waitingApprovals: () => [...quotationQueryKeys.all(), "waitingApprovals"] as const,
  lists: () => [...quotationQueryKeys.all(), "quotations"] as const,
  list: (params: QuotationListQueryKeyParams) =>
    [...quotationQueryKeys.lists(), params] as const,
  detailRoot: () => [...quotationQueryKeys.all(), "detail"] as const,
  detail: (quotationId: number | null | undefined) =>
    [...quotationQueryKeys.detailRoot(), quotationId] as const,
  lines: (quotationId: number | undefined) =>
    [...quotationQueryKeys.detailRoot(), "lines", quotationId] as const,
  exchangeRates: (quotationId: number | undefined) =>
    [...quotationQueryKeys.detailRoot(), "exchangeRates", quotationId] as const,
  canEdit: (quotationId: number | null | undefined) =>
    [...quotationQueryKeys.all(), "canEdit", quotationId] as const,
  notes: (quotationId: number | undefined) =>
    [...quotationQueryKeys.all(), "notes", quotationId] as const,
  priceRule: (params: QuotationPriceRuleQueryKeyParams) =>
    [...quotationQueryKeys.all(), "priceRule", params] as const,
  erpProjects: () => [...quotationQueryKeys.all(), "erpProjects"] as const,
  salesTypes: (offerType: string | null | undefined) =>
    [...quotationQueryKeys.all(), "salesTypes", { offerType }] as const,
  relatedUsers: (userId: number | undefined) =>
    [...quotationQueryKeys.all(), "related-users", userId] as const,
  approvalFlowReport: (quotationId: number | undefined) =>
    [...quotationQueryKeys.all(), "approval-flow-report", quotationId] as const,
  approvalFlowReportLegacy: (quotationId: number | undefined) =>
    [...quotationQueryKeys.all(), "approvalFlowReport", quotationId] as const,
};

export const quotationCurrencyQueryKeys = {
  options: (params: CurrencyQueryKeyParams | undefined) =>
    ["currency", "options", params] as const,
};

export const quotationExchangeRateQueryKeys = {
  byParams: (params: CurrencyQueryKeyParams | undefined) =>
    ["exchangeRate", params] as const,
};

export const quotationPaymentTypeQueryKeys = {
  list: () => ["paymentType", "list"] as const,
};

export const quotationDocumentSerialTypeQueryKeys = {
  list: () => ["documentSerialType", "list"] as const,
};

export const quotationUserDiscountLimitQueryKeys = {
  bySalesperson: (salespersonId: number | undefined) =>
    ["userDiscountLimit", "salesperson", salespersonId] as const,
};

export const quotationUserQueryKeys = {
  list: () => ["user", "list"] as const,
};

export const quotationCustomerQueryKeys = {
  listForDetail: () => ["customer", "listForDetail"] as const,
};

export const reportTemplateQueryKeys = {
  list: (ruleType: DocumentRuleTypeValue) =>
    ["report-template", "list", ruleType] as const,
};
