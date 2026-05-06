import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type {
  ShippingAddressDto,
  CreateShippingAddressDto,
  UpdateShippingAddressDto,
  PagedParams,
  PagedResponse,
  PagedApiResponse,
} from "../types";

export const shippingAddressApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<ShippingAddressDto>> => {
    const response = await apiClient.post<PagedApiResponse<ShippingAddressDto>>(
      "/api/ShippingAddress/query",
      {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search ?? "",
        sortBy: params.sortBy ?? "Id",
        sortDirection: params.sortDirection ?? "asc",
        filterLogic: params.filterLogic ?? "and",
        filters: params.filters ?? [],
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Sevk adresi listesi alınamadı"
      );
    }

    return response.data.data;
  },

  getById: async (id: number): Promise<ShippingAddressDto> => {
    const response = await apiClient.get<ApiResponse<ShippingAddressDto>>(
      `/api/ShippingAddress/${id}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Sevk adresi bulunamadı"
      );
    }

    return response.data.data;
  },

  getByCustomerId: async (customerId: number): Promise<ShippingAddressDto[]> => {
    const response = await apiClient.get<ApiResponse<ShippingAddressDto[]>>(
      `/api/ShippingAddress/customer/${customerId}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Sevk adresleri alınamadı"
      );
    }

    return response.data.data;
  },

  create: async (data: CreateShippingAddressDto): Promise<ShippingAddressDto> => {
    const response = await apiClient.post<ApiResponse<ShippingAddressDto>>(
      "/api/ShippingAddress",
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Sevk adresi oluşturulamadı"
      );
    }

    return response.data.data;
  },

  update: async (id: number, data: UpdateShippingAddressDto): Promise<ShippingAddressDto> => {
    const response = await apiClient.put<ApiResponse<ShippingAddressDto>>(
      `/api/ShippingAddress/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Sevk adresi güncellenemedi"
      );
    }

    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/ShippingAddress/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Sevk adresi silinemedi"
      );
    }
  },
};
