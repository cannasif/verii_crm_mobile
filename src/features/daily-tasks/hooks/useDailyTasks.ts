import { useQuery } from "@tanstack/react-query";
import { dailyTasksApi } from "../api/daily-tasks-api";
import type { ActivityDto } from "../../activity/types/activity-types";
import type { DailyTaskFilter } from "../types/daily-task-types";
import { dailyTaskQueryKeys } from "../utils/query-keys";

interface UseDailyTasksOptions {
  enabled?: boolean;
}

export function useDailyTasks(filter: DailyTaskFilter, options: UseDailyTasksOptions = {}) {
  const { enabled = true } = options;

  return useQuery<ActivityDto[], Error>({
    queryKey: dailyTaskQueryKeys.list(filter),
    queryFn: () => dailyTasksApi.getList(filter),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!filter.startDate && !!filter.endDate,
  });
}
