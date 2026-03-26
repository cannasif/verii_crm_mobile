import type { ApiResponse } from "../../auth/types";

export interface PagedFilter {
  column: string;
  operator: string;
  value: string;
}

export interface PagedParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filters?: PagedFilter[];
  filterLogic?: "and" | "or";
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type PagedApiResponse<T> = ApiResponse<PagedResponse<T>>;

export interface ActivityTypeRef {
  id: number;
  name: string;
  description?: string;
  createdDate?: string;
  updatedDate?: string;
  isDeleted?: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
}

export interface ActivityTypeDto {
  id: number;
  name: string;
  description?: string;
  createdDate: string;
  updatedDate?: string;
  createdBy?: string;
  createdByFullName?: string;
  createdByFullUser?: string;
}

export interface ActivityLookupDto {
  id: number;
  name: string;
  createdDate?: string;
  updatedDate?: string;
}

export const ReminderChannel = {
  InApp: 0,
  Email: 1,
  Sms: 2,
  Push: 3,
} as const;

export type ReminderChannel = (typeof ReminderChannel)[keyof typeof ReminderChannel];

export const ReminderStatus = {
  Pending: 0,
  Sent: 1,
  Failed: 2,
  Cancelled: 3,
} as const;

export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus] | string;

export interface ActivityReminderDto {
  id: number;
  activityId: number;
  offsetMinutes: number;
  channel: ReminderChannel;
  sentAt?: string;
  status: ReminderStatus;
  createdDate: string;
  isDeleted: boolean;
}

export interface ActivityImageDto {
  id: number;
  activityId: number;
  imageUrl: string;
  imageDescription?: string;
  createdDate?: string;
}

export interface CreateActivityReminderDto {
  offsetMinutes: number;
  channel: ReminderChannel;
}

export interface PotentialCustomerDto {
  id: number;
  name: string;
  customerCode?: string;
}

export interface ContactDto {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export interface AssignedUserDto {
  id: number;
  fullName?: string;
  userName?: string;
}

export const ActivityStatus = {
  Scheduled: 0,
  Completed: 1,
  Cancelled: 2,
} as const;

export type ActivityStatusEnum = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const ActivityPriority = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const;

export type ActivityPriorityEnum = (typeof ActivityPriority)[keyof typeof ActivityPriority];

export interface ActivityDto {
  id: number;
  subject: string;
  description?: string;
  activityTypeId?: number;
  activityTypeName?: string;
  activityType: ActivityTypeRef | ActivityTypeDto | string | null;
  paymentTypeId?: number | null;
  paymentTypeName?: string | null;
  activityMeetingTypeId?: number | null;
  activityMeetingTypeName?: string | null;
  activityTopicPurposeId?: number | null;
  activityTopicPurposeName?: string | null;
  activityShippingId?: number | null;
  activityShippingName?: string | null;
  startDateTime: string;
  endDateTime?: string;
  isAllDay?: boolean;
  status: ActivityStatusEnum | ActivityStatusText | number | string;
  priority?: ActivityPriorityEnum | ActivityPriorityText | number | string;
  assignedUserId?: number;
  assignedUser?: AssignedUserDto;
  contactId?: number;
  contactName?: string;
  contact?: ContactDto;
  potentialCustomerId?: number;
  potentialCustomerName?: string;
  potentialCustomer?: PotentialCustomerDto;
  erpCustomerCode?: string;
  googleCalendarEventId?: string;
  reminders?: ActivityReminderDto[];
  activityDate?: string;
  isCompleted?: boolean;
  createdDate: string;
  updatedDate?: string;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  productCode?: string;
  productName?: string;
}

export interface CreateActivityDto {
  subject: string;
  description?: string;
  activityTypeId: number;
  activityTypeName?: string;
  startDateTime: string;
  endDateTime: string;
  isAllDay: boolean;
  status: ActivityStatusEnum | number;
  priority: ActivityPriorityEnum | number;
  assignedUserId: number;
  paymentTypeId?: number | null;
  activityMeetingTypeId?: number | null;
  activityTopicPurposeId?: number | null;
  activityShippingId?: number | null;
  contactName?: string;
  contactId?: number;
  potentialCustomerName?: string;
  potentialCustomerId?: number;
  erpCustomerCode?: string;
  reminders: CreateActivityReminderDto[];
}

export interface UpdateActivityDto {
  subject: string;
  description?: string;
  activityTypeId: number;
  activityTypeName?: string;
  startDateTime: string;
  endDateTime: string;
  isAllDay: boolean;
  status: ActivityStatusEnum | number;
  priority: ActivityPriorityEnum | number;
  assignedUserId: number;
  paymentTypeId?: number | null;
  activityMeetingTypeId?: number | null;
  activityTopicPurposeId?: number | null;
  activityShippingId?: number | null;
  contactName?: string;
  contactId?: number;
  potentialCustomerName?: string;
  potentialCustomerId?: number;
  erpCustomerCode?: string;
  reminders: CreateActivityReminderDto[];
}

export type ActivityStatusText = "Scheduled" | "Completed" | "Cancelled";

export type ActivityPriorityText = "Low" | "Medium" | "High";

export const ACTIVITY_STATUSES: { value: ActivityStatusText; labelKey: string; numeric: ActivityStatusEnum }[] = [
  { value: "Scheduled", labelKey: "activity.statusScheduled", numeric: 0 },
  { value: "Completed", labelKey: "activity.statusCompleted", numeric: 1 },
  { value: "Cancelled", labelKey: "activity.statusCancelled", numeric: 2 },
];

export const ACTIVITY_PRIORITIES: { value: ActivityPriorityText; labelKey: string; numeric: ActivityPriorityEnum }[] = [
  { value: "Low", labelKey: "activity.priorityLow", numeric: 0 },
  { value: "Medium", labelKey: "activity.priorityMedium", numeric: 1 },
  { value: "High", labelKey: "activity.priorityHigh", numeric: 2 },
];

export const ACTIVITY_STATUS_NUMERIC: Record<number, ActivityStatusText> = {
  0: "Scheduled",
  1: "Completed",
  2: "Cancelled",
};

export const ACTIVITY_PRIORITY_NUMERIC: Record<number, ActivityPriorityText> = {
  0: "Low",
  1: "Medium",
  2: "High",
};
