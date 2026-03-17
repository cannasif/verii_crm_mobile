import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { CustomRefreshControl } from "../../../components/CustomRefreshControl";
import { useUIStore } from "../../../store/ui";
import { useStocks } from "../hooks";
import { SearchInput, StockCard } from "../components";
import type { StockGetDto, PagedResponse } from "../types";

export function StockListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 700);

    return () => clearTimeout(handler);
  }, [searchText]);

  const contentBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.5)" : colors.background;

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
    search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
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
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }, [isFetchingNextPage, colors]);

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
          <View style={[styles.searchContainer, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
            <SearchInput
              value={searchText}
              onSearch={setSearchText}
              placeholder={t("stock.searchPlaceholder")}
            />
          </View>

          {isLoading && !data ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : isError ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{t("common.error")}</Text>
            </View>
          ) : (
            <FlatList
              data={stocks}
              renderItem={renderItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={[
                styles.listContent,
                stocks.length === 0 && styles.listContentEmpty,
                { paddingBottom: insets.bottom + 20 },
              ]}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmpty}
              refreshControl={
                <CustomRefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
