import React, { useCallback, useMemo, useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  Text,
  KeyboardAvoidingView,
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
  type PagedAdvancedFilterFieldConfig,
  type PagedAdvancedFilterRow,
} from "../../../components/paged";
import { useUIStore } from "../../../store/ui";

import { useContacts } from "../hooks";
import { useCustomers } from "../../customer/hooks";
import { ContactListCard } from "../components/ContactListCard"; 
import type { ContactDto, PagedFilter } from "../types";

import { 
  ContactBookIcon, 
  AlertCircleIcon, 
  RefreshIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "hugeicons-react-native";

export function ContactListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

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
    switchBg: isDark ? 'rgba(0,0,0,0.3)' : '#F1F5F9',
    activeSwitchBg: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(219, 39, 119, 0.1)',
    iconColor: isDark ? "#64748B" : "#94a3b8",
    filterBg: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
    filterText: isDark ? '#CBD5E1' : '#475569',
    modalBg: isDark ? '#1E293B' : '#FFFFFF', 
    error: "#EF4444"
  };

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<PagedAdvancedFilterRow[]>([]);
  const [tempFilterLogic, setTempFilterLogic] = useState<"and" | "or">("and");
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<"and" | "or">("and");

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedQuery(searchText); }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const { data: customersData } = useCustomers({ pageSize: 100 });
  const customersList = customersData?.pages?.flatMap(p => p.items) || [];

  const contactFilterFields = useMemo<PagedAdvancedFilterFieldConfig[]>(
    () => [
      {
        value: "customerId",
        label: t("customer.title", "Cari"),
        type: "select",
        operators: ["eq"],
        placeholder: t("customer.title", "Cari"),
        options: customersList.map((customer) => ({
          value: String(customer.id),
          label: customer.name,
        })),
      },
      { value: "fullName", label: t("contact.fullName", "Ad Soyad"), type: "text", placeholder: t("contact.fullName", "Ad Soyad") },
      { value: "titleName", label: t("titleManagement.title", "Ünvan"), type: "text", placeholder: t("titleManagement.title", "Ünvan") },
      { value: "customerName", label: t("customer.title", "Cari"), type: "text", placeholder: t("customer.title", "Cari") },
      { value: "phone", label: t("customer.phone", "Telefon"), type: "text", placeholder: t("customer.phone", "Telefon") },
      { value: "mobile", label: t("customer.mobile", "Cep Telefonu"), type: "text", placeholder: t("customer.mobile", "Cep Telefonu") },
      { value: "email", label: t("customer.email", "E-posta"), type: "text", placeholder: t("customer.email", "E-posta") },
      {
        value: "__hasPhone",
        label: t("contact.filterHasPhone", "Telefonu Olanlar"),
        type: "select",
        operators: ["eq"],
        placeholder: t("contact.filterHasPhone", "Telefonu Olanlar"),
        options: [{ value: "true", label: t("common.true", "Evet") }],
      },
      {
        value: "__hasEmail",
        label: t("contact.filterHasEmail", "E-postası Olanlar"),
        type: "select",
        operators: ["eq"],
        placeholder: t("contact.filterHasEmail", "E-postası Olanlar"),
        options: [{ value: "true", label: t("common.true", "Evet") }],
      },
    ],
    [customersList, t]
  );

  const filters = useMemo(() => {
    const arr: PagedFilter[] = [];

    appliedFilterRows.forEach((row) => {
      const value = row.value?.toString().trim();
      if (!row.field || value === "") return;

      if (row.field === "__hasPhone") {
        arr.push({ column: "phone", operator: value === "true" ? "isNotNull" : "eq", value: value === "true" ? "" : "" });
        return;
      }

      if (row.field === "__hasEmail") {
        arr.push({ column: "email", operator: value === "true" ? "isNotNull" : "eq", value: value === "true" ? "" : "" });
        return;
      }

      arr.push({ column: row.field, operator: row.operator, value });
    });

    return arr.length > 0 ? arr : undefined;
  }, [appliedFilterRows]);

  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } = useContacts({ 
    filters,
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
    sortBy: "fullName",
    sortDirection: sortOrder,
    filterLogic: appliedFilterLogic,
    pageSize: 20 
  });

  const contacts = useMemo(() => {
    const pages = data?.pages ?? [];
    return pages
      .flatMap((page) => {
        const pageData = page as unknown as { items?: ContactDto[]; Items?: ContactDto[] };
        if (Array.isArray(pageData.items)) return pageData.items;
        if (Array.isArray(pageData.Items)) return pageData.Items;
        return [];
      })
      .filter((item): item is ContactDto => item != null);
  }, [data]);

  const totalCount = data?.pages?.[0]?.totalCount || contacts.length || 0;
  const isInitialLoading = isPending && contacts.length === 0;

  const handleContactPress = useCallback((contact: ContactDto) => {
    if (!contact?.id) return;
    router.push(`/customers/contacts/${contact.id}`);
  }, [router]);

  const handleCreatePress = useCallback(() => {
    router.push("/customers/contacts/create");
  }, [router]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }: { item: ContactDto }) => (
    <ContactListCard 
       contact={item} 
       onPress={() => handleContactPress(item)} 
    />
  ), [handleContactPress]);

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScreenHeader title={t("contact.title")} showBackButton />
        
        <View style={styles.content}> 
          {isError ? (
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
              data={contacts}
              renderItem={renderItem}
              keyExtractor={(item, index) => String(item.id ?? index)}
              searchValue={searchText}
              onSearchChange={setSearchText}
              searchPlaceholder={t("contact.searchPlaceholder")}
              onOpenFilters={() => {
                setDraftFilterRows(appliedFilterRows);
                setTempFilterLogic(appliedFilterLogic);
                setIsFilterModalVisible(true);
              }}
              activeFilterCount={filters?.length ?? 0}
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
                    <ContactBookIcon size={22} color={theme.primary} variant="stroke" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sortBtnBox, { borderColor: theme.borderColor, backgroundColor: theme.surfaceBg }]} onPress={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                    {sortOrder === 'desc' ? (
                      <ArrowDown01Icon size={16} color={theme.primary} strokeWidth={2.5} />
                    ) : (
                      <ArrowUp01Icon size={16} color={theme.primary} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </>
              }
              metaContent={
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: theme.textMute }]}>
                    {totalCount} kişi bulundu
                  </Text>
                </View>
              }
              isLoading={isInitialLoading}
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={{ paddingVertical: 20 }} />
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 40, opacity: 0.8 }}>📇</Text>
                  <Text style={[styles.emptyText, { color: theme.textMute }]}>{t("contact.noContacts")}</Text>
                </View>
              }
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 4, 
                paddingBottom: insets.bottom + 100,
              }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>

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
          fields={contactFilterFields}
          rows={draftFilterRows}
          onRowsChange={setDraftFilterRows}
          defaultField={contactFilterFields[0]?.value}
        />
      </PagedAdvancedFilterModal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, backgroundColor: 'transparent' },
  
  iconBtn: { 
    height: 48, 
    width: 48, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    alignItems: 'center', 
    justifyContent: 'center',
    overflow: 'hidden' 
  },

  metaRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingBottom: 10 
  },
  metaText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  sortBtnBox: {
    height: 48,
    width: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 20 },
  errorText: { fontSize: 16, marginTop: 12 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryText: { fontSize: 15, fontWeight: "700" },
  
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyText: { fontSize: 15, marginTop: 12, fontWeight: '500', letterSpacing: 0.5, textAlign: 'center' },
});
