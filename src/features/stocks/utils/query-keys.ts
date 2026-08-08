import type { CatalogSpecialCodeSelections } from "@/features/catalog";
import type { PagedFilter } from "../types/common";

interface StockListQueryParams {
  filters: PagedFilter[];
  filterLogic?: "and" | "or";
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
  normalizedSearch?: string;
  searchFields?: string[];
}

interface StockCodeFilterListQueryParams {
  selections: CatalogSpecialCodeSelections;
  additionalFilters: PagedFilter[];
  filterLogic: "and" | "or";
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
  normalizedSearch?: string;
  searchFields?: string[];
}

export const stockQueryKeys = {
  all: () => ["stock"] as const,
  listPrefix: () => [...stockQueryKeys.all(), "list"] as const,
  list: (params: StockListQueryParams) => [...stockQueryKeys.listPrefix(), params] as const,
  codeFilterList: (params: StockCodeFilterListQueryParams) =>
    [...stockQueryKeys.listPrefix(), "codeFilters", params] as const,
  codeFacetPool: () => [...stockQueryKeys.listPrefix(), "code-facet-pool"] as const,
  detail: (id: number | undefined) => [...stockQueryKeys.all(), "detail", id] as const,
  groups: () => [...stockQueryKeys.all(), "groups"] as const,
  images: (stockId: number | undefined) => [...stockQueryKeys.all(), "images", stockId] as const,
  relations: (stockId: number | undefined, filters?: PagedFilter[]) =>
    [...stockQueryKeys.all(), "relations", stockId, filters] as const,
  relationsAsRelated: (relatedStockId: number | undefined) =>
    [...stockQueryKeys.all(), "relations", "asRelated", relatedStockId] as const,
};
