import { useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { syncOrderListGrandTotal } from "../utils/syncOrderListGrandTotal";

const STALE_TIME_MS = 2 * 60 * 1000;

export function useOrderListGrandTotalSync(orderIds: readonly number[]): void {
  const queryClient = useQueryClient();
  const uniqueOrderIds = useMemo(
    () => Array.from(new Set(orderIds.filter((id) => Number.isFinite(id) && id > 0))),
    [orderIds]
  );

  useQueries({
    queries: uniqueOrderIds.map((orderId) => ({
      queryKey: ["order", "listGrandTotal", orderId] as const,
      queryFn: () => syncOrderListGrandTotal(queryClient, orderId),
      staleTime: STALE_TIME_MS,
    })),
  });
}
