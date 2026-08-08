import { demandPaymentTypeQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";
import type { PaymentTypeDto } from "../types/demand-types";

export function usePaymentTypes() {
  return useQuery<PaymentTypeDto[], Error>({
    queryKey: demandPaymentTypeQueryKeys.list(),
    queryFn: () => demandApi.getPaymentTypes(),
    staleTime: 10 * 60 * 1000,
  });
}
