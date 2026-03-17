import React, { useCallback, useMemo, useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
  Text,
  Platform,
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
import { useShippingAddresses } from "../hooks";
import { ShippingAddressCard } from "../components";
import type { ShippingAddressDto } from "../types";
import {
  ShipmentTrackingIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "hugeicons-react-native";

const PADDING = 16;
const BRAND_COLOR = "#db2777"; 
const BRAND_COLOR_DARK = "#ec4899";

export function ShippingAddressListScreen(): React.ReactElement {
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
  };

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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

  const shippingFilterFields = useMemo<PagedAdvancedFilterFieldConfig[]>(
    () => [
      { value: "address", label: t("shippingAddress.address", "Adres"), type: "text", placeholder: t("shippingAddress.address", "Adres") },
      { value: "contactPerson", label: t("shippingAddress.contactPerson", "Yetkili"), type: "text", placeholder: t("shippingAddress.contactPerson", "Yetkili") },
      { value: "phone", label: t("customer.phone", "Telefon"), type: "text", placeholder: t("customer.phone", "Telefon") },
      { value: "customerName", label: t("customer.title", "Cari"), type: "text", placeholder: t("customer.title", "Cari") },
      { value: "cityName", label: t("customer.modal.citySelection", "İl"), type: "text", placeholder: t("customer.modal.citySelection", "İl") },
      { value: "districtName", label: t("customer.modal.districtSelection", "İlçe"), type: "text", placeholder: t("customer.modal.districtSelection", "İlçe") },
    ],
    [t]
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useShippingAddresses({
    filters: apiFilters,
    filterLogic: appliedFilterLogic,
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
    sortBy: "address",
    sortDirection: sortOrder,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const addresses = useMemo(() => {
    return (
      data?.pages
        .flatMap((page) => page.items ?? [])
        .filter((item): item is ShippingAddressDto => item != null) || []
    );
  }, [data]);

  const totalCount = data?.pages?.[0]?.totalCount || addresses.length;

  const handleAddressPress = useCallback(
    (address: ShippingAddressDto) => {
      if (!address?.id) return;
      router.push(`/(tabs)/customers/shipping/${address.id}`);
    },
    [router]
  );

  const handleCreatePress = useCallback(() => {
    router.push("/(tabs)/customers/shipping/create");
  }, [router]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ShippingAddressDto }) => {
      if (!item) return null;
      return (
        <View style={{ marginBottom: 14 }}>
            <ShippingAddressCard 
                address={item} 
                onPress={() => handleAddressPress(item)} 
            />
        </View>
      );
    },
    [handleAddressPress]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return <View style={{ height: 40 }} />;
    return <View style={styles.footerLoading} />;
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40, opacity: 0.8 }}>📍</Text>
        <Text style={{ color: theme.textMute, marginTop: 12, fontWeight: '500', letterSpacing: 0.5, textAlign: 'center' }}>
          {t("shippingAddress.noAddresses") || "Kriterlere uygun adres bulunamadı.\nFiltreleri temizlemeyi deneyin."}
        </Text>
      </View>
    );
  }, [isLoading, theme, t]);

  if (isError) {
    return (
        <View style={[styles.container, { backgroundColor: mainBg }]}>
            <ScreenHeader title={t("shippingAddress.title")} showBackButton />
            <View style={styles.center}>
                <Text style={{ color: theme.error, marginBottom: 12 }}>{t("common.error")}</Text>
                <TouchableOpacity 
                    style={[styles.retryButton, { backgroundColor: theme.primary }]} 
                    onPress={() => refetch()}
                >
                    <Text style={{ color: "#FFF", fontWeight: "600" }}>{t("common.retry")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <View style={{ flex: 1 }}>
        <ScreenHeader title={t("shippingAddress.title")} showBackButton />

        <View style={styles.contentContainer}>
          
          <PagedFlatList
              data={addresses}
              keyExtractor={(item, index) => String(item?.id ?? index)}
              renderItem={renderItem}
              searchValue={searchText}
              onSearchChange={setSearchText}
              searchPlaceholder={t("shippingAddress.searchPlaceholder")}
              onOpenFilters={() => {
                setDraftFilterRows(appliedFilterRows);
                setTempFilterLogic(appliedFilterLogic);
                setIsFilterModalVisible(true);
              }}
              activeFilterCount={apiFilters.length}
              toolbarActions={
                <>
                  <TouchableOpacity
                    onPress={handleCreatePress}
                    style={[
                      styles.iconBtn,
                      {
                        backgroundColor: isDark ? "rgba(219, 39, 119, 0.15)" : theme.surfaceBg,
                        borderColor: isDark ? "rgba(236, 72, 153, 0.3)" : theme.borderColor,
                      },
                    ]}
                    activeOpacity={0.72}
                  >
                    <ShipmentTrackingIcon size={22} color={theme.primary} variant="stroke" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.iconBtn,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : theme.surfaceBg,
                        borderColor: isDark ? "rgba(255,255,255,0.08)" : theme.borderColor,
                        marginLeft: 8,
                      },
                    ]}
                    onPress={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                    activeOpacity={0.72}
                  >
                    {sortOrder === "asc" ? (
                      <ArrowUp01Icon size={18} color={theme.primary} strokeWidth={2.2} />
                    ) : (
                      <ArrowDown01Icon size={18} color={theme.primary} strokeWidth={2.2} />
                    )}
                  </TouchableOpacity>
                </>
              }
              metaContent={
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: theme.textMute }]}>
                    {totalCount} adres bulundu
                  </Text>
                </View>
              }
              isLoading={Boolean(isLoading && !data)}
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={handleRefresh}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.3}
              ListFooterComponent={renderFooter()}
              ListEmptyComponent={renderEmpty()}
              contentContainerStyle={{
                paddingHorizontal: PADDING,
                paddingTop: 4,
                paddingBottom: insets.bottom + 100,
              }}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
            />
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
            fields={shippingFilterFields}
            rows={draftFilterRows}
            onRowsChange={setDraftFilterRows}
            defaultField={shippingFilterFields[0]?.value}
          />
        </PagedAdvancedFilterModal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flex: 1 },
  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 60 
  },
  
  controlsArea: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 8 
  },
  iconBtn: { 
    height: 50, 
    width: 50, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: "#db2777", 
    shadowOffset: { width: 0, height: 0 }, 
    shadowRadius: 10, 
    overflow: 'hidden'
  },

  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingBottom: 8 
  },
  metaText: { 
    fontSize: 12, 
    fontWeight: '600', 
    letterSpacing: 0.2 
  },

  footerLoading: {
    paddingVertical: 20,
    alignItems: "center",
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  }
});
