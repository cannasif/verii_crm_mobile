import React, { memo, useRef } from "react";
import { 
  View, 
  StyleSheet, 
  Platform, 
  Animated, 
  TouchableWithoutFeedback 
} from "react-native";
import { Text } from "../../../components/ui/text"; 
import { useUIStore } from "../../../store/ui";
import { LinearGradient } from "expo-linear-gradient";
import type { CariDto } from "../types/erp-customer-types";
import { 
  Building03Icon, 
  Call02Icon, 
  Location01Icon, 
  Database01Icon,
  Tag01Icon,
} from "hugeicons-react-native";

// --- SABİT RENKLER ---
const BRAND_COLOR = "#db2777";      
const BRAND_COLOR_DARK = "#ec4899"; 
const TEXT_MUTED_LIGHT = "#64748b"; 
const TEXT_MUTED_DARK = "#94a3b8";  

interface ErpCustomerCardProps {
  customer: CariDto;
  onPress: () => void;
  viewMode?: 'grid' | 'list';
}

function ErpCustomerCardComponent({ customer, onPress, viewMode = 'list' }: ErpCustomerCardProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const isGrid = viewMode === 'grid';

  // --- ANİMASYON DEĞERLERİ ---
  const scaleValue = useRef(new Animated.Value(1)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current; // 0: Normal, 1: Hover

  const handlePressIn = () => {
    // Border ve Arkaplan animasyonunu başlat
    Animated.timing(hoverAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false, // Renk değişimi için false şart
    }).start();

    // Sadece Grid modunda küçülme efekti (Listede performansı korumak için kapalı)
    if (isGrid) {
      Animated.spring(scaleValue, {
        toValue: 0.97,
        useNativeDriver: false, 
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.timing(hoverAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();

    if (isGrid) {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: false, 
      }).start();
    }
  };

  // --- TEMA ---
  const theme = {
    bg: isDark ? "rgba(30, 41, 59, 0.6)" : "#FFFFFF",
    activeBg: isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC", // Basınca hafif gri/beyaz
    
    border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)", // Normal gri çizgi
    activeBorder: BRAND_COLOR, // BASINCA OLUŞACAK PEMBE RENK
    
    iconBg: isDark ? "rgba(236, 72, 153, 0.15)" : "#FFF1F2",
    iconColor: isDark ? BRAND_COLOR_DARK : BRAND_COLOR,
    shadow: isDark ? "transparent" : "#94a3b8",
    textMuted: isDark ? TEXT_MUTED_DARK : TEXT_MUTED_LIGHT,
    textMain: colors.text,
  };

  // --- ANİMASYON STİLLERİ ---
  
  // 1. Kenarlık Rengi (Gri -> Pembe)
  const animatedBorderColor = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, theme.activeBorder]
  });

  // 2. Arka Plan Rengi (Normal -> Hafif Koyulaşma)
  const animatedBgColor = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.bg, theme.activeBg]
  });

  const location = [customer.cariIl, customer.cariIlce].filter(Boolean).join(" / ");

  // --- YARDIMCI BİLEŞENLER ---
  const ErpBadge = () => (
    <View style={styles.badgeContainer}>
      <LinearGradient
        colors={isDark ? ["#831843", "#be185d"] : ["#fce7f3", "#fbcfe8"]}
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }}
        style={styles.badgeGradient}
      >
        <Database01Icon size={9} color={isDark ? "#FFF" : "#be185d"} variant="stroke" />
        <Text style={[styles.badgeText, { color: isDark ? "#FFF" : "#be185d" }]}>ERP</Text>
      </LinearGradient>
    </View>
  );

  const IconBox = ({ size }: { size: number }) => (
    <View style={[styles.iconBox, { 
      backgroundColor: theme.iconBg, 
      width: size, 
      height: size,
      borderRadius: isGrid ? 14 : size / 2
    }]}>
      <Building03Icon size={size * 0.5} color={theme.iconColor} variant="stroke" />
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          isGrid ? styles.gridCard : styles.listCard,
          {
            backgroundColor: isGrid ? theme.bg : animatedBgColor, // Grid sabit, List animasyonlu bg
            borderColor: animatedBorderColor, // ARTIK PEMBE OLACAK
            transform: isGrid ? [{ scale: scaleValue }] : [], // Sadece Grid'de scale var
          },
          isGrid && { shadowColor: theme.shadow } // Sadece Grid'de gölge var
        ]}
      >
        {isGrid ? (
          // === GRID GÖRÜNÜMÜ ===
          <>
            <View style={styles.gridHeader}>
              <IconBox size={40} />
              <ErpBadge />
            </View>
            <View style={styles.gridBody}>
              <Text style={[styles.gridTitle, { color: theme.textMain }]} numberOfLines={2}>
                {customer.cariIsim || "İsimsiz Cari"}
              </Text>
              <View style={styles.row}>
                 <Tag01Icon size={12} color={theme.textMuted} />
                 <Text style={[styles.code, { color: theme.textMuted, marginLeft: 4 }]}>{customer.cariKod}</Text>
              </View>
            </View>
            <View style={styles.gridFooter}>
                <Location01Icon size={12} color={theme.textMuted} />
                <Text style={[styles.footerText, { color: theme.textMuted, marginLeft: 4 }]} numberOfLines={1}>
                  {location || customer.cariTel || "-"}
                </Text>
            </View>
          </>
        ) : (
          // === LİSTE GÖRÜNÜMÜ ===
          <>
            <View style={styles.listLeft}>
              <IconBox size={46} />
            </View>
            
            <View style={styles.listContent}>
               {/* 1. İSİM + ROZET */}
               <View style={styles.listHeaderRow}>
                  <Text style={[styles.listName, { color: theme.textMain }]} numberOfLines={1}>
                    {customer.cariIsim || "İsimsiz Cari"}
                  </Text>
                  <View style={{ marginLeft: 8 }}>
                    <ErpBadge />
                  </View>
               </View>

               {/* 2. KOD */}
               <View style={[styles.row, { marginTop: 2, marginBottom: 4 }]}>
                  <Tag01Icon size={13} color={theme.textMuted} />
                  <Text style={[styles.code, { color: theme.textMuted, marginLeft: 4 }]}>
                    {customer.cariKod}
                  </Text>
               </View>

               {/* 3. DETAYLAR */}
               <View style={styles.listFooterColumn}>
                  {!!customer.cariTel && (
                    <View style={[styles.row, { marginBottom: 2 }]}>
                      <Call02Icon size={12} color={theme.textMuted} />
                      <Text style={[styles.listDetailText, { color: theme.textMuted }]}>
                        {customer.cariTel}
                      </Text>
                    </View>
                  )}
                  {!!location && (
                    <View style={styles.row}>
                      <Location01Icon size={12} color={theme.textMuted} />
                      <Text style={[styles.listDetailText, { color: theme.textMuted }]} numberOfLines={1}>
                        {location}
                      </Text>
                    </View>
                  )}
               </View>
            </View>
          </>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export const ErpCustomerCard = memo(ErpCustomerCardComponent);

const styles = StyleSheet.create({
  // --- GRID STYLES ---
  gridCard: {
    borderRadius: 20,
    padding: 14,
    height: 180,
    justifyContent: 'space-between',
    borderWidth: 1.5, // Grid çerçevesi
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 0,
  },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  gridBody: { flex: 1, justifyContent: 'center', paddingVertical: 8 },
  gridTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  gridFooter: { paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)', flexDirection: 'row', alignItems: 'center' },

  // --- LIST STYLES ---
  listCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1, // Sadece alt çizgi
    minHeight: 85,
  },
  listLeft: {
    marginRight: 14,
    paddingLeft: 4,
    paddingTop: 2,
  },
  listContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  listName: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    letterSpacing: -0.2,
  },
  listFooterColumn: { gap: 3 },
  listDetailText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
    flex: 1, 
  },

  // --- ORTAK ---
  code: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.2,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 11, fontWeight: "500" },
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  badgeContainer: { borderRadius: 6, overflow: 'hidden' },
  badgeGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, gap: 3 },
  badgeText: { fontSize: 10, fontWeight: "700" },
});
