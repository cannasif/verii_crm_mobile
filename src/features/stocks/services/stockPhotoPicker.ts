import { Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { MediaType } from "expo-image-picker";

export type StockPhotoPickerTranslate = (key: string) => string;

const STOCK_PICK_MEDIA: MediaType[] = ["images"];

export async function pickStockImageFromGallery(
  t: StockPhotoPickerTranslate
): Promise<string | null> {
  const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    Alert.alert(t("common.warning"), t("stock.galleryPermissionRequired"));
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: STOCK_PICK_MEDIA,
    allowsMultipleSelection: false,
    allowsEditing: false,
    selectionLimit: 1,
    quality: 0.85,
    legacy: Platform.OS === "android",
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}

export async function pickStockImageFromCamera(
  t: StockPhotoPickerTranslate
): Promise<string | null> {
  const existing = await ImagePicker.getCameraPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await ImagePicker.requestCameraPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    Alert.alert(t("common.warning"), t("stock.cameraPermissionRequired"));
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: STOCK_PICK_MEDIA,
    quality: 0.85,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}
