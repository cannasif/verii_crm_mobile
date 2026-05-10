import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions, useWindowDimensions, Platform, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PieChart } from "react-native-gifted-charts";
import { Text } from "../../../components/ui/text";
import type { ThemeColors } from "../../../constants/theme";
import { useUIStore } from "../../../store/ui";
import type { Salesmen360DistributionDto } from "../types";
import { getVividDistributionColors, hexToRgba } from "../utils/chartPalette";

interface DistributionPieChartProps {
  data: Salesmen360DistributionDto;
  colors: ThemeColors;
  noDataKey: string;
  demandLabel: string;
  quotationLabel: string;
  orderLabel: string;
}

function hexAlpha(hex: string, alphaSuffix: string): string {
  if (hex.startsWith("#") && hex.length === 7) {
    return `${hex}${alphaSuffix}`;
  }
  return hex;
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
  const { width: windowWidth } = useWindowDimensions();
  const sectionShadow = Platform.select({
    ios: {
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.22 : 0.12,
      shadowRadius: 22,
    },
    android: {
      elevation: isDark ? 4 : 2,
    },
    default: {},
  });
  const safeNumber = (value: number | null | undefined): number => {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
      return 0;
    }
    return value;
  };

  const palette = useMemo(() => getVividDistributionColors(colors, isDark), [colors, isDark]);

  const pieData = useMemo(() => {
    const items: { value: number; color: string; text: string }[] = [];
    const demandCount = safeNumber(data?.demandCount);
    const quotationCount = safeNumber(data?.quotationCount);
    const orderCount = safeNumber(data?.orderCount);

    if (demandCount > 0) {
      items.push({
        value: demandCount,
        color: palette.demand,
        text: demandLabel,
      });
    }
    if (quotationCount > 0) {
      items.push({
        value: quotationCount,
        color: palette.quotation,
        text: quotationLabel,
      });
    }
    if (orderCount > 0) {
      items.push({
        value: orderCount,
        color: palette.order,
        text: orderLabel,
      });
    }
    return items;
  }, [data, demandLabel, orderLabel, palette, quotationLabel]);

  const totalCount = useMemo(() => pieData.reduce((s, p) => s + p.value, 0), [pieData]);

  const chartSize = Math.min(windowWidth - 56, Dimensions.get("window").width - 56, 228);
  const outerR = chartSize / 2 - 14;
  const innerR = outerR * 0.5;

  const innerCardBg = colors.card;
  const gradientColors = useMemo(
    () =>
      [
        hexToRgba(colors.accent, isDark ? 0.95 : 0.88),
        hexToRgba(colors.accentSecondary, isDark ? 0.92 : 0.85),
        hexToRgba(colors.accentTertiary, isDark ? 0.88 : 0.82),
      ] as const,
    [colors.accent, colors.accentSecondary, colors.accentTertiary, isDark]
  );

  if (pieData.length === 0) {
    return (
      <View style={[styles.outer, sectionShadow]}>
        <LinearGradient
          colors={[...gradientColors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientFrame}
        >
          <View style={[styles.innerCard, { backgroundColor: innerCardBg }]}>
            <Text style={[styles.noData, { color: colors.textMuted }]}>{noDataKey}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.outer, sectionShadow]}>
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientFrame}
      >
        <View style={[styles.innerCard, { backgroundColor: innerCardBg }]}>
          <View
            style={[
              styles.pieHalo,
              {
                shadowColor: colors.accent,
              },
            ]}
          >
            <PieChart
              data={pieData}
              donut
              radius={outerR}
              innerRadius={innerR}
              centerLabelComponent={() => null}
              showText={false}
              showValuesAsLabels={false}
              focusOnPress={false}
            />
          </View>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipStrip}
          >
            {pieData.map((p, i) => {
              const pct = totalCount > 0 ? (p.value / totalCount) * 100 : 0;
              return (
                <View
                  key={i}
                  style={[
                    styles.sliceChip,
                    i < pieData.length - 1 ? styles.sliceChipSpacer : null,
                    {
                      borderColor: hexAlpha(p.color, isDark ? "66" : "55"),
                      backgroundColor: hexToRgba(p.color, isDark ? 0.14 : 0.1),
                    },
                  ]}
                >
                  <Text style={[styles.chipPct, { color: colors.text }]}>{pct.toFixed(0)}%</Text>
                  <Text style={[styles.chipLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                    {p.text}
                  </Text>
                  <Text style={[styles.chipCount, { color: colors.textMuted }]}>{p.value}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 16,
    borderRadius: 22,
  },
  gradientFrame: {
    borderRadius: 22,
    padding: 2,
  },
  innerCard: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  pieHalo: {
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  noData: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 28,
  },
  chipStrip: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  sliceChipSpacer: {
    marginRight: 10,
  },
  sliceChip: {
    minWidth: 92,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  chipPct: {
    fontSize: 17,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipCount: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
});
