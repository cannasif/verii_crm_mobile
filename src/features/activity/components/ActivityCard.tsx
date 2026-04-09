import React, { memo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { ActivityDto } from "../types";

import {
  Calendar01Icon,
  UserCircleIcon,
  Notification01Icon,
  Building03Icon,
  TelephoneIcon,
  UserGroupIcon,
  Mail01Icon,
  Task01Icon,
  Building01Icon,
  Note01Icon,
  Invoice01Icon,
  ShoppingCart01Icon,
  Time02Icon,
  Cancel01Icon,
  TickDouble01Icon,
} from "hugeicons-react-native";

const CARD_HEIGHT = 124;
const PRIMARY = "#db2777";

interface ActivityCardProps {
  activity: ActivityDto;
  onPress: () => void;
  onReportPress?: () => void;
}

const getLocText = (t: (k: string) => string, key: string, fallback: string) => {
  const res = t(key);
  return res === key || !res ? fallback : res;
};

function ActivityCardComponent({ activity, onPress, onReportPress }: ActivityCardProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";

  const pVal = activity.priority;
  const isHighPriority = pVal === 2 || String(pVal).toLowerCase() === "high";
  const isMediumPriority = pVal === 1 || String(pVal).toLowerCase() === "medium";
  const isLowPriority = pVal === 0 || String(pVal).toLowerCase() === "low";

  const statusVal = activity.status;
  const isCancelled =
    statusVal === 2 ||
    String(statusVal).toLowerCase() === "cancelled" ||
    String(statusVal).toLowerCase() === "canceled";
  const isCompleted =
    statusVal === 1 || String(statusVal).toLowerCase() === "completed" || activity.isCompleted;

  const getStatusColor = (): string => {
    if (isCompleted) return colors.success || "#10b981";
    if (isCancelled) return colors.error || "#ef4444";
    return PRIMARY;
  };

  const getStatusText = (): string => {
    if (isCompleted) return getLocText(t, "activity.statusCompleted", "Tamamlandı");
    if (isCancelled) return getLocText(t, "activity.statusCancelled", "İptal");
    return getLocText(t, "activity.statusScheduled", "Planlandı");
  };

  const getPriorityBadge = (): { text: string; color: string } | null => {
    if (isCancelled || isCompleted) return null;
    if (isHighPriority) {
      return { text: getLocText(t, "activity.priorityHigh", "Yüksek"), color: "#ef4444" };
    }
    if (isMediumPriority) {
      return { text: getLocText(t, "activity.priorityMedium", "Orta"), color: "#f59e0b" };
    }
    if (isLowPriority) {
      return { text: getLocText(t, "activity.priorityLow", "Düşük"), color: "#10b981" };
    }
    return null;
  };
  const priorityBadge = getPriorityBadge();
  const isScheduled = !isCancelled && !isCompleted;

  let cardBgColor = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";

  if (isCancelled) {
    cardBgColor = isDark ? "rgba(239, 68, 68, 0.07)" : "rgba(239, 68, 68, 0.04)";
  } else if (isCompleted) {
    cardBgColor = isDark ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.06)";
  } else if (isHighPriority) {
    cardBgColor = isDark ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.03)";
  }

  const getActivityTypeText = (activityType: ActivityDto["activityType"]): string => {
    if (typeof activityType === "string") return activityType;
    if (activityType && typeof activityType === "object" && typeof activityType.name === "string") {
      return activityType.name;
    }
    return getLocText(t, "activity.unknownType", "Aktivite");
  };
  const activityTypeName = getActivityTypeText(activity.activityType);

  const getActivityTypeIcon = () => {
    const typeLower = activityTypeName.toLowerCase().replace(/\s+/g, "");
    const iconProps = { size: 12, color: PRIMARY, variant: "stroke" as const };
    switch (typeLower) {
      case "call":
      case "telefon":
      case "arama":
        return <TelephoneIcon {...iconProps} />;
      case "meeting":
      case "toplantı":
      case "görüşme":
        return <UserGroupIcon {...iconProps} />;
      case "email":
      case "e-posta":
      case "eposta":
      case "mail":
        return <Mail01Icon {...iconProps} />;
      case "visit":
      case "ziyaret":
        return <Building01Icon {...iconProps} />;
      case "note":
      case "not":
      case "notlar":
        return <Note01Icon {...iconProps} />;
      case "quote":
      case "teklif":
        return <Invoice01Icon {...iconProps} />;
      case "order":
      case "sipariş":
        return <ShoppingCart01Icon {...iconProps} />;
      default:
        return <Task01Icon {...iconProps} />;
    }
  };

  const customerName = activity.potentialCustomer?.name || activity.contact?.fullName;
  const hasCustomer = !!customerName;
  const assignedUserName = activity.assignedUser?.fullName;
  const hasAssignedUser = !!assignedUserName;
  const hasReminder = activity.reminders && activity.reminders.length > 0;

  const metaParts = [
    activity.paymentTypeName,
    activity.activityMeetingTypeName,
    activity.activityTopicPurposeName,
    activity.activityShippingName,
  ].filter(Boolean) as string[];
  const metaLine = metaParts.join(" · ");

  const getRemainingTimeText = () => {
    const targetDateStr = activity.startDateTime || activity.endDateTime;
    if (!targetDateStr || isCompleted || isCancelled) return null;
    const targetTime = new Date(targetDateStr).getTime();
    const nowTime = new Date().getTime();
    const diffMs = targetTime - nowTime;
    if (diffMs <= 0) return null;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}g`;
    if (diffHours > 0) return `${diffHours}s`;
    return `${diffMins}dk`;
  };
  const remainingShort = getRemainingTimeText();

  const formatSmartDate = (dateString: string): string => {
    if (!dateString) return getLocText(t, "activity.noDate", "—");
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();
    const time = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `${getLocText(t, "common.today", "Bugün")} ${time}`;
    if (isTomorrow) return `${getLocText(t, "common.tomorrow", "Yarın")} ${time}`;
    return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) + ` ${time}`;
  };
  const activityDateStr = activity.activityDate ?? activity.startDateTime ?? activity.createdDate;

  const statusColor = getStatusColor();
  const muted = colors.textMuted || (isDark ? "#94a3b8" : "#64748b");
  const secondary = colors.textSecondary || muted;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72} style={styles.touch}>
      <View
        style={[
          styles.card,
          {
            height: CARD_HEIGHT,
            backgroundColor: cardBgColor,
            opacity: isCancelled ? 0.72 : 1,
            borderColor: isDark ? "rgba(244, 114, 182, 0.42)" : "rgba(219, 39, 119, 0.22)",
          },
        ]}
      >
        {isCancelled ? (
          <View style={styles.watermark} pointerEvents="none">
            <Cancel01Icon
              size={100}
              color={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}
              variant="stroke"
              strokeWidth={1.5}
            />
          </View>
        ) : isCompleted ? (
          <View style={styles.watermark} pointerEvents="none">
            <TickDouble01Icon
              size={100}
              color={isDark ? "rgba(16, 185, 129, 0.07)" : "rgba(16, 185, 129, 0.06)"}
              variant="stroke"
              strokeWidth={1.5}
            />
          </View>
        ) : isScheduled ? (
          <View style={styles.watermark} pointerEvents="none">
            <Calendar01Icon
              size={100}
              color={isDark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.035)"}
              variant="stroke"
              strokeWidth={1}
            />
          </View>
        ) : null}

        {isHighPriority && !isCompleted && !isCancelled ? (
          <View style={[styles.accentBar, { backgroundColor: "#ef4444" }]} />
        ) : null}

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.typeCluster}>
              {getActivityTypeIcon()}
              <Text unstyled style={styles.typeText} color={PRIMARY} numberOfLines={1}>
                {activityTypeName}
              </Text>
            </View>

            <View style={styles.topRight}>
              {priorityBadge ? (
                <View
                  style={[
                    styles.pillBadge,
                    {
                      backgroundColor: `${priorityBadge.color}18`,
                      borderColor: `${priorityBadge.color}38`,
                    },
                  ]}
                >
                  <Text unstyled style={styles.pillBadgeText} color={priorityBadge.color} numberOfLines={1}>
                    {priorityBadge.text}
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.pillBadge,
                  { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}38` },
                ]}
              >
                <Text unstyled style={styles.pillBadgeText} color={statusColor} numberOfLines={1}>
                  {getStatusText()}
                </Text>
              </View>
              {hasReminder && !isCompleted && !isCancelled ? (
                <Notification01Icon size={14} color={colors.warning || "#f59e0b"} variant="stroke" strokeWidth={2} />
              ) : null}
            </View>
          </View>

          <Text
            unstyled
            style={[styles.subject, { textDecorationLine: isCancelled ? "line-through" : "none" }]}
            color={colors.text}
            numberOfLines={1}
          >
            {activity.subject || getLocText(t, "activity.noSubject", "Konu yok")}
          </Text>

          <View style={styles.customerRow}>
            <Building03Icon size={12} color={hasCustomer ? secondary : muted} variant="stroke" strokeWidth={2} />
            <Text
              unstyled
              style={[styles.customerText, { fontStyle: hasCustomer ? "normal" : "italic" }]}
              color={hasCustomer ? secondary : muted}
              numberOfLines={1}
            >
              {hasCustomer ? customerName : getLocText(t, "activity.noCustomer", "Cari / kişi yok")}
            </Text>
          </View>

          <View style={styles.metaSlot}>
            {metaLine ? (
              <Text unstyled style={styles.metaLine} color={muted} numberOfLines={1} ellipsizeMode="tail">
                {metaLine}
              </Text>
            ) : null}
          </View>

          <View style={[styles.footerRow, { borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }]}>
            <View style={styles.footerLeft}>
              <Calendar01Icon size={11} color={secondary} variant="stroke" strokeWidth={2} />
              <Text unstyled style={styles.footerText} color={secondary} numberOfLines={1}>
                {formatSmartDate(activityDateStr)}
              </Text>
            </View>

            {remainingShort ? (
              <View style={styles.footerTime}>
                <Time02Icon size={11} color={colors.warning || "#f59e0b"} variant="stroke" strokeWidth={2} />
                <Text unstyled style={styles.footerText} color={colors.warning || "#f59e0b"}>
                  {remainingShort}
                </Text>
              </View>
            ) : null}

            <View style={styles.footerSpacer} />

            <View style={styles.footerAssignee}>
              <UserCircleIcon size={11} color={hasAssignedUser ? secondary : muted} variant="stroke" strokeWidth={2} />
              <Text
                unstyled
                style={styles.footerText}
                color={hasAssignedUser ? secondary : muted}
                numberOfLines={1}
              >
                {hasAssignedUser ? assignedUserName?.split(" ")[0] : getLocText(t, "activity.unassigned", "—")}
              </Text>
            </View>

            {onReportPress ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onReportPress();
                }}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={t("activity.reportPdf", "Rapor / belge")}
                style={[styles.reportIconBtn, { borderColor: `${PRIMARY}38`, backgroundColor: `${PRIMARY}10` }]}
              >
                <Invoice01Icon size={14} color={PRIMARY} variant="stroke" strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ActivityCard = memo(ActivityCardComponent);

const styles = StyleSheet.create({
  touch: {
    width: "100%",
  },
  card: {
    width: "100%",
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  watermark: {
    position: "absolute",
    right: -8,
    bottom: -12,
    zIndex: 0,
    transform: [{ rotate: "-10deg" }],
  },
  accentBar: {
    width: 3,
    alignSelf: "stretch",
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: "space-between",
    minWidth: 0,
    zIndex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 18,
  },
  typeCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
    justifyContent: "flex-end",
    flexWrap: "nowrap",
  },
  pillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 100,
  },
  pillBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  subject: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginTop: 2,
    lineHeight: 18,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
    minHeight: 16,
  },
  customerText: {
    fontSize: 11,
    flex: 1,
  },
  metaSlot: {
    minHeight: 13,
    justifyContent: "center",
    marginTop: 1,
  },
  metaLine: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.15,
    lineHeight: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    minHeight: 26,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "38%",
    flexShrink: 1,
  },
  footerTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },
  footerSpacer: {
    flex: 1,
    minWidth: 4,
  },
  footerAssignee: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: "26%",
    flexShrink: 1,
  },
  footerText: {
    fontSize: 10,
    fontWeight: "600",
  },
  reportIconBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
    marginLeft: 2,
  },
});
