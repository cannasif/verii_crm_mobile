import { useInfiniteQuery } from "@tanstack/react-query";
import { catalogApi } from "../api/catalogApi";
import type { CatalogStockItemDto } from "../types";
import type { PagedResponse } from "@/features/stocks/types";

const PAGE_SIZE = 24;

interface UseCatalogFavoritesQueryParams {
  catalogId: number | null;
  search: string;
  enabled: boolean;
}

export function useCatalogFavoritesQuery(params: UseCatalogFavoritesQueryParams) {
  const { catalogId, search, enabled } = params;

  return useInfiniteQuery<PagedResponse<CatalogStockItemDto>, Error>({
    queryKey: ["catalog", "favorites", catalogId, search],
    queryFn: ({ pageParam = 1 }) => {
      if (catalogId == null) {
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

      return catalogApi.getCatalogFavorites(catalogId, {
        pageNumber: pageParam as number,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
      });
    },
    enabled: enabled && catalogId != null,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined),
    staleTime: 30 * 1000,
  });
}
