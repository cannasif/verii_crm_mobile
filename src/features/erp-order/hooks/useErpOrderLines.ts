import { useQuery } from "@tanstack/react-query";
import { erpOrderApi } from "../api/erp-order-api";
import type { NetsisOrderLine } from "../types/erp-order-types";
import { erpOrderQueryKeys } from "../utils/query-keys";

const ERP_ORDER_LINES_STALE_MS = 2 * 60 * 1000;

export function useErpOrderLines(fatirsNo: string | undefined) {
  const normalizedFatirsNo = fatirsNo?.trim() ?? "";

  return useQuery<NetsisOrderLine[], Error>({
    queryKey: erpOrderQueryKeys.lines(normalizedFatirsNo),
    queryFn: () => erpOrderApi.getNetsisOrderLines(normalizedFatirsNo),
    enabled: normalizedFatirsNo.length > 0,
    staleTime: ERP_ORDER_LINES_STALE_MS,
  });
}

export { ERP_ORDER_LINES_STALE_MS };
