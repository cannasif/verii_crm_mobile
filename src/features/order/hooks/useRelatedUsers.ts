import { orderQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { ApprovalScopeUserDto } from "../types/order-types";

export function useRelatedUsers(userId: number | undefined) {
  return useQuery<ApprovalScopeUserDto[], Error>({
    queryKey: orderQueryKeys.relatedUsers(userId),
    queryFn: () => orderApi.getRelatedUsers(userId!),
    enabled: !!userId && userId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
