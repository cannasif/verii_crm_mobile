import React from "react";
import { Pressable } from "react-native";
import { Add01Icon } from "hugeicons-react-native";
import {
  getSalesListToolbarButtonTheme,
  SALES_LIST_TOOLBAR_ICON_SIZE,
  salesListToolbarButtonBaseStyle,
} from "./salesListToolbarButtonTheme";

export interface SalesListCreateButtonProps {
  onPress: () => void;
  isDark: boolean;
  accentColor?: string;
  accessibilityLabel?: string;
}

export function SalesListCreateButton({
  onPress,
  isDark,
  accentColor = "#db2777",
  accessibilityLabel,
}: SalesListCreateButtonProps): React.ReactElement {
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
          variant: "filled",
        });

        return [salesListToolbarButtonBaseStyle, theme.ring];
      }}
    >
      {({ pressed }) => {
        const theme = getSalesListToolbarButtonTheme({
          isDark,
          accentColor,
          pressed,
          variant: "filled",
        });

        return (
          <Add01Icon
            size={SALES_LIST_TOOLBAR_ICON_SIZE}
            color={theme.iconColor}
            variant="stroke"
            strokeWidth={2.2}
          />
        );
      }}
    </Pressable>
  );
}
