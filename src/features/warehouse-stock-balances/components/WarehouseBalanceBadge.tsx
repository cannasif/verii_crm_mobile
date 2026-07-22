import React, { memo, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { useWarehouseBalanceViewModel } from "../hooks";
import { WarehouseBalanceBreakdownSheet } from "./WarehouseBalanceBreakdownSheet";
import {
  getWarehouseBalanceToneColors,
  warehouseBalanceBadgeStyles as styles,
} from "./warehouseBalanceStyles";

interface WarehouseBalanceBadgeProps {
  stockId: number | undefined;
  unit?: string | null;
  isDark: boolean;
  compact?: boolean;
  fetchEnabled?: boolean;
  loadOnPress?: boolean;
}

export const WarehouseBalanceBadge = memo(function WarehouseBalanceBadge({
  stockId,
  unit,
  isDark,
  compact = false,
  fetchEnabled = true,
  loadOnPress = false,
}: WarehouseBalanceBadgeProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [requestedStockId, setRequestedStockId] = useState<number | null>(null);
  const shouldFetch = fetchEnabled && (!loadOnPress || requestedStockId === stockId);
  const viewModel = useWarehouseBalanceViewModel(stockId, unit, shouldFetch);

  const openSheet = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  if (typeof stockId !== "number" || stockId <= 0) {
    return null;
  }

  if (loadOnPress && !shouldFetch) {
    return (
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          setRequestedStockId(stockId);
        }}
        accessibilityRole="button"
        accessibilityLabel={t("common.warehouseBalanceTooltip.loadLabel")}
        style={({ pressed }) => [
          styles.requestButton,
          compact && styles.pillCompact,
          {
            borderColor: isDark ? "rgba(236,72,153,0.4)" : "rgba(219,39,119,0.3)",
            backgroundColor: isDark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.07)",
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <MaterialCommunityIcons name="warehouse" size={12} color={isDark ? "#F9A8D4" : "#BE185D"} />
        <Text unstyled disableThemeColor style={[styles.requestButtonText, { color: isDark ? "#F9A8D4" : "#BE185D" }]}>
          {t("common.warehouseBalanceTooltip.loadLabel")}
        </Text>
      </Pressable>
    );
  }

  if (viewModel.isLoading || viewModel.isFetching) {
    return (
      <View
        style={[
          styles.requestButton,
          compact && styles.pillCompact,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.18)",
            borderColor: "transparent",
          },
        ]}
        accessibilityLabel={t("common.warehouseBalanceTooltip.loadingLabel")}
      >
        <ActivityIndicator size={11} color={isDark ? "#CBD5E1" : "#64748B"} />
      </View>
    );
  }

  if (viewModel.isError && loadOnPress) {
    return (
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          void viewModel.refetch();
        }}
        accessibilityRole="button"
        accessibilityLabel={t("common.warehouseBalanceTooltip.retryLabel")}
        style={({ pressed }) => [
          styles.requestButton,
          compact && styles.pillCompact,
          {
            borderColor: isDark ? "rgba(248,113,113,0.45)" : "rgba(220,38,38,0.28)",
            backgroundColor: isDark ? "rgba(127,29,29,0.28)" : "#FEF2F2",
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <MaterialCommunityIcons name="refresh" size={12} color={isDark ? "#FCA5A5" : "#B91C1C"} />
        <Text unstyled disableThemeColor style={[styles.requestButtonText, { color: isDark ? "#FCA5A5" : "#B91C1C" }]}>
          {t("common.warehouseBalanceTooltip.retryLabel")}
        </Text>
      </Pressable>
    );
  }

  if (viewModel.isError || (!loadOnPress && !viewModel.showBadge)) {
    return null;
  }

  const toneColors = getWarehouseBalanceToneColors(viewModel.tone, isDark);

  return (
    <>
      <Pressable
        onLongPress={loadOnPress ? undefined : openSheet}
        delayLongPress={350}
        onPress={(event) => {
          event.stopPropagation();
          if (loadOnPress) openSheet();
        }}
        accessibilityRole="button"
        accessibilityLabel={viewModel.formattedTotal}
        accessibilityHint={t(loadOnPress ? "common.warehouseBalanceTooltip.openHint" : "common.warehouseBalanceTooltip.holdHint")}
        style={[
          styles.pill,
          compact && styles.pillCompact,
          {
            borderColor: toneColors.border,
            backgroundColor: toneColors.background,
          },
        ]}
      >
        <Text
          unstyled
          disableThemeColor
          style={[styles.pillText, { color: toneColors.text }]}
          numberOfLines={1}
        >
          {viewModel.formattedTotal}
        </Text>
      </Pressable>

      <WarehouseBalanceBreakdownSheet
        visible={sheetOpen}
        onClose={closeSheet}
        rows={viewModel.rows}
        totalBalance={viewModel.totalBalance}
        unit={unit}
        tone={viewModel.tone}
        isDark={isDark}
      />
    </>
  );
});
