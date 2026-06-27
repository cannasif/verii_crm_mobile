import { useQuery } from "@tanstack/react-query";
import { activityApi } from "../api";
import type { ActivityDto } from "../types";

export function useCustomerActivities(customerId?: number | null) {
  const normalizedCustomerId = customerId && customerId > 0 ? customerId : undefined;

  return useQuery<ActivityDto[], Error>({
    queryKey: ["activity", "customer-activities", normalizedCustomerId],
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
