import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";

export interface SystemSettingsDto {
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
  demandApprovalCompletionAction: number;
  quotationApprovalCompletionAction: number;
  orderApprovalCompletionAction: number;
  hideDemandVatRate?: boolean;
  hideQuotationVatRate?: boolean;
  hideOrderVatRate?: boolean;
  readonlyDemandVatRate?: boolean;
  readonlyQuotationVatRate?: boolean;
  readonlyOrderVatRate?: boolean;
  useCustomerCodeAsAccountingCode?: boolean;
  catalogGroupCodeLabel?: string | null;
  catalogCode1Label?: string | null;
  catalogCode2Label?: string | null;
  catalogCode3Label?: string | null;
  catalogCode4Label?: string | null;
  catalogCode5Label?: string | null;
  updatedAt?: string;
}

export async function getSystemSettings(): Promise<SystemSettingsDto> {
  const response = await apiClient.get<ApiResponse<SystemSettingsDto>>("/api/SystemSettings");
  if (response.data.success && response.data.data) {
    return response.data.data;
  }

  throw new Error(response.data.message || "System settings could not be loaded.");
}
