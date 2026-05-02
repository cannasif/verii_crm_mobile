import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useTranslation } from "react-i18next";
import { Add01Icon } from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useDailyTasks } from "../hooks";
import { TaskCard } from "../components";
import type { ActivityDto } from "../../activity/types";
import type { CalendarViewProps } from "../types";

LocaleConfig.locales["tr"] = {
  monthNames: [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ],
  monthNamesShort: [
    "Oca", "Şub", "Mar", "Nis", "May", "Haz",
    "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
  ],
  dayNames: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
  dayNamesShort: ["PAZ", "PZT", "SAL", "ÇAR", "PER", "CUM", "CMT"],
  today: "Bugün",
};

LocaleConfig.defaultLocale = "tr";

const PLANNED_COLOR = "#3B82F6";
const COMPLETED_COLOR = "#10B981";

function getMonthRange(date: Date): { startDate: string; endDate: string } {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  return {
    startDate: startOfMonth.toISOString(),
    endDate: endOfMonth.toISOString(),
  };
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isTaskCompleted(task: ActivityDto): boolean {
  if (task.isCompleted) return true;
  const status = String(task.status ?? "").toLowerCase().replace(/\s+/g, "");
  return status === "completed";
}

interface MarkedStyles {
  [dateKey: string]: {
    customStyles?: {
      container?: Record<string, unknown>;
      text?: Record<string, unknown>;
    };
    dots?: { key: string; color: string }[];
  };
}

export function CalendarView({
  selectedDate,
  onDateSelect,
  onAddForDate,
}: CalendarViewProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthRange = useMemo(() => getMonthRange(currentMonth), [currentMonth]);
  const { data: tasks, isLoading } = useDailyTasks(monthRange);

  const tasksByDate = useMemo(() => {
    const map: Record<string, ActivityDto[]> = {};
    if (!tasks) return map;
    tasks.forEach((task) => {
      const taskDate = task.startDateTime ?? task.activityDate ?? task.createdDate;
      const key = formatDateKey(new Date(taskDate));
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  const markedDates = useMemo(() => {
    const marks: MarkedStyles = {};
    const selectedCircleBg = isDark ? "rgba(236, 72, 153, 0.18)" : "rgba(236, 72, 153, 0.1)";

    Object.keys(tasksByDate).forEach((key) => {
      const tasksForDate = tasksByDate[key];
      const hasCompleted = tasksForDate.some(isTaskCompleted);
      const hasPlanned = tasksForDate.some((task) => !isTaskCompleted(task));

      const dots: { key: string; color: string }[] = [];
      if (hasPlanned) dots.push({ key: "planned", color: PLANNED_COLOR });
      if (hasCompleted) dots.push({ key: "completed", color: COMPLETED_COLOR });

      marks[key] = { dots };
    });

    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] ?? {}),
        customStyles: {
          container: {
            borderWidth: 1.5,
            borderColor: colors.accent,
            borderRadius: 10,
            backgroundColor: selectedCircleBg,
          },
          text: {
            color: colors.accent,
            fontWeight: "700",
          },
        },
      };
    }

    return marks;
  }, [colors.accent, isDark, selectedDate, tasksByDate]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasksByDate[selectedDate] ?? [];
  }, [selectedDate, tasksByDate]);

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      onDateSelect(day.dateString);
    },
    [onDateSelect]
  );

  const handleMonthChange = useCallback((month: { year: number; month: number }) => {
    setCurrentMonth(new Date(month.year, month.month - 1, 1));
  }, []);

  const handleAddForSelected = useCallback(() => {
    if (selectedDate) onAddForDate(selectedDate);
  }, [onAddForDate, selectedDate]);

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: "transparent",
      calendarBackground: "transparent",
      textSectionTitleColor: colors.textMuted,
      todayTextColor: colors.accent,
      dayTextColor: colors.text,
      textDisabledColor: isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(15, 23, 42, 0.22)",
      arrowColor: colors.accent,
      monthTextColor: colors.text,
      textDayFontWeight: "600" as const,
      textMonthFontWeight: "700" as const,
      textDayHeaderFontWeight: "700" as const,
      textDayFontSize: 14,
      textMonthFontSize: 17,
      textDayHeaderFontSize: 11,
    }),
    [colors.accent, colors.text, colors.textMuted, isDark]
  );

  const selectedDateTitle = useMemo(() => {
    if (!selectedDate) return null;
    return new Date(selectedDate).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  const cardBg = isDark ? "rgba(255, 255, 255, 0.03)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.06)";

  const renderListHeader = useCallback((): React.ReactElement => {
    return (
      <>
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          {isLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: PLANNED_COLOR }]} />
              <Text unstyled style={styles.legendText} color={colors.textSecondary}>
                {t("dailyTasks.legendPlanned")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COMPLETED_COLOR }]} />
              <Text unstyled style={styles.legendText} color={colors.textSecondary}>
                {t("dailyTasks.legendCompleted")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text unstyled style={styles.legendText} color={colors.textSecondary}>
                {t("dailyTasks.legendSelected")}
              </Text>
            </View>
          </View>

          <Calendar
            markingType="custom"
            markedDates={markedDates as Record<string, object>}
            onDayPress={handleDayPress}
            onMonthChange={handleMonthChange}
            theme={calendarTheme}
            enableSwipeMonths
            firstDay={1}
            style={styles.calendar}
          />
        </View>

        {selectedDateTitle ? (
          <View style={styles.taskListHeader}>
            <Text unstyled style={styles.taskListTitle} color={colors.text}>
              {selectedDateTitle}
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
              onPress={handleAddForSelected}
              activeOpacity={0.85}
            >
              <Add01Icon size={18} color="#FFFFFF" variant="stroke" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        ) : null}
      </>
    );
  }, [
    cardBg,
    cardBorder,
    calendarTheme,
    colors.accent,
    colors.text,
    colors.textSecondary,
    handleAddForSelected,
    handleDayPress,
    handleMonthChange,
    isLoading,
    markedDates,
    selectedDateTitle,
    t,
  ]);

  const renderEmpty = useCallback((): React.ReactElement => {
    if (!selectedDate) {
      return (
        <View style={styles.hintContainer}>
          <Text unstyled style={styles.hintText} color={colors.textMuted}>
            {t("dailyTasks.selectDateHint")}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text unstyled style={styles.emptyText} color={colors.textMuted}>
          {t("dailyTasks.noTasksForDate")}
        </Text>
        <TouchableOpacity
          style={[styles.addForDateBtn, { backgroundColor: colors.accent }]}
          onPress={handleAddForSelected}
          activeOpacity={0.85}
        >
          <Add01Icon size={16} color="#FFFFFF" variant="stroke" strokeWidth={3} />
          <Text unstyled style={styles.addForDateBtnText} color="#FFFFFF">
            {t("dailyTasks.addForDate")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [colors.accent, colors.textMuted, handleAddForSelected, selectedDate, t]);

  const renderItem = useCallback(({ item }: { item: ActivityDto }) => {
    return <TaskCard task={item} compact />;
  }, []);

  const keyExtractor = useCallback((item: ActivityDto) => String(item.id), []);

  return (
    <FlatList
      style={styles.container}
      data={selectedTasks}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={renderListHeader}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  calendarCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 18,
  },
  calendar: {
    paddingBottom: 6,
  },
  loadingOverlay: {
    position: "absolute",
    top: 12,
    right: 16,
    zIndex: 1,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  taskListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  taskListTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  hintContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  hintText: {
    fontSize: 13,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 14,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  addForDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addForDateBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
