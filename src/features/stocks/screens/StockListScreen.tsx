import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Text,
  Dimensions,
  Keyboard,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/navigation";
import {
  PagedAdvancedFilterBuilder,
  PagedAdvancedFilterModal,
  PagedFlatList,
  createPagedAdvancedFilterRow,
  mapPagedAdvancedFilterRowsToFilters,
  type PagedAdvancedFilterFieldConfig,
  type PagedAdvancedFilterRow,
} from "../../../components/paged";
import { useUIStore } from "../../../store/ui";
import { useStocks, useStockGroups } from "../hooks";
import {
  LayoutGridIcon,
  ListViewIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  PackageIcon,
} from "hugeicons-react-native";
import type { StockGetDto, StockGroupDto } from "../types";
import { StockCard } from "../components/StockCard";

const { width } = Dimensions.get("window");
const GAP = 12;
const PADDING = 16;
const GRID_WIDTH = (width - PADDING * 2 - GAP) / 2;

const BRAND_COLOR = "#db2777";
const BRAND_COLOR_DARK = "#ec4899";

const normalizeText = (text: string) => {
  if (!text) return "";

  return text
    .toString()
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ");
};

const fuzzyMatch = (query: string, text: string) => {
  const normalizedQuery = normalizeText(query).replace(/\s+/g, "");
  const normalizedText = normalizeText(text).replace(/\s+/g, "");

  if (!normalizedQuery) return true;
  if (normalizedText.includes(normalizedQuery)) return true;

  let queryIndex = 0;
  for (let i = 0; i < normalizedText.length; i++) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
    }
    if (queryIndex === normalizedQuery.length) {
      return true;
    }
  }

  return false;
};

