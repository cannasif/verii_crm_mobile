import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Download04Icon,
  Rotate360Icon,
} from "hugeicons-react-native";
import type { UseQueryResult } from "@tanstack/react-query";

import { Text } from "../../../components/ui/text";
import type { VersionCheckResult } from "../../../lib/versionCheck";
import type { UpdateFlowPhase } from "../../../lib/versionCheckUi";
import { formatReleaseDate } from "../utils/formatReleaseDate";
import { UpdateProgressBar } from "./UpdateProgressBar";

interface AppInfo {
  version: string;
  versionCode: number;
}

interface ReleaseNotesScreenContentProps {
  isDarkMode: boolean;
  appInfo: AppInfo;
  releaseQuery: UseQueryResult<VersionCheckResult | null, Error>;
  updateFlowPhase: UpdateFlowPhase;
  downloadProgress: number;
  isInstallingUpdate: boolean;
  onBack: () => void;
  onInstall: () => void;
  onRefetch: () => void;
}

export function ReleaseNotesScreenContent({
  isDarkMode,
  appInfo,
  releaseQuery,
  updateFlowPhase,
  downloadProgress,
  isInstallingUpdate,
  onBack,
  onInstall,
  onRefetch,
}: ReleaseNotesScreenContentProps): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const backgroundColor = isDarkMode ? "#0c0516" : "#F8FAFC";
  const cardBg = isDarkMode ? "rgba(15, 23, 42, 0.88)" : "#FFFFFF";
  const borderColor = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(226,232,240,0.95)";
  const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
  const textColor = isDarkMode ? "#F8FAFC" : "#0F172A";
  const accent = isDarkMode ? "#EC4899" : "#DB2777";
  const accentSoft = isDarkMode ? "rgba(236, 72, 153, 0.16)" : "rgba(219, 39, 119, 0.1)";
  const progressTrack = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)";
  const gradientColors = (
    isDarkMode
      ? ["rgba(236,72,153,0.16)", "rgba(12,5,22,0.95)", "rgba(249,115,22,0.12)"]
      : ["rgba(255,235,240,0.95)", "#FFFFFF", "rgba(255,244,230,0.9)"]
  ) as [string, string, ...string[]];

  const latestVersion = releaseQuery.data?.latestVersion;
  const updateAvailable = Boolean(releaseQuery.data?.updateAvailable);
  const forceUpdate = Boolean(releaseQuery.data?.forceUpdate);
  const isUpToDate = !releaseQuery.isLoading && !releaseQuery.isError && !updateAvailable;

  const statusLabel = forceUpdate
    ? t("updates.statusRequired")
    : updateAvailable
      ? t("updates.statusAvailable")
      : t("updates.statusCurrent");

  const statusColors = forceUpdate
    ? { bg: "rgba(249, 115, 22, 0.16)", text: "#F97316", border: "rgba(249, 115, 22, 0.35)" }
    : updateAvailable
      ? { bg: accentSoft, text: accent, border: isDarkMode ? "rgba(236,72,153,0.35)" : "rgba(219,39,119,0.25)" }
      : { bg: "rgba(16, 185, 129, 0.12)", text: "#10B981", border: "rgba(16, 185, 129, 0.28)" };

  const primaryCtaLabel =
    updateFlowPhase === "downloading"
      ? t("updates.downloadingAction")
      : updateFlowPhase === "installing"
        ? t("updates.installingAction")
        : t("updates.installNow");

  return (
    <View style={[styles.screen, { backgroundColor }]}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 20) + 28,
          paddingHorizontal: 20,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backButton, { backgroundColor: cardBg, borderColor }]}
            onPress={onBack}
          >
            <ArrowLeft01Icon size={20} color={accent} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text bold size="xl" style={{ color: textColor }}>
              {t("updates.notesTitle")}
            </Text>
            <Text style={{ color: mutedColor }}>{t("updates.notesSubtitle")}</Text>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.versionCompareRow}>
            <View style={styles.versionColumn}>
              <Text size="sm" style={{ color: mutedColor }}>
                {t("updates.installedVersion")}
              </Text>
              <Text bold size="2xl" style={{ color: textColor, marginTop: 6 }}>
                v{appInfo.version}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: borderColor }]} />

            <View style={styles.versionColumn}>
              <Text size="sm" style={{ color: mutedColor }}>
                {t("updates.latestVersionShort")}
              </Text>
              <Text bold size="2xl" style={{ color: accent, marginTop: 6 }}>
                {latestVersion ? `v${latestVersion}` : "—"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: statusColors.bg,
                borderColor: statusColors.border,
              },
            ]}
          >
            {isUpToDate ? (
              <CheckmarkCircle02Icon size={16} color={statusColors.text} variant="stroke" />
            ) : (
              <Download04Icon size={16} color={statusColors.text} variant="stroke" />
            )}
            <Text size="sm" bold style={{ color: statusColors.text }}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {releaseQuery.isLoading ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <ActivityIndicator color={accent} />
            <Text bold style={{ color: textColor, marginTop: 14 }}>
              {t("updates.loadingTitle")}
            </Text>
            <Text style={{ color: mutedColor, marginTop: 8 }}>{t("updates.loadingDescription")}</Text>
          </View>
        ) : releaseQuery.isError ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text bold style={{ color: textColor }}>
              {t("updates.errorTitle")}
            </Text>
            <Text style={{ color: mutedColor, marginTop: 8 }}>{t("updates.errorDescription")}</Text>
            <Pressable
              style={[styles.outlineButton, { borderColor: accent, marginTop: 16 }]}
              onPress={onRefetch}
            >
              <Rotate360Icon size={18} color={accent} />
              <Text bold style={{ color: accent }}>
                {t("common.retry")}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <Text bold style={{ color: textColor }}>
                {t("updates.releaseNotesSection")}
              </Text>
              {releaseQuery.data?.publishedAtUtc ? (
                <Text size="sm" style={{ color: mutedColor, marginTop: 6 }}>
                  {t("updates.publishedAt", {
                    value: formatReleaseDate(releaseQuery.data.publishedAtUtc),
                  })}
                </Text>
              ) : null}
              <Text style={[styles.notesBody, { color: mutedColor }]}>
                {releaseQuery.data?.releaseNotes || t("updates.noNotes")}
              </Text>
            </View>

            {updateFlowPhase === "downloading" ? (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <UpdateProgressBar
                  progress={downloadProgress}
                  label={t("updates.downloadingTitle")}
                  trackColor={progressTrack}
                  fillColor={accent}
                  textColor={mutedColor}
                />
              </View>
            ) : null}

            {updateAvailable ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryCta,
                  { backgroundColor: accent, opacity: pressed || isInstallingUpdate ? 0.88 : 1 },
                ]}
                hitSlop={12}
                onPress={onInstall}
                disabled={isInstallingUpdate}
              >
                <Download04Icon size={20} color="#FFFFFF" variant="stroke" />
                <Text bold style={styles.primaryCtaText}>
                  {primaryCtaLabel}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.card, styles.upToDateCard, { backgroundColor: cardBg, borderColor }]}>
                <CheckmarkCircle02Icon size={22} color="#10B981" variant="stroke" />
                <Text style={{ color: mutedColor, flex: 1 }}>{t("updates.upToDate")}</Text>
              </View>
            )}

            {!forceUpdate ? (
              <Pressable
                style={[styles.outlineButton, { borderColor, backgroundColor: cardBg }]}
                onPress={onRefetch}
                disabled={isInstallingUpdate}
              >
                <Rotate360Icon size={18} color={accent} />
                <Text style={{ color: mutedColor }}>{t("updates.checkNow")}</Text>
              </Pressable>
            ) : (
              <Text style={{ color: mutedColor, textAlign: "center" }}>{t("updates.forceDescription")}</Text>
            )}
          </>
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
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  versionCompareRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  versionColumn: {
    flex: 1,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    marginHorizontal: 14,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    alignItems: "flex-start",
  },
  notesBody: {
    marginTop: 14,
    lineHeight: 24,
    fontSize: 15,
  },
  primaryCta: {
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 3,
    zIndex: 2,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  upToDateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
