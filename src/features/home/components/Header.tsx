import React from "react";
import { View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { Menu01Icon, Settings01Icon } from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useAuthStore } from "../../../store/auth";
import type { User } from "../types";

interface HeaderProps {
  user: User | undefined;
  onSettingsPress: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getDisplayFirstName(name: string | undefined): string {
  if (!name || !name.trim()) return "";
  const trimmed = name.trim();
  if (trimmed.includes("@")) {
    const beforeAt = trimmed.split("@")[0];
    const part = beforeAt.split(/[._]/)[0] || beforeAt;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }
  const first = trimmed.split(/\s+/)[0] || trimmed;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function Header({ user, onSettingsPress }: HeaderProps): React.ReactElement {
  const { t } = useTranslation();
  const { openSidebar, colors, themeMode } = useUIStore();
  const branch = useAuthStore((state) => state.branch);
  const isDark = themeMode === "dark";
  const displayName = getDisplayFirstName(user?.name);
  const greetingText = displayName
    ? `${t("home.greeting")}, ${displayName}`
    : t("home.greeting");
  const subtitle = branch ? `${branch.code} — ${branch.name}` : t("home.branch");

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.header : colors.navBar },
      ]}
    >
      <View className="flex-row items-center flex-1 min-w-0">
        <TouchableOpacity
          onPress={openSidebar}
          className="p-2 -ml-1 mr-3"
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Menu01Icon size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <LinearGradient
          colors={[colors.gradientPrimaryStart, colors.gradientPrimaryMiddle, colors.gradientPrimaryEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text className="text-sm font-bold text-white">
            {user ? getInitials(user.name) : "?"}
          </Text>
        </LinearGradient>
        <View className="flex-1 justify-center min-w-0">
          <Text
            className="text-[17px] font-semibold text-white tracking-tight"
            numberOfLines={1}
          >
            {greetingText}
          </Text>
          <Text
            className="text-xs text-white/70 mt-0.5"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
        onPress={onSettingsPress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Settings01Icon size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  container: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
};
