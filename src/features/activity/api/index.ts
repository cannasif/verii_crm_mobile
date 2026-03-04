import { apiClient } from "../../../lib/axios";
import i18n from "../../../locales";
import type { ApiResponse } from "../../auth/types";
import type {
  ActivityDto,
  ActivityTypeDto,
  CreateActivityDto,
  UpdateActivityDto,
  PagedParams,
  PagedResponse,
  PagedApiResponse,
} from "../types";

interface RawPagedPayload<T> {
  items?: T[];
  data?: T[];
  Items?: T[];
  Data?: T[];
  totalCount?: number;
  TotalCount?: number;
  pageNumber?: number;
  PageNumber?: number;
  pageSize?: number;
  PageSize?: number;
  totalPages?: number;
  TotalPages?: number;
  hasPreviousPage?: boolean;
  HasPreviousPage?: boolean;
  hasNextPage?: boolean;
  HasNextPage?: boolean;
}

function normalizePagedResponse<T>(raw: RawPagedPayload<T> | null | undefined): PagedResponse<T> {
  const items = raw?.items ?? raw?.data ?? raw?.Items ?? raw?.Data ?? [];
  const totalCount = raw?.totalCount ?? raw?.TotalCount ?? 0;
  const pageNumber = raw?.pageNumber ?? raw?.PageNumber ?? 1;
  const pageSize = raw?.pageSize ?? raw?.PageSize ?? 20;
  const totalPages = raw?.totalPages ?? raw?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPreviousPage = raw?.hasPreviousPage ?? raw?.HasPreviousPage ?? pageNumber > 1;
  const hasNextPage = raw?.hasNextPage ?? raw?.HasNextPage ?? pageNumber < totalPages;
  return {
    items: Array.isArray(items) ? items : [],
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
  };
}

const buildQueryParams = (params: PagedParams): Record<string, string | number> => {
  const queryParams: Record<string, string | number> = {};

  if (params.pageNumber) {
    queryParams.pageNumber = params.pageNumber;
  }
  if (params.pageSize) {
    queryParams.pageSize = params.pageSize;
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

  return queryParams;
};

export const activityApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<ActivityDto>> => {
    const queryParams = buildQueryParams(params);
    const response = await apiClient.get<ApiResponse<RawPagedPayload<ActivityDto>>>("/api/Activity", {
      params: queryParams,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activity.errors.listLoad")
      );
    }

    return normalizePagedResponse(response.data.data);
  },

  getById: async (id: number): Promise<ActivityDto> => {
    const response = await apiClient.get<ApiResponse<ActivityDto>>(`/api/Activity/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activity.errors.notFound")
      );
    }

    return response.data.data;
  },

  create: async (data: CreateActivityDto): Promise<ActivityDto> => {
    const response = await apiClient.post<ApiResponse<ActivityDto>>("/api/Activity", data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activity.errors.create")
      );
    }

    return response.data.data;
  },

  update: async (id: number, data: UpdateActivityDto): Promise<ActivityDto> => {
    const response = await apiClient.put<ApiResponse<ActivityDto>>(`/api/Activity/${id}`, data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activity.errors.update")
      );
    }

    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/Activity/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activity.errors.delete")
      );
    }
  },
};

export const activityTypeApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<ActivityTypeDto>> => {
    const queryParams = buildQueryParams({
      pageNumber: 1,
      pageSize: 10000,
      sortBy: "Id",
      sortDirection: "desc",
      ...params,
    });
    const response = await apiClient.get<ApiResponse<RawPagedPayload<ActivityTypeDto>>>(
      "/api/ActivityType",
      { params: queryParams }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activityType.errors.listLoad")
      );
    }

    return normalizePagedResponse(response.data.data);
  },

  getById: async (id: number): Promise<ActivityTypeDto> => {
    const response = await apiClient.get<ApiResponse<ActivityTypeDto>>(`/api/ActivityType/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activityType.errors.notFound")
      );
    }

    return response.data.data;
  },

  create: async (data: { name: string; description?: string }): Promise<ActivityTypeDto> => {
    const response = await apiClient.post<ApiResponse<ActivityTypeDto>>("/api/ActivityType", data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activityType.errors.create")
      );
    }

    return response.data.data;
  },

  update: async (id: number, data: { name: string; description?: string }): Promise<ActivityTypeDto> => {
    const response = await apiClient.put<ApiResponse<ActivityTypeDto>>(`/api/ActivityType/${id}`, data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activityType.errors.update")
      );
    }

    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<Record<string, never>>>(`/api/ActivityType/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activityType.errors.delete")
      );
    }
  },
};
