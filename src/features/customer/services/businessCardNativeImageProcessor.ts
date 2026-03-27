import { NativeModules, Platform } from "react-native";
import { normalizeLocalMediaUri } from "../../../lib/mediaUri";

type NativeImageProcessorModule = {
  rotateAndDeskew: (imageUri: string, rotationDegrees: number) => Promise<string>;
};

function getNativeModule(): NativeImageProcessorModule | null {
  const module = NativeModules.BusinessCardImageProcessor as NativeImageProcessorModule | undefined;
  if (!module || typeof module.rotateAndDeskew !== "function") {
    return null;
  }
  return module;
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
