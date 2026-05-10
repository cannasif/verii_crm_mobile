import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { Text } from "../../../components/ui/text";
import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { useAuthStore } from "../../../store/auth";
import {
  useSalesman360Overview,
  useSalesman360AnalyticsSummary,
  useSalesman360AnalyticsCharts,
  useSalesman360VisibleUsers,
  useSalesman360Cohort,
  useExecuteSalesman360Action,
} from "../hooks";
import {
  CurrencyPicker,
  Salesman360OutlineChip,
  Salesman360ProfileCard,
  Salesman360SalesmanPickerModal,
} from "../components";
import { Money03Icon, Calendar03Icon } from "hugeicons-react-native";
import { Salesman360OverviewTab } from "./Salesman360OverviewTab";
import { Salesman360AnalyticsTab } from "./Salesman360AnalyticsTab";
import type { Salesmen360PeriodKey, Salesmen360VisibleUserDto } from "../types";

type TabType = "overview" | "analytics";
const PERIOD_OPTIONS: Salesmen360PeriodKey[] = ["today", "week", "month", "year"];

function isNotFoundError(error: Error | null): boolean {
  if (!error) return false;
  const err = error as Error & { status?: number };
  const message = error.message?.toLowerCase() ?? "";
  return (
    err.status === 404 ||
    message.includes("not found") ||
    message.includes("bulunamadı")
  );
}

function collectCurrencyOptions(
  overviewCurrencies: { currency: string }[],
  summaryCurrencies: { currency: string }[],
  chartsCurrencies: { currency?: string | null }[]
): string[] {
  const set = new Set<string>();
  overviewCurrencies.forEach((r) => {
    if (r.currency) set.add(r.currency);
  });
  summaryCurrencies.forEach((r) => {
    if (r.currency) set.add(r.currency);
  });
  chartsCurrencies.forEach((r) => {
    if (r.currency) set.add(r.currency);
  });
  return Array.from(set).sort();
}

function createSelfVisibleUser(user: { id: number; name?: string; email?: string } | null): Salesmen360VisibleUserDto | null {
  if (!user?.id) {
    return null;
  }

  return {
    userId: user.id,
    fullName: user.name || user.email || String(user.id),
    email: user.email ?? null,
    isSelf: true,
  };
}

