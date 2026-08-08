import type { ActivityTypeDto, PagedParams, PagedResponse } from "../../activity/types/activity-types";

export type { ActivityTypeDto, PagedParams, PagedResponse } from "../../activity/types/activity-types";

export interface CreateActivityTypeDto {
  name: string;
  description?: string;
}

export interface UpdateActivityTypeDto {
  name: string;
  description?: string;
}

export interface ActivityTypeStats {
  totalActivityTypes: number;
  activeActivityTypes: number;
  newThisMonth: number;
}
