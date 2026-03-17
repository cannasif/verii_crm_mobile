import { useInfiniteQuery } from "@tanstack/react-query";
import { titleApi } from "../api/titleApi";
import type { PagedFilter, PagedResponse, TitleDto } from "../types";

const DEFAULT_PAGE_SIZE = 20;

interface UseTitlesParams {
  filters?: PagedFilter[];
  search?: string;
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
}

export function useTitles(params: UseTitlesParams = {}) {
  const {
    filters,
    search,
    filterLogic = "and",
    sortBy = "titleName",
    sortDirection = "asc",
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;

  return useInfiniteQuery<PagedResponse<TitleDto>, Error>({
    queryKey: ["title", "list", { filters, search, filterLogic, sortBy, sortDirection }],
    queryFn: ({ pageParam }) =>
      titleApi.getList({
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
