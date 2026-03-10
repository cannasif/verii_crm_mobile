import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Text // UI Text yerine RN Text kullanarak stil kontrolünü ele alıyoruz
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { useDemandList, useCreateRevisionOfDemand } from "../hooks";
import { DemandRow } from "../components/DemandRow";
import { SearchInput } from "../../customer/components";
import type { DemandGetDto, PagedFilter } from "../types";
import { CustomerMailComposerModal } from "../../integration";
// Tasarım bütünlüğü için ikon
import { Add01Icon } from "hugeicons-react-native";

const GAP = 12;
const PADDING = 16;

export function DemandListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  
  const isDark = themeMode === "dark";

  // --- TEMA AYARLARI ---
  const theme = {
    screenBg: isDark ? "#1a0b2e" : "#F8FAFC",
    headerBg: isDark ? "#1a0b2e" : "#FFFFFF",
    cardBg: isDark ? "#1e1b29" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
    textTitle: isDark ? "#FFFFFF" : "#0F172A",
    textMute: isDark ? "#94a3b8" : "#64748B",
    primary: "#db2777",
    primaryBg: isDark ? "rgba(219, 39, 119, 0.15)" : "rgba(219, 39, 119, 0.1)",
    activeSwitch: "#db2777",
    error: "#ef4444",
  };

  const [sortBy, setSortBy] = useState<string>("Id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedDemand, setSelectedDemand] = useState<DemandGetDto | null>(null);
  const [mailProvider, setMailProvider] = useState<"google" | "outlook" | null>(null);
  
  const [searchTerm, setSearchTerm] = useState<string>("");
  // Performans için debounce (Diğer ekranlardaki gibi)
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedQuery(searchTerm); }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filters: PagedFilter[] | undefined = useMemo(() => {
    if (debouncedQuery.trim().length >= 2) {
      return [
        { column: "OfferNo", operator: "contains", value: debouncedQuery.trim() },
        {
          column: "PotentialCustomerName",
          operator: "contains",
          value: debouncedQuery.trim(),
        },
      ];
    }
    return undefined;
  }, [debouncedQuery]);

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
  } = useDemandList({
    filters,
    sortBy,
    sortDirection,
  });

  const createRevisionMutation = useCreateRevisionOfDemand();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRowClick = useCallback(
    (id: number) => {
      router.push(`/(tabs)/sales/demands/${id}`);
    },
    [router]
  );

  const handleRevision = useCallback(
    (e: any, id: number) => {
      e.stopPropagation();
      createRevisionMutation.mutate(id);
    },
    [createRevisionMutation]
  );

  const handleCreatePress = useCallback(() => {
    router.push("/(tabs)/sales/demands/create");
  }, [router]);

  const handleGoogleMail = useCallback((e: any, demand: DemandGetDto) => {
    e.stopPropagation();
    setSelectedDemand(demand);
    setMailProvider("google");
  }, []);

  const handleOutlookMail = useCallback((e: any, demand: DemandGetDto) => {
    e.stopPropagation();
    setSelectedDemand(demand);
    setMailProvider("outlook");
  }, []);

  const handleCloseMailModal = useCallback(() => {
    setMailProvider(null);
    setSelectedDemand(null);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Veri Düzleştirme
  const demands = useMemo(() => {
    return (
      data?.pages
        .flatMap((page) => page.items ?? [])
        .filter((item): item is DemandGetDto => item != null) || []
    );
  }, [data]);

  // --- RENDER ITEMS ---

  const renderItem = useCallback(
    ({ item }: { item: DemandGetDto }) => {
      return (
        // Wrapper: Tema uyumu için çerçeve
        <View style={[
            styles.cardWrapper, 
            { 
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder
            }
        ]}>
            <DemandRow
              demand={item}
              onPress={handleRowClick}
              onRevision={handleRevision}
              onGoogleMail={handleGoogleMail}
              onOutlookMail={handleOutlookMail}
              isPending={createRevisionMutation.isPending}
            />
        </View>
      );
    },
    [handleRowClick, handleRevision, createRevisionMutation.isPending, handleGoogleMail, handleOutlookMail, theme]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) return null;
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📄</Text>
        <Text style={{ color: theme.textMute, fontSize: 16 }}>
          {t("demand.noDemands")}
        </Text>
      </View>
    );
  }, [isLoading, isFetching, theme, t]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }, [isFetchingNextPage, theme]);

  // --- ERROR STATE ---
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.screenBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={theme.headerBg} />
        <ScreenHeader title={t("demand.list")} showBackButton />
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

  // --- MAIN RENDER ---
  return (
    <View style={[styles.container, { backgroundColor: theme.screenBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={theme.headerBg} />
      
      <ScreenHeader title={t("demand.list")} showBackButton />

      <View style={styles.listContainer}>
        
        {/* CONTROLS AREA (Header Altı) */}
        <View style={[styles.controlsArea, { backgroundColor: theme.headerBg }]}>
             {/* Arama Inputu */}
             <View style={{ flex: 1, marginRight: 10 }}>
                <SearchInput
                    value={searchTerm}
                    onSearch={setSearchTerm}
                    placeholder={t("demand.searchPlaceholder")}
                />
             </View>

             {/* Yeni Ekle Butonu */}
             <View style={[styles.actionBtnContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                <TouchableWithoutFeedback onPress={handleCreatePress}>
                    <View style={[styles.iconBtn, { backgroundColor: theme.activeSwitch }]}>
                         <Add01Icon size={20} color="#FFF" variant="stroke" />
                    </View>
                </TouchableWithoutFeedback>
             </View>
        </View>

        {/* LOADING & LIST */}
        {isLoading && !data ? (
           <View style={styles.center}>
             <ActivityIndicator size="large" color={theme.primary} />
           </View>
        ) : (
          <FlatList
            data={demands}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{
                paddingHorizontal: PADDING,
                paddingTop: 12,
                paddingBottom: insets.bottom + 20,
                gap: GAP, 
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <View> 
                 {/* CustomRefreshControl logic'i buraya entegre edilebilir veya standart kullanılabilir */}
                 {/* Basitlik için standart RefreshControl behavior'u üst komponentten geliyor gibi davranıyoruz */}
              </View>
            }
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>

      <CustomerMailComposerModal
        visible={mailProvider !== null}
        onClose={handleCloseMailModal}
        provider={mailProvider ?? "google"}
        moduleKey="demand"
        recordId={selectedDemand?.id ?? 0}
        customerId={selectedDemand?.potentialCustomerId}
        contactId={selectedDemand?.contactId}
        customerName={selectedDemand?.potentialCustomerName}
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
    marginTop: 50 
  },
  // Controls Area
  controlsArea: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  actionBtnContainer: {
    flexDirection: 'row', 
    padding: 4, 
    borderRadius: 12, 
    alignItems: 'center', 
    height: 48,
    width: 48, 
    justifyContent: 'center'
  },
  iconBtn: { 
    padding: 8, 
    borderRadius: 8, 
    height: 40, 
    width: 40, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  // Kart Stili
  cardWrapper: {
    borderRadius: 16,
    borderWidth: 1,
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
