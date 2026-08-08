import React from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useStock } from "../hooks/useStock";
import { useStockRelations } from "../hooks/useStockRelations";
import { StockDetailContent } from "../components";
import type { PagedResponse } from "../types/common";
import type { StockRelationDto } from "../types/stock";

export function StockDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const contentBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.5)" : colors.background;

  const stockId = id ? Number(id) : undefined;
  const { data: stock, isLoading, isError, refetch } = useStock(stockId);
  const { data: relationsData } = useStockRelations({ stockId });

  const relations = React.useMemo((): StockRelationDto[] => {
    return (
      (relationsData?.pages ?? [])
        .flatMap((page: PagedResponse<StockRelationDto>) => page.items ?? [])
        .filter((item: StockRelationDto | null | undefined): item is StockRelationDto => item != null)
    );
  }, [relationsData]);

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: colors.header }]}>
        <ScreenHeader title={t("stock.detail")} showBackButton />
        <View style={[styles.content, { backgroundColor: contentBackground }]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : isError ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{t("common.error")}</Text>
              <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
                <Text style={[styles.retryText, { color: colors.accent }]}>{t("common.retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : stock ? (
            <StockDetailContent
              stock={stock}
              relations={relations}
              colors={colors}
              insets={insets}
              t={t}
            />
          ) : null}
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
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
