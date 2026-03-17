import { useInfiniteQuery } from "@tanstack/react-query";
import { stockApi } from "../api/stockApi";
import type { StockGetDto, PagedParams, PagedFilter } from "../types";

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
    filters,
    search,
    filterLogic = "and",
    sortBy = "stockName",
    sortDirection = "asc",
    pageSize = 20,
  } = params;

  return useInfiniteQuery({
    queryKey: ["stock", "list", { filters, search, filterLogic, sortBy, sortDirection }],
    queryFn: ({ pageParam = 1 }) =>
      stockApi.getList({
        pageNumber: pageParam as number,
        pageSize,
        search,
        sortBy,
        sortDirection,
        filters,
        filterLogic,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined),
    staleTime: 30 * 1000,
  });
}
