import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import {
  AnalyticsUpIcon,
  Invoice03Icon,
  ShoppingBag03Icon,
} from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import type { ThemeColors } from "../../../constants/theme";
import { useUIStore } from "../../../store/ui";
import type { Salesmen360MonthlyTrendItemDto } from "../types";
import { getSoftSeriesColors, hexToRgba } from "../utils/chartPalette";

const CHART_HEIGHT = 214;
const Y_AXIS_LABEL_SPACE = 56;
const INITIAL_X = 10;
const END_X = 12;

const safeNumber = (value: unknown): number => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

function formatMonthlyAxisLabel(raw: string): string {
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(s);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    if (Number.isFinite(year) && month >= 1 && month <= 12) {
      const yy = String(year % 100).padStart(2, "0");
      return `${month}/${yy}`;
    }
  }
  const slash = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (slash) {
    const month = Number(slash[1]);
    const year = Number(slash[2]);
    if (Number.isFinite(year) && month >= 1 && month <= 12) {
      return `${month}/${String(year % 100).padStart(2, "0")}`;
    }
  }
  return s;
}

interface MonthlyTrendLineChartProps {
  data: Salesmen360MonthlyTrendItemDto[];
  colors: ThemeColors;
  noDataKey: string;
  demandLabel: string;
  quotationLabel: string;
  orderLabel: string;
  swipeHint: string;
}

function hexAlpha(hex: string, alphaSuffix: string): string {
  if (hex.startsWith("#") && hex.length === 7) {
    return `${hex}${alphaSuffix}`;
  }
  return hex;
}

interface LegendChipProps {
  style?: StyleProp<ViewStyle>;
  icon: React.ReactNode;
  label: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  iconBg: string;
}

function LegendChip({
  style,
  icon,
  label,
  textColor,
  backgroundColor,
  borderColor,
  iconBg,
}: LegendChipProps): React.ReactElement {
  return (
    <View style={[styles.legendChip, style, { backgroundColor, borderColor }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={[styles.legendChipText, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function computeSpacing(plotWidth: number, pointCount: number): number {
  if (pointCount <= 1) {
    return 32;
  }
  const track = plotWidth - INITIAL_X - END_X - Y_AXIS_LABEL_SPACE;
  return Math.max(8, track / (pointCount - 1));
}

export function MonthlyTrendLineChart({
  data,
  colors,
  noDataKey,
  demandLabel,
  quotationLabel,
  orderLabel,
  swipeHint: _swipeHint,
}: MonthlyTrendLineChartProps): React.ReactElement {
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
  const palette = useMemo(() => getSoftSeriesColors(colors, isDark), [colors, isDark]);
  const chartShellBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)";
  const chartShellBorder = isDark ? "rgba(255,255,255,0.08)" : hexAlpha(colors.accent, "12");
  const chipBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)";
  const chipBorder = isDark ? "rgba(255,255,255,0.1)" : hexAlpha(colors.border, "AA");

  const fallbackPlotWidth = Math.max(220, windowWidth - 80);
  const [plotWidth, setPlotWidth] = useState(fallbackPlotWidth);

  const onPlotLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.floor(e.nativeEvent.layout.width);
    if (next > 0) {
      setPlotWidth((prev) => (prev === next ? prev : next));
    }
  }, []);

  const n = data?.length ?? 0;
  const pointSpacing = useMemo(() => computeSpacing(plotWidth, n), [plotWidth, n]);

  const dataSet = useMemo(() => {
    const list = data ?? [];
    if (list.length === 0) return null;
    const demandData = list.map((d) => ({
      value: safeNumber(d.demandCount),
      label: formatMonthlyAxisLabel(d.month),
    }));
    const quotationData = list.map((d) => ({
      value: safeNumber(d.quotationCount),
      label: formatMonthlyAxisLabel(d.month),
    }));
    const orderData = list.map((d) => ({
      value: safeNumber(d.orderCount),
      label: formatMonthlyAxisLabel(d.month),
    }));
    return [
      { data: demandData, color: palette.demand },
      { data: quotationData, color: palette.quotation },
      { data: orderData, color: palette.order },
    ];
  }, [data, palette]);

  const maxValue = useMemo(() => {
    if (!data?.length) return 10;
    return Math.max(
      1,
      ...data.flatMap((d) => [safeNumber(d.demandCount), safeNumber(d.quotationCount), safeNumber(d.orderCount)])
    );
  }, [data]);

  const axisLabelSize = n > 8 ? 8 : 9;

  if (!data?.length) {
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
      <View style={[styles.chartShell, { backgroundColor: chartShellBg, borderColor: chartShellBorder }]}>
        <View style={styles.plotMeasure} onLayout={onPlotLayout}>
          <LineChart
            key={`trend-${plotWidth}-${n}`}
            dataSet={dataSet!}
            width={plotWidth}
            height={CHART_HEIGHT}
            maxValue={maxValue + Math.ceil(maxValue * 0.12)}
            noOfSections={4}
            spacing={pointSpacing}
            initialSpacing={INITIAL_X}
            endSpacing={END_X}
            xAxisColor={colors.border}
            yAxisColor={colors.border}
            xAxisThickness={StyleSheet.hairlineWidth}
            color1={palette.demand}
            color2={palette.quotation}
            color3={palette.order}
            dataPointsColor1={palette.demand}
            dataPointsColor2={palette.quotation}
            dataPointsColor3={palette.order}
            hideDataPoints={false}
            dataPointsRadius1={2.5}
            dataPointsRadius2={2.5}
            dataPointsRadius3={2.5}
            thickness1={2.2}
            thickness2={2.2}
            thickness3={2.2}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: axisLabelSize, fontWeight: "600" }}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 9, fontWeight: "600" }}
            showVerticalLines={false}
            curved
            isAnimated
            hideRules
            overflowTop={6}
            overflowBottom={28}
            disableScroll
            showScrollIndicator={false}
          />
        </View>
      </View>
      <View style={styles.legendRow}>
        <LegendChip
          icon={<AnalyticsUpIcon size={12} color={palette.demand} variant="stroke" strokeWidth={1.85} />}
          label={demandLabel}
          textColor={colors.textSecondary}
          backgroundColor={chipBg}
          borderColor={chipBorder}
          iconBg={hexToRgba(palette.demand, isDark ? 0.2 : 0.14)}
        />
        <LegendChip
          style={styles.legendChipNext}
          icon={<Invoice03Icon size={12} color={palette.quotation} variant="stroke" strokeWidth={1.85} />}
          label={quotationLabel}
          textColor={colors.textSecondary}
          backgroundColor={chipBg}
          borderColor={chipBorder}
          iconBg={hexToRgba(palette.quotation, isDark ? 0.2 : 0.14)}
        />
        <LegendChip
          style={styles.legendChipNext}
          icon={<ShoppingBag03Icon size={12} color={palette.order} variant="stroke" strokeWidth={1.85} />}
          label={orderLabel}
          textColor={colors.textSecondary}
          backgroundColor={chipBg}
          borderColor={chipBorder}
          iconBg={hexToRgba(palette.order, isDark ? 0.2 : 0.14)}
        />
      </View>
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
  chartShell: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 0,
    alignSelf: "stretch",
    width: "100%",
  },
  plotMeasure: {
    width: "100%",
    alignSelf: "stretch",
  },
  noData: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 22,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  legendChipNext: {
    marginLeft: 8,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 5,
    marginBottom: 6,
    paddingHorizontal: 9,
    gap: 7,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  legendChipText: {
    fontSize: 11,
    fontWeight: "700",
    maxWidth: 118,
  },
});
