import React, { memo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import type { StockBrowseThemeColors } from "./types";
import { stockBrowseStyles as styles } from "./stockBrowseStyles";

export const StockBrowseUnitBadge = memo(function StockBrowseUnitBadge({
  unit,
  colors,
  isDark,
  compact = false,
}: {
  unit: string;
  colors: StockBrowseThemeColors;
  isDark: boolean;
  compact?: boolean;
}): React.ReactElement {
  return (
    <View
      style={[
        compact ? styles.stockUnitBadgeCompact : styles.stockUnitBadge,
        {
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : colors.backgroundSecondary,
          borderColor: isDark ? "rgba(255, 255, 255, 0.14)" : colors.border,
        },
      ]}
    >
      <Text
        unstyled
        disableThemeColor
        style={[
          compact ? styles.stockUnitBadgeCompactText : styles.stockUnitBadgeText,
          { color: colors.textSecondary },
        ]}
      >
        {unit}
      </Text>
    </View>
  );
});
