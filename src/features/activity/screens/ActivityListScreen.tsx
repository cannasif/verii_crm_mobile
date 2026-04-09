import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader } from "../../../components/navigation";
import {
  PagedAdvancedFilterBuilder,
  PagedAdvancedFilterModal,
  PagedFlatList,
  mapPagedAdvancedFilterRowsToFilters,
  type PagedAdvancedFilterFieldConfig,
  type PagedAdvancedFilterRow,
} from "../../../components/paged";
import { useUIStore } from "../../../store/ui";
import { useActivities } from "../hooks";
import { ActivityCard } from "../components";
import type { ActivityDto } from "../types";
import {
  CalendarAdd01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "hugeicons-react-native";

const GAP = 12;
const PADDING = 16;
const BRAND_COLOR = "#db2777"; 
const BRAND_COLOR_DARK = "#ec4899";

export function ActivityListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  
  const isDark = themeMode === "dark";

 
  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.08)', 'transparent', 'rgba(249, 115, 22, 0.05)'] 
    : ['rgba(219, 39, 119, 0.05)', 'transparent', 'rgba(255, 240, 225, 0.3)']) as [string, string, ...string[]];

  const theme = {
    textMute: isDark ? "#94a3b8" : "#64748B",
    primary: isDark ? BRAND_COLOR_DARK : BRAND_COLOR,    
    surfaceBg: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(236, 72, 153, 0.3)' : 'rgba(219, 39, 119, 0.2)',
    error: "#ef4444",
    cardBg: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
  };

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [tempFilterLogic, setTempFilterLogic] = useState<"and" | "or">("and");
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<"and" | "or">("and");

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedQuery(searchText); }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const apiFilters = useMemo(
    () => mapPagedAdvancedFilterRowsToFilters(appliedFilterRows),
    [appliedFilterRows]
  );

  const activityFilterFields = useMemo<PagedAdvancedFilterFieldConfig[]>(
    () => [
      { value: "subject", label: t("activity.subject", "Konu"), type: "text", placeholder: t("activity.subject", "Konu") },
      { value: "activityTypeName", label: t("activity.type", "Aktivite Tipi"), type: "text", placeholder: t("activity.type", "Aktivite Tipi") },
      { value: "contactName", label: t("contact.title", "Kişi"), type: "text", placeholder: t("contact.title", "Kişi") },
      { value: "potentialCustomerName", label: t("customer.title", "Cari"), type: "text", placeholder: t("customer.title", "Cari") },
      {
        value: "status",
        label: t("activity.status", "Durum"),
        type: "select",
        operators: ["eq"],
        placeholder: t("activity.status", "Durum"),
        options: [
          { value: "0", label: t("activity.statusScheduled", "Planlandı") },
          { value: "1", label: t("activity.statusCompleted", "Tamamlandı") },
          { value: "2", label: t("activity.statusCancelled", "İptal") },
        ],
      },
      {
        value: "priority",
        label: t("activity.priority", "Öncelik"),
        type: "select",
        operators: ["eq"],
        placeholder: t("activity.priority", "Öncelik"),
        options: [
          { value: "0", label: t("activity.priorityLow", "Düşük") },
          { value: "1", label: t("activity.priorityMedium", "Orta") },
          { value: "2", label: t("activity.priorityHigh", "Yüksek") },
        ],
      },
    ],
    [t]
  );

  const {
    data,
    error,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useActivities({
    filters: apiFilters,
    filterLogic: appliedFilterLogic,
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
    sortBy: "Id",
    sortDirection: sortOrder,
    pageSize: 20,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const activities = useMemo(() => {
    return (
      data?.pages
        .flatMap((page) => page.items ?? [])
        .filter((item): item is ActivityDto => item != null) || []
    );
  }, [data]);

  const handleActivityPress = useCallback(
    (activity: ActivityDto) => {
      if (!activity?.id) return;
      router.push(`/(tabs)/activities/${activity.id}`);
    },
    [router]
  );

  const handleActivityReportPress = useCallback(
    (activity: ActivityDto) => {
      if (!activity?.id) return;
      router.push(`/(tabs)/activities/${activity.id}`);
    },
    [router]
  );

  const handleCreatePress = useCallback(() => {
    router.push("/(tabs)/activities/create");
  }, [router]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ActivityDto }) => {
      if (!item) return null;
      return (
        <View style={[styles.cardWrapper, { backgroundColor: theme.cardBg }]}>
             <ActivityCard 
                activity={item} 
                onPress={() => handleActivityPress(item)}
                onReportPress={() => handleActivityReportPress(item)}
             />
        </View>
      );
    },
    [handleActivityPress, handleActivityReportPress, theme]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return <View style={{ height: 40 }} />;
    return <View style={styles.footerLoading} />;
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
        <Text style={{ color: theme.textMute, fontSize: 16 }}>
          {t("activity.noActivities")}
        </Text>
      </View>
    );
  }, [isLoading, theme, t]);

  const toolbarActions = (
    <>
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: theme.surfaceBg, borderColor: theme.borderColor }]}
        onPress={handleCreatePress}
        activeOpacity={0.72}
      >
        <CalendarAdd01Icon size={22} color={theme.primary} variant="stroke" strokeWidth={2.3} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sortToolbarBtn, { backgroundColor: theme.surfaceBg, borderColor: theme.borderColor }]}
        onPress={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
        activeOpacity={0.72}
      >
        {sortOrder === "desc" ? (
          <ArrowDown01Icon size={18} color={theme.primary} strokeWidth={2.2} />
        ) : (
          <ArrowUp01Icon size={18} color={theme.primary} strokeWidth={2.2} />
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <ScreenHeader title={t("activity.title")} showBackButton />

      <View style={styles.listContainer}>
        {isError ? (
          <View style={styles.center}>
            <Text style={{ color: theme.error, marginBottom: 12, textAlign: "center" }}>
              {error?.message || t("common.error")}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={() => refetch()}
            >
              <Text style={{ color: "#FFF", fontWeight: "600" }}>{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <PagedFlatList
            data={activities}
            keyExtractor={(item, index) => String(item?.id ?? index)}
            renderItem={renderItem}
            searchValue={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder={t("activity.searchPlaceholder")}
            onOpenFilters={() => {
              setDraftFilterRows(appliedFilterRows);
              setTempFilterLogic(appliedFilterLogic);
              setIsFilterModalVisible(true);
            }}
            activeFilterCount={apiFilters.length}
            toolbarActions={toolbarActions}
            metaContent={
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: theme.textMute }]}>
                  {t("activity.foundCount", { count: activities.length, defaultValue: `${activities.length} aktivite bulundu` })}
                </Text>
              </View>
            }
            isLoading={Boolean(isLoading && activities.length === 0)}
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={handleRefresh}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={renderEmpty()}
            ListFooterComponent={renderFooter()}
            contentContainerStyle={{
              paddingHorizontal: PADDING,
              paddingTop: 12,
              paddingBottom: insets.bottom + 40,
              gap: GAP,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <PagedAdvancedFilterModal
        visible={isFilterModalVisible}
        title={t("common.advancedFilter.title", "Gelişmiş Filtre")}
        filterLogic={tempFilterLogic}
        onFilterLogicChange={setTempFilterLogic}
        onClose={() => setIsFilterModalVisible(false)}
        onClear={() => {
          setDraftFilterRows([]);
          setAppliedFilterRows([]);
          setTempFilterLogic("and");
          setAppliedFilterLogic("and");
        }}
        onApply={() => {
          setAppliedFilterRows(draftFilterRows);
          setAppliedFilterLogic(tempFilterLogic);
          setIsFilterModalVisible(false);
        }}
        bottomInset={insets.bottom}
      >
        <PagedAdvancedFilterBuilder
          fields={activityFilterFields}
          rows={draftFilterRows}
          onRowsChange={setDraftFilterRows}
          defaultField={activityFilterFields[0]?.value}
        />
      </PagedAdvancedFilterModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { flex: 1 },
  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 50 
  },
  iconBtn: { 
    height: 48,
    width: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center', 
    justifyContent: 'center',
    marginLeft: 10,
  },
  sortToolbarBtn: {
    height: 48,
    width: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  }
});
