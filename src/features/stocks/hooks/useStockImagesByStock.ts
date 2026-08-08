import { useQuery } from "@tanstack/react-query";
import { stockImageApi } from "../api/stock-image-api";
import type { StockImageDto } from "../types/stock";
import { stockQueryKeys } from "../utils/query-keys";

export function useStockImagesByStock(stockId: number | undefined) {
  return useQuery<StockImageDto[], Error>({
    queryKey: stockQueryKeys.images(stockId),
    queryFn: () => stockImageApi.getByStock(stockId!),
    enabled: stockId != null && !Number.isNaN(stockId),
    staleTime: 30 * 1000,
  });
}
