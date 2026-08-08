import { useQuery } from "@tanstack/react-query";
import {
  customer360Api,
  CUSTOMER_360_SUMMARY_STALE_MS,
} from "../api/customer360-api";
import type { Customer360AnalyticsSummaryDto } from "../types/customer360-types";
import { customer360QueryKeys } from "../utils/query-keys";

export function useCustomer360AnalyticsSummary(
  customerId: number | undefined,
  currency: string | null
): ReturnType<typeof useQuery<Customer360AnalyticsSummaryDto, Error>> {
  return useQuery<Customer360AnalyticsSummaryDto, Error>({
    queryKey: customer360QueryKeys.summary(customerId, currency),
    queryFn: () => customer360Api.getAnalyticsSummary(customerId!, currency),
    enabled: typeof customerId === "number" && customerId > 0,
    staleTime: CUSTOMER_360_SUMMARY_STALE_MS,
  });
}
