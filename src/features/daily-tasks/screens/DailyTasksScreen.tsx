import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { Add01Icon } from "hugeicons-react-native";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useToastStore } from "../../../store/toast";
import { useAuthStore } from "../../../store/auth";
import { WeeklyView, DailyView, CalendarView } from "../views";
import { useCreateActivity, useActivityTypes } from "../../activity/hooks";
import { buildCreateActivityPayload } from "../../activity/utils/buildCreateActivityPayload";
import type { ViewMode } from "../types";

const TAB_ITEMS: { key: ViewMode; labelKey: string }[] = [
  { key: "weekly", labelKey: "dailyTasks.weekly" },
  { key: "daily", labelKey: "dailyTasks.daily" },
  { key: "calendar", labelKey: "dailyTasks.calendar" },
];

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function DailyTasksScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const showToast = useToastStore((state) => state.showToast);

  const [activeTab, setActiveTab] = useState<ViewMode>("daily");
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [quickAddSubject, setQuickAddSubject] = useState("");

  const user = useAuthStore((state) => state.user);
  const { data: activityTypes } = useActivityTypes();
  const createActivity = useCreateActivity();

  const contentBackground = isDark ? "#0c0516" : colors.background;
  const quickAddBg = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(15, 23, 42, 0.03)";
  const quickAddBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";
  const tabContainerBg = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(15, 23, 42, 0.04)";

  const todayDateString = useMemo(() => formatDateKey(new Date()), []);

  const getInitialDateForCreate = useCallback((): string => {
    if (activeTab === "calendar" && calendarSelectedDate) {
      const selectedDate = new Date(calendarSelectedDate);
      selectedDate.setHours(9, 0, 0, 0);
      return selectedDate.toISOString();
    }
    return new Date().toISOString();
  }, [activeTab, calendarSelectedDate]);

  const handleCreateTask = useCallback(() => {
    const initialDate = getInitialDateForCreate();
    router.push({
      pathname: "/(tabs)/activities/create",
      params: { initialDate },
    });
  }, [router, getInitialDateForCreate]);

  const handleCreateTaskWithDate = useCallback(
    (dateString: string) => {
      const date = new Date(dateString);
      date.setHours(9, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(10, 0, 0, 0);
      router.push({
        pathname: "/(tabs)/activities/create",
        params: {
          initialDate: date.toISOString(),
          initialStartDateTime: date.toISOString(),
          initialEndDateTime: endDate.toISOString(),
        },
      });
    },
    [router]
  );

  const handleCreateTaskForSlot = useCallback(
    (startDateTime: string, endDateTime: string) => {
      router.push({
        pathname: "/(tabs)/activities/create",
        params: {
          initialDate: startDateTime,
          initialStartDateTime: startDateTime,
          initialEndDateTime: endDateTime,
        },
      });
    },
    [router]
  );

  const handleQuickAdd = useCallback(async () => {
    if (!quickAddSubject.trim()) return;

    Keyboard.dismiss();

    try {
      const payload = buildCreateActivityPayload(
        {
          subject: quickAddSubject.trim(),
          activityType: "Görev",
          status: "Scheduled",
          isCompleted: false,
          activityDate: new Date().toISOString(),
        },
        { activityTypes: activityTypes ?? [], assignedUserIdFallback: user?.id }
      );
      await createActivity.mutateAsync(payload);
      setQuickAddSubject("");
      showToast("success", t("dailyTasks.quickAddSuccess"));
    } catch {
      showToast("error", t("common.unknownError"));
    }
  }, [quickAddSubject, activityTypes, user?.id, createActivity, showToast, t]);

  const handleCalendarDateSelect = useCallback((date: string) => {
    setCalendarSelectedDate(date);
  }, []);

  const handleAddForDate = useCallback(
    (date: string) => {
      handleCreateTaskWithDate(date);
    },
    [handleCreateTaskWithDate]
  );

  const renderTab = useCallback(
    (item: { key: ViewMode; labelKey: string }) => {
      const isActive = activeTab === item.key;
      return (
        <TouchableOpacity
          key={item.key}
          style={[styles.tab, isActive && { backgroundColor: colors.accent }]}
          onPress={() => setActiveTab(item.key)}
          activeOpacity={0.85}
        >
          <Text
            unstyled
            style={[styles.tabText, { color: isActive ? "#FFFFFF" : colors.textSecondary }]}
          >
            {t(item.labelKey)}
          </Text>
        </TouchableOpacity>
      );
    },
    [activeTab, colors.accent, colors.textSecondary, t]
  );

  const renderContent = (): React.ReactElement => {
    switch (activeTab) {
      case "weekly":
        return <WeeklyView onCreateTask={handleCreateTaskForSlot} />;
      case "daily":
        return <DailyView onCreateTask={() => handleCreateTaskWithDate(todayDateString)} />;
      case "calendar":
        return (
          <CalendarView
            selectedDate={calendarSelectedDate}
            onDateSelect={handleCalendarDateSelect}
            onAddForDate={handleAddForDate}
          />
        );
      default:
        return <DailyView onCreateTask={() => handleCreateTaskWithDate(todayDateString)} />;
    }
  };

  const isQuickAddDisabled = !quickAddSubject.trim() || createActivity.isPending;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.container, { backgroundColor: contentBackground }]}>
        <ScreenHeader
          title={t("dailyTasks.title")}
          showBackButton
          rightElement={
            <TouchableOpacity
              onPress={handleCreateTask}
              style={[styles.headerAddBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Add01Icon size={18} color="#FFFFFF" variant="stroke" strokeWidth={3} />
            </TouchableOpacity>
          }
        />

        <View style={[styles.content, { backgroundColor: contentBackground }]}>
          <View style={styles.topSection}>
            <View
              style={[
                styles.quickAddContainer,
                { backgroundColor: quickAddBg, borderColor: quickAddBorder },
              ]}
            >
              <TextInput
                style={[styles.quickAddInput, { color: colors.text }]}
                placeholder={t("dailyTasks.quickAddPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={quickAddSubject}
                onChangeText={setQuickAddSubject}
                onSubmitEditing={handleQuickAdd}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.quickAddButton,
                  { backgroundColor: colors.accent },
                  isQuickAddDisabled && styles.quickAddButtonDisabled,
                ]}
                onPress={handleQuickAdd}
                disabled={isQuickAddDisabled}
                activeOpacity={0.85}
              >
                {createActivity.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Add01Icon size={22} color="#FFFFFF" variant="stroke" strokeWidth={3} />
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.tabContainer, { backgroundColor: tabContainerBg }]}>
              {TAB_ITEMS.map(renderTab)}
            </View>
          </View>

          <View style={styles.viewContainer}>{renderContent()}</View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 12,
  },
  quickAddContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 10,
  },
  quickAddInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
  quickAddButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  quickAddButtonDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  tabContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  viewContainer: {
    flex: 1,
  },
  headerAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
});
