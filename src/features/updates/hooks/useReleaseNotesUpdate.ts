import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getAppInfo } from "../../../lib/appInfo";
import {
  downloadAndInstallAndroidApk,
  fetchLatestReleaseInfo,
  resolveApkUpdateErrorMessage,
} from "../../../lib/versionCheck";
import type { UpdateFlowPhase } from "../../../lib/versionCheckUi";
import { useToast } from "../../../hooks/useToast";

const RELEASE_NOTES_STALE_MS = 60_000;

export function useReleaseNotesUpdate() {
  const { t } = useTranslation();
  const { showError } = useToast();
  const appInfo = useMemo(() => getAppInfo(), []);
  const [updateFlowPhase, setUpdateFlowPhase] = useState<UpdateFlowPhase>("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);

  const releaseQuery = useQuery({
    queryKey: ["mobile", "release-notes"],
    queryFn: fetchLatestReleaseInfo,
    staleTime: RELEASE_NOTES_STALE_MS,
  });

  const handleInstall = useCallback(async (): Promise<void> => {
    const apkUrl = releaseQuery.data?.apkUrl;
    if (!apkUrl) {
      return;
    }

    setUpdateFlowPhase("downloading");
    setDownloadProgress(0);

    try {
      await downloadAndInstallAndroidApk(apkUrl, {
        onProgress: (progress) => {
          setDownloadProgress(progress.progress);
        },
        onPhase: (phase) => {
          setUpdateFlowPhase(phase);
        },
      });
    } catch (error) {
      showError(resolveApkUpdateErrorMessage(error, t));
    } finally {
      setUpdateFlowPhase("idle");
    }
  }, [releaseQuery.data?.apkUrl, showError, t]);

  return {
    appInfo,
    releaseQuery,
    updateFlowPhase,
    downloadProgress,
    isInstallingUpdate: updateFlowPhase !== "idle",
    handleInstall,
  };
}
