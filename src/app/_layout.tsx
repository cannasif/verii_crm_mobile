import "../lib/suppressConsoleErrors";
import "react-native-gesture-handler";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, InteractionManager, LogBox, StyleSheet, View } from "react-native";
import { Stack, router, usePathname } from "expo-router";
import { enableFreeze } from "react-native-screens";

enableFreeze(true);
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
import { useSystemSettingsStore } from "../store/system-settings";
import { Sidebar } from "../components/navigation/Sidebar";
import { AppHeader } from "../components/navigation/AppHeader";
import i18n, { initLanguage } from "../locales";
import { initializeApiClient } from "../lib/axios";
import { getSystemSettings } from "../features/system-settings/api/systemSettingsApi";
import { authAccessApi } from "../features/access-control/api/authAccessApi";
import { applySystemLanguageIfNeeded } from "../lib/systemSettings";
import {
  cleanupCachedApkUpdates,
  downloadAndInstallAndroidApk,
  fetchVersionCheck,
  resolveApkUpdateErrorMessage,
  type VersionCheckResult,
} from "../lib/versionCheck";
import type { UpdateFlowPhase } from "../lib/versionCheckUi";
import { UpdateAvailableModal } from "../features/updates";
import { clearPerfMarks, perfMark, perfMeasure, perfMeasureOnNextPaint } from "../lib/perf-metrics";
import { realtimeAccessControlService } from "../lib/realtime-access-control";
import "../../global.css";

const VERSION_CHECK_INTERVAL_MS = 1000 * 60 * 30;
const ACCESS_CONTROL_REFRESH_INTERVAL_MS = 1000 * 60 * 2;

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
  /unsupported SVG element.*ellipse/i,
]);

