import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  CurrencyTotalsTable,
  AmountComparisonTable,
  DistributionPieChart,
  MonthlyTrendLineChart,
  AmountComparisonBarChart,
} from "../components";
import type {
  Customer360AnalyticsSummaryDto,
  Customer360AnalyticsChartsDto,
  Customer360CurrencyAmountDto,
} from "../types";
import {
  AnalyticsUpIcon,
  Calendar03Icon,
  Invoice03Icon,
  ShoppingBag03Icon,
  Activity01Icon,
  Alert02Icon,
} from "hugeicons-react-native";

interface Customer360AnalyticsTabProps {
  summary: Customer360AnalyticsSummaryDto | undefined;
  charts: Customer360AnalyticsChartsDto | undefined;
  colors: Record<string, string>;
  isSingleCurrency: boolean;
  isSummaryLoading: boolean;
  isChartsLoading: boolean;
  summaryError: Error | null;
  chartsError: Error | null;
}

function formatAmount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateOnly(
  dateStr: string | null | undefined,
  locale: string
): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  titleText: string;
  mutedText: string;
  cardBg: string;
  cardBorder: string;
  iconBg: string;
}

function MetricCard({
  icon,
  label,
  value,
  titleText,
  mutedText,
  cardBg,
  cardBorder,
  iconBg,
}: MetricCardProps): React.ReactElement {
  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
        },
      ]}
    >
      <View style={styles.metricTopRow}>
        <View style={[styles.metricIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={[styles.metricLabel, { color: mutedText }]} numberOfLines={2}>
          {label}
        </Text>
      </View>

      <Text style={[styles.metricValue, { color: titleText }]} numberOfLines={2}>
        {String(value)}
      </Text>
    </View>
  );
}

interface SectionShellProps {
  title: string;
  subtitle?: string;
  titleColor: string;
  subtitleColor: string;
  backgroundColor: string;
  borderColor: string;
  children: React.ReactNode;
}

