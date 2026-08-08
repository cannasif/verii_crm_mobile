import { useQuery } from "@tanstack/react-query";
import {
  customer360Api,
  CUSTOMER_360_OVERVIEW_STALE_MS,
} from "../api/customer360-api";
import type { Customer360OverviewDto } from "../types/customer360-types";
import { customer360QueryKeys } from "../utils/query-keys";

export function useCustomer360Overview(
  customerId: number | undefined,
  currency: string | null
): ReturnType<typeof useQuery<Customer360OverviewDto, Error>> {
  return useQuery<Customer360OverviewDto, Error>({
    queryKey: customer360QueryKeys.overview(customerId, currency),
    queryFn: () => customer360Api.getOverview(customerId!, currency),
    enabled: typeof customerId === "number" && customerId > 0,
    staleTime: CUSTOMER_360_OVERVIEW_STALE_MS,
  });
}
