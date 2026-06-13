import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  Edit02Icon,
  Mail01Icon,
  Share05Icon,
} from "hugeicons-react-native";
import { Text } from "../ui/text";
import { useUIStore } from "../../store/ui";

type SheetStep = "main" | "share";

export type SalesDocumentMailRowActionsModule = "order" | "demand";

interface SalesDocumentMailRowActionsSheetProps {
  visible: boolean;
  module: SalesDocumentMailRowActionsModule;
  recordId: number | null;
  offerNo?: string | null;
  canRevise: boolean;
  isRevisionPending: boolean;
  onClose: () => void;
  onShareGoogle: () => void;
  onShareOutlook: () => void;
  onRevise: () => void;
}

export function SalesDocumentMailRowActionsSheet({
  visible,
  module,
  recordId,
  offerNo,
  canRevise,
  isRevisionPending,
  onClose,
  onShareGoogle,
  onShareOutlook,
  onRevise,
}: SalesDocumentMailRowActionsSheetProps): React.ReactElement {
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
    }),
    [isDark]
  );

  const i18nPrefix = `${module}.rowActions`;

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleBack = useCallback(() => {
    setStep("main");
  }, []);

  const title =
    step === "share" ? t(`${i18nPrefix}.share`) : t(`${i18nPrefix}.menuTitle`);

  const subtitle =
    offerNo?.trim() || (recordId != null ? `#${recordId}` : "");

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

          {step === "main" && recordId != null ? (
            <View style={styles.options}>
              <TouchableOpacity
                style={[styles.optionBtn, { borderBottomColor: palette.sheetBorder }]}
                onPress={() => setStep("share")}
                activeOpacity={0.72}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.brandSoft }]}>
                  <Share05Icon size={20} color={palette.brand} variant="stroke" strokeWidth={2} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {t(`${i18nPrefix}.share`)}
                  </Text>
                  <Text style={[styles.optionDesc, { color: palette.muted }]}>
                    {t(`${i18nPrefix}.shareDesc`)}
                  </Text>
                </View>
                <ArrowRight01Icon size={18} color={palette.muted} variant="stroke" strokeWidth={1.8} />
              </TouchableOpacity>

              {canRevise ? (
                <TouchableOpacity
                  style={[styles.optionBtn, { borderBottomColor: "transparent" }]}
                  onPress={onRevise}
                  disabled={isRevisionPending}
                  activeOpacity={0.72}
                >
                  <View style={[styles.iconBox, { backgroundColor: palette.brandSoft }]}>
                    <Edit02Icon size={20} color={palette.brand} variant="stroke" strokeWidth={2} />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionTitle, { color: palette.text }]}>
                      {isRevisionPending
                        ? t(`${i18nPrefix}.revisePending`)
                        : t(`${i18nPrefix}.revise`)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {step === "share" && recordId != null ? (
            <View style={styles.options}>
              <TouchableOpacity
                style={[styles.optionBtn, { borderBottomColor: palette.sheetBorder }]}
                onPress={onShareGoogle}
                activeOpacity={0.72}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.blueSoft }]}>
                  <Mail01Icon size={20} color={palette.blue} variant="stroke" strokeWidth={2} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {t(`${i18nPrefix}.gmail`)}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionBtn, { borderBottomColor: "transparent" }]}
                onPress={onShareOutlook}
                activeOpacity={0.72}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.outlookSoft }]}>
                  <Mail01Icon size={20} color={palette.outlook} variant="stroke" strokeWidth={2} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {t(`${i18nPrefix}.outlook`)}
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
});
