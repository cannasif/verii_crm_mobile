import { apiClient } from "../../../lib/axios";
import i18n from "../../../locales";
import { normalizeApiRequestError } from "../../../lib/api-error";
import { ensureReadableUploadUri } from "../../../lib/uploadMedia";
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
      const readableUri = await ensureReadableUploadUri(image.uri, image.mimeType);
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

    let response;
    const endpoint = `/api/ActivityImage/upload/${activityId}`;
    try {
      response = await apiClient.post<ApiResponse<ActivityImageDto[]>>(
        endpoint,
        formData,
        {
          timeout: 120000,
        }
      );
    } catch (error) {
      throw normalizeApiRequestError(error, i18n.t("activity.imageUploadError"), endpoint);
    }

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || i18n.t("activity.imageUploadError")
      );
    }

    return normalizeActivityImageList(response.data.data);
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
