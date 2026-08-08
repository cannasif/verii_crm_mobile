import { quotationQueryKeys } from "../utils/query-keys";
import { useQueries } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type {
  QuotationDetailGetDto,
  QuotationLineDetailGetDto,
  QuotationExchangeRateDetailGetDto,
} from "../types/quotation-types";

const STALE_TIME_MS = 30 * 1000;

export function useQuotationDetail(quotationId: number | undefined): {
  header: QuotationDetailGetDto | undefined;
  lines: QuotationLineDetailGetDto[];
  exchangeRates: QuotationExchangeRateDetailGetDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const results = useQueries({
    queries: [
      {
        queryKey: quotationQueryKeys.detail(quotationId),
        queryFn: () => quotationApi.getById(quotationId!),
        enabled: typeof quotationId === "number",
        staleTime: STALE_TIME_MS,
      },
      {
        queryKey: quotationQueryKeys.lines(quotationId),
        queryFn: () => quotationApi.getLinesByQuotation(quotationId!),
        enabled: typeof quotationId === "number",
        staleTime: STALE_TIME_MS,
      },
      {
        queryKey: quotationQueryKeys.exchangeRates(quotationId),
        queryFn: () => quotationApi.getExchangeRatesByQuotation(quotationId!),
        enabled: typeof quotationId === "number",
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
