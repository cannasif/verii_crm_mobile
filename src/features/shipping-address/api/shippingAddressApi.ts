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

const buildQueryParams = (params: PagedParams): Record<string, string | number> => {
  const queryParams: Record<string, string | number> = {};

  if (params.pageNumber) {
    queryParams.pageNumber = params.pageNumber;
  }
  if (params.pageSize) {
    queryParams.pageSize = params.pageSize;
  }
  if (params.search) {
    queryParams.search = params.search;
  }
  if (params.sortBy) {
    queryParams.sortBy = params.sortBy;
  }
  if (params.sortDirection) {
    queryParams.sortDirection = params.sortDirection;
  }
  if (params.filters && params.filters.length > 0) {
    queryParams.filters = JSON.stringify(params.filters);
  }
  if (params.filterLogic) {
    queryParams.filterLogic = params.filterLogic;
  }

  return queryParams;
};

export const shippingAddressApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<ShippingAddressDto>> => {
    const queryParams = buildQueryParams(params);
    const response = await apiClient.get<PagedApiResponse<ShippingAddressDto>>(
      "/api/ShippingAddress",
      { params: queryParams }
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
