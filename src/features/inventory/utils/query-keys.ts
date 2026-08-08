import type { PagedFilter } from "../types/common";

interface InventoryListQueryParams {
  filters?: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic: "and" | "or";
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
}

export const inventoryQueryKeys = {
  all: () => ["stock"] as const,
  detail: (id: number | undefined) => [...inventoryQueryKeys.all(), "detail", id] as const,
  list: (params: InventoryListQueryParams) =>
    [...inventoryQueryKeys.all(), "list", params] as const,
  relations: (stockId: number | undefined, filters?: PagedFilter[]) =>
    [...inventoryQueryKeys.all(), "relations", stockId, filters] as const,
};
