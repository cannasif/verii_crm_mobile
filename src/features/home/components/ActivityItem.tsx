import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { ActivityItem as ActivityItemType } from "../types";
import {
  PackageIcon,
  ClipboardIcon,
  ArrowDataTransferHorizontalIcon,
  TruckIcon,
  Location01Icon,
  HandPointingDown01Icon,
  CheckmarkCircle02Icon,
} from "hugeicons-react-native";

interface ActivityItemProps {
  item: ActivityItemType;
}

const getIcon = (type: string) => {
  switch (type) {
    case "receiving":
      return PackageIcon;
    case "inventory":
      return ClipboardIcon;
    case "transfer":
      return ArrowDataTransferHorizontalIcon;
    case "shipping":
      return TruckIcon;
    case "putaway":
      return Location01Icon;
    case "picking":
      return HandPointingDown01Icon;
    default:
      return CheckmarkCircle02Icon;
  }
};

const getIconColor = (type: string): string => {
  switch (type) {
    case "receiving":
      return "#3B82F6";
    case "shipping":
      return "#F59E0B";
    case "inventory":
      return "#8B5CF6";
    case "transfer":
      return "#10B981";
    default:
      return "#6B7280";
  }
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityItem({ item }: ActivityItemProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const IconComponent = getIcon(item.type);
  const iconColor = getIconColor(item.type);
  const statusColor =
    item.status === "completed"
      ? colors.success
      : item.status === "pending"
        ? colors.warning
        : colors.error;

  return (
    <View
      style={[
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.backgroundSecondary,
          },
        ]}
      >
        <IconComponent size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text
          disableThemeColor
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          disableThemeColor
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {item.description}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text disableThemeColor style={[styles.time, { color: colors.textMuted }]}>
          {formatTime(item.timestamp)}
        </Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginVertical: 14,
    marginRight: 14,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingRight: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  meta: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 16,
    paddingVertical: 14,
  },
  time: {
    fontSize: 11,
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
