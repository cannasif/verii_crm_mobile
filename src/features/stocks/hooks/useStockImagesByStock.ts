import { useQuery } from "@tanstack/react-query";
import { stockImageApi } from "../api/stockImageApi";
import type { StockImageDto } from "../types";

export function useStockImagesByStock(stockId: number | undefined) {
  return useQuery<StockImageDto[], Error>({
    queryKey: ["stock", "images", stockId],
    queryFn: () => stockImageApi.getByStock(stockId!),
    enabled: stockId != null && !Number.isNaN(stockId),
    staleTime: 30 * 1000,
  });
}
