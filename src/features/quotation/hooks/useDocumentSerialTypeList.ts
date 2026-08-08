import { quotationDocumentSerialTypeQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { DocumentSerialTypeDto } from "../types/quotation-types";

const STALE_TIME_MS = 60 * 1000;

export function useDocumentSerialTypeList(): {
  data: DocumentSerialTypeDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery<DocumentSerialTypeDto[], Error>({
    queryKey: quotationDocumentSerialTypeQueryKeys.list(),
    queryFn: () => quotationApi.getDocumentSerialTypeList(),
    staleTime: STALE_TIME_MS,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: () => query.refetch(),
  };
}
