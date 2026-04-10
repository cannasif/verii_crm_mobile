import "../lib/suppressConsoleErrors";
import "react-native-gesture-handler";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, LogBox, Modal, Pressable, StyleSheet, View } from "react-native";
import { Stack, router, usePathname } from "expo-router";
import { I18nextProvider } from "react-i18next";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GluestackUIProvider } from "../components/ui/gluestack-ui-provider";
import { ToastContainer } from "../components/Toast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Text } from "../components/ui/text";
import { queryClient } from "../lib/queryClient";
import { useAuthStore } from "../store/auth";
import { useToastStore } from "../store/toast";
import { useUIStore } from "../store/ui";
import { Sidebar } from "../components/navigation/Sidebar";
import { AppHeader } from "../components/navigation/AppHeader";
import i18n, { initLanguage } from "../locales";
import { initializeApiClient } from "../lib/axios";
import {
  cleanupCachedApkUpdates,
  downloadAndInstallAndroidApk,
  fetchVersionCheck,
  type VersionCheckResult,
} from "../lib/versionCheck";
import "../../global.css";

const VERSION_CHECK_INTERVAL_MS = 1000 * 60 * 30;

function RootStack({
  isAuthScreen,
}: {
  isAuthScreen: boolean;
}): React.ReactElement {
  const { colors } = useUIStore();
  return (
    <View style={[rootStyles.container, { backgroundColor: colors.background }]}>
      {!isAuthScreen && <AppHeader />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { flex: 1, backgroundColor: colors.background },
        }}
      />
    </View>
  );
}

LogBox.ignoreLogs([
  /key.*spread|spread.*JSX/i,
  /React keys must be passed directly/i,
  /SafeAreaView.*deprecated/i,
  /Path|Circle/i,
]);

export default function RootLayout(): React.ReactElement {
  const hydrate = useAuthStore((state) => state.hydrate);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const pathname = usePathname();
  const themeMode = useUIStore((state) => state.themeMode);
  const colors = useUIStore((state) => state.colors);
  const showToast = useToastStore((state) => state.showToast);
  const [versionState, setVersionState] = useState<VersionCheckResult | null>(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const lastVersionCheckAtRef = useRef<number>(0);

  useEffect(() => {
    void hydrate();
    void initLanguage();
    void initializeApiClient().catch((error) => {
      console.warn("API base URL initialize failed", error);
    });
    void cleanupCachedApkUpdates().catch(() => undefined);
  }, [hydrate]);

  const runVersionCheck = useCallback(
    async (force = false) => {
      if (!isHydrated || isInstallingUpdate) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastVersionCheckAtRef.current < VERSION_CHECK_INTERVAL_MS) {
        return;
      }

      lastVersionCheckAtRef.current = now;

      try {
        const result = await fetchVersionCheck();
        if (result?.updateAvailable) {
          setVersionState(result);
        } else if (force) {
          setVersionState(null);
        }
      } catch {
        // Version check should not block app startup.
      }
    },
    [isHydrated, isInstallingUpdate],
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void runVersionCheck(true);
  }, [isHydrated, runVersionCheck]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void runVersionCheck();
      }
    });

    const interval = setInterval(() => {
      void runVersionCheck();
    }, VERSION_CHECK_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [isHydrated, runVersionCheck]);

  const handleOpenDetails = useCallback(() => {
    setVersionState(null);
    router.push("/release-notes");
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    if (!versionState?.apkUrl) {
      return;
    }

    setIsInstallingUpdate(true);
    setDownloadProgress(0);

    try {
      await downloadAndInstallAndroidApk(versionState.apkUrl, (progress) => {
        setDownloadProgress(progress.progress);
      });
      setVersionState(null);
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : i18n.t("updates.openFailed"),
      );
    } finally {
      setIsInstallingUpdate(false);
    }
  }, [showToast, versionState]);

  const isAuthScreen = pathname.includes("/(auth)") || pathname === "/login";
  const isDark = themeMode === "dark";
  const modalCardBg = isDark ? "rgba(15, 23, 42, 0.96)" : "#FFFFFF";
  const modalBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(226,232,240,0.95)";
  const secondaryBg = isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC";
  const secondaryText = isDark ? "#E2E8F0" : "#334155";
  const accent = isDark ? "#EC4899" : "#DB2777";

  if (!isHydrated) {
    return (
      <View style={[rootStyles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <GluestackUIProvider>
            <I18nextProvider i18n={i18n}>
              <RootStack isAuthScreen={isAuthScreen} />
              <Sidebar />
              <ToastContainer />
              <Modal
                visible={Boolean(versionState)}
                transparent
                animationType="fade"
                onRequestClose={() => {
                  if (!versionState?.forceUpdate && !isInstallingUpdate) {
                    setVersionState(null);
                  }
                }}
              >
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalCard, { backgroundColor: modalCardBg, borderColor: modalBorder }]}>
                    <Text bold size="xl">
                      {isInstallingUpdate
                        ? i18n.t("updates.downloadingTitle")
                        : versionState?.forceUpdate
                          ? i18n.t("updates.forceTitle")
                          : i18n.t("updates.availableTitle")}
                    </Text>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      {isInstallingUpdate
                        ? i18n.t("updates.downloadingDescription", {
                            percent: Math.round(downloadProgress * 100),
                          })
                        : versionState
                          ? i18n.t("updates.description", {
                              version: versionState.latestVersion,
                              notes: versionState.releaseNotes || i18n.t("updates.noNotes"),
                            })
                          : ""}
                    </Text>

                    <View style={styles.modalActions}>
                      {!versionState?.forceUpdate ? (
                        <Pressable
                          style={[styles.secondaryAction, { backgroundColor: secondaryBg, borderColor: modalBorder }]}
                          onPress={() => setVersionState(null)}
                          disabled={isInstallingUpdate}
                        >
                          <Text style={{ color: secondaryText }}>{i18n.t("updates.later")}</Text>
                        </Pressable>
                      ) : null}

                      <Pressable
                        style={[styles.secondaryAction, { backgroundColor: secondaryBg, borderColor: modalBorder }]}
                        onPress={handleOpenDetails}
                        disabled={isInstallingUpdate}
                      >
                        <Text style={{ color: secondaryText }}>{i18n.t("updates.details")}</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.primaryAction, { backgroundColor: accent }]}
                        onPress={() => {
                          void handleInstallUpdate();
                        }}
                        disabled={isInstallingUpdate}
                      >
                        <Text style={{ color: "#FFFFFF" }}>
                          {isInstallingUpdate
                            ? i18n.t("updates.installingNow")
                            : i18n.t("updates.installNow")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Modal>
            </I18nextProvider>
          </GluestackUIProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const rootStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  modalDescription: {
    marginTop: 12,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  secondaryAction: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryAction: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
