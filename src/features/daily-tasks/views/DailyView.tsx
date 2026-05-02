import React, { useCallback, useMemo } from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useDailyTasks } from "../hooks";
import { TaskCard } from "../components";
import type { ActivityDto } from "../../activity/types";
import type { DailyViewProps } from "../types";

function getTodayRange(): { startDate: string; endDate: string } {
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString(),
  };
}

export function DailyView({ onCreateTask }: DailyViewProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const todayRange = useMemo(() => getTodayRange(), []);
  const { data: tasks, isLoading, isError, refetch } = useDailyTasks(todayRange);

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      const aDate = a.startDateTime ?? a.activityDate ?? a.createdDate;
      const bDate = b.startDateTime ?? b.activityDate ?? b.createdDate;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });
  }, [tasks]);

  const renderItem = useCallback(({ item }: { item: ActivityDto }) => {
    return <TaskCard task={item} compact />;
  }, []);

  const keyExtractor = useCallback((item: ActivityDto) => String(item.id), []);

  const total = sortedTasks.length;
  const countBadgeBg = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.06)";
  const countBadgeBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(15, 23, 42, 0.08)";

  const renderHeader = useCallback((): React.ReactElement => {
    return (
      <View style={styles.headerRow}>
        <Text unstyled style={styles.headerTitle} color={colors.textSecondary}>
          {t("dailyTasks.todaysTasks")}
        </Text>
        <View
          style={[
            styles.countBadge,
            { backgroundColor: countBadgeBg, borderColor: countBadgeBorder },
          ]}
        >
          <Text unstyled style={styles.countText} color={colors.text}>
            {t("dailyTasks.taskCount", { count: total })}
          </Text>
        </View>
      </View>
    );
  }, [colors.text, colors.textSecondary, countBadgeBg, countBadgeBorder, t, total]);

  const renderEmpty = useCallback((): React.ReactElement => {
    if (isLoading) return <View />;
    return (
      <View style={styles.emptyContainer}>
        <Text unstyled style={styles.emptyIcon}>
          ✨
        </Text>
        <Text unstyled style={styles.emptyText} color={colors.textMuted}>
          {t("dailyTasks.noDailyTasks")}
        </Text>
        <TouchableOpacity
          style={[styles.emptyAddBtn, { backgroundColor: colors.accent }]}
          onPress={onCreateTask as unknown as () => void}
          activeOpacity={0.85}
        >
          <Text unstyled style={styles.emptyAddBtnText} color="#FFFFFF">
            + {t("dailyTasks.addForDate")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [colors.accent, colors.textMuted, isLoading, onCreateTask, t]);

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
      data={sortedTasks}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyAddBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
