import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Text,
  Dimensions,
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
import { useCustomers, useCities, useDistricts } from "../hooks";
import type { CustomerDto, PagedFilter } from "../types";

import {
  LayoutGridIcon,
  ListViewIcon,
  AddTeamIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  UserGroupIcon,
} from "hugeicons-react-native";
import { CustomerCard } from "../components/CustomerCard";

const { width } = Dimensions.get("window");
const GAP = 12;
const PADDING = 16;
const GRID_WIDTH = (width - PADDING * 2 - GAP) / 2;

const BRAND_COLOR = "#db2777";
const BRAND_COLOR_DARK = "#ec4899";
const DEFAULT_COUNTRY_ID = 1;

export function CustomerListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.08)", "transparent", "rgba(249, 115, 22, 0.05)"]
      : ["rgba(219, 39, 119, 0.05)", "transparent", "rgba(255, 240, 225, 0.3)"]
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
  };

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [tempFilterLogic, setTempFilterLogic] = useState<"and" | "or">("and");
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<"and" | "or">("and");

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

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCustomers({
      search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
      filters: apiFilters,
      filterLogic: appliedFilterLogic,
      sortBy: "Id",
      sortDirection: sortOrder,
      pageSize: 20,
    });

  const { data: cities } = useCities(DEFAULT_COUNTRY_ID);
  const draftCityId = useMemo(() => {
    const cityRow = draftFilterRows.find((row) => row.field === "CityId");
    return cityRow?.value ? Number(cityRow.value) : undefined;
  }, [draftFilterRows]);
  const { data: draftDistricts } = useDistricts(draftCityId);

  const customerFilterFields = useMemo<PagedAdvancedFilterFieldConfig[]>(
    () => [
      {
        value: "IsERPIntegrated",
        label: t("customer.modal.customerStatus"),
        type: "select",
        operators: ["eq"],
        placeholder: t("customer.modal.customerStatus"),
        options: [
          { value: "true", label: t("customer.status.erpYes") },
          { value: "false", label: t("customer.status.erpNo") },
        ],
      },
      {
        value: "CityId",
        label: t("customer.modal.citySelection"),
        type: "select",
        operators: ["eq"],
        placeholder: t("customer.modal.citySelection"),
        options: (cities ?? []).map((city) => ({ value: String(city.id), label: city.name })),
      },
      {
        value: "DistrictId",
        label: t("customer.modal.districtSelection"),
        type: "select",
        operators: ["eq"],
        placeholder: draftCityId
          ? t("customer.modal.districtSelection")
          : t("customer.selectCityFirst", "Önce il seçin"),
        options: (draftDistricts ?? []).map((district) => ({
          value: String(district.id),
          label: district.name,
        })),
      },
    ],
    [cities, draftCityId, draftDistricts, t]
  );

  const customers = useMemo(() => {
    return data?.pages?.flatMap((page) => page.items ?? []) || [];
  }, [data]);

  const totalCount = data?.pages?.[0]?.totalCount || 0;

  const loadMoreData = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleCreatePress = () => {
    router.push("/customers/create");
  };

  const renderItem = useCallback(
    ({ item }: { item: CustomerDto }) => (
      <View style={viewMode === "grid" ? { width: GRID_WIDTH } : { width: "100%" }}>
        <CustomerCard
          customer={item}
          viewMode={viewMode}
          onPress={() => router.push(`/customers/${item.id}`)}
        />
      </View>
    ),
    [viewMode, router]
  );

  const topRightActions = (
    <>
      <TouchableOpacity
        onPress={handleCreatePress}
        style={[
          styles.iconBtn,
          {
            backgroundColor: theme.surfaceBg,
            borderColor: theme.borderColor,
            marginRight: 8,
          },
        ]}
        activeOpacity={0.72}
      >
        <AddTeamIcon size={20} color={theme.primary} variant="stroke" strokeWidth={2.3} />
      </TouchableOpacity>

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
              size={19}
              color={viewMode === "grid" ? theme.primary : theme.iconColor}
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
              size={19}
              color={viewMode === "list" ? theme.primary : theme.iconColor}
              variant="stroke"
              strokeWidth={viewMode === "list" ? 2.2 : 1.7}
            />
          </View>
        </TouchableWithoutFeedback>
      </View>
    </>
  );

  const bottomRightActions = (
  <TouchableOpacity
    style={styles.sortInlineBtn}
    onPress={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
    activeOpacity={0.72}
  >
    {sortOrder === "desc" ? (
      <ArrowDown01Icon size={14} color={theme.textMute} strokeWidth={2} />
    ) : (
      <ArrowUp01Icon size={14} color={theme.textMute} strokeWidth={2} />
    )}
    <Text style={[styles.sortInlineText, { color: theme.textMute }]}>
      {t("common.sort", "Sıralama")}
    </Text>
  </TouchableOpacity>
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
        <ScreenHeader title={t("customer.title")} showBackButton={true} />

        <View style={styles.contentContainer}>
          <PagedFlatList
            listKey={viewMode}
            data={customers}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            searchValue={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder={t("customer.search")}
            onOpenFilters={openFilterModal}
            activeFilterCount={apiFilters.length}
            topRightActions={topRightActions}
            bottomRightActions={bottomRightActions}
            metaContent={
              <Text style={[styles.metaText, { color: theme.textMute }]} numberOfLines={1}>
                {t("customer.foundCount", { count: totalCount })}
              </Text>
            }
            isLoading={Boolean(isLoading && !data)}
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            numColumns={viewMode === "grid" ? 2 : 1}
            columnWrapperStyle={viewMode === "grid" ? { gap: GAP } : undefined}
            contentContainerStyle={{
              paddingHorizontal: viewMode === "grid" ? PADDING : 16,
              paddingTop: 8,
              paddingBottom: insets.bottom + 100,
              gap: viewMode === "grid" ? GAP : 0,
            }}
            onEndReached={loadMoreData}
            onEndReachedThreshold={0.3}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
            isFetchingNextPage={isFetchingNextPage}
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
                  <UserGroupIcon size={28} color={theme.textMute} variant="stroke" strokeWidth={1.8} />
                </View>
                <Text style={[styles.emptyText, { color: theme.textMute }]}>
                  {t("customer.emptyState")}
                </Text>
              </View>
            }
          />
        </View>
      </View>

      <PagedAdvancedFilterModal
        visible={isFilterModalVisible}
        title={t("customer.modal.title")}
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
          fields={customerFilterFields}
          rows={draftFilterRows}
          onRowsChange={setDraftFilterRows}
          defaultField="IsERPIntegrated"
        />
      </PagedAdvancedFilterModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 60 },

  controlsArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
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

  sortToolbarBtn: {
    height: 50,
    width: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
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

  statusContainer: {
    flexDirection: "column",
    gap: 10,
    paddingBottom: 8,
  },

  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },

  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1.8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  statusOptionText: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
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
  },

  dropdownListContainer: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },

  searchInputContainer: {
    padding: 10,
    borderBottomWidth: 1,
  },

  dropdownSearchInput: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
  },

  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },

  dropdownItemText: {
    fontSize: 14,
    letterSpacing: 0.1,
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
}
});