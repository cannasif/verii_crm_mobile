import { useQuery } from "@tanstack/react-query";
import { erpCustomerApi } from "../api/erp-customer-api";
import type { CariDto } from "../types/erp-customer-types";
import { erpCustomerQueryKeys } from "../utils/query-keys";

export function useErpCustomers() {
  return useQuery<CariDto[], Error>({
    queryKey: erpCustomerQueryKeys.fullList(),
    queryFn: () => erpCustomerApi.getCaris(),
    staleTime: 1000 * 60 * 10, // 10 dakika boyunca veriyi taze say, tekrar çekme
  });
}
