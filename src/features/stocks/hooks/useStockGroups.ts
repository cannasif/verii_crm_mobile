import { useQuery } from "@tanstack/react-query";
import { stockApi } from "../api/stock-api";
import type { StockGroupDto } from "../types/stock";
import { stockQueryKeys } from "../utils/query-keys";

export function useStockGroups() {
  return useQuery<StockGroupDto[], Error>({
    queryKey: stockQueryKeys.groups(),
    queryFn: () => stockApi.getGroups(),
    staleTime: 5 * 60 * 1000,
  });
}
