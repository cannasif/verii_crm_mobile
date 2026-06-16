import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api";

const APPROVAL_WAITING_STATUS = 1;

export function useCanEditOrder(
  orderId: number | null | undefined,
  status: number | null | undefined
) {
  return useQuery({
    queryKey: ["order", "canEdit", orderId],
    queryFn: () => orderApi.canEditWhileWaiting(orderId!),
    enabled: orderId != null && status === APPROVAL_WAITING_STATUS,
    staleTime: 5 * 60 * 1000,
  });
}
