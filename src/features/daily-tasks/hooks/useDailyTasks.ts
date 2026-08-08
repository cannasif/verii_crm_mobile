import { useQuery } from "@tanstack/react-query";
import { dailyTasksApi } from "../api";
import type { ActivityDto } from "../../activity/types/activity-types";
import type { DailyTaskFilter } from "../types";

interface UseDailyTasksOptions {
  enabled?: boolean;
}

export function useDailyTasks(filter: DailyTaskFilter, options: UseDailyTasksOptions = {}) {
  const { enabled = true } = options;

  return useQuery<ActivityDto[], Error>({
    queryKey: ["dailyTasks", filter.startDate, filter.endDate, filter.assignedUserId, filter.status],
    queryFn: () => dailyTasksApi.getList(filter),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!filter.startDate && !!filter.endDate,
  });
}
