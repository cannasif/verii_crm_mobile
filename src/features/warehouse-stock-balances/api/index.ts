import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { WarehouseStockBalanceDto } from "../types";

export const WAREHOUSE_STOCK_BALANCE_STALE_MS = 60 * 1000;
export const WAREHOUSE_STOCK_BALANCE_GC_MS = 5 * 60 * 1000;

export const warehouseStockBalanceApi = {
  getByStockId: async (stockId: number): Promise<WarehouseStockBalanceDto[]> => {
    const response = await apiClient.get<ApiResponse<WarehouseStockBalanceDto[]>>(
      `/api/warehouse-stock-balances/by-stock/${stockId}`
    );

    if (!response.data.success) {
      const message =
        [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
        "Depo bakiyesi alınamadı";
      throw new Error(message);
    }

    return Array.isArray(response.data.data) ? response.data.data : [];
  },
};
