import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { MenuCard } from "../components";
import { 
  Calendar03Icon,
  TaskDaily01Icon,
  ArrowRight01Icon,
  MapsIcon,
} from "hugeicons-react-native";

export function ActivityMenuScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  
  const { themeMode, menuViewType } = useUIStore() as any;
  const insets = useSafeAreaInsets();
  const isDark = themeMode === "dark";

  const THEME_PINK = "#ec4899";
  const arrowColor = isDark ? "#64748B" : "#9CA3AF";

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.12)', 'transparent', 'rgba(249, 115, 22, 0.12)']
    : ['rgba(255, 235, 240, 0.6)', '#FFFFFF', 'rgba(255, 240, 225, 0.6)']) as [string, string, ...string[]];

  const handleActivitiesPress = useCallback(() => {
    router.push("/(tabs)/activities/list");
  }, [router]);

  const handleDailyTasksPress = useCallback(() => {
    router.push("/(tabs)/activities/daily-tasks");
  }, [router]);

  const handleRotaPress = useCallback(() => {
    router.push("/(tabs)/activities/coming-soon");
  }, [router]);

  const menuItems = [
    {
      key: "activities",
      title: t("activityMenu.activities"),
      description: t("activityMenu.activitiesDesc"),
      icon: (
        <Calendar03Icon
          size={24}
          color={THEME_PINK}
          variant="stroke"
          strokeWidth={1.5}
        />
      ),
      onPress: handleActivitiesPress,
    },
    {
      key: "dailyTasks",
      title: t("activityMenu.dailyTasks"),
      description: t("activityMenu.dailyTasksDesc"),
      icon: (
        <TaskDaily01Icon
          size={24}
          color={THEME_PINK}
          variant="stroke"
          strokeWidth={1.5}
        />
      ),
      onPress: handleDailyTasksPress,
    },
    {
      key: "rota",
      title: t("activityMenu.rota"),
      description: t("activityMenu.rotaDesc"),
      icon: (
        <MapsIcon
          size={24}
          color={THEME_PINK}
          variant="stroke"
          strokeWidth={1.5}
        />
      ),
      onPress: handleRotaPress,
    },
  ];

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

      <View style={{ flex: 1 }}>
        <ScreenHeader title={t("activityMenu.title")} showBackButton />
        
        <FlatListScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={
              menuViewType === "grid"
                ? {
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    width: "100%",
                  }
                : { flexDirection: "column", gap: 0 }
            }
          >
            {menuItems.map((item) => (
              <MenuCard
                key={item.key}
                title={item.title}
                description={item.description}
                viewType={menuViewType}
                icon={item.icon}
                rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
                onPress={item.onPress}
              />
            ))}
          </View>
        </FlatListScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 10,
  },
});