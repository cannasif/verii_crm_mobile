import { z } from "zod";
import i18n from "../../../locales";
import { Gender } from "../types";

export interface UserDetailFormData {
  height: string;
  weight: string;
  gender: string;
  phoneNumber: string;
  email: string;
  linkedinUrl: string;
  description: string;
}

export interface ParsedUserDetailFormData {
  height?: number;
  weight?: number;
  gender?: (typeof Gender)[keyof typeof Gender];
  phoneNumber?: string;
  email?: string;
  linkedinUrl?: string;
  description?: string;
}

function parseOptionalNumber(value: string, min: number, max: number, message: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new Error(message);
  }
  return numeric;
}

function parseOptionalText(value: string, max: number, message: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) {
    throw new Error(message);
  }
  return trimmed;
}

export function parseUserDetailForm(values: UserDetailFormData): ParsedUserDetailFormData {
  const email = values.email.trim();
  if (email && !z.string().email().safeParse(email).success) {
    throw new Error(i18n.t("profileDetail.invalidEmail"));
  }

  const linkedinUrl = values.linkedinUrl.trim();
  if (linkedinUrl && !z.string().url().safeParse(linkedinUrl).success) {
    throw new Error(i18n.t("profileDetail.invalidUrl"));
  }

  const genderValue = values.gender.trim();
  let gender: ParsedUserDetailFormData["gender"];
  if (genderValue) {
    gender = Number(genderValue) as ParsedUserDetailFormData["gender"];
  }

  return {
    height: parseOptionalNumber(values.height, 0, 300, i18n.t("profileDetail.heightRange")),
    weight: parseOptionalNumber(values.weight, 0, 500, i18n.t("profileDetail.weightRange")),
    gender,
    phoneNumber: parseOptionalText(values.phoneNumber, 20, i18n.t("profileDetail.phoneMax")),
    email: email || undefined,
    linkedinUrl: linkedinUrl || undefined,
    description: parseOptionalText(values.description, 2000, i18n.t("profileDetail.descriptionMax")),
  };
}

export const createUserDetailSchema = () =>
  z.object({
    height: z.string(),
    weight: z.string(),
    gender: z.string(),
    phoneNumber: z.string(),
    email: z.string(),
    linkedinUrl: z.string(),
    description: z.string(),
  });
