import { useQuery } from "@tanstack/react-query";
import type { StockGetDto } from "@/features/stocks/types";
import { fetchCatalogSpecialCodeFacetPool } from "../utils/fetch-catalog-special-code-stocks";
import { catalogQueryKeys } from "../utils/query-keys";

export function useCatalogSpecialCodeFacetPoolQuery(enabled: boolean) {
  return useQuery<StockGetDto[], Error>({
    queryKey: catalogQueryKeys.specialCodeFacetPool(),
    queryFn: fetchCatalogSpecialCodeFacetPool,
    enabled,
    staleTime: 120 * 1000,
    gcTime: 300 * 1000,
  });
}
