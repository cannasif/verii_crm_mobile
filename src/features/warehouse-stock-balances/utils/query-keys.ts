export const warehouseStockBalanceQueryKeys = {
  all: () => ["warehouse-stock-balances"] as const,
  byStock: (stockId: number) =>
    [...warehouseStockBalanceQueryKeys.all(), "by-stock", stockId] as const,
};

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
