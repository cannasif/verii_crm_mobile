import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_STALE_MS } from "../api/salesman360-api";
import type { Salesmen360AnalyticsSummaryDto, Salesmen360PeriodParams } from "../types/salesman360-types";
import { salesman360QueryKeys } from "../utils/query-keys";

export function useSalesman360AnalyticsSummary(
  userId: number | undefined,
  currency: string | null,
  periodParams?: Salesmen360PeriodParams,
  enabled = true
): ReturnType<typeof useQuery<Salesmen360AnalyticsSummaryDto, Error>> {
  return useQuery<Salesmen360AnalyticsSummaryDto, Error>({
    queryKey: salesman360QueryKeys.analyticsSummary(userId, currency, periodParams),
    queryFn: () => salesman360Api.getAnalyticsSummary(userId!, currency, periodParams),
    enabled: enabled && typeof userId === "number" && userId > 0,
    staleTime: SALESMEN_360_STALE_MS,
  });
}
