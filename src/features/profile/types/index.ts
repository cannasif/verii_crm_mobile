import type { ApiResponse } from "../../auth/types";

export const Gender = {
  NotSpecified: 0,
  Male: 1,
  Female: 2,
  Other: 3,
} as const;

export type GenderValue = (typeof Gender)[keyof typeof Gender];

export interface AuthUserProfile {
  id: number;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  fullName?: string | null;
}

export interface UserDetailProfile {
  id: number;
  userId: number;
  profilePictureUrl?: string | null;
  height?: number | null;
  weight?: number | null;
  description?: string | null;
  gender?: GenderValue | null;
  linkedinUrl?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  createdDate?: string;
  updatedDate?: string | null;
  isDeleted?: boolean;
}

export interface CreateUserDetailPayload {
  userId: number;
  profilePictureUrl?: string;
  height?: number;
  weight?: number;
  description?: string;
  gender?: GenderValue;
  linkedinUrl?: string;
  phoneNumber?: string;
  email?: string;
}

export interface UpdateUserDetailPayload {
  profilePictureUrl?: string;
  height?: number;
  weight?: number;
  description?: string;
  gender?: GenderValue;
  linkedinUrl?: string;
  phoneNumber?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export type AuthUserProfileResponse = ApiResponse<AuthUserProfile>;
export type UserDetailProfileResponse = ApiResponse<UserDetailProfile>;
export type ChangePasswordResponse = ApiResponse<string>;
