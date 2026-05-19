import { getApiBaseUrl } from "@/constants/config";

export function getImageUrl(filePath?: string | null): string {
  const value = String(filePath ?? "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl}${path}`;
}
