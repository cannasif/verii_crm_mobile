import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPagedDocumentList } from "../../../lib/documentApprovalFilter";
import { orderApi } from "../api";
import type { PagedFilter, PagedResponse, OrderGetDto } from "../types";

const DEFAULT_PAGE_SIZE = 20;
const STALE_TIME_MS = 2 * 60 * 1000;

interface UseOrderListParams {
  filters?: PagedFilter[];
  search?: string;
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  approvalStatusFilter?: string;
}

export function useOrderList(params: UseOrderListParams = {}) {
  const {
    filters,
    search,
    filterLogic,
    sortBy = "Id",
    sortDirection = "desc",
    pageSize = DEFAULT_PAGE_SIZE,
    approvalStatusFilter = "all",
  } = params;

  return useInfiniteQuery<PagedResponse<OrderGetDto>, Error>({
    queryKey: [
      "order",
      "orders",
      { filters, search, filterLogic, sortBy, sortDirection, pageSize, approvalStatusFilter },
    ],
    queryFn: ({ pageParam }) =>
      fetchPagedDocumentList(
        {
          approvalStatusFilter,
          pageNumber: pageParam as number,
          pageSize,
          search,
          sortBy,
          sortDirection,
          filters,
          filterLogic,
        },
        (pageParams) => orderApi.getList(pageParams)
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined,
    staleTime: STALE_TIME_MS,
  });
}
