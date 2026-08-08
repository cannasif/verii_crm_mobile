import { useQuery } from "@tanstack/react-query";
import { erpOrderApi } from "../api/erp-order-api";
import type { NetsisOrderHeader } from "../types/erp-order-types";
import { erpOrderQueryKeys } from "../utils/query-keys";

const ERP_ORDERS_STALE_MS = 3 * 60 * 1000;

export function useErpOrders() {
  return useQuery<NetsisOrderHeader[], Error>({
    queryKey: erpOrderQueryKeys.headers(),
    queryFn: () => erpOrderApi.getNetsisOrders(),
    staleTime: ERP_ORDERS_STALE_MS,
  });
}

export { ERP_ORDERS_STALE_MS };
