import type { PagedFilter } from "../types/order-types";

export interface OrderListQueryKeyParams {
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

export interface OrderPriceRuleQueryKeyParams {
  customerCode?: string;
  salesmenId?: number;
  orderDate?: string;
}

export const orderQueryKeys = {
  all: () => ["order"] as const,
  waitingApprovals: () => [...orderQueryKeys.all(), "waitingApprovals"] as const,
  lists: () => [...orderQueryKeys.all(), "orders"] as const,
  list: (params: OrderListQueryKeyParams) => [...orderQueryKeys.lists(), params] as const,
  detail: (orderId: number | undefined) =>
    [...orderQueryKeys.all(), "detail", orderId] as const,
  lines: (orderId: number | undefined) =>
    [...orderQueryKeys.all(), "detail", "lines", orderId] as const,
  exchangeRates: (orderId: number | undefined) =>
    [...orderQueryKeys.all(), "detail", "exchangeRates", orderId] as const,
  canEdit: (orderId: number | null | undefined) =>
    [...orderQueryKeys.all(), "canEdit", orderId] as const,
  priceRule: (params: OrderPriceRuleQueryKeyParams) =>
    [...orderQueryKeys.all(), "priceRule", params] as const,
  relatedUsers: (userId: number | undefined) =>
    [...orderQueryKeys.all(), "related-users", userId] as const,
  listGrandTotal: (orderId: number) =>
    [...orderQueryKeys.all(), "listGrandTotal", orderId] as const,
  approvalFlowReport: (orderId: number | undefined) =>
    [...orderQueryKeys.all(), "approval-flow-report", orderId] as const,
  approvalFlowReportLegacy: (orderId: number | undefined) =>
    [...orderQueryKeys.all(), "approvalFlowReport", orderId] as const,
};

export const currencyQueryKeys = {
  options: (params: CurrencyQueryKeyParams | undefined) =>
    ["currency", "options", params] as const,
};

export const exchangeRateQueryKeys = {
  byParams: (params: CurrencyQueryKeyParams | undefined) =>
    ["exchangeRate", params] as const,
};

export const paymentTypeQueryKeys = {
  list: () => ["paymentType", "list"] as const,
};

export const documentSerialTypeQueryKeys = {
  list: () => ["documentSerialType", "list"] as const,
};

export const userDiscountLimitQueryKeys = {
  bySalesperson: (salespersonId: number | undefined) =>
    ["userDiscountLimit", "salesperson", salespersonId] as const,
};

export const userQueryKeys = {
  list: () => ["user", "list"] as const,
};

export const orderCustomerQueryKeys = {
  listForDetail: () => ["customer", "listForDetail"] as const,
};
