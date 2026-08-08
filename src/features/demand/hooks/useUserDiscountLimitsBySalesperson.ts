import { demandUserDiscountLimitQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";
import type { UserDiscountLimitDto } from "../types/demand-types";

export function useUserDiscountLimitsBySalesperson(salespersonId: number | undefined) {
  return useQuery<UserDiscountLimitDto[], Error>({
    queryKey: demandUserDiscountLimitQueryKeys.bySalesperson(salespersonId),
    queryFn: () => demandApi.getUserDiscountLimitsBySalesperson(salespersonId!),
    enabled: !!salespersonId && salespersonId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
