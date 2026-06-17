import { Linking, Platform } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import * as FileSystem from "expo-file-system/legacy";
import { apiClient } from "./axios";
import { getAppInfo } from "./appInfo";

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 268435456;
const APK_MIME_TYPE = "application/vnd.android.package-archive";
const MIN_APK_BYTES = 50 * 1024 * 1024;

export type ApkUpdatePhase = "downloading" | "installing";

export type ApkUpdateErrorCode =
  | "empty_url"
  | "unsupported_platform"
  | "download_failed"
  | "download_incomplete"
  | "install_failed";

export class ApkUpdateError extends Error {
  readonly code: ApkUpdateErrorCode;

  constructor(code: ApkUpdateErrorCode) {
    super(code);
    this.name = "ApkUpdateError";
    this.code = code;
  }
}

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

export interface ApkInstallCallbacks {
  onProgress?: (progress: ApkDownloadProgress) => void;
  onPhase?: (phase: ApkUpdatePhase) => void;
}

const APK_UPDATES_DIRECTORY = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}updates`;

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
  callbacks?: ApkInstallCallbacks,
): Promise<void> {
  if (!apkUrl) {
    throw new ApkUpdateError("empty_url");
  }

  if (Platform.OS !== "android") {
    throw new ApkUpdateError("unsupported_platform");
  }

  callbacks?.onPhase?.("downloading");

  const fileName = extractApkFileName(apkUrl);
  const fileUri = `${APK_UPDATES_DIRECTORY}/${fileName}`;
  let expectedBytes = 0;

  await cleanupCachedApkUpdates();
  await FileSystem.makeDirectoryAsync(APK_UPDATES_DIRECTORY, { intermediates: true });

  const downloadTask = FileSystem.createDownloadResumable(apkUrl, fileUri, {}, (event) => {
    const totalBytes = event.totalBytesExpectedToWrite;
    if (totalBytes > 0) {
      expectedBytes = totalBytes;
    }

    const progress =
      totalBytes > 0 ? Math.min(1, event.totalBytesWritten / totalBytes) : 0;

    callbacks?.onProgress?.({
      receivedBytes: event.totalBytesWritten,
      totalBytes,
      progress,
    });
  });

  let downloadResult: Awaited<ReturnType<typeof downloadTask.downloadAsync>> | undefined;
  try {
    downloadResult = await downloadTask.downloadAsync();
  } catch (error) {
    if (await openApkUrlFallback(apkUrl)) {
      return;
    }
    throw error;
  }
  if (!downloadResult?.uri) {
    throw new ApkUpdateError("download_failed");
  }

  const verifiedUri = await verifyDownloadedApk(downloadResult.uri, expectedBytes);

  callbacks?.onPhase?.("installing");
  callbacks?.onProgress?.({
    receivedBytes: expectedBytes > 0 ? expectedBytes : 1,
    totalBytes: expectedBytes > 0 ? expectedBytes : 1,
    progress: 1,
  });

  const contentUri = await FileSystem.getContentUriAsync(verifiedUri);
  await launchApkInstaller(contentUri, apkUrl);
}

async function verifyDownloadedApk(fileUri: string, expectedBytes: number): Promise<string> {
  const normalizedUri = normalizeFileUri(fileUri);
  const fileInfo = await FileSystem.getInfoAsync(normalizedUri);

  if (!fileInfo.exists || !("size" in fileInfo) || typeof fileInfo.size !== "number") {
    throw new ApkUpdateError("download_incomplete");
  }

  if (fileInfo.size < MIN_APK_BYTES) {
    throw new ApkUpdateError("download_incomplete");
  }

  if (expectedBytes > 0 && fileInfo.size < expectedBytes * 0.98) {
    throw new ApkUpdateError("download_incomplete");
  }

  return normalizedUri;
}

async function launchApkInstaller(contentUri: string, apkUrl: string): Promise<void> {
  const intentParams: IntentLauncher.IntentLauncherParams = {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
    type: APK_MIME_TYPE,
  };

  const actions = ["android.intent.action.VIEW", "android.intent.action.INSTALL_PACKAGE"] as const;
  let lastError: unknown;

  for (const action of actions) {
    try {
      await IntentLauncher.startActivityAsync(action, intentParams);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
      flags: FLAG_ACTIVITY_NEW_TASK,
    });
  } catch {
    // Settings screen is best-effort when install intents fail.
  }

  if (await openApkUrlFallback(apkUrl)) {
    return;
  }

  if (lastError instanceof Error) {
    throw new ApkUpdateError("install_failed");
  }

  throw new ApkUpdateError("install_failed");
}

async function openApkUrlFallback(apkUrl: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(apkUrl);
    if (canOpen) {
      await Linking.openURL(apkUrl);
      return true;
    }
  } catch {
    // Browser fallback is best-effort; caller still reports the original update error.
  }

  return false;
}

function normalizeFileUri(fileUri: string): string {
  return fileUri.startsWith("file://") ? fileUri : `file://${fileUri}`;
}

function extractApkFileName(apkUrl: string): string {
  const cleanUrl = apkUrl.split("?")[0] ?? apkUrl;
  const segment = cleanUrl.split("/").pop();
  return segment && segment.endsWith(".apk") ? segment : "verii-crm-latest.apk";
}

export function resolveApkUpdateErrorMessage(error: unknown, translate: (key: string) => string): string {
  if (error instanceof ApkUpdateError) {
    switch (error.code) {
      case "empty_url":
        return translate("updates.emptyUrl");
      case "unsupported_platform":
        return translate("updates.unsupportedPlatform");
      case "download_failed":
        return translate("updates.downloadFailed");
      case "download_incomplete":
        return translate("updates.downloadIncomplete");
      case "install_failed":
        return translate("updates.installFailed");
      default:
        return translate("updates.openFailed");
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return translate("updates.openFailed");
}
