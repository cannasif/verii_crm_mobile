import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Download04Icon,
  Edit02Icon,
  Mail01Icon,
  Share05Icon,
} from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { OrderGetDto } from "../types";

type SheetStep = "main" | "share";

interface OrderRowActionsSheetProps {
  visible: boolean;
  order: OrderGetDto | null;
  isBusy: boolean;
  canRevise: boolean;
  isRevisionPending: boolean;
  onClose: () => void;
  onShareWhatsApp: (order: OrderGetDto) => void;
  onShareGoogle: (order: OrderGetDto) => void;
  onShareOutlook: (order: OrderGetDto) => void;
  onDownload: (order: OrderGetDto) => void;
  onRevise: (order: OrderGetDto) => void;
}

export function OrderRowActionsSheet({
  visible,
  order,
  isBusy,
  canRevise,
  isRevisionPending,
  onClose,
  onShareWhatsApp,
  onShareGoogle,
  onShareOutlook,
  onDownload,
  onRevise,
}: OrderRowActionsSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const [step, setStep] = useState<SheetStep>("main");

  useEffect(() => {
    if (!visible) {
      setStep("main");
    }
  }, [visible]);

  const palette = useMemo(
    () => ({
      sheetBg: isDark ? "#12101F" : "#FFFFFF",
      sheetBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.22)",
      text: isDark ? "#F8FAFC" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      brand: isDark ? "#EC4899" : "#DB2777",
      brandSoft: isDark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.08)",
      blue: "#38BDF8",
      blueSoft: isDark ? "rgba(56,189,248,0.12)" : "rgba(56,189,248,0.10)",
      outlook: "#0078D4",
      outlookSoft: "rgba(0,120,212,0.10)",
      green: "#25D366",
      greenSoft: "rgba(37,211,102,0.12)",
      orange: "#F97316",
      orangeSoft: isDark ? "rgba(249,115,22,0.12)" : "rgba(245,158,11,0.10)",
    }),
    [isDark]
  );

  const handleClose = useCallback(() => {
    if (isBusy) return;
    onClose();
  }, [isBusy, onClose]);

  const handleBack = useCallback(() => {
    if (isBusy) return;
    setStep("main");
  }, [isBusy]);

  const title =
    step === "share" ? t("order.rowActions.share") : t("order.rowActions.menuTitle");

  const subtitle = order?.offerNo?.trim() || (order != null ? `#${order.id}` : "");

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.sheetBg,
              borderColor: palette.sheetBorder,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: palette.sheetBorder }]} />

          <View style={styles.headerRow}>
            {step === "share" ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                disabled={isBusy}
                activeOpacity={0.7}
              >
                <ArrowLeft01Icon size={20} color={palette.text} variant="stroke" strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}

            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: palette.muted }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={styles.backBtnPlaceholder} />
          </View>

          {isBusy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator size="small" color={palette.brand} />
              <Text style={[styles.busyText, { color: palette.muted }]}>
                {t("report.generatingPdf")}
              </Text>
            </View>
          ) : null}

          {step === "main" && order != null ? (
            <View style={styles.options}>
              <TouchableOpacity
                style={[styles.optionBtn, { borderBottomColor: palette.sheetBorder }]}
                onPress={() => setStep("share")}
                disabled={isBusy}
                activeOpacity={0.72}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.brandSoft }]}>
                  <Share05Icon size={20} color={palette.brand} variant="stroke" strokeWidth={2} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {t("order.rowActions.share")}
                  </Text>
                  <Text style={[styles.optionDesc, { color: palette.muted }]}>
                    {t("order.rowActions.shareDesc")}
                  </Text>
                </View>
                <ArrowRight01Icon size={18} color={palette.muted} variant="stroke" strokeWidth={1.8} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionBtn, { borderBottomColor: palette.sheetBorder }]}
                onPress={() => onDownload(order)}
                disabled={isBusy}
                activeOpacity={0.72}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.orangeSoft }]}>
                  <Download04Icon size={20} color={palette.orange} variant="stroke" strokeWidth={2} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {t("order.rowActions.download")}
                  </Text>
                  <Text style={[styles.optionDesc, { color: palette.muted }]}>
                    {t("order.rowActions.downloadDesc")}
                  </Text>
                </View>
              </TouchableOpacity>

              {canRevise ? (
                <TouchableOpacity
                  style={[styles.optionBtn, { borderBottomColor: "transparent" }]}
                  onPress={() => onRevise(order)}
                  disabled={isBusy || isRevisionPending}
                  activeOpacity={0.72}
                >
                  <View style={[styles.iconBox, { backgroundColor: palette.brandSoft }]}>
                    <Edit02Icon size={20} color={palette.brand} variant="stroke" strokeWidth={2} />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionTitle, { color: palette.text }]}>
                      {isRevisionPending
                        ? t("order.rowActions.revisePending")
                        : t("order.rowActions.revise")}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {step === "share" && order != null ? (
            <View style={styles.options}>
              <TouchableOpacity
                style={[styles.optionBtn, { borderBottomColor: palette.sheetBorder }]}
                onPress={() => onShareWhatsApp(order)}
                disabled={isBusy}
                activeOpacity={0.72}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.greenSoft }]}>
                  <Text style={[styles.shareGlyph, { color: palette.green }]}>WA</Text>
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {t("order.rowActions.whatsapp")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionBtn, { borderBottomColor: palette.sheetBorder }]}
                onPress={() => onShareGoogle(order)}
                disabled={isBusy}
                activeOpacity={0.72}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.blueSoft }]}>
                  <Mail01Icon size={20} color={palette.blue} variant="stroke" strokeWidth={2} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {t("order.rowActions.gmail")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionBtn, { borderBottomColor: "transparent" }]}
                onPress={() => onShareOutlook(order)}
                disabled={isBusy}
                activeOpacity={0.72}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.outlookSoft }]}>
                  <Mail01Icon size={20} color={palette.outlook} variant="stroke" strokeWidth={2} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {t("order.rowActions.outlook")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPlaceholder: {
    width: 36,
    height: 36,
  },
  headerTextWrap: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  busyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  options: {
    marginTop: 4,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionDesc: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
  },
  shareGlyph: {
    fontSize: 12,
    fontWeight: "800",
  },
});
