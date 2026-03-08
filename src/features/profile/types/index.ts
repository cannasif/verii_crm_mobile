import type { ApiResponse } from "../../auth/types";

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
  description?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export type AuthUserProfileResponse = ApiResponse<AuthUserProfile>;
export type UserDetailProfileResponse = ApiResponse<UserDetailProfile>;
export type ChangePasswordResponse = ApiResponse<string>;
