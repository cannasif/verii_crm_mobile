import * as FileSystem from "expo-file-system/legacy";
import { normalizeLocalMediaUri } from "./mediaUri";

const cachedUploadUris = new Map<string, string>();

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
    return cachedUri;
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
