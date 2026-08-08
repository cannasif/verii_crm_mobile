import { useQuery } from "@tanstack/react-query";
import {
  fetchCatalogSpecialCodeStocks,
  type CatalogSpecialCodeStockResult,
} from "../utils/fetch-catalog-special-code-stocks";
import {
  hasSpecialCodeSelection,
  type CatalogSpecialCodeSelections,
} from "../utils/catalog-special-code-filter";
import { catalogQueryKeys } from "../utils/query-keys";

interface UseCatalogSpecialCodeStocksQueryParams {
  enabled: boolean;
  selections: CatalogSpecialCodeSelections;
  search: string;
}

export function useCatalogSpecialCodeStocksQuery(params: UseCatalogSpecialCodeStocksQueryParams) {
  const { enabled, selections, search } = params;
  const selectionActive = hasSpecialCodeSelection(selections);

  return useQuery<CatalogSpecialCodeStockResult, Error>({
    queryKey: catalogQueryKeys.specialCodeStocks(selections, search),
    queryFn: () => fetchCatalogSpecialCodeStocks(selections, search),
    enabled: enabled && selectionActive,
    staleTime: 60 * 1000,
  });
}
