import { useQuery } from "@tanstack/react-query";
import {
  warehouseStockBalanceApi,
  WAREHOUSE_STOCK_BALANCE_GC_MS,
  WAREHOUSE_STOCK_BALANCE_STALE_MS,
} from "../api";
import type { WarehouseStockBalanceDto } from "../types";
import { warehouseBalanceQueryKey } from "../utils/warehouseBalanceQueryKey";

export function useWarehouseStockBalancesByStockQuery(
  stockId: number | undefined,
  fetchEnabled = true
) {
  return useQuery<WarehouseStockBalanceDto[], Error>({
    queryKey: warehouseBalanceQueryKey(stockId ?? 0),
    queryFn: () => warehouseStockBalanceApi.getByStockId(stockId!),
    enabled: fetchEnabled && typeof stockId === "number" && stockId > 0,
    staleTime: WAREHOUSE_STOCK_BALANCE_STALE_MS,
    gcTime: WAREHOUSE_STOCK_BALANCE_GC_MS,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
