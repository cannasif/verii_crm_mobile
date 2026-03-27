import * as FileSystem from "expo-file-system/legacy";
import { Image } from "react-native";
import {
  buildBusinessCardImageQualityAssessment,
  type BusinessCardImageQualityAssessment,
} from "./businessCardImageQualityRules";

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

export async function assessBusinessCardImageQuality(
  imageUri: string,
  options?: { usedScanner?: boolean; imageRotation?: number | null }
): Promise<BusinessCardImageQualityAssessment> {
  let width: number | null = null;
  let height: number | null = null;
  let fileSizeBytes: number | null = null;

  try {
    const size = await getImageSize(imageUri);
    width = size.width;
    height = size.height;
  } catch {
    // Leave dimensions null and continue with file-based checks.
  }

  try {
    const info = await FileSystem.getInfoAsync(imageUri);
    if (info.exists && typeof info.size === "number") {
      fileSizeBytes = info.size;
    }
  } catch {
    // File size is a soft signal; ignore if unavailable.
  }

  return buildBusinessCardImageQualityAssessment({
    width,
    height,
    fileSizeBytes,
    usedScanner: options?.usedScanner,
    imageRotation: options?.imageRotation,
  });
}
