import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions, Platform, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { Text } from "../../../components/ui/text";
import type { ThemeColors } from "../../../constants/theme";
import { useUIStore } from "../../../store/ui";
import type { Salesmen360AmountComparisonDto } from "../types";
import { getSoftBarColors } from "../utils/chartPalette";

const BAR_HEIGHT = 26;
const safeNumber = (value: unknown): number => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

interface AmountComparisonBarChartProps {
  data: Salesmen360AmountComparisonDto;
  colors: ThemeColors;
  noDataKey: string;
  last12Label: string;
  openQuotationLabel: string;
  openOrderLabel: string;
  formatAmount: (value: number) => string;
}

function hexAlpha(hex: string, alphaSuffix: string): string {
  if (hex.startsWith("#") && hex.length === 7) {
    return `${hex}${alphaSuffix}`;
  }
  return hex;
}

export function AmountComparisonBarChart({
  data,
  colors,
  noDataKey,
  last12Label,
  openQuotationLabel,
  openOrderLabel,
  formatAmount,
}: AmountComparisonBarChartProps): React.ReactElement {
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
  const chartWidth = Math.min(windowWidth - 72, Dimensions.get("window").width - 72, 340);
  const palette = useMemo(() => getSoftBarColors(colors, isDark), [colors, isDark]);

  const barData = useMemo(() => {
    const last12 = safeNumber(data?.last12MonthsOrderAmount);
    const openQuot = safeNumber(data?.openQuotationAmount);
    const openOrd = safeNumber(data?.openOrderAmount);
    return [
      {
        value: last12,
        label: last12Label,
        frontColor: palette.last12,
        topLabelComponent: () => (
          <Text style={[styles.barValue, { color: colors.text }]}>{formatAmount(last12)}</Text>
        ),
      },
      {
        value: openQuot,
        label: openQuotationLabel,
        frontColor: palette.openQuotation,
        topLabelComponent: () => (
          <Text style={[styles.barValue, { color: colors.text }]}>{formatAmount(openQuot)}</Text>
        ),
      },
      {
        value: openOrd,
        label: openOrderLabel,
        frontColor: palette.openOrder,
        topLabelComponent: () => (
          <Text style={[styles.barValue, { color: colors.text }]}>{formatAmount(openOrd)}</Text>
        ),
      },
    ];
  }, [
    data,
    last12Label,
    openQuotationLabel,
    openOrderLabel,
    formatAmount,
    colors.text,
    palette,
  ]);

  const maxValue = useMemo(() => {
    const last12 = safeNumber(data?.last12MonthsOrderAmount);
    const openQuot = safeNumber(data?.openQuotationAmount);
    const openOrd = safeNumber(data?.openOrderAmount);
    const max = Math.max(last12, openQuot, openOrd, 1);
    return max + Math.ceil(max * 0.15);
  }, [data]);

  const totalZero = barData.every((b) => b.value === 0);
  if (totalZero) {
    return (
      <View
        style={[
          styles.container,
          sectionShadow,
          { backgroundColor: colors.card, borderColor: sectionBorder },
        ]}
      >
        <Text style={[styles.noData, { color: colors.textMuted }]}>{noDataKey}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        sectionShadow,
        { backgroundColor: colors.card, borderColor: sectionBorder },
      ]}
    >
      <BarChart
        data={barData}
        horizontal
        width={chartWidth}
        barWidth={BAR_HEIGHT}
        maxValue={maxValue}
        spacing={48}
        initialSpacing={18}
        endSpacing={18}
        xAxisThickness={0}
        yAxisThickness={0}
        hideRules
        noOfSections={4}
        barBorderRadius={10}
        isAnimated
        xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10, fontWeight: "600" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  noData: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 22,
  },
  barValue: {
    fontSize: 10,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
