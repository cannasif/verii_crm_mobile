import { useMemo } from "react";
import {
  computeTotalBalance,
  formatWarehouseBalanceWithUnit,
  resolveWarehouseBalanceTone,
} from "../utils/warehouseBalanceCompute";
import { useWarehouseStockBalancesByStockQuery } from "./useWarehouseStockBalancesByStockQuery";

export function useWarehouseBalanceViewModel(
  stockId: number | undefined,
  unit?: string | null,
  fetchEnabled = true
) {
  const query = useWarehouseStockBalancesByStockQuery(stockId, fetchEnabled);
  const rows = query.data ?? [];

  const totalBalance = useMemo(() => computeTotalBalance(rows), [rows]);
  const tone = useMemo(() => resolveWarehouseBalanceTone(totalBalance), [totalBalance]);
  const formattedTotal = useMemo(
    () => formatWarehouseBalanceWithUnit(totalBalance, unit),
    [totalBalance, unit]
  );
  const showBadge = rows.length > 0;

  return {
    ...query,
    rows,
    totalBalance,
    tone,
    formattedTotal,
    showBadge,
  };
}
