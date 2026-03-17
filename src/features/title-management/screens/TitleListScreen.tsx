import React, { useCallback, useMemo, useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from "react-native";
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
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useTitles, useDeleteTitle } from "../hooks";
import { TitleCard, TitleFormModal } from "../components";
import type { TitleDto } from "../types";
import {
  Add01Icon,
  AlertCircleIcon,
  RefreshIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "hugeicons-react-native";

export function TitleListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const deleteTitle = useDeleteTitle();

  const isDark = themeMode === "dark";

  const BRAND_COLOR = "#db2777"; 
  const BRAND_COLOR_DARK = "#ec4899";

  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.08)', 'transparent', 'rgba(249, 115, 22, 0.05)'] 
    : ['rgba(219, 39, 119, 0.05)', 'transparent', 'rgba(255, 240, 225, 0.3)']) as [string, string, ...string[]];

  const theme = {
    text: isDark ? "#FFFFFF" : "#0F172A",
    textMute: isDark ? "#94a3b8" : "#64748B",
    primary: isDark ? BRAND_COLOR_DARK : BRAND_COLOR,     
    surfaceBg: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(236, 72, 153, 0.3)' : 'rgba(219, 39, 119, 0.2)',
    error: "#EF4444"
  };

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<TitleDto | null>(null);
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

  const titleFilterFields = useMemo<PagedAdvancedFilterFieldConfig[]>(
    () => [
      { value: "titleName", label: t("titleManagement.title"), type: "text", placeholder: t("titleManagement.title") },
      { value: "code", label: t("common.code", "Kod"), type: "text", placeholder: t("common.code", "Kod") },
    ],
    [t]
  );

  const apiFilters = useMemo(
    () => mapPagedAdvancedFilterRowsToFilters(appliedFilterRows),
    [appliedFilterRows]
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
  } = useTitles({
    filters: apiFilters,
    filterLogic: appliedFilterLogic,
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
    sortBy: "titleName",
    sortDirection: sortOrder,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const titles = useMemo(() => {
    return (
      data?.pages
        .flatMap((page) => page.items ?? [])
        .filter((item): item is TitleDto => item != null) || []
    );
  }, [data]);

  const totalCount = data?.pages?.[0]?.totalCount || titles.length || 0;
  const isInitialLoading = isLoading && titles.length === 0;

  const handleTitlePress = useCallback((title: TitleDto) => {
    setSelectedTitle(title);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((title: TitleDto) => {
    setSelectedTitle(title);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (title: TitleDto) => {
      Alert.alert(
        t("titleManagement.deleteConfirm"),
        t("titleManagement.deleteConfirmMessage", { name: title.titleName }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: () => {
              deleteTitle.mutate(title.id);
            },
          },
        ]
      );
    },
    [deleteTitle, t]
  );

  const handleCreatePress = useCallback(() => {
    setSelectedTitle(null);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setSelectedTitle(null);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: TitleDto }) => {
      if (!item) return null;
      return (
        <View style={{ marginBottom: 14 }}>
            <TitleCard
              title={item}
              onPress={() => handleTitlePress(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
        </View>
      );
    },
    [handleTitlePress, handleEdit, handleDelete]
  );

  return (
    <>
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

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScreenHeader title={t("titleManagement.title")} showBackButton />

          <View style={styles.content}>
            
            {isInitialLoading ? (
               <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
               </View>
            ) : isError ? (
               <View style={styles.centerContainer}>
                  <AlertCircleIcon size={48} color={theme.textMute} variant="stroke" />
                  <Text style={[styles.errorText, { color: theme.error }]}>{t("common.error")}</Text>
                  <TouchableOpacity onPress={() => refetch()} style={[styles.retryButton, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }]}>
                    <RefreshIcon size={16} color={theme.text} variant="stroke" />
                    <Text style={[styles.retryText, { color: theme.text }]}>{t("common.retry")}</Text>
                  </TouchableOpacity>
               </View>
            ) : (
                <PagedFlatList
                    data={titles}
                    keyExtractor={(item, index) => String(item?.id ?? index)}
                    renderItem={renderItem}
                    searchValue={searchText}
                    onSearchChange={setSearchText}
                    searchPlaceholder={t("titleManagement.searchPlaceholder")}
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
                            }
                          ]}
                          activeOpacity={0.72}
                        >
                          <Add01Icon size={24} color={theme.primary} variant="stroke" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.sortToolbarBtn, { backgroundColor: theme.surfaceBg, borderColor: theme.borderColor }]}
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
                          {totalCount} unvan bulundu
                        </Text>
                      </View>
                    }
                    isLoading={isInitialLoading}
                    refreshing={isRefetching && !isFetchingNextPage}
                    onRefresh={handleRefresh}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 4,
                        paddingBottom: insets.bottom + 100,
                    }}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={15}
                    maxToRenderPerBatch={15}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    ListFooterComponent={
                      isFetchingNextPage ? (
                        <View style={{ paddingVertical: 20 }} />
                      ) : null
                    }
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Text style={{ fontSize: 40, opacity: 0.8 }}>📋</Text>
                        <Text style={[styles.emptyText, { color: theme.textMute }]}>{t("titleManagement.noTitles")}</Text>
                      </View>
                    }
                />
            )}
          </View>
        </KeyboardAvoidingView>
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
          fields={titleFilterFields}
          rows={draftFilterRows}
          onRowsChange={setDraftFilterRows}
          defaultField={titleFilterFields[0]?.value}
        />
      </PagedAdvancedFilterModal>

      <TitleFormModal
        visible={modalVisible}
        onClose={handleModalClose}
        title={selectedTitle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, backgroundColor: 'transparent' },
  
  controlsArea: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 8 
  },
  iconBtn: { 
    height: 48, 
    width: 48, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    alignItems: 'center', 
    justifyContent: 'center',
    overflow: 'hidden' 
  },
  sortToolbarBtn: {
    height: 48,
    width: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingBottom: 10 
  },
  metaText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },

  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 20 },
  errorText: { fontSize: 16, marginTop: 12 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryText: { fontSize: 15, fontWeight: "700" },
  
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyText: { fontSize: 15, marginTop: 12, fontWeight: '500', letterSpacing: 0.5, textAlign: 'center' },
});
