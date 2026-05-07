import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_STALE_MS } from "../api";
import type { Salesmen360AnalyticsSummaryDto, Salesmen360PeriodParams } from "../types";

export function useSalesman360AnalyticsSummary(
  userId: number | undefined,
  currency: string | null,
  periodParams?: Salesmen360PeriodParams,
  enabled = true
): ReturnType<typeof useQuery<Salesmen360AnalyticsSummaryDto, Error>> {
  return useQuery<Salesmen360AnalyticsSummaryDto, Error>({
    queryKey: ["salesman360", "analytics", "summary", userId, currency, periodParams?.period, periodParams?.startDate, periodParams?.endDate],
    queryFn: () => salesman360Api.getAnalyticsSummary(userId!, currency, periodParams),
    enabled: enabled && typeof userId === "number" && userId > 0,
    staleTime: SALESMEN_360_STALE_MS,
  });
}
