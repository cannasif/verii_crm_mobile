import { useQuery } from "@tanstack/react-query";
import { stockApi } from "../api/stock-api";
import type { StockGetDto } from "../types/stock";
import { inventoryQueryKeys } from "../utils/query-keys";

export function useStock(id: number | undefined) {
  return useQuery<StockGetDto, Error>({
    queryKey: inventoryQueryKeys.detail(id),
    queryFn: () => stockApi.getById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
