import React, { useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, RefreshIcon } from "hugeicons-react-native";
import { ScreenHeader } from "../../../components/navigation";
import { stockBrowseStyles } from "../../../components/shared/stock-browse";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { ErpOrderLineRow, ErpOrderScopeBadge } from "../components";
import { useErpOrderLines, useErpOrders } from "../hooks";
import { buildErpOrderLineKey } from "../utils/erpOrderListProcessing";
import { formatErpOrderAmount, formatErpOrderText } from "../utils/erpOrderFormatters";
import type { NetsisOrderLine } from "../types";

export function ErpOrderDetailScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { themeMode, colors } = useUIStore();
  const { fatirsNo: fatirsNoParam } = useLocalSearchParams<{ fatirsNo: string }>();

  const fatirsNo = decodeURIComponent(String(fatirsNoParam ?? "")).trim();
  const locale = i18n.language || "tr-TR";
  const isDark = themeMode === "dark";

  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const gradientColors = (isDark
    ? ["rgba(236, 72, 153, 0.08)", "transparent", "rgba(249, 115, 22, 0.05)"]
    : ["rgba(219, 39, 119, 0.05)", "transparent", "rgba(255, 240, 225, 0.3)"]) as [
    string,
    string,
    ...string[],
  ];
  const shellBorderColor = isDark ? "rgba(255, 255, 255, 0.2)" : colors.border;
  const shellBackgroundColor = isDark ? "rgba(255, 255, 255, 0.06)" : colors.card;

  const { data: headers } = useErpOrders();
  const {
    data: lines = [],
    isPending: isLinesPending,
    isError: isLinesError,
    error: linesError,
    refetch: refetchLines,
    isRefetching: isLinesRefetching,
  } = useErpOrderLines(fatirsNo);

  const header = useMemo(
    () => headers?.find((item) => item.fatirsNo === fatirsNo) ?? null,
    [headers, fatirsNo]
  );

  const customerLabel = useMemo(() => {
    const code = header?.cariKodu?.trim() || "-";
    const name = header?.cariIsim?.trim() || t("erpOrder.noCustomerName");
    return `${code} - ${name}`;
  }, [header, t]);

  const summaryItems = useMemo(
    () => [
      { label: t("erpOrder.summary.branch"), value: formatErpOrderText(String(header?.subeKodu ?? "-")) },
      { label: t("erpOrder.summary.date"), value: formatErpOrderText(header?.tarih) },
      { label: t("erpOrder.summary.deliveryDate"), value: formatErpOrderText(header?.teslimTarihi) },
      { label: t("erpOrder.summary.salesRep"), value: formatErpOrderText(header?.plasiyerKodu) },
      {
        label: t("erpOrder.summary.grandTotal"),
        value: formatErpOrderAmount(header?.genelToplam, locale),
      },
    ],
    [header, locale, t]
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["erp-orders", "headers"] }),
      refetchLines(),
    ]);
  }, [queryClient, refetchLines]);

  const renderLine = useCallback(
    ({ item, index }: { item: NetsisOrderLine; index: number }) => (
      <ErpOrderLineRow item={item} locale={locale} isLast={index === lines.length - 1} />
    ),
    [lines.length, locale]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <Text unstyled disableThemeColor style={[styles.customerLabel, { color: colors.textSecondary }]}>
          {customerLabel}
        </Text>

        <View style={styles.summaryGrid}>
          {summaryItems.map((item) => (
            <View
              key={item.label}
              style={[
                styles.summaryChip,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.card,
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border,
                },
              ]}
            >
              <Text unstyled disableThemeColor style={[styles.summaryLabel, { color: colors.textMuted }]}>
                {item.label}
              </Text>
              <Text unstyled disableThemeColor style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        <Text unstyled disableThemeColor style={[styles.linesTitle, { color: colors.text }]}>
          {t("erpOrder.linesTitle")}
        </Text>
      </View>
    ),
    [colors, customerLabel, isDark, summaryItems, t]
  );

  const listEmpty = useMemo(() => {
    if (isLinesPending) {
      return (
        <View style={styles.linesState}>
          <ActivityIndicator color={colors.accent} />
          <Text unstyled disableThemeColor style={[styles.linesStateText, { color: colors.textMuted }]}>
            {t("erpOrder.linesLoading")}
          </Text>
        </View>
      );
    }

    if (isLinesError) {
      return (
        <View style={styles.linesState}>
          <AlertCircleIcon size={28} color={colors.textMuted} variant="stroke" />
          <Text unstyled disableThemeColor style={[styles.linesStateText, { color: colors.textMuted }]}>
            {linesError?.message || t("erpOrder.linesLoadFail")}
          </Text>
          <TouchableOpacity onPress={() => void refetchLines()}>
            <Text unstyled disableThemeColor style={{ color: colors.accent, fontWeight: "700" }}>
              {t("common.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.linesState}>
        <Text unstyled disableThemeColor style={[styles.linesStateText, { color: colors.textMuted }]}>
          {t("erpOrder.linesEmpty")}
        </Text>
      </View>
    );
  }, [colors.accent, colors.textMuted, isLinesError, isLinesPending, linesError, refetchLines, t]);

  if (!fatirsNo) {
    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <ScreenHeader title={t("erpOrder.detailTitle")} showBackButton />
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.textMuted }}>{t("erpOrder.headerEmpty")}</Text>
        </View>
      </View>
    );
  }

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

      <ScreenHeader title={fatirsNo} showBackButton />

      <ErpOrderScopeBadge isDark={isDark} />

      <FlatList
        style={styles.list}
        data={isLinesPending || isLinesError ? [] : lines}
        renderItem={renderLine}
        keyExtractor={(item) => buildErpOrderLineKey(item)}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          stockBrowseStyles.listContentInset,
          styles.listContent,
          {
            marginHorizontal: 16,
            marginBottom: insets.bottom + 24,
            borderColor: shellBorderColor,
            backgroundColor: shellBackgroundColor,
            borderWidth: 1,
            borderRadius: 16,
            overflow: "hidden",
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLinesRefetching}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.accent}
          />
        }
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingBottom: 16 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  headerBlock: { paddingBottom: 8 },
  customerLabel: { fontSize: 12, fontWeight: "600", marginBottom: 12 },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  summaryChip: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 0,
  },
  summaryLabel: { fontSize: 10, fontWeight: "600", marginBottom: 4 },
  summaryValue: { fontSize: 12, fontWeight: "700" },
  linesTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 8,
  },
  linesState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  linesStateText: { fontSize: 13, fontWeight: "500", textAlign: "center" },
});
