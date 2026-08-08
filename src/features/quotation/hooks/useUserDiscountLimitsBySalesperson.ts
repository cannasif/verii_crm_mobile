import { quotationUserDiscountLimitQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { UserDiscountLimitDto } from "../types/quotation-types";

export function useUserDiscountLimitsBySalesperson(salespersonId: number | undefined) {
  return useQuery<UserDiscountLimitDto[], Error>({
    queryKey: quotationUserDiscountLimitQueryKeys.bySalesperson(salespersonId),
    queryFn: () => quotationApi.getUserDiscountLimitsBySalesperson(salespersonId!),
    enabled: !!salespersonId && salespersonId > 0,
    staleTime: 10 * 60 * 1000,
  });
}
