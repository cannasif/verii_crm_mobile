import { apiClient } from "../../../lib/axios";
import type {
  CustomerMailLogDto,
  GoogleIntegrationStatusDto,
  GoogleCustomerMailLogsResponse,
  GoogleCustomerMailSendResponse,
  GoogleCustomerMailSendResultDto,
  GoogleIntegrationStatusResponse,
  IntegrationAuthorizeUrlDto,
  IntegrationAuthorizeUrlResponse,
  IntegrationDisconnectResponse,
  OutlookIntegrationStatusDto,
  OutlookCustomerMailLogsResponse,
  OutlookCustomerMailSendResponse,
  OutlookCustomerMailSendResultDto,
  OutlookIntegrationStatusResponse,
  SendCustomerMailDto,
} from "../types/integration-types";
import type { PagedResponse } from "../../customer/types/common";

function getErrorMessage(response: { message?: string; exceptionMessage?: string }, fallback: string): string {
  return response.message || response.exceptionMessage || fallback;
}

interface CustomerMailLogQueryParams {
  customerId: number;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  errorsOnly?: boolean;
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

  sendGoogleCustomerMail: async (payload: SendCustomerMailDto): Promise<GoogleCustomerMailSendResultDto> => {
    const response = await apiClient.post<GoogleCustomerMailSendResponse>("/api/customer-mail/google/send", payload);
    if (!response.data.success) {
      throw new Error(getErrorMessage(response.data, "Google ile mail gönderilemedi."));
    }

    return response.data.data;
  },

  sendOutlookCustomerMail: async (payload: SendCustomerMailDto): Promise<OutlookCustomerMailSendResultDto> => {
    const response = await apiClient.post<OutlookCustomerMailSendResponse>("/api/customer-mail/outlook/send", payload);
    if (!response.data.success) {
      throw new Error(getErrorMessage(response.data, "Outlook ile mail gönderilemedi."));
    }

    return response.data.data;
  },

  getGoogleCustomerMailLogs: async (params: CustomerMailLogQueryParams): Promise<PagedResponse<CustomerMailLogDto>> => {
    const response = await apiClient.get<GoogleCustomerMailLogsResponse>("/api/customer-mail/google/logs", { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(getErrorMessage(response.data, "Google mail logları alınamadı."));
    }

    return response.data.data;
  },

  getOutlookCustomerMailLogs: async (params: CustomerMailLogQueryParams): Promise<PagedResponse<CustomerMailLogDto>> => {
    const response = await apiClient.get<OutlookCustomerMailLogsResponse>("/api/customer-mail/outlook/logs", { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(getErrorMessage(response.data, "Outlook mail logları alınamadı."));
    }

    return response.data.data;
  },
};
