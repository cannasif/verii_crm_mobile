import { useInfiniteQuery } from "@tanstack/react-query";
import { hasSpecialCodeSelection, type CatalogSpecialCodeSelections } from "@/features/catalog";
import { fetchStockListWithCodeFilters } from "../utils/fetchStockListWithCodeFilters";
import type { PagedFilter, PagedResponse, StockGetDto } from "../types";

interface UseStockListWithCodeFiltersQueryParams {
  selections: CatalogSpecialCodeSelections;
  enabled: boolean;
  search?: string;
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
    queryKey: [
      "stock",
      "list",
      "codeFilters",
      {
        selections,
        additionalFilters,
        filterLogic,
        sortBy,
        sortDirection,
        pageSize,
        normalizedSearch,
      },
    ],
    queryFn: ({ pageParam = 1 }) =>
      fetchStockListWithCodeFilters(selections, {
        pageNumber: pageParam as number,
        pageSize,
        search: normalizedSearch,
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
