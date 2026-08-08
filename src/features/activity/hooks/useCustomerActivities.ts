import { useQuery } from "@tanstack/react-query";
import { activityApi } from "../api/activity-api";
import type { ActivityDto } from "../types/activity-types";
import { activityQueryKeys } from "../utils/query-keys";

export function useCustomerActivities(customerId?: number | null) {
  const normalizedCustomerId = customerId && customerId > 0 ? customerId : undefined;

  return useQuery<ActivityDto[], Error>({
    queryKey: activityQueryKeys.customerActivities(normalizedCustomerId),
    enabled: Boolean(normalizedCustomerId),
    queryFn: async () => {
      const response = await activityApi.getList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: "StartDateTime",
        sortDirection: "desc",
        filters: [
          {
            column: "PotentialCustomerId",
            operator: "Equals",
            value: String(normalizedCustomerId),
          },
        ],
      });

      return response.items ?? [];
    },
    staleTime: 30 * 1000,
  });
}
