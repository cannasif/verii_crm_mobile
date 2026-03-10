import { apiClient } from "../../../lib/axios";
import type {
  GoogleIntegrationStatusDto,
  GoogleIntegrationStatusResponse,
  IntegrationAuthorizeUrlDto,
  IntegrationAuthorizeUrlResponse,
  IntegrationDisconnectResponse,
  OutlookIntegrationStatusDto,
  OutlookIntegrationStatusResponse,
} from "../types";

function getErrorMessage(response: { message?: string; exceptionMessage?: string }, fallback: string): string {
  return response.message || response.exceptionMessage || fallback;
}

export const integrationApi = {
  getGoogleStatus: async (): Promise<GoogleIntegrationStatusDto> => {
    const response = await apiClient.get<GoogleIntegrationStatusResponse>("/api/integrations/google/status");
    if (!response.data.success) {
      throw new Error(getErrorMessage(response.data, "Google entegre durum bilgisi alınamadı."));
    }

    return response.data.data;
  },

  getOutlookStatus: async (): Promise<OutlookIntegrationStatusDto> => {
    const response = await apiClient.get<OutlookIntegrationStatusResponse>("/api/integrations/outlook/status");
    if (!response.data.success) {
      throw new Error(getErrorMessage(response.data, "Outlook entegre durum bilgisi alınamadı."));
    }

    return response.data.data;
  },

  getGoogleAuthorizeUrl: async (): Promise<IntegrationAuthorizeUrlDto> => {
    const response = await apiClient.get<IntegrationAuthorizeUrlResponse>("/api/integrations/google/authorize-url");
    if (!response.data.success) {
      throw new Error(getErrorMessage(response.data, "Google bağlantı URL'i alınamadı."));
    }

    return response.data.data;
  },

  getOutlookAuthorizeUrl: async (): Promise<IntegrationAuthorizeUrlDto> => {
    const response = await apiClient.get<IntegrationAuthorizeUrlResponse>("/api/integrations/outlook/authorize-url");
    if (!response.data.success) {
      throw new Error(getErrorMessage(response.data, "Outlook bağlantı URL'i alınamadı."));
    }

    return response.data.data;
  },

  disconnectGoogle: async (): Promise<void> => {
    const response = await apiClient.post<IntegrationDisconnectResponse>("/api/integrations/google/disconnect");
    if (!response.data.success) {
      throw new Error(getErrorMessage(response.data, "Google bağlantısı kaldırılamadı."));
    }
  },

  disconnectOutlook: async (): Promise<void> => {
    const response = await apiClient.post<IntegrationDisconnectResponse>("/api/integrations/outlook/disconnect");
    if (!response.data.success) {
      throw new Error(getErrorMessage(response.data, "Outlook bağlantısı kaldırılamadı."));
    }
  },
};
