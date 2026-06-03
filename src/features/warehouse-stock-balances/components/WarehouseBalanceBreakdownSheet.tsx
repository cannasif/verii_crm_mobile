import React, { memo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import type { WarehouseBalanceTone, WarehouseStockBalanceDto } from "../types";
import {
  formatWarehouseBalanceWithUnit,
  resolveWarehouseBalanceTone,
  resolveWarehouseDisplayName,
} from "../utils/warehouseBalanceCompute";
import {
  getWarehouseBalanceToneColors,
  warehouseBalanceSheetStyles as styles,
} from "./warehouseBalanceStyles";

interface WarehouseBalanceBreakdownSheetProps {
  visible: boolean;
  onClose: () => void;
  rows: WarehouseStockBalanceDto[];
  totalBalance: number;
  unit?: string | null;
  tone: WarehouseBalanceTone;
  isDark: boolean;
}

export const WarehouseBalanceBreakdownSheet = memo(function WarehouseBalanceBreakdownSheet({
  visible,
  onClose,
  rows,
  totalBalance,
  unit,
  tone,
  isDark,
}: WarehouseBalanceBreakdownSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const toneColors = getWarehouseBalanceToneColors(tone, isDark);
  const sheetBg = isDark ? "#111827" : "#FFFFFF";
  const sheetBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)";
  const mutedText = isDark ? "#94A3B8" : "#64748B";
  const rowBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.18)";
  const handleColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(148,163,184,0.45)";
  const closeBg = isDark ? "rgba(255,255,255,0.06)" : "#F8FAFC";
  const closeBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.22)";
  const closeText = isDark ? "#F8FAFC" : "#0F172A";

  const formattedTotal = formatWarehouseBalanceWithUnit(totalBalance, unit);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              borderColor: sheetBorder,
              paddingBottom: Math.max(insets.bottom, 12),
              maxHeight: windowHeight * 0.72,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
          </View>

          <View
            style={[
              styles.headerCard,
              {
                backgroundColor: toneColors.headerBackground,
                borderColor: toneColors.border,
              },
            ]}
          >
            <Text unstyled disableThemeColor style={[styles.headerLabel, { color: mutedText }]}>
              {t("common.warehouseBalanceTooltip.totalLabel")}
            </Text>
            <Text unstyled disableThemeColor style={[styles.headerValue, { color: toneColors.text }]}>
              {formattedTotal}
            </Text>
            <Text unstyled disableThemeColor style={[styles.headerMeta, { color: mutedText }]}>
              {t("common.warehouseBalanceTooltip.warehouseCount", { count: rows.length })}
            </Text>
          </View>

          <ScrollView style={styles.listScroll} nestedScrollEnabled showsVerticalScrollIndicator>
            {rows.map((row) => {
              const rowTone = resolveWarehouseBalanceTone(Number(row.balance) || 0);
              const rowColors = getWarehouseBalanceToneColors(rowTone, isDark);
              return (
                <View key={row.id} style={[styles.row, { borderBottomColor: rowBorder }]}>
                  <View style={styles.rowLeft}>
                    <Text
                      unstyled
                      disableThemeColor
                      style={[styles.rowWarehouse, { color: isDark ? "#F8FAFC" : "#0F172A" }]}
                      numberOfLines={1}
                    >
                      {resolveWarehouseDisplayName(row)}
                    </Text>
                    <Text unstyled disableThemeColor style={[styles.rowBranch, { color: mutedText }]}>
                      {t("common.warehouseBalanceTooltip.branch", { branch: row.branchCode })}
                    </Text>
                  </View>
                  <Text unstyled disableThemeColor style={[styles.rowBalance, { color: rowColors.text }]}>
                    {formatWarehouseBalanceWithUnit(Number(row.balance) || 0, unit)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.closeArea}>
            <Pressable
              style={[styles.closeButton, { backgroundColor: closeBg, borderColor: closeBorder }]}
              onPress={onClose}
            >
              <Text unstyled disableThemeColor style={[styles.closeButtonText, { color: closeText }]}>
                {t("common.close")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});
