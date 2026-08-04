import * as FileSystem from "expo-file-system/legacy";
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
  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
}
