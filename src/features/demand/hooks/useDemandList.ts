import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPagedDocumentList } from "../../../lib/documentApprovalFilter";
import { demandApi } from "../api";
import type { PagedFilter, PagedResponse, DemandGetDto } from "../types";

const DEFAULT_PAGE_SIZE = 20;
const STALE_TIME_MS = 2 * 60 * 1000;

interface UseDemandListParams {
  filters?: PagedFilter[];
  search?: string;
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  approvalStatusFilter?: string;
}

export function useDemandList(params: UseDemandListParams = {}) {
  const {
    filters,
    search,
    filterLogic,
    sortBy = "Id",
    sortDirection = "desc",
    pageSize = DEFAULT_PAGE_SIZE,
    approvalStatusFilter = "all",
  } = params;

  return useInfiniteQuery<PagedResponse<DemandGetDto>, Error>({
    queryKey: [
      "demand",
      "demands",
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
        (pageParams) => demandApi.getList(pageParams)
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined,
    staleTime: STALE_TIME_MS,
  });
}
