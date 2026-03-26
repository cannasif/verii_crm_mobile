import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useActivity, useDeleteActivity, useUpdateActivity } from "../hooks";
import type { ActivityDto } from "../types";
import { ACTIVITY_STATUS_NUMERIC, ACTIVITY_PRIORITY_NUMERIC } from "../types";
import { ReportTab, DocumentRuleType } from "../../quotation";
import {
  Calendar03Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  UserIcon,
  Briefcase01Icon,
  Note01Icon,
  Edit02Icon,
  Delete02Icon,
  Flag03Icon,
  Task01Icon,
  ArrowRight01Icon,
  Alert02Icon,
} from "hugeicons-react-native";

function normalizeStatusForDisplay(status: ActivityDto["status"]): string {
  if (status == null) return "";
  if (typeof status === "number" && ACTIVITY_STATUS_NUMERIC[status as 0 | 1 | 2]) {
    return ACTIVITY_STATUS_NUMERIC[status as 0 | 1 | 2];
  }
  return String(status);
}

function normalizePriorityForDisplay(priority: ActivityDto["priority"]): string {
  if (priority == null) return "";
  if (typeof priority === "number" && ACTIVITY_PRIORITY_NUMERIC[priority as 0 | 1 | 2]) {
    return ACTIVITY_PRIORITY_NUMERIC[priority as 0 | 1 | 2];
  }
  return String(priority);
}

