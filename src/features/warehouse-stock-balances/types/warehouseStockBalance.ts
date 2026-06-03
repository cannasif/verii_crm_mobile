export interface WarehouseStockBalanceDto {
  id: number;
  stockId: number;
  warehouseId: number;
  erpStockCode: string;
  stockName?: string | null;
  warehouseCode: number;
  warehouseName?: string | null;
  branchCode: number;
  balance: number;
  lastSyncDate?: string | null;
}

export type WarehouseBalanceTone = "positive" | "negative";
