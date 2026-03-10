import type { ApiResponse } from "../../auth/types";
import type {
  TempQuickQuotationPagedParams,
  TempQuotattionCreateDto,
  TempQuotattionDeleteResponse,
  TempQuotattionExchangeLineCreateDto,
  TempQuotattionExchangeLineDeleteResponse,
  TempQuotattionExchangeLineGetDto,
  TempQuotattionExchangeLineListResponse,
  TempQuotattionExchangeLineResponse,
  TempQuotattionExchangeLineUpdateDto,
  TempQuotattionGetDto,
  TempQuotattionLineCreateDto,
  TempQuotattionLineDeleteResponse,
  TempQuotattionLineGetDto,
  TempQuotattionLineListResponse,
  TempQuotattionLineResponse,
  TempQuotattionLineUpdateDto,
  TempQuotattionListResponse,
  TempQuotattionResponse,
  TempQuotattionUpdateDto,
} from "../models/tempQuotattion.model";
import type { PagedResponse } from "../../customer/types/common";

export interface TempQuickQuotationHttpClient {
  get<T>(url: string, config?: { params?: Record<string, string | number> }): Promise<{ data: T }>;
  post<T>(url: string, data?: unknown): Promise<{ data: T }>;
  put<T>(url: string, data?: unknown): Promise<{ data: T }>;
  delete<T>(url: string): Promise<{ data: T }>;
}

const TEMP_QUOTATTION_ENDPOINT = "/api/TempQuotattion";

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "").trim();
}

function getOptionalString(value: unknown): string | undefined {
  const text = getString(value);
  return text.length > 0 ? text : undefined;
}

function normalizeTempQuotation(raw: unknown): TempQuotattionGetDto | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  const id = toNumber(item.id ?? item.Id);
  const customerId = toNumber(item.customerId ?? item.CustomerId);

  if (id == null || customerId == null) {
    return null;
  }

  return {
    id,
    customerId,
    customerName: getOptionalString(item.customerName ?? item.CustomerName) ?? null,
    offerDate: getString(item.offerDate ?? item.OfferDate),
    currencyCode: getString(item.currencyCode ?? item.CurrencyCode),
    exchangeRate: toNumber(item.exchangeRate ?? item.ExchangeRate) ?? 0,
    discountRate1: toNumber(item.discountRate1 ?? item.DiscountRate1) ?? 0,
    discountRate2: toNumber(item.discountRate2 ?? item.DiscountRate2) ?? 0,
    discountRate3: toNumber(item.discountRate3 ?? item.DiscountRate3) ?? 0,
    isApproved: Boolean(item.isApproved ?? item.IsApproved ?? false),
    approvedDate: getOptionalString(item.approvedDate ?? item.ApprovedDate) ?? null,
    description: getString(item.description ?? item.Description),
    createdDate: getString(item.createdDate ?? item.CreatedDate),
    updatedDate: getOptionalString(item.updatedDate ?? item.UpdatedDate) ?? null,
    deletedDate: getOptionalString(item.deletedDate ?? item.DeletedDate) ?? null,
    isDeleted: Boolean(item.isDeleted ?? item.IsDeleted ?? false),
    createdByFullUser: getOptionalString(item.createdByFullUser ?? item.CreatedByFullUser) ?? null,
    updatedByFullUser: getOptionalString(item.updatedByFullUser ?? item.UpdatedByFullUser) ?? null,
    deletedByFullUser: getOptionalString(item.deletedByFullUser ?? item.DeletedByFullUser) ?? null,
  };
}

function buildQueryParams(params: TempQuickQuotationPagedParams): Record<string, string | number> {
  const queryParams: Record<string, string | number> = {};

  if (params.pageNumber) queryParams.pageNumber = params.pageNumber;
  if (params.pageSize) queryParams.pageSize = params.pageSize;
  if (params.sortBy) queryParams.sortBy = params.sortBy;
  if (params.sortDirection) queryParams.sortDirection = params.sortDirection;
  if (params.filters && params.filters.length > 0) {
    queryParams.filters = JSON.stringify(params.filters);
  }

  return queryParams;
}

function unwrap<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (!response.success) {
    throw new Error(response.message || response.exceptionMessage || fallbackMessage);
  }

  return response.data;
}

function ensureData<T>(data: T | null | undefined, fallbackMessage: string): T {
  if (data === null || data === undefined) {
    throw new Error(fallbackMessage);
  }

  return data;
}

