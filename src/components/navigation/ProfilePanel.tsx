import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Pressable,
  Platform,
  Switch,
  Animated,
  Image,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";

import {
  Cancel01Icon,
  Logout01Icon,
  ArrowRight01Icon,
  UserIcon,
  Store01Icon,
  GlobalIcon,
  Moon02Icon,
  Sun01Icon,
  Settings02Icon,
} from "hugeicons-react-native";

import { GRADIENT } from "../../constants/theme";
import { useUIStore } from "../../store/ui";
import { setLanguage, getCurrentLanguage } from "../../locales";

const { width } = Dimensions.get("window");
const PANEL_WIDTH = width * 0.85;

const ACTIVE_COLOR = "#fb923c";
const ACTIVE_BG_COLOR = "rgba(251, 146, 60, 0.12)";

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  email?: string;
  branch?: string;
  profileImageUrl?: string;
  onLogout?: () => void;
}

const ProfilePanel = ({
  isOpen,
  onClose,
  userName = "Misafir",
  email = "demo@v3rii.com",
  branch = "Merkez Şube",
  profileImageUrl,
  onLogout,
}: ProfilePanelProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  const { colors, themeMode, toggleTheme } = useUIStore();
  const isDarkMode = themeMode === "dark";
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  const translateX = React.useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : PANEL_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, isOpen, translateX]);

  const handleClose = () => {
    onClose();
  };

  const handleLanguageChange = async (lang: "tr" | "en") => {
    await setLanguage(lang);
    setCurrentLang(lang);
  };

  const handleMenuItemPress = (action: string) => {
    handleClose();
    setTimeout(() => {
      if (action === "settings") {
        router.push("/settings" as never);
      }
    }, 150);
  };

  const animatedStyle = {
    transform: [{ translateX }],
  };

  const backdropStyle = {
    opacity: backdropOpacity,
  };

  if (!isOpen) return null;

  return (
    <Modal
      transparent
      visible={isOpen}
      onRequestClose={handleClose}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <BlurView
              intensity={Platform.OS === "android" ? 50 : 20}
              tint={isDarkMode ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Pressable>

        <Animated.View
          style={[
            styles.panel,
            {
              width: PANEL_WIDTH,
              backgroundColor: colors.background,
              borderLeftColor: colors.border,
              
              // --- POZİSYONLAMA ---
              top: insets.top, // Üstten bildirim çubuğu kadar boşluk
              bottom: 0,       // Aşağıya kadar uzat
              
              // İçerik güvenliği (Home bar için)
              paddingBottom: insets.bottom, 
              paddingTop: 10,
            },
            animatedStyle,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: colors.card }]}
            >
              <Cancel01Icon size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <FlatListScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* User Info */}
            <View style={styles.userInfoContainer}>
              <LinearGradient
                colors={[...GRADIENT.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarBorder}
              >
                <View style={[styles.avatarInner, { backgroundColor: colors.background }]}>
                  {profileImageUrl ? (
                    <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <UserIcon size={32} color={colors.text} />
                  )}
                </View>
              </LinearGradient>

              <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{email}</Text>

              <View style={styles.infoBoxes}>
                <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Store01Icon size={18} color={ACTIVE_COLOR} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                      {t("home.branch")}
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                      {branch}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <LinearGradient
              colors={['transparent', colors.border || 'rgba(255,255,255,0.2)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.separator}
            />

            {/* Menu Items */}
            <View style={styles.menuContainer}>
              
              <Pressable
                onPress={() => handleMenuItemPress("settings")}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: ACTIVE_BG_COLOR }]}
              >
                {({ pressed }) => (
                  <View style={styles.menuItemInner}>
                    <View style={[styles.iconBox, { backgroundColor: pressed ? "transparent" : colors.card }]}>
                      <Settings02Icon size={20} color={pressed ? ACTIVE_COLOR : colors.text} />
                    </View>
                    <Text style={[styles.menuText, { color: pressed ? ACTIVE_COLOR : colors.text, fontWeight: pressed ? "700" : "500" }]}>
                      Profil Ayarları
                    </Text>
                    <ArrowRight01Icon size={16} color={pressed ? ACTIVE_COLOR : colors.textMuted} style={{ marginLeft: "auto", opacity: pressed ? 1 : 0.5 }} />
                  </View>
                )}
              </Pressable>

              <View style={styles.menuItem}>
                <View style={styles.menuItemInner}>
                  <View style={[styles.iconBox, { backgroundColor: colors.card }]}>
                    {isDarkMode ? (
                      <Moon02Icon size={20} color={ACTIVE_COLOR} />
                    ) : (
                      <Sun01Icon size={20} color="#facc15" />
                    )}
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>
                    {t("settings.darkMode")}
                  </Text>
                  <Switch
                    value={isDarkMode}
                    onValueChange={toggleTheme}
                    trackColor={{ false: "#E5E7EB", true: ACTIVE_COLOR }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <LinearGradient
                colors={['transparent', colors.border || 'rgba(255,255,255,0.2)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.separator}
              />

              <View style={{ paddingHorizontal: 12, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <GlobalIcon size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                    {t("language.title")}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { id: 'tr', label: t("language.turkish"), flag: '🇹🇷' },
                    { id: 'en', label: t("language.english"), flag: '🇬🇧' }
                  ].map((lang) => (
                    <TouchableOpacity
                      key={lang.id}
                      onPress={() => handleLanguageChange(lang.id as "tr" | "en")}
                      style={[
                        styles.languageBadge,
                        {
                          backgroundColor: currentLang === lang.id ? ACTIVE_BG_COLOR : colors.card,
                          borderColor: currentLang === lang.id ? ACTIVE_COLOR : colors.border
                        }
                      ]}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>{lang.flag}</Text>
                      <Text style={{
                        color: currentLang === lang.id ? ACTIVE_COLOR : colors.text,
                        fontWeight: currentLang === lang.id ? "700" : "500",
                        fontSize: 13
                      }}>
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </FlatListScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: "rgba(239, 68, 68, 0.1)" }
              ]}
              onPress={onLogout}
            >
              {({ pressed }) => (
                <View style={styles.menuItemInner}>
                  <View style={[styles.iconBox, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                    <Logout01Icon size={20} color="#EF4444" />
                  </View>
                  <Text style={styles.logoutText}>{t("common.logout")}</Text>
                </View>
              )}
            </Pressable>

            <Text style={[styles.companyText, { color: colors.textMuted }]}>
              V3RII COMPANY
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // flex-direction row gerekmiyor, absolute ile çözdük
  },
  panel: {
    position: 'absolute',
    right: 0,
    // top ve bottom inline style ile geliyor
    
    borderLeftWidth: 1,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    
    shadowColor: "#000",
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 20,
    
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userInfoContainer: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  avatarBorder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
  },
  infoBoxes: {
    width: "100%",
    marginTop: 20,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    width: "90%",
    alignSelf: "center",
    marginVertical: 15,
  },
  menuContainer: {
    gap: 4,
  },
  menuItem: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItemInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
  },
  languageBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
  },
  companyText: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    opacity: 0.4,
    marginTop: 20,
  },
});

export default ProfilePanel;
