import React, { useEffect } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ReleaseNotesScreenContent, useReleaseNotesUpdate } from "../features/updates";
import { useUIStore } from "../store/ui";

export default function ReleaseNotesScreen(): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDarkMode = themeMode === "dark";
  const {
    appInfo,
    releaseQuery,
    updateFlowPhase,
    downloadProgress,
    isInstallingUpdate,
    handleInstall,
  } = useReleaseNotesUpdate();

  useEffect(() => {
    if (releaseQuery.data?.forceUpdate) {
      router.setParams({ forceUpdate: "true" });
    }
  }, [releaseQuery.data?.forceUpdate]);

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <ReleaseNotesScreenContent
        isDarkMode={isDarkMode}
        appInfo={appInfo}
        releaseQuery={releaseQuery}
        updateFlowPhase={updateFlowPhase}
        downloadProgress={downloadProgress}
        isInstallingUpdate={isInstallingUpdate}
        onBack={() => router.back()}
        onInstall={() => {
          void handleInstall();
        }}
        onRefetch={() => {
          void releaseQuery.refetch();
        }}
      />
    </>
  );
}
