import { demandQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";

export function useWaitingApprovals() {
  return useQuery({
    queryKey: demandQueryKeys.waitingApprovals(),
    queryFn: () => demandApi.getWaitingApprovals(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
