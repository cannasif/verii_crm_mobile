import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  Calendar03Icon,
  Tag01Icon,
  Activity02Icon,
  Invoice01Icon,
} from "hugeicons-react-native";
import type { Customer360SimpleItemDto } from "../types";

interface SimpleItemRowProps {
  item: Customer360SimpleItemDto;
  colors: Record<string, string>;
  formatDate: (date: string | null | undefined) => string;
  onPress?: (item: Customer360SimpleItemDto) => void;
}

function getStatusMeta(status: string, isDark: boolean) {
  const normalized = status.toLocaleLowerCase("tr-TR");

  if (
    normalized.includes("onay") ||
    normalized.includes("approved") ||
    normalized.includes("tamam")
  ) {
    return {
      text: "#10B981",
      bg: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.10)",
      border: isDark ? "rgba(16,185,129,0.22)" : "rgba(16,185,129,0.16)",
    };
  }

  if (
    normalized.includes("bekle") ||
    normalized.includes("pending") ||
    normalized.includes("taslak")
  ) {
    return {
      text: "#F59E0B",
      bg: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.10)",
      border: isDark ? "rgba(245,158,11,0.22)" : "rgba(245,158,11,0.16)",
    };
  }

  if (
    normalized.includes("red") ||
    normalized.includes("iptal") ||
    normalized.includes("cancel") ||
    normalized.includes("fail")
  ) {
    return {
      text: "#EF4444",
      bg: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.10)",
      border: isDark ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.16)",
    };
  }

  return {
    text: isDark ? "rgba(255,255,255,0.70)" : "#475569",
    bg: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  };
}

function isActivityItem(item: Customer360SimpleItemDto) {
  const raw = `${item.title ?? ""} ${item.subtitle ?? ""} ${item.status ?? ""}`.toLocaleLowerCase("tr-TR");
  return raw.includes("aktivite") || raw.includes("activity");
}

export function SimpleItemRow({
  item,
  colors,
  formatDate,
  onPress,
}: SimpleItemRowProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const titleText = isDark ? "#F8FAFC" : "#334155";
  const mutedText = isDark ? "rgba(255,255,255,0.62)" : "#64748B";
  const softText = isDark ? "rgba(255,255,255,0.44)" : "#94A3B8";

  const defaultAccent = isDark ? "#EC4899" : "#DB2777";
  const activityAccent = "#14B8A6";

  const iconBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(219,39,119,0.06)";
  const iconBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(219,39,119,0.10)";
  const activityBg = isDark ? "rgba(20,184,166,0.12)" : "rgba(20,184,166,0.08)";
  const activityBorder = isDark ? "rgba(20,184,166,0.20)" : "rgba(20,184,166,0.14)";

  const dateStr = item.date ? formatDate(item.date) : null;
  const hasSubtitle = !!item.subtitle?.trim();
  const hasStatus = item.status != null && item.status !== "";
  const activityItem = isActivityItem(item);

  const statusMeta = useMemo(
    () => (hasStatus ? getStatusMeta(String(item.status), isDark) : null),
    [item.status, isDark, hasStatus]
  );

  const titleIconColor = activityItem ? activityAccent : defaultAccent;
  const titleIconBg = activityItem ? activityBg : iconBg;
  const titleIconBorder = activityItem ? activityBorder : iconBorder;

  return (
    <View style={styles.row}>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: titleIconBg,
                borderColor: titleIconBorder,
              },
            ]}
          >
            {activityItem ? (
              <Activity02Icon size={12} color={titleIconColor} variant="stroke" />
            ) : (
              <Invoice01Icon size={12} color={titleIconColor} variant="stroke" />
            )}
          </View>

          <Text style={[styles.title, { color: titleText }]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>

        {hasStatus && statusMeta ? (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusMeta.bg,
                borderColor: statusMeta.border,
              },
            ]}
          >
            <Text
              style={[styles.status, { color: statusMeta.text }]}
              numberOfLines={1}
            >
              {item.status}
            </Text>
          </View>
        ) : null}
      </View>

      {hasSubtitle ? (
        <View style={styles.metaRow}>
          <Tag01Icon size={11} color={softText} variant="stroke" />
          <Text style={[styles.subtitle, { color: mutedText }]} numberOfLines={2}>
            {item.subtitle}
          </Text>
        </View>
      ) : null}

      {dateStr ? (
        <View style={styles.metaRow}>
          <Calendar03Icon size={11} color={softText} variant="stroke" />
          <Text style={[styles.date, { color: mutedText }]} numberOfLines={1}>
            {dateStr}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingRight: 8,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 1,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 16,
    letterSpacing: -0.1,
    paddingTop: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 7,
    paddingLeft: 30,
    paddingRight: 4,
  },
  subtitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 14,
  },
  date: {
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 13,
  },
  statusBadge: {
    maxWidth: "40%",
    minHeight: 22,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  status: {
    fontSize: 8.5,
    fontWeight: "500",
    lineHeight: 10,
    textAlign: "center",
  },
});