import { useInfiniteQuery } from "@tanstack/react-query";
import { customerApi } from "../api/customerApi";
import type { PagedFilter, PagedResponse, CustomerDto } from "../types";

const DEFAULT_PAGE_SIZE = 20;

interface UseCustomersParams {
  filters?: PagedFilter[];
  search?: string;
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  contextUserId?: number;
  enabled?: boolean;
}

export function useCustomers(params: UseCustomersParams = {}) {
  const {
    filters,
    search,
    filterLogic,
    sortBy = "Id",
    sortDirection = "asc",
    pageSize = DEFAULT_PAGE_SIZE,
    contextUserId,
    enabled = true,
  } = params;

  return useInfiniteQuery<PagedResponse<CustomerDto>, Error>({
    queryKey: [
      "customer",
      "list",
      { filters, search, filterLogic, sortBy, sortDirection, pageSize, contextUserId },
    ],
    queryFn: ({ pageParam }) =>
      customerApi.getList({
        pageNumber: pageParam as number,
        pageSize,
        search,
        sortBy,
        sortDirection,
        filters,
        filterLogic,
        contextUserId,
      }),
    enabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined),
    staleTime: 30 * 1000,
  });
}
