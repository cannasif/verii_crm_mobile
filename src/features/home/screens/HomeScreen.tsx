import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, InteractionManager, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useAuthStore } from "../../../store/auth";
import { hasAnyPermission } from "../../access-control/utils/hasPermission";
import { CRM_MODULES } from "../constants/modules";
import type { Module } from "../types";

import { HomeQuickActionsStrip } from "../components/HomeQuickActionsStrip";
import { HomeHero } from "../components/HomeHero";
import { StatsStrip } from "../components/StatsStrip";
import { RecentActivities } from "../components/RecentActivities";

import { useActivities } from "../../activity/hooks";
import { useCustomers } from "../../customer/hooks";
import { useDailyTasks } from "../../daily-tasks/hooks";
import { countPendingTasksForToday, getTodayRange } from "../utils/homeStats";
import { clearPerfMarks, perfMark, perfMeasureOnNextPaint } from "../../../lib/perf-metrics";

export function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeMode } = useUIStore();
  const branch = useAuthStore((state) => state.branch);
  const permissions = useAuthStore((state) => state.permissions);
  const insets = useSafeAreaInsets();
  const [isSecondaryDataEnabled, setIsSecondaryDataEnabled] = useState(false);
  const isBranchReady = Boolean(branch?.code);

  useEffect(() => {
    perfMark("home:mount");
    perfMeasureOnNextPaint("home:mount_to_paint", "home:mount", "home:first_paint");

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      setIsSecondaryDataEnabled(true);
    });

    return () => {
      interactionTask.cancel();
      clearPerfMarks("home:mount", "home:first_paint", "home:primary_data_ready");
    };
  }, []);

  const {
    data: activitiesData,
    refetch: refetchActivities,
  } = useActivities({ pageSize: 3, sortDirection: "desc", enabled: isBranchReady });

  const {
    data: customersData,
    refetch: refetchCustomers,
  } = useCustomers({ pageSize: 1, enabled: isSecondaryDataEnabled && isBranchReady });

  const todayRange = useMemo(() => getTodayRange(), []);
  const {
    data: todayTasks,
    refetch: refetchDailyTasks,
  } = useDailyTasks(todayRange, { enabled: isSecondaryDataEnabled && isBranchReady });

  useEffect(() => {
    if (!activitiesData) {
      return;
    }

    perfMark("home:primary_data_ready");
    perfMeasureOnNextPaint(
      "home:mount_to_primary_data_ready_paint",
      "home:mount",
      "home:primary_data_ready_paint",
    );
  }, [activitiesData]);

  const totalCustomers = customersData?.pages?.[0]?.totalCount ?? 0;
  const totalActivities = activitiesData?.pages?.[0]?.totalCount ?? 0;
  const pendingTasksCount = useMemo(
    () => countPendingTasksForToday(todayTasks),
    [todayTasks]
  );

  const [refreshing, setRefreshing] = useState(false);

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const textColor = isDark ? "#F8FAFC" : "#334155";

  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.05)', 'transparent', 'rgba(249, 115, 22, 0.05)']
    : ['rgba(255, 235, 240, 0.4)', '#FFFFFF', 'rgba(255, 240, 225, 0.4)']) as [string, string, ...string[]];

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([
      refetchActivities(),
      refetchCustomers(),
      refetchDailyTasks(),
    ]);
    setRefreshing(false);
  }, [refetchActivities, refetchCustomers, refetchDailyTasks]);

  const onOpenModule = useCallback((route: string): void => {
    router.push(route as never);
  }, [router]);

  const recentActivitiesList = activitiesData?.pages?.[0]?.items?.filter(item => item != null) || [];

  const quickActionModules = useMemo(
    () =>
      CRM_MODULES.filter(
        (item) =>
          !item.permissionCodes?.length ||
          hasAnyPermission(permissions, item.permissionCodes)
      ),
    [permissions]
  );

  return (
    <View style={[styles.root, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
          <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <FlatList<Module>
        data={[]}
        renderItem={() => <View />}
        keyExtractor={(_, index) => `pad-${String(index)}`}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 100,
        }}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <HomeHero />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {t("home.quickActions")}
            </Text>
            <HomeQuickActionsStrip items={quickActionModules} onOpenModule={onOpenModule} />
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerContainer}>
            <Text style={[styles.sectionTitle, { color: textColor, marginTop: 12 }]}>
              {t("home.overview")}
            </Text>

            {!isBranchReady && (
              <View style={[styles.inlineInfoBox, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: isDark ? "#334155" : "#E2E8F0" }]}>
                <ActivityIndicator size="small" color="#db2777" />
                <Text style={[styles.inlineInfoText, { color: textColor }]}>
                  {t("common.loading")}
                </Text>
              </View>
            )}

            <StatsStrip
              totalCustomers={totalCustomers}
              totalActivities={totalActivities}
              pendingTasks={pendingTasksCount}
            />

            <RecentActivities activities={recentActivitiesList as any} />

          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerContainer: { marginBottom: 4 },
  footerContainer: { marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 16, letterSpacing: 0.2 },
  inlineInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  inlineInfoText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
