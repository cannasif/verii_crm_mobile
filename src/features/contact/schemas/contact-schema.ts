import { z } from "zod";
import i18n from "../../../locales";

export const createContactSchema = () =>
  z.object({
    salutation: z.number().min(0).max(4),
    firstName: z.string().min(1, i18n.t("validation.nameRequired")).max(100),
    middleName: z.string().max(100).optional().or(z.literal("")),
    lastName: z.string().min(1, i18n.t("validation.fullNameRequired")).max(100),
    fullName: z.string().max(250).optional().or(z.literal("")),
    email: z
      .string()
      .email(i18n.t("validation.invalidEmail"))
      .max(100)
      .optional()
      .or(z.literal("")),
    phone: z.string().max(20).optional().or(z.literal("")),
    mobile: z.string().max(20).optional().or(z.literal("")),
    notes: z.string().max(250).optional().or(z.literal("")),
    customerId: z.number().min(1, i18n.t("validation.customerRequired")),
    titleId: z.number().nullable().optional(),
  });

export const contactSchema = createContactSchema();

export type ContactFormData = z.infer<ReturnType<typeof createContactSchema>>;
