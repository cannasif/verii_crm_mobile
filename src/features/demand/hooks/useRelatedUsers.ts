import { demandQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";
import type { ApprovalScopeUserDto } from "../types/demand-types";

export function useRelatedUsers(userId: number | undefined) {
  return useQuery<ApprovalScopeUserDto[], Error>({
    queryKey: demandQueryKeys.relatedUsers(userId),
    queryFn: () => demandApi.getRelatedUsers(userId!),
    enabled: !!userId && userId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
