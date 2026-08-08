import type { PagedFilter } from "../types/demand-types";

export interface DemandListQueryKeyParams {
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

export interface DemandPriceRuleQueryKeyParams {
  customerCode?: string;
  salesmenId?: number;
  demandDate?: string;
}

export const demandQueryKeys = {
  all: () => ["demand"] as const,
  waitingApprovals: () => [...demandQueryKeys.all(), "waitingApprovals"] as const,
  lists: () => [...demandQueryKeys.all(), "demands"] as const,
  list: (params: DemandListQueryKeyParams) => [...demandQueryKeys.lists(), params] as const,
  detail: (demandId: number | null | undefined) =>
    [...demandQueryKeys.all(), "detail", demandId] as const,
  lines: (demandId: number | undefined) =>
    [...demandQueryKeys.all(), "detail", "lines", demandId] as const,
  exchangeRates: (demandId: number | undefined) =>
    [...demandQueryKeys.all(), "detail", "exchangeRates", demandId] as const,
  canEdit: (demandId: number | null | undefined) =>
    [...demandQueryKeys.all(), "canEdit", demandId] as const,
  priceRule: (params: DemandPriceRuleQueryKeyParams) =>
    [...demandQueryKeys.all(), "priceRule", params] as const,
  relatedUsers: (userId: number | undefined) =>
    [...demandQueryKeys.all(), "related-users", userId] as const,
  approvalFlowReport: (demandId: number | undefined) =>
    [...demandQueryKeys.all(), "approval-flow-report", demandId] as const,
};

export const demandCurrencyQueryKeys = {
  options: (params: CurrencyQueryKeyParams | undefined) =>
    ["currency", "options", params] as const,
};

export const demandExchangeRateQueryKeys = {
  byParams: (params: CurrencyQueryKeyParams | undefined) =>
    ["exchangeRate", params] as const,
};

export const demandPaymentTypeQueryKeys = {
  list: () => ["paymentType", "list"] as const,
};

export const demandDocumentSerialTypeQueryKeys = {
  list: () => ["documentSerialType", "list"] as const,
};

export const demandUserDiscountLimitQueryKeys = {
  bySalesperson: (salespersonId: number | undefined) =>
    ["userDiscountLimit", "salesperson", salespersonId] as const,
};

export const demandUserQueryKeys = {
  list: () => ["user", "list"] as const,
};

export const demandCustomerQueryKeys = {
  listForDetail: () => ["customer", "listForDetail"] as const,
};
