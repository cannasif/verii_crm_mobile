import { quotationQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { QuotationApprovalFlowReportDto } from "../types/quotation-types";

const STALE_TIME_MS = 60 * 1000;

export function useQuotationApprovalFlowReport(
  quotationId: number | undefined
): {
  data: QuotationApprovalFlowReportDto | undefined;
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
    queryKey: quotationQueryKeys.approvalFlowReport(quotationId),
    queryFn: () => quotationApi.getApprovalFlowReport(quotationId!),
    enabled: typeof quotationId === "number",
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
