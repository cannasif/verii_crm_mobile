import { z } from "zod";
import i18n from "../../../locales";

export const createActivitySchema = () =>
  z.object({
    subject: z.string().min(1, i18n.t("validation.subjectRequired")).max(100),
    description: z.string().max(2000).optional(),
    activityType: z.string().min(1, i18n.t("validation.activityTypeRequired")),
    activityTypeId: z.number().optional().nullable(),
    potentialCustomerId: z.number().optional().nullable(),
    erpCustomerCode: z.string().optional().nullable(),
    productCode: z.string().optional().nullable(),
    productName: z.string().optional().nullable(),
    status: z.string().min(1, i18n.t("validation.statusRequired")),
    isCompleted: z.boolean(),
    priority: z.string().optional().nullable(),
    paymentTypeId: z.number().optional().nullable(),
    activityMeetingTypeId: z.number().optional().nullable(),
    activityTopicPurposeId: z.number().optional().nullable(),
    activityShippingId: z.number().optional().nullable(),
    contactId: z.number().optional().nullable(),
    assignedUserId: z.number().optional().nullable(),
    startDateTime: z.string().min(1, i18n.t("validation.dateRequired")),
    endDateTime: z.string().min(1, i18n.t("validation.endDateRequired")),
    isAllDay: z.boolean(),
    reminders: z.array(z.number().int().min(1)).optional(),
  });

export const activitySchema = createActivitySchema();

export type ActivityFormData = z.infer<typeof activitySchema>;
