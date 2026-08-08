import type { DailyTaskFilter } from "../types/daily-task-types";

export const dailyTaskQueryKeys = {
  all: () => ["dailyTasks"] as const,
  list: (filter: DailyTaskFilter) => [
    ...dailyTaskQueryKeys.all(),
    filter.startDate,
    filter.endDate,
    filter.assignedUserId,
    filter.status,
  ] as const,
};

export const dailyTaskRelatedQueryKeys = {
  activityLists: () => ["activity", "list"] as const,
  activityDetails: () => ["activity", "detail"] as const,
};
