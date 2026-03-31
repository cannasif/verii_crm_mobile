import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { normalizeLocalMediaUri } from "../../../lib/mediaUri";
import { pickBusinessCardImageFromNativeGallery } from "./businessCardNativeImageProcessor";

const pickedImageCache = new Map<string, string>();

function getUriScheme(uri: string): string {
  const match = uri.match(/^([a-z]+):\/\//i);
  return match?.[1]?.toLowerCase() ?? (uri.startsWith("/") ? "path" : "unknown");
}

function getUriAuthority(uri: string): string | null {
  const match = uri.match(/^[a-z]+:\/\/([^/]+)/i);
  return match?.[1] ?? null;
}

function guessExtension(uri: string, mimeType?: string | null): string {
  const mimeExtension = mimeType?.split("/").pop()?.trim().toLowerCase();
  if (mimeExtension && /^[a-z0-9]{2,5}$/.test(mimeExtension)) return mimeExtension === "jpeg" ? "jpg" : mimeExtension;
  const cleaned = uri.split("?")[0]?.split("#")[0] ?? uri;
  const ext = cleaned.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  return "jpg";
}

async function materializePickedImageToLocalCache(imageUri: string, mimeType?: string | null): Promise<string> {
  const normalizedUri = normalizeLocalMediaUri(imageUri);
  const scheme = getUriScheme(normalizedUri);
  const authority = getUriAuthority(normalizedUri);
  console.log("[BusinessCardScan] picked_uri", {
    picked_uri_scheme: scheme,
    picked_uri_authority: authority,
    uri: normalizedUri,
  });

  if (!normalizedUri.startsWith("content://")) {
    return normalizedUri;
  }

  const cached = pickedImageCache.get(normalizedUri);
  if (cached) {
    console.log("[BusinessCardScan] cached_local_uri_created", {
      cached_local_uri_created: true,
      reused: true,
      localUri: cached,
    });
    return cached;
  }

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    return normalizedUri;
  }

  const targetUri = `${baseDir}business-card-picked-${Date.now()}.${guessExtension(normalizedUri, mimeType)}`;
  const startedAt = Date.now();
  await FileSystem.copyAsync({ from: normalizedUri, to: targetUri });
  pickedImageCache.set(normalizedUri, targetUri);
  console.log("[BusinessCardScan] cached_local_uri_created", {
    cached_local_uri_created: true,
    cache_copy_time: Date.now() - startedAt,
    localUri: targetUri,
  });
  return targetUri;
}

async function normalizeImageUri(imageUri: string, mimeType?: string | null): Promise<string> {
  if (!imageUri) {
    throw new Error("Selected image could not be found.");
  }
  return materializePickedImageToLocalCache(imageUri, mimeType);
}

async function normalizePickedImageAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  return normalizeImageUri(asset?.uri, asset?.mimeType);
}

export async function captureBusinessCardFromCamera(): Promise<{ imageUri: string | null; usedScanner: boolean }> {
  let status = await ImagePicker.getCameraPermissionsAsync();
  if (!status.granted) {
    status = await ImagePicker.requestCameraPermissionsAsync();
  }
  if (!status.granted) {
    throw new Error("CAMERA_PERMISSION_REQUIRED");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return { imageUri: null, usedScanner: false };
  }

  return {
    imageUri: await normalizePickedImageAsset(result.assets[0]),
    usedScanner: false,
  };
}

export async function pickBusinessCardImageFromGallery(): Promise<string | null> {
  let status = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!status.granted) {
    status = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (!status.granted) {
    throw new Error("MEDIA_LIBRARY_PERMISSION_REQUIRED");
  }

  if (Platform.OS === "android") {
    const nativePickResult = await pickBusinessCardImageFromNativeGallery();
    if (nativePickResult.status === "picked") {
      return await normalizeImageUri(nativePickResult.uri);
    }
    if (nativePickResult.status === "cancelled") {
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    legacy: Platform.OS === "android",
    allowsEditing: false,
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return await normalizePickedImageAsset(result.assets[0]);
}
