import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  LayoutGridIcon,
  ListViewIcon,
  FlashIcon,
} from "hugeicons-react-native";
import { listContentBottomPadding } from "../../../constants/layout";
import { ScreenHeader } from "../../../components/navigation";
import {
  PagedFlatList,
  SalesListCompactSeparator,
  SalesDocumentCreateToolbarIcon,
} from "../../../components/paged";
import { useKeyboardBottomInset } from "../../../hooks/useKeyboardBottomInset";
import { useUIStore } from "../../../store/ui";
import {
  useTempQuickQuotationList,
  useTempQuickQuotationConvert,
  useTempQuickQuotationListFilters,
} from "../hooks";
import {
  TempQuickQuotationRow,
  TempQuickQuotationCompactListRow,
  TempQuickQuotationStatusFilterSheet,
} from "../components";
import type { TempQuotattionGetDto } from "../models/tempQuotattion.model";

const GAP = 16;
const PADDING = 16;

type TempQuickQuotationListViewMode = "card" | "list";

export function TempQuickQuotationListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();

  const isDark = themeMode === "dark";

  const mainBg = isDark ? "#09090F" : "#F8FAFC";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const surfaceBg = isDark ? "rgba(255,255,255,0.035)" : "#FFFFFF";
  const borderColor = isDark ? "rgba(236, 72, 153, 0.18)" : "rgba(219, 39, 119, 0.14)";
  const switchBg = isDark ? "rgba(255,255,255,0.035)" : "#F8FAFC";
  const softBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.14)";
  const activeSwitchBg = isDark ? "rgba(236, 72, 153, 0.12)" : "rgba(219, 39, 119, 0.08)";
  const iconColor = isDark ? "#64748B" : "#94A3B8";
  const listSeparatorColor = isDark ? "rgba(255,255,255,0.16)" : "rgba(148,163,184,0.34)";

  const [viewMode, setViewMode] = useState<TempQuickQuotationListViewMode>("card");
  const [sortBy, setSortBy] = useState<string>("Id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { statusFilter, setStatusFilter, isStatusFiltered, filters } =
    useTempQuickQuotationListFilters();

  const { convert, convertingId, isConverting } = useTempQuickQuotationConvert();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTempQuickQuotationList({
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
    sortBy,
    sortDirection,
    filters,
  });

  const items = useMemo(() => {
    return (
      data?.pages
        .flatMap((page) => page.items ?? [])
        .filter((item): item is TempQuotattionGetDto => item != null) || []
    );
  }, [data]);

  const totalCount = data?.pages?.[0]?.totalCount ?? 0;

  const handleRowClick = useCallback(
    (id: number) => {
      router.push({
        pathname: "/(tabs)/sales/quotations/quick/[id]",
        params: { id: String(id) },
      });
    },
    [router]
  );

  const handleCreatePress = useCallback(() => {
    router.push("/(tabs)/sales/quotations/quick/create");
  }, [router]);

  const handleRevise = useCallback(
    (id: number) => {
      router.push({
        pathname: "/(tabs)/sales/quotations/quick/create",
        params: { id: String(id) },
      });
    },
    [router]
  );

  const handleConvert = useCallback(
    (id: number) => {
      convert(id);
    },
    [convert]
  );

  const handleOpenStatusFilter = useCallback(() => {
    setIsStatusFilterOpen(true);
  }, []);

  const handleCloseStatusFilter = useCallback(() => {
    setIsStatusFilterOpen(false);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleToggleSort = useCallback(() => {
    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
  }, []);

  const renderListSeparator = useCallback(
    () => <SalesListCompactSeparator color={listSeparatorColor} />,
    [listSeparatorColor]
  );

  const renderItem = useCallback(
    ({ item }: { item: TempQuotattionGetDto }) => {
      if (viewMode === "list") {
        return (
          <TempQuickQuotationCompactListRow item={item} onPress={handleRowClick} />
        );
      }

      return (
        <TempQuickQuotationRow
          item={item}
          convertingId={convertingId}
          isConverting={isConverting}
          onPress={handleRowClick}
          onRevise={handleRevise}
          onConvert={handleConvert}
        />
      );
    },
    [
      viewMode,
      handleRowClick,
      handleRevise,
      handleConvert,
      convertingId,
      isConverting,
    ]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) return null;
    return (
      <View style={styles.center}>
        <Text style={{ color: mutedColor, fontSize: 15, fontWeight: "500" }}>
          {isStatusFiltered
            ? t("tempQuickQuotation.statusFilter.noResults")
            : t("tempQuickQuotation.noItems")}
        </Text>
      </View>
    );
  }, [isLoading, isFetching, isStatusFiltered, mutedColor, t]);

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={
              (isDark
                ? ["rgba(236,72,153,0.08)", "transparent", "rgba(249,115,22,0.05)"]
                : ["rgba(255,235,240,0.55)", "#FFFFFF", "rgba(255,244,237,0.55)"]) as [
                string,
                string,
                ...string[],
              ]
            }
            style={StyleSheet.absoluteFill}
          />
        </View>
        <ScreenHeader title={t("tempQuickQuotation.list")} showBackButton />
        <View style={styles.center}>
          <Text style={{ color: "#ef4444", marginBottom: 12, fontWeight: "500" }}>
            {t("common.error")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: brandColor }]}
            onPress={() => refetch()}
          >
            <Text style={{ color: "#FFF", fontWeight: "600" }}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const gradientColors = (
    isDark
      ? ["rgba(236,72,153,0.08)", "transparent", "rgba(249,115,22,0.05)"]
      : ["rgba(255,235,240,0.55)", "#FFFFFF", "rgba(255,244,237,0.55)"]
  ) as [string, string, ...string[]];

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      </View>

      <ScreenHeader title={t("tempQuickQuotation.list")} showBackButton />

      <View style={styles.listContainer}>
        <PagedFlatList
          listKey={`temp-quick-quotation-list-${viewMode}-${statusFilter}-${debouncedQuery}`}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          searchValue={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder={t("tempQuickQuotation.searchPlaceholder")}
          browseListShell={
            viewMode === "list"
              ? {
                  borderColor,
                  backgroundColor: surfaceBg,
                  separatorColor: listSeparatorColor,
                }
              : undefined
          }
          ItemSeparatorComponent={viewMode === "list" ? renderListSeparator : undefined}
          toolbarActions={
            <>
              <TouchableOpacity
                onPress={handleCreatePress}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: surfaceBg,
                    borderColor,
                    marginRight: 8,
                  },
                ]}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel={t("tempQuickQuotation.createNew")}
              >
                <SalesDocumentCreateToolbarIcon
                  color={brandColor}
                  badgeBorderColor={surfaceBg}
                  icon={
                    <FlashIcon
                      size={20}
                      color={brandColor}
                      variant="stroke"
                      strokeWidth={2.3}
                    />
                  }
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.viewSwitcher,
                  {
                    backgroundColor: switchBg,
                    borderColor: softBorder,
                  },
                ]}
              >
                <TouchableWithoutFeedback onPress={() => setViewMode("card")}>
                  <View
                    style={[
                      styles.switchBtn,
                      viewMode === "card" && {
                        backgroundColor: activeSwitchBg,
                        borderColor,
                      },
                    ]}
                  >
                    <LayoutGridIcon
                      size={19}
                      color={viewMode === "card" ? brandColor : iconColor}
                      variant="stroke"
                      strokeWidth={viewMode === "card" ? 2.2 : 1.7}
                    />
                  </View>
                </TouchableWithoutFeedback>

                <TouchableWithoutFeedback onPress={() => setViewMode("list")}>
                  <View
                    style={[
                      styles.switchBtn,
                      viewMode === "list" && {
                        backgroundColor: activeSwitchBg,
                        borderColor,
                      },
                    ]}
                  >
                    <ListViewIcon
                      size={19}
                      color={viewMode === "list" ? brandColor : iconColor}
                      variant="stroke"
                      strokeWidth={viewMode === "list" ? 2.2 : 1.7}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </>
          }
          onOpenFilters={handleOpenStatusFilter}
          activeFilterCount={isStatusFiltered ? 1 : 0}
          metaContent={
            <Text style={[styles.metaText, { color: mutedColor }]} numberOfLines={1}>
              {t("tempQuickQuotation.foundCount", { count: totalCount })}
            </Text>
          }
          bottomRightActions={
            <TouchableOpacity
              style={styles.sortInlineBtn}
              onPress={handleToggleSort}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={t("common.sort", "Sıralama")}
            >
              {sortDirection === "desc" ? (
                <ArrowDown01Icon size={14} color={mutedColor} strokeWidth={2} />
              ) : (
                <ArrowUp01Icon size={14} color={mutedColor} strokeWidth={2} />
              )}
              <Text style={[styles.sortInlineText, { color: mutedColor }]}>
                {t("common.sort", "Sıralama")}
              </Text>
            </TouchableOpacity>
          }
          isLoading={Boolean(isLoading && !data)}
          refreshing={isRefetching}
          onRefresh={refetch}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          totalCount={data?.pages[0]?.totalCount}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.8}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            viewMode === "list" ? styles.flatListContentCompact : styles.flatListContent,
            {
              paddingBottom: listContentBottomPadding(insets.bottom) + keyboardInset,
            },
          ]}
          emptyComponent={renderEmpty()}
        />
      </View>

      <TempQuickQuotationStatusFilterSheet
        visible={isStatusFilterOpen}
        selectedValue={statusFilter}
        onClose={handleCloseStatusFilter}
        onSelect={setStatusFilter}
      />
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
    marginTop: 60,
  },
  flatListContent: {
    paddingHorizontal: PADDING,
    paddingTop: 4,
    gap: GAP,
  },
  flatListContentCompact: {
    paddingHorizontal: PADDING,
    paddingTop: 4,
    gap: 0,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  iconBtn: {
    height: 50,
    width: 50,
    borderRadius: 16,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#db2777",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 1,
  },
  viewSwitcher: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    alignItems: "center",
    height: 50,
    borderWidth: 1,
  },
  switchBtn: {
    borderRadius: 12,
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  sortInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  sortInlineText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
    letterSpacing: 0.1,
  },
});
