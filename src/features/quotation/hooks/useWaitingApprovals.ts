import { quotationQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";

export function useWaitingApprovals() {
  return useQuery({
    queryKey: quotationQueryKeys.waitingApprovals(),
    queryFn: () => quotationApi.getWaitingApprovals(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
