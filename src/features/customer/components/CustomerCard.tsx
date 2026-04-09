import React, { memo, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  TouchableOpacity
} from "react-native";
import {
  Call02Icon,
  Mail01Icon,
  Location01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
} from "hugeicons-react-native";
import type { CustomerDto } from "../types"; 
import { useUIStore } from "../../../store/ui";
import i18n from "../../../locales";

const { width } = Dimensions.get('window');
const GAP = 12;
const PADDING = 12; 
const GRID_WIDTH = (width - (PADDING * 2) - GAP) / 2;

// Senin marka renklerin
const BRAND_COLOR = "#db2777";
const BRAND_COLOR_DARK = "#ec4899";

interface CustomerCardProps {
  customer: any; 
  viewMode: 'grid' | 'list';
  onPress: () => void;
  onQuickActivityPress?: () => void;
}

const getInitials = (name: string) => {
  return name?.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ ]/g, "").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";
};

const formatPhoneNumber = (phone: string | null | undefined) => {
  if (!phone) return null;
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{1})?(\d{3})(\d{3})(\d{2})(\d{2})$/);
  if (match) {
    return [match[2], match[3], match[4], match[5]].join(' ');
  }
  return phone;
};

const CustomerCardComponent = ({ customer, viewMode, onPress, onQuickActivityPress }: CustomerCardProps) => {
  const { themeMode } = useUIStore();
  const [isPressed, setIsPressed] = useState(false);

  const isDark = themeMode === "dark";
  const isGrid = viewMode === 'grid';

  const initials = useMemo(() => getInitials(customer.name || "?"), [customer.name]);
  const formattedPhone = useMemo(() => formatPhoneNumber(customer.phone), [customer.phone]);
  const email = customer.email;

  const displayContactForList = formattedPhone || email || "-";
  const ContactIconForList = customer.phone ? Call02Icon : Mail01Icon;

  const locationText = useMemo(() => {
    const parts = [customer.cityName, customer.countryName].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }, [customer]);

  // --- TEMA RENKLERİ ---
  const THEME = {
    surface: isDark ? "rgba(255, 255, 255, 0.04)" : "#FFFFFF",
    surfaceActive: isDark ? "rgba(219, 39, 119, 0.08)" : "#F8FAFC",
    
    border: isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(100, 116, 139, 0.4)",
    activeBorder: isDark ? BRAND_COLOR_DARK : BRAND_COLOR,
    separator: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
    
    text: isDark ? "#F8FAFC" : "#1E293B",
    textSub: isDark ? "#CBD5E1" : "#475569",
    textMute: isDark ? "#94A3B8" : "#64748B",
    
    avatarBg: isDark ? "rgba(255, 255, 255, 0.05)" : "#F1F5F9",
    avatarText: isDark ? BRAND_COLOR_DARK : BRAND_COLOR,
    avatarBorder: isDark ? BRAND_COLOR_DARK : BRAND_COLOR, 
    
    badgeBorder: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)",
    erpBg: isDark ? "rgba(236, 72, 153, 0.12)" : "rgba(219, 39, 119, 0.08)", 
    erpText: isDark ? BRAND_COLOR_DARK : BRAND_COLOR,
  };

  const AvatarBox = ({ size }: { size: number }) => (
    <View style={[styles.avatarBox, {
      width: size,
      height: size,
      borderRadius: 12,
      backgroundColor: THEME.avatarBg,
      borderWidth: 1.5,
      borderColor: THEME.avatarBorder, 
    }]}>
      <Text style={[styles.avatarText, { color: THEME.avatarText, fontSize: size * 0.4 }]}>
        {initials}
      </Text>
    </View>
  );

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      <View
        style={[
          isGrid ? styles.gridCard : styles.listCard,
          {
            backgroundColor: isPressed ? THEME.surfaceActive : THEME.surface,
            borderColor: isPressed ? THEME.activeBorder : THEME.border,
            transform: isPressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
            shadowColor: isDark ? "transparent" : "#64748B",
            shadowOpacity: isGrid && !isDark ? 0.08 : 0,
            elevation: isGrid && !isDark ? 2 : 0, 
          }
        ]}
      >
        {isGrid ? (
          <View style={{ flex: 1 }}>
            
            <View style={styles.gridTopRow}>
              {/* SOL SÜTUN: Avatar ve ERP */}
              <View style={styles.avatarColumn}>
                <AvatarBox size={44} /> 
                {customer.isERPIntegrated ? (
                  <View style={[styles.erpBadge, { backgroundColor: THEME.erpBg }]}>
                    <Text style={[styles.erpText, { color: THEME.erpText }]}>ERP</Text>
                  </View>
                ) : null}
              </View>
              
              {/* SAĞ SÜTUN: İsim ve Sabit Çizgi */}
              <View style={[styles.gridNameContainer, { borderBottomColor: THEME.separator }]}>
                <Text style={[styles.gridName, { color: THEME.text }]} numberOfLines={2}>
                  {customer.name}
                </Text>
              </View>
              {onQuickActivityPress ? (
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation();
                    onQuickActivityPress();
                  }}
                  style={[styles.quickActionButton, styles.gridQuickActionButton, { borderColor: THEME.badgeBorder, backgroundColor: THEME.erpBg }]}
                  activeOpacity={0.8}
                >
                  <Calendar03Icon size={14} color={THEME.erpText} strokeWidth={1.8} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* ORTA SATIR: İletişim */}
            <View style={styles.gridMiddleRow}>
              {Boolean(formattedPhone) ? (
                <View style={styles.iconTextRow}>
                  <Call02Icon size={14} color={THEME.textSub} variant="stroke" strokeWidth={1.5} />
                  <Text style={[styles.contactText, { color: THEME.textSub }]} numberOfLines={1}>
                    {formattedPhone}
                  </Text>
                </View>
              ) : null}

              {Boolean(email) ? (
                <View style={[styles.iconTextRow, { marginTop: 6 }]}>
                  <Mail01Icon size={14} color={THEME.textSub} variant="stroke" strokeWidth={1.5} />
                  <Text style={[styles.contactText, { color: THEME.textSub }]} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
              ) : null}

              {(!formattedPhone && !email) ? (
                 <Text style={{ color: THEME.textMute, fontSize: 11, fontStyle: 'italic' }}>
                   {i18n.t("customer.noContactInfo")}
                 </Text>
              ) : null}
            </View>

            {/* ALT SATIR: Konum Solda, Kategori Sağda (Aynı Hizada) */}
            <View style={[styles.gridBottomRow, { borderTopColor: THEME.separator }]}>
              {/* Konum Alanı (flex: 1 vererek kalan alanı doldurmasını sağladık, uzunsa kesilir) */}
              <View style={[styles.row, { flex: 1, paddingRight: 8 }]}>
                <Location01Icon size={14} color={THEME.textSub} variant="stroke" strokeWidth={1.5} />
                <Text style={[styles.footerText, { color: THEME.textSub }]} numberOfLines={1}>
                  {locationText || i18n.t("customer.locationNotSpecified")}
                </Text>
              </View>

              {/* Kategori Rozeti (Sağa yaslı) */}
              {Boolean(customer.customerTypeName) ? (
                <View style={[styles.categoryBadge, { borderColor: THEME.badgeBorder }]}>
                  <Text style={[styles.categoryText, { color: THEME.textSub }]}>
                    {customer.customerTypeName}
                  </Text>
                </View>
              ) : null}
            </View>

          </View>
        ) : (
          <View style={styles.listInnerContainer}>
            
            <View style={styles.listLeft}>
              <AvatarBox size={44} />
              {customer.isERPIntegrated ? (
                <View style={[styles.erpBadge, { backgroundColor: THEME.erpBg }]}>
                  <Text style={[styles.erpText, { color: THEME.erpText }]}>ERP</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.listContent}>
               <View style={styles.listNameRow}>
                 <Text style={[styles.listName, { color: THEME.text }]} numberOfLines={1}>
                   {customer.name}
                 </Text>
               </View>

               <View style={styles.listFooterColumn}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
                    <View style={[styles.row, { marginRight: 12, marginBottom: 4 }]}>
                       <ContactIconForList size={13} color={THEME.textSub} strokeWidth={1.5} />
                       <Text style={[styles.contactTextList, { color: THEME.textSub }]} numberOfLines={1}>
                         {displayContactForList}
                       </Text>
                    </View>

                    {Boolean(locationText) ? (
                      <View style={[styles.row, { marginRight: 12, marginBottom: 4 }]}>
                        <Location01Icon size={13} color={THEME.textSub} strokeWidth={1.5} />
                        <Text style={[styles.listDetailText, { color: THEME.textSub }]} numberOfLines={1}>
                          {locationText}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* LİSTE KATEGORİ: Kendi satırında, asla kesilmeyecek */}
                  {Boolean(customer.customerTypeName) ? (
                    <View style={{ alignItems: 'flex-start', marginTop: 2 }}>
                       <View style={[styles.categoryBadge, { borderColor: THEME.badgeBorder, paddingVertical: 2 }]}>
                          <Text style={[styles.categoryText, { color: THEME.textSub }]}>
                            {customer.customerTypeName}
                          </Text>
                       </View>
                    </View>
                  ) : null}
               </View>
            </View>

            <View style={styles.listAction}>
              {onQuickActivityPress ? (
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation();
                    onQuickActivityPress();
                  }}
                  style={[styles.quickActionButton, { borderColor: THEME.badgeBorder, backgroundColor: THEME.erpBg }]}
                  activeOpacity={0.8}
                >
                  <Calendar03Icon size={14} color={THEME.erpText} strokeWidth={1.8} />
                </TouchableOpacity>
              ) : null}
               <ArrowRight01Icon size={16} color={THEME.textMute} strokeWidth={2} />
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export const CustomerCard = memo(CustomerCardComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: "800" }, 
  iconTextRow: { flexDirection: 'row', alignItems: 'center' },

  // --- MİKRO DETAY STİLLERİ ---
  avatarColumn: {
    alignItems: 'center', 
  },
  erpBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6, 
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6, 
  },
  erpText: {
    fontSize: 9, 
    fontWeight: "800",
  },
  categoryBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 9.5,
    fontWeight: "600",
  },
  quickActionButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  gridQuickActionButton: {
    marginRight: 0,
    marginLeft: 8,
  },

  // --- GRID STYLES ---
  gridCard: {
    width: GRID_WIDTH,
    height: 185, // İki öğe aynı satıra gelince yer açıldı, biraz toparladık
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  gridTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gridNameContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center', // İsmi dikeyde ortalar
    height: 44, // AVATAR İLE BİREBİR AYNI YÜKSEKLİK! Çizgi asla kaymaz.
    borderBottomWidth: 1, 
  },
  gridName: {
    fontSize: 13.5, 
    fontWeight: "700",
    lineHeight: 18,
    letterSpacing: -0.2,
  },

  gridMiddleRow: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 9.5, 
    fontWeight: "500",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : undefined,
    marginLeft: 6,
    letterSpacing: 0,
    flexShrink: 1, 
  },

  gridBottomRow: {
    flexDirection: 'row', // Konum ve Kategori artık YAN YANA
    alignItems: 'center',
    justifyContent: 'space-between', // Biri tam sola, diğeri tam sağa yaslanır
    paddingTop: 8, 
    borderTopWidth: 1, 
  },
  footerText: {
    fontSize: 10.5, 
    fontWeight: "500",
    marginLeft: 6,
    flexShrink: 1, 
  },

  // --- LIST STYLES ---
  listCard: {
    width: '100%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  listInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listLeft: {
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center', 
  },
  listContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  listName: {
    fontSize: 15, 
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  listFooterColumn: {
    flexDirection: 'column',
    width: '100%',
  },
  contactTextList: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : undefined,
    marginLeft: 5,
  },
  listDetailText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 5,
  },
  listAction: {
    paddingLeft: 6,
  }
});
