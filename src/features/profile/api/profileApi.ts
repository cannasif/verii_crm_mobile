import { apiClient } from "../../../lib/axios";
import { getApiBaseUrl } from "../../../constants/config";
import type {
  AuthUserProfile,
  AuthUserProfileResponse,
  ChangePasswordPayload,
  ChangePasswordResponse,
  CreateUserDetailPayload,
  UpdateUserDetailPayload,
  UserDetailProfile,
  UserDetailProfileResponse,
} from "../types";

function toAbsoluteImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}

function mapUserDetail(detail: UserDetailProfile): UserDetailProfile {
  return {
    ...detail,
    profilePictureUrl: toAbsoluteImageUrl(detail.profilePictureUrl),
  };
}

export const profileApi = {
  getMyProfile: async (): Promise<AuthUserProfile> => {
    const response = await apiClient.get<AuthUserProfileResponse>("/api/auth/user");
    if (!response.data.success) {
      throw new Error(response.data.message || "Profil bilgileri alınamadı");
    }
    return response.data.data;
  },

  getUserDetailByUserId: async (userId: number): Promise<UserDetailProfile | null> => {
    try {
      const response = await apiClient.get<UserDetailProfileResponse>(`/api/UserDetail/user/${userId}`);
      if (!response.data.success) return null;
      return mapUserDetail(response.data.data);
    } catch (error: unknown) {
      const status = typeof error === "object" && error != null && "status" in error
        ? (error as { status?: number }).status
        : undefined;
      if (status === 404) {
        return null;
      }
      throw error;
    }
  },

  createUserDetail: async (payload: CreateUserDetailPayload): Promise<UserDetailProfile> => {
    const response = await apiClient.post<UserDetailProfileResponse>("/api/UserDetail", payload);
    if (!response.data.success) {
      throw new Error(response.data.message || "Profil detayı oluşturulamadı");
    }
    return mapUserDetail(response.data.data);
  },

  updateUserDetail: async (
    userDetailId: number,
    payload: UpdateUserDetailPayload,
  ): Promise<UserDetailProfile> => {
    const response = await apiClient.put<UserDetailProfileResponse>(
      `/api/UserDetail/${userDetailId}`,
      payload,
    );
    if (!response.data.success) {
      throw new Error(response.data.message || "Profil detayı güncellenemedi");
    }
    return mapUserDetail(response.data.data);
  },

  uploadProfilePicture: async (userId: number, localUri: string): Promise<UserDetailProfile> => {
    const fileName = localUri.split("/").pop() || `profile-${Date.now()}.jpg`;
    const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "jpg";
    const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    const formData = new FormData();
    formData.append("file", {
      uri: localUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    const response = await apiClient.post<UserDetailProfileResponse>(
      `/api/UserDetail/users/${userId}/profile-picture`,
      formData,
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Profil resmi yüklenemedi");
    }

    return mapUserDetail(response.data.data);
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    const response = await apiClient.post<ChangePasswordResponse>("/api/auth/change-password", payload);
    if (!response.data.success) {
      throw new Error(response.data.message || "Şifre değiştirilemedi");
    }
  },
};
