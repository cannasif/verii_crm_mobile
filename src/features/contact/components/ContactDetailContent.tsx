import React from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text, Platform } from "react-native";
import { 
  Building04Icon,
  Call02Icon,
  SmartPhone01Icon,
  Mail02Icon,
  Note01Icon,
  Delete02Icon
} from "hugeicons-react-native";
import type { ContactDto } from "../types";

// --- Alt Bileşen ---
interface DetailRowProps {
  label: string;
  value: string | undefined | null;
  icon?: React.ReactNode;
  theme: any;
  isDark: boolean;
}

function DetailRow({ label, value, icon, theme, isDark }: DetailRowProps): React.ReactElement | null {
  if (!value) return null;

  // Pembemsi, ince ayırıcı çizgi rengi
  const separatorColor = isDark ? 'rgba(219, 39, 119, 0.15)' : 'rgba(219, 39, 119, 0.08)';

  return (
    <View style={[styles.detailRow, { borderBottomColor: separatorColor }]}>
      <View style={styles.detailRowLeft}>
        {icon && <View style={styles.detailIconWrap}>{icon}</View>}
        <Text style={[styles.detailLabel, { color: theme.textMute }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: theme.text }]} selectable>{value}</Text>
    </View>
  );
}

// --- Ana İçerik Bileşeni ---
interface ContactDetailContentProps {
  contact: ContactDto;
  theme: any;
  t: any;
  isDark: boolean;
  isDeleting: boolean;
  onDeletePress: () => void;
  onQuickActivityPress: () => void;
  primaryColor: string;
  errorColor: string;
}

