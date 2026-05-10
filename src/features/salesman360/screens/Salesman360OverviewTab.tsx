import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  type DimensionValue,
} from "react-native";
import { useTranslation } from "react-i18next";
import { KpiCard, CurrencyTotalsTable } from "../components";
import { Text } from "../../../components/ui/text";
import type { ThemeColors } from "../../../constants/theme";
import { useUIStore } from "../../../store/ui";
import {
  AnalyticsUpIcon,
  FlashIcon,
  InformationCircleIcon,
  UserMultipleIcon,
} from "hugeicons-react-native";
import type { CohortRetentionDto, RecommendedActionDto, Salesmen360OverviewDto } from "../types";

interface Salesman360OverviewTabProps {
  data: Salesmen360OverviewDto | undefined;
  colors: ThemeColors;
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

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function hexAlpha(hex: string, alphaSuffix: string): string {
  if (hex.startsWith("#") && hex.length === 7) {
    return `${hex}${alphaSuffix}`;
  }
  return hex;
}

function cohortRateLabelColor(rate: number, colors: ThemeColors, isDark: boolean): string {
  if (rate < 0.05) {
    return colors.textMuted;
  }
  if (rate >= 99.5) {
    return isDark ? colors.onAccent : colors.accent;
  }
  return colors.text;
}

const CohortRetentionRow = React.memo(function CohortRetentionRow({
  periodMonth,
  retentionRate,
  colors,
  isDark,
}: {
  periodMonth: string;
  retentionRate: number;
  colors: ThemeColors;
  isDark: boolean;
}): React.ReactElement {
  const pct = clampScore(retentionRate);
  const widthPct = `${pct}%` as DimensionValue;
  const trackBg = isDark ? "rgba(255,255,255,0.07)" : colors.border;
  const pctColor = cohortRateLabelColor(retentionRate, colors, isDark);
  const showFill = retentionRate > 0.04;
  return (
    <View style={styles.cohortRowBar}>
      <Text style={[styles.cohortRowMonth, { color: colors.textMuted }]} numberOfLines={1}>
        {periodMonth}
      </Text>
      <View style={styles.cohortBarCluster}>
        <View style={[styles.cohortBarTrack, { backgroundColor: trackBg }]}>
          {showFill ? (
            <View
              style={[styles.cohortBarFill, { width: widthPct, backgroundColor: colors.accent }]}
            />
          ) : null}
        </View>
        <Text style={[styles.cohortBarPct, { color: pctColor }]}>{retentionRate.toFixed(1)}%</Text>
      </View>
    </View>
  );
});

function QualityScoreBar({
  label,
  value,
  fillColor,
  colors,
}: {
  label: string;
  value: number;
  fillColor: string;
  colors: ThemeColors;
}): React.ReactElement {
  const widthPct = `${clampScore(value)}%`;
  return (
    <View style={styles.qualityBlock}>
      <View style={styles.qualityTop}>
        <Text style={[styles.qualityLabel, { color: colors.textMuted }]} numberOfLines={2}>
          {label}
        </Text>
        <Text style={[styles.qualityValue, { color: fillColor }]}>{value.toFixed(1)}</Text>
      </View>
      <View style={[styles.qualityTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.qualityFill,
            { width: widthPct as DimensionValue, backgroundColor: fillColor },
          ]}
        />
      </View>
    </View>
  );
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
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
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

  const churn = typeof revenueQuality?.churnRiskScore === "number" ? revenueQuality.churnRiskScore : 0;
  const upsell =
    typeof revenueQuality?.upsellPropensityScore === "number" ? revenueQuality.upsellPropensityScore : 0;
  const payment =
    typeof revenueQuality?.paymentBehaviorScore === "number" ? revenueQuality.paymentBehaviorScore : 0;

  const revenuePanelBorder = hexAlpha(colors.accent, isDark ? "38" : "4A");
  const actionsPanelBorder = hexAlpha(colors.accent, isDark ? "36" : "44");
  const featuredPanelShadow = Platform.select({
    ios: {
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.14 : 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: isDark ? 3 : 2,
    },
    default: {},
  });
  const actionsPanelShadow = Platform.select({
    ios: {
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: isDark ? 0.11 : 0.06,
      shadowRadius: 14,
    },
    android: {
      elevation: isDark ? 3 : 2,
    },
    default: {},
  });

  const cohortPanelBorder = hexAlpha(colors.accent, isDark ? "34" : "42");
  const cohortPoints = firstCohort?.points ?? [];
  const cohortSepColor = isDark ? "rgba(255,255,255,0.06)" : colors.border;

  const onCohortInfoPress = useCallback(() => {
    Alert.alert(t("salesman360.cohort.infoTitle"), t("salesman360.cohort.infoMessage"));
  }, [t]);

  return (
    <View style={styles.tabRoot}>
      <View style={styles.kpiRow}>
        <KpiCard
          label={t("salesman360.kpi.totalDemands")}
          value={kpis.totalDemands}
          colors={colors}
          variant="demands"
        />
        <KpiCard
          label={t("salesman360.kpi.totalQuotations")}
          value={kpis.totalQuotations}
          colors={colors}
          variant="quotations"
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label={t("salesman360.kpi.totalOrders")}
          value={kpis.totalOrders}
          colors={colors}
          variant="orders"
        />
        <KpiCard
          label={t("salesman360.kpi.totalActivities")}
          value={kpis.totalActivities}
          colors={colors}
          variant="activities"
        />
      </View>
      {isSingleCurrency ? (
        <View style={styles.kpiRow}>
          <KpiCard
            label={t("salesman360.kpi.totalDemandAmount")}
            value={formatAmountCb(kpis.totalDemandAmount)}
            colors={colors}
            variant="amountDemand"
          />
          <KpiCard
            label={t("salesman360.kpi.totalQuotationAmount")}
            value={formatAmountCb(kpis.totalQuotationAmount)}
            colors={colors}
            variant="amountQuotation"
          />
          <KpiCard
            label={t("salesman360.kpi.totalOrderAmount")}
            value={formatAmountCb(kpis.totalOrderAmount)}
            colors={colors}
            variant="amountOrder"
            style={styles.kpiWide}
          />
        </View>
      ) : null}
      <View style={styles.panelGrid}>
        <View
          style={[
            styles.panelCard,
            styles.panelCardFeatured,
            featuredPanelShadow,
            { backgroundColor: colors.card, borderColor: revenuePanelBorder },
          ]}
        >
          <View style={styles.panelHeadCompact}>
            <View
              style={[
                styles.panelHeadIconWrapCompact,
                {
                  borderColor: hexAlpha(colors.accent, isDark ? "45" : "35"),
                  backgroundColor: hexAlpha(colors.accent, isDark ? "14" : "0C"),
                },
              ]}
            >
              <AnalyticsUpIcon size={15} color={colors.accent} variant="stroke" strokeWidth={1.75} />
            </View>
            <Text style={[styles.panelTitleCompact, { color: colors.textSecondary }]}>
              {t("salesman360.revenueQuality.title")}
            </Text>
          </View>
          <View style={[styles.panelHeadRuleCompact, { backgroundColor: colors.border }]} />
          <QualityScoreBar
            label={t("salesman360.revenueQuality.churnRisk")}
            value={churn}
            fillColor={colors.accent}
            colors={colors}
          />
          <QualityScoreBar
            label={t("salesman360.revenueQuality.upsell")}
            value={upsell}
            fillColor={colors.accentSecondary}
            colors={colors}
          />
          <QualityScoreBar
            label={t("salesman360.revenueQuality.payment")}
            value={payment}
            fillColor={colors.accentTertiary}
            colors={colors}
          />
          <View style={[styles.scoreRow, { marginTop: 2 }]}>
            <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>
              {t("salesman360.revenueQuality.segment")}
            </Text>
            <Text
              style={[
                styles.segmentBadge,
                {
                  color: colors.textSecondary,
                  borderColor: hexAlpha(colors.accent, isDark ? "40" : "32"),
                  backgroundColor: hexAlpha(colors.accent, isDark ? "10" : "08"),
                },
              ]}
            >
              {revenueQuality?.rfmSegment || "—"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.panelCard,
            styles.panelCardFeatured,
            styles.panelCardActionsCompact,
            actionsPanelShadow,
            { backgroundColor: colors.card, borderColor: actionsPanelBorder },
          ]}
        >
          <View style={[styles.panelHeadDividerActions, { borderBottomColor: colors.border }]}>
            <View style={styles.panelHeadCompact}>
              <View
                style={[
                  styles.panelHeadIconWrapCompact,
                  {
                    borderColor: hexAlpha(colors.accent, isDark ? "42" : "34"),
                    backgroundColor: hexAlpha(colors.accent, isDark ? "10" : "0A"),
                  },
                ]}
              >
                <FlashIcon size={14} color={colors.accent} variant="stroke" strokeWidth={1.65} />
              </View>
              <Text style={[styles.panelTitleCompact, { color: colors.textSecondary }]}>
                {t("salesman360.actions.title")}
              </Text>
            </View>
          </View>
          {recommendedActions.length === 0 ? (
            <Text style={[styles.actionsEmptyText, { color: colors.textMuted }]}>
              {t("salesman360.actions.empty")}
            </Text>
          ) : (
            recommendedActions.slice(0, 3).map((action, index) => (
              <View
                key={`${action.actionCode}-${action.title}`}
                style={[
                  styles.actionRowCompact,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.actionBulletCompact,
                    {
                      borderColor: hexAlpha(colors.accent, isDark ? "55" : "45"),
                      backgroundColor: "transparent",
                    },
                  ]}
                />
                <View style={styles.actionBody}>
                  <Text style={[styles.actionTitleCompact, { color: colors.text }]} numberOfLines={2}>
                    {action.title}
                  </Text>
                  {action.reason ? (
                    <Text
                      style={[styles.actionReasonCompact, { color: colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {action.reason}
                    </Text>
                  ) : null}
                </View>
                {onExecuteAction ? (
                  <TouchableOpacity
                    disabled={isActionExecuting}
                    onPress={() => onExecuteAction(action)}
                    style={[
                      styles.actionButtonCompact,
                      {
                        backgroundColor: hexAlpha(colors.accent, isDark ? "10" : "08"),
                        borderColor: hexAlpha(colors.accent, isDark ? "4A" : "38"),
                      },
                      isActionExecuting && styles.actionButtonDisabled,
                    ]}
                  >
                    <Text style={[styles.actionButtonTextCompact, { color: colors.accent }]}>
                      {t("salesman360.actions.execute")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View
          style={[
            styles.panelCard,
            styles.panelCardFeatured,
            featuredPanelShadow,
            { backgroundColor: colors.card, borderColor: cohortPanelBorder },
          ]}
        >
          <View style={styles.panelHeadCompact}>
            <View
              style={[
                styles.panelHeadIconWrapCompact,
                {
                  borderColor: hexAlpha(colors.accent, isDark ? "40" : "32"),
                  backgroundColor: hexAlpha(colors.accent, isDark ? "10" : "08"),
                },
              ]}
            >
              <UserMultipleIcon size={15} color={colors.accent} variant="stroke" strokeWidth={1.75} />
            </View>
            <Text style={[styles.panelTitleCompact, { color: colors.textSecondary, flex: 1 }]}>
              {t("salesman360.cohort.title")}
            </Text>
            <TouchableOpacity
              onPress={onCohortInfoPress}
              accessibilityRole="button"
              accessibilityLabel={t("salesman360.cohort.infoA11y")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <InformationCircleIcon
                size={18}
                color={colors.textMuted}
                variant="stroke"
                strokeWidth={1.75}
              />
            </TouchableOpacity>
          </View>
          <View style={[styles.panelHeadRuleCompact, { backgroundColor: colors.border }]} />
          {isCohortLoading ? (
            <View style={styles.cohortLoadingWrap}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : cohortPoints.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t("salesman360.cohort.empty")}
            </Text>
          ) : (
            <>
              <View
                style={[
                  styles.cohortFilterPill,
                  {
                    borderColor: hexAlpha(colors.accent, isDark ? "28" : "22"),
                    backgroundColor: hexAlpha(colors.accent, isDark ? "0C" : "07"),
                  },
                ]}
              >
                <Text style={[styles.cohortFilterPillLabel, { color: colors.textMuted }]}>
                  {t("salesman360.cohort.badgeLabel")}
                </Text>
                <Text
                  style={[styles.cohortFilterPillValue, { color: colors.accent }]}
                  numberOfLines={1}
                >
                  {firstCohort?.cohortKey ?? t("salesman360.cohort.valuePlaceholder")}
                </Text>
              </View>
              <ScrollView
                style={styles.cohortScroll}
                contentContainerStyle={styles.cohortScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {cohortPoints.map((point, index) => (
                  <React.Fragment key={`${point.periodMonth}-${point.periodIndex}`}>
                    {index > 0 ? (
                      <View style={[styles.cohortItemSeparator, { backgroundColor: cohortSepColor }]} />
                    ) : null}
                    <CohortRetentionRow
                      periodMonth={point.periodMonth}
                      retentionRate={point.retentionRate}
                      colors={colors}
                      isDark={isDark}
                    />
                  </React.Fragment>
                ))}
              </ScrollView>
            </>
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
    </View>
  );
}

const styles = StyleSheet.create({
  tabRoot: {
    paddingTop: 6,
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  kpiWide: {
    flexBasis: "100%",
    minWidth: "100%",
  },
  panelGrid: {
    gap: 14,
    marginBottom: 16,
  },
  panelCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  panelCardFeatured: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  panelCardActionsCompact: {
    padding: 10,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 0,
  },
  panelHeadCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 0,
  },
  panelHeadIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  panelHeadIconWrapCompact: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  panelHeadRule: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    marginTop: 12,
    marginBottom: 14,
    opacity: 0.85,
  },
  panelHeadRuleCompact: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    marginTop: 8,
    marginBottom: 10,
    opacity: 0.85,
  },
  panelHeadDividerActions: {
    marginHorizontal: -10,
    marginTop: -1,
    paddingHorizontal: 10,
    paddingBottom: 7,
    marginBottom: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    flex: 1,
  },
  panelTitleCompact: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.12,
    flex: 1,
  },
  qualityBlock: {
    marginBottom: 9,
  },
  qualityTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 5,
  },
  qualityLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  qualityValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  qualityTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  qualityFill: {
    height: "100%",
    borderRadius: 999,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 4,
  },
  scoreLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  segmentBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 18,
  },
  actionsEmptyText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
  },
  actionRowCompact: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingVertical: 7,
  },
  actionBullet: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    marginTop: 5,
  },
  actionBulletCompact: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    marginTop: 4,
  },
  actionBody: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionTitleCompact: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  actionReason: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  actionReasonCompact: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  actionButton: {
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginLeft: 4,
  },
  actionButtonCompact: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 2,
    alignSelf: "flex-start",
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "800",
  },
  actionButtonTextCompact: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  cohortLoadingWrap: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cohortScroll: {
    width: "100%",
    maxHeight: 188,
  },
  cohortScrollContent: {
    flexGrow: 0,
    paddingBottom: 2,
  },
  cohortFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 11,
    marginBottom: 10,
  },
  cohortFilterPillLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  cohortFilterPillValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  cohortRowBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  cohortRowMonth: {
    width: 78,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "600",
  },
  cohortBarCluster: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  cohortBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    minWidth: 52,
  },
  cohortBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  cohortBarPct: {
    fontSize: 11,
    fontWeight: "800",
    minWidth: 46,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  cohortItemSeparator: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.9,
  },
});
