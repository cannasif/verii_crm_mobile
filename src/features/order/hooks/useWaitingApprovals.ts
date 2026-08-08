import { orderQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";

export function useWaitingApprovals() {
  return useQuery({
    queryKey: orderQueryKeys.waitingApprovals(),
    queryFn: () => orderApi.getWaitingApprovals(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
