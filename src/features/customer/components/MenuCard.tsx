import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text as RNText,
} from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { ArrowRight01Icon } from "hugeicons-react-native";

const PRESS_BORDER = "rgba(219, 39, 119, 0.4)";
const ACTIVE_PINK = "#ec4899";

const GRID_WIDTH_PCT = "31%";

interface MenuCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  rightIcon?: React.ReactNode;
  viewType?: "list" | "grid";
}

export function MenuCard({
  title,
  description,
  icon,
  onPress,
  rightIcon,
  viewType = "list",
}: MenuCardProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const [isPressed, setIsPressed] = useState(false);

  const listCardBg = isDark ? colors?.card || "#1E293B" : "#FFFFFF";
  const gridCardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.88)";
  const cardBg = viewType === "grid" ? gridCardBg : listCardBg;

  const normalBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.16)";
  const currentBorder = isPressed ? PRESS_BORDER : normalBorder;
  const gridBorderWidth = isPressed ? 1.6 : isDark ? 1 : 1.15;

  const iconBoxBgList = isDark ? "rgba(255,255,255,0.08)" : "rgba(232, 72, 85, 0.1)";
  const iconBoxBgPressed = isDark ? "rgba(236, 72, 153, 0.2)" : "rgba(236, 72, 153, 0.15)";
  const listIconBg = isPressed ? iconBoxBgPressed : iconBoxBgList;

  const gridTitleColor = isDark ? "#F8FAFC" : "#334155";
  const titleColor = isDark ? "#F8FAFC" : "#1E293B";
  const listTitleColor = isPressed ? ACTIVE_PINK : titleColor;
  const descColor = isDark ? "#94A3B8" : "#64748B";
  const arrowColor = isPressed ? ACTIVE_PINK : isDark ? "#94A3B8" : "#94A3B8";

  const shadowColor = isPressed
    ? "rgba(219, 39, 119, 0.28)"
    : isDark
      ? "#1E293B"
      : "#64748B";
  const shadowOpacity = isPressed
    ? isDark
      ? 0.36
      : 0.11
    : isDark
      ? 0.28
      : 0.08;

  if (viewType === "grid") {
    return (
      <TouchableOpacity
        style={[
          styles.gridContainer,
          {
            backgroundColor: cardBg,
            borderColor: currentBorder,
            borderWidth: gridBorderWidth,
            transform: [{ scale: isPressed ? 0.96 : 1 }],
          },
        ]}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={styles.gridIconWrap}>
          {React.isValidElement(icon) ? (
            React.cloneElement(icon as React.ReactElement<any>, {
              color: isPressed ? ACTIVE_PINK : isDark ? "#F8FAFC" : "#1E293B",
              variant: "stroke",
              size: 24,
              strokeWidth: 2,
            })
          ) : (
            <Text
              style={[styles.gridEmoji, { color: isPressed ? ACTIVE_PINK : undefined }]}
            >
              {icon}
            </Text>
          )}
        </View>
        <RNText
          style={[styles.gridTitle, { color: gridTitleColor }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {title}
        </RNText>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderColor: currentBorder,
          borderWidth: isPressed ? 1.5 : 1,
          shadowColor,
          shadowOpacity,
        },
      ]}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={0.9}
    >
      <View style={[styles.iconContainer, { backgroundColor: listIconBg }]}>
        {React.isValidElement(icon) ? (
          React.cloneElement(icon as React.ReactElement<any>, {
            color: isPressed ? ACTIVE_PINK : isDark ? "#F8FAFC" : "#1E293B",
          })
        ) : (
          <Text style={[styles.iconEmoji, { color: isPressed ? ACTIVE_PINK : undefined }]}>
            {icon}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: listTitleColor }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.description, { color: descColor }]} numberOfLines={2}>
          {description}
        </Text>
      </View>

      <View style={styles.rightContainer}>
        {rightIcon ? (
          rightIcon
        ) : (
          <ArrowRight01Icon
            size={20}
            color={arrowColor}
            variant="stroke"
            strokeWidth={2}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  gridContainer: {
    width: GRID_WIDTH_PCT,
    aspectRatio: 0.82,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderRadius: 22,
    paddingHorizontal: 4,
  },
  gridIconWrap: {
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gridEmoji: {
    fontSize: 22,
  },
  gridTitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.43,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconEmoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    paddingRight: 8,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  rightContainer: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 24,
  },
});
