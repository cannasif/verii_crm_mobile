import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { ArrowLeft01Icon } from "hugeicons-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/ui/text";
import { useUIStore } from "../store/ui";
import { getCurrentLanguage } from "../locales";
import { getAppInfo } from "../lib/appInfo";
import { downloadAndInstallAndroidApk, fetchLatestReleaseInfo } from "../lib/versionCheck";
import { useToast } from "../hooks/useToast";

function formatLocalizedDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const language = getCurrentLanguage();
  const locale = language === "de" ? "de-DE" : language === "en" ? "en-GB" : "tr-TR";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ReleaseNotesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { showError } = useToast();
  const { themeMode } = useUIStore();
  const appInfo = useMemo(() => getAppInfo(), []);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const isDarkMode = themeMode === "dark";
  const backgroundColor = isDarkMode ? "#0c0516" : "#F8FAFC";
  const cardBg = isDarkMode ? "rgba(15, 23, 42, 0.88)" : "#FFFFFF";
  const borderColor = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(226,232,240,0.95)";
  const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
  const accent = isDarkMode ? "#EC4899" : "#DB2777";
  const gradientColors = (
    isDarkMode
      ? ["rgba(236,72,153,0.16)", "rgba(12,5,22,0.95)", "rgba(249,115,22,0.12)"]
      : ["rgba(255,235,240,0.95)", "#FFFFFF", "rgba(255,244,230,0.9)"]
  ) as [string, string, ...string[]];

  const releaseQuery = useQuery({
    queryKey: ["mobile-release-notes"],
    queryFn: fetchLatestReleaseInfo,
  });

  useEffect(() => {
    if (releaseQuery.data?.forceUpdate) {
      router.setParams({ forceUpdate: "true" });
    }
  }, [releaseQuery.data?.forceUpdate]);

  const handleInstall = async (): Promise<void> => {
    const apkUrl = releaseQuery.data?.apkUrl;
    if (!apkUrl) {
      return;
    }

    setIsInstallingUpdate(true);
    setDownloadProgress(0);

    try {
      await downloadAndInstallAndroidApk(apkUrl, (progress) => {
        setDownloadProgress(progress.progress);
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : t("updates.openFailed"));
    } finally {
      setIsInstallingUpdate(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: Math.max(insets.bottom, 20) + 28,
          paddingHorizontal: 20,
          gap: 18,
        }}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={[
              styles.backButton,
              { backgroundColor: cardBg, borderColor },
            ]}
            onPress={() => router.back()}
          >
            <ArrowLeft01Icon size={20} color={accent} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text bold size="xl">
              {t("updates.notesTitle")}
            </Text>
            <Text style={{ color: mutedColor }}>{t("updates.notesSubtitle")}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text bold>{t("updates.installedVersion")}</Text>
          <Text style={{ color: mutedColor, marginTop: 8 }}>{appInfo.version}</Text>
        </View>

        {releaseQuery.isLoading ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text bold>{t("updates.loadingTitle")}</Text>
            <Text style={{ color: mutedColor, marginTop: 8 }}>{t("updates.loadingDescription")}</Text>
          </View>
        ) : releaseQuery.isError ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text bold>{t("updates.errorTitle")}</Text>
            <Text style={{ color: mutedColor, marginTop: 8 }}>{t("updates.errorDescription")}</Text>
            <Text style={[styles.actionText, { color: accent, marginTop: 14 }]} onPress={() => void releaseQuery.refetch()}>
              {t("common.retry")}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text bold>{t("updates.latestVersionLabel", { version: releaseQuery.data?.latestVersion ?? "-" })}</Text>
            {releaseQuery.data?.publishedAtUtc ? (
              <Text style={{ color: mutedColor, marginTop: 8 }}>
                {t("updates.publishedAt", {
                  value: formatLocalizedDateTime(releaseQuery.data.publishedAtUtc),
                })}
              </Text>
            ) : null}
            <Text style={{ color: mutedColor, marginTop: 14 }}>
              {releaseQuery.data?.releaseNotes || t("updates.noNotes")}
            </Text>

            {!releaseQuery.data?.forceUpdate ? (
              <Text style={[styles.actionText, { color: accent, marginTop: 16 }]} onPress={() => void releaseQuery.refetch()}>
                {t("updates.checkNow")}
              </Text>
            ) : null}

            {releaseQuery.data?.updateAvailable ? (
              <Text
                style={[styles.actionText, { color: accent, marginTop: 16 }]}
                onPress={() => {
                  if (!isInstallingUpdate) {
                    void handleInstall();
                  }
                }}
              >
                {isInstallingUpdate
                  ? t("updates.installingDescription", { percent: Math.round(downloadProgress * 100) })
                  : t("updates.installNow")}
              </Text>
            ) : (
              <Text style={{ color: mutedColor, marginTop: 16 }}>{t("updates.upToDate")}</Text>
            )}

            {releaseQuery.data?.forceUpdate ? (
              <Text style={{ color: mutedColor, marginTop: 14 }}>{t("updates.forceDescription")}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerTextWrap: {
    flex: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
