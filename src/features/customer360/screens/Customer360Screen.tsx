import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../../components/ui/text";
import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import {
  useCustomer360Overview,
  useCustomer360AnalyticsSummary,
  useCustomer360AnalyticsCharts,
  useCustomer360QuickQuotations,
  useCustomer360ErpMovements,
  useCustomer360ErpBalance,
} from "../hooks";
import { CurrencyPicker } from "../components";
import { Customer360OverviewTab } from "./Customer360OverviewTab";
import { Customer360AnalyticsTab } from "./Customer360AnalyticsTab";
import { Customer360MailLogsTab } from "./Customer360MailLogsTab";
import { Customer360QuickQuotationsTab } from "./Customer360QuickQuotationsTab";
import { Customer360ErpMovementsTab } from "./Customer360ErpMovementsTab";
import {
  AnalyticsUpIcon,
  ChartAverageIcon,
  Invoice03Icon,
  Mail01Icon,
  ArrowDataTransferHorizontalIcon,
  Rotate360Icon,
  Alert02Icon,
  UserIcon,
} from "hugeicons-react-native";

type TabType = "overview" | "analytics" | "quickQuotations" | "erpMovements" | "mailLogs";

function collectCurrencyOptions(
  summaryCurrencies: { currency: string }[],
  chartsCurrencies: { currency?: string | null }[]
): string[] {
  const set = new Set<string>();
  summaryCurrencies.forEach((r) => {
    if (r.currency) set.add(r.currency);
  });
  chartsCurrencies.forEach((r) => {
    if (r.currency) set.add(r.currency);
  });
  return Array.from(set).sort();
}

function isNotFoundError(error: Error | null): boolean {
  if (!error) return false;
  const msg = (error as Error & { status?: number }).status;
  const message = error.message?.toLowerCase() ?? "";
  return msg === 404 || message.includes("not found") || message.includes("bulunamadı");
}

