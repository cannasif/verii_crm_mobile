import { Platform } from "react-native";

export function normalizeLocalMediaUri(uri: string | null | undefined): string {
  if (!uri) return "";

  if (
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("http://") ||
    uri.startsWith("https://") ||
    uri.startsWith("data:")
  ) {
    return uri;
  }

  if (uri.startsWith("/") && Platform.OS !== "web") {
    return `file://${uri}`;
  }

  return uri;
}
