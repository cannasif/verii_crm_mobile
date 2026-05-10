import React, { useMemo } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { ThemeColors } from "../../../constants/theme";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  AnalyticsUpIcon,
  Invoice03Icon,
  ShoppingBag03Icon,
  Activity01Icon,
  MoneyExchange01Icon,
  ChartAverageIcon,
  Calendar02Icon,
} from "hugeicons-react-native";

export type Salesman360KpiVariant =
  | "demands"
  | "quotations"
  | "orders"
  | "activities"
  | "amountDemand"
  | "amountQuotation"
  | "amountOrder"
  | "analyticsOrders"
  | "analyticsOpenQuotation"
  | "analyticsOpenOrder"
  | "analyticsActivity"
  | "analyticsDate"
  | "default";

type TintKey = "accent" | "accentSecondary" | "accentTertiary" | "success" | "warning";

const VARIANT_MAP: Record<
  Salesman360KpiVariant,
  { Icon: typeof AnalyticsUpIcon; tint: TintKey }
> = {
  demands: { Icon: AnalyticsUpIcon, tint: "accent" },
  quotations: { Icon: Invoice03Icon, tint: "accentSecondary" },
  orders: { Icon: ShoppingBag03Icon, tint: "warning" },
  activities: { Icon: Activity01Icon, tint: "success" },
  amountDemand: { Icon: MoneyExchange01Icon, tint: "accent" },
  amountQuotation: { Icon: MoneyExchange01Icon, tint: "accentSecondary" },
  amountOrder: { Icon: MoneyExchange01Icon, tint: "accentTertiary" },
  analyticsOrders: { Icon: ShoppingBag03Icon, tint: "accent" },
  analyticsOpenQuotation: { Icon: Invoice03Icon, tint: "accentSecondary" },
  analyticsOpenOrder: { Icon: ShoppingBag03Icon, tint: "warning" },
  analyticsActivity: { Icon: Activity01Icon, tint: "success" },
  analyticsDate: { Icon: Calendar02Icon, tint: "accentTertiary" },
  default: { Icon: ChartAverageIcon, tint: "accent" },
};

function hexSuffixAlpha(hex: string, suffix: string): string {
  if (hex.startsWith("rgba")) {
    return hex;
  }
  return hex.length === 7 ? `${hex}${suffix}` : hex;
}

interface KpiCardProps {
  label: string;
  value: number | string;
  colors: ThemeColors;
  variant?: Salesman360KpiVariant;
  style?: StyleProp<ViewStyle>;
}

export function KpiCard({
  label,
  value,
  colors,
  variant = "default",
  style,
}: KpiCardProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const { Icon, tint } = VARIANT_MAP[variant] ?? VARIANT_MAP.default;
  const tintColor = colors[tint];

  const cardFill = useMemo(() => {
    if (!tintColor.startsWith("#") || tintColor.length !== 7) {
      return colors.card;
    }
    return hexSuffixAlpha(tintColor, isDark ? "1A" : "0C");
  }, [colors.card, isDark, tintColor]);

  const cardStroke = useMemo(() => {
    if (!tintColor.startsWith("#") || tintColor.length !== 7) {
      return isDark ? colors.cardBorder : colors.border;
    }
    return hexSuffixAlpha(tintColor, isDark ? "38" : "26");
  }, [colors.border, colors.cardBorder, isDark, tintColor]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardFill,
          borderColor: cardStroke,
        },
        style,
      ]}
    >
      <View style={styles.watermark} pointerEvents="none">
        <Icon size={54} color={tintColor} variant="stroke" strokeWidth={1.05} />
      </View>

      <View style={styles.contentCol}>
        <Text unstyled style={[styles.label, { color: colors.textMuted }]} numberOfLines={3}>
          {label}
        </Text>
        <View style={styles.valueSlot}>
          <Text unstyled style={[styles.value, { color: colors.textSecondary }]} numberOfLines={2}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 78,
    minHeight: 82,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 13,
    borderWidth: 1,
    overflow: "hidden",
  },
  watermark: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "26%",
    alignItems: "center",
    opacity: 0.028,
    transform: [{ rotate: "-6deg" }],
  },
  contentCol: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 5,
    zIndex: 1,
  },
  label: {
    width: "100%",
    fontSize: 8,
    fontWeight: "700",
    lineHeight: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    opacity: 0.92,
    textAlign: "center",
    marginBottom: 6,
    paddingHorizontal: 1,
  },
  valueSlot: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  value: {
    width: "100%",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
    letterSpacing: -0.35,
    textAlign: "center",
  },
});
