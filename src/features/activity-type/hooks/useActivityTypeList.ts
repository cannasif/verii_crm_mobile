import { useQuery } from "@tanstack/react-query";
import { activityTypeApi } from "../../activity/api/activity-api";
import type { ActivityTypeDto, PagedParams, PagedResponse } from "../types/activity-type-types";
import { activityTypeQueryKeys } from "../utils/query-keys";

export function useActivityTypeList(params: PagedParams = {}) {
  return useQuery<PagedResponse<ActivityTypeDto>, Error>({
    queryKey: activityTypeQueryKeys.list(params),
    queryFn: () => activityTypeApi.getList(params),
    staleTime: 5 * 60 * 1000,
  });
}
