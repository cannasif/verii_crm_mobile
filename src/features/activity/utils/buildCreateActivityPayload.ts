import type {
  CreateActivityDto,
  UpdateActivityDto,
  ActivityTypeDto,
  ActivityTypeRef,
  CreateActivityReminderDto,
} from "../types";
import i18n from "../../../locales";

export interface ActivityFormLike {
  subject: string;
  description?: string | null;
  activityType?: string | null;
  activityTypeId?: number | null;
  activityTypeName?: string | null;
  isCompleted?: boolean;
  activityDate?: string;
  startDateTime?: string;
  endDateTime?: string | null;
  isAllDay?: boolean;
  status: string;
  priority?: string | null;
  assignedUserId?: number | null;
  paymentTypeId?: number | null;
  activityMeetingTypeId?: number | null;
  activityTopicPurposeId?: number | null;
  activityShippingId?: number | null;
  contactId?: number | null;
  contactName?: string | null;
  potentialCustomerId?: number | null;
  potentialCustomerName?: string | null;
  erpCustomerCode?: string | null;
  reminders?: CreateActivityReminderDto[];
}

export interface BuildCreateActivityPayloadOptions {
  activityTypes: (ActivityTypeDto | ActivityTypeRef)[];
  assignedUserIdFallback?: number;
}

function resolveActivityTypeId(
  data: Pick<ActivityFormLike, "activityType" | "activityTypeId">,
  activityTypes: (ActivityTypeDto | ActivityTypeRef)[]
): number {
  if (typeof data.activityTypeId === "number" && data.activityTypeId > 0) {
    return data.activityTypeId;
  }

  const activityTypeValue = String(data.activityType ?? "").trim();
  if (!activityTypeValue) {
    throw new Error(i18n.t("validation.activityTypeRequired"));
  }

  const numericValue = Number(activityTypeValue);
  if (Number.isInteger(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const found = activityTypes.find(
    (type) => type.name.trim().toLowerCase() === activityTypeValue.toLowerCase()
  );

  if (!found?.id) {
    throw new Error(i18n.t("validation.activityTypeRequired"));
  }

  return found.id;
}

function statusToNumeric(status: string): number {
  const s = status.toLowerCase().replace(/\s+/g, "");
  if (s === "completed") return 1;
  if (s === "cancelled" || s === "canceled") return 2;
  return 0;
}

function priorityToNumeric(priority: string | null | undefined): number {
  if (!priority) return 1;
  const p = priority.toLowerCase();
  if (p === "low") return 0;
  if (p === "high") return 2;
  return 1;
}

export function buildCreateActivityPayload(
  data: ActivityFormLike,
  options: BuildCreateActivityPayloadOptions
): CreateActivityDto {
  const { activityTypes, assignedUserIdFallback } = options;
  const activityTypeId = resolveActivityTypeId(data, activityTypes);
  const startDateTime =
    data.startDateTime ?? (data.activityDate ? new Date(data.activityDate).toISOString() : new Date().toISOString());
  const parsedStart = new Date(startDateTime);
  const fallbackEndDateTime = Number.isNaN(parsedStart.getTime())
    ? new Date().toISOString()
    : new Date(parsedStart.getTime() + 60 * 60 * 1000).toISOString();
  const endDateTime = data.endDateTime ?? fallbackEndDateTime;
  const assignedUserId = data.assignedUserId ?? assignedUserIdFallback ?? 0;

  if (assignedUserId <= 0) {
    throw new Error(i18n.t("validation.assignedUserRequired"));
  }

  if (Number.isNaN(new Date(endDateTime).getTime())) {
    throw new Error(i18n.t("validation.endDateRequired"));
  }

  return {
    subject: data.subject,
    description: data.description ?? undefined,
    activityTypeId,
    activityTypeName: data.activityTypeName ?? data.activityType ?? undefined,
    startDateTime,
    endDateTime,
    isAllDay: data.isAllDay ?? false,
    status: statusToNumeric(data.status),
    priority: priorityToNumeric(data.priority),
    assignedUserId,
    paymentTypeId: data.paymentTypeId ?? undefined,
    activityMeetingTypeId: data.activityMeetingTypeId ?? undefined,
    activityTopicPurposeId: data.activityTopicPurposeId ?? undefined,
    activityShippingId: data.activityShippingId ?? undefined,
    contactName: data.contactName ?? undefined,
    contactId: data.contactId ?? undefined,
    potentialCustomerName: data.potentialCustomerName ?? undefined,
    potentialCustomerId: data.potentialCustomerId ?? undefined,
    erpCustomerCode: data.erpCustomerCode ?? undefined,
    reminders: data.reminders ?? [],
  };
}

export function buildUpdateActivityPayload(
  data: ActivityFormLike,
  options: BuildCreateActivityPayloadOptions & { existingAssignedUserId?: number }
): UpdateActivityDto {
  const base = buildCreateActivityPayload(data, options);
  const assignedUserId =
    base.assignedUserId ||
    (options.assignedUserIdFallback ?? options.existingAssignedUserId ?? 0);
  return { ...base, assignedUserId };
}
