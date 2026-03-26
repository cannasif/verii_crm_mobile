import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { normalizeLocalMediaUri } from "../../../lib/mediaUri";

async function normalizeImageUri(imageUri: string, mimeType?: string | null): Promise<string> {
  if (!imageUri) {
    throw new Error("Selected image could not be found.");
  }
  void mimeType;
  return normalizeLocalMediaUri(imageUri);
}

async function normalizePickedImageAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  return normalizeImageUri(asset?.uri, asset?.mimeType);
}

type ScannerModule = {
  scanDocument: (options?: Record<string, unknown>) => Promise<{
    scannedImages?: string[];
    images?: string[];
    status?: string;
  }>;
};

function getScannerModule(): ScannerModule | null {
  try {
    const loaded = require("react-native-document-scanner-plugin") as { default?: ScannerModule } & Partial<ScannerModule>;
    if (typeof loaded.scanDocument === "function") {
      return { scanDocument: loaded.scanDocument };
    }
    if (loaded.default && typeof loaded.default.scanDocument === "function") {
      return loaded.default;
    }
    return null;
  } catch {
    return null;
  }
}

export async function captureBusinessCardFromCamera(): Promise<{ imageUri: string | null; usedScanner: boolean }> {
  const scanner = getScannerModule();
  if (scanner?.scanDocument) {
    try {
      const result = await scanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 100,
        responseType: "imageFilePath",
      });
      if (result.status === "cancel") {
        return { imageUri: null, usedScanner: true };
      }
      const imageUri = result.scannedImages?.[0] ?? result.images?.[0] ?? null;
      if (imageUri) {
        return { imageUri: await normalizeImageUri(imageUri), usedScanner: true };
      }
    } catch {
      // Fall back to plain camera capture below.
    }
  }

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
