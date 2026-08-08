import { quotationQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { QuotationNotesGetDto } from "../types/quotation-types";

const STALE_TIME_MS = 2 * 60 * 1000;

export function useQuotationNotes(quotationId: number | undefined) {
  return useQuery<QuotationNotesGetDto | null, Error>({
    queryKey: quotationQueryKeys.notes(quotationId),
    queryFn: () => quotationApi.getQuotationNotes(quotationId!),
    enabled: typeof quotationId === "number" && quotationId > 0,
    staleTime: STALE_TIME_MS,
  });
}
