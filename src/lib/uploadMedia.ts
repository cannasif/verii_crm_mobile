import * as FileSystem from "expo-file-system/legacy";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { getApiBaseUrl } from "../constants/config";
import { useAuthStore } from "../store/auth";
import { useUIStore } from "../store/ui";
import { getCurrentLanguage } from "../locales";
import type { ApiResponse, Branch } from "../features/auth/types/auth-types";
import { normalizeLocalMediaUri } from "./mediaUri";

const cachedUploadUris = new Map<string, string>();

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

export interface PreparedMobileUploadFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export interface PrepareMobileUploadOptions {
  mimeType?: string | null;
  fileName?: string | null;
  namePrefix?: string;
  maxBytes?: number;
  minBytes?: number;
}

function getUriScheme(uri: string): string {
  const match = uri.match(/^([a-z]+):\/\//i);
  return match?.[1]?.toLowerCase() ?? (uri.startsWith("/") ? "path" : "unknown");
}

function guessExtension(uri: string, mimeType?: string | null): string {
  const mimeExtension = mimeType?.split("/").pop()?.trim().toLowerCase();
  if (mimeExtension && /^[a-z0-9]{2,5}$/.test(mimeExtension)) {
    return mimeExtension === "jpeg" ? "jpg" : mimeExtension;
  }

  const cleaned = uri.split("?")[0]?.split("#")[0] ?? uri;
  const extension = cleaned.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) {
    return extension;
  }

  return "jpg";
}

