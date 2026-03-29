import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../../store/ui";
import { UserMultipleIcon, Calendar02Icon, Task01Icon } from "hugeicons-react-native";

interface StatsStripProps {
  totalCustomers?: number;
  totalActivities?: number;
  pendingTasks?: number;
}

export function StatsStrip({
  totalCustomers = 0,
  totalActivities = 0,
  pendingTasks = 0,
}: StatsStripProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "#FFFFFF";
  const borderColor = isDark ? "rgba(236, 72, 153, 0.25)" : "rgba(219, 39, 119, 0.15)";
  const dividerColor = isDark ? "rgba(236, 72, 153, 0.1)" : "rgba(219, 39, 119, 0.08)";
  const textColor = isDark ? "#F8FAFC" : "#334155"; 
  const mutedColor = isDark ? "#94A3B8" : "#64748B";

  const StatColumn = ({ icon: Icon, color, value, label, showDivider }: any) => (
    <View style={[styles.statCol, showDivider && { borderRightWidth: 1, borderRightColor: dividerColor }]}>
      <Icon size={22} color={color} variant="stroke" style={styles.icon} />
      <Text style={[styles.statValue, { color: textColor }]} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: mutedColor }]} adjustsFontSizeToFit numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={[
      styles.unifiedCard, 
      { 
        backgroundColor: cardBg, 
        borderColor: borderColor,
        shadowColor: isDark ? "rgba(236, 72, 153, 0.5)" : "#000000",
        shadowOffset: isDark ? { width: 0, height: 0 } : { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.15 : 0.03,
        shadowRadius: isDark ? 10 : 10,
        elevation: isDark ? 0 : 2, 
      }
    ]}>
      <StatColumn 
        icon={UserMultipleIcon} 
        color="#3B82F6" 
        value={totalCustomers} 
        label={t("home.statsCustomers")} 
        showDivider 
      />
      <StatColumn 
        icon={Calendar02Icon} 
        color="#EC4899" 
        value={totalActivities}
        label={t("home.statsActivities")} 
        showDivider 
      />
      <StatColumn 
        icon={Task01Icon} 
        color="#F59E0B" 
        value={pendingTasks} 
        label={t("home.statsPending")} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  unifiedCard: { 
    flexDirection: "row", 
    alignItems: "center",
    borderRadius: 20, 
    borderWidth: 1,
    paddingVertical: 18,
    marginBottom: 24,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  icon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  }
});