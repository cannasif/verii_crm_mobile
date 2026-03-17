import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type {
  TitleDto,
  CreateTitleDto,
  UpdateTitleDto,
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

export const titleApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<TitleDto>> => {
    const queryParams = buildQueryParams(params);
    const response = await apiClient.get<PagedApiResponse<TitleDto>>("/api/Title", {
      params: queryParams,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Ünvan listesi alınamadı"
      );
    }

    return response.data.data;
  },

  getById: async (id: number): Promise<TitleDto> => {
    const response = await apiClient.get<ApiResponse<TitleDto>>(`/api/Title/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Ünvan bulunamadı"
      );
    }

    return response.data.data;
  },

  create: async (data: CreateTitleDto): Promise<TitleDto> => {
    const response = await apiClient.post<ApiResponse<TitleDto>>("/api/Title", data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Ünvan oluşturulamadı"
      );
    }

    return response.data.data;
  },

  update: async (id: number, data: UpdateTitleDto): Promise<TitleDto> => {
    const response = await apiClient.put<ApiResponse<TitleDto>>(`/api/Title/${id}`, data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Ünvan güncellenemedi"
      );
    }

    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/Title/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Ünvan silinemedi"
      );
    }
  },
};
