import { orderQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { OrderApprovalFlowReportDto } from "../types/order-types";

const STALE_TIME_MS = 60 * 1000;

export function useOrderApprovalFlowReport(
  orderId: number | undefined
): {
  data: OrderApprovalFlowReportDto | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: orderQueryKeys.approvalFlowReport(orderId),
    queryFn: () => orderApi.getApprovalFlowReport(orderId!),
    enabled: typeof orderId === "number",
    staleTime: STALE_TIME_MS,
  });

  return {
    data,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
    refetch,
  };
}
