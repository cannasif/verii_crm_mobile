import { useInfiniteQuery } from "@tanstack/react-query";
import { activityApi } from "../api";
import type { PagedFilter, PagedResponse, ActivityDto } from "../types";

const DEFAULT_PAGE_SIZE = 20;

interface UseActivitiesParams {
  filters?: PagedFilter[];
  search?: string;
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
}

export function useActivities(params: UseActivitiesParams = {}) {
  const {
    filters,
    search,
    filterLogic = "and",
    sortBy = "Id",
    sortDirection = "desc",
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;

  return useInfiniteQuery<PagedResponse<ActivityDto>, Error>({
    queryKey: ["activity", "list", { filters, search, filterLogic, sortBy, sortDirection, pageSize }],
    queryFn: ({ pageParam }) =>
      activityApi.getList({
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
