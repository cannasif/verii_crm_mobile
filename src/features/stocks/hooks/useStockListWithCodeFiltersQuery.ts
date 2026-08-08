import { useInfiniteQuery } from "@tanstack/react-query";
import { hasSpecialCodeSelection, type CatalogSpecialCodeSelections } from "@/features/catalog";
import { fetchStockListWithCodeFilters } from "../utils/fetch-stock-list-with-code-filters";
import type { PagedFilter, PagedResponse } from "../types/common";
import type { StockGetDto } from "../types/stock";
import { stockQueryKeys } from "../utils/query-keys";

interface UseStockListWithCodeFiltersQueryParams {
  selections: CatalogSpecialCodeSelections;
  enabled: boolean;
  search?: string;
  searchFields?: string[];
  additionalFilters: PagedFilter[];
  filterLogic: "and" | "or";
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
}

export function useStockListWithCodeFiltersQuery(params: UseStockListWithCodeFiltersQueryParams) {
  const {
    selections,
    enabled,
    search,
    searchFields,
    additionalFilters,
    filterLogic,
    sortBy,
    sortDirection,
    pageSize,
  } = params;

  const normalizedSearch =
    search && search.trim().length >= 2 ? search.trim() : undefined;

  const selectionActive = hasSpecialCodeSelection(selections);

  return useInfiniteQuery<PagedResponse<StockGetDto>, Error>({
    queryKey: stockQueryKeys.codeFilterList({
      selections,
      additionalFilters,
      filterLogic,
      sortBy,
      sortDirection,
      pageSize,
      normalizedSearch,
      searchFields,
    }),
    queryFn: ({ pageParam = 1 }) =>
      fetchStockListWithCodeFilters(selections, {
        pageNumber: pageParam as number,
        pageSize,
        search: normalizedSearch,
        searchFields: normalizedSearch ? searchFields : undefined,
        additionalFilters,
        filterLogic,
        sortBy,
        sortDirection,
      }),
    enabled: enabled && selectionActive,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined),
    staleTime: 30 * 1000,
  });
}
