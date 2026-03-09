import { z } from "zod";
import i18n from "../../../locales";

export const createLoginSchema = () =>
  z.object({
    branchId: z.string().min(1, i18n.t("validation.branchRequired")),
    email: z
      .string()
      .min(1, i18n.t("validation.emailRequired"))
      .email(i18n.t("validation.invalidEmail")),
    password: z.string().min(1, i18n.t("validation.passwordRequired")),
    rememberMe: z.boolean().default(true),
  });

export const loginSchema = createLoginSchema();

export type LoginFormData = z.infer<typeof loginSchema>;

export const createForgotPasswordSchema = () =>
  z.object({
    email: z
      .string()
      .min(1, i18n.t("validation.emailRequired"))
      .email(i18n.t("validation.invalidEmail")),
  });

export const forgotPasswordSchema = createForgotPasswordSchema();

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const createResetPasswordSchema = () =>
  z
    .object({
      token: z.string().min(1, i18n.t("validation.tokenRequired")),
      newPassword: z
        .string()
        .min(6, i18n.t("validation.newPasswordMinLength"))
        .max(100, i18n.t("validation.newPasswordMaxLength")),
      confirmPassword: z.string().min(1, i18n.t("validation.confirmPasswordRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: i18n.t("validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });

export const resetPasswordSchema = createResetPasswordSchema();

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const createChangePasswordSchema = () =>
  z
    .object({
      currentPassword: z.string().min(1, i18n.t("validation.currentPasswordRequired")),
      newPassword: z
        .string()
        .min(6, i18n.t("validation.newPasswordMinLength"))
        .max(100, i18n.t("validation.newPasswordMaxLength")),
      confirmPassword: z.string().min(1, i18n.t("validation.confirmPasswordRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: i18n.t("validation.passwordsMismatch"),
      path: ["confirmPassword"],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: i18n.t("validation.newPasswordSameAsCurrent"),
      path: ["newPassword"],
    });

export const changePasswordSchema = createChangePasswordSchema();

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
