import { useQuery } from "@tanstack/react-query";
import { activityTypeApi } from "../api/activity-api";
import type { ActivityTypeDto } from "../types/activity-types";
import { activityTypeQueryKeys } from "../utils/query-keys";

export function useActivityTypes() {
  return useQuery<ActivityTypeDto[], Error>({
    queryKey: activityTypeQueryKeys.list(),
    queryFn: () => activityTypeApi.getList().then((p) => p.items),
    staleTime: 5 * 60 * 1000,
  });
}
