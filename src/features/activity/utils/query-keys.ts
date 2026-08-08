import type { PagedFilter } from "../types/activity-types";

export interface ActivityListQueryKeyParams {
  filters?: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic: "and" | "or";
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
}

export const activityQueryKeys = {
  all: () => ["activity"] as const,
  lists: () => [...activityQueryKeys.all(), "list"] as const,
  list: (params: ActivityListQueryKeyParams) => [...activityQueryKeys.lists(), params] as const,
  detail: (id: number | undefined) => [...activityQueryKeys.all(), "detail", id] as const,
  customerActivities: (customerId: number | undefined) =>
    [...activityQueryKeys.all(), "customer-activities", customerId] as const,
  images: (activityId: number | undefined) =>
    [...activityQueryKeys.all(), "images", activityId] as const,
  paymentTypes: () => [...activityQueryKeys.all(), "payment-types"] as const,
  meetingTypes: () => [...activityQueryKeys.all(), "meeting-types"] as const,
  topicPurposes: () => [...activityQueryKeys.all(), "topic-purposes"] as const,
  shippings: () => [...activityQueryKeys.all(), "shippings"] as const,
};

export const activityTypeQueryKeys = {
  list: () => ["activityType", "list"] as const,
};

export const activityRelatedQueryKeys = {
  customer360: () => ["customer360"] as const,
};
