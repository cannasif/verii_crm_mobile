import type { ApiResponse } from "../../auth/types/auth-types";
import type { PagedResponse } from "../../customer/types/common";

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

export interface SendCustomerMailDto {
  customerId: number;
  contactId?: number;
  to?: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  isHtml: boolean;
  templateKey?: string;
  templateName?: string;
  templateVersion?: string;
}

export interface GoogleCustomerMailSendResultDto {
  logId: number;
  isSuccess: boolean;
  googleMessageId?: string | null;
  googleThreadId?: string | null;
  sentAt?: string | null;
}

export interface OutlookCustomerMailSendResultDto {
  logId?: number | null;
  isSuccess: boolean;
  messageId?: string | null;
  conversationId?: string | null;
  sentAt?: string | null;
}

export interface CustomerMailLogDto {
  id: number;
  customerId: number;
  customerName?: string | null;
  contactId?: number | null;
  contactName?: string | null;
  sentByUserId: number;
  sentByUserName?: string | null;
  provider: string;
  senderEmail?: string | null;
  toEmails: string;
  ccEmails?: string | null;
  bccEmails?: string | null;
  subject: string;
  body?: string | null;
  bodyPreview?: string | null;
  isHtml: boolean;
  templateKey?: string | null;
  templateName?: string | null;
  templateVersion?: string | null;
  isSuccess: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  createdDate: string;
}

export type GoogleIntegrationStatusResponse = ApiResponse<GoogleIntegrationStatusDto>;
export type OutlookIntegrationStatusResponse = ApiResponse<OutlookIntegrationStatusDto>;
export type IntegrationAuthorizeUrlResponse = ApiResponse<IntegrationAuthorizeUrlDto>;
export type IntegrationDisconnectResponse = ApiResponse<boolean>;
export type GoogleCustomerMailSendResponse = ApiResponse<GoogleCustomerMailSendResultDto>;
export type OutlookCustomerMailSendResponse = ApiResponse<OutlookCustomerMailSendResultDto>;
export type GoogleCustomerMailLogsResponse = ApiResponse<PagedResponse<CustomerMailLogDto>>;
export type OutlookCustomerMailLogsResponse = ApiResponse<PagedResponse<CustomerMailLogDto>>;
