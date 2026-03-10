import type { ApiResponse } from "../../auth/types";

export interface GoogleIntegrationStatusDto {
  isConnected: boolean;
  isOAuthConfigured: boolean;
  googleEmail?: string | null;
  scopes?: string | null;
  expiresAt?: string | null;
}

export interface OutlookIntegrationStatusDto {
  isConnected: boolean;
  isOAuthConfigured: boolean;
  outlookEmail?: string | null;
  scopes?: string | null;
  expiresAt?: string | null;
}

export interface IntegrationAuthorizeUrlDto {
  url: string;
}

export type GoogleIntegrationStatusResponse = ApiResponse<GoogleIntegrationStatusDto>;
export type OutlookIntegrationStatusResponse = ApiResponse<OutlookIntegrationStatusDto>;
export type IntegrationAuthorizeUrlResponse = ApiResponse<IntegrationAuthorizeUrlDto>;
export type IntegrationDisconnectResponse = ApiResponse<boolean>;