export function ContactDetailContent({
  contact,
  theme,
  t,
  isDark,
  isDeleting,
  onDeletePress,
  onQuickActivityPress,
  primaryColor,
  errorColor
}: ContactDetailContentProps): React.ReactElement {

  // ✨ SİHİRLİ KART STİLLERİ (Boyutlar Ufaldı) ✨
  const cardStyle = [
    styles.card,
    { 
      backgroundColor: theme.cardBg,
      borderColor: isDark ? 'rgba(219, 39, 119, 0.35)' : 'rgba(219, 39, 119, 0.12)',
      borderWidth: isDark ? 1.5 : 1,
    },
    Platform.select({
      ios: {
        shadowColor: isDark ? primaryColor : '#000', 
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDark ? 0.15 : 0.03, 
        shadowRadius: isDark ? 6 : 4,
      },
      android: {
        elevation: isDark ? 0 : 2, 
      },
    })
  ];

  return (
    <View style={{ gap: 12, paddingBottom: 16 }}>
      
      {/* Profil Kartı */}
      <View style={cardStyle}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {contact.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={[styles.contactName, { color: theme.text }]}>
              {contact.fullName}
            </Text>
            {contact.titleName && (
              <Text style={[styles.titleName, { color: theme.textMute }]}>
                {contact.titleName}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={onQuickActivityPress}
          style={[styles.quickActivityButton, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.14)" : "#f5f3ff", borderColor: isDark ? "rgba(139, 92, 246, 0.35)" : "#ddd6fe" }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.quickActivityText, { color: "#8b5cf6" }]}>{t("contact.quickActivity")}</Text>
        </TouchableOpacity>
      </View>

      {/* Şirket Kartı */}
      {contact.customerName && (
        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("contact.customer")}
          </Text>
          <View style={[styles.customerBadge, { 
              backgroundColor: isDark ? 'rgba(219, 39, 119, 0.1)' : '#FFF0F7', 
              borderColor: isDark ? 'rgba(219, 39, 119, 0.2)' : 'transparent',
              borderWidth: isDark ? 1 : 0
            }]}>
            <Building04Icon size={16} color={primaryColor} variant="stroke" style={styles.customerIcon} />
            <Text style={[styles.customerName, { color: theme.text, fontWeight: '600' }]}>
              {contact.customerName}
            </Text>
          </View>
        </View>
      )}

      {/* İletişim Bilgileri Kartı */}
      <View style={cardStyle}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          İletişim Bilgileri
        </Text>
        <View style={{ gap: 0 }}>
          <DetailRow 
            label={t("contact.phone")} 
            value={contact.phone} 
            icon={<Call02Icon size={15} color={primaryColor} opacity={0.8} />} 
            theme={theme}
            isDark={isDark}
          />
          <DetailRow 
            label={t("contact.mobile")} 
            value={contact.mobile} 
            icon={<SmartPhone01Icon size={15} color={primaryColor} opacity={0.8} />} 
            theme={theme}
            isDark={isDark}
          />
          <DetailRow 
            label={t("contact.email")} 
            value={contact.email} 
            icon={<Mail02Icon size={15} color={primaryColor} opacity={0.8} />} 
            theme={theme}
            isDark={isDark}
          />
        </View>
      </View>

      {/* Notlar Kartı */}
      {contact.notes && (
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
            <View style={{ padding: 6, backgroundColor: isDark ? 'rgba(219, 39, 119, 0.1)' : '#FFF0F7', borderRadius: 6 }}>
               <Note01Icon size={16} color={primaryColor} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
              {t("contact.notes")}
            </Text>
          </View>
          <Text style={[styles.notes, { color: theme.textMute }]}>{contact.notes}</Text>
        </View>
      )}

      {/* Silme İşlemi */}
      <TouchableOpacity
        onPress={onDeletePress}
        style={[styles.deleteButton, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2", borderColor: isDark ? "transparent" : "#FEE2E2", borderWidth: 1 }]} 
        disabled={isDeleting}
        activeOpacity={0.8}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color={errorColor} />
        ) : (
          <>
            <Delete02Icon size={18} color={errorColor} variant="stroke" />
            <Text style={[styles.deleteButtonText, { color: errorColor }]}>{t("common.delete") || "Kişiyi Sil"}</Text>
          </>
        )}
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    padding: 16, // 20'den 16'ya düştü
    borderRadius: 16, // 20'den 16'ya düştü
  },
  avatarContainer: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 48, height: 48, borderRadius: 14, // 60x60'tan 48x48'e düştü
    backgroundColor: "rgba(219, 39, 119, 0.12)",
    alignItems: "center", justifyContent: "center", marginRight: 14,
    borderWidth: 1, borderColor: 'rgba(219, 39, 119, 0.2)'
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#db2777" }, // 24'ten 20'ye düştü
  nameContainer: { flex: 1, justifyContent: 'center' },
  contactName: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2, marginBottom: 2 }, // 20'den 17'ye düştü
  titleName: { fontSize: 13, fontWeight: "500", opacity: 0.9 }, // 14'ten 13'e düştü
  quickActivityButton: { marginTop: 14, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  quickActivityText: { fontSize: 14, fontWeight: "700" },
  sectionTitle: { fontSize: 13, fontWeight: "800", marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.9 }, // 14'ten 13'e, margin 14'ten 10'a düştü
  customerBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }, // Paddingler ufaldı
  customerIcon: { marginRight: 8 },
  customerName: { fontSize: 14, flex: 1 }, // 15'ten 14'e düştü
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1.5, // 12'den 10'a düştü
  },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center' },
  detailIconWrap: { width: 24, alignItems: 'flex-start', opacity: 0.9 }, // 28'den 24'e düştü
  detailLabel: { fontSize: 13, fontWeight: "600" }, // 14'ten 13'e düştü
  detailValue: { fontSize: 14, fontWeight: "600", textAlign: 'right', flex: 1, marginLeft: 16 }, // 15'ten 14'e düştü
  notes: { fontSize: 14, lineHeight: 22, fontWeight: '500' }, // 15'ten 14'e düştü
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 8 }, // Paddingler ve radius ufaldı
  deleteButtonText: { fontSize: 15, fontWeight: '700' } // 16'dan 15'e düştü
});
