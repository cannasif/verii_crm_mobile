import { useQueries } from "@tanstack/react-query";
import { stockApi } from "@/features/stocks/api/stockApi";
import type { StockRelationDto } from "@/features/stocks/types";
import type { CatalogStockItemDto } from "../types";

interface UseCatalogStockRelationsQueryParams {
  enabled: boolean;
  stocks: CatalogStockItemDto[];
}

export function useCatalogStockRelationsQuery(params: UseCatalogStockRelationsQueryParams) {
  const { enabled, stocks } = params;

  return useQueries({
    queries: stocks.map((stock) => ({
      queryKey: ["catalog", "stock-relations", stock.stockId],
      queryFn: async () => {
        const response = await stockApi.getRelations(stock.stockId, { pageNumber: 1, pageSize: 100 });
        return response.items;
      },
      enabled: enabled && stock.stockId > 0,
      staleTime: 60 * 1000,
    })),
  });
}

export function buildCatalogRelationMap(
  stocks: CatalogStockItemDto[],
  queryResults: Array<{ data?: StockRelationDto[] }>
): Record<number, StockRelationDto[]> {
  const relationMap: Record<number, StockRelationDto[]> = {};

  stocks.forEach((stock, index) => {
    const relations = queryResults[index]?.data ?? [];
    if (relations.length > 0) {
      relationMap[stock.stockId] = relations;
    }
  });

  return relationMap;
}
