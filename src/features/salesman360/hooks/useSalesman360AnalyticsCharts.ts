import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_STALE_MS } from "../api";
import type { Salesmen360AnalyticsChartsDto } from "../types";

export function useSalesman360AnalyticsCharts(
  userId: number | undefined,
  months: number,
  currency: string | null,
  enabled = true
): ReturnType<typeof useQuery<Salesmen360AnalyticsChartsDto, Error>> {
  return useQuery<Salesmen360AnalyticsChartsDto, Error>({
    queryKey: ["salesman360", "analytics", "charts", userId, months, currency],
    queryFn: () => salesman360Api.getAnalyticsCharts(userId!, months, currency),
    enabled: enabled && typeof userId === "number" && userId > 0,
    staleTime: SALESMEN_360_STALE_MS,
  });
}
