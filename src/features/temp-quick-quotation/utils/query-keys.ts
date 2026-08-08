import type { PagedFilter } from "../../customer/types/common";

interface TempQuickQuotationListQueryParams {
  search?: string;
  searchFields?: string[];
  sortBy: string;
  sortDirection: "asc" | "desc";
  filters?: PagedFilter[];
  pageSize: number;
}

type TempQuickQuotationId = number | null | undefined;

export const tempQuickQuotationQueryKeys = {
  all: () => ["temp-quick-quotation"] as const,
  listPrefix: () => [...tempQuickQuotationQueryKeys.all(), "list"] as const,
  list: (params: TempQuickQuotationListQueryParams) =>
    [...tempQuickQuotationQueryKeys.listPrefix(), params] as const,
  detail: (id: TempQuickQuotationId) =>
    [...tempQuickQuotationQueryKeys.all(), "detail", id] as const,
  lines: (id: TempQuickQuotationId) =>
    [...tempQuickQuotationQueryKeys.all(), "lines", id] as const,
  exchangeLines: (id: TempQuickQuotationId) =>
    [...tempQuickQuotationQueryKeys.all(), "exchange-lines", id] as const,
};
