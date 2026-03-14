import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  KpiCard,
  SectionCard,
  TimelineSection,
} from "../components";
import type { Customer360OverviewDto } from "../types";
import { Calendar03Icon } from "hugeicons-react-native";

interface Customer360OverviewTabProps {
  data: Customer360OverviewDto | undefined;
  colors: Record<string, string>;
  isFetching: boolean;
}

function formatDate(
  dateStr: string | null | undefined,
  locale: string
): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatAmount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function Customer360OverviewTab({
  data,
  colors,
}: Customer360OverviewTabProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { themeMode } = useUIStore();

  const isDark = themeMode === "dark";
  const locale =
    i18n.language === "tr" ? "tr-TR" : i18n.language === "de" ? "de-DE" : "en-US";

  const kpis = data?.kpis ?? {
    totalDemands: 0,
    totalQuotations: 0,
    totalOrders: 0,
    openQuotations: 0,
    openOrders: 0,
    lastActivityDate: null,
  };

  const contacts = data?.contacts ?? [];
  const shippingAddresses = data?.shippingAddresses ?? [];
  const recentDemands = data?.recentDemands ?? [];
  const recentQuotations = data?.recentQuotations ?? [];
  const recentOrders = data?.recentOrders ?? [];
  const recentActivities = data?.recentActivities ?? [];
  const timeline = data?.timeline ?? [];

  const formatDateCb = useCallback(
    (d: string | null | undefined) => formatDate(d, locale),
    [locale]
  );

  const formatDateTimeCb = useCallback(
    (d: string) => formatDateTime(d, locale),
    [locale]
  );

  const formatAmountCb = useCallback(
    (v: number) => formatAmount(v, locale),
    [locale]
  );

  const getStatusLabel = useCallback(
    (status: string | null | undefined): string => {
      if (status == null || status === "") return "";
      const key = `customer360.status.${status}`;
      const translated = t(key);
      return translated !== key ? translated : status;
    },
    [t]
  );

  const noDataKey = t("common.noData");
  const lastActivityText = formatDateCb(kpis.lastActivityDate);

  const surfaceBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,250,252,0.90)";
  const surfaceBorder = isDark ? "rgba(236,72,153,0.16)" : "rgba(219,39,119,0.12)";
  const divider = isDark ? "rgba(236,72,153,0.22)" : "rgba(219,39,119,0.18)";
  const mutedText = isDark ? "rgba(203,213,225,0.72)" : "#94A3B8";
  const softText = isDark ? "#E2E8F0" : "#64748B";
  const accent = isDark ? "#EC4899" : "#DB2777";

  return (
    <FlatListScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.kpiBlock}>
        <View style={styles.kpiGroup}>
          <View style={styles.kpiRow}>
            <KpiCard
              label={t("customer360.kpi.totalQuotations")}
              value={kpis.totalQuotations}
              colors={colors}
            />
            <KpiCard
              label={t("customer360.kpi.totalOrders")}
              value={kpis.totalOrders}
              colors={colors}
            />
            <KpiCard
              label={t("customer360.kpi.totalDemands")}
              value={kpis.totalDemands}
              colors={colors}
            />
          </View>

          <View style={styles.kpiRowTwo}>
            <View style={styles.kpiHalf}>
              <KpiCard
                label={t("customer360.kpi.openQuotations")}
                value={kpis.openQuotations}
                colors={colors}
              />
            </View>
            <View style={styles.kpiHalf}>
              <KpiCard
                label={t("customer360.kpi.openOrders")}
                value={kpis.openOrders}
                colors={colors}
              />
            </View>
          </View>
        </View>

        {lastActivityText ? (
          <View
            style={[
              styles.lastActivityCard,
              {
                backgroundColor: surfaceBg,
                borderColor: surfaceBorder,
              },
            ]}
          >
            <View
              style={[
                styles.lastActivityIconWrap,
                {
                  backgroundColor: `${accent}10`,
                  borderColor: `${accent}22`,
                },
              ]}
            >
              <Calendar03Icon size={14} color={accent} variant="stroke" />
            </View>

            <View style={styles.lastActivityTextWrap}>
              <Text style={[styles.lastActivityLabel, { color: mutedText }]}>
                {t("customer360.kpi.lastActivityDate")}
              </Text>
              <Text style={[styles.lastActivityValue, { color: softText }]}>
                {lastActivityText}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionGroup}>
        <SectionCard
          title={t("customer360.sections.contacts")}
          items={contacts}
          colors={colors}
          noDataKey={noDataKey}
          formatDate={formatDateCb}
        />

        <View style={[styles.sectionDivider, { backgroundColor: divider }]} />

        <SectionCard
          title={t("customer360.sections.shippingAddresses")}
          items={shippingAddresses}
          colors={colors}
          noDataKey={noDataKey}
          formatDate={formatDateCb}
        />

        <View style={[styles.sectionDivider, { backgroundColor: divider }]} />

        <SectionCard
          title={t("customer360.sections.recentQuotations")}
          items={recentQuotations}
          colors={colors}
          noDataKey={noDataKey}
          formatDate={formatDateCb}
        />

        <View style={[styles.sectionDivider, { backgroundColor: divider }]} />

        <SectionCard
          title={t("customer360.sections.recentOrders")}
          items={recentOrders}
          colors={colors}
          noDataKey={noDataKey}
          formatDate={formatDateCb}
        />

        <View style={[styles.sectionDivider, { backgroundColor: divider }]} />

        <SectionCard
          title={t("customer360.sections.recentDemands")}
          items={recentDemands}
          colors={colors}
          noDataKey={noDataKey}
          formatDate={formatDateCb}
        />

        <View style={[styles.sectionDivider, { backgroundColor: divider }]} />

        <SectionCard
          title={t("customer360.sections.recentActivities")}
          items={recentActivities}
          colors={colors}
          noDataKey={noDataKey}
          formatDate={formatDateCb}
        />
      </View>

      <View style={styles.timelineWrap}>
        <TimelineSection
          title={t("customer360.sections.timeline")}
          timeline={timeline}
          colors={colors}
          noDataKey={noDataKey}
          formatDateTime={formatDateTimeCb}
          getStatusLabel={getStatusLabel}
          formatAmount={formatAmountCb}
        />
      </View>
    </FlatListScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 128,
  },
  kpiBlock: {
    marginBottom: 24,
  },
  kpiGroup: {
    gap: 14,
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiRowTwo: {
    flexDirection: "row",
    gap: 12,
  },
  kpiHalf: {
    flex: 1,
  },
  lastActivityCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  lastActivityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  lastActivityTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  lastActivityLabel: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  lastActivityValue: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  sectionGroup: {
    gap: 12,
  },
  sectionDivider: {
    height: 1.5,
    marginHorizontal: 6,
    borderRadius: 999,
    opacity: 1,
  },
  timelineWrap: {
    marginTop: 24,
  },
});
