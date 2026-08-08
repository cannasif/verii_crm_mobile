import { orderQueryKeys } from "../utils/query-keys";
import { useQueries } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type {
  OrderDetailGetDto,
  OrderLineDetailGetDto,
  OrderExchangeRateDetailGetDto,
} from "../types/order-types";

const STALE_TIME_MS = 60 * 1000;

export function useOrderDetail(orderId: number | undefined): {
  header: OrderDetailGetDto | undefined;
  lines: OrderLineDetailGetDto[];
  exchangeRates: OrderExchangeRateDetailGetDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const results = useQueries({
    queries: [
      {
        queryKey: orderQueryKeys.detail(orderId),
        queryFn: () => orderApi.getById(orderId!),
        enabled: typeof orderId === "number",
        staleTime: STALE_TIME_MS,
      },
      {
        queryKey: orderQueryKeys.lines(orderId),
        queryFn: () => orderApi.getLinesByOrder(orderId!),
        enabled: typeof orderId === "number",
        staleTime: STALE_TIME_MS,
      },
      {
        queryKey: orderQueryKeys.exchangeRates(orderId),
        queryFn: () => orderApi.getExchangeRatesByOrder(orderId!),
        enabled: typeof orderId === "number",
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
