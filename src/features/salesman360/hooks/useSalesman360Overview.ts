import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_STALE_MS } from "../api/salesman360-api";
import type { Salesmen360OverviewDto, Salesmen360PeriodParams } from "../types/salesman360-types";
import { salesman360QueryKeys } from "../utils/query-keys";

export function useSalesman360Overview(
  userId: number | undefined,
  currency: string | null,
  periodParams?: Salesmen360PeriodParams
): ReturnType<typeof useQuery<Salesmen360OverviewDto, Error>> {
  return useQuery<Salesmen360OverviewDto, Error>({
    queryKey: salesman360QueryKeys.overview(userId, currency, periodParams),
    queryFn: () => salesman360Api.getOverview(userId!, currency, periodParams),
    enabled: typeof userId === "number" && userId > 0,
    staleTime: SALESMEN_360_STALE_MS,
  });
}
