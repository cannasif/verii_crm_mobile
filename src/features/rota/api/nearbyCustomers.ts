import { apiClient } from "../../../lib/axios";
import type { AxiosError } from "axios";
import type { ApiResponse } from "../../auth/types/auth-types";
import type { CustomerLocationDto } from "../types";

interface NearbyCustomersParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  includeShippingAddresses?: boolean;
  filters?: string;
  filterLogic?: "and" | "or";
}

function toErrorMessage(message: string, fallback: string): Error {
  const safe = message.trim();
  return new Error(safe.length > 0 ? safe : fallback);
}

async function requestNearbyCustomers(
  path: "/api/Customer/nearby" | "/api/Rota/customers",
  params: NearbyCustomersParams
): Promise<CustomerLocationDto[]> {
  const response = await apiClient.get<ApiResponse<CustomerLocationDto[]>>(path, { params });
  if (!response.data.success) {
    const msg =
      [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
      "Yakındaki müşteriler alınamadı";
    throw toErrorMessage(msg, "Yakındaki müşteriler alınamadı");
  }
  return response.data.data ?? [];
}

export async function fetchNearbyCustomers(params: NearbyCustomersParams): Promise<CustomerLocationDto[]> {
  try {
    return await requestNearbyCustomers("/api/Customer/nearby", params);
  } catch (error) {
    const status = (error as AxiosError | undefined)?.response?.status;
    if (status === 404) {
      return requestNearbyCustomers("/api/Rota/customers", params);
    }
    throw error;
  }
}
