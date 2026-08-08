import { useInfiniteQuery } from "@tanstack/react-query";
import { stockApi } from "../api/stock-api";
import type { PagedFilter, PagedResponse } from "../types/common";
import type { StockGetDto } from "../types/stock";
import { stockQueryKeys } from "../utils/query-keys";

interface UseStocksParams {
  filters?: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  enabled?: boolean;
}

export function useStocks(params: UseStocksParams = {}) {
  const {
    filters = [],
    search,
    searchFields,
    filterLogic,
    sortBy = "stockName",
    sortDirection = "asc",
    pageSize = 20,
    enabled = true,
  } = params;

  const normalizedSearch =
    search && search.trim().length >= 2
      ? search.trim()
      : undefined;

  return useInfiniteQuery<PagedResponse<StockGetDto>, Error>({
    queryKey: stockQueryKeys.list({
      filters,
      filterLogic,
      sortBy,
      sortDirection,
      pageSize,
      normalizedSearch,
      searchFields,
    }),
    queryFn: ({ pageParam = 1 }) =>
      stockApi.getList({
        pageNumber: pageParam as number,
        pageSize,
        search: normalizedSearch,
        searchFields: normalizedSearch ? searchFields : undefined,
        sortBy,
        sortDirection,
        filters,
        filterLogic,
      }),
    enabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined;
    },
    staleTime: 30 * 1000,
  });
}
