import { apiClient } from "../../../lib/axios";
import * as FileSystem from "expo-file-system/legacy";
import i18n from "../../../locales";
import type { ApiResponse } from "../../auth/types";
import type {
  ActivityDto,
  ActivityImageDto,
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

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

function getSafeUploadMeta(imageUri: string): { name: string; type: string; uri: string } {
  const cleanedUri = imageUri.split("?")[0]?.split("#")[0] ?? imageUri;
  const rawTail = cleanedUri.split("/").pop()?.trim() || `activity_${Date.now()}.jpg`;
  const hasDot = rawTail.includes(".");
  const baseName = hasDot ? rawTail.substring(0, rawTail.lastIndexOf(".")) : rawTail;
  const rawExt = hasDot ? rawTail.substring(rawTail.lastIndexOf(".") + 1).toLowerCase() : "";
  const safeExt = EXTENSION_TO_MIME[rawExt] ? rawExt : "jpg";

  return {
    uri: imageUri,
    name: `${baseName.replace(/[^a-zA-Z0-9_-]/g, "_")}.${safeExt}`,
    type: EXTENSION_TO_MIME[safeExt] ?? "image/jpeg",
  };
}

async function ensureReadableUploadUri(imageUri: string): Promise<string> {
  if (!imageUri) return imageUri;
  if (imageUri.startsWith("file://")) return imageUri;
  if (!imageUri.startsWith("content://")) return imageUri;

  const cacheBase = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheBase) return imageUri;

  const target = `${cacheBase}activity_upload_${Date.now()}.jpg`;
  try {
    await FileSystem.copyAsync({ from: imageUri, to: target });
    return target;
  } catch {
    return imageUri;
  }
}

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

export const activityImageApi = {
  getByActivityId: async (activityId: number): Promise<ActivityImageDto[]> => {
    const response = await apiClient.get<ApiResponse<ActivityImageDto[]>>(`/api/ActivityImage/by-activity/${activityId}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activity.imageLoadError")
      );
    }

    return response.data.data ?? [];
  },

  upload: async (
    activityId: number,
    images: Array<{ uri: string; description?: string }>
  ): Promise<ActivityImageDto[]> => {
    const formData = new FormData();

    for (const image of images) {
      const readableUri = await ensureReadableUploadUri(image.uri);
      const meta = getSafeUploadMeta(readableUri);
      formData.append("files", {
        uri: meta.uri,
        name: meta.name,
        type: meta.type,
      } as any);

      if (image.description) {
        formData.append("resimAciklamalar", image.description);
      }
    }

    const response = await apiClient.post<ApiResponse<ActivityImageDto[]>>(
      `/api/ActivityImage/upload/${activityId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activity.imageUploadError")
      );
    }

    return response.data.data ?? [];
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/ActivityImage/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activity.imageDeleteError")
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
