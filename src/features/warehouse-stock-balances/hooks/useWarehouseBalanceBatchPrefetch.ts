import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  warehouseStockBalanceApi,
  WAREHOUSE_STOCK_BALANCE_GC_MS,
  WAREHOUSE_STOCK_BALANCE_STALE_MS,
} from "../api";
import type { WarehouseStockBalanceDto } from "../types";
import { uniquePositiveStockIds, warehouseBalanceQueryKey } from "../utils/warehouseBalanceQueryKey";

const DEFAULT_BATCH_SIZE = 20;

function collectResolvedIds(
  queryClient: ReturnType<typeof useQueryClient>,
  stockIds: readonly number[]
): Set<number> {
  const resolved = new Set<number>();

  for (const stockId of stockIds) {
    const state = queryClient.getQueryState<WarehouseStockBalanceDto[]>(warehouseBalanceQueryKey(stockId));
    if (state?.status === "success") {
      resolved.add(stockId);
    }
  }

  return resolved;
}

function collectStockIdsWithBalance(
  queryClient: ReturnType<typeof useQueryClient>,
  stockIds: readonly number[]
): Set<number> {
  const withBalance = new Set<number>();

  for (const stockId of stockIds) {
    const rows = queryClient.getQueryData<WarehouseStockBalanceDto[]>(warehouseBalanceQueryKey(stockId));
    if (Array.isArray(rows) && rows.length > 0) {
      withBalance.add(stockId);
    }
  }

  return withBalance;
}

export function useWarehouseBalanceBatchPrefetch(
  stockIds: readonly number[],
  enabled: boolean,
  batchSize = DEFAULT_BATCH_SIZE
) {
  const queryClient = useQueryClient();
  const uniqueIds = useMemo(() => uniquePositiveStockIds(stockIds), [stockIds]);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [isPrefetching, setIsPrefetching] = useState(false);

  useEffect(() => {
    if (!enabled || uniqueIds.length === 0) {
      setIsPrefetching(false);
      return;
    }

    const pendingIds = uniqueIds.filter((stockId) => {
      const state = queryClient.getQueryState<WarehouseStockBalanceDto[]>(
        warehouseBalanceQueryKey(stockId)
      );
      return state?.status !== "success" && state?.fetchStatus !== "fetching";
    });

    if (pendingIds.length === 0) {
      setIsPrefetching(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsPrefetching(true);

      for (let index = 0; index < pendingIds.length; index += batchSize) {
        if (cancelled) break;

        const batch = pendingIds.slice(index, index + batchSize);
        await Promise.all(
          batch.map((stockId) =>
            queryClient.prefetchQuery({
              queryKey: warehouseBalanceQueryKey(stockId),
              queryFn: () => warehouseStockBalanceApi.getByStockId(stockId),
              staleTime: WAREHOUSE_STOCK_BALANCE_STALE_MS,
              gcTime: WAREHOUSE_STOCK_BALANCE_GC_MS,
            })
          )
        );

        if (!cancelled) {
          setCacheVersion((value) => value + 1);
        }
      }

      if (!cancelled) {
        setIsPrefetching(false);
      }
    })();

    return () => {
      cancelled = true;
      setIsPrefetching(false);
    };
  }, [batchSize, enabled, queryClient, uniqueIds]);

  const resolvedStockIds = useMemo(
    () => collectResolvedIds(queryClient, uniqueIds),
    [cacheVersion, queryClient, uniqueIds]
  );

  const stockIdsWithBalance = useMemo(
    () => collectStockIdsWithBalance(queryClient, uniqueIds),
    [cacheVersion, queryClient, uniqueIds]
  );

  return {
    stockIdsWithBalance,
    resolvedStockIds,
    isPrefetching,
  };
}
