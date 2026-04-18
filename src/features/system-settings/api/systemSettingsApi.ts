import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";

export interface SystemSettingsDto {
  numberFormat: string;
  decimalPlaces: number;
  restrictCustomersBySalesRepMatch: boolean;
  updatedAt?: string;
}

export async function getSystemSettings(): Promise<SystemSettingsDto> {
  const response = await apiClient.get<ApiResponse<SystemSettingsDto>>("/api/SystemSettings");
  if (response.data.success && response.data.data) {
    return response.data.data;
  }

  throw new Error(response.data.message || "System settings could not be loaded.");
}
