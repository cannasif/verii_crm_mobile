import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient"; // Arka plan efekti için eklendi
import { Add01Icon } from "hugeicons-react-native";

import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { useQuotationList, useCreateRevisionOfQuotation } from "../hooks";
import { QuotationRow } from "../components/QuotationRow";
import { SearchInput } from "../../customer/components";
import { CustomerMailComposerModal } from "../../integration";
import type { QuotationGetDto, PagedFilter } from "../types";

const { width } = Dimensions.get("window");
const GAP = 16;
const PADDING = 16;

export function QuotationListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === "dark";

  // --- MODERN TEMA TANIMLAMASI ---
  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)";
  const borderColor = isDark
    ? "rgba(236, 72, 153, 0.18)"
    : "rgba(236, 72, 153, 0.25)";
  const textColor = isDark ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";

  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.1)", "transparent", "rgba(249, 115, 22, 0.08)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
  ) as [string, string, ...string[]];

  const [sortBy, setSortBy] = useState<string>("Id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationGetDto | null>(null);
  const [mailProvider, setMailProvider] = useState<"google" | "outlook" | null>(null);

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const filters: PagedFilter[] | undefined = useMemo(() => {
    if (debouncedQuery.trim().length >= 2) {
      return [
        {
          column: "OfferNo",
          operator: "contains",
          value: debouncedQuery.trim(),
        },
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
  } = useQuotationList({
    filters,
    sortBy,
    sortDirection,
  });

  const createRevisionMutation = useCreateRevisionOfQuotation();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRowClick = useCallback(
    (id: number) => {
      router.push(`/(tabs)/sales/quotations/${id}`);
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
    router.push("/(tabs)/sales/quotations/create");
  }, [router]);

  const handleQuickListPress = useCallback(() => {
    router.push("/(tabs)/sales/quotations/quick/list");
  }, [router]);

  const handleQuickCreatePress = useCallback(() => {
    router.push("/(tabs)/sales/quotations/quick/create");
  }, [router]);

  const handleGoogleMail = useCallback((e: any, quotation: QuotationGetDto) => {
    e.stopPropagation();
    setSelectedQuotation(quotation);
    setMailProvider("google");
  }, []);

  const handleOutlookMail = useCallback((e: any, quotation: QuotationGetDto) => {
    e.stopPropagation();
    setSelectedQuotation(quotation);
    setMailProvider("outlook");
  }, []);

  const handleCloseMailModal = useCallback(() => {
    setMailProvider(null);
    setSelectedQuotation(null);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const quotations = useMemo(() => {
    return (
      data?.pages
        .flatMap((page) => page.items ?? [])
        .filter((item): item is QuotationGetDto => item != null) || []
    );
  }, [data]);

  // --- RENDER ITEMS ---
  const renderItem = useCallback(
    ({ item }: { item: QuotationGetDto }) => {
      return (
        <View
          style={[
            styles.cardWrapper,
            {
              backgroundColor: cardBg,
              borderColor: borderColor,
            },
          ]}
        >
          <QuotationRow
            quotation={item}
            onPress={handleRowClick}
            onRevision={handleRevision}
            onGoogleMail={handleGoogleMail}
            onOutlookMail={handleOutlookMail}
            isPending={createRevisionMutation.isPending}
          />
        </View>
      );
    },
    [handleRowClick, handleRevision, createRevisionMutation.isPending, handleGoogleMail, handleOutlookMail, cardBg, borderColor]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) return null;
    return (
      <View style={styles.center}>
        <Text style={{ color: mutedColor, fontSize: 15, fontWeight: "500" }}>
          {debouncedQuery.length > 0
            ? t("quotation.noQuotations")
            : t("quotation.noQuotations")}
        </Text>
      </View>
    );
  }, [isLoading, isFetching, mutedColor, t, debouncedQuery]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={brandColor} />
      </View>
    );
  }, [isFetchingNextPage, brandColor]);

  // --- ERROR STATE ---
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        </View>
        <ScreenHeader title={t("quotation.list")} showBackButton />
        <View style={styles.center}>
          <Text style={{ color: "#ef4444", marginBottom: 12, fontWeight: "500" }}>
            {t("common.error")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: brandColor }]}
            onPress={() => refetch()}
          >
            <Text style={{ color: "#FFF", fontWeight: "600" }}>
              {t("common.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- MAIN RENDER ---
  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Modern Gradient Arka Plan */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      </View>

      <ScreenHeader title={t("quotation.list")} showBackButton />

      <View style={styles.listContainer}>
        {/* Arama ve Ekleme Alanı */}
        <View style={styles.controlsArea}>
          <View style={styles.searchContainer}>
            <SearchInput
              value={searchText}
              onSearch={setSearchText}
              placeholder={t("quotation.searchPlaceholder")}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.createButton,
              isDark ? styles.createButtonDark : styles.createButtonLight,
              {
                backgroundColor: isDark ? "rgba(236, 72, 153, 0.15)" : brandColor,
              },
            ]}
            onPress={handleCreatePress}
            activeOpacity={0.8}
          >
            <Add01Icon
              size={22}
              color={isDark ? brandColor : "#FFFFFF"}
              variant="stroke"
            />
          </TouchableOpacity>
        </View>

        {/* Hızlı İşlem Butonları (Modernize Edildi) */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: isDark
                  ? "rgba(124, 58, 237, 0.1)"
                  : "rgba(124, 58, 237, 0.08)",
                borderColor: "rgba(124, 58, 237, 0.2)",
              },
            ]}
            onPress={handleQuickListPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, { color: "#8b5cf6" }]}>
              Hızlı Teklifler
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: isDark
                  ? "rgba(14, 165, 233, 0.1)"
                  : "rgba(14, 165, 233, 0.08)",
                borderColor: "rgba(14, 165, 233, 0.2)",
              },
            ]}
            onPress={handleQuickCreatePress}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, { color: "#0ea5e9" }]}>
              Hızlı Oluştur
            </Text>
          </TouchableOpacity>
        </View>

        {/* LİSTE */}
        {isLoading && !data ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={brandColor} />
          </View>
        ) : (
          <FlatList
            data={quotations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={[
              styles.flatListContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 80 },
            ]}
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <CustomerMailComposerModal
        visible={mailProvider !== null}
        onClose={handleCloseMailModal}
        provider={mailProvider ?? "google"}
        moduleKey="quotation"
        recordId={selectedQuotation?.id ?? 0}
        customerId={selectedQuotation?.potentialCustomerId}
        contactId={selectedQuotation?.contactId}
        customerName={selectedQuotation?.potentialCustomerName}
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
  controlsArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: PADDING,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
  },
  createButton: {
    height: 48,
    width: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonDark: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  createButtonLight: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: PADDING,
    paddingBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontWeight: "700",
    fontSize: 13,
  },
  flatListContent: {
    paddingHorizontal: PADDING,
    paddingTop: 4,
    gap: GAP,
  },
  cardWrapper: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden", 
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});
