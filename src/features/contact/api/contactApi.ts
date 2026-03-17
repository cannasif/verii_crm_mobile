import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type {
  ContactDto,
  CreateContactDto,
  UpdateContactDto,
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

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = toNumber(value);
  return n !== undefined ? n : null;
};

const getString = (value: unknown): string =>
  typeof value === "string" ? value : String(value ?? "").trim();
const getOptionalString = (value: unknown): string | undefined => {
  const s = getString(value);
  return s.length > 0 ? s : undefined;
};

const normalizeContact = (raw: unknown): ContactDto | null => {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  const id = toNumber(item.id ?? item.Id);
  const customerId = toNumber(item.customerId ?? item.CustomerId);

  if (id == null || customerId == null) return null;

  const firstName = getString(item.firstName ?? item.FirstName);
  const middleName = getOptionalString(item.middleName ?? item.MiddleName);
  const lastName = getString(item.lastName ?? item.LastName);
  const fullNameRaw = getString(item.fullName ?? item.FullName);
  const fullName =
    fullNameRaw.length > 0
      ? fullNameRaw
      : [firstName, middleName, lastName].filter(Boolean).join(" ").trim() || "-";

  return {
    id,
    salutation: toNumber(item.salutation ?? item.Salutation) ?? 0,
    firstName,
    middleName,
    lastName,
    fullName,
    email: getOptionalString(item.email ?? item.Email),
    phone: getOptionalString(item.phone ?? item.Phone),
    mobile: getOptionalString(item.mobile ?? item.Mobile),
    notes: getOptionalString(item.notes ?? item.Notes),
    customerId,
    customerName: getOptionalString(item.customerName ?? item.CustomerName),
    titleId: toNullableNumber(item.titleId ?? item.TitleId),
    titleName: getOptionalString(item.titleName ?? item.TitleName),
    createdDate: getString(item.createdDate ?? item.CreatedDate) || undefined,
    updatedDate: getOptionalString(item.updatedDate ?? item.UpdatedDate),
    isDeleted: Boolean(item.isDeleted ?? item.IsDeleted ?? false),
    createdByFullUser: getOptionalString(item.createdByFullUser ?? item.CreatedByFullUser),
    updatedByFullUser: getOptionalString(item.updatedByFullUser ?? item.UpdatedByFullUser),
    deletedByFullUser: getOptionalString(item.deletedByFullUser ?? item.DeletedByFullUser),
  };
};

export const contactApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<ContactDto>> => {
    const queryParams = buildQueryParams(params);
    const response = await apiClient.get<PagedApiResponse<ContactDto>>("/api/Contact", {
      params: queryParams,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Kişi listesi alınamadı"
      );
    }

    const payload = response.data.data as unknown;
    if (!payload || typeof payload !== "object") {
      return {
        items: [],
        totalCount: 0,
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      };
    }

    const shaped = payload as {
      items?: unknown[];
      Items?: unknown[];
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
    };

    const rawItems = Array.isArray(shaped.items)
      ? shaped.items
      : Array.isArray(shaped.Items)
        ? shaped.Items
        : [];

    const items = rawItems
      .map(normalizeContact)
      .filter((item): item is ContactDto => item != null);

    return {
      items,
      totalCount: shaped.totalCount ?? shaped.TotalCount ?? items.length,
      pageNumber: shaped.pageNumber ?? shaped.PageNumber ?? (params.pageNumber ?? 1),
      pageSize: shaped.pageSize ?? shaped.PageSize ?? (params.pageSize ?? 20),
      totalPages: shaped.totalPages ?? shaped.TotalPages ?? 1,
      hasPreviousPage: shaped.hasPreviousPage ?? shaped.HasPreviousPage ?? false,
      hasNextPage: shaped.hasNextPage ?? shaped.HasNextPage ?? false,
    };
  },

  getById: async (id: number): Promise<ContactDto> => {
    const response = await apiClient.get<ApiResponse<ContactDto>>(`/api/Contact/${id}`);

    if (!response.data.success) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Kişi bulunamadı");
    }

    const data = response.data.data as unknown;
    const normalized = normalizeContact(data);
    if (!normalized) {
      throw new Error("Kişi verisi çözümlenemedi");
    }

    return normalized;
  },

  create: async (data: CreateContactDto): Promise<ContactDto> => {
    const response = await apiClient.post<ApiResponse<ContactDto>>("/api/Contact", data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Kişi oluşturulamadı"
      );
    }

    const responseData = response.data.data as unknown;
    const normalized = normalizeContact(responseData);
    if (!normalized) {
      throw new Error("Kişi verisi çözümlenemedi");
    }

    return normalized;
  },

  update: async (id: number, data: UpdateContactDto): Promise<ContactDto> => {
    const response = await apiClient.put<ApiResponse<ContactDto>>(`/api/Contact/${id}`, data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Kişi güncellenemedi"
      );
    }

    const responseData = response.data.data as unknown;
    const normalized = normalizeContact(responseData);
    if (!normalized) {
      throw new Error("Kişi verisi çözümlenemedi");
    }

    return normalized;
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/Contact/${id}`);

    if (!response.data.success) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Kişi silinemedi");
    }
  },

  getByCustomerId: async (customerId: number): Promise<ContactDto[]> => {
    const queryParams = buildQueryParams({
      filters: [{ column: "customerId", operator: "equals", value: String(customerId) }],
      pageSize: 100,
    });
    const response = await apiClient.get<PagedApiResponse<ContactDto>>("/api/Contact", {
      params: queryParams,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Kişi listesi alınamadı"
      );
    }

    const payload = response.data.data as unknown as {
      items?: unknown[];
      Items?: unknown[];
    } | null;

    const rawItems =
      payload && Array.isArray(payload.items)
        ? payload.items
        : payload && Array.isArray(payload.Items)
          ? payload.Items
          : [];

    return rawItems
      .map(normalizeContact)
      .filter((item): item is ContactDto => item != null);
  },
};
