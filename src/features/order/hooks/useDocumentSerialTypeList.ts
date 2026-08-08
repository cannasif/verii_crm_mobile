import { documentSerialTypeQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { DocumentSerialTypeDto } from "../types/order-types";

const STALE_TIME_MS = 60 * 1000;

export function useDocumentSerialTypeList(): {
  data: DocumentSerialTypeDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery<DocumentSerialTypeDto[], Error>({
    queryKey: documentSerialTypeQueryKeys.list(),
    queryFn: () => orderApi.getDocumentSerialTypeList(),
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
