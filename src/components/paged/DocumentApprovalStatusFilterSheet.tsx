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
import { Text } from "../ui/text";
import { useUIStore } from "../../store/ui";
import {
  DOCUMENT_APPROVAL_STATUS_FILTER_OPTIONS,
  type DocumentApprovalStatusFilterValue,
} from "../../lib/documentApprovalFilter";
import {
  resolveDocumentApprovalStatusMeta,
  type DocumentApprovalModule,
} from "../../lib/documentApprovalStatus";

interface DocumentApprovalStatusFilterSheetProps {
  visible: boolean;
  module: DocumentApprovalModule;
  selectedValue: DocumentApprovalStatusFilterValue;
  onClose: () => void;
  onSelect: (value: DocumentApprovalStatusFilterValue) => void;
}

export function DocumentApprovalStatusFilterSheet({
  visible,
  module,
  selectedValue,
  onClose,
  onSelect,
}: DocumentApprovalStatusFilterSheetProps): React.ReactElement {
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
      allDot: isDark ? "#94A3B8" : "#64748B",
      allBg: isDark ? "rgba(148,163,184,0.14)" : "#F8FAFC",
    }),
    [isDark]
  );

  const handleSelect = useCallback(
    (value: DocumentApprovalStatusFilterValue) => {
      onSelect(value);
      onClose();
    },
    [onClose, onSelect]
  );

  const filterKey = `${module}.approvalStatusFilter`;

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
            {t(`${filterKey}.title`)}
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            {t(`${filterKey}.subtitle`)}
          </Text>

          <View style={styles.options}>
            {DOCUMENT_APPROVAL_STATUS_FILTER_OPTIONS.map((value) => {
              const isSelected = selectedValue === value;
              const statusMeta =
                value === "all"
                  ? {
                      label: t(`${filterKey}.options.all`),
                      color: palette.allDot,
                      backgroundColor: palette.allBg,
                      borderColor: `${palette.allDot}35`,
                    }
                  : resolveDocumentApprovalStatusMeta(Number(value), isDark, t, module);

              const optionLabel =
                value === "all"
                  ? t(`${filterKey}.options.all`)
                  : value === "1"
                    ? t(`${filterKey}.options.1`)
                    : value === "5"
                      ? t(`${filterKey}.options.5`)
                      : statusMeta.label;

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
                    {optionLabel}
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
