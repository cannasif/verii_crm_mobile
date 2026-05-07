import React, { useCallback } from "react";
import { ActivityIndicator, TouchableOpacity, View, StyleSheet } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useTranslation } from "react-i18next";
import { KpiCard, CurrencyTotalsTable } from "../components";
import { Text } from "../../../components/ui/text";
import type { CohortRetentionDto, RecommendedActionDto, Salesmen360OverviewDto } from "../types";

interface Salesman360OverviewTabProps {
  data: Salesmen360OverviewDto | undefined;
  colors: Record<string, string>;
  isSingleCurrency: boolean;
  cohort?: CohortRetentionDto[];
  isCohortLoading?: boolean;
  isActionExecuting?: boolean;
  onExecuteAction?: (action: RecommendedActionDto) => void;
}

function formatAmount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function Salesman360OverviewTab({
  data,
  colors,
  isSingleCurrency,
  cohort = [],
  isCohortLoading = false,
  isActionExecuting = false,
  onExecuteAction,
}: Salesman360OverviewTabProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "tr" ? "tr-TR" : "en-US";
  const formatAmountCb = useCallback(
    (v: number) => formatAmount(v, locale),
    [locale]
  );

  const kpis = data?.kpis ?? {
    currency: null,
    totalDemands: 0,
    totalQuotations: 0,
    totalOrders: 0,
    totalActivities: 0,
    totalDemandAmount: 0,
    totalQuotationAmount: 0,
    totalOrderAmount: 0,
    totalsByCurrency: [],
  };
  const totalsByCurrency = kpis.totalsByCurrency ?? [];
  const revenueQuality = data?.revenueQuality ?? null;
  const recommendedActions = data?.recommendedActions ?? [];
  const firstCohort = cohort[0];
  const noDataKey = t("common.noData");

  return (
    <FlatListScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.kpiRow}>
        <KpiCard
          label={t("salesman360.kpi.totalDemands")}
          value={kpis.totalDemands}
          colors={colors}
        />
        <KpiCard
          label={t("salesman360.kpi.totalQuotations")}
          value={kpis.totalQuotations}
          colors={colors}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label={t("salesman360.kpi.totalOrders")}
          value={kpis.totalOrders}
          colors={colors}
        />
        <KpiCard
          label={t("salesman360.kpi.totalActivities")}
          value={kpis.totalActivities}
          colors={colors}
        />
      </View>
      {isSingleCurrency ? (
        <View style={styles.kpiRow}>
          <KpiCard
            label={t("salesman360.kpi.totalDemandAmount")}
            value={formatAmountCb(kpis.totalDemandAmount)}
            colors={colors}
          />
          <KpiCard
            label={t("salesman360.kpi.totalQuotationAmount")}
            value={formatAmountCb(kpis.totalQuotationAmount)}
            colors={colors}
          />
          <KpiCard
            label={t("salesman360.kpi.totalOrderAmount")}
            value={formatAmountCb(kpis.totalOrderAmount)}
            colors={colors}
          />
        </View>
      ) : null}
      <View style={styles.panelGrid}>
        <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            {t("salesman360.revenueQuality.title")}
          </Text>
          <ScoreRow label={t("salesman360.revenueQuality.churnRisk")} value={revenueQuality?.churnRiskScore} colors={colors} />
          <ScoreRow label={t("salesman360.revenueQuality.upsell")} value={revenueQuality?.upsellPropensityScore} colors={colors} />
          <ScoreRow label={t("salesman360.revenueQuality.payment")} value={revenueQuality?.paymentBehaviorScore} colors={colors} />
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>
              {t("salesman360.revenueQuality.segment")}
            </Text>
            <Text style={[styles.segmentBadge, { color: colors.text, borderColor: colors.cardBorder }]}>
              {revenueQuality?.rfmSegment || "-"}
            </Text>
          </View>
        </View>

        <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            {t("salesman360.actions.title")}
          </Text>
          {recommendedActions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t("salesman360.actions.empty")}
            </Text>
          ) : (
            recommendedActions.slice(0, 3).map((action) => (
              <View key={`${action.actionCode}-${action.title}`} style={[styles.actionCard, { borderColor: colors.cardBorder }]}>
                <Text style={[styles.actionTitle, { color: colors.text }]} numberOfLines={2}>
                  {action.title}
                </Text>
                {action.reason ? (
                  <Text style={[styles.actionReason, { color: colors.textMuted }]} numberOfLines={3}>
                    {action.reason}
                  </Text>
                ) : null}
                {onExecuteAction ? (
                  <TouchableOpacity
                    disabled={isActionExecuting}
                    onPress={() => onExecuteAction(action)}
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.accent },
                      isActionExecuting && styles.actionButtonDisabled,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      {t("salesman360.actions.execute")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            {t("salesman360.cohort.title")}
          </Text>
          {isCohortLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : !firstCohort?.points?.length ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t("salesman360.cohort.empty")}
            </Text>
          ) : (
            <View style={styles.cohortList}>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>
                  {t("salesman360.cohort.cohortKey")}
                </Text>
                <Text style={[styles.cohortKey, { color: colors.accent }]}>
                  {firstCohort.cohortKey}
                </Text>
              </View>
              {firstCohort.points.slice(0, 6).map((point) => (
                <View key={`${point.periodMonth}-${point.periodIndex}`} style={styles.cohortRow}>
                  <Text style={[styles.cohortMonth, { color: colors.textMuted }]}>
                    {point.periodMonth}
                  </Text>
                  <Text style={[styles.cohortRate, { color: colors.text }]}>
                    {point.retentionRate.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <CurrencyTotalsTable
        items={totalsByCurrency}
        colors={colors}
        formatAmount={formatAmountCb}
        title={t("salesman360.currencyTotals.title")}
        currencyLabel={t("salesman360.currencyTotals.currency")}
        demandAmountLabel={t("salesman360.currencyTotals.demandAmount")}
        quotationAmountLabel={t("salesman360.currencyTotals.quotationAmount")}
        orderAmountLabel={t("salesman360.currencyTotals.orderAmount")}
        noDataKey={noDataKey}
      />
    </FlatListScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  panelGrid: {
    gap: 12,
    marginBottom: 16,
  },
  panelCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  scoreLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  segmentBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 18,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionReason: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  actionButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  cohortList: {
    gap: 2,
  },
  cohortKey: {
    fontSize: 13,
    fontWeight: "800",
  },
  cohortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  cohortMonth: {
    fontSize: 13,
    fontWeight: "600",
  },
  cohortRate: {
    fontSize: 13,
    fontWeight: "800",
  },
});

function ScoreRow({
  label,
  value,
  colors,
}: {
  label: string;
  value?: number | null;
  colors: Record<string, string>;
}): React.ReactElement {
  const safeValue = typeof value === "number" ? value : 0;
  return (
    <View style={styles.scoreRow}>
      <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.scoreValue, { color: colors.text }]}>{safeValue.toFixed(1)}</Text>
    </View>
  );
}
