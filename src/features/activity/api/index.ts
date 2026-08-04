import { apiClient } from "../../../lib/axios";
import i18n from "../../../locales";
import { normalizeApiRequestError } from "../../../lib/api-error";
import { appendMobileUploadFile, postMobileMultipart, prepareMobileImageUpload } from "../../../lib/uploadMedia";
import type { ApiResponse } from "../../auth/types";
import type {
  ActivityDto,
  ActivityImageDto,
  ActivityTypeDto,
  ActivityLookupDto,
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

/** Backend may return PascalCase, Turkish property names, or wrap the list in items/data (like paged payloads). */
type RawActivityImageRow = {
  id?: number;
  Id?: number;
  activityId?: number;
  ActivityId?: number;
  imageUrl?: string;
  ImageUrl?: string;
  resimUrl?: string;
  ResimUrl?: string;
  imageDescription?: string;
  ImageDescription?: string;
  resimAciklama?: string;
  ResimAciklama?: string;
  createdDate?: string;
  CreatedDate?: string;
};

function extractActivityImageRows(data: unknown): RawActivityImageRow[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    return data.filter((row): row is RawActivityImageRow => row != null && typeof row === "object");
  }
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    const nested = o.items ?? o.Items ?? o.data ?? o.Data;
    if (Array.isArray(nested)) {
      return nested.filter((row): row is RawActivityImageRow => row != null && typeof row === "object");
    }
  }
  return [];
}

function normalizeActivityImageDto(raw: RawActivityImageRow): ActivityImageDto {
  const id = raw.id ?? raw.Id ?? 0;
  const activityId = raw.activityId ?? raw.ActivityId ?? 0;
  const imageUrl =
    raw.imageUrl ?? raw.ImageUrl ?? raw.resimUrl ?? raw.ResimUrl ?? "";
  const imageDescription =
    raw.imageDescription ?? raw.ImageDescription ?? raw.resimAciklama ?? raw.ResimAciklama;
  const createdDate = raw.createdDate ?? raw.CreatedDate;
  const dto: ActivityImageDto = {
    id,
    activityId,
    imageUrl,
  };
  if (imageDescription != null && imageDescription !== "") {
    dto.imageDescription = imageDescription;
  }
  if (createdDate != null && createdDate !== "") {
    dto.createdDate = createdDate;
  }
  return dto;
}

function normalizeActivityImageList(data: unknown): ActivityImageDto[] {
  return extractActivityImageRows(data).map(normalizeActivityImageDto);
}

export const activityApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<ActivityDto>> => {
    const response = await apiClient.post<ApiResponse<RawPagedPayload<ActivityDto>>>("/api/Activity/query", {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 20,
      search: params.search ?? "",
      searchFields: params.searchFields ?? [],
      sortBy: params.sortBy ?? "Id",
      sortDirection: params.sortDirection ?? "asc",
      filterLogic: params.filterLogic ?? "and",
      filters: params.filters ?? [],
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

    return normalizeActivityImageList(response.data.data);
  },

  upload: async (
    activityId: number,
    images: Array<{ uri: string; description?: string; mimeType?: string }>
  ): Promise<ActivityImageDto[]> => {
    const formData = new FormData();

    for (const image of images) {
      const file = await prepareMobileImageUpload(image.uri, {
        mimeType: image.mimeType,
        namePrefix: `activity-${activityId}`,
      });
      appendMobileUploadFile(formData, "files", file);
      // Keep list indexes aligned with files even when a description is empty.
      formData.append("resimAciklamalar", image.description?.trim() || "");
    }

    const endpoint = `/api/ActivityImage/upload/${activityId}`;
    try {
      const response = await postMobileMultipart<ActivityImageDto[]>(
        endpoint,
        formData,
        {
          timeoutMs: 120000,
          fallbackMessage: i18n.t("activity.imageUploadError"),
        }
      );
      return normalizeActivityImageList(response.data);
    } catch (error) {
      throw normalizeApiRequestError(error, i18n.t("activity.imageUploadError"), endpoint);
    }
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
    const response = await apiClient.post<ApiResponse<RawPagedPayload<ActivityTypeDto>>>(
      "/api/ActivityType/query",
      {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 10000,
        search: params.search ?? "",
        searchFields: params.searchFields ?? [],
        sortBy: params.sortBy ?? "Id",
        sortDirection: params.sortDirection ?? "desc",
        filterLogic: params.filterLogic ?? "and",
        filters: params.filters ?? [],
      }
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

async function getLookupList(endpoint: string): Promise<ActivityLookupDto[]> {
  const response = await apiClient.get<ApiResponse<RawPagedPayload<ActivityLookupDto>>>(endpoint, {
    params: { pageNumber: 1, pageSize: 1000, sortBy: "Id", sortDirection: "desc" },
  });

  if (!response.data.success) {
    throw new Error(response.data.message || response.data.exceptionMessage || i18n.t("common.unknownError"));
  }

  return normalizePagedResponse(response.data.data).items;
}

async function getLookupListByQuery(endpoint: string): Promise<ActivityLookupDto[]> {
  const response = await apiClient.post<ApiResponse<RawPagedPayload<ActivityLookupDto>>>(`${endpoint}/query`, {
    pageNumber: 1,
    pageSize: 1000,
    search: "",
    searchFields: [],
    sortBy: "Id",
    sortDirection: "desc",
    filterLogic: "and",
    filters: [],
  });

  if (!response.data.success) {
    throw new Error(response.data.message || response.data.exceptionMessage || i18n.t("common.unknownError"));
  }

  return normalizePagedResponse(response.data.data).items;
}

export const activityLookupApi = {
  getPaymentTypes: async (): Promise<ActivityLookupDto[]> => getLookupListByQuery("/api/PaymentType"),
  getMeetingTypes: async (): Promise<ActivityLookupDto[]> => getLookupListByQuery("/api/ActivityMeetingType"),
  getTopicPurposes: async (): Promise<ActivityLookupDto[]> => getLookupListByQuery("/api/ActivityTopicPurpose"),
  getShippings: async (): Promise<ActivityLookupDto[]> => getLookupListByQuery("/api/ActivityShipping"),
};
