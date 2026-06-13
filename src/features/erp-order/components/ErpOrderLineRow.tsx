import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";
import { useUIStore } from "../../../store/ui";
import { formatErpOrderAmount, formatErpOrderText } from "../utils/erpOrderFormatters";
import type { NetsisOrderLine } from "../types";

interface ErpOrderLineRowProps {
  item: NetsisOrderLine;
  locale: string;
  isLast?: boolean;
}

function ErpOrderLineRowComponent({
  item,
  locale,
  isLast = false,
}: ErpOrderLineRowProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : colors.border;

  return (
    <View style={[styles.row, !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.topLine}>
        <Text unstyled disableThemeColor style={[styles.sira, { color: colors.accent }]}>
          #{item.sira}
        </Text>
        <Text unstyled disableThemeColor style={[styles.stockCode, { color: colors.text }]} numberOfLines={1}>
          {formatErpOrderText(item.stokKodu)}
        </Text>
      </View>
      <Text unstyled disableThemeColor style={[styles.stockName, { color: colors.textSecondary }]} numberOfLines={2}>
        {formatErpOrderText(item.stokAdi)}
      </Text>
      <View style={styles.metaRow}>
        <Text unstyled disableThemeColor style={[styles.meta, { color: colors.textMuted }]}>
          {`${formatErpOrderAmount(item.miktar, locale)} ${formatErpOrderText(item.olcuBr1)}`}
        </Text>
        <Text unstyled disableThemeColor style={[styles.meta, { color: colors.textMuted }]}>
          {formatErpOrderAmount(item.netFiyat, locale)}
        </Text>
        <Text unstyled disableThemeColor style={[styles.meta, { color: colors.textMuted }]}>
          {`${formatErpOrderAmount(item.kdvOrani, locale)}%`}
        </Text>
        <Text unstyled disableThemeColor style={[styles.meta, { color: colors.textMuted }]}>
          {formatErpOrderText(String(item.depoKodu))}
        </Text>
      </View>
    </View>
  );
}

export const ErpOrderLineRow = memo(ErpOrderLineRowComponent);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sira: {
    fontSize: 10,
    fontWeight: "700",
    minWidth: 28,
  },
  stockCode: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  stockName: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 15,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  meta: {
    fontSize: 10,
    fontWeight: "600",
  },
});
