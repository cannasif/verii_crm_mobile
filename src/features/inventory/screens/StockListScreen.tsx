import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import {
  PagedAdvancedFilterBuilder,
  PagedAdvancedFilterModal,
  PagedFlatList,
  mapPagedAdvancedFilterRowsToFilters,
  type PagedAdvancedFilterFieldConfig,
  type PagedAdvancedFilterRow,
} from "../../../components/paged";
import { useUIStore } from "../../../store/ui";
import { useStocks } from "../hooks";
import { StockCard } from "../components";
import type { StockGetDto, PagedResponse } from "../types";
import { ArrowDown01Icon, ArrowUp01Icon } from "hugeicons-react-native";

export function StockListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [tempFilterLogic, setTempFilterLogic] = useState<"and" | "or">("and");
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<"and" | "or">("and");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 700);

    return () => clearTimeout(handler);
  }, [searchText]);

  const contentBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.5)" : colors.background;
  const apiFilters = useMemo(
    () => mapPagedAdvancedFilterRowsToFilters(appliedFilterRows),
    [appliedFilterRows]
  );

  const stockFilterFields = useMemo<PagedAdvancedFilterFieldConfig[]>(
    () => [
      { value: "erpStockCode", label: t("stock.erpStockCode", "ERP Stok Kodu"), type: "text", placeholder: t("stock.erpStockCode", "ERP Stok Kodu") },
      { value: "stockName", label: t("stock.stockName", "Stok Adı"), type: "text", placeholder: t("stock.stockName", "Stok Adı") },
      { value: "unit", label: t("stock.unit", "Birim"), type: "text", placeholder: t("stock.unit", "Birim") },
      { value: "ureticiKodu", label: t("stock.manufacturerCode", "Üretici Kodu"), type: "text", placeholder: t("stock.manufacturerCode", "Üretici Kodu") },
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
  } = useStocks({
    filters: apiFilters,
    filterLogic: appliedFilterLogic,
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
    sortBy: "stockName",
    sortDirection: sortOrder,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const stocks = useMemo(() => {
    return (
      data?.pages
        .flatMap((page: PagedResponse<StockGetDto>) => page.items ?? [])
        .filter((item): item is StockGetDto => item != null) || []
    );
  }, [data]);
  const totalCount = data?.pages?.[0]?.totalCount || stocks.length;

  const handleStockPress = useCallback(
    (stock: StockGetDto) => {
      if (!stock?.id) return;
      router.push(`/(tabs)/stock/${stock.id}`);
    },
    [router]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: StockGetDto }) => {
      if (!item) return null;
      return <StockCard stock={item} onPress={() => handleStockPress(item)} />;
    },
    [handleStockPress]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return <View style={styles.footer} />;
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t("stock.noStocks")}
        </Text>
      </View>
    );
  }, [isLoading, colors, t]);

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: colors.header }]}>
        <ScreenHeader title={t("stock.list")} showBackButton />
        <View style={[styles.content, { backgroundColor: contentBackground }]}>
          {isError ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{t("common.error")}</Text>
            </View>
          ) : (
            <PagedFlatList
              data={stocks}
              renderItem={renderItem}
              keyExtractor={(item) => String(item.id)}
              searchValue={searchText}
              onSearchChange={setSearchText}
              searchPlaceholder={t("stock.searchPlaceholder")}
              onOpenFilters={() => {
                setDraftFilterRows(appliedFilterRows);
                setTempFilterLogic(appliedFilterLogic);
                setIsFilterModalVisible(true);
              }}
              activeFilterCount={apiFilters.length}
              toolbarActions={
                <TouchableOpacity
                  style={[styles.sortToolbarBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                  activeOpacity={0.72}
                >
                  {sortOrder === "asc" ? (
                    <ArrowUp01Icon size={18} color={colors.accent} strokeWidth={2.2} />
                  ) : (
                    <ArrowDown01Icon size={18} color={colors.accent} strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              }
              metaContent={
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {totalCount} stok bulundu
                  </Text>
                </View>
              }
              isLoading={Boolean(isLoading && !data)}
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              contentContainerStyle={[
                styles.listContent,
                stocks.length === 0 && styles.listContentEmpty,
                { paddingBottom: insets.bottom + 20 },
              ]}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmpty}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
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
          fields={stockFilterFields}
          rows={draftFilterRows}
          onRowsChange={setDraftFilterRows}
          defaultField={stockFilterFields[0]?.value}
        />
      </PagedAdvancedFilterModal>
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
  },
  listContent: {
    paddingHorizontal: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
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
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
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
  sortToolbarBtn: {
    height: 48,
    width: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
  },
});
