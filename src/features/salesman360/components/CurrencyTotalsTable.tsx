import React from "react";
import { ScrollView, StyleSheet, View, Platform } from "react-native";
import { Coins01Icon } from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import type { ThemeColors } from "../../../constants/theme";
import { useUIStore } from "../../../store/ui";
import type { Salesmen360CurrencyAmountDto } from "../types";

interface CurrencyTotalsTableProps {
  items: Salesmen360CurrencyAmountDto[];
  colors: ThemeColors;
  formatAmount: (value: number) => string;
  title: string;
  currencyLabel: string;
  demandAmountLabel: string;
  quotationAmountLabel: string;
  orderAmountLabel: string;
  noDataKey: string;
}

function hexAlpha(hex: string, alphaSuffix: string): string {
  if (hex.startsWith("#") && hex.length === 7) {
    return `${hex}${alphaSuffix}`;
  }
  return hex;
}

interface CurrencyTotalCardProps {
  row: Salesmen360CurrencyAmountDto;
  colors: ThemeColors;
  formatAmount: (value: number) => string;
  demandAmountLabel: string;
  quotationAmountLabel: string;
  orderAmountLabel: string;
  isDark: boolean;
}

const CurrencyTotalCard = React.memo(function CurrencyTotalCard({
  row,
  colors,
  formatAmount,
  demandAmountLabel,
  quotationAmountLabel,
  orderAmountLabel,
  isDark,
}: CurrencyTotalCardProps): React.ReactElement {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.12 : 0.06,
      shadowRadius: 10,
    },
    android: {
      elevation: isDark ? 2 : 1,
    },
    default: {},
  });
  return (
    <View
      style={[
        styles.currencyCard,
        cardShadow,
        {
          backgroundColor: colors.card,
          borderColor: hexAlpha(colors.accent, isDark ? "30" : "28"),
        },
      ]}
    >
      <View style={styles.currencyCardHead}>
        <Text style={[styles.currencyCode, { color: colors.textMuted }]} numberOfLines={1}>
          {row.currency}
        </Text>
        <Coins01Icon size={15} color={colors.textMuted} variant="stroke" strokeWidth={1.65} />
      </View>
      <View style={styles.metricBlock}>
        <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={2}>
          {demandAmountLabel}
        </Text>
        <Text style={[styles.metricValueDemand, { color: colors.textSecondary }]}>
          {formatAmount(row.demandAmount)}
        </Text>
      </View>
      <View style={styles.metricBlock}>
        <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={2}>
          {quotationAmountLabel}
        </Text>
        <Text style={[styles.metricValueQuote, { color: colors.text }]}>{formatAmount(row.quotationAmount)}</Text>
      </View>
      <View style={styles.metricBlock}>
        <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={2}>
          {orderAmountLabel}
        </Text>
        <Text style={[styles.metricValueOrder, { color: colors.accent }]}>
          {formatAmount(row.orderAmount)}
        </Text>
      </View>
    </View>
  );
});

export function CurrencyTotalsTable({
  items,
  colors,
  formatAmount,
  title,
  currencyLabel,
  demandAmountLabel,
  quotationAmountLabel,
  orderAmountLabel,
  noDataKey,
}: CurrencyTotalsTableProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
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
      <View style={styles.sectionHeadRow}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>{currencyLabel}</Text>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.carouselContent}
      >
        {list.map((row, index) => (
          <View
            key={`${row.currency}-${index}`}
            style={index < list.length - 1 ? styles.cardSpacer : undefined}
          >
            <CurrencyTotalCard
              row={row}
              colors={colors}
              formatAmount={formatAmount}
              demandAmountLabel={demandAmountLabel}
              quotationAmountLabel={quotationAmountLabel}
              orderAmountLabel={orderAmountLabel}
              isDark={isDark}
            />
          </View>
        ))}
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
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.15,
    flex: 1,
  },
  sectionMeta: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  noData: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 16,
  },
  carouselContent: {
    paddingRight: 4,
    paddingBottom: 2,
    flexDirection: "row",
    alignItems: "stretch",
  },
  cardSpacer: {
    marginRight: 11,
  },
  currencyCard: {
    width: 156,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 10,
  },
  currencyCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  currencyCode: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flex: 1,
  },
  metricBlock: {
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 3,
    lineHeight: 13,
  },
  metricValueDemand: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  metricValueQuote: {
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  metricValueOrder: {
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
