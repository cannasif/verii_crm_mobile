import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  TelephoneIcon,
  UserGroupIcon,
  Mail01Icon,
  Location04Icon,
  Note01Icon,
  Invoice01Icon,
  ShoppingCart01Icon,
  Task01Icon,
  Clock01Icon,
} from "hugeicons-react-native";
import { useRouter } from "expo-router";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useDailyTasks } from "../hooks";
import type { ActivityDto } from "../../activity/types";
import type { WeeklyViewProps } from "../types";

function getWeekRange(): { startDate: string; endDate: string; monday: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    startDate: monday.toISOString(),
    endDate: sunday.toISOString(),
    monday,
  };
}

const WEEK_HOURS: number[] = Array.from({ length: 13 }, (_, index) => index + 8);
const WEEKDAY_SHORT_TR = ["PZT", "SAL", "ÇAR", "PER", "CUM", "CMT", "PAZ"];

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    day.setHours(0, 0, 0, 0);
    return day;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function normalizeTypeKey(type: string): string {
  return type
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

function getActivityTypeName(task: ActivityDto): string {
  if (typeof task.activityType === "string") return task.activityType;
  if (
    task.activityType &&
    typeof task.activityType === "object" &&
    typeof task.activityType.name === "string"
  ) {
    return task.activityType.name;
  }
  return task.activityTypeName ?? "";
}

function getTypeColor(type: string): string {
  const key = normalizeTypeKey(type);
  if (["call", "telefon", "arama", "phone"].includes(key)) return "#3B82F6";
  if (["meeting", "toplanti", "gorusme"].includes(key)) return "#EC4899";
  if (["email", "eposta", "mail", "e-posta"].includes(key)) return "#06B6D4";
  if (["visit", "ziyaret", "yerindeziyaret"].includes(key)) return "#3B82F6";
  if (["note", "not", "notlar"].includes(key)) return "#F59E0B";
  if (["quote", "teklif"].includes(key)) return "#8B5CF6";
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

function getActivitiesStartingInHour(
  tasks: ActivityDto[],
  day: Date,
  hour: number
): ActivityDto[] {
  return tasks.filter((activity) => {
    const startStr = activity.startDateTime ?? activity.activityDate;
    if (!startStr) return false;
    const start = new Date(startStr);
    return isSameDay(start, day) && start.getHours() === hour;
  });
}

export function WeeklyView({ onCreateTask }: WeeklyViewProps): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const weekRange = useMemo(() => getWeekRange(), []);
  const weekDays = useMemo(() => getWeekDays(weekRange.monday), [weekRange.monday]);
  const { data: tasks, isLoading, isError, refetch } = useDailyTasks({
    startDate: weekRange.startDate,
    endDate: weekRange.endDate,
  });
  const safeTasks = tasks ?? [];

  const today = useMemo(() => new Date(), []);
  const initialIndex = useMemo(() => {
    const todayIndex = weekDays.findIndex((day) => isSameDay(day, today));
    return todayIndex === -1 ? 0 : todayIndex;
  }, [today, weekDays]);

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const selectedDay = weekDays[selectedIndex] ?? weekDays[0];

  const emptyBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.1)";
  const emptySlotBg = isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(15, 23, 42, 0.02)";
  const dayChipBg = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(15, 23, 42, 0.03)";
  const dayChipBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";

  const handleSlotPress = useCallback(
    (day: Date, hour: number) => {
      const start = new Date(day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(day);
      end.setHours(hour + 1, 0, 0, 0);
      onCreateTask(start.toISOString(), end.toISOString());
    },
    [onCreateTask]
  );

  const handleTaskPress = useCallback(
    (task: ActivityDto) => {
      router.push(`/(tabs)/activities/${task.id}`);
    },
    [router]
  );

  const renderDayChip = useCallback(
    (day: Date, index: number) => {
      const isActive = index === selectedIndex;
      const isToday = isSameDay(day, today);
      const weekdayLabel = WEEKDAY_SHORT_TR[index];
      const activeColor = colors.accent;

      return (
        <TouchableOpacity
          key={day.toISOString()}
          style={[
            styles.dayChip,
            {
              backgroundColor: isActive ? `${activeColor}18` : dayChipBg,
              borderColor: isActive ? activeColor : dayChipBorder,
            },
          ]}
          onPress={() => setSelectedIndex(index)}
          activeOpacity={0.85}
        >
          <Text
            unstyled
            style={styles.dayChipWeekday}
            color={isActive ? activeColor : colors.textMuted}
          >
            {weekdayLabel}
          </Text>
          <Text
            unstyled
            style={styles.dayChipNumber}
            color={isActive ? activeColor : colors.text}
          >
            {String(day.getDate()).padStart(2, "0")}
          </Text>
          {isToday ? (
            <View style={[styles.dayChipDot, { backgroundColor: activeColor }]} />
          ) : (
            <View style={styles.dayChipDotSpacer} />
          )}
        </TouchableOpacity>
      );
    },
    [colors.accent, colors.text, colors.textMuted, dayChipBg, dayChipBorder, selectedIndex, today]
  );

  const renderSlot = useCallback(
    (hour: number) => {
      const slotActivities = getActivitiesStartingInHour(safeTasks, selectedDay, hour);

      return (
        <View key={`slot-${hour}`} style={styles.hourRow}>
          <Text unstyled style={styles.hourLabel} color={colors.textMuted}>
            {formatHour(hour)}
          </Text>

          <View style={styles.slotContainer}>
            {slotActivities.length > 0 ? (
              <View style={styles.eventStack}>
                {slotActivities.map((activity) => {
                  const typeName = getActivityTypeName(activity);
                  const typeColor = getTypeColor(typeName);
                  const startStr = activity.startDateTime ?? activity.activityDate;
                  const endStr = activity.endDateTime;
                  const timeLabel = startStr
                    ? endStr
                      ? `${formatTime(new Date(startStr))} - ${formatTime(new Date(endStr))}`
                      : formatTime(new Date(startStr))
                    : "";

                  return (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.eventCard,
                        {
                          backgroundColor: `${typeColor}14`,
                          borderColor: `${typeColor}66`,
                        },
                      ]}
                      onPress={() => handleTaskPress(activity)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.eventAccent, { backgroundColor: typeColor }]} />
                      <View style={styles.eventBody}>
                        <Text
                          unstyled
                          style={styles.eventTitle}
                          color={colors.text}
                          numberOfLines={1}
                        >
                          {activity.subject}
                        </Text>
                        <View style={styles.eventMeta}>
                          {renderTypeIcon(typeName, 12, typeColor)}
                          <Text unstyled style={styles.eventTime} color={typeColor}>
                            {timeLabel}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.emptySlot,
                  { borderColor: emptyBorder, backgroundColor: emptySlotBg },
                ]}
                onPress={() => handleSlotPress(selectedDay, hour)}
                activeOpacity={0.75}
              >
                <Text unstyled style={styles.emptySlotPlus} color={colors.textMuted}>
                  +
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [
      colors.text,
      colors.textMuted,
      emptyBorder,
      emptySlotBg,
      handleSlotPress,
      handleTaskPress,
      safeTasks,
      selectedDay,
    ]
  );

  const renderListHeader = useCallback((): React.ReactElement => {
    return (
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysRow}
        >
          {weekDays.map((day, index) => renderDayChip(day, index))}
        </ScrollView>

        <View style={styles.selectedDayInfo}>
          <Clock01Icon
            size={14}
            color={colors.textMuted}
            variant="stroke"
            strokeWidth={2}
          />
          <Text unstyled style={styles.selectedDayInfoText} color={colors.textMuted}>
            {selectedDay.toLocaleDateString("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
      </View>
    );
  }, [colors.textMuted, renderDayChip, selectedDay, weekDays]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Text unstyled style={styles.errorText} color={colors.error}>
          {t("common.error")}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text unstyled style={styles.retryText} color={colors.accent}>
            {t("common.retry")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={WEEK_HOURS}
      keyExtractor={(hour) => String(hour)}
      renderItem={({ item }) => renderSlot(item)}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={renderListHeader}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  daysRow: {
    paddingVertical: 8,
    gap: 10,
  },
  dayChip: {
    width: 64,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dayChipWeekday: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  dayChipNumber: {
    fontSize: 18,
    fontWeight: "800",
  },
  dayChipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  dayChipDotSpacer: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
  selectedDayInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 6,
    marginLeft: 2,
  },
  selectedDayInfoText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "capitalize",
  },
  hourRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 6,
    minHeight: 56,
  },
  hourLabel: {
    width: 50,
    fontSize: 12,
    fontWeight: "600",
    paddingTop: 12,
  },
  slotContainer: {
    flex: 1,
  },
  emptySlot: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  emptySlotPlus: {
    fontSize: 20,
    fontWeight: "500",
  },
  eventStack: {
    gap: 8,
  },
  eventCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 54,
  },
  eventAccent: {
    width: 4,
  },
  eventBody: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: "600",
  },
});
