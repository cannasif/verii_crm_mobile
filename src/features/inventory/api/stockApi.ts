import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type {
  StockGetDto,
  StockRelationDto,
  StockRelationCreateDto,
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

export const stockApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<StockGetDto>> => {
    const queryParams = buildQueryParams(params);
    const response = await apiClient.get<PagedApiResponse<StockGetDto>>("/api/Stock", {
      params: queryParams,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Stok listesi alınamadı"
      );
    }

    return response.data.data;
  },

  getById: async (id: number): Promise<StockGetDto> => {
    const response = await apiClient.get<ApiResponse<StockGetDto>>(`/api/Stock/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Stok bulunamadı"
      );
    }

    return response.data.data;
  },

  getRelations: async (stockId: number, params: PagedParams = {}): Promise<PagedResponse<StockRelationDto>> => {
    const queryParams = buildQueryParams(params);
    const response = await apiClient.get<PagedApiResponse<StockRelationDto>>(
      `/api/Stock/${stockId}/relations`,
      {
        params: queryParams,
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Stok ilişkileri alınamadı"
      );
    }

    return response.data.data;
  },

  createRelation: async (data: StockRelationCreateDto): Promise<StockRelationDto> => {
    const response = await apiClient.post<ApiResponse<StockRelationDto>>(
      `/api/Stock/${data.stockId}/relations`,
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Stok ilişkisi oluşturulamadı"
      );
    }

    return response.data.data;
  },

  deleteRelation: async (stockId: number, relationId: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/api/Stock/${stockId}/relations/${relationId}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Stok ilişkisi silinemedi"
      );
    }
  },
};
