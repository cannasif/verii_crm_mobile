import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { listContentBottomPadding } from "../../../constants/layout";
import { ScreenHeader } from "../../../components/navigation";
import { PagedFlatList, SalesListCreateButton } from "../../../components/paged";
import { useKeyboardBottomInset } from "../../../hooks/useKeyboardBottomInset";
import { useUIStore } from "../../../store/ui";
import { useOrderList, useCreateRevisionOfOrder } from "../hooks";
import { OrderRow } from "../components";
import { CustomerMailComposerModal } from "../../integration";
import type { OrderGetDto } from "../types";
const GAP = 12;
const PADDING = 16;

export function OrderListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();

  const isDark = themeMode === "dark";

  const mainBg = isDark ? "#09090F" : "#F8FAFC";
  const gradientColors = (
    isDark
      ? ["rgba(236,72,153,0.08)", "transparent", "rgba(249,115,22,0.05)"]
      : ["rgba(255,235,240,0.55)", "#FFFFFF", "rgba(255,244,237,0.55)"]
  ) as [string, string, ...string[]];

  const theme = {
    screenBg: mainBg,
    headerBg: isDark ? "#1a0b2e" : "#FFFFFF",
    textTitle: isDark ? "#FFFFFF" : "#0F172A",
    textMute: isDark ? "#94a3b8" : "#64748B",
    primary: "#db2777",
    primaryBg: isDark ? "rgba(219, 39, 119, 0.15)" : "rgba(219, 39, 119, 0.1)",
    activeSwitch: "#db2777",
    error: "#ef4444",
  };

  const [sortBy, setSortBy] = useState<string>("Id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedOrder, setSelectedOrder] = useState<OrderGetDto | null>(null);
  const [mailProvider, setMailProvider] = useState<"google" | "outlook" | null>(null);
  
  const [searchTerm, setSearchTerm] = useState<string>("");
  // Performans için debounce
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedQuery(searchTerm); }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

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
  } = useOrderList({
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
    sortBy,
    sortDirection,
  });

  const createRevisionMutation = useCreateRevisionOfOrder();

  const handleRowClick = useCallback(
    (id: number) => {
      router.push(`/(tabs)/sales/orders/${id}`);
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
    router.push("/(tabs)/sales/orders/create");
  }, [router]);

  const handleGoogleMail = useCallback((e: any, order: OrderGetDto) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setMailProvider("google");
  }, []);

  const handleOutlookMail = useCallback((e: any, order: OrderGetDto) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setMailProvider("outlook");
  }, []);

  const handleCloseMailModal = useCallback(() => {
    setMailProvider(null);
    setSelectedOrder(null);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const orders = useMemo(() => {
    return (
      data?.pages
        .flatMap((page) => page.items ?? [])
        .filter((item): item is OrderGetDto => item != null) || []
    );
  }, [data]);

  const renderItem = useCallback(
    ({ item }: { item: OrderGetDto }) => {
      return (
        <OrderRow
          order={item}
          onPress={handleRowClick}
          onRevision={handleRevision}
          onGoogleMail={handleGoogleMail}
          onOutlookMail={handleOutlookMail}
          isPending={createRevisionMutation.isPending}
        />
      );
    },
    [handleRowClick, handleRevision, createRevisionMutation.isPending, handleGoogleMail, handleOutlookMail]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) return null;
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📄</Text>
        <Text style={{ color: theme.textMute, fontSize: 16 }}>
          {t("order.noOrders")}
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

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={theme.headerBg} />
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        </View>
        <ScreenHeader title={t("order.list")} showBackButton />
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
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={theme.headerBg} />
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      </View>

      <ScreenHeader title={t("order.list")} showBackButton />

      <View style={styles.listContainer}>
        <PagedFlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={t("order.searchPlaceholder")}
          toolbarActions={
            <SalesListCreateButton
              onPress={handleCreatePress}
              isDark={isDark}
              accentColor={theme.activeSwitch}
              accessibilityLabel={t("common.create")}
            />
          }
          isLoading={Boolean(isLoading && !data)}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          isFetchingNextPage={isFetchingNextPage}
          contentContainerStyle={{
            paddingHorizontal: PADDING,
            paddingTop: 12,
            paddingBottom: listContentBottomPadding(insets.bottom) + keyboardInset,
            gap: GAP,
          }}
          emptyComponent={renderEmpty()}
        />
      </View>

      <CustomerMailComposerModal
        visible={mailProvider !== null}
        onClose={handleCloseMailModal}
        provider={mailProvider ?? "google"}
        moduleKey="order"
        recordId={selectedOrder?.id ?? 0}
        customerId={selectedOrder?.potentialCustomerId}
        contactId={selectedOrder?.contactId}
        customerName={selectedOrder?.potentialCustomerName}
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
  controlsArea: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
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
