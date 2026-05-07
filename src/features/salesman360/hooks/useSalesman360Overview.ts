import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_STALE_MS } from "../api";
import type { Salesmen360OverviewDto, Salesmen360PeriodParams } from "../types";

export function useSalesman360Overview(
  userId: number | undefined,
  currency: string | null,
  periodParams?: Salesmen360PeriodParams
): ReturnType<typeof useQuery<Salesmen360OverviewDto, Error>> {
  return useQuery<Salesmen360OverviewDto, Error>({
    queryKey: ["salesman360", "overview", userId, currency, periodParams?.period, periodParams?.startDate, periodParams?.endDate],
    queryFn: () => salesman360Api.getOverview(userId!, currency, periodParams),
    enabled: typeof userId === "number" && userId > 0,
    staleTime: SALESMEN_360_STALE_MS,
  });
}
