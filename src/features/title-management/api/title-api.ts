import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types/auth-types";
import type {
  TitleDto,
  CreateTitleDto,
  UpdateTitleDto,
  PagedParams,
  PagedResponse,
  PagedApiResponse,
} from "../types/title-types";

export const titleApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<TitleDto>> => {
    const response = await apiClient.post<PagedApiResponse<TitleDto>>("/api/Title/query", {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? "",
      searchFields: params.searchFields ?? [],
      sortBy: params.sortBy ?? "Id",
      sortDirection: params.sortDirection ?? "asc",
      filterLogic: params.filterLogic ?? "and",
      filters: params.filters ?? [],
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
