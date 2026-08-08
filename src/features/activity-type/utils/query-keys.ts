import type { PagedParams } from "../types/activity-type-types";

export const activityTypeQueryKeys = {
  all: () => ["activityType"] as const,
  lists: () => [...activityTypeQueryKeys.all(), "list"] as const,
  list: (params: PagedParams) => [...activityTypeQueryKeys.lists(), params] as const,
  detail: (id: number | undefined) => [...activityTypeQueryKeys.all(), "detail", id] as const,
  stats: () => [...activityTypeQueryKeys.all(), "stats"] as const,
};
