import { quotationQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";

const APPROVAL_WAITING_STATUS = 1;

export function useCanEditQuotation(
  quotationId: number | null | undefined,
  status: number | null | undefined
) {
  return useQuery({
    queryKey: quotationQueryKeys.canEdit(quotationId),
    queryFn: () => quotationApi.canEditWhileWaiting(quotationId!),
    enabled: quotationId != null && status === APPROVAL_WAITING_STATUS,
    staleTime: 5 * 60 * 1000,
  });
}
