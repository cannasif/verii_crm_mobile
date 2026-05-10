import React, { useCallback } from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import type { ThemeColors } from "../../../constants/theme";
import { useUIStore } from "../../../store/ui";
import { Coins01Icon } from "hugeicons-react-native";
import {
  KpiCard,
  AmountComparisonTable,
  DistributionPieChart,
  MonthlyTrendLineChart,
  AmountComparisonBarChart,
} from "../components";
import type {
  Salesmen360AnalyticsSummaryDto,
  Salesmen360AnalyticsChartsDto,
  Salesmen360CurrencyAmountDto,
} from "../types";

interface Salesman360AnalyticsTabProps {
  summary: Salesmen360AnalyticsSummaryDto | undefined;
  charts: Salesmen360AnalyticsChartsDto | undefined;
  colors: ThemeColors;
  isSingleCurrency: boolean;
  summaryError: Error | null;
  chartsError: Error | null;
  isSummaryLoading: boolean;
  isChartsLoading: boolean;
}

function formatAmount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateOnly(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) {
    return "—";
  }
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function Salesman360AnalyticsTab({
  summary,
  charts,
  colors,
  isSingleCurrency,
  summaryError,
  chartsError,
}: Salesman360AnalyticsTabProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const accentCardBorder =
    colors.accent.startsWith("#") && colors.accent.length === 7
      ? `${colors.accent}${isDark ? "30" : "28"}`
      : colors.accent;
  const currencyCardShadow = Platform.select({
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
  const locale = i18n.language === "tr" ? "tr-TR" : "en-US";
  const formatAmountCb = useCallback(
    (v: number) => formatAmount(v, locale),
    [locale]
  );

  const noDataKey = t("common.noData");
  const amountComparisonByCurrency = charts?.amountComparisonByCurrency ?? [];
  const totalsByCurrency: Salesmen360CurrencyAmountDto[] = summary?.totalsByCurrency ?? [];

  if (summaryError) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("salesman360.analytics.error")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabRoot}>
      {isSingleCurrency ? (
        <>
          <View style={styles.summaryRow}>
            <KpiCard
              label={t("salesman360.analytics.last12MonthsOrderAmount")}
              value={formatAmountCb(summary?.last12MonthsOrderAmount ?? 0)}
              colors={colors}
              variant="analyticsOrders"
            />
            <KpiCard
              label={t("salesman360.analytics.openQuotationAmount")}
              value={formatAmountCb(summary?.openQuotationAmount ?? 0)}
              colors={colors}
              variant="analyticsOpenQuotation"
            />
          </View>
          <View style={styles.summaryRow}>
            <KpiCard
              label={t("salesman360.analytics.openOrderAmount")}
              value={formatAmountCb(summary?.openOrderAmount ?? 0)}
              colors={colors}
              variant="analyticsOpenOrder"
            />
            <KpiCard
              label={t("salesman360.analytics.activityCount")}
              value={summary?.activityCount ?? 0}
              colors={colors}
              variant="analyticsActivity"
            />
          </View>
          <View style={styles.summaryRow}>
            <KpiCard
              label={t("salesman360.analytics.lastActivityDate")}
              value={formatDateOnly(summary?.lastActivityDate, locale)}
              colors={colors}
              variant="analyticsDate"
              style={styles.kpiFull}
            />
          </View>
        </>
      ) : (
        totalsByCurrency.length > 0 && (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.currencyStripContent}
          >
            {totalsByCurrency.map((row, index) => (
              <View
                key={row.currency}
                style={[
                  styles.currencyCard,
                  index < totalsByCurrency.length - 1 ? styles.currencyCardSpacer : null,
                  currencyCardShadow,
                  { backgroundColor: colors.card, borderColor: accentCardBorder },
                ]}
              >
                <View style={styles.currencyCardHead}>
                  <Text style={[styles.currencyCardTitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {row.currency}
                  </Text>
                  <Coins01Icon size={14} color={colors.textMuted} variant="stroke" strokeWidth={1.65} />
                </View>
                <View style={styles.currencyMetric}>
                  <Text style={[styles.currencyMetricLabel, { color: colors.textMuted }]}>
                    {t("salesman360.currencyTotals.demandAmount")}
                  </Text>
                  <Text style={[styles.currencyMetricValue, { color: colors.textSecondary }]}>
                    {formatAmountCb(row.demandAmount)}
                  </Text>
                </View>
                <View style={styles.currencyMetric}>
                  <Text style={[styles.currencyMetricLabel, { color: colors.textMuted }]}>
                    {t("salesman360.currencyTotals.quotationAmount")}
                  </Text>
                  <Text style={[styles.currencyMetricValue, { color: colors.text }]}>
                    {formatAmountCb(row.quotationAmount)}
                  </Text>
                </View>
                <View style={styles.currencyMetric}>
                  <Text style={[styles.currencyMetricLabel, { color: colors.textMuted }]}>
                    {t("salesman360.currencyTotals.orderAmount")}
                  </Text>
                  <Text style={[styles.currencyMetricValue, { color: colors.accent }]}>
                    {formatAmountCb(row.orderAmount)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )
      )}

      {amountComparisonByCurrency.length > 0 ? (
        <AmountComparisonTable
          items={amountComparisonByCurrency}
          colors={colors}
          formatAmount={formatAmountCb}
          title={t("salesman360.analyticsCharts.amountComparisonTitle")}
          headerCurrencyShort={t("salesman360.analyticsCharts.amountTableHeaderCurrencyShort")}
          headerLast12Short={t("salesman360.analyticsCharts.amountTableHeaderLast12Short")}
          headerOpenQuotShort={t("salesman360.analyticsCharts.amountTableHeaderOpenQuotShort")}
          headerOpenOrderShort={t("salesman360.analyticsCharts.amountTableHeaderOpenOrderShort")}
          columnGuideHint={t("salesman360.analyticsCharts.amountTableColumnGuideHint")}
          noDataKey={noDataKey}
        />
      ) : null}

      {chartsError ? (
        <View style={styles.chartError}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {t("salesman360.analytics.error")}
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>
            {t("salesman360.analyticsCharts.distributionTitle")}
          </Text>
          <DistributionPieChart
            data={
              charts?.distribution ?? {
                demandCount: 0,
                quotationCount: 0,
                orderCount: 0,
              }
            }
            colors={colors}
            noDataKey={noDataKey}
            demandLabel={t("salesman360.analyticsCharts.demand")}
            quotationLabel={t("salesman360.analyticsCharts.quotation")}
            orderLabel={t("salesman360.analyticsCharts.order")}
          />
          <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>
            {t("salesman360.analyticsCharts.monthlyTrendTitle")}
          </Text>
          <MonthlyTrendLineChart
            data={charts?.monthlyTrend ?? []}
            colors={colors}
            noDataKey={noDataKey}
            demandLabel={t("salesman360.analyticsCharts.demand")}
            quotationLabel={t("salesman360.analyticsCharts.quotation")}
            orderLabel={t("salesman360.analyticsCharts.order")}
            swipeHint={t("salesman360.analyticsCharts.chartSwipeHint")}
          />
          {isSingleCurrency ? (
            <>
              <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>
                {t("salesman360.analyticsCharts.amountComparisonTitle")}
              </Text>
              <AmountComparisonBarChart
                data={
                  charts?.amountComparison ?? {
                    last12MonthsOrderAmount: 0,
                    openQuotationAmount: 0,
                    openOrderAmount: 0,
                  }
                }
                colors={colors}
                noDataKey={noDataKey}
                last12Label={t("salesman360.analyticsCharts.last12MonthsOrderAmount")}
                openQuotationLabel={t("salesman360.analyticsCharts.openQuotationAmount")}
                openOrderLabel={t("salesman360.analyticsCharts.openOrderAmount")}
                formatAmount={formatAmountCb}
              />
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRoot: {
    paddingTop: 6,
  },
  centered: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  currencyStripContent: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingBottom: 2,
    marginBottom: 16,
  },
  kpiFull: {
    flexBasis: "100%",
    minWidth: "100%",
  },
  currencyCard: {
    width: 162,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  currencyCardSpacer: {
    marginRight: 11,
  },
  currencyCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 6,
  },
  currencyCardTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    flex: 1,
  },
  currencyMetric: {
    marginBottom: 6,
  },
  currencyMetricLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 2,
    lineHeight: 12,
  },
  currencyMetricValue: {
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.12,
    marginBottom: 10,
    marginTop: 4,
  },
  chartError: {
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
});
