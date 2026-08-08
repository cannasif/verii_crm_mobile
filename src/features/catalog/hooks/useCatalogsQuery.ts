import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../api/catalog-api";
import type { ProductCatalogDto } from "../types/catalog-types";
import { catalogQueryKeys } from "../utils/query-keys";

export function useCatalogsQuery(enabled: boolean) {
  return useQuery<ProductCatalogDto[], Error>({
    queryKey: catalogQueryKeys.catalogs(),
    queryFn: () => catalogApi.getCatalogs(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
