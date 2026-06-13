import type { ViewStyle } from "react-native";

export const SALES_LIST_TOOLBAR_BUTTON_SIZE = 48;
export const SALES_LIST_TOOLBAR_BUTTON_RADIUS = 12;
export const SALES_LIST_TOOLBAR_ICON_SIZE = 22;

interface SalesListToolbarButtonThemeInput {
  isDark: boolean;
  accentColor: string;
  pressed: boolean;
  isActive?: boolean;
  variant: "outline" | "filled";
}

export function getSalesListToolbarButtonTheme({
  isDark,
  accentColor,
  pressed,
  isActive = false,
  variant,
}: SalesListToolbarButtonThemeInput): {
  ring: ViewStyle;
  iconColor: string;
} {
  const surfaceBg = isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF";
  const border = isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0";
  const shadowColor = isDark ? "#000000" : accentColor;

  if (variant === "filled") {
    return {
      ring: {
        backgroundColor: pressed ? `${accentColor}DD` : accentColor,
        borderColor: pressed ? `${accentColor}DD` : accentColor,
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.28 : 0.22,
        shadowRadius: 8,
        elevation: 4,
      },
      iconColor: "#FFFFFF",
    };
  }

  const activeBg = isDark ? "rgba(236,72,153,0.16)" : "rgba(219,39,119,0.08)";
  const pressedBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.04)";

  return {
    ring: {
      backgroundColor: pressed ? pressedBg : isActive ? activeBg : surfaceBg,
      borderColor: isActive ? accentColor : border,
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.18 : 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    iconColor: isActive ? accentColor : isDark ? "#E2E8F0" : accentColor,
  };
}

export const salesListToolbarButtonBaseStyle: ViewStyle = {
  width: SALES_LIST_TOOLBAR_BUTTON_SIZE,
  height: SALES_LIST_TOOLBAR_BUTTON_SIZE,
  borderRadius: SALES_LIST_TOOLBAR_BUTTON_RADIUS,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
};
