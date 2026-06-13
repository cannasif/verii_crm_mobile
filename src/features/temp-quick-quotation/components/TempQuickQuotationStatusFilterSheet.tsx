import React, { useCallback, useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tick02Icon } from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  TEMP_QUICK_QUOTATION_STATUS_FILTER_OPTIONS,
  type TempQuickQuotationStatusFilter,
} from "../hooks";

interface TempQuickQuotationStatusFilterSheetProps {
  visible: boolean;
  selectedValue: TempQuickQuotationStatusFilter;
  onClose: () => void;
  onSelect: (value: TempQuickQuotationStatusFilter) => void;
}

function resolveStatusMeta(
  value: TempQuickQuotationStatusFilter,
  isDark: boolean,
  t: (key: string) => string
) {
  if (value === "all") {
    const dot = isDark ? "#94A3B8" : "#64748B";
    return {
      label: t("tempQuickQuotation.statusFilter.options.all"),
      color: dot,
      backgroundColor: isDark ? "rgba(148,163,184,0.14)" : "#F8FAFC",
      borderColor: `${dot}35`,
    };
  }

  if (value === "approved") {
    const color = isDark ? "#34D399" : "#059669";
    return {
      label: t("tempQuickQuotation.statusFilter.options.approved"),
      color,
      backgroundColor: isDark ? "rgba(52,211,153,0.12)" : "rgba(16,185,129,0.08)",
      borderColor: isDark ? "rgba(52,211,153,0.28)" : "rgba(16,185,129,0.18)",
    };
  }

  const color = isDark ? "#FBBF24" : "#D97706";
  return {
    label: t("tempQuickQuotation.statusFilter.options.draft"),
    color,
    backgroundColor: isDark ? "rgba(251,191,36,0.12)" : "rgba(245,158,11,0.08)",
    borderColor: isDark ? "rgba(251,191,36,0.28)" : "rgba(245,158,11,0.18)",
  };
}

export function TempQuickQuotationStatusFilterSheet({
  visible,
  selectedValue,
  onClose,
  onSelect,
}: TempQuickQuotationStatusFilterSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const palette = useMemo(
    () => ({
      sheetBg: isDark ? "#12101F" : "#FFFFFF",
      sheetBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.22)",
      text: isDark ? "#F8FAFC" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      brand: isDark ? "#EC4899" : "#DB2777",
      brandSoft: isDark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.08)",
    }),
    [isDark]
  );

  const handleSelect = useCallback(
    (value: TempQuickQuotationStatusFilter) => {
      onSelect(value);
      onClose();
    },
    [onClose, onSelect]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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

          <Text style={[styles.title, { color: palette.text }]}>
            {t("tempQuickQuotation.statusFilter.title")}
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            {t("tempQuickQuotation.statusFilter.subtitle")}
          </Text>

          <View style={styles.options}>
            {TEMP_QUICK_QUOTATION_STATUS_FILTER_OPTIONS.map((value) => {
              const isSelected = selectedValue === value;
              const statusMeta = resolveStatusMeta(value, isDark, t);

              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.optionBtn,
                    {
                      borderBottomColor: palette.sheetBorder,
                      backgroundColor: isSelected ? palette.brandSoft : "transparent",
                    },
                  ]}
                  onPress={() => handleSelect(value)}
                  activeOpacity={0.72}
                >
                  <View
                    style={[
                      styles.statusDotWrap,
                      {
                        backgroundColor: statusMeta.backgroundColor,
                        borderColor: statusMeta.borderColor,
                      },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
                  </View>

                  <Text
                    style={[
                      styles.optionLabel,
                      { color: isSelected ? palette.brand : palette.text },
                    ]}
                    numberOfLines={2}
                  >
                    {statusMeta.label}
                  </Text>

                  {isSelected ? (
                    <Tick02Icon size={18} color={palette.brand} variant="stroke" strokeWidth={2.2} />
                  ) : (
                    <View style={styles.checkPlaceholder} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
  title: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  options: {
    marginTop: 4,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderRadius: 12,
  },
  statusDotWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  checkPlaceholder: {
    width: 18,
    height: 18,
  },
});
