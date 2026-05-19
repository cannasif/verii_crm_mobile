import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Download04Icon, Rocket01Icon } from "hugeicons-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "../../../components/ui/text";
import type { VersionCheckResult } from "../../../lib/versionCheck";
import type { UpdateFlowPhase } from "../../../lib/versionCheckUi";
import {
  getUpdateModalDescription,
  getUpdateModalTitle,
} from "../../../lib/versionCheckUi";
import { UpdateProgressBar } from "./UpdateProgressBar";

interface UpdateAvailableModalProps {
  visible: boolean;
  versionState: VersionCheckResult | null;
  updateFlowPhase: UpdateFlowPhase;
  downloadProgress: number;
  isDark: boolean;
  textSecondary: string;
  onClose: () => void;
  onOpenDetails: () => void;
  onInstall: () => void;
}

export function UpdateAvailableModal({
  visible,
  versionState,
  updateFlowPhase,
  downloadProgress,
  isDark,
  textSecondary,
  onClose,
  onOpenDetails,
  onInstall,
}: UpdateAvailableModalProps): React.ReactElement {
  const { t } = useTranslation();
  const isInstallingUpdate = updateFlowPhase !== "idle";
  const forceUpdate = Boolean(versionState?.forceUpdate);

  const accent = isDark ? "#EC4899" : "#DB2777";
  const accentSoft = isDark ? "rgba(236, 72, 153, 0.18)" : "rgba(219, 39, 119, 0.12)";
  const cardBg = isDark ? "rgba(15, 23, 42, 0.98)" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(226,232,240,0.95)";
  const secondaryBg = isDark ? "rgba(255,255,255,0.06)" : "#F8FAFC";
  const secondaryText = isDark ? "#E2E8F0" : "#334155";
  const progressTrack = isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)";

  const title = getUpdateModalTitle(updateFlowPhase, forceUpdate, t);
  const description = getUpdateModalDescription(
    updateFlowPhase,
    downloadProgress,
    versionState?.latestVersion,
    versionState?.releaseNotes,
    t,
  );

  const primaryLabel = useMemo(() => {
    if (updateFlowPhase === "downloading") {
      return t("updates.downloadingAction");
    }
    if (updateFlowPhase === "installing") {
      return t("updates.installingAction");
    }
    return t("updates.installNow");
  }, [t, updateFlowPhase]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!forceUpdate && !isInstallingUpdate) {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <LinearGradient
            colors={isDark ? ["rgba(236,72,153,0.35)", "rgba(15,23,42,0)"] : ["rgba(219,39,119,0.2)", "rgba(255,255,255,0)"]}
            style={styles.heroGradient}
          />

          <View style={[styles.iconBadge, { backgroundColor: accentSoft }]}>
            {forceUpdate ? (
              <Rocket01Icon size={26} color={accent} variant="stroke" />
            ) : (
              <Download04Icon size={26} color={accent} variant="stroke" />
            )}
          </View>

          <Text bold size="xl" style={styles.title}>
            {title}
          </Text>

          {versionState?.latestVersion && updateFlowPhase === "idle" ? (
            <View style={[styles.versionChip, { backgroundColor: accentSoft, borderColor: accent }]}>
              <Text size="sm" bold style={{ color: accent }}>
                {t("updates.modalVersionBadge", { version: versionState.latestVersion })}
              </Text>
            </View>
          ) : null}

          {updateFlowPhase === "downloading" ? (
            <UpdateProgressBar
              progress={downloadProgress}
              label={t("updates.downloadingTitle")}
              trackColor={progressTrack}
              fillColor={accent}
              textColor={textSecondary}
            />
          ) : null}

          <ScrollView
            style={styles.notesScroll}
            contentContainerStyle={styles.notesScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ color: textSecondary, lineHeight: 22 }}>{description}</Text>
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: accent, opacity: pressed || isInstallingUpdate ? 0.88 : 1 },
            ]}
            onPress={onInstall}
            disabled={isInstallingUpdate}
          >
            <Text bold style={styles.primaryButtonText}>
              {primaryLabel}
            </Text>
          </Pressable>

          {!forceUpdate ? (
            <View style={styles.secondaryRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { backgroundColor: secondaryBg, borderColor, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={onClose}
                disabled={isInstallingUpdate}
              >
                <Text style={{ color: secondaryText }}>{t("updates.later")}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { backgroundColor: secondaryBg, borderColor, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={onOpenDetails}
                disabled={isInstallingUpdate}
              >
                <Text style={{ color: accent }} bold>
                  {t("updates.details")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.detailsLink,
                { opacity: pressed || isInstallingUpdate ? 0.7 : 1 },
              ]}
              onPress={onOpenDetails}
              disabled={isInstallingUpdate}
            >
              <Text size="sm" style={{ color: accent }}>
                {t("updates.viewNotes")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 20,
    overflow: "hidden",
    gap: 14,
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: {
    textAlign: "center",
  },
  versionChip: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  notesScroll: {
    maxHeight: 140,
  },
  notesScrollContent: {
    paddingVertical: 2,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
});
