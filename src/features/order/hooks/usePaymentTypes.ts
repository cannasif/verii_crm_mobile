import { paymentTypeQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { PaymentTypeDto } from "../types/order-types";

export function usePaymentTypes() {
  return useQuery<PaymentTypeDto[], Error>({
    queryKey: paymentTypeQueryKeys.list(),
    queryFn: () => orderApi.getPaymentTypes(),
    staleTime: 10 * 60 * 1000,
  });
}
