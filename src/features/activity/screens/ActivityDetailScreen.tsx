import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Alert,
  Animated,
  Easing,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useActivity, useDeleteActivity, useUpdateActivity } from "../hooks";
import { activityImageApi } from "../api";
import type { ActivityDto, ActivityImageDto } from "../types";
import { getApiBaseUrl } from "../../../constants/config";
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
  Image02Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
} from "hugeicons-react-native";

function toAbsoluteActivityImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}

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
      sectionBorder: isDark ? "rgba(244,114,182,0.38)" : "rgba(219,39,119,0.22)",
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

  const queryClient = useQueryClient();
  const { data: activity, isLoading, isError, refetch } = useActivity(activityId);
  const deleteActivity = useDeleteActivity();
  const updateActivity = useUpdateActivity();

  const [pickActivityImagePreviewUri, setPickActivityImagePreviewUri] = useState<string | null>(null);
  const [isUploadingActivityImage, setIsUploadingActivityImage] = useState(false);

  const [previewModalIndex, setPreviewModalIndex] = useState<number | null>(null);
  const [previewActiveIndex, setPreviewActiveIndex] = useState(0);
  const activityImagePreviewListRef = useRef<FlatList<ActivityImageDto>>(null);

  const { width: previewWinW, height: previewWinH } = Dimensions.get("window");
  const activityPreviewW = previewWinW * 0.92;
  const activityPreviewFrameH = previewWinH * 0.72;

  const { data: activityImages = [], isLoading: imagesLoading, refetch: refetchActivityImages } = useQuery({
    queryKey: ["activity", "images", activityId],
    queryFn: () => activityImageApi.getByActivityId(activityId!),
    enabled: typeof activityId === "number" && activityId > 0,
  });

  const visibleActivityImages = useMemo(
    () => activityImages.filter((item) => !!toAbsoluteActivityImageUrl(item.imageUrl)),
    [activityImages]
  );

  const handleActivityImagePreviewMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (visibleActivityImages.length === 0) return;
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / activityPreviewW);
      setPreviewActiveIndex(Math.max(0, Math.min(idx, visibleActivityImages.length - 1)));
    },
    [activityPreviewW, visibleActivityImages.length]
  );

  const closeActivityImagePreview = useCallback(() => {
    setPreviewModalIndex(null);
  }, []);

  const openActivityImagePreviewAt = useCallback((index: number) => {
    setPreviewModalIndex(index);
    setPreviewActiveIndex(index);
  }, []);

  const goActivityPreviewPrev = useCallback(() => {
    if (visibleActivityImages.length <= 1) return;
    const next = Math.max(0, previewActiveIndex - 1);
    activityImagePreviewListRef.current?.scrollToIndex({ index: next, animated: true });
    setPreviewActiveIndex(next);
  }, [previewActiveIndex, visibleActivityImages.length]);

  const goActivityPreviewNext = useCallback(() => {
    if (visibleActivityImages.length <= 1) return;
    const next = Math.min(visibleActivityImages.length - 1, previewActiveIndex + 1);
    activityImagePreviewListRef.current?.scrollToIndex({ index: next, animated: true });
    setPreviewActiveIndex(next);
  }, [previewActiveIndex, visibleActivityImages.length]);

  const activityImagePreviewCaption =
    previewModalIndex !== null && visibleActivityImages[previewActiveIndex]
      ? visibleActivityImages[previewActiveIndex].imageDescription?.trim() || t("activity.imageDefaultDescription")
      : "";

  const activityDetailPickPreviewTheme = useMemo(
    () => ({
      cardBg: isDark ? "rgba(23,10,38,0.99)" : "rgba(255,255,255,0.98)",
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(226,232,240,0.95)",
      title: palette.text,
      text: palette.textMuted,
      cancelBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.12)",
      cancelText: palette.text,
      confirmBg: isDark ? "rgba(236,72,153,0.22)" : "rgba(236,72,153,0.12)",
      confirmBorder: `${colors.accent}44`,
      confirmText: colors.accent,
    }),
    [colors.accent, isDark, palette.text, palette.textMuted]
  );

  const openActivityDetailGalleryPicker = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(t("common.warning"), t("activity.imagePermissionRequired"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setPickActivityImagePreviewUri(result.assets[0].uri);
  }, [t]);

  const openActivityDetailCameraPicker = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(t("common.warning"), t("activity.imagePermissionRequired"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setPickActivityImagePreviewUri(result.assets[0].uri);
  }, [t]);

  const handleAddActivityImageFromDetail = useCallback(() => {
    if (!activityId || isUploadingActivityImage) return;
    Alert.alert(t("activity.addImage"), t("customer.chooseImageSource"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("customer.fromGallery"),
        onPress: () => {
          void openActivityDetailGalleryPicker();
        },
      },
      {
        text: t("customer.fromCamera"),
        onPress: () => {
          void openActivityDetailCameraPicker();
        },
      },
    ]);
  }, [activityId, isUploadingActivityImage, openActivityDetailCameraPicker, openActivityDetailGalleryPicker, t]);

  const handleCancelActivityDetailImagePick = useCallback(() => {
    if (isUploadingActivityImage) return;
    setPickActivityImagePreviewUri(null);
  }, [isUploadingActivityImage]);

  const handleConfirmActivityDetailImagePick = useCallback(async () => {
    if (!activityId || !pickActivityImagePreviewUri) return;
    setIsUploadingActivityImage(true);
    try {
      await activityImageApi.upload(activityId, [
        { uri: pickActivityImagePreviewUri, description: t("activity.imageDefaultDescription") },
      ]);
      setPickActivityImagePreviewUri(null);
      void queryClient.invalidateQueries({ queryKey: ["activity", "images", activityId] });
      await refetchActivityImages();
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : t("activity.imageUploadError");
      Alert.alert(t("common.error"), message);
    } finally {
      setIsUploadingActivityImage(false);
    }
  }, [activityId, pickActivityImagePreviewUri, queryClient, refetchActivityImages, t]);

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
            </LinearGradient>

            <View
              style={[
                styles.section,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.sectionBorder,
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
                    borderColor: palette.sectionBorder,
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

            {activityId != null && activityId > 0 ? (
              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.sectionBorder,
                    shadowColor: palette.shadow,
                  },
                ]}
              >
                <View style={styles.activityImagesHeaderRow}>
                  <View style={styles.activityImagesHeaderLeft}>
                    <View
                      style={[
                        styles.activityImagesHeaderIcon,
                        {
                          backgroundColor: `${colors.accent}12`,
                          borderColor: `${colors.accent}22`,
                        },
                      ]}
                    >
                      <Image02Icon size={16} color={colors.accent} variant="stroke" />
                    </View>
                    <Text style={[styles.activityImagesHeaderTitle, { color: palette.text }]} numberOfLines={1}>
                      {t("activity.images")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.activityImagesHeaderAddBtn}
                    onPress={handleAddActivityImageFromDetail}
                    disabled={imagesLoading || isUploadingActivityImage}
                    activeOpacity={0.82}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {isUploadingActivityImage ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Text style={[styles.activityImagesHeaderAddText, { color: colors.success }]}>
                        {t("activity.addImage")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {imagesLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} style={styles.activityImagesLoader} />
                ) : visibleActivityImages.length === 0 ? (
                  <View style={styles.activityDetailImagesEmpty}>
                    <Image02Icon size={22} color={colors.accent} variant="stroke" />
                    <Text style={[styles.activityDetailImagesEmptyTitle, { color: palette.text }]}>
                      {t("activity.noImages")}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.activityDetailImagesEmptyAddBtn,
                        {
                          backgroundColor: `${colors.success}14`,
                          borderColor: `${colors.success}35`,
                        },
                      ]}
                      onPress={handleAddActivityImageFromDetail}
                      disabled={isUploadingActivityImage}
                      activeOpacity={0.88}
                    >
                      {isUploadingActivityImage ? (
                        <ActivityIndicator size="small" color={colors.success} />
                      ) : (
                        <Text style={[styles.activityDetailImagesEmptyAddText, { color: colors.success }]}>
                          {t("activity.addImage")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.activityDetailImageStripOuter}>
                    <View style={styles.activityDetailImageStripScrollWrap}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.activityDetailImageScrollContent}
                      >
                        {visibleActivityImages.map((item, index) => {
                          const uri = toAbsoluteActivityImageUrl(item.imageUrl);
                          if (!uri) return null;
                          const caption =
                            item.imageDescription?.trim() || t("activity.imageDefaultDescription");
                          return (
                            <TouchableOpacity
                              key={item.id}
                              activeOpacity={0.88}
                              onPress={() => openActivityImagePreviewAt(index)}
                              style={[
                                styles.activityDetailImageCard,
                                {
                                  borderColor: isDark ? "rgba(244, 114, 182, 0.62)" : "rgba(219, 39, 119, 0.48)",
                                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
                                },
                              ]}
                            >
                              <Image
                                source={{ uri }}
                                style={styles.activityDetailImagePhoto}
                                resizeMode="cover"
                              />
                              <Text style={[styles.activityDetailImageCaption, { color: palette.text }]} numberOfLines={2}>
                                {caption}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      {visibleActivityImages.length > 1 ? (
                        <>
                          <View
                            style={[styles.activityDetailImageStripChevron, styles.activityDetailImageStripChevronLeft]}
                            pointerEvents="none"
                          >
                            <ArrowLeft01Icon size={20} color={palette.textMuted} variant="stroke" strokeWidth={2} />
                          </View>
                          <View
                            style={[styles.activityDetailImageStripChevron, styles.activityDetailImageStripChevronRight]}
                            pointerEvents="none"
                          >
                            <ArrowRight01Icon size={20} color={palette.textMuted} variant="stroke" strokeWidth={2} />
                          </View>
                        </>
                      ) : null}
                    </View>
                    {visibleActivityImages.length > 1 ? (
                      <Text style={[styles.activityDetailImageStripHint, { color: palette.textMuted }]} pointerEvents="none">
                        {t("customer.imageGallerySwipeHint")}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}

            {(activity.productName || activity.productCode || activity.erpCustomerCode) && (
              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.sectionBorder,
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
                  borderColor: palette.sectionBorder,
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
        borderColor: palette.sectionBorder,
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

      <Modal
        visible={pickActivityImagePreviewUri != null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelActivityDetailImagePick}
      >
        <View style={styles.activityDetailPickPreviewOverlay}>
          <View
            style={[
              styles.activityDetailPickPreviewCard,
              {
                backgroundColor: activityDetailPickPreviewTheme.cardBg,
                borderColor: activityDetailPickPreviewTheme.borderColor,
              },
            ]}
          >
            <Text style={[styles.activityDetailPickPreviewTitle, { color: activityDetailPickPreviewTheme.title }]}>
              {t("customer.imagePreview")}
            </Text>
            <Text style={[styles.activityDetailPickPreviewSubtitle, { color: activityDetailPickPreviewTheme.text }]}>
              {t("customer.confirmAddImage")}
            </Text>
            {pickActivityImagePreviewUri ? (
              <Image
                source={{ uri: pickActivityImagePreviewUri }}
                style={styles.activityDetailPickPreviewImage}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.activityDetailPickPreviewActions}>
              <TouchableOpacity
                style={[
                  styles.activityDetailPickPreviewButton,
                  { backgroundColor: activityDetailPickPreviewTheme.cancelBg },
                ]}
                onPress={handleCancelActivityDetailImagePick}
                disabled={isUploadingActivityImage}
              >
                <Text style={[styles.activityDetailPickPreviewButtonText, { color: activityDetailPickPreviewTheme.cancelText }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.activityDetailPickPreviewButton,
                  {
                    backgroundColor: activityDetailPickPreviewTheme.confirmBg,
                    borderColor: activityDetailPickPreviewTheme.confirmBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  void handleConfirmActivityDetailImagePick();
                }}
                disabled={isUploadingActivityImage}
              >
                {isUploadingActivityImage ? (
                  <ActivityIndicator size="small" color={activityDetailPickPreviewTheme.confirmText} />
                ) : (
                  <Text
                    style={[styles.activityDetailPickPreviewButtonText, { color: activityDetailPickPreviewTheme.confirmText }]}
                  >
                    {t("common.upload")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={previewModalIndex !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeActivityImagePreview}
      >
        <View style={styles.activityImageGalleryPreviewRoot}>
          <Pressable
            style={[
              styles.activityImageGalleryPreviewBackdrop,
              { backgroundColor: isDark ? "rgba(0,0,0,0.94)" : "rgba(0,0,0,0.82)" },
            ]}
            onPress={closeActivityImagePreview}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
          />
          {previewModalIndex !== null && visibleActivityImages.length > 0 ? (
            <View style={[styles.activityImageGalleryPreviewColumn, { width: activityPreviewW }]} pointerEvents="box-none">
              <View
                style={[
                  styles.activityImageGalleryPreviewFrame,
                  {
                    height: activityPreviewFrameH,
                    borderColor: isDark ? "rgba(219, 39, 119, 0.42)" : "rgba(219, 39, 119, 0.26)",
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.5)" : "rgba(255, 255, 255, 0.98)",
                  },
                ]}
              >
                <FlatList
                  ref={activityImagePreviewListRef}
                  data={visibleActivityImages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => String(item.id)}
                  initialScrollIndex={previewModalIndex}
                  getItemLayout={(_, index) => ({
                    length: activityPreviewW,
                    offset: activityPreviewW * index,
                    index,
                  })}
                  onMomentumScrollEnd={handleActivityImagePreviewMomentumEnd}
                  onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                      activityImagePreviewListRef.current?.scrollToOffset({
                        offset: info.index * activityPreviewW,
                        animated: false,
                      });
                    }, 120);
                  }}
                  style={[styles.activityImageGalleryPreviewFlatList, { height: activityPreviewFrameH }]}
                  renderItem={({ item }) => {
                    const uri = toAbsoluteActivityImageUrl(item.imageUrl);
                    if (!uri) {
                      return <View style={{ width: activityPreviewW, height: activityPreviewFrameH }} />;
                    }
                    return (
                      <View style={[styles.activityImageGalleryPreviewSlide, { width: activityPreviewW, height: activityPreviewFrameH }]}>
                        <Image source={{ uri }} style={styles.activityImageGalleryPreviewImage} resizeMode="contain" />
                      </View>
                    );
                  }}
                />
                <Pressable
                  style={[
                    styles.activityImageGalleryPreviewCloseBtn,
                    {
                      backgroundColor: isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.94)",
                      borderColor: isDark ? "rgba(219, 39, 119, 0.35)" : "rgba(219, 39, 119, 0.2)",
                    },
                  ]}
                  onPress={closeActivityImagePreview}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                >
                  <Cancel01Icon size={18} color={isDark ? "#e2e8f0" : "#475569"} variant="stroke" />
                </Pressable>
                {visibleActivityImages.length > 1 ? (
                  <>
                    <Pressable
                      style={[
                        styles.activityImageGalleryPreviewNavBtn,
                        styles.activityImageGalleryPreviewNavLeft,
                        {
                          backgroundColor: isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.88)",
                          borderColor: isDark ? "rgba(219, 39, 119, 0.35)" : "rgba(219, 39, 119, 0.2)",
                          opacity: previewActiveIndex <= 0 ? 0.4 : 1,
                        },
                      ]}
                      onPress={goActivityPreviewPrev}
                      disabled={previewActiveIndex <= 0}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={t("customer.imagePreviewPrevious")}
                    >
                      <ArrowLeft01Icon size={20} color={isDark ? "#e2e8f0" : "#475569"} variant="stroke" />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.activityImageGalleryPreviewNavBtn,
                        styles.activityImageGalleryPreviewNavRight,
                        {
                          backgroundColor: isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.88)",
                          borderColor: isDark ? "rgba(219, 39, 119, 0.35)" : "rgba(219, 39, 119, 0.2)",
                          opacity: previewActiveIndex >= visibleActivityImages.length - 1 ? 0.4 : 1,
                        },
                      ]}
                      onPress={goActivityPreviewNext}
                      disabled={previewActiveIndex >= visibleActivityImages.length - 1}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={t("customer.imagePreviewNext")}
                    >
                      <ArrowRight01Icon size={20} color={isDark ? "#e2e8f0" : "#475569"} variant="stroke" />
                    </Pressable>
                  </>
                ) : null}
              </View>
              {visibleActivityImages.length > 1 ? (
                <Text style={[styles.activityImageGalleryPreviewCounter, { color: palette.textMuted }]}>
                  {t("customer.imagePreviewCounter", {
                    current: previewActiveIndex + 1,
                    total: visibleActivityImages.length,
                  })}
                </Text>
              ) : null}
              <Text style={[styles.activityImageGalleryPreviewCaption, { color: palette.textSoft }]} numberOfLines={3}>
                {activityImagePreviewCaption}
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
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

  section: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
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

  activityImagesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  activityImagesHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },

  activityImagesHeaderAddBtn: {
    minWidth: 88,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  activityImagesHeaderAddText: {
    fontSize: 13,
    fontWeight: "700",
  },

  activityImagesHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  activityImagesHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
    flex: 1,
    minWidth: 0,
  },

  activityImagesLoader: {
    marginTop: 4,
    alignSelf: "flex-start",
  },

  activityDetailImagesEmpty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },

  activityDetailImagesEmptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  activityDetailImagesEmptySub: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 17,
  },

  activityDetailImagesEmptyAddBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 160,
    alignItems: "center",
    justifyContent: "center",
  },

  activityDetailImagesEmptyAddText: {
    fontSize: 14,
    fontWeight: "700",
  },

  activityDetailPickPreviewOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.72)",
  },

  activityDetailPickPreviewCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },

  activityDetailPickPreviewTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },

  activityDetailPickPreviewSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 14,
  },

  activityDetailPickPreviewImage: {
    width: "100%",
    height: 280,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  activityDetailPickPreviewActions: {
    flexDirection: "row",
    gap: 12,
  },

  activityDetailPickPreviewButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  activityDetailPickPreviewButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },

  activityDetailImageStripOuter: {
    width: "100%",
  },

  activityDetailImageStripScrollWrap: {
    position: "relative",
    width: "100%",
  },

  activityDetailImageScrollContent: {
    gap: 14,
    paddingRight: 8,
    paddingVertical: 6,
    paddingLeft: 2,
  },

  activityDetailImageCard: {
    width: 200,
    borderRadius: 20,
    borderWidth: 2.5,
    overflow: "hidden",
  },

  activityDetailImagePhoto: {
    width: "100%",
    height: 156,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  activityDetailImageCaption: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "500",
  },

  activityDetailImageStripChevron: {
    position: "absolute",
    top: 70,
    zIndex: 2,
    opacity: 0.85,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    borderRadius: 999,
    padding: 6,
  },

  activityDetailImageStripChevronLeft: {
    left: 4,
  },

  activityDetailImageStripChevronRight: {
    right: 4,
  },

  activityDetailImageStripHint: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 15,
    paddingHorizontal: 8,
  },

  activityImageGalleryPreviewRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  activityImageGalleryPreviewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  activityImageGalleryPreviewColumn: {
    alignItems: "center",
    zIndex: 1,
  },

  activityImageGalleryPreviewFrame: {
    width: "100%",
    position: "relative",
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },

  activityImageGalleryPreviewFlatList: {
    width: "100%",
  },

  activityImageGalleryPreviewSlide: {
    justifyContent: "center",
    alignItems: "center",
  },

  activityImageGalleryPreviewImage: {
    width: "100%",
    height: "100%",
  },

  activityImageGalleryPreviewNavBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    zIndex: 3,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  activityImageGalleryPreviewNavLeft: {
    left: 8,
  },

  activityImageGalleryPreviewNavRight: {
    right: 8,
  },

  activityImageGalleryPreviewCounter: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  activityImageGalleryPreviewCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  activityImageGalleryPreviewCaption: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 8,
    maxWidth: "92%",
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
    pdfCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
    marginBottom: 16,
    shadowOpacity: 0.03,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  pdfHeader: {
    gap: 2,
  },

  pdfHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },

  pdfHeaderSub: {
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 13,
  },

  label: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
    lineHeight: 12,
  },

  reportTemplateBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  reportTabWrap: {
    marginTop: 2,
  },

  previewSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },

  previewTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 14,
  },

  previewInfoText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
  },
});
