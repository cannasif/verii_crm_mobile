import { apiClient } from "../../../lib/axios";
import type {
  ApiResponse,
  VisibilityActionSimulationResult,
  VisibilityPreviewResult,
} from "../../auth/types";

export const visibilitySimulatorApi = {
  preview: async (userId: number, entityType: string): Promise<VisibilityPreviewResult> => {
    const response = await apiClient.get<ApiResponse<VisibilityPreviewResult>>(
      `/api/visibility-policies/preview?userId=${userId}&entityType=${encodeURIComponent(entityType)}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Visibility preview could not be loaded.");
    }
    return response.data.data;
  },

  simulate: async (userId: number, entityType: string, entityId: number): Promise<VisibilityActionSimulationResult> => {
    const response = await apiClient.get<ApiResponse<VisibilityActionSimulationResult>>(
      `/api/visibility-policies/simulate?userId=${userId}&entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Visibility action simulation could not be loaded.");
    }
    return response.data.data;
  },
};
