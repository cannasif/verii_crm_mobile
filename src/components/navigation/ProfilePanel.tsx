import React, { useEffect, useState, useRef } from "react";
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
  ScrollView,
  Linking,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";

import {
  Cancel01Icon,
  ArrowRight01Icon,
  UserIcon,
  Store01Icon,
  Moon02Icon,
  Sun01Icon,
  Settings02Icon,
  CustomerSupportIcon,
  Logout01Icon,
  Mail01Icon,
  Call02Icon,
  WhatsappIcon,
  ListViewIcon,
  GridViewIcon,
} from "hugeicons-react-native";

import { useUIStore } from "../../store/ui";
import { setLanguage, getCurrentLanguage } from "../../locales";

const { width } = Dimensions.get("window");
const PANEL_WIDTH = width * 0.85;

const ACTIVE_COLOR = "#EC4899";
const ACTIVE_BG_COLOR = "rgba(236, 72, 153, 0.1)";

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  email?: string;
  branch?: string;
  profileImageUrl?: string;
  onLogout?: () => void;
}

export default function ProfilePanel({
  isOpen,
  onClose,
  userName,
  email = "demo@v3rii.com",
  branch,
  profileImageUrl,
  onLogout,
}: ProfilePanelProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  const { colors, themeMode, toggleTheme, menuViewType, setMenuViewType } = useUIStore();
  const isDarkMode = themeMode === "dark";
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  const [isVisible, setIsVisible] = useState(isOpen);
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  
  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const SUPPORTED_LANGUAGES = [
    { id: 'tr', label: t("language.turkish"), flag: '🇹🇷' },
    { id: 'en', label: t("language.english"), flag: '🇬🇧' },
    { id: 'de', label: t("language.german"), flag: '🇩🇪' },
  ];

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    } else {
      setContactMenuVisible(false);
      Animated.parallel([
        Animated.timing(translateX, { toValue: PANEL_WIDTH, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setIsVisible(false);
      });
    }
  }, [isOpen, translateX, backdropOpacity]);

  const handleLanguageChange = async (lang: "tr" | "en" | "de") => {
    await setLanguage(lang);
    setCurrentLang(lang);
  };

  const handleMenuItemPress = (route: string) => {
    onClose(); 
    setTimeout(() => {
      router.push(route as never);
    }, 300); 
  };

  const handleContactLink = (type: "mail" | "wa" | "phone") => {
    setContactMenuVisible(false);
    setTimeout(() => {
      if (type === "mail") Linking.openURL("mailto:infov3rii@gmail.com");
      if (type === "wa") Linking.openURL("whatsapp://send?phone=+905070123018");
      if (type === "phone") Linking.openURL("tel:+905077108761");
    }, 300);
  };

  if (!isVisible) return null;

  const MenuGroup = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.menuGroup, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "#FFFFFF", borderColor: colors.border }]}>
      {children}
    </View>
  );

  return (
    <Modal
      transparent
      visible={isVisible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
            <BlurView
              intensity={Platform.OS === "android" ? 50 : 25}
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
              backgroundColor: isDarkMode ? "#0C0516" : "#F8FAFC", 
              borderLeftColor: colors.border,
              top: insets.top,
              bottom: 0,
              paddingBottom: insets.bottom,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#E2E8F0" }]}>
              <Cancel01Icon size={20} color={colors.text} variant="stroke" />
            </TouchableOpacity>
          </View>

          <FlatListScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.userInfoContainer}>
              <View style={[styles.avatarBorder, { borderColor: isDarkMode ? "rgba(236, 72, 153, 0.3)" : "rgba(236, 72, 153, 0.15)" }]}>
                <View style={[styles.avatarInner, { backgroundColor: isDarkMode ? "#161224" : "#FFFFFF" }]}>
                  {profileImageUrl ? (
                    <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <UserIcon size={36} color={ACTIVE_COLOR} variant="stroke" />
                  )}
                </View>
              </View>

              <Text style={[styles.userName, { color: colors.text }]}>{userName || t("profile.guestUser")}</Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{email}</Text>

              <View style={[styles.branchBadge, { backgroundColor: ACTIVE_BG_COLOR }]}>
                <Store01Icon size={14} color={ACTIVE_COLOR} variant="stroke" style={{ marginRight: 6 }} />
                <Text style={[styles.branchText, { color: ACTIVE_COLOR }]}>{branch || t("profile.defaultBranch")}</Text>
              </View>
            </View>

            <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{t("profile.account")}</Text>
            <MenuGroup>
              <TouchableOpacity style={styles.menuRow} onPress={() => handleMenuItemPress("/settings")}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                  <Settings02Icon size={20} color="#3B82F6" variant="stroke" />
                </View>
                <Text style={[styles.menuText, { color: colors.text }]}>{t("profile.settings")}</Text>
                <ArrowRight01Icon size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.menuRow} onPress={() => handleMenuItemPress("/integrations-settings")}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                  <Mail01Icon size={20} color="#10B981" variant="stroke" />
                </View>
                <Text style={[styles.menuText, { color: colors.text }]}>{t("profile.integrationSettings")}</Text>
                <ArrowRight01Icon size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </MenuGroup>

            <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{t("profile.preferences")}</Text>
            <MenuGroup>
              <View style={styles.menuRow}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                  {isDarkMode ? <Sun01Icon size={20} color="#F59E0B" variant="stroke" /> : <Moon02Icon size={20} color="#3B82F6" variant="stroke" />}
                </View>
                <Text style={[styles.menuText, { color: colors.text }]}>
                  {isDarkMode ? t("settings.lightMode") : t("settings.darkMode")}
                </Text>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: "#E2E8F0", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                  style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                />
              </View>

              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              <View style={styles.menuRow}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(236, 72, 153, 0.1)" }]}>
                  <ListViewIcon size={20} color={ACTIVE_COLOR} variant="stroke" strokeWidth={1.8} />
                </View>
                <Text style={[styles.menuText, { color: colors.text }]}>{t("profile.menuView")}</Text>
                <View
                  style={[
                    styles.segmentShell,
                    {
                      backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#E2E8F0",
                      borderColor: isDarkMode ? "rgba(148,163,184,0.25)" : "rgba(100,116,139,0.22)",
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setMenuViewType("list")}
                    style={[
                      styles.segmentCell,
                      menuViewType === "list" && [
                        styles.segmentCellOn,
                        { backgroundColor: isDarkMode ? "rgba(255,255,255,0.11)" : "#FFFFFF" },
                      ],
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: menuViewType === "list" }}
                    accessibilityLabel={t("profile.menuViewList")}
                  >
                    <ListViewIcon
                      size={18}
                      color={menuViewType === "list" ? ACTIVE_COLOR : colors.textMuted}
                      variant="stroke"
                      strokeWidth={1.8}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setMenuViewType("grid")}
                    style={[
                      styles.segmentCell,
                      menuViewType === "grid" && [
                        styles.segmentCellOn,
                        { backgroundColor: isDarkMode ? "rgba(255,255,255,0.11)" : "#FFFFFF" },
                      ],
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: menuViewType === "grid" }}
                    accessibilityLabel={t("profile.menuViewGrid")}
                  >
                    <GridViewIcon
                      size={18}
                      color={menuViewType === "grid" ? ACTIVE_COLOR : colors.textMuted}
                      variant="stroke"
                      strokeWidth={1.8}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              <View style={{ paddingVertical: 12 }}>
                <Text style={[styles.menuText, { color: colors.text, paddingHorizontal: 16, marginBottom: 12 }]}>
                  {t("language.title")}
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isActive = currentLang === lang.id;
                    return (
                      <TouchableOpacity
                        key={lang.id}
                        onPress={() => handleLanguageChange(lang.id as "tr" | "en" | "de")}
                        style={[
                          styles.langPill, 
                          { 
                            backgroundColor: isActive ? ACTIVE_BG_COLOR : (isDarkMode ? "rgba(255,255,255,0.05)" : "#F1F5F9"),
                            borderColor: isActive ? "rgba(236, 72, 153, 0.3)" : "transparent",
                            borderWidth: 1
                          }
                        ]}
                      >
                        <Text style={{ fontSize: 16, marginRight: 6 }}>{lang.flag}</Text>
                        <Text style={{ color: isActive ? ACTIVE_COLOR : colors.textMuted, fontWeight: isActive ? "600" : "500", fontSize: 13 }}>
                          {lang.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </MenuGroup>

            <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{t("profile.support")}</Text>
            <MenuGroup>
              <TouchableOpacity style={styles.menuRow} onPress={() => setContactMenuVisible(true)}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(168, 85, 247, 0.1)" }]}>
                  <CustomerSupportIcon size={20} color="#A855F7" variant="stroke" />
                </View>
                <Text style={[styles.menuText, { color: colors.text }]}>{t("profile.contactUs")}</Text>
                <ArrowRight01Icon size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </MenuGroup>

            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.05)" }]} 
              onPress={() => {
                onClose();
                setTimeout(() => onLogout?.(), 300);
              }}
            >
              <Logout01Icon size={20} color="#EF4444" variant="stroke" style={{ marginRight: 10 }} />
              <Text style={styles.logoutText}>{t("common.logout")}</Text>
            </TouchableOpacity>

          </FlatListScrollView>

          <View style={styles.footer}>
            <Text style={[styles.companyText, { color: colors.textMuted }]}>V3RII CRM</Text>
          </View>

          {contactMenuVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999, justifyContent: "flex-end" }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setContactMenuVisible(false)}>
                <BlurView intensity={20} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFill} />
              </Pressable>
              
              <View style={[styles.contactSheet, { backgroundColor: isDarkMode ? "#161224" : "#FFFFFF", borderColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom : 24 }]}>
                <View style={styles.sheetHandle} />
                <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("profile.contactUs")}</Text>
                
                <TouchableOpacity style={[styles.contactRow, { borderBottomColor: colors.border }]} onPress={() => handleContactLink("mail")}>
                  <View style={[styles.contactIconWrap, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                    <Mail01Icon size={22} color="#3B82F6" variant="stroke" />
                  </View>
                  <Text style={[styles.contactRowText, { color: colors.text }]}>{t("profile.contactMail")}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.contactRow, { borderBottomColor: colors.border }]} onPress={() => handleContactLink("wa")}>
                  <View style={[styles.contactIconWrap, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                    <WhatsappIcon size={22} color="#10B981" variant="stroke" />
                  </View>
                  <Text style={[styles.contactRowText, { color: colors.text }]}>{t("profile.contactWhatsapp")}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactRow} onPress={() => handleContactLink("phone")}>
                  <View style={[styles.contactIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                    <Call02Icon size={22} color="#F59E0B" variant="stroke" />
                  </View>
                  <Text style={[styles.contactRowText, { color: colors.text }]}>{t("profile.contactPhone")}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]} onPress={() => setContactMenuVisible(false)}>
                  <Text style={[styles.cancelText, { color: colors.text }]}>{t("profile.cancel")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: {
    position: 'absolute',
    right: 0,
    borderLeftWidth: 1,
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: -10, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  userInfoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarBorder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    padding: 4,
    marginBottom: 16,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  userName: { fontSize: 22, fontWeight: "800", marginBottom: 4, letterSpacing: -0.5 },
  userEmail: { fontSize: 14, fontWeight: "500", marginBottom: 12 },
  branchBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  branchText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
  },
  menuGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: {
    height: 1,
    marginLeft: 52,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: "500" },
  segmentShell: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 11,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentCell: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 8,
  },
  segmentCellOn: {
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  versionText: { fontSize: 12, fontWeight: "600" },
  companyText: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  contactSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#94A3B8",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
    opacity: 0.5,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  contactRowText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "700",
  }
});
