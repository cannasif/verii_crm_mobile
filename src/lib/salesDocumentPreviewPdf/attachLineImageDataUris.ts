import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import { getApiBaseUrl } from "../../constants/config";
import { apiClient } from "../axios";
import type { SalesDocumentPreviewPdfLineInput } from "./types";

function resolveRemoteImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("file://")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${getApiBaseUrl()}${path}`;
  }
  return `${getApiBaseUrl()}/${path.replace(/^\//, "")}`;
}

async function readLocalFileAsDataUri(uri: string): Promise<string | null> {
  try {
    const normalized = uri.startsWith("file://") ? uri : `file://${uri}`;
    const base64 = await FileSystem.readAsStringAsync(normalized, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const extension = normalized.split(".").pop()?.toLowerCase();
    const mimeType =
      extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : extension === "gif"
            ? "image/gif"
            : "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}

async function fetchRemoteImageAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await apiClient.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
    });
    const contentType =
      (response.headers["content-type"] as string | undefined)?.split(";")[0]?.trim() ||
      "image/jpeg";
    const base64 = Buffer.from(new Uint8Array(response.data)).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

async function resolveLineImageDataUri(imagePath: string | null): Promise<string | null> {
  if (!imagePath?.trim()) return null;

  if (imagePath.startsWith("data:")) return imagePath;

  if (imagePath.startsWith("file://") || imagePath.startsWith("content://")) {
    return readLocalFileAsDataUri(imagePath);
  }

  const remoteUrl = resolveRemoteImageUrl(imagePath);
  return fetchRemoteImageAsDataUri(remoteUrl);
}

export async function attachLineImageDataUris(
  lines: SalesDocumentPreviewPdfLineInput[]
): Promise<SalesDocumentPreviewPdfLineInput[]> {
  const dataUris = await Promise.all(lines.map((line) => resolveLineImageDataUri(line.imagePath)));

  return lines.map((line, index) => ({
    ...line,
    imageDataUri: dataUris[index],
  }));
}
