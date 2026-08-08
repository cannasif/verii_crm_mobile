import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { AnalyticsUpIcon, Invoice03Icon, ShoppingBag03Icon } from "hugeicons-react-native";
import type { Customer360DistributionDto } from "../types/customer360-types";

const CHART_COLORS = {
  demand: "#8B5CF6",
  quotation: "#EC4899",
  order: "#F97316",
};

const safeNumber = (value: unknown): number => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const CHART_SIZE = Math.min(Dimensions.get("window").width - 120, 180);

interface DistributionPieChartProps {
  data: Customer360DistributionDto;
  colors: Record<string, string>;
  noDataKey: string;
  demandLabel: string;
  quotationLabel: string;
  orderLabel: string;
}

export function DistributionPieChart({
  data,
  colors,
  noDataKey,
  demandLabel,
  quotationLabel,
  orderLabel,
}: DistributionPieChartProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const cardBg = isDark ? "rgba(18,8,25,0.62)" : "rgba(255,250,252,0.82)";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(219,39,119,0.07)";
  const chartBg = isDark ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.78)";
  const titleText = isDark ? "#F8FAFC" : "#1F2937";
  const mutedText = isDark ? "rgba(255,255,255,0.50)" : "#6B7280";
  const softText = isDark ? "rgba(255,255,255,0.38)" : "#94A3B8";

  const demandCount = safeNumber(data?.demandCount);
  const quotationCount = safeNumber(data?.quotationCount);
  const orderCount = safeNumber(data?.orderCount);
  const total = demandCount + quotationCount + orderCount;

  const pieData = useMemo(() => {
    const items: { value: number; color: string; text: string }[] = [];

    if (demandCount > 0) {
      items.push({
        value: demandCount,
        color: CHART_COLORS.demand,
        text: demandLabel,
      });
    }
    if (quotationCount > 0) {
      items.push({
        value: quotationCount,
        color: CHART_COLORS.quotation,
        text: quotationLabel,
      });
    }
    if (orderCount > 0) {
      items.push({
        value: orderCount,
        color: CHART_COLORS.order,
        text: orderLabel,
      });
    }

    return items;
  }, [demandCount, quotationCount, orderCount, demandLabel, quotationLabel, orderLabel]);

  if (pieData.length === 0) {
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
          styles.innerCard,
          {
            backgroundColor: chartBg,
            borderColor: cardBorder,
          },
        ]}
      >
        <View style={styles.chartBlock}>
          <PieChart
            data={pieData}
            donut
            radius={CHART_SIZE / 2}
            innerRadius={(CHART_SIZE / 2) * 0.62}
            centerLabelComponent={() => (
              <View style={styles.centerLabelWrap}>
                <Text style={[styles.centerValue, { color: titleText }]}>{total}</Text>
                <Text style={[styles.centerLabel, { color: softText }]}>Total</Text>
              </View>
            )}
            focusOnPress={false}
            showText={false}
            strokeWidth={0}
          />
        </View>

        <View style={styles.legend}>
          <View
            style={[
              styles.legendRow,
              {
                borderBottomColor: cardBorder,
              },
            ]}
          >
            <View style={styles.legendLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${CHART_COLORS.demand}14` },
                ]}
              >
                <AnalyticsUpIcon size={12} color={CHART_COLORS.demand} variant="stroke" />
              </View>
              <Text style={[styles.legendLabel, { color: mutedText }]} numberOfLines={1}>
                {demandLabel}
              </Text>
            </View>
            <View style={styles.legendRight}>
              <Text style={[styles.legendValue, { color: titleText }]}>{demandCount}</Text>
              <Text style={[styles.legendPercent, { color: softText }]}>
                {total > 0 ? `%${Math.round((demandCount / total) * 100)}` : "%0"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.legendRow,
              {
                borderBottomColor: cardBorder,
              },
            ]}
          >
            <View style={styles.legendLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${CHART_COLORS.quotation}14` },
                ]}
              >
                <Invoice03Icon size={12} color={CHART_COLORS.quotation} variant="stroke" />
              </View>
              <Text style={[styles.legendLabel, { color: mutedText }]} numberOfLines={1}>
                {quotationLabel}
              </Text>
            </View>
            <View style={styles.legendRight}>
              <Text style={[styles.legendValue, { color: titleText }]}>{quotationCount}</Text>
              <Text style={[styles.legendPercent, { color: softText }]}>
                {total > 0 ? `%${Math.round((quotationCount / total) * 100)}` : "%0"}
              </Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${CHART_COLORS.order}14` },
                ]}
              >
                <ShoppingBag03Icon size={12} color={CHART_COLORS.order} variant="stroke" />
              </View>
              <Text style={[styles.legendLabel, { color: mutedText }]} numberOfLines={1}>
                {orderLabel}
              </Text>
            </View>
            <View style={styles.legendRight}>
              <Text style={[styles.legendValue, { color: titleText }]}>{orderCount}</Text>
              <Text style={[styles.legendPercent, { color: softText }]}>
                {total > 0 ? `%${Math.round((orderCount / total) * 100)}` : "%0"}
              </Text>
            </View>
          </View>
        </View>
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
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  chartBlock: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  centerLabelWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerValue: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 20,
  },
  centerLabel: {
    fontSize: 9,
    fontWeight: "400",
    marginTop: 2,
    letterSpacing: 0.1,
  },
  noData: {
    fontSize: 10,
    textAlign: "center",
    paddingVertical: 18,
    fontWeight: "400",
  },
  emptyWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  legend: {
    borderRadius: 10,
    overflow: "hidden",
  },
  legendRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 8,
    gap: 10,
  },
  legendLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  legendRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 13,
  },
  legendValue: {
    fontSize: 11,
    fontWeight: "600",
    minWidth: 18,
    textAlign: "right",
  },
  legendPercent: {
    fontSize: 9,
    fontWeight: "400",
    minWidth: 28,
    textAlign: "right",
  },
});