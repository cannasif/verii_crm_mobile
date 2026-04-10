import { Platform } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import * as FileSystem from "expo-file-system/legacy";
import { apiClient } from "./axios";
import { getAppInfo } from "./appInfo";

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 268435456;

export interface VersionCheckResult {
  platform: string;
  currentVersion: string;
  currentVersionCode: number;
  runtimeVersion: string;
  latestVersion: string;
  latestVersionCode: number;
  minimumSupportedVersion: string;
  minimumSupportedVersionCode: number;
  updateAvailable: boolean;
  forceUpdate: boolean;
  updateType: string;
  apkUrl: string;
  releaseNotes: string;
  publishedAtUtc?: string;
}

interface VersionCheckApiResponse {
  success: boolean;
  message: string;
  exceptionMessage?: string;
  data?: VersionCheckResult;
}

export interface ApkDownloadProgress {
  receivedBytes: number;
  totalBytes: number;
  progress: number;
}

const APK_UPDATES_DIRECTORY = `${FileSystem.cacheDirectory}updates`;

export async function fetchVersionCheck(): Promise<VersionCheckResult | null> {
  if (Platform.OS !== "android") {
    return null;
  }

  const appInfo = getAppInfo();
  const response = await apiClient.get<VersionCheckApiResponse>("/api/mobile/version-check", {
    params: {
      platform: Platform.OS,
      appVersion: appInfo.version,
      versionCode: appInfo.versionCode,
      runtimeVersion: appInfo.runtimeVersion,
    },
  });

  return response.data.data ?? null;
}

export async function fetchLatestReleaseInfo(): Promise<VersionCheckResult | null> {
  return fetchVersionCheck();
}

export async function cleanupCachedApkUpdates(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  const directoryInfo = await FileSystem.getInfoAsync(APK_UPDATES_DIRECTORY);
  if (!directoryInfo.exists) {
    return;
  }

  const entries = await FileSystem.readDirectoryAsync(APK_UPDATES_DIRECTORY);
  await Promise.all(
    entries
      .filter((entry) => entry.toLowerCase().endsWith(".apk"))
      .map((entry) => FileSystem.deleteAsync(`${APK_UPDATES_DIRECTORY}/${entry}`, { idempotent: true })),
  );
}

export async function downloadAndInstallAndroidApk(
  apkUrl: string,
  onProgress?: (progress: ApkDownloadProgress) => void,
): Promise<void> {
  if (!apkUrl) {
    throw new Error("APK URL is empty.");
  }

  if (Platform.OS !== "android") {
    throw new Error("APK install flow is only supported on Android.");
  }

  const fileName = extractApkFileName(apkUrl);
  const fileUri = `${APK_UPDATES_DIRECTORY}/${fileName}`;

  await cleanupCachedApkUpdates();
  await FileSystem.makeDirectoryAsync(APK_UPDATES_DIRECTORY, { intermediates: true });

  const downloadTask = FileSystem.createDownloadResumable(apkUrl, fileUri, {}, (event) => {
    const progress = event.totalBytesExpectedToWrite
      ? event.totalBytesWritten / event.totalBytesExpectedToWrite
      : 0;

    onProgress?.({
      receivedBytes: event.totalBytesWritten,
      totalBytes: event.totalBytesExpectedToWrite,
      progress,
    });
  });

  const downloadResult = await downloadTask.downloadAsync();
  if (!downloadResult?.uri) {
    throw new Error("APK download did not complete.");
  }

  onProgress?.({
    receivedBytes: 1,
    totalBytes: 1,
    progress: 1,
  });

  const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);

  try {
    await IntentLauncher.startActivityAsync("android.intent.action.INSTALL_PACKAGE", {
      data: contentUri,
      flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
      type: "application/vnd.android.package-archive",
    });
  } catch {
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
        type: "application/vnd.android.package-archive",
      });
    } catch {
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
        flags: FLAG_ACTIVITY_NEW_TASK,
      });
      throw new Error("Install permission is required for APK updates.");
    }
  }
}

function extractApkFileName(apkUrl: string): string {
  const cleanUrl = apkUrl.split("?")[0] ?? apkUrl;
  const segment = cleanUrl.split("/").pop();
  return segment && segment.endsWith(".apk") ? segment : "verii-crm-latest.apk";
}
