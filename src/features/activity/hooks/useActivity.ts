import { useQuery } from "@tanstack/react-query";
import { activityApi } from "../api/activity-api";
import type { ActivityDto } from "../types/activity-types";
import { activityQueryKeys } from "../utils/query-keys";

export function useActivity(id: number | undefined) {
  return useQuery<ActivityDto, Error>({
    queryKey: activityQueryKeys.detail(id),
    queryFn: () => activityApi.getById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