function SectionHeader({
  title,
  accent,
  textColor,
}: {
  title: string;
  accent: string;
  textColor: string;
}): React.ReactElement {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  palette,
  icon,
  isLast = false,
}: {
  label: string;
  value: string | number | undefined | null;
  palette: {
    soft: string;
    softBorder: string;
    labelBg: string;
    labelBorder: string;
    text: string;
    textMuted: string;
  };
  icon?: React.ReactNode;
  isLast?: boolean;
}): React.ReactElement {
  const displayValue =
    value !== undefined && value !== null && String(value).trim() !== ""
      ? String(value)
      : "-";

  const isEmpty = displayValue === "-";

  return (
    <View
      style={[
        styles.detailRowCard,
        {
          backgroundColor: palette.soft,
          borderColor: palette.softBorder,
          marginBottom: isLast ? 0 : 10,
        },
      ]}
    >
      <View style={styles.detailRowInner}>
        <View
          style={[
            styles.detailLabelBox,
            {
              backgroundColor: palette.labelBg,
              borderColor: palette.labelBorder,
            },
          ]}
        >
          {icon ? <View style={styles.detailIconWrap}>{icon}</View> : null}
          <Text style={[styles.detailLabel, { color: palette.textMuted }]} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <View style={styles.detailValueWrap}>
          <Text
            style={[
              styles.detailValue,
              { color: isEmpty ? palette.textMuted : palette.text },
            ]}
            numberOfLines={2}
          >
            {displayValue}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PriorityBadge({
  text,
  color,
  highPriority,
}: {
  text: string;
  color: string;
  highPriority: boolean;
}): React.ReactElement {
  const pulse = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!highPriority) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.7,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [highPriority, pulse]);

  return (
    <View style={styles.priorityBadgeWrap}>
      {highPriority ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.priorityPulse,
            {
              backgroundColor: color,
              opacity: pulse.interpolate({
                inputRange: [0.7, 1],
                outputRange: [0.12, 0.24],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0.7, 1],
                    outputRange: [1, 1.08],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      <View
        style={[
          styles.heroBadge,
          {
            backgroundColor: `${color}16`,
            borderColor: `${color}30`,
          },
        ]}
      >
        <Flag03Icon size={12} color={color} variant="stroke" />
        <Text style={[styles.heroBadgeText, { color }]}>{text}</Text>
      </View>
    </View>
  );
}

export function ActivityDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const activityId = id ? Number(id) : undefined;
  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#0c0516" : "#FFFFFF";

  const gradientColors = useMemo(
    () =>
      (isDark
        ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
        : ["rgba(255, 235, 240, 0.72)", "#FFFFFF", "rgba(255, 240, 225, 0.72)"]) as [
        string,
        string,
        ...string[]
      ],
    [isDark]
  );

  const palette = useMemo(
    () => ({
      card: isDark ? "rgba(17, 10, 28, 0.84)" : "rgba(255,255,255,0.92)",
      cardStrong: isDark ? "rgba(23, 10, 38, 0.9)" : "rgba(255,255,255,0.96)",
      cardBorder: isDark ? "rgba(236,72,153,0.13)" : "rgba(244,114,182,0.12)",
      soft: isDark ? "rgba(255,255,255,0.028)" : "#FCFCFD",
      softBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(226,232,240,0.95)",
      labelBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.95)",
      labelBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(226,232,240,0.88)",
      timelineBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,247,250,0.95)",
      timelineBorder: isDark ? "rgba(236,72,153,0.14)" : "rgba(244,114,182,0.16)",
      headerButtonBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.66)",
      text: colors.text,
      textMuted: colors.textMuted,
      textSoft: colors.textSecondary,
      accent: colors.accent,
      success: colors.success,
      error: colors.error,
      warning: colors.warning,
      shadow: isDark ? "#000000" : "#E11D48",
    }),
    [isDark, colors]
  );

  const { data: activity, isLoading, isError, refetch } = useActivity(activityId);
  const deleteActivity = useDeleteActivity();
  const updateActivity = useUpdateActivity();

  const handleEdit = useCallback(() => {
    if (activityId) {
      router.push(`/(tabs)/activities/edit/${activityId}`);
    }
  }, [activityId, router]);

  const handleDelete = useCallback(() => {
    Alert.alert(t("common.confirm"), t("activity.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          if (activityId) {
            await deleteActivity.mutateAsync(activityId);
            router.back();
          }
        },
      },
    ]);
  }, [activityId, deleteActivity, router, t]);

  const handleMarkComplete = useCallback(() => {
    if (!activity || !activityId) return;

    Alert.alert(t("common.confirm"), t("activity.completeConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        onPress: async () => {
          await updateActivity.mutateAsync({
            id: activityId,
            data: {
              subject: activity.subject,
              description: activity.description,
              activityTypeId: activity.activityTypeId ?? 0,
              activityTypeName:
                activity.activityTypeName ||
                (typeof activity.activityType === "string"
                  ? activity.activityType
                  : activity.activityType?.name),
              paymentTypeId: activity.paymentTypeId,
              activityMeetingTypeId: activity.activityMeetingTypeId,
              activityTopicPurposeId: activity.activityTopicPurposeId,
              activityShippingId: activity.activityShippingId,
              startDateTime:
                activity.startDateTime || activity.activityDate || new Date().toISOString(),
              endDateTime:
                activity.endDateTime ||
                activity.startDateTime ||
                activity.activityDate ||
                new Date().toISOString(),
              isAllDay: activity.isAllDay ?? false,
              potentialCustomerId: activity.potentialCustomerId,
              potentialCustomerName:
                activity.potentialCustomerName || activity.potentialCustomer?.name,
              erpCustomerCode: activity.erpCustomerCode,
              status: 1,
              priority: typeof activity.priority === "number" ? activity.priority : 1,
              contactId: activity.contactId,
              contactName: activity.contactName || activity.contact?.fullName,
              assignedUserId: activity.assignedUserId ?? 0,
              reminders: (activity.reminders || []).map((reminder) => ({
                offsetMinutes: reminder.offsetMinutes,
                channel: typeof reminder.channel === "number" ? reminder.channel : 0,
              })),
            },
          });
        },
      },
    ]);
  }, [activity, activityId, updateActivity, t]);

  const getStatusColor = (status: ActivityDto["status"]): string => {
    const statusLower = normalizeStatusForDisplay(status).toLowerCase().replace(/\s+/g, "");
    switch (statusLower) {
      case "completed":
        return colors.success;
      case "inprogress":
        return colors.warning;
      case "scheduled":
        return colors.accent;
      case "cancelled":
      case "canceled":
        return colors.error;
      case "postponed":
        return colors.textMuted;
      default:
        return colors.textMuted;
    }
  };

  const getStatusText = (status: ActivityDto["status"]): string => {
    const statusLower = normalizeStatusForDisplay(status).toLowerCase().replace(/\s+/g, "");
    switch (statusLower) {
      case "completed":
        return t("activity.statusCompleted");
      case "inprogress":
        return t("activity.statusInProgress");
      case "scheduled":
        return t("activity.statusScheduled");
      case "cancelled":
      case "canceled":
        return t("activity.statusCancelled");
      case "postponed":
        return t("activity.statusPostponed");
      default:
        return normalizeStatusForDisplay(status);
    }
  };

  const getPriorityText = (priority?: ActivityDto["priority"]): string => {
    const p = normalizePriorityForDisplay(priority);
    switch (p.toLowerCase()) {
      case "high":
        return t("activity.priorityHigh");
      case "medium":
        return t("activity.priorityMedium");
      case "low":
        return t("activity.priorityLow");
      default:
        return p || "-";
    }
  };

  const getPriorityColor = (priority?: ActivityDto["priority"]): string => {
    const p = normalizePriorityForDisplay(priority).toLowerCase();
    switch (p) {
      case "high":
        return colors.error;
      case "medium":
        return colors.warning;
      case "low":
        return colors.success;
      default:
        return colors.textMuted;
    }
  };

  const isHighPriority = (priority?: ActivityDto["priority"]): boolean => {
    return normalizePriorityForDisplay(priority).toLowerCase() === "high";
  };

  const getActivityTypeText = (activityType: ActivityDto["activityType"]): string => {
    if (typeof activityType === "string" && activityType) return activityType;
    if (activityType && typeof activityType === "object" && typeof activityType.name === "string") {
      return activityType.name;
    }
    return "-";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />

        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <ScreenHeader title={t("activity.detail")} showBackButton />

        <View style={styles.contentTransparent}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      </View>
    );
  }

  if (isError || !activity) {
    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />

        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <ScreenHeader title={t("activity.detail")} showBackButton />

        <View style={styles.contentTransparent}>
          <View style={styles.errorContainer}>
            <View
              style={[
                styles.errorCard,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <Alert02Icon size={28} color={colors.error} variant="stroke" />
              <Text style={[styles.errorTitle, { color: colors.error }]}>{t("common.error")}</Text>
              <Text style={[styles.errorDescription, { color: palette.textMuted }]}>
                {t("common.error")}
              </Text>

              <TouchableOpacity onPress={() => refetch()} style={styles.retryButtonPremium}>
                <LinearGradient
                  colors={[colors.accent, "#f97316"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.retryButtonGradient}
                >
                  <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(activity.status);
  const priorityColor = getPriorityColor(activity.priority);
  const highPriority = isHighPriority(activity.priority);

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScreenHeader
        title={t("activity.detail")}
        showBackButton
        rightElement={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleEdit}
              style={[styles.headerButton, { backgroundColor: palette.headerButtonBg }]}
            >
              <Edit02Icon size={16} color={palette.text} variant="stroke" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.headerButton, { backgroundColor: palette.headerButtonBg }]}
            >
              <Delete02Icon size={16} color={palette.error} variant="stroke" />
            </TouchableOpacity>
          </View>
        }
      />

      <FlatList
        style={styles.contentTransparent}
        data={[0]}
        keyExtractor={(item) => String(item)}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        renderItem={() => (
          <>
            <LinearGradient
              colors={
                isDark
                  ? ["rgba(24,10,42,0.94)", "rgba(38,11,35,0.82)"]
                  : ["rgba(255,255,255,0.98)", "rgba(255,246,249,0.95)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.heroCard,
                {
                  borderColor: palette.cardBorder,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroLeft}>
                  <View
                    style={[
                      styles.heroIconWrap,
                      {
                        backgroundColor: `${colors.accent}12`,
                        borderColor: `${colors.accent}24`,
                      },
                    ]}
                  >
                    <Task01Icon size={20} color={colors.accent} variant="stroke" />
                  </View>

                  <View style={styles.heroTextWrap}>
                    <Text style={[styles.subject, { color: palette.text }]} numberOfLines={2}>
                      {activity.subject}
                    </Text>
                    <Text style={[styles.heroSubText, { color: palette.textMuted }]}>
                      {getActivityTypeText(activity.activityType)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroStateRow}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: `${statusColor}14`,
                      borderColor: `${statusColor}28`,
                    },
                  ]}
                >
                  <CheckmarkCircle02Icon size={12} color={statusColor} variant="stroke" />
                  <Text style={[styles.statusPillText, { color: statusColor }]}>
                    {getStatusText(activity.status)}
                  </Text>
                </View>

                <PriorityBadge
                  text={getPriorityText(activity.priority)}
                  color={priorityColor}
                  highPriority={highPriority}
                />
              </View>

              <View
                style={[
                  styles.timelineCard,
                  {
                    backgroundColor: palette.timelineBg,
                    borderColor: palette.timelineBorder,
                  },
                ]}
              >
                <View style={styles.timelineRow}>
                  <View style={styles.timelineDotWrap}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.accent }]} />
                    <View style={[styles.timelineLine, { backgroundColor: `${colors.accent}35` }]} />
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={styles.timelineTitleRow}>
                      <Calendar03Icon size={14} color={palette.textMuted} variant="stroke" />
                      <Text style={[styles.timelineLabel, { color: palette.textMuted }]}>
                        {t("activity.activityDate")}
                      </Text>
                    </View>
                    <Text style={[styles.timelineValue, { color: palette.text }]}>
                      {formatDate(activity.startDateTime || activity.activityDate || activity.createdDate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.timelineRow}>
                  <View style={styles.timelineDotWrap}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: activity.endDateTime
                            ? colors.warning
                            : colors.textMuted,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={styles.timelineTitleRow}>
                      <Clock01Icon size={14} color={palette.textMuted} variant="stroke" />
                      <Text style={[styles.timelineLabel, { color: palette.textMuted }]}>
                        {t("activity.endDate")}
                      </Text>
                    </View>
                    <Text style={[styles.timelineValue, { color: palette.text }]}>
                      {activity.endDateTime ? formatDate(activity.endDateTime) : "-"}
                    </Text>
                  </View>
                </View>
              </View>

              {!activity.isCompleted ? (
                <View style={styles.heroFooterInfo}>
                  <ArrowRight01Icon size={14} color={colors.accent} variant="stroke" />
                  <Text style={[styles.heroFooterText, { color: palette.textSoft }]}>
                    {t("activity.markComplete")}
                  </Text>
                </View>
              ) : null}
            </LinearGradient>

            <View
              style={[
                styles.section,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.cardBorder,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              <SectionHeader title={t("activity.basicInfo")} accent={colors.accent} textColor={palette.text} />

              <DetailRow
                label={t("activity.activityType")}
                value={getActivityTypeText(activity.activityType)}
                palette={palette}
                icon={<Task01Icon size={13} color={palette.textMuted} variant="stroke" />}
              />

              <DetailRow
                label={t("activity.status")}
                value={getStatusText(activity.status)}
                palette={palette}
                icon={<CheckmarkCircle02Icon size={13} color={statusColor} variant="stroke" />}
              />

              <DetailRow
                label={t("activity.priority")}
                value={getPriorityText(activity.priority)}
                palette={palette}
                icon={<Flag03Icon size={13} color={priorityColor} variant="stroke" />}
                isLast={
                  !activity.paymentTypeName &&
                  !activity.activityMeetingTypeName &&
                  !activity.activityTopicPurposeName &&
                  !activity.activityShippingName &&
                  !activity.description
                }
              />

              {activity.paymentTypeName ? (
                <DetailRow
                  label={t("activity.paymentType")}
                  value={activity.paymentTypeName}
                  palette={palette}
                  icon={<Briefcase01Icon size={13} color={palette.textMuted} variant="stroke" />}
                  isLast={
                    !activity.activityMeetingTypeName &&
                    !activity.activityTopicPurposeName &&
                    !activity.activityShippingName &&
                    !activity.description
                  }
                />
              ) : null}

              {activity.activityMeetingTypeName ? (
                <DetailRow
                  label={t("activity.activityMeetingType")}
                  value={activity.activityMeetingTypeName}
                  palette={palette}
                  icon={<Task01Icon size={13} color={palette.textMuted} variant="stroke" />}
                  isLast={
                    !activity.activityTopicPurposeName &&
                    !activity.activityShippingName &&
                    !activity.description
                  }
                />
              ) : null}

              {activity.activityTopicPurposeName ? (
                <DetailRow
                  label={t("activity.activityTopicPurpose")}
                  value={activity.activityTopicPurposeName}
                  palette={palette}
                  icon={<Note01Icon size={13} color={palette.textMuted} variant="stroke" />}
                  isLast={!activity.activityShippingName && !activity.description}
                />
              ) : null}

              {activity.activityShippingName ? (
                <DetailRow
                  label={t("activity.activityShipping")}
                  value={activity.activityShippingName}
                  palette={palette}
                  icon={<Briefcase01Icon size={13} color={palette.textMuted} variant="stroke" />}
                  isLast={!activity.description}
                />
              ) : null}

              {activity.description ? (
                <View
                  style={[
                    styles.descriptionCard,
                    {
                      backgroundColor: palette.soft,
                      borderColor: palette.softBorder,
                    },
                  ]}
                >
                  <View style={styles.descriptionHeader}>
                    <Note01Icon size={14} color={palette.textMuted} variant="stroke" />
                    <Text style={[styles.descriptionLabel, { color: palette.textMuted }]}>
                      {t("activity.description")}
                    </Text>
                  </View>

                  <Text style={[styles.description, { color: palette.text }]}>
                    {activity.description}
                  </Text>
                </View>
              ) : null}
            </View>

            {(activity.potentialCustomer || activity.contact || activity.assignedUser) && (
              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.cardBorder,
                    shadowColor: palette.shadow,
                  },
                ]}
              >
                <SectionHeader
                  title={t("activity.relatedInfo")}
                  accent={colors.accent}
                  textColor={palette.text}
                />

                {activity.potentialCustomer ? (
                  <DetailRow
                    label={t("activity.customer")}
                    value={`${activity.potentialCustomer.name}${
                      activity.potentialCustomer.customerCode
                        ? ` (${activity.potentialCustomer.customerCode})`
                        : ""
                    }`}
                    palette={palette}
                    icon={<Briefcase01Icon size={13} color={palette.textMuted} variant="stroke" />}
                    isLast={!activity.contact && !activity.assignedUser}
                  />
                ) : null}

                {activity.contact ? (
                  <DetailRow
                    label={t("activity.contact")}
                    value={
                      activity.contact.fullName ||
                      `${activity.contact.firstName || ""} ${activity.contact.lastName || ""}`.trim()
                    }
                    palette={palette}
                    icon={<UserIcon size={13} color={palette.textMuted} variant="stroke" />}
                    isLast={!activity.assignedUser}
                  />
                ) : null}

                {activity.assignedUser ? (
                  <DetailRow
                    label={t("activity.assignedUser")}
                    value={activity.assignedUser.fullName || activity.assignedUser.userName}
                    palette={palette}
                    icon={<UserIcon size={13} color={palette.textMuted} variant="stroke" />}
                    isLast
                  />
                ) : null}
              </View>
            )}

            {(activity.productName || activity.productCode || activity.erpCustomerCode) && (
              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.cardBorder,
                    shadowColor: palette.shadow,
                  },
                ]}
              >
                <SectionHeader
                  title={t("activity.productInfo")}
                  accent={colors.accent}
                  textColor={palette.text}
                />

                {activity.productName ? (
                  <DetailRow
                    label={t("activity.productName")}
                    value={activity.productName}
                    palette={palette}
                    icon={<Briefcase01Icon size={13} color={palette.textMuted} variant="stroke" />}
                    isLast={!activity.productCode && !activity.erpCustomerCode}
                  />
                ) : null}

                {activity.productCode ? (
                  <DetailRow
                    label={t("activity.productCode")}
                    value={activity.productCode}
                    palette={palette}
                    icon={<Briefcase01Icon size={13} color={palette.textMuted} variant="stroke" />}
                    isLast={!activity.erpCustomerCode}
                  />
                ) : null}

                {activity.erpCustomerCode ? (
                  <DetailRow
                    label={t("activity.erpCustomerCode")}
                    value={activity.erpCustomerCode}
                    palette={palette}
                    icon={<Briefcase01Icon size={13} color={palette.textMuted} variant="stroke" />}
                    isLast
                  />
                ) : null}
              </View>
            )}

            <View
              style={[
                styles.section,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.cardBorder,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              <SectionHeader title={t("activity.systemInfo")} accent={colors.accent} textColor={palette.text} />

              <DetailRow
                label={t("activity.createdDate")}
                value={formatDate(activity.createdDate)}
                palette={palette}
                icon={<Calendar03Icon size={13} color={palette.textMuted} variant="stroke" />}
                isLast={!activity.createdByFullUser && !activity.updatedDate && !activity.updatedByFullUser}
              />

              {activity.createdByFullUser ? (
                <DetailRow
                  label={t("activity.createdBy")}
                  value={activity.createdByFullUser}
                  palette={palette}
                  icon={<UserIcon size={13} color={palette.textMuted} variant="stroke" />}
                  isLast={!activity.updatedDate && !activity.updatedByFullUser}
                />
              ) : null}

              {activity.updatedDate ? (
                <DetailRow
                  label={t("activity.updatedDate")}
                  value={formatDate(activity.updatedDate)}
                  palette={palette}
                  icon={<Calendar03Icon size={13} color={palette.textMuted} variant="stroke" />}
                  isLast={!activity.updatedByFullUser}
                />
              ) : null}

              {activity.updatedByFullUser ? (
                <DetailRow
                  label={t("activity.updatedBy")}
                  value={activity.updatedByFullUser}
                  palette={palette}
                  icon={<UserIcon size={13} color={palette.textMuted} variant="stroke" />}
                  isLast
                />
              ) : null}
            </View>

            {activityId != null ? (
              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.cardBorder,
                    shadowColor: palette.shadow,
                  },
                ]}
              >
                <SectionHeader
                  title={t("common.tabReport")}
                  accent={colors.accent}
                  textColor={palette.text}
                />
                <ReportTab entityId={activityId} ruleType={DocumentRuleType.Activity} />
              </View>
            ) : null}

            {!activity.isCompleted && (
              <TouchableOpacity style={styles.completeButtonWrap} onPress={handleMarkComplete} activeOpacity={0.9}>
                <LinearGradient
                  colors={[colors.success, "#22c55e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.completeButton}
                >
                  <CheckmarkCircle02Icon size={18} color="#FFFFFF" variant="stroke" />
                  <Text style={styles.completeButtonText}>{t("activity.markComplete")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  contentTransparent: {
    flex: 1,
    backgroundColor: "transparent",
  },

  contentContainer: {
    padding: 20,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  errorCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  errorDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
  },

  retryButtonPremium: {
    width: "100%",
  },

  retryButtonGradient: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: -50,
  },

  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  heroCard: {
    padding: 18,
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },

  heroTopRow: {
    marginBottom: 14,
  },

  heroLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  subject: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 6,
  },

  heroSubText: {
    fontSize: 13,
    fontWeight: "500",
  },

  heroStateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
    alignItems: "center",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
  },

  priorityBadgeWrap: {
    position: "relative",
    alignSelf: "flex-start",
  },

  priorityPulse: {
    position: "absolute",
    top: -2,
    right: -2,
    bottom: -2,
    left: -2,
    borderRadius: 999,
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  timelineCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },

  timelineRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },

  timelineDotWrap: {
    width: 24,
    alignItems: "center",
    marginRight: 10,
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 6,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 6,
    marginBottom: 2,
    borderRadius: 999,
  },

  timelineContent: {
    flex: 1,
    paddingBottom: 14,
  },

  timelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  timelineLabel: {
    fontSize: 12,
    fontWeight: "600",
  },

  timelineValue: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },

  heroFooterInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },

  heroFooterText: {
    fontSize: 12,
    fontWeight: "600",
  },

  section: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },

  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 999,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  detailRowCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },

  detailRowInner: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "stretch",
  },

  detailLabelBox: {
    width: "46%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
  },

  detailIconWrap: {
    marginRight: 8,
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },

  detailValueWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 18,
  },

  descriptionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 2,
  },

  descriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  descriptionLabel: {
    fontSize: 13,
    fontWeight: "700",
  },

  description: {
    fontSize: 14,
    lineHeight: 21,
  },

  completeButtonWrap: {
    marginTop: 6,
  },

  completeButton: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },

  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
