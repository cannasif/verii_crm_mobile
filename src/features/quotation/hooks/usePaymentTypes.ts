import { quotationPaymentTypeQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { PaymentTypeDto } from "../types/quotation-types";

export function usePaymentTypes() {
  return useQuery<PaymentTypeDto[], Error>({
    queryKey: quotationPaymentTypeQueryKeys.list(),
    queryFn: () => quotationApi.getPaymentTypes(),
    staleTime: 10 * 60 * 1000,
  });
}
