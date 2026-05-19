import { useInfiniteQuery } from "@tanstack/react-query";
import { catalogApi } from "../api/catalogApi";
import type { CatalogStockItemDto } from "../types";
import type { PagedResponse } from "@/features/stocks/types";

const PAGE_SIZE = 24;

interface UseCatalogCategoryStocksQueryParams {
  catalogId: number | null;
  leafCategoryId: number | null;
  includeDescendants: boolean;
  search: string;
  enabled: boolean;
}

export function useCatalogCategoryStocksQuery(params: UseCatalogCategoryStocksQueryParams) {
  const { catalogId, leafCategoryId, includeDescendants, search, enabled } = params;

  return useInfiniteQuery<PagedResponse<CatalogStockItemDto>, Error>({
    queryKey: [
      "catalog",
      "category-stocks",
      catalogId,
      leafCategoryId,
      includeDescendants,
      search,
    ],
    queryFn: ({ pageParam = 1 }) => {
      if (catalogId == null || leafCategoryId == null) {
        return Promise.resolve({
          items: [],
          totalCount: 0,
          pageNumber: 1,
          pageSize: PAGE_SIZE,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        });
      }

      return catalogApi.getCatalogCategoryStocks(catalogId, leafCategoryId, {
        pageNumber: pageParam as number,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        includeDescendants,
      });
    },
    enabled: enabled && catalogId != null && leafCategoryId != null,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined),
    staleTime: 30 * 1000,
  });
}
