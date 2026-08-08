import { demandQueryKeys } from "../utils/query-keys";
import { useQueries } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";
import type {
  DemandDetailGetDto,
  DemandLineDetailGetDto,
  DemandExchangeRateDetailGetDto,
} from "../types/demand-types";

const STALE_TIME_MS = 60 * 1000;

export function useDemandDetail(demandId: number | undefined): {
  header: DemandDetailGetDto | undefined;
  lines: DemandLineDetailGetDto[];
  exchangeRates: DemandExchangeRateDetailGetDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const results = useQueries({
    queries: [
      {
        queryKey: demandQueryKeys.detail(demandId),
        queryFn: () => demandApi.getById(demandId!),
        enabled: typeof demandId === "number",
        staleTime: STALE_TIME_MS,
      },
      {
        queryKey: demandQueryKeys.lines(demandId),
        queryFn: () => demandApi.getLinesByDemand(demandId!),
        enabled: typeof demandId === "number",
        staleTime: STALE_TIME_MS,
      },
      {
        queryKey: demandQueryKeys.exchangeRates(demandId),
        queryFn: () => demandApi.getExchangeRatesByDemand(demandId!),
        enabled: typeof demandId === "number",
        staleTime: STALE_TIME_MS,
      },
    ],
  });

  const [headerQuery, linesQuery, ratesQuery] = results;
  const isLoading = headerQuery.isLoading || linesQuery.isLoading || ratesQuery.isLoading;
  const isError = headerQuery.isError || linesQuery.isError || ratesQuery.isError;
  const error = headerQuery.error ?? linesQuery.error ?? ratesQuery.error ?? null;

  const refetch = (): void => {
    headerQuery.refetch();
    linesQuery.refetch();
    ratesQuery.refetch();
  };

  return {
    header: headerQuery.data,
    lines: linesQuery.data ?? [],
    exchangeRates: ratesQuery.data ?? [],
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
    refetch,
  };
}
