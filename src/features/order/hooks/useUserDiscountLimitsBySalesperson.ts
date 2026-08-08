import { userDiscountLimitQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { UserDiscountLimitDto } from "../types/order-types";

export function useUserDiscountLimitsBySalesperson(salespersonId: number | undefined) {
  return useQuery<UserDiscountLimitDto[], Error>({
    queryKey: userDiscountLimitQueryKeys.bySalesperson(salespersonId),
    queryFn: () => orderApi.getUserDiscountLimitsBySalesperson(salespersonId!),
    enabled: !!salespersonId && salespersonId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
