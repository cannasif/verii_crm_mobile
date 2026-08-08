import { useQuery } from "@tanstack/react-query";
import { activityTypeApi } from "../../activity/api/activity-api";
import type { ActivityTypeStats } from "../types/activity-type-types";
import { activityTypeQueryKeys } from "../utils/query-keys";

function computeStats(items: { createdDate?: string }[]): ActivityTypeStats {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthStartStr = thisMonthStart.toISOString().split("T")[0];

  let newThisMonth = 0;
  for (const item of items) {
    const created = item.createdDate?.split("T")[0];
    if (created && created >= thisMonthStartStr) newThisMonth += 1;
  }

  return {
    totalActivityTypes: items.length,
    activeActivityTypes: items.length,
    newThisMonth,
  };
}

export function useActivityTypeStats() {
  return useQuery<ActivityTypeStats, Error>({
    queryKey: activityTypeQueryKeys.stats(),
    queryFn: async () => {
      const paged = await activityTypeApi.getList({
        pageNumber: 1,
        pageSize: 1000,
        sortBy: "Id",
        sortDirection: "desc",
      });
      return computeStats(paged.items);
    },
    staleTime: 2 * 60 * 1000,
  });
}