export async function ensureReadableUploadUri(imageUri: string, mimeType?: string | null): Promise<string> {
  if (!imageUri) return imageUri;

  const normalizedUri = normalizeLocalMediaUri(imageUri);
  if (getUriScheme(normalizedUri) !== "content") {
    return normalizedUri;
  }

  const cachedUri = cachedUploadUris.get(normalizedUri);
  if (cachedUri) {
    const cachedInfo = await FileSystem.getInfoAsync(cachedUri);
    if (cachedInfo.exists) return cachedUri;
    cachedUploadUris.delete(normalizedUri);
  }

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    return normalizedUri;
  }

  const targetUri = `${baseDir}upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${guessExtension(normalizedUri, mimeType)}`;
  await FileSystem.copyAsync({ from: normalizedUri, to: targetUri });
  cachedUploadUris.set(normalizedUri, targetUri);
  return targetUri;
}

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveUploadMeta(uri: string, options: PrepareMobileUploadOptions): { name: string; type: string } {
  const cleaned = decodeSafely((options.fileName || uri).split("?")[0]?.split("#")[0] ?? uri);
  const tail = cleaned.split("/").pop()?.trim() || "";
  const dotIndex = tail.lastIndexOf(".");
  const rawExtension = dotIndex > -1 ? tail.slice(dotIndex + 1).toLowerCase() : "";
  const mimeExtension = Object.entries(EXTENSION_TO_MIME).find(([, mime]) => mime === options.mimeType)?.[0];
  const extension = EXTENSION_TO_MIME[rawExtension] ? rawExtension : mimeExtension || "jpg";
  const base = dotIndex > -1 ? tail.slice(0, dotIndex) : tail;
  const safeBase = (base || `${options.namePrefix || "upload"}-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
  const type = options.mimeType?.startsWith("image/")
    ? options.mimeType
    : EXTENSION_TO_MIME[extension] ?? "image/jpeg";

  return { name: `${safeBase}.${extension}`, type };
}

export async function prepareMobileImageUpload(
  sourceUri: string,
  options: PrepareMobileUploadOptions = {},
): Promise<PreparedMobileUploadFile> {
  if (!sourceUri.trim()) {
    throw new Error("Yüklenecek görsel seçilmedi.");
  }

  const uri = await ensureReadableUploadUri(sourceUri, options.mimeType);
  let size: number | undefined;

  if (!uri.startsWith("content://")) {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      throw new Error("Seçilen görsel okunamadı. Lütfen görseli tekrar seçin.");
    }
    size = (info as { size?: number }).size;
    const minBytes = options.minBytes ?? 1024;
    const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
    if (typeof size === "number" && size < minBytes) {
      throw new Error("Seçilen görsel boş veya bozuk görünüyor.");
    }
    if (typeof size === "number" && size > maxBytes) {
      throw new Error(`Seçilen görsel ${(maxBytes / 1024 / 1024).toFixed(0)} MB sınırını aşıyor.`);
    }
  }

  return { uri, ...resolveUploadMeta(uri, options), size };
}

export function appendMobileUploadFile(formData: FormData, fieldName: string, file: PreparedMobileUploadFile): void {
  // Expo File gerçek binary içeriği temsil eder. React Native 0.81'in Android
  // { uri, name, type } FormData yolundaki binary upload hatasını kullanmayız.
  formData.append(fieldName, new File(file.uri), file.name);
}

function extractUploadError(payload: unknown, fallback: string): string {
  const data = payload as { message?: string; exceptionMessage?: string; errors?: string[] } | undefined;
  const messages = [
    data?.message,
    data?.exceptionMessage,
    ...(Array.isArray(data?.errors) ? data.errors : []),
  ]
    .map((message) => typeof message === "string" ? message.trim() : "")
    .filter(Boolean);

  return [...new Set(messages)].join(" — ") || fallback;
}

export async function postMobileMultipart<T>(
  endpoint: string,
  formData: FormData,
  options: { timeoutMs?: number; fallbackMessage?: string } = {},
): Promise<ApiResponse<T>> {
  const fallbackMessage = options.fallbackMessage || "Dosya yükleme hatası.";
  const authState = useAuthStore.getState();
  if (!authState.isHydrated) {
    await authState.hydrate();
  }

  const latestAuthState = useAuthStore.getState();
  let branch = latestAuthState.branch as Branch | null;
  if (latestAuthState.token && !branch) {
    branch = await latestAuthState.hydrateBranch();
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Language": getCurrentLanguage() || "tr",
  };
  if (latestAuthState.token) {
    headers.Authorization = `Bearer ${latestAuthState.token}`;
  }
  if (branch?.code !== undefined && branch?.code !== null && String(branch.code).trim()) {
    headers["X-Branch-Code"] = String(branch.code);
    headers.BranchCode = String(branch.code);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 120000);
  const url = `${getApiBaseUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  useUIStore.getState().incrementNetworkRequest();

  try {
    // Expo fetch FormData boundary'sini ve Content-Length'i binary gövdeden üretir.
    // Content-Type burada bilerek elle verilmez.
    const response = await expoFetch(url, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
    const responseText = await response.text();
    let payload: ApiResponse<T> | undefined;
    try {
      payload = responseText ? JSON.parse(responseText) as ApiResponse<T> : undefined;
    } catch {
      throw new Error(`${fallbackMessage} Sunucu geçerli JSON döndürmedi (${response.status}).`);
    }

    if (response.status === 401) {
      await useAuthStore.getState().clearAuth();
    }
    if (!response.ok || !payload?.success) {
      const error = new Error(extractUploadError(payload, `${fallbackMessage} Sunucu ${response.status} döndü.`)) as Error & {
        status?: number;
        response?: { data?: unknown };
      };
      error.status = response.status;
      error.response = { data: payload };
      throw error;
    }

    return payload;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${fallbackMessage} İstek zaman aşımına uğradı.`);
    }
    const serverError = error as Error & { status?: number; response?: unknown };
    if (serverError?.status || serverError?.response) {
      throw error;
    }
    const detail = error instanceof Error && error.message ? ` Detay: ${error.message}` : "";
    throw new Error(`${fallbackMessage} API'ye ulaşılamadı. Aktif API: ${getApiBaseUrl()}.${detail}`);
  } finally {
    clearTimeout(timeout);
    useUIStore.getState().decrementNetworkRequest();
  }
}
