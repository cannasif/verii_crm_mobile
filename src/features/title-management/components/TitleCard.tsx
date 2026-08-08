import React, { memo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { TitleDto } from "../types/title-types";
import { LinearGradient } from "expo-linear-gradient";
import { 
  Edit02Icon, 
  Delete02Icon, 
  Briefcase01Icon 
} from "hugeicons-react-native";

interface TitleCardProps {
  title: TitleDto;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TitleCardComponent({
  title,
  onPress,
  onEdit,
  onDelete,
}: TitleCardProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const primaryColor = "#db2777";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.wrapper}
    >
      <View style={[
        styles.container,
        { 
          backgroundColor: isDark ? 'rgba(30, 20, 50, 0.4)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(219, 39, 119, 0.2)' : 'rgba(0, 0, 0, 0.05)'
        }
      ]}>
        {/* Fütüristik Üst Lazer Çizgisi */}
        <LinearGradient
          colors={[primaryColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.laserLine}
        />

        <View style={styles.mainContent}>
          {/* Sol: İsim ve Durum */}
          <View style={styles.leftSide}>
            <View style={[styles.neonDot, { backgroundColor: primaryColor, shadowColor: primaryColor }]} />
            <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
              {title.titleName}
            </Text>
          </View>

          {/* Sağ: Fütüristik Aksiyon Kapsülü */}
          <View style={[styles.actionCapsule, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC' }]}>
            <TouchableOpacity 
              style={styles.capsuleBtn} 
              onPress={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Edit02Icon size={16} color={isDark ? '#cbd5e1' : '#475569'} variant="stroke" />
            </TouchableOpacity>
            
            <View style={[styles.capsuleDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]} />
            
            <TouchableOpacity 
              style={styles.capsuleBtn} 
              onPress={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Delete02Icon size={16} color="#EF4444" variant="stroke" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const TitleCard = memo(TitleCardComponent);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  container: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    // Premium soft shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '40%',
    height: 2,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  neonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    // Parlama efekti
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 5,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  actionCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  capsuleBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleDivider: {
    width: 1,
    height: 16,
  }
});
