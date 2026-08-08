import { useInfiniteQuery } from "@tanstack/react-query";
import { titleApi } from "../api/title-api";
import type { PagedFilter, PagedResponse, TitleDto } from "../types";
import { titleQueryKeys } from "../utils/query-keys";

const DEFAULT_PAGE_SIZE = 20;

interface UseTitlesParams {
  filters?: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
}

export function useTitles(params: UseTitlesParams = {}) {
  const {
    filters,
    search,
    searchFields,
    filterLogic = "and",
    sortBy = "titleName",
    sortDirection = "asc",
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;

  return useInfiniteQuery<PagedResponse<TitleDto>, Error>({
    queryKey: titleQueryKeys.list({
      filters,
      search,
      searchFields,
      filterLogic,
      sortBy,
      sortDirection,
      pageSize,
    }),
    queryFn: ({ pageParam }) =>
      titleApi.getList({
        pageNumber: pageParam as number,
        pageSize,
        search,
        searchFields: search ? searchFields : undefined,
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
