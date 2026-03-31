import { NativeModules, Platform } from "react-native";
import { normalizeLocalMediaUri } from "../../../lib/mediaUri";

type NativeImageProcessorModule = {
  rotateAndDeskew: (imageUri: string, rotationDegrees: number) => Promise<string>;
  createPreview: (imageUri: string, maxDimension: number) => Promise<string>;
  pickImageFromGallery: () => Promise<{ status: "picked" | "cancelled"; uri?: string | null } | null>;
};

export type NativeGalleryPickResult =
  | { status: "picked"; uri: string }
  | { status: "cancelled" }
  | { status: "unavailable" };

function getNativeModule(): NativeImageProcessorModule | null {
  const module = NativeModules.BusinessCardImageProcessor as NativeImageProcessorModule | undefined;
  if (!module || typeof module.rotateAndDeskew !== "function") {
    return null;
  }
  return module;
}

export async function createBusinessCardPreviewImage(
  imageUri: string,
  maxDimension = 360
): Promise<string> {
  if (!imageUri) {
    return imageUri;
  }

  if (Platform.OS !== "android") {
    return imageUri;
  }

  const nativeModule = getNativeModule();
  if (!nativeModule || typeof nativeModule.createPreview !== "function") {
    return imageUri;
  }

  try {
    const nextUri = await nativeModule.createPreview(imageUri, maxDimension);
    return normalizeLocalMediaUri(nextUri);
  } catch {
    return imageUri;
  }
}

export async function pickBusinessCardImageFromNativeGallery(): Promise<NativeGalleryPickResult> {
  if (Platform.OS !== "android") {
    return { status: "unavailable" };
  }

  const nativeModule = getNativeModule();
  if (!nativeModule || typeof nativeModule.pickImageFromGallery !== "function") {
    return { status: "unavailable" };
  }

  try {
    const picked = await nativeModule.pickImageFromGallery();
    if (!picked) {
      return { status: "unavailable" };
    }
    if (picked.status === "cancelled") {
      return { status: "cancelled" };
    }

    const pickedUri = picked.uri ? normalizeLocalMediaUri(picked.uri) : null;
    if (!pickedUri) {
      return { status: "cancelled" };
    }

    return { status: "picked", uri: pickedUri };
  } catch {
    return { status: "unavailable" };
  }
}

export async function rotateAndDeskewBusinessCardImage(
  imageUri: string,
  rotationDegrees: number | null | undefined
): Promise<string> {
  if (!imageUri || typeof rotationDegrees !== "number" || !Number.isFinite(rotationDegrees) || Math.abs(rotationDegrees) < 0.5) {
    return imageUri;
  }

  if (Platform.OS !== "android") {
    return imageUri;
  }

  const nativeModule = getNativeModule();
  if (!nativeModule) {
    return imageUri;
  }

  try {
    const nextUri = await nativeModule.rotateAndDeskew(imageUri, rotationDegrees);
    return normalizeLocalMediaUri(nextUri);
  } catch {
    return imageUri;
  }
}
