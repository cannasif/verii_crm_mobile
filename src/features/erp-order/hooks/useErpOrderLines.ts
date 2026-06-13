import { useQuery } from "@tanstack/react-query";
import { erpOrderApi } from "../api/erpOrderApi";
import type { NetsisOrderLine } from "../types";

const ERP_ORDER_LINES_STALE_MS = 2 * 60 * 1000;

export function useErpOrderLines(fatirsNo: string | undefined) {
  const normalizedFatirsNo = fatirsNo?.trim() ?? "";

  return useQuery<NetsisOrderLine[], Error>({
    queryKey: ["erp-orders", "lines", normalizedFatirsNo],
    queryFn: () => erpOrderApi.getNetsisOrderLines(normalizedFatirsNo),
    enabled: normalizedFatirsNo.length > 0,
    staleTime: ERP_ORDER_LINES_STALE_MS,
  });
}

export { ERP_ORDER_LINES_STALE_MS };