export function createTempQuotattionService(httpClient: TempQuickQuotationHttpClient) {
  return {
    async getList(params: TempQuickQuotationPagedParams = {}): Promise<PagedResponse<TempQuotattionGetDto>> {
      const response = await httpClient.get<TempQuotattionListResponse>(TEMP_QUOTATTION_ENDPOINT, {
        params: buildQueryParams(params),
      });

      const data = ensureData(unwrap(response.data, "Hızlı teklif listesi alınamadı"), "Hızlı teklif listesi alınamadı");
      const rawItems: unknown[] = Array.isArray((data as { items?: unknown[] }).items)
        ? ((data as { items?: unknown[] }).items ?? [])
        : Array.isArray((data as { Items?: unknown[] }).Items)
          ? ((data as { Items?: unknown[] }).Items ?? [])
          : [];

      const items = rawItems
        .map(normalizeTempQuotation)
        .filter((item): item is TempQuotattionGetDto => item != null);

      return {
        ...data,
        items,
        totalCount: (data as { totalCount?: number; TotalCount?: number }).totalCount
          ?? (data as { totalCount?: number; TotalCount?: number }).TotalCount
          ?? items.length,
        pageNumber: (data as { pageNumber?: number; PageNumber?: number }).pageNumber
          ?? (data as { pageNumber?: number; PageNumber?: number }).PageNumber
          ?? (params.pageNumber ?? 1),
        pageSize: (data as { pageSize?: number; PageSize?: number }).pageSize
          ?? (data as { pageSize?: number; PageSize?: number }).PageSize
          ?? (params.pageSize ?? 20),
        totalPages: (data as { totalPages?: number; TotalPages?: number }).totalPages
          ?? (data as { totalPages?: number; TotalPages?: number }).TotalPages
          ?? 1,
        hasPreviousPage: (data as { hasPreviousPage?: boolean; HasPreviousPage?: boolean }).hasPreviousPage
          ?? (data as { hasPreviousPage?: boolean; HasPreviousPage?: boolean }).HasPreviousPage
          ?? false,
        hasNextPage: (data as { hasNextPage?: boolean; HasNextPage?: boolean }).hasNextPage
          ?? (data as { hasNextPage?: boolean; HasNextPage?: boolean }).HasNextPage
          ?? false,
      };
    },

    async getById(id: number): Promise<TempQuotattionGetDto> {
      const response = await httpClient.get<TempQuotattionResponse>(`${TEMP_QUOTATTION_ENDPOINT}/${id}`);
      const data = ensureData(unwrap(response.data, "Hızlı teklif detayı alınamadı"), "Hızlı teklif detayı alınamadı");
      return ensureData(normalizeTempQuotation(data), "Hızlı teklif detayı alınamadı");
    },

    async create(payload: TempQuotattionCreateDto): Promise<TempQuotattionGetDto> {
      const response = await httpClient.post<TempQuotattionResponse>(TEMP_QUOTATTION_ENDPOINT, payload);
      const data = ensureData(unwrap(response.data, "Hızlı teklif oluşturulamadı"), "Hızlı teklif oluşturulamadı");
      return ensureData(normalizeTempQuotation(data), "Hızlı teklif oluşturulamadı");
    },

    async update(id: number, payload: TempQuotattionUpdateDto): Promise<TempQuotattionGetDto> {
      const response = await httpClient.put<TempQuotattionResponse>(`${TEMP_QUOTATTION_ENDPOINT}/${id}`, payload);
      const data = ensureData(unwrap(response.data, "Hızlı teklif güncellenemedi"), "Hızlı teklif güncellenemedi");
      return ensureData(normalizeTempQuotation(data), "Hızlı teklif güncellenemedi");
    },

    async setApproved(id: number): Promise<TempQuotattionGetDto> {
      const response = await httpClient.post<TempQuotattionResponse>(`${TEMP_QUOTATTION_ENDPOINT}/${id}/set-approved`);
      const data = ensureData(unwrap(response.data, "Hızlı teklif onaylanamadı"), "Hızlı teklif onaylanamadı");
      return ensureData(normalizeTempQuotation(data), "Hızlı teklif onaylanamadı");
    },

    async remove(id: number): Promise<void> {
      const response = await httpClient.delete<TempQuotattionDeleteResponse>(`${TEMP_QUOTATTION_ENDPOINT}/${id}`);
      unwrap(response.data, "Hızlı teklif silinemedi");
    },

    async getLinesByHeaderId(tempQuotattionId: number): Promise<TempQuotattionLineGetDto[]> {
      const response = await httpClient.get<TempQuotattionLineListResponse>(
        `${TEMP_QUOTATTION_ENDPOINT}/${tempQuotattionId}/lines`
      );
      return unwrap(response.data, "Hızlı teklif satırları alınamadı") ?? [];
    },

    async getLineById(lineId: number): Promise<TempQuotattionLineGetDto> {
      const response = await httpClient.get<TempQuotattionLineResponse>(`${TEMP_QUOTATTION_ENDPOINT}/lines/${lineId}`);
      return ensureData(unwrap(response.data, "Hızlı teklif satırı alınamadı"), "Hızlı teklif satırı alınamadı");
    },

    async createLine(payload: TempQuotattionLineCreateDto): Promise<TempQuotattionLineGetDto> {
      const response = await httpClient.post<TempQuotattionLineResponse>(`${TEMP_QUOTATTION_ENDPOINT}/lines`, payload);
      return ensureData(unwrap(response.data, "Hızlı teklif satırı oluşturulamadı"), "Hızlı teklif satırı oluşturulamadı");
    },

    async createLines(payload: TempQuotattionLineCreateDto[]): Promise<TempQuotattionLineGetDto[]> {
      const response = await httpClient.post<TempQuotattionLineListResponse>(`${TEMP_QUOTATTION_ENDPOINT}/lines/bulk`, payload);
      return unwrap(response.data, "Hızlı teklif satırları oluşturulamadı") ?? [];
    },

    async updateLine(lineId: number, payload: TempQuotattionLineUpdateDto): Promise<TempQuotattionLineGetDto> {
      const response = await httpClient.put<TempQuotattionLineResponse>(`${TEMP_QUOTATTION_ENDPOINT}/lines/${lineId}`, payload);
      return ensureData(unwrap(response.data, "Hızlı teklif satırı güncellenemedi"), "Hızlı teklif satırı güncellenemedi");
    },

    async removeLine(lineId: number): Promise<void> {
      const response = await httpClient.delete<TempQuotattionLineDeleteResponse>(`${TEMP_QUOTATTION_ENDPOINT}/lines/${lineId}`);
      unwrap(response.data, "Hızlı teklif satırı silinemedi");
    },

    async getExchangeLinesByHeaderId(tempQuotattionId: number): Promise<TempQuotattionExchangeLineGetDto[]> {
      const response = await httpClient.get<TempQuotattionExchangeLineListResponse>(
        `${TEMP_QUOTATTION_ENDPOINT}/${tempQuotattionId}/exchange-lines`
      );
      return unwrap(response.data, "Hızlı teklif kur satırları alınamadı") ?? [];
    },

    async getExchangeLineById(exchangeLineId: number): Promise<TempQuotattionExchangeLineGetDto> {
      const response = await httpClient.get<TempQuotattionExchangeLineResponse>(
        `${TEMP_QUOTATTION_ENDPOINT}/exchange-lines/${exchangeLineId}`
      );
      return ensureData(unwrap(response.data, "Hızlı teklif kur satırı alınamadı"), "Hızlı teklif kur satırı alınamadı");
    },

    async createExchangeLine(payload: TempQuotattionExchangeLineCreateDto): Promise<TempQuotattionExchangeLineGetDto> {
      const response = await httpClient.post<TempQuotattionExchangeLineResponse>(
        `${TEMP_QUOTATTION_ENDPOINT}/exchange-lines`,
        payload
      );
      return ensureData(unwrap(response.data, "Hızlı teklif kur satırı oluşturulamadı"), "Hızlı teklif kur satırı oluşturulamadı");
    },

    async updateExchangeLine(
      exchangeLineId: number,
      payload: TempQuotattionExchangeLineUpdateDto
    ): Promise<TempQuotattionExchangeLineGetDto> {
      const response = await httpClient.put<TempQuotattionExchangeLineResponse>(
        `${TEMP_QUOTATTION_ENDPOINT}/exchange-lines/${exchangeLineId}`,
        payload
      );
      return ensureData(unwrap(response.data, "Hızlı teklif kur satırı güncellenemedi"), "Hızlı teklif kur satırı güncellenemedi");
    },

    async removeExchangeLine(exchangeLineId: number): Promise<void> {
      const response = await httpClient.delete<TempQuotattionExchangeLineDeleteResponse>(
        `${TEMP_QUOTATTION_ENDPOINT}/exchange-lines/${exchangeLineId}`
      );
      unwrap(response.data, "Hızlı teklif kur satırı silinemedi");
    },
  };
}

export type TempQuotattionService = ReturnType<typeof createTempQuotattionService>;
