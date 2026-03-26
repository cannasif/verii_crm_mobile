import React, { memo, useEffect, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { ActivityDto } from "../types";


import { 
  Calendar01Icon, 
  UserCircleIcon, 
  Notification01Icon,
  Building03Icon,
  Cancel01Icon,
  TickDouble01Icon,
  TelephoneIcon, 
  UserGroupIcon, 
  Mail01Icon, 
  Task01Icon, 
  Building01Icon, 
  Note01Icon, 
  Invoice01Icon, 
  ShoppingCart01Icon, 
  RefreshIcon, 
  FireIcon, 
  Alert01Icon, 
  ArrowDown01Icon, 
  Time02Icon 
} from "hugeicons-react-native";

interface ActivityCardProps {
  activity: ActivityDto;
  onPress: () => void;
  onReportPress?: () => void;
}


const getLocText = (t: any, key: string, fallback: string) => {
  const res = t(key);
  return res === key || !res ? fallback : res;
};

function ActivityCardComponent({ activity, onPress, onReportPress }: ActivityCardProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";

  const primaryColor =  "#db2777";


  const pVal = activity.priority;
  const isHighPriority = pVal === 2 || String(pVal).toLowerCase() === "high";
  const isMediumPriority = pVal === 1 || String(pVal).toLowerCase() === "medium";
  const isLowPriority = pVal === 0 || String(pVal).toLowerCase() === "low";


  const statusVal = activity.status;
  const isCancelled = statusVal === 2 || String(statusVal).toLowerCase() === "cancelled" || String(statusVal).toLowerCase() === "canceled";
  const isCompleted = statusVal === 1 || String(statusVal).toLowerCase() === "completed" || activity.isCompleted;
  const isScheduled = !isCancelled && !isCompleted;


  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (isHighPriority && !isCompleted && !isCancelled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isHighPriority, isCompleted, isCancelled]);

  const getStatusColor = (): string => {
    if (isCompleted) return colors.success || "#10b981";
    if (isCancelled) return colors.error || "#ef4444";
    return primaryColor; 
  };

  const getStatusText = (): string => {
    if (isCompleted) return getLocText(t, "activity.statusCompleted", "Tamamlandı");
    if (isCancelled) return getLocText(t, "activity.statusCancelled", "İptal Edildi");
    return getLocText(t, "activity.statusScheduled", "Planlandı");
  };

  const getPriorityConfig = () => {
    if (isHighPriority) return { color: "#ef4444", text: getLocText(t, "activity.priorityHigh", "Yüksek"), icon: <FireIcon size={12} color="#ef4444" variant="stroke" /> };
    if (isMediumPriority) return { color: "#f59e0b", text: getLocText(t, "activity.priorityMedium", "Orta"), icon: <Alert01Icon size={12} color="#f59e0b" variant="stroke" /> };
    if (isLowPriority) return { color: "#10b981", text: getLocText(t, "activity.priorityLow", "Düşük"), icon: <ArrowDown01Icon size={12} color="#10b981" variant="stroke" /> };
    return null;
  };
  const priorityConfig = getPriorityConfig();


  let cardBgColor = isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF";
  let cardBorderColor = isDark ? "rgba(255,255,255,0.08)" : "transparent"; 

  if (isCancelled) {
    cardBgColor = isDark ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.05)"; 
  } else if (isCompleted) {
    cardBgColor = isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.08)";
  } else if (isHighPriority) {
    cardBgColor = isDark ? "rgba(239, 68, 68, 0.06)" : "rgba(239, 68, 68, 0.04)";
  }

 
  const getActivityTypeText = (activityType: ActivityDto["activityType"]): string => {
    if (typeof activityType === "string") return activityType;
    if (activityType && typeof activityType === "object" && typeof activityType.name === "string") return activityType.name;
    return getLocText(t, "activity.unknownType", "Aktivite");
  };
  const activityTypeName = getActivityTypeText(activity.activityType);
  
  const getActivityTypeIcon = () => {
    const typeLower = activityTypeName.toLowerCase().replace(/\s+/g, "");
    const iconProps = { size: 14, color: primaryColor, variant: "stroke" as const }; 
    switch (typeLower) {
      case "call": case "telefon": case "arama": return <TelephoneIcon {...iconProps} />;
      case "meeting": case "toplantı": case "görüşme": return <UserGroupIcon {...iconProps} />;
      case "email": case "e-posta": case "eposta": case "mail": return <Mail01Icon {...iconProps} />;
      case "visit": case "ziyaret": return <Building01Icon {...iconProps} />;
      case "note": case "not": case "notlar": return <Note01Icon {...iconProps} />;
      case "quote": case "teklif": return <Invoice01Icon {...iconProps} />;
      case "order": case "sipariş": return <ShoppingCart01Icon {...iconProps} />;
      default: return <Task01Icon {...iconProps} />;
    }
  };

 
  const customerName = activity.potentialCustomer?.name || activity.contact?.fullName;
  const hasCustomer = !!customerName;
  const assignedUserName = activity.assignedUser?.fullName;
  const hasAssignedUser = !!assignedUserName;
  const hasReminder = activity.reminders && activity.reminders.length > 0;
  const detailChips = [
    activity.paymentTypeName
      ? { key: "payment", label: getLocText(t, "activity.paymentType", "Odeme"), value: activity.paymentTypeName, icon: <Invoice01Icon size={12} color={primaryColor} variant="stroke" /> }
      : null,
    activity.activityMeetingTypeName
      ? { key: "meeting", label: getLocText(t, "activity.activityMeetingType", "Gorusme"), value: activity.activityMeetingTypeName, icon: <UserGroupIcon size={12} color={primaryColor} variant="stroke" /> }
      : null,
    activity.activityTopicPurposeName
      ? { key: "topic", label: getLocText(t, "activity.activityTopicPurpose", "Ilgilenilen Konular"), value: activity.activityTopicPurposeName, icon: <Note01Icon size={12} color={primaryColor} variant="stroke" /> }
      : null,
    activity.activityShippingName
      ? { key: "shipping", label: getLocText(t, "activity.activityShipping", "Teslimat"), value: activity.activityShippingName, icon: <RefreshIcon size={12} color={primaryColor} variant="stroke" /> }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string; icon: React.ReactNode }>;

  const getRemainingTimeText = () => {
    const targetDateStr = activity.startDateTime || activity.endDateTime;
    if (!targetDateStr || isCompleted || isCancelled) return null;
    
    const targetTime = new Date(targetDateStr).getTime();
    const nowTime = new Date().getTime(); 
    const diffMs = targetTime - nowTime;
    
    if (diffMs <= 0) return null; 
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} ${getLocText(t, "common.daysLeft", "gün")}`;
    if (diffHours > 0) return `${diffHours} ${getLocText(t, "common.hoursLeft", "saat")}`;
    return `${diffMins} ${getLocText(t, "common.minsLeft", "dk")}`;
  };
  const remainingTime = getRemainingTimeText();


  const formatSmartDate = (dateString: string): string => {
    if (!dateString) return getLocText(t, "activity.noDate", "Tarih Yok");
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    const isTomorrow = date.getDate() === tomorrow.getDate() && date.getMonth() === tomorrow.getMonth() && date.getFullYear() === tomorrow.getFullYear();
    const time = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

    if (isToday) return `${getLocText(t, "common.today", "Bugün")}, ${time}`;
    if (isTomorrow) return `${getLocText(t, "common.tomorrow", "Yarın")}, ${time}`;

    return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };
  const activityDateStr = activity.activityDate ?? activity.startDateTime ?? activity.createdDate;


  const animatedBorderColor = isHighPriority && !isCompleted && !isCancelled 
    ? pulseAnim.interpolate({
        inputRange: [0.5, 1],
        outputRange: [isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)', isDark ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.4)']
      }) 
    : cardBorderColor;

  return (

    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ width: '100%' }}>
      <Animated.View
        style={[
          styles.cardContainer,
          { 
            backgroundColor: cardBgColor,
            borderColor: animatedBorderColor,
            opacity: isCancelled ? 0.65 : 1
          }
        ]}
      >
        {/* FİLİGRAN EFEKTLERİ (PLANLANDI İÇİN TAKVİM EKLENDİ) */}
        {isCancelled && (
          <View style={styles.watermarkContainer}>
            <Cancel01Icon size={110} color={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} variant="stroke" strokeWidth={1.5} />
          </View>
        )}
        {isCompleted && (
          <View style={styles.watermarkContainer}>
            <TickDouble01Icon size={110} color={isDark ? "rgba(16, 185, 129, 0.04)" : "rgba(16, 185, 129, 0.04)"} variant="stroke" strokeWidth={1.5} />
          </View>
        )}
        {isScheduled && (
          <View style={styles.watermarkContainer}>
            <Calendar01Icon size={110} color={isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"} variant="stroke" strokeWidth={1} />
          </View>
        )}

        {/* İÇERİK */}
        <View style={styles.contentArea}>
          
          {/* ÜST BÖLÜM: Etiketler */}
          <View style={styles.topBadgesRow}>
            
            {/* TİP ETİKETİ: Artık sönük gri değil, temanın pembe rengiyle uyumlu, canlı bir hap! */}
            <View style={[styles.typeBadge, { backgroundColor: primaryColor + "15", borderColor: primaryColor + "30", borderWidth: 1 }]}>
              {getActivityTypeIcon()}
              <Text style={[styles.typeBadgeText, { color: primaryColor }]}>{activityTypeName}</Text>
            </View>

            <View style={styles.rightBadges}>
              {/* Öncelik Etiketi */}
              {priorityConfig && !isCancelled && !isCompleted && (
                <Animated.View style={[
                  styles.priorityBadge, 
                  { 
                    backgroundColor: priorityConfig.color + "15", 
                    borderColor: priorityConfig.color + "50",
                    opacity: isHighPriority ? pulseAnim : 1
                  }
                ]}>
                  {priorityConfig.icon}
                  <Text style={[styles.priorityText, { color: priorityConfig.color }]}>{priorityConfig.text}</Text>
                </Animated.View>
              )}

              {/* Durum Etiketi */}
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "15", borderColor: getStatusColor() + "30", borderWidth: 1 }]}>
                <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
              </View>
            </View>
          </View>

          {/* ORTA BÖLÜM: Konu ve Müşteri */}
          <View style={styles.mainInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
               <Text 
                  style={[styles.subject, { color: colors.text, textDecorationLine: isCancelled ? "line-through" : "none" }]} 
                  numberOfLines={1}
                >
                  {activity.subject || getLocText(t, "activity.noSubject", "Konu Belirtilmedi")}
                </Text>
                {hasReminder && !isCompleted && !isCancelled && (
                  <View style={{ marginLeft: 6 }}>
                    <Notification01Icon size={16} color={colors.warning || "#f59e0b"} variant="stroke" strokeWidth={2} />
                  </View>
                )}
            </View>

            <View style={styles.customerRow}>
              <Building03Icon size={14} color={hasCustomer ? colors.textSecondary : colors.textMuted} variant="stroke" strokeWidth={2} />
              <Text style={[
                styles.customerText, 
                { color: hasCustomer ? colors.textSecondary : colors.textMuted, fontStyle: hasCustomer ? 'normal' : 'italic' }
              ]} numberOfLines={1}>
                {hasCustomer ? customerName : getLocText(t, "activity.noCustomer", "Kişi / Firma Yok")}
              </Text>
            </View>

            {detailChips.length > 0 && (
              <View style={styles.detailChipsWrap}>
                {detailChips.map((chip) => (
                  <View
                    key={chip.key}
                    style={[
                      styles.detailChip,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
                        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                      },
                    ]}
                  >
                    {chip.icon}
                    <Text style={[styles.detailChipLabel, { color: colors.textMuted }]}>
                      {chip.label}:
                    </Text>
                    <Text style={[styles.detailChipValue, { color: colors.textSecondary }]} numberOfLines={1}>
                      {chip.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* İNCE AYIRICI ÇİZGİ (Divider) - Alt bölümü üstten şıkça ayırır */}
          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

          {/* ALT BÖLÜM: Hap Tasarımlı (Pill) Tarih, Süre, Kişi */}
          <View style={styles.bottomPillsRow}>
            
            <View style={[styles.pill, { 
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              }]}>
              <Calendar01Icon size={12} color={colors.textSecondary} variant="stroke" strokeWidth={2} />
              <Text style={[styles.pillText, { color: colors.textSecondary }]}>{formatSmartDate(activityDateStr)}</Text>
            </View>

            {remainingTime && (
              <View style={[styles.pill, { 
                  backgroundColor: (colors.warning || "#f59e0b") + "10",
                  borderColor: (colors.warning || "#f59e0b") + "40",
                }]}>
                <Time02Icon size={12} color={colors.warning || "#f59e0b"} variant="stroke" strokeWidth={2} />
                <Text style={[styles.pillText, { color: colors.warning || "#f59e0b", fontWeight: '700' }]}>{remainingTime}</Text>
              </View>
            )}

            <View style={[styles.pill, { 
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                marginLeft: 'auto' 
              }]}>
              <UserCircleIcon size={12} color={hasAssignedUser ? colors.textSecondary : colors.textMuted} variant="stroke" strokeWidth={2} />
              <Text style={[styles.pillText, { color: hasAssignedUser ? colors.textSecondary : colors.textMuted }]} numberOfLines={1}>
                {hasAssignedUser ? assignedUserName?.split(' ')[0] : getLocText(t, "activity.unassigned", "Atanmadı")}
              </Text>
            </View>

            {onReportPress ? (
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation?.();
                  onReportPress();
                }}
                activeOpacity={0.82}
                style={[
                  styles.pill,
                  styles.reportPill,
                  {
                    backgroundColor: primaryColor + "12",
                    borderColor: primaryColor + "32",
                  },
                ]}
              >
                <Invoice01Icon size={12} color={primaryColor} variant="stroke" strokeWidth={2} />
                <Text style={[styles.pillText, styles.reportPillText, { color: primaryColor }]}>
                  PDF
                </Text>
              </TouchableOpacity>
            ) : null}

          </View>

        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export const ActivityCard = memo(ActivityCardComponent);

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1, 
    position: 'relative', 
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    zIndex: 0,
    transform: [{ rotate: '-10deg' }], 
  },
  contentArea: {
    padding: 16,
    zIndex: 1, 
  },
  topBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  rightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, 
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mainInfo: {

  },
  subject: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  customerText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  detailChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  detailChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    marginRight: 4,
  },
  detailChipValue: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 150,
  },

  divider: {
    height: 1,
    width: '100%',
    marginVertical: 14,
  },
  bottomPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportPill: {
    marginLeft: 0,
  },
  reportPillText: {
    fontWeight: '800',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1, 
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
});
