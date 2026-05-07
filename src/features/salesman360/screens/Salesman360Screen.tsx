import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
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
import { CurrencyPicker } from "../components";
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
  const { colors } = useUIStore();
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

  const subtitle = overviewQuery.data
    ? [overviewQuery.data.fullName, overviewQuery.data.email].filter(Boolean).join(" · ")
    : selectedUser
      ? [selectedUser.fullName, selectedUser.email].filter(Boolean).join(" · ")
    : "";
  const contentBackground = colors.background;
  const isSingleCurrency = selectedCurrency !== "ALL";
  const canSelectSalesman = visibleUsers.length > 1;

  if (showNotFound) {
    return (
      <>
        <StatusBar style="light" />
        <View style={[styles.container, { backgroundColor: colors.header }]}>
          <ScreenHeader title={t("salesman360.title")} showBackButton />
          <View style={[styles.content, { backgroundColor: contentBackground }]}>
            <View style={styles.centered}>
              <Text style={[styles.notFoundText, { color: colors.text }]}>
                {t("salesman360.notFound")}
              </Text>
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: colors.header }]}>
        <ScreenHeader title={t("salesman360.title")} showBackButton />
        <View style={[styles.content, { backgroundColor: contentBackground }]}>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}
          <View style={styles.salesmanSection}>
            <TouchableOpacity
              activeOpacity={canSelectSalesman ? 0.85 : 1}
              disabled={!canSelectSalesman}
              onPress={() => setSalesmanPickerVisible(true)}
              style={[
                styles.salesmanSelector,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.salesmanSelectorText}>
                <Text style={[styles.salesmanLabel, { color: colors.textMuted }]}>
                  {t("salesman360.salesmanFilter.label")}
                </Text>
                <Text style={[styles.salesmanName, { color: colors.text }]} numberOfLines={1}>
                  {selectedUser?.fullName || overviewQuery.data?.fullName || t("salesman360.salesmanFilter.selfOnly")}
                </Text>
              </View>
              <Text style={[styles.salesmanChevron, { color: canSelectSalesman ? colors.accent : colors.textMuted }]}>
                {canSelectSalesman ? ">" : "-"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.currencySection}>
            <CurrencyPicker
              selectedCurrency={selectedCurrency}
              currencyOptions={currencyOptions}
              label={t("salesman360.currencyFilter.label")}
              allLabel={t("salesman360.currencyFilter.all")}
              colors={colors}
              onSelect={setSelectedCurrency}
            />
          </View>
          <View style={styles.periodSection}>
            <Text style={[styles.periodLabel, { color: colors.textMuted }]}>
              {t("salesman360.periodFilter.label")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodChips}>
              {PERIOD_OPTIONS.map((period) => {
                const selected = selectedPeriod === period;
                return (
                  <TouchableOpacity
                    key={period}
                    activeOpacity={0.85}
                    onPress={() => setSelectedPeriod(period)}
                    style={[
                      styles.periodChip,
                      {
                        borderColor: selected ? colors.accent : colors.cardBorder,
                        backgroundColor: selected ? `${colors.accent}18` : colors.card,
                      },
                    ]}
                  >
                    <Text style={[styles.periodChipText, { color: selected ? colors.accent : colors.text }]}>
                      {t(`salesman360.periodFilter.${period}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <View
            style={[
              styles.tabBar,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "overview" && {
                  borderBottomColor: colors.accent,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab("overview")}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "overview" ? colors.accent : colors.textMuted,
                  },
                ]}
              >
                {t("salesman360.tabs.overview")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "analytics" && {
                  borderBottomColor: colors.accent,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab("analytics")}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "analytics"
                        ? colors.accent
                        : colors.textMuted,
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
          <Modal
            visible={salesmanPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setSalesmanPickerVisible(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setSalesmanPickerVisible(false)}>
              <Pressable
                style={[
                  styles.salesmanModal,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t("salesman360.salesmanFilter.title")}
                </Text>
                <ScrollView style={styles.salesmanList} showsVerticalScrollIndicator={false}>
                  {visibleUsers.map((item) => {
                    const selected = item.userId === userId;
                    return (
                      <TouchableOpacity
                        key={item.userId}
                        onPress={() => {
                          setSelectedUserId(item.userId);
                          setSalesmanPickerVisible(false);
                        }}
                        style={[
                          styles.salesmanOption,
                          {
                            borderColor: selected ? colors.accent : colors.cardBorder,
                            backgroundColor: selected ? `${colors.accent}18` : colors.background,
                          },
                        ]}
                      >
                        <View style={styles.salesmanOptionText}>
                          <Text style={[styles.salesmanOptionName, { color: colors.text }]} numberOfLines={1}>
                            {item.fullName}
                          </Text>
                          {item.email ? (
                            <Text style={[styles.salesmanOptionEmail, { color: colors.textMuted }]} numberOfLines={1}>
                              {item.email}
                            </Text>
                          ) : null}
                        </View>
                        {item.isSelf ? (
                          <Text style={[styles.selfBadge, { color: colors.accent }]}>
                            {t("salesman360.salesmanFilter.self")}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  salesmanSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  salesmanSelector: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  salesmanSelectorText: {
    flex: 1,
    paddingRight: 12,
  },
  salesmanLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  salesmanName: {
    fontSize: 16,
    fontWeight: "700",
  },
  salesmanChevron: {
    fontSize: 28,
    fontWeight: "600",
  },
  currencySection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  periodSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  periodChips: {
    gap: 8,
    paddingRight: 20,
  },
  periodChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorContainer: {
    flex: 1,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  salesmanModal: {
    width: "100%",
    maxHeight: "72%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  salesmanList: {
    maxHeight: 420,
  },
  salesmanOption: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  salesmanOptionText: {
    flex: 1,
    paddingRight: 12,
  },
  salesmanOptionName: {
    fontSize: 15,
    fontWeight: "700",
  },
  salesmanOptionEmail: {
    fontSize: 12,
    marginTop: 4,
  },
  selfBadge: {
    fontSize: 12,
    fontWeight: "700",
  },
});
