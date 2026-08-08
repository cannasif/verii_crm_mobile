import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { Customer360AmountComparisonDto } from "../types/customer360-types";

const CHART_COLORS = {
  last12: "#8B5CF6",
  openQuotation: "#EC4899",
  openOrder: "#F97316",
};

const CHART_WIDTH = Math.min(Dimensions.get("window").width - 92, 286);
const BAR_HEIGHT = 18;

const safeNumber = (value: unknown): number => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

interface AmountComparisonBarChartProps {
  data: Customer360AmountComparisonDto;
  colors: Record<string, string>;
  noDataKey: string;
  last12Label: string;
  openQuotationLabel: string;
  openOrderLabel: string;
  formatAmount: (value: number) => string;
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

  const cardBg = isDark ? "rgba(18,8,25,0.62)" : "rgba(255,250,252,0.82)";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(219,39,119,0.07)";
  const chartBg = isDark ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.78)";
  const labelText = isDark ? "rgba(255,255,255,0.54)" : "#64748B";
  const valueText = isDark ? "#F8FAFC" : "#1F2937";
  const noDataText = isDark ? "rgba(255,255,255,0.5)" : "#6B7280";

  const barData = useMemo(() => {
    const last12 = safeNumber(data?.last12MonthsOrderAmount);
    const openQuot = safeNumber(data?.openQuotationAmount);
    const openOrd = safeNumber(data?.openOrderAmount);

    return [
      {
        value: last12,
        label: last12Label,
        frontColor: CHART_COLORS.last12,
        topLabelComponent: () => (
          <Text style={[styles.barValue, { color: valueText }]}>
            {formatAmount(last12)}
          </Text>
        ),
      },
      {
        value: openQuot,
        label: openQuotationLabel,
        frontColor: CHART_COLORS.openQuotation,
        topLabelComponent: () => (
          <Text style={[styles.barValue, { color: valueText }]}>
            {formatAmount(openQuot)}
          </Text>
        ),
      },
      {
        value: openOrd,
        label: openOrderLabel,
        frontColor: CHART_COLORS.openOrder,
        topLabelComponent: () => (
          <Text style={[styles.barValue, { color: valueText }]}>
            {formatAmount(openOrd)}
          </Text>
        ),
      },
    ];
  }, [
    data,
    last12Label,
    openQuotationLabel,
    openOrderLabel,
    formatAmount,
    valueText,
  ]);

  const maxValue = useMemo(() => {
    const last12 = safeNumber(data?.last12MonthsOrderAmount);
    const openQuot = safeNumber(data?.openQuotationAmount);
    const openOrd = safeNumber(data?.openOrderAmount);
    const max = Math.max(last12, openQuot, openOrd, 1);
    return max + Math.ceil(max * 0.12);
  }, [data]);

  const totalZero = barData.every((b) => b.value === 0);

  if (totalZero) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
          },
        ]}
      >
        <View
          style={[
            styles.innerCard,
            {
              backgroundColor: chartBg,
              borderColor: cardBorder,
            },
          ]}
        >
          <Text style={[styles.noData, { color: noDataText }]}>{noDataKey}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
        },
      ]}
    >
      <View
        style={[
          styles.innerCard,
          {
            backgroundColor: chartBg,
            borderColor: cardBorder,
          },
        ]}
      >
        <BarChart
          data={barData}
          horizontal
          width={CHART_WIDTH}
          barWidth={BAR_HEIGHT}
          maxValue={maxValue}
          spacing={30}
          initialSpacing={10}
          endSpacing={8}
          xAxisThickness={0}
          yAxisThickness={0}
          hideRules
          noOfSections={4}
          barBorderRadius={7}
          isAnimated
          xAxisLabelTextStyle={{
            color: labelText,
            fontSize: 9,
            fontWeight: "400",
          }}
          yAxisTextStyle={{
            color: labelText,
            fontSize: 8,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 2,
  },
  innerCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    overflow: "hidden",
  },
  noData: {
    fontSize: 10,
    textAlign: "center",
    paddingVertical: 18,
    fontWeight: "400",
  },
  barValue: {
    fontSize: 8.5,
    fontWeight: "500",
    lineHeight: 10,
  },
});