export function Customer360Screen(): React.ReactElement {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, themeMode } = useUIStore();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL");

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (isDark
    ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
    : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]) as [
    string,
    string,
    ...string[]
  ];

  const customerId = useMemo(() => {
    if (id == null || id === "") return undefined;
    const num = Number(id);
    return Number.isFinite(num) && num > 0 ? num : undefined;
  }, [id]);

  const currencyParam = selectedCurrency === "ALL" ? null : selectedCurrency;
  const overviewQuery = useCustomer360Overview(customerId, currencyParam);
  const summaryQuery = useCustomer360AnalyticsSummary(customerId, currencyParam);
  const chartsQuery = useCustomer360AnalyticsCharts(customerId, 12, currencyParam);
  const quickQuotationsQuery = useCustomer360QuickQuotations(customerId);
  const erpMovementsQuery = useCustomer360ErpMovements(customerId);
  const erpBalanceQuery = useCustomer360ErpBalance(customerId);

  const currencyOptions = useMemo(() => {
    const summary = summaryQuery.data?.totalsByCurrency ?? [];
    const charts = chartsQuery.data?.amountComparisonByCurrency ?? [];
    return collectCurrencyOptions(summary, charts);
  }, [
    summaryQuery.data?.totalsByCurrency,
    chartsQuery.data?.amountComparisonByCurrency,
  ]);

  const isSingleCurrency = selectedCurrency !== "ALL";
  const invalidId = customerId == null;
  const notFound = overviewQuery.isError && isNotFoundError(overviewQuery.error);
  const showNotFound = invalidId || notFound;

  const profile = overviewQuery.data?.profile;
  const rawName = profile?.name?.trim() || t("customer360.title");
  const rawCode = profile?.customerCode?.trim() || "";
  const displayCode = rawCode && rawCode !== rawName ? rawCode : "";

  const titleText = isDark ? "#E2E8F0" : "#475569";
  const strongText = isDark ? "#F8FAFC" : "#334155";
  const mutedText = isDark ? "rgba(203,213,225,0.68)" : "#94A3B8";
  const accent = isDark ? "#EC4899" : "#DB2777";
  const cardBg = isDark ? "rgba(19,11,27,0.70)" : "rgba(255,250,252,0.88)";
  const cardBgAlt = isDark ? "rgba(18,8,25,0.76)" : "rgba(255,252,253,0.92)";
  const cardBorder = isDark ? "rgba(236,72,153,0.16)" : "rgba(219,39,119,0.12)";
  const customerCardBorder = isDark ? "rgba(236,72,153,0.18)" : "rgba(219,39,119,0.14)";
  const tabShellBg = isDark ? "rgba(17,10,24,0.72)" : "rgba(255,248,251,0.88)";
  const tabActiveBg = isDark ? "rgba(236,72,153,0.10)" : "rgba(219,39,119,0.07)";
  const tabActiveBorder = isDark ? "rgba(236,72,153,0.20)" : "rgba(219,39,119,0.15)";
  const tabInactiveBorder = isDark ? "rgba(255,255,255,0.04)" : "rgba(148,163,184,0.08)";
  const errorColor = colors.error;

  const tabs = [
    { key: "overview" as const, label: t("customer360.tabs.overview"), icon: AnalyticsUpIcon },
    { key: "analytics" as const, label: t("customer360.tabs.analytics"), icon: ChartAverageIcon },
    { key: "quickQuotations" as const, label: t("customer360.tabs.quickQuotations"), icon: Invoice03Icon },
    { key: "erpMovements" as const, label: t("customer360.tabs.erpMovements"), icon: ArrowDataTransferHorizontalIcon },
    { key: "mailLogs" as const, label: t("customer360.tabs.mailLogs"), icon: Mail01Icon },
  ];

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <View style={[styles.stateCard, { backgroundColor: cardBgAlt, borderColor: cardBorder }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    </View>
  );

  const renderError = (message: string, onRetry?: () => void) => (
    <View style={styles.errorContainer}>
      <View style={[styles.stateCard, { backgroundColor: cardBgAlt, borderColor: cardBorder }]}>
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
        <Text style={[styles.stateTitle, { color: strongText }]}>{message}</Text>
        {onRetry ? (
          <TouchableOpacity
            onPress={onRetry}
            style={[
              styles.retryButton,
              {
                backgroundColor: `${accent}10`,
                borderColor: `${accent}22`,
              },
            ]}
            activeOpacity={0.82}
          >
            <Rotate360Icon size={15} color={accent} variant="stroke" />
            <Text style={[styles.retryText, { color: accent }]}>
              {t("customer360.retry")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  if (showNotFound) {
    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.shell}>
          <ScreenHeader title={t("customer360.title")} showBackButton />
          <View style={styles.content}>
            <View style={styles.centered}>
              <View style={[styles.stateCard, { backgroundColor: cardBgAlt, borderColor: cardBorder }]}>
                <View
                  style={[
                    styles.stateIconWrap,
                    {
                      backgroundColor: `${accent}12`,
                      borderColor: `${accent}22`,
                    },
                  ]}
                >
                  <Alert02Icon size={20} color={accent} variant="stroke" />
                </View>
                <Text style={[styles.stateTitle, { color: strongText }]}>
                  {t("customer360.notFound")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.shell}>
        <ScreenHeader title={t("customer360.title")} showBackButton />

        <View style={styles.content}>
          <View
            style={[
              styles.customerMiniCard,
              {
                backgroundColor: cardBg,
                borderColor: customerCardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.customerIconWrap,
                {
                  backgroundColor: `${accent}10`,
                  borderColor: `${accent}20`,
                },
              ]}
            >
              <UserIcon size={14} color={accent} variant="stroke" />
            </View>

            <View style={styles.customerTextWrap}>
              <Text style={[styles.customerLabel, { color: mutedText }]}>
                {t("customer.title")}
              </Text>
              <Text style={[styles.customerName, { color: strongText }]} numberOfLines={1}>
                {rawName}
              </Text>
              {displayCode ? (
                <Text style={[styles.customerCode, { color: mutedText }]} numberOfLines={1}>
                  #{displayCode}
                </Text>
              ) : null}
            </View>
          </View>

          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: tabShellBg,
                borderColor: cardBorder,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarContent}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: isActive ? tabActiveBg : "transparent",
                        borderColor: isActive ? tabActiveBorder : tabInactiveBorder,
                      },
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.82}
                  >
                    <View
                      style={[
                        styles.tabIconWrap,
                        {
                          backgroundColor: isActive ? `${accent}10` : "transparent",
                          borderColor: isActive ? `${accent}16` : "transparent",
                        },
                      ]}
                    >
                      <Icon size={14} color={isActive ? accent : mutedText} variant="stroke" />
                    </View>

                    <Text
                      style={[
                        styles.tabText,
                        { color: isActive ? titleText : mutedText },
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View
            style={[
              styles.filterShell,
              {
                backgroundColor: cardBgAlt,
                borderColor: cardBorder,
              },
            ]}
          >
            <CurrencyPicker
              selectedCurrency={selectedCurrency}
              currencyOptions={currencyOptions}
              label={t("customer360.currencyFilter.label")}
              allLabel={t("customer360.currencyFilter.all")}
              colors={colors}
              onSelect={setSelectedCurrency}
            />
          </View>

          <View style={styles.tabContentWrap}>
            {activeTab === "overview" ? (
              overviewQuery.isLoading ? (
                renderLoading()
              ) : overviewQuery.isError ? (
                renderError(
                  overviewQuery.error?.message ?? t("customer360.error"),
                  () => overviewQuery.refetch()
                )
              ) : (
                <Customer360OverviewTab
                  data={overviewQuery.data}
                  colors={colors}
                  isFetching={overviewQuery.isFetching}
                />
              )
            ) : activeTab === "analytics" ? (
              summaryQuery.isLoading && !summaryQuery.data ? (
                renderLoading()
              ) : (
                <Customer360AnalyticsTab
                  summary={summaryQuery.data}
                  charts={chartsQuery.data}
                  colors={colors}
                  isSingleCurrency={isSingleCurrency}
                  isSummaryLoading={summaryQuery.isLoading}
                  isChartsLoading={chartsQuery.isLoading}
                  summaryError={
                    summaryQuery.isError
                      ? summaryQuery.error ?? new Error(t("customer360.analytics.error"))
                      : null
                  }
                  chartsError={chartsQuery.isError ? chartsQuery.error ?? null : null}
                />
              )
            ) : activeTab === "quickQuotations" ? (
              quickQuotationsQuery.isLoading ? (
                renderLoading()
              ) : quickQuotationsQuery.isError ? (
                renderError(
                  quickQuotationsQuery.error?.message ??
                    t("customer360.quickQuotations.error")
                )
              ) : (
                <Customer360QuickQuotationsTab
                  items={quickQuotationsQuery.data ?? []}
                  colors={colors}
                  emptyText={t("customer360.quickQuotations.empty")}
                />
              )
            ) : activeTab === "erpMovements" ? (
              erpMovementsQuery.isLoading || erpBalanceQuery.isLoading ? (
                renderLoading()
              ) : erpMovementsQuery.isError || erpBalanceQuery.isError ? (
                renderError(
                  erpMovementsQuery.error?.message ??
                    erpBalanceQuery.error?.message ??
                    t("customer360.erpMovements.error")
                )
              ) : (
                <Customer360ErpMovementsTab
                  balance={erpBalanceQuery.data}
                  items={erpMovementsQuery.data ?? []}
                  colors={colors}
                  emptyText={t("common.noData")}
                />
              )
            ) : (
              <Customer360MailLogsTab customerId={customerId ?? 0} colors={colors} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 0,
  },
  customerMiniCard: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  customerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  customerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  customerLabel: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  customerName: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  customerCode: {
    fontSize: 10,
    fontWeight: "400",
    marginTop: 2,
    lineHeight: 12,
    letterSpacing: 0.2,
  },
  tabBar: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 4,
    marginBottom: 8,
  },
  tabBarContent: {
    paddingRight: 4,
    gap: 6,
  },
  tab: {
    minHeight: 54,
    minWidth: 108,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  tabIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 12,
  },
  filterShell: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 5,
    marginBottom: 8,
  },
  tabContentWrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
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
  stateTitle: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});
