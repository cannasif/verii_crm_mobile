import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { RefreshIcon } from "hugeicons-react-native";

import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { CRM_MODULES } from "../constants/modules";
import type { Module } from "../types";

import { ModuleCard } from "../components/ModuleCard";
import { HomeHero } from "../components/HomeHero";
import { StatsStrip } from "../components/StatsStrip";
import { RecentActivities } from "../components/RecentActivities";

import { useActivities } from "../../activity/hooks";
import { useCustomers } from "../../customer/hooks";
import { useDailyTasks } from "../../daily-tasks/hooks";
import { countPendingTasksForToday, getTodayRange } from "../utils/homeStats";

export function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  
  const {
    data: activitiesData,
    isLoading: isActivitiesLoading,
    error: activitiesError,
    refetch: refetchActivities,
  } = useActivities({ pageSize: 3, sortDirection: "desc" });

  const {
    data: customersData,
    refetch: refetchCustomers,
  } = useCustomers({ pageSize: 1 });

  const todayRange = useMemo(() => getTodayRange(), []);
  const {
    data: todayTasks,
    refetch: refetchDailyTasks,
  } = useDailyTasks(todayRange);

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

  const renderItem = useCallback(
    ({ item }: { item: Module }) => <ModuleCard item={item} onPress={onOpenModule} />,
    [onOpenModule]
  );

  if (activitiesError && !activitiesData) {
    return (
      <View style={[styles.center, { backgroundColor: mainBg }]}>
        <Text style={{ color: textColor, marginBottom: 12, fontSize: 15 }}>
          {t("home.error")}
        </Text>
        <TouchableOpacity 
          onPress={() => void onRefresh()}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E293B' : '#F1F5F9', padding: 10, borderRadius: 12 }}
        >
          <RefreshIcon size={18} color={textColor} />
          <Text style={{ color: textColor, marginLeft: 8, fontWeight: '600' }}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isActivitiesLoading && !activitiesData) {
    return (
      <View style={[styles.center, { backgroundColor: mainBg }]}>
        <ActivityIndicator size="large" color="#db2777" />
      </View>
    );
  }

  const recentActivitiesList = activitiesData?.pages?.[0]?.items?.filter(item => item != null) || [];

  return (
    <View style={[styles.root, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
          <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <FlatList
        data={CRM_MODULES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={4} 
        columnWrapperStyle={styles.columnWrapper}
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
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerContainer}>
            <Text style={[styles.sectionTitle, { color: textColor, marginTop: 12 }]}>
              {t("home.overview")}
            </Text>
            
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerContainer: { marginBottom: 4 },
  footerContainer: { marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 16, letterSpacing: 0.2 },
  columnWrapper: { justifyContent: "space-between", marginBottom: 12 },
});