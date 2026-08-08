import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_STALE_MS } from "../api/salesman360-api";
import type { Salesmen360AnalyticsChartsDto, Salesmen360PeriodParams } from "../types/salesman360-types";
import { salesman360QueryKeys } from "../utils/query-keys";

export function useSalesman360AnalyticsCharts(
  userId: number | undefined,
  months: number,
  currency: string | null,
  periodParams?: Salesmen360PeriodParams,
  enabled = true
): ReturnType<typeof useQuery<Salesmen360AnalyticsChartsDto, Error>> {
  return useQuery<Salesmen360AnalyticsChartsDto, Error>({
    queryKey: salesman360QueryKeys.analyticsCharts(userId, months, currency, periodParams),
    queryFn: () => salesman360Api.getAnalyticsCharts(userId!, months, currency, periodParams),
    enabled: enabled && typeof userId === "number" && userId > 0,
    staleTime: SALESMEN_360_STALE_MS,
  });
}
