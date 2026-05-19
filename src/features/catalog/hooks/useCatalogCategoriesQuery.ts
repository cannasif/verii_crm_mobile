import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../api/catalogApi";
import type { CatalogCategoryNodeDto } from "../types";

interface UseCatalogCategoriesQueryParams {
  catalogId: number | null;
  parentCatalogCategoryId: number | null;
  enabled: boolean;
}

export function useCatalogCategoriesQuery(params: UseCatalogCategoriesQueryParams) {
  const { catalogId, parentCatalogCategoryId, enabled } = params;

  return useQuery<CatalogCategoryNodeDto[], Error>({
    queryKey: ["catalog", "categories", catalogId, parentCatalogCategoryId],
    queryFn: () => {
      if (catalogId == null) {
        return Promise.resolve([]);
      }
      return catalogApi.getCatalogCategories(catalogId, parentCatalogCategoryId);
    },
    enabled: enabled && catalogId != null,
    staleTime: 2 * 60 * 1000,
  });
}
