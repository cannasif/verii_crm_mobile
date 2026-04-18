import { apiClient } from "../../../lib/axios";
import * as FileSystem from "expo-file-system/legacy";
import { normalizeLocalMediaUri } from "../../../lib/mediaUri";
import i18n from "../../../locales";
import type { ApiResponse } from "../../auth/types";
import type { StockImageDto } from "../types";

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
  let decodedUri = cleanedUri;
  try {
    decodedUri = decodeURIComponent(cleanedUri);
  } catch {
    decodedUri = cleanedUri;
  }
  const rawTail = decodedUri.split("/").pop()?.trim() || "";

  const fallbackBase = `stock_${Date.now()}`;
  const hasDot = rawTail.includes(".");
  const baseName = hasDot ? rawTail.substring(0, rawTail.lastIndexOf(".")) : rawTail || fallbackBase;
  const rawExt = hasDot ? rawTail.substring(rawTail.lastIndexOf(".") + 1).toLowerCase() : "";
  const safeExt = EXTENSION_TO_MIME[rawExt] ? rawExt : "jpg";
  const safeName = `${baseName.replace(/[^a-zA-Z0-9_-]/g, "_")}.${safeExt}`;

  return {
    uri: imageUri,
    name: safeName,
    type: EXTENSION_TO_MIME[safeExt] ?? "image/jpeg",
  };
}

async function ensureReadableUploadUri(imageUri: string): Promise<string> {
  if (!imageUri) return imageUri;
  return normalizeLocalMediaUri(imageUri);
}

async function assertUploadFileIsValid(imageUri: string): Promise<void> {
  if (imageUri.startsWith("content://")) {
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(imageUri);
    const size = (info as { size?: number }).size;
    if (!info.exists) {
      throw new Error(i18n.t("stock.uploadFileUnreadable"));
    }
    if (typeof size === "number" && size > 0 && size < 1024) {
      throw new Error(i18n.t("stock.uploadFileInvalid"));
    }
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error(i18n.t("stock.uploadFileUnreadable"));
  }
}

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

type FormDataAppendFile = { uri: string; name: string; type: string };

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
      const readableUri = await ensureReadableUploadUri(localUris[i] ?? "");
      await assertUploadFileIsValid(readableUri);
      const fileMeta = getSafeUploadMeta(readableUri);
      const filePayload: FormDataAppendFile = {
        uri: fileMeta.uri,
        type: fileMeta.type,
        name: fileMeta.name,
      };
      formData.append("files", filePayload as unknown as Blob);
      const alt = altTexts?.[i]?.trim();
      if (alt) {
        formData.append(`altTexts[${i}]`, alt);
      }
    }

    const response = await apiClient.post<ApiResponse<unknown>>(
      `/api/StockImage/upload/${stockId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!response.data.success) {
      throw new Error(extractApiErrorMessage(response.data, "stock.uploadError"));
    }

    return parseStockImageList(response.data.data);
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
