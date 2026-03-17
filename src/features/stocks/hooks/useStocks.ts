import { useInfiniteQuery } from "@tanstack/react-query";
import { stockApi } from "../api/stockApi";
import type { StockGetDto, PagedFilter, PagedResponse } from "../types";

interface UseStocksParams {
  filters?: PagedFilter[];
  search?: string;
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
}

export function useStocks(params: UseStocksParams = {}) {
  const {
    filters = [],
    search,
    filterLogic,
    sortBy = "stockName",
    sortDirection = "asc",
    pageSize = 20,
  } = params;

  const normalizedSearch =
    search && search.trim().length >= 2
      ? search.trim()
      : undefined;

  return useInfiniteQuery<PagedResponse<StockGetDto>, Error>({
    queryKey: ["stock", "list", { filters, filterLogic, sortBy, sortDirection, pageSize, normalizedSearch }],
    queryFn: ({ pageParam = 1 }) =>
      stockApi.getList({
        pageNumber: pageParam as number,
        pageSize,
        search: normalizedSearch,
        sortBy,
        sortDirection,
        filters,
        filterLogic,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined;
    },
    staleTime: 30 * 1000,
  });
}
