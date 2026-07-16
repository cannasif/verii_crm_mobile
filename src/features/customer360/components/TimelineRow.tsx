import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Cancel01Icon,
  Invoice03Icon,
  ArrowRight01Icon,
} from "hugeicons-react-native";
import type { Customer360TimelineItemDto } from "../types";

interface TimelineRowProps {
  item: Customer360TimelineItemDto;
  colors: Record<string, string>;
  formatDateTime: (date: string) => string;
  statusLabel: string;
  formatAmount?: (value: number) => string;
  onPress?: () => void;
}

function getStatusMeta(status: string, isDark: boolean) {
  const normalized = status.toLocaleLowerCase("tr-TR");

  if (
    normalized.includes("onay") ||
    normalized.includes("approved") ||
    normalized.includes("tamam")
  ) {
    return {
      Icon: CheckmarkCircle02Icon,
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
      Icon: Alert02Icon,
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
      Icon: Cancel01Icon,
      text: "#EF4444",
      bg: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.10)",
      border: isDark ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.16)",
    };
  }

  return {
    Icon: Alert02Icon,
    text: isDark ? "rgba(255,255,255,0.70)" : "#475569",
    bg: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  };
}

export function TimelineRow({
  item,
  colors,
  formatDateTime,
  statusLabel,
  formatAmount,
  onPress,
}: TimelineRowProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const titleText = isDark ? "#F8FAFC" : "#1F2937";
  const mutedText = isDark ? "rgba(255,255,255,0.56)" : "#6B7280";
  const softText = isDark ? "rgba(255,255,255,0.42)" : "#94A3B8";
  const accent = isDark ? "#EC4899" : "#DB2777";

  const amountStr =
    item.amount != null && formatAmount
      ? formatAmount(item.amount)
      : item.amount != null
        ? String(item.amount)
        : null;

  const hasStatus = statusLabel.trim() !== "";
  const statusMeta = useMemo(
    () => (hasStatus ? getStatusMeta(statusLabel, isDark) : null),
    [hasStatus, statusLabel, isDark]
  );

  const StatusIcon = statusMeta?.Icon;

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.72}
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={item.title}
    >
      <View style={styles.leftRail}>
        <View
          style={[
            styles.timelineDot,
            {
              backgroundColor: `${accent}10`,
              borderColor: `${accent}18`,
            },
          ]}
        />
        <View
          style={[
            styles.timelineLine,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            },
          ]}
        />
      </View>

      <View style={styles.contentWrap}>
        <View style={styles.topMetaRow}>
          <View style={styles.dateWrap}>
            <Calendar03Icon size={11} color={softText} variant="stroke" />
            <Text style={[styles.dateTime, { color: mutedText }]} numberOfLines={1}>
              {formatDateTime(item.date)}
            </Text>
          </View>

          {amountStr !== null ? (
            <View style={styles.amountWrap}>
              <Invoice03Icon size={11} color={accent} variant="stroke" />
              <Text style={[styles.amount, { color: titleText }]} numberOfLines={1}>
                {amountStr}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.title, { color: titleText }]} numberOfLines={2}>
          {item.title}
        </Text>

        {hasStatus && statusMeta && StatusIcon ? (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusMeta.bg,
                borderColor: statusMeta.border,
              },
            ]}
          >
            <StatusIcon size={11} color={statusMeta.text} variant="stroke" />
            <Text style={[styles.status, { color: statusMeta.text }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        ) : null}
      </View>
      {onPress ? (
        <View style={styles.chevronWrap}>
          <ArrowRight01Icon size={14} color={softText} variant="stroke" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  leftRail: {
    width: 18,
    alignItems: "center",
    marginRight: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    marginTop: 5,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    marginTop: 4,
  },
  contentWrap: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 2,
  },
  chevronWrap: {
    width: 22,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 5,
  },
  dateWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateTime: {
    fontSize: 9.5,
    fontWeight: "400",
    lineHeight: 12,
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "45%",
  },
  amount: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 15,
    letterSpacing: -0.1,
  },
  statusBadge: {
    alignSelf: "flex-start",
    minHeight: 22,
    marginTop: 7,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "80%",
  },
  status: {
    fontSize: 8.5,
    fontWeight: "500",
    lineHeight: 10,
  },
});
