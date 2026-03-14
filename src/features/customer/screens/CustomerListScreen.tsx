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
  Platform,
  ScrollView,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { useCustomers, useCities, useDistricts } from "../hooks";
import type { CustomerDto, PagedFilter } from "../types";

import { SearchInput } from "../components/SearchInput";
import {
  LayoutGridIcon,
  ListViewIcon,
  AddTeamIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  FilterIcon,
  Cancel01Icon,
} from "hugeicons-react-native";
import { CustomerCard } from "../components/CustomerCard";

const { width } = Dimensions.get("window");
const GAP = 12;
const PADDING = 16;
const GRID_WIDTH = (width - PADDING * 2 - GAP) / 2;

const BRAND_COLOR = "#db2777";
const BRAND_COLOR_DARK = "#ec4899";
const DEFAULT_COUNTRY_ID = 1;

const normalizeText = (text: string) => {
  if (!text) return "";
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
};

const fuzzyMatch = (query: string, text: string) => {
  const normalizedQuery = normalizeText(query).replace(/\s+/g, "");
  const normalizedText = normalizeText(text);

  if (!normalizedQuery) return true;

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

  const [appliedFilter, setAppliedFilter] = useState<string>("all");
  const [appliedCityId, setAppliedCityId] = useState<number | null>(null);
  const [appliedDistrictId, setAppliedDistrictId] = useState<number | null>(null);

  const [tempFilter, setTempFilter] = useState<string>("all");
  const [tempCityId, setTempCityId] = useState<number | null>(null);
  const [tempDistrictId, setTempDistrictId] = useState<number | null>(null);

  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);

  const [citySearchText, setCitySearchText] = useState("");
  const [districtSearchText, setDistrictSearchText] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const openFilterModal = () => {
    setTempFilter(appliedFilter);
    setTempCityId(appliedCityId);
    setTempDistrictId(appliedDistrictId);
    setIsCityDropdownOpen(false);
    setIsDistrictDropdownOpen(false);
    setCitySearchText("");
    setDistrictSearchText("");
    setIsFilterModalVisible(true);
  };

  const apiFilters = useMemo(() => {
    const filters: PagedFilter[] = [];
    if (debouncedQuery && debouncedQuery.trim().length >= 2) {
      filters.push({ column: "Name", operator: "contains", value: debouncedQuery.trim() });
    }
    if (appliedFilter === "erp_yes") {
      filters.push({ column: "IsERPIntegrated", operator: "eq", value: "true" });
    }
    if (appliedFilter === "erp_no") {
      filters.push({ column: "IsERPIntegrated", operator: "eq", value: "false" });
    }
    if (appliedCityId) {
      filters.push({ column: "CityId", operator: "eq", value: String(appliedCityId) });
    }
    if (appliedDistrictId) {
      filters.push({ column: "DistrictId", operator: "eq", value: String(appliedDistrictId) });
    }
    return filters;
  }, [debouncedQuery, appliedFilter, appliedCityId, appliedDistrictId]);

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCustomers({
      filters: apiFilters,
      sortBy: "Id",
      sortDirection: sortOrder,
      pageSize: 20,
    });

  const { data: cities } = useCities(DEFAULT_COUNTRY_ID);
  const { data: tempDistricts } = useDistricts(tempCityId || undefined);

  const filteredCities = useMemo(() => {
    if (!cities) return [];
    if (!citySearchText.trim()) return cities;
    return cities.filter((c) => fuzzyMatch(citySearchText, c.name));
  }, [cities, citySearchText]);

  const filteredDistricts = useMemo(() => {
    if (!tempDistricts) return [];
    if (!districtSearchText.trim()) return tempDistricts;
    return tempDistricts.filter((d) => fuzzyMatch(districtSearchText, d.name));
  }, [tempDistricts, districtSearchText]);

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

  const isAnyFilterActive =
    appliedFilter !== "all" || appliedCityId !== null || appliedDistrictId !== null;

  const tempSelectedCityName =
    cities?.find((c) => c.id === tempCityId)?.name || t("customer.allCities");
  const tempSelectedDistrictName =
    tempDistricts?.find((d) => d.id === tempDistrictId)?.name || t("customer.allDistricts");

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
          <View style={styles.controlsArea}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <SearchInput value={searchText} onSearch={setSearchText} placeholder={t("customer.search")} />
            </View>

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
          </View>

          {(!isLoading || data) && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: theme.textMute }]}>
                {t("customer.foundCount", { count: totalCount })}
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
                    {t("customer.filter")}
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
                    {sortOrder === "desc" ? t("customer.sortNewest") : t("customer.sortOldest")}
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

          {isLoading && !data ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              key={viewMode}
              data={customers}
              renderItem={renderItem}
              keyExtractor={(item) => String(item.id)}
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
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : null
              }
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === "android"}
              refreshing={isRefetching && !isFetchingNextPage}
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
                    <Text style={{ fontSize: 30, opacity: 0.8 }}>📍</Text>
                  </View>
                  <Text style={[styles.emptyText, { color: theme.textMute }]}>
                    {t("customer.emptyState")}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>

      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.modalBg,
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: theme.handle }]} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textSoft }]}>
                {t("customer.modal.title")}
              </Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={styles.closeBtn}>
                <Cancel01Icon size={24} color={theme.textMute} variant="stroke" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: theme.textMute }]}>
              {t("customer.modal.customerStatus")}
            </Text>

            <View style={styles.statusContainer}>
              {[
                { id: "all", label: t("customer.status.all") },
                { id: "erp_yes", label: t("customer.status.erpYes") },
                { id: "erp_no", label: t("customer.status.erpNo") },
              ].map((filter) => {
                const isActive = tempFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor: isActive ? theme.activeSwitchBg : theme.filterBg,
                        borderColor: isActive ? theme.borderColor : theme.softBorder,
                      },
                    ]}
                    activeOpacity={0.72}
                    onPress={() => setTempFilter(filter.id)}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isActive ? theme.primary : theme.iconColor },
                      ]}
                    >
                      {isActive && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                    </View>
                    <Text
                      style={[
                        styles.statusOptionText,
                        { color: isActive ? theme.textSoft : theme.filterText },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalLabel, { color: theme.textMute, marginTop: 24 }]}>
              {t("customer.modal.citySelection")}
            </Text>

            <TouchableOpacity
              style={[
                styles.dropdownBtn,
                {
                  backgroundColor: theme.filterBg,
                  borderColor: isCityDropdownOpen ? theme.borderColor : theme.softBorder,
                },
              ]}
              onPress={() => {
                setIsCityDropdownOpen(!isCityDropdownOpen);
                setCitySearchText("");
              }}
              activeOpacity={0.72}
            >
              <Text
                style={[
                  styles.dropdownBtnText,
                  { color: tempCityId ? theme.textSoft : theme.filterText, fontWeight: "500" },
                ]}
              >
                {tempSelectedCityName}
              </Text>
              <ArrowDown01Icon
                size={18}
                color={tempCityId ? theme.primary : theme.textMute}
                style={{ transform: [{ rotate: isCityDropdownOpen ? "180deg" : "0deg" }] }}
              />
            </TouchableOpacity>

            {isCityDropdownOpen && (
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
                    placeholder={t("customer.searchCity") || "İl ara..."}
                    placeholderTextColor={theme.textMute}
                    value={citySearchText}
                    onChangeText={setCitySearchText}
                  />
                </View>
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={[styles.dropdownItem, { borderBottomColor: theme.softBorder }]}
                    onPress={() => {
                      setTempCityId(null);
                      setTempDistrictId(null);
                      setIsCityDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: !tempCityId ? theme.primary : theme.textMute, fontWeight: "500" },
                      ]}
                    >
                      {t("customer.allCities")}
                    </Text>
                  </TouchableOpacity>

                  {filteredCities.map((city) => (
                    <TouchableOpacity
                      key={city.id}
                      style={[styles.dropdownItem, { borderBottomColor: theme.softBorder }]}
                      onPress={() => {
                        setTempCityId(city.id);
                        setTempDistrictId(null);
                        setIsCityDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color: tempCityId === city.id ? theme.primary : theme.textMute,
                            fontWeight: "500",
                          },
                        ]}
                      >
                        {city.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {tempCityId && tempDistricts && tempDistricts.length > 0 && (
              <>
                <Text style={[styles.modalLabel, { color: theme.textMute, marginTop: 16 }]}>
                  {t("customer.modal.districtSelection")}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.dropdownBtn,
                    {
                      backgroundColor: theme.filterBg,
                      borderColor: isDistrictDropdownOpen ? theme.borderColor : theme.softBorder,
                    },
                  ]}
                  onPress={() => {
                    setIsDistrictDropdownOpen(!isDistrictDropdownOpen);
                    setDistrictSearchText("");
                  }}
                  activeOpacity={0.72}
                >
                  <Text
                    style={[
                      styles.dropdownBtnText,
                      { color: tempDistrictId ? theme.textSoft : theme.filterText, fontWeight: "500" },
                    ]}
                  >
                    {tempSelectedDistrictName}
                  </Text>
                  <ArrowDown01Icon
                    size={18}
                    color={tempDistrictId ? theme.primary : theme.textMute}
                    style={{ transform: [{ rotate: isDistrictDropdownOpen ? "180deg" : "0deg" }] }}
                  />
                </TouchableOpacity>

                {isDistrictDropdownOpen && (
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
                        placeholder={t("customer.searchDistrict") || "İlçe ara..."}
                        placeholderTextColor={theme.textMute}
                        value={districtSearchText}
                        onChangeText={setDistrictSearchText}
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                      <TouchableOpacity
                        style={[styles.dropdownItem, { borderBottomColor: theme.softBorder }]}
                        onPress={() => {
                          setTempDistrictId(null);
                          setIsDistrictDropdownOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: !tempDistrictId ? theme.primary : theme.textMute, fontWeight: "500" },
                          ]}
                        >
                          {t("customer.allDistricts")}
                        </Text>
                      </TouchableOpacity>

                      {filteredDistricts.map((district) => (
                        <TouchableOpacity
                          key={district.id}
                          style={[styles.dropdownItem, { borderBottomColor: theme.softBorder }]}
                          onPress={() => {
                            setTempDistrictId(district.id);
                            setIsDistrictDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              {
                                color: tempDistrictId === district.id ? theme.primary : theme.textMute,
                                fontWeight: "500",
                              },
                            ]}
                          >
                            {district.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

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
                  setTempFilter("all");
                  setTempCityId(null);
                  setTempDistrictId(null);
                  setIsCityDropdownOpen(false);
                  setIsDistrictDropdownOpen(false);
                  setCitySearchText("");
                  setDistrictSearchText("");
                }}
              >
                <Text style={[styles.modalActionText, { color: theme.textMute }]}>{t("common.clear")}</Text>
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
                  setAppliedFilter(tempFilter);
                  setAppliedCityId(tempCityId);
                  setAppliedDistrictId(tempDistrictId);
                  setIsFilterModalVisible(false);
                }}
              >
                <Text style={[styles.modalActionText, { color: "#FFF" }]}>{t("common.apply")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  switchBtn: {
    borderRadius: 12,
    height: 40,
    width: 40,
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
});
