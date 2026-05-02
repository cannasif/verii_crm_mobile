import React, { memo, useCallback, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  TelephoneIcon,
  UserGroupIcon,
  Mail01Icon,
  Building01Icon,
  Note01Icon,
  Invoice01Icon,
  ShoppingCart01Icon,
  Task01Icon,
  UserIcon,
  Tick02Icon,
  Clock01Icon,
  ArrowRight02Icon,
  Location04Icon,
} from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { StatusBadge } from "./StatusBadge";
import { useCompleteTask, useStartTask, useHoldTask } from "../hooks";
import type { ActivityDto } from "../../activity/types";

interface TaskCardProps {
  task: ActivityDto;
  compact?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3B82F6",
  inprogress: "#F59E0B",
  completed: "#10B981",
  cancelled: "#EF4444",
  canceled: "#EF4444",
  postponed: "#6B7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

function getActivityTypeName(task: ActivityDto): string {
  if (typeof task.activityType === "string") return task.activityType;
  if (task.activityType && typeof task.activityType === "object" && typeof task.activityType.name === "string") {
    return task.activityType.name;
  }
  if (typeof task.activityTypeName === "string") return task.activityTypeName;
  return "";
}

function normalizeTypeKey(type: string): string {
  return type.toLowerCase().replace(/\s+/g, "").replace(/ı/g, "i").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u");
}

function getTypeColor(type: string): string {
  const key = normalizeTypeKey(type);
  if (["call", "telefon", "arama", "phone"].includes(key)) return "#3B82F6";
  if (["meeting", "toplanti", "gorusme"].includes(key)) return "#8B5CF6";
  if (["email", "eposta", "mail", "e-posta"].includes(key)) return "#06B6D4";
  if (["visit", "ziyaret", "yerindeziyaret"].includes(key)) return "#3B82F6";
  if (["note", "not", "notlar"].includes(key)) return "#F59E0B";
  if (["quote", "teklif"].includes(key)) return "#EC4899";
  if (["order", "siparis"].includes(key)) return "#10B981";
  return "#6B7280";
}

function renderTypeIcon(type: string, size: number, color: string): React.ReactElement {
  const key = normalizeTypeKey(type);
  const props = { size, color, variant: "stroke" as const, strokeWidth: 2 };
  if (["call", "telefon", "arama", "phone"].includes(key)) return <TelephoneIcon {...props} />;
  if (["meeting", "toplanti", "gorusme"].includes(key)) return <UserGroupIcon {...props} />;
  if (["email", "eposta", "mail", "e-posta"].includes(key)) return <Mail01Icon {...props} />;
  if (["visit", "ziyaret", "yerindeziyaret"].includes(key)) return <Location04Icon {...props} />;
  if (["note", "not", "notlar"].includes(key)) return <Note01Icon {...props} />;
  if (["quote", "teklif"].includes(key)) return <Invoice01Icon {...props} />;
  if (["order", "siparis"].includes(key)) return <ShoppingCart01Icon {...props} />;
  return <Task01Icon {...props} />;
}

function getPriorityInfo(
  task: ActivityDto,
  t: (key: string) => string
): { label: string; color: string } | null {
  const value = task.priority;
  if (value === undefined || value === null) return null;
  const asString = String(value).toLowerCase();
  if (value === 2 || asString === "high") {
    return { label: t("activity.priorityHigh"), color: PRIORITY_COLORS.high };
  }
  if (value === 1 || asString === "medium") {
    return { label: t("activity.priorityMedium"), color: PRIORITY_COLORS.medium };
  }
  if (value === 0 || asString === "low") {
    return { label: t("activity.priorityLow"), color: PRIORITY_COLORS.low };
  }
  return null;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function TaskCardComponent({ task, compact = false }: TaskCardProps): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const { startTask, isPending: isStarting } = useStartTask();
  const { completeTask, isPending: isCompleting } = useCompleteTask();
  const { holdTask, isPending: isHolding } = useHoldTask();
  const isLoading = isStarting || isCompleting || isHolding;

  const normalizedStatus = String(task.status ?? "").toLowerCase().replace(/\s+/g, "");
  const statusColor = STATUS_COLORS[normalizedStatus] ?? "#6B7280";
  const isCompleted = task.isCompleted || normalizedStatus === "completed";
  const isCancelled = normalizedStatus === "cancelled" || normalizedStatus === "canceled";

  const typeName = useMemo(() => getActivityTypeName(task), [task]);
  const typeColor = useMemo(() => getTypeColor(typeName), [typeName]);
  const priority = useMemo(() => getPriorityInfo(task, t), [task, t]);
  const activityDateStr = task.startDateTime ?? task.activityDate ?? task.createdDate;
  const endDateStr = task.endDateTime;

  const activityDate = useMemo(() => new Date(activityDateStr), [activityDateStr]);
  const endDate = useMemo(() => (endDateStr ? new Date(endDateStr) : null), [endDateStr]);

  const assigneeName =
    task.assignedUser?.fullName || task.assignedUser?.userName || t("dailyTasks.assigneeFallback");
  const initials = useMemo(() => getInitials(assigneeName), [assigneeName]);

  const handlePress = useCallback(() => {
    router.push(`/(tabs)/activities/${task.id}`);
  }, [router, task.id]);

  const handleStart = useCallback(() => {
    if (isLoading) return;
    startTask(task.id);
  }, [isLoading, startTask, task.id]);

  const handleComplete = useCallback(() => {
    if (isLoading) return;
    completeTask(task.id);
  }, [isLoading, completeTask, task.id]);

  const handleHold = useCallback(() => {
    if (isLoading) return;
    holdTask(task.id);
  }, [isLoading, holdTask, task.id]);

  const cardBg = isDark ? "rgba(255, 255, 255, 0.03)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(15, 23, 42, 0.06)";
  const pillBg = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.04)";

