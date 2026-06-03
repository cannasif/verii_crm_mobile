export function warehouseBalanceQueryKey(stockId: number): readonly ["warehouse-stock-balances", "by-stock", number] {
  return ["warehouse-stock-balances", "by-stock", stockId];
}

export function uniquePositiveStockIds(stockIds: readonly number[]): number[] {
  const seen = new Set<number>();
  const ids: number[] = [];

  for (const rawId of stockIds) {
    if (typeof rawId !== "number" || rawId <= 0 || seen.has(rawId)) continue;
    seen.add(rawId);
    ids.push(rawId);
  }

  return ids;
}
