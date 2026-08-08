import { z } from "zod";
import i18n from "../../../locales";

export const createTitleSchema = () =>
  z.object({
    titleName: z
      .string()
      .min(1, i18n.t("validation.required"))
      .max(100, i18n.t("validation.maxLength", { count: 100 })),
    code: z.string().max(10, i18n.t("validation.maxLength", { count: 10 })).optional().or(z.literal("")),
  });

export const titleSchema = createTitleSchema();

export type TitleFormData = z.infer<typeof titleSchema>;
