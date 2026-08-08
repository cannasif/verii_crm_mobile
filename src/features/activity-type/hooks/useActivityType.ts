import { useQuery } from "@tanstack/react-query";
import { activityTypeApi } from "../../activity/api/activity-api";
import type { ActivityTypeDto } from "../types/activity-type-types";
import { activityTypeQueryKeys } from "../utils/query-keys";

export function useActivityType(id: number | undefined) {
  return useQuery<ActivityTypeDto, Error>({
    queryKey: activityTypeQueryKeys.detail(id),
    queryFn: () => activityTypeApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
