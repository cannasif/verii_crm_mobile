import { useQuery } from "@tanstack/react-query";
import type { StockGetDto } from "@/features/stocks/types";
import { fetchCatalogSpecialCodeFacetPool } from "../utils/fetchCatalogSpecialCodeStocks";

export function useCatalogSpecialCodeFacetPoolQuery(enabled: boolean) {
  return useQuery<StockGetDto[], Error>({
    queryKey: ["catalog", "special-code-facet-pool"],
    queryFn: fetchCatalogSpecialCodeFacetPool,
    enabled,
    staleTime: 120 * 1000,
    gcTime: 300 * 1000,
  });
}
