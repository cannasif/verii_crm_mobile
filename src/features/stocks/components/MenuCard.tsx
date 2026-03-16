import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { ArrowRight01Icon } from "hugeicons-react-native";

interface MenuCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  rightIcon?: React.ReactNode;
}

export function MenuCard({
  title,
  description,
  icon,
  onPress,
  rightIcon,
}: MenuCardProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const [isPressed, setIsPressed] = useState(false);

  const ACTIVE_PINK = "#ec4899";

  const cardBg = isDark ? (colors?.card || "#1E293B") : "#FFFFFF";
  const normalBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const currentBorder = isPressed ? ACTIVE_PINK : normalBorder;

  const iconBoxBg = isDark ? "rgba(236, 72, 153, 0.15)" : "#FFF0F5";

  const normalIconColor = colors?.text || (isDark ? "#FFFFFF" : "#000000");
  const currentIconColor = isPressed ? ACTIVE_PINK : normalIconColor;

  const titleColor = isDark ? "#F8FAFC" : "#111827";
  const descColor = isDark ? "#94A3B8" : "#6B7280";
  const arrowColor = isPressed ? ACTIVE_PINK : isDark ? "#F472B6" : "#9CA3AF";

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderColor: currentBorder,
          shadowColor: isDark ? "#000" : "#64748B",
          shadowOpacity: isDark ? 0.3 : 0.08,
        },
      ]}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBoxBg }]}>
        {React.isValidElement(icon) ? (
          React.cloneElement(icon as React.ReactElement<any>, {
            color: currentIconColor,
            variant: "stroke",
          })
        ) : (
          icon
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        <Text
          style={[styles.description, { color: descColor }]}
          numberOfLines={2}
        >
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
    borderWidth: 1,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  content: {
    flex: 1,
    paddingRight: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  rightContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
});