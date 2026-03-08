import { apiClient } from "../../../lib/axios";
import { API_BASE_URL } from "../../../constants/config";
import type {
  AuthUserProfile,
  AuthUserProfileResponse,
  ChangePasswordPayload,
  ChangePasswordResponse,
  UserDetailProfile,
  UserDetailProfileResponse,
} from "../types";

function toAbsoluteImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
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
      const detail = response.data.data;
      return {
        ...detail,
        profilePictureUrl: toAbsoluteImageUrl(detail.profilePictureUrl),
      };
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
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
    } as any);

    const response = await apiClient.post<UserDetailProfileResponse>(
      `/api/UserDetail/users/${userId}/profile-picture`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Profil resmi yüklenemedi");
    }

    const detail = response.data.data;
    return {
      ...detail,
      profilePictureUrl: toAbsoluteImageUrl(detail.profilePictureUrl),
    };
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    const response = await apiClient.post<ChangePasswordResponse>("/api/auth/change-password", payload);
    if (!response.data.success) {
      throw new Error(response.data.message || "Şifre değiştirilemedi");
    }
  },
};
