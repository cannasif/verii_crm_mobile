import { apiClient } from "../../../lib/axios";
import type { ApiResponse, AppBootstrapDto, MyPermissionsDto } from "../../auth/types";

export const authAccessApi = {
  getMyPermissions: async (): Promise<MyPermissionsDto> => {
    const response = await apiClient.get<ApiResponse<MyPermissionsDto>>("/api/auth/me/permissions");
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Permissions could not be loaded.");
    }
    return response.data.data;
  },

  getBootstrap: async (): Promise<AppBootstrapDto> => {
    const response = await apiClient.get<ApiResponse<AppBootstrapDto>>("/api/auth/bootstrap");
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Bootstrap could not be loaded.");
    }
    return response.data.data;
  },
};
