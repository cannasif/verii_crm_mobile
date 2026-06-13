import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Download04Icon,
  LockPasswordIcon,
  Link04Icon,
  Mail01Icon,
  Moon02Icon,
  Sun01Icon,
} from "hugeicons-react-native";

import { Text } from "../../components/ui/text";
import { useUIStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { setLanguage, getCurrentLanguage } from "../../locales";
import { hasPermission } from "../../features/access-control/utils/hasPermission";

function MenuGroup({
  children,
  cardBg,
  borderColor,
}: {
  children: React.ReactNode;
  cardBg: string;
  borderColor: string;
}): React.ReactElement {
  return (
    <View style={[styles.menuGroup, { backgroundColor: cardBg, borderColor }]}>
      {children}
    </View>
  );
}

export default function AppSettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const permissions = useAuthStore((state) => state.permissions);
  const colors = useUIStore((s) => s.colors);
  const themeMode = useUIStore((s) => s.themeMode);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const uppercaseCompanyNameAfterScan = useUIStore((s) => s.uppercaseCompanyNameAfterScan);
  const setUppercaseCompanyNameAfterScan = useUIStore((s) => s.setUppercaseCompanyNameAfterScan);
  const showUnitInStockSelection = useUIStore((s) => s.showUnitInStockSelection);
  const setShowUnitInStockSelection = useUIStore((s) => s.setShowUnitInStockSelection);

  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const isDarkMode = themeMode === "dark";

  const mainBg = colors.background;
  const gradientColors = (
    isDarkMode
      ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
  ) as [string, string, ...string[]];
  const cardBg = isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)";
  const borderColor = isDarkMode ? colors.border : "rgba(236, 72, 153, 0.25)";
  const textColor = colors.text;
  const mutedColor = colors.textSecondary;
  const brandColor = colors.accent;

  const SUPPORTED_LANGUAGES = [
    { id: "tr", label: t("language.turkish", "Türkçe"), flag: "🇹🇷", hint: "Türkçe" },
    { id: "en", label: t("language.english", "English"), flag: "🇬🇧", hint: "English" },
    { id: "de", label: t("language.german", "Deutsch"), flag: "🇩🇪", hint: "Deutsch" },
  ];

  const canOpenAccessControlSimulator = hasPermission(
    permissions,
    "access-control.permission-groups.view",
  );

  const handleLanguageChange = async (lang: "tr" | "en" | "de"): Promise<void> => {
    await setLanguage(lang);
    setCurrentLang(lang);
  };

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: cardBg, borderColor }]}
          >
            <ArrowLeft01Icon size={20} color={textColor} variant="stroke" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>{t("settings.appSettingsTitle")}</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.appearance")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <View style={styles.menuRow}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                {isDarkMode ? (
                  <Sun01Icon size={18} color="#F59E0B" variant="stroke" />
                ) : (
                  <Moon02Icon size={18} color="#F59E0B" variant="stroke" />
                )}
              </View>
              <Text style={[styles.menuText, { color: textColor }]}>
                {isDarkMode ? t("settings.lightMode") : t("settings.darkMode")}
              </Text>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E2E8F0", true: "#10B981" }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.preferences")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceTextCol}>
                <Text style={[styles.preferenceTitle, { color: textColor }]}>
                  {t("settings.uppercaseCompanyAfterScan")}
                </Text>
                <Text style={[styles.preferenceHint, { color: mutedColor }]}>
                  {t("settings.uppercaseCompanyAfterScanHint")}
                </Text>
              </View>
              <Switch
                value={uppercaseCompanyNameAfterScan}
                onValueChange={setUppercaseCompanyNameAfterScan}
                trackColor={{ false: "#E2E8F0", true: "#10B981" }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }] }}
              />
            </View>
            <View style={[styles.preferenceRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: borderColor }]}>
              <View style={styles.preferenceTextCol}>
                <Text style={[styles.preferenceTitle, { color: textColor }]}>
                  {t("settings.showUnitInStockPicker")}
                </Text>
                <Text style={[styles.preferenceHint, { color: mutedColor }]}>
                  {t("settings.showUnitInStockPickerHint")}
                </Text>
              </View>
              <Switch
                value={showUnitInStockSelection}
                onValueChange={setShowUnitInStockSelection}
                trackColor={{ false: "#E2E8F0", true: "#10B981" }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }] }}
              />
            </View>
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("language.title")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <View style={styles.languageList}>
              {SUPPORTED_LANGUAGES.map((lang, index) => {
                const isActive = currentLang === lang.id;
                return (
                  <TouchableOpacity
                    key={lang.id}
                    onPress={() => handleLanguageChange(lang.id as "tr" | "en" | "de")}
                    activeOpacity={0.82}
                    style={[
                      styles.languageRow,
                      {
                        backgroundColor: isActive
                          ? isDarkMode
                            ? "rgba(236, 72, 153, 0.08)"
                            : "rgba(219, 39, 119, 0.06)"
                          : "transparent",
                        borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: borderColor,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.languageFlagWrap,
                        {
                          backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#F8FAFC",
                          borderColor: isActive
                            ? isDarkMode
                              ? "rgba(236, 72, 153, 0.28)"
                              : "rgba(219, 39, 119, 0.22)"
                            : borderColor,
                        },
                      ]}
                    >
                      <Text style={styles.languageFlag}>{lang.flag}</Text>
                    </View>

                    <View style={styles.languageTextCol}>
                      <Text style={[styles.languageTitle, { color: textColor }]}>{lang.label}</Text>
                      <Text style={[styles.languageHint, { color: mutedColor }]}>{lang.hint}</Text>
                    </View>

                    {isActive ? (
                      <CheckmarkCircle02Icon size={20} color={isDarkMode ? "#34D399" : "#10B981"} variant="stroke" />
                    ) : (
                      <View style={[styles.languageRadio, { borderColor }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.integrationSettings")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push("/api-url-settings")}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
                <Link04Icon size={18} color="#3B82F6" variant="stroke" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: textColor }]}>{t("settings.apiUrlTitle")}</Text>
                <Text style={[styles.sectionDescription, { color: mutedColor, marginTop: -2 }]}>
                  {t("settings.apiUrlDescription")}
                </Text>
              </View>
              <ArrowRight01Icon size={18} color={mutedColor} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={() => router.push("/integrations-settings")}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                <Mail01Icon size={18} color="#10B981" variant="stroke" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: textColor }]}>{t("settings.integrationSettings")}</Text>
                <Text style={[styles.sectionDescription, { color: mutedColor, marginTop: -2 }]}>
                  {t("settings.integrationSettingsDescription")}
                </Text>
              </View>
              <ArrowRight01Icon size={18} color={mutedColor} />
            </TouchableOpacity>

            {canOpenAccessControlSimulator ? (
              <TouchableOpacity style={styles.menuRow} onPress={() => router.push("/access-control-simulator")}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(236, 72, 153, 0.1)" }]}>
                  <LockPasswordIcon size={18} color={brandColor} variant="stroke" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {t("settings.visibilitySimulator")}
                  </Text>
                  <Text style={[styles.sectionDescription, { color: mutedColor, marginTop: -2 }]}>
                    {t("settings.visibilitySimulatorDescription")}
                  </Text>
                </View>
                <ArrowRight01Icon size={18} color={mutedColor} />
              </TouchableOpacity>
            ) : null}
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.releaseNotes")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push("/release-notes")}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
                <Download04Icon size={18} color="#3B82F6" variant="stroke" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: textColor }]}>{t("settings.releaseNotes")}</Text>
                <Text style={[styles.sectionDescription, { color: mutedColor, marginTop: -2 }]}>
                  {t("settings.releaseNotesDescription")}
                </Text>
              </View>
              <ArrowRight01Icon size={18} color={mutedColor} />
            </TouchableOpacity>
          </MenuGroup>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  backButtonPlaceholder: { width: 38 },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  content: { flex: 1, backgroundColor: "transparent" },
  contentContainer: { paddingHorizontal: 20, paddingTop: 10 },
  groupTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: { flex: 1, fontSize: 14, fontWeight: "500" },
  sectionDescription: { fontSize: 13, lineHeight: 20 },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  preferenceTextCol: { flex: 1, marginRight: 6, paddingRight: 4 },
  preferenceTitle: { fontSize: 13, fontWeight: "600" },
  preferenceHint: { fontSize: 11, fontWeight: "400", marginTop: 3, lineHeight: 15 },
  languageList: {
    paddingVertical: 4,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  languageFlagWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  languageFlag: {
    fontSize: 20,
  },
  languageTextCol: {
    flex: 1,
    marginRight: 10,
  },
  languageTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  languageHint: {
    fontSize: 12,
    marginTop: 2,
  },
  languageRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
