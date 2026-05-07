import { useInfiniteQuery } from "@tanstack/react-query";
import { orderApi } from "../api";
import type { PagedFilter, PagedResponse, OrderGetDto } from "../types";

const DEFAULT_PAGE_SIZE = 20;

interface UseOrderListParams {
  filters?: PagedFilter[];
  search?: string;
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
}

export function useOrderList(params: UseOrderListParams = {}) {
  const {
    filters,
    search,
    filterLogic,
    sortBy = "Id",
    sortDirection = "desc",
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;

  return useInfiniteQuery<PagedResponse<OrderGetDto>, Error>({
    queryKey: ["order", "orders", { filters, search, filterLogic, sortBy, sortDirection, pageSize }],
    queryFn: ({ pageParam }) =>
      orderApi.getList({
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
    staleTime: 2 * 60 * 1000,
  });
}
