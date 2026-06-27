import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { ArrowRight01Icon, Calendar01Icon } from "hugeicons-react-native";
import { useUIStore } from "../../../store/ui";

export interface RecentActivityDto {
  id: number;
  subject: string;
  startDateTime: string;
  status: string | number;
  contactName?: string;
}

interface RecentActivitiesProps {
  activities?: RecentActivityDto[];
}

export function RecentActivities({ activities = [] }: RecentActivitiesProps): React.ReactElement | null {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const textColor = isDark ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "#FFFFFF";
  const borderColor = colors.cardBorder;
  const dividerColor = colors.border;
  const brandColor = colors.accent;

  const safeActivities = Array.isArray(activities) ? activities : [];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>
          {t("home.recentActivity", "Son İşlemler")}
        </Text>
        
        {safeActivities.length > 0 && (
          <TouchableOpacity onPress={() => router.push("/(tabs)/activities" as never)}>
            <Text style={[styles.viewAll, { color: brandColor }]}>
              {t("home.viewAll", "Tümünü Gör")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[
        styles.listContainer, 
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
        
        {safeActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC" }]}>
               <Calendar01Icon size={24} color={mutedColor} variant="stroke" />
            </View>
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              {t("home.noActivity", "Henüz bir işlem bulunmuyor")}
            </Text>
          </View>
        ) : (
          safeActivities.slice(0, 3).map((activity, index) => {
            const isLast = index === safeActivities.slice(0, 3).length - 1;
            const isCompleted = activity.status === 1 || activity.status === "Completed"; 

            const formattedDate = activity.startDateTime 
              ? new Date(activity.startDateTime).toLocaleDateString() 
              : "";

            return (
              <TouchableOpacity 
                key={activity.id} 
                style={[
                  styles.activityRow, 
                  !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor }
                ]}
                onPress={() => router.push(`/(tabs)/activities/${activity.id}` as never)}
                activeOpacity={0.6}
              >
                <View style={[styles.iconWrap, { backgroundColor: isCompleted ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)" }]}>
                  <Calendar01Icon size={18} color={isCompleted ? "#10B981" : "#F59E0B"} variant="stroke" />
                </View>
                
                <View style={styles.infoWrap}>
                  <Text style={[styles.activitySubject, { color: textColor }]} numberOfLines={1}>
                    {activity.subject || t("common.noData", "İsimsiz İşlem")}
                  </Text>
                  
                  <View style={styles.dateRow}>
                    <Text style={[styles.activityDate, { color: mutedColor }]} numberOfLines={1}>
                      {formattedDate} {formattedDate && activity.contactName ? ' • ' : ''} {activity.contactName || ""}
                    </Text>
                  </View>
                </View>

                <ArrowRight01Icon size={18} color={isDark ? "#475569" : "#CBD5E1"} strokeWidth={1.5} />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginTop: 4, 
    marginBottom: 24 
  },
  headerRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 10, 
    paddingHorizontal: 4 
  },
  title: { 
    fontSize: 15, 
    fontWeight: "600", 
    letterSpacing: 0.2 
  },
  viewAll: { 
    fontSize: 12, 
    fontWeight: "600" 
  },
  listContainer: { 
    borderRadius: 20, 
    borderWidth: 1, 
    overflow: "hidden",
  },
  activityRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 14, 
    paddingHorizontal: 16 
  },
  iconWrap: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: 12 
  },
  infoWrap: { 
    flex: 1, 
    marginRight: 12,
    justifyContent: "center"
  },
  activitySubject: { 
    fontSize: 14, 
    fontWeight: "600", 
    marginBottom: 2,
    letterSpacing: 0.1
  },
  dateRow: {
    flexDirection: 'row', 
    alignItems: 'center'
  },
  activityDate: { 
    fontSize: 12, 
    fontWeight: "400" 
  },
  emptyState: { 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 32 
  },
  emptyIconWrap: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: 12 
  },
  emptyText: { 
    fontSize: 13, 
    fontWeight: "500", 
    letterSpacing: 0.2 
  }
});
