import { useQuery } from "@tanstack/react-query";
import { erpOrderApi } from "../api/erpOrderApi";
import type { NetsisOrderHeader } from "../types";

const ERP_ORDERS_STALE_MS = 3 * 60 * 1000;

export function useErpOrders() {
  return useQuery<NetsisOrderHeader[], Error>({
    queryKey: ["erp-orders", "headers"],
    queryFn: () => erpOrderApi.getNetsisOrders(),
    staleTime: ERP_ORDERS_STALE_MS,
  });
}

export { ERP_ORDERS_STALE_MS };
