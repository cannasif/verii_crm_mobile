import Constants from "expo-constants";
import { Platform } from "react-native";

interface AppInfo {
  version: string;
  versionCode: number;
  runtimeVersion: string;
}

export function getAppInfo(): AppInfo {
  const expoConfig = Constants.expoConfig;
  const versionCode =
    Platform.OS === "android"
      ? expoConfig?.android?.versionCode ?? 0
      : Number(expoConfig?.ios?.buildNumber ?? 0);

  return {
    version: expoConfig?.version ?? "1.0.0",
    versionCode,
    runtimeVersion:
      typeof expoConfig?.runtimeVersion === "string"
        ? expoConfig.runtimeVersion
        : expoConfig?.version ?? "1.0.0",
  };
}
