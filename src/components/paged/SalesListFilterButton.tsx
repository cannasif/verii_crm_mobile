import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FilterIcon } from "hugeicons-react-native";
import { useUIStore } from "../../store/ui";
import {
  getSalesListToolbarButtonTheme,
  SALES_LIST_TOOLBAR_ICON_SIZE,
  salesListToolbarButtonBaseStyle,
} from "./salesListToolbarButtonTheme";

export interface SalesListFilterButtonProps {
  onPress: () => void;
  accentColor?: string;
  isActive?: boolean;
  accessibilityLabel?: string;
}

export function SalesListFilterButton({
  onPress,
  accentColor = "#db2777",
  isActive = false,
  accessibilityLabel,
}: SalesListFilterButtonProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => {
        const theme = getSalesListToolbarButtonTheme({
          isDark,
          accentColor,
          pressed,
          isActive,
          variant: "outline",
        });

        return [salesListToolbarButtonBaseStyle, theme.ring];
      }}
    >
      {({ pressed }) => {
        const theme = getSalesListToolbarButtonTheme({
          isDark,
          accentColor,
          pressed,
          isActive,
          variant: "outline",
        });

        return (
          <>
            <FilterIcon
              size={SALES_LIST_TOOLBAR_ICON_SIZE}
              color={theme.iconColor}
              variant="stroke"
              strokeWidth={2}
            />
            {isActive ? (
              <View style={[styles.activeDot, { backgroundColor: accentColor }]} />
            ) : null}
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});
