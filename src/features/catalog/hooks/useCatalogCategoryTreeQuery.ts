import { useQuery } from "@tanstack/react-query";
import { fetchCatalogCategoryTreeFlat, type CatalogCategoryTreeFlatNode } from "../utils/fetch-catalog-category-tree-flat";
import { catalogQueryKeys } from "../utils/query-keys";

interface UseCatalogCategoryTreeQueryParams {
  catalogId: number | null;
  enabled: boolean;
}

export function useCatalogCategoryTreeQuery(params: UseCatalogCategoryTreeQueryParams) {
  const { catalogId, enabled } = params;

  return useQuery<CatalogCategoryTreeFlatNode[], Error>({
    queryKey: catalogQueryKeys.categoryTree(catalogId),
    queryFn: () => {
      if (catalogId == null) {
        return Promise.resolve([]);
      }
      return fetchCatalogCategoryTreeFlat(catalogId);
    },
    enabled: enabled && catalogId != null,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
