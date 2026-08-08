import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_COHORT_STALE_MS } from "../api/salesman360-api";
import type { CohortRetentionDto } from "../types/salesman360-types";
import { salesman360QueryKeys } from "../utils/query-keys";

export function useSalesman360Cohort(
  userId: number | undefined,
  months: number
): ReturnType<typeof useQuery<CohortRetentionDto[], Error>> {
  return useQuery<CohortRetentionDto[], Error>({
    queryKey: salesman360QueryKeys.cohort(userId, months),
    queryFn: () => salesman360Api.getCohort(userId!, months),
    enabled: typeof userId === "number" && userId > 0,
    staleTime: SALESMEN_360_COHORT_STALE_MS,
  });
}