export function Salesman360Screen(): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<Salesmen360PeriodKey>("month");
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(user?.id);
  const [salesmanPickerVisible, setSalesmanPickerVisible] = useState(false);

  const currentUserId = user?.id;
  const currencyParam = selectedCurrency === "ALL" ? null : selectedCurrency;
  const periodParams = useMemo(() => ({ period: selectedPeriod }), [selectedPeriod]);
  const visibleUsersQuery = useSalesman360VisibleUsers();
  const selfVisibleUser = useMemo(() => createSelfVisibleUser(user), [user]);
  const visibleUsers = useMemo(() => {
    const apiUsers = visibleUsersQuery.data ?? [];
    if (apiUsers.length > 0) {
      return apiUsers;
    }
    return selfVisibleUser ? [selfVisibleUser] : [];
  }, [selfVisibleUser, visibleUsersQuery.data]);
  const selectedUser = useMemo(
    () => visibleUsers.find((item) => item.userId === selectedUserId) ?? visibleUsers[0] ?? null,
    [selectedUserId, visibleUsers]
  );
  const userId = selectedUser?.userId ?? selectedUserId ?? currentUserId;

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    setSelectedUserId((prev) => prev ?? currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (visibleUsers.length === 0) {
      return;
    }

    setSelectedUserId((prev) => {
      if (prev && visibleUsers.some((item) => item.userId === prev)) {
        return prev;
      }
      const self = visibleUsers.find((item) => item.isSelf);
      return self?.userId ?? visibleUsers[0].userId;
    });
  }, [visibleUsers]);

  const overviewQuery = useSalesman360Overview(
    userId,
    currencyParam,
    periodParams
  );
  const summaryQuery = useSalesman360AnalyticsSummary(
    userId,
    currencyParam,
    periodParams,
    activeTab === "analytics"
  );
  const chartsQuery = useSalesman360AnalyticsCharts(
    userId,
    12,
    currencyParam,
    periodParams,
    activeTab === "analytics"
  );
  const cohortQuery = useSalesman360Cohort(userId, 12);
  const executeActionMutation = useExecuteSalesman360Action(userId);

  const invalidUser = userId == null || userId === 0;
  const notFound =
    overviewQuery.isError && isNotFoundError(overviewQuery.error);
  const showNotFound = invalidUser || notFound;

  const currencyOptions = useMemo(() => {
    const overview = overviewQuery.data?.kpis?.totalsByCurrency ?? [];
    const summary = summaryQuery.data?.totalsByCurrency ?? [];
    const charts = chartsQuery.data?.amountComparisonByCurrency ?? [];
    return collectCurrencyOptions(overview, summary, charts);
  }, [
    overviewQuery.data?.kpis?.totalsByCurrency,
    summaryQuery.data?.totalsByCurrency,
    chartsQuery.data?.amountComparisonByCurrency,
  ]);

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
  ) as [string, string, ...string[]];

  const profileName =
    selectedUser?.fullName ||
    overviewQuery.data?.fullName ||
    t("salesman360.salesmanFilter.selfOnly");
  const profileEmail = selectedUser?.email ?? overviewQuery.data?.email ?? null;
  const isSingleCurrency = selectedCurrency !== "ALL";
  const canSelectSalesman = visibleUsers.length > 1;

  if (showNotFound) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.container, { backgroundColor: mainBg }]}>
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View style={styles.foreground}>
            <ScreenHeader title={t("salesman360.title")} showBackButton />
            <View style={styles.notFoundBody}>
              <View style={styles.centered}>
                <Text style={[styles.notFoundText, { color: colors.text }]}>
                  {t("salesman360.notFound")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.foreground}>
          <ScreenHeader title={t("salesman360.title")} showBackButton />
          <FlatListScrollView
            style={styles.pageScroll}
            contentContainerStyle={styles.pageScrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
          <View style={styles.profileBlock}>
            <Salesman360ProfileCard
              displayName={profileName}
              email={profileEmail}
              roleLabel={t("salesman360.salesmanFilter.label")}
              colors={colors}
              isDark={isDark}
              interactive={canSelectSalesman}
              onPress={() => setSalesmanPickerVisible(true)}
            />
          </View>
          <View style={styles.filterStack}>
            <View
              style={[
                styles.filterSectionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.filterSectionHead}>
                <Money03Icon size={12} color={colors.textMuted} variant="stroke" strokeWidth={1.75} />
                <Text
                  unstyled
                  style={[styles.filterSectionTitle, { color: colors.textMuted }]}
                >
                  {t("salesman360.currencyFilter.label")}
                </Text>
              </View>
              <CurrencyPicker
                selectedCurrency={selectedCurrency}
                currencyOptions={currencyOptions}
                label={t("salesman360.currencyFilter.label")}
                allLabel={t("salesman360.currencyFilter.all")}
                colors={colors}
                onSelect={setSelectedCurrency}
                showLabel={false}
                chipStyle="ring"
                horizontal
              />
            </View>
            <View
              style={[
                styles.filterSectionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.filterSectionHead}>
                <Calendar03Icon
                  size={12}
                  color={colors.textMuted}
                  variant="stroke"
                  strokeWidth={1.75}
                />
                <Text
                  unstyled
                  style={[styles.filterSectionTitle, { color: colors.textMuted }]}
                >
                  {t("salesman360.periodFilter.label")}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.periodChips}
              >
                {PERIOD_OPTIONS.map((period) => (
                  <Salesman360OutlineChip
                    key={period}
                    label={t(`salesman360.periodFilter.${period}`)}
                    selected={selectedPeriod === period}
                    onPress={() => setSelectedPeriod(period)}
                    colors={colors}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
          <View
            style={[
              styles.segmentRail,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setActiveTab("overview")}
              style={[
                styles.segmentSlot,
                {
                  borderColor:
                    activeTab === "overview" ? colors.accent : colors.border,
                  borderWidth: activeTab === "overview" ? 2 : 1,
                  backgroundColor:
                    activeTab === "overview"
                      ? isDark
                        ? colors.activeBackground
                        : colors.card
                      : "transparent",
                },
                activeTab === "overview" &&
                  Platform.select({
                    ios: {
                      shadowColor: colors.accent,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.35 : 0.18,
                      shadowRadius: 8,
                    },
                    android: {
                      elevation: 3,
                    },
                    default: {},
                  }),
              ]}
            >
              <Text
                unstyled
                style={[
                  styles.segmentLabel,
                  {
                    color:
                      activeTab === "overview" ? colors.accent : colors.textSecondary,
                    fontWeight: activeTab === "overview" ? "800" : "600",
                  },
                ]}
              >
                {t("salesman360.tabs.overview")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setActiveTab("analytics")}
              style={[
                styles.segmentSlot,
                {
                  borderColor:
                    activeTab === "analytics" ? colors.accent : colors.border,
                  borderWidth: activeTab === "analytics" ? 2 : 1,
                  backgroundColor:
                    activeTab === "analytics"
                      ? isDark
                        ? colors.activeBackground
                        : colors.card
                      : "transparent",
                },
                activeTab === "analytics" &&
                  Platform.select({
                    ios: {
                      shadowColor: colors.accent,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.35 : 0.18,
                      shadowRadius: 8,
                    },
                    android: {
                      elevation: 3,
                    },
                    default: {},
                  }),
              ]}
            >
              <Text
                unstyled
                style={[
                  styles.segmentLabel,
                  {
                    color:
                      activeTab === "analytics" ? colors.accent : colors.textSecondary,
                    fontWeight: activeTab === "analytics" ? "800" : "600",
                  },
                ]}
              >
                {t("salesman360.tabs.analytics")}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "overview" ? (
            overviewQuery.isLoading && !overviewQuery.data ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : overviewQuery.isError ? (
              <View style={styles.errorContainer}>
                <Text
                  style={[styles.errorText, { color: colors.error }]}
                >
                  {overviewQuery.error?.message ?? t("salesman360.error")}
                </Text>
                <TouchableOpacity
                  onPress={() => overviewQuery.refetch()}
                  style={styles.retryButton}
                >
                  <Text style={[styles.retryText, { color: colors.accent }]}>
                    {t("salesman360.retry")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Salesman360OverviewTab
                data={overviewQuery.data}
                colors={colors}
                isSingleCurrency={isSingleCurrency}
                cohort={cohortQuery.data}
                isCohortLoading={cohortQuery.isLoading}
                isActionExecuting={executeActionMutation.isPending}
                onExecuteAction={(action) =>
                  executeActionMutation.mutate({
                    actionCode: action.actionCode,
                    title: action.title,
                    reason: action.reason ?? undefined,
                    dueInDays: 1,
                    priority: "High",
                  })
                }
              />
            )
          ) : (
            (summaryQuery.isLoading && !summaryQuery.data) ||
            (chartsQuery.isLoading && !chartsQuery.data) ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : (
              <Salesman360AnalyticsTab
                summary={summaryQuery.data}
                charts={chartsQuery.data}
                colors={colors}
                isSingleCurrency={isSingleCurrency}
                summaryError={
                  summaryQuery.isError
                    ? summaryQuery.error ?? new Error(t("salesman360.analytics.error"))
                    : null
                }
                chartsError={chartsQuery.isError ? chartsQuery.error ?? null : null}
                isSummaryLoading={summaryQuery.isLoading}
                isChartsLoading={chartsQuery.isLoading}
              />
            )
          )}
          </FlatListScrollView>
          <Salesman360SalesmanPickerModal
            visible={salesmanPickerVisible}
            onClose={() => setSalesmanPickerVisible(false)}
            users={visibleUsers}
            selectedUserId={userId}
            onSelectUser={(id) => setSelectedUserId(id)}
            colors={colors}
            isDark={isDark}
            title={t("salesman360.salesmanFilter.title")}
            sheetSubtitle={t("salesman360.salesmanFilter.sheetSubtitle")}
            selfLabel={t("salesman360.salesmanFilter.self")}
            searchPlaceholder={t("salesman360.salesmanFilter.searchPlaceholder")}
            noResultsLabel={t("salesman360.salesmanFilter.noSearchResults")}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  foreground: {
    flex: 1,
  },
  pageScroll: {
    flex: 1,
  },
  pageScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  notFoundBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileBlock: {
    marginBottom: 16,
  },
  filterStack: {
    gap: 11,
    marginBottom: 13,
  },
  filterSectionCard: {
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 8,
  },
  filterSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingLeft: 1,
    marginBottom: 7,
  },
  filterSectionTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.25,
    textTransform: "uppercase",
    opacity: 0.95,
  },
  periodChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 0,
    paddingRight: 5,
    paddingBottom: 2,
  },
  segmentRail: {
    flexDirection: "row",
    borderRadius: 13,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    marginBottom: 9,
  },
  segmentSlot: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  segmentLabel: {
    fontSize: 11,
    letterSpacing: 0.18,
  },
  loadingContainer: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  errorContainer: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    textAlign: "center",
  },
});