  const showStatusBadge =
    !isCompleted &&
    normalizedStatus !== "" &&
    normalizedStatus !== "scheduled";

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <View style={styles.topRow}>
          <View style={styles.typeCluster}>
            <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
            <Text
              unstyled
              style={styles.typeLabel}
              color={typeColor}
              numberOfLines={1}
            >
              {(typeName || t("dailyTasks.statusScheduled")).toUpperCase()}
            </Text>
          </View>
          {showStatusBadge ? <StatusBadge status={String(task.status)} /> : null}
        </View>

        <Text
          unstyled
          style={[
            styles.subject,
            { color: colors.text },
            isCompleted && styles.completedText,
          ]}
          numberOfLines={2}
        >
          {task.subject || t("activity.noSubject")}
        </Text>

        <View style={styles.pillsRow}>
          {priority ? (
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: `${priority.color}14`,
                  borderColor: `${priority.color}55`,
                },
              ]}
            >
              <ArrowRight02Icon
                size={12}
                color={priority.color}
                variant="stroke"
                strokeWidth={2.5}
              />
              <Text
                unstyled
                style={styles.pillText}
                color={priority.color}
                numberOfLines={1}
              >
                {priority.label}
              </Text>
            </View>
          ) : null}

          {typeName ? (
            <View style={[styles.pill, { backgroundColor: pillBg, borderColor: cardBorder }]}>
              {renderTypeIcon(typeName, 12, colors.textSecondary)}
              <Text
                unstyled
                style={styles.pillText}
                color={colors.textSecondary}
                numberOfLines={1}
              >
                {typeName}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.divider, { backgroundColor: cardBorder }]} />

        <View style={styles.footerRow}>
          <View style={styles.assigneeRow}>
            <View style={[styles.avatar, { backgroundColor: pillBg, borderColor: cardBorder }]}>
              {initials ? (
                <Text unstyled style={styles.avatarText} color={colors.textSecondary}>
                  {initials}
                </Text>
              ) : (
                <UserIcon size={14} color={colors.textMuted} variant="stroke" strokeWidth={2} />
              )}
            </View>
            <View style={styles.assigneeTextCluster}>
              <Text
                unstyled
                style={styles.assigneeName}
                color={colors.text}
                numberOfLines={1}
              >
                {assigneeName}
              </Text>
              <Text
                unstyled
                style={styles.assigneeDate}
                color={colors.textMuted}
                numberOfLines={1}
              >
                {formatShortDate(activityDate)}
              </Text>
            </View>
          </View>

          {isCompleted ? (
            <View style={[styles.completeBtn, styles.completedBtn]}>
              <Tick02Icon size={18} color="#FFFFFF" variant="stroke" strokeWidth={3} />
            </View>
          ) : isCancelled ? null : (
            <TouchableOpacity
              style={[
                styles.completeBtn,
                { backgroundColor: "#10B981" },
                isLoading && styles.disabled,
              ]}
              onPress={handleComplete}
              disabled={isLoading}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Tick02Icon size={18} color="#FFFFFF" variant="stroke" strokeWidth={3} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {normalizedStatus === "inprogress" && !isCompleted ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
              onPress={handleComplete}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text unstyled style={styles.actionText} color="#FFFFFF">
                {t("dailyTasks.complete")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border }]}
              onPress={handleHold}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text unstyled style={styles.actionText} color={colors.textSecondary}>
                {t("dailyTasks.hold")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : normalizedStatus === "scheduled" || normalizedStatus === "postponed" ? (
          <TouchableOpacity
            style={[styles.startRow, { backgroundColor: `${statusColor}12`, borderColor: `${statusColor}45` }]}
            onPress={handleStart}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Clock01Icon size={14} color={statusColor} variant="stroke" strokeWidth={2.5} />
            <Text unstyled style={styles.startText} color={statusColor}>
              {t("dailyTasks.start")}
              {endDate ? ` · ${formatTime(activityDate)} - ${formatTime(endDate)}` : ` · ${formatTime(activityDate)}`}
            </Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <View style={styles.typeCluster}>
          <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
          <Text unstyled style={styles.typeLabel} color={typeColor} numberOfLines={1}>
            {(typeName || t("dailyTasks.statusScheduled")).toUpperCase()}
          </Text>
        </View>
        {showStatusBadge ? <StatusBadge status={String(task.status)} /> : null}
      </View>

      <Text
        unstyled
        style={[styles.subject, { color: colors.text }, isCompleted && styles.completedText]}
        numberOfLines={2}
      >
        {task.subject || t("activity.noSubject")}
      </Text>

      {task.potentialCustomer?.name ? (
        <Text unstyled style={styles.customer} color={colors.textSecondary} numberOfLines={1}>
          {task.potentialCustomer.name}
        </Text>
      ) : null}

      <View style={styles.pillsRow}>
        {priority ? (
          <View
            style={[
              styles.pill,
              { backgroundColor: `${priority.color}14`, borderColor: `${priority.color}55` },
            ]}
          >
            <ArrowRight02Icon size={12} color={priority.color} variant="stroke" strokeWidth={2.5} />
            <Text unstyled style={styles.pillText} color={priority.color}>
              {priority.label}
            </Text>
          </View>
        ) : null}
        {typeName ? (
          <View style={[styles.pill, { backgroundColor: pillBg, borderColor: cardBorder }]}>
            {renderTypeIcon(typeName, 12, colors.textSecondary)}
            <Text unstyled style={styles.pillText} color={colors.textSecondary}>
              {typeName}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: cardBorder }]} />

      <View style={styles.footerRow}>
        <View style={styles.assigneeRow}>
          <View style={[styles.avatar, { backgroundColor: pillBg, borderColor: cardBorder }]}>
            {initials ? (
              <Text unstyled style={styles.avatarText} color={colors.textSecondary}>
                {initials}
              </Text>
            ) : (
              <UserIcon size={14} color={colors.textMuted} variant="stroke" strokeWidth={2} />
            )}
          </View>
          <View style={styles.assigneeTextCluster}>
            <Text unstyled style={styles.assigneeName} color={colors.text} numberOfLines={1}>
              {assigneeName}
            </Text>
            <Text unstyled style={styles.assigneeDate} color={colors.textMuted} numberOfLines={1}>
              {formatShortDate(activityDate)}
            </Text>
          </View>
        </View>

        {isCompleted ? (
          <View style={[styles.completeBtn, styles.completedBtn]}>
            <Tick02Icon size={18} color="#FFFFFF" variant="stroke" strokeWidth={3} />
          </View>
        ) : isCancelled ? null : (
          <TouchableOpacity
            style={[
              styles.completeBtn,
              { backgroundColor: "#10B981" },
              isLoading && styles.disabled,
            ]}
            onPress={handleComplete}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isCompleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Tick02Icon size={18} color="#FFFFFF" variant="stroke" strokeWidth={3} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const TaskCard = memo(TaskCardComponent);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  typeCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  subject: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  customer: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: -4,
  },
  completedText: {
    opacity: 0.55,
    textDecorationLine: "line-through",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  assigneeTextCluster: {
    flexShrink: 1,
  },
  assigneeName: {
    fontSize: 13,
    fontWeight: "600",
  },
  assigneeDate: {
    fontSize: 12,
    marginTop: 1,
  },
  completeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  completedBtn: {
    backgroundColor: "#10B981",
  },
  disabled: {
    opacity: 0.6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  startRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  startText: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
});
