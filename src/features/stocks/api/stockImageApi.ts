import { apiClient } from "../../../lib/axios";
import { appendMobileUploadFile, postMobileMultipart, prepareMobileImageUpload } from "../../../lib/uploadMedia";
import i18n from "../../../locales";
import type { ApiResponse } from "../../auth/types/auth-types";
import type { StockImageDto } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function normalizeStockImage(raw: unknown): StockImageDto | null {
  if (!isRecord(raw)) return null;
  const id = toFiniteNumber(raw.id ?? raw.Id);
  const stockId = toFiniteNumber(raw.stockId ?? raw.StockId);
  const filePathRaw = raw.filePath ?? raw.FilePath;
  if (id == null || stockId == null) return null;
  if (typeof filePathRaw !== "string" || filePathRaw.trim() === "") return null;
  const filePath = filePathRaw.trim();
  const isPrimary = Boolean(raw.isPrimary ?? raw.IsPrimary);
  const sortOrder = toFiniteNumber(raw.sortOrder ?? raw.SortOrder) ?? 0;
  const altRaw = raw.altText ?? raw.AltText;
  const altText =
    typeof altRaw === "string" && altRaw.trim() !== "" ? altRaw.trim() : undefined;
  const stockNameRaw = raw.stockName ?? raw.StockName;
  const stockName = typeof stockNameRaw === "string" && stockNameRaw.trim() !== "" ? stockNameRaw : undefined;
  const createdAt =
    typeof raw.createdAt === "string"
      ? raw.createdAt
      : typeof raw.CreatedAt === "string"
        ? raw.CreatedAt
        : undefined;
  const updatedAt =
    typeof raw.updatedAt === "string"
      ? raw.updatedAt
      : typeof raw.UpdatedAt === "string"
        ? raw.UpdatedAt
        : undefined;
  return {
    id,
    stockId,
    filePath,
    altText,
    isPrimary,
    sortOrder,
    stockName,
    createdAt,
    updatedAt,
  };
}

function parseStockImageList(payload: unknown): StockImageDto[] {
  if (!Array.isArray(payload)) return [];
  const mapped = payload.map((item) => normalizeStockImage(item));
  return mapped.filter((item): item is StockImageDto => item !== null);
}

function extractApiErrorMessage(response: ApiResponse<unknown>, fallbackKey: string): string {
  const msg = [response.message, response.exceptionMessage].filter(Boolean).join(" — ");
  return msg || i18n.t(fallbackKey);
}

export const stockImageApi = {
  getByStock: async (stockId: number): Promise<StockImageDto[]> => {
    const response = await apiClient.get<ApiResponse<unknown>>(`/api/StockImage/by-stock/${stockId}`);
    if (!response.data.success) {
      throw new Error(extractApiErrorMessage(response.data, "stock.imagesLoadError"));
    }
    return parseStockImageList(response.data.data);
  },

  upload: async (
    stockId: number,
    localUris: string[],
    altTexts?: (string | undefined)[]
  ): Promise<StockImageDto[]> => {
    if (localUris.length === 0) {
      return [];
    }

    const formData = new FormData();

    for (let i = 0; i < localUris.length; i += 1) {
      const file = await prepareMobileImageUpload(localUris[i] ?? "", { namePrefix: `stock-${stockId}` });
      appendMobileUploadFile(formData, "files", file);
      // Repeated keys match ASP.NET List<string> binding and preserve file indexes.
      formData.append("altTexts", altTexts?.[i]?.trim() || "");
    }

    const response = await postMobileMultipart<unknown>(
      `/api/StockImage/upload/${stockId}`,
      formData,
      { fallbackMessage: i18n.t("stock.uploadError") },
    );
    return parseStockImageList(response.data);
  },

  delete: async (imageId: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<unknown>>(`/api/StockImage/${imageId}`);
    if (!response.data.success) {
      throw new Error(extractApiErrorMessage(response.data, "stock.deleteImageError"));
    }
  },

  setPrimary: async (imageId: number): Promise<StockImageDto> => {
    const response = await apiClient.put<ApiResponse<unknown>>(`/api/StockImage/set-primary/${imageId}`);
    if (!response.data.success) {
      throw new Error(extractApiErrorMessage(response.data, "stock.setPrimaryError"));
    }
    const normalized = normalizeStockImage(response.data.data);
    if (!normalized) {
      throw new Error(i18n.t("stock.setPrimaryError"));
    }
    return normalized;
  },
};