export function StockListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeMode } = useUIStore() as any;
  const isDark = themeMode === "dark";

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [tempFilterLogic, setTempFilterLogic] = useState<"and" | "or">("and");
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<"and" | "or">("and");

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
  ) as [string, string, ...string[]];

  const theme = {
    text: isDark ? "#CBD5E1" : "#64748B",
    textSoft: isDark ? "#E2E8F0" : "#475569",
    textMute: isDark ? "#94A3B8" : "#94A3B8",
    primary: isDark ? BRAND_COLOR_DARK : BRAND_COLOR,
    surfaceBg: isDark ? "rgba(255,255,255,0.035)" : "#FFFFFF",
    surfaceBgSoft: isDark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.92)",
    borderColor: isDark ? "rgba(236, 72, 153, 0.18)" : "rgba(219, 39, 119, 0.14)",
    softBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.14)",
    switchBg: isDark ? "rgba(255,255,255,0.035)" : "#F8FAFC",
    activeSwitchBg: isDark ? "rgba(236, 72, 153, 0.12)" : "rgba(219, 39, 119, 0.08)",
    iconColor: isDark ? "#64748B" : "#94A3B8",
    filterBg: isDark ? "rgba(255,255,255,0.045)" : "#F8FAFC",
    filterText: isDark ? "#CBD5E1" : "#64748B",
    modalBg: isDark ? "#1E293B" : "#FFFFFF",
    modalOverlay: "rgba(0,0,0,0.48)",
    handle: isDark ? "rgba(148,163,184,0.42)" : "rgba(148,163,184,0.48)",
    cardBg: isDark ? "#1e1b29" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
    textTitle: isDark ? "#FFFFFF" : "#0F172A",
    selectedRowBg: isDark ? "rgba(236,72,153,0.10)" : "rgba(219,39,119,0.08)",
    selectedRowBorder: isDark ? "rgba(236,72,153,0.20)" : "rgba(219,39,119,0.16)",
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchText]);

  const openFilterModal = () => {
    setDraftFilterRows(appliedFilterRows);
    setIsFilterModalVisible(true);
  };

  const apiFilters = useMemo(
    () => mapPagedAdvancedFilterRowsToFilters(appliedFilterRows),
    [appliedFilterRows]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useStocks({
    filters: apiFilters,
    filterLogic: appliedFilterLogic,
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
    sortBy: "createdDate",
    sortDirection: sortOrder,
    pageSize: 20,
  });

  const { data: stockGroups = [] } = useStockGroups();

  const stockFilterFields = useMemo<PagedAdvancedFilterFieldConfig[]>(
    () => [
      {
        value: "GrupKodu",
        label: t("stock.group"),
        type: "select",
        operators: ["eq"],
        placeholder: t("stock.group"),
        options: stockGroups.map((group: StockGroupDto) => ({
          value: group.grupKodu ?? "",
          label: group.grupKodu
            ? `${group.grupKodu} - ${group.grupAdi ?? ""}`
            : group.grupAdi ?? "-",
        })),
      },
      {
        value: "Kod1",
        label: "Kod 1",
        type: "text",
        placeholder: "Kod 1",
      },
      {
        value: "Kod2",
        label: "Kod 2",
        type: "text",
        placeholder: "Kod 2",
      },
      {
        value: "Kod3",
        label: "Kod 3",
        type: "text",
        placeholder: "Kod 3",
      },
    ],
    [stockGroups, t]
  );

  const stocks = useMemo(() => data?.pages?.flatMap((page) => page.items || []) || [], [data]);

  const totalCount = data?.pages?.[0]?.totalCount || 0;

  const renderItem = useCallback(
    ({ item }: { item: StockGetDto }) => (
      <StockCard
        item={item}
        viewMode={viewMode}
        isDark={isDark}
        theme={theme}
        gridWidth={GRID_WIDTH}
      />
    ),
    [viewMode, isDark, theme]
  );

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const toolbarActions = (
    <>
      <View
        style={[
          styles.viewSwitcher,
          {
            backgroundColor: theme.switchBg,
            borderColor: theme.softBorder,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={() => setViewMode("grid")}>
          <View
            style={[
              styles.switchBtn,
              viewMode === "grid" && {
                backgroundColor: theme.activeSwitchBg,
                borderColor: theme.borderColor,
              },
            ]}
          >
            <LayoutGridIcon
              size={18}
              color={viewMode === "grid" ? theme.primary : theme.textMute}
              variant="stroke"
              strokeWidth={viewMode === "grid" ? 2.2 : 1.7}
            />
          </View>
        </TouchableWithoutFeedback>

        <TouchableWithoutFeedback onPress={() => setViewMode("list")}>
          <View
            style={[
              styles.switchBtn,
              viewMode === "list" && {
                backgroundColor: theme.activeSwitchBg,
                borderColor: theme.borderColor,
              },
            ]}
          >
            <ListViewIcon
              size={18}
              color={viewMode === "list" ? theme.primary : theme.textMute}
              variant="stroke"
              strokeWidth={viewMode === "list" ? 2.2 : 1.7}
            />
          </View>
        </TouchableWithoutFeedback>
      </View>

      <TouchableOpacity
        style={[
          styles.sortToolbarBtn,
          {
            backgroundColor: theme.surfaceBgSoft,
            borderColor: theme.softBorder,
          },
        ]}
        onPress={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
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
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={{ flex: 1 }}>
        <ScreenHeader title={t("stock.list")} showBackButton />

        <View style={styles.listContainer}>
          <PagedFlatList
            listKey={viewMode}
            data={stocks}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            searchValue={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder={t("common.search")}
            onOpenFilters={openFilterModal}
            activeFilterCount={apiFilters.length}
            toolbarActions={toolbarActions}
            metaContent={
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: theme.textMute }]}>
                  {typeof t("stock.foundCount", { count: totalCount }) === "string"
                    ? t("stock.foundCount", { count: totalCount })
                    : `${totalCount}`}
                </Text>
              </View>
            }
            isLoading={Boolean(isPending && !data)}
            refreshing={isRefetching}
            onRefresh={refetch}
            numColumns={viewMode === "grid" ? 2 : 1}
            columnWrapperStyle={viewMode === "grid" ? { gap: GAP } : undefined}
            contentContainerStyle={{
              paddingHorizontal: PADDING,
              paddingTop: 12,
              paddingBottom: 24,
              gap: GAP,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            isFetchingNextPage={isFetchingNextPage}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            emptyComponent={
              <View style={styles.center}>
                <View
                  style={[
                    styles.emptyIconWrap,
                    {
                      backgroundColor: theme.surfaceBgSoft,
                      borderColor: theme.softBorder,
                    },
                  ]}
                >
                  <PackageIcon size={28} color={theme.textMute} variant="stroke" />
                </View>
                <Text style={[styles.emptyText, { color: theme.textMute }]}>
                  {debouncedQuery.length > 0 ? t("common.noResults") : t("stock.emptyState")}
                </Text>
              </View>
            }
          />
        </View>
      </View>

      <PagedAdvancedFilterModal
        visible={isFilterModalVisible}
        title={t("common.filter")}
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
        bottomInset={insets.bottom + 20}
      >
        <PagedAdvancedFilterBuilder
          fields={stockFilterFields}
          rows={draftFilterRows}
          onRowsChange={setDraftFilterRows}
          defaultField="GrupKodu"
        />
      </PagedAdvancedFilterModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { flex: 1, backgroundColor: "transparent" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },

  controlsArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },

  viewSwitcher: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    alignItems: "center",
    height: 48,
    borderWidth: 1,
  },

  sortToolbarBtn: {
    height: 48,
    width: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  switchBtn: {
    padding: 8,
    borderRadius: 12,
    height: 38,
    width: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  metaText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  metaActionChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
    position: "relative",
  },

  sortText: {
    fontSize: 12,
    fontWeight: "600",
  },

  activeFilterDot: {
    position: "absolute",
    top: 5,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 999,
  },

  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 12,
  },

  emptyText: {
    marginTop: 4,
    fontWeight: "500",
    letterSpacing: 0.2,
    textAlign: "center",
    fontSize: 13,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalContent: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "88%",
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 14,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  closeBtn: {
    padding: 4,
  },

  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.2,
  },

  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },

  dropdownBtnText: {
    fontSize: 14,
    letterSpacing: 0.1,
    flex: 1,
    paddingRight: 8,
  },

  dropdownListContainer: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },

  searchInputContainer: {
    padding: 12,
    borderBottomWidth: 1,
  },

  dropdownSearchInput: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
  },

  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },

  dropdownItemInner: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  dropdownItemText: {
    fontSize: 14,
    letterSpacing: 0.1,
    flex: 1,
  },

  textFilterInput: {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
  },

  modalFooter: {
    flexDirection: "row",
    marginTop: 30,
  },

  modalActionBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  modalActionText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
