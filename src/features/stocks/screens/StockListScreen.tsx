import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Text,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  Keyboard,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { useStocks, useStockGroups } from "../hooks";
import { SearchInput } from "../components/SearchInput";
import {
  LayoutGridIcon,
  ListViewIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  FilterIcon,
  Cancel01Icon,
  PackageIcon,
  CheckmarkCircle02Icon,
} from "hugeicons-react-native";
import type { StockGetDto, PagedFilter, StockGroupDto } from "../types";
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

const getStockSearchText = (item: StockGetDto) => {
  const stock = item as any;

  return [
    stock?.stockCode,
    stock?.stokKodu,
    stock?.code,
    stock?.kod,
    stock?.stockName,
    stock?.stokAdi,
    stock?.name,
    stock?.adi,
    stock?.stockName2,
    stock?.description,
    stock?.aciklama,
    stock?.grupKodu,
    stock?.grupAdi,
    stock?.groupCode,
    stock?.groupName,
    stock?.Kod1,
    stock?.Kod2,
    stock?.Kod3,
    stock?.kod1,
    stock?.kod2,
    stock?.kod3,
  ]
    .filter(Boolean)
    .join(" ");
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const [appliedGroupCode, setAppliedGroupCode] = useState<string>("");
  const [appliedKod1, setAppliedKod1] = useState<string>("");
  const [appliedKod2, setAppliedKod2] = useState<string>("");
  const [appliedKod3, setAppliedKod3] = useState<string>("");

  const [tempGroupCode, setTempGroupCode] = useState<string>("");
  const [tempKod1, setTempKod1] = useState<string>("");
  const [tempKod2, setTempKod2] = useState<string>("");
  const [tempKod3, setTempKod3] = useState<string>("");

  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [groupSearchText, setGroupSearchText] = useState("");

  const normalizedDebouncedQuery = useMemo(
    () => normalizeText(debouncedQuery),
    [debouncedQuery]
  );

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

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const openFilterModal = () => {
    setTempGroupCode(appliedGroupCode);
    setTempKod1(appliedKod1);
    setTempKod2(appliedKod2);
    setTempKod3(appliedKod3);
    setIsGroupDropdownOpen(false);
    setGroupSearchText("");
    setIsFilterModalVisible(true);
  };

  const apiFilters = useMemo(() => {
    const filters: PagedFilter[] = [];

    if (appliedGroupCode.trim()) {
      filters.push({ column: "GrupKodu", operator: "eq", value: appliedGroupCode.trim() });
    }
    if (appliedKod1.trim()) {
      filters.push({ column: "Kod1", operator: "contains", value: appliedKod1.trim() });
    }
    if (appliedKod2.trim()) {
      filters.push({ column: "Kod2", operator: "contains", value: appliedKod2.trim() });
    }
    if (appliedKod3.trim()) {
      filters.push({ column: "Kod3", operator: "contains", value: appliedKod3.trim() });
    }

    return filters;
  }, [appliedGroupCode, appliedKod1, appliedKod2, appliedKod3]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useStocks(
    {
      filters: apiFilters,
      sortBy: "createdDate",
      sortDirection: sortOrder,
      pageSize: 20,
    },
    normalizedDebouncedQuery
  );

  const { data: stockGroups = [] } = useStockGroups();

  const filteredGroups = useMemo(() => {
    if (!groupSearchText.trim()) return stockGroups;

    return stockGroups.filter((g: StockGroupDto) =>
      fuzzyMatch(groupSearchText, `${g.grupKodu ?? ""} ${g.grupAdi ?? ""}`)
    );
  }, [stockGroups, groupSearchText]);

  const stocks = useMemo(() => {
    const rawStocks = data?.pages?.flatMap((page) => page.items || []) || [];

    if (!normalizedDebouncedQuery.trim()) return rawStocks;

    return rawStocks.filter((item: StockGetDto) =>
      fuzzyMatch(normalizedDebouncedQuery, getStockSearchText(item))
    );
  }, [data, normalizedDebouncedQuery]);

  const totalCount = normalizedDebouncedQuery.trim()
    ? stocks.length
    : data?.pages?.[0]?.totalCount || 0;

  const listBottomPadding = useMemo(() => {
    if (keyboardHeight <= 0) {
      return 24;
    }

    return keyboardHeight + 24;
  }, [keyboardHeight]);

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

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      );
    }

    return <View style={{ height: 8 }} />;
  };

  const isAnyFilterActive =
    !!appliedGroupCode || !!appliedKod1 || !!appliedKod2 || !!appliedKod3;

  const selectedGroupName =
    stockGroups.find((g: StockGroupDto) => g.grupKodu === tempGroupCode)?.grupAdi ||
    tempGroupCode ||
    t("stock.allGroups");

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
          <View style={styles.controlsArea}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <SearchInput value={searchText} onSearch={setSearchText} />
            </View>

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
          </View>

          {(!isPending || data) && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: theme.textMute }]}>
                {typeof t("stock.foundCount", { count: totalCount }) === "string"
                  ? t("stock.foundCount", { count: totalCount })
                  : `${totalCount}`}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  style={[
                    styles.sortBtn,
                    styles.metaActionChip,
                    {
                      backgroundColor: theme.surfaceBgSoft,
                      borderColor: isAnyFilterActive ? theme.borderColor : theme.softBorder,
                      marginRight: 10,
                    },
                  ]}
                  onPress={openFilterModal}
                >
                  <Text
                    style={[
                      styles.sortText,
                      { color: isAnyFilterActive ? theme.primary : theme.textMute },
                    ]}
                  >
                    {t("common.filter")}
                  </Text>
                  <FilterIcon
                    size={15}
                    color={isAnyFilterActive ? theme.primary : theme.textMute}
                    strokeWidth={2.2}
                    style={{ marginLeft: 4 }}
                  />
                  {isAnyFilterActive && (
                    <View style={[styles.activeFilterDot, { backgroundColor: theme.primary }]} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sortBtn,
                    styles.metaActionChip,
                    {
                      backgroundColor: theme.surfaceBgSoft,
                      borderColor: theme.softBorder,
                    },
                  ]}
                  onPress={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                >
                  <Text style={[styles.sortText, { color: theme.primary }]}>
                    {sortOrder === "desc" ? t("common.newest") : t("common.oldest")}
                  </Text>
                  {sortOrder === "desc" ? (
                    <ArrowDown01Icon
                      size={15}
                      color={theme.primary}
                      strokeWidth={2.2}
                      style={{ marginLeft: 4 }}
                    />
                  ) : (
                    <ArrowUp01Icon
                      size={15}
                      color={theme.primary}
                      strokeWidth={2.2}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isPending && !data ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Text style={{ color: "red" }}>{t("common.error")}</Text>
            </View>
          ) : (
            <FlatList
              key={viewMode}
              data={stocks}
              renderItem={renderItem}
              keyExtractor={(item) => String(item.id)}
              numColumns={viewMode === "grid" ? 2 : 1}
              columnWrapperStyle={viewMode === "grid" ? { gap: GAP } : undefined}
              contentContainerStyle={{
                paddingHorizontal: PADDING,
                paddingTop: 12,
                paddingBottom: listBottomPadding,
                gap: GAP,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              removeClippedSubviews={true}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              refreshing={isRefetching}
              onRefresh={refetch}
              ListEmptyComponent={
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
                    {normalizedDebouncedQuery.length > 0
                      ? t("common.noResults")
                      : t("stock.emptyState")}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>

      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.modalBg,
                paddingBottom: insets.bottom + 20 + (keyboardHeight > 0 ? keyboardHeight * 0.15 : 0),
              },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: theme.handle }]} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textSoft }]}>
                  {t("common.filter")}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsFilterModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Cancel01Icon size={24} color={theme.textMute} variant="stroke" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalLabel, { color: theme.textMute }]}>
                {t("stock.group")}
              </Text>

              <TouchableOpacity
                style={[
                  styles.dropdownBtn,
                  {
                    backgroundColor: theme.filterBg,
                    borderColor: isGroupDropdownOpen ? theme.borderColor : theme.softBorder,
                  },
                ]}
                onPress={() => {
                  setIsGroupDropdownOpen(!isGroupDropdownOpen);
                  setGroupSearchText("");
                }}
                activeOpacity={0.72}
              >
                <Text
                  style={[
                    styles.dropdownBtnText,
                    { color: tempGroupCode ? theme.textSoft : theme.filterText, fontWeight: "500" },
                  ]}
                  numberOfLines={1}
                >
                  {selectedGroupName}
                </Text>
                <ArrowDown01Icon
                  size={18}
                  color={tempGroupCode ? theme.primary : theme.textMute}
                  style={{ transform: [{ rotate: isGroupDropdownOpen ? "180deg" : "0deg" }] }}
                />
              </TouchableOpacity>

              {isGroupDropdownOpen && (
                <View
                  style={[
                    styles.dropdownListContainer,
                    { backgroundColor: theme.surfaceBg, borderColor: theme.softBorder },
                  ]}
                >
                  <View style={[styles.searchInputContainer, { borderBottomColor: theme.softBorder }]}>
                    <TextInput
                      style={[
                        styles.dropdownSearchInput,
                        {
                          color: theme.filterText,
                          backgroundColor: theme.filterBg,
                          borderColor: theme.softBorder,
                        },
                      ]}
                      placeholder={t("stock.searchGroup")}
                      placeholderTextColor={theme.textMute}
                      value={groupSearchText}
                      onChangeText={setGroupSearchText}
                    />
                  </View>

                  <ScrollView
                    style={{ maxHeight: 200 }}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    <TouchableOpacity
                      style={[styles.dropdownItem, { borderBottomColor: theme.softBorder }]}
                      onPress={() => {
                        setTempGroupCode("");
                        setIsGroupDropdownOpen(false);
                      }}
                    >
                      <View
                        style={[
                          styles.dropdownItemInner,
                          !tempGroupCode && {
                            backgroundColor: theme.selectedRowBg,
                            borderColor: theme.selectedRowBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            {
                              color: !tempGroupCode ? theme.primary : theme.textMute,
                              fontWeight: "500",
                            },
                          ]}
                        >
                          {t("stock.allGroups")}
                        </Text>
                        {!tempGroupCode ? (
                          <CheckmarkCircle02Icon size={16} color={theme.primary} variant="stroke" />
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    {filteredGroups.map((group: StockGroupDto, index: number) => {
                      const isSelected = tempGroupCode === (group.grupKodu ?? "");
                      return (
                        <TouchableOpacity
                          key={`${group.grupKodu}-${index}`}
                          style={[styles.dropdownItem, { borderBottomColor: theme.softBorder }]}
                          onPress={() => {
                            setTempGroupCode(group.grupKodu ?? "");
                            setIsGroupDropdownOpen(false);
                          }}
                        >
                          <View
                            style={[
                              styles.dropdownItemInner,
                              isSelected && {
                                backgroundColor: theme.selectedRowBg,
                                borderColor: theme.selectedRowBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                {
                                  color: isSelected ? theme.primary : theme.textMute,
                                  fontWeight: "500",
                                },
                              ]}
                            >
                              {group.grupKodu
                                ? `${group.grupKodu} - ${group.grupAdi ?? ""}`
                                : group.grupAdi ?? "-"}
                            </Text>
                            {isSelected ? (
                              <CheckmarkCircle02Icon size={16} color={theme.primary} variant="stroke" />
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Text style={[styles.modalLabel, { color: theme.textMute, marginTop: 18 }]}>
                Kod 1
              </Text>
              <TextInput
                value={tempKod1}
                onChangeText={setTempKod1}
                placeholder="Kod 1"
                placeholderTextColor={theme.textMute}
                style={[
                  styles.textFilterInput,
                  {
                    color: theme.filterText,
                    backgroundColor: theme.filterBg,
                    borderColor: theme.softBorder,
                  },
                ]}
              />

              <Text style={[styles.modalLabel, { color: theme.textMute, marginTop: 18 }]}>
                Kod 2
              </Text>
              <TextInput
                value={tempKod2}
                onChangeText={setTempKod2}
                placeholder="Kod 2"
                placeholderTextColor={theme.textMute}
                style={[
                  styles.textFilterInput,
                  {
                    color: theme.filterText,
                    backgroundColor: theme.filterBg,
                    borderColor: theme.softBorder,
                  },
                ]}
              />

              <Text style={[styles.modalLabel, { color: theme.textMute, marginTop: 18 }]}>
                Kod 3
              </Text>
              <TextInput
                value={tempKod3}
                onChangeText={setTempKod3}
                placeholder="Kod 3"
                placeholderTextColor={theme.textMute}
                style={[
                  styles.textFilterInput,
                  {
                    color: theme.filterText,
                    backgroundColor: theme.filterBg,
                    borderColor: theme.softBorder,
                  },
                ]}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.modalActionBtn,
                    {
                      backgroundColor: theme.switchBg,
                      borderColor: theme.softBorder,
                      flex: 1,
                      marginRight: 10,
                    },
                  ]}
                  onPress={() => {
                    setTempGroupCode("");
                    setTempKod1("");
                    setTempKod2("");
                    setTempKod3("");
                    setGroupSearchText("");
                    setIsGroupDropdownOpen(false);
                    setAppliedGroupCode("");
                    setAppliedKod1("");
                    setAppliedKod2("");
                    setAppliedKod3("");
                  }}
                >
                  <Text style={[styles.modalActionText, { color: theme.textMute }]}>
                    {t("common.clear")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalActionBtn,
                    {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                      flex: 2,
                    },
                  ]}
                  onPress={() => {
                    setAppliedGroupCode(tempGroupCode);
                    setAppliedKod1(tempKod1);
                    setAppliedKod2(tempKod2);
                    setAppliedKod3(tempKod3);
                    setIsFilterModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalActionText, { color: "#FFF" }]}>
                    {t("common.apply")}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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