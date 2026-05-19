import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../api/catalogApi";
import type { ProductCatalogDto } from "../types";

export function useCatalogsQuery(enabled: boolean) {
  return useQuery<ProductCatalogDto[], Error>({
    queryKey: ["catalog", "catalogs"],
    queryFn: () => catalogApi.getCatalogs(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
