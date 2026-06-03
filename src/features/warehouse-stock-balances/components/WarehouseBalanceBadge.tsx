import React, { memo, useCallback, useState } from "react";
import { Pressable, View } from "react-native";
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
}

export const WarehouseBalanceBadge = memo(function WarehouseBalanceBadge({
  stockId,
  unit,
  isDark,
  compact = false,
  fetchEnabled = true,
}: WarehouseBalanceBadgeProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const viewModel = useWarehouseBalanceViewModel(stockId, unit, fetchEnabled);

  const openSheet = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  if (typeof stockId !== "number" || stockId <= 0) {
    return null;
  }

  if (viewModel.isLoading) {
    return (
      <View
        style={[
          styles.skeleton,
          compact && styles.pillCompact,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.18)",
          },
        ]}
      />
    );
  }

  if (viewModel.isError || !viewModel.showBadge) {
    return null;
  }

  const toneColors = getWarehouseBalanceToneColors(viewModel.tone, isDark);

  return (
    <>
      <Pressable
        onLongPress={openSheet}
        delayLongPress={350}
        onPress={(event) => event.stopPropagation()}
        accessibilityRole="button"
        accessibilityLabel={viewModel.formattedTotal}
        accessibilityHint={t("common.warehouseBalanceTooltip.holdHint")}
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
