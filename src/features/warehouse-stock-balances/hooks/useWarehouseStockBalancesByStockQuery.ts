import { useQuery } from "@tanstack/react-query";
import {
  warehouseStockBalanceApi,
  WAREHOUSE_STOCK_BALANCE_GC_MS,
  WAREHOUSE_STOCK_BALANCE_STALE_MS,
} from "../api/warehouse-stock-balance-api";
import type { WarehouseStockBalanceDto } from "../types/warehouse-stock-balance";
import { warehouseStockBalanceQueryKeys } from "../utils/query-keys";

export function useWarehouseStockBalancesByStockQuery(
  stockId: number | undefined,
  fetchEnabled = true
) {
  return useQuery<WarehouseStockBalanceDto[], Error>({
    queryKey: warehouseStockBalanceQueryKeys.byStock(stockId ?? 0),
    queryFn: () => warehouseStockBalanceApi.getByStockId(stockId!),
    enabled: fetchEnabled && typeof stockId === "number" && stockId > 0,
    staleTime: WAREHOUSE_STOCK_BALANCE_STALE_MS,
    gcTime: WAREHOUSE_STOCK_BALANCE_GC_MS,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