function SectionShell({
  title,
  subtitle,
  titleColor,
  subtitleColor,
  backgroundColor,
  borderColor,
  children,
}: SectionShellProps): React.ReactElement {
  return (
    <View
      style={[
        styles.sectionWrap,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubTitle, { color: subtitleColor }]}>{subtitle}</Text>
        ) : null}
      </View>

      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ContentCard({
  children,
  backgroundColor,
  borderColor,
}: {
  children: React.ReactNode;
  backgroundColor: string;
  borderColor: string;
}): React.ReactElement {
  return (
    <View
      style={[
        styles.contentCard,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      {children}
    </View>
  );
}

function Separator({ color }: { color: string }): React.ReactElement {
  return <View style={[styles.separator, { backgroundColor: color }]} />;
}

export function Customer360AnalyticsTab({
  summary,
  charts,
  colors,
  isSingleCurrency,
  summaryError,
  chartsError,
}: Customer360AnalyticsTabProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { themeMode } = useUIStore();

  const isDark = themeMode === "dark";
  const locale =
    i18n.language === "tr" ? "tr-TR" : i18n.language === "de" ? "de-DE" : "en-US";

  const formatAmountCb = useCallback(
    (v: number) => formatAmount(v, locale),
    [locale]
  );

  const noDataKey = t("common.noData");
  const totalsByCurrency: Customer360CurrencyAmountDto[] =
    summary?.totalsByCurrency ?? [];
  const amountComparisonByCurrency =
    charts?.amountComparisonByCurrency ?? [];

  const strongText = isDark ? "#F8FAFC" : "#334155";
  const mutedText = isDark ? "rgba(203,213,225,0.70)" : "#64748B";
  const softText = isDark ? "rgba(148,163,184,0.82)" : "#94A3B8";
  const accent = isDark ? "#EC4899" : "#DB2777";
  const accentSecondary = isDark ? "#F97316" : "#F59E0B";
  const accentTeal = "#14B8A6";
  const cardBg = isDark ? "rgba(19,11,27,0.72)" : "rgba(255,245,248,0.84)";
  const cardBgAlt = isDark ? "rgba(18,8,25,0.78)" : "rgba(255,250,252,0.90)";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(219,39,119,0.08)";
  const innerCardBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.96)";
  const innerCardBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(148,163,184,0.10)";
  const separatorColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.14)";
  const sectionTitleColor = isDark ? "#F8FAFC" : "#334155";
  const errorColor = colors.error;

  if (summaryError) {
    return (
      <View style={styles.centered}>
        <View
          style={[
            styles.stateCard,
            {
              backgroundColor: cardBgAlt,
              borderColor: cardBorder,
            },
          ]}
        >
          <View
            style={[
              styles.stateIconWrap,
              {
                backgroundColor: `${errorColor}12`,
                borderColor: `${errorColor}22`,
              },
            ]}
          >
            <Alert02Icon size={20} color={errorColor} variant="stroke" />
          </View>
          <Text style={[styles.errorText, { color: errorColor }]}>
            {t("customer360.analytics.error")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatListScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {isSingleCurrency ? (
        <View style={styles.metricsGrid}>
          <MetricCard
            icon={<AnalyticsUpIcon size={14} color={accent} variant="stroke" />}
            label={t("customer360.analytics.last12MonthsOrderAmount")}
            value={formatAmountCb(summary?.last12MonthsOrderAmount ?? 0)}
            titleText={strongText}
            mutedText={mutedText}
            cardBg={cardBg}
            cardBorder={cardBorder}
            iconBg={isDark ? "rgba(236,72,153,0.10)" : "rgba(236,72,153,0.08)"}
          />
          <MetricCard
            icon={<Invoice03Icon size={14} color={accentSecondary} variant="stroke" />}
            label={t("customer360.analytics.openQuotationAmount")}
            value={formatAmountCb(summary?.openQuotationAmount ?? 0)}
            titleText={strongText}
            mutedText={mutedText}
            cardBg={cardBg}
            cardBorder={cardBorder}
            iconBg={isDark ? "rgba(249,115,22,0.10)" : "rgba(249,115,22,0.08)"}
          />
          <MetricCard
            icon={<ShoppingBag03Icon size={14} color={accent} variant="stroke" />}
            label={t("customer360.analytics.openOrderAmount")}
            value={formatAmountCb(summary?.openOrderAmount ?? 0)}
            titleText={strongText}
            mutedText={mutedText}
            cardBg={cardBg}
            cardBorder={cardBorder}
            iconBg={isDark ? "rgba(236,72,153,0.10)" : "rgba(236,72,153,0.08)"}
          />
          <MetricCard
            icon={<Activity01Icon size={14} color={accentTeal} variant="stroke" />}
            label={t("customer360.analytics.activityCount")}
            value={summary?.activityCount ?? 0}
            titleText={strongText}
            mutedText={mutedText}
            cardBg={cardBg}
            cardBorder={cardBorder}
            iconBg={isDark ? "rgba(20,184,166,0.10)" : "rgba(20,184,166,0.08)"}
          />
          <MetricCard
            icon={<Calendar03Icon size={14} color={accentSecondary} variant="stroke" />}
            label={t("customer360.analytics.lastActivityDate")}
            value={formatDateOnly(summary?.lastActivityDate, locale)}
            titleText={strongText}
            mutedText={mutedText}
            cardBg={cardBg}
            cardBorder={cardBorder}
            iconBg={isDark ? "rgba(249,115,22,0.10)" : "rgba(249,115,22,0.08)"}
          />
        </View>
      ) : totalsByCurrency.length > 0 ? (
        <SectionShell
          title={t("customer360.currencyTotals.title")}
          titleColor={sectionTitleColor}
          subtitleColor={softText}
          backgroundColor={cardBgAlt}
          borderColor={cardBorder}
        >
          <ContentCard backgroundColor={innerCardBg} borderColor={innerCardBorder}>
            <CurrencyTotalsTable
              items={totalsByCurrency}
              colors={colors}
              formatAmount={formatAmountCb}
              title={t("customer360.currencyTotals.title")}
              currencyLabel={t("customer360.currencyTotals.currency")}
              demandAmountLabel={t("customer360.currencyTotals.demandAmount")}
              quotationAmountLabel={t("customer360.currencyTotals.quotationAmount")}
              orderAmountLabel={t("customer360.currencyTotals.orderAmount")}
              noDataKey={noDataKey}
            />
          </ContentCard>
        </SectionShell>
      ) : null}

      {amountComparisonByCurrency.length > 0 ? (
        <SectionShell
          title={t("customer360.analyticsCharts.amountComparisonTitle")}
          titleColor={sectionTitleColor}
          subtitleColor={softText}
          backgroundColor={cardBgAlt}
          borderColor={cardBorder}
        >
          <ContentCard backgroundColor={innerCardBg} borderColor={innerCardBorder}>
            <AmountComparisonTable
              items={amountComparisonByCurrency}
              colors={colors}
              formatAmount={formatAmountCb}
              title={t("customer360.analyticsCharts.amountComparisonTitle")}
              currencyLabel={t("customer360.currencyTotals.currency")}
              last12Label={t("customer360.analyticsCharts.last12MonthsOrderAmount")}
              openQuotationLabel={t("customer360.analyticsCharts.openQuotationAmount")}
              openOrderLabel={t("customer360.analyticsCharts.openOrderAmount")}
              noDataKey={noDataKey}
            />
          </ContentCard>
        </SectionShell>
      ) : null}

      {chartsError ? (
        <View style={styles.chartError}>
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor: cardBgAlt,
                borderColor: cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.stateIconWrap,
                {
                  backgroundColor: `${errorColor}12`,
                  borderColor: `${errorColor}22`,
                },
              ]}
            >
              <Alert02Icon size={20} color={errorColor} variant="stroke" />
            </View>
            <Text style={[styles.errorText, { color: errorColor }]}>
              {t("customer360.analytics.error")}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <SectionShell
            title={t("customer360.analyticsCharts.distributionTitle")}
            subtitle={`${t("customer360.analyticsCharts.demand")} · ${t("customer360.analyticsCharts.quotation")} · ${t("customer360.analyticsCharts.order")}`}
            titleColor={sectionTitleColor}
            subtitleColor={softText}
            backgroundColor={cardBgAlt}
            borderColor={cardBorder}
          >
            <ContentCard backgroundColor={innerCardBg} borderColor={innerCardBorder}>
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
                demandLabel={t("customer360.analyticsCharts.demand")}
                quotationLabel={t("customer360.analyticsCharts.quotation")}
                orderLabel={t("customer360.analyticsCharts.order")}
              />
            </ContentCard>

            <Separator color={separatorColor} />

            <ContentCard backgroundColor={innerCardBg} borderColor={innerCardBorder}>
              <Text style={[styles.innerCaption, { color: mutedText }]}>
                {t("customer360.analyticsCharts.distributionTitle")}
              </Text>
            </ContentCard>
          </SectionShell>

          <SectionShell
            title={t("customer360.analyticsCharts.monthlyTrendTitle")}
            subtitle={`${t("customer360.analyticsCharts.demand")} · ${t("customer360.analyticsCharts.quotation")} · ${t("customer360.analyticsCharts.order")}`}
            titleColor={sectionTitleColor}
            subtitleColor={softText}
            backgroundColor={cardBgAlt}
            borderColor={cardBorder}
          >
            <ContentCard backgroundColor={innerCardBg} borderColor={innerCardBorder}>
              <MonthlyTrendLineChart
                data={charts?.monthlyTrend ?? []}
                colors={colors}
                noDataKey={noDataKey}
                demandLabel={t("customer360.analyticsCharts.demand")}
                quotationLabel={t("customer360.analyticsCharts.quotation")}
                orderLabel={t("customer360.analyticsCharts.order")}
              />
            </ContentCard>
          </SectionShell>

          {isSingleCurrency ? (
            <SectionShell
              title={t("customer360.analyticsCharts.amountComparisonTitle")}
              subtitle={`${t("customer360.analyticsCharts.last12MonthsOrderAmount")} · ${t("customer360.analyticsCharts.openQuotationAmount")} · ${t("customer360.analyticsCharts.openOrderAmount")}`}
              titleColor={sectionTitleColor}
              subtitleColor={softText}
              backgroundColor={cardBgAlt}
              borderColor={cardBorder}
            >
              <ContentCard backgroundColor={innerCardBg} borderColor={innerCardBorder}>
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
                  last12Label={t("customer360.analyticsCharts.last12MonthsOrderAmount")}
                  openQuotationLabel={t("customer360.analyticsCharts.openQuotationAmount")}
                  openOrderLabel={t("customer360.analyticsCharts.openOrderAmount")}
                  formatAmount={formatAmountCb}
                />
              </ContentCard>
            </SectionShell>
          ) : null}
        </>
      )}
    </FlatListScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingTop: 6,
    paddingBottom: 124,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 2,
  },
  metricCard: {
    width: "48%",
    minHeight: 102,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  metricIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  metricLabel: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: "400",
    lineHeight: 14,
    marginTop: 1,
  },
  metricValue: {
    fontSize: 14.5,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 12,
  },
  sectionWrap: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionBody: {
    gap: 12,
  },
  contentCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  separator: {
    height: 1,
    marginHorizontal: 4,
    borderRadius: 999,
  },
  innerCaption: {
    fontSize: 10.5,
    fontWeight: "400",
    lineHeight: 14,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
  },
  sectionSubTitle: {
    fontSize: 10.5,
    fontWeight: "400",
    lineHeight: 14,
    marginTop: 4,
  },
  chartError: {
    paddingVertical: 2,
  },
  stateCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  stateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
});