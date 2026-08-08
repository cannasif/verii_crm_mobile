import React, { memo } from "react";
import { View, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { LinearGradient } from "expo-linear-gradient";
import type { ContactDto } from "../types/contact";
// HugeIcons - Fütüristik Set
import { 
  Call02Icon, 
  Mail01Icon, 
  Building03Icon, 
  SmartPhone01Icon,
  Briefcase02Icon,
  ArrowRight01Icon
} from "hugeicons-react-native";

interface ContactCardProps {
  contact: ContactDto;
  onPress: () => void;
}

// YENİ: Hızlı Aksiyon Butonu Bileşeni
function QuickActionButton({ icon, onPress, color, bg }: { icon: React.ReactNode, onPress: () => void, color: string, bg: string }) {
  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={onPress} 
      style={[styles.quickActionBtn, { backgroundColor: bg, borderColor: color + "30" }]}
    >
      {icon}
    </TouchableOpacity>
  );
}

function ContactCardComponent({ contact, onPress }: ContactCardProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  // Fütüristik Cam (Glass) Sabitleri
  const cardBg = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.8)";
  const neonBorder = isDark ? "rgba(236, 72, 153, 0.25)" : "rgba(236, 72, 153, 0.15)";
  const iconColor = isDark ? "#94A3B8" : "#64748B";

  const handleCall = () => {
    const number = contact.mobile || contact.phone;
    if (number) Linking.openURL(`tel:${number}`);
  };

  const handleEmail = () => {
    if (contact.email) Linking.openURL(`mailto:${contact.email}`);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: cardBg, borderColor: neonBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* SOL TARAFTAKİ NEON VURGU ÇİZGİSİ (Accent Bar) */}
      <View style={styles.accentBar} />

      <View style={styles.innerContainer}>
        {/* ÜST BÖLÜM: AVATAR VE İSİM */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: isDark ? "rgba(236, 72, 153, 0.15)" : "#FCE7F3", borderColor: neonBorder }]}>
            <Text style={styles.avatarText}>
              {contact.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.headerContent}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {contact.fullName}
              </Text>
              
              {/* ŞİRKET BİLGİSİ - KÜÇÜK ZARİF ROZET */}
              {contact.customerName && (
                <View style={[styles.miniBadge, { backgroundColor: isDark ? "rgba(236, 72, 153, 0.15)" : "#FCE7F3" }]}>
                  <Building03Icon size={10} color="#db2777" variant="stroke" />
                  <Text style={[styles.miniBadgeText, { color: isDark ? "#f472b6" : "#db2777" }]} numberOfLines={1}>
                    {contact.customerName}
                  </Text>
                </View>
              )}
            </View>

            {contact.titleName && (
              <View style={styles.titleWrapper}>
                 <Briefcase02Icon size={12} color={colors.textMuted} variant="stroke" />
                 <Text style={[styles.title, { color: colors.textMuted }]}>{contact.titleName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ALT BÖLÜM: BİLGİLER VE HIZLI AKSİYONLAR */}
        <View style={styles.footer}>
          
          {/* Sol Taraf: Telefon ve Mail Metinleri */}
          <View style={styles.details}>
            {(contact.mobile || contact.phone) && (
              <View style={styles.detailRow}>
                <SmartPhone01Icon size={14} color={iconColor} variant="stroke" />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {contact.mobile || contact.phone}
                </Text>
              </View>
            )}
            {contact.email && (
              <View style={styles.detailRow}>
                <Mail01Icon size={14} color={iconColor} variant="stroke" />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {contact.email}
                </Text>
              </View>
            )}
          </View>

          {/* Sağ Taraf: Hızlı Aksiyon Butonları (Tek tıkla ara/mail at) */}
          <View style={styles.quickActions}>
            {(contact.mobile || contact.phone) && (
              <QuickActionButton 
                icon={<Call02Icon size={16} color="#10B981" variant="stroke" />} 
                bg={isDark ? "rgba(16, 185, 129, 0.15)" : "#D1FAE5"} 
                color="#10B981" 
                onPress={handleCall} 
              />
            )}
            {contact.email && (
              <QuickActionButton 
                icon={<Mail01Icon size={16} color="#3B82F6" variant="stroke" />} 
                bg={isDark ? "rgba(59, 130, 246, 0.15)" : "#DBEAFE"} 
                color="#3B82F6" 
                onPress={handleEmail} 
              />
            )}
            
            {/* Detaya Git Oku (Yönlendirme vurgusu) */}
            <View style={[styles.goDetailBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
               <ArrowRight01Icon size={16} color={iconColor} variant="stroke" />
            </View>
          </View>

        </View>
      </View>

      {/* ALT PARLAMA ÇİZGİSİ */}
      {isDark && (
        <LinearGradient
          colors={["transparent", "rgba(236, 72, 153, 0.2)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomGlow}
        />
      )}
    </TouchableOpacity>
  );
}

export const ContactCard = memo(ContactCardComponent);

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1.5,
    marginBottom: 14,
    overflow: 'hidden',
    flexDirection: 'row', // Neon çizgi ve içeriği yan yana koymak için
    // Gölgeleri tamamen sildik (şeffaf kartlarda kötü duruyor diye)
  },
  // FÜTÜRİSTİK NEON ÇİZGİ
  accentBar: {
    width: 4,
    backgroundColor: "#db2777",
    height: '100%',
  },
  innerContainer: {
    flex: 1,
    padding: 16,
    paddingLeft: 12, // Accent bar'a çok yapışmasın diye
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#db2777", // Dark neon'dan bir tık daha tok pembe
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap', // İsim uzunsa rozeti alta atsın
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  miniBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    maxWidth: 120, // Şirket adı çok uzunsa kesilsin
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: "600", // 500'den 600'e çekip daha okunur yaptık
  },
  
  // YENİ: Alt Bilgi ve Aksiyonlar
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)', // İnce zarif bir çizgi
    paddingTop: 12,
  },
  details: {
    flex: 1,
    gap: 8,
    paddingRight: 10, // Butonlara çok yaklaşmasın
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // İkon ile yazı arası
  },
  detailText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goDetailBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3, // Biraz daha belirgin parlasın
  }
});
