import React from "react";
import { ScrollView, StyleSheet, View, Platform, useWindowDimensions } from "react-native";
import { Text } from "../../../components/ui/text";
import type { ThemeColors } from "../../../constants/theme";
import { useUIStore } from "../../../store/ui";
import type { Salesmen360AmountComparisonDto } from "../types";

interface AmountComparisonTableProps {
  items: Salesmen360AmountComparisonDto[];
  colors: ThemeColors;
  formatAmount: (value: number) => string;
  title: string;
  headerCurrencyShort: string;
  headerLast12Short: string;
  headerOpenQuotShort: string;
  headerOpenOrderShort: string;
  columnGuideHint: string;
  noDataKey: string;
}

function hexAlpha(hex: string, alphaSuffix: string): string {
  if (hex.startsWith("#") && hex.length === 7) {
    return `${hex}${alphaSuffix}`;
  }
  return hex;
}

const COL_CURRENCY = 56;
const COL_AMOUNT = 104;

export function AmountComparisonTable({
  items,
  colors,
  formatAmount,
  title,
  headerCurrencyShort,
  headerLast12Short,
  headerOpenQuotShort,
  headerOpenOrderShort,
  columnGuideHint,
  noDataKey,
}: AmountComparisonTableProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const { width: windowWidth } = useWindowDimensions();
  const sectionBorder = hexAlpha(colors.accent, isDark ? "2C" : "36");
  const sectionShadow = Platform.select({
    ios: {
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.18 : 0.05,
      shadowRadius: 14,
    },
    android: {
      elevation: isDark ? 2 : 1,
    },
    default: {},
  });
  const tableWidth = Math.max(windowWidth - 56, COL_CURRENCY + COL_AMOUNT * 3 + 28);
  const list = items ?? [];
  if (list.length === 0) {
    return (
      <View
        style={[
          styles.section,
          sectionShadow,
          { backgroundColor: colors.card, borderColor: sectionBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.noData, { color: colors.textMuted }]}>{noDataKey}</Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.section,
        sectionShadow,
        { backgroundColor: colors.card, borderColor: sectionBorder },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.guideScroll}
      >
        <View style={styles.guidePills}>
          <View
            style={[
              styles.guidePill,
              {
                borderColor: hexAlpha(colors.text, isDark ? "22" : "18"),
                backgroundColor: hexAlpha(colors.text, isDark ? "0C" : "06"),
              },
            ]}
          >
            <View style={[styles.guideDot, { backgroundColor: colors.text }]} />
            <Text style={[styles.guidePillText, { color: colors.textSecondary }]} numberOfLines={1}>
              {headerLast12Short}
            </Text>
          </View>
          <View
            style={[
              styles.guidePill,
              styles.guidePillNext,
              {
                borderColor: hexAlpha(colors.accent, isDark ? "45" : "38"),
                backgroundColor: hexAlpha(colors.accent, isDark ? "12" : "0A"),
              },
            ]}
          >
            <View style={[styles.guideDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.guidePillText, { color: colors.textSecondary }]} numberOfLines={1}>
              {headerOpenQuotShort}
            </Text>
          </View>
          <View
            style={[
              styles.guidePill,
              styles.guidePillNext,
              {
                borderColor: hexAlpha(colors.accentSecondary, isDark ? "45" : "38"),
                backgroundColor: hexAlpha(colors.accentSecondary, isDark ? "12" : "0A"),
              },
            ]}
          >
            <View style={[styles.guideDot, { backgroundColor: colors.accentSecondary }]} />
            <Text style={[styles.guidePillText, { color: colors.textSecondary }]} numberOfLines={1}>
              {headerOpenOrderShort}
            </Text>
          </View>
        </View>
      </ScrollView>
      <Text style={[styles.guideHint, { color: colors.textMuted }]}>{columnGuideHint}</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.tableScrollInner}
      >
        <View
          style={[
            styles.table,
            { borderColor: hexAlpha(colors.accent, isDark ? "22" : "1C"), width: tableWidth },
          ]}
        >
          <View style={[styles.headerRow, { backgroundColor: hexAlpha(colors.accent, isDark ? "10" : "08") }]}>
            <View style={[styles.hCell, { width: COL_CURRENCY }]}>
              <Text style={[styles.headerText, { color: colors.textMuted }]} numberOfLines={2}>
                {headerCurrencyShort}
              </Text>
            </View>
            <View style={[styles.hCell, { width: COL_AMOUNT }]}>
              <Text style={[styles.headerText, { color: colors.textMuted }]} numberOfLines={2}>
                {headerLast12Short}
              </Text>
            </View>
            <View style={[styles.hCell, { width: COL_AMOUNT }]}>
              <Text style={[styles.headerText, { color: colors.textMuted }]} numberOfLines={2}>
                {headerOpenQuotShort}
              </Text>
            </View>
            <View style={[styles.hCell, { width: COL_AMOUNT }]}>
              <Text style={[styles.headerText, { color: colors.textMuted }]} numberOfLines={2}>
                {headerOpenOrderShort}
              </Text>
            </View>
          </View>
          {list.map((row, index) => (
            <View
              key={`${row.currency ?? index}-${index}`}
              style={[
                styles.dataRow,
                index % 2 === 1 && { backgroundColor: hexAlpha(colors.accent, isDark ? "06" : "04") },
                index < list.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : colors.border,
                },
              ]}
            >
              <View style={{ width: COL_CURRENCY }}>
                <Text style={[styles.cellCurr, { color: colors.textSecondary }]} numberOfLines={1}>
                  {row.currency}
                </Text>
              </View>
              <View style={{ width: COL_AMOUNT }}>
                <Text style={[styles.cellNum, { color: colors.text }]} numberOfLines={1}>
                  {formatAmount(row.last12MonthsOrderAmount)}
                </Text>
              </View>
              <View style={{ width: COL_AMOUNT }}>
                <Text style={[styles.cellNum, { color: colors.accent }]} numberOfLines={1}>
                  {formatAmount(row.openQuotationAmount)}
                </Text>
              </View>
              <View style={{ width: COL_AMOUNT }}>
                <Text style={[styles.cellNum, { color: colors.accentSecondary }]} numberOfLines={1}>
                  {formatAmount(row.openOrderAmount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.15,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  guideScroll: {
    paddingBottom: 6,
  },
  guidePills: {
    flexDirection: "row",
    alignItems: "center",
  },
  guidePillNext: {
    marginLeft: 8,
  },
  guidePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  guideDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  guidePillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    maxWidth: 120,
  },
  guideHint: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  noData: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 16,
  },
  tableScrollInner: {
    paddingBottom: 2,
  },
  table: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "stretch",
  },
  hCell: {
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    lineHeight: 11,
  },
  dataRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  cellCurr: {
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  cellNum: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