export default function RootLayout(): React.ReactElement {
  const hydrate = useAuthStore((state) => state.hydrate);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const pathname = usePathname();
  const themeMode = useUIStore((state) => state.themeMode);
  const colors = useUIStore((state) => state.colors);
  const showToast = useToastStore((state) => state.showToast);
  const token = useAuthStore((state) => state.token);
  const setPermissions = useAuthStore((state) => state.setPermissions);
  const setSystemSettings = useSystemSettingsStore((state) => state.setSettings);
  const [versionState, setVersionState] = useState<VersionCheckResult | null>(null);
  const [updateFlowPhase, setUpdateFlowPhase] = useState<UpdateFlowPhase>("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const isInstallingUpdate = updateFlowPhase !== "idle";
  const lastVersionCheckAtRef = useRef<number>(0);
  const lastAccessControlRefreshAtRef = useRef<number>(0);

  useEffect(() => {
    perfMark("app:mount");

    perfMark("app:auth_hydrate_start");
    void hydrate()
      .then(() => {
        perfMark("app:auth_hydrate_end");
        void perfMeasure("app:auth_hydrate", "app:auth_hydrate_start", "app:auth_hydrate_end");
      })
      .catch(() => undefined);

    perfMark("app:language_init_start");
    void initLanguage()
      .then(() => {
        perfMark("app:language_init_end");
        void perfMeasure("app:language_init", "app:language_init_start", "app:language_init_end");
      })
      .catch(() => undefined);

    perfMark("app:api_client_init_start");
    void initializeApiClient()
      .then(() => {
        perfMark("app:api_client_init_end");
        void perfMeasure("app:api_client_init", "app:api_client_init_start", "app:api_client_init_end");
      })
      .catch((error) => {
        console.warn("API base URL initialize failed", error);
      });
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    perfMeasureOnNextPaint("app:mount_to_hydrated_paint", "app:mount", "app:hydrated_paint");

    return () => {
      clearPerfMarks(
        "app:mount",
        "app:hydrated_paint",
        "app:settings_ready",
        "app:auth_hydrate_start",
        "app:auth_hydrate_end",
        "app:language_init_start",
        "app:language_init_end",
        "app:api_client_init_start",
        "app:api_client_init_end",
        "app:settings_fetch_start",
        "app:settings_fetch_end",
        "app:system_language_apply_start",
        "app:system_language_apply_end",
      );
    };
  }, [isHydrated]);

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

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      void cleanupCachedApkUpdates().catch(() => undefined);
      void runVersionCheck(true);
    });

    return () => {
      interactionTask.cancel();
    };
  }, [isHydrated, runVersionCheck]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapPermissions(force = false): Promise<void> {
      if (!isHydrated || !token) return;
      const now = Date.now();
      if (!force && now - lastAccessControlRefreshAtRef.current < ACCESS_CONTROL_REFRESH_INTERVAL_MS) {
        return;
      }

      try {
        const nextPermissions = await authAccessApi.getMyPermissions();
        if (cancelled) return;
        lastAccessControlRefreshAtRef.current = now;
        await setPermissions(nextPermissions);
      } catch {
        // Permissions refresh should not block startup; stored permissions remain as fallback.
      }
    }

    async function bootstrapSystemSettings(): Promise<void> {
      if (!isHydrated || !token) return;

      try {
        perfMark("app:settings_fetch_start");
        const settings = await getSystemSettings();
        perfMark("app:settings_fetch_end");
        void perfMeasure("app:settings_fetch", "app:settings_fetch_start", "app:settings_fetch_end");
        if (cancelled) return;
        setSystemSettings(settings);

        perfMark("app:system_language_apply_start");
        await applySystemLanguageIfNeeded();
        perfMark("app:system_language_apply_end");
        void perfMeasure(
          "app:system_language_apply",
          "app:system_language_apply_start",
          "app:system_language_apply_end",
        );
        perfMark("app:settings_ready");
        perfMeasureOnNextPaint(
          "app:mount_to_settings_ready_paint",
          "app:mount",
          "app:settings_ready_paint",
        );
      } catch {
        // System settings should not block the app.
      }
    }

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      void bootstrapPermissions(true);
      void bootstrapSystemSettings();
    });

    return () => {
      cancelled = true;
      interactionTask.cancel();
    };
  }, [isHydrated, setPermissions, setSystemSettings, token]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void (token ? realtimeAccessControlService.connect(token) : realtimeAccessControlService.disconnect()).catch(() => undefined);

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void runVersionCheck();
        if (token) {
          void realtimeAccessControlService.connect(token).catch(() => undefined);
        }
        void Promise.all([authAccessApi.getMyPermissions(), getSystemSettings()])
          .then(async ([permissions, settings]) => {
            await setPermissions(permissions);
            setSystemSettings(settings);
            await applySystemLanguageIfNeeded();
            lastAccessControlRefreshAtRef.current = Date.now();
          })
          .catch(() => undefined);
      } else {
        void realtimeAccessControlService.disconnect().catch(() => undefined);
      }
    });

    const interval = setInterval(() => {
      void runVersionCheck();
    }, VERSION_CHECK_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
      void realtimeAccessControlService.disconnect().catch(() => undefined);
    };
  }, [isHydrated, runVersionCheck, setPermissions, setSystemSettings, token]);

  const handleOpenDetails = useCallback(() => {
    setVersionState(null);
    router.push("/release-notes");
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    if (!versionState?.apkUrl) {
      return;
    }

    setUpdateFlowPhase("downloading");
    setDownloadProgress(0);

    try {
      await downloadAndInstallAndroidApk(versionState.apkUrl, {
        onProgress: (progress) => {
          setDownloadProgress(progress.progress);
        },
        onPhase: (phase) => {
          setUpdateFlowPhase(phase);
        },
      });
      setVersionState(null);
    } catch (error) {
      showToast("error", resolveApkUpdateErrorMessage(error, i18n.t.bind(i18n)));
    } finally {
      setUpdateFlowPhase("idle");
    }
  }, [showToast, versionState]);

  const isAuthScreen = pathname.includes("/(auth)") || pathname === "/login";
  const isDark = themeMode === "dark";
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
              <UpdateAvailableModal
                visible={Boolean(versionState)}
                versionState={versionState}
                updateFlowPhase={updateFlowPhase}
                downloadProgress={downloadProgress}
                isDark={isDark}
                textSecondary={colors.textSecondary}
                onClose={() => setVersionState(null)}
                onOpenDetails={handleOpenDetails}
                onInstall={() => {
                  void handleInstallUpdate();
                }}
              />
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

