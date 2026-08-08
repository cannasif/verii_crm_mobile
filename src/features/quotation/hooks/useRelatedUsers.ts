import { quotationQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { ApprovalScopeUserDto } from "../types/quotation-types";

export function useRelatedUsers(userId: number | undefined) {
  return useQuery<ApprovalScopeUserDto[], Error>({
    queryKey: quotationQueryKeys.relatedUsers(userId),
    queryFn: () => quotationApi.getRelatedUsers(userId!),
    enabled: !!userId && userId > 0,
    staleTime: 10 * 60 * 1000,
  });
}
