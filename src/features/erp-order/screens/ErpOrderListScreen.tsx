import React, { useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  AlertCircleIcon,
  RefreshIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "hugeicons-react-native";
import { ScreenHeader } from "../../../components/navigation";
import { PagedFlatList } from "../../../components/paged";
import { stockBrowseStyles } from "../../../components/shared/stock-browse";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { ErpOrderListRow, ErpOrderScopeBadge } from "../components";
import { useErpOrderListController } from "../hooks";
import type { NetsisOrderHeader } from "../types";

export function ErpOrderListScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeMode, colors } = useUIStore();
  const isDark = themeMode === "dark";
  const locale = i18n.language || "tr-TR";

  const BRAND_COLOR = "#db2777";
  const BRAND_COLOR_DARK = "#ec4899";
  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const gradientColors = (isDark
    ? ["rgba(236, 72, 153, 0.08)", "transparent", "rgba(249, 115, 22, 0.05)"]
    : ["rgba(219, 39, 119, 0.05)", "transparent", "rgba(255, 240, 225, 0.3)"]) as [
    string,
    string,
    ...string[],
  ];

  const theme = {
    text: isDark ? "#FFFFFF" : "#0F172A",
    textMute: isDark ? "#94a3b8" : "#64748B",
    primary: isDark ? BRAND_COLOR_DARK : BRAND_COLOR,
    surfaceBg: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
    borderColor: isDark ? "rgba(236, 72, 153, 0.3)" : "rgba(219, 39, 119, 0.2)",
    error: "#EF4444",
  };

  const {
    searchText,
    setSearchText,
    sortDirection,
    toggleSortDirection,
    visibleItems,
    totalCount,
    loadMore,
    hasMore,
    isPending,
    isError,
    error,
    refresh,
    isRefetching,
  } = useErpOrderListController();

  const browseListShell = useMemo(
    () => ({
      borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : colors.border,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : colors.card,
      separatorColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
    }),
    [colors.border, colors.card, isDark]
  );

  const isInitialLoading = isPending && visibleItems.length === 0;

  const handleOrderPress = useCallback(
    (item: NetsisOrderHeader) => {
      router.push(`/(tabs)/sales/orders/erp/${encodeURIComponent(item.fatirsNo)}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: NetsisOrderHeader }) => (
      <View style={stockBrowseStyles.listItemWrap}>
        <ErpOrderListRow item={item} locale={locale} onPress={() => handleOrderPress(item)} />
      </View>
    ),
    [handleOrderPress, locale]
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScreenHeader title={t("erpOrder.title")} showBackButton />

        <ErpOrderScopeBadge isDark={isDark} />

        <View style={styles.content}>
          {isError ? (
            <View style={styles.centerContainer}>
              <AlertCircleIcon size={48} color={theme.textMute} variant="stroke" />
              <Text style={[styles.errorText, { color: theme.error }]}>
                {error?.message || t("erpOrder.headerLoadFail")}
              </Text>
              <TouchableOpacity
                onPress={() => void refresh()}
                style={[
                  styles.retryButton,
                  { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" },
                ]}
              >
                <RefreshIcon size={16} color={theme.text} variant="stroke" />
                <Text style={[styles.retryText, { color: theme.text }]}>{t("common.retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <PagedFlatList
              data={visibleItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.fatirsNo}
              browseListShell={browseListShell}
              searchValue={searchText}
              onSearchChange={setSearchText}
              searchPlaceholder={t("erpOrder.searchPlaceholder")}
              toolbarActions={
                <TouchableOpacity
                  style={[styles.sortBtn, { borderColor: theme.borderColor, backgroundColor: theme.surfaceBg }]}
                  onPress={toggleSortDirection}
                  activeOpacity={0.72}
                >
                  {sortDirection === "desc" ? (
                    <ArrowDown01Icon size={18} color={theme.primary} strokeWidth={2.2} />
                  ) : (
                    <ArrowUp01Icon size={18} color={theme.primary} strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              }
              metaContent={
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: theme.textMute }]}>
                    {t("erpOrder.foundCount", { count: totalCount })}
                  </Text>
                </View>
              }
              isLoading={isInitialLoading}
              refreshing={isRefetching}
              onRefresh={() => void refresh()}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              isFetchingNextPage={hasMore && !isInitialLoading}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === "android"}
              contentContainerStyle={{
                paddingTop: 0,
                paddingBottom: insets.bottom + 100,
              }}
              ListEmptyComponent={
                !isInitialLoading ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textMute }]}>
                      {t("erpOrder.headerEmpty")}
                    </Text>
                  </View>
                ) : null
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, backgroundColor: "transparent" },
  sortBtn: {
    height: 48,
    width: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  metaText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 20 },
  errorText: { fontSize: 16, marginTop: 12, textAlign: "center" },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { fontSize: 15, fontWeight: "700" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyText: { fontSize: 15, fontWeight: "500", letterSpacing: 0.5, textAlign: "center" },
});
