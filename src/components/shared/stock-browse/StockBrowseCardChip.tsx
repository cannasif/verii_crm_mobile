import React, { memo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import type { StockBrowseThemeColors } from "./types";
import { stockBrowseStyles as styles } from "./stockBrowseStyles";

export const StockBrowseCardChip = memo(function StockBrowseCardChip({
  label,
  variant,
  colors,
  isDark,
}: {
  label: string;
  variant: "group" | "code";
  colors: StockBrowseThemeColors;
  isDark: boolean;
}) {
  const isGroup = variant === "group";
  return (
    <View
      style={[
        styles.cardChip,
        isGroup
          ? {
              backgroundColor: colors.accent + (isDark ? "24" : "14"),
              borderColor: colors.accent + (isDark ? "44" : "30"),
            }
          : {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15, 23, 42, 0.06)",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : colors.border,
            },
      ]}
    >
      <Text
        unstyled
        disableThemeColor
        style={[
          styles.cardChipText,
          { color: isGroup ? colors.accent : isDark ? colors.textSecondary : colors.textMuted },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
});
