import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_STALE_MS } from "../api";
import type { Salesmen360AnalyticsSummaryDto } from "../types";

export function useSalesman360AnalyticsSummary(
  userId: number | undefined,
  currency: string | null,
  enabled = true
): ReturnType<typeof useQuery<Salesmen360AnalyticsSummaryDto, Error>> {
  return useQuery<Salesmen360AnalyticsSummaryDto, Error>({
    queryKey: ["salesman360", "analytics", "summary", userId, currency],
    queryFn: () => salesman360Api.getAnalyticsSummary(userId!, currency),
    enabled: enabled && typeof userId === "number" && userId > 0,
    staleTime: SALESMEN_360_STALE_MS,
  });
}
