import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  AnalyticsUpIcon,
  Invoice03Icon,
  ShoppingBag03Icon,
} from "hugeicons-react-native";
import type { Customer360MonthlyTrendItemDto } from "../types";

const CHART_COLORS = {
  demand: "#8B5CF6",
  quotation: "#EC4899",
  order: "#F97316",
};

const CHART_WIDTH = Math.min(Dimensions.get("window").width - 108, 292);
const CHART_HEIGHT = 168;

const safeNumber = (value: unknown): number => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

interface MonthlyTrendLineChartProps {
  data: Customer360MonthlyTrendItemDto[];
  colors: Record<string, string>;
  noDataKey: string;
  demandLabel: string;
  quotationLabel: string;
  orderLabel: string;
}

interface LegendChipProps {
  icon: React.ReactNode;
  label: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  iconBg: string;
}

function LegendChip({
  icon,
  label,
  textColor,
  backgroundColor,
  borderColor,
  iconBg,
}: LegendChipProps): React.ReactElement {
  return (
    <View
      style={[
        styles.legendChip,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={[styles.legendText, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function MonthlyTrendLineChart({
  data,
  colors,
  noDataKey,
  demandLabel,
  quotationLabel,
  orderLabel,
}: MonthlyTrendLineChartProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const cardBg = isDark ? "rgba(18,8,25,0.66)" : "rgba(255,250,252,0.92)";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(219,39,119,0.08)";
  const chartBg = isDark ? "rgba(255,255,255,0.018)" : "rgba(255,255,255,0.98)";
  const titleText = isDark ? "#F8FAFC" : "#334155";
  const mutedText = isDark ? "rgba(203,213,225,0.72)" : "#64748B";
  const softText = isDark ? "rgba(148,163,184,0.82)" : "#94A3B8";
  const axisColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.10)";
  const chipBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.92)";
  const chipBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(148,163,184,0.10)";

  const normalizedData = data ?? [];

  const dataSet = useMemo(() => {
    if (normalizedData.length === 0) return null;

    const demandData = normalizedData.map((d) => ({
      value: safeNumber(d.demandCount),
      label: d.month,
      dataPointText: String(safeNumber(d.demandCount)),
    }));

    const quotationData = normalizedData.map((d) => ({
      value: safeNumber(d.quotationCount),
      label: d.month,
      dataPointText: String(safeNumber(d.quotationCount)),
    }));

    const orderData = normalizedData.map((d) => ({
      value: safeNumber(d.orderCount),
      label: d.month,
      dataPointText: String(safeNumber(d.orderCount)),
    }));

    return [
      { data: demandData, color: CHART_COLORS.demand },
      { data: quotationData, color: CHART_COLORS.quotation },
      { data: orderData, color: CHART_COLORS.order },
    ];
  }, [normalizedData]);

  const maxValue = useMemo(() => {
    if (!normalizedData.length) return 10;
    return Math.max(
      1,
      ...normalizedData.flatMap((d) => [
        safeNumber(d.demandCount),
        safeNumber(d.quotationCount),
        safeNumber(d.orderCount),
      ])
    );
  }, [normalizedData]);

  if (!normalizedData.length) {
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
            styles.emptyWrap,
            {
              backgroundColor: chartBg,
              borderColor: cardBorder,
            },
          ]}
        >
          <Text style={[styles.noData, { color: mutedText }]}>{noDataKey}</Text>
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
          styles.chartShell,
          {
            backgroundColor: chartBg,
            borderColor: cardBorder,
          },
        ]}
      >
        <LineChart
          dataSet={dataSet!}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          maxValue={maxValue + Math.ceil(maxValue * 0.14)}
          noOfSections={4}
          spacing={Math.max(28, (CHART_WIDTH - 44) / Math.max(normalizedData.length, 1))}
          initialSpacing={10}
          endSpacing={10}
          xAxisColor={axisColor}
          yAxisColor={axisColor}
          color1={CHART_COLORS.demand}
          color2={CHART_COLORS.quotation}
          color3={CHART_COLORS.order}
          dataPointsColor1={CHART_COLORS.demand}
          dataPointsColor2={CHART_COLORS.quotation}
          dataPointsColor3={CHART_COLORS.order}
          textColor1={titleText}
          textColor2={titleText}
          textColor3={titleText}
          hideDataPoints={false}
          dataPointsRadius={3.2}
          thickness1={2.2}
          thickness2={2.2}
          thickness3={2.2}
          hideRules
          xAxisLabelTextStyle={{ color: softText, fontSize: 8.5 }}
          yAxisTextStyle={{ color: softText, fontSize: 8.5 }}
          showVerticalLines={false}
          curved
          isAnimated
          areaChart1
          areaChart2
          areaChart3
          startFillColor1="rgba(139,92,246,0.10)"
          endFillColor1="rgba(139,92,246,0.01)"
          startFillColor2="rgba(236,72,153,0.10)"
          endFillColor2="rgba(236,72,153,0.01)"
          startFillColor3="rgba(249,115,22,0.10)"
          endFillColor3="rgba(249,115,22,0.01)"
          startOpacity={0.72}
          endOpacity={0.04}
        />
      </View>

      <View style={styles.legend}>
        <LegendChip
          icon={<AnalyticsUpIcon size={11} color={CHART_COLORS.demand} variant="stroke" />}
          label={demandLabel}
          textColor={titleText}
          backgroundColor={chipBg}
          borderColor={chipBorder}
          iconBg={isDark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.10)"}
        />

        <LegendChip
          icon={<Invoice03Icon size={11} color={CHART_COLORS.quotation} variant="stroke" />}
          label={quotationLabel}
          textColor={titleText}
          backgroundColor={chipBg}
          borderColor={chipBorder}
          iconBg={isDark ? "rgba(236,72,153,0.14)" : "rgba(236,72,153,0.10)"}
        />

        <LegendChip
          icon={<ShoppingBag03Icon size={11} color={CHART_COLORS.order} variant="stroke" />}
          label={orderLabel}
          textColor={titleText}
          backgroundColor={chipBg}
          borderColor={chipBorder}
          iconBg={isDark ? "rgba(249,115,22,0.14)" : "rgba(249,115,22,0.10)"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chartShell: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
    overflow: "hidden",
  },
  emptyWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noData: {
    fontSize: 10.5,
    textAlign: "center",
    paddingVertical: 20,
    fontWeight: "400",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    maxWidth: "48%",
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  legendText: {
    fontSize: 9.5,
    fontWeight: "500",
    lineHeight: 12,
    flexShrink: 1,
  },
});